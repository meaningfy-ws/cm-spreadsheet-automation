/**
 * Core & utility functions for generating Mapping Groups.
 */

// external classes that won't be excluded from a class path when constructing an MG ID
PREDEFINED_MG_USABLE_EXT_CLASSES = [
  "adms:Identifier",
  "cpov:ContactPoint",
  "dct:Location",
  "locn:Address",
  "org:Organization",
  "person:Person"
]


/**
 * @param {String} classPath            SPARQL property path.
 * @param {String} propertyExpression   SPARQL expression containing a property path.
 *                                      Expressions that don't contain property path are
 *                                      not supported.
 */
function generateMappingGroupId(classPath, propertyExpression) {  
  const classes = getMgUsableClassesFromClassPath(classPath, true);
  const segments = [];

  if (isAtomic(classes)) {
    segments.push(classes[0]);  // use only the first class
  } else {
    const propStr = getPropertyPathFromExpression(propertyExpression);
    // TODO bind prop filtering with class filtering
    // const properties = getPathSegments(propStr, true);
    const properties = getPropertyPathSegments(propStr, classes);
    // Logger.log(`DEBUG: classes == ${classes} (after)`);
    // Logger.log(`DEBUG: properties == ${properties} (after)`);
    
    // remove the last type (either datatype or class)
    // classes.pop();
    // remove the last property (either datatype or class property)
    // properties.pop();

    assert(properties.length == classes.length -1);
    segments.push(classes.pop());
    
    for (let i = classes.length - 1; i >= 0; i--) {
      segments.push(properties[i]);
      segments.push(classes[i]);
    }
  }
  return buildMg(segments);
}

function getPathSegments(path, removePrefix) {
  const segments = path.replaceAll(' ', '').split('/');
  if (removePrefix) {
    const segmentsWoPrefixes = [];
    for (let i = 0; i < segments.length; i++) {
      segmentsWoPrefixes.push(getCurieLocalPart(segments[i]));
    }
    return segmentsWoPrefixes;
  }
  return segments;
}

/**
 * Extracts property terms from a property path and returns terms that corresponds to
 * the given array of related class path terms.
 * 
 * Uses relatedClassPathTermsArr to determine whether the last property needs
 * to be left out.
 */
function getPropertyPathSegments(propertyPath, relatedClassPathTermsArr) {
  const properties = getPathSegments(propertyPath, true);
  // Logger.log(`DEBUG: properties == ${properties} (before)`);
  if (properties.length == relatedClassPathTermsArr.length) {
    properties.pop();
  }
  return properties;
}

/**
 * Returns an array of class terms that can be used for MG construction purposes.
 * 
 * The function performs conditional exclusion of the last term according to a business rule.
 * See `isMgUsableClass`.
 */
function getMgUsableClassesFromClassPath(classPath, removePrefix) {
  const terms = getPathSegments(classPath);
  // Logger.log(`DEBUG: terms == ${terms} (before)`);
  if (!isMgUsableClass(terms[terms.length - 1])) {
    terms.pop();
  }
  if (removePrefix) {
    let terms_ = [];
    for (let i = 0; i < terms.length; i++) {
      terms_.push(getCurieLocalPart(terms[i]));
    }
    return terms_;
  }
  return terms;
}

/**
 * Determines whether a given term represents one of accepted classes allowed to be a
 * part of an MG ID.
 * 
 * A term is usable if:
 * - is an ePO class (has epo' or 'epo-<X>' prefix)
 * - is the one of the predefined classes (as defined in `PREDEFINED_MG_USABLE_EXT_CLASSES`):
 *   * adms:Identifier
 *   * cpov:ContactPoint
 *   * dct:Location
 *   * locn:Address
 *   * org:Organization
 *   * person:Person
 */
function isMgUsableClass(term) {
  if (PREDEFINED_MG_USABLE_EXT_CLASSES.includes(term)) {
    return true;
  }
  const prefix = getCuriePrefix(term);
  return prefix === "epo" || prefix.startsWith("epo-");
}

