import { useMemo, useRef, useState } from 'react';
import { DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  Divider,
  Input,
  InputNumber,
  Row,
  Select,
  Table,
  Typography,
} from 'antd';
import type { InputRef } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { PaymentMethod, Product } from '@autopartes-air/shared';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  formatUsd,
  round2,
} from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { listProducts } from '../../api/products.api';
import { useProducts } from '../../hooks/useProducts';
import { useClients } from '../../hooks/useClients';
import { useCurrentRates } from '../../hooks/useExchangeRates';
import { useAppliedTaxRate } from '../../hooks/useTaxes';
import { useCreateSale } from '../../hooks/useSales';

const { Title, Text } = Typography;

interface CartItem {
  product: Product;
  quantity: number;
  unitPriceUsd: number;
}

function formatBs(n: number): string {
  return `Bs ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CajeroPage() {
  const { message } = App.useApp();
  const createSale = useCreateSale();
  const barcodeRef = useRef<InputRef>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [code, setCode] = useState('');
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState<number | undefined>();
  const [clientSearch, setClientSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo_usd');

  const nameResults = useProducts({ q: search || undefined, limit: 10 });
  const clients = useClients({ q: clientSearch || undefined, limit: 20 });
  const currentRates = useCurrentRates();
  const bcv = Number(currentRates.data?.bcv?.rateBsPerUsd ?? 0);
  const ivaPct = useAppliedTaxRate();

  const subtotalUsd = useMemo(
    () => round2(cart.reduce((s, it) => s + it.quantity * it.unitPriceUsd, 0)),
    [cart],
  );
  const ivaUsd = round2((subtotalUsd * ivaPct) / 100);
  const totalUsd = round2(subtotalUsd + ivaUsd);
  const totalBs = round2(totalUsd * bcv);

  const focusBarcode = () => setTimeout(() => barcodeRef.current?.focus(), 0);

  const addProduct = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((it) => it.product.id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.product.id === product.id ? { ...it, quantity: it.quantity + 1 } : it,
        );
      }
      return [...prev, { product, quantity: 1, unitPriceUsd: Number(product.priceUsd) }];
    });
  };

  /** Enter en el campo de código: busca por código exacto (lector de barras). */
  const onScan = async () => {
    const q = code.trim();
    if (!q) return;
    try {
      const { data } = await listProducts({ q, limit: 5 });
      const match = data.find((p) => p.code.toLowerCase() === q.toLowerCase()) ?? data[0];
      if (match) {
        addProduct(match);
        setCode('');
      } else {
        message.warning(`Sin resultados para "${q}"`);
      }
    } catch (err) {
      message.error(getApiErrorMessage(err, 'Error al buscar'));
    }
    focusBarcode();
  };

  const updateItem = (id: number, patch: Partial<CartItem>) =>
    setCart((prev) => prev.map((it) => (it.product.id === id ? { ...it, ...patch } : it)));
  const removeItem = (id: number) =>
    setCart((prev) => prev.filter((it) => it.product.id !== id));

  const clearCart = () => {
    setCart([]);
    setClientId(undefined);
    focusBarcode();
  };

  const checkout = async () => {
    if (cart.length === 0) {
      message.warning('El carrito está vacío');
      return;
    }
    try {
      const sale = await createSale.mutateAsync({
        clientId: clientId ?? null,
        paymentMethod,
        details: cart.map((it) => ({
          productId: it.product.id,
          quantity: it.quantity,
          unitPriceUsd: it.unitPriceUsd,
        })),
      });
      message.success(`Venta #${sale.id} registrada: ${formatUsd(Number(sale.totalUsd))}`);
      clearCart();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo registrar la venta'));
    }
  };

  const columns: ColumnsType<CartItem> = [
    {
      title: 'Producto',
      key: 'p',
      render: (_, it) => (
        <span>
          <Text strong>{it.product.code}</Text> — {it.product.name}
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            stock: {it.product.stock}
          </Text>
        </span>
      ),
    },
    {
      title: 'Cant.',
      key: 'q',
      width: 80,
      render: (_, it) => (
        <InputNumber
          min={1}
          value={it.quantity}
          onChange={(v) => updateItem(it.product.id, { quantity: v ?? 1 })}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Precio',
      key: 'price',
      width: 110,
      render: (_, it) => (
        <InputNumber
          min={0}
          step={0.01}
          precision={2}
          value={it.unitPriceUsd}
          onChange={(v) => updateItem(it.product.id, { unitPriceUsd: v ?? 0 })}
          style={{ width: '100%' }}
          prefix="$"
        />
      ),
    },
    {
      title: 'Subtotal',
      key: 'sub',
      width: 100,
      align: 'right',
      render: (_, it) => formatUsd(round2(it.quantity * it.unitPriceUsd)),
    },
    {
      title: '',
      key: 'x',
      width: 40,
      render: (_, it) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(it.product.id)}
        />
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        <strong>Cajero</strong>{' '}
        <Text type="secondary" style={{ fontSize: 14 }}>
          — Nueva venta
        </Text>
      </Title>

      <Row gutter={16}>
        <Col xs={24} lg={15}>
          <Card>
            <Row gutter={8} style={{ marginBottom: 12 }}>
              <Col flex="auto">
                <Input
                  ref={barcodeRef}
                  autoFocus
                  size="large"
                  prefix={<ShoppingCartOutlined />}
                  placeholder="Escanea o escribe el código y presiona Enter"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onPressEnter={onScan}
                  allowClear
                />
              </Col>
              <Col flex="280px">
                <Select
                  showSearch
                  filterOption={false}
                  size="large"
                  style={{ width: '100%' }}
                  placeholder="Buscar por nombre…"
                  value={null}
                  onSearch={setSearch}
                  notFoundContent={nameResults.isFetching ? 'Buscando…' : 'Sin resultados'}
                  onChange={(id: number) => {
                    const p = nameResults.data?.data.find((x) => x.id === id);
                    if (p) addProduct(p);
                    setSearch('');
                  }}
                  options={(nameResults.data?.data ?? []).map((p) => ({
                    value: p.id,
                    label: `${p.code} — ${p.name} (${formatUsd(Number(p.priceUsd))})`,
                  }))}
                />
              </Col>
            </Row>

            <Table<CartItem>
              rowKey={(it) => it.product.id}
              columns={columns}
              dataSource={cart}
              pagination={false}
              size="small"
              locale={{ emptyText: 'Escanea o busca productos para agregar' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card>
            <Text type="secondary">Cliente</Text>
            <Select
              allowClear
              showSearch
              filterOption={false}
              style={{ width: '100%', marginTop: 4, marginBottom: 12 }}
              placeholder="Contado (sin cliente)"
              value={clientId}
              onSearch={setClientSearch}
              onChange={setClientId}
              notFoundContent={clients.isFetching ? 'Buscando…' : 'Sin resultados'}
              options={(clients.data?.data ?? []).map((c) => ({
                value: c.id,
                label: `${c.documentType}-${c.documentNumber} · ${c.name}`,
              }))}
            />

            <Text type="secondary">Método de pago</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={PAYMENT_METHODS.map((m) => ({
                value: m,
                label: PAYMENT_METHOD_LABELS[m],
              }))}
            />

            <Divider />

            <Row justify="space-between">
              <Text type="secondary">Subtotal</Text>
              <Text>{formatUsd(subtotalUsd)}</Text>
            </Row>
            <Row justify="space-between" style={{ marginTop: 6 }}>
              <Text type="secondary">IVA ({ivaPct}%)</Text>
              <Text>{formatUsd(ivaUsd)}</Text>
            </Row>
            <Row justify="space-between" align="middle" style={{ marginTop: 10 }}>
              <Title level={4} style={{ margin: 0 }}>
                Total
              </Title>
              <Title level={4} style={{ margin: 0 }}>
                {formatUsd(totalUsd)}
              </Title>
            </Row>
            <Row justify="end">
              <Text type="secondary">{bcv > 0 ? formatBs(totalBs) : 'Sin tasa BCV'}</Text>
            </Row>

            <Button
              type="primary"
              size="large"
              block
              style={{ marginTop: 16 }}
              loading={createSale.isPending}
              disabled={cart.length === 0}
              onClick={checkout}
            >
              Cobrar {formatUsd(totalUsd)}
            </Button>
            <Button
              block
              style={{ marginTop: 8 }}
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              Limpiar
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
