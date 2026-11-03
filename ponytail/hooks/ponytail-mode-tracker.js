#!/usr/bin/env node
// ponytail — ZCode UserPromptSubmit hook.
//
// Inspects every user prompt for ponytail level commands and deactivation
// phrases, persists the mode, and injects the new level's ruleset on switch.
// Ordinary prompts stay silent (empty JSON output, exit 0).
//
// Levels: /ponytail lite | full | ultra | off; bare /ponytail reports or
// activates. /ponytail default <mode> persists the default across sessions.
// Deactivate: "stop ponytail", "normal mode", "停止ponytail", "正常模式".
//
// ponytail: ZCode has no band, so `band` arguments answer with a one-line
// notice instead of toggling anything.

const {
  clearMode,
  readMode,
  setMode,
  getDefaultMode,
  isDeactivationCommand,
  normalizeMode,
  writeDefaultMode,
  writeHookOutput,
} = require('./ponytail-config');
const { getPonytailInstructions } = require('./ponytail-instructions');

const DEACTIVATION_HINT =
  'PONYTAIL MODE OFF. The user can bring it back with `/ponytail`. Confirm in one short line.';

let input = '';
let done = false;

function finish() {
  if (done) return;
  done = true;
  try {
    // Strip UTF-8 BOM some shells prepend when piping (breaks JSON.parse)
    const data = JSON.parse(input.replace(/^\uFEFF/, ''));
    const prompt = String(data.prompt || '').trim();
    const low = prompt.toLowerCase();

    // Match /ponytail level commands. `/ponytail-review` and friends are
    // one-shot commands, not session levels, so the exact command name matters.
    if (/^[/@$]ponytail/.test(low)) {
      const parts = prompt.split(/\s+/);
      const cmd = parts[0].replace(/^[@$]/, '/').toLowerCase();
      const arg = (parts[1] || '').toLowerCase();

      let mode = null;

      if (cmd === '/ponytail' || cmd === '/ponytail:ponytail') {
        if (arg === 'default') {
          // `/ponytail default <mode>` persists the default to config (survives
          // restarts). Plain switches stay session-scoped. off is a valid default:
          // sessions then start inactive until the user runs /ponytail.
          const dmode = normalizeMode(parts[2] || '');
          if (dmode) {
            writeDefaultMode(dmode);
            writeHookOutput('UserPromptSubmit',
              'PONYTAIL DEFAULT SET — new sessions start in ' + dmode +
              (dmode === 'off' ? ' (ponytail off until /ponytail).' : '.') +
              ' Confirm in one short line.');
            return;
          }
          writeHookOutput('UserPromptSubmit',
            'PONYTAIL DEFAULT NOT SET — "' + (parts[2] || '') + '" is not a level. Use lite, full, ultra or off.');
          return;
        }
        if (arg === 'band') {
          // No band in ZCode: the band above the prompt is Claude Code only.
          writeHookOutput('UserPromptSubmit',
            'PONYTAIL: the band above the prompt is a Claude Code feature and is not available in ZCode. The ponytail level is unchanged.');
          return;
        }
        if (arg === 'lite') mode = 'lite';
        else if (arg === 'full') mode = 'full';
        else if (arg === 'ultra') mode = 'ultra';
        else if (arg === 'off') mode = 'off';
        else if (arg === '') {
          // Bare /ponytail switches ponytail on: off → the default level (full if
          // the default is off too); already on → keep the level, report it.
          const live = readMode();
          if (live && live !== 'off') {
            writeHookOutput('UserPromptSubmit', 'PONYTAIL MODE ACTIVE — level: ' + live);
            return;
          }
          mode = getDefaultMode() === 'off' ? 'full' : getDefaultMode();
        } else {
          writeHookOutput('UserPromptSubmit',
            'PONYTAIL: unknown argument "' + arg + '". Levels: /ponytail lite | full | ultra | off. Persist a default: /ponytail default <mode>.');
          return;
        }
      }

      if (mode && mode !== 'off') {
        setMode(mode);
        // The ruleset rides along with the confirmation: ZCode may deliver the
        // typed command without expanding it, and then no skill body would
        // carry the level's rules.
        writeHookOutput('UserPromptSubmit',
          'PONYTAIL MODE CHANGED — level: ' + mode + '\n\n' + getPonytailInstructions(mode));
        return;
      }
      if (mode === 'off') {
        clearMode();
        writeHookOutput('UserPromptSubmit', DEACTIVATION_HINT);
        return;
      }
    }

    // Detect deactivation phrases ("stop ponytail" / "normal mode" / 停止ponytail / 正常模式)
    if (isDeactivationCommand(prompt)) {
      clearMode();
      writeHookOutput('UserPromptSubmit', DEACTIVATION_HINT);
      return;
    }
  } catch (e) {
    // Silent fail — a broken prompt payload must never block the session
  }
  writeHookOutput('UserPromptSubmit', '');
}

process.stdin.on('data', (chunk) => { input += chunk; });
// Exit on 'end' so the fallback timer below stays ref'd and can actually fire
// when stdin is stuck; a ref'd timer would otherwise keep the process alive on
// the normal fast path.
process.stdin.on('end', () => { finish(); process.exit(0); });

// Never hang the session. On stdin error, or after a short fallback, process
// whatever arrived and exit 0.
process.stdin.on('error', () => { finish(); process.exit(0); });
setTimeout(() => { finish(); process.exit(0); }, 1000);
