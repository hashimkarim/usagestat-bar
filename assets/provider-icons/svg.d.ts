import type {IconOptions, IconArtwork} from './index.js';
export type IconLayout = IconArtwork | 'combine' | 'avatar';
export interface SvgOptions extends Omit<IconOptions, 'artwork'> {
  artwork?: IconLayout;
  /** Height in pixels, with aspect ratio preserved. Omit to keep native dimensions. */
  size?: number;
  /** Automatically unique unless supplied. Pass a stable prefix for manually hydrated markup. */
  prefix?: string;
}
/** Reviewed static SVG. Missing artwork returns undefined. Combine needs a vector wordmark. */
export function providerIconSvg(provider: string, options?: SvgOptions): string | undefined;
