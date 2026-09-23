// National Weather Service alerts for a forecast zone. No key; a User-Agent is required.
export const HEAT_EVENTS = ['Extreme Heat Warning', 'Excessive Heat Warning', 'Heat Advisory', 'Extreme Heat Watch', 'Excessive Heat Watch'];
export async function fetchNwsStatus(zone) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(`https://api.weather.gov/alerts/active?zone=${encodeURIComponent(zone)}`, { headers: { 'user-agent': 'calltree (saharsh7002@gmail.com)', accept: 'application/geo+json' }, signal: ctrl.signal });
    if (!r.ok) throw new Error(`NWS ${r.status}`);
    const data = await r.json();
    const active = (data.features || []).map((f) => ({ id: f.properties.id, event: f.properties.event, headline: f.properties.headline, severity: f.properties.severity, onset: f.properties.onset, ends: f.properties.ends || f.properties.expires, sender: f.properties.senderName }));
    const heat = active.filter((a) => HEAT_EVENTS.includes(a.event));
    return { zone, checkedAt: new Date().toISOString(), active, heat: heat.length > 0, heatAlerts: heat, source: 'api.weather.gov' };
  } finally { clearTimeout(t); }
}
