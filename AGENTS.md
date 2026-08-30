# IA Emprendedor Agent Guide

Read `.github/copilot-instructions.md` before implementing changes.

Before changing code:

1. understand the requested feature
2. inspect existing architecture
3. propose the minimum necessary change
4. implement it
5. run validation
6. summarize files changed

Never silently change database schema.

If database changes are required:
- create a Supabase migration
- preserve RLS
- explain the migration

Do not expose server secrets to Client Components.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
