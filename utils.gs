function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

/**
 * Get numeric column index based on the column header name.
 * 
 * Uses header value stored in the first row.
*/
function getColumnIdxByHeaderName(spreadsheet, sheetName, colName, start=0) {
  return getColumnIdxByHeaderName(spreadsheet.getSheetByName(sheetName), colName, start);  
}

/**
 * Get numeric column index based on the column header name.
 * 
 * Uses header value stored in the first row.
*/
function getColumnIdxByHeaderName(sheet, colName, start=0) {
  const headers = sheet.getRange("A1:1").getValues()[0];
  const colNum = headers.indexOf(colName, fromIndex=start);
  if (colNum < 0) throw `Cannot find column '${colName}' in sheet ${sheet.getName()}!`;
  return colNum + 1;
}

/**
 * Gets 2D array of rows data that were not hidden by a filter applied to the sheet.
 */
function getVisibleSheetData(sheet, skipHeader = true) {
  console.time('getVisibleSheetData');
  var range = sheet.getDataRange();
  var rawData = range.getValues();
  var visibleRows = [];

  // Get the filtered rows (visible rows)
  var numRows = range.getNumRows();
  for (var i = 1 + skipHeader; i <= numRows; i++) { // Loop through all rows, skip header
    if (!sheet.isRowHiddenByFilter(i)) {
      visibleRows.push(rawData[i - 1]);
    }
  }
  console.timeEnd('getVisibleSheetData');
  return visibleRows;
}

/**
 * Doesn't support copying format.
 */
function copyDataBetweenSheets(sourceSheet, destSheet, sourceData, destRange, options) {
  // let destRange_ = destRange ? destRange : destSheet.getDataRange();
  console.time('copyDataBetweenSheets');
  let asText = options.hasOwnProperty('asText') ? options.asText : false;
  if (asText) {
    setTextFormat(destRange);
  }
  destRange.setValues(sourceData);
  console.timeEnd('copyDataBetweenSheets');
}
/**
 * Copies data from a sheet to another sheet (in the same spreadsheet) given ranges.
 * 
 * Pastes values and format.
*/

// function copyRangeBetweenSheets(sourceSheet, destSheet, sourceRange, destRange, options) {
//   assert(
//     Boolean(sourceRange) == Boolean(destRange),
//     "One of the ranges provided, but the other one is missing."
//   );
//   let asText = options.hasOwnProperty('asText') ? options.asText : false;

//   let sourceRange_ = sourceRange ? sourceRange : sourceSheet.getDataRange();
//   let destRange_ = destRange ? destRange : destSheet.getDataRange();
//   Logger.log(`DEBUG: sourceRange_ size: ${sourceRange_.getNumRows()} x ${sourceRange_.getNumColumns()}`);
//   Logger.log(`DEBUG: destRange_ size: ${destRange_.getNumRows()} x ${destRange_.getNumColumns()}`);
  
//   if (asText) {
//     setTextFormat(destRange_);
//   }
//   destSheet.getRange('A1').activate();
//   // SpreadsheetApp.flush();
//   // sourceRange_.copyTo(destRange_, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
//   sourceRange_.copyTo(destRange_, SpreadsheetApp.CopyPasteType.PASTE_VALUES, false);
//   SpreadsheetApp.flush();
//   // SpreadsheetApp.getActive().waitForAllDataExecutionsCompletion(60);
// }

/**
 * Copies all data from a sheet to another sheet (in the same spreadsheet).
 * 
 * Pastes values and format.
*/
// TODO: rename to copySheetDataBetweenSheets
function copyDataRangeBetweenSheets(sourceSheet, destSheet, options, skipHeader = true) {
  // copyRangeBetweenSheets(sourceSheet, destSheet, null, null, options);
  let sourceData = getVisibleSheetData(sourceSheet);
  const destRange = destSheet.getRange(1 + skipHeader, 1, sourceData.length, sourceSheet.getLastColumn());
  copyDataBetweenSheets(sourceSheet, destSheet, sourceData, destRange, options);
}

