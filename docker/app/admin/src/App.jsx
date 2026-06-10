import React, { useEffect, useRef, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const styles = {
  page: { fontFamily: 'sans-serif', maxWidth: 900, margin: '2rem auto', padding: '0 1rem' },
  header: { borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  table: { width: '100%', marginTop: '1rem', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '2px solid #ddd', padding: '0.5rem' },
  td: { borderBottom: '1px solid #eee', padding: '0.5rem' },
  link: { background: 'none', border: 'none', color: '#0b84ff', cursor: 'pointer', padding: 0, textDecoration: 'underline' },
  backBtn: { padding: '0.25rem 0.75rem', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' },
  chat: { border: '1px solid #ddd', borderRadius: 8, padding: '1rem', height: 420, overflowY: 'auto', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  bubble: (mine) => ({
    alignSelf: mine ? 'flex-end' : 'flex-start',
    background: mine ? '#34c759' : '#e5e5ea',
    color: mine ? '#fff' : '#000',
    padding: '0.5rem 0.75rem', borderRadius: 16, maxWidth: '75%',
  }),
  meta: { fontSize: 11, opacity: 0.6, marginTop: 2 },
  form: { display: 'flex', gap: '0.5rem', marginTop: '0.75rem' },
  input: { flex: 1, padding: '0.5rem', borderRadius: 6, border: '1px solid #ccc' },
  button: { padding: '0.5rem 1rem', borderRadius: 6, border: 'none', background: '#34c759', color: '#fff', cursor: 'pointer' },
};

function parseRoute() {
  const m = window.location.hash.match(/^#\/chat\/(\d+)$/);
  return m ? { view: 'chat', userId: Number(m[1]) } : { view: 'list' };
}

export default function App() {
  const [route, setRoute] = useState(parseRoute());

  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>Receptionist panel</h1>
        {route.view === 'chat' && (
          <button style={styles.backBtn} onClick={() => { window.location.hash = ''; }}>
            ← Back to user list
          </button>
        )}
      </header>
      {route.view === 'list' ? <UserList /> : <ChatView userId={route.userId} />}
      <p style={{ color: '#888', fontSize: 12, marginTop: '1rem' }}>API: {API}</p>
    </main>
  );
}

function UserList() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const res = await fetch(`${API}/api/users`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUsers(await res.json());
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <section>
      <button style={styles.backBtn} onClick={load}>Refresh</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>#</th>
            <th style={styles.th}>Patient</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Messages</th>
            <th style={styles.th}>Last message</th>
            <th style={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={styles.td}>{u.id}</td>
              <td style={styles.td}>{u.first_name} {u.last_name}</td>
              <td style={styles.td}>{u.email}</td>
              <td style={styles.td}>{u.message_count}</td>
              <td style={styles.td}>{u.last_message_at ? new Date(u.last_message_at).toLocaleString() : '—'}</td>
              <td style={styles.td}>
                <button style={styles.link} onClick={() => { window.location.hash = `#/chat/${u.id}`; }}>
                  Open chat
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ChatView({ userId }) {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);
  const chatRef = useRef(null);

  const loadMessages = async () => {
    const res = await fetch(`${API}/api/messages?userId=${userId}`);
    if (!res.ok) throw new Error(`messages: HTTP ${res.status}`);
    setMessages(await res.json());
  };

  useEffect(() => {
    (async () => {
      try {
        const usersRes = await fetch(`${API}/api/users`);
        if (!usersRes.ok) throw new Error(`users: HTTP ${usersRes.status}`);
        const list = await usersRes.json();
        setUser(list.find((u) => u.id === userId) || null);
        await loadMessages();
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    try {
      const res = await fetch(`${API}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sender: 'admin', body }),
      });
      if (!res.ok) throw new Error(`send: HTTP ${res.status}`);
      await loadMessages();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section>
      <h2 style={{ marginTop: 0 }}>
        Chat with {user ? `${user.first_name} ${user.last_name}` : `user #${userId}`}
      </h2>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={styles.chat} ref={chatRef}>
        {messages.length === 0 && !error && <p style={{ color: '#888' }}>No messages yet.</p>}
        {messages.map((m) => (
          <div key={m.id} style={styles.bubble(m.sender === 'admin')}>
            <div>{m.body}</div>
            <div style={styles.meta}>
              {m.sender === 'admin' ? 'You (reception)' : (user ? user.first_name : 'Patient')} · {new Date(m.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <form style={styles.form} onSubmit={send}>
        <input
          style={styles.input}
          placeholder="Reply to patient..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button style={styles.button} type="submit" disabled={!draft.trim()}>Send</button>
      </form>
    </section>
  );
}
