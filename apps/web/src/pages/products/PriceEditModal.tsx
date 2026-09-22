import { useEffect, useState } from 'react';
import { App, Alert, Descriptions, Form, Modal, Typography } from 'antd';
import { calcMarkupPct, calcPriceUsd, formatUsd } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { MoneyInput, PercentInput } from '../../components/NumberInputs';
import { useUpdateProduct } from '../../hooks/useProducts';
import { useCurrentRates } from '../../hooks/useExchangeRates';

const { Text } = Typography;

interface Props {
  /** Producto a re-precificar; null cierra la modal. */
  product: { id: number; name: string; costUsd: string; markupPct: string } | null;
  onClose: () => void;
}

function formatBs(n: number): string {
  return `Bs ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Cambio rápido de precio desde la lista de Productos.
 *
 * Los precios de repuestos se mueven semana a semana; entrar a la ficha
 * completa para tocar un número es demasiado. Aquí se edita el precio (o el
 * margen, lo que resulte más cómodo) y se guarda sin salir de la lista.
 *
 * Lo que se guarda es SIEMPRE el margen: `products.price_usd` es una columna
 * generada por la base de datos a partir del costo y el margen.
 */
export function PriceEditModal({ product, onClose }: Props) {
  const { message } = App.useApp();
  const updateProduct = useUpdateProduct();
  const rates = useCurrentRates();
  const usdt = rates.data?.usdt ? Number(rates.data.usdt.rateBsPerUsd) : 0;

  const [markupPct, setMarkupPct] = useState(0);
  /**
   * Lo que se está tecleando en el campo de precio. Sin esto, al borrar
   * dígitos el valor cae por debajo del costo, el margen se limita a 0 y el
   * campo rebota al costo: no habría forma de escribir un número nuevo.
   */
  const [priceDraft, setPriceDraft] = useState<number | null>(null);

  const costUsd = Number(product?.costUsd ?? 0);
  const priceUsd = costUsd > 0 ? calcPriceUsd(costUsd, markupPct) : 0;

  useEffect(() => {
    if (product) {
      setMarkupPct(Number(product.markupPct));
      setPriceDraft(null);
    }
  }, [product]);

  const save = async () => {
    if (!product) return;
    try {
      await updateProduct.mutateAsync({ id: product.id, input: { markupPct } });
      message.success(`Precio de "${product.name}" actualizado a ${formatUsd(priceUsd)}`);
      onClose();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo actualizar el precio'));
    }
  };

  return (
    <Modal
      open={product != null}
      title="Cambiar precio"
      okText="Guardar precio"
      cancelText="Cancelar"
      onOk={save}
      onCancel={onClose}
      confirmLoading={updateProduct.isPending}
      destroyOnHidden
    >
      <Text strong>{product?.name}</Text>

      {costUsd <= 0 ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
          message="Este producto todavía no tiene costo"
          description="El costo entra con la primera compra. Hasta entonces no hay precio que calcular."
        />
      ) : (
        <>
          <Descriptions size="small" column={1} style={{ marginTop: 16 }}>
            <Descriptions.Item label="Costo (última compra)">
              {formatUsd(costUsd)}
            </Descriptions.Item>
          </Descriptions>

          <Form layout="vertical" style={{ marginTop: 8 }}>
            <Form.Item label="Margen de ganancia (%)" style={{ marginBottom: 12 }}>
              <PercentInput
                value={markupPct}
                onChange={(v) => {
                  setPriceDraft(null);
                  setMarkupPct(v ?? 0);
                }}
              />
            </Form.Item>
            <Form.Item
              label="Precio de venta (USD)"
              extra="Se redondea hacia arriba al dólar entero."
              style={{ marginBottom: 8 }}
            >
              <MoneyInput
                value={priceDraft ?? priceUsd}
                // Editar el precio es editar el margen: se despeja y se guarda ese.
                onChange={(v) => {
                  setPriceDraft(v ?? 0);
                  setMarkupPct(calcMarkupPct(costUsd, v ?? 0));
                }}
                onBlur={() => {
                  if (priceDraft != null && priceDraft > 0 && priceDraft < costUsd) {
                    message.warning(
                      `El precio no puede quedar por debajo del costo (${formatUsd(costUsd)}).`,
                    );
                  }
                  setPriceDraft(null);
                }}
              />
            </Form.Item>
          </Form>

          <Text type="secondary">
            Precio final: <Text strong>{formatUsd(priceUsd)}</Text>
            {usdt > 0 && ` · ${formatBs(Math.round(priceUsd * usdt * 100) / 100)}`}
            {' · ganancia '}
            {formatUsd(Math.round((priceUsd - costUsd) * 100) / 100)}
          </Text>
        </>
      )}
    </Modal>
  );
}
