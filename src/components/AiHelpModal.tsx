import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Trash2, Copy, Check, Bot, User, HelpCircle, ArrowRight, Lightbulb } from 'lucide-react';
import Markdown from 'react-markdown';
import { useLanguage } from '../context/LanguageContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface AiHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiHelpModal({ isOpen, onClose }: AiHelpModalProps) {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('halo_ai_chat_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  useEffect(() => {
    try {
      localStorage.setItem('halo_ai_chat_history', JSON.stringify(messages));
    } catch (e) {
      // ignore
    }
  }, [messages]);

  // Initial welcome message if no history
  useEffect(() => {
    if (messages.length === 0) {
      const initialText =
        language === 'zh'
          ? `您好！我是 **Halo AI 智能助手**。\n\n我可以为您提供本软件的详细使用教程，包括：\n- **计算报价**：招牌面积换算与价格计算逻辑\n- **折扣减免**：如何使用 5%、10% 或**自定义金额 ($)** 折扣\n- **开单导出**：如何生成正式的 Quotation / Invoice / Receipt 商业 PDF 文档\n- **多设备同步**：通过 Google 账号与 Firebase 云端同步记录\n- **手机版安装**：在 iPhone 或 Android 上像原生 App 一样全屏使用\n\n请在下方输入您想了解的问题，或直接点击上方的推荐问题快速提问！`
          : `Hello! I'm your **Halo AI Assistant**.\n\nI can help guide you through everything in Halo Design Hub, including:\n- **Price Calculations**: Signage dimensions, square foot conversions, and formulas\n- **Discounts**: How to apply 5%, 10%, or **Custom $** deductions\n- **Document Exports**: Generating Quotation, Invoice, or Receipt PDFs with your branding\n- **Cloud Sync**: Saving quotes & custom rates with your Google account\n- **Mobile PWA**: Installing the app full-screen on iPhone or Android\n\nFeel free to ask any questions below, or tap any of the quick suggestions!`;

      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          text: initialText,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [language]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const historyPayload = messages
        .filter(m => m.id !== 'welcome')
        .slice(-6)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.text,
        }));

      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          history: historyPayload,
          language,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned error ${res.status}`);
      }

      const data = await res.json();
      const aiReply = data.reply || (language === 'zh' ? '抱歉，暂时未能生成解答。' : 'Sorry, could not generate a response.');

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: aiReply,
          timestamp: Date.now(),
        },
      ]);
    } catch (err: any) {
      console.error('AI ask error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text:
            language === 'zh'
              ? `⚠️ **系统提示**：暂时无法连接至 AI 服务。请确保网络畅通，或稍后重试。`
              : `⚠️ **System Notice**: Could not reach AI service right now. Please check your connection and try again.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('halo_ai_chat_history');
    setMessages([]);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  const quickQuestions = [
    { key: 'q1', text: t.aiModal?.q1 ?? 'How do I apply a custom $ discount?' },
    { key: 'q2', text: t.aiModal?.q2 ?? 'How to generate Quotation & Invoice PDFs?' },
    { key: 'q3', text: t.aiModal?.q3 ?? 'What is the pricing formula for signage?' },
    { key: 'q4', text: t.aiModal?.q4 ?? 'How to install this app on mobile phone?' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl h-[90vh] max-h-[720px] flex flex-col bg-white dark:bg-[#181920] rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden text-slate-900 dark:text-neutral-100"
        >
          {/* macOS Title Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-100/90 dark:bg-[#20212b]/90 border-b border-slate-200 dark:border-white/10 backdrop-blur-md select-none shrink-0">
            {/* macOS Traffic Lights */}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-90 transition-all flex items-center justify-center group"
                title="Close"
              >
                <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-black/70">✕</span>
              </button>
              <button
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:brightness-90 transition-all"
                title="Minimize"
              />
              <div
                className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"
                title="Active"
              />
            </div>

            {/* Title with Glowing AI Orb */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 p-[1.5px] shadow-sm animate-pulse">
                <div className="w-full h-full bg-white dark:bg-[#181920] rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-neutral-200">
                {t.aiModal?.title ?? 'Halo AI Assistant & App Guide'}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-purple-500/10 dark:bg-purple-400/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                {t.aiModal?.badge ?? 'Smart Guide'}
              </span>
            </div>

            {/* Clear History Button */}
            <button
              onClick={handleClearHistory}
              className="p-1.5 text-slate-400 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all text-xs flex items-center gap-1"
              title={t.aiModal?.clearChat ?? 'Clear History'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Prompts Carousel / Pills */}
          <div className="px-3 py-2 bg-slate-50/70 dark:bg-[#14151b]/70 border-b border-slate-200/60 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold text-slate-500 dark:text-neutral-400">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              <span>{t.aiModal?.suggestedQuestions ?? 'Quick Questions:'}</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mac-scrollbar">
              {quickQuestions.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSendMessage(item.text)}
                  disabled={loading}
                  className="shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-full bg-white dark:bg-[#232430] hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-neutral-200 border border-slate-200/80 dark:border-white/10 hover:border-purple-400 dark:hover:border-purple-500 transition-all shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <span>{item.text}</span>
                  <ArrowRight className="w-2.5 h-2.5 text-purple-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 mac-scrollbar bg-slate-50/30 dark:bg-transparent">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-xs relative group ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : 'bg-white dark:bg-[#22232e] border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-neutral-100 rounded-tl-xs'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div>
                      <div className="prose prose-sm dark:prose-invert max-w-none space-y-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-purple-600 dark:[&_h3]:text-purple-400 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-1 [&_code]:bg-slate-100 dark:[&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs">
                        <Markdown>{msg.text}</Markdown>
                      </div>

                      {/* Copy Answer button */}
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.id, msg.text)}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:text-neutral-400 dark:hover:text-white transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500 font-medium">
                                {t.aiModal?.copied ?? 'Copied!'}
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{t.aiModal?.copyAnswer ?? 'Copy'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* AI Thinking Animation */}
            {loading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-[#22232e] border border-slate-200/80 dark:border-white/10 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2 shadow-xs">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-neutral-400 font-medium">
                    {t.aiModal?.thinking ?? 'AI is thinking...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 sm:p-4 bg-white dark:bg-[#1c1d26] border-t border-slate-200 dark:border-white/10 shrink-0">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={
                    t.aiModal?.inputPlaceholder ??
                    'e.g. How do I apply a custom discount? How are prices calculated?...'
                  }
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 pr-10 text-xs sm:text-sm bg-slate-100 dark:bg-[#262834] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 dark:focus:ring-purple-400/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-purple-600/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                <span>{t.aiModal?.send ?? 'Ask'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
