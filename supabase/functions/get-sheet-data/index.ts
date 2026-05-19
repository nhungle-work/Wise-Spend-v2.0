import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSheetIdFromRequest, getGoogleAuthToken } from "../_shared.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { sheetName } = await req.json();
    const { sheetId } = await getSheetIdFromRequest(req);
    const token = await getGoogleAuthToken();

    const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A:Z`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!resp.ok) {
      throw new Error(`Sheets API Error: ${await resp.text()}`);
    }

    const data = await resp.json();

    return new Response(JSON.stringify(data.values ?? []), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(e.message, { status: 400, headers: corsHeaders });
  }
});
