import express from 'express';
import cors from 'cors';
import { pool, waitForDb } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const CURRENT_USER_ID = Number(process.env.DEMO_USER_ID || 1);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/me', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, first_name, last_name, email FROM users WHERE id = $1`,
    [CURRENT_USER_ID]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Demo user not found' });
  res.json(rows[0]);
});

app.get('/api/users', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.email,
            (SELECT COUNT(*) FROM messages m WHERE m.user_id = u.id) AS message_count,
            (SELECT MAX(created_at) FROM messages m WHERE m.user_id = u.id) AS last_message_at
     FROM users u
     ORDER BY u.id ASC`
  );
  res.json(rows);
});

app.get('/api/messages', async (req, res) => {
  const userId = Number(req.query.userId);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'userId required' });
  const { rows } = await pool.query(
    `SELECT id, user_id, sender, body, created_at
     FROM messages
     WHERE user_id = $1
     ORDER BY created_at ASC`,
    [userId]
  );
  res.json(rows);
});

app.post('/api/messages', async (req, res) => {
  const { userId, sender, body } = req.body || {};
  if (!userId || !sender || !body) {
    return res.status(400).json({ error: 'userId, sender and body are required' });
  }
  if (sender !== 'user' && sender !== 'admin') {
    return res.status(400).json({ error: "sender must be 'user' or 'admin'" });
  }
  if (typeof body !== 'string' || body.trim().length === 0) {
    return res.status(400).json({ error: 'body must be a non-empty string' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO messages (user_id, sender, body)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, sender, body, created_at`,
      [userId, sender, body.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: err.message });
  }
});

const port = Number(process.env.PORT || 3000);

waitForDb()
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`[backend] listening on :${port}`);
    });
  })
  .catch((err) => {
    console.error('[backend] failed to start:', err);
    process.exit(1);
  });
