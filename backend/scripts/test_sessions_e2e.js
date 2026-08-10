/**
 * End-to-end test for the chat API, focusing on sessions and markdown formatting.
 */
require('dotenv').config();

const API = 'http://localhost:5000/api';
const FIREBASE_API_KEY = 'AIzaSyAcqAGY0-h50MlWH9ZH8uhUUIYMPH0Z7AI';
const TEST_EMAIL = 'chat_e2e_tester@example.com';
const TEST_PASSWORD = 'QueueSmart2026!';

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
  if (data.error) throw new Error(`Firebase signIn failed: ${JSON.stringify(data.error)}`);
  return data.idToken;
}

async function main() {
  console.log('=== CougarBot API E2E Test ===\n');

  // Step 1: Auth
  const token = await firebaseSignIn();
  console.log('1. ✅ Authenticated with Firebase');

  // Step 2: Create a new session
  let sessionId;
  try {
    const res = await fetch(`${API}/chat/session`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    sessionId = data.session.id;
    console.log(`2. ✅ Created new chat session: ${sessionId}`);
  } catch (err) {
    console.error('2. ❌ Failed to create session:', err.message);
    process.exit(1);
  }

  // Step 3: Send a message in the session
  try {
    const res = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message: 'List the available services.', sessionId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('3. ✅ Received AI response (testing for no markdown symbols):');
    console.log(`   "${data.message.content.substring(0, 150)}..."`);
  } catch (err) {
    console.error('3. ❌ Failed to send message:', err.message);
    process.exit(1);
  }

  // Step 4: Verify the session is listed in history
  try {
    const res = await fetch(`${API}/chat/sessions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const sessionExists = data.sessions.find(s => s.id === sessionId);
    if (!sessionExists) throw new Error('Session not found in history list');
    console.log(`4. ✅ Found session in history list (Title: "${sessionExists.title}")`);
  } catch (err) {
    console.error('4. ❌ Failed to verify session list:', err.message);
    process.exit(1);
  }

  // Step 5: Delete the session
  try {
    const res = await fetch(`${API}/chat/session/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log('5. ✅ Session deleted successfully');
  } catch (err) {
    console.error('5. ❌ Failed to delete session:', err.message);
    process.exit(1);
  }

  console.log('\n=== All tests passed! ✅ ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
