// scripts/run-poller.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import handler from '../api/cron/match-poller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read service account key
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Service account key not found at:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = fs.readFileSync(serviceAccountPath, 'utf8');
process.env.FIREBASE_SERVICE_ACCOUNT = serviceAccount;
process.env.NODE_ENV = 'development';

const req = {
  headers: {},
};

const res = {
  status(code) {
    console.log(`[Status] ${code}`);
    return this;
  },
  json(data) {
    console.log('[JSON Output]:', JSON.stringify(data, null, 2));
    return this;
  },
};

console.log('Running match poller...');
handler(req, res).catch(console.error);
