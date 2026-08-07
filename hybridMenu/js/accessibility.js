export function getFocusable(container) {
  return [...container.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => element.offsetParent !== null || element === document.activeElement);
}

export function syncAccessibility(root, state) {
  root.querySelectorAll("[data-menu-trigger]").forEach((trigger) => {
    const isOpen = trigger.dataset.menuTrigger === state.activeMenuId;
    trigger.setAttribute("aria-expanded", String(isOpen));
  });

  root.querySelectorAll("[data-mobile-trigger]").forEach((trigger) => {
    const isExpanded = state.expandedMobileItems.has(trigger.dataset.mobileTrigger);
    trigger.setAttribute("aria-expanded", String(isExpanded));
  });

  const mobileToggle = root.querySelector("[data-mobile-toggle]");
  const mobile = root.querySelector(".hm-mobile");

  mobileToggle?.setAttribute("aria-expanded", String(state.isMobileNavOpen));
  mobileToggle?.setAttribute("aria-label", state.isMobileNavOpen ? "Close menu" : "Open menu");
  mobile?.setAttribute("aria-hidden", String(!state.isMobileNavOpen));
}

export function trapFocus(event, container) {
  if (event.key !== "Tab") return;

  const focusable = getFocusable(container);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  }

  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
