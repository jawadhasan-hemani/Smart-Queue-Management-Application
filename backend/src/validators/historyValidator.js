const NAME_MAX_LENGTH = 100;
const SORT_OPTIONS = ['date-asc', 'date-desc', 'wait-desc'];
const STATUS_OPTIONS = ['served', 'left'];

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

  if (input.search !== undefined && (typeof input.search !== 'string' || !input.search.trim())) {
    errors.search = 'search filter cannot be blank.';
  }

  if (input.serviceId !== undefined && (typeof input.serviceId !== 'string' || !input.serviceId.trim())) {
    errors.serviceId = 'serviceId filter cannot be blank.';
  }

  if (input.status !== undefined && !STATUS_OPTIONS.includes(input.status)) {
    errors.status = `status must be one of: ${STATUS_OPTIONS.join(', ')}.`;
  }

  if (input.sortBy !== undefined && !SORT_OPTIONS.includes(input.sortBy)) {
    errors.sortBy = `sortBy must be one of: ${SORT_OPTIONS.join(', ')}.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateHistoryQuery, NAME_MAX_LENGTH, SORT_OPTIONS };
