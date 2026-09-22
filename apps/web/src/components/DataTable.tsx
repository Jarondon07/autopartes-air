import type { ReactNode } from 'react';
import { Card, Empty, Pagination, Skeleton, Space, Table, Typography } from 'antd';
import type { TableProps } from 'antd';
import { useIsMobile } from '../hooks/useResponsive';

const { Text } = Typography;

/** Contenido de la tarjeta que sustituye a la fila en pantallas de teléfono. */
export interface MobileCard {
  /** Miniatura o icono a la izquierda (opcional). */
  avatar?: ReactNode;
  /** Línea principal: lo que identifica al registro (código, nombre, nº de factura). */
  title: ReactNode;
  /** Línea secundaria bajo el título. */
  subtitle?: ReactNode;
  /** Etiquetas de estado (Tag, Badge…). */
  tags?: ReactNode;
  /** Pares dato/valor. Los `false`/`null` se descartan, para condicionar por permiso. */
  fields?: Array<{ label: string; value: ReactNode } | null | false | undefined>;
  /** Botones de acción; se muestran al pie de la tarjeta. */
  actions?: ReactNode;
}

export interface DataTableProps<T> extends TableProps<T> {
  /**
   * Cómo se ve cada registro en teléfono. Si no se define, se cae a la tabla
   * normal con scroll horizontal.
   */
  mobileCard?: (record: T, index: number) => MobileCard;
}

/**
 * Tabla en escritorio, lista de tarjetas en teléfono.
 *
 * La app se usa mucho desde el móvil (cajero, consultas en el mostrador), donde
 * una tabla de 8 columnas obliga a deslizar de lado para leer un precio. Bajo
 * los 768px cada fila se convierte en una tarjeta apilada, legible de un vistazo
 * y con las acciones a distancia del pulgar.
 *
 * Acepta las mismas props que el `Table` de Ant Design, así que migrar una
 * pantalla es cambiar `<Table<X>` por `<DataTable<X>` y añadir `mobileCard`.
 */
export function DataTable<T extends object>({
  mobileCard,
  ...tableProps
}: DataTableProps<T>) {
  const isMobile = useIsMobile();

  if (!isMobile || !mobileCard) {
    // En escritorio, o sin definición de tarjeta: la tabla de siempre.
    // `max-content` evita que las columnas se aplasten en pantallas medianas.
    return <Table<T> scroll={{ x: 'max-content' }} {...tableProps} />;
  }

  const { dataSource = [], loading, pagination, rowKey, locale } = tableProps;
  const rows = dataSource as readonly T[];

  const keyOf = (record: T, index: number): string => {
    if (typeof rowKey === 'function') return String(rowKey(record, index));
    if (typeof rowKey === 'string') return String((record as Record<string, unknown>)[rowKey]);
    return String(index);
  };

  if (loading && rows.length === 0) {
    return (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {[0, 1, 2].map((i) => (
          <Card key={i} size="small">
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        ))}
      </Space>
    );
  }

  if (rows.length === 0) {
    // `emptyText` puede venir como nodo o como función que lo produce.
    const empty = typeof locale?.emptyText === 'function' ? locale.emptyText() : locale?.emptyText;
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty ?? 'Sin datos'} />;
  }

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {rows.map((record, index) => {
        const card = mobileCard(record, index);
        const fields = (card.fields ?? []).filter(
          (f): f is { label: string; value: ReactNode } => Boolean(f),
        );

        return (
          <Card
            key={keyOf(record, index)}
            size="small"
            styles={{ body: { padding: 12 } }}
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {card.avatar && <div style={{ flexShrink: 0 }}>{card.avatar}</div>}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>
                  {card.title}
                </div>

                {card.subtitle && (
                  <div style={{ marginTop: 2 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {card.subtitle}
                    </Text>
                  </div>
                )}

                {card.tags && (
                  <Space size={4} wrap style={{ marginTop: 6 }}>
                    {card.tags}
                  </Space>
                )}

                {fields.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr',
                      columnGap: 10,
                      rowGap: 4,
                      fontSize: 13,
                    }}
                  >
                    {fields.map((f, i) => (
                      <div key={i} style={{ display: 'contents' }}>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          {f.label}
                        </Text>
                        <div style={{ textAlign: 'right', wordBreak: 'break-word' }}>
                          {f.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {card.actions && (
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px solid #f0f0f0',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  justifyContent: 'flex-end',
                }}
              >
                {card.actions}
              </div>
            )}
          </Card>
        );
      })}

      {pagination !== false && pagination && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
          <Pagination
            simple
            size="small"
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={pagination.onChange}
            showSizeChanger={false}
          />
        </div>
      )}
    </Space>
  );
}
