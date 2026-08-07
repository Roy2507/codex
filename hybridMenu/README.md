# HybridMenu

HybridMenu is a responsive, JSON-driven navigation demo. It includes a sticky header, traditional dropdowns, a mega menu, mobile drawer navigation, keyboard controls, accessible state syncing, animation, and light/dark themes.

## Run

Use a local web server because the demo loads `data/menu.json` with `fetch()` and uses ES modules.

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/hybridMenu/
```

## Files

```text
hybridMenu/
├── index.html
├── data/menu.json
├── css/
├── js/
└── docs/
```

## Public API

After initialization, the page exposes `window.HybridMenu`:

```text
HybridMenu.open(menuId)
HybridMenu.close()
HybridMenu.closeAll()
HybridMenu.toggleMobile()
HybridMenu.setTheme(theme)
HybridMenu.getState()
HybridMenu.destroy()
```

## Data

Edit `data/menu.json` to change the brand, navigation items, actions, and settings. Supported navigation item types are `link`, `dropdown`, and `mega`.
