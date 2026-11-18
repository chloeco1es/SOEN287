const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// One queue per file, so two requests can't change the same file at once
const queues = new Map();

// Only allow simple names like "users" or "tasks-<id>", never "../something"
function filePath(name) {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error(`Invalid store name: ${name}`);
  }
  return path.join(DATA_DIR, `${name}.json`);
}

// Read a JSON file. If it doesn't exist yet, return the fallback value.
async function readJSON(name, fallback) {
  try {
    const text = await fs.readFile(filePath(name), 'utf8');
    return JSON.parse(text);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback; // file not created yet
    if (err instanceof SyntaxError) {
      // Don't return the fallback here, or the next save would wipe the real data
      throw new Error(`Data file "${name}.json" is corrupted`);
    }
    throw err;
  }
}

// Write to a temporary file first, then swap it in, so a crash mid-write can't leave a half-written file
async function writeAtomic(target, data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, target);
}

// Read, change, and save a file as one step.
// `change` receives the current data and returns the new data.
function updateJSON(name, fallback, change) {
  const target = filePath(name);
  const previous = queues.get(target) || Promise.resolve();

  const run = previous
    .catch(() => {}) // a failed earlier update shouldn't block this one
    .then(async () => {
      const current = await readJSON(name, fallback);
      const updated = await change(current);
      await writeAtomic(target, updated);
      return updated;
    });

  queues.set(target, run);
  return run;
}

module.exports = { readJSON, updateJSON };