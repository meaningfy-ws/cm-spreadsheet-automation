/**
 * Core functions for exporting CM.
 */


/**
 * Main function for exporting CM spreadsheets.
 *
 * A new spreadsheet is generated for every processed SDK version. Spreadsheets
 * are generated based on a "template spreadsheet" that contains 'Rules',
 * 'Mapping Groups', 'Metadata' (and other) sheets that will be present in a
 * target spreadsheet. The new spreadsheets are stored in a new Google Drive
 * folder created in the predefined root folder. The result folder includes
 * zipped archive with the content of the folder (generated spreadsheets). The
 * exported spreadsheets contain filtered copies of data coming from the master
 * CM spreadsheet. The id of master CM spreadsheet is predefined in the project
 * configuration. The function does not modify the master CM spreadsheet.
 *
 * @param mappingCfgId a string representing metatadata cfg id
 * @param sdkVersions a list of strings representing SDK version
 * @param excludedModules a list of strings representing modules that will be
 * filtered out
 * @returns An object containing URLs for viewing spreadsheets and downloading
 * zipped archive
 */
function exportCm(mappingCfgId, sdkVersions, excludedModules) {
  const spreadsheet = SpreadsheetApp.getActive();
  const rulesSheet = spreadsheet.getSheetByName(RULES_EXPORT_SHEET_NAME);
  const mgSheet = spreadsheet.getSheetByName(MG_EXPORT_SHEET_NAME);
  const metadataSheet = spreadsheet.getSheetByName(METADATA_SHEET_NAME);
  
  resultSpreadsheets = [];
  
  const mappingTypeName = getMappingTypeByMetadataCfgId(
    spreadsheet.getSheetByName(METADATA_CFG_SETS_SHEET_NAME), mappingCfgId
  );

  // create folder for the new spreadsheets
  const exportDirName = constructExportDirName(mappingTypeName, sdkVersions);
  const workdir = createNewSubfolder(ROOT_FOLDER_ID, appendTimestamp(exportDirName));
  Logger.log("Working folder: " + workdir);

  // export a new spreadsheet for every selected SDK version
  for (let i = 0; i < sdkVersions.length; i++) {
    const currSdk = sdkVersions[i];
    Logger.log(`DEBUG: Processing ${sdkVersions[i]} ...`);
    
    const newSpreadsheetName = constructExportFileName(mappingTypeName, currSdk);
    const newSpreadsheet = makeSpreadsheetFromTemplate(newSpreadsheetName, workdir);
    resultSpreadsheets.push(
      {
        "sdkVersion": currSdk,
        "exportedFile": newSpreadsheet.getUrl(),
        "exportedFileDownloadUrl": DriveApp.getFileById(newSpreadsheet.getId()).getDownloadUrl()
      }
    );

    // *********************** process Metadata sheet *************************
    // Update the target metadata sheet with predefined config values determined
    // based on the configuration ID (mapping type).
    const targetMetadataSheet = newSpreadsheet.getSheetByName(METADATA_SHEET_NAME);
    copyRangeDataToExternalSheet(metadataSheet.getDataRange(), targetMetadataSheet);
    setMetadataByCfgId(
      spreadsheet.getSheetByName(METADATA_CFG_SETS_SHEET_NAME),
      targetMetadataSheet,
      mappingCfgId,
      currSdk
    );

    // *********************** process Rules (export) sheet  ******************
    // copy rules to a new spreadsheet
    const newRulesAllSheet = copySheetDataAndFormatToExtSpreadsheet(
      rulesSheet, newSpreadsheet, TARGET_RULES_SHEET_NAME + '-All', true
    );

    // filter the new sheet
    newRulesAllSheet.getDataRange().createFilter();
    //set module filter
    setFilterOnColumn(newRulesAllSheet, MODULES_COL_NAME, excludedModules);
    // filter SDK - exclude blanks
    setFilterOnColumn(newRulesAllSheet, currSdk, [BLANK]);
    
    // copy filtered range to another existing sheet
    const targetRulesSheet = newSpreadsheet.getSheetByName(TARGET_RULES_SHEET_NAME);
    const lastColIdx = getColumnIdxByHeaderName(newRulesAllSheet, LAST_EXPORTED_COL_NAME_FOR_RULES);
    copyDataRangeBetweenSheets(newRulesAllSheet, targetRulesSheet, true);
    
    // deletes extra right-side columns except for the special ones required for
    // conditional formatting. Required columns cannot be moved as it causes
    // conditional formatting rules to fail. Thus, as a a workaround the
    // unnecessary columns are removed. The special columns are hidden
    deleteOrHideAuxiliaryRightSideColumns(targetRulesSheet, lastColIdx, RIGHTSIDE_COL_IDXES_TO_KEEP);

    if (!DEBUG_MODE) {
      newSpreadsheet.deleteSheet(newRulesAllSheet);
    }

    // ****************** process Mapping Groups (export) sheet ***************
    const newMgAllSheet = copySheetDataAndFormatToExtSpreadsheet(
      mgSheet, newSpreadsheet, TARGET_MG_SHEET_NAME + '-All', true
    );

    // filter the new sheet
    newMgAllSheet.getDataRange().createFilter();
    //set module filter
    setFilterOnColumn(newMgAllSheet, MIN_MODULES_COL_NAME, excludedModules);
    //set SDK filter
    setFilterOnSdkColumn(newMgAllSheet, currSdk);

    // copy filtered data to the target sheet
    const targetMgSheet = newSpreadsheet.getSheetByName(TARGET_MG_SHEET_NAME);
    const lastMgColIdx = getColumnIdxByHeaderName(newMgAllSheet, LAST_EXPORTED_COL_NAME_FOR_MG);
    copyDataRangeBetweenSheets(newMgAllSheet, targetMgSheet, true);

    // delete auxilary columns from the target sheet
    deleteAuxiliaryRightSideColumns(targetMgSheet, lastMgColIdx);

    if (!DEBUG_MODE) {
      newSpreadsheet.deleteSheet(newMgAllSheet);
    }
  }

  rulesSheet.getRange(1, 1).activate();
  // Logger.log(`DEBUG: ${listFilesInFolder(workdir)}`);
  
  // prepare zipped archive
  let zipArchiveDownloadUrl;
  try {
    const zipArchiveId = zipFilesInFolder(workdir, exportDirName);
    zipArchiveDownloadUrl = DriveApp.getFileById(zipArchiveId).getDownloadUrl();
    
  }
  catch(err) {
    Logger.log(`Cannot create zip archive due to the error: '${err.message}'`);
  }

  return {
    "resultDir": workdir.getUrl(),
    "resultDirDownload": zipArchiveDownloadUrl,
    "resultFiles": resultSpreadsheets
  };
};


