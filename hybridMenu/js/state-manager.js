export function createState(initial = {}) {
  const listeners = new Set();
  let state = {
    activeMenuId: null,
    isMobile: false,
    isMobileNavOpen: false,
    isHeaderScrolled: false,
    expandedMobileItems: new Set(),
    currentTheme: "light",
    ...initial
  };

  function notify(previous) {
    listeners.forEach((listener) => listener(state, previous));
  }

  return {
    getState() {
      return state;
    },
    setState(nextState) {
      const previous = state;
      state = { ...state, ...nextState };
      notify(previous);
    },
    update(updater) {
      const previous = state;
      state = updater(state);
      notify(previous);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
