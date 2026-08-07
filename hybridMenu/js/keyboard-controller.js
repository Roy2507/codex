import { getFocusable } from "./accessibility.js";

function moveFocus(items, current, offset) {
  const index = items.indexOf(current);
  const next = items[(index + offset + items.length) % items.length];
  next?.focus();
}

export function handleMenuKeyboard(event, api) {
  const trigger = event.target.closest("[data-menu-trigger]");
  const panel = event.target.closest("[data-menu-panel]");
  const topItems = [...api.root.querySelectorAll(".hm-nav__link, .hm-nav__trigger")];

  if (event.key === "Escape") {
    const activeMenuId = api.state.getState().activeMenuId;
    api.closeAll();
    api.root.querySelector(`[data-menu-trigger="${activeMenuId}"]`)?.focus();
    return;
  }

  if (trigger && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    api.toggleMenu(trigger.dataset.menuTrigger);
    return;
  }

  if (trigger && event.key === "ArrowDown") {
    event.preventDefault();
    api.openMenu(trigger.dataset.menuTrigger);
    const menu = api.root.querySelector(`[data-menu-panel="${trigger.dataset.menuTrigger}"]`);
    getFocusable(menu).at(0)?.focus();
    return;
  }

  if (topItems.includes(event.target) && event.key === "ArrowRight") {
    event.preventDefault();
    moveFocus(topItems, event.target, 1);
    return;
  }

  if (topItems.includes(event.target) && event.key === "ArrowLeft") {
    event.preventDefault();
    moveFocus(topItems, event.target, -1);
    return;
  }

  if (panel) {
    const items = getFocusable(panel);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(items, event.target, 1);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(items, event.target, -1);
    }

    if (event.key === "Home") {
      event.preventDefault();
      items.at(0)?.focus();
    }

    if (event.key === "End") {
      event.preventDefault();
      items.at(-1)?.focus();
    }
  }
}
