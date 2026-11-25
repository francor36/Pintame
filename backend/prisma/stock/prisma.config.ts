
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

const stockPrismaDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  schema: path.join(stockPrismaDirectory, 'schema.prisma'),
  migrations: {
    path: path.join(stockPrismaDirectory, 'migrations'),
  },
  datasource: {
    url: process.env.STOCK_DATABASE_URL!,
  },
});
