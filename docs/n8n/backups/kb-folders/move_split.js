// knowledge-base-move / Split Chunks
// One item per chunk to PATCH; a single {skip:true} item when there is nothing to move,
// so the workflow still reaches Respond.
const q = $('Build Query').first().json;
const res = $input.first().json || {};
const get = (res.data && res.data.Get) || {};
const out = [];
[['u', q.tenant_u], ['c', q.tenant_c]].forEach(function (pair) {
  const rows = Array.isArray(get[pair[0]]) ? get[pair[0]] : [];
  rows.forEach(function (o) {
    const id = o._additional && o._additional.id;
    if (id) out.push({ json: {
      skip: false,
      id: id,
      tenant: pair[1],
      patch: JSON.stringify({ class: 'Documents', tenant: pair[1], properties: { folder_id: q.folder_id } }),
    } });
  });
});
if (out.length === 0 || q.count === 0) return [{ json: { skip: true } }];
return out;
