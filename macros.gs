// uses mgs.gs

// SHEET CONFIGURATION
const TARGET_COLUMN_ADDR = "L2:L";


const RULES_SHEET_NAME = "Rules";
// for `Rules` input sheet
const MIN_SDK_VERSION_COL_ADDR = "A2:A";
const MAX_SDK_VERSION_COL_ADDR = "B2:B";
const SDK_ID_COL_ADDR = "C2:C";
const IS_NODE_COL_ADDR = "F2:F";
const PARENT_ID_COL_ADDR = "H2:H";  //parentId
const PARENT_NODE_ID_COL_ADDR = "I2:I";  //parentNodeId
const DEFAULT_MG_GEN_COL_ADDR = "L2:L";
const NODE_XPATH_COL_ADDR = "Q2:Q";
const CLASS_PATH_COLUMN_ADDR = "AF2:AF";  // Class path
const PROP_PATH_COLUMN_ADDR = "AG2:AG";


const NEW_MGS_WITH_FLDS_SHEET_NAME = "Mapping groups with fields (generated)";
const AUTOGEN_MGS_SHEET = NEW_MGS_WITH_FLDS_SHEET_NAME;
const NEW_FILTERED_MGS_WITH_FLDS_SHEET_NAME = "Mapping groups with fields (filtered)";
const NEW_MGS_WITH_FLDS_SHEET_HEADER = [[
  "Min SDK Version",  // A
  "Max SDK Version",  // B
  "Mapping Group ID",  // C
  "Instance Type (ontology Class)",  // D
  "Node XPath",  // E
  "Node ID (optional) or Parent Node ID of Field",  // F
  "Prerequisite Mapping group",  // G
  "Field ID"  // H
]];


// for the new target MGs sheet
const MIN_SDK_VERSION_TARGET_COL_ADDR = "A2:A";
const MAX_SDK_VERSION_TARGET_COL_ADDR = "B2:B";
const MG_ID_TARGET_COL_ADDR = "C2:C";
const MG_ID_TARGET_COL_IDX = 3;  // points out to the same column as MG_ID_TARGET_COL_ADDR
const INST_TYPE_TARGET_COL_ADDR = "D2:D";
const NODE_XPATH_TARGET_COL_ADDR = "E2:E";
const NODE_XPATH_TARGET_COL_IDX = 5;
const NID_OR_PID_OF_FLD_TARGET_COL_ADDR = "F2:F";  // Node ID (optional) or Parent Node ID of Field
const PREREQ_MG_TARGET_COL_ADDR = "G2:G";
const FIELD_ID_TARGET_COL_ADDR = "H2:H";
const MG_DEPTH_TARGET_COL_ADDR = "I2:I";
const MG_DEPTH_TARGET_COL_IDX = 9;  // points out to the same column as MG_DEPTH_TARGET_COL_ADDR
const MG_DEPTH_TARGET_COL_HEADER_ADDR = "I1";
const TRIPLES_MAP_TARGET_COL_ADDR = "J2:J";
const TRIPLES_MAP_TARGET_COL_HEADER_ADDR = "J1";
const FIELD_ID_ORD_TARGET_COL_ADDR = "K2:K";
const FIELD_ID_ORD_TARGET_COL_IDX = 11;  // points out to the same column as FIELD_ID_ORD_TARGET_COL_ADDR
const FIELD_ID_ORD_TARGET_COL_HEADER_ADDR = "K1";
const MG_DEPTH_HEADER = "MG depth";
const TRIPLES_MAP_HEADER = "TriplesMap Name (w/formula)";


const MGS_WITH_FLDS_EXT_SHEET_HEADER = [NEW_MGS_WITH_FLDS_SHEET_HEADER[0].concat(
  [
    MG_DEPTH_HEADER, TRIPLES_MAP_HEADER
  ]
)];


