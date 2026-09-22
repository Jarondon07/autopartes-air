"""Orquestador de la aplicación: login → ventana principal → logout."""

from __future__ import annotations

import sys

from PySide6.QtWidgets import QApplication

from .api import ApiClient
from .config import APP_NAME
from .ui.login_window import LoginWindow
from .ui.main_window import MainWindow


class Application:
    def __init__(self) -> None:
        self.qt = QApplication(sys.argv)
        self.qt.setApplicationName(APP_NAME)
        self.client = ApiClient()
        # Se guardan referencias para que las ventanas no las recoja el GC.
        self.login: LoginWindow | None = None
        self.main: MainWindow | None = None

    def run(self) -> int:
        self._show_login()
        return self.qt.exec()

    def _show_login(self) -> None:
        self.login = LoginWindow(self.client)
        self.login.logged_in.connect(self._on_logged_in)
        self.login.show()

    def _on_logged_in(self) -> None:
        self.main = MainWindow(self.client)
        self.main.logged_out.connect(self._on_logged_out)
        self.main.show()
        if self.login is not None:
            self.login.close()
            self.login = None

    def _on_logged_out(self) -> None:
        self.main = None
        self._show_login()


def main() -> None:
    sys.exit(Application().run())
