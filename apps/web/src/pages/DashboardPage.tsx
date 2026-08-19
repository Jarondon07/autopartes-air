import type { ReactNode } from 'react';
import {
  AppstoreOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Card, Col, Empty, List, Row, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { formatUsd } from '@autopartes-air/shared';
import { COLORS } from '../theme/tokens';
import type { SaleRow } from '../api/sales.api';
import { useLowStock, useProducts } from '../hooks/useProducts';
import { useSales, useSalesSummary } from '../hooks/useSales';
import { useCurrentRates } from '../hooks/useExchangeRates';
import { formatDate, formatShortDateTime } from '../lib/datetime';

const { Title, Text } = Typography;

function formatBs(n: number): string {
  return `Bs ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface StatCardProps {
  title: string;
  value: string | number;
  suffix?: ReactNode;
  icon: ReactNode;
  color?: string;
  bg?: string;
  loading?: boolean;
}

/** Stat card estilo AdminKit: icono en badge circular + número grande. */
function StatCard({ title, value, suffix, icon, color, bg, loading }: StatCardProps) {
  return (
    <Card loading={loading}>
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
              background: bg ?? COLORS.statIconBg,
              color: color ?? COLORS.primary,
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

export function DashboardPage() {
  const today = dayjs().format('YYYY-MM-DD');

  const todaySummary = useSalesSummary({ from: today, to: today, status: 'completada' });
  const recentSales = useSales({ limit: 6 });
  const products = useProducts({ isActive: true, limit: 1 });
  const lowStock = useLowStock();
  const rates = useCurrentRates();

  const bcv = Number(rates.data?.bcv?.rateBsPerUsd ?? 0);
  const usdt = Number(rates.data?.usdt?.rateBsPerUsd ?? 0);

  const ventasHoyUsd = todaySummary.data?.totalUsd ?? 0;
  const ventasHoyBs = todaySummary.data?.totalBs ?? 0;
  const ventasHoyCount = todaySummary.data?.count ?? 0;
  const totalProductos = products.data?.meta.total ?? 0;
  const lowStockList = lowStock.data ?? [];

  const salesColumns: ColumnsType<SaleRow> = [
    { title: '#', dataIndex: 'id', width: 60 },
    {
      title: 'Fecha',
      dataIndex: 'saleDate',
      width: 130,
      render: (d: string) => formatShortDateTime(d),
    },
    {
      title: 'Cliente',
      dataIndex: 'clientName',
      render: (n: string | null) => n || <Text type="secondary">Contado</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'totalUsd',
      width: 110,
      align: 'right',
      render: (v: string) => <Text strong>{formatUsd(Number(v))}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      width: 110,
      render: (s: SaleRow['status']) =>
        s === 'anulada' ? <Tag color="error">Anulada</Tag> : <Tag color="success">Completada</Tag>,
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        <strong>Dashboard</strong>
      </Title>
      <Text type="secondary">
        Resumen del día · {formatDate(new Date())}
        {bcv > 0 && ` · BCV ${bcv.toLocaleString('es-VE')}`}
        {usdt > 0 && ` · USDT ${usdt.toLocaleString('es-VE')}`}
      </Text>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Ventas del día"
            value={formatUsd(ventasHoyUsd)}
            suffix={
              usdt > 0 || bcv > 0 ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatBs(ventasHoyBs)}
                </Text>
              ) : undefined
            }
            icon={<DollarOutlined />}
            color={COLORS.success}
            bg="#d8f3e9"
            loading={todaySummary.isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Ventas realizadas hoy"
            value={ventasHoyCount}
            icon={<ShoppingCartOutlined />}
            loading={todaySummary.isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Productos activos"
            value={totalProductos}
            icon={<AppstoreOutlined />}
            loading={products.isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Stock bajo"
            value={lowStockList.length}
            icon={<WarningOutlined />}
            color={COLORS.warning}
            bg="#fdf1d6"
            loading={lowStock.isLoading}
          />
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 8 }}>
        <Col xs={24} xl={16}>
          <Card title="Últimas ventas" style={{ minHeight: 320 }}>
            <Table<SaleRow>
              scroll={{ x: 'max-content' }}
              rowKey="id"
              size="small"
              columns={salesColumns}
              dataSource={recentSales.data?.data ?? []}
              loading={recentSales.isLoading}
              pagination={false}
              locale={{ emptyText: 'Aún no hay ventas' }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title={`Alertas de stock (${lowStockList.length})`} style={{ minHeight: 320 }}>
            {lowStockList.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin alertas de stock" />
            ) : (
              <List
                size="small"
                dataSource={lowStockList.slice(0, 8)}
                renderItem={(p) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <span>
                          <Text strong>{p.code}</Text> — {p.name}
                        </span>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Stock: {p.stock.toLocaleString('es-VE')} / mín.{' '}
                          {p.minStock.toLocaleString('es-VE')}
                        </Text>
                      }
                    />
                    <Tag color={p.stock <= 0 ? 'error' : 'warning'}>
                      {p.stock <= 0 ? 'Agotado' : 'Bajo'}
                    </Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
