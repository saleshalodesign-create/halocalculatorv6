import { QuoteItem, QuoteRecord } from '../types';

export type DocumentType = 'quote' | 'invoice' | 'receipt';
export type MessageFormat = 'whatsapp' | 'email' | 'standard';

/**
 * Sanitizes and formats phone numbers.
 * Supports Singapore 8-digit numbers (+65) and international numbers.
 */
export const cleanPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  // Remove spaces, hyphens, brackets, leading plus
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '').replace(/^\+/, '');
  
  // If 8 digits starting with 8, 9, or 6 (common Singapore numbers), prepend 65
  if (/^[689]\d{7}$/.test(cleaned)) {
    return `65${cleaned}`;
  }
  
  return cleaned;
};

/**
 * Generates an email subject line based on document type
 */
export const getDocumentSubject = (
  data: Partial<QuoteRecord> = {},
  docType: DocumentType = 'quote'
): string => {
  const docNo = data.docNo ? `#${data.docNo}` : '';
  const client = data.customerName ? ` - ${data.customerName}` : '';
  
  switch (docType) {
    case 'invoice':
      return `Tax Invoice ${docNo}${client} | Halo Design Hub`;
    case 'receipt':
      return `Payment Receipt ${docNo}${client} | Halo Design Hub`;
    case 'quote':
    default:
      return `Official Quotation ${docNo}${client} | Halo Design Hub`;
  }
};

/**
 * Formats a quotation, invoice, or receipt into structured text for WhatsApp, Email, or plain text.
 */
