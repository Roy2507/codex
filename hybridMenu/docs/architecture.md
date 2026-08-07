# Architecture

HybridMenu separates data, rendering, state, interaction, and styling.

## Flow

```text
index.html
  -> js/main.js
  -> load data/menu.json
  -> render header, desktop nav, mobile nav
  -> create state manager
  -> bind events
  -> sync classes and ARIA from state
```

## Modules

- `menu-config.js`: loads JSON configuration.
- `menu-renderer.js`: creates DOM nodes from the configuration.
- `state-manager.js`: owns the current menu, mobile, scroll, and theme state.
- `events.js`: binds pointer, click, resize, scroll, and keyboard events.
- `keyboard-controller.js`: handles desktop and panel keyboard behavior.
- `accessibility.js`: syncs ARIA state and traps focus in the mobile drawer.
- `animation-controller.js`: maps state to visual classes.

## Styling

CSS is split by responsibility:

- `tokens.css`: design tokens.
- `base.css`: page and global styles.
- `header.css`: header and desktop nav.
- `dropdown.css`: traditional dropdown.
- `mega-menu.css`: mega menu.
- `mobile-nav.css`: drawer navigation.
- `themes.css`: dark theme overrides.
- `utilities.css`: accessibility and reduced-motion helpers.
