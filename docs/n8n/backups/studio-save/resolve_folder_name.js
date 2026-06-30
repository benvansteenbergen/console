const BASE_FOLDER = '1YgOEQZwexatBIbpnY0_S22UifbXUXDZ1'; // Wingsuite Projecten root
const format = $('Webhook').first().json.body.format || '';

function folderIdOf(node) {
  try {
    const v = $(node).first().json.id;
    return (v === undefined || v === null || v === '') ? '' : v;
  } catch (e) {
    return '';
  }
}

// Prefer the client's Content folder, then the client folder, then the base folder, so a
// missing or renamed client folder never kills the save: it just lands in the base folder.
const contentFolderId = folderIdOf('Search Content Folder')
  || folderIdOf('Search Client Folder')
  || BASE_FOLDER;

const folderMap = {
  'blog-post': 'Blogpost',
  'case-study': 'Project Case',
  'product-sheet': 'Product Sheet',
  'social-media': 'Instagram',
  'email-campaign': 'Newsletter',
  'press-release': 'Press Release',
  'linkedin-post': 'Linkedin'
};
const folderName = folderMap[format] || 'Freeform';

return [{ json: { contentFolderId, folderName } }];
