const fs = require('fs/promises');
const path = require('path');

// the folder where JSON files live: <project>/data
const DATA_DIR = path.join(__dirname, '..', 'data');

// read data/<name>.json and return what's inside
// if the file doesn't exist yet, then return defaultValue
async function readJSON(name, defaultValue) {
    // find specific JSON file using same method as above
    const filePath = path.join(DATA_DIR, name + '.json');
    try {
        const text = await fs.readFile(filePath, 'utf8');
        return JSON.parse(text);
    }
    catch (err) {
        if (err.code === 'ENOENT') {   // ENOENT = "Error: No Entry" (no such file or directory)
            return defaultValue;
        }
        throw err;   // let the error handler deal with it
    }
}

// save data into data/<name>.json (replaces what was there)
async function writeJSON(name, data) {
    await fs.mkdir(DATA_DIR, {recursive: true});   // create data/ if it's missing
    const filePath = path.join(DATA_DIR, name + '.json');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

module.exports = {readJSON, writeJSON};