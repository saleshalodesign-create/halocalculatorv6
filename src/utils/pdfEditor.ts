import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { QuoteItem, QuoteRecord } from '../types';
import { createDocumentPDFFile } from './pdfGenerator';
import { DocumentType } from './messaging';

export interface PdfAnnotation {
  id: string;
  pageIndex: number; // 0-based
  type: 'text' | 'whiteout' | 'stamp' | 'signature' | 'image' | 'highlight';
  // Position in normalized coordinates [0..1] relative to page width and height
  xPercent: number; // 0 to 1 (left to right)
  yPercent: number; // 0 to 1 (top to bottom)
  widthPercent?: number; // 0 to 1
  heightPercent?: number; // 0 to 1

  // Specific properties
  text?: string;
  fontSize?: number; // in points (e.g. 10, 12, 14, 18, 24)
  textColor?: string; // hex e.g. '#000000', '#dc2626'
  backgroundColor?: string;
  isBold?: boolean;
  isItalic?: boolean;
  fontFamily?: string;
  fontDisplayName?: string;

  // Stamp types: PAID, APPROVED, REVISED, VOID, TAX_INVOICE, HALO_SEAL
  stampType?: 'PAID' | 'APPROVED' | 'REVISED' | 'VOID' | 'TAX_INVOICE' | 'HALO_SEAL' | 'CUSTOM';
  stampText?: string;
  stampColor?: string;

  // Image / Signature data URL
  imageDataUrl?: string;
}

export interface StampPreset {
  id: string;
  label: string;
  text: string;
  color: string;
  borderColor: string;
  bgColor: string;
  rotation: number;
}

export const STAMP_PRESETS: StampPreset[] = [
  {
    id: 'PAID',
    label: 'PAID',
    text: 'PAID / 已付款',
    color: '#059669',
    borderColor: '#059669',
    bgColor: '#ecfdf5',
    rotation: -10,
  },
  {
    id: 'APPROVED',
    label: 'APPROVED',
    text: 'APPROVED / 审阅通过',
    color: '#2563eb',
    borderColor: '#2563eb',
    bgColor: '#eff6ff',
    rotation: -8,
  },
  {
    id: 'TAX_INVOICE',
    label: 'TAX INVOICE',
    text: 'TAX INVOICE / 正式发票',
    color: '#7c3aed',
    borderColor: '#7c3aed',
    bgColor: '#f5f3ff',
    rotation: 0,
  },
  {
    id: 'REVISED',
    label: 'REVISED',
    text: 'REVISED / 已修改重出',
    color: '#d97706',
    borderColor: '#d97706',
    bgColor: '#fffbeb',
    rotation: -8,
  },
  {
    id: 'URGENT',
    label: 'URGENT',
    text: 'URGENT / 加急制作',
    color: '#dc2626',
    borderColor: '#dc2626',
    bgColor: '#fef2f2',
    rotation: -12,
  },
  {
    id: 'VOID',
    label: 'VOID',
    text: 'VOID / 作废',
    color: '#b91c1c',
    borderColor: '#b91c1c',
    bgColor: '#fef2f2',
    rotation: -15,
  },
  {
    id: 'HALO_SEAL',
    label: 'HALO CHOP',
    text: 'HALO DESIGN HUB (UEN: 53142015M)',
    color: '#b91c1c',
    borderColor: '#b91c1c',
    bgColor: '#fff1f2',
    rotation: 0,
  },
];

/**
 * Converts a hex color string to pdf-lib rgb values (0..1)
 */
export const hexToRgb = (hex: string = '#000000'): { r: number; g: number; b: number } => {
  const clean = hex.replace('#', '');
  let r = 0;
  let g = 0;
  let b = 0;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) / 255;
    g = parseInt(clean[1] + clean[1], 16) / 255;
    b = parseInt(clean[2] + clean[2], 16) / 255;
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16) / 255;
    g = parseInt(clean.substring(2, 4), 16) / 255;
    b = parseInt(clean.substring(4, 6), 16) / 255;
  }
  return {
    r: isNaN(r) ? 0 : r,
    g: isNaN(g) ? 0 : g,
    b: isNaN(b) ? 0 : b,
  };
};

