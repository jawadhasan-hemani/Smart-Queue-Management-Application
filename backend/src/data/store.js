const { randomUUID } = require('crypto');

function seedServices() {
  const now = new Date().toISOString();
  return [
    {
      id: 'svc-general',
      name: 'General Academic Advising',
      description: 'Course planning, degree requirements, and general questions.',
      duration: 12,
      priority: 'medium',
      open: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'svc-registration',
      name: 'Registration & Enrollment',
      description: 'Add/drop help, holds, waitlists, and enrollment issues.',
      duration: 8,
      priority: 'high',
      open: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'svc-career',
      name: 'Career & Internship Advising',
      description: 'Resume review, internship search, and career pathways.',
      duration: 20,
      priority: 'low',
      open: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'svc-financial',
      name: 'Financial Aid Advising',
      description: 'Scholarships, aid packages, and payment plan guidance.',
      duration: 15,
      priority: 'high',
      open: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function seedQueue(services) {
  const now = Date.now();
  const min = 60_000;
  return [
    { id: randomUUID(), serviceId: services[0].id, studentName: 'Maya Chen', priority: 'medium', joinedAt: now - 22 * min },
    { id: randomUUID(), serviceId: services[0].id, studentName: 'Liam Okafor', priority: 'high', joinedAt: now - 16 * min },
    { id: randomUUID(), serviceId: services[0].id, studentName: 'Sofia Rossi', priority: 'low', joinedAt: now - 9 * min },
    { id: randomUUID(), serviceId: services[1].id, studentName: 'Noah Kim', priority: 'high', joinedAt: now - 14 * min },
    { id: randomUUID(), serviceId: services[1].id, studentName: 'Ava Nguyen', priority: 'medium', joinedAt: now - 6 * min },
    { id: randomUUID(), serviceId: services[2].id, studentName: 'Ethan Brooks', priority: 'low', joinedAt: now - 4 * min },
  ];
}

const services = seedServices();
const queueEntries = seedQueue(services);

function resetStore() {
  services.length = 0;
  services.push(...seedServices());
  queueEntries.length = 0;
  queueEntries.push(...seedQueue(services));
}

module.exports = { services, queueEntries, resetStore };