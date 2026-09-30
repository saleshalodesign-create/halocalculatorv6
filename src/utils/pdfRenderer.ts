import * as pdfjsLib from 'pdfjs-dist';

// Polyfills for newer ECMAScript features required by pdfjs-dist
if (typeof (Uint8Array.prototype as any).toHex !== 'function') {
  (Uint8Array.prototype as any).toHex = function () {
    return Array.from(this as any)
      .map((b: any) => Number(b).toString(16).padStart(2, '0'))
      .join('');
  };
}

if (typeof (Promise as any).try !== 'function') {
  (Promise as any).try = function (fn: any, ...args: any[]) {
    return new Promise(resolve => resolve(fn(...args)));
  };
}

if (typeof (Map.prototype as any).getOrInsertComputed !== 'function') {
  (Map.prototype as any).getOrInsertComputed = function (key: any, callback: any) {
    if (this.has(key)) return this.get(key);
    const value = callback(key);
    this.set(key, value);
    return value;
  };
}

if (typeof (Map.prototype as any).getOrInsert !== 'function') {
  (Map.prototype as any).getOrInsert = function (key: any, defaultValue: any) {
    if (this.has(key)) return this.get(key);
    this.set(key, defaultValue);
    return defaultValue;
  };
}

// Set up worker
if (typeof window !== 'undefined') {
  try {
    const version = pdfjsLib.version || '4.10.38';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
  } catch (err) {
    console.warn('Worker configuration notice:', err);
  }
}

export interface RenderPageResult {
  width: number;
  height: number;
  pageIndex: number;
  totalPages: number;
}

export interface ExtractedTextItem {
  id: string;
  text: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  fontSizePt: number;
  fontFamily: string;
  fontDisplayName: string;
  isBold: boolean;
  isItalic: boolean;
  textColor: string;
}

/**
 * Samples the dominant text color from the rendered HTML5 canvas at the text coordinates
 */
export const sampleColorFromCanvas = (
  canvas: HTMLCanvasElement,
  xPercent: number,
  yPercent: number,
  widthPercent: number,
  heightPercent: number
): string => {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#000000';

    const sx = Math.max(0, Math.floor(xPercent * canvas.width));
    const sy = Math.max(0, Math.floor(yPercent * canvas.height));
    const sw = Math.max(2, Math.min(canvas.width - sx, Math.floor(widthPercent * canvas.width)));
    const sh = Math.max(2, Math.min(canvas.height - sy, Math.floor(heightPercent * canvas.height)));

    const imgData = ctx.getImageData(sx, sy, sw, sh);
    const data = imgData.data;

    let minBrightness = 255;
    let bestR = 0, bestG = 0, bestB = 0;
    let darkCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 50) continue; // transparent
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      // Search for text pixels (darker than white paper background)
      if (brightness < 200) {
        darkCount++;
        if (brightness < minBrightness) {
          minBrightness = brightness;
          bestR = r;
          bestG = g;
          bestB = b;
        }
      }
    }

    if (darkCount > 0) {
      const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
      return `#${hex(bestR)}${hex(bestG)}${hex(bestB)}`;
    }
  } catch (err) {
    console.warn('Could not sample color from canvas', err);
  }
  return '#000000';
};

/**
 * Loads a PDF Document from ArrayBuffer or Uint8Array
 */
