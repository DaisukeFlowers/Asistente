// Central Render API wrapper
import { requireApiKey } from './helpers.js';

const BASE = 'https://api.render.com/v1';

async function api(path, options = {}) {
  const key = requireApiKey();
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const body = await res.text().catch(()=> '');
    throw new Error(`Render API ${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function listServices() {
  const data = await api('/services');
  return data.map(item => item.service || item);
}

export async function triggerDeploy(serviceId) {
  return api(`/services/${serviceId}/deploys`, {
    method: 'POST',
    body: JSON.stringify({ clearCache: false })
  });
}

export async function getEnvVars(serviceId) {
  return api(`/services/${serviceId}/env-vars`);
}

export async function patchEnvVar(serviceId, envVarId, value) {
  return api(`/services/${serviceId}/env-vars/${envVarId}`, {
    method: 'PATCH',
    body: JSON.stringify({ value })
  });
}

export async function createEnvVars(serviceId, envVars) {
  return api(`/services/${serviceId}/env-vars`, {
    method: 'POST',
    body: JSON.stringify({ envVars })
  });
}
