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
  let filteringCriteria;
  
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
    filteringCriteria = {
      includedModules: includedPrimModules,
      sdk: currSdk
    };
    Logger.log(`INFO: Processing ${sdkVersions[i]} ...`);
    
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
    let sourceSheetCfg = {
      name: MASTER_CM_SS.SHEET.RULES_EXPORT.NAME,
      modulesColumnName: MASTER_CM_SS.SHEET.RULES_EXPORT.COLUMN.MODULES.NAME,
    };
    let targetSheetCfg = {
      name: EXPORTED_SS.SHEET.RULES.NAME,
      lastColName: EXPORTED_SS.SHEET.RULES.LAST_EXPORTED_COLUMN.NAME,
      rightsideColsToKeep: EXPORTED_SS.SHEET.RULES.RIGHTSIDE_COL_NAMES_TO_KEEP,
      deleteAuxColumns: false,
      leftsideColsToExclude: EXPORTED_SS.SHEET.RULES.EXCLUDED_COLUMNS
    };
    let rulesTargetSheetCfg = targetSheetCfg;
    exportSheet(
      rulesSheet,
      sourceSheetCfg,
      newSpreadsheet,
      targetSheetCfg,
      filteringCriteria,
      copyFn=copySheetData
    );

    // ****************** process Mapping Groups (export) sheet ***************
    sourceSheetCfg = {
      name: MASTER_CM_SS.SHEET.MG_EXPORT.NAME,
      modulesColumnName: MASTER_CM_SS.SHEET.MG_EXPORT.COLUMN.MODULES.NAME,
      xPathColumnName: MASTER_CM_SS.SHEET.MG_EXPORT.COLUMN.XPATH.NAME
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
      copyFn=copySheetData
    );

    // ****************** process Attribute Rules (export) sheet ***************
    // Attribute rule rows will be appended to the Rules sheet    
    sourceSheetCfg = {
      name: MASTER_CM_SS.SHEET.ATTR_RULES_EXPORT.NAME,
      modulesColumnName: MASTER_CM_SS.SHEET.ATTR_RULES_EXPORT.COLUMN.MODULES.NAME,
    };
    targetSheetCfg = {
      name: EXPORTED_SS.SHEET.RULES.NAME,
      lastColName: EXPORTED_SS.SHEET.ATTR_RULES.LAST_EXPORTED_COLUMN.NAME,
      rightsideColsToKeep: EXPORTED_SS.SHEET.ATTR_RULES.RIGHTSIDE_COL_NAMES_TO_KEEP,
      deleteAuxColumns: false,
      leftsideColsToExclude: EXPORTED_SS.SHEET.ATTR_RULES.EXCLUDED_COLUMNS
    };
    filteringCriteria.includedModules = includedAttrModules;  // use attr rule modules
    exportSheet(
      attrRulesSheet,
      sourceSheetCfg,
      newSpreadsheet,
      targetSheetCfg,
      filteringCriteria,
      copyFn=appendSheetData,
      options={intermSheetName: "Attr rules-All"}
    );

    // Remove excessive columns and hide auxiliary ones after processing Rules and Attribute Rules
    deleteOrHideColumnsByName(
      newSpreadsheet.getSheetByName(rulesTargetSheetCfg.name),
      rulesTargetSheetCfg
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
  copyFn = copySheetData,
  options
) {
  // copy the source sheet content to an auxiliary sheet
  let intermSheetName = sourceSheetCfg.name + '-All';
  if (options && options.hasOwnProperty("intermSheetName")) {
    intermSheetName = options.intermSheetName;
  }
  const newAuxSheet = copySheetDataAndFormatToExtSpreadsheet(
    sourceSheet, targetSpreadsheet, intermSheetName, true
  );

  // filtering
  const sdkColIdx = getColumnIdxByHeaderName(
    newAuxSheet, filteringCriteria.sdk
  );
  const modulesColIdx = getColumnIdxByHeaderName(
    newAuxSheet, sourceSheetCfg.modulesColumnName
  );
  let predicates = [
    buildSdkFilter(sdkColIdx),
    buildModuleFilter(filteringCriteria.includedModules, modulesColIdx)
  ];
  
  // extra filter for MG sheet only
  if (sourceSheetCfg.hasOwnProperty("xPathColumnName")) {
    const xPathColIdx = getColumnIdxByHeaderName(
      newAuxSheet, sourceSheetCfg.xPathColumnName
    );
    let p = buildEmptyColumnFilter(xPathColIdx);
    predicates.push(p);
  }
  const filteredData = getFilteredData(newAuxSheet, predicates);
  
  let targetSheet = targetSpreadsheet.getSheetByName(targetSheetCfg.name);
  // copy filtered range to another existing sheet
  if (!isEmptyArray(filteredData)) {
    copyFn(filteredData, targetSheet, options={asText: true});
  }
  
  // Delete columns except for the special ones required for
  // conditional formatting. Required columns cannot be moved as it causes
  // conditional formatting rules to fail. Thus, as a a workaround the
  // unnecessary columns are removed. The special columns are hidden.
  // Columns set for exlcusion are deleted.
  if (targetSheetCfg.deleteAuxColumns) {
    deleteOrHideColumnsByName(targetSheet, targetSheetCfg);
  }

  if (DEBUG_MODE) {
    // set built-in filter on auxiliary sheet for manual verification purposes
    // Note that the Google SDK lacks a quick way to get total number of visible
    // rows. Calling `isRowHiddenByFilter` for every row is very time-consuming
    // so we cannot do an automatic check for the custom filtering method implemented
    // in utils module.
    newAuxSheet.getDataRange().createFilter();
    // filter by modules
    setFilterOnColumn(
      newAuxSheet,
      sourceSheetCfg.modulesColumnName,
      getAllExcludedModules(filteringCriteria.includedModules)
    );
    // filter by SDK
    setFilterOnSdkColumn(newAuxSheet, filteringCriteria.sdk);
  } else {
    targetSpreadsheet.deleteSheet(newAuxSheet);
  }
}

