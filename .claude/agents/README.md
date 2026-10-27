# Subagents

Custom subagents for the `Agent` tool — one markdown file per agent, with YAML
frontmatter (`name`, `description`, optional `tools`, `model`):

```
agents/
└── <agent-name>.md
```

`description` is what Claude matches against to decide when to delegate to
this agent, so write it the way a skill's `description` is written — specific
enough to tell it apart from the built-in agents and from the others here.

Empty for now — add one the first time a task needs a dedicated subagent (a
narrow, repeatable review or research role worth reusing across sessions),
not before.
