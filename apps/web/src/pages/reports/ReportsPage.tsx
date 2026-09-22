import { useMemo, useState } from 'react';
import { Alert, Card, Col, DatePicker, Progress, Row, Statistic, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { PAYMENT_METHOD_LABELS, PERMISSIONS, formatUsd } from '@autopartes-air/shared';
import type { PaymentMethod } from '@autopartes-air/shared';
import type {
  PaymentRow,
  ProfitProductRow,
  SalesDailyRow,
  SupplierSpendRow,
  TopProductRow,
} from '../../api/reports.api';
import {
  useInventorySummary,
  useProfitByProduct,
  usePurchasesSummary,
  useSalesByPayment,
  useSalesDaily,
  useSalesProfit,
  useTopProducts,
} from '../../hooks/useReports';
import { useAuthStore } from '../../stores/auth.store';
import { formatDate } from '../../lib/datetime';

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
  const canProfit = canAll || hasPermission(PERMISSIONS.REPORTS_PROFIT);

  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const from = range[0].format('YYYY-MM-DD');
  const to = range[1].format('YYYY-MM-DD');

  const daily = useSalesDaily({ from, to }, canSales);
  const topProducts = useTopProducts({ from, to, limit: 10 }, canSales);
  const byPayment = useSalesByPayment({ from, to }, canCash);
  const inventory = useInventorySummary(canInv);
  const invested = usePurchasesSummary({ from, to }, canProfit);
  const profit = useSalesProfit({ from, to }, canProfit);
  const profitProducts = useProfitByProduct({ from, to, limit: 10 }, canProfit);

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
    { title: 'Día', dataIndex: 'date', width: 120, render: (d: string) => formatDate(d) },
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

  const supplierColumns: ColumnsType<SupplierSpendRow> = [
    { title: 'Proveedor', dataIndex: 'supplierName' },
    { title: 'Compras', dataIndex: 'count', width: 90, align: 'right' },
    { title: 'Unid.', dataIndex: 'units', width: 90, align: 'right' },
    {
      title: 'Invertido (USD)',
      dataIndex: 'totalUsd',
      width: 140,
      align: 'right',
      render: (v: number) => <Text strong>{formatUsd(v)}</Text>,
    },
  ];

  const profitProductColumns: ColumnsType<ProfitProductRow> = [
    { title: 'Producto', key: 'p', render: (_, r) => `${r.code} — ${r.name}` },
    { title: 'Cant.', dataIndex: 'quantity', width: 80, align: 'right' },
    {
      title: 'Venta (USD)',
      dataIndex: 'revenueUsd',
      width: 120,
      align: 'right',
      render: (v: number) => formatUsd(v),
    },
    {
      title: 'Ganancia (USD)',
      dataIndex: 'profitUsd',
      width: 140,
      align: 'right',
      render: (v: number) => (
        <Text strong type={v < 0 ? 'danger' : 'success'}>
          {formatUsd(v)}
        </Text>
      ),
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
          <Text type="secondary">Ventas, ganancia, caja e inventario</Text>
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

      {canProfit && (
        <>
          <Row gutter={[24, 24]} style={{ marginBottom: 8 }}>
            <Col xs={24} sm={12} xl={6}>
              <Card loading={invested.isLoading}>
                <Statistic
                  title="Invertido en compras (USD)"
                  value={formatUsd(invested.data?.totalUsd ?? 0)}
                />
                <Text type="secondary">{invested.data?.count ?? 0} compra(s) en el rango</Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card loading={profit.isLoading}>
                <Statistic
                  title="Costo de lo vendido (USD)"
                  value={formatUsd(profit.data?.costUsd ?? 0)}
                />
                <Text type="secondary">
                  Venta sin IVA: {formatUsd(profit.data?.revenueUsd ?? 0)}
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card loading={profit.isLoading}>
                <Statistic
                  title="Ganancia bruta (USD)"
                  value={formatUsd(profit.data?.profitUsd ?? 0)}
                  valueStyle={{ color: (profit.data?.profitUsd ?? 0) < 0 ? '#cf1322' : '#3f8600' }}
                />
                <Text type="secondary">Sin descontar gastos del negocio</Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card loading={profit.isLoading}>
                <Statistic
                  title="Margen sobre la venta"
                  value={(profit.data?.marginPct ?? 0).toFixed(2).replace('.', ',')}
                  suffix="%"
                />
                <Text type="secondary">Cuánto queda de cada dólar facturado</Text>
              </Card>
            </Col>
          </Row>

          {(profit.data?.estimatedLines ?? 0) > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="Parte de la ganancia es estimada"
              description={`${profit.data?.estimatedLines} de ${profit.data?.lines} renglones del rango son de ventas anteriores al registro del costo, y se calcularon con el costo actual del producto. Si ese costo cambió desde entonces, la ganancia de esas líneas no es exacta.`}
            />
          )}
        </>
      )}

      <Row gutter={[24, 24]}>
        {canProfit && (
          <>
            <Col xs={24} xl={14}>
              <Card title="Inversión por proveedor">
                <Table<SupplierSpendRow>
                  scroll={{ x: 'max-content' }}
                  rowKey="supplierId"
                  size="small"
                  columns={supplierColumns}
                  dataSource={invested.data?.bySupplier ?? []}
                  loading={invested.isLoading}
                  pagination={false}
                  locale={{ emptyText: 'Sin compras en el rango' }}
                />
              </Card>
            </Col>
            <Col xs={24} xl={10}>
              <Card title="Productos más rentables">
                <Table<ProfitProductRow>
                  scroll={{ x: 'max-content', y: 320 }}
                  rowKey="productId"
                  size="small"
                  columns={profitProductColumns}
                  dataSource={profitProducts.data ?? []}
                  loading={profitProducts.isLoading}
                  pagination={false}
                  locale={{ emptyText: 'Sin datos' }}
                />
              </Card>
            </Col>
          </>
        )}

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
