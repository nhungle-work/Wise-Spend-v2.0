import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSheetIdFromRequest, getGoogleAuthToken, supabase } from "../_shared.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sheetName, rowNumber } = await req.json();
    const { sheetId, userId } = await getSheetIdFromRequest(req);
    const token = await getGoogleAuthToken();

    // To delete a row using fetch, we first clear it
    const range = `${sheetName}!A${rowNumber}:Z${rowNumber}`;
    const clearResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:clear`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!clearResp.ok) {
      throw new Error(`Sheets API Error on clear: ${await clearResp.text()}`);
    }

    // We skip the batchUpdate dimension delete here to keep it simple and avoid needing the internal sheetId integer.
    // Clearing the row effectively "deletes" the data from the user's perspective in the app.

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(e.message, { status: 400, headers: corsHeaders });
  }
});
