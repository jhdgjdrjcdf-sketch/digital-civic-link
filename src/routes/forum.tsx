
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  MessageCircle,
  Search,
  TrendingUp,
  Clock,
  Plus,
  ChevronUp,
  ChevronDown,
  BookOpen,
  Lightbulb,
  Globe,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

type ForumPost = {
  id: number;
  title: string;
  body: string;
  category: string;
  author: string;
  votes: number;
  comments: number;
  time: string;
};

const initialPosts: ForumPost[] = [
  {
    id: 1,
    title: "هل يمكن للتعليم أن يغيّر مستقبل المجتمع؟",
    body: "ما أهم تغيير تعتقدون أنه يجب أن يبدأ به إصلاح التعليم؟ شاركونا آراءكم وتجاربكم.",
    category: "الفكر والمجتمع",
    author: "عضو المنتدى",
    votes: 24,
    comments: 8,
    time: "منذ ساعتين",
  },
  {
    id: 2,
    title: "هل ينبغي تدريس التفكير النقدي في المدارس؟",
    body: "بدلًا من حفظ المعلومات فقط، ماذا لو تعلم الطلاب تحليل الأفكار ومناقشة الأدلة واحترام الاختلاف؟",
    category: "التعليم",
    author: "عضو المنتدى",
    votes: 18,
    comments: 5,
    time: "منذ 4 ساعات",
  },
  {
    id: 3,
    title: "ما دور التكنولوجيا في خدمة المجتمع؟",
    body: "أريد مناقشة أفكار عملية لاستخدام البرمجة والذكاء الاصطناعي لحل مشكلات محلية.",
    category: "التكنولوجيا",
    author: "عضو المنتدى",
    votes: 12,
    comments: 3,
    time: "أمس",
  },
];

const categories = [
  "الكل",
  "الفكر والمجتمع",
  "الثقافة",
  "التعليم",
  "التكنولوجيا",
  "الكتب والفلسفة",
];

