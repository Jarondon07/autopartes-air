import {
  DownOutlined,
  LogoutOutlined,
  MenuOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Divider, Dropdown, Layout, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { useLogout } from '../../hooks/useAuth';
import { COLORS } from '../../theme/tokens';

const { Header } = Layout;
const { Text } = Typography;

/** Iniciales a partir del nombre completo (máx. 2). */
function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + second).toUpperCase();
}

export function Topbar() {
  const navigate = useNavigate();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
  };

  const panel = (
    <div
      style={{
        width: 240,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
        padding: 8,
      }}
    >
      {/* Cabecera con info del usuario (legible, no atenuada) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px' }}>
        <Avatar style={{ background: COLORS.primary, fontWeight: 600 }}>
          {initials(user?.fullName)}
        </Avatar>
        <div style={{ lineHeight: 1.3, overflow: 'hidden' }}>
          <Text strong style={{ display: 'block' }} ellipsis>
            {user?.fullName ?? 'Usuario'}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            @{user?.username}
          </Text>
        </div>
      </div>

      <Divider style={{ margin: '6px 0' }} />

      <div
        style={itemStyle}
        onClick={() => navigate('/perfil')}
        onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bodyBg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <SettingOutlined />
        Ajustar mi perfil
      </div>

      <div
        style={{ ...itemStyle, color: COLORS.danger }}
        onClick={() => logout.mutate()}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#fff1f0')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <LogoutOutlined />
        Cerrar sesión
      </div>
    </div>
  );

  return (
    <Header
      style={{
        background: COLORS.navbarBg,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 0 2rem 0 rgba(33, 37, 41, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Button
        type="text"
        icon={<MenuOutlined />}
        onClick={toggleSidebar}
        aria-label="Alternar menú"
      />

      <Dropdown
        popupRender={() => panel}
        trigger={['click']}
        placement="bottomRight"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            height: 44,
            padding: '0 8px 0 10px',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bodyBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              justifyContent: 'center',
              lineHeight: 1.25,
            }}
          >
            <Text strong style={{ fontSize: 14 }}>
              {user?.fullName ?? 'Usuario'}
            </Text>
            <Text
              type="secondary"
              style={{ fontSize: 12, textTransform: 'capitalize' }}
            >
              {user?.roleName ?? ''}
            </Text>
          </span>
          <Avatar size={38} style={{ background: COLORS.primary, fontWeight: 600 }}>
            {initials(user?.fullName)}
          </Avatar>
          <DownOutlined style={{ fontSize: 10, color: '#adb5bd' }} />
        </div>
      </Dropdown>
    </Header>
  );
}
