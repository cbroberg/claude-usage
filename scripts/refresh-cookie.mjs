#!/usr/bin/env node

/**
 * Reads the claude.ai sessionKey cookie directly from Chrome's cookie DB on macOS.
 * Works while Chrome is running (copies the DB first to avoid lock issues).
 *
 * Usage: node scripts/refresh-cookie.mjs [--profile "Profile 1"]
 */

import { execSync } from "child_process";
import { createDecipheriv, pbkdf2Sync } from "crypto";
import { copyFileSync, readFileSync, writeFileSync, unlinkSync } from "fs";
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

// 2. Query the sessionKey cookie for claude.ai (try both value and encrypted_value)
const row = db.prepare(
  `SELECT value, encrypted_value FROM cookies WHERE host_key = '.claude.ai' AND name = 'sessionKey' LIMIT 1`
).get();

db.close();
unlinkSync(tmpDb);

if (!row) {
  console.error("sessionKey cookie not found for .claude.ai in Chrome profile:", profile);
  console.error("Make sure you're logged in to claude.ai in Chrome.");
  process.exit(1);
}

// 3. Decrypt (macOS Chrome uses Keychain + AES-128-CBC)
let sessionKey;

if (row.value && row.value.length > 0) {
  // Unencrypted value available
  sessionKey = row.value;
} else {
  const encryptedValue = row.encrypted_value;

  // Get Chrome Safe Storage password from macOS Keychain
  const chromePassword = execSync(
    'security find-generic-password -s "Chrome Safe Storage" -w',
    { encoding: "utf-8" }
  ).trim();

  // Derive key: PBKDF2 with salt "saltysalt", 1003 iterations, 16 bytes
  const key = pbkdf2Sync(chromePassword, "saltysalt", 1003, 16, "sha1");

  // Encrypted value: 3-byte version prefix ("v10"), then AES-128-CBC with IV of 16 spaces
  const iv = Buffer.alloc(16, 0x20);
  const encrypted = encryptedValue.slice(3);

  const decipher = createDecipheriv("aes-128-cbc", key, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  const raw = decrypted.toString("utf-8");

  // CBC with wrong IV garbles first block — extract the sk-ant-* token
  const match = raw.match(/(sk-ant-sid\S+)/);
  if (match) {
    sessionKey = match[1];
  } else {
    // Fallback: strip non-printable chars
    sessionKey = raw.replace(/[^\x20-\x7E]/g, "");
  }
}

// 4. Update .env
const envPath = resolve(__dirname, "..", ".env");
let env = readFileSync(envPath, "utf-8");
env = env.replace(
  /CLAUDE_SESSION_COOKIE=".*"/,
  `CLAUDE_SESSION_COOKIE="sessionKey=${sessionKey}"`
);
writeFileSync(envPath, env);

console.log("Updated .env with fresh sessionKey from Chrome.");
console.log(`Cookie preview: sessionKey=${sessionKey.slice(0, 20)}...`);
