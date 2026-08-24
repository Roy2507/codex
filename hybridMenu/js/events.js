import { syncAccessibility, trapFocus, getFocusable } from "./accessibility.js";
import { syncVisualState } from "./animation-controller.js";
import { handleMenuKeyboard } from "./keyboard-controller.js";

function emit(root, name, detail = {}) {
  root.dispatchEvent(new CustomEvent(`hybridmenu:${name}`, { bubbles: true, detail }));
}

export function bindEvents(root, state, options = {}) {
  let hoverTimer = null;
  const desktopQuery = () => window.matchMedia(`(max-width: ${options.breakpoint || 768}px)`).matches;

  const api = {
    root,
    state,
    openMenu(menuId) {
      state.setState({ activeMenuId: menuId, isMobileNavOpen: false });
      emit(root, "open", { menuId });
    },
    closeAll() {
      const current = state.getState().activeMenuId;
      state.setState({ activeMenuId: null });
      if (current) emit(root, "close", { menuId: current });
    },
    toggleMenu(menuId) {
      if (state.getState().activeMenuId === menuId) {
        api.closeAll();
      } else {
        api.openMenu(menuId);
      }
    },
    openMobile() {
      state.setState({ isMobileNavOpen: true, activeMenuId: null });
      emit(root, "mobileopen");
      window.setTimeout(() => getFocusable(root.querySelector(".hm-mobile")).at(0)?.focus(), 0);
    },
    closeMobile() {
      state.setState({ isMobileNavOpen: false });
      emit(root, "mobileclose");
      root.querySelector("[data-mobile-toggle]")?.focus();
    },
    toggleTheme() {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("hybridMenu.theme", next);
      state.setState({ currentTheme: next });
      emit(root, "themechange", { theme: next });
    }
  };

  state.subscribe((next) => {
    syncVisualState(root, next);
    syncAccessibility(root, next);
  });

  root.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-menu-trigger]");
    const mobileTrigger = event.target.closest("[data-mobile-trigger]");

    if (trigger) {
      api.toggleMenu(trigger.dataset.menuTrigger);
      return;
    }

    if (event.target.closest("[data-mobile-toggle]")) {
      api.openMobile();
      return;
    }

    if (event.target.closest("[data-mobile-close]") || event.target.closest("[data-mobile-overlay]")) {
      api.closeMobile();
      return;
    }

    if (event.target.closest("[data-theme-toggle]")) {
      api.toggleTheme();
      return;
    }

    if (mobileTrigger) {
      const id = mobileTrigger.dataset.mobileTrigger;
      state.update((current) => {
        const expanded = new Set(current.expandedMobileItems);
        expanded.has(id) ? expanded.delete(id) : expanded.add(id);
        return { ...current, expandedMobileItems: expanded };
      });
      return;
    }

    if (!event.target.closest("[data-menu-item]")) {
      api.closeAll();
    }
  });

  root.addEventListener("pointerover", (event) => {
    const menuItem = event.target.closest("[data-menu-item]");
    const panel = event.target.closest("[data-menu-panel]");
    const trigger = event.target.closest("[data-menu-trigger]");
    if (!menuItem || desktopQuery()) return;

    window.clearTimeout(hoverTimer);
    if (panel) return;

    if (!trigger) {
      api.closeAll();
      return;
    }

    hoverTimer = window.setTimeout(() => api.openMenu(trigger.dataset.menuTrigger), options.hoverDelay || 90);
  });

  root.addEventListener("pointerout", (event) => {
    const menuItem = event.target.closest("[data-menu-item]");
    if (!menuItem || desktopQuery()) return;
    if (event.relatedTarget && menuItem.contains(event.relatedTarget)) return;

    window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(api.closeAll, options.hoverDelay || 90);
  });

  document.addEventListener("keydown", (event) => {
    if (state.getState().isMobileNavOpen) {
      if (event.key === "Escape") api.closeMobile();
      trapFocus(event, root.querySelector(".hm-mobile"));
    }

    handleMenuKeyboard(event, api);
  });

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) api.closeAll();
  });

  window.addEventListener("scroll", () => {
    state.setState({ isHeaderScrolled: window.scrollY > 8 });
  }, { passive: true });

  window.addEventListener("resize", () => {
    const isMobile = window.matchMedia(`(max-width: ${options.breakpoint || 768}px)`).matches;
    state.setState({ isMobile, activeMenuId: isMobile ? null : state.getState().activeMenuId });
  });

  emit(root, "init");
  return api;
}