function ForumPage() {
  const [posts, setPosts] = useState(initialPosts);
  const [category, setCategory] = useState("الكل");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"popular" | "new">("popular");
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [newCategory, setNewCategory] = useState("الفكر والمجتمع");
  const [notice, setNotice] = useState("");

  const visiblePosts = posts
    .filter((post) => category === "الكل" || post.category === category)
    .filter((post) =>
      `${post.title} ${post.body}`.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sort === "popular" ? b.votes - a.votes : b.id - a.id
    );

  function publishPost() {
    if (!title.trim() || !body.trim()) {
      setNotice("اكتب عنوان المنشور ومحتواه أولًا.");
      return;
    }

    const post: ForumPost = {
      id: Date.now(),
      title: title.trim(),
      body: body.trim(),
      category: newCategory,
      author: "أنت",
      votes: 1,
      comments: 0,
      time: "الآن",
    };

    setPosts((current) => [post, ...current]);
    setTitle("");
    setBody("");
    setShowComposer(false);
    setSort("new");
    setCategory("الكل");
    setNotice("أُضيف المنشور إلى المعاينة المحلية. لم يُحفظ في قاعدة البيانات بعد.");
  }

  function vote(id: number, amount: number) {
    setPosts((current) =>
      current.map((post) =>
        post.id === id ? { ...post, votes: post.votes + amount } : post
      )
    );
  }

  return (
    <AppShell>
      <main dir="rtl" className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="bg-primary px-5 py-7 text-primary-foreground sm:px-8">
            <p className="mb-2 text-sm opacity-80">مساحة للحوار والمعرفة</p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              المنتدى الفكري والثقافي
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 opacity-90">
              ناقش الأفكار، اكتشف وجهات نظر جديدة، وتبادل المعرفة باحترام.
            </p>
            <button
              type="button"
              onClick={() => setShowComposer((value) => !value)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-background px-4 py-2.5 font-semibold text-foreground"
            >
              <Plus size={18} />
              ابدأ نقاشًا
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 text-center">
            <div className="rounded-xl bg-muted p-3">
              <BookOpen className="mx-auto mb-2" size={21} />
              <p className="text-sm font-semibold">ثقافة</p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <Lightbulb className="mx-auto mb-2" size={21} />
              <p className="text-sm font-semibold">أفكار</p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <Globe className="mx-auto mb-2" size={21} />
              <p className="text-sm font-semibold">مجتمع</p>
            </div>
          </div>
        </section>

        {notice && (
          <div role="status" className="rounded-xl border p-3 text-sm">
            {notice}
          </div>
        )}

        {showComposer && (
          <section className="space-y-4 rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-bold">إنشاء نقاش جديد</h2>
            <label className="block space-y-2">
              <span className="text-sm font-medium">عنوان النقاش</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={180}
                placeholder="اكتب عنوانًا واضحًا"
                className="w-full rounded-xl border bg-background px-3 py-3"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">التصنيف</span>
              <select
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-3"
              >
                {categories.filter((item) => item !== "الكل").map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">محتوى النقاش</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={10000}
                rows={5}
                placeholder="اشرح فكرتك وابدأ النقاش..."
                className="w-full rounded-xl border bg-background px-3 py-3"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={publishPost}
                className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground"
              >
                نشر في المعاينة
              </button>
              <button
                type="button"
                onClick={() => setShowComposer(false)}
                className="rounded-xl border px-5 py-2.5"
              >
                إلغاء
              </button>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-3.5 text-muted-foreground" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث عن فكرة أو موضوع..."
              className="w-full rounded-xl border bg-background py-3 pe-10 ps-3"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-full border px-3 py-2 text-sm ${
                  category === item
                    ? "bg-primary text-primary-foreground"
                    : "bg-background"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">النقاشات</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSort("popular")}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm ${
                  sort === "popular" ? "bg-muted font-semibold" : ""
                }`}
              >
                <TrendingUp size={16} /> الأكثر تصويتًا
              </button>
              <button
                type="button"
                onClick={() => setSort("new")}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm ${
                  sort === "new" ? "bg-muted font-semibold" : ""
                }`}
              >
                <Clock size={16} /> الأحدث
              </button>
            </div>
          </div>

          {visiblePosts.length === 0 && (
            <div className="rounded-xl border p-8 text-center text-muted-foreground">
              لا توجد نقاشات تطابق بحثك.
            </div>
          )}

          {visiblePosts.map((post) => (
            <article key={post.id} className="rounded-2xl border bg-card p-4 sm:p-5">
              <div className="flex gap-3">
                <div className="flex min-w-9 flex-col items-center gap-1 rounded-xl bg-muted p-1.5">
                  <button
                    type="button"
                    aria-label="تصويت إيجابي"
                    onClick={() => vote(post.id, 1)}
                    className="rounded p-1"
                  >
                    <ChevronUp size={22} />
                  </button>
                  <span className="text-sm font-bold">{post.votes}</span>
                  <button
                    type="button"
                    aria-label="تصويت سلبي"
                    onClick={() => vote(post.id, -1)}
                    className="rounded p-1"
                  >
                    <ChevronDown size={22} />
                  </button>
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2.5 py-1">{post.category}</span>
                    <span>{post.author}</span>
                    <span>·</span>
                    <span>{post.time}</span>
                  </div>
                  <h3 className="text-lg font-bold leading-7">{post.title}</h3>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                    {post.body}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageCircle size={17} />
                    <span>{post.comments} تعليقات</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        <p className="text-center text-xs text-muted-foreground">
          المنتدى في هذه المرحلة نموذج أولي؛ المنشورات مؤقتة داخل الصفحة فقط.
        </p>
      </main>
    </AppShell>
  );
}

export const Route = createFileRoute("/forum")({
  component: ForumPage,
});
