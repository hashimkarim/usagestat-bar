import type {SvgOptions} from './svg.js';
export interface DomIconOptions extends SvgOptions {
  /** Accessible name for a standalone icon; otherwise decorative. */
  label?: string;
  className?: string;
  /** Defaults to the target's ownerDocument or the current browser document. */
  document?: Document;
}
/** Intrinsic height defaults to 24px; width follows the original aspect ratio. */
export function createProviderIcon(provider: string, options?: DomIconOptions): SVGSVGElement | undefined;
/** Leaves the container unchanged when the provider/artwork is unavailable. */
export function mountProviderIcon(target: string | Element, provider: string, options?: DomIconOptions): SVGSVGElement | undefined;