function generateDefaultMgs() {
  var sheet = SpreadsheetApp.getActiveSheet();

  testGenerateDefaultMgs();

  const classes = sheet.getRange(CLASS_PATH_COLUMN_ADDR).getValues();  // 2D array
  const props = sheet.getRange(PROP_PATH_COLUMN_ADDR).getValues();  // 2D array
  const EMPTY_1CELL_ROW = [""];
  Logger.log(`DEBUG: classes.length == ${classes.length}`);
  Logger.log(`DEBUG: props.length == ${props.length}`);
  Logger.log(`DEBUG:  ${classes[classes.length - 1]}`);
  Logger.log(`DEBUG:  ${props[props.length - 1]}`);
  
  const genMgs = [];
  for (let i = 0; i < classes.length; i++) {
    const classPath = classes[i][0];
    const propExpr = props[i][0];
    if (classPath && propExpr) {
      try {
        genMgs.push([generateMappingGroupId(classPath, propExpr)]);
      } catch {
        Logger.log(`WARN: Cannot process row number ${i + 1}, skipping ...`);
        genMgs.push(EMPTY_1CELL_ROW);
      }
    } else {
      Logger.log(`Skipping row number ${i + 1} ...`);
      genMgs.push(EMPTY_1CELL_ROW);
    }
  }
  sheet.getRange(TARGET_COLUMN_ADDR).setValues(genMgs);  // 2D array expected
};



