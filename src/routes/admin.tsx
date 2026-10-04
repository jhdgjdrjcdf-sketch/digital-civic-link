import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { CourseCover, uploadAcademyFile } from "@/components/CourseCover";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { COURSE_CATEGORIES, COURSE_LEVELS } from "@/lib/academy";
import { type AppRole, friendlyError, useRoles } from "@/lib/auth";
import { NEWS_CATEGORIES_ADMIN } from "@/lib/admin-config";
import { uploadOfficeImage, useSignedUrl } from "@/lib/storage";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — تجمع الفاو زاخو" },
      { name: "description", content: "Manage news, events, offices, polls and academy courses." },
      { property: "og:title", content: "Administration — تجمع الفاو زاخو" },
      { property: "og:description", content: "Manage news, events, offices, polls and academy courses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type FieldType = "text" | "textarea" | "select" | "datetime" | "number" | "checkbox" | "lines" | "image";
type Field = { key: string; label: string; type: FieldType; options?: readonly { value: string; label: string }[]; required?: boolean };
type Section = {
  id: string;
  label: string;
  table: string;
  role: AppRole[];
  select: string;
  order: string;
  titleKey: string;
  statusKey?: string;
  fields: Field[];
  image?: "office" | "course";
  defaults?: Record<string, unknown>;
  beforeSave?: (v: Record<string, unknown>) => Record<string, unknown>;
};

const STATUS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;
const opt = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));

const SECTIONS: Section[] = [
  {
    id: "news", label: "صوت التجمع", table: "news_articles", role: ["news_editor", "content_admin"],
    select: "id, title, summary, body, category, source, status, published_at", order: "created_at", titleKey: "title", statusKey: "status",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "category", label: "Type", type: "select", options: NEWS_CATEGORIES_ADMIN },
      { key: "summary", label: "Summary", type: "textarea" },
      { key: "body", label: "Body", type: "textarea", required: true },
      { key: "source", label: "Source", type: "text" },
      { key: "status", label: "Status", type: "select", options: STATUS },
    ],
    defaults: { category: "news", status: "draft", source: "Party press office" },
    beforeSave: (v) => ({ ...v, published_at: v['status'] === "published" ? (v['published_at'] ?? new Date().toISOString()) : v['published_at'] ?? null }),
  },
  {
    id: "events", label: "Events", table: "events", role: ["event_manager", "content_admin"],
    select: "id, title, description, starts_at, ends_at, location, category, status", order: "starts_at", titleKey: "title", statusKey: "status",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "starts_at", label: "Starts", type: "datetime", required: true },
      { key: "ends_at", label: "Ends", type: "datetime" },
      { key: "location", label: "Location", type: "text", required: true },
      { key: "category", label: "Category", type: "text" },
      { key: "status", label: "Status", type: "select", options: opt(["scheduled", "cancelled", "archived"]) },
    ],
    defaults: { status: "scheduled", category: "Meeting", timezone: "Asia/Baghdad" },
  },
  {
    id: "offices", label: "مكاتب التجمع والمرشحين", table: "offices", role: ["content_admin"], image: "office",
    select: "id, name, candidate_name, description, address, city, phone, latitude, longitude, category, is_active, image_url", order: "name", titleKey: "name",
    fields: [
      { key: "image_url", label: "Photo", type: "image" },
      { key: "name", label: "Office name", type: "text", required: true },
      { key: "candidate_name", label: "Candidate", type: "text" },
      { key: "category", label: "Category", type: "select", options: [{ value: "office", label: "Office" }, { value: "candidate", label: "Candidate" }] },
      { key: "description", label: "Description", type: "textarea" },
      { key: "address", label: "Address", type: "text", required: true },
      { key: "city", label: "City", type: "text", required: true },
      { key: "phone", label: "Phone", type: "text" },
      { key: "latitude", label: "Latitude", type: "number", required: true },
      { key: "longitude", label: "Longitude", type: "number", required: true },
      { key: "is_active", label: "Visible to public", type: "checkbox" },
    ],
    defaults: { is_active: true, category: "office", candidate_name: "", description: "" },
  },
  {
    id: "courses", label: "أكاديمية القيادة", table: "courses", role: ["academy_manager"], image: "course",
    select: "id, title, description, cover_url, level, status, category, instructor_name, instructor_title, instructor_bio, duration_minutes, outcomes, requirements, require_all_lessons, require_all_quizzes, require_all_assignments",
    order: "created_at", titleKey: "title", statusKey: "status",
    fields: [
      { key: "cover_url", label: "Cover image", type: "image" },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", required: true },
      { key: "category", label: "Category", type: "select", options: COURSE_CATEGORIES },
      { key: "level", label: "Level", type: "select", options: opt(COURSE_LEVELS) },
      { key: "duration_minutes", label: "Duration (minutes)", type: "number" },
      { key: "instructor_name", label: "Instructor", type: "text" },
      { key: "instructor_title", label: "Instructor title", type: "text" },
      { key: "instructor_bio", label: "Instructor bio", type: "textarea" },
      { key: "outcomes", label: "What you'll learn (one per line)", type: "lines" },
      { key: "requirements", label: "Requirements (one per line)", type: "lines" },
      { key: "require_all_lessons", label: "Require all lessons", type: "checkbox" },
      { key: "require_all_quizzes", label: "Require all quizzes", type: "checkbox" },
      { key: "require_all_assignments", label: "Require all assignments", type: "checkbox" },
      { key: "status", label: "Status", type: "select", options: STATUS },
    ],
    defaults: { status: "draft", level: "Foundation", category: "leadership", duration_minutes: 60, outcomes: [], requirements: [], require_all_lessons: true, require_all_quizzes: true, require_all_assignments: true },
  },
  {
    id: "polls", label: "Polls", table: "polls", role: ["content_admin"],
    select: "id, question, description, starts_at, ends_at, status, results_public", order: "created_at", titleKey: "question", statusKey: "status",
    fields: [
      { key: "question", label: "Question", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "starts_at", label: "Opens", type: "datetime", required: true },
      { key: "ends_at", label: "Closes", type: "datetime", required: true },
      { key: "results_public", label: "Show results publicly", type: "checkbox" },
      { key: "status", label: "Status", type: "select", options: STATUS },
      { key: "__options", label: "Options (one per line, new polls only)", type: "lines" },
    ],
    defaults: { status: "draft", results_public: true, description: "" },
  },
];

