const express = require('express');
const router = express.Router();
const chatQueries = require('../db/chatQueries');
const serviceQueries = require('../db/serviceQueries');
const { verifyFirebaseToken } = require('../../middleware/authMiddleware');
const { GoogleGenAI } = require('@google/genai');

// Initialize the Google Gen AI SDK
let aiClient;
try {
  aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} catch (e) {
  console.error("Failed to initialize GoogleGenAI", e);
}

// ── Session endpoints ──

// POST /api/chat/session  — create a new chat session
router.post('/session', verifyFirebaseToken, async (req, res) => {
  try {
    const session = await chatQueries.createSession(req.user.id);
    res.json({ session });
  } catch (err) {
    console.error('Error creating session:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/chat/sessions  — list all sessions for the user
router.get('/sessions', verifyFirebaseToken, async (req, res) => {
  try {
    const sessions = await chatQueries.getSessionsByUser(req.user.id);
    res.json({ sessions });
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /api/chat/session/:id  — get messages for a specific session
router.get('/session/:id', verifyFirebaseToken, async (req, res) => {
  try {
    // Verify the session belongs to this user
    const session = await chatQueries.getSessionById(req.params.id);
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const messages = await chatQueries.getSessionMessages(req.params.id);
    res.json({ session, messages });
  } catch (err) {
    console.error('Error fetching session messages:', err);
    res.status(500).json({ error: 'Failed to fetch session messages' });
  }
});

// DELETE /api/chat/session/:id  — delete a session
router.delete('/session/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const session = await chatQueries.getSessionById(req.params.id);
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Session not found' });
    }
    await chatQueries.deleteSession(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting session:', err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// ── Chat message endpoint ──

// POST /api/chat
// Receives a message + sessionId, saves it, gets AI response, saves it, returns AI response
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Verify the session belongs to this user
    const session = await chatQueries.getSessionById(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // 1. Save the user's message
    const userMsg = await chatQueries.insertChatMessage(req.user.id, sessionId, 'user', message);

    // 2. Auto-title the session from the first user message
    if (session.title === 'New Chat') {
      const title = message.length > 60 ? message.substring(0, 57) + '...' : message;
      await chatQueries.updateSessionTitle(sessionId, title);
    }

    // 3. Fetch context for the AI (Services & current queues)
    const services = await serviceQueries.getAllServices();
    const servicesContext = services.map(s => 
      `- ${s.name}: ${s.description} (Duration: ${s.duration}m, ${s.open ? 'Open' : 'Closed'}, Priority: ${s.priority})`
    ).join('\n');

    // 4. Construct System Prompt
    const systemPrompt = `You are CougarBot, the QueueSmart AI Assistant. QueueSmart is a university advising queue application.
Your job is to help students figure out which service they need, how long the wait is, and answer questions about the queue.
DO NOT answer questions unrelated to advising, the university, or the QueueSmart app. If asked an off-topic question (e.g. about movies, pop culture, etc.), politely decline and steer the conversation back to advising.

Here are the current open services and their wait status:
${servicesContext}

Keep your answers concise, helpful, and friendly. Do NOT use markdown formatting like ** or * in your responses. Use plain text only. For lists, use simple dashes or numbers.`;

    // 5. Fetch this session's chat history to provide conversation context
    const history = await chatQueries.getSessionMessages(sessionId);
    const formattedHistory = history.map(h => ({
      role: h.role,
      parts: [{ text: h.content }]
    }));

    // 6. Call the AI
    let aiResponseText = "I'm sorry, I am having trouble connecting to my brain right now.";
    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: formattedHistory,
          config: {
            systemInstruction: systemPrompt,
          }
        });
        aiResponseText = response.text;
      } catch (aiError) {
        console.error("AI Generation Error:", aiError);
        aiResponseText = "I'm sorry, my AI services are currently unavailable. Please try again later.";
      }
    }

    // 7. Save the AI's response
    const aiMsg = await chatQueries.insertChatMessage(req.user.id, sessionId, 'model', aiResponseText);

    res.json({ message: aiMsg });
  } catch (err) {
    console.error('Error in chat endpoint:', err);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

module.exports = router;
