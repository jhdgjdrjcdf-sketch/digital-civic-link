import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const OFFICE_BUCKET = "office-images";

/** Office photos live in a private bucket; reads go through short-lived signed links. */
export function useSignedUrl(path?: string | null) {
  return useQuery({
    queryKey: ["signed-url", OFFICE_BUCKET, path ?? "none"],
    enabled: Boolean(path),
    staleTime: 45 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(OFFICE_BUCKET)
        .createSignedUrl(path as string, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export async function uploadOfficeImage(file: File, folder = "offices") {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "offices";
  const path = `${safeFolder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(OFFICE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return path;
}
