Project-local Stitch MCP setup

Files:
- `config.toml` registers the Stitch MCP server for this repo only.

How to add your API key:
1. Set an environment variable named `STITCH_API_KEY` before opening Codex for this project.
2. Restart this Codex task after setting it so the MCP server reloads with the key.

PowerShell example for the current Windows user:
`[Environment]::SetEnvironmentVariable("STITCH_API_KEY", "paste-your-key-here", "User")`

Current shell only:
`$env:STITCH_API_KEY = "paste-your-key-here"`

Why this setup:
- Keeps the key out of source control.
- Limits Stitch MCP to this repo instead of every Codex project on your machine.
