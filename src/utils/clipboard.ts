import { QuoteItem, QuoteRecord } from '../types';
import { formatDocumentMessage, DocumentType, MessageFormat } from './messaging';

export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard failed, using fallback', err);
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Copy failed:', err);
    return false;
  }
};

export const formatQuotationText = (
  items: QuoteItem[],
  data: Partial<QuoteRecord> = {},
  grandTotal: number = 0,
  discountAmount: number = 0,
  finalTotal: number = 0,
  format: 'whatsapp' | 'standard' | 'email' = 'whatsapp',
  docType: DocumentType = 'quote'
): string => {
  return formatDocumentMessage({
    items,
    data,
    grandTotal,
    discountAmount,
    finalTotal,
    docType: data.docType || docType,
    format: format as MessageFormat,
  });
};
