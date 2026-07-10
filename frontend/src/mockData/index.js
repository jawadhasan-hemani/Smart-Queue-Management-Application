export const mockServices = [
  {
    id: "svc-general",
    name: "General Academic Advising",
    description: "Course planning, degree requirements, and general questions.",
    duration: 12,
    priority: "medium",
    open: true,
  },
  {
    id: "svc-registration",
    name: "Registration & Enrollment",
    description: "Add/drop help, holds, waitlists, and enrollment issues.",
    duration: 8,
    priority: "high",
    open: true,
  },
  {
    id: "svc-career",
    name: "Career & Internship Advising",
    description: "Resume review, internship search, and career pathways.",
    duration: 20,
    priority: "low",
    open: true,
  },
  {
    id: "svc-financial",
    name: "Financial Aid Advising",
    description: "Scholarships, aid packages, and payment plan guidance.",
    duration: 15,
    priority: "high",
    open: false,
  },
]

const now = Date.now()
const min = 60_000

export const mockQueues = [
  { id: "q1", serviceId: "svc-general", studentName: "Maya Chen", joinedAt: now - 22 * min, priority: "medium" },
  { id: "q2", serviceId: "svc-general", studentName: "Liam Okafor", joinedAt: now - 16 * min, priority: "high" },
  { id: "q3", serviceId: "svc-general", studentName: "Sofia Rossi", joinedAt: now - 9 * min, priority: "low" },
  { id: "q4", serviceId: "svc-registration", studentName: "Noah Kim", joinedAt: now - 14 * min, priority: "high" },
  { id: "q5", serviceId: "svc-registration", studentName: "Ava Nguyen", joinedAt: now - 6 * min, priority: "medium" },
  { id: "q6", serviceId: "svc-career", studentName: "Ethan Brooks", joinedAt: now - 4 * min, priority: "low" },
]

export const mockHistory = [
  { id: "h1", serviceName: "Registration & Enrollment", date: "May 28, 2026", outcome: "Served", waitMinutes: 11 },
  { id: "h2", serviceName: "General Academic Advising", date: "May 14, 2026", outcome: "Served", waitMinutes: 24 },
  { id: "h3", serviceName: "Career & Internship Advising", date: "Apr 30, 2026", outcome: "Left queue", waitMinutes: 38 },
  { id: "h4", serviceName: "Financial Aid Advising", date: "Apr 12, 2026", outcome: "No-show", waitMinutes: 0 },
]

export const mockNotifications = [
  {
    id: "n1",
    title: "Welcome to QueueSmart",
    body: "Join a queue to see your live position and estimated wait time.",
    createdAt: Date.now() - 3_600_000,
    read: false,
    tone: "info",
  },
]
