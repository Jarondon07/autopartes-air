import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import {
  ALL_PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  type RoleName,
} from '@autopartes-air/shared';
import { db, pool } from '../infra/db';
import {
  brands,
  categories,
  permissions,
  rolePermissions,
  roles,
  users,
} from './schema';

const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  admin: 'Acceso total al sistema',
  vendedor: 'Crea ventas y gestiona clientes',
  almacen: 'Gestiona productos, compras e inventario',
  cajero: 'Registra ventas y consulta caja',
};

const SEED_CATEGORIES = [
  'Frenos',
  'Suspensión',
  'Motor',
  'Eléctrico',
  'Filtros',
  'Correas',
  'Lubricantes',
  'Carrocería',
];

const SEED_BRANDS = ['Bosch', 'Gates', 'NGK', 'Monroe', 'Wix', 'ACDelco', 'Valeo'];

async function seed() {
  console.log('🌱 Sembrando datos iniciales...');

  // 1. Roles
  await db
    .insert(roles)
    .values(
      Object.values(ROLES).map((name) => ({
        name,
        description: ROLE_DESCRIPTIONS[name],
      })),
    )
    .onConflictDoNothing();

  // 2. Permisos
  await db
    .insert(permissions)
    .values(ALL_PERMISSIONS.map((code) => ({ code })))
    .onConflictDoNothing();

  // 3. Asignación rol → permisos
  const dbRoles = await db.select().from(roles);
  const dbPerms = await db.select().from(permissions);
  const permIdByCode = new Map(dbPerms.map((p) => [p.code, p.id]));

  for (const role of dbRoles) {
    const codes = ROLE_PERMISSIONS[role.name as RoleName] ?? [];
    if (codes.length === 0) continue;
    await db
      .insert(rolePermissions)
      .values(
        codes.map((code) => ({
          roleId: role.id,
          permissionId: permIdByCode.get(code)!,
        })),
      )
      .onConflictDoNothing();
  }

  // 4. Usuarios iniciales (admin y un vendedor para probar permisos)
  const roleIdByName = new Map(dbRoles.map((r) => [r.name, r.id]));
  const seedUsers = [
    {
      username: 'admin',
      password: 'admin123',
      fullName: 'Administrador del Sistema',
      role: ROLES.ADMIN,
    },
    {
      username: 'vendedor1',
      password: 'vendedor123',
      fullName: 'Vendedor de Prueba',
      role: ROLES.VENDEDOR,
    },
  ];

  for (const u of seedUsers) {
    const [existing] = await db.select().from(users).where(eq(users.username, u.username));
    if (existing) continue;
    await db.insert(users).values({
      username: u.username,
      passwordHash: await bcrypt.hash(u.password, 10),
      fullName: u.fullName,
      roleId: roleIdByName.get(u.role)!,
    });
    console.log(`  👤 Usuario creado: ${u.username} / ${u.password}`);
  }

  // 5. Catálogos base
  await db
    .insert(categories)
    .values(SEED_CATEGORIES.map((name) => ({ name })))
    .onConflictDoNothing();
  await db
    .insert(brands)
    .values(SEED_BRANDS.map((name) => ({ name })))
    .onConflictDoNothing();

  console.log('✅ Seed completado');
  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
