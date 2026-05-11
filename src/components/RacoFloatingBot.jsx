import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const IMAGES = {
  idle: 'https://media.base44.com/images/public/6a01a130e9db43abba4284d6/2969298a3_Raco.jpg',
  thinking1: 'https://media.base44.com/images/public/6a01a130e9db43abba4284d6/2542b1c85_thinking2.jpg',
  thinking2: 'https://media.base44.com/images/public/6a01a130e9db43abba4284d6/659768264_thinking5.jpg',
  thinking3: 'https://media.base44.com/images/public/6a01a130e9db43abba4284d6/3e8383681_thinking.jpg',
  thinking4: 'https://media.base44.com/images/public/6a01a130e9db43abba4284d6/3db4325d2_thinking2.jpg',
  processing1: 'https://media.base44.com/images/public/6a01a130e9db43abba4284d6/a83520e40_procesing.jpg',
  processing2: 'https://media.base44.com/images/public/6a01a130e9db43abba4284d6/8aaab4cb8_processing.jpg',
};

const THINKING_FRAMES = [IMAGES.thinking1, IMAGES.thinking2, IMAGES.thinking3, IMAGES.thinking4];
const PROCESSING_FRAMES = [IMAGES.processing1, IMAGES.processing2];

const PAGE_HINTS = {
  '/': "Today's overview ready",
  '/ask': 'Chat with me!',
  '/contacts': 'I know your network',
  '/leads': 'Hot leads analysis ready',
  '/inventory': 'Owner intelligence available',
  '/zones': 'Zone insights loaded',
  '/deals': 'Pipeline overview ready',
  '/market': 'Market data analysed',
  '/marketing': 'Campaign insights ready',
  '/compliance': 'Audit summary available',
  '/admin': 'Admin overview ready',
  '/activity': 'Task briefing ready',
};

export default function RacoFloatingBot() {
  const navigate = useNavigate();
  const location = useLocation();

  const [pos, setPos] = useState({ x: window.innerWidth - 96, y: window.innerHeight - 120 });
  const [dragging, setDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const dragStart = useRef(null);

  const [frame, setFrame] = useState(0);
  const [botState, setBotState] = useState('idle');
  const [showHint, setShowHint] = useState(false);
  const hintTimer = useRef(null);

  // Show hint bubble when page changes
  useEffect(() => {
    setBotState('thinking');
    setFrame(0);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => {
      setBotState('idle');
      setShowHint(true);
      hintTimer.current = setTimeout(() => setShowHint(false), 3000);
    }, 1200);
    return () => clearTimeout(hintTimer.current);
  }, [location.pathname]);

  // Frame cycling
  useEffect(() => {
    if (botState === 'idle') { setFrame(0); return; }
    const frames = botState === 'thinking' ? THINKING_FRAMES : PROCESSING_FRAMES;
    const id = setInterval(() => setFrame(f => (f + 1) % frames.length),
      botState === 'thinking' ? 500 : 350);
    return () => clearInterval(id);
  }, [botState]);

  const src = botState === 'idle'
    ? IMAGES.idle
    : botState === 'thinking'
      ? THINKING_FRAMES[frame]
      : PROCESSING_FRAMES[frame];

  const onMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    setHasDragged(false);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) setHasDragged(true);
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 72, dragStart.current.px + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 72, dragStart.current.py + dy)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  const handleClick = () => {
    if (!hasDragged) navigate('/ask');
  };

  const hint = PAGE_HINTS[location.pathname] || 'Ask me anything';

  if (location.pathname === '/ask') return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* Hint bubble */}
      {showHint && (
        <div
          className="absolute bottom-full mb-2 right-0 whitespace-nowrap"
          style={{ animation: 'fadeInUp 0.3s ease-out' }}
        >
          <div className="bg-evergreen text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brass animate-pulse-dot shrink-0" />
            {hint}
          </div>
          <div
            className="absolute right-5 top-full w-0 h-0"
            style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid hsl(158,42%,22%)' }}
          />
        </div>
      )}

      {/* Bot button */}
      <button
        onMouseDown={onMouseDown}
        onTouchStart={(e) => {
          setDragging(true);
          setHasDragged(false);
          dragStart.current = { mx: e.touches[0].clientX, my: e.touches[0].clientY, px: pos.x, py: pos.y };
        }}
        onClick={handleClick}
        title="Raco AI Assistant"
        className="group relative"
        style={{ cursor: dragging ? 'grabbing' : 'grab', background: 'none', border: 'none', padding: 0 }}
      >
        {/* Glow ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,161,105,0.25) 0%, transparent 70%)', transform: 'scale(1.4)' }}
        />
        {/* Bot image */}
        <div
          className="w-16 h-16 rounded-full overflow-hidden shadow-xl ring-2 ring-hairline"
          style={{
            background: 'hsl(var(--background))',
            transform: botState !== 'idle' ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.2s ease',
          }}
        >
          <img
            src={src}
            alt="Raco AI"
            draggable={false}
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center 10%' }}
          />
        </div>

        {/* Label below */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[9px] font-semibold text-evergreen whitespace-nowrap tracking-wide">
          RACO AI
        </div>
      </button>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}