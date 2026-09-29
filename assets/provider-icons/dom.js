import {providerIconSvg} from './svg.js';

/** Create a sized SVG node with isolated gradient IDs; no stylesheet required. */
export function createProviderIcon(provider, options = {}) {
  const svg = providerIconSvg(provider, {...options, size: options.size ?? 24});
  if (!svg) return undefined;
  const document = options.document ?? globalThis.document;
  if (!document?.createElement) throw new Error('createProviderIcon requires a browser document');
  const template = document.createElement('template');
  template.innerHTML = svg;
  const icon = template.content.firstElementChild;
  if (!icon || icon.namespaceURI !== 'http://www.w3.org/2000/svg') return undefined;
  if (options.label) {
    icon.removeAttribute('aria-hidden');
    icon.setAttribute('role', 'img');
    icon.setAttribute('aria-label', options.label);
  }
  if (options.className) icon.setAttribute('class', options.className);
  return icon;
}

/** Replace a container's children after a valid icon is ready. */
export function mountProviderIcon(target, provider, options = {}) {
  const document = typeof target === 'string' ? options.document ?? globalThis.document : target?.ownerDocument;
  const container = typeof target === 'string' ? document?.querySelector(target) : target;
  if (!container) return undefined;
  const icon = createProviderIcon(provider, {...options, document});
  if (icon) container.replaceChildren(icon);
  return icon;
}
