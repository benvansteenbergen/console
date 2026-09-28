// knowledge-base-upload / Verify Vectors
// The Gemini embeddings node returns empty vectors (no error) when the API call fails.
// Chunks without a vector can never be found, so the upload counts as failed.
const info = $('Upload Info').first().json;
const res = $input.first().json;
const docs = (res.data && res.data.Get && res.data.Get.Documents) || [];
let missing = 0;
for (const d of docs) {
  const v = (d._additional && d._additional.vector) || [];
  if (v.length === 0) missing++;
}
const ok = docs.length > 0 && missing === 0;
return [{ json: { ok: ok, document_id: info.document_id, tenant: info.tenant, chunks: docs.length, missing: missing } }];
