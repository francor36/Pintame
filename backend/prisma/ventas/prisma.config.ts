
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

const ventasPrismaDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  schema: path.join(ventasPrismaDirectory, 'schema.prisma'),
  migrations: {
    path: path.join(ventasPrismaDirectory, 'migrations'),
  },
  datasource: {
    url: process.env.VENTAS_DATABASE_URL!,
  },
});
