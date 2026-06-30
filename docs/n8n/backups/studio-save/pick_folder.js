// Try the found format folder first, then the created folder, then the content folder.
const searchResult = $('Search Format Folder').first().json;
const resolveResult = $('Resolve Folder Name').first().json;

let folderId;
if (searchResult && searchResult.id) {
  folderId = searchResult.id;
} else {
  try {
    const created = $('Create Format Folder').first().json;
    if (created && created.id) {
      folderId = created.id;
    }
  } catch (e) {
    // ignore
  }
}

if (folderId === undefined || folderId === null || folderId === '') {
  folderId = resolveResult.contentFolderId;
}

return [{ json: { folderId } }];
