const PRIORITIES = ['low', 'medium', 'high'];
const NAME_MAX_LENGTH = 100;

function validateServiceInput(body) {
  const errors = {};
  const input = body && typeof body === 'object' ? body : {};

  if (typeof input.name !== 'string' || !input.name.trim()) {
    errors.name = 'Service name is required.';
  } else if (input.name.trim().length > NAME_MAX_LENGTH) {
    errors.name = `Service name must be ${NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (typeof input.description !== 'string' || !input.description.trim()) {
    errors.description = 'Description is required.';
  }

  if (input.duration === undefined || input.duration === null || input.duration === '') {
    errors.duration = 'Expected duration (minutes) is required.';
  } else {
    const duration = Number(input.duration);
    if (Number.isNaN(duration) || !Number.isFinite(duration) || duration <= 0) {
      errors.duration = 'Expected duration must be a positive number of minutes.';
    } else if (!Number.isInteger(duration)) {
      errors.duration = 'Expected duration must be a whole number of minutes.';
    }
  }

  if (!PRIORITIES.includes(input.priority)) {
    errors.priority = `Priority must be one of: ${PRIORITIES.join(', ')}.`;
  }

  if (input.open !== undefined && typeof input.open !== 'boolean') {
    errors.open = 'Open must be true or false.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateServiceInput, PRIORITIES, NAME_MAX_LENGTH };