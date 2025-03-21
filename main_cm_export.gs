/**
 * Entry point for CM export automation.
 */

// if endabled then intermediate 'Rules-All' and 'Mapping Groups-All' 
// sheets will be preserved in the generated spreadsheet
const DEBUG_MODE = true;


function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  
  // Create menu option
  ui.createAddonMenu()
    // .addSubMenu(ui.createMenu("CM automation")
      .addItem("Export CM", "exportCmDialog")
    // )
    .addToUi();
};

function exportCmDialog() {
  const ui = SpreadsheetApp.getUi();
  //Call the HTML file and set the width and height
  var html = HtmlService.createHtmlOutputFromFile("cm_export_cfg_dialog")
    .setWidth(500)
    .setHeight(700);

  //Display the dialog
  var dialog = ui.showModalDialog(html, "CM export");
};

function initExportCm(exportCfg) {
  Logger.log("Starting new CM export task ...");
  Logger.log(`Read config: ${JSON.stringify(exportCfg)}`);
  var res = exportCm(
    exportCfg["mappingCfgId"],
    exportCfg["sdkVersions"],
    exportCfg["excludedModules"]
  );
  Logger.log("Exporting finished!");
  return res;
};