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
    const { sheetName, row } = await req.json();
    const { sheetId, userId } = await getSheetIdFromRequest(req);
    const token = await getGoogleAuthToken();

    const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A:Z:append?valueInputOption=RAW`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ values: [row] })
    });

    if (!resp.ok) {
      throw new Error(`Sheets API Error: ${await resp.text()}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(e.message, { status: 400, headers: corsHeaders });
  }
});
