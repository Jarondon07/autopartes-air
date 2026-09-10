# AutoparteAIR — Cliente de escritorio

Aplicación de escritorio en **Python + PySide6 (Qt)** que consume **la misma API REST** que la interfaz web (`/api/v1`). No duplica la lógica de negocio: toda la validación, permisos y cálculos siguen viviendo en el servidor; este cliente solo dibuja la interfaz y hace peticiones HTTP.

## ¿Por qué escritorio nativo?

- **Instalable, sin navegador** — se abre como un programa (doble clic), empaquetable en un `.exe` con PyInstaller.
- **Hardware de punto de venta** — acceso nativo a lector de código de barras, impresora térmica de recibos y gaveta de dinero.
- **Python** — mismo lenguaje para todo el equipo, fácil de integrar con otras herramientas.

## Requisitos

- Python 3.11 o superior
- La **API de AutoparteAIR corriendo** (por defecto en `http://localhost:4300`). Ver el README raíz para levantarla con `npm run dev`.

## Instalación

Desde esta carpeta (`apps/desktop`):

```bash
# 1. Crear entorno virtual
python -m venv .venv

# 2. Activarlo
#    Windows (PowerShell):
.venv\Scripts\Activate.ps1
#    Windows (Git Bash):
source .venv/Scripts/activate
#    Linux/Mac:
source .venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt
```

## Ejecución

Con el entorno virtual activado y la API corriendo:

```bash
python -m autopartes_desktop
```

Inicia sesión con los usuarios de prueba (`admin` / `admin123`).

## Apuntar a otro servidor

Por defecto usa `http://localhost:4300/api/v1`. Para apuntar a producción u otra máquina, define la variable de entorno antes de ejecutar:

```bash
# Windows (PowerShell)
$env:AUTOPARTES_API_URL = "https://mi-servidor/api/v1"
# Git Bash / Linux / Mac
export AUTOPARTES_API_URL="https://mi-servidor/api/v1"

python -m autopartes_desktop
```

## Estructura

```
apps/desktop/
├── requirements.txt
└── autopartes_desktop/
    ├── __main__.py         # punto de entrada (python -m autopartes_desktop)
    ├── app.py              # orquesta login → ventana principal → logout
    ├── config.py           # URL de la API y colores de marca
    ├── format.py           # formato de moneda
    ├── api/
    │   ├── client.py       # sesión HTTP: login, refresh automático, manejo de errores
    │   └── products.py     # llamadas a productos y catálogos
    └── ui/
        ├── login_window.py
        ├── main_window.py  # sidebar filtrado por permisos + contenido
        └── products_page.py
```

## Cómo se conecta a la API

`api/client.py` replica el comportamiento del cliente web:

- El **access token** viaja en el header `Authorization: Bearer <token>`.
- El **refresh token** se guarda solo en la cookie httpOnly que `requests.Session` administra automáticamente.
- Ante un **401**, intenta un refresh silencioso una vez y reintenta la petición original.
- Los **permisos** del usuario (`user["permissions"]`) se usan para mostrar/ocultar opciones, igual que en la web. La autoridad real sigue siendo el servidor.

## Integración de hardware (siguiente iteración)

- **Lector de código de barras:** actúa como teclado (HID). El campo de búsqueda de la página de productos ya captura el `Enter` que envía el lector, así que escanear ejecuta la búsqueda sin código adicional.
- **Impresora térmica de recibos:** con `python-escpos` (comandos ESC/POS). Descomentar en `requirements.txt`.
- **Gaveta de dinero:** se abre con un pulso ESC/POS desde la misma impresora.

## Empaquetar como ejecutable

```bash
pip install pyinstaller
pyinstaller --noconfirm --windowed --name AutoparteAIR --paths . -m autopartes_desktop
```

El ejecutable queda en `dist/AutoparteAIR/`.

## Estado

Iteración inicial (prueba de conexión de punta a punta): login, navegación por permisos y **listado de productos** con búsqueda y paginación. Los formularios de alta/edición y el resto de módulos se irán agregando en paralelo con la web.
