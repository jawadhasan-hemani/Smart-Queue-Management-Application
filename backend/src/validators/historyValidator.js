const NAME_MAX_LENGTH = 100;

function validateHistoryQuery(query) {
  const errors = {};
  const input = query && typeof query === 'object' ? query : {};

  if (input.studentName !== undefined) {
    if (typeof input.studentName !== 'string' || !input.studentName.trim()) {
      errors.studentName = 'studentName filter cannot be blank.';
    } else if (input.studentName.trim().length > NAME_MAX_LENGTH) {
      errors.studentName = `studentName filter must be ${NAME_MAX_LENGTH} characters or fewer.`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateHistoryQuery, NAME_MAX_LENGTH };
