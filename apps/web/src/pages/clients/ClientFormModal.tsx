import { useEffect } from 'react';
import { App, Col, Form, Input, Modal, Row, Select } from 'antd';
import type { Client } from '@autopartes-air/shared';
import { DOCUMENT_TYPES } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { useCreateClient, useUpdateClient } from '../../hooks/useClients';

interface Props {
  open: boolean;
  client: Client | null;
  onClose: () => void;
}

const DOCUMENT_LABELS: Record<string, string> = {
  V: 'V — Cédula',
  J: 'J — RIF Jurídico',
  E: 'E — Extranjero',
  P: 'P — Pasaporte',
  G: 'G — Gobierno',
};

interface FormValues {
  documentType: (typeof DOCUMENT_TYPES)[number];
  documentNumber: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export function ClientFormModal({ open, client, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();
  const isEdit = client != null;

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  useEffect(() => {
    if (!open) return;
    if (isEdit && client) {
      form.setFieldsValue({
        documentType: client.documentType,
        documentNumber: client.documentNumber,
        name: client.name,
        phone: client.phone ?? undefined,
        email: client.email ?? undefined,
        address: client.address ?? undefined,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ documentType: 'V' });
    }
  }, [open, isEdit, client, form]);

  const submitting = createClient.isPending || updateClient.isPending;

  const handleOk = async () => {
    const values = await form.validateFields();
    const input = {
      documentType: values.documentType,
      documentNumber: values.documentNumber.trim(),
      name: values.name.trim(),
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim() || undefined,
      address: values.address?.trim() || undefined,
    };
    try {
      if (isEdit && client) {
        await updateClient.mutateAsync({ id: client.id, input });
        message.success('Cliente actualizado');
      } else {
        await createClient.mutateAsync(input);
        message.success('Cliente creado');
      }
      onClose();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo guardar el cliente'));
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Editar cliente' : 'Nuevo cliente'}
      onCancel={onClose}
      onOk={handleOk}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={submitting}
      width={600}
      destroyOnClose
      maskClosable={false}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="documentType" label="Tipo" rules={[{ required: true }]}>
              <Select
                options={DOCUMENT_TYPES.map((d) => ({
                  value: d,
                  label: DOCUMENT_LABELS[d] ?? d,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              name="documentNumber"
              label="Número de documento"
              rules={[
                { required: true, message: 'Ingresa el documento' },
                {
                  pattern: /^\d+(-\d)?$/,
                  message: 'Solo números (ej: 12345678)',
                },
              ]}
            >
              <Input placeholder="12345678" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="name"
          label="Nombre / Razón social"
          rules={[
            { required: true, message: 'Ingresa el nombre' },
            { min: 2, message: 'Mínimo 2 caracteres' },
          ]}
        >
          <Input placeholder="Juan Pérez" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="phone" label="Teléfono">
              <Input placeholder="0414-1234567" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Correo"
              rules={[{ type: 'email', message: 'Correo inválido' }]}
            >
              <Input placeholder="cliente@correo.com" />
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
