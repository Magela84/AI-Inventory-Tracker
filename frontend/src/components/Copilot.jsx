// Copilot — floating chat widget that can inspect and modify inventory.
import React, { useEffect, useRef, useState } from 'react';

import { copilot } from '../lib/api.js';

const GREETING = {
  role: 'assistant',
  content:
    "Hi! I'm your Inventory Copilot. I can check stock, forecast runouts, and place " +
    'reorders for you. Try one of the suggestions below.',
};

const SUGGESTIONS = [
  "What's low on stock?",
  'Reorder everything below threshold',
  'When will the USB-C Hub run out?',
];

export default function Copilot({ onChanged }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');

    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setLoading(true);

    try {
      // Only send role + content to the backend (strip UI-only fields).
      const payload = next.map((m) => ({ role: m.role, content: m.content }));
      const res = await copilot(payload);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply, actions: res.actions ?? [] },
      ]);
      if (res.changed) onChanged?.();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${err.message || 'Request failed'}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-blue-700"
      >
        <span className="text-lg leading-none">✨</span> Copilot
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex h-[32rem] w-96 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between bg-blue-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span>✨</span>
          <span className="text-sm font-semibold">Inventory Copilot</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
          ✕
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-800'
              }`}
            >
              {m.content}
              {m.actions?.length > 0 && (
                <ul className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                  {m.actions.map((a, j) => (
                    <li key={j} className="flex items-center gap-1 text-xs text-green-700">
                      <span>✓</span> {a.summary}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400">
              Thinking…
            </div>
          </div>
        )}
      </div>

      {/* Suggestion chips (only before the first user turn) */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-1 border-t border-gray-100 bg-white px-3 py-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 border-t border-gray-200 bg-white p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask or command…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
