const PRIORITIES = ['low', 'medium', 'high'];
const NAME_MAX_LENGTH = 100;

function validateJoinInput(body) {
  const errors = {};
  const input = body && typeof body === 'object' ? body : {};

  if (typeof input.studentName !== 'string' || !input.studentName.trim()) {
    errors.studentName = 'Student name is required.';
  } else if (input.studentName.trim().length > NAME_MAX_LENGTH) {
    errors.studentName = `Student name must be ${NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (input.priority !== undefined && !PRIORITIES.includes(input.priority)) {
    errors.priority = `Priority must be one of: ${PRIORITIES.join(', ')}.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateJoinInput, PRIORITIES, NAME_MAX_LENGTH };