/*
Configuration for CM export scripts.
Predefined configuration, constants and utility functions.
*/
// const CM_EXPORT_TEMPLATE_SPREADSHEET_ID = '18llO5FrzHd4lfxMJMjqHN7RJfa4XEzTla5rwj6Q_VmQ';  // v1
const CM_EXPORT_TEMPLATE_SPREADSHEET_ID = '1BSMZd9YszNZdRmcgQDWN00qNr8SsnkoqryAgesQ90yc'; // v2
const ROOT_FOLDER_ID = '1MOV1I6AeQMTGkoYnZq9GmkowReMlL9iZ'; // 'Versioned CMs (for mapping suites)'

// const SDK_VERSIONS = ['1.3.0', '1.4.0', '1.5.0', '1.5.12', '1.5', '1.6.0', '1.7.0', '1.8.0', '1.9.1', '1.10', '1.11', '1.12', '1.13'];
const BLANK = ''; // no value

const EXPORT_FILE_NAME_FIXED_PART = 'conceptual_mappings';
const EXPORT_FILE_NAME_SEP = '_';

const MASTER_CM_SS = {
  SHEET: {
    RULES_EXPORT: {
      NAME: "Rules (export)",
      COLUMN: {
        MODULES: {
          NAME: "Module"
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
      NAME: "Mapping Groups (export)",
      COLUMN: {
        MODULES: {
          NAME: "Min Module"
        }
      }
    },
    METADATA: {
      NAME: "Metadata",
    },
    METADATA_CFG: {
      NAME: "MetadataConf",
      COLUMN: {
        CFG_ID: {
          NAME: "Configuration ID",
          INDEX: 1
        },
        TYPE: {
          NAME: "Type",
          INDEX: 3
        },
        DEF_MODULES: {
          NAME: "Default for Included Modules"
        }
      },
      SDK_VERSION_PLACEHOLDER: "$SDK_Version$"
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
        "Max SDK Version",  // 17th column, not 2nd!
        "Min SDK Version"  // 16th column, not 1st!
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
      RIGHTSIDE_COL_NAMES_TO_KEEP: []
    },
    MG: {
      NAME: "Mapping Groups",
      COLUMN: {
        MODULES: {
          NAME: MASTER_CM_SS.SHEET.MG_EXPORT.COLUMN.MODULES.NAME
        }
      },
      LAST_EXPORTED_COLUMN: {
        NAME: "Iterator XPath"
      },
      RIGHTSIDE_COL_NAMES_TO_KEEP: []
    },
    METADATA: {
      NAME: MASTER_CM_SS.SHEET.METADATA.NAME
    }
  },
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


