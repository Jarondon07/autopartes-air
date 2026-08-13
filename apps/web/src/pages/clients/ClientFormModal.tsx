import { useEffect } from 'react';
import { App, Col, Form, Input, Modal, Row, Select, Space } from 'antd';
import type { Client } from '@autopartes-air/shared';
import { DOCUMENT_TYPES } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { useCreateClient, useUpdateClient } from '../../hooks/useClients';

const AREA_CODES = ['0414', '0424', '0416', '0426', '0412', '0422'];

interface Props {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  /** Valores iniciales al crear (ej. tipo + documento ya escritos en el cajero). */
  initial?: { documentType?: (typeof DOCUMENT_TYPES)[number]; documentNumber?: string };
  /** Se llama con el cliente recién creado (para seleccionarlo en el cajero). */
  onCreated?: (client: Client) => void;
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
  areaCode?: string;
  phoneDigits?: string;
  email?: string;
  address?: string;
}

export function ClientFormModal({ open, client, onClose, initial, onCreated }: Props) {
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();
  const isEdit = client != null;

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  useEffect(() => {
    if (!open) return;
    if (isEdit && client) {
      const m = (client.phone ?? '').match(/^(\d{4})-?(\d{0,7})$/);
      form.setFieldsValue({
        documentType: client.documentType,
        documentNumber: client.documentNumber,
        name: client.name,
        areaCode: m?.[1] ?? '0414',
        phoneDigits: m?.[2] ?? '',
        email: client.email ?? undefined,
        address: client.address ?? undefined,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        documentType: initial?.documentType ?? 'V',
        documentNumber: initial?.documentNumber ?? '',
        areaCode: '0414',
      });
    }
  }, [open, isEdit, client, form, initial]);

  const submitting = createClient.isPending || updateClient.isPending;

  const handleOk = async () => {
    const values = await form.validateFields();
    const digits = values.phoneDigits?.trim();
    const input = {
      documentType: values.documentType,
      documentNumber: values.documentNumber.trim(),
      name: values.name.trim(),
      phone: digits ? `${values.areaCode ?? '0414'}-${digits}` : undefined,
      email: values.email?.trim() || undefined,
      address: values.address?.trim() || undefined,
    };
    try {
      if (isEdit && client) {
        await updateClient.mutateAsync({ id: client.id, input });
        message.success('Cliente actualizado');
      } else {
        const created = await createClient.mutateAsync(input);
        message.success('Cliente creado');
        onCreated?.(created);
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
      destroyOnHidden
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
            <Form.Item label="Teléfono" required>
              <Space.Compact style={{ width: '100%' }}>
                <Form.Item name="areaCode" noStyle>
                  <Select
                    style={{ width: 100 }}
                    options={AREA_CODES.map((c) => ({ value: c, label: c }))}
                  />
                </Form.Item>
                <Form.Item
                  name="phoneDigits"
                  noStyle
                  normalize={(v?: string) => (v ? v.replace(/\D/g, '') : v)}
                  rules={[
                    { required: true, message: 'Ingresa el teléfono' },
                    { pattern: /^\d{7}$/, message: '7 dígitos' },
                  ]}
                >
                  <Input placeholder="1234567" maxLength={7} />
                </Form.Item>
              </Space.Compact>
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

        <Form.Item
          name="address"
          label="Dirección corta"
          rules={[{ required: true, message: 'Ingresa la dirección' }]}
        >
          <Input placeholder="Ej. Av. Principal, casa 5" maxLength={300} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
