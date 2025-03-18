function getBlobs(folder) {
  let blobs = [];
  let files = folder.getFiles();
  while (files.hasNext()) {
      blobs.push(files.next().getBlob());
  }
  return blobs;
}

/*
Create zip archive containing files in a given folder.
The archive is stored in the same folder.
*/
function zipFilesInFolder(folder, filename) {
//   const zipped = Utilities.zip(getBlobs(folder), filename + '.zip');
//   return folder.getParents().next().createFile(zipped).getId();
  return folder.createFile(Utilities.zip(getBlobs(folder), filename + '.zip')).getId();
}
  