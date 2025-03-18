/**
 * Google Drive API utility functions.
 */

function createNewSubfolder(rootFolderId, subfolderName) {
  const parentFolder = DriveApp.getFolderById(rootFolderId);
  return parentFolder.createFolder(subfolderName);
}

function createNewSpreadsheet(spreadsheetName) {
  return SpreadsheetApp.create(spreadsheetName);
};

function duplicateGoogleDriveFile(fileId, newFileName, destFolder) {
  return DriveApp.getFileById(fileId).makeCopy(newFileName, destFolder); 
};

function duplicateSpreadsheet(spreadsheetName) {
  return SpreadsheetApp.create(spreadsheetName);
};

function listFilesInFolder(folder) {
  const files = folder.getFiles();
  var filenames = [];
  while (files.hasNext()) {
    const file = files.next();
    filenames.push(file.getName());
  }
  return filenames;
}