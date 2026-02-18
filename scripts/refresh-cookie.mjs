#!/usr/bin/env node

/**
 * Reads claude.ai cookies (sessionKey + cf_clearance) from Chrome's cookie DB on macOS.
 * Works while Chrome is running (copies the DB first to avoid lock issues).
 *
 * Usage: node scripts/refresh-cookie.mjs [--profile "Profile 1"]
 */

import { execSync } from "child_process";
import { createDecipheriv, pbkdf2Sync } from "crypto";
import { copyFileSync, readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { homedir } from "os";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse --profile flag, default to "Default"
const args = process.argv.slice(2);
const profileIdx = args.indexOf("--profile");
const profile = profileIdx !== -1 ? args[profileIdx + 1] : "Default";

const chromeDir = resolve(homedir(), "Library/Application Support/Google/Chrome", profile);
const cookieDb = resolve(chromeDir, "Cookies");
const tmpDb = resolve("/tmp", `chrome-cookies-${Date.now()}.sqlite`);

// 1. Copy the DB to avoid Chrome's lock
copyFileSync(cookieDb, tmpDb);

const db = new Database(tmpDb, { readonly: true });

// 2. Query all relevant cookies for claude.ai
const rows = db.prepare(
  `SELECT name, value, encrypted_value FROM cookies
   WHERE host_key IN ('.claude.ai', 'claude.ai')
   AND name IN ('sessionKey', 'cf_clearance')`
).all();

db.close();
unlinkSync(tmpDb);

if (rows.length === 0) {
  console.error("No claude.ai cookies found in Chrome profile:", profile);
  console.error("Make sure you're logged in to claude.ai in Chrome.");
  process.exit(1);
}

// 3. Decrypt helper (macOS Chrome uses Keychain + AES-128-CBC)
let _key = null;
function getKey() {
  if (_key) return _key;
  const chromePassword = execSync(
    'security find-generic-password -s "Chrome Safe Storage" -w',
    { encoding: "utf-8" }
  ).trim();
  _key = pbkdf2Sync(chromePassword, "saltysalt", 1003, 16, "sha1");
  return _key;
}

function decryptCookie(row) {
  if (row.value && row.value.length > 0) return row.value;

  const key = getKey();
  const iv = Buffer.alloc(16, 0x20);
  const encrypted = row.encrypted_value.slice(3); // skip "v10" prefix

  const decipher = createDecipheriv("aes-128-cbc", key, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  const raw = decrypted.toString("utf-8");

  // CBC first block may be garbled — extract printable token
  if (row.name === "sessionKey") {
    const match = raw.match(/(sk-ant-sid\S+)/);
    return match ? match[1] : raw.replace(/[^\x20-\x7E]/g, "");
  }
  return raw.replace(/[^\x20-\x7E]/g, "");
}

// 4. Decrypt each cookie
const cookies = {};
for (const row of rows) {
  cookies[row.name] = decryptCookie(row);
}

if (!cookies.sessionKey) {
  console.error("sessionKey not found for claude.ai in Chrome profile:", profile);
  process.exit(1);
}

// 5. Build full cookie string
const cookieParts = [`sessionKey=${cookies.sessionKey}`];
if (cookies.cf_clearance) {
  cookieParts.push(`cf_clearance=${cookies.cf_clearance}`);
}
const fullCookie = cookieParts.join("; ");

// 6. Update .env
const envPath = resolve(__dirname, "..", ".env");
let env = readFileSync(envPath, "utf-8");
env = env.replace(
  /CLAUDE_SESSION_COOKIE=".*"/,
  `CLAUDE_SESSION_COOKIE="${fullCookie}"`
);
writeFileSync(envPath, env);

console.log("Updated .env with fresh cookies from Chrome.");
console.log(`  sessionKey: ${cookies.sessionKey.slice(0, 25)}...`);
console.log(`  cf_clearance: ${cookies.cf_clearance ? "yes" : "NOT FOUND (Cloudflare may block requests)"}`);
