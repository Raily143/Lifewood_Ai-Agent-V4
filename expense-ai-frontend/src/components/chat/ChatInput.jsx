import { useState, useRef, useEffect } from 'react';

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask about your expenses...',
  maxRows = 4,
}) {
  const [value,   setValue]   = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef           = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight  = 20;
    const paddingY    = 20;
    const maxHeight   = lineHeight * maxRows + paddingY;
    el.style.height   = Math.min(el.scrollHeight, maxHeight) + 'px';
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [value, maxRows]);

  const canSend = value.trim().length > 0 && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      padding: '12px 16px',
      borderTop: '1px solid var(--lw-border)',
      background: 'var(--lw-white)',
      display: 'flex',
      gap: '8px',
      alignItems: 'flex-end',
    }}>
      <div style={{
        flex: 1,
        position: 'relative',
        borderRadius: '10px',
        border: `1px solid ${focused ? 'var(--lw-accent)' : 'var(--lw-border)'}`,
        transition: 'border-color 0.15s',
        background: 'var(--lw-sea-salt)',
      }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: '10px 14px',
            color: disabled ? 'var(--lw-muted)' : 'var(--lw-text)',
            fontFamily: "'Manrope', sans-serif",
            fontSize: '13px',
            lineHeight: '20px',
            display: 'block',
            boxSizing: 'border-box',
          }}
        />

        {focused && value.includes('\n') && (
          <div style={{
            position: 'absolute',
            bottom: '6px',
            right: '10px',
            fontFamily: "'Manrope', sans-serif",
            fontSize: '10px',
            color: 'var(--lw-muted)',
            pointerEvents: 'none',
          }}>
            Shift+Enter for newline
          </div>
        )}
      </div>

      <button
        onClick={handleSend}
        disabled={!canSend}
        title={canSend ? 'Send message (Enter)' : 'Type a message first'}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: canSend
            ? 'var(--lw-accent)'
            : 'var(--lw-sea-salt)',
          border: '1px solid var(--lw-border)',
          cursor: canSend ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: canSend ? 'scale(1)' : 'scale(0.95)',
          boxShadow: canSend ? '0 6px 14px rgba(255,179,71,0.28)' : 'none',
        }}
        onMouseEnter={e => canSend && (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={e => (e.currentTarget.style.transform = canSend ? 'scale(1)' : 'scale(0.95)')}
      >
        <svg
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke={canSend ? 'var(--lw-dark)' : 'var(--lw-muted)'}
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      </button>
    </div>
  );
}
