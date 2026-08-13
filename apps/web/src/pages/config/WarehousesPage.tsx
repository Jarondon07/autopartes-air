import { useEffect, useState } from 'react';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Warehouse } from '@autopartes-air/shared';
import { PERMISSIONS } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import {
  useCreateWarehouse,
  useDeleteWarehouse,
  useUpdateWarehouse,
  useWarehouses,
} from '../../hooks/useWarehouses';
import { useAuthStore } from '../../stores/auth.store';

const { Title, Text } = Typography;

function WarehouseFormModal({
  open,
  warehouse,
  onClose,
}: {
  open: boolean;
  warehouse: Warehouse | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm<{ name: string; isActive?: boolean }>();
  const { message } = App.useApp();
  const isEdit = warehouse != null;
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();

  useEffect(() => {
    if (!open) return;
    if (isEdit && warehouse) {
      form.setFieldsValue({ name: warehouse.name, isActive: warehouse.isActive });
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true });
    }
  }, [open, isEdit, warehouse, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const input = { name: values.name.trim(), isActive: values.isActive };
    try {
      if (isEdit && warehouse) {
        await updateWarehouse.mutateAsync({ id: warehouse.id, input });
        message.success('Almacén actualizado');
      } else {
        await createWarehouse.mutateAsync(input);
        message.success('Almacén creado');
      }
      onClose();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo guardar el almacén'));
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Editar almacén' : 'Nuevo almacén'}
      onCancel={onClose}
      onOk={handleOk}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={createWarehouse.isPending || updateWarehouse.isPending}
      destroyOnHidden
      maskClosable={false}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="name"
          label="Nombre"
          rules={[
            { required: true, message: 'Ingresa el nombre' },
            { min: 2, message: 'Mínimo 2 caracteres' },
          ]}
        >
          <Input placeholder="Depósito principal / Pasillo 3 - B" />
        </Form.Item>
        {isEdit && (
          <Form.Item name="isActive" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

export function WarehousesPage() {
  const { message, modal } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission(PERMISSIONS.USERS_MANAGE);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);

  const warehouses = useWarehouses();
  const updateWarehouse = useUpdateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();

  const toggle = async (w: Warehouse) => {
    try {
      await updateWarehouse.mutateAsync({
        id: w.id,
        input: { name: w.name, isActive: !w.isActive },
      });
      message.success(w.isActive ? 'Almacén desactivado' : 'Almacén activado');
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo cambiar el estado'));
    }
  };

  const confirmDelete = (w: Warehouse) => {
    modal.confirm({
      title: `¿Eliminar el almacén "${w.name}"?`,
      content: 'No se podrá eliminar si tiene productos asignados (desactívalo en su lugar).',
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteWarehouse.mutateAsync(w.id);
          message.success('Almacén eliminado');
        } catch (err) {
          message.error(getApiErrorMessage(err, 'No se pudo eliminar'));
        }
      },
    });
  };

  const columns: ColumnsType<Warehouse> = [
    { title: 'Nombre', dataIndex: 'name', render: (n: string) => <Text strong>{n}</Text> },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      width: 120,
      render: (a: boolean) => (a ? <Tag color="success">Activo</Tag> : <Tag>Inactivo</Tag>),
    },
    {
      title: '',
      key: 'actions',
      width: 130,
      align: 'right',
      render: (_, w) =>
        canManage ? (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(w);
                setModalOpen(true);
              }}
              title="Editar"
            />
            <Button
              type="text"
              icon={
                w.isActive ? (
                  <StopOutlined style={{ color: '#fa8c16' }} />
                ) : (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                )
              }
              onClick={() => toggle(w)}
              title={w.isActive ? 'Desactivar' : 'Activar'}
            />
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => confirmDelete(w)} />
          </Space>
        ) : null,
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
            <strong>Almacenes</strong>
          </Title>
          <Text type="secondary">Lugares donde se guarda el repuesto.</Text>
        </div>
        {canManage && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Nuevo almacén
          </Button>
        )}
      </div>

      <Card>
        <Table<Warehouse>
          rowKey="id"
          columns={columns}
          dataSource={warehouses.data ?? []}
          loading={warehouses.isLoading}
          pagination={false}
        />
      </Card>

      <WarehouseFormModal open={modalOpen} warehouse={editing} onClose={() => setModalOpen(false)} />
    </div>
  );
}
