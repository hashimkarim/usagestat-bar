'use client';
import {providerIconSvg} from './svg.js';
import {createReactIcon} from './react-runtime.js';

/** Dynamic catalogue component. Named exports can be tree-shaken by bundlers. */
export const ProviderIcon = /* @__PURE__ */ createReactIcon(providerIconSvg, 'ProviderIcon');
