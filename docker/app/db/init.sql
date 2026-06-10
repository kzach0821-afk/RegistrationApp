CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender          VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'admin')),
    body            TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

INSERT INTO users (id, first_name, last_name, email) VALUES
    (1, 'John', 'Smith', 'john.smith@example.com'),
    (2, 'Mary', 'Johnson', 'mary.johnson@example.com'),
    (3, 'David', 'Williams', 'david.williams@example.com'),
    (4, 'Sarah', 'Brown', 'sarah.brown@example.com'),
    (5, 'Michael', 'Davis', 'michael.davis@example.com')
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

INSERT INTO messages (user_id, sender, body, created_at) VALUES
    (1, 'user',  'Hello, I would like to book an appointment.',              NOW() - INTERVAL '2 days'),
    (1, 'admin', 'Hi John! Sure, what kind of consultation do you need?',    NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),
    (1, 'user',  'I need a general checkup.',                                NOW() - INTERVAL '1 day'),
    (1, 'admin', 'We have a slot on Monday at 10:00. Does that work?',       NOW() - INTERVAL '1 day' + INTERVAL '10 minutes'),
    (1, 'user',  'Monday at 10:00 sounds great. Thank you!',                 NOW() - INTERVAL '6 hours'),

    (2, 'user',  'Can I reschedule my appointment to next week?',            NOW() - INTERVAL '3 hours'),
    (2, 'admin', 'Of course, what day and time would suit you better?',     NOW() - INTERVAL '2 hours'),

    (3, 'user',  'Do you have any cardiologist available this Friday?',      NOW() - INTERVAL '5 hours'),

    (4, 'user',  'I would like to cancel my visit scheduled for tomorrow.',  NOW() - INTERVAL '20 minutes');
