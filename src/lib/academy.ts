import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export const COURSE_CATEGORIES = [
  { value: "leadership", label: "Leadership" },
  { value: "communication", label: "Communication" },
  { value: "policy", label: "Policy & research" },
  { value: "civic", label: "Civic participation" },
] as const;

export const COURSE_LEVELS = ["Foundation", "Intermediate", "Advanced"] as const;

export function categoryLabel(value: string) {
  return COURSE_CATEGORIES.find((item) => item.value === value)?.label ?? "General";
}

export type Course = {
  id: string;
  title: string;
  description: string;
  cover_url: string | null;
  level: string;
  status: string;
  category: string;
  instructor_name: string;
  instructor_title: string;
  instructor_bio: string;
  duration_minutes: number;
  outcomes: string[];
  requirements: string[];
};

export type Lesson = {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  content: string;
  position: number;
  duration_minutes: number;
  video_url: string | null;
  resources: { label: string; url: string }[];
  is_required: boolean;
};

export type CourseModule = { id: string; title: string; position: number };

export type CourseProgress = {
  enrolled: boolean;
  status: "none" | "enrolled" | "in_progress" | "completed";
  last_lesson_id: string | null;
  lessons_total: number;
  lessons_done: number;
  quizzes_total: number;
  quizzes_passed: number;
  percent: number;
  completed_lesson_ids: string[];
};

const COURSE_FIELDS =
  "id, title, description, cover_url, level, status, category, instructor_name, instructor_title, instructor_bio, duration_minutes, outcomes, requirements";

export function formatDuration(minutes: number) {
  if (!minutes) return "Self-paced";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function useCourses() {
  return useQuery({
    queryKey: ["academy", "courses"],
    queryFn: async (): Promise<Course[]> => {
      const { data, error } = await supabase
        .from("courses")
        .select(COURSE_FIELDS)
        .eq("status", "published")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Course[];
    },
  });
}

export function useCourse(courseId: string) {
  return useQuery({
    queryKey: ["academy", "course", courseId],
    queryFn: async () => {
      const [course, modules, lessons, quizzes] = await Promise.all([
        supabase.from("courses").select(COURSE_FIELDS).eq("id", courseId).maybeSingle(),
        supabase
          .from("course_modules")
          .select("id, title, position")
          .eq("course_id", courseId)
          .order("position"),
        supabase
          .from("lessons")
          .select(
            "id, course_id, module_id, title, content, position, duration_minutes, video_url, resources, is_required",
          )
          .eq("course_id", courseId)
          .order("position"),
        supabase.from("quizzes").select("id, title, description, pass_percent").eq("course_id", courseId),
      ]);
      if (course.error) throw course.error;
      if (modules.error) throw modules.error;
      if (lessons.error) throw lessons.error;
      if (quizzes.error) throw quizzes.error;
      return {
        course: (course.data ?? null) as Course | null,
        modules: (modules.data ?? []) as CourseModule[],
        lessons: ((lessons.data ?? []) as unknown as Lesson[]).map((lesson) => ({
          ...lesson,
          resources: Array.isArray(lesson.resources) ? lesson.resources : [],
        })),
        quizzes: (quizzes.data ?? []) as {
          id: string;
          title: string;
          description: string;
          pass_percent: number;
        }[],
      };
    },
  });
}

export function useCourseRatings() {
  return useQuery({
    queryKey: ["academy", "ratings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("course_reviews").select("course_id, rating");
      if (error) throw error;
      const map = new Map<string, { sum: number; count: number }>();
      for (const row of data ?? []) {
        const entry = map.get(row.course_id) ?? { sum: 0, count: 0 };
        entry.sum += row.rating;
        entry.count += 1;
        map.set(row.course_id, entry);
      }
      return map;
    },
  });
}

export function useEnrollments() {
  const { data: session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["academy", "enrollments", userId ?? "anonymous"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("course_id, status, last_lesson_id, enrolled_at, completed_at")
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCourseProgress(courseId: string) {
  const { data: session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["academy", "progress", courseId, userId ?? "anonymous"],
    enabled: Boolean(userId && courseId),
    queryFn: async (): Promise<CourseProgress> => {
      const { data, error } = await supabase.rpc("course_progress", { _course_id: courseId });
      if (error) throw error;
      return data as unknown as CourseProgress;
    },
  });
}

export function useAcademyActions(courseId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["academy"] });
  };

  const enroll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("enroll_course", { _course_id: courseId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const completeLesson = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.rpc("complete_lesson", { _lesson_id: lessonId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const finalize = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("finalize_course", { _course_id: courseId });
      if (error) throw error;
      return data as unknown as { completed: boolean; serial?: string };
    },
    onSuccess: invalidate,
  });

  return { enroll, completeLesson, finalize };
}

export function useCertificates() {
  const { data: session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["academy", "certificates", userId ?? "anonymous"],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("id, course_id, serial, score, hours, instructor_name, issued_at")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
