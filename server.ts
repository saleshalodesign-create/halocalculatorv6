import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Lazy GenAI initialization
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

const SYSTEM_INSTRUCTION = `You are the Halo Assistant, the official AI guide and expert built into "Halo Design Hub" — a macOS-inspired professional signage & lighting pricing calculator and quotation software.

Your role is to explain clearly, warmly, and concisely how to use all features of Halo Design Hub, troubleshoot issues, explain pricing formulas, and guide sign makers, sales reps, and customers.

Key App Knowledge:
1. **Core Purpose**: Rapidly calculate custom sign prices based on width & height, customize unit pricing, generate commercial quotations/invoices/receipts, and export branded PDF or WhatsApp messages.
2. **Supported Products & Default Rates**:
   - Standard Lightbox: $50 / sq ft (Perimeter LEDs, acrylic face)
   - Lightbox with Backlit: $85 / sq ft (Front illumination + back halo glow)
   - Backlit / Halo Lit Sign: $35 / sq ft (Wall halo wash, indirect lighting)
   - Translucent / Acrylic Sign: $45 / sq ft (Edge & surface diffused)
   - 3D Printed Signage: $120 / sq ft (High-precision additive manufacturing)
   - Vinyl Sticker & Graphics: $20 / sq ft (Plotter cut & digital graphics)
   - LED Strip Lighting: $17 / unit
   - Acrylic Fabrication: $15 / sq ft (Custom laser cut panel)
3. **Dimensions & Unit Conversion**:
   - Supports Inches (IN), Feet (FT), Centimeters (CM), and Millimeters (MM).
   - Area formula: Area (sq ft) = (Width in inches × Height in inches) / 144.
   - Proportions: Automatically detects Horizontal, Vertical, or 1:1 Square aspect ratios.
4. **How to Calculate & Add Items to Quote**:
   - Enter Width and Height on the main window.
   - Choose the measurement unit (IN, FT, CM, MM).
   - Click any product card (e.g. Lightbox) to view the breakdown and formula.
   - Adjust quantity or unit price, and click "Add to Quote".
5. **Quotation & Billing Hub**:
   - Open from the top menu bar ("Quote Sheet") or bottom Dock icon.
   - Edit quantities, remove items, adjust project title and customer contact.
   - **Discounts**: Choose preset 5%, 10%, 0%, or click **Custom $** to enter an arbitrary fixed dollar deduction.
   - **PDF Generation**: Click "Generate PDF" to export official Quotation, Invoice, or Receipt with company info, terms, and payment methods.
   - **Direct Sharing**: Copy formatted WhatsApp text, SMS, or Email summary.
6. **Cloud Sync & Google Sign-In**:
   - Sign in via the Google account button in the Dock to sync quotes and custom rates across devices with Firebase.
7. **Additional Tools**:
   - **Math Calculator**: Built-in iOS style calculator on the Dock for quick side math.
   - **Shape Visualizer**: Interactive preview of the sign's aspect ratio.
   - **Themes & Wallpapers**: Switch Dark/Light theme, cycle macOS wallpapers (Sequoia, Sonoma, Obsidian, Silver).
   - **Language**: Toggle between English (EN) and Chinese (中) anytime via the top pill button or dock icon.

Guidelines for Answers:
- Format with clean Markdown (bullet points, bold highlights, concise steps).
- Match the user's language (if user asks in English, reply in English; if in Chinese, reply in Chinese).
- Keep responses friendly, actionable, and straight to the point.`;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
  });

  // AI Assistant endpoint
  app.post('/api/ai/ask', async (req, res) => {
    try {
      const { question, history = [], language = 'en' } = req.body;

      if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Question is required.' });
        return;
      }

      // If GEMINI_API_KEY is available, use Gemini 3.8 Flash
      if (process.env.GEMINI_API_KEY) {
        const ai = getGenAI();

        // Build contents from history + current question
        const contents = [];
        for (const item of history.slice(-6)) {
          if (item.role && item.text) {
            contents.push({
              role: item.role === 'user' ? 'user' : 'model',
              parts: [{ text: item.text }],
            });
          }
        }
        contents.push({
          role: 'user',
          parts: [{ text: `[Language preference: ${language === 'zh' ? 'Chinese (中文)' : 'English'}]\n${question}` }],
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.5,
          },
        });

        const reply = response.text || 'I am ready to help you with Halo Design Hub! What would you like to know?';
        res.json({ reply, source: 'gemini' });
        return;
      }

      // Fallback response if GEMINI_API_KEY is not yet configured
      const q = question.toLowerCase();
      let fallbackReply = '';

      if (language === 'zh') {
        if (q.includes('折') || q.includes('discount')) {
          fallbackReply = `### 如何设置折扣？
1. 打开顶栏或底部程序坞的 **报价单 (Quote Sheet)**。
2. 在总计金额上方找到 **折扣 (Disc)** 区域。
3. 点击 **5%**、**10%** 或 **0%** 快速预设。
4. 或者点击 **自定义$ (Custom $)**，输入具体的扣减美元金额。系统将实时自动从总金额中扣减，并在 PDF 和分享消息中显示！`;
        } else if (q.includes('算') || q.includes('公式') || q.includes('价格') || q.includes('price') || q.includes('formula')) {
          fallbackReply = `### 招牌价格与公式计算方式
1. **尺寸输入**：在主界面输入 **宽度 (W)** 与 **高度 (H)**，可切换英寸 (IN)、英尺 (FT)、厘米 (CM) 或毫米 (MM)。
2. **面积换算**：系统自动换算为平方英尺 (SQ FT)。
   - 公式：\`面积 (sq ft) = (宽度[英寸] × 高度[英寸]) / 144\`
3. **单价计算**：\`单价 = 面积 × 产品费率\`
4. 点击任意产品卡片（如标准灯箱、背光字、3D字），即可查看详尽的分步计算公式明细并加入报价单！`;
        } else if (q.includes('pdf') || q.includes('导出') || q.includes('发票') || q.includes('开单')) {
          fallbackReply = `### 如何导出商业 PDF 与开具发票？
1. 点击产品卡片将项目加入报价单。
2. 点击顶栏 **报价单 (Quote Sheet)**。
3. 完善客户名称、联系方式、项目名称及付款条款。
4. 点击底部的 **生成 PDF (Generate PDF)** 按钮，可选择：
   - **商业报价单 (Quotation)**
   - **正式发票 (Invoice)**
   - **付款收据 (Receipt)**
5. 支持直接在浏览器下载、打印或保存高清 PDF 文件。`;
        } else {
          fallbackReply = `### 欢迎使用 Halo 招牌设计中心 AI 助手！
您可以随时向我咨询：
- **快速计算**：如何输入尺寸、换算面积以及查看各类型灯箱价格
- **折扣管理**：如何使用 5%、10% 或**自定义金额 ($)** 折扣
- **生成文档**：如何一键生成报价单、发票、收据 PDF
- **云端同步**：如何使用 Google 账号跨设备同步报价记录与自定义单价
- **安装手机版**：如何添加快捷方式至手机桌面作为 App 使用

*(提示：配置 GEMINI_API_KEY 即可获得完整的生成式实时对话体验)*`;
        }
      } else {
        if (q.includes('discount') || q.includes('disc')) {
          fallbackReply = `### How to Apply Discounts
1. Open the **Quote Sheet** from the top menu bar or bottom Dock.
2. In the summary area near the total, locate the **Disc:** buttons.
3. Click **5%**, **10%**, or **0%** for quick presets.
4. Click **Custom $** to type an exact dollar deduction amount.
5. The discount is instantly deducted from the total and shown on your PDF and messages!`;
        } else if (q.includes('price') || q.includes('calculate') || q.includes('formula') || q.includes('rate')) {
          fallbackReply = `### How Pricing & Formulas Work
1. **Dimensions**: Enter **Width (W)** and **Height (H)** on the main window. Select IN, FT, CM, or MM.
2. **Area Conversion**: Auto-converted to Square Feet:
   \`Area (sq ft) = (W_in × H_in) / 144\`
3. **Product Price**: \`Price = Area × Unit Rate\`
4. Click any product card (e.g. Standard Lightbox, Backlit Sign) to inspect the complete math breakdown, adjust quantities, and add it to your Quote!`;
        } else if (q.includes('pdf') || q.includes('invoice') || q.includes('quote') || q.includes('receipt') || q.includes('export')) {
          fallbackReply = `### How to Export PDFs & Invoices
1. Add one or more calculated signs to the **Quote Sheet**.
2. Fill in the customer name, project title, and payment details.
3. Apply any desired discount (5%, 10%, or Custom $).
4. Click **Generate PDF** to export:
   - **Quotation**: For initial client estimates.
   - **Invoice**: For formal billing and deposit tracking.
   - **Receipt**: For completed payment confirmation.
5. You can also share directly to WhatsApp or Email!`;
        } else {
          fallbackReply = `### Welcome to Halo AI Assistant!
I can help guide you through everything in Halo Design Hub:
- **Price Calculations**: How dimensions, square feet, and custom rates work.
- **Discounts**: Applying 5%, 10%, or **Custom $** discounts.
- **Documents**: Exporting Quotation, Invoice, and Receipt PDFs.
- **Cloud Sync**: Saving quotes & rates with your Google account.
- **Mobile PWA**: Installing the app on iOS or Android.

*(Tip: Add your \`GEMINI_API_KEY\` in Settings > Secrets for real-time generative conversational answers)*`;
        }
      }

      res.json({ reply: fallbackReply, source: 'fallback' });
    } catch (err: any) {
      console.error('Error in /api/ai/ask:', err);
      res.status(500).json({ error: err.message || 'Failed to process AI request.' });
    }
  });

  // Vite middleware in dev, static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Halo Design Hub server running on port ${PORT}`);
  });
}

startServer();