// TODO: rename to appendSourceDataAtTheEnd
function copyRangeBetweenSheetsAtTheEnd(sourceSheet, destSheet, options) {
  // Find last row with data in destination sheet
  let lastRowDest = destSheet.getLastRow(); 
  let lastColNo = sourceSheet.getLastColumn();

  // let lastRowSource = sourceSheet.getLastRow();
  // let sourceRange = sourceSheet.getRange(2, 1, lastRowSource - 1, lastColumnSource);

  let sourceData = getVisibleSheetData(sourceSheet);
  
  // Specify destination range
  let destRange = destSheet.getRange(
    lastRowDest + 1, 1, sourceData.length, lastColNo
  );

  // copyRangeBetweenSheets(sourceSheet, destSheet, sourceRange, destRange, options);
  copyDataBetweenSheets(sourceSheet, destSheet, sourceData, destRange, options);
}

/**
 * Copy the source sheet to the external spreadsheet. The function mimics copy &
 * values-and-format-only paste functionallity for two different spreadsheets that
 * is missing from the SDK.
*/
function copySheetDataAndFormatToExtSpreadsheet(sourceSheet, extSpreadsheet, newExtSheetName, asText) {
  // 1. copy the sheet to the ext spreadsheet - just for the sake of copying format
  const targetSheet = copySheetToExternalSpreadsheet(sourceSheet, extSpreadsheet, newExtSheetName, asText);
  // 2. copy data (range) from ext spreadsheet to the sheet created above - using get/setValues
  copyRangeDataToExternalSheet(sourceSheet.getDataRange(), targetSheet);
  return targetSheet;
}

/**
* Duplicate the source sheet and put it in the external spreadsheet.
* 
* The created sheet is the exact copy of the source sheet. The function cannot
* resolve formulas into values (that is perform values-only pasting).
*/
function copySheetToExternalSpreadsheet(sourceSheet, extSpreadsheet, newExtSheetName, asText) {
  let targetSheet = sourceSheet.copyTo(extSpreadsheet);
  if (asText) {
    setTextFormat(targetSheet.getDataRange());
  }
  targetSheet.setName(newExtSheetName);
  return targetSheet;
}

/**
* Copy the given range of data (values only) to the given sheet located in an
* external spreadsheet.
*/
function copyRangeDataToExternalSheet(sourceRange, extTargetSheet) {
  let targetRange = extTargetSheet.getRange(
    1, 1, sourceRange.getNumRows(), sourceRange.getNumColumns()
  );
  targetRange.setValues(sourceRange.getValues());
  return targetRange;
}

function generateTimestampFromCurrentDate() {
  const now = new Date();
  const timestamp = Utilities.formatDate(now, "CET", "yyyyddMMHHmmss");
  return timestamp;
}

function appendTimestamp(name) {
  return name + "-" + generateTimestampFromCurrentDate();
}

/**
* Given a scope of columns, delete or hide columns in that scope.
*
* The right-side scope starts from the lastRightColToKeepIdx till the end of the
* document. Columns specified by rightSideColsToHideIdxes will be kept and
* hidden. Any other column within the scope will be deleted.
*
* rightSideColsToHideIdxes is optional.
*/
function deleteOrHideAuxiliaryRightSideColumns(sheet, lastRightColToKeepIdx, rightSideColsToHideIdxes = []) {
  var firstRightColToKeepIdx = sheet.getLastColumn() + 1;
  var colsToKeep = Array.from(rightSideColsToHideIdxes).sort().reverse();
  var colsToKeepCnt = rightSideColsToHideIdxes.length;
  colsToKeep.push(lastRightColToKeepIdx);
  for (let i = 0; i < colsToKeep.length; i++) {
    deleteColumnsBetween(sheet, colsToKeep[i], firstRightColToKeepIdx);
    firstRightColToKeepIdx = colsToKeep[i];
  }
  // hide columns if they were specified
  if (Array.isArray(rightSideColsToHideIdxes) && rightSideColsToHideIdxes.length > 0) {
    sheet.hideColumns(lastRightColToKeepIdx + 1, colsToKeepCnt);
  }
}

