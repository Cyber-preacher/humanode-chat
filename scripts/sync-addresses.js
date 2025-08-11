// scripts/sync-addresses.js
const fs = require('fs');
const path = require('path');

const OUT = path.join('apps', 'web', 'src', 'addresses.json');
const CANDIDATES = [
  path.join('deployments', 'humanode-testnet5.json'),
  path.join('deployments', 'humanode-14853.json'),
  path.join('deployments', 'humanode.json'),
  path.join('deployments', 'latest.json'),
];

const CHAIN_ID = 14853;
const EXPLORER = 'https://explorer.testnet5.stages.humanode.io';
const DEFAULT_BIOMAPPER_LOG = '0x3f2B3E471b207475519989369d5E4F2cAbd0A39F';

const isAddr = (v) => typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v);

function pickFile() {
  for (const f of CANDIDATES) if (fs.existsSync(f)) return f;
  return null;
}

function normalize(obj) {
  const out = {};
  const roots = [obj, obj?.addresses, obj?.contracts];
  for (const root of roots) {
    if (!root || typeof root !== 'object') continue;
    for (const key of ['ProfileRegistry', 'ChatRegistry', 'Router', 'BiomapperLog']) {
      if (isAddr(root[key])) out[key] = root[key];
      if (root[key] && typeof root[key] === 'object' && isAddr(root[key].address)) {
        out[key] = root[key].address;
      }
    }
  }
  return out;
}

function fromEnv() {
  const env = {
    ProfileRegistry: process.env.PROFILE_REGISTRY_ADDRESS,
    ChatRegistry: process.env.CHAT_REGISTRY_ADDRESS,
    Router: process.env.ROUTER_ADDRESS,
    BiomapperLog: process.env.BIOMAPPER_LOG_ADDRESS,
  };
  const out = {};
  for (const [k, v] of Object.entries(env)) if (isAddr(v)) out[k] = v;
  return out;
}

function main() {
  let src = {};
  const file = pickFile();
  if (file) {
    try {
      src = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      console.error(`[sync-addresses] Failed to read/parse ${file}:`, e.message);
    }
  } else {
    console.warn('[sync-addresses] No deployments/*.json found. Will try ENV vars.');
  }

  let addresses = normalize(src);
  addresses = { ...addresses, ...fromEnv() };
  if (!isAddr(addresses.BiomapperLog)) addresses.BiomapperLog = DEFAULT_BIOMAPPER_LOG;

  // Write whatever we have (Router-only is OK). Frontend can handle missing pieces.
  const out = {
    chainId: CHAIN_ID,
    explorer: EXPLORER,
    ...(isAddr(addresses.Router) ? { Router: addresses.Router } : {}),
    ...(isAddr(addresses.ProfileRegistry) ? { ProfileRegistry: addresses.ProfileRegistry } : {}),
    ...(isAddr(addresses.ChatRegistry) ? { ChatRegistry: addresses.ChatRegistry } : {}),
    BiomapperLog: addresses.BiomapperLog,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`[sync-addresses] Wrote ${OUT}`);
  console.log(out);
}

main();
