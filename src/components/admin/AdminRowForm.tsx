import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { uploadAcademyFile } from "@/components/CourseCover";
import { AdminImageField, IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/components/admin/AdminImageField";
import { AdminOfficeSelect } from "@/components/admin/AdminOfficeSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Field, Row, Section } from "@/lib/admin-sections";
import { friendlyError } from "@/lib/auth";
import { uploadOfficeImage } from "@/lib/storage";
import { cn } from "@/lib/utils";

const toLocal = (v: unknown) => (v ? new Date(String(v)).toISOString().slice(0, 16) : "");
const WIDE_TYPES = new Set(["textarea", "lines", "image"]);

export function AdminRowForm({ section, row, onDone }: { section: Section; row: Row | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...section.defaults, ...(row ?? {}) }));
  const [file, setFile] = useState<File | null>(null);
  const set = (k: string, v: unknown) => setValues((p) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      for (const f of section.fields) {
        const v = values[f.key];
        if (f.required && (v === undefined || v === null || String(v).trim() === "")) throw new Error(`${f.label} is required.`);
      }
      let payload: Record<string, unknown> = { ...values };
      const options = (payload['__options'] as string[] | undefined) ?? [];
      delete payload['__options'];
      delete payload['id'];
      for (const f of section.fields) {
        if (f.type === "datetime") payload[f.key] = payload[f.key] ? new Date(String(payload[f.key])).toISOString() : null;
        if (f.type === "number" && payload[f.key] !== undefined && payload[f.key] !== "") payload[f.key] = Number(payload[f.key]);
        if (f.type === "text" || f.type === "textarea") payload[f.key] = String(payload[f.key] ?? "").trim();
      }
      if (section.id === "polls" && !row && options.length < 2) throw new Error("Add at least two options.");
      if (section.beforeSave) payload = section.beforeSave(payload);
      const table = supabase.from(section.table as "news_articles");
      let id = row?.id;
      if (row) {
        const { error } = await table.update(payload as never).eq("id", row.id);
        if (error) throw error;
      } else {
        const { data, error } = await table.insert(payload as never).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      if (file && id) {
        if (!IMAGE_TYPES.includes(file.type)) throw new Error("Use a JPG, PNG or WebP image.");
        if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be under 5 MB.");
        const key = section.fields.find((f) => f.type === "image")!.key;
        const path =
          section.image === "course"
            ? await uploadAcademyFile(id, "covers", file)
            : await uploadOfficeImage(file, section.id === "candidates" ? "candidates" : "offices");
        const { error } = await supabase.from(section.table as "news_articles").update({ [key]: path } as never).eq("id", id);
        if (error) throw error;
      }
      if (section.id === "polls" && !row && id) {
        const { error } = await supabase.from("poll_options").insert(options.map((label, position) => ({ poll_id: id!, label, position })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved.");
      qc.invalidateQueries();
      onDone();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const renderControl = (f: Field, inputId: string) => {
    switch (f.type) {
      case "text":
        return <Input id={inputId} value={String(values[f.key] ?? "")} maxLength={300} onChange={(e) => set(f.key, e.target.value)} />;
      case "textarea":
        return <Textarea id={inputId} value={String(values[f.key] ?? "")} maxLength={20000} onChange={(e) => set(f.key, e.target.value)} />;
      case "number":
        return <Input id={inputId} type="number" step="any" value={String(values[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />;
      case "datetime":
        return <Input id={inputId} type="datetime-local" value={toLocal(values[f.key])} onChange={(e) => set(f.key, e.target.value)} />;
      case "checkbox":
        return null;
      case "lines":
        return (
          <Textarea
            id={inputId}
            value={((values[f.key] as string[]) ?? []).join("\n")}
            onChange={(e) => set(f.key, e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
          />
        );
      case "office":
        return <AdminOfficeSelect id={inputId} value={String(values[f.key] ?? "")} onChange={(v) => set(f.key, v)} />;
      case "select":
        return (
          <select
            id={inputId}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={String(values[f.key] ?? "")}
            onChange={(e) => set(f.key, e.target.value)}
          >
            {f.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      default:
        return (
          <AdminImageField
            id={inputId}
            kind={section.image!}
            path={values[f.key] as string | null}
            title={String(values[section.titleKey] ?? "")}
            file={file}
            onFile={setFile}
            onRemove={() => {
              setFile(null);
              set(f.key, null);
            }}
          />
        );
    }
  };

  return (
    <form
      className="card-soft animate-in fade-in-0 slide-in-from-bottom-2 space-y-5 p-4 duration-300 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            {row ? "Edit record" : "New record"}
          </p>
          <h2 className="text-arabic mt-1 text-lg font-bold">{section.label}</h2>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          <ArrowRight className="size-4" /> Back
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {section.fields.map((f) => {
          const inputId = `admin-${section.id}-${f.key}`;
          if (f.type === "checkbox") {
            return (
              <label
                key={f.key}
                htmlFor={inputId}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  className="size-5 accent-primary"
                  checked={Boolean(values[f.key])}
                  onChange={(e) => set(f.key, e.target.checked)}
                />
                <span className="font-medium">{f.label}</span>
              </label>
            );
          }
          return (
            <div key={f.key} className={cn("space-y-1.5", WIDE_TYPES.has(f.type) && "sm:col-span-2")}>
              <Label htmlFor={inputId}>
                {f.label}
                {f.required ? <span className="text-destructive"> *</span> : null}
              </Label>
              {renderControl(f, inputId)}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-20 flex gap-2 rounded-xl border border-border bg-card/95 p-2 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="button" variant="outline" className="flex-1" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
