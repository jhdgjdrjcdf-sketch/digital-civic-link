import {
  BarChart3,
  CalendarDays,
  GraduationCap,
  MapPin,
  Newspaper,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { COURSE_CATEGORIES, COURSE_LEVELS } from "@/lib/academy";
import type { AppRole } from "@/lib/auth";
import { NEWS_CATEGORIES_ADMIN } from "@/lib/admin-config";
import { IRAQ_GOVERNORATES } from "@/lib/governorates";

export type FieldType =
  | "office"
  | "text"
  | "textarea"
  | "select"
  | "datetime"
  | "number"
  | "checkbox"
  | "lines"
  | "image";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  options?: readonly { value: string; label: string }[];
  required?: boolean;
};

export type AdminGroupId = "content" | "organization" | "academy" | "participation";

export type Section = {
  id: string;
  label: string;
  /** Short English descriptor shown under the Arabic label in navigation. */
  sub: string;
  group: AdminGroupId;
  icon: LucideIcon;
  table: string;
  role: AppRole[];
  select: string;
  order: string;
  titleKey: string;
  statusKey?: string;
  /** Boolean column that controls public visibility (display only). */
  visibilityKey?: string;
  /** Extra text columns included in the in-section search. */
  searchKeys?: string[];
  /** Show an accessible-records count on the overview. */
  kpi?: boolean;
  fields: Field[];
  image?: "office" | "course";
  defaults?: Record<string, unknown>;
  beforeSave?: (v: Record<string, unknown>) => Record<string, unknown>;
};

export const ADMIN_GROUPS: { id: AdminGroupId; label: string; sub: string }[] = [
  { id: "content", label: "المحتوى", sub: "Content" },
  { id: "organization", label: "التنظيم", sub: "Organization" },
  { id: "academy", label: "الأكاديمية", sub: "Academy" },
  { id: "participation", label: "المشاركة", sub: "Participation" },
];

const STATUS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;
const opt = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));