function AdminPage() {
  const { can, isPending, isSignedIn, isStaff } = useRoles();
  const allowed = SECTIONS.filter((s) => s.role.some((r) => can(r)));
  const [active, setActive] = useState<string | null>(null);
  const section = allowed.find((s) => s.id === active) ?? allowed[0];

  return (
    <AppShell title="Administration">
      {isPending ? (
        <LoadingList rows={3} />
      ) : !isSignedIn ? (
        <EmptyState title="Sign in required" description="Sign in with a staff account." action={<Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>} />
      ) : !isStaff || !allowed.length ? (
        <EmptyState title="No access" description="Your account has no administration role. Ask a super administrator." />
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allowed.map((s) => (
              <Button key={s.id} size="sm" variant={s.id === section.id ? "default" : "outline"} onClick={() => setActive(s.id)} className="shrink-0">


                {s.label}
              </Button>
            ))}
          </div>
          <SectionManager key={section.id} section={section} />
        </div>
      )}
    </AppShell>
  );
}

type Row = Record<string, unknown> & { id: string };

function SectionManager({ section }: { section: Section }) {
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const query = useQuery({
    queryKey: ["admin", section.table],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from(section.table as "news_articles")
        .select(section.select)
        .order(section.order, { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });
  if (editing) return <RowForm section={section} row={editing === "new" ? null : editing} onDone={() => setEditing(null)} />;
  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={() => setEditing("new")}><Plus className="size-4" /> Add new</Button>
      {query.isPending ? (
        <LoadingList rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data.length ? (
        <EmptyState title="Nothing here yet" description="Add the first item." />
      ) : (
        <ul className="card-soft divide-y divide-border">
          {query.data.map((row) => (
            <li key={row.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{String(row[section.titleKey] ?? "")}</p>
                {section.statusKey ? <Badge variant="secondary" className="mt-1">{String(row[section.statusKey])}</Badge> : null}
                {section.id === "offices" ? <Badge variant="secondary" className="mt-1">{row['is_active'] ? "Visible" : "Hidden"}</Badge> : null}
              </div>
              <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(row)}><Pencil className="size-4" /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const toLocal = (v: unknown) => (v ? new Date(String(v)).toISOString().slice(0, 16) : "");
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function RowForm({ section, row, onDone }: { section: Section; row: Row | null; onDone: () => void }) {
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
        if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB.");
        const key = section.image === "course" ? "cover_url" : "image_url";
        const path = section.image === "course" ? await uploadAcademyFile(id, "covers", file) : await uploadOfficeImage(file);
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

  return (
    <form className="card-soft space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <h2 className="font-bold">{row ? "Edit" : "New"} — {section.label}</h2>
      {section.fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label>{f.label}{f.required ? " *" : ""}</Label>
          {f.type === "text" ? (
            <Input value={String(values[f.key] ?? "")} maxLength={300} onChange={(e) => set(f.key, e.target.value)} />
          ) : f.type === "textarea" ? (
            <Textarea value={String(values[f.key] ?? "")} maxLength={20000} onChange={(e) => set(f.key, e.target.value)} />
          ) : f.type === "number" ? (
            <Input type="number" step="any" value={String(values[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
          ) : f.type === "datetime" ? (
            <Input type="datetime-local" value={toLocal(values[f.key])} onChange={(e) => set(f.key, e.target.value)} />
          ) : f.type === "checkbox" ? (
            <input type="checkbox" className="size-5" checked={Boolean(values[f.key])} onChange={(e) => set(f.key, e.target.checked)} />
          ) : f.type === "lines" ? (
            <Textarea value={((values[f.key] as string[]) ?? []).join("\n")} onChange={(e) => set(f.key, e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} />
          ) : f.type === "select" ? (
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={String(values[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)}>
              {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <ImageField kind={section.image!} path={values[f.key] as string | null} title={String(values[section.titleKey] ?? "")} file={file} onFile={setFile} onRemove={() => { setFile(null); set(f.key, null); }} />
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onDone}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}

function ImageField({ kind, path, title, file, onFile, onRemove }: { kind: "office" | "course"; path: string | null; title: string; file: File | null; onFile: (f: File | null) => void; onRemove: () => void }) {
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
        <div className="flex aspect-video items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">No photo</div>
      )}
      <div className="flex gap-2">
        <Input type="file" accept={IMAGE_TYPES.join(",")} onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (f && (!IMAGE_TYPES.includes(f.type) || f.size > 5 * 1024 * 1024)) { toast.error("Use a JPG, PNG or WebP under 5 MB."); e.target.value = ""; return; }
          onFile(f);
        }} />
        {path || file ? <Button type="button" variant="outline" onClick={onRemove}>Remove</Button> : null}
      </div>
    </div>
  );
}
