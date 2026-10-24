const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Use the Service Role Key for backend scripts to bypass row-level security
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

app.post('/generate-reply', async (req, res) => {
  // Capture the session ID regardless of whether the frontend uses an underscore or camelCase
  const activeSessionId = req.body.sessionId || req.body.session_id;

  // Safety check to prevent database crashes
  if (!activeSessionId) {
    console.error("Missing session ID! Received payload:", req.body);
    return res.status(400).json({ error: 'Missing session ID in request' });
  }

  try {
    // 1. Generate the AI response
    const aiResponseText = `Mock AI Customer: I am frustrated with my recent bill!`; 

    // 2. Save the AI's response directly to Supabase
    const { error } = await supabase
      .from('messages')
      .insert([
        {
          session_id: activeSessionId,
          role: 'assistant',
          content: aiResponseText
        }
      ]);

    if (error) throw error;

    // 3. Return success
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

app.listen(8080, () => console.log('AI Orchestration server running on port 8080'));
