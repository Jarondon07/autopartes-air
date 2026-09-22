import { useEffect } from 'react';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Form, Input, Typography } from 'antd';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import type { LoginInput } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../api/client';
import { useLogin } from '../hooks/useAuth';
import { useAuthStore } from '../stores/auth.store';
import { COLORS } from '../theme/tokens';

const { Title, Text } = Typography;

/**
 * Credenciales recordadas en el equipo (decisión explícita del dueño del
 * sistema). Se guardan en `localStorage`, que es texto plano: quien tenga
 * acceso al navegador puede leerlas. Por eso solo se guardan si el usuario
 * marca la casilla, y desmarcarla las borra.
 */
const REMEMBERED_USER = 'autopartes:remembered-user';
const REMEMBERED_PASS = 'autopartes:remembered-pass';

/** Login estilo AdminKit: card blanca centrada sobre fondo claro. */
export function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useLogin();
  const rememberedUser = localStorage.getItem(REMEMBERED_USER);
  const rememberedPass = localStorage.getItem(REMEMBERED_PASS);

  useEffect(() => {
    if (login.isSuccess) navigate('/', { replace: true });
  }, [login.isSuccess, navigate]);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const onFinish = (values: LoginInput & { remember?: boolean }) => {
    const remember = values.remember ?? false;
    // Se guardan en el navegador, no en el servidor: son una comodidad de este
    // equipo. Al desmarcar la casilla se borran, que es la única forma que
    // tiene el usuario de sacarlas de ahí.
    if (remember) {
      localStorage.setItem(REMEMBERED_USER, values.username);
      localStorage.setItem(REMEMBERED_PASS, values.password);
    } else {
      localStorage.removeItem(REMEMBERED_USER);
      localStorage.removeItem(REMEMBERED_PASS);
    }
    login.mutate({ username: values.username, password: values.password, remember });
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
            // Con credenciales recordadas, el formulario llega listo para entrar.
            initialValues={{
              username: rememberedUser ?? undefined,
              password: rememberedPass ?? undefined,
              remember: rememberedUser != null,
            }}
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
                autoFocus={rememberedUser == null}
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
              <Checkbox>Recordarme en este equipo</Checkbox>
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
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <RouterLink to="/catalogo">
              <Text type="secondary">Ver el catálogo de repuestos</Text>
            </RouterLink>
          </div>
        </Card>
      </div>
    </div>
  );
}
