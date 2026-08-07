export async function loadMenuConfig(source) {
  const response = await fetch(source);

  if (!response.ok) {
    throw new Error(`Unable to load menu config: ${response.status}`);
  }

  return response.json();
}

export function getMenuSource(container) {
  return container.dataset.menuSource || "./data/menu.json";
}
