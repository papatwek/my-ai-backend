// server.js (Your dedicated Render backend)
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
// Import your preferred AI SDK (e.g., OpenAI, Google Generative AI)

const app = express();
app.use(express.json());

// Use the Service Role Key for backend scripts to bypass row-level security
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

app.post('/generate-reply', async (req, res) => {
  const { sessionId, traineeMessage } = req.body;

  try {
    // 1. Generate the AI response (Replace with your actual AI API call)
    const aiResponseText = `Mock AI Customer: I am frustrated with my recent bill!`; 

    // 2. Save the AI's response directly to Supabase
    const { error } = await supabase
      .from('messages')
      .insert([
        {
          session_id: sessionId,
          role: 'assistant',
          content: aiResponseText
        }
      ]);

    if (error) throw error;

    // 3. Return success (Vercel updates the UI via WebSockets, not this HTTP response)
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

app.listen(8080, () => console.log('AI Orchestration server running on port 8080'));
