import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import RacoAvatar from '@/components/ask/RacoAvatar';

const CHIPS = [
  'Who are my hottest leads this week?',
  'Show me Al Furjan owner intelligence',
  'Draft a WhatsApp message for Khalid Al Marri',
  'What is the market trend in Hillside Residences?',
  'Which owners in my scope have 5+ properties?',
  'Summarise my deals pipeline',
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && <RacoAvatar state="idle" size="sm" />}
      <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${isUser ? 'bg-evergreen text-white' : 'bg-card border border-hairline text-foreground'}`}>
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function AskRaco() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text) {
    const content = text || input.trim();
    if (!content || loading) return;
    setInput('');
    setLoading(true);
    setMessages(m => [...m, { role: 'user', content }]);

    try {
      let convId = conversationId;
      if (!convId) {
        const conv = await base44.agents.createConversation({
          agent_name: 'raco_assistant',
          metadata: { user_email: user?.email },
        });
        convId = conv.id;
        setConversationId(convId);
      }
      const conv = await base44.agents.addMessage({ id: convId }, { role: 'user', content });
      const lastMsg = conv.messages?.at(-1);
      if (lastMsg?.role === 'assistant') {
        setMessages(m => [...m, { role: 'assistant', content: lastMsg.content }]);
      }
    } catch (e) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: `I couldn't reach the Raco agent right now. ${e.message || 'Please try again.'}`,
      }]);
    } finally {
      setLoading(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <RacoAvatar state={loading ? 'thinking' : 'idle'} size="sm" />
          <div>
            <h1 className="text-sm font-semibold text-foreground">Raco AI Assistant</h1>
            <p className="text-xs text-muted-foreground">{loading ? 'Thinking…' : 'Your intelligence assistant'}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {empty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 max-w-lg mx-auto text-center">
            <div
              className="rounded-2xl overflow-hidden shadow-lg"
              style={{ background: '#ffffff', width: 160, height: 160 }}
            >
              <RacoAvatar state="idle" size="lg" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">What would you like to know?</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ask about your leads, owners, market trends, or request a message draft.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              {CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  className="text-left text-xs px-3 py-2.5 rounded-lg border border-hairline hover:border-hairline-strong bg-card hover:bg-surface transition-colors text-muted-foreground hover:text-foreground"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
            {loading && (
              <div className="flex gap-3 items-end">
                <RacoAvatar state="processing" size="sm" />
                <div className="bg-card border border-hairline rounded-xl px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-muted-2 rounded-full animate-pulse-dot" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted-2 rounded-full animate-pulse-dot" style={{ animationDelay: '200ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted-2 rounded-full animate-pulse-dot" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-hairline px-6 py-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask Raco anything…"
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-hairline bg-card focus:outline-none focus:border-evergreen transition-colors"
            disabled={loading}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-evergreen text-white flex items-center justify-center hover:bg-evergreen-mid transition-colors disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {!empty && (
          <button
            onClick={() => { setMessages([]); setConversationId(null); }}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground block mx-auto"
          >
            Clear conversation
          </button>
        )}
      </div>
    </div>
  );
}