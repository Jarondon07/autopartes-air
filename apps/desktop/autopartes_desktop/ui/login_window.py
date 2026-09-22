"""Ventana de inicio de sesión."""

from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QFrame,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from ..api import ApiClient, ApiError
from ..config import APP_NAME, COLOR_BODY_BG, COLOR_PRIMARY


class LoginWindow(QWidget):
    """Formulario de login. Emite `logged_in` cuando la sesión se establece."""

    logged_in = Signal()

    def __init__(self, client: ApiClient) -> None:
        super().__init__()
        self.client = client
        self.setWindowTitle(f"{APP_NAME} — Iniciar sesión")
        self.setFixedSize(400, 460)
        self.setStyleSheet(f"background: {COLOR_BODY_BG};")
        self._build()

    def _build(self) -> None:
        outer = QVBoxLayout(self)
        outer.setContentsMargins(32, 32, 32, 32)
        outer.setAlignment(Qt.AlignmentFlag.AlignCenter)

        title = QLabel(f"🔧 {APP_NAME}")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title.setStyleSheet("font-size: 22px; font-weight: 700; color: #212529;")

        subtitle = QLabel("Ingresa a tu cuenta para continuar")
        subtitle.setAlignment(Qt.AlignmentFlag.AlignCenter)
        subtitle.setStyleSheet("color: #6c757d; margin-bottom: 8px;")

        card = QFrame()
        card.setStyleSheet(
            "QFrame { background: white; border-radius: 6px; border: 1px solid #e9ecef; }"
        )
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(24, 24, 24, 24)
        card_layout.setSpacing(12)

        welcome = QLabel("¡Bienvenido de nuevo!")
        welcome.setStyleSheet("font-size: 16px; font-weight: 600; border: none;")

        self.username = QLineEdit()
        self.username.setPlaceholderText("Usuario")
        self.username.setText("admin")
        self._style_input(self.username)

        self.password = QLineEdit()
        self.password.setPlaceholderText("Contraseña")
        self.password.setEchoMode(QLineEdit.EchoMode.Password)
        self._style_input(self.password)
        self.password.returnPressed.connect(self._on_login)

        self.button = QPushButton("Iniciar sesión")
        self.button.setCursor(Qt.CursorShape.PointingHandCursor)
        self.button.setStyleSheet(
            f"""
            QPushButton {{
                background: {COLOR_PRIMARY}; color: white; border: none;
                border-radius: 4px; padding: 10px; font-size: 14px; font-weight: 600;
            }}
            QPushButton:hover {{ background: #326ac2; }}
            QPushButton:disabled {{ background: #a8c2e8; }}
            """
        )
        self.button.clicked.connect(self._on_login)

        card_layout.addWidget(welcome)
        card_layout.addWidget(QLabel("Usuario"))
        card_layout.addWidget(self.username)
        card_layout.addWidget(QLabel("Contraseña"))
        card_layout.addWidget(self.password)
        card_layout.addSpacing(4)
        card_layout.addWidget(self.button)

        outer.addWidget(title)
        outer.addWidget(subtitle)
        outer.addSpacing(12)
        outer.addWidget(card)

    @staticmethod
    def _style_input(field: QLineEdit) -> None:
        field.setStyleSheet(
            "QLineEdit { border: 1px solid #ced4da; border-radius: 4px; padding: 8px; "
            "font-size: 14px; } QLineEdit:focus { border-color: #3B7DDD; }"
        )

    def _on_login(self) -> None:
        username = self.username.text().strip()
        password = self.password.text()
        if not username or not password:
            QMessageBox.warning(self, "Datos incompletos", "Ingresa usuario y contraseña.")
            return

        self.button.setEnabled(False)
        self.button.setText("Ingresando…")
        try:
            self.client.login(username, password)
            self.logged_in.emit()
        except ApiError as exc:
            QMessageBox.critical(self, "Error de acceso", exc.message)
        finally:
            self.button.setEnabled(True)
            self.button.setText("Iniciar sesión")
