import { useEffect } from 'react';
import { LockOutlined } from '@ant-design/icons';
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
import { useChangePassword, useUpdateProfile } from '../hooks/useAuth';
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

  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

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
        </Col>
      </Row>
    </div>
  );
}
