import { useState } from 'react';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Card, Input, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Supplier } from '@autopartes-air/shared';
import { PERMISSIONS } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { useDeleteSupplier, useSuppliers } from '../../hooks/useSuppliers';
import { useAuthStore } from '../../stores/auth.store';
import { SupplierFormModal } from './SupplierFormModal';

const { Title, Text } = Typography;

interface Filters {
  page: number;
  limit: number;
  q?: string;
}

export function SuppliersPage() {
  const { message, modal } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission(PERMISSIONS.SUPPLIERS_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.SUPPLIERS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.SUPPLIERS_DELETE);

  const [filters, setFilters] = useState<Filters>({ page: 1, limit: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const suppliers = useSuppliers(filters);
  const deleteSupplier = useDeleteSupplier();

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setModalOpen(true);
  };

  const confirmDelete = (supplier: Supplier) => {
    modal.confirm({
      title: `¿Eliminar a "${supplier.name}"?`,
      content: 'Si el proveedor tiene compras registradas, no se podrá eliminar.',
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteSupplier.mutateAsync(supplier.id);
          message.success('Proveedor eliminado');
        } catch (err) {
          message.error(getApiErrorMessage(err, 'No se pudo eliminar'));
        }
      },
    });
  };

  const columns: ColumnsType<Supplier> = [
    { title: 'RIF', dataIndex: 'rif', width: 150, render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Nombre', dataIndex: 'name' },
    {
      title: 'Contacto',
      dataIndex: 'contactName',
      render: (v: string | null) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Teléfono',
      dataIndex: 'phone',
      width: 150,
      render: (v: string | null) => v || <Text type="secondary">—</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 90,
      align: 'right',
      render: (_, supplier) => (
        <Space size="small">
          {canUpdate && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEdit(supplier)}
            />
          )}
          {canDelete && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(supplier)}
            />
          )}
        </Space>
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
            <strong>Proveedores</strong>
          </Title>
          <Text type="secondary">Gestión de proveedores</Text>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nuevo proveedor
          </Button>
        )}
      </div>

      <Card>
        <Input.Search
          allowClear
          placeholder="Buscar por nombre o RIF"
          style={{ maxWidth: 360, marginBottom: 16 }}
          onSearch={(q) => setFilters((f) => ({ ...f, q: q || undefined, page: 1 }))}
        />

        <DataTable<Supplier>
          rowKey="id"
          columns={columns}
          dataSource={suppliers.data?.data ?? []}
          loading={suppliers.isLoading}
          mobileCard={(sp) => ({
            title: sp.name,
            subtitle: <Text strong>{sp.rif}</Text>,
            fields: [
              { label: 'Contacto', value: sp.contactName || <Text type="secondary">—</Text> },
              { label: 'Telefono', value: sp.phone || <Text type="secondary">—</Text> },
            ],
            actions: (
              <>
                {canUpdate && (
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(sp)}>
                    Editar
                  </Button>
                )}
                {canDelete && (
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => confirmDelete(sp)}
                  >
                    Eliminar
                  </Button>
                )}
              </>
            ),
          })}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: suppliers.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} proveedores`,
            onChange: (page, limit) => setFilters((f) => ({ ...f, page, limit })),
          }}
        />
      </Card>

      <SupplierFormModal
        open={modalOpen}
        supplier={editing}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
