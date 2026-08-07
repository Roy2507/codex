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

  root.querySelectorAll("[data-mobile-item]").forEach((item) => {
    item.classList.toggle("is-expanded", state.expandedMobileItems.has(item.dataset.mobileItem));
  });
}
