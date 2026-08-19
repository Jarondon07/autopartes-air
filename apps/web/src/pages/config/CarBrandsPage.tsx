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
import { App, Button, Card, Space, Table, Tag, Typography } from 'antd';
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
import { DataTable } from '../../components/DataTable';

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
      width: 96,
      render: (url: string | null) => (
        <div
          style={{
            width: 72,
            height: 44,
            borderRadius: 6,
            border: '1px solid #f0f0f0',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            color: '#bfbfbf',
          }}
        >
          {url ? (
            <img
              src={url}
              alt="Logo"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
            />
          ) : (
            <CarOutlined style={{ fontSize: 20 }} />
          )}
        </div>
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
          // En telefono el titulo y las acciones se apilan en vez de aplastarse.
          flexWrap: 'wrap',
          gap: 12,
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
        <DataTable<CarBrand>
          rowKey="id"
          columns={columns}
          dataSource={brands.data ?? []}
          loading={brands.isLoading}
          mobileCard={(b) => ({
            avatar: b.logoUrl ? (
              <img
                src={b.logoUrl}
                alt={b.name}
                style={{ width: 56, height: 40, objectFit: 'contain' }}
              />
            ) : (
              <CarOutlined style={{ fontSize: 24, color: '#bfbfbf' }} />
            ),
            title: b.name,
            tags: b.isActive ? <Tag color="success">Activa</Tag> : <Tag>Inactiva</Tag>,
            actions: (
              <>
                <Button
                  size="small"
                  icon={<AppstoreOutlined />}
                  onClick={() => setModelsBrand(b)}
                >
                  Modelos
                </Button>
                {canUpdate && (
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(b)}>
                    Editar
                  </Button>
                )}
                {canUpdate && (
                  <Button
                    size="small"
                    icon={b.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
                    onClick={() => toggleActive(b)}
                  >
                    {b.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                )}
                {canDelete && (
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => confirmDelete(b)}>
                    Eliminar
                  </Button>
                )}
              </>
            ),
          })}
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