export const formatDocumentMessage = (params: {
  items: QuoteItem[];
  data?: Partial<QuoteRecord>;
  grandTotal?: number;
  discountAmount?: number;
  finalTotal?: number;
  docType?: DocumentType;
  format?: MessageFormat;
}): string => {
  const {
    items = [],
    data = {},
    grandTotal = 0,
    discountAmount = 0,
    finalTotal = 0,
    docType = 'quote',
    format = 'whatsapp',
  } = params;

  const dateStr =
    data.dateFormatted ||
    new Date().toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });

  const lines: string[] = [];
  const isInvoice = docType === 'invoice';
  const isReceipt = docType === 'receipt';
  const docLabel = isInvoice ? 'TAX INVOICE' : isReceipt ? 'PAYMENT RECEIPT' : 'QUOTATION';
  const docNoLabel = isInvoice ? 'Invoice No' : isReceipt ? 'Receipt No' : 'Quotation No';

  const formatCurrency = (val: number) =>
    `$${val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  if (format === 'whatsapp') {
    lines.push(`*HALO DESIGN HUB — ${docLabel}*`);
    if (data.docNo) lines.push(`*${docNoLabel}:* ${data.docNo}`);
    lines.push(`*Date:* ${dateStr}`);
    if (data.customerName) lines.push(`*Client:* ${data.customerName}`);
    if (data.contact) lines.push(`*Attn / Contact:* ${data.contact}`);
    if (data.customerAddress) lines.push(`*Address / Site:* ${data.customerAddress}`);

    lines.push(`----------------------------------------`);
    lines.push(isInvoice ? `*ITEMS & SERVICES BILLED:*` : `*SCOPE OF WORK:* TO DESIGN, SUPPLY & INSTALL`);
    lines.push(``);

    items.forEach((item, idx) => {
      let itemDesc = `${idx + 1}. *${item.title.toUpperCase()}*`;
      if (data.showSizes !== false && item.originalWidth > 0 && item.originalHeight > 0) {
        itemDesc += ` [${item.originalWidth}x${item.originalHeight} ${(item.unit || '').toUpperCase()}]`;
      }
      const lineTotal = item.totalPrice === 0 ? 'FOC' : formatCurrency(item.totalPrice * item.quantity);
      lines.push(`${itemDesc}`);
      lines.push(`   └ Qty: ${item.quantity} × ${item.totalPrice === 0 ? 'FOC' : formatCurrency(item.totalPrice)} ➔ *${lineTotal}*`);
    });

    lines.push(`----------------------------------------`);
    if (discountAmount > 0) {
      lines.push(`Subtotal: ${formatCurrency(grandTotal)}`);
      lines.push(`Discount: -${formatCurrency(discountAmount)}`);
    }
    lines.push(`*TOTAL: ${formatCurrency(finalTotal)}*`);

    if (data.deposit && data.deposit > 0) {
      const depLabel = isReceipt ? 'Amount Received' : isInvoice ? 'Deposit / Paid' : 'Required Deposit';
      lines.push(`${depLabel} (${data.paymentMethod || 'Paid'}): -${formatCurrency(Number(data.deposit))}`);
      const bal = Math.max(0, finalTotal - data.deposit);
      lines.push(`*${isInvoice ? 'OUTSTANDING BALANCE' : 'BALANCE DUE'}: ${formatCurrency(bal)}*`);
    }

    if (isInvoice || isReceipt) {
      lines.push(`----------------------------------------`);
      lines.push(`*Payment Mode:* ${data.paymentMethod || 'PAYNOW'}`);
      if (data.paymentTerms) lines.push(`*Payment Terms:* ${data.paymentTerms}`);
      lines.push(`*PayNow UEN:* 201826136D (Halo Design Hub)`);
      lines.push(`*Bank Transfer:* OCBC 687-849-301-001`);
      lines.push(``);
      lines.push(`_Halo Design Hub_`);
      lines.push(`Blk 113 Eunos Ave 3, #01-16 Gordon Industrial Building, Singapore 409838`);
      lines.push(`Tel: 6844 4928 / 6844 4929 | sales.halodesign@gmail.com`);
    } else {
      lines.push(`----------------------------------------`);
      lines.push(`*PayNow UEN:* 201826136D (Halo Design Hub)`);
    }
  } else if (format === 'email') {
    // Email plain text format
    lines.push(`HALO DESIGN HUB — ${docLabel}`);
    lines.push(`====================================================`);
    if (data.docNo) lines.push(`${docNoLabel}: ${data.docNo}`);
    lines.push(`Date: ${dateStr}`);
    if (data.customerName) lines.push(`Client: ${data.customerName}`);
    if (data.contact) lines.push(`Attn: ${data.contact}`);
    if (data.customerAddress) lines.push(`Address / Site: ${data.customerAddress}`);
    lines.push(`====================================================`);
    lines.push(isInvoice ? `ITEMS & SERVICES BILLED:` : `SCOPE OF WORK: TO DESIGN, SUPPLY & INSTALL`);
    lines.push(``);

    items.forEach((item, idx) => {
      let itemDesc = `${idx + 1}. ${item.title.toUpperCase()}`;
      if (data.showSizes !== false && item.originalWidth > 0 && item.originalHeight > 0) {
        itemDesc += ` [${item.originalWidth}x${item.originalHeight} ${(item.unit || '').toUpperCase()}]`;
      }
      const lineTotal = item.totalPrice === 0 ? 'FOC' : formatCurrency(item.totalPrice * item.quantity);
      lines.push(`${itemDesc}`);
      lines.push(`   Quantity: ${item.quantity} | Unit Price: ${item.totalPrice === 0 ? 'FOC' : formatCurrency(item.totalPrice)} | Total: ${lineTotal}`);
    });

    lines.push(`----------------------------------------------------`);
    if (discountAmount > 0) {
      lines.push(`Subtotal: ${formatCurrency(grandTotal)}`);
      lines.push(`Discount: -${formatCurrency(discountAmount)}`);
    }
    lines.push(`TOTAL: ${formatCurrency(finalTotal)}`);

    if (data.deposit && data.deposit > 0) {
      const depLabel = isReceipt ? 'Amount Received' : isInvoice ? 'Deposit / Paid' : 'Required Deposit';
      lines.push(`${depLabel} (${data.paymentMethod || 'Paid'}): -${formatCurrency(Number(data.deposit))}`);
      const bal = Math.max(0, finalTotal - data.deposit);
      lines.push(`${isInvoice ? 'OUTSTANDING BALANCE' : 'BALANCE DUE'}: ${formatCurrency(bal)}`);
    }

    if (isInvoice || isReceipt) {
      lines.push(`====================================================`);
      lines.push(`PAYMENT DETAILS:`);
      lines.push(`- Payment Mode: ${data.paymentMethod || 'PAYNOW'}`);
      if (data.paymentTerms) lines.push(`- Terms: ${data.paymentTerms}`);
      lines.push(`- PayNow UEN: 201826136D (Entity: Halo Design Hub)`);
      lines.push(`- Bank Transfer: OCBC Bank (Current A/C: 687-849-301-001)`);
      lines.push(``);
      lines.push(`Best regards,`);
      lines.push(`Halo Design Hub`);
      lines.push(`Blk 113 Eunos Ave 3, #01-16 Gordon Industrial Building, Singapore 409838`);
      lines.push(`Tel: 6844 4928 / 6844 4929`);
      lines.push(`Email: sales.halodesign@gmail.com`);
    } else {
      lines.push(`====================================================`);
      lines.push(`PayNow UEN: 201826136D (Halo Design Hub)`);
    }
  } else {
    // Standard plain
    lines.push(`HALO DESIGN HUB — ${docLabel}`);
    if (data.docNo) lines.push(`${docNoLabel}: ${data.docNo}`);
    lines.push(`Date: ${dateStr}`);
    if (data.customerName) lines.push(`Client: ${data.customerName}`);
    if (data.contact) lines.push(`Attn: ${data.contact}`);
    if (data.customerAddress) lines.push(`Address: ${data.customerAddress}`);
    lines.push(`========================================`);
    lines.push(isInvoice ? `RE: TAX INVOICE` : `RE: TO DESIGN, SUPPLY & INSTALL`);
    lines.push(``);

    items.forEach((item, idx) => {
      let itemDesc = `${idx + 1}. ${item.title.toUpperCase()}`;
      if (data.showSizes !== false && item.originalWidth > 0 && item.originalHeight > 0) {
        itemDesc += ` [${item.originalWidth}x${item.originalHeight} ${(item.unit || '').toUpperCase()}]`;
      }
      const lineTotal = item.totalPrice === 0 ? 'FOC' : formatCurrency(item.totalPrice * item.quantity);
      lines.push(`${itemDesc} (x${item.quantity}) - ${lineTotal}`);
    });

    lines.push(`========================================`);
    if (discountAmount > 0) {
      lines.push(`Subtotal: ${formatCurrency(grandTotal)}`);
      lines.push(`Discount: -${formatCurrency(discountAmount)}`);
    }
    lines.push(`TOTAL: ${formatCurrency(finalTotal)}`);

    if (data.deposit && data.deposit > 0) {
      lines.push(`Deposit: -${formatCurrency(Number(data.deposit))}`);
      const bal = Math.max(0, finalTotal - data.deposit);
      lines.push(`BALANCE DUE: ${formatCurrency(bal)}`);
    }

    if (isInvoice || isReceipt) {
      lines.push(``);
      lines.push(`Halo Design Hub`);
      lines.push(`Blk 113 Eunos Ave 3, #01-16 Gordon Industrial Building, Singapore 409838`);
      lines.push(`Tel: 6844 4928 / 6844 4929`);
    } else {
      lines.push(`----------------------------------------`);
      lines.push(`PayNow UEN: 201826136D (Halo Design Hub)`);
    }
  }

  return lines.join('\n');
};

