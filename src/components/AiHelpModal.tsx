import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  Zap,
  Cpu,
  HelpCircle,
  ArrowRight,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { useLanguage } from '../context/LanguageContext';

export type ChatRole = 'general' | 'fast' | 'complex';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  model?: string;
  roleType?: ChatRole;
}

interface AiHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiHelpModal({ isOpen, onClose }: AiHelpModalProps) {
  const { language, t } = useLanguage();
  const [activeRole, setActiveRole] = useState<ChatRole>('general');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('halo_gemini_chat_history_v2');
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of thread
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem('halo_gemini_chat_history_v2', JSON.stringify(messages));
    } catch (e) {
      // ignore
    }
  }, [messages]);

  // Seed initial welcome message if no history exists
  useEffect(() => {
    if (messages.length === 0) {
      const initialText =
        language === 'zh'
          ? `### 欢迎使用 Gemini 智能助手与招牌工程中心！\n\n我是由 **Google Gemini** 驱动的专业招牌计算与工程顾问，支持多轮深度对话。您可以自由切换顶部三种角色引擎：\n\n1. 🌟 **通用顾问 (gemini-3.5-flash)**：产品价格换算、整单折扣设置、报价单/发票 PDF 导出及系统指引。\n2. ⚡ **极速换算 (gemini-3.1-flash-lite)**：毫米/厘米/英寸/英尺即时单位互转、面积快算与瞬时报价。\n3. 🧠 **工程专家 (gemini-3.1-pro-preview)**：LED 变压器/驱动器功率余量计算、12V/24V 电流压降、户外抗风压负荷、IP防水等级及重型安装力学计算。\n\n请在下方输入问题，或点击上方推荐快捷指令快速开始！`
          : `### Welcome to Gemini AI Assistant & Signage Engineering Hub!\n\nI am your professional signage pricing, calculations, and engineering specialist powered by **Google Gemini** with multi-turn conversation memory. You can select from 3 dedicated AI roles:\n\n1. 🌟 **General Assistant (gemini-3.5-flash)**: Sign pricing formulas, custom $ discounts, Quotation & Invoice PDF exports, and general app workflow.\n2. ⚡ **Fast Helper (gemini-3.1-flash-lite)**: Instant dimension unit conversions (in/ft/cm/mm/m), rapid sq ft math, and swift pricing estimates.\n3. 🧠 **Signage Engineer (gemini-3.1-pro-preview)**: Complex electrical LED wattage & transformer driver sizing (20% safety margin), 12V/24V amperage & wire run voltage drop, structural wind-load pressure, and architectural tender specifications.\n\nType your question below or tap any suggested prompt to begin!`;

      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          text: initialText,
          timestamp: Date.now(),
          model: 'gemini-3.5-flash',
          roleType: 'general',
        },
      ]);
    }
  }, [language]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
      roleType: activeRole,
    };

    setMessages(prev => [...prev, userMessage]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      // Build conversation history (excluding welcome notice)
      const historyPayload = messages
        .filter(m => m.id !== 'welcome')
        .slice(-14)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.text,
        }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          language,
          role: activeRole,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
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
          model: data.model || getModelName(activeRole),
          roleType: activeRole,
        },
      ]);
    } catch (err: any) {
      console.error('Gemini chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text:
            language === 'zh'
              ? `⚠️ **系统提示**：暂时无法连接至 Gemini 服务。请检查网络连接或稍后重试。`
              : `⚠️ **System Notice**: Could not reach Gemini service. Please check your connection and try again.`,
          timestamp: Date.now(),
          model: getModelName(activeRole),
          roleType: activeRole,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('halo_gemini_chat_history_v2');
    setMessages([]);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getModelName = (role: ChatRole) => {
    if (role === 'complex') return 'gemini-3.1-pro-preview';
    if (role === 'fast') return 'gemini-3.1-flash-lite';
    return 'gemini-3.5-flash';
  };

  const getRoleBadge = (role?: ChatRole, model?: string) => {
    const m = model || getModelName(role || 'general');
    if (role === 'complex' || m.includes('pro')) {
      return {
        name: 'gemini-3.1-pro-preview',
        label: language === 'zh' ? '工程推理' : 'Complex Pro',
        color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
        icon: <Cpu className="w-3 h-3 text-amber-500" />,
      };
    }
    if (role === 'fast' || m.includes('lite')) {
      return {
        name: 'gemini-3.1-flash-lite',
        label: language === 'zh' ? '极速换算' : 'Flash Lite',
        color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
        icon: <Zap className="w-3 h-3 text-emerald-500" />,
      };
    }
    return {
      name: 'gemini-3.5-flash',
      label: language === 'zh' ? '通用顾问' : '3.5 Flash',
      color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
      icon: <Sparkles className="w-3 h-3 text-purple-500" />,
    };
  };

  // Dynamic suggestion chips based on active role
  const getPromptSuggestions = () => {
    if (activeRole === 'complex') {
      return language === 'zh'
        ? [
            '计算 10英尺×4英尺 双面灯箱的 LED 模组总功耗与变压器容量（20%余量）',
            '抗风压计算：临街 8英尺户外立柱招牌在 80mph 风速下的受力分析',
            '24V DC 低压 LED 灯带 15米长布线线径选型与电压降计算',
            '户外全防水发光字 IP67 与 IP68 工艺区别及排水孔设置标准',
          ]
        : [
            'Calculate LED watts & driver sizing (with 20% safety margin) for 10ft×4ft lightbox',
            'Wind load calculation for an 8ft outdoor pylon sign at 80 mph',
            'Recommended AWG wire gauge and voltage drop for 24V LED strip 50ft run',
            'Tender specification: outdoor backlit letters with IP67 sealed illumination',
          ];
    }
    if (activeRole === 'fast') {
      return language === 'zh'
        ? [
            '将 48×96 英寸换算为平方英尺、厘米与平方米',
            '快速计算 16 平方英尺标准灯箱打 5% 折后的总价',
            '将 1200×600 毫米快速转换为英寸与英尺',
            '20 米 LED 灯带按标准单价总计是多少？',
          ]
        : [
            'Convert 48×96 inches to sq ft, cm, and meters',
            'Quick calculate 16 sq ft lightbox at $50/sq ft with 5% discount',
            'Convert 1200×600 mm to inches and feet',
            'Instant price for 20 units of LED strips',
          ];
    }
    return language === 'zh'
      ? [
          '如何使用「自定义 $」整单扣减固定金额？',
          '如何一键生成并导出正式的报价单与发票 PDF？',
          '标准灯箱与背光字的定价计算公式是什么？',
          '如何使用 Google 账号跨设备同步报价记录？',
        ]
      : [
          'How do I apply a custom $ dollar discount?',
          'How do I generate Quotation & Invoice PDFs?',
          'What is the pricing formula for lightbox signs?',
          'How to sync quotes across devices with Google Sign-in?',
        ];
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`relative w-full flex flex-col bg-white dark:bg-[#181920] rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden text-slate-900 dark:text-neutral-100 transition-all ${
            isFullscreen
              ? 'fixed inset-2 sm:inset-4 max-w-none h-[calc(100vh-16px)] sm:h-[calc(100vh-32px)]'
              : 'max-w-3xl h-[88vh] max-h-[750px]'
          }`}
        >
          {/* macOS Title Bar */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-100/95 dark:bg-[#20212b]/95 border-b border-slate-200 dark:border-white/10 backdrop-blur-md select-none shrink-0">
            {/* macOS Window Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-90 transition-all flex items-center justify-center group"
                title="Close"
              >
                <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-black/70">✕</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:brightness-90 transition-all"
                title="Minimize"
              />
              <button
                type="button"
                onClick={() => setIsFullscreen(prev => !prev)}
                className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:brightness-90 transition-all"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              />
            </div>

            {/* Window Title & Gemini Brand Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 via-purple-600 to-amber-400 p-[1.5px] shadow-sm animate-pulse">
                <div className="w-full h-full bg-white dark:bg-[#181920] rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-neutral-200">
                {language === 'zh' ? 'Gemini 智能助手与招牌工程顾问' : 'Gemini AI Assistant & Signage Hub'}
              </span>
              <span className="hidden xs:inline-flex text-[10px] font-mono font-bold tracking-tight px-1.5 py-0.5 rounded-full border bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25">
                {getModelName(activeRole)}
              </span>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsFullscreen(prev => !prev)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all text-xs"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 text-slate-400 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/5 transition-all text-xs"
                title={language === 'zh' ? '清空历史对话' : 'Clear Conversation'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Role & Model Switcher Segment Control */}
          <div className="px-3 sm:px-4 py-2 bg-slate-50/90 dark:bg-[#15161c]/90 border-b border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-200/80 dark:bg-[#20212b] border border-slate-300/60 dark:border-white/5 text-[11px] font-semibold w-full sm:w-auto">
              {/* General Role Tab */}
              <button
                type="button"
                onClick={() => setActiveRole('general')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  activeRole === 'general'
                    ? 'bg-white dark:bg-[#2b2c3a] text-purple-700 dark:text-purple-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="gemini-3.5-flash: General tasks, quotes, pricing & guide"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>{language === 'zh' ? '通用顾问' : 'General'}</span>
                <span className="text-[9px] font-mono opacity-60 hidden md:inline">(3.5 Flash)</span>
              </button>

              {/* Fast Role Tab */}
              <button
                type="button"
                onClick={() => setActiveRole('fast')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  activeRole === 'fast'
                    ? 'bg-white dark:bg-[#2b2c3a] text-emerald-700 dark:text-emerald-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="gemini-3.1-flash-lite: Tasks that should happen fast, rapid conversions & math"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                <span>{language === 'zh' ? '极速快算' : 'Fast Helper'}</span>
                <span className="text-[9px] font-mono opacity-60 hidden md:inline">(3.1 Lite)</span>
              </button>

              {/* Complex Role Tab */}
              <button
                type="button"
                onClick={() => setActiveRole('complex')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  activeRole === 'complex'
                    ? 'bg-white dark:bg-[#2b2c3a] text-amber-700 dark:text-amber-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="gemini-3.1-pro-preview: Particularly complex engineering tasks, electrical load & wind math"
              >
                <Cpu className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'zh' ? '工程专家' : 'Engineer'}</span>
                <span className="text-[9px] font-mono opacity-60 hidden md:inline">(3.1 Pro)</span>
              </button>
            </div>

            <div className="text-[10px] text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 ml-auto hidden sm:flex">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                {activeRole === 'complex'
                  ? language === 'zh'
                    ? '复杂工程推理模式：已启用 gemini-3.1-pro-preview'
                    : 'Complex Reasoning Mode: gemini-3.1-pro-preview'
                  : activeRole === 'fast'
                  ? language === 'zh'
                    ? '极速秒算模式：已启用 gemini-3.1-flash-lite'
                    : 'Ultra-fast Mode: gemini-3.1-flash-lite'
                  : language === 'zh'
                  ? '通用模式：已启用 gemini-3.5-flash'
                  : 'General Tasks Mode: gemini-3.5-flash'}
              </span>
            </div>
          </div>

          {/* Quick Starter Suggestion Chips */}
          <div className="px-3 sm:px-4 py-1.5 bg-slate-50/50 dark:bg-[#121318]/50 border-b border-slate-200/60 dark:border-white/5 shrink-0 overflow-x-auto mac-scrollbar">
            <div className="flex items-center gap-1.5 w-max">
              {getPromptSuggestions().map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(suggestion)}
                  disabled={loading}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white dark:bg-[#20212a] hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-neutral-300 border border-slate-200/80 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <span className="truncate max-w-[280px] sm:max-w-none">{suggestion}</span>
                  <ArrowRight className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Conversation Thread */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 mac-scrollbar bg-slate-50/20 dark:bg-transparent">
            {messages.map((msg) => {
              const badge = getRoleBadge(msg.roleType, msg.model);
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 sm:gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Model Avatar */}
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shrink-0 shadow-md mt-0.5">
                      <Bot className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-xs relative group ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-white dark:bg-[#1f202b] border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-neutral-100 rounded-tl-xs'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div>
                        {/* Model / Role Attribution Badge */}
                        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100 dark:border-white/5">
                          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${badge.color}`}>
                            {badge.icon}
                            <span>{msg.model || badge.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-neutral-400">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Rich Markdown Thread Content */}
                        <div className="prose prose-sm dark:prose-invert max-w-none space-y-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-blue-600 dark:[&_h3]:text-blue-400 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_code]:bg-slate-100 dark:[&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs [&_table]:w-full [&_table]:text-xs [&_th]:border-b [&_td]:border-b [&_th]:p-1 [&_td]:p-1">
                          <Markdown>{msg.text}</Markdown>
                        </div>

                        {/* Action Toolbar */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="text-[10px] opacity-75">
                            {language === 'zh' ? '多轮记忆已保持' : 'Multi-turn memory active'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.id, msg.text)}
                            className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-500 font-medium">
                                  {language === 'zh' ? '已复制' : 'Copied!'}
                                </span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>{language === 'zh' ? '复制内容' : 'Copy'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                        <div className="text-[10px] text-blue-200 mt-1 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-md mt-0.5">
                      <User className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Thinking / Streaming Indicator */}
            {loading && (
              <div className="flex gap-2.5 sm:gap-3.5 justify-start items-center">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shrink-0 shadow-md animate-pulse">
                  <Bot className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="bg-white dark:bg-[#1f202b] border border-slate-200/80 dark:border-white/10 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2.5 shadow-xs">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-neutral-400 font-medium">
                    {activeRole === 'complex'
                      ? language === 'zh'
                        ? 'Gemini 3.1 Pro 正在进行深度工程推理与负荷计算...'
                        : 'Gemini 3.1 Pro is computing complex engineering calculations...'
                      : activeRole === 'fast'
                      ? language === 'zh'
                        ? 'Gemini 3.1 Flash-Lite 极速生成中...'
                        : 'Gemini 3.1 Flash-Lite is generating fast response...'
                      : language === 'zh'
                      ? 'Gemini 3.5 Flash 正在分析对话上下文...'
                      : 'Gemini 3.5 Flash is thinking...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Footer */}
          <div className="p-3 sm:p-4 bg-white dark:bg-[#1a1b24] border-t border-slate-200 dark:border-white/10 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2"
            >
              <div className="relative flex-1 bg-slate-100 dark:bg-[#232532] border border-slate-200 dark:border-white/10 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/50 transition-all p-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  placeholder={
                    activeRole === 'complex'
                      ? language === 'zh'
                        ? '向 Gemini 3.1 Pro 咨询复杂工程计算（变压器瓦数、电线压降、户外风载、结构锚固）...'
                        : 'Ask Gemini 3.1 Pro for complex calculations (LED driver sizing, voltage drop, wind loads)...'
                      : activeRole === 'fast'
                      ? language === 'zh'
                        ? '向 Gemini 3.1 Flash-Lite 发起极速算费或尺寸快速转换...'
                        : 'Ask Gemini 3.1 Flash-Lite for fast conversions, rapid sq ft math, or quick pricing...'
                      : language === 'zh'
                      ? '输入您关于招牌价格、整单折扣、PDF 导出或使用方法的任何问题...'
                      : 'Ask anything about sign calculations, discounts, PDF generation, or app features...'
                  }
                  disabled={loading}
                  className="w-full px-2.5 py-1.5 text-xs sm:text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 resize-none font-sans"
                />
                <div className="flex items-center justify-between px-2 pt-1 pb-0.5 text-[10px] text-slate-400 dark:text-neutral-400 border-t border-slate-200/50 dark:border-white/5">
                  <span>
                    {language === 'zh' ? '按 Enter 发送，Shift + Enter 换行' : 'Enter to send, Shift+Enter for new line'}
                  </span>
                  <span className="font-mono text-[9px] uppercase font-bold text-blue-600 dark:text-blue-400">
                    {getModelName(activeRole)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="h-14 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>{language === 'zh' ? '发送' : 'Send'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
