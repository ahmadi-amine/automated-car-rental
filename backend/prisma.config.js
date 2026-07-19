const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/ai_car_rental',
  },
});