/**
 * Triggers WhatsApp Web or Mobile app to send the formatted quotation or invoice.
 */
export const openWhatsApp = (params: {
  phone?: string;
  text: string;
}): void => {
  const { phone = '', text } = params;
  const cleanPhone = cleanPhoneNumber(phone);
  
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

  // Safe DOM link trigger to bypass iframe or popup restrictions
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Triggers an email client (mailto:) or Gmail web composer to send the formatted document.
 */
export const openEmail = (params: {
  email?: string;
  subject: string;
  body: string;
  useGmailWeb?: boolean;
}): void => {
  const { email = '', subject, body, useGmailWeb = false } = params;

  let url: string;
  if (useGmailWeb) {
    url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  } else {
    url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      body
    )}`;
  }

  const link = document.createElement('a');
  link.href = url;
  if (useGmailWeb) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Checks if the Web Share API is available on the current device
 */
export const canShareNative = (): boolean => {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
};

/**
 * Shares content natively using Web Share API
 */
export const shareNative = async (params: {
  title: string;
  text: string;
  files?: File[];
}): Promise<boolean> => {
  if (!canShareNative()) return false;
  try {
    if (params.files && params.files.length > 0 && navigator.canShare && navigator.canShare({ files: params.files })) {
      await navigator.share({
        title: params.title,
        text: params.text,
        files: params.files,
      });
      return true;
    }
    await navigator.share({
      title: params.title,
      text: params.text,
    });
    return true;
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.warn('Native share failed:', err);
    }
    return false;
  }
};

/**
 * Triggers a client-side file download
 */
export const downloadBlobOrFile = (blobOrFile: Blob | File, filename: string): void => {
  const url = URL.createObjectURL(blobOrFile);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/**
 * Formats a short notice message for sending alongside a PDF document.
 */
export const formatPDFCoverMessage = (params: {
  data?: Partial<QuoteRecord>;
  finalTotal?: number;
  docType?: DocumentType;
  filename?: string;
  format?: 'whatsapp' | 'email';
}): string => {
  const {
    data = {},
    finalTotal = 0,
    docType = 'quote',
    filename = 'Document.pdf',
    format = 'whatsapp',
  } = params;

  const docLabel = docType === 'invoice' ? 'Tax Invoice' : docType === 'receipt' ? 'Payment Receipt' : 'Quotation';
  const docNo = data.docNo ? `#${data.docNo}` : '';
  const client = data.customerName || 'Valued Client';
  const totalFormatted = `$${finalTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  if (format === 'whatsapp') {
    return [
      `*HALO DESIGN HUB — Official ${docLabel}*`,
      data.docNo ? `*Document No:* ${data.docNo}` : '',
      `*Client:* ${client}`,
      `*Total Amount:* ${totalFormatted}`,
      ``,
      `📎 *Official PDF Document:* ${filename}`,
      `Please find our official PDF document for your review.`,
      ``,
      `*Payment Instructions (PayNow UEN):* 201826136D (HALO DESIGN HUB)`,
      `*Bank Transfer:* OCBC Bank 687-345678-001`,
      ``,
      `_Halo Design Hub_ | Blk 113 Eunos Ave 3, #01-16 Singapore 409838`,
      `Tel: 6844 4928 / 6844 4929`
    ].filter(Boolean).join('\n');
  }

  // Email
  return [
    `Dear ${client},`,
    ``,
    `Please find attached our official ${docLabel} ${docNo} for the amount of SGD ${totalFormatted}.`,
    ``,
    `📎 Attached Document: ${filename}`,
    ``,
    `Payment Details:`,
    `• PayNow (UEN): 201826136D (HALO DESIGN HUB)`,
    `• Bank Transfer: OCBC Bank 687-345678-001 (HALO DESIGN HUB)`,
    ``,
    `Please let us know if you have any questions or require revisions.`,
    ``,
    `Thank you for your business,`,
    `Halo Design Hub`,
    `Blk 113 Eunos Ave 3, #01-16 Singapore 409838`,
    `Tel: 6844 4928 / 6844 4929`
  ].join('\n');
};

