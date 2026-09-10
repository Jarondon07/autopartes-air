import type { ChangeEvent, CSSProperties, ReactNode } from 'react';
import { Input, InputNumber } from 'antd';
import type { InputNumberProps } from 'antd';

/** Agrega separador de miles (.) a una cadena de solo dígitos. */
function thousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Formatea un número es-VE tipo monto con N decimales: 1.234,56. */
function formatAmount(n: number, decimals: number): string {
  const factor = 10 ** decimals;
  const raw = Math.round(Math.abs(n || 0) * factor);
  const s = String(raw).padStart(decimals + 1, '0'); // mínimo un dígito entero
  const dec = s.slice(-decimals);
  const int = thousands(s.slice(0, -decimals));
  return `${int},${dec}`;
}

interface AmountProps {
  value?: number;
  onChange?: (value: number) => void;
  /** Decimales del monto (2 = dinero, 4 = tasa). */
  decimals?: number;
  max?: number;
  disabled?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  style?: CSSProperties;
  /** Útil para normalizar el valor al salir del campo. */
  onBlur?: () => void;
}

/**
 * Input de monto tipo calculadora: los dígitos entran por la derecha.
 * Con 2 decimales: "" → 0,00 · "1" → 0,01 · "123" → 1,23 · "123456" → 1.234,56.
 */
function AmountInput({ value, onChange, decimals = 2, max, style, ...rest }: AmountProps) {
  const factor = 10 ** decimals;
  const display = formatAmount(value ?? 0, decimals);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    let n = digits ? Number.parseInt(digits, 10) / factor : 0;
    if (max != null && n > max) n = max;
    onChange?.(n);
  };

  return (
    <Input
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      style={{ width: '100%', ...style }}
      {...rest}
    />
  );
}

/** Monto en dinero (2 decimales, es-VE, tipo calculadora). Solo números. */
export function MoneyInput(props: AmountProps) {
  return <AmountInput {...props} decimals={2} />;
}

/** Porcentaje (2 decimales, es-VE, tipo calculadora), sufijo "%". Solo números. */
export function PercentInput({ max = 999.99, ...props }: AmountProps) {
  return <AmountInput suffix="%" max={max} {...props} decimals={2} />;
}

/** Tasa de cambio (2 decimales, es-VE, tipo calculadora). Solo números. */
export function RateInput(props: AmountProps) {
  return <AmountInput {...props} decimals={2} />;
}

/** Cantidad: entera, miles con ".". Solo números. */
export function QuantityInput(props: InputNumberProps) {
  return (
    <InputNumber
      min={0}
      precision={0}
      step={1}
      style={{ width: '100%' }}
      formatter={(v) => thousands(String(v ?? '').replace(/\D/g, ''))}
      parser={((v?: string) => (v ? v.replace(/\D/g, '') : '')) as InputNumberProps['parser']}
      {...props}
    />
  );
}
