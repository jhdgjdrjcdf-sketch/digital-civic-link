import { useQuery } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const ACADEMY_BUCKET = "academy-media";

/** Private academy files are read through short-lived signed links. */
export function useAcademyFileUrl(path?: string | null) {
  const isExternal = Boolean(path && /^https?:\/\//.test(path));
  return useQuery({
    queryKey: ["signed-url", ACADEMY_BUCKET, path ?? "none"],
    enabled: Boolean(path) && !isExternal,
    staleTime: 45 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(ACADEMY_BUCKET)
        .createSignedUrl(path as string, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
    initialData: isExternal ? (path as string) : undefined,
  });
}

export function CourseCover({ path, title, className }: { path?: string | null; title: string; className?: string }) {
  const { data: url } = useAcademyFileUrl(path);
  return (
    <div className={cn("relative aspect-[16/9] overflow-hidden rounded-xl bg-primary", className)}>
      {url ? (
        <img src={url} alt={title} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary/70">
          <GraduationCap className="size-10 text-accent" />
        </div>
      )}
    </div>
  );
}

export async function uploadAcademyFile(courseId: string, folder: "covers" | "lessons" | "assignments", file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${folder}/${courseId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(ACADEMY_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}