/**
 * Checks if a string contains non-ASCII characters (e.g. Chinese characters)
 */
export const hasNonAscii = (str: string): boolean => {
  // eslint-disable-next-line no-control-regex
  return /[^\u0000-\u007F]/.test(str);
};

/**
 * Renders text or stamp into a PNG Data URL using Canvas for 100% Unicode and Chinese character support
 */
export const renderStampToDataUrl = (
  text: string,
  color: string,
  bgColor: string,
  fontSize: number = 16
): { dataUrl: string; width: number; height: number } => {
  if (typeof document === 'undefined') return { dataUrl: '', width: 0, height: 0 };
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '', width: 0, height: 0 };

  const scale = 3; // High DPI for crisp vector-like quality in PDF
  const fontStyle = `bold ${fontSize * scale}px "Segoe UI", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.font = fontStyle;
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const paddingX = 20 * scale;
  const paddingY = 10 * scale;
  const width = Math.ceil(textWidth + paddingX * 2);
  const height = Math.ceil(fontSize * scale + paddingY * 2);

  canvas.width = width;
  canvas.height = height;

  ctx.font = fontStyle;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Double border for authentic rubber stamp look
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 * scale;
  ctx.strokeRect(3 * scale, 3 * scale, width - 6 * scale, height - 6 * scale);

  ctx.lineWidth = 1 * scale;
  ctx.strokeRect(6 * scale, 6 * scale, width - 12 * scale, height - 12 * scale);

  // Text
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, height / 2);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: width / scale,
    height: height / scale,
  };
};

/**
 * Renders arbitrary text to a high-DPI PNG Data URL to guarantee full Unicode (Chinese, English, etc.) support
 * and automatically preserve the original font family, weight, and italic slant
 */
export const renderTextToDataUrl = (
  text: string,
  color: string = '#000000',
  fontSize: number = 12,
  isBold: boolean = false,
  isItalic: boolean = false,
  fontFamily: string = 'Arial, "Segoe UI", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
  backgroundColor?: string
): { dataUrl: string; width: number; height: number } => {
  if (typeof document === 'undefined') return { dataUrl: '', width: 0, height: 0 };
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '', width: 0, height: 0 };

  const scale = 3;
  const effectiveFont = fontFamily || 'Arial, "Segoe UI", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
  const fontStyle = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontSize * scale}px ${effectiveFont}`;
  ctx.font = fontStyle;
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const height = Math.ceil(fontSize * scale * 1.35);
  const width = Math.ceil(textWidth + 8 * scale);

  canvas.width = width;
  canvas.height = height;

  ctx.font = fontStyle;
  ctx.textBaseline = 'middle';

  if (backgroundColor && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.fillStyle = color;
  ctx.fillText(text, 4 * scale, height / 2);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: width / scale,
    height: height / scale,
  };
};

/**
 * Reads a File object as ArrayBuffer
 */
export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export interface PdfEditOptions {
  rotations?: Record<number, number>; // pageIndex -> rotation degrees (0, 90, 180, 270)
  watermarkText?: string;
  deletePages?: number[]; // list of 0-based page indices to remove
  addBlankPage?: boolean;
}

/**
 * Gets page count of an arbitrary PDF
 */
export const getPdfPageCount = async (pdfBytes: ArrayBuffer | Uint8Array): Promise<number> => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch (err) {
    console.warn('Could not read page count of PDF:', err);
    return 1;
  }
};

/**
 * Creates a clean blank A4 PDF page
 */
export const createBlankA4PdfBytes = async (): Promise<ArrayBuffer> => {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([595.28, 841.89]); // A4 in points
  const bytes = await pdfDoc.save();
  return bytes.buffer as ArrayBuffer;
};

/**
 * Generates fresh PDF ArrayBuffer for a Halo Quote, Invoice or Receipt
 */
export const generateHaloPdfBytes = async (
  items: QuoteItem[],
  data: Partial<QuoteRecord> = {},
  docType: DocumentType = 'quote',
  grandTotal: number = 0,
  discountAmount: number = 0,
  finalTotal: number = 0
): Promise<ArrayBuffer> => {
  const output = createDocumentPDFFile(
    docType,
    items,
    data,
    grandTotal,
    discountAmount,
    finalTotal
  );

  return await output.blob.arrayBuffer();
};