function getCurieLocalPart(curie) {
  return curie.split(':').pop();
}

function getCuriePrefix(curie) {
  return curie.split(':').shift();
}

/**
 * An atomic sequence is such one that would result in a MG consisting of only a single class,
 * e.g. MG-Notice
 * 
 * @param {Array} classesSequence Has to contain only class terms
 */
function isAtomic(classesSequence) {
  assert(classesSequence.length > 0);
  return classesSequence.length < 2;
}

/**
 * @param {Array} segments  An array of properly ordered class-based and property-based names
 * 
 */
function buildMg(segments) {
  const segmentStr = segments.join("-");
  return `MG-${segmentStr}`;
}

/**
 * Supports simple expressions, that is containing a single BGP with a property (path) on a predicate position.
 */
function getPropertyPathFromExpression(propExpr) {
  propExpr = propExpr.trim();
  // assert(propExpr.endsWith(" ."), `Invalid path expression: ${propExpr}`);
  var trailingDotOffset;
  if (propExpr.endsWith(" .")) {
    trailingDotOffset = 2;
  } else {
    trailingDotOffset = 0;
  }
  const reversedPropExpr = propExpr.split('').reverse().join('');
  const propPath = propExpr.substring(
    propExpr.indexOf(" ") + 1,
    propExpr.length - reversedPropExpr.indexOf(" ", trailingDotOffset)
  );
  return propPath.trim();
}

function generateNewMgSheetStub() {
  var spreadsheet = SpreadsheetApp.getActive();
  const newSheet = spreadsheet.insertSheet(NEW_MGS_WITH_FLDS_SHEET_NAME);
  newSheet.getRange("A1:H1").setValues(NEW_MGS_WITH_FLDS_SHEET_HEADER);  
  return newSheet;
};

function generateNewFilteredMgSheetStub() {
  var spreadsheet = SpreadsheetApp.getActive();
  const newSheet = spreadsheet.insertSheet(NEW_FILTERED_MGS_WITH_FLDS_SHEET_NAME);
  newSheet.getRange("A1:J1").setValues(MGS_WITH_FLDS_EXT_SHEET_HEADER);  
  return newSheet;
};


/**
 * Get an MG depth that is a number of classes that the MG contains
 */
function getMgDepth(mg) {
  if (mg.trim()) {
    assert(mg.startsWith(mg, "MG-"));
    const segmentsNo = mg.split("-").length - 1;  // exclude the leading 'MG-'
    assert(segmentsNo % 2 != 0, "number of segments in the MG must be odd");
    return (segmentsNo + 1) / 2; 
  } 
  return 0;
}


/**
 * 
 * Returns either a smaller MG or ""
 */
function generatePrerequisite(mg) {
    if (mg.trim()) {
      const segments = mg.split("-");
      assert(segments.shift() === "MG", `Invalid MG: ${mg}`);  // remove the MG label and ensure that that's what is actually being removed
      if (segments.length < 3) {  // no prerequisite
          return "";
      } else {
          return ["MG"].concat(segments.slice(2, segments.length)).join("-");
      }
    }
    return "";
}


/**
 * Returns 1D array based on the given 2D array. It only supports one special case of 
 * a 2D array, that is [[elem1], [elem2], ...]
 * 
 * Returns: [elem1, elem2, ...]
 */
function as1dArray(twoDimArray) {
  return twoDimArray.reduce(function(prev, next) {
    return prev.concat(next);
  });
}

/**
 * * Returns 2D array based on the given 1D array.
 * Given [elem1, elem2, ...], it returns  [[elem1], [elem2], ...]
 */
function as2dArray(array) {
  
  const res = [];
  for (let i = 0; i < array.length; i++) {
    res.push([array[i]]);
  }
  return res;
}


function makeTriplesMapValue(mgId, nodeId) {
	return `tedm:${mgId}_${nodeId}`;
};


function isNodeRow(obj) {
  return obj.fieldId.startsWith("ND-");
}

