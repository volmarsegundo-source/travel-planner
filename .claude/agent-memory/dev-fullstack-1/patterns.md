# Patterns and Technical Notes

## Prisma 7 — Breaking Changes from v5/v6

### Schema changes
- `datasource db` block must NOT have `url` field — it goes in `prisma.config.ts`
- Generator provider changed from `prisma-client-js` to `prisma-client`
- Must specify `output` for the generator (e.g., `../src/generated/prisma`)

### schema.prisma template for Prisma 7:
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

### prisma.config.ts — required for connection URL:
```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

### PrismaClient instantiation — requires driver adapter:
```typescript
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });
```

### Install required packages for Prisma 7 + PostgreSQL:
```
npm install @prisma/adapter-pg pg @types/pg
```

## next-intl v4 (Next.js 16)
- Middleware file is `src/proxy.ts` (NOT `src/middleware.ts` — renamed in Next.js 16)
- No changes needed in next.config.ts
- Uses `[locale]` dynamic segment for i18n routing
- Request config: `src/i18n/request.ts`
- Routing config: `src/i18n/routing.ts`
- Navigation helpers: `src/i18n/navigation.ts`

## cuid2 package
- Correct npm package: `@paralleldrive/cuid2` (NOT `cuid2` — does not exist)
- Usage: `import { createId } from "@paralleldrive/cuid2"`

## shadcn/ui
- `toast` component is deprecated — use `sonner` instead
- Init command: `npx shadcn@latest init --defaults --yes`

## create-next-app in existing directory
- `create-next-app` refuses to run if directory has existing files
- Solution: scaffold in /tmp, then copy files manually to project directory

## @t3-oss/env-nextjs with SKIP_ENV_VALIDATION
- Set `SKIP_ENV_VALIDATION=1` to bypass env validation during build/tests
- Build command: `SKIP_ENV_VALIDATION=1 npm run build`
