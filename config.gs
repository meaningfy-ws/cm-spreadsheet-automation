/*
Configuration for CM export scripts.
Predefined configuration, constants and utility functions.
*/
const CM_EXPORT_TEMPLATE_SPREADSHEET_ID = '18llO5FrzHd4lfxMJMjqHN7RJfa4XEzTla5rwj6Q_VmQ';
const ROOT_FOLDER_ID = '1MOV1I6AeQMTGkoYnZq9GmkowReMlL9iZ'; // 'Versioned CMs (for mapping suites)'

const SDK_VERSIONS = ['1.3.0', '1.4.0', '1.5.0', '1.5.12', '1.5', '1.6.0', '1.7.0', '1.8.0', '1.9.1', '1.10', '1.11', '1.12', '1.13'];
const BLANK = ''; // no value

const EXPORT_FILE_NAME_FIXED_PART = 'conceptual_mappings';
const EXPORT_FILE_NAME_SEP = '_';

// Rules sheet
const TARGET_RULES_SHEET_NAME = 'Rules'
const RULES_EXPORT_SHEET_NAME = 'Rules (export)'
const MODULES_COL_NAME = 'Module'
const LAST_EXPORTED_COL_NAME_FOR_RULES = 'Mapping Notes (public)';
const IS_NODE_COND_FMT_COLUMN_IDX = 19; // index of "Is Node?" column
const MIN_SDK_COND_FMT_COLUMN_IDX = 16; // index of "Min SDK Version" column
const MAX_SDK_COND_FMT_COLUMN_IDX = 17; // index of "Max SDK Version" column
const RIGHTSIDE_COL_IDXES_TO_KEEP = [
  IS_NODE_COND_FMT_COLUMN_IDX,
  MIN_SDK_COND_FMT_COLUMN_IDX,
  MAX_SDK_COND_FMT_COLUMN_IDX
];

// Mapping Groups sheet
const MG_EXPORT_SHEET_NAME = 'Mapping Groups (export)'
const TARGET_MG_SHEET_NAME = 'Mapping Groups'
const MIN_MODULES_COL_NAME = 'Min Module'
const LAST_EXPORTED_COL_NAME_FOR_MG = 'Iterator XPath';

// Metadata sheet
const METADATA_CFG_SETS_SHEET_NAME = 'MetadataConf';
const METADATA_SHEET_NAME = 'Metadata';
const MAPPING_CFG_COL_IDX = 1; // Configuration ID
const MAPPING_TYPE_COL_IDX = 3; // Type (mapping type)
const SDK_VERSION_CELL_IDX = 'B14'; // eForms SDK version value
const SDK_VERSION_PLACEHOLDER = '$SDK_Version$';
const METADATA_CELL_2_METADATA_CFG_COL_MAPPING = {
    "B3": "D",
    "B4": "E",
    "B5": "F",
    "B6": "G",
    "B7": "H",
    "B11": "I",
    "B12": "J",
    "B13": "K",
    "B14": "L"  // may not be required at all
}


function constructExportDirName(mappingTypeName, sdkVersions) {
  var sdkVersionSlug = sdkVersions[0];
  if (sdkVersions.length > 1) sdkVersionSlug = `${sdkVersionSlug}-${sdkVersions.slice(-1)}`;
  return [
    EXPORT_FILE_NAME_FIXED_PART,
    mappingTypeName,
    sdkVersionSlug,
  ].join(EXPORT_FILE_NAME_SEP);
}

function constructExportFileName(mappingTypeName, sdkVersion) {
  return [
    EXPORT_FILE_NAME_FIXED_PART,
    mappingTypeName,
    sdkVersion
  ].join(EXPORT_FILE_NAME_SEP);
}


