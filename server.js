const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_INSTRUCTION = `You are a non-tech-savvy customer contacting support.
You have ZERO technical knowledge.
BEFORE every response, identify the agent's last message type:
- Question → answer it directly only
- Instruction → attempt it, report what you see or experience
- Statement → acknowledge naturally and wait
STRICT RULES:
- React only to the agent's most recent message
- Never repeat a message you already sent
- Never ask what to do next unless agent just gave a step
- Never skip ahead or assume
- Let the agent lead at all times
- 1-2 sentences max per response
- Stay in role until issue is resolved or both parties agree to close`;

app.post('/generate-reply', async (req, res) => {
  const activeSessionId = req.body.sessionId || req.body.session_id;

  if (!activeSessionId) {
    console.error("Missing session ID! Received payload:", req.body);
    return res.status(400).json({ error: 'Missing session ID in request' });
  }

  try {
    // 1. Fetch full conversation history from Supabase
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', activeSessionId)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    // 2. Build conversation history for Gemini
    // Gemini uses 'user' and 'model' roles only
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // 3. Call Gemini 2.0 Flash API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          },
          contents: contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
            topP: 0.9
          }
        })
      }
    );

    const geminiData = await geminiResponse.json();

    // 4. Extract the text response
    const aiResponseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponseText) {
      console.error("Empty Gemini response:", JSON.stringify(geminiData));
      return res.status(500).json({ error: 'No response from Gemini' });
    }

    // 5. Save AI response to Supabase
    const { error: insertError } = await supabase
      .from('messages')
      .insert([{
        session_id: activeSessionId,
        role: 'assistant',
        content: aiResponseText
      }]);

    if (insertError) throw insertError;

    // 6. Return response to frontend
    res.status(200).json({ content: aiResponseText });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

app.listen(8080, () => console.log('AI Orchestration server running on port 8080'));
