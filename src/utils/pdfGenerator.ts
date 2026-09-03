import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QuoteItem, QuoteRecord } from '../types';

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

  if (data.logo) {
    try {
      doc.addImage(data.logo, 'PNG', logoX, logoY, 44, 25, undefined, 'FAST');
    } catch (e) {
      console.error("Error adding logo", e);
    }
  } else {
    const textX = logoX;
    const textY = logoY + 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);

    const charSpaceHal = 0.4;
    // @ts-ignore
    doc.text("hal", textX, textY, { renderingMode: 'fillThenStroke', charSpace: charSpaceHal });
    const rawHalWidth = doc.getTextWidth("hal");
    const halWidth = rawHalWidth + (2 * charSpaceHal);
    const dhY = textY + 2.2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.setLineWidth(0.1);
    // @ts-ignore
    doc.text("DESIGN HUB", textX, dhY, { renderingMode: 'fill' });

    const iconCx = textX + halWidth + 8;
    const iconCy = textY - 1;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.6);
    doc.circle(iconCx, iconCy, 6.5, 'S');
    doc.setDrawColor(193, 216, 47);
    doc.setLineWidth(2.5);
    doc.circle(iconCx, iconCy, 3.5, 'S');

    const angle = -45 * (Math.PI / 180);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(2.2);
    doc.line(iconCx, iconCy, iconCx + Math.cos(angle) * 4.8, iconCy + Math.sin(angle) * 4.8);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.2);
    doc.line(iconCx, iconCy, iconCx + Math.cos(angle) * 4.8, iconCy + Math.sin(angle) * 4.8);

    doc.setFillColor(255, 255, 255);
    doc.circle(iconCx - 6.5, iconCy, 1.4, 'F');
    doc.setFillColor(128, 128, 128);
    doc.circle(iconCx - 6.5, iconCy, 0.9, 'F');

    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.4);
    doc.line(textX, dhY + 1.5, textX + halWidth, dhY + 1.5);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
  }
};

export type PDFAction = 'view' | 'save' | 'file';

export interface GeneratedPDFOutput {
  blob: Blob;
  file: File;
  filename: string;
}

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

  // Action is 'view'
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    const dataUri = doc.output('datauristring');
    const win = window.open();
    if (win) win.location.href = dataUri;
  } else {
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl as unknown as string, '_blank');
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

