import { hrefFor, type Route } from './router';

export function navigateTo(route: Route): void {
  const target = hrefFor(route);
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash = target.slice(1);
}
