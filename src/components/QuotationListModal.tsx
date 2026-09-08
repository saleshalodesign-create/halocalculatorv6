import React, { useState } from 'react';
import { QuoteItem, QuoteRecord, Unit, UnitType, LanguageType } from '../types';
import { getTranslation } from '../data/translations';
import { AuthContextType } from '../hooks/useFirebaseAuth';
import { GoogleIcon } from './GoogleIcon';
import { copyToClipboard, formatQuotationText } from '../utils/clipboard';
import {
  formatDocumentMessage,
  openWhatsApp,
  openEmail,
  getDocumentSubject,
  DocumentType,
  downloadBlobOrFile,
  formatPDFCoverMessage,
  canShareNative,
  shareNative,
} from '../utils/messaging';
import { SendShareModal } from './SendShareModal';
import {
  generateQuotationPDF,
  generateInvoicePDF,
  generateReceiptPDF,
  createDocumentPDFFile,
} from '../utils/pdfGenerator';
import {
  FileText,
  Plus,
  Trash,
  Check,
  Copy,
  Download,
  Search,
  Cloud,
  FolderOpen,
  Ruler,
  MessageSquare,
  Mail,
  Share2,
  Phone,
  AtSign,
  Send,
  FileCheck,
} from 'lucide-react';

export const PRESET_ITEMS: Array<{ name: string; nameZh: string; price: number }> = [
  { name: 'Laminated A4', nameZh: 'A4 塑封', price: 25 },
  { name: 'Laminated A3', nameZh: 'A3 塑封', price: 35 },
  { name: 'Standard Banner', nameZh: '标准横幅', price: 90 },
  { name: 'A1 Poster', nameZh: 'A1 海报', price: 180 },
  { name: 'A1 Poster with Stand', nameZh: 'A1 海报带展架', price: 230 },
  { name: 'EasyRoll', nameZh: '易拉宝', price: 280 },
  { name: 'Menu Book', nameZh: '菜单本', price: 85 },
  { name: 'Pricing Sticker', nameZh: '标价贴纸', price: 50 },
  { name: 'On-Site Transformer Replacement', nameZh: '上门更换变压器', price: 180 },
  { name: 'On-Site Pricing Sticker Replacement', nameZh: '上门更换标价贴纸', price: 80 },
  { name: 'On-Site Photoshoot Services', nameZh: '上门摄影服务', price: 200 },
  { name: 'Photoshoot Services', nameZh: '摄影服务', price: 40 },
  { name: 'T5 LED', nameZh: 'T5 LED 灯管', price: 25 },
  { name: 'T8 LED', nameZh: 'T8 LED 灯管', price: 30 },
  { name: 'Labour Charges', nameZh: '人工安装费', price: 180 },
];

interface QuotationListModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: QuoteItem[];
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onClearAll: () => void;
  onAddCustomItem: (item: QuoteItem) => void;
  onUpdateItem: (id: string, updates: Partial<QuoteItem>) => void;
  auth: AuthContextType;
  onLoadQuoteRecord: (record: QuoteRecord) => void;
  language?: LanguageType;
}

