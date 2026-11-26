// Cliente Supabase (PostgREST, fetch directo) — portado de vercel-app/index.html.
// La app nunca guarda llaves: al cargar pide /api/config y usa
// NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
// que Vercel inyecta en esa función.

export const FALLBACK_WEEK = '2026-11-02';
export const FALLBACK_INV_WEEK = '2026-11-23';

let cfg = { url: null, anonKey: null };

export function getCfg() {
  return cfg;
}

export async function loadConfig() {
  try {
    const r = await fetch('/api/config', { cache: 'no-store' });
    if (!r.ok) throw new Error('config HTTP ' + r.status);
    const j = await r.json();
    cfg = { url: j.url || null, anonKey: j.anonKey || null };
  } catch (e) {
    cfg = { url: null, anonKey: null };
  }
  return !!(cfg.url && cfg.anonKey);
}

export async function sb(resource, opts = {}) {
  const qs = new URLSearchParams();
  if (opts.select) qs.set('select', opts.select);
  if (opts.order) qs.set('order', opts.order);
  if (opts.limit) qs.set('limit', String(opts.limit));
  if (opts.query)
    Object.keys(opts.query).forEach((k) => {
      const v = opts.query[k];
      if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
      else qs.set(k, v);
    });
  const url =
    cfg.url.replace(/\/$/, '') + '/rest/v1/' + resource + (qs.toString() ? '?' + qs.toString() : '');
  const headers = {
    apikey: cfg.anonKey,
    Authorization: 'Bearer ' + cfg.anonKey,
    Accept: 'application/json',
  };
  if (opts.prefer) headers.Prefer = opts.prefer;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    const err = new Error('Supabase ' + res.status);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function sbChunks(resource, rows, opts = {}) {
  // Inserta en bloques de 40 filas para no saturar la petición.
  const out = [];
  for (let i = 0; i < rows.length; i += 40) {
    const chunk = rows.slice(i, i + 40);
    const r = await sb(resource, {
      ...opts,
      method: 'POST',
      body: chunk,
      prefer: opts.prefer || 'return=representation',
    });
    if (Array.isArray(r)) out.push(...r);
  }
  return out;
}

export function storageBase() {
  return cfg.url.replace(/\/$/, '');
}

export async function storageUpload(bucket, path, file) {
  const res = await fetch(
    storageBase() + '/storage/v1/object/' + bucket + '/' + encodeURIComponent(path),
    {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: 'Bearer ' + cfg.anonKey,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    },
  );
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 404 || /bucket not found/i.test(t)) {
      const err = new Error('BUCKET_MISSING');
      err.status = res.status;
      throw err;
    }
    throw new Error('Storage ' + res.status + (t ? ' · ' + t.slice(0, 200) : ''));
  }
  return storageBase() + '/storage/v1/object/public/' + bucket + '/' + encodeURIComponent(path);
}

export async function storageDelete(bucket, path) {
  const res = await fetch(
    storageBase() + '/storage/v1/object/' + bucket + '/' + encodeURIComponent(path),
    {
      method: 'DELETE',
      headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey },
    },
  );
  if (!res.ok && res.status !== 404) {
    const t = await res.text();
    throw new Error('Storage ' + res.status + (t ? ' · ' + t.slice(0, 120) : ''));
  }
}
