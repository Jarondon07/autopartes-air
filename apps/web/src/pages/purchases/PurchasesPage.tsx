import { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Drawer, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PERMISSIONS, formatUsd } from '@autopartes-air/shared';
import type { PurchaseRow } from '../../api/purchases.api';
import { DataTable } from '../../components/DataTable';
import { usePurchase, usePurchases } from '../../hooks/usePurchases';
import { useAuthStore } from '../../stores/auth.store';
import { PurchaseFormModal } from './PurchaseFormModal';
import { formatDateTime } from '../../lib/datetime';

const { Title, Text } = Typography;

function formatBs(v: string | number): string {
  return `Bs ${Number(v).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PurchasesPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission(PERMISSIONS.PURCHASES_CREATE);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const purchases = usePurchases({ page, limit });
  const detail = usePurchase(detailId);

  const columns: ColumnsType<PurchaseRow> = [
    {
      title: 'Fecha',
      dataIndex: 'purchaseDate',
      width: 150,
      render: (d: string) => formatDateTime(d),
    },
    { title: 'Proveedor', dataIndex: 'supplierName' },
    {
      title: 'Factura',
      dataIndex: 'invoiceNumber',
      width: 130,
      render: (v: string | null) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Total USD',
      dataIndex: 'totalUsd',
      width: 120,
      align: 'right',
      render: (v: string) => <Text strong>{formatUsd(Number(v))}</Text>,
    },
    {
      title: 'Total Bs',
      dataIndex: 'totalBs',
      width: 150,
      align: 'right',
      render: (v: string) => formatBs(v),
    },
    {
      title: '',
      key: 'actions',
      width: 90,
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
            <strong>Compras</strong>
          </Title>
          <Text type="secondary">Lotes de entrada de mercancía</Text>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Nueva compra
          </Button>
        )}
      </div>

      <Card>
        <DataTable<PurchaseRow>
          rowKey="id"
          columns={columns}
          dataSource={purchases.data?.data ?? []}
          loading={purchases.isLoading}
          mobileCard={(pu) => ({
            title: pu.supplierName,
            subtitle: formatDateTime(pu.purchaseDate),
            fields: [
              { label: 'Factura', value: pu.invoiceNumber || <Text type="secondary">—</Text> },
              { label: 'Total USD', value: <Text strong>{formatUsd(Number(pu.totalUsd))}</Text> },
              { label: 'Total Bs', value: formatBs(pu.totalBs) },
            ],
            actions: (
              <Button size="small" type="primary" ghost onClick={() => setDetailId(pu.id)}>
                Ver compra
              </Button>
            ),
          })}
          pagination={{
            current: page,
            pageSize: limit,
            total: purchases.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} compras`,
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
            },
          }}
        />
      </Card>

      <PurchaseFormModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <Drawer
        open={detailId != null}
        onClose={() => setDetailId(null)}
        title={`Compra #${detailId ?? ''}`}
        width={640}
        loading={detail.isLoading}
      >
        {detail.data && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Proveedor">
                {detail.data.supplierName}
              </Descriptions.Item>
              <Descriptions.Item label="Factura">
                {detail.data.invoiceNumber || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha">
                {formatDateTime(detail.data.purchaseDate)}
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
                { title: 'Cant.', dataIndex: 'quantity', width: 70, align: 'right' },
                {
                  title: 'Costo',
                  dataIndex: 'unitCostUsd',
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

            <div style={{ textAlign: 'right', marginTop: 16, fontSize: 16 }}>
              <Text type="secondary">Total: </Text>
              <Text strong>{formatUsd(Number(detail.data.totalUsd))}</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({formatBs(detail.data.totalBs)})
              </Text>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
