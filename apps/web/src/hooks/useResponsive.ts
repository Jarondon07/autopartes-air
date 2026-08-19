import { Grid } from 'antd';

const { useBreakpoint } = Grid;

/**
 * Breakpoints de la app, derivados de los de Ant Design.
 *
 * Regla de corte: `md` (768px) separa "teléfono" de "escritorio". Por debajo se
 * usan tarjetas en vez de tablas, el menú lateral se vuelve un Drawer y los
 * modales ocupan casi toda la pantalla.
 */
export function useResponsive() {
  const screens = useBreakpoint();
  return {
    /** < 768px — teléfonos. */
    isMobile: !screens.md,
    /** < 992px — teléfonos y tablets en vertical. */
    isTablet: !screens.lg,
    /** < 576px — teléfonos pequeños. */
    isSmall: !screens.sm,
  };
}

/** Atajo para el caso más común. */
export function useIsMobile(): boolean {
  return useResponsive().isMobile;
}
