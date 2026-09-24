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
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// System instructions for specific chatbot roles:
// 1. General Assistant (gemini-3.5-flash for general tasks)
const GENERAL_SYSTEM_INSTRUCTION = `You are the Halo General Assistant and Signage Consultant for "Halo Design Hub" — a macOS-inspired professional signage & lighting pricing calculator and quotation software.

Your role:
- Guide sign makers, sales representatives, designers, and clients on calculating sign pricing, configuring unit rates, and setting up commercial quotes.
- Troubleshoot questions regarding area formulas: Area (sq ft) = (Width in inches × Height in inches) / 144.
- Explain standard products: Standard Lightbox ($50/sq ft), Lightbox with Backlit ($85/sq ft), Backlit / Halo Lit Sign ($35/sq ft), Translucent / Acrylic Sign ($45/sq ft), 3D Printed Signage ($120/sq ft), Vinyl Graphics ($20/sq ft), LED Strips ($17/unit), and Acrylic Fabrication ($15/sq ft).
- Explain discount workflows: Preset 5%, 10%, 0%, or arbitrary custom dollar ($) deductions.
- Explain PDF generation (Quotation, Invoice, Receipt) and sharing via WhatsApp, SMS, or Email.
- Maintain full conversational context across multiple turns.
- Provide clean, nicely formatted Markdown with bold headings and concise bullet points.
- Respond in the language preferred by the user (Chinese or English).`;

// 2. Fast Helper (gemini-3.1-flash-lite for tasks that should happen fast)
const FAST_SYSTEM_INSTRUCTION = `You are the Halo Fast Helper for "Halo Design Hub".
Your role:
- Provide ultra-fast, direct, and concise calculations, unit conversions, and formula lookups with minimum latency.
- Instantly convert dimensions between inches (in), feet (ft), centimeters (cm), millimeters (mm), and meters (m).
- Quickly compute square footage: Area (sq ft) = (W_in × H_in) / 144.
- Calculate unit costs and instant totals based on default or provided rates.
- Maintain conversational history across turns for sequential math.
- Keep responses ultra-concise, sharp, and structured in bullet points without unnecessary fluff.
- Match the user's language (Chinese or English).`;

