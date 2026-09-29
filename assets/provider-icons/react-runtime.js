'use client';
import {createElement, forwardRef, useId} from 'react';
import {renderArtwork} from './render.js';

const camelCase = (name) => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
function rootAttributes(svg) {
  const result = {};
  for (const [, name, value] of svg.slice(0, svg.indexOf('>')).matchAll(/([\w:-]+)="([^"]*)"/g)) {
    if (name === 'style') {
      result.style = Object.fromEntries(value.split(';').filter(Boolean).map(declaration => {
        const [key, value] = declaration.split(':');
        return [camelCase(key.trim()), value.trim()];
      }));
    } else {
      result[name.startsWith('aria-') ? name : camelCase(name)] = value;
    }
  }
  return result;
}

export function createReactIcon(render, displayName) {
  const Component = forwardRef(function Icon({size = 24, mode = 'monochrome', prefix, style, children: _children, dangerouslySetInnerHTML: _html, ...props}, ref) {
    const id = useId();
    const instancePrefix = prefix ?? `ad-react-${Array.from(id, char => char.codePointAt(0).toString(16)).join('-')}`;
    const {provider, variant, artwork, ...attributes} = props;
    const svg = render(provider, {size, style: mode, prefix: instancePrefix, variant, artwork});
    if (!svg) return null;
    const original = rootAttributes(svg);
    const labelled = Boolean(attributes['aria-label'] || attributes['aria-labelledby']);
    return createElement('svg', {
      ...original,
      ...attributes,
      ref,
      role: attributes.role ?? (labelled ? 'img' : undefined),
      'aria-hidden': attributes['aria-hidden'] ?? (labelled ? undefined : true),
      style: {...original.style, verticalAlign: 'middle', flexShrink: 0, ...style},
      dangerouslySetInnerHTML: {__html: svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'))},
    });
  });
  Component.displayName = displayName;
  return Component;
}

export function createNamedIcon(name, artworks, theme = {}) {
  const create = (artwork, style) => createReactIcon((_provider, options) =>
    renderArtwork(artworks, {...options, artwork, style: style ?? options.style}), `${name}.${artwork}${style === 'color' ? '.Color' : ''}`);
  const Icon = create('icon');
  Icon.displayName = name;
  Icon.Color = create('icon', 'color');
  Icon.Avatar = create('avatar');
  if (artworks.text) {
    Icon.Text = create('text');
    Icon.TextColor = create('text', 'color');
    Icon.Combine = create('combine');
  }
  if (artworks.brand) {
    Icon.Brand = create('brand');
    Icon.BrandColor = create('brand', 'color');
  }
  if (artworks['text-cn']) {
    Icon.TextCn = create('text-cn');
    Icon.TextCnColor = create('text-cn', 'color');
  }
  const palette = Object.freeze([...(theme.colourTheme ?? [])]);
  Object.defineProperties(Icon, {
    primaryColour: {value: theme.primaryColour ?? undefined, enumerable: true},
    colorPrimary: {value: theme.primaryColour ?? undefined, enumerable: true},
    colourTheme: {value: palette, enumerable: true},
    colorTheme: {value: palette, enumerable: true},
  });
  return Icon;
}
