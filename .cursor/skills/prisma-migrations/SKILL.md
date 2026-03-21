---
name: prisma-migrations
description: Prisma migration conventions for the Monohroshi backend. Use whenever modifying the Prisma schema, creating database migrations, or working with backend/prisma/. Never write migration SQL manually — always use the CLI.
---

# Prisma Migrations

**Never write or edit migration SQL files by hand.** Always generate via the Prisma CLI from the `backend/` directory.

## Commands

```bash
# Generate SQL without applying (preferred during development)
npx prisma migrate dev --name <descriptive_name> --create-only

# Generate and apply immediately
npx prisma migrate dev --name <descriptive_name>
```

## Workflow

1. Edit `backend/prisma/schema.prisma` with the desired model changes
2. Run `npx prisma migrate dev --name <name> --create-only` to generate the migration file
3. Review the generated SQL in `backend/prisma/migrations/`
4. Apply with `npx prisma migrate dev` when ready

## Naming

Migration names must be `snake_case` and describe the change:
- ✅ `add_transaction_tag_index`
- ✅ `add_user_email_field`
- ❌ `migration1`, `update`

## Rules

- ❌ Never create or edit files inside `prisma/migrations/` manually
- ✅ All schema changes must go through `prisma migrate dev`
- After changing the schema, run `npx prisma generate` to update the client types
