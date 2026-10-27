# Slash commands

Project-specific slash commands — one markdown file per command, invoked as
`/<filename-without-extension>`:

```
commands/
└── <command-name>.md
```

The file's body is the prompt Claude runs when the command fires;
`$ARGUMENTS` in the body is replaced by whatever the user typed after the
command name.

Empty for now — add one for a prompt this repo's owner runs often enough to
deserve a shortcut (e.g. `/seed-k8s` wrapping `pnpm seed:k8s`), not before.