/**
* Set a filtering of values of the given column.
* 
* Requires enabled filter for the sheet.
*/
function setFilterOnColumn(sheet, colName, colHiddenValues) {
  const colIdx = getColumnIdxByHeaderName(sheet, colName);
  sheet.getRange(1, colIdx).activate();
  var criteria = SpreadsheetApp.newFilterCriteria()
    .setHiddenValues(colHiddenValues)
    .build();  //set module filter
  sheet.getFilter().setColumnFilterCriteria(colIdx, criteria);
}

function setFilterOnSdkColumn(sheet, colName) {
  setFilterOnColumn(sheet, colName, [BLANK]);
}

/** 
* Copy a template spreadsheet containing several sheets to the specified folder.
* Returns Spreadsheet object.
*/
function makeSpreadsheetFromTemplate(newSpreadsheetName, destFolder) {
  const file = DriveApp.getFileById(CM_EXPORT_TEMPLATE_SPREADSHEET_ID).makeCopy(newSpreadsheetName, destFolder);   
  return SpreadsheetApp.open(file);
};

function getMetadataCfgByCfgId(sheet, mappingCfgId) {
  const cfgRowIdx = findRowByValue(sheet, MAPPING_CFG_COL_IDX, mappingCfgId);
  return objectMap(METADATA_CELL_2_METADATA_CFG_COL_MAPPING, getCellValue, cfgRowIdx, sheet);
}

function setMetadataValues(sheet, metadata, sdkVersion) {
  for (const cellIdx in metadata) {
    var metadataValue = resolveSdkVersion(metadata[cellIdx], sdkVersion);
    sheet.getRange(cellIdx).setValue(metadataValue);
  }
}

function setMetadataByCfgId(metadataCfgSheet, metadataTargetSheet, mappingCfgId, sdkVersion) {
  const cfgValues = getMetadataCfgByCfgId(metadataCfgSheet, mappingCfgId);
  setMetadataValues(metadataTargetSheet, cfgValues, sdkVersion);
}

function resolveSdkVersion(text, sdkVersion) {
  return text.replace(SDK_VERSION_PLACEHOLDER, sdkVersion);  
}

function getMappingTypeByMetadataCfgId(sheet, mappingCfgId) {
  const cfgRowIdx = findRowByValue(sheet, MAPPING_CFG_COL_IDX, mappingCfgId);
  return sheet.getRange(cfgRowIdx, MAPPING_TYPE_COL_IDX).getValue();
}
