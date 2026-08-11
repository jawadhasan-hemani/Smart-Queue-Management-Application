/**
 * End-to-end test for the chat API.
 * Creates a Firebase user if needed, syncs with backend, then tests chat.
 */
require('dotenv').config();

const API = 'http://localhost:5000/api';
const FIREBASE_API_KEY = 'AIzaSyAcqAGY0-h50MlWH9ZH8uhUUIYMPH0Z7AI';
const TEST_EMAIL = 'chat_e2e_tester@example.com';
const TEST_PASSWORD = 'QueueSmart2026!';
const TEST_NAME = 'Chat Tester';

async function firebaseSignUp() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );
  const data = await res.json();
  if (data.error && data.error.message === 'EMAIL_EXISTS') {
    // Already exists, sign in instead
    return firebaseSignIn();
  }
  if (data.error) {
    throw new Error(`Firebase signUp failed: ${JSON.stringify(data.error)}`);
  }
  return data.idToken;
}

async function firebaseSignIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );
  const data = await res.json();
  if (data.error) {
    throw new Error(`Firebase signIn failed: ${JSON.stringify(data.error)}`);
  }
  return data.idToken;
}

async function main() {
  console.log('=== AI Chatbot E2E Test ===\n');

  // Step 1: Auth with Firebase
  console.log('1. Authenticating with Firebase (sign up or sign in)...');
  let token;
  try {
    token = await firebaseSignUp();
    console.log('   ✅ Got Firebase ID token\n');
  } catch (err) {
    console.error('   ❌ Failed:', err.message);
    process.exit(1);
  }

  // Step 2: Sync user with backend (creates user_credentials row if needed)
  console.log('2. Syncing user with backend...');
  try {
    const res = await fetch(`${API}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name: TEST_NAME, role: 'user' }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    console.log('   ✅ User synced:', data.user?.email || 'unknown');
    console.log('   Database ID:', data.user?.id || 'unknown');
    console.log();
  } catch (err) {
    console.error('   ❌ Failed:', err.message);
    process.exit(1);
  }

  // Step 3: Send a chat message
  console.log('3. Sending chat message: "What services are available?"');
  try {
    const res = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message: 'What services are available?' }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    console.log('   ✅ Response received!');
    console.log('   AI said:', data.message?.content?.substring(0, 300));
    console.log('   Role:', data.message?.role);
    console.log('   ID:', data.message?.id);
    console.log();
  } catch (err) {
    console.error('   ❌ Failed:', err.message);
    process.exit(1);
  }

  // Step 4: Fetch chat history
  console.log('4. Fetching chat history...');
  try {
    const res = await fetch(`${API}/chat/history`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`HTTP ${res.status}: ${errBody}`);
    }

    const history = await res.json();
    console.log(`   ✅ Got ${history.length} messages in history`);
    history.forEach((m, i) => {
      const preview = m.content.length > 80 ? m.content.substring(0, 80) + '...' : m.content;
      console.log(`   [${i + 1}] ${m.role}: ${preview}`);
    });
    console.log();
  } catch (err) {
    console.error('   ❌ Failed:', err.message);
    process.exit(1);
  }

  console.log('=== All tests passed! ✅ ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
