import { defineConfig } from 'drizzle-kit';
// Reutiliza la carga/validación centralizada de infra (elige .env.local o .env)
import { env } from './src/infra/env';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
