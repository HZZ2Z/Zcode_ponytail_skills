#!/usr/bin/env node
// ponytail — shared configuration resolver (ZCode port)
//
// Resolution order for default mode:
//   1. PONYTAIL_DEFAULT_MODE environment variable
//   2. Config file defaultMode field: ~/.zcode/ponytail/config.json
//      (override the whole directory with PONYTAIL_STATE_DIR)
//   3. 'full'
//
// The live session level is one flag file (~/.zcode/ponytail/mode.txt).
// shortcut: one shared flag instead of upstream's per-project hash — concurrent
// sessions in different repos share the level; split by ZCODE_PROJECT_DIR if
// that ever matters.

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_MODE = 'full';
const RUNTIME_MODES = ['off', 'lite', 'full', 'ultra'];

function normalizeMode(mode) {
  if (typeof mode !== 'string') return null;
  const normalized = mode.trim().toLowerCase();
  return RUNTIME_MODES.includes(normalized) ? normalized : null;
}

// "stop ponytail" / "normal mode" turn ponytail off, but only as a standalone
// command. Matching the phrase anywhere in the message turned it off mid-task
// for ordinary requests like "add a normal mode toggle" — so require the whole
// message to be the command, ignoring case and trailing punctuation.
// The two Chinese phrases are this port's addition for bilingual users.
function isDeactivationCommand(text) {
  const t = String(text || '').trim().toLowerCase().replace(/[.!?\s。！？]+$/, '');
  return t === 'stop ponytail' || t === 'normal mode' || t === '停止ponytail' || t === '正常模式';
}

function getStateDir() {
  if (process.env.PONYTAIL_STATE_DIR) return process.env.PONYTAIL_STATE_DIR;
  return path.join(os.homedir(), '.zcode', 'ponytail');
}

function getModeFile() {
  return path.join(getStateDir(), 'mode.txt');
}

function getConfigPath() {
  return path.join(getStateDir(), 'config.json');
}

function getDefaultMode() {
  // 1. Environment variable (highest priority). Only a runtime level can be a
  // default; normalize here so values with whitespace or mixed casing resolve.
  const envMode = normalizeMode(process.env.PONYTAIL_DEFAULT_MODE);
  if (envMode) return envMode;

  // 2. Config file (strip UTF-8 BOM some editors prepend on Windows).
  try {
    const config = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8').replace(/^\uFEFF/, ''));
    const configMode = normalizeMode(config.defaultMode);
    if (configMode) return configMode;
  } catch (e) { /* missing or invalid — fall through */ }

  // 3. Default
  return DEFAULT_MODE;
}

function writeDefaultMode(mode) {
  const normalized = normalizeMode(mode);
  if (!normalized) return null;

  const configPath = getConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''));
    if (!config || typeof config !== 'object' || Array.isArray(config)) config = {};
  } catch (_) { /* start a fresh config */ }
  config.defaultMode = normalized;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  return normalized;
}

// Live mode written by activate/tracker. Absent flag = ponytail off.
function setMode(mode) {
  const file = getModeFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, mode);
}

function clearMode() {
  try { fs.unlinkSync(getModeFile()); } catch (e) { /* already gone */ }
}

function readMode() {
  try {
    return fs.readFileSync(getModeFile(), 'utf8').trim() || null;
  } catch (e) {
    return null;
  }
}

// Synchronous: every hook calls process.exit() right after writing, and on
// macOS a pipe write is async, so a pending write could die with the process.
function writeOut(text) {
  fs.writeSync(1, text);
}

// ZCode hook output: hookSpecificOutput JSON carries additionalContext into
// the conversation. An empty object means "nothing to say".
function writeHookOutput(event, context = '') {
  if (!context) {
    writeOut('{}');
    return;
  }
  writeOut(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: context } }));
}

module.exports = {
  DEFAULT_MODE,
  RUNTIME_MODES,
  getDefaultMode,
  getStateDir,
  getModeFile,
  getConfigPath,
  writeDefaultMode,
  setMode,
  clearMode,
  readMode,
  isDeactivationCommand,
  normalizeMode,
  writeOut,
  writeHookOutput,
};
