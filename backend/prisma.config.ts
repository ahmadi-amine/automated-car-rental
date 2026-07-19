import { defineConfig } from 'prisma/config';

export default defineConfig({
    schema: './prisma/schema.prisma',
    datasource: {
        url: 'postgresql://postgres:postgres@postgres:5432/ai_car_rental',
    },
});