// 3. Master Signage Engineer (gemini-3.1-pro-preview for particularly complex tasks)
const COMPLEX_SYSTEM_INSTRUCTION = `You are the Chief Signage Engineer and Technical Reasoning Specialist for "Halo Design Hub".
Your role:
- Provide expert, mathematically rigorous engineering calculations and deep technical reasoning for architectural signage, lighting, and heavy-duty fabrication.
- Electrical Power & Driver Calculations: Compute total LED module power consumption (Watts), driver power supply sizing with standard 20% safety headroom (Driver Size = Total Watts × 1.20), ampere draw calculation (Amps = Watts / Volts for 12V DC or 24V DC systems), voltage drop over wire run distances, and recommended wire gauge (AWG).
- Structural & Wind Load Analysis: Calculate outdoor wind pressure loads on lightboxes and pylon signs based on surface area and wind speed (Wind Force = Pressure × Area × Drag Coefficient), structural anchor depth, aluminum extrusion wall thicknesses, and face material deflection limits.
- Thermal & Environmental Engineering: Ingress protection ratings (IP65 vs IP67 vs IP68), thermal dissipation for high-density LED arrays, weep hole drainage engineering, UV degradation resistance, and optical diffusion transmission efficiency.
- Architectural Tender Specifications: Provide formal bill-of-materials (BOM) specs, precision CNC routing tolerances, and installation guidelines.
- Walk through all technical calculations step-by-step with formulas and clear explanations.
- Respond in the language preferred by the user (Chinese or English).`;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      models: {
        general: 'gemini-3.5-flash',
        fast: 'gemini-3.1-flash-lite',
        complex: 'gemini-3.1-pro-preview',
      },
    });
  });

  // Multi-Turn Chat & AI Assistant Endpoint
  const handleChat = async (req: express.Request, res: express.Response) => {
    try {
      const {
        question,
        message,
        history = [],
        language = 'en',
        role = 'general',
        model: requestedModel,
      } = req.body;

      const userText = (message || question || '').trim();
      if (!userText) {
        res.status(400).json({ error: 'Message or question is required.' });
        return;
      }

      // Determine model and system instruction based on role/request
      let selectedModel = 'gemini-3.5-flash';
      let systemInstruction = GENERAL_SYSTEM_INSTRUCTION;

      if (role === 'complex' || requestedModel === 'gemini-3.1-pro-preview') {
        selectedModel = 'gemini-3.1-pro-preview';
        systemInstruction = COMPLEX_SYSTEM_INSTRUCTION;
      } else if (role === 'fast' || requestedModel === 'gemini-3.1-flash-lite') {
        selectedModel = 'gemini-3.1-flash-lite';
        systemInstruction = FAST_SYSTEM_INSTRUCTION;
      } else {
        selectedModel = 'gemini-3.5-flash';
        systemInstruction = GENERAL_SYSTEM_INSTRUCTION;
      }

      let actualModelUsed = selectedModel;

      // If GEMINI_API_KEY is available, use Gemini SDK
      if (process.env.GEMINI_API_KEY) {
        const ai = getGenAI();

        // Build multi-turn contents from previous history
        const contents = [];
        for (const item of history.slice(-14)) {
          if (item.text && typeof item.text === 'string') {
            const roleName = item.role === 'user' ? 'user' : 'model';
            contents.push({
              role: roleName,
              parts: [{ text: item.text }],
            });
          }
        }

        // Append current user message with language hint
        contents.push({
          role: 'user',
          parts: [{
            text: `[Language preference: ${language === 'zh' ? 'Chinese (中文)' : 'English'}]\n${userText}`,
          }],
        });

        let reply = '';

        try {
          const response = await ai.models.generateContent({
            model: selectedModel,
            contents,
            config: {
              systemInstruction,
              temperature: selectedModel === 'gemini-3.1-pro-preview' ? 0.3 : 0.6,
            },
          });
          reply = response.text || '';
        } catch (modelErr: any) {
          console.warn(`Error generating with ${selectedModel}:`, modelErr?.message || modelErr);
          // If complex model (gemini-3.1-pro-preview) encounters quota/permissions limit, fallback gracefully to gemini-3.5-flash
          if (selectedModel === 'gemini-3.1-pro-preview') {
            actualModelUsed = 'gemini-3.5-flash';
            const fallbackResp = await ai.models.generateContent({
              model: 'gemini-3.5-flash',
              contents,
              config: {
                systemInstruction,
                temperature: 0.4,
              },
            });
            reply = fallbackResp.text || '';
          } else {
            throw modelErr;
          }
        }

        if (!reply) {
          reply = language === 'zh'
            ? '已接收您的问题，随时为您提供更多招牌与报价帮助。'
            : 'Received your request. How else can I assist with your signage project?';
        }

        res.json({
          reply,
          model: actualModelUsed,
          role,
          source: 'gemini',
        });
        return;
      }

      // Offline intelligent fallback if GEMINI_API_KEY is not configured
      const q = userText.toLowerCase();
      let fallbackReply = '';

      if (role === 'complex') {
        fallbackReply = language === 'zh'
          ? `### 招牌工程与电气负荷计算参考（模型：gemini-3.1-pro-preview）
- **变压器/电源驱动选型**：\`总功率(W) = 模组数量 × 单颗功率(W)\`。驱动器建议保留 **20% 安全余量**：\`推荐驱动容量 = 总功率 × 1.20\`。
- **12V / 24V 电流计算**：\`电流(A) = 功率(W) / 电压(V)\`。例如 120W / 12V = 10A。
- **户外抗风压计算**：户外灯箱按标准迎风面抗风压设计需满足结构锚固荷载。
*(提示：配置 GEMINI_API_KEY 后，Gemini 3.1 Pro 将提供包含现场参数的深度定制工程推理)*`
          : `### Signage Engineering & Electrical Calculation Guide (Model: gemini-3.1-pro-preview)
- **LED Driver Sizing**: \`Total Watts = LED Module Count × Watts/Module\`. Always apply a **20% safety headroom**: \`Recommended Driver = Total Watts × 1.20\`.
- **Amperage Draw**: \`Current (A) = Power (W) / Voltage (V)\`. (e.g. 120W on 12V DC = 10 Amps).
- **Wind Load Calculation**: Outdoor signs must withstand wind loads calculated as: \`Force = Dynamic Pressure × Area × Drag Coefficient\`.
*(Note: With GEMINI_API_KEY configured, Gemini 3.1 Pro provides real-time deep engineering calculations tailored to your exact inputs)*`;
      } else if (role === 'fast') {
        fallbackReply = language === 'zh'
          ? `### 极速换算小助手（模型：gemini-3.1-flash-lite）
- **面积换算**：\`平方英尺(sq ft) = (宽[in] × 高[in]) / 144\`
- **公英制对应**：1 英尺 = 12 英寸 = 30.48 厘米 = 304.8 毫米
- **标准费率**：灯箱 $50/sq ft，背光字 $35/sq ft，双面发光 $85/sq ft。`
          : `### Fast Helper & Quick Math (Model: gemini-3.1-flash-lite)
- **Area**: \`Area (sq ft) = (W_in × H_in) / 144\`
- **Metric**: 1 ft = 12 in = 30.48 cm = 304.8 mm = 0.3048 m
- **Base Rates**: Standard Lightbox $50/sq ft, Backlit $35/sq ft, Double Lit $85/sq ft.`;
      } else {
        if (q.includes('discount') || q.includes('折')) {
          fallbackReply = language === 'zh'
            ? `### 如何设置整单折扣？
1. 点击顶栏或底部 Dock 的 **报价单 (Quote Sheet)**。
2. 在总额附近找到 **折扣 (Disc)**。
3. 可选择 **5%**、**10%** 快速预设，或点击 **自定义$ (Custom $)** 输入任意固定的扣减美元金额！`
            : `### How to Apply Discounts
1. Open the **Quote Sheet** from the top menu or bottom Dock.
2. Locate the **Disc:** section above the total.
3. Choose **5%**, **10%**, or tap **Custom $** to deduct an exact dollar amount!`;
        } else {
          fallbackReply = language === 'zh'
            ? `### 欢迎使用 Halo 招牌设计中心智能助手（gemini-3.5-flash）
随时为您解答：
- **面积与价格计算**：换算逻辑与产品单价
- **自定义折扣**：百分比或任意金额 ($) 扣减
- **导出商业单据**：报价单 (Quotation)、发票 (Invoice)、收据 (Receipt) 高清 PDF
- **云端同步**：通过 Google 账号实现多设备同步`
            : `### Welcome to Halo Design Hub Assistant (gemini-3.5-flash)
I can help guide you on:
- **Pricing & Formulas**: Dimension inputs, sq ft conversions, and product unit rates
- **Discounts**: 5%, 10%, or Custom $ dollar deductions
- **Document Exports**: Quotation, Invoice, and Receipt PDFs
- **Cloud Sync**: Syncing quotes across devices with Google Sign-in`;
        }
      }

      res.json({
        reply: fallbackReply,
        model: actualModelUsed,
        role,
        source: 'fallback',
      });
    } catch (err: any) {
      console.error('Error in chat API:', err);
      res.status(500).json({ error: err.message || 'Failed to process AI chat request.' });
    }
  };

  app.post('/api/chat', handleChat);
  app.post('/api/ai/ask', handleChat);

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
