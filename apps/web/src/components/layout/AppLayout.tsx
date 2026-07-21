import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { COLORS } from '../../theme/tokens';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const { Content, Footer } = Layout;

/** Shell principal: sidebar + topbar + contenido + footer (estética AdminKit). */
export function AppLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout style={{ background: COLORS.bodyBg }}>
        <Topbar />
        <Content style={{ padding: '24px 32px' }}>
          <Outlet />
        </Content>
        <Footer
          style={{
            background: '#fff',
            color: '#6c757d',
            textAlign: 'left',
            fontSize: 13,
          }}
        >
          © {new Date().getFullYear()} AutoparteAIR — Sistema de gestión de repuestos
        </Footer>
      </Layout>
    </Layout>
  );
}
