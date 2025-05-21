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
function getColumnIdxByHeaderName(sheet, colName, start=0, asText=true) {
  let headers = sheet.getRange("A1:1").getValues()[0];
  let colName_ = colName;
  if (asText) {
    headers = headers.map(x => String(x));
    colName_ = String(colName);
  }
  const colNum = headers.indexOf(colName_, fromIndex=start);
  if (colNum < 0) {
    throw `Cannot find column '${colName_}' in sheet '${sheet.getName()}' (asText=${asText})!`;
  }
  return colNum + 1;
}

/**
 * Custom filtering function for a sheet data. 
 * 
 * Replaces Google Spreadsheet built-in filtering that is too slow (due to lack
 * of accompanying bulk functions) and has limitations (when copying a range
 * with a filter applied).
 *
 * @param sheet: A sheet with data. All data range will be processed.
 * @param predicates: An array of functions of signature: (Array) => Boolean.
 *                    The function is designated to work with a row data. If a
 *                    function returns false, then a row should be filtered out.
 *
 * Returns: 2D array of row data that matches the conditions specified by
 * predicates.
 */
function getFilteredData(sheet, predicates, skipHeader = true) {
  var range = sheet.getDataRange();
  var rawData = range.getValues();
  var visibleRows = [];

  // Get the filtered rows (visible rows)
  var numRows = range.getNumRows();
  let row;
  for (var i = 0 + skipHeader; i < numRows; i++) { // Loop through all rows, skip header
    row = rawData[i];
    if (predicates.every(fn => fn(row))) {
      visibleRows.push(row);
    }
  }
  return visibleRows;
}

/**
 * A replacement for `sheet.copyTo` built-in function.
 * 
 * The function works on raw JS data.
 * Doesn't support copying format, but allows to set text format for the target
 * range.
 */
function copyRawDataTo(sourceData, destRange, options) {
  let asText = options.hasOwnProperty('asText') ? options.asText : false;
  if (asText) {
    setTextFormat(destRange);
  }
  destRange.setValues(sourceData);
}

function copySheetData(sourceData, destSheet, options, offset = 0, skipHeader = true) {
  assert(
    sourceData && Array.isArray(sourceData[0]),
    "Incomplete or wrongly structured data."
  );
  let firstRowIdx = 1 + offset;
  if (skipHeader && firstRowIdx == 1) {
    firstRowIdx = 2;
  }
  const destRange = destSheet.getRange(
    firstRowIdx, 1, sourceData.length, sourceData[0].length
  );
  copyRawDataTo(sourceData, destRange, options);
}

function appendSheetData(sourceData, destSheet, options) {
  // Find last row with data in destination sheet
  let lastRowDest = destSheet.getLastRow(); 

  copySheetData(sourceData, destSheet, options, offset = lastRowDest)
}

/**
 * Copy the source sheet to the external spreadsheet. The function mimics copy &
 * values-and-format-only paste functionallity for two different spreadsheets
 * that is missing from the SDK.
*/
function copySheetDataAndFormatToExtSpreadsheet(
  sourceSheet, extSpreadsheet, newExtSheetName, asText
) {
  // 1. copy the sheet to the ext spreadsheet - just for the sake of copying format
  const targetSheet = copySheetToExternalSpreadsheet(
    sourceSheet, extSpreadsheet, newExtSheetName, asText
  );
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
function copySheetToExternalSpreadsheet(
  sourceSheet, extSpreadsheet, newExtSheetName, asText
) {
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
 * Delete or hide particular columns based on the given specification.
 * 
 * The specification contains three kinds of information affecting
 * the column range on the target sheet:
 * A. columns to be kept visible
 * B. columns to be hidden
 * C. columns to be deleted
 * 
 * The columns to be kept (A) are specified in the following way: 
 * a single range of columns ranging from the A to `lastRightColToKeepIdx`
 * column except for ones specified in `leftSideColsToDeleteIdxes`. 
 *
 * The columns to be hidden (B) are specified in the following way: 
 * columns in `lastRightColToKeepIdx` to the last column range that are specified
 *     in `rightSideColsToHideIdxes`
 * 
 * The columns to be deleted (C) are specified in the following way:
 * C1. a range from `lastRightColToKeepIdx` to the last column, excluding
 *     columns specified by `rightSideColsToHideIdxes`
 * C2. columns in A to `lastRightColToKeepIdx` column range that are specified
 *     in `leftSideColsToDeleteIdxes`
 */
function deleteOrHideColumns(
  sheet,
  lastRightColToKeepIdx,
  rightSideColsToHideIdxes = [], 
  leftSideColsToDeleteIdxes = []
) {
  deleteOrHideAuxiliaryRightSideColumns(
    sheet, lastRightColToKeepIdx, rightSideColsToHideIdxes
  );
  if (leftSideColsToDeleteIdxes) {
    deleteLeftSideColumns(
      sheet, lastRightColToKeepIdx, leftSideColsToDeleteIdxes
    );
  }
}

/**
* Deletes columns on the right-side scope.
*/
function deleteLeftSideColumns(
  sheet, lastRightColToKeepIdx, leftSideColsToDeleteIdxes
) {
  const rightCol = lastRightColToKeepIdx;
  var colsToDelete = Array.from(leftSideColsToDeleteIdxes).sort().reverse();
  for (let i = 0; i < colsToDelete.length; i++) {
    assert(
      colsToDelete[i] < rightCol, 
      `Deletion of column ${colsToDelete[i]} is not supported by this function.`
    );
    Logger.log(`DEBUG: Deleting column ${colsToDelete[i]}`);
    sheet.deleteColumn(colsToDelete[i]);
  }
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
function deleteOrHideAuxiliaryRightSideColumns(
  sheet, lastRightColToKeepIdx, rightSideColsToHideIdxes = []
) {
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
  var lastColToDeleteIdx = (
    firstRightColToKeepIdx === undefined ? sheet.getLastColumn() - 1 : firstRightColToKeepIdx - 1
  );
  var colToDeleteNum = lastColToDeleteIdx - lastLeftColToKeepIdx;
  if (colToDeleteNum > 0) {
    // Logger.log(`DEBUG: Delete ${colToDeleteNum} columns from ${sheet.getName()} (starting column: ${lastLeftColToKeepIdx + 1}) `)
    sheet.deleteColumns(lastLeftColToKeepIdx + 1, colToDeleteNum);

  }
}

/**
* Finds a row in the sheet by searching for a cell in the specified column that
* contains the given value.

* @param colCompIdx: index of a column for cell value comparison
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
  const columnIdx = getColumnIdxByHeaderName(sheet, columnName, start=5);  // FIXME
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
  return arr1.length === arr2.length && arr1.every(
    function(value, index) { return value === arr2[index]}
  );
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

function isEmptyArray(v) {
  return Array.isArray(v) && !v.length;
}


/** *** Deprecated functions *** */
/**
 * Gets a 2D array of rows data that were not hidden by a filter applied to the sheet.
 */
function getVisibleSheetData(sheet, skipHeader = true) {
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
  return visibleRows;
}