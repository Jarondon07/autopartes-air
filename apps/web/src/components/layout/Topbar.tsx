import { LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, Layout, Space, Typography, type MenuProps } from 'antd';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { useLogout } from '../../hooks/useAuth';

const { Header } = Layout;
const { Text } = Typography;

export function Topbar() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const menu: MenuProps = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: user?.fullName ?? 'Usuario',
        disabled: true,
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Cerrar sesión',
        danger: true,
        onClick: () => logout.mutate(),
      },
    ],
  };

  return (
    <Header
      style={{
        background: '#fff',
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

      <Dropdown menu={menu} trigger={['click']} placement="bottomRight">
        <Space style={{ cursor: 'pointer' }}>
          <Avatar size="small" icon={<UserOutlined />} style={{ background: '#3B7DDD' }} />
          <span style={{ lineHeight: 1.2, textAlign: 'right' }}>
            <Text strong style={{ display: 'block' }}>
              {user?.fullName ?? 'Usuario'}
            </Text>
            <Text type="secondary" style={{ fontSize: 12, textTransform: 'capitalize' }}>
              {user?.roleName ?? ''}
            </Text>
          </span>
        </Space>
      </Dropdown>
    </Header>
  );
}
