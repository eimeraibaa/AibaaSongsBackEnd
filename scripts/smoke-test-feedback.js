import fetch from 'node-fetch';
import 'dotenv/config';

const BACKEND = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;

async function run() {
  console.log('Running smoke test against', BACKEND);

  const payload = {
    songId: 1,
    rating: 5,
    comment: 'Smoke test - ¡funciona!'
  };

  try {
    const res = await fetch(`${BACKEND}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    console.log('Response status:', res.status);
    console.log('Response body:', json);
  } catch (err) {
    console.error('Smoke test failed (is the server running?):', err.message || err);
  }
}

run();
