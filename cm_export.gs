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
  const rulesSheet = spreadsheet.getSheetByName(MASTER_CM_SS.SHEET.RULES_EXPORT.NAME);
  const mgSheet = spreadsheet.getSheetByName(MASTER_CM_SS.SHEET.MG_EXPORT.NAME);
  const metadataSheet = spreadsheet.getSheetByName(MASTER_CM_SS.SHEET.METADATA.NAME);
  
  resultSpreadsheets = [];
  let filteringCriteria = {
    excludedModules: excludedModules
  };
  
  const mappingTypeName = getMappingTypeByMetadataCfgId(
    spreadsheet.getSheetByName(MASTER_CM_SS.SHEET.METADATA_CFG.NAME), mappingCfgId
  );

  // create folder for the new spreadsheets
  const exportDirName = constructExportDirName(mappingTypeName, sdkVersions);
  const workdir = createNewSubfolder(ROOT_FOLDER_ID, appendTimestamp(exportDirName));
  Logger.log("Working folder: " + workdir);

  // export a new spreadsheet for every selected SDK version
  for (let i = 0; i < sdkVersions.length; i++) {
    const currSdk = sdkVersions[i];
    filteringCriteria.sdk = currSdk;
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
    const targetMetadataSheet = newSpreadsheet.getSheetByName(
      EXPORTED_SS.SHEET.METADATA.NAME
    );
    copyRangeDataToExternalSheet(metadataSheet.getDataRange(), targetMetadataSheet);
    setMetadataByCfgId(
      spreadsheet.getSheetByName(MASTER_CM_SS.SHEET.METADATA_CFG.NAME),
      targetMetadataSheet,
      mappingCfgId,
      currSdk
    );

    // *********************** process Rules (export) sheet  ******************
    let sourceSheetCfg = {
      name: MASTER_CM_SS.SHEET.RULES_EXPORT.NAME,
      modulesColumnName: MASTER_CM_SS.SHEET.RULES_EXPORT.COLUMN.MODULES.NAME,
    };
    let targetSheetCfg = {
      name: EXPORTED_SS.SHEET.RULES.NAME,
      lastColName: EXPORTED_SS.SHEET.RULES.LAST_EXPORTED_COLUMN.NAME,
      rightsideColsToKeep: EXPORTED_SS.SHEET.RULES.RIGHTSIDE_COL_NAMES_TO_KEEP,
      deleteAuxColumns: true
    };
    exportSheet(
      rulesSheet,
      sourceSheetCfg,
      newSpreadsheet,
      targetSheetCfg,
      filteringCriteria,
      copyFn=copyDataRangeBetweenSheets
    );


    // ****************** process Mapping Groups (export) sheet ***************
    sourceSheetCfg = {
      name: MASTER_CM_SS.SHEET.MG_EXPORT.NAME,
      modulesColumnName: MASTER_CM_SS.SHEET.MG_EXPORT.COLUMN.MODULES.NAME,
    };
    targetSheetCfg = {
      name: EXPORTED_SS.SHEET.MG.NAME,
      lastColName: EXPORTED_SS.SHEET.MG.LAST_EXPORTED_COLUMN.NAME,
      rightsideColsToKeep: EXPORTED_SS.SHEET.MG.RIGHTSIDE_COL_NAMES_TO_KEEP,
      deleteAuxColumns: true
    };
    exportSheet(
      mgSheet,
      sourceSheetCfg,
      newSpreadsheet,
      targetSheetCfg,
      filteringCriteria,
      copyFn=copyDataRangeBetweenSheets
    );

    // ****************** process Attribute Rules (export) sheet ***************
    sourceSheetCfg = {
      name: MASTER_CM_SS.SHEET.ATTR_RULES_EXPORT.NAME,
      modulesColumnName: MASTER_CM_SS.SHEET.ATTR_RULES_EXPORT.COLUMN.MODULES.NAME,
    };
    targetSheetCfg = {
      name: EXPORTED_SS.SHEET.MG.NAME,
      lastColName: EXPORTED_SS.SHEET.MG.LAST_EXPORTED_COLUMN.NAME,
      rightsideColsToKeep: EXPORTED_SS.SHEET.MG.RIGHTSIDE_COL_NAMES_TO_KEEP,
      deleteAuxColumns: true
    };
    exportSheet(
      mgSheet,
      sourceSheetCfg,
      newSpreadsheet,
      targetSheetCfg,
      filteringCriteria,
      copyFn=copyRangeBetweenSheetsAtTheEnd
    );
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
 * Exports data from the source sheet to a new sheet in the external spreadsheet.
 * The target sheet contains data filtered by the given filtering criteria.
 * 
 * The function creates an auxiliary sheet that is used to apply a filter
 * and copy filtered data from it. It's needed to avoid doing that operations
 * on the source sheet. The auxiliary sheet is removed unless `DEBUG_MODE` is
 * enabled.
 */
function exportSheet(
  sourceSheet,
  sourceSheetCfg,
  targetSpreadsheet,
  targetSheetCfg,
  filteringCriteria,
  copyFn = copyDataRangeBetweenSheets
) {
  // copy the source sheet content to an auxiliary sheet
  let intermSheetName = sourceSheetCfg.name + '-All';
  const newAuxSheet = copySheetDataAndFormatToExtSpreadsheet(
    sourceSheet, targetSpreadsheet, intermSheetName, true
  );

  // filter the new sheet
  newAuxSheet.getDataRange().createFilter();
  // filter by modules
  setFilterOnColumn(
    newAuxSheet, sourceSheetCfg.modulesColumnName, filteringCriteria.excludedModules
  );
  // filter by SDK
  setFilterOnSdkColumn(newAuxSheet, filteringCriteria.sdk);
  
  const targetSheet = targetSpreadsheet.getSheetByName(targetSheetCfg.name);
  // copy filtered range to another existing sheet
  const lastColIdx = getColumnIdxByHeaderName(
    newAuxSheet, targetSheetCfg.lastColName
  );

  const rightsideColsToKeepIdx = targetSheetCfg.rightsideColsToKeep.map(
    (name) => getColumnIdxByHeaderName(newAuxSheet, name)
  );
  
  // TODO: pass copying function as an argument to this function and
  // use that instead of the above fixed function.
  copyFn(newAuxSheet, targetSheet, options={asText: true});
  // copyDataRangeBetweenSheets(newAuxSheet, targetSheet, true);
  
  // Delete extra right-side columns except for the special ones required for
  // conditional formatting. Required columns cannot be moved as it causes
  // conditional formatting rules to fail. Thus, as a a workaround the
  // unnecessary columns are removed. The special columns are hidden.
  if (targetSheetCfg.deleteAuxColumns) {
    deleteOrHideAuxiliaryRightSideColumns(
      targetSheet, lastColIdx, rightsideColsToKeepIdx
    );
  }

  if (!DEBUG_MODE) {
    targetSpreadsheet.deleteSheet(newAuxSheet);
  }
}


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
  const cfgRowIdx = findRowByValue(
    sheet,
    MASTER_CM_SS.SHEET.METADATA_CFG.COLUMN.CFG_ID.INDEX,
    mappingCfgId
  );
  return objectMap(
    MASTER_CM_SS.METADATA_CELL_2_METADATA_CFG_COL_MAPPING,
    getCellValue,
    cfgRowIdx,
    sheet
  );
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
  return text.replace(
    MASTER_CM_SS.SHEET.METADATA_CFG.SDK_VERSION_PLACEHOLDER, sdkVersion
  );  
}

function getMappingTypeByMetadataCfgId(sheet, mappingCfgId) {
  const cfgRowIdx = findRowByValue(
    sheet,
    MASTER_CM_SS.SHEET.METADATA_CFG.COLUMN.CFG_ID.INDEX,
    mappingCfgId
  );
  return sheet.getRange(
    cfgRowIdx,
    MASTER_CM_SS.SHEET.METADATA_CFG.COLUMN.TYPE.INDEX
  ).getValue();
}
