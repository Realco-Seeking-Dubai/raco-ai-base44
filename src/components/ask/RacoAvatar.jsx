import { useEffect, useState } from 'react';

// Raco AI branded bot images
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

/**
 * size: 'sm' | 'md' | 'lg'
 * state: 'idle' | 'thinking' | 'processing'
 */
export default function RacoAvatar({ state = 'idle', size = 'md' }) {
  const [frame, setFrame] = useState(0);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-40 h-40',
  };

  useEffect(() => {
    if (state === 'idle') { setFrame(0); return; }
    const frames = state === 'thinking' ? THINKING_FRAMES : PROCESSING_FRAMES;
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % frames.length);
    }, state === 'thinking' ? 600 : 400);
    return () => clearInterval(interval);
  }, [state]);

  const src = state === 'idle'
    ? IMAGES.idle
    : state === 'thinking'
      ? THINKING_FRAMES[frame]
      : PROCESSING_FRAMES[frame];

  return (
    <div
      className={`${sizeClasses[size]} rounded-full overflow-hidden shrink-0 bg-white`}
      style={{ backgroundColor: '#ffffff' }}
    >
      <img
        src={src}
        alt="Raco AI"
        className="w-full h-full object-cover"
        style={{ objectPosition: 'center 10%' }}
      />
    </div>
  );
}