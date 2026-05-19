import { createClient } from "jsr:@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "npm:jose";

export const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

export async function getSheetIdFromRequest(
  req: Request
): Promise<{ userId: string; sheetId: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization header");

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) throw new Error("Invalid user token");

  // Fetch sheet_url from user_metadata directly (PRD v8.0 compliance)
  const sheetUrl = user.user_metadata?.sheet_url;
  if (!sheetUrl) throw new Error("Sheet URL/ID not found in user metadata");

  let finalSheetId = sheetUrl;
  // Automatically extract ID if the user pasted the full URL
  if (finalSheetId.includes("docs.google.com/spreadsheets/d/")) {
    const match = finalSheetId.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      finalSheetId = match[1];
    }
  }

  return { sheetId: finalSheetId, userId: user.id };
}

export async function getGoogleAuthToken(): Promise<string> {
  const keyEnv = Deno.env.get("GOOGLE_SA_KEY");
  if (!keyEnv) throw new Error("GOOGLE_SA_KEY is not set");
  
  const saKey = JSON.parse(keyEnv);
  const privateKey = await importPKCS8(saKey.private_key, 'RS256');
  
  const jwt = await new SignJWT({
    iss: saKey.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: saKey.token_uri,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  const resp = await fetch(saKey.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    })
  });
  
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google Auth Error: ${resp.status} ${text}`);
  }
  
  const data = await resp.json();
  return data.access_token;
}