function generateMgsWithFieldsSheet() {
  testGeneratePreRequisite();

  var spreadsheet = SpreadsheetApp.getActive();
  const targetSheet = generateNewMgSheetStub();
  const rulesSheet = spreadsheet.getSheetByName(RULES_SHEET_NAME);
  
  const minSdkArr = rulesSheet.getRange(MIN_SDK_VERSION_COL_ADDR).getValues();
  const maxSdkArr = rulesSheet.getRange(MAX_SDK_VERSION_COL_ADDR).getValues();
  const sdkIdArr = rulesSheet.getRange(SDK_ID_COL_ADDR).getValues();
  const defaultMgsArr = rulesSheet.getRange(DEFAULT_MG_GEN_COL_ADDR).getValues();
  const rowsNo = sdkIdArr.length;
  const sdkId1dArr = as1dArray(rulesSheet.getRange(SDK_ID_COL_ADDR).getValues());
  const absXpathArr = as1dArray(rulesSheet.getRange(NODE_XPATH_COL_ADDR).getValues());
  const isNodeArr = as1dArray(rulesSheet.getRange(IS_NODE_COL_ADDR).getValues());
  const classPathArr = as1dArray(rulesSheet.getRange(CLASS_PATH_COLUMN_ADDR).getValues());
  
  const parentNodeIdArr = as1dArray(rulesSheet.getRange(PARENT_NODE_ID_COL_ADDR).getValues());
  // Logger.log(`DEBUG: minSdkArr.length == ${minSdkArr.length}`);
  // Logger.log(`DEBUG: minSdkArr[0].length == ${minSdkArr[0].length}`);
  // Logger.log(`DEBUG: targetSheet.getDataRange().getNumRows() == ${targetSheet.getRange(MIN_SDK_VERSION_TARGET_COL_ADDR).getNumRows()}`);
  targetSheet.insertRows(2, minSdkArr.length - targetSheet.getRange(MIN_SDK_VERSION_TARGET_COL_ADDR).getNumRows());

  
  // arrays for derived values
  const nodeIdsArr = [];
  const nodeXpathArr = [];
  const prereqMgArr = [];
  const instTypeArr = [];
  const triplesMapDefMgArr = [];
  
  
  const newEntries = [];  // minimal data required to construct a full row
                          // (based on a related parent row)
  const mgDepthArr = [];


  // creating new entries for derived MGs
  for (let i = 0; i < rowsNo; i++) {
    let nodeId;
    if (isNodeArr[i]) {  // if the row is a node
      // nodeIdsArr.push(sdkId1dArr[i]);
      nodeId = sdkId1dArr[i];
      nodeXpathArr.push(absXpathArr[i]);
    } else {  // if the row is a field, then use parent node information
      let parentNodeId = parentNodeIdArr[i];
      nodeId = parentNodeId;
      // nodeIdsArr.push(parentNodeId);
      let parentNodeRowIdx = sdkId1dArr.indexOf(parentNodeId);
      assert(parentNodeRowIdx != -1);
      nodeXpathArr.push(absXpathArr[parentNodeRowIdx]);
    }
    nodeIdsArr.push(nodeId);
    let mg = defaultMgsArr[i][0];
    triplesMapDefMgArr.push(makeTriplesMapValue(mg, nodeId));
    mgDepthArr.push(getMgDepth(mg));
    let prevPrereq = generatePrerequisite(mg);
    prereqMgArr.push(prevPrereq);
    // instTypeArr.push(getLastPropPathTerm(classPathArr[i]));
    // let propPathSegments = getPathSegments(classPathArr[i]);
    let classPathTerms = getMgUsableClassesFromClassPath(classPathArr[i]);
    instTypeArr.push(classPathTerms.pop());
    while (prevPrereq) {
      let mgDepth = getMgDepth(prevPrereq);
      if (mgDepth > 0) {
        newEntry = {};
        newEntry.mgDepth = mgDepth;
        // set MG, instance type, prerequsite, triplesMapValue and row index i; rest will be taken from original rows
        newEntry.mg = prevPrereq;
        // mgDepthArr.push(getMgDepth(newEntry.mg));
        newEntry.instanceType = classPathTerms.pop();
        newEntry.dependentRowIdx = i;
        prevPrereq = generatePrerequisite(prevPrereq);
        newEntry.prerequisite = prevPrereq;
        newEntry.triplesMapValue = makeTriplesMapValue(newEntry.mg, nodeId);
        newEntries.push(newEntry);
      }
    }
  }

  Logger.log(`DEBUG: no of rows: ${targetSheet.getRange(MIN_SDK_VERSION_TARGET_COL_ADDR).getNumRows()}`);
  

  // set columns with fixed values
  // 2D array expected
  setTextFormat(targetSheet.getRange(MIN_SDK_VERSION_TARGET_COL_ADDR)).setValues(minSdkArr);  // A
  setTextFormat(targetSheet.getRange(MAX_SDK_VERSION_TARGET_COL_ADDR)).setValues(maxSdkArr);  // B
  targetSheet.getRange(MG_ID_TARGET_COL_ADDR).setValues(defaultMgsArr);  // C
  targetSheet.getRange(FIELD_ID_TARGET_COL_ADDR).setValues(sdkIdArr);  // H
  
  // set other columns
  targetSheet.getRange(INST_TYPE_TARGET_COL_ADDR).setValues(  // D
    as2dArray(instTypeArr)
  );  // 2D array expected
  targetSheet.getRange(NODE_XPATH_TARGET_COL_ADDR).setValues(  // E
    as2dArray(nodeXpathArr)
  );
  targetSheet.getRange(NID_OR_PID_OF_FLD_TARGET_COL_ADDR).setValues(  // F
    as2dArray(nodeIdsArr)
  );
  targetSheet.getRange(PREREQ_MG_TARGET_COL_ADDR).setValues(  // G
    as2dArray(prereqMgArr)
  );

  // append MG depth for sorting
  targetSheet.getRange(MG_DEPTH_TARGET_COL_HEADER_ADDR).setValue(MG_DEPTH_HEADER);
  targetSheet.getRange(MG_DEPTH_TARGET_COL_ADDR).setValues(  // I
    as2dArray(mgDepthArr)
  );

  // append Field ID order for sorting
  targetSheet.getRange(FIELD_ID_ORD_TARGET_COL_HEADER_ADDR).setValue(
    "Rules-sheet-based Field ID order"
  );
  
  // append TriplesMap
  targetSheet.getRange(TRIPLES_MAP_TARGET_COL_HEADER_ADDR).setValue(TRIPLES_MAP_HEADER);
  targetSheet.getRange(TRIPLES_MAP_TARGET_COL_ADDR).setValues(  // J
    as2dArray(triplesMapDefMgArr)
  );  
  
  
  let rowNo = defaultMgsArr.length;
  targetSheet.getRange(FIELD_ID_ORD_TARGET_COL_ADDR).setValues(  // K
    as2dArray([...Array(rowNo).keys()])
  );
  const materializedRowsData = [];
  for (let i = 0; i < rowNo; i++) {
    materializedRowsData.push([
      minSdkArr[i][0],
      maxSdkArr[i][0],
      defaultMgsArr[i][0],
      instTypeArr[i],
      nodeXpathArr[i],
      nodeIdsArr[i],
      prereqMgArr[i],
      sdkIdArr[i][0],
      triplesMapDefMgArr[i],
      i
    ])
  }
  let dataIndex = createRowsLookupIndex(materializedRowsData);
  const newRowsArr = [];
  // append new rows without duplicates
  for (let i = 0; i < newEntries.length; i++) {
    let row = newEntries[i];
    let depRowIdx = row.dependentRowIdx;  // parent row idx
    // const mgRowAlreadyDefined = false;
    let rowArr = [
        minSdkArr[depRowIdx][0],  //2d array
        maxSdkArr[depRowIdx][0],  //2d array
        row.mg,
        row.instanceType,
        nodeXpathArr[depRowIdx],
        nodeIdsArr[depRowIdx],
        row.prerequisite,
        sdkIdArr[depRowIdx][0],  //2d array
        row.mgDepth,
        row.triplesMapValue,
        depRowIdx  // original position of the parent row, 
                   // will be used for sorting
      ];
    if (!dataIndex.contains(rowArr)) {
      // targetSheet.appendRow(rowArr);
      // appendTextRow(targetSheet, rowArr);
      newRowsArr.push(rowArr);
      dataIndex.add(rowArr);
    }
  }

  appendTextRows(targetSheet, newRowsArr);

  // sort dat range by the following columns (in ascending order):
  // 1) by depth 
  // 2) Mapping Group ID
  // 3) Node XPath
  // 4) Field ID - following their order as in Rules sheet

  // let range = targetSheet.getDataRange();
  let range = targetSheet.getRange(2, 1, targetSheet.getLastRow() - 1, targetSheet.getLastColumn());
  range.sort([
    {column: MG_DEPTH_TARGET_COL_IDX, ascending: true},
    {column: MG_ID_TARGET_COL_IDX, ascending: true},
    {column: NODE_XPATH_TARGET_COL_IDX, ascending: true},
    {column: FIELD_ID_ORD_TARGET_COL_IDX, ascending: true}
  ]);
   
  // remove "Rules-sheet-based Field ID order" column as it's not needed anymore
  targetSheet.deleteColumn(FIELD_ID_ORD_TARGET_COL_IDX);

  // remove rows of depth = 0 (without MG)
  deleteRowsByColumnValue(targetSheet, 0, 2, 9);
  deleteRowsByColumnValue(targetSheet, "", 2, 3);  // remove empty cells

  // delete duplicates that could appear when omitting datatypes in default MG row range
  range = targetSheet.getRange(2, 1, targetSheet.getLastRow() - 1, targetSheet.getLastColumn());
  range.removeDuplicates();
};


