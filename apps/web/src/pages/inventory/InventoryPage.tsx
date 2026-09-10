import { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Select, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  MOVEMENT_TYPES,
  MOVEMENT_TYPE_LABELS,
  PERMISSIONS,
  type MovementType,
} from '@autopartes-air/shared';
import type { MovementRow } from '../../api/inventory.api';
import { DataTable } from '../../components/DataTable';
import { useMovements } from '../../hooks/useInventory';
import { useAuthStore } from '../../stores/auth.store';
import { AdjustmentModal } from './AdjustmentModal';
import { formatDateTime } from '../../lib/datetime';

const { Title, Text } = Typography;

const TYPE_COLOR: Record<MovementType, string> = {
  compra: 'green',
  venta: 'blue',
  ajuste: 'orange',
  anulacion: 'red',
};

export function InventoryPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canAdjust = hasPermission(PERMISSIONS.INVENTORY_ADJUST);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [movementType, setMovementType] = useState<MovementType | undefined>();
  const [modalOpen, setModalOpen] = useState(false);

  const movements = useMovements({ page, limit, movementType });

  const columns: ColumnsType<MovementRow> = [
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      width: 150,
      render: (d: string) => formatDateTime(d),
    },
    {
      title: 'Producto',
      key: 'product',
      render: (_, m) => (
        <span>
          <Text strong>{m.productCode}</Text> — {m.productName}
        </span>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'movementType',
      width: 120,
      render: (t: MovementType) => (
        <Tag color={TYPE_COLOR[t]}>{MOVEMENT_TYPE_LABELS[t]}</Tag>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'quantity',
      width: 110,
      align: 'right',
      render: (q: number) => (
        <Text strong style={{ color: q >= 0 ? '#52c41a' : '#dc3545' }}>
          {q > 0 ? `+${q}` : q}
        </Text>
      ),
    },
    {
      title: 'Stock resultante',
      dataIndex: 'stockAfter',
      width: 130,
      align: 'right',
    },
    {
      title: 'Nota',
      dataIndex: 'notes',
      render: (n: string | null) => n || <Text type="secondary">—</Text>,
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
            <strong>Inventario</strong>
          </Title>
          <Text type="secondary">Movimientos de stock (auditable)</Text>
        </div>
        {canAdjust && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Ajustar stock
          </Button>
        )}
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="Tipo de movimiento"
            style={{ width: 200 }}
            value={movementType}
            onChange={(v) => {
              setMovementType(v);
              setPage(1);
            }}
            options={MOVEMENT_TYPES.map((t) => ({
              value: t,
              label: MOVEMENT_TYPE_LABELS[t],
            }))}
          />
        </Space>

        <DataTable<MovementRow>
          rowKey="id"
          columns={columns}
          dataSource={movements.data?.data ?? []}
          loading={movements.isLoading}
          mobileCard={(m) => ({
            title: (
              <span>
                <Text strong>{m.productCode}</Text> — {m.productName}
              </span>
            ),
            subtitle: formatDateTime(m.createdAt),
            tags: <Tag color={TYPE_COLOR[m.movementType]}>{MOVEMENT_TYPE_LABELS[m.movementType]}</Tag>,
            fields: [
              {
                label: 'Cantidad',
                value: (
                  <Text strong style={{ color: m.quantity >= 0 ? '#52c41a' : '#dc3545' }}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </Text>
                ),
              },
              { label: 'Stock resultante', value: m.stockAfter },
              m.notes ? { label: 'Nota', value: m.notes } : null,
            ],
          })}
          pagination={{
            current: page,
            pageSize: limit,
            total: movements.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} movimientos`,
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
            },
          }}
        />
      </Card>

      <AdjustmentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
