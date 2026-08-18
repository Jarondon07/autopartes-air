# Despliegue de AutoparteAIR en un VPS Debian 13

Guía completa para poner el sistema en producción desde un VPS vacío.

**Arquitectura:** Node 22 + PostgreSQL 17 + Nginx nativos en el host. La API corre como
servicio systemd en `127.0.0.1:4300`; Nginx sirve la web compilada y hace de proxy de
`/api` y de servidor estático de `/uploads`. Todo bajo **un solo origen**, así que la web
(que usa baseURL relativa `/api/v1`) no necesita ninguna variable `VITE_*`.

`apps/desktop` (cliente PySide6) **no se despliega**: se excluye con git sparse-checkout.

Archivos de esta carpeta:

| Archivo | Destino |
|---|---|
| `autopartes-api.service` | `/etc/systemd/system/autopartes-api.service` |
| `nginx-autopartes-air.conf` | `/etc/nginx/sites-available/autopartes-air` |
| `deploy.sh` | se ejecuta en el sitio, para cada actualización |
| `backup.sh` | se ejecuta por cron |

---

## 1. Base del sistema

```bash
apt update && apt upgrade -y
apt install -y git curl ca-certificates gnupg nginx ufw

# Importante: BCV_FETCH_TIME y los reportes por día usan la hora local del server.
timedatectl set-timezone America/Caracas

# Usuario de servicio sin login
adduser --system --group --home /srv/autopartes-air --shell /usr/sbin/nologin autopartes
```

Si el VPS tiene menos de 2 GB de RAM, crear swap **antes** de compilar la web
(`tsc` + `vite build` puede quedarse sin memoria):

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Firewall — **no** se abren 4300 ni 5432 (solo Nginx alcanza la API, solo la API la BD):

```bash
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

## 2. Node 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v && npm -v     # debe reportar v22.x
```

## 3. PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable --now postgresql

sudo -u postgres psql -c "CREATE USER autopartes WITH PASSWORD 'CLAVE_FUERTE_AQUI';"
sudo -u postgres psql -c 'CREATE DATABASE "autopartes-air" OWNER autopartes;'
```

El nombre de la BD lleva guion → en SQL va **siempre entre comillas dobles**.
En `DATABASE_URL` no hace falta comillar. Postgres queda escuchando solo en localhost
(el default de Debian); no cambiar `listen_addresses`.

## 4. Clonar el repo sin `apps/desktop`

```bash
cd /srv
git clone --filter=blob:none --no-checkout https://github.com/Jarondon07/autopartes-air.git autopartes-air
cd autopartes-air
git sparse-checkout set --no-cone '/*' '!/apps/desktop'
git checkout main

