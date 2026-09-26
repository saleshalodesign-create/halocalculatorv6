import React, { useState, useEffect } from 'react';
import { QuoteItem, QuoteRecord } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  DocumentType,
  formatDocumentMessage,
  getDocumentSubject,
  openWhatsApp,
  openEmail,
  cleanPhoneNumber,
  canShareNative,
  shareNative,
  downloadBlobOrFile,
  formatPDFCoverMessage,
} from '../utils/messaging';
import { copyToClipboard } from '../utils/clipboard';
import {
  generateQuotationPDF,
  generateInvoicePDF,
  generateReceiptPDF,
  createDocumentPDFFile,
} from '../utils/pdfGenerator';
import {
  MessageSquare,
  Mail,
  Send,
  Share2,
  Copy,
  Check,
  Download,
  Phone,
  AtSign,
  FileText,
  ExternalLink,
  Eye,
  Ruler,
  FileCheck,
} from 'lucide-react';

interface SendShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: QuoteItem[];
  recordData?: Partial<QuoteRecord>;
  grandTotal: number;
  discountAmount?: number;
  finalTotal?: number;
  initialDocType?: DocumentType;
  docType?: DocumentType;
  initialSendFormat?: 'text' | 'pdf';
}

export const SendShareModal: React.FC<SendShareModalProps> = ({
  isOpen,
  onClose,
  items,
  recordData: rawRecordData,
  grandTotal,
  discountAmount = 0,
  finalTotal = grandTotal,
  initialDocType,
  docType: docTypeProp,
  initialSendFormat = 'text',
}) => {
  const { language } = useLanguage();
  const recordData: Partial<QuoteRecord> = rawRecordData || {};
  const effectiveInitialType: DocumentType = docTypeProp || initialDocType || (recordData.docType as DocumentType) || 'quote';
  const [docType, setDocType] = useState<DocumentType>(effectiveInitialType);
  const [sendFormat, setSendFormat] = useState<'text' | 'pdf'>(initialSendFormat);
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email' | 'preview'>('whatsapp');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [showSizes, setShowSizes] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Sync initial record data
  useEffect(() => {
    if (isOpen) {
      const startType: DocumentType = docTypeProp || initialDocType || (recordData.docType as DocumentType) || 'quote';
      setDocType(startType);
      if (initialSendFormat) {
        setSendFormat(initialSendFormat);
      }
      // Attempt to populate phone from recordData.customerPhone or contact
      const contactVal = recordData.customerPhone || recordData.contact || '';
      // If contact contains digits, set as default phone
      if (/\d/.test(contactVal)) {
        setPhone(contactVal);
      } else {
        setPhone('');
      }

      setEmail(recordData.customerEmail || '');
      setShowSizes(recordData.showSizes !== false);
      setEmailSubject(getDocumentSubject(recordData, startType, language));
    }
  }, [isOpen, initialDocType, docTypeProp, initialSendFormat, recordData, language]);

  // Update email subject when docType or language changes
  useEffect(() => {
    setEmailSubject(getDocumentSubject(recordData, docType, language));
  }, [docType, recordData, language]);

  if (!isOpen) return null;

  const currentData: Partial<QuoteRecord> = {
    ...recordData,
    showSizes,
    docType,
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const pdfFilename = `${docType.charAt(0).toUpperCase() + docType.slice(1)}_${currentData.docNo || 'Draft'}.pdf`;

  const whatsappMessage = formatDocumentMessage({
    items,
    data: currentData,
    grandTotal,
    discountAmount,
    finalTotal,
    docType,
    format: 'whatsapp',
    language,
  });

  const emailBody = formatDocumentMessage({
    items,
    data: currentData,
    grandTotal,
    discountAmount,
    finalTotal,
    docType,
    format: 'email',
    language,
  });

  const pdfCoverWhatsApp = formatPDFCoverMessage({
    data: currentData,
    finalTotal,
    docType,
    filename: pdfFilename,
    format: 'whatsapp',
    language,
  });

  const pdfCoverEmail = formatPDFCoverMessage({
    data: currentData,
    finalTotal,
    docType,
    filename: pdfFilename,
    format: 'email',
    language,
  });

  // --- SEND HANDLERS FOR TEXT ---
  const handleSendWhatsAppText = () => {
    openWhatsApp({
      phone,
      text: whatsappMessage,
    });
    showToast(language === 'zh' ? '正在打开 WhatsApp...' : 'Opening WhatsApp with text summary...');
  };

  const handleCopyWhatsApp = async (textToCopy = whatsappMessage) => {
    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopied(true);
      showToast(language === 'zh' ? '已复制文本到剪贴板！' : 'Copied text to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendEmailAppText = () => {
    openEmail({
      email,
      subject: emailSubject || getDocumentSubject(currentData, docType, language),
      body: emailBody,
      useGmailWeb: false,
    });
    showToast(language === 'zh' ? '正在启动默认邮件应用...' : 'Launching default email client...');
  };

  const handleSendGmailWebText = () => {
    openEmail({
      email,
      subject: emailSubject || getDocumentSubject(currentData, docType, language),
      body: emailBody,
      useGmailWeb: true,
    });
    showToast(language === 'zh' ? '正在打开网页版 Gmail...' : 'Opening Gmail Web composer...');
  };

  const handleCopyEmail = async (textToCopy = `Subject: ${emailSubject}\n\n${emailBody}`) => {
    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopied(true);
      showToast(language === 'zh' ? '邮件内容已复制到剪贴板！' : 'Email content copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // --- SEND HANDLERS FOR PDF ---
  const handleSendWhatsAppPDF = async () => {
    try {
      showToast(language === 'zh' ? '正在生成正式 PDF 文档...' : 'Generating official PDF document...');
      const pdfOutput = createDocumentPDFFile(docType, items, currentData, grandTotal, discountAmount, finalTotal);

      // Check if native mobile file share works (iOS/Android)
      if (canShareNative() && navigator.canShare && navigator.canShare({ files: [pdfOutput.file] })) {
        const shared = await shareNative({
          title: getDocumentSubject(currentData, docType, language),
          text: pdfCoverWhatsApp,
          files: [pdfOutput.file],
        });
        if (shared) {
          showToast(language === 'zh' ? '已直接分享 PDF 到 WhatsApp！' : 'Shared PDF directly to WhatsApp!');
          return;
        }
      }

      // Download file to user device, then open WhatsApp with pre-filled cover note
      downloadBlobOrFile(pdfOutput.file, pdfOutput.filename);
      openWhatsApp({
        phone,
        text: pdfCoverWhatsApp,
      });
      showToast(language === 'zh' ? `PDF 已下载！请在 WhatsApp 中附加 ${pdfOutput.filename} 发送。` : `PDF downloaded! Attach ${pdfOutput.filename} in WhatsApp.`);
    } catch (err) {
      console.error('WhatsApp PDF error:', err);
      showToast(language === 'zh' ? '生成 WhatsApp PDF 失败' : 'Failed to prepare PDF for WhatsApp');
    }
  };

  const handleSendEmailPDFApp = async () => {
    try {
      showToast(language === 'zh' ? '正在生成正式 PDF 文档...' : 'Generating official PDF document...');
      const pdfOutput = createDocumentPDFFile(docType, items, currentData, grandTotal, discountAmount, finalTotal);

      if (canShareNative() && navigator.canShare && navigator.canShare({ files: [pdfOutput.file] })) {
        const shared = await shareNative({
          title: emailSubject || getDocumentSubject(currentData, docType, language),
          text: pdfCoverEmail,
          files: [pdfOutput.file],
        });
        if (shared) {
          showToast(language === 'zh' ? '已直接分享 PDF 到邮件！' : 'Shared PDF to mail client!');
          return;
        }
      }

      downloadBlobOrFile(pdfOutput.file, pdfOutput.filename);
      openEmail({
        email,
        subject: emailSubject || getDocumentSubject(currentData, docType, language),
        body: pdfCoverEmail,
        useGmailWeb: false,
      });
      showToast(language === 'zh' ? `PDF 已下载！请在草稿中附加 ${pdfOutput.filename}。` : `PDF downloaded! Attach ${pdfOutput.filename} in your email draft.`);
    } catch (err) {
      console.error('Email PDF error:', err);
      showToast(language === 'zh' ? '生成邮件 PDF 失败' : 'Failed to prepare PDF for Email');
    }
  };

  const handleSendEmailPDFGmail = async () => {
    try {
      showToast(language === 'zh' ? '正在生成正式 PDF 文档...' : 'Generating official PDF document...');
      const pdfOutput = createDocumentPDFFile(docType, items, currentData, grandTotal, discountAmount, finalTotal);
      downloadBlobOrFile(pdfOutput.file, pdfOutput.filename);
      openEmail({
        email,
        subject: emailSubject || getDocumentSubject(currentData, docType, language),
        body: pdfCoverEmail,
        useGmailWeb: true,
      });
      showToast(language === 'zh' ? `PDF 已下载！请在 Gmail 中附加 ${pdfOutput.filename}。` : `PDF downloaded! Attach ${pdfOutput.filename} in Gmail.`);
    } catch (err) {
      console.error('Gmail PDF error:', err);
      showToast(language === 'zh' ? '生成 Gmail PDF 失败' : 'Failed to prepare PDF for Gmail');
    }
  };

  const handleDownloadPDF = () => {
    try {
      if (docType === 'invoice') {
        generateInvoicePDF(items, currentData, grandTotal, discountAmount, finalTotal, 'save');
      } else if (docType === 'receipt') {
        generateReceiptPDF(items, currentData, grandTotal, discountAmount, finalTotal, 'save');
      } else {
        generateQuotationPDF(items, currentData, grandTotal, discountAmount, finalTotal, 'save');
      }
      showToast(language === 'zh' ? `已下载 ${docType === 'invoice' ? '发票' : '报价单'} PDF！` : `Downloaded ${docType.toUpperCase()} PDF!`);
    } catch (err) {
      console.error('PDF error:', err);
      showToast(language === 'zh' ? '生成 PDF 失败' : 'Failed to generate PDF');
    }
  };

  const handleNativeShare = async () => {
    try {
      const title = getDocumentSubject(currentData, docType, language);
      if (sendFormat === 'pdf') {
        const pdfOutput = createDocumentPDFFile(docType, items, currentData, grandTotal, discountAmount, finalTotal);
        if (canShareNative() && navigator.canShare && navigator.canShare({ files: [pdfOutput.file] })) {
          const success = await shareNative({
            title,
            text: pdfCoverWhatsApp,
            files: [pdfOutput.file],
          });
          if (success) {
            showToast(language === 'zh' ? 'PDF 分享成功！' : 'PDF shared successfully!');
            return;
          }
        }
      }
      const text = docType === 'invoice' ? emailBody : whatsappMessage;
      const success = await shareNative({ title, text });
      if (success) {
        showToast(language === 'zh' ? '分享成功！' : 'Shared successfully!');
      }
    } catch (err) {
      console.warn('Native share failed', err);
    }
  };

  const cleanPhonePreview = cleanPhoneNumber(phone);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-[#0a0f24] rounded-2xl shadow-2xl border border-slate-200/90 dark:border-indigo-500/25 flex flex-col max-h-[92vh] overflow-hidden relative"
      >
        {/* Ambient Cyber Neon Crown Accent */}
        <div className="h-[2px] w-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 opacity-90 shrink-0"></div>

        {/* Floating Toast Notification */}
        {toastMsg && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-white/95 text-white dark:text-neutral-900 px-4 py-2 rounded-full text-xs font-bold shadow-xl backdrop-blur-md flex items-center gap-2 border border-white/20 animate-fade-in pointer-events-none">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            {toastMsg}
          </div>
        )}

        {/* macOS Titlebar */}
        <div className="h-10 px-4 bg-slate-50 dark:bg-[#0c122c] border-b border-slate-200/90 dark:border-indigo-500/20 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-[#FF5F56] hover:brightness-90 flex items-center justify-center text-black/60"
            ></button>
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E]"></span>
            <span className="w-3 h-3 rounded-full bg-[#27C93F]"></span>
          </div>

          <div className="flex items-center gap-2">
            <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
              {language === 'zh' ? '发送与分享单据' : 'Send & Share Document'}
            </span>
          </div>

          <div className="w-8"></div>
        </div>

        {/* Top Control Bar: Doc Type & Size Toggle */}
        <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-[#151518] border-b border-slate-200/80 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
              {language === 'zh' ? '单据类型:' : 'Document:'}
            </span>
            <div className="flex p-0.5 rounded-lg bg-slate-200/70 dark:bg-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDocType('quote')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  docType === 'quote'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{language === 'zh' ? '报价单' : 'Quotation'}</span>
              </button>
              <button
                type="button"
                onClick={() => setDocType('invoice')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  docType === 'invoice'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-neutral-300 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{language === 'zh' ? '正式发票' : 'Tax Invoice'}</span>
              </button>
            </div>
          </div>

          {/* Sizing Toggle & Total Display */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSizes(!showSizes)}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold border transition-all flex items-center gap-1.5 ${
                showSizes
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-neutral-500 border-slate-200 dark:border-white/10'
              }`}
              title={language === 'zh' ? '切换发送文本中的尺寸规格' : 'Toggle size specification in sent text'}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>
                {language === 'zh'
                  ? (showSizes ? '尺寸: 显示' : '尺寸: 隐藏')
                  : (showSizes ? 'Sizes: Show' : 'Sizes: Hide')}
              </span>
            </button>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/5">
              ${finalTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Tab Selection: WhatsApp, Email, Live Preview */}
        <div className="px-4 pt-3 bg-white dark:bg-[#1e1e24] border-b border-slate-200/80 dark:border-white/5 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'whatsapp'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-neutral-200'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'email'
                ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-neutral-200'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <Mail className="w-3.5 h-3.5" />
            <span>{language === 'zh' ? '电子邮件' : 'Email'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ml-auto ${
              activeTab === 'preview'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-neutral-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{language === 'zh' ? '预览与文本' : 'Preview & Raw Text'}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 mac-scrollbar">
          {/* Send As Selector: Text vs PDF (Available across WhatsApp & Email tabs) */}
          {activeTab !== 'preview' && (
            <div className="p-2.5 rounded-xl bg-slate-100/90 dark:bg-white/5 border border-slate-200/90 dark:border-white/5 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-300 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" />
                {language === 'zh' ? '选择发送格式:' : 'Select Output Format:'}
              </span>
              <div className="flex p-0.5 rounded-lg bg-slate-200/80 dark:bg-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSendFormat('text')}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                    sendFormat === 'text'
                      ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{language === 'zh' ? '以文本发送' : 'Send as Text'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSendFormat('pdf')}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                    sendFormat === 'pdf'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>{language === 'zh' ? '以 PDF 发送' : 'Send as PDF'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    {language === 'zh'
                      ? `通过 WhatsApp 发送${docType === 'invoice' ? '正式发票' : '报价单'} (${sendFormat === 'pdf' ? 'PDF 单据' : '文本明细'})`
                      : `Send ${docType === 'invoice' ? 'Tax Invoice' : 'Quotation'} via WhatsApp (${sendFormat === 'pdf' ? 'PDF Document' : 'Text Summary'})`}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 font-bold">
                    {language === 'zh'
                      ? (sendFormat === 'pdf' ? 'PDF 模式' : '文本模式')
                      : (sendFormat === 'pdf' ? 'PDF Mode' : 'Text Mode')}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400 block mb-1">
                    {language === 'zh' ? '接收人 WhatsApp 手机号码' : 'Recipient WhatsApp Phone Number'}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500" />
                    <input
                      type="tel"
                      placeholder={
                        language === 'zh'
                          ? '例如: 91234567 或 +65 9123 4567 (留空则在应用中自选联系人)'
                          : 'e.g. 91234567 or +65 9123 4567 (or leave blank to pick chat)'
                      }
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm font-mono rounded-xl bg-white dark:bg-[#141418] border border-slate-300 dark:border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 dark:text-white shadow-sm"
                    />
                  </div>
                  {phone.trim() ? (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-mono font-semibold">
                      {language === 'zh' ? '直接发送目标:' : 'Direct WhatsApp target:'} +{cleanPhonePreview}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
                      {language === 'zh'
                        ? '提示: 留空可直接在 WhatsApp 应用中选择任意聊天或群组。'
                        : 'Tip: Leave blank to select any chat or group directly in WhatsApp.'}
                    </p>
                  )}
                </div>

                {/* PDF Card Preview when in PDF mode */}
                {sendFormat === 'pdf' && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#070b19] border border-emerald-500/30 flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 font-bold text-xs border border-red-500/20">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {pdfFilename}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-2">
                          <span>{items.length} {language === 'zh' ? '项项目' : 'items'}</span>
                          <span>•</span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            ${finalTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 border border-slate-200 dark:border-white/10"
                      title={language === 'zh' ? '下载 PDF 到电脑' : 'Download PDF to computer'}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{language === 'zh' ? '下载' : 'Download'}</span>
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  {sendFormat === 'pdf' ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSendWhatsAppPDF}
                        className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{language === 'zh' ? '通过 WhatsApp 发送 PDF' : 'Send PDF via WhatsApp'}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyWhatsApp(pdfCoverWhatsApp)}
                        className="py-3 px-4 rounded-xl bg-white dark:bg-white/10 hover:bg-neutral-100 dark:hover:bg-white/20 text-neutral-800 dark:text-neutral-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-black/10 dark:border-white/10 active:scale-95 transition-all"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        <span>{language === 'zh' ? (copied ? '已复制！' : '复制附言') : (copied ? 'Copied!' : 'Copy Message')}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleSendWhatsAppText}
                        className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
                      >
                        <Send className="w-4 h-4" />
                        <span>{language === 'zh' ? '打开 WhatsApp (文本)' : 'Open WhatsApp (Text)'}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyWhatsApp(whatsappMessage)}
                        className="py-3 px-4 rounded-xl bg-white dark:bg-white/10 hover:bg-neutral-100 dark:hover:bg-white/20 text-neutral-800 dark:text-neutral-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-black/10 dark:border-white/10 active:scale-95 transition-all"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        <span>{language === 'zh' ? (copied ? '已复制！' : '复制文本') : (copied ? 'Copied!' : 'Copy Text')}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Message Preview snippet */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-bold uppercase tracking-wider">
                  <span>
                    {language === 'zh'
                      ? (sendFormat === 'pdf' ? 'WhatsApp 随附留言:' : 'WhatsApp 消息正文:')
                      : (sendFormat === 'pdf' ? 'WhatsApp Accompanying Notice:' : 'WhatsApp Message Content:')}
                  </span>
                  <span className="font-mono text-[11px] lowercase">
                    {language === 'zh'
                      ? (sendFormat === 'pdf' ? '正式 PDF 说明通知' : `包含 ${items.length} 项明细`)
                      : (sendFormat === 'pdf' ? 'Official PDF Notice' : `${items.length} line items included`)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-100 dark:bg-[#141418] border border-black/5 dark:border-white/5 font-mono text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap max-h-44 overflow-y-auto mac-scrollbar select-all leading-relaxed">
                  {sendFormat === 'pdf' ? pdfCoverWhatsApp : whatsappMessage}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL */}
          {activeTab === 'email' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {language === 'zh'
                      ? `通过邮件发送${docType === 'invoice' ? '正式发票' : '报价单'} (${sendFormat === 'pdf' ? 'PDF 附件' : '正文文本'})`
                      : `Email ${docType === 'invoice' ? 'Tax Invoice' : 'Quotation'} (${sendFormat === 'pdf' ? 'PDF Attachment' : 'Text Summary'})`}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-700 dark:text-blue-300 font-bold">
                    {language === 'zh'
                      ? (sendFormat === 'pdf' ? 'PDF 附件' : '正文文本')
                      : (sendFormat === 'pdf' ? 'PDF Attachment' : 'Text Body')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400 block mb-1">
                      {language === 'zh' ? '客户电子邮箱地址' : 'Recipient Client Email'}
                    </label>
                    <div className="relative">
                      <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500" />
                      <input
                        type="email"
                        placeholder="e.g. client@company.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-[#141418] border border-slate-300 dark:border-white/10 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400 block mb-1">
                      {language === 'zh' ? '邮件主题' : 'Email Subject'}
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-[#141418] border border-slate-300 dark:border-white/10 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white font-medium shadow-sm"
                    />
                  </div>
                </div>

                {/* PDF Card Preview when in PDF mode */}
                {sendFormat === 'pdf' && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#070b19] border border-blue-500/30 flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 font-bold text-xs border border-red-500/20">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {pdfFilename}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-2">
                          <span>{language === 'zh' ? '官方正本单据' : 'Official Document'}</span>
                          <span>•</span>
                          <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                            ${finalTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 border border-slate-200 dark:border-white/10"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{language === 'zh' ? '下载' : 'Download'}</span>
                    </button>
                  </div>
                )}

                {/* Email Action Buttons */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {sendFormat === 'pdf' ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSendEmailPDFApp}
                        className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/25 active:scale-95 transition-all"
                        title={language === 'zh' ? '下载 PDF 并打开系统默认邮件客户端' : 'Downloads PDF & launches default mail client'}
                      >
                        <Mail className="w-4 h-4" />
                        <span>{language === 'zh' ? '通过邮件客户端发送 PDF' : 'Send PDF via Mail'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendEmailPDFGmail}
                        className="py-3 px-3 rounded-xl bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                        title={language === 'zh' ? '下载 PDF 并打开网页版 Gmail' : 'Downloads PDF & opens Gmail Web composer'}
                      >
                        <ExternalLink className="w-4 h-4 text-red-500" />
                        <span>{language === 'zh' ? '通过 Gmail 发送 PDF' : 'Send PDF via Gmail'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyEmail(`Subject: ${emailSubject}\n\n${pdfCoverEmail}`)}
                        className="py-3 px-3 rounded-xl bg-white dark:bg-white/10 hover:bg-neutral-100 dark:hover:bg-white/20 text-neutral-800 dark:text-neutral-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-black/10 dark:border-white/10 active:scale-95 transition-all"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        <span>{language === 'zh' ? (copied ? '已复制！' : '复制邮件内容') : (copied ? 'Copied!' : 'Copy Email')}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleSendEmailAppText}
                        className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/25 active:scale-95 transition-all"
                      >
                        <Mail className="w-4 h-4" />
                        <span>{language === 'zh' ? '邮件客户端 (文本)' : 'Mail App (Text)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendGmailWebText}
                        className="py-3 px-3 rounded-xl bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                      >
                        <ExternalLink className="w-4 h-4 text-red-500" />
                        <span>{language === 'zh' ? '网页版 Gmail (文本)' : 'Gmail Web (Text)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyEmail()}
                        className="py-3 px-3 rounded-xl bg-white dark:bg-white/10 hover:bg-neutral-100 dark:hover:bg-white/20 text-neutral-800 dark:text-neutral-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-black/10 dark:border-white/10 active:scale-95 transition-all"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        <span>{language === 'zh' ? (copied ? '已复制！' : '复制邮件') : (copied ? 'Copied!' : 'Copy Email')}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Email Body Preview snippet */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-bold uppercase tracking-wider">
                  <span>
                    {language === 'zh'
                      ? (sendFormat === 'pdf' ? '邮件随附说明:' : '格式化邮件正文:')
                      : (sendFormat === 'pdf' ? 'Email Accompanying Note:' : 'Formatted Email Body:')}
                  </span>
                  <span className="font-mono text-[11px] lowercase">
                    {language === 'zh'
                      ? (sendFormat === 'pdf' ? 'PDF 附件配套留言' : '含项目与付款详情文本')
                      : (sendFormat === 'pdf' ? 'PDF attachment message' : 'Text layout with payment details')}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-100 dark:bg-[#141418] border border-black/5 dark:border-white/5 font-mono text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap max-h-44 overflow-y-auto mac-scrollbar select-all leading-relaxed">
                  {sendFormat === 'pdf' ? pdfCoverEmail : emailBody}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FULL LIVE PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  {language === 'zh' ? '单据完整文本输出:' : 'Full Document Text Output:'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSendWhatsAppText}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{language === 'zh' ? '发送至 WhatsApp' : 'Send as WhatsApp'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSendEmailAppText}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{language === 'zh' ? '发送邮件' : 'Send as Email'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyWhatsApp(whatsappMessage)}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-200 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/20 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{language === 'zh' ? '复制文本' : 'Copy Text'}</span>
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                value={docType === 'invoice' ? emailBody : whatsappMessage}
                className="w-full h-80 p-4 rounded-xl font-mono text-xs bg-neutral-100/90 dark:bg-[#141418] border border-black/10 dark:border-white/10 outline-none text-neutral-800 dark:text-neutral-200 resize-none leading-relaxed mac-scrollbar select-all"
              />
            </div>
          )}

          {/* Additional Quick Utility Actions (PDF & Device Share) */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span>{language === 'zh' ? '快捷 PDF 下载:' : 'Quick PDF download:'}</span>
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 font-bold text-xs text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {language === 'zh'
                    ? `下载${docType === 'invoice' ? '发票' : '报价单'} PDF`
                    : `Download ${docType === 'invoice' ? 'Invoice' : 'Quotation'} PDF`}
                </span>
              </button>
            </div>

            {canShareNative() && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 font-bold text-xs text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 transition-all active:scale-95"
                title={language === 'zh' ? '使用手机或系统分享面板' : 'Use phone or system share sheet'}
              >
                <Share2 className="w-3.5 h-3.5 text-blue-500" />
                <span>{language === 'zh' ? '系统分享面板' : 'System Share Sheet'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

