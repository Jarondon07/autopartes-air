import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeftOutlined,
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
  DatePicker,
  Divider,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { InputRef } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
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
import { ClientPicker } from './ClientPicker';
import { ProductPreview } from '../../components/ProductPreview';
import { DataTable } from '../../components/DataTable';
import { useIsMobile } from '../../hooks/useResponsive';
import { SaleInvoice } from '../../components/SaleInvoice';
import type { SaleDetail } from '../../api/sales.api';
import { useProducts } from '../../hooks/useProducts';
import { useWarehouses } from '../../hooks/useWarehouses';
import { useCurrentRates } from '../../hooks/useExchangeRates';
import { useAppliedTaxRate } from '../../hooks/useTaxes';
import { useCreateSale } from '../../hooks/useSales';
import { formatDate } from '../../lib/datetime';

const { Title, Text, Link } = Typography;

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
  const isMobile = useIsMobile();
  const createSale = useCreateSale();
  const searchRef = useRef<InputRef>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState('');
  const [resultQty, setResultQty] = useState<Record<number, number>>({});
  const [clientId, setClientId] = useState<number | undefined>();
  /** Venta a crédito: lo que no se abone ahora queda como deuda del cliente. */
  const [isCredit, setIsCredit] = useState(false);
  const [dueDate, setDueDate] = useState<Dayjs | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>({});
  const [paymentError, setPaymentError] = useState(false);
  const [applyIva, setApplyIva] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [completedSale, setCompletedSale] = useState<SaleDetail | null>(null);

  const results = useProducts({ q: query.trim() || undefined, limit: 12 });
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
  const totalUsdBcv = usdt > 0 && bcv > 0 ? round2(totalBs / bcv) : totalUsd;

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
  // De contado, el último método absorbe el resto del total. A crédito no hay
  // "resto" que repartir: lo que se ingresa es el abono inicial, así que todos
  // los métodos llevan su monto explícito.
  const lastMethod = isCredit ? undefined : orderedMethods[orderedMethods.length - 1];
  const editableMethods = isCredit ? orderedMethods : orderedMethods.slice(0, -1);
  const firstBsIndex = orderedMethods.findIndex((m) => PAYMENT_METHOD_CURRENCY[m] === 'BS');

  /** El monto ingresado se guarda en la moneda del método (USD o Bs). USD cubierto por el método: */
  const usdCoveredOf = (m: PaymentMethod) => {
    const raw = paymentAmounts[m] ?? 0;
    return PAYMENT_METHOD_CURRENCY[m] === 'BS' ? (usdt > 0 ? raw / usdt : 0) : raw;
  };
  const sumEditableUsd = round2(editableMethods.reduce((s, m) => s + usdCoveredOf(m), 0));
  const lastAmountUsd = lastMethod != null ? round2(totalUsd - sumEditableUsd) : 0;
  const usdOf = (m: PaymentMethod) => (m === lastMethod ? lastAmountUsd : usdCoveredOf(m));

  /** Abono inicial (solo a crédito): la suma de lo que el cliente deja ahora. */
  const initialPaymentUsd = isCredit ? sumEditableUsd : totalUsd;
  /** Lo que quedará debiendo tras la venta. */
  const debtUsd = isCredit ? round2(totalUsd - initialPaymentUsd) : 0;
  const overAllocated = isCredit ? debtUsd < -0.001 : lastAmountUsd < -0.001;

  const buildPayments = () =>
    orderedMethods
      .map((m) => {
        const usd = round2(usdOf(m));
        const bs = PAYMENT_METHOD_CURRENCY[m] === 'BS' ? round2(usd * usdt) : 0;
        return { method: m, amountUsd: usd, amountBs: bs };
      })
      // A crédito, un método sin monto no es un pago: no se registra.
      .filter((p) => !isCredit || p.amountUsd > 0);

  // Texto del botón Cobrar: con 1 método muestra el monto (USD o USD-BCV); con varios solo "Cobrar".
  const soloMetodo = paymentMethods.length === 1 ? paymentMethods[0] : undefined;
  const cobrarLabel = isCredit
    ? initialPaymentUsd > 0
      ? `Registrar a crédito (abona ${formatUsd(initialPaymentUsd)})`
      : 'Registrar venta a crédito'
    : soloMetodo == null
      ? 'Cobrar'
      : PAYMENT_METHOD_CURRENCY[soloMetodo] === 'BS'
        ? `Cobrar ${formatUsd(totalUsdBcv)} (BCV)`
        : `Cobrar ${formatUsd(totalUsd)}`;

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
    setIsCredit(false);
    setDueDate(null);
    focusSearch();
  };

  /** Abre la confirmación antes de registrar la venta. */
  const confirmCheckout = () => {
    if (cart.length === 0) {
      message.warning('El carrito está vacío');
      return;
    }
    if (clientId == null) {
      message.warning('Selecciona o crea el cliente');
      return;
    }
    // A crédito puede no haber ningún método: el cliente no deja nada ahora.
    if (!isCredit && paymentMethods.length === 0) {
      setPaymentError(true);
      message.warning('Selecciona al menos un método de pago');
      return;
    }
    if (isCredit && !dueDate) {
      message.warning('Indica la fecha de pago acordada');
      return;
    }
    if (overAllocated) {
      message.warning(
        isCredit ? 'El abono inicial supera el total' : 'El desglose de pago supera el total',
      );
      return;
    }
    modal.confirm({
      title: isCredit ? '¿Registrar la venta a crédito?' : '¿Cobraste la venta?',
      content: isCredit
        ? `Queda debiendo ${formatUsd(debtUsd)} para el ${dueDate ? formatDate(dueDate.toDate()) : ''}.`
        : `Total a cobrar: ${formatUsd(totalUsd)}${usdt > 0 ? ` · ${formatBs(totalBs)}` : ''}`,
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
        isCredit,
        dueDate: isCredit && dueDate ? dueDate.format('YYYY-MM-DD') : null,
        details: cart.map((it) => ({
          productId: it.product.id,
          quantity: it.quantity,
          unitPriceUsd: it.unitPriceUsd,
        })),
      });
      message.success(
        isCredit
          ? `Venta #${sale.id} a crédito: queda debiendo ${formatUsd(debtUsd)}`
          : `Venta #${sale.id} registrada: ${formatUsd(Number(sale.totalUsd))}`,
      );
      setCompletedSale(sale);
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

  /** Tres líneas de un total (USD, Bs, USD-BCV), todas del mismo tamaño. */
  const amountLines = (usd: number, strong = false) => {
    const bs = bsOf(usd);
    const usdBcv = bs != null && bcv > 0 ? round2(bs / bcv) : null;
    return (
      <div style={{ textAlign: 'right', lineHeight: 1.6 }}>
        <div>
          <Text strong={strong}>{formatUsd(usd)}</Text>
        </div>
        <div>
          <Text strong={strong}>{bs != null ? formatBs(bs) : '—'}</Text>
        </div>
        <div>
          <Text strong={strong}>{usdBcv != null ? `${formatUsd(usdBcv)} (BCV)` : '—'}</Text>
        </div>
      </div>
    );
  };

  const columns: ColumnsType<CartItem> = [
    {
      title: 'Producto',
      key: 'p',
      render: (_, it) => (
        <span>
          <Link onClick={() => setDetailId(it.product.id)} title="Ver ficha del producto">
            <Text strong>{it.product.code}</Text> — {it.product.name}
          </Link>
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

  // Tras cobrar: muestra la factura completa con botón para volver al cajero.
  if (completedSale) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Space align="center" style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<ArrowLeftOutlined />}
            onClick={() => setCompletedSale(null)}
          >
            Volver al cajero
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            <strong>Venta registrada</strong>
          </Title>
        </Space>
        <Card>
          <SaleInvoice sale={completedSale} />
        </Card>
      </div>
    );
  }

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
                    maxHeight: isMobile ? '60vh' : 400,
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
                            // En telefono la fila se apila: los datos arriba y la
                            // cantidad + "Agregar" debajo, con espacio para el pulgar.
                            flexWrap: isMobile ? 'wrap' : 'nowrap',
                            alignItems: isMobile ? 'flex-start' : 'center',
                            gap: isMobile ? 8 : 12,
                            padding: isMobile ? '10px 12px' : '8px 12px',
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
                              {p.isUniversal && <Tag color="purple">Universal</Tag>}
                            </Space>
                          </div>
                          <div
                            style={{
                              width: isMobile ? 96 : 84,
                              flexShrink: 0,
                              marginLeft: isMobile ? 56 : 0,
                            }}
                          >
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
                            style={{ flexShrink: 0, flex: isMobile ? 1 : undefined }}
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

            <DataTable<CartItem>
              rowKey={(it) => it.product.id}
              columns={columns}
              dataSource={cart}
              pagination={false}
              size="small"
              scroll={{ x: 760 }}
              locale={{ emptyText: 'Escanea o busca productos para agregar' }}
              mobileCard={(it) => ({
                title: (
                  <Link onClick={() => setDetailId(it.product.id)}>
                    <Text strong>{it.product.code}</Text> — {it.product.name}
                  </Link>
                ),
                subtitle: `stock: ${it.product.stock}`,
                fields: [
                  {
                    label: 'Cantidad',
                    value: (
                      <div style={{ width: 110, marginLeft: 'auto' }}>
                        <QuantityInput
                          min={1}
                          max={it.product.stock}
                          value={it.quantity}
                          onChange={(v) => {
                            const n = Math.min(Math.max(Number(v) || 1, 1), it.product.stock);
                            if (Number(v) > it.product.stock) {
                              message.warning(
                                `Solo hay ${it.product.stock} en stock de "${it.product.name}"`,
                              );
                            }
                            updateItem(it.product.id, { quantity: n });
                          }}
                        />
                      </div>
                    ),
                  },
                  { label: 'Precio unit.', value: moneyCell(it.unitPriceUsd) },
                  {
                    label: 'Subtotal',
                    value: moneyCell(round2(it.unitPriceUsd * it.quantity)),
                  },
                ],
                actions: (
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeItem(it.product.id)}
                  >
                    Quitar
                  </Button>
                ),
              })}
            />
          </Card>

          <Card size="small" title="Cliente (requerido)" style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Busca por tipo + cédula/RIF; si no existe, créalo. Requerido para cobrar.
            </Text>
            <div style={{ marginTop: 8 }}>
              <ClientPicker value={clientId} onChange={(id) => setClientId(id)} />
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card>
            {applyIva && (
              <>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text type="secondary">Subtotal a pagar en:</Text>
                  {amountLines(subtotalUsd)}
                </div>

                <Divider style={{ margin: '12px 0' }} />
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Checkbox checked={applyIva} onChange={(e) => setApplyIva(e.target.checked)}>
                Aplicar IVA ({ivaPct}%)
              </Checkbox>
              {applyIva && amountLines(ivaUsd)}
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: 16 }}>
                Total
              </Text>
              {amountLines(totalUsd, true)}
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* Venta a crédito: la mercancía sale hoy y el pago queda pendiente. */}
            <Checkbox
              checked={isCredit}
              onChange={(e) => {
                setIsCredit(e.target.checked);
                setPaymentError(false);
                // El desglose cambia de significado (total vs. abono): se limpia
                // para que nadie registre un monto pensado para el otro modo.
                setPaymentAmounts({});
                if (!e.target.checked) setDueDate(null);
              }}
            >
              <Text strong>Venta a crédito</Text> (paga después)
            </Checkbox>

            {isCredit && (
              <div style={{ marginTop: 10 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ¿Cuándo paga?
                </Text>
                <DatePicker
                  style={{ width: '100%', marginTop: 4 }}
                  format="DD/MM/YYYY"
                  placeholder="Fecha de pago"
                  value={dueDate}
                  onChange={setDueDate}
                  disabledDate={(d) => d && d < dayjs().startOf('day')}
                />
                <Space size={8} style={{ marginTop: 8 }} wrap>
                  {[8, 15, 30].map((days) => (
                    <Button
                      key={days}
                      size="small"
                      onClick={() => setDueDate(dayjs().add(days, 'day'))}
                    >
                      {days} días
                    </Button>
                  ))}
                </Space>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 12,
                  }}
                >
                  <Text type="secondary">Queda debiendo</Text>
                  <Text strong style={{ fontSize: 16, color: debtUsd > 0 ? '#dc3545' : undefined }}>
                    {formatUsd(debtUsd)}
                  </Text>
                </div>
              </div>
            )}

            <Divider style={{ margin: '12px 0' }} />

            <Text type="secondary">
              {isCredit
                ? '¿Abona algo ahora? (opcional)'
                : '¿Cómo se cobra? Métodos de pago (uno o varios)'}{' '}
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

            {(isCredit ? orderedMethods.length >= 1 : orderedMethods.length >= 2) && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {isCredit
                    ? 'Ingresa cuánto abona con cada método (USD en $, Bs en Bs).'
                    : 'Ingresa el monto de cada método (USD en $, Bs en Bs); el último se calcula solo.'}
                </Text>
                {orderedMethods.map((m, i) => {
                  const isBs = PAYMENT_METHOD_CURRENCY[m] === 'BS';
                  const isEditable = m !== lastMethod; // el último es el resto (auto)
                  const usd = usdOf(m);
                  const bsAmount = isBs
                    ? isEditable
                      ? paymentAmounts[m] ?? 0
                      : round2(usd * usdt)
                    : null;
                  const usdBcv = bsAmount != null && bcv > 0 ? round2(bsAmount / bcv) : null;
                  const showSep = i === firstBsIndex && firstBsIndex > 0;
                  return (
                    <div key={m}>
                      {showSep && <Divider style={{ margin: '8px 0' }} />}
                      <div style={{ marginTop: 6 }}>
                        <Row justify="space-between" align="middle" gutter={8} wrap={false}>
                          <Col flex="auto">
                            <Text>{PAYMENT_METHOD_LABELS[m]}</Text>
                          </Col>
                          <Col flex="150px">
                            {isEditable ? (
                              <MoneyInput
                                value={paymentAmounts[m] ?? 0}
                                onChange={(v) =>
                                  setPaymentAmounts((a) => ({ ...a, [m]: Number(v) || 0 }))
                                }
                                prefix={isBs ? 'Bs' : '$'}
                              />
                            ) : (
                              <div style={{ textAlign: 'right' }}>
                                <Text strong>
                                  {isBs
                                    ? bsAmount != null
                                      ? formatBs(bsAmount)
                                      : '—'
                                    : formatUsd(usd)}
                                </Text>
                              </div>
                            )}
                          </Col>
                        </Row>
                        {isBs && usdBcv != null && (
                          <div style={{ textAlign: 'right' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {formatUsd(usdBcv)} (BCV)
                            </Text>
                          </div>
                        )}
                      </div>
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

            <Button
              type="primary"
              size="large"
              block
              style={{ marginTop: 16 }}
              loading={createSale.isPending}
              disabled={
                cart.length === 0 ||
                clientId == null ||
                (!isCredit && paymentMethods.length === 0) ||
                (isCredit && !dueDate) ||
                overAllocated
              }
              onClick={confirmCheckout}
            >
              {cobrarLabel}
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

      <Modal
        open={detailId != null}
        onCancel={() => setDetailId(null)}
        footer={null}
        title="Ficha del producto"
        width={560}
        destroyOnHidden
      >
        <ProductPreview productId={detailId} />
      </Modal>
    </div>
  );
}
