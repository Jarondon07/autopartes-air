"""Cliente HTTP central — equivalente al `client.ts` de la web.

- Usa `requests.Session`, que guarda y reenvía la cookie httpOnly del refresh
  token automáticamente (igual que el navegador).
- El access token va en el header `Authorization: Bearer <token>`.
- Ante un 401, intenta un refresh silencioso una sola vez y reintenta la
  petición original (mismo comportamiento que el interceptor de Axios de la web).
"""

from __future__ import annotations

from typing import Any, Optional

import requests

from ..config import API_URL


class ApiError(Exception):
    """Error de negocio devuelto por la API (formato { success:false, error })."""

    def __init__(
        self,
        message: str,
        code: str = "ERROR",
        status: int = 0,
        details: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status
        self.details = details


class ApiClient:
    """Sesión autenticada contra la API de AutoparteAIR."""

    def __init__(self, base_url: str = API_URL, timeout: float = 15.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.user: Optional[dict] = None

    # ------------------------------------------------------------------ auth
    def login(self, username: str, password: str) -> dict:
        body = self._send("POST", "/auth/login", json={
            "username": username,
            "password": password,
        })
        data = body["data"]
        self.access_token = data["accessToken"]
        self.user = data["user"]
        return self.user

    def refresh(self) -> bool:
        """Renueva el access token usando la cookie de refresh. False si falla."""
        try:
            body = self._send("POST", "/auth/refresh")
        except ApiError:
            self.access_token = None
            self.user = None
            return False
        data = body["data"]
        self.access_token = data["accessToken"]
        self.user = data["user"]
        return True

    def logout(self) -> None:
        try:
            self.session.post(self.base_url + "/auth/logout", timeout=self.timeout)
        except requests.RequestException:
            pass
        self.access_token = None
        self.user = None

    def has_permission(self, code: str) -> bool:
        if not self.user:
            return False
        return code in self.user.get("permissions", [])

    # --------------------------------------------------------------- verbos
    def get(self, path: str, **kwargs: Any) -> dict:
        return self.request("GET", path, **kwargs)

    def post(self, path: str, json: Any = None, **kwargs: Any) -> dict:
        return self.request("POST", path, json=json, **kwargs)

    def patch(self, path: str, json: Any = None, **kwargs: Any) -> dict:
        return self.request("PATCH", path, json=json, **kwargs)

    def delete(self, path: str, **kwargs: Any) -> dict:
        return self.request("DELETE", path, **kwargs)

    # --------------------------------------------------------------- núcleo
    def request(
        self,
        method: str,
        path: str,
        *,
        params: Any = None,
        json: Any = None,
        _retry: bool = False,
    ) -> dict:
        body = self._send(method, path, params=params, json=json, raise_on_401=False)
        if body is None:  # 401
            if not _retry and not path.startswith("/auth/") and self.refresh():
                return self.request(method, path, params=params, json=json, _retry=True)
            raise ApiError("Sesión expirada. Vuelve a iniciar sesión.", "UNAUTHORIZED", 401)
        return body

    # -------------------------------------------------------------- interno
    def _send(
        self,
        method: str,
        path: str,
        *,
        params: Any = None,
        json: Any = None,
        raise_on_401: bool = True,
    ) -> Optional[dict]:
        headers = {}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"

        try:
            resp = self.session.request(
                method,
                self.base_url + path,
                params=params,
                json=json,
                headers=headers,
                timeout=self.timeout,
            )
        except requests.RequestException as exc:
            raise ApiError(
                f"No se pudo conectar con el servidor ({self.base_url}). "
                "¿Está corriendo la API?",
                "CONNECTION_ERROR",
            ) from exc

        if resp.status_code == 401 and not raise_on_401:
            return None

        return self._unwrap(resp)

    @staticmethod
    def _unwrap(resp: requests.Response) -> dict:
        try:
            body = resp.json()
        except ValueError:
            raise ApiError(
                f"Respuesta no válida del servidor ({resp.status_code})",
                "BAD_RESPONSE",
                resp.status_code,
            )

        if resp.ok and isinstance(body, dict) and body.get("success"):
            return body

        error = body.get("error", {}) if isinstance(body, dict) else {}
        raise ApiError(
            error.get("message", "Ocurrió un error inesperado"),
            error.get("code", "ERROR"),
            resp.status_code,
            error.get("details"),
        )
