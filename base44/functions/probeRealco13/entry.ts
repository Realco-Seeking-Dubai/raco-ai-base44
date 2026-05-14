import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient as createBase44Client } from 'npm:@base44/sdk@0.8.25';

const SOURCE_APP_ID  = '69e051cc8adf39a6a0c03c3d';
const SOURCE_API_KEY = '9dfd31e2ccb94d2a9bbd0378b4a6d5ce';

Deno.serve(async (req) => {
  try {
    const callerClient = createClientFromRequest(req);
    const user = await callerClient.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const sourceClient = createBase44Client({
      appId: SOURCE_APP_ID,
      headers: { api_key: SOURCE_API_KEY },
    });

    const body = await req.json().catch(() => ({}));
    const entityName = body.entity || null;
    const listLimit  = body.limit || 3;

    if (entityName) {
      // Fetch sample records from the specified entity
      const records = await sourceClient.entities[entityName].list('-created_date', listLimit);
      return Response.json({ entity: entityName, count: records.length, sample: records });
    }

    // No entity specified — try to list known likely entity names
    const CANDIDATES = [
      'PocketListing', 'PocketInventory', 'Property', 'Listing',
      'InventoryItem', 'Unit', 'Inventory', 'Lead', 'Contact',
      'pocketlisting', 'pocket_listing', 'properties', 'listings',
    ];

    const results = {};
    for (const name of CANDIDATES) {
      try {
        const r = await sourceClient.entities[name].list('-created_date', 1);
        results[name] = { status: 'ok', count: r.length, sample_keys: r.length > 0 ? Object.keys(r[0]) : [] };
      } catch (e) {
        results[name] = { status: 'error', message: e.message };
      }
    }

    return Response.json({ probe_results: results });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});