import { useState } from 'react';
import { DollarOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { ExchangeRate } from '@autopartes-air/shared';
import {
  EXCHANGE_RATE_SOURCES,
  EXCHANGE_RATE_SOURCE_LABELS,
  PERMISSIONS,
} from '@autopartes-air/shared';
import { useCurrentRates, useRates } from '../../hooks/useExchangeRates';
import { useAuthStore } from '../../stores/auth.store';
import { RateFormModal } from './RateFormModal';

const { Title, Text } = Typography;

/** Color de la etiqueta por fuente. */
const SOURCE_COLOR: Record<string, string> = {
  bcv: 'blue',
  euro: 'purple',
  intervencion: 'cyan',
  usdt: 'gold',
};

function formatRate(v: string | number): string {
  return Number(v).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function ExchangeRatesPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission(PERMISSIONS.RATES_CREATE);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);

  const current = useCurrentRates();
  const rates = useRates({ page, limit });

  const columns: ColumnsType<ExchangeRate> = [
    {
      title: 'Fecha',
      dataIndex: 'rateDate',
      width: 140,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: 'Fuente',
      dataIndex: 'source',
      width: 150,
      render: (s: ExchangeRate['source']) => (
        <Tag color={SOURCE_COLOR[s] ?? 'default'}>
          {EXCHANGE_RATE_SOURCE_LABELS[s] ?? s}
        </Tag>
      ),
    },
    {
      title: 'Tasa (Bs)',
      dataIndex: 'rateBsPerUsd',
      align: 'right',
      render: (v: string) => <Text strong>{formatRate(v)}</Text>,
    },
    {
      title: 'Registro',
      dataIndex: 'createdBy',
      width: 130,
      render: (createdBy: number | null) =>
        createdBy == null ? (
          <Tag color="green">Automática</Tag>
        ) : (
          <Tag>Manual</Tag>
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
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <strong>Tasas de cambio</strong>
          </Title>
          <Text type="secondary">
            Se actualizan automáticamente cada hora; también puedes registrarlas
            manualmente.
          </Text>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Registrar tasa
          </Button>
        )}
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 8 }}>
        {EXCHANGE_RATE_SOURCES.map((source) => {
          const rate = current.data?.[source] ?? null;
          return (
            <Col xs={24} sm={12} xl={6} key={source}>
              <Card loading={current.isLoading}>
                <Statistic
                  title={
                    <span>
                      {EXCHANGE_RATE_SOURCE_LABELS[source]}
                      {rate && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {' '}
                          · {dayjs(rate.rateDate).format('DD/MM')}
                        </Text>
                      )}
                    </span>
                  }
                  value={rate ? formatRate(rate.rateBsPerUsd) : '—'}
                  suffix="Bs"
                  prefix={<DollarOutlined style={{ color: '#adb5bd' }} />}
                />
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card title="Historial" style={{ marginTop: 16 }}>
        <Table<ExchangeRate>
          rowKey="id"
          columns={columns}
          dataSource={rates.data?.data ?? []}
          loading={rates.isLoading}
          pagination={{
            current: page,
            pageSize: limit,
            total: rates.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} registros`,
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
            },
          }}
        />
      </Card>

      <RateFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
