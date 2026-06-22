const formData = $('On form submission').first().json;
const form = $('Form').first().json;
const NEW_COMPANY = '➕ Create new company';

// Resolve the company robustly across both branches: an existing client (form.client IS the
// company) or a freshly created one (use the typed Company Name). Previously this read from
// $input, which on the create-new-company branch is the Postgres result ({key}) and has neither
// field, so companyName was undefined and .toLowerCase() threw.
let companyName = (form.client && form.client !== NEW_COMPANY)
  ? form.client
  : form['Company Name'];

companyName = String(companyName || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
let password = '';
for (let i = 0; i < 16; i++) {
  password += chars.charAt(Math.floor(Math.random() * chars.length));
}

return [{
  json: {
    ...formData,
    password,
    companyName
  }
}];
