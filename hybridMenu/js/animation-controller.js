function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getPanelPosition(menuItem, panel) {
  const viewportPadding = 16;
  const viewportWidth = document.documentElement.clientWidth;
  const itemRect = menuItem.getBoundingClientRect();
  const maxPanelWidth = Math.max(viewportWidth - viewportPadding * 2, 0);

  panel.style.maxWidth = `${maxPanelWidth}px`;

  const panelWidth = panel.getBoundingClientRect().width;
  const isMega = panel.classList.contains("hm-mega");
  const startLeft = itemRect.left;
  const centerLeft = itemRect.left + itemRect.width / 2 - panelWidth / 2;
  const endLeft = itemRect.right - panelWidth;
  const minLeft = viewportPadding;
  const maxLeft = Math.max(viewportWidth - viewportPadding - panelWidth, viewportPadding);
  const candidates = isMega ? [centerLeft, startLeft, endLeft] : [startLeft, endLeft, centerLeft];
  const preferredLeft = candidates.find((left) => left >= minLeft && left <= maxLeft) ?? candidates[0];
  const viewportLeft = clamp(preferredLeft, minLeft, maxLeft);
  const localLeft = viewportLeft - itemRect.left;

  return {
    left: Math.round(localLeft),
    align: Math.abs(viewportLeft - centerLeft) < 1 ? "center" : viewportLeft < itemRect.left ? "end" : "start"
  };
}

function positionOpenPanels(root) {
  root.querySelectorAll("[data-menu-item].is-open").forEach((item) => {
    const panel = item.querySelector("[data-menu-panel]");
    if (!panel) return;

    const position = getPanelPosition(item, panel);
    panel.style.left = `${position.left}px`;
    panel.style.right = "auto";
    panel.dataset.panelAlign = position.align;
  });
}

export function syncVisualState(root, state) {
  const header = root.querySelector(".hm-header");
  const overlay = root.querySelector(".hm-overlay");
  const mobile = root.querySelector(".hm-mobile");

  header?.classList.toggle("is-scrolled", state.isHeaderScrolled);
  header?.classList.toggle("is-menu-open", Boolean(state.activeMenuId) || state.isMobileNavOpen);
  overlay?.classList.toggle("is-open", state.isMobileNavOpen);
  mobile?.classList.toggle("is-open", state.isMobileNavOpen);
  document.body.classList.toggle("hm-scroll-lock", state.isMobileNavOpen);

  root.querySelectorAll("[data-menu-item]").forEach((item) => {
    item.classList.toggle("is-open", item.dataset.menuItem === state.activeMenuId);
  });

  positionOpenPanels(root);

  root.querySelectorAll("[data-mobile-item]").forEach((item) => {
    item.classList.toggle("is-expanded", state.expandedMobileItems.has(item.dataset.mobileItem));
  });
}
