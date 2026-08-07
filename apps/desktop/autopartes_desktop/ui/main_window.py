"""Ventana principal: sidebar (filtrado por permisos) + contenido."""

from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QPushButton,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
)

from ..api import ApiClient
from ..config import APP_TITLE, COLOR_BODY_BG, COLOR_SIDEBAR_BG
from .products_page import ProductsPage


def _placeholder(text: str) -> QWidget:
    page = QWidget()
    layout = QVBoxLayout(page)
    label = QLabel(f"{text}\n\nMódulo en construcción")
    label.setAlignment(Qt.AlignmentFlag.AlignCenter)
    label.setStyleSheet("color: #adb5bd; font-size: 15px;")
    layout.addWidget(label)
    return page


class MainWindow(QMainWindow):
    logged_out = Signal()

    def __init__(self, client: ApiClient) -> None:
        super().__init__()
        self.client = client
        user = client.user or {}
        self.setWindowTitle(APP_TITLE)
        self.resize(1100, 700)

        # Definición de la navegación: (label, permiso, fábrica de página).
        # Un permiso None significa siempre visible.
        nav_defs = [
            ("Dashboard", None, lambda: _placeholder("Dashboard")),
            ("Productos", "products:read", lambda: ProductsPage(client)),
            ("Ventas", "sales:create", lambda: _placeholder("Ventas")),
            ("Clientes", "clients:read", lambda: _placeholder("Clientes")),
            ("Proveedores", "suppliers:read", lambda: _placeholder("Proveedores")),
            ("Tasas de cambio", "exchange_rates:read", lambda: _placeholder("Tasas de cambio")),
        ]

        central = QWidget()
        root = QHBoxLayout(central)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        self.nav = QListWidget()
        self.nav.setFixedWidth(220)
        self.nav.setStyleSheet(
            f"""
            QListWidget {{
                background: {COLOR_SIDEBAR_BG}; border: none; padding-top: 8px;
                color: rgba(233,236,239,0.6); font-size: 14px; outline: none;
            }}
            QListWidget::item {{ padding: 12px 20px; }}
            QListWidget::item:selected {{ background: #2B3947; color: #e9ecef; }}
            QListWidget::item:hover {{ color: #e9ecef; }}
            """
        )

        self.stack = QStackedWidget()
        self.stack.setStyleSheet(f"background: {COLOR_BODY_BG};")

        for label, permission, factory in nav_defs:
            if permission and not client.has_permission(permission):
                continue
            QListWidgetItem(label, self.nav)
            self.stack.addWidget(factory())

        self.nav.currentRowChanged.connect(self.stack.setCurrentIndex)

        content = QWidget()
        content_layout = QVBoxLayout(content)
        content_layout.setContentsMargins(0, 0, 0, 0)
        content_layout.setSpacing(0)
        content_layout.addWidget(self._build_topbar(user))
        content_layout.addWidget(self.stack)

        root.addWidget(self.nav)
        root.addWidget(content)
        self.setCentralWidget(central)

        if self.nav.count():
            self.nav.setCurrentRow(0)

    def _build_topbar(self, user: dict) -> QWidget:
        bar = QWidget()
        bar.setFixedHeight(56)
        bar.setStyleSheet("background: white; border-bottom: 1px solid #e9ecef;")
        layout = QHBoxLayout(bar)
        layout.setContentsMargins(20, 0, 20, 0)

        name = user.get("fullName", "Usuario")
        role = user.get("roleName", "")
        who = QLabel(f"{name}  ·  {role}")
        who.setStyleSheet("color: #495057; font-weight: 600;")

        logout = QPushButton("Cerrar sesión")
        logout.setCursor(Qt.CursorShape.PointingHandCursor)
        logout.setStyleSheet(
            "QPushButton { color: #dc3545; border: 1px solid #dc3545; border-radius: 4px; "
            "padding: 6px 14px; background: white; } QPushButton:hover { background: #dc3545; color: white; }"
        )
        logout.clicked.connect(self._on_logout)

        layout.addWidget(who)
        layout.addStretch()
        layout.addWidget(logout)
        return bar

    def _on_logout(self) -> None:
        self.client.logout()
        self.logged_out.emit()
        self.close()
