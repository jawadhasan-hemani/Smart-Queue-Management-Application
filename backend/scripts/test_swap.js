const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function run() {
  // Get services
  const res = await fetch('http://localhost:5000/api/services');
  const data = await res.json();
  const disabilityService = data.services.find(s => s.name === 'Disability Support Services');
  
  if (!disabilityService) return;
  const serviceId = disabilityService.id;

  const qRes = await fetch(`http://localhost:5000/api/queue/${serviceId}`);
  const qData = await qRes.json();
  const entries = qData.queue;
  
  console.log("Before swap:");
  entries.slice(-3).forEach(e => console.log(`${e.position}: ${e.student_name} (${e.id}) - ${e.priority} - ${new Date(e.joined_at).toISOString()}`));
  
  const bottomEntry = entries[entries.length - 1]; // Position 16
  const targetId = bottomEntry.id;
  
  console.log(`\nMoving ${bottomEntry.student_name} UP...`);
  const patchRes = await fetch(`http://localhost:5000/api/queue/${serviceId}/move/${targetId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ direction: 'up' })
  });
  console.log('PATCH response:', patchRes.status, await patchRes.text());
  
  // Fetch again
  const qRes2 = await fetch(`http://localhost:3000/api/queue/${serviceId}`);
  const qData2 = await qRes2.json();
  const entries2 = qData2.queue;
  
  console.log("\nAfter swap:");
  entries2.slice(-3).forEach(e => console.log(`${e.position}: ${e.student_name} (${e.id}) - ${e.priority} - ${new Date(e.joined_at).toISOString()}`));
}

run().catch(console.error);
