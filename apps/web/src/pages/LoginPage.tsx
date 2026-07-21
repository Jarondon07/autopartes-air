import { useEffect } from 'react';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Form, Input, Typography } from 'antd';
import { Navigate, useNavigate } from 'react-router-dom';
import type { LoginInput } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../api/client';
import { useLogin } from '../hooks/useAuth';
import { useAuthStore } from '../stores/auth.store';
import { COLORS } from '../theme/tokens';

const { Title, Text } = Typography;

/** Login estilo AdminKit: card blanca centrada sobre fondo claro. */
export function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useLogin();

  useEffect(() => {
    if (login.isSuccess) navigate('/', { replace: true });
  }, [login.isSuccess, navigate]);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const onFinish = (values: LoginInput & { remember?: boolean }) => {
    login.mutate({ username: values.username, password: values.password });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.bodyBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            🔧 AutoparteAIR
          </Title>
          <Text type="secondary">Ingresa a tu cuenta para continuar</Text>
        </div>

        <Card>
          <Title level={4} style={{ marginTop: 0 }}>
            ¡Bienvenido de nuevo!
          </Title>
          <Text type="secondary">Inicia sesión con tus credenciales</Text>

          {login.isError && (
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 16 }}
              message={getApiErrorMessage(login.error, 'Credenciales inválidas')}
            />
          )}

          <Form
            layout="vertical"
            requiredMark={false}
            onFinish={onFinish}
            style={{ marginTop: 16 }}
            initialValues={{ remember: true }}
          >
            <Form.Item
              name="username"
              label="Usuario"
              rules={[
                { required: true, message: 'Ingresa tu usuario' },
                { min: 3, message: 'Mínimo 3 caracteres' },
              ]}
            >
              <Input
                size="large"
                prefix={<UserOutlined />}
                placeholder="admin"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Contraseña"
              rules={[
                { required: true, message: 'Ingresa tu contraseña' },
                { min: 6, message: 'Mínimo 6 caracteres' },
              ]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 12 }}>
              <Checkbox>Recordarme</Checkbox>
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={login.isPending}
            >
              Iniciar sesión
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
}