/**
 * Index storing data of a sheet rows. 
 * Each row is represented as an object.
 * The index supports several views that are calculated once during initialization. 
 * 
 * @typedef {Object} RowsIndex
 * @property {Array} header - Array with names representing column headers that will be used as
 *                            a row object properties.
 * @property {Object} index - a compound object with several objects offering alternative views
 *                            of the same data.
 */
function RowsIndex(arr, header) {
  return {
    header: header,
    index: (
      function initIndexFromColumns(twoDimArr, header) {   // each nested array corresponds to a column        
        let _index = {
          byOrder: {},  // 1-to-1 index
          nodeRows: {},  // 1-to-many index
          fieldRows: {},  // 1-to-many index
          fieldByParentNodeMgSdk: {},  // 1-to-many index
          byParentNodeMgFieldSdk: {},  // 1-to-1 index; supports both fields and nodes
          nodeByNodeidMgSdk: {},  // 1-to-1 index
          nodeByNodeidPrereqSdk: {},  // 1-to-1 index
          _refs: {}   // special auxilary index keeping references of arrays belonging to
                      // other indices that hold a row object (identified by a row idx)
        };
        
        const rowsNum = twoDimArr[0].length;
        // Logger.log(`DEBUG: rowsNum = ${rowsNum}`);
        for (let i = 0; i < rowsNum; i++) {
          rowObj = {};
          for (let j = 0; j < twoDimArr.length; j++) {
            rowObj[header[j]] = twoDimArr[j][i];
          }
          _index.byOrder[i] = rowObj;
          if (isNodeRow(rowObj)) {
            let entryArrNr = addOrAppendToArrayProperty(_index.nodeRows, rowObj.fieldId, rowObj);
            addOrAppendToArrayProperty(_index._refs, i, entryArrNr);  // update refs index
            
            setCompoundKeyEntry(
              _index.nodeByNodeidMgSdk,
              [rowObj.nidOrPid, rowObj.mg, rowObj.minSdk, rowObj.maxSdk],
              rowObj
            );

            setCompoundKeyEntry(
              _index.nodeByNodeidPrereqSdk,
              [rowObj.nidOrPid, rowObj.prereqMg, rowObj.minSdk, rowObj.maxSdk],
              rowObj
            );
            // Logger.log(`TRACE: ${JSON.stringify([rowObj.nidOrPid, rowObj.prereqMg, rowObj.minSdk, rowObj.maxSdk])}`);
          }
          else {
            let entryArrFr = addOrAppendToArrayProperty(_index.fieldRows, rowObj.fieldId, rowObj);
            addOrAppendToArrayProperty(_index._refs, i, entryArrFr);  // update refs index

            const key = makeCompoundKey([rowObj.nidOrPid, rowObj.mg, rowObj.minSdk, rowObj.maxSdk]);
            let entryArr = addOrAppendToArrayProperty(_index.fieldByParentNodeMgSdk, key, rowObj);
            addOrAppendToArrayProperty(_index._refs, i, entryArr);  // update refs index
          }

          setCompoundKeyEntry(
            _index.byParentNodeMgFieldSdk,
            [rowObj.nidOrPid, rowObj.mg, rowObj.fieldId, rowObj.minSdk, rowObj.maxSdk],
            rowObj
          );
          
          // ... add initialization of other indices here if needed
        }
        return _index;
      } 
    )(arr, header),
    getNodeRows: function(orderByMgDepth) {
      rows = Object.values(this.index.nodeRows).flat();
      if (orderByMgDepth) {
        return rows.sort((a,b) => b.mgDepth - a.mgDepth);  // desc
      }
      return rows;
    },
    getNodeRowByMgPrereq: function(prereq, id, minSdk, maxSdk) {
      // Logger.log(`DEBUG: getNodeRowByMgPrereq keys: ${JSON.stringify([id, prereq, minSdk, maxSdk])}`);
      return getByCompoundKey(this.index.nodeByNodeidPrereqSdk, [id, prereq, minSdk, maxSdk]);
    },
    getNodeRowByMg: function(mg, id, minSdk, maxSdk) {
      // Logger.log(`DEBUG: getNodeRowByMg keys: ${JSON.stringify([id, mg, minSdk, maxSdk])}`);
      return getByCompoundKey(this.index.nodeByNodeidMgSdk, [id, mg, minSdk, maxSdk]);
    },
    getFieldRows: function(parentNodeId, mg, minSdk, maxSdk) {
      // Logger.log(`DEBUG: getFieldRows keys: ${JSON.stringify([parentNodeId, mg, minSdk, maxSdk])}`);
      return getByCompoundKey(this.index.fieldByParentNodeMgSdk, [parentNodeId, mg, minSdk, maxSdk]);
    },
    // get a row of an MG that is a prerequisite for the given row
    getRowByRelatedRowPrereqMg: function(fldRowObj) {
      // Logger.log(`Looking for a row with data: ${JSON.stringify(
      //   [fldRowObj.nidOrPid, fldRowObj.prereqMg, fldRowObj.fieldId, fldRowObj.minSdk, fldRowObj.maxSdk]
      // )} ...`);
      return getByCompoundKey(
        this.index.byParentNodeMgFieldSdk,
        [fldRowObj.nidOrPid, fldRowObj.prereqMg, fldRowObj.fieldId, fldRowObj.minSdk, fldRowObj.maxSdk]
      );
    },
    /**
     * Finds rows that have MG ids that are direct or indirect prerequisites (MG)
     * of an MG of the given row.
     */
    findDependentRows: function(startingRow) {
      return function _findDependentRowsRec(row, self, startRow=false) {
        // Logger.log(`DEBUG: _findDependentFieldRowsRec -> row: ${JSON.stringify(row)}`)
        let prereqRow;
        if (Boolean(row.prereqMg) && (prereqRow = self.getRowByRelatedRowPrereqMg(row)))  
            return _findDependentRowsRec(
              prereqRow,
              self
            ).concat((startRow) ? [] : [row])
        else
          return startRow ? [] : [row];
      }(startingRow, this, startRow=true)
    },
    getColumnData: function(colId) {
      assert(this.header.includes(colId));
      return Object.values(this.index.byOrder).map((r) => r[colId]);
    },
    getRowsNumber: function() {
      return Object.values(this.index.byOrder).length;
    },
    removeRowsObjects: function(objs) {   
      // remove objects from 1-to-1 indexes
      removeEntriesFromIndex(objs, this.index.byOrder);
      removeEntriesFromIndex(objs, this.index.byParentNodeMgFieldSdk);
      removeEntriesFromIndex(objs, this.index.nodeByNodeidPrereqSdk);
      removeEntriesFromIndex(objs, this.index.nodeByNodeidMgSdk);
      
      // remove objects from 1-to-many indexes
      let filteredByOrderIdx = getFilteredIndexByValues(this.index.byOrder, objs);
      for (const [key, obj] of Object.entries(filteredByOrderIdx)) {
        for (const refArr of this.index._refs[key]) {
          removeFromArray(obj, refArr);
        }
      }
    }
  };
}

