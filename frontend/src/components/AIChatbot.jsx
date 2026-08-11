import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, Sparkles, Clock, SquarePen, ArrowLeft, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useApp } from './AppContext';
import { auth } from '../firebase';

const API_URL = '/api';

// ── Role-based suggested prompts ──
const studentSuggestions = [
  "Which queue is the fastest right now?",
  "Which advisor should I meet for registration?",
  "How long is the wait for Financial Aid?"
];

const adminSuggestions = [
  "Which queue has the longest wait time?",
  "How many students are waiting across all services?",
  "What services should I consider opening?"
];

// ── Helpers ──
async function getToken() {
  return auth.currentUser?.getIdToken();
}

export default function AIChatbot() {
  const { user } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadResponse, setUnreadResponse] = useState(false);

  // Session state
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const messagesEndRef = useRef(null);
  const initRef = useRef(false);

  const suggestions = user?.role === 'admin' ? adminSuggestions : studentSuggestions;

  // ── API helpers ──
  const apiCall = useCallback(async (path, options = {}) => {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  }, []);

  // ── Create a new session ──
  const createNewSession = useCallback(async () => {
    try {
      const data = await apiCall('/chat/session', { method: 'POST' });
      setCurrentSessionId(data.session.id);
      setMessages([]);
      setShowHistory(false);
      return data.session.id;
    } catch (err) {
      console.error('Failed to create session', err);
      return null;
    }
  }, [apiCall]);

  // ── Load sessions list ──
  const loadSessions = useCallback(async () => {
    try {
      const data = await apiCall('/chat/sessions');
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  }, [apiCall]);

  // ── Load a specific session ──
  const loadSession = useCallback(async (sessionId) => {
    try {
      const data = await apiCall(`/chat/session/${sessionId}`);
      setCurrentSessionId(sessionId);
      setMessages(data.messages || []);
      setShowHistory(false);
    } catch (err) {
      console.error('Failed to load session', err);
    }
  }, [apiCall]);

  // ── Delete a session ──
  const deleteSession = useCallback(async (sessionId, e) => {
    e.stopPropagation();
    try {
      await apiCall(`/chat/session/${sessionId}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        createNewSession();
      }
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  }, [apiCall, currentSessionId, createNewSession]);

  // ── Initialize: create a fresh session on mount ──
  useEffect(() => {
    if (user && !initRef.current) {
      initRef.current = true;
      createNewSession();
    }
  }, [user, createNewSession]);

  // Reset initialization ref when user changes (e.g. logout/login)
  useEffect(() => {
    if (!user) {
      initRef.current = false;
      setCurrentSessionId(null);
      setMessages([]);
      setSessions([]);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadResponse(false);
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Send a message ──
  const sendMessage = async (text) => {
    if (!text.trim() || !user || isTyping) return;

    let sid = currentSessionId;
    if (!sid) {
      sid = await createNewSession();
      if (!sid) return;
    }

    const newMessage = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const data = await apiCall('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text, sessionId: sid }),
      });

      setMessages(prev => [...prev, data.message]);

      if (!isOpen) {
        setUnreadResponse(true);
      }
    } catch (err) {
      console.error('Failed to send message', err);
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(),
        role: 'model',
        content: "Sorry, something went wrong. Please try again.",
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  const handleOpenHistory = async () => {
    await loadSessions();
    setShowHistory(true);
  };

  const handleNewChat = async () => {
    await createNewSession();
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* The Chat Window */}
      <div
        className={`absolute bottom-20 right-0 w-80 sm:w-96 bg-background shadow-2xl rounded-2xl border border-border flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right
          ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
        style={{ height: '500px', maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="p-4 flex justify-between items-center shrink-0" style={{ background: '#1a3c4d' }}>
          <div className="flex items-center gap-2">
            <Sparkles size={20} style={{ color: '#f0c040' }} />
            <h3 className="font-semibold text-lg" style={{ color: '#ffffff' }}>CougarBot</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleOpenHistory}
              title="Chat History"
              className="p-1.5 rounded-full transition-colors"
              style={{ color: '#cbd5e1' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Clock size={18} />
            </button>
            <button
              onClick={handleNewChat}
              title="New Chat"
              className="p-1.5 rounded-full transition-colors"
              style={{ color: '#cbd5e1' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <SquarePen size={18} />
            </button>
            <button
              onClick={() => { setIsOpen(false); setShowHistory(false); }}
              className="p-1.5 rounded-full transition-colors"
              style={{ color: '#cbd5e1' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content: History panel OR Chat area */}
        {showHistory ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* History header */}
            <div className="flex items-center gap-2 p-3 border-b border-border">
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 hover:bg-secondary rounded-full transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="font-medium text-sm">Chat History</span>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No previous chats yet.
                </div>
              ) : (
                sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    className={`w-full text-left p-3 border-b border-border hover:bg-secondary/50 transition-colors flex items-center gap-2 group ${
                      s.id === currentSessionId ? 'bg-secondary/70' : ''
                    }`}
                  >
                    <MessageCircle size={14} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {s.preview || s.title || 'New Chat'}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(s.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        {' · '}
                        {new Date(s.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
                      title="Delete chat"
                    >
                      <Trash2 size={14} className="text-destructive" />
                    </button>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center text-center text-muted-foreground space-y-4">
                  <Bot size={48} className="text-primary/50" />
                  <p>Hi {user.name || 'there'}! I'm <strong>CougarBot</strong>, your QueueSmart assistant.</p>
                  <p className="text-sm">Ask me anything about our advising queues!</p>

                  <div className="flex flex-col gap-2 w-full mt-4">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(s)}
                        className="text-left text-sm bg-secondary/50 hover:bg-secondary p-3 rounded-xl transition-colors text-secondary-foreground border border-border"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m) => (
                    <div key={m.id} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-3 ${
                        m.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-secondary text-secondary-foreground rounded-bl-sm border border-border'
                      }`}>
                        {m.role === 'model' ? (
                          <div className="text-sm chat-markdown">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                em: ({ children }) => <em>{children}</em>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-1">{children}</ol>,
                                li: ({ children }) => <li className="mb-0.5">{children}</li>,
                                h1: ({ children }) => <p className="font-bold mb-1">{children}</p>,
                                h2: ({ children }) => <p className="font-bold mb-1">{children}</p>,
                                h3: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                              }}
                            >
                              {m.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                        )}
                        <div className={`text-[10px] mt-1 text-right ${m.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex w-full justify-start">
                      <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-bl-sm p-3 border border-border flex items-center gap-2">
                        <Bot size={16} className="text-primary animate-pulse" />
                        <span className="text-xs text-muted-foreground animate-pulse">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-background border-t border-border shrink-0">
              <div className="relative flex items-end">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask me anything..."
                  className="w-full max-h-32 min-h-[44px] bg-secondary/50 border border-border rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={1}
                />
                <button
                  onClick={() => sendMessage(inputText)}
                  disabled={!inputText.trim() || isTyping}
                  className="absolute right-2 bottom-2 p-1.5 bg-primary text-primary-foreground rounded-full disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* The Floating Action Button */}
      <div className="relative flex flex-col items-end">
        {/* Tooltip badge */}
        {!isOpen && messages.length === 0 && !unreadResponse && (
          <div className="mb-2 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg animate-bounce" style={{ background: '#1a3c4d' }}>
            Need help?
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center text-white
            ${isOpen ? 'rotate-90 scale-90' : 'hover:scale-105'}
          `}
          style={{ background: '#1a3c4d' }}
        >
          {isOpen ? <X size={28} className="-rotate-90" /> : <MessageCircle size={28} />}

          {/* Unread Dot Notification */}
          {!isOpen && unreadResponse && (
            <span className="absolute top-0 right-0 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-destructive border-2 border-solid" style={{ borderColor: '#1a3c4d' }}></span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
