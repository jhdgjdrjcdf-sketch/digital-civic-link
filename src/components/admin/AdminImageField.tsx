import { toast } from "sonner";

import { CourseCover } from "@/components/CourseCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSignedUrl } from "@/lib/storage";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function AdminImageField({
  id,
  kind,
  path,
  title,
  file,
  onFile,
  onRemove,
}: {
  id?: string;
  kind: "office" | "course";
  path: string | null;
  title: string;
  file: File | null;
  onFile: (f: File | null) => void;
  onRemove: () => void;
}) {
  const preview = file ? URL.createObjectURL(file) : null;
  const office = useSignedUrl(kind === "office" && !file ? path : null);
  return (
    <div className="space-y-2">
      {preview ? (
        <img src={preview} alt="Preview" className="aspect-video w-full rounded-xl object-cover" />
      ) : kind === "course" ? (
        <CourseCover path={path} title={title} />
      ) : office.data ? (
        <img src={office.data} alt={title} className="aspect-video w-full rounded-xl object-cover" />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border bg-muted text-xs text-muted-foreground">
          No photo
        </div>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && (!IMAGE_TYPES.includes(f.type) || f.size > MAX_IMAGE_BYTES)) {
              toast.error("Use a JPG, PNG or WebP under 5 MB.");
              e.target.value = "";
              return;
            }
            onFile(f);
          }}
        />
        {path || file ? (
          <Button type="button" variant="outline" onClick={onRemove}>
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
