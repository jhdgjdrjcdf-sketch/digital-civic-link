
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { uploadAcademyFile } from "@/components/CourseCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Course = {
  id: string;
  title: string;
};

type Module = {
  id: string;
  title: string;
  position: number;
};

type Lesson = {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  content: string;
  video_url: string | null;
  position: number;
  duration_minutes: number;
  is_required: boolean;
};

export function AcademyContentManager() {
  const qc = useQueryClient();

  const [courseId, setCourseId] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [duration, setDuration] = useState("10");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [required, setRequired] = useState(true);

  const courses = useQuery({
    queryKey: ["academy-admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Course[];
    },
  });

  const modules = useQuery({
    queryKey: ["academy-admin-modules", courseId],
    enabled: Boolean(courseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_modules")
        .select("id, title, position")
        .eq("course_id", courseId)
        .order("position");

      if (error) throw error;
      return data as Module[];
    },
  });

  const lessons = useQuery({
    queryKey: ["academy-admin-lessons", courseId],
    enabled: Boolean(courseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("position");

      if (error) throw error;
      return data as Lesson[];
    },
  });

  const addModule = useMutation({
    mutationFn: async () => {
      if (!moduleTitle.trim() || !courseId) {
        throw new Error("اكتب اسم الوحدة واختر الدورة");
      }

      const { error } = await supabase
        .from("course_modules")
        .insert({
          course_id: courseId,
          title: moduleTitle.trim(),
          position: (modules.data?.length ?? 0) + 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setModuleTitle("");
      qc.invalidateQueries({
        queryKey: ["academy-admin-modules", courseId],
      });
      toast.success("تمت إضافة الوحدة");
    },
    onError: (error) => toast.error(error.message),
  });

  const saveLesson = useMutation({
    mutationFn: async () => {
      if (!courseId || !title.trim()) {
        throw new Error("اختر الدورة واكتب عنوان الدرس");
      }

      let finalVideoUrl = videoUrl.trim() || null;

      if (videoFile) {
        if (!["video/mp4", "video/webm"].includes(videoFile.type)) {
          throw new Error("اختر فيديو MP4 أو WebM");
        }

        if (videoFile.size > 50 * 1024 * 1024) {
          throw new Error("حجم الفيديو الحالي يجب ألا يتجاوز 50 MB");
        }

        finalVideoUrl = await uploadAcademyFile(
          courseId,
          "lessons",
          videoFile
        );
      }

      const payload = {
        course_id: courseId,
        module_id: moduleId || null,
        title: title.trim(),
        content: content.trim(),
        video_url: finalVideoUrl,
        duration_minutes: Math.min(
          600,
          Math.max(1, Number(duration) || 10)
        ),
        position: lessonId
          ? lessons.data?.find((item) => item.id === lessonId)?.position ?? 1
          : (lessons.data?.length ?? 0) + 1,
        is_required: required,
      };

      const result = lessonId
        ? await supabase
            .from("lessons")
            .update(payload)
            .eq("id", lessonId)
        : await supabase.from("lessons").insert(payload);

      if (result.error) throw result.error;
    },
    onSuccess: () => {
      resetLesson();
      qc.invalidateQueries({
        queryKey: ["academy-admin-lessons", courseId],
      });
      qc.invalidateQueries({ queryKey: ["academy"] });
      toast.success("تم حفظ الدرس بنجاح");
    },
    onError: (error) => toast.error(error.message),
  });

  function resetLesson() {
    setLessonId("");
    setTitle("");
    setContent("");
    setModuleId("");
    setDuration("10");
    setVideoUrl("");
    setVideoFile(null);
    setRequired(true);
  }

  function editLesson(lesson: Lesson) {
    setLessonId(lesson.id);
    setTitle(lesson.title);
    setContent(lesson.content ?? "");
    setModuleId(lesson.module_id ?? "");
    setDuration(String(lesson.duration_minutes ?? 10));
    setVideoUrl(lesson.video_url ?? "");
    setVideoFile(null);
    setRequired(lesson.is_required);
  }

  return (
    <section className="card-soft space-y-5 p-4">
      <div>
        <h2 className="text-lg font-bold">
          إدارة محتوى الأكاديمية
        </h2>
        <p className="text-sm text-muted-foreground">
          أضف الوحدات والدروس وارفع فيديوهات الدورات.
        </p>
      </div>

      <div className="space-y-2">
        <Label>اختر الدورة</Label>
        <select
          className="h-11 w-full rounded-md border bg-background px-3"
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            resetLesson();
          }}
        >
          <option value="">اختر دورة...</option>
          {courses.data?.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {courseId && (
        <>
          <div className="space-y-3 rounded-xl border p-3">
            <h3 className="font-semibold">إضافة وحدة تعليمية</h3>

            <Input
              placeholder="مثال: الوحدة الأولى - مقدمة"
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
            />

            <Button
              className="w-full"
              disabled={addModule.isPending}
              onClick={() => addModule.mutate()}
            >
              إضافة الوحدة
            </Button>
          </div>

          <div className="space-y-3 rounded-xl border p-3">
            <h3 className="font-semibold">
              {lessonId ? "تعديل الدرس" : "إضافة درس جديد"}
            </h3>

            <Label>عنوان الدرس</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان الدرس"
            />

            <Label>الوحدة التعليمية</Label>
            <select
              className="h-11 w-full rounded-md border bg-background px-3"
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
            >
              <option value="">بدون وحدة</option>
              {modules.data?.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>

            <Label>محتوى الدرس</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب شرح الدرس..."
            />

            <Label>مدة الدرس بالدقائق</Label>
            <Input
              type="number"
              min="1"
              max="600"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />

            <div className="space-y-2">
              <Label>رفع فيديو الدرس</Label>
              <Input
                type="file"
                accept="video/mp4,video/webm"
                onChange={(e) =>
                  setVideoFile(e.target.files?.[0] ?? null)
                }
              />
              <p className="text-xs text-muted-foreground">
                MP4 أو WebM، بحد أقصى 50 MB حالياً.
              </p>
            </div>

            <div className="space-y-2">
              <Label>أو رابط فيديو خارجي</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="رابط فيديو مباشر"
              />
              <p className="text-xs text-muted-foreground">
                استخدم رابط فيديو مباشر، وليس رابط صفحة YouTube العادية.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              درس إلزامي لإكمال الدورة
            </label>

            <Button
              className="w-full"
              disabled={saveLesson.isPending}
              onClick={() => saveLesson.mutate()}
            >
              {saveLesson.isPending ? "جارٍ الحفظ..." : "حفظ الدرس"}
            </Button>

            {lessonId && (
              <Button
                variant="outline"
                className="w-full"
                onClick={resetLesson}
              >
                إلغاء التعديل
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">دروس هذه الدورة</h3>

            {lessons.data?.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {lesson.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lesson.duration_minutes} دقيقة
                    {lesson.video_url ? " · يحتوي فيديو" : " · دون فيديو"}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => editLesson(lesson)}
                >
                  تعديل
                </Button>
              </div>
            ))}

            {!lessons.data?.length && (
              <p className="text-sm text-muted-foreground">
                لا توجد دروس لهذه الدورة حتى الآن.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
