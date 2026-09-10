import { App, Alert, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, LogoutOutlined } from '@ant-design/icons';
import { getApiErrorMessage } from '../api/client';
import { useChangePassword, useLogout } from '../hooks/useAuth';
import { useAuthStore } from '../stores/auth.store';
import { COLORS } from '../theme/tokens';

const { Title, Text } = Typography;

interface FormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Cambio obligatorio de contraseña.
 *
 * Se muestra cuando el usuario tiene `mustChangePassword` (contraseña asignada
 * por un administrador). No hay forma de salir salvo cambiarla o cerrar sesión:
 * el servidor responde 403 a cualquier otra ruta mientras el flag siga activo.
 */
export function ForcePasswordChangePage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const user = useAuthStore((s) => s.user);
  const changePassword = useChangePassword();
  const logout = useLogout();

  const onFinish = async (values: FormValues) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('Contraseña actualizada. ¡Bienvenido!');
      // El hook guarda la sesión nueva; el guard deja pasar al sistema solo.
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo cambiar la contraseña'));
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.bodyBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            🔧 AutoparteAIR
          </Title>
          <Text type="secondary">
            Hola{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
          </Text>
        </div>

        <Card>
          <Title level={4} style={{ marginTop: 0 }}>
            Cambia tu contraseña
          </Title>

          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Contraseña provisional"
            description="La contraseña con la que entraste la asignó un administrador. Para usar el sistema debes definir una propia."
          />

          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="currentPassword"
              label="Contraseña actual"
              rules={[{ required: true, message: 'Ingresa la contraseña con la que entraste' }]}
            >
              <Input.Password prefix={<LockOutlined />} autoFocus autoComplete="current-password" />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="Contraseña nueva"
              rules={[
                { required: true, message: 'Ingresa la contraseña nueva' },
                { min: 6, message: 'Mínimo 6 caracteres' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Repite la contraseña nueva"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Repite la contraseña nueva' },
                ({ getFieldValue }) => ({
                  validator: (_, value) =>
                    !value || getFieldValue('newPassword') === value
                      ? Promise.resolve()
                      : Promise.reject(new Error('Las contraseñas no coinciden')),
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={changePassword.isPending}
            >
              Guardar y entrar
            </Button>
          </Form>

          <Button
            type="link"
            block
            icon={<LogoutOutlined />}
            style={{ marginTop: 12 }}
            onClick={() => logout.mutate()}
          >
            Cerrar sesión
          </Button>
        </Card>
      </div>
    </div>
  );
}
