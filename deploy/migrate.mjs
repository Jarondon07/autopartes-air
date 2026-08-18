/**
 * Aplicador de migraciones para producción.
 *
 * `drizzle-kit migrate` falla de forma silenciosa (exit 1 sin mensaje) tanto en
 * Windows como en el VPS Debian, así que aquí se invoca directamente el migrador
 * de drizzle-orm, que sí reporta el error real.
 *
 * Uso (desde apps/server, porque las rutas son relativas al cwd):
 *   cd apps/server && node ../../deploy/migrate.mjs
 */
import { config } from 'dotenv';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no definida (¿estás corriendo esto desde apps/server?)');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('✅ Migraciones aplicadas');
} catch (err) {
  console.error('❌ Error aplicando migraciones:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