export const QuotationListModal: React.FC<QuotationListModalProps> = ({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onUpdateQuantity,
  onClearAll,
  onAddCustomItem,
  onUpdateItem,
  auth,
  onLoadQuoteRecord,
  language = 'en',
}) => {
  const t = getTranslation(language);
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'cloudRecords'>('active');
  const [formMode, setFormMode] = useState<'quote' | 'invoice' | 'receipt' | 'textPreview' | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [textFormat, setTextFormat] = useState<'whatsapp' | 'standard'>('whatsapp');
  const [toastMessage, setToastMessage] = useState('');
  const [recordSearch, setRecordSearch] = useState('');
  const [isSavingCloud, setIsSavingCloud] = useState(false);

  // Custom Item inputs
  const [customName, setCustomName] = useState('');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [customUnit, setCustomUnit] = useState<UnitType>(Unit.IN);
  const [customPrice, setCustomPrice] = useState('');
  const [customQuantity, setCustomQuantity] = useState('1');

  // Document Details
  const [docNo, setDocNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [contact, setContact] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deposit, setDeposit] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PAYNOW');
  const [paymentTerms, setPaymentTerms] = useState('Due within 7 days');
  const [showSizes, setShowSizes] = useState(true);
  const [sendFormat, setSendFormat] = useState<'text' | 'pdf'>('text');

  // Send & Share Modal Target State
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendModalTarget, setSendModalTarget] = useState<{
    items: QuoteItem[];
    recordData: Partial<QuoteRecord>;
    grandTotal: number;
    discountAmount: number;
    finalTotal: number;
    docType: DocumentType;
  } | null>(null);
  const [textPreviewDocType, setTextPreviewDocType] = useState<DocumentType>('quote');

  // Discount
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);

  const grandTotal = items.reduce((sum, item) => sum + item.totalPrice * item.quantity, 0);
  const discountAmount =
    discountType === 'percent'
      ? grandTotal * (discountValue / 100)
      : discountType === 'fixed'
      ? discountValue
      : 0;
  const finalTotal = Math.max(0, grandTotal - discountAmount);

  const { user, cloudQuotes, saveQuoteToCloud, deleteQuoteFromCloud, setAuthModalOpen } = auth || {};

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleSaveToCloud = async () => {
    if (items.length === 0) {
      showToast('Add items before saving to your account');
      return;
    }
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setIsSavingCloud(true);
    const generatedDocNo =
      docNo.trim() ||
      `HDH-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(
        100 + Math.random() * 900
      )}`;
    if (!docNo) setDocNo(generatedDocNo);

    const quotePayload: Partial<QuoteRecord> = {
      docNo: generatedDocNo,
      customerName: customerName || 'Valued Client',
      customerAddress,
      contact,
      customerPhone,
      customerEmail,
      deposit: parseFloat(deposit) || 0,
      paymentMethod,
      paymentTerms,
      showSizes,
      discountType,
      discountValue,
      grandTotal,
      discountAmount,
      finalTotal,
      items: [...items],
      dateFormatted: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    try {
      await saveQuoteToCloud(quotePayload);
      showToast('Saved to Google Account successfully!');
    } catch (e) {
      console.error('Save error:', e);
      showToast('Failed to save to cloud');
    } finally {
      setIsSavingCloud(false);
    }
  };

  const handleLoadRecord = (record: QuoteRecord) => {
    if (onLoadQuoteRecord) {
      onLoadQuoteRecord(record);
    }
    if (record.docNo) setDocNo(record.docNo);
    if (record.customerName) setCustomerName(record.customerName);
    if (record.customerAddress) setCustomerAddress(record.customerAddress);
    if (record.contact) setContact(record.contact);
    if (record.customerPhone) setCustomerPhone(record.customerPhone);
    if (record.customerEmail) setCustomerEmail(record.customerEmail);
    if (record.deposit !== undefined) setDeposit(record.deposit.toString());
    if (record.discountType) setDiscountType(record.discountType);
    if (record.discountValue !== undefined) setDiscountValue(record.discountValue);
    if (record.paymentMethod) setPaymentMethod(record.paymentMethod);
    if (record.paymentTerms) setPaymentTerms(record.paymentTerms);
    if (record.showSizes !== undefined) setShowSizes(record.showSizes);
    setActiveSubTab('active');
    showToast(`Loaded document #${record.docNo || 'Record'} into workspace!`);
  };

  const handleOpenSendModal = (
    docTypeParam: DocumentType = 'quote',
    recordOverride?: QuoteRecord
  ) => {
    if (recordOverride) {
      setSendModalTarget({
        items: recordOverride.items || [],
        recordData: recordOverride,
        grandTotal: recordOverride.grandTotal || 0,
        discountAmount: recordOverride.discountAmount || 0,
        finalTotal: recordOverride.finalTotal || recordOverride.grandTotal || 0,
        docType: docTypeParam,
      });
    } else {
      if (items.length === 0) {
        showToast('Add items before sending document');
        return;
      }
      setSendModalTarget({
        items,
        recordData: {
          docNo,
          customerName,
          customerAddress,
          contact,
          customerPhone,
          customerEmail,
          deposit: parseFloat(deposit) || 0,
          paymentMethod,
          paymentTerms,
          showSizes,
          docType: docTypeParam,
        },
        grandTotal,
        discountAmount,
        finalTotal,
        docType: docTypeParam,
      });
    }
    setSendModalOpen(true);
  };

  const handleQuickWhatsApp = async (
    docTypeParam: DocumentType = 'quote',
    formatMode: 'text' | 'pdf' = sendFormat,
    customData?: Partial<QuoteRecord>,
    customItems?: QuoteItem[]
  ) => {
    const activeItems = customItems || items;
    if (activeItems.length === 0) {
      showToast('Add items first before sending via WhatsApp');
      return;
    }
    const data: Partial<QuoteRecord> = customData || {
      docNo,
      customerName,
      customerAddress,
      contact,
      customerPhone,
      customerEmail,
      deposit: parseFloat(deposit) || 0,
      paymentMethod,
      paymentTerms,
      showSizes,
      docType: docTypeParam,
    };
    const gTotal = customData?.grandTotal ?? grandTotal;
    const dAmount = customData?.discountAmount ?? discountAmount;
    const fTotal = customData?.finalTotal ?? finalTotal;
    const phoneToSend = data.customerPhone || data.contact || '';

    if (formatMode === 'pdf') {
      try {
        showToast('Generating official PDF document...');
        const pdfOutput = createDocumentPDFFile(docTypeParam, activeItems, data, gTotal, dAmount, fTotal);
        const pdfCover = formatPDFCoverMessage({
          data,
          finalTotal: fTotal,
          docType: docTypeParam,
          filename: pdfOutput.filename,
          format: 'whatsapp',
        });

        if (canShareNative() && navigator.canShare && navigator.canShare({ files: [pdfOutput.file] })) {
          const shared = await shareNative({
            title: getDocumentSubject(data, docTypeParam),
            text: pdfCover,
            files: [pdfOutput.file],
          });
          if (shared) {
            showToast('Shared PDF directly to WhatsApp!');
            return;
          }
        }

        downloadBlobOrFile(pdfOutput.file, pdfOutput.filename);
        openWhatsApp({
          phone: phoneToSend,
          text: pdfCover,
        });
        showToast(`PDF downloaded! Attach ${pdfOutput.filename} in WhatsApp.`);
      } catch (err) {
        console.error('WhatsApp PDF error:', err);
        showToast('Failed to generate PDF for WhatsApp');
      }
      return;
    }

    const text = formatDocumentMessage({
      items: activeItems,
      data,
      grandTotal: gTotal,
      discountAmount: dAmount,
      finalTotal: fTotal,
      docType: docTypeParam,
      format: 'whatsapp',
    });

    openWhatsApp({
      phone: phoneToSend,
      text,
    });
    showToast(`Launching WhatsApp with ${docTypeParam === 'invoice' ? 'Invoice' : 'Quotation'} text...`);
  };

  const handleQuickEmail = async (
    docTypeParam: DocumentType = 'quote',
    formatMode: 'text' | 'pdf' = sendFormat,
    customData?: Partial<QuoteRecord>,
    customItems?: QuoteItem[]
  ) => {
    const activeItems = customItems || items;
    if (activeItems.length === 0) {
      showToast('Add items first before sending via Email');
      return;
    }
    const data: Partial<QuoteRecord> = customData || {
      docNo,
      customerName,
      customerAddress,
      contact,
      customerPhone,
      customerEmail,
      deposit: parseFloat(deposit) || 0,
      paymentMethod,
      paymentTerms,
      showSizes,
      docType: docTypeParam,
    };
    const gTotal = customData?.grandTotal ?? grandTotal;
    const dAmount = customData?.discountAmount ?? discountAmount;
    const fTotal = customData?.finalTotal ?? finalTotal;
    const subject = getDocumentSubject(data, docTypeParam);

    if (formatMode === 'pdf') {
      try {
        showToast('Generating official PDF document...');
        const pdfOutput = createDocumentPDFFile(docTypeParam, activeItems, data, gTotal, dAmount, fTotal);
        const pdfCover = formatPDFCoverMessage({
          data,
          finalTotal: fTotal,
          docType: docTypeParam,
          filename: pdfOutput.filename,
          format: 'email',
        });

        if (canShareNative() && navigator.canShare && navigator.canShare({ files: [pdfOutput.file] })) {
          const shared = await shareNative({
            title: subject,
            text: pdfCover,
            files: [pdfOutput.file],
          });
          if (shared) {
            showToast('Shared PDF directly to Mail!');
            return;
          }
        }

        downloadBlobOrFile(pdfOutput.file, pdfOutput.filename);
        openEmail({
          email: data.customerEmail || '',
          subject,
          body: pdfCover,
        });
        showToast(`PDF downloaded! Attach ${pdfOutput.filename} to your email draft.`);
      } catch (err) {
        console.error('Email PDF error:', err);
        showToast('Failed to generate PDF for Email');
      }
      return;
    }

    const body = formatDocumentMessage({
      items: activeItems,
      data,
      grandTotal: gTotal,
      discountAmount: dAmount,
      finalTotal: fTotal,
      docType: docTypeParam,
      format: 'email',
    });

    openEmail({
      email: data.customerEmail || '',
      subject,
      body,
    });
    showToast(`Opening email client for ${docTypeParam === 'invoice' ? 'Invoice' : 'Quotation'}...`);
  };

  const handleCopyAllQuotes = async (
    formatOverride?: 'whatsapp' | 'standard' | 'email',
    docTypeOverride?: DocumentType
  ) => {
    if (items.length === 0) return;
    const resolvedDocType = docTypeOverride || (formMode === 'invoice' ? 'invoice' : 'quote');
    const data: Partial<QuoteRecord> = {
      docNo,
      customerName,
      customerAddress,
      contact,
      customerPhone,
      customerEmail,
      deposit: parseFloat(deposit) || 0,
      paymentMethod,
      paymentTerms,
      showSizes,
      docType: resolvedDocType,
    };
    const format = formatOverride || textFormat;
    const text = formatDocumentMessage({
      items,
      data,
      grandTotal,
      discountAmount,
      finalTotal,
      docType: resolvedDocType,
      format,
    });
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      showToast(`${resolvedDocType === 'invoice' ? 'Invoice' : 'Quotation'} text copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getPreviewText = () => {
    return formatDocumentMessage({
      items,
      data: {
        docNo,
        customerName,
        customerAddress,
        contact,
        customerPhone,
        customerEmail,
        deposit: parseFloat(deposit) || 0,
        paymentMethod,
        paymentTerms,
        showSizes,
      },
      grandTotal,
      discountAmount,
      finalTotal,
      docType: textPreviewDocType,
      format: textFormat,
    });
  };

  const handleSendAsWhatsAppFromPreview = () => {
    if (items.length === 0) {
      showToast('Add items first before sending via WhatsApp');
      return;
    }
    const text = getPreviewText();
    const phoneToSend = customerPhone || contact || '';
    openWhatsApp({
      phone: phoneToSend,
      text,
    });
    showToast(`Launching WhatsApp with ${textPreviewDocType === 'invoice' ? 'Invoice' : 'Quotation'} text...`);
  };

  const handleSendAsEmailFromPreview = () => {
    if (items.length === 0) {
      showToast('Add items first before sending via Email');
      return;
    }
    const text = getPreviewText();
    const data: Partial<QuoteRecord> = {
      docNo,
      customerName,
      customerAddress,
      contact,
      customerPhone,
      customerEmail,
      deposit: parseFloat(deposit) || 0,
      paymentMethod,
      paymentTerms,
      showSizes,
      docType: textPreviewDocType,
    };
    const subject = getDocumentSubject(data, textPreviewDocType);
    openEmail({
      email: customerEmail || '',
      subject,
      body: text,
    });
    showToast(`Opening email client for ${textPreviewDocType === 'invoice' ? 'Invoice' : 'Quotation'}...`);
  };

  const handleCopySingleItem = async (item: QuoteItem, index: number) => {
    let desc = `${index + 1}. ${item.title.toUpperCase()}`;
    if (item.originalWidth > 0) {
      desc += ` [${item.originalWidth}x${item.originalHeight} ${(item.unit || '').toUpperCase()}]`;
    }
    const priceStr = item.totalPrice === 0 ? 'FOC' : `$${(item.totalPrice * item.quantity).toFixed(2)}`;
    const itemText = `${desc} x${item.quantity} = ${priceStr}`;
    const success = await copyToClipboard(itemText);
    if (success) {
      setCopiedItemId(item.id);
      showToast(`Copied item #${index + 1} to clipboard!`);
      setTimeout(() => setCopiedItemId(null), 1800);
    }
  };

  const handleAddCustom = () => {
    const price = parseFloat(customPrice);
    const qty = parseInt(customQuantity) || 1;
    const w = parseFloat(customWidth);
    const h = parseFloat(customHeight);
    const hasDimensions = !isNaN(w) && !isNaN(h) && w > 0 && h > 0;

    let finalTitle = customName.trim();
    if (!finalTitle) {
      if (hasDimensions) {
        finalTitle = `Custom Signage (${w}×${h} ${customUnit})`;
      } else if (!isNaN(price)) {
        finalTitle = 'Custom Signage / Item';
      } else {
        showToast('Please enter an item description or price.');
        return;
      }
    }

    const finalPrice = isNaN(price) || price < 0 ? 0 : price;

    onAddCustomItem({
      id: Date.now().toString(),
      timestamp: Date.now(),
      quantity: qty,
      title: finalTitle,
      totalPrice: finalPrice,
      widthInches: 0,
      heightInches: 0,
      unit: hasDimensions ? customUnit : Unit.IN,
      originalWidth: hasDimensions ? w : 0,
      originalHeight: hasDimensions ? h : 0,
      colorTheme: 'blue',
    });

    setCustomName('');
    setCustomPrice('');
    setCustomWidth('');
    setCustomHeight('');
    setCustomQuantity('1');
    showToast(`Added "${finalTitle}" to quote list!`);
  };

  const handleExport = (action: 'view' | 'save') => {
    const data = {
      docNo,
      customerName,
      customerAddress,
      contact,
      deposit: parseFloat(deposit) || 0,
      paymentMethod,
      paymentTerms,
      showSizes,
    };

    try {
      if (formMode === 'quote') {
        generateQuotationPDF(items, data, grandTotal, discountAmount, finalTotal, action);
      } else if (formMode === 'invoice') {
        generateInvoicePDF(items, data, grandTotal, discountAmount, finalTotal, action);
      } else {
        generateReceiptPDF(items, data, grandTotal, discountAmount, finalTotal, action);
      }
    } catch (e) {
      console.error('PDF export failed:', e);
    }
  };

  const filteredCloudRecords = (cloudQuotes || []).filter(q => {
    const searchLower = recordSearch.toLowerCase();
    const docMatch = (q.docNo || '').toLowerCase().includes(searchLower);
    const clientMatch = (q.customerName || '').toLowerCase().includes(searchLower);
    const itemsMatch = (q.items || []).some(it => (it.title || '').toLowerCase().includes(searchLower));
    return docMatch || clientMatch || itemsMatch;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-6 bg-black/50 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-4xl h-[96vh] sm:h-[90vh] bg-white dark:bg-[#1e1e24] rounded-xl sm:rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 flex flex-col overflow-hidden relative"
      >
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 dark:bg-white/95 text-white dark:text-neutral-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold shadow-xl backdrop-blur-md flex items-center gap-1.5 sm:gap-2 border border-white/20 animate-fade-in">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            {toastMessage}
          </div>
        )}

        {/* macOS Window Top Bar */}
        <div className="min-h-[38px] sm:min-h-[44px] px-2.5 sm:px-4 py-1 sm:py-1.5 bg-slate-50 dark:bg-[#18181c] border-b border-slate-200/90 dark:border-white/10 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 select-none">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-[#FF5F56] hover:brightness-90 flex items-center justify-center text-black/60"
            ></button>
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FFBD2E]"></span>
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27C93F]"></span>
          </div>

          {/* Center Navigation Tabs: Active Quote vs Google Cloud Records */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-200/70 dark:bg-white/10 text-xs font-semibold">
            <button
              onClick={() => {
                setActiveSubTab('active');
                setFormMode(null);
              }}
              className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-md transition-all flex items-center gap-1 sm:gap-1.5 ${
                activeSubTab === 'active'
                  ? 'bg-white dark:bg-[#282830] shadow-sm text-slate-900 dark:text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:hover:text-neutral-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t.activeTab} ({items.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveSubTab('cloudRecords');
                setFormMode(null);
              }}
              className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-md transition-all flex items-center gap-1 sm:gap-1.5 ${
                activeSubTab === 'cloudRecords'
                  ? 'bg-white dark:bg-[#282830] shadow-sm text-slate-900 dark:text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:hover:text-neutral-200'
              }`}
            >
              <GoogleIcon className="w-3.5 h-3.5" />
              <span>{t.cloudTab} ({cloudQuotes?.length || 0})</span>
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {activeSubTab === 'active' && !formMode && (
              <>
                <button
                  onClick={handleSaveToCloud}
                  disabled={isSavingCloud || items.length === 0}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-800 hover:bg-slate-50 text-slate-800 dark:text-neutral-200 border border-slate-200 dark:border-white/10 flex items-center gap-1 transition-all shadow-sm active:scale-95 disabled:opacity-40"
                  title="Save current quote to Google Account"
                >
                  <Cloud className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden sm:inline">{isSavingCloud ? t.cloudSaving : t.save}</span>
                </button>
                <button
                  onClick={() => setShowCustomForm(!showCustomForm)}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    showCustomForm
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-neutral-200 hover:bg-slate-300'
                  }`}
                  title="Toggle Custom Item drawer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showCustomForm ? t.hideForm : t.addCustom}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* TAB 1: ACTIVE QUOTE WORKSPACE */}
        {activeSubTab === 'active' &&
          (!formMode ? (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-[#18181c]/50">
              {/* Compact Custom Item Drawer */}
              {showCustomForm && (
                <div className="p-2 sm:p-3 bg-white dark:bg-[#24242a] border-b border-black/10 dark:border-white/10 space-y-1.5 sm:space-y-2 animate-fade-in shrink-0">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder={t.customItemDescPlaceholder}
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                      className="flex-1 min-w-0 px-2.5 py-1 sm:py-1.5 text-xs rounded-lg bg-neutral-100 dark:bg-[#18181c] border border-black/10 dark:border-white/10 focus:ring-1 focus:ring-blue-500 outline-none text-neutral-900 dark:text-white"
                    />
                    {/* Beside Item Description: Preset Items Dropdown */}
                    <select
                      id="preset-items-dropdown"
                      value=""
                      onChange={e => {
                        const selected = PRESET_ITEMS.find(p => p.name === e.target.value);
                        if (selected) {
                          setCustomName(language === 'zh' && selected.nameZh ? selected.nameZh : selected.name);
                          setCustomPrice(selected.price.toString());
                          showToast(`${t.quickPresets}: ${selected.name} ($${selected.price})`);
                        }
                      }}
                      className="w-32 sm:w-44 px-2 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 outline-none hover:border-blue-500 transition-colors cursor-pointer shrink-0 truncate"
                      title={t.quickPresets}
                    >
                      <option value="" disabled>
                        ⚡ {t.quickPresets} ({PRESET_ITEMS.length})
                      </option>
                      {PRESET_ITEMS.map(item => (
                        <option
                          key={item.name}
                          value={item.name}
                          className="bg-white dark:bg-[#1e1e24] text-neutral-900 dark:text-neutral-100 font-normal"
                        >
                          {language === 'zh' && item.nameZh ? `${item.nameZh} (${item.name})` : item.name} — ${item.price}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="W"
                        value={customWidth}
                        onChange={e => setCustomWidth(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                        className="w-11 sm:w-16 px-1.5 py-1 text-xs font-mono rounded-md bg-neutral-100 dark:bg-[#18181c] border border-black/10 dark:border-white/10 outline-none text-neutral-900 dark:text-white text-center"
                        title={t.widthLabel}
                      />
                      <span className="text-[10px] text-neutral-400">×</span>
                      <input
                        type="number"
                        placeholder="H"
                        value={customHeight}
                        onChange={e => setCustomHeight(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                        className="w-11 sm:w-16 px-1.5 py-1 text-xs font-mono rounded-md bg-neutral-100 dark:bg-[#18181c] border border-black/10 dark:border-white/10 outline-none text-neutral-900 dark:text-white text-center"
                        title={t.heightLabel}
                      />
                      <select
                        value={customUnit}
                        onChange={e => setCustomUnit(e.target.value as UnitType)}
                        className="px-1 py-1 text-xs rounded-md bg-neutral-100 dark:bg-[#18181c] border border-black/10 dark:border-white/10 outline-none text-neutral-800 dark:text-neutral-200"
                      >
                        <option value={Unit.IN}>in</option>
                        <option value={Unit.FT}>ft</option>
                        <option value={Unit.CM}>cm</option>
                        <option value={Unit.MM}>mm</option>
                        <option value={Unit.M}>m</option>
                      </select>
                    </div>

                    <input
                      type="number"
                      placeholder="Qty"
                      value={customQuantity}
                      onChange={e => setCustomQuantity(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                      className="w-10 sm:w-14 px-1.5 py-1 text-xs font-mono rounded-md bg-neutral-100 dark:bg-[#18181c] border border-black/10 dark:border-white/10 outline-none text-neutral-900 dark:text-white text-center"
                      title={t.quantityLabel}
                    />

                    <div className="flex items-center bg-neutral-100 dark:bg-[#18181c] px-1.5 py-1 rounded-md border border-black/10 dark:border-white/10">
                      <span className="text-[11px] text-neutral-500 mr-0.5">$</span>
                      <input
                        type="number"
                        placeholder="Price"
                        value={customPrice}
                        onChange={e => setCustomPrice(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                        className="w-14 sm:w-20 bg-transparent text-xs font-mono outline-none text-neutral-900 dark:text-white font-bold"
                        title={t.priceLabel}
                      />
                    </div>

                    <button
                      onClick={handleAddCustom}
                      className="px-3 py-1 rounded-md bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 ml-auto transition-transform active:scale-95 shadow-sm shrink-0"
                    >
                      {t.addItem}
                    </button>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1.5 sm:space-y-2 mac-scrollbar min-h-0">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-400 py-6 sm:py-10 px-4 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2 sm:mb-3">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <p className="text-xs sm:text-base font-bold text-slate-800 dark:text-neutral-100">
                      {t.emptyQuoteTitle}
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-neutral-400 max-w-sm mt-1 leading-relaxed">
                      {t.emptyQuoteDesc}
                    </p>
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white dark:bg-[#24242a] border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 shadow-sm hover:border-blue-500/40 transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="text-xs font-mono text-slate-400 dark:text-neutral-500 font-bold">{index + 1}.</span>
                          <input
                            type="text"
                            value={item.title}
                            onChange={e => onUpdateItem(item.id, { title: e.target.value })}
                            className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-blue-500 flex-1 min-w-0"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-500 dark:text-neutral-400 font-mono mt-0.5 sm:mt-1 ml-3 sm:ml-5">
                          {item.originalWidth > 0 && (
                            <span className="text-slate-500 dark:text-neutral-400 text-[10px] sm:text-xs">
                              {item.originalWidth} × {item.originalHeight} {item.unit}
                            </span>
                          )}
                          <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-[#18181c] px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-white/10 hover:border-blue-500/50 focus-within:border-blue-500 transition-colors">
                            <span className="text-slate-500 dark:text-neutral-500 font-bold text-[10px] sm:text-xs">$</span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.totalPrice === 0 ? '' : item.totalPrice}
                              placeholder="0.00"
                              onChange={e => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                onUpdateItem(item.id, { totalPrice: isNaN(val) ? 0 : val });
                              }}
                              className="w-12 sm:w-16 bg-transparent text-[10px] sm:text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                              title="Click to edit unit price"
                            />
                            <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-neutral-400">/unit</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                        {/* Qty */}
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-neutral-100 dark:bg-white/10 flex items-center justify-center font-bold hover:bg-neutral-200 text-xs text-neutral-800 dark:text-neutral-200 active:scale-95"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => {
                              const q = parseInt(e.target.value);
                              onUpdateItem(item.id, { quantity: isNaN(q) || q < 1 ? 1 : q });
                            }}
                            className="w-6 sm:w-7 text-center font-mono font-bold text-xs text-neutral-900 dark:text-white bg-transparent outline-none border-b border-transparent focus:border-blue-500"
                            title="Edit quantity"
                          />
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-neutral-100 dark:bg-white/10 flex items-center justify-center font-bold hover:bg-neutral-200 text-xs text-neutral-800 dark:text-neutral-200 active:scale-95"
                          >
                            +
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right min-w-[60px] sm:w-20">
                          <span className="font-mono font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                            ${(item.totalPrice * item.quantity).toFixed(2)}
                          </span>
                        </div>

                        {/* Action Buttons: Copy Item & Delete */}
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <button
                            onClick={() => handleCopySingleItem(item, index)}
                            className={`p-1 sm:p-1.5 rounded-md border transition-all ${
                              copiedItemId === item.id
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 border-transparent hover:bg-neutral-100 dark:hover:bg-white/10'
                            }`}
                            title="Copy this line item"
                          >
                            {copiedItemId === item.id ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="text-neutral-400 hover:text-red-500 p-1 sm:p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-white/10 transition-all"
                            title="Delete item"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Compact Footer & Export bar */}
              <div className="p-2 sm:p-4 bg-white dark:bg-[#1e1e24] border-t border-slate-200/90 dark:border-white/10 flex flex-col gap-1.5 sm:gap-3 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-neutral-400">{t.discount}:</span>
                    <button
                      onClick={() => {
                        setDiscountType('percent');
                        setDiscountValue(5);
                      }}
                      className={`px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded transition-all ${
                        discountType === 'percent' && discountValue === 5
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 text-slate-700 dark:text-neutral-300'
                      }`}
                    >
                      5%
                    </button>
                    <button
                      onClick={() => {
                        setDiscountType('percent');
                        setDiscountValue(10);
                      }}
                      className={`px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded transition-all ${
                        discountType === 'percent' && discountValue === 10
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 text-slate-700 dark:text-neutral-300'
                      }`}
                    >
                      10%
                    </button>
                    <button
                      onClick={() => {
                        setDiscountType('none');
                        setDiscountValue(0);
                      }}
                      className={`px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded transition-all ${
                        discountType === 'none'
                          ? 'bg-slate-200 dark:bg-white/20 text-slate-900 dark:text-white shadow-inner font-bold'
                          : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 text-slate-700 dark:text-neutral-300'
                      }`}
                    >
                      0%
                    </button>

                    {/* Show / Hide Sizes quick toggle */}
                    <button
                      type="button"
                      onClick={() => setShowSizes(!showSizes)}
                      className={`px-1.5 py-0.5 text-[10px] sm:text-xs rounded font-semibold border transition-all flex items-center gap-1 ${
                        showSizes
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-neutral-500 border-slate-200 dark:border-white/10'
                      }`}
                      title={showSizes ? 'Dimensions included on PDF' : 'Dimensions hidden on PDF'}
                    >
                      <Ruler className="w-3 h-3" />
                      <span>{showSizes ? (language === 'zh' ? '含尺寸' : 'Sizes') : (language === 'zh' ? '无尺寸' : 'No Size')}</span>
                    </button>
                  </div>

                  <div className="flex items-baseline gap-1 shrink-0">
                    <span className="text-[10px] sm:text-xs text-slate-500 dark:text-neutral-400 uppercase font-bold tracking-wider">{t.grandTotal}:</span>
                    <div className="text-base sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                      ${finalTotal.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Action Buttons Grid: 3 columns even on mobile */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 pt-0.5 sm:pt-1">
                  <button
                    disabled={items.length === 0}
                    onClick={() => setFormMode('textPreview')}
                    className="py-1.5 sm:py-2.5 px-1 sm:px-3 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-neutral-200 font-bold text-[10px] sm:text-xs disabled:opacity-40 transition-all flex items-center justify-center gap-1 border border-slate-200 dark:border-white/10 active:scale-95 shadow-sm"
                  >
                    <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span className="truncate">{t.textPreview}</span>
                  </button>
                  <button
                    disabled={items.length === 0}
                    onClick={() => setFormMode('quote')}
                    className="py-1.5 sm:py-2.5 px-1 sm:px-3 rounded-lg sm:rounded-xl bg-blue-600 text-white font-bold text-[10px] sm:text-xs hover:bg-blue-500 disabled:opacity-40 transition-all flex items-center justify-center gap-1 shadow-md shadow-blue-500/20 active:scale-95"
                  >
                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span className="truncate">{t.quotePDF}</span>
                  </button>
                  <button
                    disabled={items.length === 0}
                    onClick={() => setFormMode('invoice')}
                    className="py-1.5 sm:py-2.5 px-1 sm:px-3 rounded-lg sm:rounded-xl bg-purple-600 text-white font-bold text-[10px] sm:text-xs hover:bg-purple-500 disabled:opacity-40 transition-all flex items-center justify-center gap-1 shadow-md shadow-purple-500/20 active:scale-95"
                  >
                    <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span className="truncate">{t.invoicePDF}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : formMode === 'textPreview' ? (
            /* Text Preview & Copy Mode */
            <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/10 dark:border-white/10 shrink-0">
                <button
                  onClick={() => setFormMode(null)}
                  className="text-sm text-blue-500 font-semibold flex items-center gap-1 hover:underline"
                >
                  ← Back to List
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Doc Type Selector */}
                  <div className="flex p-0.5 rounded-lg bg-neutral-200/70 dark:bg-white/10 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setTextPreviewDocType('quote')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        textPreviewDocType === 'quote'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      Quotation
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextPreviewDocType('invoice')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        textPreviewDocType === 'invoice'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      Invoice
                    </button>
                  </div>

                  {/* Sizes Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowSizes(!showSizes)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      showSizes
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                        : 'bg-neutral-100 dark:bg-white/10 text-neutral-500 border-black/10 dark:border-white/10'
                    }`}
                    title={showSizes ? 'Item dimensions included' : 'Item dimensions excluded'}
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>{showSizes ? 'Sizes: ON' : 'Sizes: OFF'}</span>
                  </button>

                  <div className="flex p-0.5 rounded-lg bg-neutral-100 dark:bg-white/10 text-xs font-semibold">
                    <button
                      onClick={() => setTextFormat('whatsapp')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        textFormat === 'whatsapp'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      WhatsApp Style
                    </button>
                    <button
                      onClick={() => setTextFormat('standard')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        textFormat === 'standard'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      Standard Plain
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold uppercase text-neutral-400">
                    {textPreviewDocType === 'invoice' ? 'Tax Invoice Text Output' : 'Quotation Text Output'}:
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">Ready to send directly or paste</span>
                </div>
                <textarea
                  readOnly
                  value={getPreviewText()}
                  className="flex-1 w-full p-4 rounded-xl font-mono text-xs bg-neutral-100/80 dark:bg-[#141418] border border-black/10 dark:border-white/10 outline-none text-neutral-800 dark:text-neutral-200 resize-none leading-relaxed mac-scrollbar select-all"
                />
              </div>

              {/* Recipient Quick Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-2 px-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="Recipient WhatsApp (+65 9123 4567)"
                    className="w-full text-xs bg-transparent outline-none placeholder:text-neutral-400 text-neutral-800 dark:text-neutral-200"
                  />
                </div>
                <div className="flex items-center gap-2 px-1">
                  <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    placeholder="Recipient Email (client@company.com)"
                    className="w-full text-xs bg-transparent outline-none placeholder:text-neutral-400 text-neutral-800 dark:text-neutral-200"
                  />
                </div>
              </div>

              {/* Action Buttons: WhatsApp, Email, Copy */}
              <div className="pt-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSendAsWhatsAppFromPreview}
                  className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send as WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendAsEmailFromPreview}
                  className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 active:scale-95"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send as Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyAllQuotes(textFormat, textPreviewDocType)}
                  className="py-3 px-3 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-neutral-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border border-black/5 dark:border-white/10 active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy Formatted Text'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* PDF Details Configuration Form */
            <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-4 mac-scrollbar">
              <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                <button
                  onClick={() => setFormMode(null)}
                  className="text-sm text-blue-500 font-semibold flex items-center gap-1 hover:underline"
                >
                  ← Back to List
                </button>
                <span className="text-xs uppercase font-bold text-neutral-400">Generate {formMode}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500">Customer / Company Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Client name"
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#18181c] border border-black/10 dark:border-white/10 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500">Document No</label>
                  <input
                    type="text"
                    value={docNo}
                    onChange={e => setDocNo(e.target.value)}
                    placeholder="e.g. QT-2026-001"
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#18181c] border border-black/10 dark:border-white/10 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-neutral-500">Address / Location</label>
                <textarea
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  placeholder="Site or delivery location"
                  className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#18181c] border border-black/10 dark:border-white/10 text-sm outline-none focus:ring-2 focus:ring-blue-500 h-20 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500">Attention / Contact</label>
                  <input
                    type="text"
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    placeholder="Contact person"
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#18181c] border border-black/10 dark:border-white/10 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500">
                    {formMode === 'receipt' ? 'Amount Received ($)' : formMode === 'invoice' ? 'Deposit / Paid ($)' : 'Deposit Amount ($)'}
                  </label>
                  <input
                    type="number"
                    value={deposit}
                    onChange={e => setDeposit(e.target.value)}
                    placeholder={formMode === 'receipt' ? finalTotal.toFixed(2) : "0.00"}
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#18181c] border border-black/10 dark:border-white/10 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Direct Messaging Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>WhatsApp Mobile No. (e.g. +65 9123 4567)</span>
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="+65 9123 4567"
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#18181c] border border-black/10 dark:border-white/10 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500 flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-blue-500" />
                    <span>Client Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#18181c] border border-black/10 dark:border-white/10 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Payment Method & Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500">Payment Method / Mode</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#18181c] border border-black/10 dark:border-white/10 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-white font-medium"
                  >
                    <option value="PAYNOW">PayNow (UEN: 201826136D)</option>
                    <option value="BANK TRANSFER">Bank Transfer (OCBC)</option>
                    <option value="CHEQUE">Cheque (Halo Design Hub)</option>
                    <option value="CASH">Cash on Delivery</option>
                    <option value="CREDIT CARD">Credit Card / Online</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-500">Payment Terms</label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    placeholder="e.g. Due within 7 days"
                    className="w-full mt-1 p-2.5 rounded-xl bg-neutral-100 dark:bg-[#18181c] border border-black/10 dark:border-white/10 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Show / Hide Dimensions Option Card */}
              <div className="p-3.5 rounded-xl bg-neutral-100 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl transition-all ${showSizes ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-neutral-500/10 text-neutral-400'}`}>
                    <Ruler className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <span>Item Dimensions & Sizes</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        showSizes 
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : 'bg-neutral-500/15 text-neutral-500 dark:text-neutral-400 border border-neutral-500/20'
                      }`}>
                        {showSizes ? 'Showing Sizes' : 'Sizes Hidden'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {showSizes 
                        ? 'Dimensions (e.g. [120X36 IN]) are printed next to item names in the document.' 
                        : 'Dimensions are omitted (prints item names only without size specifications).'}
                    </p>
                  </div>
                </div>

                <div className="flex p-0.5 rounded-xl bg-white dark:bg-[#121316] border border-black/10 dark:border-white/10 shadow-sm shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowSizes(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      showSizes
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Show Sizes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSizes(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      !showSizes
                        ? 'bg-neutral-700 text-white shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Hide Sizes
                  </button>
                </div>
              </div>

              {/* Payment Breakdown Card Preview */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-neutral-700 dark:text-neutral-300">Payment Summary on PDF:</div>
                  <div className="text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Mode: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{paymentMethod}</span> | Terms: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{paymentTerms || 'Standard'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-neutral-500 text-[10px] uppercase font-bold">Total</div>
                    <div className="font-bold text-sm text-neutral-900 dark:text-white font-mono">${finalTotal.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 text-[10px] uppercase font-bold">Paid / Deposit</div>
                    <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                      ${(parseFloat(deposit) || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-500 text-[10px] uppercase font-bold">Balance Due</div>
                    <div className="font-bold text-sm text-red-600 dark:text-red-400 font-mono">
                      ${Math.max(0, finalTotal - (parseFloat(deposit) || 0)).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Send Format Selector: Text vs PDF */}
              <div className="p-3 rounded-xl bg-neutral-100 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${sendFormat === 'pdf' ? 'bg-blue-500/10 text-blue-500' : 'bg-neutral-200/50 dark:bg-white/10 text-neutral-600 dark:text-neutral-300'}`}>
                    {sendFormat === 'pdf' ? <FileCheck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Send Format: {sendFormat === 'pdf' ? 'Official PDF Document' : 'Formatted Text Summary'}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {sendFormat === 'pdf'
                        ? 'Prepares high-resolution PDF document with branding and PayNow instructions'
                        : 'Sends clean, copyable text breakdown directly into chat or email'}
                    </div>
                  </div>
                </div>

                <div className="flex p-0.5 rounded-xl bg-white dark:bg-[#121316] border border-black/10 dark:border-white/10 shadow-sm shrink-0">
                  <button
                    type="button"
                    onClick={() => setSendFormat('text')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      sendFormat === 'text'
                        ? 'bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Send as Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendFormat('pdf')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      sendFormat === 'pdf'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Send as PDF</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickWhatsApp(formMode === 'invoice' ? 'invoice' : 'quote', sendFormat)}
                    className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                    title={sendFormat === 'pdf' ? 'Prepare & send PDF via WhatsApp' : 'Send WhatsApp text summary'}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{sendFormat === 'pdf' ? 'Send WhatsApp (PDF)' : 'Send WhatsApp (Text)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickEmail(formMode === 'invoice' ? 'invoice' : 'quote', sendFormat)}
                    className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 active:scale-95"
                    title={sendFormat === 'pdf' ? 'Prepare & attach PDF in email' : 'Send email body text'}
                  >
                    <Mail className="w-4 h-4" />
                    <span>{sendFormat === 'pdf' ? 'Send Email (PDF)' : 'Send Email (Text)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenSendModal(formMode === 'invoice' ? 'invoice' : 'quote')}
                    className="py-3 px-3 rounded-xl bg-neutral-800 dark:bg-white/15 hover:bg-neutral-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Share2 className="w-4 h-4 text-blue-400" />
                    <span>Send & Share Hub</span>
                  </button>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleCopyAllQuotes(textFormat, formMode === 'invoice' ? 'invoice' : 'quote')}
                    className="py-3 px-4 rounded-xl bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 text-neutral-800 dark:text-neutral-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border border-black/5 dark:border-white/10 active:scale-95"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('view')}
                    className="flex-1 py-3 rounded-xl bg-neutral-100 dark:bg-white/10 font-bold text-xs sm:text-sm hover:bg-neutral-200 dark:hover:bg-white/20 flex items-center justify-center gap-2 transition-all text-neutral-800 dark:text-neutral-200"
                  >
                    Preview PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('save')}
                    className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-bold text-xs sm:text-sm hover:bg-blue-600 flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                </div>
              </div>
            </div>
          ))}

        {/* TAB 2: CLOUD SAVED RECORDS */}
        {activeSubTab === 'cloudRecords' && (
          <div className="flex-1 flex flex-col min-h-0 bg-neutral-50/50 dark:bg-[#18181c]/50 p-4 sm:p-6 space-y-4">
            {user ? (
              <>
                {/* Search & Cloud Status Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search saved quotes by Doc #, customer name, items..."
                      value={recordSearch}
                      onChange={e => setRecordSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-[#24242a] border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="font-mono">
                      {cloudQuotes?.length || 0} Records on {user.email}
                    </span>
                  </div>
                </div>

                {/* Records List */}
                <div className="flex-1 overflow-y-auto space-y-3 mac-scrollbar">
                  {filteredCloudRecords.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 py-16">
                      <Cloud className="w-12 h-12 opacity-20 mb-2" />
                      <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                        {recordSearch
                          ? 'No matching quotations found'
                          : 'No saved records in your Google Account yet'}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                        Switch to the "Active Quote" tab and click "Save to Cloud" to backup your quotes
                        permanently.
                      </p>
                    </div>
                  ) : (
                    filteredCloudRecords.map(record => (
                      <div
                        key={record.id}
                        className="p-4 rounded-2xl bg-white dark:bg-[#24242a] border border-black/5 dark:border-white/5 hover:border-blue-500/40 shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[11px] font-mono font-bold">
                              {record.docNo || 'NO-DOC-ID'}
                            </span>
                            <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                              {record.customerName || 'Valued Client'}
                            </h4>
                            <span className="text-[11px] text-neutral-400 font-mono">
                              {record.dateFormatted ||
                                new Date(record.createdAt || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 truncate">
                            {(record.items || []).map(i => `${i.quantity}x ${i.title}`).join(', ')}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono mt-1.5">
                            <span>{record.items?.length || 0} Items</span>
                            {record.deposit !== undefined && record.deposit > 0 && (
                              <span>Deposit: ${Number(record.deposit).toFixed(2)}</span>
                            )}
                          </div>
                        </div>

                        {/* Pricing & Record Actions */}
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">
                              Total
                            </span>
                            <span className="text-lg font-black font-mono text-neutral-900 dark:text-white">
                              ${Number(record.finalTotal || record.grandTotal || 0).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {/* Load into Workspace */}
                            <button
                              onClick={() => handleLoadRecord(record)}
                              className="px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                              title="Open and load this quote back into the calculator"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span>Open Record</span>
                            </button>

                            {/* Copy Text */}
                            <button
                              onClick={async () => {
                                const txt = formatQuotationText(
                                  record.items || [],
                                  record,
                                  record.grandTotal || 0,
                                  record.discountAmount || 0,
                                  record.finalTotal || 0,
                                  'whatsapp'
                                );
                                await copyToClipboard(txt);
                                showToast(`Copied #${record.docNo} text!`);
                              }}
                              className="p-2 rounded-xl bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 text-neutral-700 dark:text-neutral-300 transition-all"
                              title="Copy quote text"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete from Cloud */}
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Delete quote #${record.docNo || 'this record'} from your Google account?`
                                  )
                                ) {
                                  deleteQuoteFromCloud(record.id);
                                  showToast('Deleted from Google Cloud');
                                }
                              }}
                              className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                              title="Delete record"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* Not Logged In State for Cloud Tab */
              <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-white dark:bg-[#24242a] shadow-xl border border-black/10 dark:border-white/10 flex items-center justify-center">
                  <GoogleIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Sign In to View Cloud Records
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                    Log in with your Google account to keep all customer quotations, invoice numbers, custom
                    sizing, and pricing records synced across all your devices.
                  </p>
                </div>
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95"
                >
                  <GoogleIcon className="w-4 h-4" />
                  <span>Sign In with Google</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* WhatsApp / Email / PDF Send & Share Modal */}
      {sendModalOpen && (
        <SendShareModal
          isOpen={sendModalOpen}
          onClose={() => {
            setSendModalOpen(false);
            setSendModalTarget(null);
          }}
          items={sendModalTarget?.items || items}
          recordData={
            sendModalTarget?.recordData || {
              docNo,
              customerName,
              customerAddress,
              contact,
              customerPhone,
              customerEmail,
              deposit: parseFloat(deposit) || 0,
              paymentMethod,
              paymentTerms,
              showSizes,
            }
          }
          grandTotal={sendModalTarget?.grandTotal ?? grandTotal}
          discountAmount={sendModalTarget?.discountAmount ?? discountAmount}
          finalTotal={sendModalTarget?.finalTotal ?? finalTotal}
          docType={sendModalTarget?.docType || (formMode === 'invoice' ? 'invoice' : 'quote')}
          initialSendFormat={sendFormat}
        />
      )}
    </div>
  );
};
