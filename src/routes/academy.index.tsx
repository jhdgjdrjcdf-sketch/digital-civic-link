import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Clock, GraduationCap, Search, Star, Users } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  COURSE_CATEGORIES,
  COURSE_LEVELS,
  categoryLabel,
  formatDuration,
  useCourseRatings,
  useCourses,
  useEnrollments,
} from "@/lib/academy";

export const Route = createFileRoute("/academy/")({
  head: () => ({
    meta: [
      { title: "أكاديمية القيادة — Leadership Academy" },
      {
        name: "description",
        content:
          "Leadership, communication and policy courses for members and volunteers, with progress tracking and digital certificates.",
      },
      { property: "og:title", content: "أكاديمية القيادة — Leadership Academy" },
      {
        property: "og:description",
        content: "Courses with lessons, assessments, progress tracking and digital certificates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcademyPage,
});

function AcademyPage() {
  const courses = useCourses();
  const ratings = useCourseRatings();
  const enrollments = useEnrollments();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");

  const enrolledMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of enrollments.data ?? []) map.set(row.course_id, row.status);
    return map;
  }, [enrollments.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (courses.data ?? []).filter((course) => {
      const matchesTerm =
        !term ||
        `${course.title} ${course.description} ${course.instructor_name}`
          .toLowerCase()
          .includes(term);
      return (
        matchesTerm &&
        (category === "all" || course.category === category) &&
        (level === "all" || course.level === level)
      );
    });
  }, [courses.data, search, category, level]);

  return (
    <AppShell
      arabicTitle="أكاديمية القيادة"
      title="Leadership Academy"
      subtitle="Learn at your own pace, track your progress, and earn a verified certificate."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link to="/academy/my">My courses</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/academy/verify">Verify a certificate</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/academy/instructor">Instructor</Link>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search courses or instructors"
            aria-label="Search courses"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[{ value: "all", label: "All topics" }, ...COURSE_CATEGORIES].map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={category === item.value ? "default" : "outline"}
              onClick={() => setCategory(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {["all", ...COURSE_LEVELS].map((item) => (
            <Button
              key={item}
              size="sm"
              variant={level === item ? "secondary" : "ghost"}
              onClick={() => setLevel(item)}
            >
              {item === "all" ? "Any level" : item}
            </Button>
          ))}
        </div>

        {courses.isPending ? (
          <LoadingList rows={3} />
        ) : courses.isError ? (
          <ErrorState error={courses.error} onRetry={() => courses.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No courses match this filter"
            description="Try a different topic, level or search term."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filtered.map((course) => {
              const rating = ratings.data?.get(course.id);
              const status = enrolledMap.get(course.id);
              return (
                <li key={course.id}>
                  <Link
                    to="/academy/$courseId"
                    params={{ courseId: course.id }}
                    className="card-soft flex h-full flex-col overflow-hidden transition hover:shadow-md"
                  >
                    <div className="surface-navy flex h-28 items-end justify-between p-4">
                      <GraduationCap className="size-8 opacity-70" />
                      <Badge variant="secondary">{course.level}</Badge>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <span className="text-xs text-muted-foreground">
                        {categoryLabel(course.category)}
                      </span>
                      <h2 className="leading-snug font-bold">{course.title}</h2>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {course.description}
                      </p>
                      <div className="mt-auto flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3.5" /> {course.instructor_name}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" /> {formatDuration(course.duration_minutes)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3.5 text-accent" />
                          {rating && rating.count
                            ? `${(rating.sum / rating.count).toFixed(1)} (${rating.count})`
                            : "New"}
                        </span>
                      </div>
                      {status ? (
                        <div className="pt-2">
                          <Progress value={status === "completed" ? 100 : undefined} />
                          <span className="mt-1 block text-xs font-medium text-primary">
                            {status === "completed" ? "Completed" : "In progress"}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
