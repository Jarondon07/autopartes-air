import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CatalogItem, CatalogRates } from '../api/catalog.api';
import { formatDateTime } from './datetime';

/**
 * Arma el PDF de la lista de precios en el navegador (jsPDF).
 *
 * Se genera del lado del cliente a propósito: el servidor no gasta CPU ni
 * memoria en armar documentos, y el cliente descarga exactamente lo que está
 * viendo. La fecha va estampada en cada página: los precios en bolívares se
 * calculan con la tasa del día y al siguiente ya no son los mismos.
 */
export function buildCatalogPdf(
  items: CatalogItem[],
  rates: CatalogRates,
  opts: { title?: string; filters?: string } = {},
): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const generatedAt = formatDateTime(new Date());

  const bsOf = (usd: number | null) =>
    usd != null && rates.usdt ? Math.round(usd * rates.usdt * 100) / 100 : null;

  const money = (n: number | null) =>
    n == null ? '—' : n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  autoTable(doc, {
    startY: 96,
    head: [['Código', 'Producto', 'Nº pieza', 'Marca', 'Vehículo', 'Precio USD', 'Precio Bs', 'Disp.']],
    body: items.map((it) => {
      const usd = it.priceUsd != null ? Number(it.priceUsd) : null;
      return [
        it.code,
        it.name,
        it.partNumber,
        it.brandName ?? '—',
        it.isUniversal
          ? 'Universal'
          : [it.carBrandName, it.carModels.join(', ')].filter(Boolean).join(' · ') || '—',
        usd == null ? '—' : `$ ${money(usd)}`,
        rates.usdt ? `Bs ${money(bsOf(usd))}` : '—',
        it.available ? 'Sí' : 'No',
      ];
    }),
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [10, 77, 140], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 248, 250] },
    columnStyles: {
      0: { cellWidth: 80 },
      2: { cellWidth: 60 },
      5: { cellWidth: 70, halign: 'right' },
      6: { cellWidth: 85, halign: 'right' },
      7: { cellWidth: 40, halign: 'center' },
    },
    // El encabezado se dibuja por página: al imprimir, cada hoja suelta debe
    // poder decir de cuándo es.
    didDrawPage: () => {
      const width = doc.internal.pageSize.getWidth();
      doc.setFontSize(16);
      doc.setTextColor(10, 77, 140);
      doc.text('AutoparteAIR', 40, 42);
      doc.setFontSize(11);
      doc.setTextColor(60);
      doc.text(opts.title ?? 'Lista de precios', 40, 60);

      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(`Generado el ${generatedAt}`, 40, 76);
      if (opts.filters) doc.text(opts.filters, 40, 88);

      const page = doc.getNumberOfPages();
      doc.text(`Página ${page}`, width - 80, 42);
    },
    margin: { top: 96, left: 40, right: 40, bottom: 40 },
  });

  // Los precios cambian con la tasa: conviene decirlo en el propio documento.
  const lastPage = doc.getNumberOfPages();
  doc.setPage(lastPage);
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(
    'Precios referenciales sujetos a cambio sin previo aviso. La disponibilidad puede variar.',
    40,
    doc.internal.pageSize.getHeight() - 24,
  );

  return doc;
}

/** Nombre de archivo con fecha, para que dos descargas no se pisen. */
export function catalogPdfFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `catalogo-autoparteair-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.pdf`;
}
