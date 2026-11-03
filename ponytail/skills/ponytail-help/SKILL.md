---
name: ponytail-help
description: >
  Quick reference for ponytail levels, skills and commands in ZCode. One-shot
  display. Use for /ponytail-help, "ponytail help", "how do I use ponytail".
  中文触发："ponytail 帮助"、"ponytail 怎么用"。
---

# Ponytail Help

Display this reference card when invoked. One-shot, do NOT change mode,
write flag files, or persist anything.

## Levels

| Level | Trigger | What changes |
|-------|---------|-------------|
| **Lite** | `/ponytail lite` | Build what was asked, name the smaller option in one line. |
| **Full** | `/ponytail` | The smallest complete change, a check where the logic needs one, and a reply that names what was skipped and any risk. Default. |
| **Ultra** | `/ponytail ultra` | Also questions the request and pushes back before building. |

Level sticks until changed or session end.

## Skills / Commands

| Command | What it does |
|---------|--------------|
| `/ponytail [lite\|full\|ultra\|off]` | Set the intensity, or turn it off. No argument reports the current level (or switches on at the default level if off). |
| `/ponytail default <mode>` | Persist the default level for new sessions. |
| `/ponytail-review` | Quality review of a diff: bugs, security, load, missing tests, speed, what to cut. Each finding says what goes wrong and how to fix it. |
| `/ponytail-audit` | The same quality review for the whole repo, ranked. |
| `/ponytail-debt` | Harvest `shortcut:` comments into a tracked ledger. |
| `/ponytail-gain` | Measured-impact scoreboard: less code, less cost, more speed. |
| `/ponytail-help` | This card. |

All six also exist as auto-triggerable skills: say "review this change",
"audit this codebase", "ponytail debt" and so on in plain words.

## Deactivate

Say "stop ponytail", "normal mode", "停止ponytail" or "正常模式". Resume anytime with `/ponytail`.
`/ponytail off` also works.

## Configure Default Mode

Default mode = `full`, auto-active every session. Change it:

**Environment variable** (highest priority):
```bash
export PONYTAIL_DEFAULT_MODE=ultra
```

**Config file** (`~/.zcode/ponytail/config.json`):
```json
{ "defaultMode": "lite" }
```

Set `"off"` to disable auto-activation on session start, activate manually
with `/ponytail` when wanted.

Resolution: env var > config file > `full`.

## Notes for this ZCode port

- The ruleset and a codebase map are injected at every session start; mid-session
  level switches take effect immediately for that turn and persist for the rest
  of the session (and the level is re-injected after compaction).
- The statusline badge and the band above the prompt are Claude Code features
  and are not available in ZCode.
- Upstream docs and examples: https://github.com/DietrichGebert/ponytail
