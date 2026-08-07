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
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Tax } from '@autopartes-air/shared';
import { PERMISSIONS } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import {
  useCreateTax,
  useDeleteTax,
  useTaxes,
  useUpdateTax,
} from '../../hooks/useTaxes';
import { useAuthStore } from '../../stores/auth.store';

const { Title, Text } = Typography;

function TaxFormModal({
  open,
  tax,
  onClose,
}: {
  open: boolean;
  tax: Tax | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm<{ name: string; rate: number; isActive?: boolean }>();
  const { message } = App.useApp();
  const isEdit = tax != null;
  const createTax = useCreateTax();
  const updateTax = useUpdateTax();

  useEffect(() => {
    if (!open) return;
    if (isEdit && tax) {
      form.setFieldsValue({ name: tax.name, rate: Number(tax.rate), isActive: tax.isActive });
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true });
    }
  }, [open, isEdit, tax, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const input = { name: values.name.trim(), rate: values.rate, isActive: values.isActive };
    try {
      if (isEdit && tax) {
        await updateTax.mutateAsync({ id: tax.id, input });
        message.success('Impuesto actualizado');
      } else {
        await createTax.mutateAsync(input);
        message.success('Impuesto creado');
      }
      onClose();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo guardar el impuesto'));
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Editar impuesto' : 'Nuevo impuesto'}
      onCancel={onClose}
      onOk={handleOk}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={createTax.isPending || updateTax.isPending}
      destroyOnClose
      maskClosable={false}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="name"
          label="Nombre"
          rules={[{ required: true, message: 'Ingresa el nombre' }]}
        >
          <Input placeholder="IVA" />
        </Form.Item>
        <Form.Item
          name="rate"
          label="Porcentaje (%)"
          rules={[{ required: true, message: 'Ingresa el porcentaje' }]}
        >
          <InputNumber min={0} max={100} step={0.5} precision={2} style={{ width: '100%' }} suffix="%" />
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

export function TaxesPage() {
  const { message, modal } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission(PERMISSIONS.USERS_MANAGE);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tax | null>(null);

  const taxes = useTaxes();
  const updateTax = useUpdateTax();
  const deleteTax = useDeleteTax();

  const total = (taxes.data ?? [])
    .filter((t) => t.isActive)
    .reduce((s, t) => s + Number(t.rate), 0);

  const toggle = async (tax: Tax) => {
    try {
      await updateTax.mutateAsync({
        id: tax.id,
        input: { name: tax.name, rate: Number(tax.rate), isActive: !tax.isActive },
      });
      message.success(tax.isActive ? 'Impuesto desactivado' : 'Impuesto activado');
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo cambiar el estado'));
    }
  };

  const confirmDelete = (tax: Tax) => {
    modal.confirm({
      title: `¿Eliminar el impuesto "${tax.name}"?`,
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteTax.mutateAsync(tax.id);
          message.success('Impuesto eliminado');
        } catch (err) {
          message.error(getApiErrorMessage(err, 'No se pudo eliminar'));
        }
      },
    });
  };

  const columns: ColumnsType<Tax> = [
    { title: 'Nombre', dataIndex: 'name', render: (n: string) => <Text strong>{n}</Text> },
    {
      title: 'Porcentaje',
      dataIndex: 'rate',
      width: 140,
      render: (r: string) => `${Number(r)}%`,
    },
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
      render: (_, tax) =>
        canManage ? (
          <Space size="small">
            <Button type="text" icon={<EditOutlined />} onClick={() => { setEditing(tax); setModalOpen(true); }} title="Editar" />
            <Button
              type="text"
              icon={tax.isActive ? <StopOutlined style={{ color: '#fa8c16' }} /> : <CheckCircleOutlined style={{ color: '#52c41a' }} />}
              onClick={() => toggle(tax)}
              title={tax.isActive ? 'Desactivar' : 'Activar'}
            />
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => confirmDelete(tax)} />
          </Space>
        ) : null,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <strong>Impuestos</strong>
          </Title>
          <Text type="secondary">
            Impuestos aplicados a las ventas. Total activo actual: <strong>{total}%</strong>
          </Text>
        </div>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true); }}>
            Nuevo impuesto
          </Button>
        )}
      </div>

      <Card>
        <Table<Tax>
          rowKey="id"
          columns={columns}
          dataSource={taxes.data ?? []}
          loading={taxes.isLoading}
          pagination={false}
        />
      </Card>

      <TaxFormModal open={modalOpen} tax={editing} onClose={() => setModalOpen(false)} />
    </div>
  );
}
