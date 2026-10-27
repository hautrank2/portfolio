# Hook scripts

Not a folder Claude Code reads on its own — hooks are wired in
`.claude/settings.json` (or `settings.local.json`) under a `"hooks"` key,
keyed by event (`PreToolUse`, `PostToolUse`, `Stop`, …) and a matcher. This
folder is just the conventional place to keep the scripts those entries shell
out to, so `settings.json` itself stays short:

```
hooks/
└── <script-name>.sh   # or .mjs, .ps1 — whatever the matcher runs
```

Empty for now, and there is no `settings.json` yet either — nothing in this
repo needs a hook. Add the script here first, then point a `"hooks"` entry
in `.claude/settings.json` at it.