function deleteColumnsBetween(sheet, lastLeftColToKeepIdx, firstRightColToKeepIdx) {
  var lastColToDeleteIdx = firstRightColToKeepIdx === undefined ? sheet.getLastColumn() - 1 : firstRightColToKeepIdx - 1;
  var colToDeleteNum = lastColToDeleteIdx - lastLeftColToKeepIdx;
  if (colToDeleteNum > 0) {
    Logger.log(`Delete ${colToDeleteNum} columns from ${sheet.getName()} (starting column: ${lastLeftColToKeepIdx + 1}) `)
    sheet.deleteColumns(lastLeftColToKeepIdx + 1, colToDeleteNum);

  }
}

/**
* 
* colCompIdx: index of a column for cell value comparison
*/
function findRowByValue(sheet, colCompIdx, matchText) {
  const values = sheet.getDataRange().getValues();
  const index = values.findIndex(row => row[colCompIdx - 1] === matchText);
  if (index < 0) throw `Cannot find a row with the '${matchText}' value in ${colCompIdx} column!`;
  const rowNumber = index + 1;
  return rowNumber;
}

function getCellValue(columnIdx, rowIdx, sheet) {
  // uses A1 notation
 return sheet.getRange(`${columnIdx}${rowIdx}`).getValue(); 
}

function objectMap(obj, fn, ...fnArgs) {
  const newObject = {};
  Object.keys(obj).forEach((key) => {
    newObject[key] = fn(obj[key], ...fnArgs);
  });
  return newObject;
}


// source: https://stackoverflow.com/a/53433706
function isEmptyRow(row){
  for (var columnIndex = 0; columnIndex < row.length; columnIndex++){
    var cell = row[columnIndex];
    if (cell){
      return false;
    }
  }
  return true;
}

// source: https://stackoverflow.com/a/53433706
function removeEmptyLines(sheet){
  var lastRowIndex = sheet.getLastRow();
  var lastColumnIndex = sheet.getLastColumn();
  var maxRowIndex = sheet.getMaxRows(); 
  var range = sheet.getRange(1, 1, lastRowIndex, lastColumnIndex);
  var data = range.getValues();
  sheet.deleteRows(lastRowIndex+1, maxRowIndex-lastRowIndex);

  for (var rowIndex = data.length - 1; rowIndex >= 0; rowIndex--){
    var row = data[rowIndex];

    if (isEmptyRow(row)){
      sheet.deleteRow(rowIndex + 1);
    }
  }

}

/**
 * Deletes all rows from a sheeteet that have a specific value in
 * a cell determined by given column column.
 * 
 * Based on https://stackoverflow.com/questions/75645330/delete-a-row-based-on-cell-value
*/
function deleteRowsByColumnValue(sheet, cellValue, startRowIdx, colIdx) {
  const rowsData = sheet.getRange(
    startRowIdx, 1, sheet.getLastRow() - startRowIdx + 1, sheet.getLastRow()
  ).getValues();
  let deletedCnt = 0;
  rowsData.forEach((r, i) => {
    if(r[colIdx - 1] === cellValue) {
      sheet.deleteRow(startRowIdx + i - deletedCnt++);
    }
  });
}


function createRowsLookupIndex(arr) {
  return {
    index: (
      function initIndex(a) {
        let _index = [];
        for (let i = 0; i < a.length; i++) {
          _index.push(a[i].join());
        }
        return _index;
      } 
    )(arr),
    add: function(elemArr) {
      this.index.push(elemArr.join());
    },
    contains: function(elemArr) {
      return this.index.includes(elemArr.join());
    }
  };
}


function setTextFormat(range) {
  return range.setNumberFormat('@');
}


/**
 * Append a row with data in a way that preserves original data type.
 *
 * This approach prevents from implicit conversions of numbers that are stored as strings and
 * should be interpreted as such (what happens when `sheet.appendRow` is used).
 */