export const loadPdfDocument = async (bytes: ArrayBuffer | Uint8Array) => {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const version = pdfjsLib.version || '4.10.38';
  const loadingTask = pdfjsLib.getDocument({
    data: data.slice(0), // copy buffer
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/standard_fonts/`,
  });
  return await loadingTask.promise;
};

/**
 * Renders a specific page of a PDF onto a provided HTML5 canvas element
 */
export const renderPdfPageToCanvas = async (
  pdfDoc: any,
  pageNumber: number, // 1-indexed
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<RenderPageResult> => {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  // Handle High-DPI screens
  const outputScale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context for canvas');

  ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  return {
    width: viewport.width,
    height: viewport.height,
    pageIndex: pageNumber - 1,
    totalPages: pdfDoc.numPages,
  };
};

/**
 * Extracts text items with their precise relative positions and font styles from a PDF page
 */
export const extractTextFromPage = async (
  pdfDoc: any,
  pageNumber: number,
  canvas?: HTMLCanvasElement | null
): Promise<ExtractedTextItem[]> => {
  try {
    const page = await pdfDoc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    const items: ExtractedTextItem[] = [];
    let idx = 0;
    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;

      // In PDF coordinates: item.transform = [scaleX, skewY, skewX, scaleY, tx, ty]
      const tx = item.transform[4];
      const ty = item.transform[5];
      const fontHeight = Math.max(8, Math.abs(item.transform[3]) || item.height || 12);
      const textWidth = Math.max(8, item.width || 30);

      // Top edge in screen coordinates (0 is top of page)
      const topPx = viewport.height - (ty + fontHeight * 0.9);
      const xPercent = Math.max(0, Math.min(0.99, tx / viewport.width));
      const yPercent = Math.max(0, Math.min(0.99, topPx / viewport.height));
      const widthPercent = Math.max(0.012, Math.min(0.99, (textWidth * 1.05) / viewport.width));
      const heightPercent = Math.max(0.012, Math.min(0.2, (fontHeight * 1.25) / viewport.height));

      // Font Style & Family Detection
      const fontName = item.fontName || '';
      const fontLower = fontName.toLowerCase();
      const style = textContent.styles ? textContent.styles[item.fontName] : null;
      const styleFamily = (style?.fontFamily || '').toLowerCase();

      // Detect font weight
      const isBold =
        fontLower.includes('bold') ||
        fontLower.includes('black') ||
        fontLower.includes('heavy') ||
        fontLower.includes('medium') ||
        fontLower.includes('bolder') ||
        fontLower.includes('-b') ||
        fontLower.includes('w7') ||
        fontLower.includes('w8') ||
        fontLower.includes('w9');

      // Detect font italic slant
      const isItalic =
        fontLower.includes('italic') ||
        fontLower.includes('oblique') ||
        fontLower.includes('slanted') ||
        (Array.isArray(item.transform) &&
          (Math.abs(item.transform[1]) > 0.05 || Math.abs(item.transform[2]) > 0.05));

      // Detect matching font family
      let fontFamily = 'Arial, "Segoe UI", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
      let fontDisplayName = 'Arial / Sans-Serif';

      if (
        styleFamily.includes('monospace') ||
        fontLower.includes('courier') ||
        fontLower.includes('mono') ||
        fontLower.includes('consolas') ||
        fontLower.includes('menlo')
      ) {
        fontFamily = '"Courier New", Courier, monospace';
        fontDisplayName = 'Courier / Monospace';
      } else if (
        styleFamily.includes('serif') ||
        fontLower.includes('times') ||
        fontLower.includes('georgia') ||
        fontLower.includes('roman') ||
        fontLower.includes('song') ||
        fontLower.includes('sun') ||
        fontLower.includes('garamond')
      ) {
        fontFamily = '"Times New Roman", Times, Georgia, "Songti SC", SimSun, serif';
        fontDisplayName = 'Times New Roman / Serif';
      } else if (
        fontLower.includes('calibri') ||
        fontLower.includes('roboto') ||
        fontLower.includes('tahoma') ||
        fontLower.includes('verdana')
      ) {
        const cleanName = fontName.split(/[-+_,]/)[0] || 'Arial';
        fontFamily = `"${cleanName}", Arial, "Segoe UI", sans-serif`;
        fontDisplayName = `${cleanName} / Sans-Serif`;
      }

      // Sample text color from rendered canvas if provided
      let textColor = '#000000';
      if (canvas) {
        textColor = sampleColorFromCanvas(canvas, xPercent, yPercent, widthPercent, heightPercent);
      }

      items.push({
        id: `txt-${pageNumber}-${idx++}`,
        text: item.str,
        xPercent,
        yPercent,
        widthPercent,
        heightPercent,
        fontSizePt: Math.round(fontHeight),
        fontFamily,
        fontDisplayName,
        isBold,
        isItalic,
        textColor,
      });
    }
    return items;
  } catch (err) {
    console.warn('Could not extract text from page:', err);
    return [];
  }
};
