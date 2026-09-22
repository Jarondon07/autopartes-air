"""Configuración del cliente de escritorio.

La URL de la API se puede sobreescribir con la variable de entorno
`AUTOPARTES_API_URL` (útil para apuntar a producción sin recompilar).
"""

import os

APP_NAME = "AutoparteAIR"
APP_TITLE = "AutoparteAIR — Escritorio"

# Base de la API. Por defecto, el servidor local de desarrollo (puerto 4300).
DEFAULT_API_URL = "http://localhost:4300/api/v1"
API_URL = os.environ.get("AUTOPARTES_API_URL", DEFAULT_API_URL)

# Colores de marca (mismos que la web, tomados de AdminKit).
COLOR_PRIMARY = "#3B7DDD"
COLOR_BODY_BG = "#f5f7fb"
COLOR_SIDEBAR_BG = "#222E3C"
COLOR_DANGER = "#dc3545"
COLOR_SUCCESS = "#1cbb8c"