function appendTextRow(sheet, rowData) {
  const lastRowIdx = sheet.getLastRow();
  sheet.insertRowAfter(lastRowIdx);
  const currRowIdx = lastRowIdx + 1;
  const rowRange = sheet.getRange(currRowIdx, 1, 1, sheet.getLastColumn());
  setTextFormat(rowRange);
  rowRange.setValues([rowData]);
  //  sheet.getRange(`${currRowIdx}:${currRowIdx}`).setNumberFormat("@"); 
}


function appendTextRows(sheet, rowsData) {
  const lastRowIdx = sheet.getLastRow();
  sheet.insertRowAfter(lastRowIdx);
  const currRowIdx = lastRowIdx + 1;
  const numOfNewRows = rowsData.length;
  const rowsRange = sheet.getRange(currRowIdx, 1, numOfNewRows, sheet.getLastColumn());
  setTextFormat(rowsRange);
  rowsRange.setValues(rowsData);
  //  sheet.getRange(`${currRowIdx}:${currRowIdx}`).setNumberFormat("@");
  
}

/**
 * Appends the value to the array indicated by the property name
 * or sets a new property value if the object doesn't have such property yet.
 * 
 * Returns the array that has been extended.
 */
function addOrAppendToArrayProperty(obj, property, value) {
    if (obj.hasOwnProperty(property)) {
        obj[property].push(value);
    } else {
        obj[property] = [value];
    }
    return obj[property];
}

function makeCompoundKey(values) {
  return values.join().trim();
}

function setCompoundKeyEntry(index, values, obj) {
  index[makeCompoundKey(values)] = obj;
}
function getByCompoundKey(index, values) {
  return index[makeCompoundKey(values)];
}

/**
 * Inserts propre number of rows to fit data
*/
function extendSheetByColumn(targetSheet, dataSize, targetColAddr, startRow=2) {
  targetSheet.insertRows(startRow, dataSize - targetSheet.getRange(targetColAddr).getNumRows());
}


function removeFromArray(obj, arr) {
  let index = arr.indexOf(obj);
  if(index !== -1) {
    arr.splice(index, 1);
  }
}

function getColumnUniqueValuesByColName(sheet, columnName, datatype=String, skipHeader=true) {
  Logger.log(`getColumnUniqueValuesByColName col name: ${columnName}`);
  const columnIdx = getColumnIdxByHeaderName(sheet, columnName, start=5);  // FIXME
  Logger.log(`columnIdx: ${columnIdx}`);
  return getColumnUniqueValuesByColIdx(sheet, columnIdx, datatype, skipHeader);
}
/**
 * @datatype A JS primitive type. It is required to avoid surprises where 3 and "3" are
 *           treated as a different value.
 */
function getColumnUniqueValuesByColIdx(sheet, columnIdx, datatype=String, skipHeader=true) {
  // range is one element smaller if header is excluded
  var range = sheet.getRange(1 + skipHeader, columnIdx, sheet.getLastRow() - skipHeader);
  var allValues = range.getValues().flat(); // Get all values in column
  var uniqueValues = [...new Set(allValues.map(x => datatype(x)))]; // Remove duplicates
  return uniqueValues;
}

// source: https://stackoverflow.com/a/19746771
function areArraysEqual(arr1, arr2) {
  return arr1.length === arr2.length && arr1.every(function(value, index) { return value === arr2[index]});
}

/**
 * Order of elements is not important.
 * 
 * source: https://stackoverflow.com/a/44827922
 */
function hasArraysSameElements(arr1, arr2) {
  const s1 = new Set(arr1);
  const s2 = new Set(arr2);
  return s1.size === s2.size && [...s1].every(value => s2.has(value));
}

function mergeAndSortArrays(arr1, arr2) {
  // Merge the arrays
  let mergedArray = [...arr1, ...arr2];

  // Remove duplicates using Set
  let uniqueArray = [...new Set(mergedArray)];

  // Sort the array
  uniqueArray.sort((a, b) => a - b);

  return uniqueArray;
}

function arrayDifference(arr1, arr2) {
  return arr1.filter(item => !arr2.includes(item));
}
