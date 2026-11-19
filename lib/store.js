const fs = require('fs/promises');
const path = require('path');
const { put, get, BlobPreconditionFailedError } = require('@vercel/blob');

// On Vercel, files saved to disk disappear, so use the private Blob store there.
// On your laptop, use plain JSON files in data/ (no Blob setup needed).
// Vercel sets the VERCEL environment variable on every deployment.
const USE_BLOB = Boolean(process.env.VERCEL);

const DATA_DIR = path.join(__dirname, '..', 'data');
const MAX_RETRIES = 5;

// One queue per store name, so two requests in the same server copy take turns
const queues = new Map();

// Only allow simple names like "users" or "tasks-<id>", never "../something"
function checkName(name) {
  if (typeof name !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error(`Invalid store name: ${name}`);
  }
}

// Don't fall back to an empty value on bad JSON, or the next save would wipe the real data
function parse(name, text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Data file "${name}.json" is corrupted`);
  }
}

// ---------- Local files ----------

async function readLocal(name) {
  try {
    const text = await fs.readFile(path.join(DATA_DIR, `${name}.json`), 'utf8');
    return { data: parse(name, text) };
  } catch (err) {
    if (err.code === 'ENOENT') return null; // file not created yet
    throw err;
  }
}

// Write to a temporary file first, then swap it in,
// so a crash mid-write can't leave a half-written file
async function writeLocal(name, data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const target = path.join(DATA_DIR, `${name}.json`);
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, target);
}

// ---------- Vercel Blob ----------

const blobPath = (name) => `data/${name}.json`;

async function readBlob(name) {
  // useCache: false so we always get the latest save, not a cached copy up to 60s old
  const result = await get(blobPath(name), { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) return null; // not created yet
  const text = await new Response(result.stream).text();
  return { data: parse(name, text), etag: result.blob.etag };
}

async function writeBlob(name, data, etag) {
  await put(blobPath(name), JSON.stringify(data, null, 2), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false, // keep the exact name so we can find it again
    // File exists: only save if nobody changed it since we read it (ETag check).
    // File is new: refuse to overwrite one another request just created.
    ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
  });
}

// ---------- What the rest of the app uses ----------

// Read a store. If it doesn't exist yet, return the fallback value.
async function readJSON(name, fallback) {
  checkName(name);
  const found = USE_BLOB ? await readBlob(name) : await readLocal(name);
  return found ? found.data : fallback;
}

// Read, change, and save a store as one step.
// `change` receives the current data and returns the new data.
function updateJSON(name, fallback, change) {
  checkName(name);
  const previous = queues.get(name) || Promise.resolve();
  const run = previous
    .catch(() => {}) // a failed earlier update shouldn't block this one
    .then(() => applyUpdate(name, fallback, change));
  queues.set(name, run);
  return run;
}

async function applyUpdate(name, fallback, change) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const found = USE_BLOB ? await readBlob(name) : await readLocal(name);
    const current = found ? found.data : structuredClone(fallback);
    const updated = await change(current);

    if (!USE_BLOB) {
      await writeLocal(name, updated);
      return updated;
    }

    try {
      await writeBlob(name, updated, found && found.etag);
      return updated;
    } catch (err) {
      // Another server copy saved first: re-read its version and apply our change again
      if (err instanceof BlobPreconditionFailedError && attempt < MAX_RETRIES) continue;
      throw err;
    }
  }
}

module.exports = { readJSON, updateJSON };
