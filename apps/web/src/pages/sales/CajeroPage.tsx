import { useMemo, useRef, useState } from 'react';
import {
  DeleteOutlined,
  PictureOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  App,
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { InputRef } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { PaymentMethod, Product } from '@autopartes-air/shared';
import {
  PAYMENT_METHODS_BY_CURRENCY,
  PAYMENT_METHOD_CURRENCY,
  PAYMENT_METHOD_LABELS,
  formatUsd,
  round2,
} from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { listProducts, type ProductRow } from '../../api/products.api';
import { MoneyInput, QuantityInput } from '../../components/NumberInputs';
import { useProducts } from '../../hooks/useProducts';
import { useClients } from '../../hooks/useClients';
import { useWarehouses } from '../../hooks/useWarehouses';
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
  const { message, modal } = App.useApp();
  const createSale = useCreateSale();
  const searchRef = useRef<InputRef>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState('');
  const [resultQty, setResultQty] = useState<Record<number, number>>({});
  const [clientId, setClientId] = useState<number | undefined>();
  const [clientSearch, setClientSearch] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>({});
  const [paymentError, setPaymentError] = useState(false);
  const [applyIva, setApplyIva] = useState(false);

  const results = useProducts({ q: query.trim() || undefined, limit: 12 });
  const clients = useClients({ q: clientSearch || undefined, limit: 20 });
  const warehouses = useWarehouses();
  const currentRates = useCurrentRates();
  const bcv = Number(currentRates.data?.bcv?.rateBsPerUsd ?? 0);
  const usdt = Number(currentRates.data?.usdt?.rateBsPerUsd ?? 0);
  const ivaPct = useAppliedTaxRate();

  const warehouseMap = useMemo(
    () => new Map((warehouses.data ?? []).map((w) => [w.id, w.name])),
    [warehouses.data],
  );

  /** Bs a cobrar (paralelo) de un monto en USD. */
  const bsOf = (usd: number) => (usdt > 0 ? round2(usd * usdt) : null);

  // Los ítems se cobran al precio USD de venta; la conversión a Bs es a nivel de pago.
  const subtotalUsd = useMemo(
    () => round2(cart.reduce((s, it) => s + it.quantity * it.unitPriceUsd, 0)),
    [cart],
  );
  const ivaUsd = applyIva ? round2((subtotalUsd * ivaPct) / 100) : 0;
  const totalUsd = round2(subtotalUsd + ivaUsd);
  const totalBs = usdt > 0 ? round2(totalUsd * usdt) : 0; // referencia: total si todo se paga en Bs

  // Desglose de pago: USD primero (editables), Bs al final (auto = resto). El último es el resto.
  const orderedMethods = useMemo(
    () =>
      [...paymentMethods].sort(
        (a, b) =>
          (PAYMENT_METHOD_CURRENCY[a] === 'USD' ? 0 : 1) -
          (PAYMENT_METHOD_CURRENCY[b] === 'USD' ? 0 : 1),
      ),
    [paymentMethods],
  );
  const lastMethod = orderedMethods[orderedMethods.length - 1];
  const editableMethods = orderedMethods.slice(0, -1);
  const sumEditableUsd = round2(editableMethods.reduce((s, m) => s + (paymentAmounts[m] ?? 0), 0));
  const lastAmountUsd = lastMethod != null ? round2(totalUsd - sumEditableUsd) : 0;
  const overAllocated = lastAmountUsd < -0.001;
  const amountUsdOf = (m: PaymentMethod) =>
    m === lastMethod ? lastAmountUsd : paymentAmounts[m] ?? 0;
  const buildPayments = () =>
    orderedMethods.map((m) => {
      const usd = round2(amountUsdOf(m));
      const bs = PAYMENT_METHOD_CURRENCY[m] === 'BS' ? bsOf(usd) ?? 0 : 0;
      return { method: m, amountUsd: usd, amountBs: round2(bs) };
    });

  const focusSearch = () => setTimeout(() => searchRef.current?.focus(), 0);

  const addProduct = (product: Product, qty = 1) => {
    const stock = product.stock;
    const currentQty = cart.find((it) => it.product.id === product.id)?.quantity ?? 0;
    if (currentQty >= stock) {
      message.warning(`Solo hay ${stock} en stock de "${product.name}"`);
      return;
    }
    const newQty = Math.min(currentQty + qty, stock);
    if (newQty < currentQty + qty) {
      message.warning(`Stock máximo alcanzado: ${stock} de "${product.name}"`);
    }
    setCart((prev) => {
      const existing = prev.find((it) => it.product.id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.product.id === product.id ? { ...it, quantity: newQty } : it,
        );
      }
      return [...prev, { product, quantity: newQty, unitPriceUsd: Number(product.priceUsd) }];
    });
  };

  const resultQtyOf = (id: number) => resultQty[id] ?? 1;
  const setResultQtyOf = (id: number, v: number) =>
    setResultQty((m) => ({ ...m, [id]: v }));

  /** Selecciona un producto de la lista y lo agrega con la cantidad indicada. */
  const addFromResult = (p: ProductRow) => {
    if (p.stock <= 0) {
      message.warning(`"${p.name}" está sin stock`);
      return;
    }
    addProduct(p, resultQtyOf(p.id));
    setResultQty((m) => {
      if (!(p.id in m)) return m;
      const rest = { ...m };
      delete rest[p.id];
      return rest;
    });
    setQuery('');
    focusSearch();
  };

  /** Enter en el buscador: agrega por código exacto (lector de barras) o el primer resultado. */
  const onScan = async () => {
    const q = query.trim();
    if (!q) return;
    try {
      const { data } = await listProducts({ q, limit: 5 });
      const match = data.find((p) => p.code.toLowerCase() === q.toLowerCase()) ?? data[0];
      if (!match) {
        message.warning(`Sin resultados para "${q}"`);
      } else if (match.stock <= 0) {
        message.warning(`"${match.name}" está sin stock`);
      } else {
        addProduct(match);
        setQuery('');
      }
    } catch (err) {
      message.error(getApiErrorMessage(err, 'Error al buscar'));
    }
    focusSearch();
  };

  const updateItem = (id: number, patch: Partial<CartItem>) =>
    setCart((prev) => prev.map((it) => (it.product.id === id ? { ...it, ...patch } : it)));
  const removeItem = (id: number) =>
    setCart((prev) => prev.filter((it) => it.product.id !== id));

  const clearCart = () => {
    setCart([]);
    setClientId(undefined);
    setApplyIva(false);
    setPaymentMethods([]);
    setPaymentAmounts({});
    setPaymentError(false);
    focusSearch();
  };

  /** Abre la confirmación antes de registrar la venta. */
  const confirmCheckout = () => {
    if (cart.length === 0) {
      message.warning('El carrito está vacío');
      return;
    }
    if (paymentMethods.length === 0) {
      setPaymentError(true);
      message.warning('Selecciona al menos un método de pago');
      return;
    }
    if (overAllocated) {
      message.warning('El desglose de pago supera el total');
      return;
    }
    modal.confirm({
      title: '¿Cobraste la venta?',
      content: `Total a cobrar: ${formatUsd(totalUsd)}${usdt > 0 ? ` · ${formatBs(totalBs)}` : ''}`,
      okText: 'Sí, registrar',
      cancelText: 'No',
      onOk: () => checkout(),
    });
  };

  const checkout = async () => {
    if (cart.length === 0) {
      message.warning('El carrito está vacío');
      return;
    }
    try {
      const sale = await createSale.mutateAsync({
        clientId: clientId ?? null,
        payments: buildPayments(),
        applyIva,
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

  /** Celda de precio: USD de venta + Bs (× USDT) + USD (BCV) (= Bs ÷ BCV). */
  const moneyCell = (usd: number) => {
    const bs = bsOf(usd);
    const usdBcv = bs != null && bcv > 0 ? round2(bs / bcv) : null;
    return (
      <div style={{ textAlign: 'right' }}>
        <Text strong>{formatUsd(usd)}</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>
          {bs != null ? formatBs(bs) : '—'}
          <br />
          {usdBcv != null ? `${formatUsd(usdBcv)} (BCV)` : '—'}
        </Text>
      </div>
    );
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
      width: 90,
      render: (_, it) => (
        <QuantityInput
          min={1}
          max={it.product.stock}
          value={it.quantity}
          onChange={(v) => {
            const n = Math.min(Math.max(Number(v) || 1, 1), it.product.stock);
            if (Number(v) > it.product.stock) {
              message.warning(`Solo hay ${it.product.stock} en stock de "${it.product.name}"`);
            }
            updateItem(it.product.id, { quantity: n });
          }}
        />
      ),
    },
    {
      title: 'Precio unit.',
      key: 'price',
      width: 140,
      align: 'right',
      render: (_, it) => moneyCell(it.unitPriceUsd),
    },
    {
      title: 'Subtotal',
      key: 'sub',
      width: 140,
      align: 'right',
      render: (_, it) => moneyCell(round2(it.unitPriceUsd * it.quantity)),
    },
    {
      title: '',
      key: 'x',
      width: 40,
      fixed: 'right',
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
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Input
                ref={searchRef}
                autoFocus
                size="large"
                prefix={<SearchOutlined />}
                placeholder="Busca por código o nombre… (Enter agrega el primero / lector de barras)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onPressEnter={onScan}
                allowClear
              />

              {query.trim() !== '' && (
                <div
                  style={{
                    position: 'absolute',
                    zIndex: 20,
                    left: 0,
                    right: 0,
                    top: 'calc(100% + 4px)',
                    background: '#fff',
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
                    maxHeight: 400,
                    overflowY: 'auto',
                  }}
                >
                  {results.isFetching && (results.data?.data.length ?? 0) === 0 ? (
                    <div style={{ padding: 16 }}>
                      <Text type="secondary">Buscando…</Text>
                    </div>
                  ) : (results.data?.data.length ?? 0) === 0 ? (
                    <div style={{ padding: 16 }}>
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin resultados" />
                    </div>
                  ) : (
                    (results.data?.data ?? []).map((p) => {
                      const stock = p.stock;
                      const noStock = stock <= 0;
                      const warehouse = p.warehouseId ? warehouseMap.get(p.warehouseId) : null;
                      const priceUsd = Number(p.priceUsd);
                      const priceBs = usdt > 0 ? priceUsd * usdt : null;
                      const priceUsdBcv = priceBs != null && bcv > 0 ? priceBs / bcv : null;
                      return (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '8px 12px',
                            borderBottom: '1px solid #f5f5f5',
                          }}
                        >
                          <Avatar
                            shape="square"
                            size={44}
                            src={p.primaryImageUrl ?? undefined}
                            icon={<PictureOutlined />}
                            style={{ background: p.primaryImageUrl ? '#fff' : '#f0f0f0', flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <Text strong>{p.code}</Text> — {p.name}
                            </div>
                            <Space size={6} wrap style={{ marginTop: 2 }}>
                              <Text strong>{formatUsd(priceUsd)}</Text>
                              {priceBs != null && (
                                <Text type="secondary">{formatBs(priceBs)}</Text>
                              )}
                              {priceUsdBcv != null && (
                                <Text type="secondary">{formatUsd(priceUsdBcv)} (BCV)</Text>
                              )}
                              {stock > 0 ? (
                                <Tag color="success">En stock: {stock.toLocaleString('es-VE')}</Tag>
                              ) : (
                                <Tag color="error">Sin stock</Tag>
                              )}
                              <Tag color={warehouse ? 'blue' : undefined}>
                                {warehouse ? `Almacén: ${warehouse}` : 'Sin almacén'}
                              </Tag>
                            </Space>
                          </div>
                          <div style={{ width: 84, flexShrink: 0 }}>
                            <QuantityInput
                              min={1}
                              max={stock}
                              disabled={noStock}
                              value={resultQtyOf(p.id)}
                              onChange={(v) =>
                                setResultQtyOf(p.id, Math.min(Math.max(Number(v) || 1, 1), stock))
                              }
                            />
                          </div>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => addFromResult(p)}
                            disabled={noStock}
                            title={noStock ? 'Sin stock disponible' : undefined}
                            style={{ flexShrink: 0 }}
                          >
                            Agregar
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <Table<CartItem>
              rowKey={(it) => it.product.id}
              columns={columns}
              dataSource={cart}
              pagination={false}
              size="small"
              scroll={{ x: 760 }}
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

            <Text type="secondary">
              Métodos de pago (uno o varios){' '}
              {paymentError && <Text type="danger">*</Text>}
            </Text>
            <Select
              mode="multiple"
              allowClear
              status={paymentError ? 'error' : undefined}
              style={{ width: '100%', marginTop: 4 }}
              placeholder="Seleccionar método(s)"
              value={paymentMethods}
              onChange={(vals) => {
                setPaymentMethods(vals);
                if (vals.length > 0) setPaymentError(false);
              }}
              options={PAYMENT_METHODS_BY_CURRENCY.map((g) => ({
                label: g.currency === 'USD' ? 'USD' : 'Bolívares (Bs)',
                options: g.methods.map((m) => ({
                  value: m,
                  label: PAYMENT_METHOD_LABELS[m],
                })),
              }))}
            />
            {paymentError && (
              <Text type="danger" style={{ fontSize: 12 }}>
                Selecciona al menos un método de pago
              </Text>
            )}

            {orderedMethods.length >= 2 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Ingresa el monto (USD) de cada método; el último se calcula solo.
                </Text>
                {orderedMethods.map((m) => {
                  const isLast = m === lastMethod;
                  const usd = amountUsdOf(m);
                  const isBs = PAYMENT_METHOD_CURRENCY[m] === 'BS';
                  const bs = bsOf(usd);
                  const usdBcv = bs != null && bcv > 0 ? round2(bs / bcv) : null;
                  return (
                    <div key={m} style={{ marginTop: 6 }}>
                      <Row justify="space-between" align="middle" gutter={8} wrap={false}>
                        <Col flex="auto">
                          <Text>{PAYMENT_METHOD_LABELS[m]}</Text>
                        </Col>
                        <Col flex="140px">
                          {isLast ? (
                            <div style={{ textAlign: 'right' }}>
                              <Text strong>{formatUsd(usd)}</Text>
                            </div>
                          ) : (
                            <MoneyInput
                              value={paymentAmounts[m] ?? 0}
                              onChange={(v) =>
                                setPaymentAmounts((a) => ({ ...a, [m]: Number(v) || 0 }))
                              }
                              prefix="$"
                            />
                          )}
                        </Col>
                      </Row>
                      {isBs && (
                        <div style={{ textAlign: 'right' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {bs != null ? formatBs(bs) : '—'}
                            {usdBcv != null ? ` · ${formatUsd(usdBcv)} (BCV)` : ''}
                          </Text>
                        </div>
                      )}
                    </div>
                  );
                })}
                {overAllocated && (
                  <Text type="danger" style={{ fontSize: 12 }}>
                    El desglose supera el total.
                  </Text>
                )}
              </div>
            )}

            <Divider />

            <Row justify="space-between">
              <Text type="secondary">Subtotal</Text>
              <Text>{formatUsd(subtotalUsd)}</Text>
            </Row>
            <Row justify="space-between" align="middle" style={{ marginTop: 6 }}>
              <Checkbox checked={applyIva} onChange={(e) => setApplyIva(e.target.checked)}>
                Aplicar IVA ({ivaPct}%)
              </Checkbox>
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
              <Text type="secondary">{usdt > 0 ? formatBs(totalBs) : 'Sin tasa USDT'}</Text>
            </Row>
            {usdt > 0 && bcv > 0 && (
              <Row justify="end">
                <Text type="secondary">{formatUsd(round2(totalBs / bcv))} (BCV)</Text>
              </Row>
            )}

            <Button
              type="primary"
              size="large"
              block
              style={{ marginTop: 16 }}
              loading={createSale.isPending}
              disabled={cart.length === 0}
              onClick={confirmCheckout}
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
