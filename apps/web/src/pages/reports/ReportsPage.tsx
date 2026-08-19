import { useMemo, useState } from 'react';
import { Card, Col, DatePicker, Progress, Row, Statistic, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { PAYMENT_METHOD_LABELS, PERMISSIONS, formatUsd } from '@autopartes-air/shared';
import type { PaymentMethod } from '@autopartes-air/shared';
import type { PaymentRow, SalesDailyRow, TopProductRow } from '../../api/reports.api';
import {
  useInventorySummary,
  useSalesByPayment,
  useSalesDaily,
  useTopProducts,
} from '../../hooks/useReports';
import { useAuthStore } from '../../stores/auth.store';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

function formatBs(n: number): string {
  return `Bs ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ReportsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canAll = hasPermission(PERMISSIONS.REPORTS_ALL);
  const canSales = canAll || hasPermission(PERMISSIONS.REPORTS_SALES);
  const canCash = canAll || hasPermission(PERMISSIONS.REPORTS_CASH);
  const canInv = canAll || hasPermission(PERMISSIONS.REPORTS_INVENTORY);

  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const from = range[0].format('YYYY-MM-DD');
  const to = range[1].format('YYYY-MM-DD');

  const daily = useSalesDaily({ from, to }, canSales);
  const topProducts = useTopProducts({ from, to, limit: 10 }, canSales);
  const byPayment = useSalesByPayment({ from, to }, canCash);
  const inventory = useInventorySummary(canInv);

  const dailyRows = daily.data ?? [];
  const totals = useMemo(
    () => ({
      count: dailyRows.reduce((s, r) => s + r.count, 0),
      usd: dailyRows.reduce((s, r) => s + r.totalUsd, 0),
      bs: dailyRows.reduce((s, r) => s + r.totalBs, 0),
    }),
    [dailyRows],
  );
  const maxUsd = Math.max(1, ...dailyRows.map((r) => r.totalUsd));

  const dailyColumns: ColumnsType<SalesDailyRow> = [
    { title: 'Día', dataIndex: 'date', width: 120, render: (d: string) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Ventas', dataIndex: 'count', width: 80, align: 'right' },
    {
      title: 'Total USD',
      dataIndex: 'totalUsd',
      width: 200,
      render: (v: number) => (
        <div>
          <Text strong>{formatUsd(v)}</Text>
          <Progress percent={Math.round((v / maxUsd) * 100)} showInfo={false} size="small" />
        </div>
      ),
    },
    {
      title: 'Total Bs',
      dataIndex: 'totalBs',
      align: 'right',
      render: (v: number) => formatBs(v),
    },
  ];

  const topColumns: ColumnsType<TopProductRow> = [
    { title: 'Producto', key: 'p', render: (_, r) => `${r.code} — ${r.name}` },
    { title: 'Cant.', dataIndex: 'quantity', width: 90, align: 'right' },
    {
      title: 'Total USD',
      dataIndex: 'totalUsd',
      width: 120,
      align: 'right',
      render: (v: number) => <Text strong>{formatUsd(v)}</Text>,
    },
  ];

  const paymentColumns: ColumnsType<PaymentRow> = [
    {
      title: 'Método',
      dataIndex: 'method',
      render: (m: string) => PAYMENT_METHOD_LABELS[m as PaymentMethod] ?? m,
    },
    { title: 'Ventas', dataIndex: 'count', width: 80, align: 'right' },
    {
      title: 'USD',
      dataIndex: 'amountUsd',
      width: 120,
      align: 'right',
      render: (v: number) => formatUsd(v),
    },
    {
      title: 'Bs',
      dataIndex: 'amountBs',
      align: 'right',
      render: (v: number) => formatBs(v),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[12, 12]}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <strong>Reportes</strong>
          </Title>
          <Text type="secondary">Ventas, caja e inventario</Text>
        </Col>
        <Col>
          <RangePicker
            format="DD/MM/YYYY"
            allowClear={false}
            value={range}
            onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
            disabledDate={(d) => d.isAfter(dayjs(), 'day')}
            presets={[
              { label: 'Hoy', value: [dayjs(), dayjs()] },
              { label: 'Últimos 7 días', value: [dayjs().subtract(6, 'day'), dayjs()] },
              { label: 'Este mes', value: [dayjs().startOf('month'), dayjs()] },
              { label: 'Mes pasado', value: [
                dayjs().subtract(1, 'month').startOf('month'),
                dayjs().subtract(1, 'month').endOf('month'),
              ] },
            ]}
          />
        </Col>
      </Row>

      {canSales && (
        <Row gutter={[24, 24]} style={{ marginBottom: 8 }}>
          <Col xs={24} sm={8}>
            <Card loading={daily.isLoading}>
              <Statistic title="Total ventas (USD)" value={formatUsd(totals.usd)} />
              <Text type="secondary">{formatBs(totals.bs)}</Text>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card loading={daily.isLoading}>
              <Statistic title="N° de ventas" value={totals.count} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card loading={daily.isLoading}>
              <Statistic
                title="Ticket promedio (USD)"
                value={formatUsd(totals.count > 0 ? totals.usd / totals.count : 0)}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[24, 24]}>
        {canSales && (
          <>
            <Col xs={24} xl={14}>
              <Card title="Ventas por día">
                <Table<SalesDailyRow>
                  rowKey="date"
                  size="small"
                  columns={dailyColumns}
                  dataSource={dailyRows}
                  loading={daily.isLoading}
                  pagination={false}
                  scroll={{ y: 320 }}
                  locale={{ emptyText: 'Sin ventas en el rango' }}
                />
              </Card>
            </Col>
            <Col xs={24} xl={10}>
              <Card title="Top productos (por monto)">
                <Table<TopProductRow>
                  rowKey="productId"
                  size="small"
                  columns={topColumns}
                  dataSource={topProducts.data ?? []}
                  loading={topProducts.isLoading}
                  pagination={false}
                  scroll={{ y: 320 }}
                  locale={{ emptyText: 'Sin datos' }}
                />
              </Card>
            </Col>
          </>
        )}

        {canCash && (
          <Col xs={24} xl={14}>
            <Card title="Cuadre por método de pago">
              <Table<PaymentRow>
              scroll={{ x: 'max-content' }}
                rowKey="method"
                size="small"
                columns={paymentColumns}
                dataSource={byPayment.data ?? []}
                loading={byPayment.isLoading}
                pagination={false}
                locale={{ emptyText: 'Sin pagos en el rango' }}
              />
            </Card>
          </Col>
        )}

        {canInv && (
          <Col xs={24} xl={10}>
            <Card title="Inventario (actual)" loading={inventory.isLoading}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic title="Productos activos" value={inventory.data?.activeProducts ?? 0} />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Unidades en stock"
                    value={(inventory.data?.totalUnits ?? 0).toLocaleString('es-VE')}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Valor a costo (USD)"
                    value={formatUsd(inventory.data?.costUsd ?? 0)}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Valor a venta (USD)"
                    value={formatUsd(inventory.data?.priceUsd ?? 0)}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}
