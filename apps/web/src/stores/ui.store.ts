import { create } from 'zustand';

interface UiState {
  /** Sidebar colapsado en escritorio (equivale a la clase `.collapsed` de AdminKit). */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  /**
   * Menú lateral abierto en móvil. En pantallas chicas el sidebar no se colapsa:
   * desaparece y se muestra como Drawer sobre el contenido.
   */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}));