/**
 * Deletes multiple objects that are assigned to properties of the given index object.
 */
function removeEntriesFromIndex(values, index) {
  let keys = getKeysByValues(index, values);
  const diff = values.length - keys.length;
  if (diff) {
    Logger.log(`WARN: cannot find index entries to be deleted for ${diff} rows. The rows could have been already deleted.`);
  }
  for (let i = 0; i < keys.length; i++) {
    // Logger.log(`DEBUG: delete ${JSON.stringify(index[keys[i]])} (key=${keys[i]})`);
    delete index[keys[i]];
  }
}

function getKeysByValues(index, values) {
  return Object.keys(index).filter(k => values.includes(index[k]));
}


function getFilteredIndexByValues(index, values) {
  return Object.fromEntries(Object.entries(index).filter(([k,v]) => values.includes(v)));
}


/**
 * * Remove prerequisite MG lines of  Fields that belong to the same triplemap  as the Node of these fields.
 * * Implementation of the rule 2: 
 * https://meaningfy.atlassian.net/wiki/spaces/T/pages/1898348546/Mapping+Groups#Constrain-MGs-with-Fields-sheet-Rules
 * 
 * The function iterates over all node rows and for each node row
 * and associated with the "field parent row", removes prerequisite
 * (dependent) rows that are redundant.
 *
 * As a result of this function, selected rows from dataIndex are removed.
 * 
 * @param {RowsIndex} dataIndex Mutable index with rows data.
 */
