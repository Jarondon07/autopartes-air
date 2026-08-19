import { Descriptions, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { PAYMENT_METHOD_LABELS, formatUsd } from '@autopartes-air/shared';
import type { SaleDetail } from '../api/sales.api';

const { Text, Title } = Typography;

function formatBs(v: string | number): string {
  return `Bs ${Number(v).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Factura completa de una venta (datos, renglones y totales). Reutilizable. */
export function SaleInvoice({ sale }: { sale: SaleDetail }) {
  return (
    <>
      <Title level={4} style={{ marginTop: 0 }}>
        Factura #{sale.id}
      </Title>

      <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Estado">
          {sale.status === 'anulada' ? (
            <Tag color="error">Anulada</Tag>
          ) : (
            <Tag color="success">Completada</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Cliente">{sale.clientName || 'Contado'}</Descriptions.Item>
        <Descriptions.Item label="Fecha">
          {dayjs(sale.saleDate).format('DD/MM/YYYY HH:mm')}
        </Descriptions.Item>
        <Descriptions.Item label="Pago">
          {(sale.payments?.length ?? 0) > 0
            ? sale.payments
                .map((p) => {
                  const bs = Number(p.amountBs);
                  return `${PAYMENT_METHOD_LABELS[p.method]}: ${formatUsd(Number(p.amountUsd))}${
                    bs > 0 ? ` (${formatBs(bs)})` : ''
                  }`;
                })
                .join(' · ')
            : (sale.paymentMethods ?? []).map((m) => PAYMENT_METHOD_LABELS[m]).join(', ') || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Tasa (snapshot)">
          {formatBs(sale.exchangeRate)} / USD
        </Descriptions.Item>
        {sale.notes && <Descriptions.Item label="Notas">{sale.notes}</Descriptions.Item>}
      </Descriptions>

      <Table
              scroll={{ x: 'max-content' }}
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={sale.details}
        columns={[
          {
            title: 'Producto',
            key: 'p',
            render: (_, d) => `${d.productCode} — ${d.productName}`,
          },
          { title: 'Cant.', dataIndex: 'quantity', width: 60, align: 'right' },
          {
            title: 'Precio',
            dataIndex: 'unitPriceUsd',
            width: 90,
            align: 'right',
            render: (v: string) => formatUsd(Number(v)),
          },
          {
            title: 'Subtotal',
            dataIndex: 'subtotalUsd',
            width: 100,
            align: 'right',
            render: (v: string) => formatUsd(Number(v)),
          },
        ]}
      />

      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <div>
          <Text type="secondary">Subtotal: </Text>
          {formatUsd(Number(sale.subtotalUsd))}
        </div>
        <div style={{ marginTop: 4 }}>
          <Text type="secondary">IVA ({Number(sale.ivaPct)}%): </Text>
          {formatUsd(Number(sale.ivaUsd))}
        </div>
        <div style={{ marginTop: 8, fontSize: 16 }}>
          <Text strong>Total: {formatUsd(Number(sale.totalUsd))}</Text>
          <Text type="secondary" style={{ marginLeft: 8 }}>
            ({formatBs(sale.totalBs)})
          </Text>
        </div>
      </div>
    </>
  );
}
