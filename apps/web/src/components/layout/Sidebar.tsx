import { useEffect, useMemo, useState } from 'react';
import { Layout, Menu, type MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { COLORS, LAYOUT } from '../../theme/tokens';
import {
  NAV_TREE,
  NAV_LEAVES,
  canSee,
  isParent,
  type NavLeaf,
} from './nav.config';

const { Sider } = Layout;

/** Ruta activa → key de la hoja que mejor coincide (la más específica gana). */
function matchLeafKey(pathname: string): string | undefined {
  const sorted = [...NAV_LEAVES].sort((a, b) => b.path.length - a.path.length);
  const match = sorted.find((leaf) =>
    leaf.path === '/' ? pathname === '/' : pathname.startsWith(leaf.path),
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

  // Árbol de items del Menu filtrado por permisos.
  const { menuItems, keyToPath, keyToParent } = useMemo(() => {
    const keyToPath = new Map<string, string>();
    const keyToParent = new Map<string, string>();
    const menuItems: MenuProps['items'] = [];

    const leafItem = (leaf: NavLeaf) => {
      keyToPath.set(leaf.key, leaf.path);
      return { key: leaf.key, icon: leaf.icon, label: leaf.label };
    };

    for (const node of NAV_TREE) {
      if (isParent(node)) {
        const visible = node.children.filter((c) => canSee(permissions, c.permission));
        if (visible.length === 0) continue;
        for (const c of visible) keyToParent.set(c.key, node.key);
        menuItems.push({
          key: node.key,
          icon: node.icon,
          label: node.label,
          children: visible.map(leafItem),
        });
      } else if (canSee(permissions, node.permission)) {
        menuItems.push(leafItem(node));
      }
    }

    return { menuItems, keyToPath, keyToParent };
  }, [permissions]);

  const selectedKey = matchLeafKey(location.pathname);

  // Mantiene abierto el submenú del item activo, respetando lo que abra el usuario.
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  useEffect(() => {
    const parent = selectedKey ? keyToParent.get(selectedKey) : undefined;
    if (parent) setOpenKeys((prev) => (prev.includes(parent) ? prev : [...prev, parent]));
  }, [selectedKey, keyToParent]);

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
      {/* Marca: logo + nombre del sistema */}
      <div
        style={{
          height: LAYOUT.headerHeight,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '0' : '0 20px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          color: '#fff',
          whiteSpace: 'nowrap',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span style={{ fontSize: 22, lineHeight: 1 }} role="img" aria-label="logo">
          🔧
        </span>
        {!collapsed && (
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '0.01em' }}>
              AutoparteAIR
            </span>
            <span style={{ fontSize: 11, color: COLORS.sidebarText }}>
              Gestión de repuestos
            </span>
          </span>
        )}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        items={menuItems}
        selectedKeys={selectedKey ? [selectedKey] : []}
        openKeys={collapsed ? undefined : openKeys}
        onOpenChange={setOpenKeys}
        onClick={onClick}
        style={{ background: COLORS.sidebarBg, borderInlineEnd: 'none', paddingTop: 8 }}
      />
    </Sider>
  );
}
