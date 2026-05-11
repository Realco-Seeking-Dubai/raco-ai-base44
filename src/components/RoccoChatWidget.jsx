import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

export default function RoccoChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m Rocco AI. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSend() {
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Mock response (wire to Gemini 2.5 later)
    setTimeout(() => {
      const responses = [
        'I\'m analyzing your market data. Will send a comprehensive report shortly.',
        'Your leads are looking great this week! 📊 Top performer: Downtown zone.',
        'I\'ve identified 3 high-priority opportunities for follow-up.',
        'Current pipeline value: ~AED 45M. Best performing source: referrals.',
        'Ready to assist! What would you like to focus on today?'
      ];
      const mockReply = responses[Math.floor(Math.random() * responses.length)];
      setMessages(prev => [...prev, { role: 'assistant', content: mockReply }]);
      setLoading(false);
    }, 800);
  }

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-evergreen hover:bg-evergreen-mid text-white shadow-lg transition-all hover:scale-110"
          title="Chat with Rocco AI"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      ) : (
        <div className="flex flex-col h-96 w-80 bg-card border border-hairline rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between bg-evergreen text-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <span className="font-semibold">Rocco AI</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-evergreen-mid rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex gap-2',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-xs rounded-lg px-3 py-2 text-sm',
                    msg.role === 'user'
                      ? 'bg-evergreen text-white'
                      : 'bg-surface text-foreground'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="bg-surface rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-hairline p-3 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask Rocco..."
              disabled={loading}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-hairline bg-background focus:outline-none focus:border-evergreen transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-2 rounded-lg bg-evergreen text-white hover:bg-evergreen-mid transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}