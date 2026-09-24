import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QuoteItem, QuoteRecord } from '../types';

/**
 * Generate a crystal-clear, high-resolution base64 PNG data URL of the official Halo Design logo.
 * Renders "hal" + circular halo indicator icon + "DESIGN PTE LTD" / "DESIGN HUB"
 * at 4x Retina resolution to guarantee zero distortion, crisp vector alignment, and no clipping in PDFs.
 */
export const getHaloLogoBase64 = (subtitle: string = 'DESIGN PTE LTD', tight: boolean = false): string => {
  try {
    if (typeof document === 'undefined') return '';
    const canvas = document.createElement('canvas');
    const scale = 4; // 4x Retina resolution for razor-sharp PDF printing
    const w = tight ? 110 : 220;
    const h = tight ? 56 : 70;
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.scale(scale, scale);

    // 1. Draw "hal" text in bold black
    ctx.fillStyle = '#000000';
    ctx.font = '900 36px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.textBaseline = 'alphabetic';
    const halBaselineY = 36;
    ctx.fillText('hal', 2, halBaselineY);

    const halWidth = ctx.measureText('hal').width;

    // 2. Draw 'o' circular logo immediately after 'hal'
    const logoSize = 30; // height/width in canvas units
    const logoLeft = 2 + halWidth + 2.5;
    const logoTop = halBaselineY - 26;

    ctx.save();
    ctx.translate(logoLeft, logoTop);
    const s = logoSize / 100;
    ctx.scale(s, s);

    // Outer Black Disc (from HaloLogo.tsx)
    ctx.fillStyle = '#0C0D11';
    ctx.beginPath();
    ctx.arc(50, 50, 48, 0, Math.PI * 2);
    ctx.fill();

    // Lime Green Ring Body
    ctx.fillStyle = '#C4EE00';
    ctx.beginPath();
    ctx.arc(50, 50, 36, 0, Math.PI * 2, false);
    ctx.arc(50, 50, 20, 0, Math.PI * 2, true);
    ctx.fill();

    // Cutout slot for diagonal bar (filled with dark background #0C0D11)
    ctx.fillStyle = '#0C0D11';
    ctx.beginPath();
    ctx.moveTo(42, 58);
    ctx.lineTo(78, 22);
    ctx.lineTo(68, 12);
    ctx.lineTo(32, 48);
    ctx.closePath();
    ctx.fill();

    // Inner Black Core
    ctx.beginPath();
    ctx.arc(50, 50, 20, 0, Math.PI * 2);
    ctx.fill();

    // Diagonal White Bar
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(43, 53);
    ctx.lineTo(51, 61);
    ctx.lineTo(74, 38);
    ctx.lineTo(66, 30);
    ctx.closePath();
    ctx.fill();

    // Outer Left Accent White Dot
    ctx.beginPath();
    ctx.arc(10, 58, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 3. Subtitle: e.g. "DESIGN PTE LTD" or "DESIGN HUB"
    ctx.fillStyle = '#000000';
    ctx.font = '700 9.5px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.textBaseline = 'top';

    const subY = halBaselineY + 6;
    let currX = 2.5;
    const spacing = 1.6;
    for (let i = 0; i < subtitle.length; i++) {
      const char = subtitle[i];
      ctx.fillText(char, currX, subY);
      currX += ctx.measureText(char).width + spacing;
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Error generating halo logo canvas', err);
    return '';
  }
};

const drawHeader = (doc: jsPDF, data: Partial<QuoteRecord> & { logo?: string }, type: string) => {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const logoX = margin;
  const logoY = 15;
  const textRightX = pageWidth - margin - 1.5;

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(type, textRightX, logoY + 8, { align: 'right' });

  const addrY = logoY + 15;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const lineHeight = 4.5;
  doc.text("BLK 113 EUNOS AVE 3, #01-16", textRightX, addrY, { align: 'right' });
  doc.text("GORDON INDUSTRIAL BUILDING", textRightX, addrY + lineHeight, { align: 'right' });
  doc.text("SINGAPORE 409838", textRightX, addrY + (lineHeight * 2), { align: 'right' });
  doc.text("Tel: 6844 4928 / 6844 4929", textRightX, addrY + (lineHeight * 3), { align: 'right' });

  const logoSrc = data.logo || getHaloLogoBase64('DESIGN HUB');
  if (logoSrc) {
    try {
      doc.addImage(logoSrc, 'PNG', logoX, logoY, 44, 14, undefined, 'FAST');
    } catch (e) {
      console.error("Error adding logo image", e);
    }
  } else {
    // Basic text fallback
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("halo", logoX, logoY + 8);
    doc.setFontSize(7.5);
    doc.text("DESIGN HUB", logoX, logoY + 13);
  }
};

export type PDFAction = 'view' | 'save' | 'file' | 'print';

export interface GeneratedPDFOutput {
  blob: Blob;
  file: File;
  filename: string;
}

/**
 * Safely triggers printing of a jsPDF document using a single invisible iframe.
 * Avoids duplicate windows, multiple autoPrint() triggers, and popup blocker conflicts.
 */
export const printJsPDF = (doc: jsPDF, filename: string): void => {
  doc.autoPrint();
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  // Clean up any existing print iframe
  const existingFrame = document.getElementById('__halo_pdf_print_frame__');
  if (existingFrame && existingFrame.parentNode) {
    try {
      existingFrame.parentNode.removeChild(existingFrame);
    } catch (_) {}
  }

  const iframe = document.createElement('iframe');
  iframe.id = '__halo_pdf_print_frame__';
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.opacity = '0.01';
  iframe.style.border = 'none';
  iframe.style.pointerEvents = 'none';

  let printHandled = false;

  const cleanup = () => {
    setTimeout(() => {
      try {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
        URL.revokeObjectURL(blobUrl);
      } catch (_) {}
    }, 45000);
  };

  iframe.onload = () => {
    try {
      if (printHandled) return;
      printHandled = true;
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      cleanup();
    } catch (e) {
      console.warn('Iframe print blocked or not supported by browser:', e);
      cleanup();
      // Never auto-download when printing was requested
      try {
        window.open(blobUrl, '_blank');
      } catch (_) {}
    }
  };

  try {
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
  } catch (err) {
    console.warn('Could not launch iframe print:', err);
    cleanup();
    // Never auto-download when printing was requested
    try {
      window.open(blobUrl, '_blank');
    } catch (_) {}
  }
};

const finalizePDF = (
  doc: jsPDF,
  data: Partial<QuoteRecord>,
  type: string,
  action: PDFAction = 'view'
): GeneratedPDFOutput | void => {
  // @ts-ignore
  const pageCount = doc.internal.getNumberOfPages();
  const width = doc.internal.pageSize.width;
  const height = doc.internal.pageSize.height;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawHeader(doc, data, type);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Page ${i} of ${pageCount}`, width - 14, height - 10, { align: 'right' });
  }

  const filename = `${type.charAt(0) + type.slice(1).toLowerCase()}_${data.docNo || 'Draft'}.pdf`;

  if (action === 'save') {
    doc.save(filename);
    return;
  }

  if (action === 'file') {
    const blob = doc.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf', lastModified: Date.now() });
    return { blob, file, filename };
  }

  if (action === 'print') {
    printJsPDF(doc, filename);
    return;
  }

  // Action is 'view'
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    const dataUri = doc.output('datauristring');
    try {
      const win = window.open();
      if (win) {
        win.location.href = dataUri;
      } else {
        doc.save(filename);
      }
    } catch (e) {
      doc.save(filename);
    }
  } else {
    try {
      const blobUrl = doc.output('bloburl');
      const win = window.open(blobUrl as unknown as string, '_blank');
      if (!win) {
        doc.save(filename);
      }
    } catch (e) {
      doc.save(filename);
    }
  }
};

export const generateQuotationPDF = (
  items: QuoteItem[],
  data: Partial<QuoteRecord> & { logo?: string },
  grandTotal: number,
  discountAmount: number,
  finalTotal: number,
  action: PDFAction = 'view'
): GeneratedPDFOutput | void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  const cellPadding = 1.5;
  const textLeftX = margin + cellPadding;
  const textRightX = pageWidth - margin - cellPadding;

  let currentY = 55;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("QUOTATION TO:", textLeftX, currentY);
  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.text((data.customerName || "").toUpperCase(), textLeftX, currentY);
  currentY += 5;
  const addressLines = doc.splitTextToSize((data.customerAddress || "").toUpperCase(), 90);
  doc.text(addressLines, textLeftX, currentY);
  currentY += addressLines.length * 5;
  if (data.contact) {
    doc.text(`ATTN: ${data.contact.toUpperCase()}`, textLeftX, currentY);
  }

  const startInfoY = 55;
  const labelX = textRightX - 60;
  doc.setFont("helvetica", "bold");
  doc.text("QUOTATION NO:", labelX, startInfoY);
  doc.setTextColor(220, 38, 38);
  doc.text(data.docNo || "DRAFT", textRightX, startInfoY, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.text("DATE:", labelX, startInfoY + 6);
  doc.setFont("helvetica", "normal");
  const dateStr = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
  doc.text(dateStr, textRightX, startInfoY + 6, { align: 'right' });

  const subjectY = Math.max(currentY + 15, startInfoY + 25);
  doc.setFont("helvetica", "bold");
  doc.text("RE: TO DESIGN, SUPPLY & INSTALL", textLeftX, subjectY);

  const tableBody = items.map((item, index) => {
    const noStr = (index + 1).toString() + ".";
    let desc = item.title.toUpperCase();
    if (data.showSizes !== false && item.originalWidth > 0) desc += `    [${item.originalWidth}X${item.originalHeight} ${(item.unit || '').toUpperCase()}]`;
    let qtyStr = `x${item.quantity}`;
    let priceStr = item.totalPrice === 0 ? "FOC" : `$${(item.totalPrice * item.quantity).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    return [noStr, desc, qtyStr, priceStr];
  });

  autoTable(doc, {
    body: tableBody,
    startY: subjectY + 5,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: cellPadding, textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'left', fontStyle: 'normal' },
      1: { cellWidth: 'auto', fontStyle: 'normal' },
      2: { cellWidth: 15, halign: 'right', fontStyle: 'normal' },
      3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
    margin: { top: 55, right: margin, left: margin },
    didParseCell: (cellData) => {
      if (cellData.column.index === 3 && cellData.cell.raw === "FOC") {
        cellData.cell.styles.textColor = [220, 38, 38];
      }
    }
  });

  // @ts-ignore
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : subjectY + 20;
  const tableEndY = finalY + 10;
  if (tableEndY + 50 > pageHeight) doc.addPage();
  const sectionY = tableEndY > pageHeight - 50 ? 55 : tableEndY;

  let totalsY = sectionY + 10;
  const totalsLabelX = textRightX - 60;
  doc.setFontSize(10);
  if (discountAmount > 0) {
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal", totalsLabelX, totalsY);
    doc.text(`$${grandTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, textRightX, totalsY, { align: 'right' });
    totalsY += 6;
    doc.setTextColor(220, 38, 38);
    doc.text("Discount", totalsLabelX, totalsY);
    doc.text(`-$${discountAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, textRightX, totalsY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    totalsY += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL", totalsLabelX, totalsY + 4);
  doc.text(`$${finalTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, textRightX, totalsY + 4, { align: 'right' });

  if (data.deposit && data.deposit > 0) {
    doc.setLineWidth(0.2);
    doc.line(totalsLabelX, totalsY - 2, textRightX, totalsY - 2);
    totalsY += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Deposit", totalsLabelX, totalsY);
    if (data.paymentMethod) {
      const depositWidth = doc.getTextWidth("Deposit");
      doc.setFontSize(7);
      doc.text(`(${data.paymentMethod})`, totalsLabelX + depositWidth + 1.5, totalsY);
      doc.setFontSize(10);
    }
    doc.text(`-$${Number(data.deposit).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, textRightX, totalsY, { align: 'right' });
    totalsY += 6;

    const balanceDue = Math.max(0, finalTotal - Number(data.deposit));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("BALANCE", totalsLabelX, totalsY + 4);
    doc.text(`$${balanceDue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, textRightX, totalsY + 4, { align: 'right' });
    totalsY += 6;
  }

  return finalizePDF(doc, data, 'QUOTATION', action);
};

export const generateInvoicePDF = (
  items: QuoteItem[],
  data: Partial<QuoteRecord> & { logo?: string },
  grandTotal: number,
  discountAmount: number,
  finalTotal: number,
  action: PDFAction = 'view'
): GeneratedPDFOutput | void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  const cellPadding = 1.5;
  const textLeftX = margin + cellPadding;
  const textRightX = pageWidth - margin - cellPadding;

  let currentY = 55;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", textLeftX, currentY);
  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.text((data.customerName || "").toUpperCase(), textLeftX, currentY);
  currentY += 5;
  const addressLines = doc.splitTextToSize((data.customerAddress || "").toUpperCase(), 90);
  doc.text(addressLines, textLeftX, currentY);
  currentY += addressLines.length * 5;
  if (data.contact) doc.text(`ATTN: ${data.contact.toUpperCase()}`, textLeftX, currentY);

  const startInfoY = 55;
  const labelX = textRightX - 60;
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE NO:", labelX, startInfoY);
  doc.setTextColor(220, 38, 38);
  doc.text(data.docNo || "INV-001", textRightX, startInfoY, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.text("DATE:", labelX, startInfoY + 6);
  doc.setFont("helvetica", "normal");
  const dateStr = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
  doc.text(dateStr, textRightX, startInfoY + 6, { align: 'right' });

  if (data.paymentTerms) {
    doc.setFont("helvetica", "bold");
    doc.text("TERMS:", labelX, startInfoY + 12);
    doc.setFont("helvetica", "normal");
    doc.text(data.paymentTerms, textRightX, startInfoY + 12, { align: 'right' });
  }

  const subjectY = Math.max(currentY + 15, startInfoY + 25);
  doc.setFont("helvetica", "bold");
  doc.text("RE: TO DESIGN, SUPPLY & INSTALL", textLeftX, subjectY);

  const tableBody = items.map((item, index) => {
    const noStr = (index + 1).toString() + ".";
    let desc = item.title.toUpperCase();
    if (data.showSizes !== false && item.originalWidth > 0) desc += `    [${item.originalWidth}X${item.originalHeight} ${(item.unit || '').toUpperCase()}]`;
    let qtyStr = `x${item.quantity}`;
    let priceStr = item.totalPrice === 0 ? "FOC" : `$${(item.totalPrice * item.quantity).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    return [noStr, desc, qtyStr, priceStr];
  });

  autoTable(doc, {
    body: tableBody,
    startY: subjectY + 5,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: cellPadding, textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'left', fontStyle: 'normal' },
      1: { cellWidth: 'auto', fontStyle: 'normal' },
      2: { cellWidth: 15, halign: 'right', fontStyle: 'normal' },
      3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
    margin: { top: 55, right: margin, left: margin },
    didParseCell: (cellData) => {
      if (cellData.column.index === 3 && cellData.cell.raw === "FOC") {
        cellData.cell.styles.textColor = [220, 38, 38];
      }
    }
  });

  // @ts-ignore
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : subjectY + 20;
  const tableEndY = finalY + 8;
  if (tableEndY + 75 > pageHeight) doc.addPage();
  const sectionY = tableEndY > pageHeight - 75 ? 55 : tableEndY;

  // --- RIGHT COLUMN: TOTALS SUMMARY ---
  let totalsY = sectionY + 8;
  const totalsLabelX = textRightX - 60;
  doc.setFontSize(10);

  if (discountAmount > 0) {
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal", totalsLabelX, totalsY);
    doc.text(`$${grandTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, textRightX, totalsY, { align: 'right' });
    totalsY += 6;
    doc.setTextColor(220, 38, 38);
    doc.text("Discount", totalsLabelX, totalsY);
    doc.text(`-$${discountAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, textRightX, totalsY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    totalsY += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL AMOUNT", totalsLabelX, totalsY + 2);
  doc.text(`$${finalTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, textRightX, totalsY + 2, { align: 'right' });
  totalsY += 8;

  const depositVal = Number(data.deposit) || 0;
  if (depositVal > 0) {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(totalsLabelX, totalsY - 3, textRightX, totalsY - 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text("Amount Paid", totalsLabelX, totalsY);
    doc.text(`-$${depositVal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, textRightX, totalsY, { align: 'right' });

    if (data.paymentMethod) {
      totalsY += 4.5;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      doc.text(`(${data.paymentMethod})`, totalsLabelX, totalsY);
      doc.setTextColor(0, 0, 0);
    }
    totalsY += 6;

    const balanceDue = Math.max(0, finalTotal - depositVal);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text("BALANCE DUE", totalsLabelX, totalsY + 3);
    doc.text(`$${balanceDue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, textRightX, totalsY + 3, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    totalsY += 8;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text("BALANCE DUE", totalsLabelX, totalsY + 2);
    doc.text(`$${finalTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, textRightX, totalsY + 2, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    totalsY += 8;
  }

  // --- LEFT COLUMN: PAYMENT PART & INSTRUCTIONS BOX ---
  const boxX = textLeftX;
  const boxY = sectionY + 4;
  const boxWidth = 104;
  const boxHeight = 40;

  // Background card for Payment Details
  doc.setFillColor(248, 249, 251);
  doc.setDrawColor(215, 220, 228);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'FD');

  // Title header inside box
  doc.setFillColor(235, 240, 248);
  doc.roundedRect(boxX, boxY, boxWidth, 7, 2, 2, 'F');
  doc.setDrawColor(215, 220, 228);
  doc.line(boxX, boxY + 7, boxX + boxWidth, boxY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 40, 80);
  doc.text("PAYMENT INSTRUCTIONS", boxX + 4, boxY + 5);

  let py = boxY + 12;
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  // PayNow
  doc.setFont("helvetica", "bold");
  doc.text("1. PayNow (UEN):", boxX + 4, py);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 118, 110);
  doc.text("201826136D", boxX + 32, py);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("(HALO DESIGN HUB)", boxX + 54, py);
  py += 5.5;

  // Bank Transfer
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("2. Bank Transfer:", boxX + 4, py);
  doc.setFont("helvetica", "bold");
  doc.text("OCBC Bank", boxX + 28, py);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Acc: 687-345678-001", boxX + 50, py);
  py += 4.5;
  doc.text("Account Name: HALO DESIGN HUB", boxX + 28, py);
  py += 5.5;

  // Cheque
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("3. Cheque:", boxX + 4, py);
  doc.setFont("helvetica", "normal");
  doc.text('Crossed to "HALO DESIGN HUB"', boxX + 28, py);

  // --- SIGNATURE SECTION ---
  const signY = Math.max(totalsY + 8, boxY + boxHeight + 8);
  if (signY + 22 <= pageHeight - 15) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text("THANK YOU FOR YOUR BUSINESS!", textLeftX, signY + 12);

    const signRightX = textRightX - 55;
    doc.text("FOR HALO DESIGN HUB", signRightX, signY);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(signRightX, signY + 12, textRightX, signY + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text("Authorized Signature & Stamp", signRightX, signY + 16);
  }

  return finalizePDF(doc, data, 'INVOICE', action);
};

export const generateReceiptPDF = (
  items: QuoteItem[],
  data: Partial<QuoteRecord> & { logo?: string },
  grandTotal: number,
  discountAmount: number,
  finalTotal: number,
  action: PDFAction = 'view'
): GeneratedPDFOutput | void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  const cellPadding = 1.5;
  const textLeftX = margin + cellPadding;
  const textRightX = pageWidth - margin - cellPadding;

  let currentY = 55;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("RECEIVED FROM:", textLeftX, currentY);
  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.text((data.customerName || "").toUpperCase(), textLeftX, currentY);
  currentY += 5;
  const addressLines = doc.splitTextToSize((data.customerAddress || "").toUpperCase(), 90);
  doc.text(addressLines, textLeftX, currentY);
  currentY += addressLines.length * 5;
  if (data.contact) doc.text(`ATTN: ${data.contact.toUpperCase()}`, textLeftX, currentY);

  const startInfoY = 55;
  const labelX = textRightX - 60;
  doc.setFont("helvetica", "bold");
  doc.text("RECEIPT NO:", labelX, startInfoY);
  doc.setTextColor(220, 38, 38);
  doc.text(data.docNo || "RCP-001", textRightX, startInfoY, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.text("DATE:", labelX, startInfoY + 6);
  doc.setFont("helvetica", "normal");
  const dateStr = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
  doc.text(dateStr, textRightX, startInfoY + 6, { align: 'right' });

  if (data.paymentMethod) {
    doc.setFont("helvetica", "bold");
    doc.text("PAID VIA:", labelX, startInfoY + 12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 118, 110);
    doc.text(data.paymentMethod, textRightX, startInfoY + 12, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  const subjectY = Math.max(currentY + 15, startInfoY + 25);
  doc.setFont("helvetica", "bold");
  doc.text("RE: TO DESIGN, SUPPLY & INSTALL", textLeftX, subjectY);

  const tableBody = items.map((item, index) => {
    const noStr = (index + 1).toString() + ".";
    let desc = item.title.toUpperCase();
    if (data.showSizes !== false && item.originalWidth > 0) desc += `    [${item.originalWidth}X${item.originalHeight} ${(item.unit || '').toUpperCase()}]`;
    let qtyStr = `x${item.quantity}`;
    let priceStr = item.totalPrice === 0 ? "FOC" : `$${(item.totalPrice * item.quantity).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    return [noStr, desc, qtyStr, priceStr];
  });

  autoTable(doc, {
    body: tableBody,
    startY: subjectY + 5,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: cellPadding, textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'left', fontStyle: 'normal' },
      1: { cellWidth: 'auto', fontStyle: 'normal' },
      2: { cellWidth: 15, halign: 'right', fontStyle: 'normal' },
      3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
    margin: { top: 55, right: margin, left: margin },
    didParseCell: (cellData) => {
      if (cellData.column.index === 3 && cellData.cell.raw === "FOC") {
        cellData.cell.styles.textColor = [220, 38, 38];
      }
    }
  });

  // @ts-ignore
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : subjectY + 20;
  const tableEndY = finalY + 8;
  if (tableEndY + 70 > pageHeight) doc.addPage();
  const sectionY = tableEndY > pageHeight - 70 ? 55 : tableEndY;

  // --- RIGHT COLUMN: TOTALS SUMMARY ---
  let totalsY = sectionY + 8;
  const totalsLabelX = textRightX - 60;
  doc.setFontSize(10);

  doc.setFont("helvetica", "normal");
  doc.text("Total Invoice Value", totalsLabelX, totalsY);
  doc.text(`$${finalTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, textRightX, totalsY, { align: 'right' });
  totalsY += 6;

  const paidAmount = Number(data.deposit) > 0 ? Number(data.deposit) : finalTotal;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 118, 110);
  doc.text("AMOUNT RECEIVED", totalsLabelX, totalsY + 2);
  doc.text(`$${paidAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, textRightX, totalsY + 2, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  totalsY += 8;

  const balanceRem = Math.max(0, finalTotal - paidAmount);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(totalsLabelX, totalsY - 2, textRightX, totalsY - 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Balance Outstanding", totalsLabelX, totalsY + 2);
  doc.text(`$${balanceRem.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, textRightX, totalsY + 2, { align: 'right' });

  // --- LEFT COLUMN: OFFICIAL RECEIPT ACKNOWLEDGMENT ---
  const boxX = textLeftX;
  const boxY = sectionY + 4;
  const boxWidth = 104;
  const boxHeight = 44;

  doc.setFillColor(245, 251, 248);
  doc.setDrawColor(180, 220, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text("OFFICIAL RECEIPT ACKNOWLEDGMENT", boxX + 4, boxY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.text(`Received with thanks from ${(data.customerName || 'Valued Client').toUpperCase()}`, boxX + 4, boxY + 13);
  doc.text(`the amount of SGD $${paidAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, boxX + 4, boxY + 18);
  doc.text(`Payment Mode: ${data.paymentMethod || 'PAYNOW / BANK TRANSFER'}`, boxX + 4, boxY + 23);
  doc.text(`Document Reference: ${data.docNo || 'RCP-001'}`, boxX + 4, boxY + 28);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text("This receipt is valid upon clearance of funds.", boxX + 4, boxY + 36);

  // Sign-off
  const signY = boxY + boxHeight + 10;
  if (signY + 20 <= pageHeight - 15) {
    const signRightX = textRightX - 55;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text("FOR HALO DESIGN HUB", signRightX, signY);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(signRightX, signY + 12, textRightX, signY + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text("Authorized Signature & Stamp", signRightX, signY + 16);
  }

  return finalizePDF(doc, data, 'RECEIPT', action);
};

/**
 * Universal helper to generate and return a PDF File & Blob for attaching or sharing.
 */
export const createDocumentPDFFile = (
  docType: 'quote' | 'invoice' | 'receipt',
  items: QuoteItem[],
  data: Partial<QuoteRecord> & { logo?: string },
  grandTotal: number,
  discountAmount: number,
  finalTotal: number
): GeneratedPDFOutput => {
  if (docType === 'invoice') {
    return generateInvoicePDF(items, data, grandTotal, discountAmount, finalTotal, 'file') as GeneratedPDFOutput;
  } else if (docType === 'receipt') {
    return generateReceiptPDF(items, data, grandTotal, discountAmount, finalTotal, 'file') as GeneratedPDFOutput;
  } else {
    return generateQuotationPDF(items, data, grandTotal, discountAmount, finalTotal, 'file') as GeneratedPDFOutput;
  }
};

export interface DailyScheduleEntry {
  companyName: string;
  address: string;
  descriptions: string;
}

export interface DailyScheduleData {
  date: string;
  dayOfWeek?: string;
  entries: DailyScheduleEntry[];
  fontSizeScale?: number;
  slotCount?: number;
}

/**
 * Generate and print / download Daily Outside Schedule PDF
 * Matches the official Halo Design Pte Ltd 4-slot daily installation & delivery schedule form
 */
export const generateDailyOutsideSchedulePDF = (
  data: DailyScheduleData,
  action: PDFAction = 'view'
): GeneratedPDFOutput | void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width; // 210mm
  const leftMargin = 18;
  const rightMargin = 18;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 174mm

  // Header position
  const headerY = 14;

  // 1. Logo "halo DESIGN PTE LTD" (clean tight bounds)
  const logoW = 26;
  const logoH = 13.2;
  const logoSrc = getHaloLogoBase64('DESIGN PTE LTD', true);
  if (logoSrc) {
    try {
      doc.addImage(logoSrc, 'PNG', leftMargin, headerY, logoW, logoH, undefined, 'FAST');
    } catch (e) {
      console.error("Error adding logo to schedule PDF", e);
    }
  } else {
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("halo", leftMargin, headerY + 8);
    doc.setFontSize(7.5);
    doc.text("DESIGN PTE LTD", leftMargin, headerY + 13);
  }

  // 2. Title: "Daily Outside Works Schedule" (Single row, generous clearance)
  const titleX = leftMargin + logoW + 4; // 18 + 26 + 4 = 48mm
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Daily Outside Works Schedule", titleX, headerY + 8);

  // 3. Right side: Day of week placed ALWAYS ON TOP of Date
  const dateRightX = pageWidth - rightMargin;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  const dayText = data.dayOfWeek ? data.dayOfWeek : "Day: ____________";
  const dateText = data.date ? `Date: ${data.date}` : "Date: ____________";

  // Top line: Day of week
  doc.text(dayText, dateRightX, headerY + 4.5, { align: 'right' });

  // Bottom line: Date (never on same line as title or overlapping)
  doc.text(dateText, dateRightX, headerY + 10, { align: 'right' });

  // 4. Schedule Slots (Dynamic count 1 - 8)
  const fontScale = data.fontSizeScale && data.fontSizeScale > 0 ? data.fontSizeScale : 1.0;
  const numSlots = Math.max(1, Math.min(8, data.slotCount || data.entries.length || 5));
  const startY = headerY + 16;
  const availableHeight = 250; // mm available on A4
  const slotHeight = Math.min(75, Math.floor(availableHeight / numSlots));
  const numberWidth = 8;
  const tableX = leftMargin + numberWidth;
  const tableWidth = contentWidth - numberWidth; // ~166mm
  const col1Width = 36; // Width for "Company Name:" and "Add:"
  const rowHeight = numSlots >= 6 ? 6.0 : 6.8;

  for (let i = 0; i < numSlots; i++) {
    const entry = data.entries[i] || { companyName: '', address: '', descriptions: '' };
    const slotTopY = startY + i * slotHeight;

    // Number (1 to 5) placed to the left of the table - fixed standard template size
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`${i + 1}`, leftMargin + 1.5, slotTopY + 5);

    // Box outer border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);
    doc.rect(tableX, slotTopY, tableWidth, rowHeight * 2);

    // Horizontal line separating Row 1 ("Company Name:") and Row 2 ("Add:")
    doc.line(tableX, slotTopY + rowHeight, tableX + tableWidth, slotTopY + rowHeight);

    // Vertical line separating column 1 from column 2
    doc.line(tableX + col1Width, slotTopY, tableX + col1Width, slotTopY + rowHeight * 2);

    // Row 1: Company Name label (fixed standard template size)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text("Company Name:", tableX + 2.5, slotTopY + 4.8);

    // Row 1 Input: User-entered company name (scaled by fontScale, distinct & prominent)
    if (entry.companyName) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12 * fontScale);
      const splitCompany = doc.splitTextToSize(entry.companyName, tableWidth - col1Width - 6);
      doc.text(splitCompany, tableX + col1Width + 3.5, slotTopY + 4.9);
    }

    // Row 2: Add: label (fixed standard template size)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text("Add:", tableX + 2.5, slotTopY + rowHeight + 4.8);

    // Row 2 Input: User-entered address (scaled by fontScale)
    if (entry.address) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5 * fontScale);
      const splitAddress = doc.splitTextToSize(entry.address, tableWidth - col1Width - 6);
      doc.text(splitAddress, tableX + col1Width + 3.5, slotTopY + rowHeight + 4.9);
    }

    // Row 3: Descriptions: label (fixed standard template size)
    const descY = slotTopY + rowHeight * 2 + 4.2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text("Descriptions:", tableX, descY);

    // Row 3 Input: User-entered descriptions (scaled by fontScale)
    const descContentY = descY + Math.max(4.0, 4.6 * fontScale);
    let descBottomY = descContentY;

    if (entry.descriptions) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10 * fontScale);
      doc.setTextColor(25, 25, 25);
      const splitDesc = doc.splitTextToSize(entry.descriptions, tableWidth - 4);
      doc.text(splitDesc, tableX, descContentY);
      const lines = Array.isArray(splitDesc) ? splitDesc.length : 1;
      descBottomY = descContentY + (lines - 1) * (4.8 * fontScale);
      doc.setTextColor(0, 0, 0);
    }

    // Handwriting guide lines for remaining notes space or blank clipboard templates
    const slotBottomLimit = slotTopY + slotHeight - 3.0;
    const guideSpacing = 5.2;
    doc.setDrawColor(215, 215, 215);
    doc.setLineWidth(0.18);

    let guideY = Math.max(descBottomY + 5.0, descY + 6.0);
    while (guideY <= slotBottomLimit) {
      doc.line(tableX, guideY, tableX + tableWidth, guideY);
      guideY += guideSpacing;
    }
  }

  const filename = `Daily_Outside_Works_Schedule_${(data.date || 'Template').replace(/[\/\s:]+/g, '_')}.pdf`;

  if (action === 'save') {
    doc.save(filename);
    return;
  }

  if (action === 'file') {
    const blob = doc.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf', lastModified: Date.now() });
    return { blob, file, filename };
  }

  if (action === 'print') {
    printJsPDF(doc, filename);
    return;
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    const dataUri = doc.output('datauristring');
    try {
      const win = window.open();
      if (win) {
        win.location.href = dataUri;
      } else {
        doc.save(filename);
      }
    } catch (e) {
      doc.save(filename);
    }
  } else {
    try {
      const blobUrl = doc.output('bloburl');
      const win = window.open(blobUrl as unknown as string, '_blank');
      if (!win) {
        doc.save(filename);
      }
    } catch (e) {
      doc.save(filename);
    }
  }
};

