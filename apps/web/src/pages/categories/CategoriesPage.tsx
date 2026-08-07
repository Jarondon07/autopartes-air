import { useState } from 'react';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Category } from '@autopartes-air/shared';
import { PERMISSIONS } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { formatCategoryCode } from '../../lib/categories';
import {
  useCategories,
  useDeleteCategory,
  useUpdateCategory,
} from '../../hooks/useCatalogs';
import { useAuthStore } from '../../stores/auth.store';
import { CategoryFormModal } from './CategoryFormModal';

const { Title, Text } = Typography;

export function CategoriesPage() {
  const { message, modal } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission(PERMISSIONS.PRODUCTS_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.PRODUCTS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.PRODUCTS_DELETE);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const categories = useCategories();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (category: Category) => {
    setEditing(category);
    setModalOpen(true);
  };

  const toggleActive = async (category: Category) => {
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        input: {
          name: category.name,
          description: category.description ?? undefined,
          isActive: !category.isActive,
        },
      });
      message.success(category.isActive ? 'Categoría desactivada' : 'Categoría activada');
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo cambiar el estado'));
    }
  };

  const confirmDelete = (category: Category) => {
    modal.confirm({
      title: `¿Eliminar "${category.name}"?`,
      content:
        'No se podrá eliminar si tiene productos asociados (desactívala en su lugar).',
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteCategory.mutateAsync(category.id);
          message.success('Categoría eliminada');
        } catch (err) {
          message.error(getApiErrorMessage(err, 'No se pudo eliminar'));
        }
      },
    });
  };

  const columns: ColumnsType<Category> = [
    {
      title: 'Código',
      dataIndex: 'id',
      width: 140,
      render: (id: number) => <Tag>{formatCategoryCode(id)}</Tag>,
    },
    {
      title: 'Nombre',
      dataIndex: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Abrev.',
      dataIndex: 'abbreviation',
      width: 90,
      render: (a: string | null) => a || <Text type="secondary">—</Text>,
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      render: (d: string | null) => d || <Text type="secondary">—</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      width: 120,
      render: (active: boolean) =>
        active ? <Tag color="success">Activa</Tag> : <Tag>Inactiva</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 130,
      align: 'right',
      render: (_, category) => (
        <Space size="small">
          {canUpdate && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEdit(category)}
              title="Editar"
            />
          )}
          {canUpdate && (
            <Button
              type="text"
              icon={
                category.isActive ? (
                  <StopOutlined style={{ color: '#fa8c16' }} />
                ) : (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                )
              }
              onClick={() => toggleActive(category)}
              title={category.isActive ? 'Desactivar' : 'Activar'}
            />
          )}
          {canDelete && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(category)}
              title="Eliminar"
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
            <strong>Categorías</strong>
          </Title>
          <Text type="secondary">Clasificación de los productos</Text>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nueva categoría
          </Button>
        )}
      </div>

      <Card>
        <Table<Category>
          rowKey="id"
          columns={columns}
          dataSource={categories.data ?? []}
          loading={categories.isLoading}
          pagination={{ pageSize: 20, showTotal: (t) => `${t} categorías` }}
        />
      </Card>

      <CategoryFormModal
        open={modalOpen}
        category={editing}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
