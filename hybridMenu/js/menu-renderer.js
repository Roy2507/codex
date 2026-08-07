function text(value) {
  return value == null ? "" : String(value);
}

function createLink(item, className) {
  const link = document.createElement("a");
  link.className = className;
  link.href = item.href || "#";

  if (item.target === "_blank") {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  const label = document.createElement("span");
  label.className = className.includes("dropdown") ? "hm-dropdown__label" : className.includes("mega") ? "hm-mega__label" : "hm-mobile__label";
  label.textContent = text(item.label);
  link.append(label);

  if (item.description) {
    const description = document.createElement("span");
    description.className = className.includes("dropdown") ? "hm-dropdown__description" : className.includes("mega") ? "hm-mega__description" : "hm-mobile__description";
    description.textContent = text(item.description);
    link.append(description);
  }

  return link;
}

function createTrigger(item) {
  const button = document.createElement("button");
  button.className = "hm-nav__trigger";
  button.type = "button";
  button.id = `hm-trigger-${item.id}`;
  button.dataset.menuTrigger = item.id;
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-haspopup", item.type === "mega" ? "dialog" : "menu");
  button.setAttribute("aria-controls", `hm-panel-${item.id}`);

  const label = document.createElement("span");
  label.textContent = text(item.label);
  const caret = document.createElement("span");
  caret.className = "hm-caret";
  caret.setAttribute("aria-hidden", "true");

  button.append(label, caret);
  return button;
}

function createThemeIcon(type) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("hm-theme-icon", `hm-theme-icon--${type}`);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");

  if (type === "sun") {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "4");
    svg.append(circle);

    ["12 2 12 5", "12 19 12 22", "2 12 5 12", "19 12 22 12", "4.22 4.22 6.34 6.34", "17.66 17.66 19.78 19.78", "4.22 19.78 6.34 17.66", "17.66 6.34 19.78 4.22"].forEach((points) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      const [x1, y1, x2, y2] = points.split(" ");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      svg.append(line);
    });
  } else {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z");
    svg.append(path);
  }

  return svg;
}

function renderDropdown(item) {
  const panel = document.createElement("div");
  panel.className = "hm-dropdown";
  panel.id = `hm-panel-${item.id}`;
  panel.dataset.menuPanel = item.id;
  panel.setAttribute("role", "menu");
  panel.setAttribute("aria-labelledby", `hm-trigger-${item.id}`);

  item.children?.forEach((child) => {
    const link = createLink(child, "hm-dropdown__link");
    link.setAttribute("role", "menuitem");
    panel.append(link);
  });

  return panel;
}

function renderMega(item) {
  const panel = document.createElement("div");
  panel.className = "hm-mega";
  panel.id = `hm-panel-${item.id}`;
  panel.dataset.menuPanel = item.id;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-labelledby", `hm-trigger-${item.id}`);

  const columns = document.createElement("div");
  columns.className = "hm-mega__columns";

  item.columns?.forEach((column) => {
    const section = document.createElement("section");
    const title = document.createElement("h2");
    const list = document.createElement("ul");
    title.className = "hm-mega__title";
    title.textContent = text(column.title);
    list.className = "hm-mega__list";

    column.items?.forEach((entry) => {
      const row = document.createElement("li");
      row.append(createLink(entry, "hm-mega__link"));
      list.append(row);
    });

    section.append(title, list);
    columns.append(section);
  });

  panel.append(columns);

  if (item.featured) {
    const featured = document.createElement("aside");
    featured.className = "hm-mega__featured";
    const title = document.createElement("h3");
    const copy = document.createElement("p");
    const link = document.createElement("a");
    title.textContent = text(item.featured.title);
    copy.textContent = text(item.featured.description);
    link.href = item.featured.href || "#";
    link.textContent = "Explore";
    featured.append(title, copy, link);
    panel.append(featured);
  }

  return panel;
}

function renderDesktopItem(item) {
  const wrapper = document.createElement("div");
  wrapper.className = "hm-nav__item";
  wrapper.dataset.menuItem = item.id;

  if (item.type === "link") {
    const link = document.createElement("a");
    link.className = "hm-nav__link";
    link.href = item.href || "#";
    link.textContent = text(item.label);
    wrapper.append(link);
    return wrapper;
  }

  wrapper.append(createTrigger(item));
  wrapper.append(item.type === "mega" ? renderMega(item) : renderDropdown(item));
  return wrapper;
}

function renderActions(actions) {
  const actionsWrap = document.createElement("div");
  actionsWrap.className = "hm-actions";

  actions?.forEach((action) => {
    const element = action.type === "theme-toggle" ? document.createElement("button") : document.createElement("a");
    element.className = action.type === "theme-toggle" ? "hm-icon-button" : `hm-action${action.variant === "primary" ? " hm-action--primary" : ""}`;

    if (action.type === "theme-toggle") {
      element.type = "button";
      element.dataset.themeToggle = "true";
      element.setAttribute("aria-label", action.label || "Toggle theme");
      element.append(createThemeIcon("sun"), createThemeIcon("moon"));
    } else {
      element.href = action.href || "#";
      element.textContent = text(action.label);
    }

    actionsWrap.append(element);
  });

  return actionsWrap;
}

