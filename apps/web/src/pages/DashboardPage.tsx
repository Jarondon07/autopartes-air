import type { ReactNode } from 'react';
import {
  AppstoreOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Statistic, Typography } from 'antd';
import { COLORS } from '../theme/tokens';

const { Title, Text } = Typography;

interface StatCardProps {
  title: string;
  value: string | number;
  suffix?: ReactNode;
  icon: ReactNode;
}

/** Stat card estilo AdminKit: icono en badge circular azul claro + número grande. */
function StatCard({ title, value, suffix, icon }: StatCardProps) {
  return (
    <Card>
      <Row justify="space-between" align="middle" wrap={false}>
        <Col>
          <Statistic title={title} value={value} suffix={suffix} />
        </Col>
        <Col>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: COLORS.statIconBg,
              color: COLORS.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            {icon}
          </div>
        </Col>
      </Row>
    </Card>
  );
}

/** Dashboard de ejemplo — datos placeholder (los reales llegan en Fase 2). */
export function DashboardPage() {
  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        <strong>Dashboard</strong>
      </Title>
      <Text type="secondary">Resumen general del día</Text>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Ventas del día"
            value="$ 0.00"
            icon={<ShoppingCartOutlined />}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="Productos" value={0} icon={<AppstoreOutlined />} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="Stock bajo" value={0} icon={<WarningOutlined />} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Tasa BCV"
            value="—"
            suffix="Bs/USD"
            icon={<DollarOutlined />}
          />
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 8 }}>
        <Col xs={24} xl={16}>
          <Card title="Movimiento reciente" style={{ minHeight: 320 }}>
            <div
              style={{
                height: 240,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#adb5bd',
              }}
            >
              Gráfico de ventas — se integra en Fase 2
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="Alertas de stock" style={{ minHeight: 320 }}>
            <div
              style={{
                height: 240,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#adb5bd',
              }}
            >
              Sin alertas por ahora
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