export const ADMIN_SECTIONS: Section[] = [
  {
    id: "news", label: "صوت التجمع", sub: "News & statements", group: "content", icon: Newspaper, kpi: true,
    table: "news_articles", role: ["news_editor", "content_admin"],
    select: "id, title, summary, body, category, source, status, published_at", order: "created_at", titleKey: "title", statusKey: "status",
    searchKeys: ["summary", "category", "source"],
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
    id: "events", label: "Events", sub: "Events & timeline", group: "content", icon: CalendarDays, kpi: true,
    table: "events", role: ["event_manager", "content_admin"],
    select: "id, title, description, starts_at, ends_at, location, category, status", order: "starts_at", titleKey: "title", statusKey: "status",
    searchKeys: ["location", "category"],
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
    id: "offices", label: "مكاتب التجمع والمرشحين", sub: "Offices", group: "organization", icon: MapPin, kpi: true,
    table: "offices", role: ["content_admin"], image: "office", visibilityKey: "is_active",
    select: "id, name, candidate_name, description, address, city, district, governorate, phone, email, whatsapp, working_hours, services, latitude, longitude, category, is_active, image_url", order: "name", titleKey: "name",
    searchKeys: ["governorate", "city", "district", "address", "candidate_name"],
    fields: [
      { key: "image_url", label: "Photo", type: "image" },
      { key: "name", label: "Office name", type: "text", required: true },
      { key: "candidate_name", label: "Candidate", type: "text" },
      { key: "category", label: "Category", type: "select", options: [{ value: "office", label: "Office" }, { value: "candidate", label: "Candidate" }] },
      { key: "description", label: "Description", type: "textarea" },
      { key: "address", label: "Address", type: "text", required: true },
      { key: "city", label: "City", type: "text", required: true },
      { key: "district", label: "District", type: "text" },
      { key: "governorate", label: "Governorate", type: "select", options: IRAQ_GOVERNORATES, required: true },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "whatsapp", label: "WhatsApp", type: "text" },
      { key: "working_hours", label: "Working hours (e.g. Sat–Thu, 9:00–15:00)", type: "text" },
      { key: "services", label: "Available services (one per line)", type: "lines" },
      { key: "latitude", label: "Latitude", type: "number", required: true },
      { key: "longitude", label: "Longitude", type: "number", required: true },
      { key: "is_active", label: "Visible to public", type: "checkbox" },
    ],
    defaults: { is_active: true, category: "office", candidate_name: "", description: "", governorate: "Baghdad", district: "", working_hours: "", services: [] },
  },
  {
    id: "candidates", label: "المرشحين", sub: "Candidates", group: "organization", icon: UserRound, kpi: true,
    table: "office_candidates", role: ["content_admin"], image: "office", visibilityKey: "is_visible",
    select: "id, office_id, full_name, political_role, city, district, portrait_url, summary, cv_summary, education, experience, previous_positions, achievements, responsibilities, phone, email, website_url, display_order, is_visible",
    order: "display_order", titleKey: "full_name",
    searchKeys: ["political_role", "city", "district"],
    fields: [
      { key: "portrait_url", label: "Portrait", type: "image" },
      { key: "office_id", label: "Office / governorate", type: "office", required: true },
      { key: "full_name", label: "Full name", type: "text", required: true },
      { key: "political_role", label: "Political role", type: "text", required: true },
      { key: "city", label: "City", type: "text" },
      { key: "district", label: "Electoral district", type: "text" },
      { key: "summary", label: "Short biography", type: "textarea" },
      { key: "cv_summary", label: "CV summary", type: "textarea" },
      { key: "education", label: "Education (one per line)", type: "lines" },
      { key: "experience", label: "Experience (one per line)", type: "lines" },
      { key: "previous_positions", label: "Previous positions (one per line)", type: "lines" },
      { key: "achievements", label: "Achievements (one per line)", type: "lines" },
      { key: "responsibilities", label: "Responsibilities (one per line)", type: "lines" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "website_url", label: "Website", type: "text" },
      { key: "display_order", label: "Display order", type: "number" },
      { key: "is_visible", label: "Visible to public", type: "checkbox" },
    ],
    defaults: { is_visible: true, display_order: 0, city: "", summary: "", cv_summary: "", education: [], experience: [], previous_positions: [], achievements: [], responsibilities: [] },
    beforeSave: (v) => ({ ...v, phone: v['phone'] || null, email: v['email'] || null, website_url: v['website_url'] || null }),
  },
  {
    id: "officials", label: "ممثلين المحافظة", sub: "Representatives", group: "organization", icon: UsersRound,
    table: "office_officials", role: ["content_admin"], visibilityKey: "is_visible",
    select: "id, office_id, full_name, responsibility, phone, email, display_order, is_visible",
    order: "display_order", titleKey: "full_name",
    searchKeys: ["responsibility"],
    fields: [
      { key: "office_id", label: "Office / governorate", type: "office", required: true },
      { key: "full_name", label: "Full name", type: "text", required: true },
      { key: "responsibility", label: "Responsibility", type: "text", required: true },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "display_order", label: "Display order", type: "number" },
      { key: "is_visible", label: "Visible to public", type: "checkbox" },
    ],
    defaults: { is_visible: true, display_order: 0 },
    beforeSave: (v) => ({ ...v, phone: v['phone'] || null, email: v['email'] || null }),
  },
  {
    id: "courses", label: "أكاديمية القيادة", sub: "Courses & lessons", group: "academy", icon: GraduationCap, kpi: true,
    table: "courses", role: ["academy_manager"], image: "course",
    select: "id, title, description, cover_url, level, status, category, instructor_name, instructor_title, instructor_bio, duration_minutes, outcomes, requirements, require_all_lessons, require_all_quizzes, require_all_assignments",
    order: "created_at", titleKey: "title", statusKey: "status",
    searchKeys: ["category", "level", "instructor_name"],
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
    id: "polls", label: "Polls", sub: "Consultations", group: "participation", icon: BarChart3, kpi: true,
    table: "polls", role: ["content_admin"],
    select: "id, question, description, starts_at, ends_at, status, results_public", order: "created_at", titleKey: "question", statusKey: "status",
    searchKeys: ["description"],
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

/** UI-only filter; RLS remains the source of truth for every read and write. */
export function sectionsForRoles(can: (role: AppRole) => boolean) {
  return ADMIN_SECTIONS.filter((s) => s.role.some((r) => can(r)));
}

export type Row = Record<string, unknown> & { id: string };

export function matchesSearch(section: Section, row: Row, term: string) {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return [section.titleKey, ...(section.searchKeys ?? [])].some((key) =>
    String(row[key] ?? "").toLowerCase().includes(q),
  );
}
