import { useState } from 'react';
import {
  AppstoreOutlined,
  CarOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { App, Avatar, Button, Card, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { CarBrand } from '@autopartes-air/shared';
import { PERMISSIONS } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import {
  useCarBrands,
  useDeleteCarBrand,
  useUpdateCarBrand,
} from '../../hooks/useCarBrands';
import { useAuthStore } from '../../stores/auth.store';
import { CarBrandFormModal } from './CarBrandFormModal';
import { CarModelsDrawer } from './CarModelsDrawer';

const { Title, Text } = Typography;

export function CarBrandsPage() {
  const { message, modal } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission(PERMISSIONS.PRODUCTS_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.PRODUCTS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.PRODUCTS_DELETE);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CarBrand | null>(null);
  const [modelsBrand, setModelsBrand] = useState<CarBrand | null>(null);

  const brands = useCarBrands();
  const updateBrand = useUpdateCarBrand();
  const deleteBrand = useDeleteCarBrand();

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (brand: CarBrand) => {
    setEditing(brand);
    setModalOpen(true);
  };

  const toggleActive = async (brand: CarBrand) => {
    try {
      await updateBrand.mutateAsync({
        id: brand.id,
        input: {
          name: brand.name,
          abbreviation: brand.abbreviation ?? undefined,
          logoUrl: brand.logoUrl ?? undefined,
          isActive: !brand.isActive,
        },
      });
      message.success(brand.isActive ? 'Marca desactivada' : 'Marca activada');
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo cambiar el estado'));
    }
  };

  const confirmDelete = (brand: CarBrand) => {
    modal.confirm({
      title: `¿Eliminar la marca "${brand.name}"?`,
      content: 'No se podrá eliminar si tiene modelos asociados (desactívala en su lugar).',
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteBrand.mutateAsync(brand.id);
          message.success('Marca eliminada');
        } catch (err) {
          message.error(getApiErrorMessage(err, 'No se pudo eliminar'));
        }
      },
    });
  };

  const columns: ColumnsType<CarBrand> = [
    {
      title: 'Logo',
      dataIndex: 'logoUrl',
      width: 80,
      render: (url: string | null) => (
        <Avatar
          shape="square"
          size={44}
          src={url ?? undefined}
          icon={<CarOutlined />}
          style={{ background: url ? '#fff' : '#f0f0f0', color: '#8c8c8c' }}
        />
      ),
    },
    {
      title: 'Marca',
      dataIndex: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
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
      width: 200,
      align: 'right',
      render: (_, brand) => (
        <Space size="small">
          <Button
            type="text"
            icon={<AppstoreOutlined />}
            onClick={() => setModelsBrand(brand)}
            title="Modelos"
          >
            Modelos
          </Button>
          {canUpdate && (
            <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(brand)} title="Editar" />
          )}
          {canUpdate && (
            <Button
              type="text"
              icon={
                brand.isActive ? (
                  <StopOutlined style={{ color: '#fa8c16' }} />
                ) : (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                )
              }
              onClick={() => toggleActive(brand)}
              title={brand.isActive ? 'Desactivar' : 'Activar'}
            />
          )}
          {canDelete && (
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => confirmDelete(brand)} />
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
            <strong>Marcas de vehículos</strong>
          </Title>
          <Text type="secondary">Marcas y modelos de carros (con logo)</Text>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nueva marca
          </Button>
        )}
      </div>

      <Card>
        <Table<CarBrand>
          rowKey="id"
          columns={columns}
          dataSource={brands.data ?? []}
          loading={brands.isLoading}
          pagination={{ pageSize: 20, showTotal: (t) => `${t} marcas` }}
        />
      </Card>

      <CarBrandFormModal
        open={modalOpen}
        brand={editing}
        onClose={() => setModalOpen(false)}
      />
      <CarModelsDrawer brand={modelsBrand} onClose={() => setModelsBrand(null)} />
    </div>
  );
}
