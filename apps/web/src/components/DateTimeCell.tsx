import { Typography } from 'antd';
import { formatDate, formatTime } from '../lib/datetime';

const { Text } = Typography;

interface Props {
  value?: string | number | Date | null;
}

/**
 * Fecha y hora en dos líneas, centradas: la fecha arriba y la hora debajo, más
 * pequeña y en gris.
 *
 * Es para las columnas "Fecha" de los listados. En una sola línea
 * (`19/08/2026 02:45 p.m.`) la columna se hace ancha y, en pantallas
 * estrechas, el navegador parte el texto donde le toca: la captura del bug
 * mostraba `p.m.` colgando solo en la línea siguiente. Partiéndolo nosotros,
 * el corte siempre cae en el mismo sitio y la fecha —que es lo que se busca—
 * queda destacada sobre la hora.
 *
 * Formatea a través de `lib/datetime` como todo lo demás: el formato sigue
 * definido en un solo lugar, esto solo decide cómo se dispone en pantalla.
 * No usar en fichas de detalle ni en las tarjetas del móvil, donde el valor va
 * alineado a la izquierda junto a su etiqueta.
 */
export function DateTimeCell({ value }: Props) {
  if (value == null) return <Text type="secondary">—</Text>;

  return (
    <div style={{ textAlign: 'center', lineHeight: 1.35 }}>
      <div>{formatDate(value)}</div>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {formatTime(value)}
      </Text>
    </div>
  );
}
