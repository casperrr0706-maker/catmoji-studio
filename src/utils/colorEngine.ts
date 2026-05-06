import { getColor } from 'colorthief';

export interface ColorResult {
  rgb: [number, number, number];
  hex: string;
  isFallback: boolean;
}

const FALLBACK_COLOR: ColorResult = {
  rgb: [112, 128, 144],
  hex: '#708090',
  isFallback: true,
};

function isExtremeColor(rgb: [number, number, number]): boolean {
  const [r, g, b] = rgb;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 30 || brightness > 240;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export async function extractDominantColor(
  imageSource: HTMLImageElement
): Promise<ColorResult> {
  try {
    if (!imageSource.complete) {
      await new Promise<void>((resolve) => {
        imageSource.onload = () => resolve();
      });
    }

    const color = await getColor(imageSource);

    if (!color || isExtremeColor(color as [number, number, number])) {
      return FALLBACK_COLOR;
    }

    const c = color as [number, number, number];
    return {
      rgb: c,
      hex: rgbToHex(...c),
      isFallback: false,
    };
  } catch {
    console.warn('Color extraction failed, using fallback');
    return FALLBACK_COLOR;
  }
}

export function applyAccentColor(color: ColorResult): void {
  const root = document.documentElement;
  root.style.setProperty('--accent-color', color.hex);
  root.style.setProperty('--accent-color-rgb', color.rgb.join(', '));
  root.style.setProperty('--accent-color-bg', `${color.hex}15`);
  root.style.setProperty('--accent-color-light', `${color.hex}40`);
}
