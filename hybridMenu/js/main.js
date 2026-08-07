import { getMenuSource, loadMenuConfig } from "./menu-config.js";
import { renderMenu } from "./menu-renderer.js";
import { createState } from "./state-manager.js";
import { bindEvents } from "./events.js";

async function initHybridMenu(container) {
  const config = await loadMenuConfig(getMenuSource(container));
  const savedTheme = localStorage.getItem("hybridMenu.theme");
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const theme = savedTheme || config.settings?.theme || systemTheme;
  document.documentElement.dataset.theme = theme;

  renderMenu(container, config);

  const state = createState({
    currentTheme: theme,
    isMobile: window.matchMedia(`(max-width: ${config.settings?.breakpoint || 768}px)`).matches
  });

  const api = bindEvents(container, state, config.settings);
  state.setState({});

  window.HybridMenu = {
    init: initHybridMenu,
    open: api.openMenu,
    close: api.closeAll,
    closeAll: api.closeAll,
    toggleMobile() {
      state.getState().isMobileNavOpen ? api.closeMobile() : api.openMobile();
    },
    setTheme(nextTheme) {
      document.documentElement.dataset.theme = nextTheme;
      localStorage.setItem("hybridMenu.theme", nextTheme);
      state.setState({ currentTheme: nextTheme });
    },
    getState: state.getState,
    destroy() {
      container.replaceChildren();
    }
  };
}

document.querySelectorAll("[data-menu-source]").forEach((container) => {
  initHybridMenu(container).catch((error) => {
    console.error(error);
    container.textContent = "HybridMenu failed to load.";
  });
});
