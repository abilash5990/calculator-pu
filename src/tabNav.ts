import type { TabId } from "./registry";

let navigate: ((tab: TabId) => void) | null = null;

export function registerTabNavigation(fn: (tab: TabId) => void) {
  navigate = fn;
}

export function goToTab(tab: TabId) {
  navigate?.(tab);
}
