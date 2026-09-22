import { useState } from 'react';
import { DollarOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Drawer,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DEBT_STATUSES,
  PAYMENT_METHOD_LABELS,
  PERMISSIONS,
  formatUsd,
  type DebtStatus,
  type PaymentMethod,
} from '@autopartes-air/shared';
import type { DebtRow } from '../../api/debts.api';
import { DataTable } from '../../components/DataTable';
import { formatDate, formatDateTime } from '../../lib/datetime';
import { useClients } from '../../hooks/useClients';
import { useDebt, useDebts, useDebtsSummary } from '../../hooks/useDebts';
import { useAuthStore } from '../../stores/auth.store';
import { DebtPaymentModal } from './DebtPaymentModal';

const { Title, Text } = Typography;

function formatBs(v: string | number): string {
  return `Bs ${Number(v).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_LABEL: Record<DebtStatus, string> = {
  pendiente: 'Pendiente',
  parcial: 'Abonada',
  vencida: 'Vencida',
  pagada: 'Pagada',
};

const STATUS_COLOR: Record<DebtStatus, string> = {
  pendiente: 'blue',
  parcial: 'gold',
  vencida: 'red',
  pagada: 'green',
};

function StatusTag({ status, daysOverdue }: { status: DebtStatus; daysOverdue: number }) {
  return (
    <Tag color={STATUS_COLOR[status]}>
      {STATUS_LABEL[status]}
      {status === 'vencida' && daysOverdue > 0 ? ` · ${daysOverdue} d` : ''}
    </Tag>
  );
}

/** Cuentas por cobrar: ventas a crédito, su saldo y los abonos recibidos. */
export function DebtsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canPay = hasPermission(PERMISSIONS.DEBTS_PAY);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [clientId, setClientId] = useState<number | undefined>();
  const [status, setStatus] = useState<DebtStatus | undefined>();
  const [overdue, setOverdue] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [paying, setPaying] = useState<DebtRow | null>(null);

  const debts = useDebts({ page, limit, clientId, status, overdue: overdue || undefined });
  const summary = useDebtsSummary();
  const detail = useDebt(detailId);
  const clients = useClients({ page: 1, limit: 100 });

  const resetPage = () => setPage(1);

  const columns: ColumnsType<DebtRow> = [
    { title: 'Venta', dataIndex: 'saleId', width: 80, render: (id: number) => `#${id}` },
    {
      title: 'Cliente',
      dataIndex: 'clientName',
      render: (n: string | null) => n || <Text type="secondary">—</Text>,
    },
    {
      title: 'Fecha venta',
      dataIndex: 'saleDate',
      width: 120,
      render: (d: string) => formatDate(d),
    },
    {
      title: 'Fecha de pago',
      dataIndex: 'dueDate',
      width: 130,
      render: (d: string | null) => (d ? formatDate(d) : '—'),
    },
    {
      title: 'Total',
      dataIndex: 'totalUsd',
      width: 100,
      align: 'right',
      render: (v: string) => formatUsd(Number(v)),
    },
    {
      title: 'Abonado',
      dataIndex: 'paidUsd',
      width: 110,
      align: 'right',
      render: (v: string) => formatUsd(Number(v)),
    },
    {
      title: 'Saldo',
      dataIndex: 'balanceUsd',
      width: 110,
      align: 'right',
      render: (v: string) => <Text strong>{formatUsd(Number(v))}</Text>,
    },
    {
      title: 'Estado',
      key: 'status',
      width: 140,
      render: (_, d) => <StatusTag status={d.status} daysOverdue={d.daysOverdue} />,
    },
    {
      title: '',
      key: 'actions',
      width: 160,
      align: 'right',
      render: (_, d) => (
        <Space size="small">
          <Button type="text" icon={<EyeOutlined />} onClick={() => setDetailId(d.saleId)} />
          {canPay && Number(d.balanceUsd) > 0.01 && (
            <Button type="primary" ghost size="small" onClick={() => setPaying(d)}>
              Abonar
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <strong>Deudas</strong>
          </Title>
          <Text type="secondary">Ventas a crédito y sus abonos</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => debts.refetch()}>
          Actualizar
        </Button>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card loading={summary.isLoading}>
            <Statistic
              title="Por cobrar"
              value={formatUsd(Number(summary.data?.totalBalanceUsd ?? 0))}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={summary.isLoading}>
            <Statistic
              title="Vencido"
              value={formatUsd(Number(summary.data?.overdueBalanceUsd ?? 0))}
              valueStyle={{
                color: Number(summary.data?.overdueBalanceUsd ?? 0) > 0 ? '#dc3545' : undefined,
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={summary.isLoading}>
            <Statistic
              title="Deudas abiertas"
              value={summary.data?.count ?? 0}
              suffix={summary.data?.overdueCount ? `(${summary.data.overdueCount} vencidas)` : ''}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="Filtrar por cliente"
              loading={clients.isLoading}
              value={clientId}
              onChange={(v) => {
                setClientId(v);
                resetPage();
              }}
              options={(clients.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              allowClear
              style={{ width: '100%' }}
              placeholder="Estado"
              value={status}
              onChange={(v) => {
                setStatus(v);
                resetPage();
              }}
              options={DEBT_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            />
          </Col>
          <Col xs={12} md={8}>
            <Checkbox
              checked={overdue}
              onChange={(e) => {
                setOverdue(e.target.checked);
                resetPage();
              }}
            >
              Solo vencidas
            </Checkbox>
          </Col>
        </Row>

        <DataTable<DebtRow>
          rowKey="saleId"
          columns={columns}
          dataSource={debts.data?.data ?? []}
          loading={debts.isLoading}
          locale={{ emptyText: 'No hay deudas registradas' }}
          mobileCard={(d) => ({
            title: d.clientName || 'Sin cliente',
            subtitle: (
              <>
                Venta #{d.saleId} · {formatDate(d.saleDate)}
              </>
            ),
            tags: <StatusTag status={d.status} daysOverdue={d.daysOverdue} />,
            fields: [
              { label: 'Fecha de pago', value: d.dueDate ? formatDate(d.dueDate) : '—' },
              { label: 'Total', value: formatUsd(Number(d.totalUsd)) },
              { label: 'Abonado', value: formatUsd(Number(d.paidUsd)) },
              { label: 'Saldo', value: <Text strong>{formatUsd(Number(d.balanceUsd))}</Text> },
            ],
            actions: (
              <>
                <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailId(d.saleId)}>
                  Ver
                </Button>
                {canPay && Number(d.balanceUsd) > 0.01 && (
                  <Button size="small" type="primary" onClick={() => setPaying(d)}>
                    Abonar
                  </Button>
                )}
              </>
            ),
          })}
          pagination={{
            current: page,
            pageSize: limit,
            total: debts.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} deudas`,
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
            },
          }}
        />
      </Card>

      <Drawer
        open={detailId != null}
        onClose={() => setDetailId(null)}
        title={`Deuda de la venta #${detailId ?? ''}`}
        width={640}
        loading={detail.isLoading}
        extra={
          detail.data && Number(detail.data.balanceUsd) > 0.01 && canPay ? (
            <Button type="primary" onClick={() => setPaying(detail.data as DebtRow)}>
              Abonar
            </Button>
          ) : undefined
        }
      >
        {detail.data && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Cliente">
                {detail.data.clientName || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Estado">
                <StatusTag status={detail.data.status} daysOverdue={detail.data.daysOverdue} />
              </Descriptions.Item>
              <Descriptions.Item label="Fecha de la venta">
                {formatDateTime(detail.data.saleDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha de pago acordada">
                {detail.data.dueDate ? formatDate(detail.data.dueDate) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Total">
                {formatUsd(Number(detail.data.totalUsd))}
              </Descriptions.Item>
              <Descriptions.Item label="Abonado">
                {formatUsd(Number(detail.data.paidUsd))}
              </Descriptions.Item>
              <Descriptions.Item label="Saldo">
                <Text strong style={{ fontSize: 16 }}>
                  {formatUsd(Number(detail.data.balanceUsd))}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>Abonos</Title>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              dataSource={detail.data.payments}
              locale={{ emptyText: 'Todavía no ha abonado nada' }}
              columns={[
                {
                  title: 'Fecha',
                  dataIndex: 'paidAt',
                  render: (d: string) => formatDateTime(d),
                },
                {
                  title: 'Método',
                  dataIndex: 'method',
                  render: (m: PaymentMethod) => PAYMENT_METHOD_LABELS[m],
                },
                {
                  title: 'USD',
                  dataIndex: 'amountUsd',
                  align: 'right',
                  render: (v: string) => formatUsd(Number(v)),
                },
                {
                  title: 'Bs',
                  dataIndex: 'amountBs',
                  align: 'right',
                  render: (v: string) => (Number(v) > 0 ? formatBs(v) : '—'),
                },
                {
                  title: 'Recibió',
                  dataIndex: 'userName',
                  render: (n: string | null) => n || '—',
                },
              ]}
            />
          </>
        )}
      </Drawer>

      <DebtPaymentModal
        open={paying != null}
        debt={paying}
        onClose={() => {
          setPaying(null);
          debts.refetch();
          summary.refetch();
        }}
      />
    </div>
  );
}
