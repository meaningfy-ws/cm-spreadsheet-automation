function testGenerateDefaultMgs() {
  const cases = [
    [["epo:Lot / epo:Purpose / epo:Quantity / xsd:decimal", "?this epo:hasPurpose / epo:hasTotalQuantity / epo:hasQuantityValue ?value ."], "MG-Quantity-hasTotalQuantity-Purpose-hasPurpose-Lot"],
    [["epo-not:CompetitionNotice", "?this a epo-not:CompetitionNotice ."], "MG-CompetitionNotice"],
    [["epo:Notice / epo:Procedure / adms:Identifier / rdf:PlainLiteral", "?this epo:refersToProcedure / adms:identifier / skos:notation ?value ."], "MG-Identifier-identifier-Procedure-refersToProcedure-Notice"],
    [["epo:Buyer / xsd:boolean", "?this epo:isContractingEntity true ."], "MG-Buyer"],
    [["epo:ContractTerm", "?this a epo:ContractTerm ."], "MG-ContractTerm"],
    [["epo:Procedure / epo:ProcedureTerm / epo:LotGroup", "?this epo:isSubjectToProcedureSpecificTerm / epo:definesLotGroup ?value ."], "MG-LotGroup-definesLotGroup-ProcedureTerm-isSubjectToProcedureSpecificTerm-Procedure"],
    [["epo:Procedure / epo:ProcedureTerm / xsd:boolean", "?this epo:isSubjectToProcedureSpecificTerm / epo:isSubmissionForAllLotsRequired true ."], "MG-ProcedureTerm-isSubjectToProcedureSpecificTerm-Procedure"],
    [["epo-not:ResultNotice / epo:Buyer", "?this epo-not:refersToRole ?value ."], "MG-Buyer-refersToRole-ResultNotice"],
    [["epo-not:CompetitionNotice / epo:Procedure", "?this epo:announcesProcedure ?value ."], "MG-Procedure-announcesProcedure-CompetitionNotice"]
    
  ]
  Logger.log("Starting tests ...");
  for (let i = 0; i < cases.length; i++) {
    var case_ = cases[i];
    var mappingGroupID = generateMappingGroupId(...case_[0]);
    Logger.log(mappingGroupID);
    assert(mappingGroupID === case_[1], `Case number ${i + 1} failed.`);
  }
  Logger.log(`All ${cases.length} cases passed the test.`);
}


function testGeneratePreRequisite() {
  const cases = [
    [
      "MG-TenderReceiver-definesTenderReceiver-SubmissionTerm-isSubjectToLotSpecificTerm-Lot", 
      "MG-SubmissionTerm-isSubjectToLotSpecificTerm-Lot"
    ],
    [
      "MG-Address-registeredAddress-Person",
      "MG-Person"
    ],
    [
      "MG-Person", ""
    ]
  ];

  for (let i = 0; i < cases.length; i++) {
    var case_ = cases[i];
    var prerequisite = generatePrerequisite(case_[0]);
    Logger.log(prerequisite);
    assert(prerequisite === case_[1]);
  }
}

/**
 * Test for rule 2 (MG constraining).
 * Checks for deleted prerequisite rows for all field rows for the node
 * saved in row 1390 ("Mapping groups with fields (generated)" sheet).
 * Based on example from https://meaningfy.atlassian.net/wiki/spaces/T/pages/1898348546/Mapping+Groups
 */
function testRemovePrereqFieldRowsForNode(dataIndex) {
  // given
  const nodeRows = dataIndex.getNodeRows(orderByMgDepth=true).filter(
    row => row.nidOrPid == "ND-PartPerformanceAddress" && row.mg == "MG-Address-address-Location-definesSpecificPlaceOfPerformance-ContractTerm-foreseesContractSpecificTerm-ProcurementObject-foreseesProcurementObject-PlannedProcurementPart"
  );
  const allRowsSize = dataIndex.getRowsNumber();
  const rowsToBeDeleted = [
    461,
    462,
    463,
    464,
    465,
    466,
    467,
    1019,
    1020,
    1021,
    1022,
    1023,
    1024,
    1025,
    1196,
    1197,
    1198,
    1199,
    1200,
    1201,
    1202,
    1361,
    1362,
    1363,
    1364,
    1365,
    1366,
    1367
  ]
  const rowIdxesToBeDeleted = rowsToBeDeleted.map(x => String(x - 2));

  // when
  removePrereqFieldRowsForNode(dataIndex, nodeRows);

  // then
  assert(allRowsSize - dataIndex.getRowsNumber() == rowsToBeDeleted.length);
  assert(!Object.keys(dataIndex.index.byOrder).filter(k => rowIdxesToBeDeleted.includes(k)).length);
  Logger.log("INFO: test `testRemovePrereqFieldRowsForNode` (rule 2) passed.")
}

