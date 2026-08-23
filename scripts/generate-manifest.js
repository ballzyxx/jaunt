'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'manifest.json');
const FILE_ENTRIES = [
    "README.md",
    "index.js",
    "module.json",
    "settings_migrator.js"
];
const DEFS = {
    "C_PLAYER_LOCATION": 5,
    "C_START_INSTANCE_SKILL": [7, 8],
    "S_ABNORMALITY_BEGIN": 4,
    "S_ABNORMALITY_END": 1,
    "S_ACTION_END": 5,
    "S_ACTION_STAGE": 9,
    "S_CANNOT_START_SKILL": 4,
    "S_DESPAWN_DROPITEM": 4,
    "S_DESPAWN_NPC": 3,
    "S_INSTANT_MOVE": 3,
    "S_LEAVE_PARTY": 1,
    "S_LOAD_TOPO": 3,
    "S_LOGIN": 14,
    "S_NPC_LOCATION": 3,
    "S_PARTY_MEMBER_LIST": [8, 9],
    "S_SPAWN_DROPITEM": [6, 9],
    "S_SPAWN_NPC": [11, 12],
    "S_USER_EFFECT": 1
};

function sha256(filePath) {
    const raw = fs.readFileSync(filePath);
    const normalized = Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n'), 'utf8');
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

const outFiles = {};
for (const entry of FILE_ENTRIES) {
    const rel = typeof entry === 'string' ? entry : entry.file;
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) throw new Error('Missing file: ' + rel);
    const hash = sha256(full);
    const key = rel.replace(/\\/g, '/');
    if (entry && typeof entry === 'object' && entry.overwrite === false) {
        outFiles[key] = { overwrite: false, hash };
    } else {
        outFiles[key] = hash;
    }
}

const payload = { files: outFiles };
if (DEFS) payload.defs = DEFS;
fs.writeFileSync(OUT, JSON.stringify(payload, null, 4).replace(/\r\n/g, '\n') + '\n');
console.log('Wrote manifest.json (' + Object.keys(outFiles).length + ' files)');
