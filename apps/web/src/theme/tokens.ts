/**
 * Tokens crudos extraídos de AdminKit (src/scss/1-variables/_app.scss).
 * Fuente de verdad de la identidad visual; se reutilizan tanto en el tema de
 * Ant Design como en los componentes de layout (sidebar, topbar).
 */

// Colores de marca / semánticos
export const COLORS = {
  primary: '#3B7DDD',
  success: '#1cbb8c',
  warning: '#fcb92c',
  danger: '#dc3545',
  info: '#17a2b8',

  // Fondos y texto
  bodyBg: '#f5f7fb',
  bodyText: '#495057',
  headingText: '#000000',

  // Sidebar oscuro (slate)
  sidebarBg: '#222E3C',
  sidebarCtaBg: '#2B3947',
  sidebarText: 'rgba(233, 236, 239, 0.5)',
  sidebarTextHover: 'rgba(233, 236, 239, 0.75)',
  sidebarTextActive: '#e9ecef',
  sidebarHeader: '#ced4da',

  // Superficies
  cardBg: '#ffffff',
  navbarBg: '#ffffff',

  // Badge de icono en stat cards (azul muy claro)
  statIconBg: '#d7e3f4',
} as const;

// Métricas de layout
export const LAYOUT = {
  sidebarWidth: 260,
  sidebarCollapsedWidth: 80,
  headerHeight: 56,
} as const;

// Fuente y radios
export const FONT_FAMILY =
  "'Inter', 'Helvetica Neue', Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
export const FONT_SIZE_BASE = 14;
export const BORDER_RADIUS = 4;

// Sombra difusa suave característica de las cards de AdminKit
export const CARD_SHADOW = '0 0 0.875rem 0 rgba(0, 0, 0, 0.05)';
