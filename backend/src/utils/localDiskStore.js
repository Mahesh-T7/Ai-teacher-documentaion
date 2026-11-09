import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory located in backend/data/
const dataDir = path.resolve(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Loads a JSON collection from disk
 */
export function loadCollection(name, defaultValue = []) {
  const filePath = path.join(dataDir, `${name}.json`);
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[LocalDiskStore] Warning reading ${name}.json:`, err.message);
    return defaultValue;
  }
}

/**
 * Saves a JSON collection to disk
 */
export function saveCollection(name, data) {
  const filePath = path.join(dataDir, `${name}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[LocalDiskStore] Error saving ${name}.json:`, err.message);
  }
}
