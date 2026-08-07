# API

HybridMenu exposes a small browser API at `window.HybridMenu`.

## Methods

```text
HybridMenu.open(menuId)
```

Opens a desktop dropdown or mega menu by id.

```text
HybridMenu.close()
HybridMenu.closeAll()
```

Closes the active desktop menu.

```text
HybridMenu.toggleMobile()
```

Opens or closes the mobile drawer.

```text
HybridMenu.setTheme("light" | "dark")
```

Sets the theme and stores it in `localStorage`.

```text
HybridMenu.getState()
```

Returns the current state object.

```text
HybridMenu.destroy()
```

Clears the rendered menu container.

## Events

The root menu container dispatches:

```text
hybridmenu:init
hybridmenu:open
hybridmenu:close
hybridmenu:mobileopen
hybridmenu:mobileclose
hybridmenu:themechange
```
