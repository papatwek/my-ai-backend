
/**
 * Render Dedicated Backend Server for Wyze ECE Simulator
 *
 * Gemini = Primary AI
 * OpenAI = Optional backup (only when explicitly confirmed free)
 * Rule-based responses = Final fallback
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] [RENDER INCOMING] ${req.method} ${req.url}`);

  if (req.body && Object.keys(req.body).length > 0) {
    const turn = req.body.turnNumber
      ? `Turn: ${req.body.turnNumber}`
      : '';

    const name = req.body.persona?.name
      ? `Customer: ${req.body.persona.name}`
      : '';

    const prod = req.body.persona?.product
      ? `Product: ${req.body.persona.product}`
      : '';

    console.log(`[${timestamp}] [PAYLOAD PREVIEW] ${turn} ${name} ${prod}`);
  }

  next();
});

// Health check
app.get(['/', '/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'Wyze ECE AI Simulator Render Backend',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Wyze product catalog
const WYZE_CATALOG = [
  "STOCK KNOWLEDGE & DIVERSITY RULES:",
  "- Scenarios span across the entire catalog: CAMERAS, CONNECTED HOME, POWER & LIGHTING, LIFESTYLE & AUDIO, SENSORS & HOME MONITORING, SUBSCRIPTIONS & SERVICES.",
  "- If an agent asks for documentation, reference the specific support link provided for that product family.",
  "",
  "1. CAMERAS (Reference: https://support.wyze.com/hc/en-us/categories/360004553112)",
  "Wyze Cam v1, v2, v3, v3 Pro, v4, Pan v1, v2, v3, OG, Battery Cam Pro, Solar Cam, Floodlight Pro, Video Doorbell v2",
  "",
  "2. CONNECTED HOME (Reference: https://support.wyze.com/hc/en-us/categories/360004553132)",
  "Wyze Plug, Plug Outdoor, Thermostat, Lock, Lock Bolt, Robot Vacuum, Cordless Vacuum, Mesh Router, Mesh Router Pro 6E, Scale X",
  "",
  "3. POWER & LIGHTING",
  "Wyze Bulb, Bulb Color, Light Strip Pro, Switch, Solar Panel",
  "",
  "4. LIFESTYLE & AUDIO",
  "Wyze Headphones, Buds, Buds Pro, Watch 44mm, Watch 47mm, Band",
  "",
  "5. SENSORS & HOME MONITORING",
  "Wyze Sense Hub, Keypad, Entry Sensor v2, Motion Sensor v2, Leak Sensor",
  "",
  "6. SUBSCRIPTIONS & SERVICES",
  "Cam Plus, Cam Plus Lite, Cam Protect, Wyze Home Monitoring"
];

// Identify device type
function getDeviceNoun(pName) {
  const p = (pName || '').toLowerCase();

  if (p.includes('vacuum')) return { noun: 'vacuum', isCamera: false };
  if (p.includes('router') || p.includes('mesh')) return { noun: 'router', isCamera: false };
  if (p.includes('lock') || p.includes('safe')) return { noun: 'lock', isCamera: false };
  if (p.includes('thermostat')) return { noun: 'thermostat', isCamera: false };
  if (p.includes('scale')) return { noun: 'scale', isCamera: false };
  if (p.includes('plug')) return { noun: 'plug', isCamera: false };

  if (
    p.includes('bulb') ||
    p.includes('strip') ||
    p.includes('switch')
  ) {
    return { noun: 'light', isCamera: false };
  }

  if (p.includes('headphone') || p.includes('buds')) {
    return { noun: 'headphones', isCamera: false };
  }

  if (p.includes('watch') || p.includes('band')) {
    return { noun: 'watch', isCamera: false };
  }

  if (
    p.includes('sensor') ||
    p.includes('sense') ||
    p.includes('leak') ||
    p.includes('entry')
  ) {
    return { noun: 'sensor', isCamera: false };
  }

  if (p.includes('cam plus') || p.includes('subscription')) {
    return { noun: 'subscription', isCamera: false };
  }

  if (p.includes('doorbell')) {
    return { noun: 'doorbell', isCamera: true };
  }

  return {
    noun: p.includes('cam') ? 'camera' : 'device',
    isCamera: p.includes('cam') || !p
  };
}

// Rule-based customer response fallback
function generateContextualRenderResponse(
  latestAgent,
  persona,
  allMessages,
  isEmail
) {
  const msg = (latestAgent || '').trim().toLowerCase();

  const custName = persona?.name || 'Customer';
  const prod = persona?.product || 'Wyze Device';

  const { noun, isCamera } = getDeviceNoun(prod);

  const led = persona?.ledColor || 'solid yellow';
  const email = persona?.email || 'customer@example.invalid';
  const mac = persona?.macAddress || '2C:AA:8E:44:91:02';
  const order = persona?.orderNumber || 'TEST-WZ-104928';

  const alreadySent = (txt) => {
    return (allMessages || []).some(m => {
      const t = String(m.text || m.content || '');

      return (
        (m.role === 'customer' || m.role === 'model') &&
        t.includes(txt.slice(0, 20))
      );
    });
  };

  let reply = '';

  // 1. Hold / wait requests
  if (
    /(hold\b|bear\s+with\s+me|give\s+me\s+(?:\d+|a\s+few|a\s+couple|one)?\s*(?:min|minute|sec|second|moment)|wait\s+(?:for\s+a\s+(?:while|moment|second|min)|a\s+moment|a\s+minute|here|for\s+me)|gather\s+(?:information|info)|check\s+(?:my\s+resources|on\s+this|this\s+for\s+you|your\s+account|into\s+this|further)|look(?:ing)?\s+into\s+this|take\s+a\s+look|let\s+me\s+check|let\s+me\s+research|be\s+right\s+back|give\s+you\s+the\s+best\s+assistance)/i.test(msg)
  ) {
    const holdOpts = [
      "Sure, take your time! I'll wait right here.",
      "No problem at all, take all the time you need.",
      "Okay, I'll be right here waiting.",
      "Understood, take your time!"
    ];

    for (const h of holdOpts) {
      if (!alreadySent(h)) {
        reply = h;
        break;
      }
    }

    if (!reply) reply = "Sure, I'll wait right here.";
  }

  // 2. Empathy / thank-you
  else if (
    /(thank\s+you\s+for\s+(?:providing|sharing|confirming|verifying|giving)|thanks\s+for\s+(?:providing|sharing|confirming|verifying|giving)|i\s+see\s+that\s+you|appreciate\s+your\s+(?:loyalty|patience|time)|i\s+understand\s+(?:how|that|your)|no\s+worries|happy\s+to\s+help|glad\s+to\s+assist|welcome\s+to\s+wyze|i\'ll\s+do\s+my\s+best\s+to\s+help)/i.test(msg)
  ) {
    reply = "Thank you, I really appreciate your help.";
  }

  // 3. Asking permission
  else if (
    /(can\s+i\s+ask|may\s+i\s+ask|ask\s+you\s+(?:a\s+few|a\s+couple|some|questions)|check\s+a\s+few\s+things\s+with\s+you)/i.test(msg)
  ) {
    reply = "Sure, go right ahead and ask whatever you need.";
  }

  // 4. Order number
  else if (
    /(?:order\s*(?:number|#|id)|proof\s+of\s+purchase|purchase\s+order|sales\s+receipt|invoice)/i.test(msg)
  ) {
    reply = `My order number is ${order}.`;
  }

  // 5. MAC / serial number
  else if (
    /(?:mac\s*(?:address|addr)?\b|serial\s*(?:number|#|no)\b|physical\s*address)/i.test(msg)
  ) {
    reply = `The MAC address on the ${noun} is ${mac}.`;
  }

  // 6. Name / email
  else if (
    /(?:what\s+is|can\s+you\s+(?:provide|confirm|verify|give)|please\s+(?:provide|confirm|verify|give|share)).*(?:name|email|account)/i.test(msg) ||
    /(?:verify|confirm)\s+(?:your\s+)?(?:account|name|email)/i.test(msg) ||
    /who\s+am\s+i\s+speaking\s+with/i.test(msg)
  ) {
    if (/email/i.test(msg) && !/name/i.test(msg)) {
      reply = `My email is ${email}.`;
    } else if (/name/i.test(msg) && !/email/i.test(msg)) {
      reply = `My name is ${custName}.`;
    } else {
      reply = `Yes, my name is ${custName} and my account email is ${email}.`;
    }
  }

  // 7. LED / status light
  else if (
    /(light|led|color|indicator|status light|front light|screen|display|blinking|solid)/i.test(msg)
  ) {
    reply = `The status light on the ${noun} is currently ${led}.`;
  }

  // 8. Power cycle
  else if (
    /(unplug|power\s*cycle|reboot|restart|power\s*off|disconnect.*power|outlet|30\s*second)/i.test(msg)
  ) {
    reply = `Okay, I just unplugged the ${noun}, waited 30 seconds, and plugged it back in. The status light came back on ${led}.`;
  }

  // 9. Buttons / reset
  else if (
    /(setup button|reset button|hold.*button|press.*button|pinhole|factory reset)/i.test(msg)
  ) {
    if (isCamera) {
      reply = `I pressed and held the setup button on the camera until it clicked. It announced "Ready to connect" and now the light is flashing!`;
    } else if (noun === 'router') {
      reply = `I held down the reset button on the router for 10 seconds. The front light started pulsing white.`;
    } else if (noun === 'vacuum') {
      reply = `I pressed and held the power and home buttons together on the vacuum. It announced "Resetting Wi-Fi" and the light is flashing.`;
    } else if (noun === 'lock') {
      reply = `I pressed the setup button behind the lock battery cover. The lock beeped and the light flashed.`;
    } else {
      reply = `I held down the button on the ${noun} like you asked. It clicked and the status light started blinking.`;
    }
  }

  // 10. QR code / scanning
  else if (
    /(qr|scan.*code|barcode|scan.*app|app.*add)/i.test(msg)
  ) {
    if (isCamera) {
      reply = `I pointed the camera lens at my phone screen, it made a chime and said "QR code scanned", and now the light turned solid blue!`;
    } else {
      reply = `I scanned the code with my phone in the Wyze app, and it connected successfully!`;
    }
  }

  // 11. Wi-Fi
  else if (
    /(wifi|wi-fi|router|2\.4|5ghz|network|ssid|frequency)/i.test(msg)
  ) {
    reply = `Our home Wi-Fi has both 2.4 and 5GHz bands. All our phones and laptops in the house connect to it fine.`;
  }

  // 12. Greetings
  else if (
    /^(hi|hello|hey|good day|good morning|good afternoon|thanks for reaching)/i.test(msg)
  ) {
    reply = `Hi! Thanks for helping me. My ${prod} is having issues and I really need help getting it sorted out.`;
  }

  // 13. Closing
  else if (
    /(anything else|further assistance|have a great day|ticket resolved|all set|take care)/i.test(msg)
  ) {
    reply = `Everything seems to be working now. Thank you so much for your help today!`;
  }

  // 14. Default
  else {
    reply = `Okay, I'm right here with my ${prod}.`;
  }

  if (isEmail) {
    return `Hello,

${reply}

I really appreciate you following up on my ticket regarding my ${prod}. Please let me know what else you need from me.

Thank you,
${custName}
Account: ${email}`;
  }

  return reply;
}

// Convert conversation history into OpenAI message format
function buildOpenAIMessages(
  contents,
  messages,
  persona,
  systemInstruction,
  prod,
  noun
) {
  const systemText = systemInstruction ||
    `You are roleplaying as a customer contacting support about your ${prod}. You have ZERO technical knowledge. Device: ${prod} (type: ${noun}). If your device is not a camera, never say camera. Reply naturally in 1-2 sentences and remain consistent with the conversation.`;

  const result = [
    {
      role: 'system',
      content: systemText
    }
  ];

  let sourceMessages = [];

  if (Array.isArray(contents) && contents.length) {
    sourceMessages = contents.map(item => ({
      role:
        item.role === 'model' || item.role === 'assistant'
          ? 'assistant'
          : 'user',

      content:
        (item.parts || [])
          .map(part => part?.text || '')
          .join('\n') ||
        item.text ||
        ''
    }));
  } else if (Array.isArray(messages) && messages.length) {
    sourceMessages = messages.map(item => ({
      role: ['customer', 'model', 'assistant'].includes(item.role)
        ? 'assistant'
        : 'user',

      content: String(item.text || item.content || '')
    }));
  }

  for (const item of sourceMessages) {
    const content = String(item.content || '').trim();

    if (!content) continue;

    const role = item.role === 'assistant'
      ? 'assistant'
      : 'user';

    const previous = result[result.length - 1];

    if (previous.role === role) {
      previous.content += '\n' + content;
    } else {
      result.push({
        role,
        content
      });
    }
  }

  if (
    result.length === 1 ||
    result[result.length - 1].role !== 'user'
  ) {
    result.push({
      role: 'user',
      content: `Please respond as the customer regarding my ${prod}.`
    });
  }

  return result;
}

// OpenAI backup
// IMPORTANT:
// No default model is configured.
// No automatic paid-model selection is allowed.
// This function only runs when explicitly enabled.
async function generateWithOpenAI({
  contents,
  messages,
  persona,
  systemInstruction,
  prod,
  noun
}) {
  const model = process.env.OPENAI_FREE_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;

  const freeConfirmed =
    process.env.OPENAI_FREE_TIER_CONFIRMED === 'true';

  if (!freeConfirmed || !model || !apiKey) {
    throw new Error(
      'OpenAI backup disabled. A verified free API model, API key, and explicit confirmation are required.'
    );
  }

  if (typeof fetch !== 'function') {
    throw new Error('Native fetch requires Node.js 18 or newer.');
  }

  const controller = new AbortController();

  const timeoutMs = Math.max(
    5000,
    Number(process.env.OPENAI_TIMEOUT_MS) || 20000
  );

  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          model,

          messages: buildOpenAIMessages(
            contents,
            messages,
            persona,
            systemInstruction,
            prod,
            noun
          ),

          temperature: 0.3,
          max_tokens: 800
        }),

        signal: controller.signal
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        data?.error?.message || `HTTP ${response.status}`
      );

      error.status = response.status;
      throw error;
    }

    const output = data?.choices?.[0]?.message?.content;

    if (typeof output !== 'string' || !output.trim()) {
      throw new Error('OpenAI returned an empty response.');
    }

    return output.trim();

  } finally {
    clearTimeout(timer);
  }
}

// Main chat handler
async function handleChat(req, res) {
  const body = req.body || {};

  const {
    contents,
    messages,
    persona,
    turnNumber,
    mode,
    systemInstruction
  } = body;

  const isEmail = mode === 'email';

  const prod = persona?.product || 'Wyze Device';

  const { noun, isCamera } = getDeviceNoun(prod);

  console.log(
    `[RENDER AI] Processing Turn ${turnNumber || 1} for ${persona?.name || 'Customer'} (${prod})`
  );

  let replyText = null;

  // ==========================================
  // 1. PRIMARY AI: GEMINI
  // ==========================================

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const { GoogleGenAI } = require('@google/genai');

      const ai = new GoogleGenAI({
        apiKey,

        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      // Prepare conversation history
      let rawContents = contents;

      if (!Array.isArray(rawContents) || rawContents.length === 0) {
        rawContents = [];

        if (Array.isArray(messages)) {
          for (let i = 0; i < messages.length; i++) {
            const m = messages[i];

            const text = String(
              m.text || m.content || ''
            ).trim();

            if (!text || m.role === 'system') continue;

            if (
              i === 0 &&
              (m.role === 'customer' || m.role === 'model')
            ) {
              rawContents.push({
                role: 'user',
                parts: [
                  {
                    text: `[Customer opened ticket for ${prod}]`
                  }
                ]
              });

              rawContents.push({
                role: 'model',
                parts: [{ text }]
              });

            } else if (
              m.role === 'agent' ||
              m.role === 'user'
            ) {
              rawContents.push({
                role: 'user',
                parts: [{ text }]
              });

            } else {
              rawContents.push({
                role: 'model',
                parts: [{ text }]
              });
            }
          }
        }
      }

      // Enforce Gemini user/model alternation
      const formattedContents = [];

      if (Array.isArray(rawContents)) {
        for (const item of rawContents) {
          const text =
            item.parts?.[0]?.text ||
            item.text ||
            '';

          if (!text) continue;

          const role =
            item.role === 'model' ||
            item.role === 'assistant'
              ? 'model'
              : 'user';

          if (
            formattedContents.length > 0 &&
            formattedContents[formattedContents.length - 1].role === role
          ) {
            formattedContents[
              formattedContents.length - 1
            ].parts[0].text += '\n' + text;

          } else {
            formattedContents.push({
              role,
              parts: [{ text }]
            });
          }
        }
      }

      if (
        formattedContents.length === 0 ||
        formattedContents[0].role !== 'user'
      ) {
        formattedContents.unshift({
          role: 'user',
          parts: [
            {
              text: `Hello, I need help with my ${prod}.`
            }
          ]
        });
      }

      if (
        formattedContents[formattedContents.length - 1].role !== 'user'
      ) {
        formattedContents.push({
          role: 'user',
          parts: [{ text: 'Hello' }]
        });
      }

      // Existing Gemini model sequence preserved
      const activeModels = [
        'gemini-3.5-flash',
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest'
      ];

      for (const modelName of activeModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,

            contents: formattedContents,

            config: {
              systemInstruction:
                systemInstruction ||
                `You are roleplaying as a customer contacting support about your ${prod}. You have ZERO technical knowledge. Device: ${prod} (type: ${noun}). If your device is not a camera, never say camera! Reply naturally in 1-2 sentences.`,

              temperature: 0.3,
              maxOutputTokens: 800,
              topP: 0.9
            }
          });

          if (
            response &&
            response.text &&
            response.text.trim()
          ) {
            const candidate = response.text.trim();

            if (
              isCamera ||
              !/\bcamera\b/i.test(candidate)
            ) {
              replyText = candidate;

              console.log(
                `[RENDER AI SUCCESS] Gemini ${modelName} generated a response.`
              );

              break;
            }
          }

        } catch (innerErr) {
          console.warn(
            `[RENDER AI] Model ${modelName} error (${innerErr?.status || 'exception'}):`,
            innerErr.message
          );
        }
      }

    } catch (aiErr) {
      console.error(
        '[RENDER AI ERROR] Gemini generation error:',
        aiErr.message
      );
    }
  }

  // ==========================================
  // 2. SECONDARY AI: OPENAI BACKUP
  // ==========================================
  // Runs only when:
  // - Gemini did not produce a usable response
  // - OPENAI_FREE_TIER_CONFIRMED is exactly "true"
  // - OPENAI_FREE_MODEL is explicitly configured
  // - OPENAI_API_KEY is configured
  //
  // No default model is selected.

  if (
    !replyText &&
    process.env.OPENAI_FREE_TIER_CONFIRMED === 'true' &&
    process.env.OPENAI_FREE_MODEL &&
    process.env.OPENAI_API_KEY
  ) {
    try {
      replyText = await generateWithOpenAI({
        contents,
        messages,
        persona,
        systemInstruction,
        prod,
        noun
      });

      // Prevent a non-camera device from being described as a camera
      if (
        !isCamera &&
        /\bcamera\b/i.test(replyText)
      ) {
        replyText = null;
      }

      if (replyText) {
        console.log(
          `[RENDER AI SUCCESS] OpenAI backup model ${process.env.OPENAI_FREE_MODEL} responded.`
        );
      }

    } catch (openAIErr) {
      console.warn(
        '[RENDER AI BACKUP] OpenAI unavailable; using local fallback:',
        openAIErr.message
      );

      replyText = null;
    }
  }

  // ==========================================
  // 3. FINAL FALLBACK: LOCAL RESPONSE LOGIC
  // ==========================================

  if (!replyText) {
    console.log(
      '[RENDER AI FALLBACK] Generating contextual persona response.'
    );

    let latestAgent = '';

    if (
      Array.isArray(contents) &&
      contents.length > 0
    ) {
      for (let i = contents.length - 1; i >= 0; i--) {
        if (contents[i].role === 'user') {
          latestAgent =
            contents[i].parts?.[0]?.text || '';

          break;
        }
      }

    } else if (
      Array.isArray(messages) &&
      messages.length > 0
    ) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (
          messages[i].role === 'agent' ||
          messages[i].role === 'user'
        ) {
          latestAgent =
            messages[i].text ||
            messages[i].content ||
            '';

          break;
        }
      }
    }

    replyText = generateContextualRenderResponse(
      latestAgent,
      persona,
      messages || [],
      isEmail
    );
  }

  // Remove Markdown code wrappers
  if (replyText.startsWith('```')) {
    replyText = replyText
      .replace(/^```[a-z]*\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();
  }

  // Handle JSON-formatted model responses
  try {
    const parsed = JSON.parse(replyText);

    if (
      parsed &&
      typeof (parsed.message || parsed.text) === 'string'
    ) {
      replyText = parsed.message || parsed.text;
    }

  } catch {
    // Normal text response; no action needed
  }

  // Preserve existing response structure
  return res.json({
    message: replyText,
    text: replyText,
    status: 'OPEN',
    source: 'render-backend',
    turnNumber: turnNumber || 1
  });
}

// API routes
app.post('/api/chat', handleChat);
app.post('/chat', handleChat);
app.post('/', handleChat);
app.post('/api/generate', handleChat);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('======================================================');
  console.log(`Wyze ECE AI Simulator Render Backend running on port ${PORT}`);
  console.log('Available endpoints: POST /api/chat, POST /chat, GET /health');
  console.log('======================================================');
});
