import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export function AdminOfficeSelect({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) {
  const q = useQuery({
    queryKey: ["admin", "office-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("offices").select("id, name, governorate").order("governorate");
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <select
      id={id}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{q.isPending ? "Loading offices…" : q.isError ? "Offices didn't load" : "Select an office…"}</option>
      {q.data?.map((o) => (
        <option key={o.id} value={o.id}>
          {o.governorate || "—"} · {o.name}
        </option>
      ))}
    </select>
  );
}
