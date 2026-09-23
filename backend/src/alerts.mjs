// Every 15 minutes: read the NWS zone. A new heat warning starts a campaign on its own.
import * as db from './lib/db.mjs';
import { fetchNwsStatus } from './lib/nws.mjs';
import { createDrill } from './api.mjs';

export const handler = async () => {
  const zone = process.env.NWS_ZONE || 'AZZ544';
  const status = await fetchNwsStatus(zone);
  await db.put({ PK: 'ALERTS', SK: 'STATUS', ...status });
  const started = [];
  for (const a of status.heatAlerts || []) {
    const seen = await db.get('ALERTS', a.id);
    if (seen) continue;
    await db.put({ PK: 'ALERTS', SK: a.id, ...a, seenAt: new Date().toISOString() });
    if (process.env.AUTO_DRILL_ON_ALERT !== '0') {
      const drill = await createDrill({ trigger: 'nws', mode: 'simulate', alert: a });
      await db.update('ALERTS', a.id, { drillId: drill.id });
      started.push(drill.id);
    }
  }
  return { zone, heat: status.heat, active: status.active.length, started };
};
