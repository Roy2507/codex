# JSON Schema

The demo uses `data/menu.json` as its source.

## Root

```text
brand: object
settings: object
navigation: array
actions: array
```

## Brand

```text
label: string
href: string
```

## Settings

```text
sticky: boolean
breakpoint: number
theme: "light" | "dark"
interactionMode: "click" | "hover" | "hybrid"
hoverDelay: number
```

## Navigation Item

```text
id: string
type: "link" | "dropdown" | "mega"
label: string
href: string
children: array
columns: array
featured: object
```

## Dropdown

Dropdown items use `children`.

```text
children[].label: string
children[].href: string
children[].description: string
```

## Mega Menu

Mega menus use `columns`.

```text
columns[].title: string
columns[].items[].label: string
columns[].items[].href: string
columns[].items[].description: string
```

Optional featured block:

```text
featured.title: string
featured.description: string
featured.href: string
```