function removePrereqFieldRows(dataIndex) {
  const nodeRows = dataIndex.getNodeRows(orderByMgDepth=true);
  Logger.log(`DEBUG: nodeRows.length = ${nodeRows.length}`);
  removePrereqFieldRowsForNode(dataIndex, nodeRows);
}

function removePrereqFieldRowsForNode(dataIndex, nodeRows) {
  for (const nodeRow of nodeRows) {
  Logger.log(`DEBUG: nodeRow = ${JSON.stringify(nodeRow)}`);
    const fieldsRows = dataIndex.getFieldRows(
      nodeRow.fieldId, nodeRow.mg, nodeRow.minSdk, nodeRow.maxSdk
    );
    if (fieldsRows) {
      Logger.log(`DEBUG: fieldsRows = ${JSON.stringify(fieldsRows)}`);
      for (const fieldRow of fieldsRows) {
        Logger.log(`DEBUG: current fieldRow = ${JSON.stringify(fieldRow)}`);
        const depFldRows = dataIndex.findDependentRows(fieldRow);
        if (depFldRows) {
          Logger.log(`DEBUG: Rows to be removed: ${JSON.stringify(depFldRows)}`);
          dataIndex.removeRowsObjects(depFldRows);
        }
      }
    } else
      Logger.log(
        `INFO: No field rows found for node '${nodeRow.fieldId}' (${JSON.stringify(nodeRow)})`
      );
  }
}

/**
 * Implementation of the rule 1: https://meaningfy.atlassian.net/wiki/spaces/T/pages/1898348546/Mapping+Groups#Constrain-MGs-with-Fields-sheet-Rules
 * 
 * As a result, the function reduces number of rows in the given index.
 * 
 * @param {RowsIndex} dataIndex Mutable index with rows data.
 */
function removeRedundantRowsBySdk(dataIndex) {

}


/**
 * Implementation of the rule 3: https://meaningfy.atlassian.net/wiki/spaces/T/pages/1898348546/Mapping+Groups#Constrain-MGs-with-Fields-sheet-Rules
 * 
 * @param {RowsIndex} dataIndex Mutable index with rows data.
 */
function removePrereqNodeRows(dataIndex, parentChildrenIdx) {
  Logger.log(`*** INFO: Starting removePrereqNodeRows function (rule 3) ... ***`);
  const nodeRows = dataIndex.getNodeRows(orderByMgDepth=true);
  
  Logger.log(`DEBUG: nodeRows.length = ${nodeRows.length}`);
  removePrereqNodeRowsForNode(dataIndex, parentChildrenIdx, nodeRows);
}

function removePrereqNodeRowsForNode(dataIndex, parentChildrenIdx, nodeRows) {
  for (const nodeRow of nodeRows) {
    Logger.log(`EXP: Processing next parent row "${JSON.stringify(nodeRow)}" ...`);
    let children = getNodeChildrenRowsWithMg(nodeRow, dataIndex, parentChildrenIdx);
    if (children) {
      Logger.log(`EXP: Found ${children.length} children matching MG criteria`);
      let i = 0;  // TODO only for logging purposes, remove later
      for (const child of children) {
        Logger.log(`EXP: Processing next children row "${JSON.stringify(child)}" (${i+1}/${children.length}) ...`);
        rows = dataIndex.findDependentRows(child); // by MG prereq path, by field id
        Logger.log(`EXP: Found ${rows.length} dependent rows`);
        let reducedRows = excludeRowsWoCorrespondingParentRow(
          rows, nodeRow.fieldId, dataIndex
        );
        if (reducedRows) {
          Logger.log(`EXP: Removing ${reducedRows.length} `
            + `(out of ${rows.length}) dependent rows`
          );
          Logger.log(`DEBUG: Rows to be removed: ${JSON.stringify(reducedRows)}`);
          dataIndex.removeRowsObjects(reducedRows);
        } else {
          Logger.log(`EXP: No rows to be removed (out of ${rows.length} dependent rows)`);
        }
      }
    }
  }
}


