import { useEffect } from 'react';
import { App, Col, Form, Input, Modal, Row } from 'antd';
import type { Supplier } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { useCreateSupplier, useUpdateSupplier } from '../../hooks/useSuppliers';

interface Props {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
}

interface FormValues {
  rif: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export function SupplierFormModal({ open, supplier, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();
  const isEdit = supplier != null;

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  useEffect(() => {
    if (!open) return;
    if (isEdit && supplier) {
      form.setFieldsValue({
        rif: supplier.rif,
        name: supplier.name,
        contactName: supplier.contactName ?? undefined,
        phone: supplier.phone ?? undefined,
        email: supplier.email ?? undefined,
        address: supplier.address ?? undefined,
      });
    } else {
      form.resetFields();
    }
  }, [open, isEdit, supplier, form]);

  const submitting = createSupplier.isPending || updateSupplier.isPending;

  const handleOk = async () => {
    const values = await form.validateFields();
    const input = {
      rif: values.rif.trim().toUpperCase(),
      name: values.name.trim(),
      contactName: values.contactName?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim() || undefined,
      address: values.address?.trim() || undefined,
    };
    try {
      if (isEdit && supplier) {
        await updateSupplier.mutateAsync({ id: supplier.id, input });
        message.success('Proveedor actualizado');
      } else {
        await createSupplier.mutateAsync(input);
        message.success('Proveedor creado');
      }
      onClose();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo guardar el proveedor'));
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}
      onCancel={onClose}
      onOk={handleOk}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={submitting}
      width={600}
      destroyOnHidden
      maskClosable={false}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Row gutter={16}>
          <Col span={10}>
            <Form.Item
              name="rif"
              label="RIF"
              rules={[
                { required: true, message: 'Ingresa el RIF' },
                {
                  pattern: /^[VJEGP]-?\d{8,9}(-?\d)?$/i,
                  message: 'RIF inválido (ej: J-12345678-9)',
                },
              ]}
            >
              <Input placeholder="J-12345678-9" />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item
              name="name"
              label="Nombre / Razón social"
              rules={[
                { required: true, message: 'Ingresa el nombre' },
                { min: 2, message: 'Mínimo 2 caracteres' },
              ]}
            >
              <Input placeholder="Repuestos XYZ, C.A." />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="contactName" label="Persona de contacto">
          <Input placeholder="Opcional" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="phone" label="Teléfono">
              <Input placeholder="0212-1234567" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Correo"
              rules={[{ type: 'email', message: 'Correo inválido' }]}
            >
              <Input placeholder="proveedor@correo.com" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="address" label="Dirección">
          <Input.TextArea rows={2} maxLength={300} placeholder="Opcional" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
