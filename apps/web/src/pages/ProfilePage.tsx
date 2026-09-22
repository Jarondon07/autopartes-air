import { useEffect } from 'react';
import { LockOutlined, NumberOutlined } from '@ant-design/icons';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Tag,
  Typography,
} from 'antd';
import { getApiErrorMessage } from '../api/client';
import { useChangePassword, useSetSecurityPin, useUpdateProfile } from '../hooks/useAuth';
import { useAuthStore } from '../stores/auth.store';
import { COLORS } from '../theme/tokens';

const { Title, Text } = Typography;

function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

export function ProfilePage() {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [pinForm] = Form.useForm();

  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const setPin = useSetSecurityPin();

  useEffect(() => {
    profileForm.setFieldsValue({ fullName: user?.fullName });
  }, [user?.fullName, profileForm]);

  const onSaveProfile = async (values: { fullName: string }) => {
    try {
      await updateProfile.mutateAsync({ fullName: values.fullName.trim() });
      message.success('Perfil actualizado');
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo actualizar el perfil'));
    }
  };

  const onSetPin = async (values: { currentPassword: string; pin: string }) => {
    try {
      await setPin.mutateAsync({ currentPassword: values.currentPassword, pin: values.pin });
      message.success('PIN de autorización guardado');
      pinForm.resetFields();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo guardar el PIN'));
    }
  };

  const onChangePassword = async (values: {
    currentPassword: string;
    newPassword: string;
  }) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('Contraseña actualizada');
      passwordForm.resetFields();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo cambiar la contraseña'));
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <Title level={3} style={{ marginTop: 0 }}>
        <strong>Mi perfil</strong>
      </Title>
      <Text type="secondary">Administra tu información y tu contraseña</Text>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} md={10}>
          <Card>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <Avatar
                size={72}
                style={{ background: COLORS.primary, fontSize: 28, fontWeight: 600 }}
              >
                {initials(user?.fullName)}
              </Avatar>
              <Title level={4} style={{ marginTop: 12, marginBottom: 0 }}>
                {user?.fullName}
              </Title>
              <Text type="secondary">@{user?.username}</Text>
              <div style={{ marginTop: 8 }}>
                <Tag color="blue" style={{ textTransform: 'capitalize' }}>
                  {user?.roleName}
                </Tag>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={14}>
          <Card title="Información de la cuenta" style={{ marginBottom: 24 }}>
            <Form form={profileForm} layout="vertical" onFinish={onSaveProfile}>
              <Form.Item label="Usuario">
                <Input value={user?.username} disabled />
              </Form.Item>
              <Form.Item
                name="fullName"
                label="Nombre completo"
                rules={[
                  { required: true, message: 'Ingresa tu nombre' },
                  { min: 3, message: 'Mínimo 3 caracteres' },
                ]}
              >
                <Input placeholder="Nombre y apellido" />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateProfile.isPending}
              >
                Guardar cambios
              </Button>
            </Form>
          </Card>

          <Card title="Cambiar contraseña">
            <Form form={passwordForm} layout="vertical" onFinish={onChangePassword}>
              <Form.Item
                name="currentPassword"
                label="Contraseña actual"
                rules={[{ required: true, message: 'Ingresa tu contraseña actual' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
              </Form.Item>
              <Form.Item
                name="newPassword"
                label="Nueva contraseña"
                rules={[
                  { required: true, message: 'Ingresa la nueva contraseña' },
                  { min: 6, message: 'Mínimo 6 caracteres' },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="Confirmar nueva contraseña"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Confirma la nueva contraseña' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Las contraseñas no coinciden'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={changePassword.isPending}
              >
                Cambiar contraseña
              </Button>
            </Form>
          </Card>
          <Card
            title="PIN de autorización"
            style={{ marginTop: 24 }}
            extra={
              user?.hasSecurityPin ? (
                <Tag color="success">Configurado</Tag>
              ) : (
                <Tag>Sin configurar</Tag>
              )
            }
          >
            <Text type="secondary">
              Sirve para autorizar acciones en el mostrador sin teclear tu contraseña
              delante del cliente (por ejemplo, cambiar el precio de un artículo en el
              cajero). Solo funciona si tu rol tiene ese permiso.
            </Text>
            <Form
              form={pinForm}
              layout="vertical"
              onFinish={onSetPin}
              style={{ marginTop: 16 }}
            >
              <Form.Item
                name="currentPassword"
                label="Tu contraseña"
                rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
              </Form.Item>
              <Form.Item
                name="pin"
                label={user?.hasSecurityPin ? 'Nuevo PIN' : 'PIN'}
                rules={[
                  { required: true, message: 'Ingresa el PIN' },
                  { pattern: /^\d{4,6}$/, message: 'El PIN son 4 a 6 dígitos' },
                ]}
              >
                <Input.Password
                  prefix={<NumberOutlined />}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="4 a 6 dígitos"
                />
              </Form.Item>
              <Form.Item
                name="confirmPin"
                label="Confirmar PIN"
                dependencies={['pin']}
                rules={[
                  { required: true, message: 'Confirma el PIN' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('pin') === value) return Promise.resolve();
                      return Promise.reject(new Error('Los PIN no coinciden'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<NumberOutlined />}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="4 a 6 dígitos"
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={setPin.isPending}>
                {user?.hasSecurityPin ? 'Cambiar PIN' : 'Guardar PIN'}
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