/**
 * Applies visual annotations, whiteouts, text, stamps, signatures, rotations and watermarks to any PDF
 */
export const applyPdfAnnotations = async (
  pdfBytes: ArrayBuffer | Uint8Array,
  annotations: PdfAnnotation[] = [],
  options: PdfEditOptions = {}
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  // Optional: Add blank page if requested
  if (options.addBlankPage) {
    pdfDoc.addPage([595.28, 841.89]);
  }

  // Optional: Delete pages (sorted descending so indices don't shift)
  if (options.deletePages && options.deletePages.length > 0) {
    const toDelete = Array.from(new Set(options.deletePages))
      .filter(p => p >= 0 && p < pdfDoc.getPageCount())
      .sort((a, b) => b - a);

    // Keep at least one page
    if (toDelete.length < pdfDoc.getPageCount()) {
      for (const pIdx of toDelete) {
        pdfDoc.removePage(pIdx);
      }
    }
  }

  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  // Apply page rotations if requested
  if (options.rotations) {
    for (const [pageIdxStr, rotDeg] of Object.entries(options.rotations)) {
      const pIdx = parseInt(pageIdxStr, 10);
      if (pIdx >= 0 && pIdx < totalPages) {
        pages[pIdx].setRotation(degrees(rotDeg));
      }
    }
  }

  // Load standard fonts as fallback for pure ASCII text
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Apply global watermark if requested
  if (options.watermarkText && options.watermarkText.trim()) {
    const wmText = options.watermarkText.trim();
    for (const page of pages) {
      const pw = page.getWidth();
      const ph = page.getHeight();
      if (hasNonAscii(wmText)) {
        // Embed via Canvas
        const { dataUrl, width, height } = renderTextToDataUrl(wmText, '#94a3b8', 36, true);
        if (dataUrl) {
          try {
            const imgBytes = await fetch(dataUrl).then(r => r.arrayBuffer());
            const embedded = await pdfDoc.embedPng(imgBytes);
            page.drawImage(embedded, {
              x: pw * 0.15,
              y: ph * 0.45,
              width: width,
              height: height,
              opacity: 0.3,
              rotate: degrees(35),
            });
          } catch {
            // ignore
          }
        }
      } else {
        page.drawText(wmText, {
          x: pw * 0.15,
          y: ph * 0.45,
          size: 42,
          font: helveticaBold,
          color: rgb(0.8, 0.8, 0.8),
          opacity: 0.25,
          rotate: degrees(35),
        });
      }
    }
  }

  // Apply annotations
  if (annotations && annotations.length > 0) {
    for (const ann of annotations) {
      const targetPageIdx = Math.max(0, Math.min(totalPages - 1, ann.pageIndex || 0));
      const page = pages[targetPageIdx];
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();

      // Convert normalized (0..1) percentage coordinates to PDF points
      // Note: PDF y=0 is at bottom, while screen y=0 is at top
      const pdfX = Math.max(0, Math.min(pageWidth, ann.xPercent * pageWidth));
      const pdfY = Math.max(0, Math.min(pageHeight, pageHeight - ann.yPercent * pageHeight));

      if (ann.type === 'whiteout') {
        const boxW = (ann.widthPercent || 0.15) * pageWidth;
        const boxH = (ann.heightPercent || 0.04) * pageHeight;

        // Draw white rectangle to cover old text / typo
        page.drawRectangle({
          x: pdfX,
          y: pdfY - boxH,
          width: boxW,
          height: boxH,
          color: rgb(1, 1, 1),
        });

        // Optional replacement text inside whiteout box
        if (ann.text) {
          const size = ann.fontSize || Math.max(8, Math.round(boxH * 0.7));
          const { dataUrl, width, height } = renderTextToDataUrl(
            ann.text,
            ann.textColor || '#000000',
            size,
            ann.isBold,
            ann.isItalic,
            ann.fontFamily
          );
          if (dataUrl) {
            try {
              const imgBytes = await fetch(dataUrl).then(r => r.arrayBuffer());
              const img = await pdfDoc.embedPng(imgBytes);
              page.drawImage(img, {
                x: pdfX + 2,
                y: pdfY - boxH + Math.max(0, (boxH - height) / 2),
                width: width,
                height: height,
              });
            } catch (e) {
              console.warn('Could not draw whiteout replacement text', e);
            }
          }
        }
      } else if (ann.type === 'highlight') {
        const boxW = (ann.widthPercent || 0.2) * pageWidth;
        const boxH = (ann.heightPercent || 0.035) * pageHeight;
        const bgRgb = hexToRgb(ann.backgroundColor || '#fef08a');
        page.drawRectangle({
          x: pdfX,
          y: pdfY - boxH,
          width: boxW,
          height: boxH,
          color: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
          opacity: 0.45,
        });
      } else if (ann.type === 'text' && ann.text) {
        const size = ann.fontSize || 12;
        const { dataUrl, width, height } = renderTextToDataUrl(
          ann.text,
          ann.textColor || '#000000',
          size,
          ann.isBold,
          ann.isItalic,
          ann.fontFamily,
          ann.backgroundColor
        );
        if (dataUrl) {
          try {
            const imgBytes = await fetch(dataUrl).then(r => r.arrayBuffer());
            const img = await pdfDoc.embedPng(imgBytes);
            page.drawImage(img, {
              x: pdfX,
              y: pdfY - height,
              width: width,
              height: height,
            });
          } catch (e) {
            console.warn('Could not embed text in PDF', e);
          }
        }
      } else if (ann.type === 'stamp') {
        const preset = STAMP_PRESETS.find(p => p.id === ann.stampType) || {
          id: 'CUSTOM',
          label: ann.stampText || 'STAMP',
          text: ann.stampText || 'APPROVED',
          color: ann.stampColor || '#059669',
          borderColor: ann.stampColor || '#059669',
          bgColor: '#ecfdf5',
          rotation: -10,
        };

        const stampText = ann.stampText || preset.text;
        const color = ann.stampColor || preset.color;
        const bgColor = preset.bgColor;
        const fontSize = ann.fontSize || 15;

        // Render stamps as high-resolution PNG image to guarantee 100% Unicode & Chinese support
        const { dataUrl, width, height } = renderStampToDataUrl(stampText, color, bgColor, fontSize);
        if (dataUrl) {
          try {
            const imgBytes = await fetch(dataUrl).then(r => r.arrayBuffer());
            const img = await pdfDoc.embedPng(imgBytes);
            page.drawImage(img, {
              x: pdfX,
              y: pdfY - height,
              width: width,
              height: height,
              rotate: degrees(preset.rotation),
            });
          } catch (e) {
            console.warn('Could not embed stamp in PDF', e);
          }
        }
      } else if ((ann.type === 'signature' || ann.type === 'image') && ann.imageDataUrl) {
        try {
          const imageBytes = await fetch(ann.imageDataUrl).then(res => res.arrayBuffer());
          let embeddedImage;
          if (ann.imageDataUrl.includes('image/png') || ann.imageDataUrl.startsWith('data:image/png')) {
            embeddedImage = await pdfDoc.embedPng(imageBytes);
          } else {
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
          }

          const imgW = (ann.widthPercent || 0.22) * pageWidth;
          const imgH =
            (ann.heightPercent || (imgW * embeddedImage.height) / embeddedImage.width / pageHeight) *
            pageHeight;

          page.drawImage(embeddedImage, {
            x: pdfX,
            y: pdfY - imgH,
            width: imgW,
            height: imgH,
          });
        } catch (err) {
          console.warn('Could not embed signature/image in PDF:', err);
        }
      }
    }
  }

  return await pdfDoc.save();
};

/**
 * Downloads a Uint8Array or Blob as a PDF file
 */
export const downloadPdfBytes = (bytes: Uint8Array | Blob, filename: string): void => {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/**
 * Creates an object URL from PDF bytes for iframe or preview
 */
export const createPdfUrl = (bytes: Uint8Array | ArrayBuffer | Blob): string => {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
};