/**
 * Returns rows of nodes that have the given node as parent
 * and have the given node MG ID set as a prerequisite MG.
 */
function getNodeChildrenRowsWithMg(nodeRow, dataIndex, parentChildrenIdx) {
  let childrenRows = [];
  const parentId = nodeRow.fieldId;
  const childPrereqMg = nodeRow.mg;
  if (parentId in parentChildrenIdx) {
    const childrenIds = parentChildrenIdx[parentId];
    Logger.log(`DEBUG: childrenIds = ${JSON.stringify(childrenIds)}`);
    for (const cid of childrenIds) {
      let row = dataIndex.getNodeRowByMgPrereq(
        prereq=childPrereqMg,
        id=cid,
        nodeRow.minSdk,
        nodeRow.maxSdk
      );
      if (row) {
        Logger.log(`Y: Found row: ${JSON.stringify(row)}`);
        childrenRows.push(row);
        // childrenRows.push(
        //   dataIndex.getNodeRowByMgPrereq(
        //     prereq=childPrereqMg,
        //     id=cid,
        //     nodeRow.minSdk,
        //     nodeRow.maxSdk
        //   )
        // );
      } else {
        Logger.log(`DEBUG: Parent row has children but no suitable `
          + `row found due to MG condition (child: ${cid})`
        );
      }
    }
  }
  Logger.log(`X: Return (${JSON.stringify(childrenRows)})`);
  return childrenRows;
}

/**
 * Returns a new array of rows, excluding those without a corresponding parent row.
 */
function excludeRowsWoCorrespondingParentRow(rows, parentNodeId, dataIndex) {
  const filteredRows = [];
  for (const row of rows) {
    if (findEquivalentParentNodeRow(row, parentNodeId, dataIndex)) {
      filteredRows.push(row);
    } else {
      Logger.log(`DEBUG: Cannot find corresponding parent node row:`
        + `(mg=${row.mg}, nodeId=${parentNodeId}, minSdk=${row.minSdk}, `
        + `maxSdk=${row.maxSdk}).The row will be excluded.`
      );
    }
  }
  return filteredRows;
}

/**
 * Returns an equivalent row for the parent of the given node.
 */
function findEquivalentParentNodeRow(nodeRow, parentNodeId, dataIndex) {
  return dataIndex.getNodeRowByMg(nodeRow.mg, parentNodeId, nodeRow.minSdk, nodeRow.maxSdk);
}

/**
 * Builds a parent - children index using data from the `Rules` sheet.
 *
 * This index reflects the hierarchy of nodes.
 */
function buildParentChildrenNodeIndex(spreadsheet) {
  // 1. read data from `Rules` sheet
  const rulesSheet = spreadsheet.getSheetByName(RULES_SHEET_NAME);
  const sdkIdArr = as1dArray(rulesSheet.getRange(SDK_ID_COL_ADDR).getValues());
  const parentIdArr = as1dArray(rulesSheet.getRange(PARENT_ID_COL_ADDR).getValues());
  assert(sdkIdArr.length == parentIdArr.length);
  
  // 2. build the index
  const idx = {};
  for (let i = 0; i < sdkIdArr.length; i++) {
    let nodeId = sdkIdArr[i];
    let parentId = parentIdArr[i];
    if (parentId) {
      addOrAppendToArrayProperty(idx, parentId, nodeId);
    }
  }
  return idx;
}