/**
 * Test for rule 3 (MG constraining).
 * Checks for deleted prerequisite rows for all node rows for the node
 * saved in row 1359 ("Mapping groups with fields (generated)" sheet).
 * Based on example from https://meaningfy.atlassian.net/wiki/spaces/T/pages/1898348546/Mapping+Groups
 */

PARENT_CHILDREN_IDX = {
  "ND-PartPlacePerformance": ["ND-PartPerformanceAddress"]
};
function testRemovePrereqNodeRowsForNode(dataIndex) {
  // given
  const nodeRows = dataIndex.getNodeRows(orderByMgDepth=true).filter(
    row => row.nidOrPid == "ND-PartPlacePerformance" && row.mg == "MG-Location-definesSpecificPlaceOfPerformance-ContractTerm-foreseesContractSpecificTerm-ProcurementObject-foreseesProcurementObject-PlannedProcurementPart"
  );
  const allRowsSize = dataIndex.getRowsNumber();
  const rowsToBeDeleted = [
    1360,
    1195,
    1018,
    460
  ]
  const rowIdxesToBeDeleted = rowsToBeDeleted.map(x => String(x - 2));

  // when
  removePrereqNodeRowsForNode(dataIndex, PARENT_CHILDREN_IDX, nodeRows);

  // then
  assert(allRowsSize - dataIndex.getRowsNumber() == rowsToBeDeleted.length);
  assert(!Object.keys(dataIndex.index.byOrder).filter(k => rowIdxesToBeDeleted.includes(k)).length);
  Logger.log("INFO: test `testRemovePrereqNodeRowsForNode` (rule 3) passed.")
}

/**
 * Starting debugging session for extensions launched via UI is not possible.
 * Thus, this function provides an exemplary input configuration for 
 * the main CM export function. The config sets reflects configuration
 * that could be set via the UI.
 */
function cmExportManualTest() {
  let exportCfg1 = {
    "mappingCfgId": "10-24_vX.Y (Module 1-4)",
    // "excludedModules": [],
    "includedPrimModules": ["1", "1.6", "2", "3", "3.6", "4", "4.6", "5", "6", "7", "8", "5p", "6p", "7p"],
    "includedAttrModules": ["1a", "2a"],
    "sdkVersions": ["1.10"]
  };
  let exportCfg2 = {
    "mappingCfgId": "1-40+CEI+T01-T02+E1-E6_vX.Y (Module 7+8)",
    // "excludedModules": [],
    "includedPrimModules": ["1.7", "7", "8"],
    "includedAttrModules": ["7a", "8a"],
    "sdkVersions": ["1.3.0"]
  };
  let exportCfg3 = {
    "mappingCfgId": "1-40+CEI+T01-T02+E1-E6_vX.Y (Module 7+8)",
    // "excludedModules": [],
    "includedPrimModules": ["8"],
    "includedAttrModules": [],
    "sdkVersions": ["1.3.0"]
  };
  // let exportCfg = exportCfg1;
  let exportCfg = exportCfg2;
  let res = exportCm(
    exportCfg["mappingCfgId"],
    exportCfg["sdkVersions"],
    exportCfg["includedPrimModules"],
    exportCfg["includedAttrModules"]
  );
  Logger.log("Exporting finished!");
  return res;
}


function testGetColumnUniqueValuesByColName() {
  // given
  const spreadsheet = SpreadsheetApp.getActive();
  const rulesSheet = spreadsheet.getSheetByName(MASTER_CM_SS.SHEET.RULES_EXPORT.NAME);
  const colName = MASTER_CM_SS.SHEET.RULES_EXPORT.COLUMN.MODULES.NAME;
  const expected = [
    "1",
    "1.6",
    "1.7",
    "2",
    "3",
    "3.6",
    "4",
    "4.6",
    "5",
    "5p",
    "6",
    "6p",
    "7",
    "7p",
    "8",
    "9",
  ];

  // when
  const moduleVals = getColumnUniqueValuesByColName(rulesSheet, colName);

  // then
  assert(
    hasArraysSameElements(moduleVals, expected),
    `expected: ${JSON.stringify(expected)}; got: ${JSON.stringify(moduleVals)}`
  );
}
