const BASE = '/api';

async function handle(response) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error || 'Something went wrong. Please try again.');
    error.status = response.status;
    error.fieldErrors = data?.errors || null;
    throw error;
  }

  return data;
}

function request(path, options) {
  return fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }).then(handle);
}

export async function fetchServices() {
  const data = await request('/services');
  return data.services;
}

export async function createService(payload) {
  const data = await request('/services', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.service;
}

export async function updateService(id, payload) {
  const data = await request(`/services/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.service;
}

export async function fetchQueueSummary() {
  const data = await request('/queue');
  return data.summary;
}

export async function fetchQueue(serviceId) {
  return request(`/queue/${encodeURIComponent(serviceId)}`);
}

export async function serveNext(serviceId) {
  return request(`/queue/${encodeURIComponent(serviceId)}/serve`, {
    method: 'POST',
  });
}