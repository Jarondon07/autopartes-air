import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useResponsive';
import { COLORS } from '../../theme/tokens';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const { Content, Footer } = Layout;

/** Shell principal: sidebar + topbar + contenido + footer (estética AdminKit). */
export function AppLayout() {
  const isMobile = useIsMobile();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ background: COLORS.bodyBg, display: 'flex', flexDirection: 'column' }}>
        <Topbar />
        {/* flex:1 empuja el footer al fondo cuando el contenido es corto */}
        <Content style={{ padding: isMobile ? '12px 12px 0' : '24px 32px', flex: 1 }}>
          <Outlet />
        </Content>
        {/* Footer flotante: pegado al fondo (sticky), centrado, con forma de píldora */}
        <Footer
          style={{
            background: 'transparent',
            padding: isMobile ? '8px 12px 12px' : '12px 24px 20px',
            textAlign: 'center',
            position: 'sticky',
            bottom: 0,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: isMobile ? 8 : 12,
              maxWidth: 'calc(100vw - 24px)',
              margin: '0 auto',
              padding: isMobile ? '6px 14px' : '8px 20px',
              background: '#fff',
              borderRadius: 999,
              boxShadow: '0 4px 16px rgba(33, 37, 41, 0.12)',
              border: '1px solid #eef0f3',
              color: '#6c757d',
              fontSize: isMobile ? 11 : 13,
              pointerEvents: 'auto',
            }}
          >
            <span>
              © {new Date().getFullYear()} <strong>AutoparteAIR</strong>
              {!isMobile && ' — Sistema de gestión de repuestos'}
            </span>
            <span style={{ color: '#adb5bd' }}>v0.1.0</span>
          </div>
        </Footer>
      </Layout>
    </Layout>
  );
}