/**
 * Reduces the number of rows in 'Mapping groups with fields (generated)' sheet
 * by applying rules analyzing MGs, fields and nodes and detecting rows with
 * redundant information.
 */
function constrainMgs() {
  var spreadsheet = SpreadsheetApp.getActive();
  const sourceMgsSheet = spreadsheet.getSheetByName(AUTOGEN_MGS_SHEET);
  
  ////// read source data
  const minSdkArr = as1dArray(sourceMgsSheet.getRange(MIN_SDK_VERSION_COL_ADDR).getValues());
  const maxSdkArr = as1dArray(sourceMgsSheet.getRange(MAX_SDK_VERSION_TARGET_COL_ADDR).getValues());
  const mgIdArr = as1dArray(sourceMgsSheet.getRange(MG_ID_TARGET_COL_ADDR).getValues());
  const instTypeArr = as1dArray(sourceMgsSheet.getRange(INST_TYPE_TARGET_COL_ADDR).getValues());
  const nodeXpathArr = as1dArray(sourceMgsSheet.getRange(NODE_XPATH_TARGET_COL_ADDR).getValues());
  const nidOrPidArr = as1dArray(sourceMgsSheet.getRange(NID_OR_PID_OF_FLD_TARGET_COL_ADDR).getValues());
  const prereqMgArr = as1dArray(sourceMgsSheet.getRange(PREREQ_MG_TARGET_COL_ADDR).getValues());
  const fieldIdArr  = as1dArray(sourceMgsSheet.getRange(FIELD_ID_TARGET_COL_ADDR).getValues());
  const mgDepthArr = as1dArray(sourceMgsSheet.getRange(MG_DEPTH_TARGET_COL_ADDR).getValues());
  const triplesMapArr  = as1dArray(sourceMgsSheet.getRange(TRIPLES_MAP_TARGET_COL_ADDR).getValues());


  ////// create rows index
  const columnsData = [
    minSdkArr,
    maxSdkArr,
    mgIdArr,
    instTypeArr,
    nodeXpathArr,
    nidOrPidArr,
    prereqMgArr,
    fieldIdArr,
    mgDepthArr,
    triplesMapArr
  ];
  const header = [
    "minSdk",
    "maxSdk",
    "mg",
    "instType",
    "nodeXpath",
    "nidOrPid",
    "prereqMg",
    "fieldId",
    "mgDepth",
    "triplesMap",
  ];
  rowsIndex = RowsIndex(columnsData, header);
  Logger.log(`DEBUG: Object.keys(rowsIndex.index.byOrder).length = ${Object.keys(rowsIndex.index.byOrder).length}`);
  
  parentChildrenIdx = buildParentChildrenNodeIndex(spreadsheet);
  // Logger.log(`TRACE: parentChildrenIdx = ${JSON.stringify(parentChildrenIdx)}`);
  // for (const [key, value] of Object.entries(parentChildrenIdx)) {
  //   Logger.log(`"${key}": ${JSON.stringify(value)}`);
  // }

  ////// tests
  testRemovePrereqFieldRowsForNode(RowsIndex(columnsData, header));  // rule 2
  testRemovePrereqNodeRowsForNode(RowsIndex(columnsData, header));   // rule 3

  ////// launch filtering rules on row index
  // removeRedundantRowsBySdk(rowsIndex);  // rule 1
  removePrereqFieldRows(rowsIndex);     // rule 2
  removePrereqNodeRows(rowsIndex, parentChildrenIdx);      // rule 3


  // test
  // rowsIndex.removeRowsObjects([rowsIndex.index.byOrder[3], rowsIndex.index.byOrder[11]], rowsIndex.index.byOrder);

  ////// write filtered data to a new sheet
  const targetSheet = generateNewFilteredMgSheetStub();  
  // add new rows to fit the output size
  const rowsNo = rowsIndex.getRowsNumber();
  extendSheetByColumn(targetSheet, rowsNo, MIN_SDK_VERSION_TARGET_COL_ADDR);
  setTextFormat(
    targetSheet.getRange(MIN_SDK_VERSION_TARGET_COL_ADDR)
  ).setValues(as2dArray(rowsIndex.getColumnData("minSdk")));  // A
  setTextFormat(
    targetSheet.getRange(MAX_SDK_VERSION_TARGET_COL_ADDR)
  ).setValues(as2dArray(rowsIndex.getColumnData("maxSdk")));  // B

  // set other columns
  const colsData = [
    [MG_ID_TARGET_COL_ADDR, "mg"],
    [INST_TYPE_TARGET_COL_ADDR, "instType"],
    [NODE_XPATH_TARGET_COL_ADDR, "nodeXpath"],
    [NID_OR_PID_OF_FLD_TARGET_COL_ADDR, "nidOrPid"],
    [PREREQ_MG_TARGET_COL_ADDR, "prereqMg"],
    [FIELD_ID_TARGET_COL_ADDR, "fieldId"],
    [MG_DEPTH_TARGET_COL_ADDR, "mgDepth"],
    [TRIPLES_MAP_TARGET_COL_ADDR, "triplesMap"]
  ]
  for (let i = 0; i < colsData.length; i++) {
    // Logger.log(`DEBUG: colsData[i] = ${colsData[i]}`);
    targetSheet.getRange(colsData[i][0]).setValues(
      as2dArray(rowsIndex.getColumnData(colsData[i][1]))
    );  // 2D array expected
  }
  
};