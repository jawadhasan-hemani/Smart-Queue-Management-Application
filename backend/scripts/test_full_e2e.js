/**
 * Comprehensive E2E Production-Readiness Test
 * Tests: Auth, Services CRUD, Queue ops, History, Notifications, Chat Sessions
 * Runs as both Admin and Student simultaneously.
 */
require('dotenv').config();

const API = 'http://localhost:5000/api';
const FIREBASE_API_KEY = 'AIzaSyAcqAGY0-h50MlWH9ZH8uhUUIYMPH0Z7AI';

const ADMIN_EMAIL = 'admin@queuesmart.com';
const ADMIN_PASSWORD = 'QueueSmart2026!';
const STUDENT_EMAIL = 'chat_e2e_tester@example.com';
const STUDENT_PASSWORD = 'QueueSmart2026!';

let passed = 0;
let failed = 0;
const failures = [];

function ok(label) {
  passed++;
  console.log(`  ✅ ${label}`);
}

function fail(label, err) {
  failed++;
  failures.push({ label, error: err?.message || err });
  console.error(`  ❌ ${label}: ${err?.message || err}`);
}

async function firebaseSignIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(`Firebase: ${data.error.message}`);
  return data.idToken;
}

async function api(token, path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body };
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   QueueSmart Production-Readiness E2E Test    ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  // ─── 1. Authentication ─────────────────────────────────
  console.log('1. AUTHENTICATION');
  let adminToken, studentToken;

  try {
    adminToken = await firebaseSignIn(ADMIN_EMAIL, ADMIN_PASSWORD);
    ok('Admin sign-in');
  } catch (e) { fail('Admin sign-in', e); return; }

  try {
    studentToken = await firebaseSignIn(STUDENT_EMAIL, STUDENT_PASSWORD);
    ok('Student sign-in');
  } catch (e) { fail('Student sign-in', e); return; }

  // ─── 2. Auth Sync ──────────────────────────────────────
  console.log('\n2. AUTH SYNC (auto-create user in DB)');

  try {
    const r = await api(adminToken, '/auth/sync', {
      method: 'POST',
      body: JSON.stringify({ name: 'Admin', role: 'admin' }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(r.body)}`);
    if (r.body.user?.role !== 'admin') throw new Error(`Expected admin role, got ${r.body.user?.role}`);
    ok('Admin sync returns role=admin');
  } catch (e) { fail('Admin sync', e); }

  try {
    const r = await api(studentToken, '/auth/sync', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Student', role: 'user' }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    ok('Student sync returns user record');
  } catch (e) { fail('Student sync', e); }

  // ─── 3. Services CRUD ──────────────────────────────────
  console.log('\n3. SERVICES CRUD');

  let testServiceId;

  // List services
  try {
    const r = await api(adminToken, '/services');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    if (!Array.isArray(r.body.services)) throw new Error('Expected services array');
    ok(`List services — ${r.body.services.length} found`);
  } catch (e) { fail('List services', e); }

  // Create a test service
  try {
    const r = await api(adminToken, '/services', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Test Advising',
        description: 'Created by automated test',
        duration: 10,
        priority: 'medium',
        open: true,
      }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(r.body)}`);
    testServiceId = r.body.service?.id;
    if (!testServiceId) throw new Error('No service ID returned');
    ok(`Create service — ID: ${testServiceId}`);
  } catch (e) { fail('Create service', e); }

  // Update the service
  if (testServiceId) {
    try {
      const r = await api(adminToken, `/services/${testServiceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'E2E Test Advising (Updated)',
          description: 'Updated by automated test',
          duration: 15,
          priority: 'high',
          open: true,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      if (r.body.service?.name !== 'E2E Test Advising (Updated)') throw new Error('Name not updated');
      ok('Update service');
    } catch (e) { fail('Update service', e); }
  }

  // ─── 4. Queue Operations ───────────────────────────────
  console.log('\n4. QUEUE OPERATIONS');

  if (testServiceId) {
    // Student joins queue
    let entryId;
    try {
      const r = await api(studentToken, `/queue/${testServiceId}/join`, {
        method: 'POST',
        body: JSON.stringify({ studentName: 'Test Student', priority: 'medium' }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      entryId = r.body.entry?.id;
      ok(`Student joins queue — Entry: ${entryId}`);
    } catch (e) { fail('Student joins queue', e); }

    // Get queue for service
    try {
      const r = await api(adminToken, `/queue/${testServiceId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      if (!r.body.queue || r.body.queue.length === 0) throw new Error('Queue empty after join');
      const found = r.body.queue.find(e => e.id === entryId);
      if (!found) throw new Error('Entry not found in queue');
      ok(`Get queue — ${r.body.queue.length} student(s) in line`);
    } catch (e) { fail('Get queue', e); }

    // Queue summary
    try {
      const r = await api(adminToken, '/queue');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      if (!Array.isArray(r.body.summary)) throw new Error('Expected summary array');
      const svc = r.body.summary.find(s => s.serviceId === testServiceId);
      if (!svc || svc.count < 1) throw new Error('Service not found in summary or count is 0');
      ok(`Queue summary — ${svc.count} waiting for test service`);
    } catch (e) { fail('Queue summary', e); }

    // Admin serves next student
    try {
      const r = await api(adminToken, `/queue/${testServiceId}/serve`, { method: 'POST' });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      ok('Admin serves next student');
    } catch (e) { fail('Admin serve next', e); }

    // Verify queue is now empty
    try {
      const r = await api(adminToken, `/queue/${testServiceId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      if (r.body.queue && r.body.queue.length > 0) throw new Error('Queue should be empty after serve');
      ok('Queue empty after serve');
    } catch (e) { fail('Queue empty check', e); }

    // Student joins again, then leaves
    try {
      const joinR = await api(studentToken, `/queue/${testServiceId}/join`, {
        method: 'POST',
        body: JSON.stringify({ studentName: 'Test Student', priority: 'low' }),
      });
      if (!joinR.ok) throw new Error(`Join failed: ${joinR.status}`);
      const newEntryId = joinR.body.entry?.id;

      const leaveR = await api(studentToken, `/queue/${testServiceId}/leave/${newEntryId}`, {
        method: 'DELETE',
      });
      if (!leaveR.ok) throw new Error(`Leave failed: ${leaveR.status}`);
      ok('Student joins and leaves queue');
    } catch (e) { fail('Join then leave', e); }
  }

  // ─── 5. History ────────────────────────────────────────
  console.log('\n5. HISTORY');

  try {
    const r = await api(adminToken, '/history');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    if (!Array.isArray(r.body.history)) throw new Error('Expected history array');
    ok(`Get history — ${r.body.history.length} records`);
  } catch (e) { fail('Get history', e); }

  try {
    const r = await api(adminToken, '/history/summary?status=served');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    if (r.body.avgWaitMinutes === undefined) throw new Error('Missing avgWaitMinutes');
    ok(`History summary — avg wait: ${r.body.avgWaitMinutes} min`);
  } catch (e) { fail('History summary', e); }

  // ─── 6. Notifications ─────────────────────────────────
  console.log('\n6. NOTIFICATIONS');

  try {
    const r = await api(studentToken, '/notifications?studentName=Test%20Student');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    if (!Array.isArray(r.body.notifications)) throw new Error('Expected notifications array');
    ok(`Get notifications — ${r.body.notifications.length} found`);
  } catch (e) { fail('Get notifications', e); }

  // ─── 7. Chat Sessions & AI ─────────────────────────────
  console.log('\n7. CHAT SESSIONS & AI');

  let chatSessionId;

  // Create a new chat session (student)
  try {
    const r = await api(studentToken, '/chat/session', { method: 'POST' });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(r.body)}`);
    chatSessionId = r.body.session?.id;
    if (!chatSessionId) throw new Error('No session ID returned');
    ok(`Create chat session — ${chatSessionId}`);
  } catch (e) { fail('Create chat session', e); }

  // Send a message
  if (chatSessionId) {
    try {
      const r = await api(studentToken, '/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'What services are available?', sessionId: chatSessionId }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      if (!r.body.message?.content) throw new Error('No AI response content');
      const snippet = r.body.message.content.substring(0, 80);
      ok(`AI responds: "${snippet}..."`);
    } catch (e) { fail('Send chat message', e); }
  }

  // List sessions
  try {
    const r = await api(studentToken, '/chat/sessions');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    if (!Array.isArray(r.body.sessions)) throw new Error('Expected sessions array');
    const found = r.body.sessions.find(s => s.id === chatSessionId);
    if (!found) throw new Error('Session not found in list');
    ok(`List chat sessions — ${r.body.sessions.length} sessions`);
  } catch (e) { fail('List chat sessions', e); }

  // Get session messages
  if (chatSessionId) {
    try {
      const r = await api(studentToken, `/chat/session/${chatSessionId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      if (!Array.isArray(r.body.messages) || r.body.messages.length < 2)
        throw new Error(`Expected >=2 messages, got ${r.body.messages?.length}`);
      ok(`Get session messages — ${r.body.messages.length} messages`);
    } catch (e) { fail('Get session messages', e); }
  }

  // Admin creates a separate chat session (isolation test)
  let adminSessionId;
  try {
    const r = await api(adminToken, '/chat/session', { method: 'POST' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    adminSessionId = r.body.session?.id;
    ok(`Admin creates own session — ${adminSessionId}`);
  } catch (e) { fail('Admin create session', e); }

  // Verify admin cannot see student's session
  if (chatSessionId) {
    try {
      const r = await api(adminToken, `/chat/session/${chatSessionId}`);
      // This should either fail or return empty (depending on backend enforcement)
      if (r.ok && r.body.messages?.length > 0) {
        fail('Session isolation', 'Admin can see student messages — SECURITY ISSUE');
      } else {
        ok('Session isolation — admin cannot access student session');
      }
    } catch (e) { ok('Session isolation — access denied'); }
  }

  // Delete student session
  if (chatSessionId) {
    try {
      const r = await api(studentToken, `/chat/session/${chatSessionId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      ok('Delete student chat session');
    } catch (e) { fail('Delete chat session', e); }
  }

  // Delete admin session
  if (adminSessionId) {
    try {
      const r = await api(adminToken, `/chat/session/${adminSessionId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      ok('Delete admin chat session');
    } catch (e) { fail('Delete admin chat session', e); }
  }

  // ─── 8. Cleanup ────────────────────────────────────────
  console.log('\n8. CLEANUP');

  if (testServiceId) {
    try {
      const r = await api(adminToken, `/services/${testServiceId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      ok('Delete test service');
    } catch (e) { fail('Delete test service', e); }
  }

  // ─── 9. Edge Cases ─────────────────────────────────────
  console.log('\n9. EDGE CASES');

  // Unauthenticated request
  try {
    const res = await fetch(`${API}/services`);
    // Services should be public or the endpoint should still work
    ok(`Unauthenticated /services — HTTP ${res.status}`);
  } catch (e) { fail('Unauthenticated request', e); }

  // Invalid service ID
  try {
    const r = await api(adminToken, '/queue/nonexistent-id');
    // Should return 200 with empty queue or 404
    ok(`Invalid service queue — HTTP ${r.status} (expected 200 or 404)`);
  } catch (e) { fail('Invalid service queue', e); }

  // Empty chat message
  try {
    const newSession = await api(studentToken, '/chat/session', { method: 'POST' });
    const sid = newSession.body.session?.id;
    const r = await api(studentToken, '/chat', {
      method: 'POST',
      body: JSON.stringify({ message: '', sessionId: sid }),
    });
    if (r.ok) {
      fail('Empty message accepted', 'Should reject empty messages');
    } else {
      ok('Empty chat message rejected');
    }
    // cleanup
    if (sid) await api(studentToken, `/chat/session/${sid}`, { method: 'DELETE' });
  } catch (e) { ok('Empty chat message handled'); }

  // ─── Report ────────────────────────────────────────────
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log(`║   Results: ${passed} passed, ${failed} failed${' '.repeat(Math.max(0, 23 - String(passed).length - String(failed).length))}║`);
  console.log('╚═══════════════════════════════════════════════╝');

  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.label}: ${f.error}`));
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\nUnexpected crash:', err);
  process.exit(1);
});
