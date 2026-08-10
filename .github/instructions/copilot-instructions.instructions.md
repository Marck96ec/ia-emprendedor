# IA Emprendedor

IA Emprendedor is a SaaS application that acts as an AI CEO for small business owners.

## MVP goal

Help a business owner:

1. register
2. create their business
3. complete onboarding
4. receive an AI diagnosis
5. receive 3 priorities
6. generate a 7-day action plan
7. mark actions as completed
8. return the following week

## Technology

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- Supabase RLS
- OpenAI Agents SDK TypeScript
- Vercel
- npm

## Architecture

Keep UI, application logic, data access, and AI logic separated.

Use:

src/
  app/
  components/
  lib/
  services/
  agents/
  types/

Do not call OpenAI directly from Client Components.

Never expose OPENAI_API_KEY to browser code.

All database schema changes must be represented by Supabase migrations.

Enable RLS for user-owned application data.

Prefer Server Components by default.
Use Client Components only when browser interactivity is required.

Keep the MVP simple.
Do not add infrastructure or dependencies unless required by the current feature.

Before completing a task run:

npm run lint
npm run typecheck
npm run build