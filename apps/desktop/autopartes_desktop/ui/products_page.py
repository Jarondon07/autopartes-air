"""Página de productos: tabla con búsqueda y paginación."""

from __future__ import annotations

from PySide6.QtCore import QAbstractTableModel, QModelIndex, Qt
from PySide6.QtGui import QColor
from PySide6.QtWidgets import (
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QTableView,
    QVBoxLayout,
    QWidget,
)

from ..api import ApiClient, ApiError
from ..api import products as products_api
from ..format import format_usd

COLUMNS = ["Código", "Nombre", "Categoría", "Marca", "Costo", "Precio", "Stock", "Estado"]


class ProductsTableModel(QAbstractTableModel):
    def __init__(self) -> None:
        super().__init__()
        self._rows: list[dict] = []
        self._categories: dict[int, str] = {}
        self._brands: dict[int, str] = {}

    def set_catalogs(self, categories: dict[int, str], brands: dict[int, str]) -> None:
        self._categories = categories
        self._brands = brands

    def set_rows(self, rows: list[dict]) -> None:
        self.beginResetModel()
        self._rows = rows
        self.endResetModel()

    def rowCount(self, parent: QModelIndex = QModelIndex()) -> int:  # noqa: N802
        return 0 if parent.isValid() else len(self._rows)

    def columnCount(self, parent: QModelIndex = QModelIndex()) -> int:  # noqa: N802
        return len(COLUMNS)

    def headerData(self, section, orientation, role=Qt.ItemDataRole.DisplayRole):  # noqa: N802
        if orientation == Qt.Orientation.Horizontal and role == Qt.ItemDataRole.DisplayRole:
            return COLUMNS[section]
        return None

    def data(self, index: QModelIndex, role=Qt.ItemDataRole.DisplayRole):
        if not index.isValid():
            return None
        row = self._rows[index.row()]
        col = index.column()

        if role == Qt.ItemDataRole.DisplayRole:
            if col == 0:
                return row.get("code")
            if col == 1:
                return row.get("name")
            if col == 2:
                return self._categories.get(row.get("categoryId"), "—")
            if col == 3:
                return self._brands.get(row.get("brandId"), "—")
            if col == 4:
                return format_usd(row.get("costUsd"))
            if col == 5:
                return format_usd(row.get("priceUsd"))
            if col == 6:
                return str(row.get("stock", 0))
            if col == 7:
                return "Activo" if row.get("isActive") else "Inactivo"

        if role == Qt.ItemDataRole.TextAlignmentRole and col in (4, 5, 6):
            return int(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)

        if role == Qt.ItemDataRole.ForegroundRole:
            if col == 6 and row.get("stock", 0) <= row.get("minStock", 0):
                return QColor("#dc3545")  # stock bajo en rojo
            if col == 7 and not row.get("isActive"):
                return QColor("#adb5bd")

        return None


class ProductsPage(QWidget):
    def __init__(self, client: ApiClient) -> None:
        super().__init__()
        self.client = client
        self.page = 1
        self.limit = 20
        self.total = 0
        self.model = ProductsTableModel()
        self._build()
        self._load_catalogs()
        self.reload()

    def _build(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        title = QLabel("Productos")
        title.setStyleSheet("font-size: 20px; font-weight: 700;")
        layout.addWidget(title)

        toolbar = QHBoxLayout()
        self.search = QLineEdit()
        self.search.setPlaceholderText("Buscar por código o nombre (o escanea un código)…")
        self.search.setClearButtonEnabled(True)
        # returnPressed captura el Enter que envía el lector de código de barras.
        self.search.returnPressed.connect(self._on_search)
        self.search.setMinimumWidth(320)

        search_btn = QPushButton("Buscar")
        search_btn.clicked.connect(self._on_search)

        self.new_btn = QPushButton("+ Nuevo producto")
        self.new_btn.clicked.connect(self._on_new)
        # RBAC: igual que la web, se oculta si no tiene el permiso.
        self.new_btn.setVisible(self.client.has_permission("products:create"))

        toolbar.addWidget(self.search)
        toolbar.addWidget(search_btn)
        toolbar.addStretch()
        toolbar.addWidget(self.new_btn)
        layout.addLayout(toolbar)

        self.table = QTableView()
        self.table.setModel(self.model)
        self.table.setSelectionBehavior(QTableView.SelectionBehavior.SelectRows)
        self.table.setAlternatingRowColors(True)
        self.table.verticalHeader().setVisible(False)
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        layout.addWidget(self.table)

        pager = QHBoxLayout()
        self.info = QLabel("")
        self.info.setStyleSheet("color: #6c757d;")
        self.prev_btn = QPushButton("‹ Anterior")
        self.prev_btn.clicked.connect(self._prev)
        self.next_btn = QPushButton("Siguiente ›")
        self.next_btn.clicked.connect(self._next)
        pager.addWidget(self.info)
        pager.addStretch()
        pager.addWidget(self.prev_btn)
        pager.addWidget(self.next_btn)
        layout.addLayout(pager)

    # ------------------------------------------------------------- datos
    def _load_catalogs(self) -> None:
        try:
            categories = {c["id"]: c["name"] for c in products_api.list_categories(self.client)}
            brands = {b["id"]: b["name"] for b in products_api.list_brands(self.client)}
            self.model.set_catalogs(categories, brands)
        except ApiError:
            # Los catálogos son auxiliares; si fallan, se muestran los IDs como "—".
            pass

    def reload(self) -> None:
        try:
            rows, meta = products_api.list_products(
                self.client,
                page=self.page,
                limit=self.limit,
                q=self.search.text().strip() or None,
            )
        except ApiError as exc:
            QMessageBox.critical(self, "Error", exc.message)
            return
        self.total = meta.get("total", len(rows))
        self.model.set_rows(rows)
        self._update_pager()

    def _update_pager(self) -> None:
        pages = max(1, (self.total + self.limit - 1) // self.limit)
        self.info.setText(f"{self.total} productos — página {self.page} de {pages}")
        self.prev_btn.setEnabled(self.page > 1)
        self.next_btn.setEnabled(self.page < pages)

    # ------------------------------------------------------------ acciones
    def _on_search(self) -> None:
        self.page = 1
        self.reload()

    def _prev(self) -> None:
        if self.page > 1:
            self.page -= 1
            self.reload()

    def _next(self) -> None:
        self.page += 1
        self.reload()

    def _on_new(self) -> None:
        QMessageBox.information(
            self,
            "Próximamente",
            "El formulario de alta de productos se implementa en la siguiente "
            "iteración del cliente de escritorio.",
        )
