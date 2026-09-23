export const json = (statusCode, body, headers = {}) => ({ statusCode, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers }, body: JSON.stringify(body) });
export const parseBody = (event) => {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  const ct = (event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase();
  if (ct.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(raw));
  try { return JSON.parse(raw); } catch { return {}; }
};
export const route = (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  let path = event.rawPath || event.path || '/';
  const stage = event.requestContext?.stage;
  if (stage && stage !== '$default' && path.startsWith(`/${stage}`)) path = path.slice(stage.length + 1) || '/';
  return { method, path: path.replace(/\/+$/, '') || '/', query: event.queryStringParameters || {} };
};
