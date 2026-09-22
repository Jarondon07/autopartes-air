import { useState } from 'react';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { App, Button, Drawer, Input, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { CarBrand, CarModel } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import {
  useCarModels,
  useCreateCarModel,
  useDeleteCarModel,
  useUpdateCarModel,
} from '../../hooks/useCarBrands';

const { Text } = Typography;

interface Props {
  brand: CarBrand | null;
  onClose: () => void;
}

export function CarModelsDrawer({ brand, onClose }: Props) {
  const { message, modal } = App.useApp();
  const brandId = brand?.id ?? null;

  const models = useCarModels(brandId);
  const createModel = useCreateCarModel();
  const updateModel = useUpdateCarModel();
  const deleteModel = useDeleteCarModel();

  const [newName, setNewName] = useState('');

  const add = async () => {
    const name = newName.trim();
    if (!name || !brandId) return;
    try {
      await createModel.mutateAsync({ brandId, name });
      setNewName('');
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo agregar el modelo'));
    }
  };

  const toggle = async (m: CarModel) => {
    try {
      await updateModel.mutateAsync({
        id: m.id,
        input: { brandId: m.brandId, name: m.name, isActive: !m.isActive },
      });
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo cambiar el estado'));
    }
  };

  const rename = (m: CarModel) => {
    let value = m.name;
    modal.confirm({
      title: 'Renombrar modelo',
      icon: <EditOutlined />,
      content: (
        <Input
          defaultValue={m.name}
          onChange={(e) => {
            value = e.target.value;
          }}
          style={{ marginTop: 12 }}
        />
      ),
      okText: 'Guardar',
      cancelText: 'Cancelar',
      onOk: async () => {
        const name = value.trim();
        if (!name) {
          message.error('El nombre no puede estar vacío');
          throw new Error('empty');
        }
        try {
          await updateModel.mutateAsync({
            id: m.id,
            input: { brandId: m.brandId, name, isActive: m.isActive },
          });
        } catch (err) {
          message.error(getApiErrorMessage(err, 'No se pudo renombrar'));
          throw err;
        }
      },
    });
  };

  const confirmDelete = (m: CarModel) => {
    modal.confirm({
      title: `¿Eliminar el modelo "${m.name}"?`,
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteModel.mutateAsync({ id: m.id, brandId: m.brandId });
          message.success('Modelo eliminado');
        } catch (err) {
          message.error(getApiErrorMessage(err, 'No se pudo eliminar'));
        }
      },
    });
  };

  const columns: ColumnsType<CarModel> = [
    { title: 'Modelo', dataIndex: 'name' },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      width: 100,
      render: (a: boolean) => (a ? <Tag color="success">Activo</Tag> : <Tag>Inactivo</Tag>),
    },
    {
      title: '',
      key: 'x',
      width: 120,
      align: 'right',
      render: (_, m) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} onClick={() => rename(m)} title="Renombrar" />
          <Button
            type="text"
            icon={
              m.isActive ? (
                <StopOutlined style={{ color: '#fa8c16' }} />
              ) : (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              )
            }
            onClick={() => toggle(m)}
            title={m.isActive ? 'Desactivar' : 'Activar'}
          />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => confirmDelete(m)} />
        </Space>
      ),
    },
  ];

  return (
    <Drawer
      open={brand != null}
      onClose={onClose}
      width={520}
      title={brand ? `Modelos de ${brand.name}` : 'Modelos'}
    >
      <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
        <Input
          placeholder="Nuevo modelo (ej. Corolla)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={add}
        />
        <Button type="primary" onClick={add} loading={createModel.isPending}>
          Agregar
        </Button>
      </Space.Compact>

      <DataTable<CarModel>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={models.data ?? []}
        loading={models.isLoading}
        pagination={false}
        mobileCard={(m) => ({
          title: m.name,
          tags: m.isActive ? <Tag color="success">Activo</Tag> : <Tag>Inactivo</Tag>,
          actions: (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => rename(m)}>
                Renombrar
              </Button>
              <Button
                size="small"
                icon={m.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
                onClick={() => toggle(m)}
              >
                {m.isActive ? 'Desactivar' : 'Activar'}
              </Button>
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => confirmDelete(m)}>
                Eliminar
              </Button>
            </>
          ),
        })}
        locale={{ emptyText: 'Sin modelos aún' }}
      />
    </Drawer>
  );
}
