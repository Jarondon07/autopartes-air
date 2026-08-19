import { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import {
  PAYMENT_METHOD_LABELS,
  PERMISSIONS,
  formatUsd,
  type SaleStatus,
} from '@autopartes-air/shared';
import type { SaleRow } from '../../api/sales.api';
import { getApiErrorMessage } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { useSale, useSales, useVoidSale } from '../../hooks/useSales';
import { useAuthStore } from '../../stores/auth.store';
import { formatDateTime } from '../../lib/datetime';

const { Title, Text } = Typography;

function formatBs(v: string | number): string {
  return `Bs ${Number(v).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusTag({ status }: { status: SaleStatus }) {
  return status === 'anulada' ? (
    <Tag color="red">Anulada</Tag>
  ) : (
    <Tag color="green">Completada</Tag>
  );
}

export function SalesListPage() {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission(PERMISSIONS.SALES_CREATE);
  const canVoid = hasPermission(PERMISSIONS.SALES_VOID);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<SaleStatus | undefined>();
  const [detailId, setDetailId] = useState<number | null>(null);

  const sales = useSales({ page, limit, status });
  const detail = useSale(detailId);
  const voidSale = useVoidSale();

  const confirmVoid = (id: number) => {
    modal.confirm({
      title: `¿Anular la venta #${id}?`,
      content: 'Se revertirá el stock de los productos. Esta acción no se puede deshacer.',
      okText: 'Anular',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await voidSale.mutateAsync(id);
          message.success('Venta anulada; stock revertido');
        } catch (err) {
          message.error(getApiErrorMessage(err, 'No se pudo anular'));
        }
      },
    });
  };

  const columns: ColumnsType<SaleRow> = [
    { title: 'N°', dataIndex: 'id', width: 70, render: (id: number) => `#${id}` },
    {
      title: 'Fecha',
      dataIndex: 'saleDate',
      width: 150,
      render: (d: string) => formatDateTime(d),
    },
    {
      title: 'Cliente',
      dataIndex: 'clientName',
      render: (n: string | null) => n || <Text type="secondary">Contado</Text>,
    },
    {
      title: 'Pago',
      dataIndex: 'paymentMethods',
      width: 160,
      render: (ms: SaleRow['paymentMethods']) =>
        (ms ?? []).map((m) => PAYMENT_METHOD_LABELS[m]).join(', ') || '—',
    },
    {
      title: 'Total USD',
      dataIndex: 'totalUsd',
      width: 110,
      align: 'right',
      render: (v: string) => <Text strong>{formatUsd(Number(v))}</Text>,
    },
    {
      title: 'Total Bs',
      dataIndex: 'totalBs',
      width: 140,
      align: 'right',
      render: (v: string) => formatBs(v),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      width: 110,
      render: (s: SaleStatus) => <StatusTag status={s} />,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      align: 'right',
      render: (_, row) => (
        <Button type="link" onClick={() => setDetailId(row.id)}>
          Ver
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          // En telefono el titulo y las acciones se apilan en vez de aplastarse.
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <strong>Ventas</strong>
          </Title>
          <Text type="secondary">Historial de facturas</Text>
        </div>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/ventas/caja')}
          >
            Nueva venta
          </Button>
        )}
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="Estado"
            style={{ width: 180 }}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              { value: 'completada', label: 'Completada' },
              { value: 'anulada', label: 'Anulada' },
            ]}
          />
        </Space>

        <DataTable<SaleRow>
          rowKey="id"
          columns={columns}
          dataSource={sales.data?.data ?? []}
          loading={sales.isLoading}
          mobileCard={(sale) => ({
            title: (
              <span>
                #{sale.id}{' '}
                <Text type="secondary" style={{ fontWeight: 400 }}>
                  {formatDateTime(sale.saleDate)}
                </Text>
              </span>
            ),
            subtitle: sale.clientName || 'Contado',
            tags: <StatusTag status={sale.status} />,
            fields: [
              { label: 'Total USD', value: <Text strong>{formatUsd(Number(sale.totalUsd))}</Text> },
              { label: 'Total Bs', value: formatBs(sale.totalBs) },
              {
                label: 'Pago',
                value:
                  (sale.paymentMethods ?? []).map((m) => PAYMENT_METHOD_LABELS[m]).join(', ') || '—',
              },
            ],
            actions: (
              <Button size="small" type="primary" ghost onClick={() => setDetailId(sale.id)}>
                Ver factura
              </Button>
            ),
          })}
          pagination={{
            current: page,
            pageSize: limit,
            total: sales.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} ventas`,
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
            },
          }}
        />
      </Card>

      <Drawer
        open={detailId != null}
        onClose={() => setDetailId(null)}
        title={`Factura #${detailId ?? ''}`}
        width={640}
        styles={{ body: { paddingInline: 16 } }}
        loading={detail.isLoading}
        extra={
          detail.data?.status === 'completada' && canVoid ? (
            <Button danger onClick={() => confirmVoid(detail.data!.id)}>
              Anular
            </Button>
          ) : undefined
        }
      >
        {detail.data && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Estado">
                <StatusTag status={detail.data.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Cliente">
                {detail.data.clientName || 'Contado'}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha">
                {formatDateTime(detail.data.saleDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Pago">
                {(detail.data.payments?.length ?? 0) > 0
                  ? detail.data.payments.map((p) => {
                      const bs = Number(p.amountBs);
                      return `${PAYMENT_METHOD_LABELS[p.method]}: ${formatUsd(Number(p.amountUsd))}${
                        bs > 0 ? ` (${formatBs(bs)})` : ''
                      }`;
                    }).join(' · ')
                  : (detail.data.paymentMethods ?? [])
                      .map((m) => PAYMENT_METHOD_LABELS[m])
                      .join(', ') || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Tasa (snapshot)">
                {formatBs(detail.data.exchangeRate)} / USD
              </Descriptions.Item>
              {detail.data.notes && (
                <Descriptions.Item label="Notas">{detail.data.notes}</Descriptions.Item>
              )}
            </Descriptions>

            <Table
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              dataSource={detail.data.details}
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
                {formatUsd(Number(detail.data.subtotalUsd))}
              </div>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">IVA ({Number(detail.data.ivaPct)}%): </Text>
                {formatUsd(Number(detail.data.ivaUsd))}
              </div>
              <div style={{ marginTop: 8, fontSize: 16 }}>
                <Text strong>Total: {formatUsd(Number(detail.data.totalUsd))}</Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({formatBs(detail.data.totalBs)})
                </Text>
              </div>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
