/*
Configuration for CM export scripts.
Predefined configuration, constants and utility functions.
*/
const CM_EXPORT_TEMPLATE_SPREADSHEET_ID = '18llO5FrzHd4lfxMJMjqHN7RJfa4XEzTla5rwj6Q_VmQ';
const ROOT_FOLDER_ID = '1MOV1I6AeQMTGkoYnZq9GmkowReMlL9iZ'; // 'Versioned CMs (for mapping suites)'

// const SDK_VERSIONS = ['1.3.0', '1.4.0', '1.5.0', '1.5.12', '1.5', '1.6.0', '1.7.0', '1.8.0', '1.9.1', '1.10', '1.11', '1.12', '1.13'];
const BLANK = ''; // no value

const EXPORT_FILE_NAME_FIXED_PART = 'conceptual_mappings';
const EXPORT_FILE_NAME_SEP = '_';

// Rules sheet
// const TARGET_RULES_SHEET_NAME = 'Rules'
// const RULES_EXPORT_SHEET_NAME = 'Rules (export)'
// const MODULES_COL_NAME = 'Module'
// const LAST_EXPORTED_COL_NAME_FOR_RULES = 'Mapping Notes (public)';
// const IS_NODE_COND_FMT_COLUMN_IDX = 19; // index of "Is Node?" column
// const MIN_SDK_COND_FMT_COLUMN_IDX = 16; // index of "Min SDK Version" column
// const MAX_SDK_COND_FMT_COLUMN_IDX = 17; // index of "Max SDK Version" column
// const RIGHTSIDE_COL_IDXES_TO_KEEP = [
//   IS_NODE_COND_FMT_COLUMN_IDX,
//   MIN_SDK_COND_FMT_COLUMN_IDX,
//   MAX_SDK_COND_FMT_COLUMN_IDX
// ];

const MASTER_CM_SS = {
  SHEET: {
    RULES_EXPORT: {
      NAME: "Rules (export)",  // replaces RULES_EXPORT_SHEET_NAME
      COLUMN: {
        MODULES: {
          NAME: "Module"  //MODULES_COL_NAME
        }
      }
    },
    ATTR_RULES_EXPORT: {
      NAME: "Attribute Rules (export) - test",  // TODO: update value
      COLUMN: {
        MODULES: {
          NAME: "Module"
        }
      }
    },
    MG_EXPORT: {
      NAME: "Mapping Groups (export)", //MG_EXPORT_SHEET_NAME
      COLUMN: {
        MODULES: {
          NAME: "Min Module"  //MIN_MODULES_COL_NAME
        }
      }
    },
    METADATA: {
      NAME: "Metadata",  //METADATA_SHEET_NAME
    },
    METADATA_CFG: {
      NAME: "MetadataConf",  //METADATA_CFG_SETS_SHEET_NAME
      COLUMN: {
        CFG_ID: {
          NAME: "Configuration ID",
          INDEX: 1  //MAPPING_CFG_COL_IDX
        },
        TYPE: {
          NAME: "Type",
          INDEX: 3  //MAPPING_TYPE_COL_IDX
        },
        DEF_MODULES: {
          NAME: "Default for Included Modules"
        }
      },
      SDK_VERSION_PLACEHOLDER: "$SDK_Version$" //SDK_VERSION_PLACEHOLDER
    }
  },
  METADATA_CELL_2_METADATA_CFG_COL_MAPPING: {
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
}

const EXPORTED_SS = {
  SHEET: {
    RULES: {
      NAME: "Rules",  // replaces TARGET_RULES_SHEET_NAME
      COLUMN: {
        MODULES: {
          NAME: MASTER_CM_SS.SHEET.RULES_EXPORT.COLUMN.MODULES.NAME
        }
      },
      LAST_EXPORTED_COLUMN: {
        NAME: "Mapping Notes (public)"  //LAST_EXPORTED_COL_NAME_FOR_RULES
      },
      RIGHTSIDE_COL_NAMES_TO_KEEP: [
        "Is Node?",
        "Min SDK Version",  // 16th column, not 1st!
        "Max SDK Version"  // 17th column, not 2nd!
      ]
    },
    ATTR_RULES: {
      NAME: "Rules",
      COLUMN: {
        MODULES: {
          NAME: MASTER_CM_SS.SHEET.RULES_EXPORT.COLUMN.MODULES.NAME
        }
      },
      LAST_EXPORTED_COLUMN: {
        NAME: "Mapping Notes (public)"
      },
      RIGHTSIDE_COL_NAMES_TO_KEEP: [
        "Is Node?",
        "Min SDK Version",  // 16th column, not 1st!
        "Max SDK Version"  // 17th column, not 2nd!
      ]
    },
    MG: {
      NAME: "Mapping Groups",  // replaces TARGET_MG_SHEET_NAME
      COLUMN: {
        MODULES: {
          NAME: MASTER_CM_SS.SHEET.MG_EXPORT.COLUMN.MODULES.NAME  //MIN_MODULES_COL_NAME
        }
      },
      LAST_EXPORTED_COLUMN: {
        NAME: "Iterator XPath"  //LAST_EXPORTED_COL_NAME_FOR_MG
      },
      RIGHTSIDE_COL_NAMES_TO_KEEP: []
    },
    METADATA: {
      NAME: MASTER_CM_SS.SHEET.METADATA.NAME
    }
  },
}

// Mapping Groups sheet
// const MG_EXPORT_SHEET_NAME = 'Mapping Groups (export)'
// const TARGET_MG_SHEET_NAME = 'Mapping Groups'
// const MIN_MODULES_COL_NAME = 'Min Module'
// const LAST_EXPORTED_COL_NAME_FOR_MG = 'Iterator XPath';

// Metadata sheet
// const METADATA_CFG_SETS_SHEET_NAME = 'MetadataConf';
// const METADATA_SHEET_NAME = 'Metadata';
// const MAPPING_CFG_COL_IDX = 1; // Configuration ID
// const MAPPING_TYPE_COL_IDX = 3; // Type (mapping type)
// const SDK_VERSION_CELL_IDX = 'B14'; // eForms SDK version value
// const SDK_VERSION_PLACEHOLDER = '$SDK_Version$';
// const METADATA_CELL_2_METADATA_CFG_COL_MAPPING = {
//     "B3": "D",
//     "B4": "E",
//     "B5": "F",
//     "B6": "G",
//     "B7": "H",
//     "B11": "I",
//     "B12": "J",
//     "B13": "K",
//     "B14": "L"  // may not be required at all
// }


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


