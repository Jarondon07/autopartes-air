import { useState } from 'react';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Input,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Client } from '@autopartes-air/shared';
import { PERMISSIONS } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import {
  useClients,
  useDeleteClient,
} from '../../hooks/useClients';
import { useAuthStore } from '../../stores/auth.store';
import { ClientFormModal } from './ClientFormModal';

const { Title, Text } = Typography;

interface Filters {
  page: number;
  limit: number;
  q?: string;
}

export function ClientsPage() {
  const { message, modal } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission(PERMISSIONS.CLIENTS_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.CLIENTS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.CLIENTS_DELETE);

  const [filters, setFilters] = useState<Filters>({ page: 1, limit: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const clients = useClients(filters);
  const deleteClient = useDeleteClient();

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (client: Client) => {
    setEditing(client);
    setModalOpen(true);
  };

  const confirmDelete = (client: Client) => {
    modal.confirm({
      title: `¿Eliminar a "${client.name}"?`,
      content: 'Si el cliente tiene ventas registradas, no se podrá eliminar.',
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteClient.mutateAsync(client.id);
          message.success('Cliente eliminado');
        } catch (err) {
          message.error(getApiErrorMessage(err, 'No se pudo eliminar'));
        }
      },
    });
  };

  const columns: ColumnsType<Client> = [
    {
      title: 'Documento',
      key: 'document',
      width: 160,
      render: (_, c) => (
        <Text strong>
          <Tag>{c.documentType}</Tag>
          {c.documentNumber}
        </Text>
      ),
    },
    { title: 'Nombre', dataIndex: 'name' },
    {
      title: 'Teléfono',
      dataIndex: 'phone',
      width: 150,
      render: (v: string | null) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Correo',
      dataIndex: 'email',
      render: (v: string | null) => v || <Text type="secondary">—</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 90,
      align: 'right',
      render: (_, client) => (
        <Space size="small">
          {canUpdate && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEdit(client)}
            />
          )}
          {canDelete && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(client)}
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
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <strong>Clientes</strong>
          </Title>
          <Text type="secondary">Gestión de clientes del sistema</Text>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nuevo cliente
          </Button>
        )}
      </div>

      <Card>
        <Input.Search
          allowClear
          placeholder="Buscar por nombre o documento"
          style={{ maxWidth: 360, marginBottom: 16 }}
          onSearch={(q) => setFilters((f) => ({ ...f, q: q || undefined, page: 1 }))}
        />

        <Table<Client>
          rowKey="id"
          columns={columns}
          dataSource={clients.data?.data ?? []}
          loading={clients.isLoading}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: clients.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} clientes`,
            onChange: (page, limit) => setFilters((f) => ({ ...f, page, limit })),
          }}
        />
      </Card>

      <ClientFormModal
        open={modalOpen}
        client={editing}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