function renderMobileItem(item) {
  const wrapper = document.createElement("div");
  wrapper.className = "hm-mobile__item";
  wrapper.dataset.mobileItem = item.id;

  if (item.type === "link") {
    wrapper.append(createLink(item, "hm-mobile__link"));
    return wrapper;
  }

  const trigger = document.createElement("button");
  trigger.className = "hm-mobile__trigger";
  trigger.type = "button";
  trigger.dataset.mobileTrigger = item.id;
  trigger.setAttribute("aria-expanded", "false");
  const triggerLabel = document.createElement("span");
  triggerLabel.textContent = text(item.label);
  const triggerCaret = document.createElement("span");
  triggerCaret.className = "hm-caret";
  triggerCaret.setAttribute("aria-hidden", "true");
  trigger.append(triggerLabel, triggerCaret);

  const panel = document.createElement("div");
  panel.className = "hm-mobile__panel";
  panel.id = `hm-mobile-panel-${item.id}`;

  const entries = item.type === "mega" ? item.columns?.flatMap((column) => column.items || []) : item.children || [];
  entries?.forEach((entry) => panel.append(createLink(entry, "hm-mobile__link")));

  wrapper.append(trigger, panel);
  return wrapper;
}

export function renderMenu(container, config) {
  const header = document.createElement("header");
  header.className = "hm-header";
  header.dataset.hybridMenu = "true";

  const inner = document.createElement("div");
  inner.className = "hm-header__inner";

  const brand = document.createElement("a");
  brand.className = "hm-brand";
  brand.href = config.brand?.href || "#";
  const brandMark = document.createElement("span");
  brandMark.className = "hm-brand__mark";
  brandMark.setAttribute("aria-hidden", "true");
  brandMark.textContent = "H";
  const brandLabel = document.createElement("span");
  brandLabel.textContent = text(config.brand?.label || "HybridMenu");
  brand.append(brandMark, brandLabel);

  const nav = document.createElement("nav");
  nav.className = "hm-nav";
  nav.setAttribute("aria-label", "Primary");
  config.navigation?.forEach((item) => nav.append(renderDesktopItem(item)));

  const mobileToggle = document.createElement("button");
  mobileToggle.className = "hm-icon-button hm-mobile-toggle";
  mobileToggle.type = "button";
  mobileToggle.dataset.mobileToggle = "true";
  mobileToggle.setAttribute("aria-label", "Open menu");
  mobileToggle.setAttribute("aria-expanded", "false");
  mobileToggle.setAttribute("aria-controls", "hm-mobile-nav");
  const mobileIcon = document.createElement("span");
  mobileIcon.className = "hm-menu-icon";
  mobileIcon.setAttribute("aria-hidden", "true");
  mobileToggle.append(mobileIcon);

  inner.append(brand, nav, renderActions(config.actions), mobileToggle);
  header.append(inner);

  const overlay = document.createElement("button");
  overlay.className = "hm-overlay";
  overlay.type = "button";
  overlay.dataset.mobileOverlay = "true";
  overlay.setAttribute("aria-label", "Close menu");

  const mobile = document.createElement("aside");
  mobile.className = "hm-mobile";
  mobile.id = "hm-mobile-nav";
  mobile.setAttribute("aria-label", "Mobile navigation");
  mobile.setAttribute("aria-hidden", "true");

  const mobileHeader = document.createElement("div");
  mobileHeader.className = "hm-mobile__header";
  const mobileTitle = document.createElement("strong");
  mobileTitle.textContent = text(config.brand?.label || "HybridMenu");
  const close = document.createElement("button");
  close.className = "hm-icon-button";
  close.type = "button";
  close.dataset.mobileClose = "true";
  close.setAttribute("aria-label", "Close menu");
  close.textContent = "X";
  mobileHeader.append(mobileTitle, close);

  const mobileContent = document.createElement("nav");
  mobileContent.className = "hm-mobile__content";
  mobileContent.setAttribute("aria-label", "Mobile primary");
  config.navigation?.forEach((item) => mobileContent.append(renderMobileItem(item)));

  const mobileActions = document.createElement("div");
  mobileActions.className = "hm-mobile__actions";
  renderActions(config.actions).childNodes.forEach((node) => mobileActions.append(node.cloneNode(true)));

  mobile.append(mobileHeader, mobileContent, mobileActions);

  container.replaceChildren(header, overlay, mobile);

  return {
    header,
    overlay,
    mobile,
    nav
  };
}
