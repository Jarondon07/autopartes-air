import type { ThemeConfig } from 'antd';
import {
  BORDER_RADIUS,
  CARD_SHADOW,
  COLORS,
  FONT_FAMILY,
  FONT_SIZE_BASE,
  LAYOUT,
} from './tokens';

/**
 * Tema de Ant Design que replica el look & feel de AdminKit.
 * Todo el estilo visual (colores, tipografía, sombras, radios) se controla
 * desde aquí vía design tokens — no se usa Bootstrap ni SCSS.
 */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: COLORS.primary,
    colorSuccess: COLORS.success,
    colorWarning: COLORS.warning,
    colorError: COLORS.danger,
    colorInfo: COLORS.info,

    colorTextBase: COLORS.bodyText,
    colorBgLayout: COLORS.bodyBg,

    fontFamily: FONT_FAMILY,
    fontSize: FONT_SIZE_BASE,
    borderRadius: BORDER_RADIUS,

    boxShadow: CARD_SHADOW,
    boxShadowSecondary: CARD_SHADOW,
  },
  components: {
    Layout: {
      headerBg: COLORS.navbarBg,
      headerHeight: LAYOUT.headerHeight,
      headerPadding: '0 24px',
      bodyBg: COLORS.bodyBg,
      siderBg: COLORS.sidebarBg,
      footerBg: COLORS.navbarBg,
      footerPadding: '16px 24px',
    },
    Card: {
      // AdminKit: cards blancas SIN borde, separadas solo por sombra suave
      colorBorderSecondary: 'transparent',
      boxShadowTertiary: CARD_SHADOW,
      borderRadiusLG: BORDER_RADIUS,
      headerFontSize: 15,
    },
    Menu: {
      // Sidebar oscuro
      darkItemBg: COLORS.sidebarBg,
      darkSubMenuItemBg: COLORS.sidebarBg,
      darkPopupBg: COLORS.sidebarBg,
      darkItemColor: COLORS.sidebarText,
      darkItemHoverColor: COLORS.sidebarTextHover,
      darkItemSelectedColor: COLORS.sidebarTextActive,
      darkItemSelectedBg: 'rgba(59, 125, 221, 0.1)',
      itemMarginInline: 0,
      itemBorderRadius: 0,
    },
    Table: {
      cellPaddingBlock: 12,
      cellPaddingInline: 12,
      headerBg: '#f8f9fa',
      rowHoverBg: 'rgba(0, 0, 0, 0.0375)',
    },
    Button: {
      primaryShadow: 'none',
    },
    Statistic: {
      titleFontSize: 13,
    },
  },
};
