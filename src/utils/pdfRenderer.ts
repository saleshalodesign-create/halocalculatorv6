import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

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

// Set up worker using local bundled Vite asset with jsdelivr fallback
if (typeof window !== 'undefined') {
  try {
    const version = pdfjsLib.version || '6.3.289';
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      pdfWorker || `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
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
  const version = pdfjsLib.version || '6.3.289';

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: data.slice(0), // copy buffer
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/standard_fonts/`,
    });
    return await loadingTask.promise;
  } catch (err) {
    console.warn('PDF load with worker/cMaps failed, trying minimal fallback:', err);
    try {
      const fallbackTask = pdfjsLib.getDocument({
        data: data.slice(0),
      });
      return await fallbackTask.promise;
    } catch (fallbackErr) {
      console.error('All PDF load attempts failed:', fallbackErr);
      throw fallbackErr;
    }
  }
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

  // Cancel any existing render task on this canvas to prevent collision
  if ((canvas as any)._renderTask) {
    try {
      (canvas as any)._renderTask.cancel();
    } catch {
      // ignore
    }
  }

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

  const renderTask = page.render(renderContext);
  (canvas as any)._renderTask = renderTask;

  try {
    await renderTask.promise;
  } catch (err: any) {
    if (err?.name === 'RenderingCancelledException') {
      // Render was superseded by a newer render task, normal behavior
      return {
        width: viewport.width,
        height: viewport.height,
        pageIndex: pageNumber - 1,
        totalPages: pdfDoc.numPages,
      };
    }
    throw err;
  } finally {
    (canvas as any)._renderTask = null;
  }

  return {
    width: viewport.width,
    height: viewport.height,
    pageIndex: pageNumber - 1,
    totalPages: pdfDoc.numPages,
  };
};

/**
 * Resolves the precise font family, display name, bold weight, and italic slant from PDF.js
 * to ensure that editing text NEVER changes or defaults the original font.
 */
