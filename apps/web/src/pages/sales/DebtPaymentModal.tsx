import { useEffect, useState } from 'react';
import { App, Alert, Descriptions, Form, Input, Modal, Select, Typography } from 'antd';
import {
  PAYMENT_METHODS_BY_CURRENCY,
  PAYMENT_METHOD_CURRENCY,
  PAYMENT_METHOD_LABELS,
  formatUsd,
  round2,
  type PaymentMethod,
} from '@autopartes-air/shared';
import { getApiErrorMessage } from '../../api/client';
import type { DebtRow } from '../../api/debts.api';
import { MoneyInput } from '../../components/NumberInputs';
import { useAddDebtPayment } from '../../hooks/useDebts';
import { useCurrentRates } from '../../hooks/useExchangeRates';

const { Text } = Typography;

interface Props {
  open: boolean;
  debt: DebtRow | null;
  onClose: () => void;
}

function formatBs(n: number): string {
  return `Bs ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Registra un abono contra una deuda. El monto siempre se ingresa en USD. */
export function DebtPaymentModal({ open, debt, onClose }: Props) {
  const { message } = App.useApp();
  const [amountUsd, setAmountUsd] = useState(0);
  const [method, setMethod] = useState<PaymentMethod | undefined>();
  const [notes, setNotes] = useState('');
  const addPayment = useAddDebtPayment();
  const rates = useCurrentRates();
  const usdt = Number(rates.data?.usdt?.rateBsPerUsd ?? 0);

  const balance = round2(Number(debt?.balanceUsd ?? 0));

  useEffect(() => {
    if (open) {
      // Se propone saldar la deuda completa: es el caso más común.
      setAmountUsd(balance);
      setMethod(undefined);
      setNotes('');
    }
  }, [open, balance]);

  const isBs = method ? PAYMENT_METHOD_CURRENCY[method] === 'BS' : false;
  const amountBs = isBs && usdt > 0 ? round2(amountUsd * usdt) : null;
  const remaining = round2(balance - amountUsd);
  const exceeds = amountUsd - balance > 0.01;

  const submit = async () => {
    if (!debt) return;
    if (amountUsd <= 0) {
      message.warning('Ingresa el monto del abono');
      return;
    }
    if (!method) {
      message.warning('Selecciona el método de pago');
      return;
    }
    try {
      await addPayment.mutateAsync({
        saleId: debt.saleId,
        input: { amountUsd, method, notes: notes.trim() || null },
      });
      message.success(
        remaining <= 0.01
          ? `Deuda saldada: ${formatUsd(amountUsd)}`
          : `Abono registrado. Queda ${formatUsd(remaining)}`,
      );
      onClose();
    } catch (err) {
      message.error(getApiErrorMessage(err, 'No se pudo registrar el abono'));
    }
  };

  return (
    <Modal
      open={open}
      title={`Abonar a la venta #${debt?.saleId ?? ''}`}
      onCancel={onClose}
      onOk={submit}
      okText="Registrar abono"
      cancelText="Cancelar"
      confirmLoading={addPayment.isPending}
      okButtonProps={{ disabled: exceeds || amountUsd <= 0 || !method }}
      destroyOnHidden
    >
      <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Cliente">{debt?.clientName ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Total de la venta">
          {formatUsd(Number(debt?.totalUsd ?? 0))}
        </Descriptions.Item>
        <Descriptions.Item label="Abonado">
          {formatUsd(Number(debt?.paidUsd ?? 0))}
        </Descriptions.Item>
        <Descriptions.Item label="Saldo pendiente">
          <Text strong>{formatUsd(balance)}</Text>
        </Descriptions.Item>
      </Descriptions>

      <Form layout="vertical">
        <Form.Item
          label="Monto del abono (USD)"
          validateStatus={exceeds ? 'error' : undefined}
          help={exceeds ? `El abono no puede superar el saldo (${formatUsd(balance)})` : undefined}
        >
          <MoneyInput value={amountUsd} onChange={(v) => setAmountUsd(Number(v) || 0)} prefix="$" />
        </Form.Item>

        <Form.Item label="Método de pago">
          <Select
            style={{ width: '100%' }}
            placeholder="¿Cómo pagó?"
            value={method}
            onChange={setMethod}
            options={PAYMENT_METHODS_BY_CURRENCY.map((g) => ({
              label: g.currency === 'USD' ? 'USD' : 'Bolívares (Bs)',
              options: g.methods.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] })),
            }))}
          />
        </Form.Item>

        {isBs && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={
              amountBs != null
                ? `Cobra ${formatBs(amountBs)} (tasa USDT ${usdt.toLocaleString('es-VE')})`
                : 'No hay tasa USDT registrada para convertir a bolívares'
            }
          />
        )}

        <Form.Item label="Nota (opcional)">
          <Input
            maxLength={200}
            placeholder="Ej. abonó en el mostrador"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Form.Item>
      </Form>

      {!exceeds && amountUsd > 0 && (
        <Alert
          type={remaining <= 0.01 ? 'success' : 'warning'}
          showIcon
          message={
            remaining <= 0.01
              ? 'Con este abono la deuda queda saldada'
              : `Después de este abono quedarán ${formatUsd(remaining)}`
          }
        />
      )}
    </Modal>
  );
}