ls apps      # debe mostrar solo: server  shared  web
```

`--no-cone` habilita patrones de exclusión estilo `.gitignore`; `apps/desktop` nunca se
materializa en disco y los `git pull` posteriores lo siguen excluyendo.
(Aunque el glob de workspaces es `apps/*`, `apps/desktop` no tiene `package.json`, así que
npm lo ignoraría de todos modos.)

Si el repo es privado: crear una **deploy key de solo lectura** en GitHub
(`ssh-keygen -t ed25519 -C autopartes-vps`, subir la pública al repo → Settings → Deploy keys)
y clonar por SSH.

## 5. Variables de entorno

```bash
cd /srv/autopartes-air/apps/server
cp .env.example .env
nano .env
```

Contenido para producción por IP (sin dominio todavía):

```ini
PORT=4300
NODE_ENV=production
CORS_ORIGIN=http://IP_DEL_VPS
COOKIE_SECURE=false            # ← cambiar a true al montar HTTPS

DATABASE_URL=postgresql://autopartes:CLAVE_FUERTE_AQUI@localhost:5432/autopartes-air

JWT_ACCESS_SECRET=<32 bytes hex nuevos>
JWT_REFRESH_SECRET=<32 bytes hex nuevos>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

RADAR_API_URL=https://radar.revolut.team/api/rates
RADAR_API_KEY=<clave real, o vacío para tasas solo manuales>
BCV_FETCH_TIME=00:30
BCV_FALLBACK_RATE=36
```

Generar secretos nuevos (**no** reusar los de desarrollo), uno por línea:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```bash
chown autopartes:autopartes .env && chmod 600 .env
```

> `COOKIE_SECURE=false` es obligatorio mientras se sirva por HTTP: la cookie del refresh
> token se emite con `secure`, y sobre HTTP el navegador la descarta — la sesión se caería
> a los 15 minutos (vida del access token).

## 6. Instalar, migrar, sembrar, compilar

```bash
cd /srv/autopartes-air
npm ci                                             # con devDeps: tsx y vite son necesarios
npm run db:migrate:prod -w @autopartes-air/server
npm run db:seed:prod   -w @autopartes-air/server
npm run build -w @autopartes-air/web               # → apps/web/dist

mkdir -p apps/server/uploads
chown -R autopartes:autopartes /srv/autopartes-air
```

- Los scripts `:prod` fijan `NODE_ENV=production` con `cross-env`, por eso leen `.env`.
- El seed es idempotente (`onConflictDoNothing`) y **solo crea usuarios que no existan**:
  crea `root` y `admin` con la clave `Clave123*` → **cambiarlas en el primer login**.
- Si `db:migrate:prod` falla, aplicar los `.sql` de `apps/server/src/db/migrations/` en
  orden con `psql -U autopartes -d autopartes-air -f <archivo>.sql`.

## 7. Servicio systemd

```bash
cp /srv/autopartes-air/deploy/autopartes-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now autopartes-api
journalctl -u autopartes-api -f
```

Debe imprimir: `✅ AutoparteAIR API [production] (.env) escuchando en http://localhost:4300/api/v1`.
El worker de tasas arranca dentro del mismo proceso, solo si hay `RADAR_API_KEY`.

## 8. Nginx

```bash
cp /srv/autopartes-air/deploy/nginx-autopartes-air.conf /etc/nginx/sites-available/autopartes-air
sed -i "s/SERVER_NAME/IP_DEL_VPS/" /etc/nginx/sites-available/autopartes-air
ln -sf /etc/nginx/sites-available/autopartes-air /etc/nginx/sites-enabled/autopartes-air
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Nginx corre como `www-data` y necesita permiso de travesía sobre la ruta del proyecto:

```bash
chmod o+x /srv/autopartes-air /srv/autopartes-air/apps \
          /srv/autopartes-air/apps/web /srv/autopartes-air/apps/server
```

## 9. Verificación end-to-end

1. `curl -i http://IP/api/v1/health` → `{"success":true,"data":{"status":"ok"}}`
2. Abrir `http://IP/` → login con `root` / `Clave123*`.
3. DevTools → Application → Cookies: **`refresh_token` debe existir** con path
   `/api/v1/auth`. Si no aparece, `COOKIE_SECURE` quedó en `true` sobre HTTP.
4. Esperar >15 min y seguir navegando: la app debe refrescar sola sin mandar a `/login`.
5. Cambiar las contraseñas de `root` y `admin` desde `/perfil`.
6. Crear un producto con imagen → la miniatura debe cargar desde `/uploads/...`
   (valida permisos de la carpeta y el `alias` de Nginx).
7. Recargar una ruta profunda (`http://IP/productos`) → debe cargar, no 404 (`try_files`).
8. `Configuración → Tasas → Actualizar ahora` → valida salida a internet y `RADAR_API_KEY`.
9. Registrar una compra y una venta en el cajero → valida transacciones, stock y factura.
10. `systemctl restart autopartes-api` y repetir el paso 1 → valida arranque en frío.

## 10. Al tener el dominio (HTTPS)

1. Apuntar un registro **A** del dominio a la IP del VPS y esperar la propagación.
2. Poner el dominio en `server_name` de `/etc/nginx/sites-available/autopartes-air`
   y `systemctl reload nginx`.
3. Emitir el certificado (configura el 443 y la redirección desde el 80):
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d dominio.com -d www.dominio.com
   ```
4. En `apps/server/.env`: `COOKIE_SECURE=true` y `CORS_ORIGIN=https://dominio.com`.
   Luego `systemctl restart autopartes-api`.
5. Repetir las verificaciones 3 y 4 sobre HTTPS.
6. `certbot renew --dry-run` para confirmar la renovación automática.

## 11. Operación

**Actualizar** (tras hacer push a `main`):

```bash
bash /srv/autopartes-air/deploy/deploy.sh
```

**Respaldo diario** (BD + uploads, rotación a 14 días):

```bash
crontab -e
# 0 2 * * * /srv/autopartes-air/deploy/backup.sh >> /var/log/autopartes-backup.log 2>&1
```

**Logs:** `journalctl -u autopartes-api -n 200` · Nginx en `/var/log/nginx/`.

## Notas

- El server corre TypeScript con `tsx` en runtime (no hay build del backend); por eso el
  `npm ci` debe incluir devDependencies. Lo mismo aplica a `vite` para compilar la web.
- Los uploads viven en `apps/server/uploads/`, fuera de git: sin respaldo, se pierden.
- `CORS_ORIGIN` es casi decorativo sirviendo todo bajo un mismo origen, pero se configura
  correctamente por si el cliente desktop apunta a este servidor desde otra máquina.
