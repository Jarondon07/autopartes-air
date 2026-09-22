import dayjs from 'dayjs';

/**
 * Formato de fecha y hora del sistema.
 *
 * La hora se muestra en 12 horas con `a.m.`/`p.m.`, que es como se lee la hora
 * en Venezuela. `dayjs` con `A`/`a` daría "AM"/"am", por eso el sufijo se arma
 * a mano. Toda la app pasa por aquí: si el formato cambia, cambia en un lugar.
 */

type DateInput = string | number | Date | dayjs.Dayjs;

/** Hora en 12 h: `02:45 p.m.` */
export function formatTime(value: DateInput): string {
  const d = dayjs(value);
  if (!d.isValid()) return '—';
  const hour = d.hour();
  const suffix = hour < 12 ? 'a.m.' : 'p.m.';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, '0')}:${d.format('mm')} ${suffix}`;
}

/** Solo la fecha: `19/08/2026` */
export function formatDate(value: DateInput): string {
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY') : '—';
}

/** Fecha y hora: `19/08/2026 02:45 p.m.` */
export function formatDateTime(value: DateInput): string {
  const d = dayjs(value);
  return d.isValid() ? `${d.format('DD/MM/YYYY')} ${formatTime(d)}` : '—';
}

/** Fecha corta y hora, para espacios estrechos: `19/08 02:45 p.m.` */
export function formatShortDateTime(value: DateInput): string {
  const d = dayjs(value);
  return d.isValid() ? `${d.format('DD/MM')} ${formatTime(d)}` : '—';
}
