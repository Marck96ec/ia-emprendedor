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