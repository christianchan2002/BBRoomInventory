const WEB_APP_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

function ensureConfigured() {
  if (!WEB_APP_URL) {
    throw new Error('Missing VITE_APPS_SCRIPT_URL');
  }
}

async function parseJsonResponse(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Backend returned invalid JSON');
  }
}

async function requestGet(action, params = {}) {
  ensureConfigured();

  const url = new URL(WEB_APP_URL);
  url.searchParams.set('action', action);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), { method: 'GET' });
  const json = await parseJsonResponse(response);

  if (!json.ok) {
    throw new Error(json.error || `Request failed: ${action}`);
  }

  return json.data;
}

async function requestPost(action, payload = {}) {
  ensureConfigured();

  // Send as plain text to avoid CORS preflight complexity with Apps Script.
  const response = await fetch(WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify({ action, payload }),
  });

  const json = await parseJsonResponse(response);

  if (!json.ok) {
    throw new Error(json.error || `Request failed: ${action}`);
  }

  return json.data;
}

function toUiInventoryItem(item) {
  if (!item) return null;

  return {
    barcode: item.id,
    itemName: item.item,
    category: item.category,
    location: item.location,
    currentQty: Number(item.currentQty || 0),
  };
}

function toUiTransactionRow(row) {
  return {
    user: row.user,
    type: row.mode,
    qty: Number(row.qty || 0),
    destination: row.destination,
  };
}

export function isBackendConfigured() {
  return Boolean(WEB_APP_URL);
}

export async function getUsers() {
  return requestGet('getUsers');
}

export async function getLocations() {
  return requestGet('getLocations');
}

export async function fetchItemById(id) {
  const item = await requestGet('getItemById', { id });
  return toUiInventoryItem(item);
}

export async function getInventoryItemById(id) {
  return fetchItemById(id);
}

export async function getStockCheckById(id) {
  const data = await requestGet('getStockCheckById', { id });

  return {
    ...toUiInventoryItem(data.item),
    recentMovements: (data.recentTransactions || []).map(toUiTransactionRow),
  };
}

export async function submitSession(payload) {
  return requestPost('submitSession', payload);
}
