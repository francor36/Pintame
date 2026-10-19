import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',

  migrations: {
    path: 'prisma/migrations',
  },

  datasource: {
    url: 'mysql://pintame:pintame_dev@localhost:3306/pintame_stock',
  },
});
