import { useMemo } from 'react';
import { Layout, Menu, type MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { COLORS, LAYOUT } from '../../theme/tokens';
import { NAV_SECTIONS, type NavItem } from './nav.config';

const { Sider } = Layout;

/** Selecciona el item de nav que corresponde a la ruta actual. */
function matchNavKey(pathname: string, items: NavItem[]): string | undefined {
  // Coincidencia más específica primero (rutas más largas ganan).
  const sorted = [...items].sort((a, b) => b.path.length - a.path.length);
  const match = sorted.find((it) =>
    it.path === '/' ? pathname === '/' : pathname.startsWith(it.path),
  );
  return match?.key;
}

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const user = useAuthStore((s) => s.user);

  const permissions = user?.permissions ?? [];

  // Construye los items del Menu filtrando por permisos, agrupados por sección.
  const { menuItems, keyToPath, allItems } = useMemo(() => {
    const keyToPath = new Map<string, string>();
    const allItems: NavItem[] = [];
    const menuItems: MenuProps['items'] = [];

    for (const section of NAV_SECTIONS) {
      const visible = section.items.filter(
        (it) => !it.permission || permissions.includes(it.permission),
      );
      if (visible.length === 0) continue;

      for (const it of visible) {
        keyToPath.set(it.key, it.path);
        allItems.push(it);
      }

      menuItems.push({
        key: section.key,
        label: section.title,
        type: 'group',
        children: visible.map((it) => ({
          key: it.key,
          icon: it.icon,
          label: it.label,
        })),
      });
    }

    return { menuItems, keyToPath, allItems };
  }, [permissions]);

  const selectedKey = matchNavKey(location.pathname, allItems);

  const onClick: MenuProps['onClick'] = ({ key }) => {
    const path = keyToPath.get(key);
    if (path) navigate(path);
  };

  return (
    <Sider
      className="app-sidebar"
      width={LAYOUT.sidebarWidth}
      collapsedWidth={LAYOUT.sidebarCollapsedWidth}
      collapsible
      collapsed={collapsed}
      onCollapse={setSidebarCollapsed}
      trigger={null}
      breakpoint="lg"
      theme="dark"
      style={{
        background: COLORS.sidebarBg,
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'auto',
      }}
    >
      {/* Marca */}
      <div
        style={{
          height: LAYOUT.headerHeight,
          display: 'flex',
          alignItems: 'center',
          padding: collapsed ? '0' : '0 24px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          color: '#fff',
          fontWeight: 600,
          fontSize: 18,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        {collapsed ? '🔧' : '🔧 AutoparteAIR'}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        items={menuItems}
        selectedKeys={selectedKey ? [selectedKey] : []}
        onClick={onClick}
        style={{ background: COLORS.sidebarBg, borderInlineEnd: 'none' }}
      />
    </Sider>
  );
}
