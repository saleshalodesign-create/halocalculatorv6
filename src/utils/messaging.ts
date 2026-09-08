import { QuoteItem, QuoteRecord } from '../types';

export type DocumentType = 'quote' | 'invoice' | 'receipt';
export type MessageFormat = 'whatsapp' | 'email' | 'standard';

export const getStoredLang = (): 'zh' | 'en' => {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('halo_lang') : null;
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {
    // ignore
  }
  return 'zh';
};

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
  docType: DocumentType = 'quote',
  language?: 'zh' | 'en'
): string => {
  const lang = language || getStoredLang();
  const docNo = data.docNo ? `#${data.docNo}` : '';
  const client = data.customerName ? ` - ${data.customerName}` : '';
  
  if (lang === 'zh') {
    switch (docType) {
      case 'invoice':
        return `商业发票 (Tax Invoice) ${docNo}${client} | Halo 招牌设计中心`;
      case 'receipt':
        return `付款收据 (Receipt) ${docNo}${client} | Halo 招牌设计中心`;
      case 'quote':
      default:
        return `官方报价单 (Quotation) ${docNo}${client} | Halo 招牌设计中心`;
    }
  }

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
  language?: 'zh' | 'en';
}): string => {
  const {
    items = [],
    data = {},
    grandTotal = 0,
    discountAmount = 0,
    finalTotal = 0,
    docType = 'quote',
    format = 'whatsapp',
    language,
  } = params;

  const lang = language || getStoredLang();
  const isZh = lang === 'zh';

  const dateStr =
    data.dateFormatted ||
    new Date().toLocaleDateString(isZh ? 'zh-CN' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });

  const lines: string[] = [];
  const isInvoice = docType === 'invoice';
  const isReceipt = docType === 'receipt';
  
  let docLabel = isInvoice ? 'TAX INVOICE' : isReceipt ? 'PAYMENT RECEIPT' : 'QUOTATION';
  if (isZh) {
    docLabel = isInvoice ? '商业发票 (TAX INVOICE)' : isReceipt ? '付款收据 (RECEIPT)' : '报价单 (QUOTATION)';
  }

  let docNoLabel = isInvoice ? 'Invoice No' : isReceipt ? 'Receipt No' : 'Quotation No';
  if (isZh) {
    docNoLabel = isInvoice ? '发票单号' : isReceipt ? '收据单号' : '报价单号';
  }

  const formatCurrency = (val: number) =>
    `$${val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  if (format === 'whatsapp') {
    lines.push(`*HALO DESIGN HUB — ${docLabel}*`);
    if (data.docNo) lines.push(`*${docNoLabel}:* ${data.docNo}`);
    lines.push(`*${isZh ? '日期' : 'Date'}:* ${dateStr}`);
    if (data.customerName) lines.push(`*${isZh ? '客户姓名' : 'Client'}:* ${data.customerName}`);
    if (data.contact) lines.push(`*${isZh ? '联系人' : 'Attn / Contact'}:* ${data.contact}`);
    if (data.customerAddress) lines.push(`*${isZh ? '现场/安装地址' : 'Address / Site'}:* ${data.customerAddress}`);

    lines.push(`----------------------------------------`);
    if (isInvoice) {
      lines.push(isZh ? `*开票项目与服务明细:*` : `*ITEMS & SERVICES BILLED:*`);
    } else {
      lines.push(isZh ? `*工程范围:* 招牌设计、制作与现场安装` : `*SCOPE OF WORK:* TO DESIGN, SUPPLY & INSTALL`);
    }
    lines.push(``);

    items.forEach((item, idx) => {
      let itemDesc = `${idx + 1}. *${item.title.toUpperCase()}*`;
      if (data.showSizes !== false && item.originalWidth > 0 && item.originalHeight > 0) {
        itemDesc += ` [${item.originalWidth}x${item.originalHeight} ${(item.unit || '').toUpperCase()}]`;
      }
      const focLabel = isZh ? '免费赠送 (FOC)' : 'FOC';
      const lineTotal = item.totalPrice === 0 ? focLabel : formatCurrency(item.totalPrice * item.quantity);
      lines.push(`${itemDesc}`);
      const priceUnitStr = item.totalPrice === 0 ? (isZh ? '免费' : 'FOC') : formatCurrency(item.totalPrice);
      lines.push(`   └ ${isZh ? '数量' : 'Qty'}: ${item.quantity} × ${priceUnitStr} ➔ *${lineTotal}*`);
    });

    lines.push(`----------------------------------------`);
    if (discountAmount > 0) {
      lines.push(`${isZh ? '小计' : 'Subtotal'}: ${formatCurrency(grandTotal)}`);
      lines.push(`${isZh ? '折扣优惠' : 'Discount'}: -${formatCurrency(discountAmount)}`);
    }
    lines.push(`*${isZh ? '合计总额' : 'TOTAL'}: ${formatCurrency(finalTotal)}*`);

    if (data.deposit && data.deposit > 0) {
      let depLabel = isReceipt ? 'Amount Received' : isInvoice ? 'Deposit / Paid' : 'Required Deposit';
      if (isZh) {
        depLabel = isReceipt ? '已收定金/款项' : isInvoice ? '已付金额' : '预付定金';
      }
      const methodStr = data.paymentMethod || (isZh ? '已付款' : 'Paid');
      lines.push(`${depLabel} (${methodStr}): -${formatCurrency(Number(data.deposit))}`);
      const bal = Math.max(0, finalTotal - data.deposit);
      const balLabel = isInvoice
        ? (isZh ? '未结清余款' : 'OUTSTANDING BALANCE')
        : (isZh ? '应付余款' : 'BALANCE DUE');
      lines.push(`*${balLabel}: ${formatCurrency(bal)}*`);
    }

    if (isInvoice || isReceipt) {
      lines.push(`----------------------------------------`);
      lines.push(`*${isZh ? '付款方式' : 'Payment Mode'}:* ${data.paymentMethod || 'PAYNOW'}`);
      if (data.paymentTerms) lines.push(`*${isZh ? '付款条款' : 'Payment Terms'}:* ${data.paymentTerms}`);
      lines.push(`*PayNow UEN:* 201826136D (Halo Design Hub)`);
      lines.push(`*${isZh ? '华侨银行转账' : 'Bank Transfer'}:* OCBC 687-849-301-001`);
      lines.push(``);
      lines.push(`_Halo Design Hub (Halo 招牌设计中心)_`);
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
    lines.push(`${isZh ? '日期' : 'Date'}: ${dateStr}`);
    if (data.customerName) lines.push(`${isZh ? '客户姓名' : 'Client'}: ${data.customerName}`);
    if (data.contact) lines.push(`${isZh ? '联系人' : 'Attn'}: ${data.contact}`);
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
  language?: 'zh' | 'en';
}): string => {
  const {
    data = {},
    finalTotal = 0,
    docType = 'quote',
    filename = 'Document.pdf',
    format = 'whatsapp',
    language,
  } = params;

  const lang = language || getStoredLang();
  const isZh = lang === 'zh';

  let docLabel = docType === 'invoice' ? 'Tax Invoice' : docType === 'receipt' ? 'Payment Receipt' : 'Quotation';
  if (isZh) {
    docLabel = docType === 'invoice' ? '商业发票 (Tax Invoice)' : docType === 'receipt' ? '付款收据 (Receipt)' : '报价单 (Quotation)';
  }

  const docNo = data.docNo ? `#${data.docNo}` : '';
  const client = data.customerName || (isZh ? '尊敬的客户' : 'Valued Client');
  const totalFormatted = `$${finalTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  if (format === 'whatsapp') {
    if (isZh) {
      return [
        `*HALO DESIGN HUB — 官方${docLabel}*`,
        data.docNo ? `*单据编号:* ${data.docNo}` : '',
        `*客户姓名:* ${client}`,
        `*总计金额:* ${totalFormatted}`,
        ``,
        `📎 *官方 PDF 单据文件:* ${filename}`,
        `随信呈附官方单据，请审阅确认。如需修改细节请随时告知。`,
        ``,
        `*付款指引 (PayNow UEN):* 201826136D (HALO DESIGN HUB)`,
        `*华侨银行转账:* OCBC Bank 687-849-301-001`,
        ``,
        `_Halo Design Hub (Halo 招牌设计中心)_ | Blk 113 Eunos Ave 3, #01-16 Singapore 409838`,
        `电话: 6844 4928 / 6844 4929`
      ].filter(Boolean).join('\n');
    }

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
  if (isZh) {
    return [
      `尊敬的 ${client}，您好：`,
      ``,
      `随邮件附上 Halo 招牌设计中心的官方${docLabel} ${docNo}，合计金额为 SGD ${totalFormatted}。`,
      ``,
      `📎 附件单据: ${filename}`,
      ``,
      `付款信息:`,
      `• PayNow (UEN): 201826136D (HALO DESIGN HUB)`,
      `• 银行转账: OCBC Bank 687-849-301-001 (HALO DESIGN HUB)`,
      ``,
      `如您有任何疑问或需要调整设计与规格，请随时联系我们。`,
      ``,
      `感谢您的合作与支持！`,
      `Halo 招牌设计中心 (Halo Design Hub)`,
      `Blk 113 Eunos Ave 3, #01-16 Singapore 409838`,
      `电话: 6844 4928 / 6844 4929`
    ].join('\n');
  }

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

