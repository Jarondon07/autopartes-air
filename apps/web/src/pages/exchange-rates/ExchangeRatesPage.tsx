import { useState } from 'react';
import { DollarOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { App, Button, Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { ExchangeRate } from '@autopartes-air/shared';
import {
  EXCHANGE_RATE_SOURCES,
  EXCHANGE_RATE_SOURCE_LABELS,
  PERMISSIONS,
} from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { useCurrentRates, useRates, useRefreshRates } from '../../hooks/useExchangeRates';
import { useAuthStore } from '../../stores/auth.store';
import { RateFormModal } from './RateFormModal';
import { DataTable } from '../../components/DataTable';

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
    maximumFractionDigits: 2,
  });
}

export function ExchangeRatesPage() {
  const { message, modal } = App.useApp();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission(PERMISSIONS.RATES_CREATE);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);

  const current = useCurrentRates();
  const rates = useRates({ page, limit });
  const refreshRates = useRefreshRates();

  const confirmRefresh = () => {
    modal.confirm({
      title: '¿Actualizar las tasas ahora?',
      content: 'Se consultará Radar en el momento y se guardarán las tasas del día.',
      okText: 'Sí, actualizar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const { updated } = await refreshRates.mutateAsync();
          message.success(
            updated.length
              ? `Tasas actualizadas: ${updated.length} fuente(s).`
              : 'Tasas ya estaban al día (sin cambios).',
          );
        } catch (err) {
          message.error(getApiErrorMessage(err, 'No se pudo actualizar las tasas'));
        }
      },
    });
  };

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
          // En telefono el titulo y las acciones se apilan en vez de aplastarse.
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <strong>Tasas de cambio</strong>
          </Title>
          <Text type="secondary">
            Se actualizan automáticamente cada día a las 00:30; también puedes
            actualizarlas ahora o registrarlas manualmente.
          </Text>
        </div>
        {canCreate && (
          <Space>
            <Button
              icon={<ReloadOutlined />}
              loading={refreshRates.isPending}
              onClick={confirmRefresh}
            >
              Actualizar ahora
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              Registrar tasa
            </Button>
          </Space>
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
        <DataTable<ExchangeRate>
          rowKey="id"
          columns={columns}
          dataSource={rates.data?.data ?? []}
          loading={rates.isLoading}
          mobileCard={(r) => ({
            title: <Text strong>{formatRate(r.rateBsPerUsd)} Bs / USD</Text>,
            subtitle: dayjs(r.rateDate).format('DD/MM/YYYY'),
            tags: (
              <>
                <Tag color={SOURCE_COLOR[r.source] ?? 'default'}>
                  {EXCHANGE_RATE_SOURCE_LABELS[r.source] ?? r.source}
                </Tag>
                {r.createdBy == null ? <Tag color="green">Automática</Tag> : <Tag>Manual</Tag>}
              </>
            ),
          })}
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
