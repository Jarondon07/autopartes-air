import { useEffect, useState } from 'react';
import { App, Alert, Form, Input, Modal, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { getApiErrorMessage } from '../../api/client';
import { requestPriceAuthorization } from '../../api/sales.api';

const { Text } = Typography;

interface Props {
  open: boolean;
  /** Nombre del producto cuyo precio se va a cambiar, para dar contexto. */
  productName?: string;
  onCancel: () => void;
  /** Recibe el token de 5 minutos y el nombre de quien autorizó. */
  onAuthorized: (token: string, authorizedBy: string) => void;
}

/**
 * Pide usuario + PIN de un supervisor para desbloquear el precio de un renglón.
 *
 * El supervisor no inicia sesión: la caja sigue siendo del cajero. Lo único que
 * sale de aquí es un token de corta vida que viaja con la venta, y el servidor
 * anota en el renglón quién lo avaló.
 */
export function PriceAuthModal({ open, productName, onCancel, onAuthorized }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ username: string; pin: string }>();
  const [loading, setLoading] = useState(false);

  // Un PIN tecleado a medias no debe quedar esperando en pantalla.
  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const submit = async () => {
    let values: { username: string; pin: string };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setLoading(true);
    try {
      const auth = await requestPriceAuthorization(values);
      message.success(`Precio autorizado por ${auth.authorizedBy}`);
      onAuthorized(auth.token, auth.authorizedBy);
    } catch (err) {
      message.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Autorización de precio"
      okText="Autorizar"
      cancelText="Cancelar"
      onOk={submit}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={
          productName
            ? `Se va a cambiar el precio de "${productName}"`
            : 'Se va a cambiar un precio de venta'
        }
        description="Un supervisor debe autorizarlo con su PIN. Queda registrado en la venta quién lo hizo."
      />
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item
          name="username"
          label="Usuario que autoriza"
          rules={[{ required: true, message: 'Indica el usuario' }]}
        >
          <Input prefix={<UserOutlined />} autoFocus autoComplete="off" placeholder="admin" />
        </Form.Item>
        <Form.Item
          name="pin"
          label="PIN"
          rules={[
            { required: true, message: 'Indica el PIN' },
            { pattern: /^\d{4,6}$/, message: 'El PIN son 4 a 6 dígitos' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            inputMode="numeric"
            maxLength={6}
            autoComplete="off"
            placeholder="••••"
          />
        </Form.Item>
      </Form>
      <Text type="secondary" style={{ fontSize: 12 }}>
        La autorización vale 5 minutos y no puede dejar el precio por debajo del costo.
      </Text>
    </Modal>
  );
}
