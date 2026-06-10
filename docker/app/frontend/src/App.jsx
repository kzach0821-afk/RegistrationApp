import React, { useEffect, useRef, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const styles = {
  page: { fontFamily: 'sans-serif', maxWidth: 640, margin: '2rem auto', padding: '0 1rem' },
  header: { borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1rem' },
  chat: {
    border: '1px solid #ddd', borderRadius: 8, padding: '1rem',
    height: 420, overflowY: 'auto', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '0.5rem',
  },
  bubble: (mine) => ({
    alignSelf: mine ? 'flex-end' : 'flex-start',
    background: mine ? '#0b84ff' : '#e5e5ea',
    color: mine ? '#fff' : '#000',
    padding: '0.5rem 0.75rem', borderRadius: 16, maxWidth: '75%',
  }),
  meta: { fontSize: 11, opacity: 0.6, marginTop: 2 },
  form: { display: 'flex', gap: '0.5rem', marginTop: '0.75rem' },
  input: { flex: 1, padding: '0.5rem', borderRadius: 6, border: '1px solid #ccc' },
  button: { padding: '0.5rem 1rem', borderRadius: 6, border: 'none', background: '#0b84ff', color: '#fff', cursor: 'pointer' },
};

export default function App() {
  const [me, setMe] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);
  const chatRef = useRef(null);

  const loadMessages = async (userId) => {
    const res = await fetch(`${API}/api/messages?userId=${userId}`);
    if (!res.ok) throw new Error(`messages: HTTP ${res.status}`);
    setMessages(await res.json());
  };

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch(`${API}/api/me`);
        if (!meRes.ok) throw new Error(`me: HTTP ${meRes.status}`);
        const meData = await meRes.json();
        setMe(meData);
        await loadMessages(meData.id);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !me) return;
    setDraft('');
    try {
      const res = await fetch(`${API}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: me.id, sender: 'user', body }),
      });
      if (!res.ok) throw new Error(`send: HTTP ${res.status}`);
      await loadMessages(me.id);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>Clinic chat</h1>
        {me && <p style={{ margin: '0.25rem 0 0', color: '#666' }}>Signed in as <strong>{me.first_name} {me.last_name}</strong></p>}
      </header>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={styles.chat} ref={chatRef}>
        {messages.length === 0 && !error && <p style={{ color: '#888' }}>No messages yet — say hello!</p>}
        {messages.map((m) => (
          <div key={m.id} style={styles.bubble(m.sender === 'user')}>
            <div>{m.body}</div>
            <div style={styles.meta}>
              {m.sender === 'user' ? 'You' : 'Reception'} · {new Date(m.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <form style={styles.form} onSubmit={send}>
        <input
          style={styles.input}
          placeholder="Type a message..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!me}
        />
        <button style={styles.button} type="submit" disabled={!me || !draft.trim()}>Send</button>
      </form>

      <p style={{ color: '#888', fontSize: 12, marginTop: '1rem' }}>API: {API}</p>
    </main>
  );
}
