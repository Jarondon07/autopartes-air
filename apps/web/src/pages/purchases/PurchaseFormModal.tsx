import { useMemo, useState } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Col,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Product } from '@autopartes-air/shared';
import { calcPriceUsd, formatUsd, round2 } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { useProducts } from '../../hooks/useProducts';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useCurrentRates } from '../../hooks/useExchangeRates';
import { useCreatePurchase } from '../../hooks/usePurchases';

const { Text } = Typography;

interface Item {
  product: Product;
  quantity: number;
  unitCostUsd: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

function formatBs(n: number): string {
  return `Bs ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PurchaseFormModal({ open, onClose }: Props) {
  const { message } = App.useApp();
  const createPurchase = useCreatePurchase();

  const [supplierId, setSupplierId] = useState<number | undefined>();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');

  const suppliers = useSuppliers({ limit: 100 });
  const productsQuery = useProducts({ q: search || undefined, limit: 20 });
  const currentRates = useCurrentRates();
  const bcv = Number(currentRates.data?.bcv?.rateBsPerUsd ?? 0);

  const productOptions = (productsQuery.data?.data ?? [])
    .filter((p) => !items.some((it) => it.product.id === p.id))
    .map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }));

  const totalUsd = useMemo(
    () => round2(items.reduce((s, it) => s + it.quantity * it.unitCostUsd, 0)),
    [items],
  );
  const totalBs = round2(totalUsd * bcv);

  const reset = () => {
    setSupplierId(undefined);
    setInvoiceNumber('');
    setNotes('');
    setItems([]);
    setSearch('');
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  const addProduct = (id: number) => {
    const product = productsQuery.data?.data.find((p) => p.id === id);
    if (!product) return;
    setItems((prev) => [
      ...prev,
      { product, quantity: 1, unitCostUsd: Number(product.costUsd) },
    ]);
    setSearch('');
  };

  const updateItem = (productId: number, patch: Partial<Item>) =>
    setItems((prev) =>
      prev.map((it) => (it.product.id === productId ? { ...it, ...patch } : it)),
    );
  const removeItem = (productId: number) =>
    setItems((prev) => prev.filter((it) => it.product.id !== productId));

  const handleOk = async () => {
    if (!supplierId) {
      message.warning('Selecciona un proveedor');
      return;
    }
    if (items.length === 0) {
      message.warning('Agrega al menos un producto');
      return;
    }
    try {
      await createPurchase.mutateAsync({
        supplierId,
        invoiceNumber: invoiceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        details: items.map((it) => ({
          productId: it.product.id,
          quantity: it.quantity,
          unitCostUsd: it.unitCostUsd,
        })),
      });
      message.success('Compra registrada: stock y costos actualizados');
      handleClose();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo registrar la compra'));
    }
  };

  const columns: ColumnsType<Item> = [
    {
      title: 'Producto',
      key: 'product',
      render: (_, it) => (
        <span>
          <Text strong>{it.product.code}</Text> — {it.product.name}
        </span>
      ),
    },
    {
      title: 'Cant.',
      key: 'qty',
      width: 90,
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
      title: 'Costo USD',
      key: 'cost',
      width: 120,
      render: (_, it) => (
        <InputNumber
          min={0}
          step={0.01}
          precision={2}
          value={it.unitCostUsd}
          onChange={(v) => updateItem(it.product.id, { unitCostUsd: v ?? 0 })}
          style={{ width: '100%' }}
          prefix="$"
        />
      ),
    },
    {
      title: 'Subtotal',
      key: 'subtotal',
      width: 100,
      align: 'right',
      render: (_, it) => formatUsd(round2(it.quantity * it.unitCostUsd)),
    },
    {
      title: '% Gan.',
      key: 'markup',
      width: 80,
      align: 'right',
      render: (_, it) => `${Number(it.product.markupPct)}%`,
    },
    {
      title: 'P. Venta',
      key: 'sale',
      width: 160,
      align: 'right',
      render: (_, it) => {
        const usd = calcPriceUsd(it.unitCostUsd, Number(it.product.markupPct));
        return (
          <span>
            <Text strong>{formatUsd(usd)}</Text>
            {bcv > 0 && (
              <>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatBs(round2(usd * bcv))}
                </Text>
              </>
            )}
          </span>
        );
      },
    },
    {
      title: '',
      key: 'remove',
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
    <Modal
      open={open}
      title="Nueva compra (lote de entrada)"
      onCancel={handleClose}
      onOk={handleOk}
      okText="Registrar compra"
      cancelText="Cancelar"
      confirmLoading={createPurchase.isPending}
      width={900}
      destroyOnClose
      maskClosable={false}
    >
      <Row gutter={16} style={{ marginTop: 12, marginBottom: 16 }}>
        <Col span={10}>
          <Text type="secondary">Proveedor *</Text>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Seleccionar proveedor"
            style={{ width: '100%', marginTop: 4 }}
            loading={suppliers.isLoading}
            value={supplierId}
            onChange={setSupplierId}
            options={(suppliers.data?.data ?? []).map((s) => ({
              value: s.id,
              label: `${s.rif} — ${s.name}`,
            }))}
          />
        </Col>
        <Col span={7}>
          <Text type="secondary">N° de factura</Text>
          <Input
            style={{ marginTop: 4 }}
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Opcional"
          />
        </Col>
        <Col span={7}>
          <Text type="secondary">Tasa BCV (referencia)</Text>
          <Input
            style={{ marginTop: 4 }}
            value={bcv > 0 ? formatBs(bcv) : '—'}
            disabled
          />
        </Col>
      </Row>

      <Select
        showSearch
        filterOption={false}
        style={{ width: '100%', marginBottom: 12 }}
        placeholder="Buscar producto para agregar…"
        notFoundContent={productsQuery.isFetching ? 'Buscando…' : 'Sin resultados'}
        onSearch={setSearch}
        onChange={addProduct}
        value={null}
        options={productOptions}
      />

      <Table<Item>
        rowKey={(it) => it.product.id}
        columns={columns}
        dataSource={items}
        pagination={false}
        size="small"
        locale={{ emptyText: 'Agrega productos al lote' }}
      />

      <Row justify="end" style={{ marginTop: 16 }}>
        <Col style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16 }}>
            <Text type="secondary">Total: </Text>
            <Text strong>{formatUsd(totalUsd)}</Text>
            {bcv > 0 && (
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({formatBs(totalBs)})
              </Text>
            )}
          </div>
        </Col>
      </Row>

      <Input.TextArea
        rows={2}
        maxLength={500}
        style={{ marginTop: 12 }}
        placeholder="Notas (opcional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
    </Modal>
  );
}
