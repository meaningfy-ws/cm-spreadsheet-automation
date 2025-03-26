/**
 * Entry point for CM export automation.
 */

// if endabled then auxiliary 'Rules-All', 'Attribute Rules-All' and 'Mapping
// Groups-All' sheets will be preserved in the generated spreadsheet
const DEBUG_MODE = false;


function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  
  // Create menu option
  ui.createAddonMenu()
      .addItem("Export CM", "exportCmDialog")
    .addToUi();
};

function exportCmDialog() {
  const ui = SpreadsheetApp.getUi();
  // Call the HTML file and set the width and height
  var htmlTemplate = HtmlService.createTemplateFromFile("cm_export_cfg_dialog");
  const [primaryModules, attrModules] = collectUniqueModuleNumbers(
    SpreadsheetApp.getActive()
  );
  htmlTemplate.primModules = primaryModules.toSorted();
  htmlTemplate.attrModules = attrModules.toSorted();
  
  var html = htmlTemplate.evaluate()
    .setWidth(500)
    .setHeight(700);

  //Display the dialog
  var dialog = ui.showModalDialog(html, "CM export");
};

function initExportCm(exportCfg) {
  Logger.log("INFO: Starting new CM export task ...");
  Logger.log(`DEBUG: Read config: ${JSON.stringify(exportCfg)}`);
  if (
    isEmptyArray(exportCfg["sdkVersions"])
    || (
      isEmptyArray(exportCfg["includedPrimModules"])
      && isEmptyArray(exportCfg["includedAttrModules"])
      )
  ) {
    throw Error("Invalid configuration. SDK or/and modules were not provided.");
  }
  var res = exportCm(
    exportCfg["mappingCfgId"],
    exportCfg["sdkVersions"],
    exportCfg["includedPrimModules"],
    exportCfg["includedAttrModules"]
  );
  Logger.log("INFO: Exporting finished!");
  return res;
};