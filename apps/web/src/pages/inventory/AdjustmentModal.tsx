import { useMemo, useState } from 'react';
import { App, Alert, Form, Input, Modal, Segmented, Select } from 'antd';
import { QuantityInput } from '../../components/NumberInputs';
import type { Product } from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import { useProducts } from '../../hooks/useProducts';
import { useCreateAdjustment } from '../../hooks/useInventory';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdjustmentModal({ open, onClose }: Props) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const createAdjustment = useCreateAdjustment();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [mode, setMode] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState<number | null>(null);

  const productsQuery = useProducts({ q: search || undefined, limit: 20 });
  const products = productsQuery.data?.data ?? [];

  const options = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: `${p.code} — ${p.name} (stock: ${p.stock})`,
      })),
    [products],
  );

  const signedQty = mode === 'in' ? (amount ?? 0) : -(amount ?? 0);
  const resultingStock = selected ? selected.stock + signedQty : null;
  const insufficient = resultingStock != null && resultingStock < 0;

  const reset = () => {
    form.resetFields();
    setSearch('');
    setSelected(null);
    setMode('in');
    setAmount(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    if (!selected) return;
    try {
      await createAdjustment.mutateAsync({
        productId: selected.id,
        quantity: signedQty,
        notes: values.notes?.trim() || undefined,
      });
      message.success('Ajuste registrado');
      handleClose();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo registrar el ajuste'));
    }
  };

  return (
    <Modal
      open={open}
      title="Ajustar stock"
      onCancel={handleClose}
      onOk={handleOk}
      okText="Registrar ajuste"
      cancelText="Cancelar"
      okButtonProps={{ disabled: !selected || !amount || insufficient }}
      confirmLoading={createAdjustment.isPending}
      destroyOnClose
      maskClosable={false}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item label="Producto" required>
          <Select
            showSearch
            filterOption={false}
            placeholder="Buscar por código o nombre"
            notFoundContent={productsQuery.isFetching ? 'Buscando…' : 'Sin resultados'}
            onSearch={setSearch}
            onChange={(id: number) =>
              setSelected(products.find((p) => p.id === id) ?? null)
            }
            options={options}
            value={selected?.id}
          />
        </Form.Item>

        <Form.Item label="Tipo de ajuste">
          <Segmented
            block
            value={mode}
            onChange={(v) => setMode(v as 'in' | 'out')}
            options={[
              { label: 'Entrada (+)', value: 'in' },
              { label: 'Salida (−)', value: 'out' },
            ]}
          />
        </Form.Item>

        <Form.Item label="Cantidad" required>
          <QuantityInput
            min={1}
            value={amount}
            onChange={(v) => setAmount(v == null ? null : Number(v))}
            placeholder="0"
          />
        </Form.Item>

        {selected && amount ? (
          <Alert
            type={insufficient ? 'error' : 'info'}
            showIcon
            style={{ marginBottom: 16 }}
            message={
              insufficient
                ? `Stock insuficiente: ${selected.stock} disponibles`
                : `Stock: ${selected.stock} → ${resultingStock}`
            }
          />
        ) : null}

        <Form.Item name="notes" label="Motivo / Nota">
          <Input.TextArea rows={2} maxLength={500} placeholder="Ej: conteo físico, merma, rotura…" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
