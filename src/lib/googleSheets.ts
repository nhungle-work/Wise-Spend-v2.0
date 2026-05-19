import { supabase } from "./supabase";

async function callFn(fn: string, payload: any) {
  // Lấy session hiện tại từ Supabase Auth
  const { data: { session }, error: sessErr } = await supabase.auth.getSession();
  
  if (sessErr) throw sessErr;
  if (!session) {
    console.warn("Không có session! Hãy đảm bảo bạn đã đăng nhập.");
    // Tạm thời cho phép chạy (mock) nếu chưa kết nối backend thực
    // throw new Error("No active session");
  }

  // Gọi Edge Function của Supabase
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: session ? `Bearer ${session.access_token}` : "",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Function ${fn} error: ${txt}`);
  }
  return res.json();
}

// Các hàm dùng trong UI để tương tác với Google Sheets
export const getSheetRows = (sheetName: string) => callFn("get-sheet-data", { sheetName });

export const appendRow = (sheetName: string, row: string[]) =>
  callFn("append-sheet-row", { sheetName, row });

export const updateRow = (sheetName: string, rowNumber: number, row: string[]) =>
  callFn("update-sheet-row", { sheetName, rowNumber, row });

export const deleteRow = (sheetName: string, rowNumber: number) =>
  callFn("delete-sheet-row", { sheetName, rowNumber });
