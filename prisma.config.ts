import * as dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local for Next.js-style env management
// Prisma CLI doesn't auto-load .env.local, so we do it explicitly here
dotenv.config({ path: ".env.local" });
// Fallback to .env for local dev convenience
dotenv.config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
  },
});