/**
 * A convenience function working on column names.
 * It delegates the deletion and hiding task to the `deleteOrHideColumns`.
 */
function deleteOrHideColumnsByName(
  targetSheet, targetSheetCfg
) {
  const lastColIdx = getColumnIdxByHeaderName(
    targetSheet, targetSheetCfg.lastColName
  );
  
  let leftsideColToExclIds;
  if (targetSheetCfg.hasOwnProperty("leftsideColsToExclude")) {
    leftsideColToExclIds = targetSheetCfg.leftsideColsToExclude.map(
      (name) => getColumnIdxByHeaderName(targetSheet, name)
    );
  } else {
    leftsideColToExclIds = [];
  } 
  

  const rightsideColsToKeepIdx = targetSheetCfg.rightsideColsToKeep.map(
    (name) => getColumnIdxByHeaderName(targetSheet, name, start=lastColIdx)
  );

  deleteOrHideColumns(
    targetSheet, lastColIdx, rightsideColsToKeepIdx, leftsideColToExclIds
  );
}

/**
 * Collects module numbers from data, analyzing the predefined sheets.
 * 
 * Returns primary modules list and attribute rules list.
 * Primary modules list consists of modules relevant to rules and MGs.
 */
function collectUniqueModuleNumbers(spreadsheet) {
  const rulesSheet = spreadsheet.getSheetByName(MASTER_CM_SS.SHEET.RULES_EXPORT.NAME);
  const attrRulesSheet = spreadsheet.getSheetByName(MASTER_CM_SS.SHEET.ATTR_RULES_EXPORT.NAME);
  const mgSheet = spreadsheet.getSheetByName(MASTER_CM_SS.SHEET.MG_EXPORT.NAME);
  
  const rModules = getColumnUniqueValuesByColName(
    rulesSheet,
    MASTER_CM_SS.SHEET.RULES_EXPORT.COLUMN.MODULES.NAME,
    datatype=String,
    skipHeader=true
  );
  const arModules = getColumnUniqueValuesByColName(
    attrRulesSheet,
    MASTER_CM_SS.SHEET.ATTR_RULES_EXPORT.COLUMN.MODULES.NAME,
    datatype=String,
    skipHeader=true
  );
  const mgModules = getColumnUniqueValuesByColName(
    mgSheet,
    MASTER_CM_SS.SHEET.MG_EXPORT.COLUMN.MODULES.NAME,
    datatype=String,
    skipHeader=true
  );

  const primaryModules = mergeAndSortArrays(rModules, mgModules);
  const attrModules = arModules;
  return [primaryModules, attrModules];
}

function buildSdkFilter(columnIdx, expectedCellValue = "X") {
  let dataArrIdx = columnIdx - 1;  // sheet column indexing starts at 1
  function sdkFilter(rowData) {
    let v = rowData[dataArrIdx];
    return rowData[dataArrIdx] == expectedCellValue;
  }
  return sdkFilter;
}

function buildModuleFilter(acceptedModules, columnIdx, datatype=String) {
  let dataArrIdx = columnIdx - 1;  // sheet column indexing starts at 1
  function moduleFilter(rowData) {
    let v = datatype(rowData[dataArrIdx]);
    return acceptedModules.includes(datatype(rowData[dataArrIdx]));
  }
  return moduleFilter;
}

function buildEmptyColumnFilter(columnIdx) {
  let dataArrIdx = columnIdx - 1;  // sheet column indexing starts at 1
  function nonemptyColumnFilter(rowData) {
    let v = rowData[dataArrIdx];
    return v && v.trim();
  }
  return nonemptyColumnFilter;
}

/**
* Sets a filtering of values of the given column.
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
