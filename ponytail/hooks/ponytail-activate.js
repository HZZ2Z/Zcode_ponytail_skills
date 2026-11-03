#!/usr/bin/env node
// ponytail — ZCode SessionStart activation hook.
//
// Runs on every session start (startup / resume / clear / compact):
//   1. Resolves the level: default mode for a fresh session, the live level
//      after compaction (SessionStart re-runs inside the same conversation).
//   2. "off" clears the flag and stays silent.
//   3. Otherwise emits the ponytail ruleset (filtered to the level) plus the
//      codebase map as hidden session context, so "reuse first" costs no search.
//
// shortcut: no statusline badge here — ZCode has no statusline; the level shows
// in the injected header instead.

const path = require('path');
const { execFileSync } = require('child_process');
const {
  clearMode,
  readMode,
  setMode,
  getDefaultMode,
  writeHookOutput,
} = require('./ponytail-config');
const { getPonytailInstructions } = require('./ponytail-instructions');

const projectDir = (process.env.ZCODE_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || '').trim();

function buildContext(mode) {
  let output = getPonytailInstructions(mode);

  // Codebase map: what already exists, so "reuse first" costs no search. Fail
  // open: the map gets 3 s, well inside the hook timeout, so a stalled map
  // never costs the rules.
  if (process.env.PONYTAIL_MAP !== '0') try {
    const map = execFileSync(process.execPath,
      [path.join(__dirname, 'ponytail-map.js'), projectDir || process.cwd()],
      { encoding: 'utf8', timeout: 3000, maxBuffer: 64 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
    ).trimEnd();
    if (map) output += '\n\n' + map;
  } catch (e) { /* no map */ }

  return output;
}

function activate(mode) {
  // "off" — no flag, no rules, nothing to say.
  if (mode === 'off') {
    clearMode();
    writeHookOutput('SessionStart', '');
    return;
  }

  try { setMode(mode); } catch (e) { /* best-effort, don't block the session */ }

  writeHookOutput('SessionStart', buildContext(mode));
}

let input = '';
let done = false;

function finish() {
  if (done) return;
  done = true;
  let source = '';
  try {
    // Strip UTF-8 BOM some shells prepend when piping (breaks JSON.parse)
    source = JSON.parse(input.replace(/^\uFEFF/, '')).source;
  } catch (e) {
    // No payload, or an unparseable one: treat it as a fresh session
  }
  // Compaction re-runs SessionStart inside the same conversation, so it keeps
  // the live level (or stays off after "stop ponytail") instead of resetting
  // to the default.
  activate(source === 'compact' ? (readMode() || 'off') : getDefaultMode());
}

process.stdin.on('data', (chunk) => { input += chunk; });
// Never hang the session start: recover on a stdin error or after a short
// fallback, and start at the default level.
process.stdin.on('end', () => { finish(); process.exit(0); });
process.stdin.on('error', () => { finish(); process.exit(0); });
setTimeout(() => { finish(); process.exit(0); }, 1000);
