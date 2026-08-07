const TYPES = ['joined', 'near_turn', 'served', 'left', 'custom'];
const NAME_MAX_LENGTH = 100;
const MESSAGE_MAX_LENGTH = 300;

function validateNotificationInput(body) {
  const errors = {};
  const input = body && typeof body === 'object' ? body : {};

  if (typeof input.studentName !== 'string' || !input.studentName.trim()) {
    errors.studentName = 'Student name is required.';
  } else if (input.studentName.trim().length > NAME_MAX_LENGTH) {
    errors.studentName = `Student name must be ${NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (typeof input.serviceId !== 'string' || !input.serviceId.trim()) {
    errors.serviceId = 'Service id is required.';
  }

  if (typeof input.type !== 'string' || !TYPES.includes(input.type)) {
    errors.type = `Type must be one of: ${TYPES.join(', ')}.`;
  }

  if (typeof input.message !== 'string' || !input.message.trim()) {
    errors.message = 'Message is required.';
  } else if (input.message.trim().length > MESSAGE_MAX_LENGTH) {
    errors.message = `Message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function validateNotificationQuery(query) {
  const errors = {};
  const input = query && typeof query === 'object' ? query : {};

  if (input.studentName !== undefined && (typeof input.studentName !== 'string' || !input.studentName.trim())) {
    errors.studentName = 'studentName filter cannot be blank.';
  }

  if (input.search !== undefined && (typeof input.search !== 'string' || !input.search.trim())) {
    errors.search = 'search filter cannot be blank.';
  }

  if (input.type !== undefined && !TYPES.includes(input.type)) {
    errors.type = `Type must be one of: ${TYPES.join(', ')}.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = {
  validateNotificationInput,
  validateNotificationQuery,
  TYPES,
  NAME_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
};
