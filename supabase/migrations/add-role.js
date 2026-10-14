// add-role.js
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE; // احفظه مؤقتاً كـ env
const userId = process.env.TARGET_USER_ID; // ضع هنا UUID للمستخدم

if (!url || !key || !userId) throw new Error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE, TARGET_USER_ID");

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from("user_roles")
    .insert([{ user_id: userId, role: "super_admin" }]);

  if (error) console.error("Error:", error);
  else console.log("Inserted:", data);
}
run();