export const resolvePdfFontInfo = (
  item: any,
  style: any,
  pageCommonObjs?: any
): {
  fontFamily: string;
  fontDisplayName: string;
  isBold: boolean;
  isItalic: boolean;
} => {
  let fontObj: any = null;
  try {
    if (pageCommonObjs && typeof pageCommonObjs.has === 'function' && pageCommonObjs.has(item.fontName)) {
      fontObj = pageCommonObjs.get(item.fontName);
    }
  } catch {
    // ignore
  }

  // Raw font name from fontObj, style, or item
  const rawFontName: string =
    fontObj?.name ||
    fontObj?.fallbackName ||
    style?.fontFamily ||
    item.fontName ||
    '';

  // Strip standard PDF 6-letter subset prefix (e.g. "BAAAAA+PlusJakartaSans-Bold" -> "PlusJakartaSans-Bold")
  const cleanName = rawFontName.replace(/^[A-Z]{6}\+/, '').trim();
  const lower = cleanName.toLowerCase();

  // Detect font weight (bold, black, heavy, semibold, w6, w7, w8, w9)
  const isBold =
    !!fontObj?.bold ||
    lower.includes('bold') ||
    lower.includes('black') ||
    lower.includes('heavy') ||
    lower.includes('semibold') ||
    lower.includes('demi') ||
    lower.includes('w7') ||
    lower.includes('w8') ||
    lower.includes('w9') ||
    lower.includes('-b') ||
    lower.endsWith('b');

  // Detect font italic / oblique slant
  const isItalic =
    !!fontObj?.italic ||
    lower.includes('italic') ||
    lower.includes('oblique') ||
    lower.includes('slanted') ||
    (Array.isArray(item.transform) &&
      (Math.abs(item.transform[1]) > 0.05 || Math.abs(item.transform[2]) > 0.05));

  // Clean the family name by stripping weight and style suffixes
  let baseFamily = cleanName
    .replace(/[-_]?(Bold|Black|Heavy|SemiBold|DemiBold|Medium|Regular|Italic|Oblique|Roman|Light|Thin|Book|PSMT|PS|MT)$/gi, '')
    .replace(/[-_]?(Bold|Black|Heavy|SemiBold|DemiBold|Medium|Regular|Italic|Oblique|Roman|Light|Thin|Book|PSMT|PS|MT)$/gi, '')
    .replace(/[-_]/g, ' ')
    .trim();

  // Add space between CamelCase words if needed (e.g. "PlusJakartaSans" -> "Plus Jakarta Sans")
  if (baseFamily && !baseFamily.includes(' ')) {
    baseFamily = baseFamily.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  const baseLower = baseFamily.toLowerCase();

  let fontFamily = '';
  let fontDisplayName = baseFamily || 'Original Document Font';

  if (baseLower.includes('plus jakarta') || lower.includes('plusjakarta')) {
    fontFamily = '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    fontDisplayName = 'Plus Jakarta Sans';
  } else if (baseLower.includes('space mono') || lower.includes('spacemono')) {
    fontFamily = '"Space Mono", "Courier New", Courier, monospace';
    fontDisplayName = 'Space Mono';
  } else if (baseLower.includes('helvetica') || lower.includes('helvetica')) {
    fontFamily = '"Helvetica Neue", Helvetica, Arial, sans-serif';
    fontDisplayName = 'Helvetica';
  } else if (baseLower.includes('times') || lower.includes('times')) {
    fontFamily = '"Times New Roman", Times, Georgia, serif';
    fontDisplayName = 'Times New Roman';
  } else if (
    baseLower.includes('courier') ||
    baseLower.includes('mono') ||
    lower.includes('courier') ||
    lower.includes('consolas') ||
    lower.includes('menlo')
  ) {
    fontFamily = '"Courier New", Courier, monospace';
    fontDisplayName = baseFamily || 'Courier New';
  } else if (baseLower.includes('calibri') || lower.includes('calibri')) {
    fontFamily = 'Calibri, "Segoe UI", Arial, sans-serif';
    fontDisplayName = 'Calibri';
  } else if (baseLower.includes('georgia') || lower.includes('georgia')) {
    fontFamily = 'Georgia, serif';
    fontDisplayName = 'Georgia';
  } else if (baseLower.includes('verdana') || lower.includes('verdana')) {
    fontFamily = 'Verdana, Geneva, sans-serif';
    fontDisplayName = 'Verdana';
  } else if (baseLower.includes('trebuchet') || lower.includes('trebuchet')) {
    fontFamily = '"Trebuchet MS", sans-serif';
    fontDisplayName = 'Trebuchet MS';
  } else if (
    baseLower.includes('song') ||
    baseLower.includes('sun') ||
    lower.includes('simsun') ||
    lower.includes('songti')
  ) {
    fontFamily = '"Songti SC", SimSun, STSong, serif';
    fontDisplayName = 'Songti / 宋体';
  } else if (
    baseLower.includes('pingfang') ||
    baseLower.includes('yahei') ||
    lower.includes('heiti')
  ) {
    fontFamily = '"PingFang SC", "Microsoft YaHei", sans-serif';
    fontDisplayName = 'PingFang / 微软雅黑';
  } else if (baseFamily) {
    // Preserve the exact original font family with appropriate generic fallback
    const isSerif = lower.includes('serif') || lower.includes('roman');
    const isMonospace = lower.includes('mono') || lower.includes('code');
    const fallback = isMonospace ? 'monospace' : isSerif ? 'serif' : 'sans-serif';
    fontFamily = `"${baseFamily}", "${cleanName}", ${fallback}`;
    fontDisplayName = baseFamily;
  } else {
    fontFamily = 'Arial, "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif';
    fontDisplayName = 'Arial';
  }

  return {
    fontFamily,
    fontDisplayName,
    isBold,
    isItalic,
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
    const pageCommonObjs = (page as any).commonObjs;

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

      // Resolve exact original font information
      const style = textContent.styles ? textContent.styles[item.fontName] : null;
      const fontInfo = resolvePdfFontInfo(item, style, pageCommonObjs);

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
        fontFamily: fontInfo.fontFamily,
        fontDisplayName: fontInfo.fontDisplayName,
        isBold: fontInfo.isBold,
        isItalic: fontInfo.isItalic,
        textColor,
      });
    }
    return items;
  } catch (err) {
    console.warn('Could not extract text from page:', err);
    return [];
  }
};
