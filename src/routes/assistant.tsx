
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Send, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/assistant")({
  component: AssistantPage,
});

const suggestions = [
  "ما أهداف الحزب ومبادئه؟",
  "كيف أتواصل مع الحزب؟",
  "أين أجد الأخبار الرسمية؟",
  "كيف أقدم شكوى أو مقترحًا؟",
];

function getAnswer(question: string) {
  const q = question.toLowerCase();

  if (q.includes("خبر") || q.includes("أخبار") || q.includes("إعلان")) {
    return "يمكنك متابعة الأخبار والإعلانات المنشورة في قسم «صوت التجمع» داخل التطبيق. اعتمد على المنشورات الرسمية لمعرفة آخر المستجدات.";
  }

  if (q.includes("تواصل") || q.includes("اتصال") || q.includes("مكتب")) {
    return "يمكنك مراجعة قسم «مكاتب التجمع والمرشحين» للاطلاع على المعلومات المنشورة. إذا لم تجد وسيلة تواصل مناسبة، فالمعلومات الرسمية تحتاج إلى تحديث من إدارة التطبيق.";
  }

  if (q.includes("شكوى") || q.includes("مقترح") || q.includes("اقتراح")) {
    return "نريد أن تصل ملاحظات المواطنين إلى الجهة المعنية. لا تتوفر في هذه النسخة آلية مؤكدة لإرسال الشكاوى من خلال المساعد؛ يرجى استخدام قناة رسمية منشورة في التطبيق.";
  }

  if (
    q.includes("هدف") ||
    q.includes("مبادئ") ||
    q.includes("برنامج") ||
    q.includes("موقف") ||
    q.includes("سياسة")
  ) {
    return "حتى أقدم لك إجابة دقيقة، نحتاج إلى إضافة البرنامج والمبادئ والمواقف الرسمية المعتمدة للحزب إلى قاعدة معلومات المساعد. لا أريد أن أعطيك معلومات غير موثقة.";
  }

  if (q.includes("انضمام") || q.includes("انتساب") || q.includes("عضو")) {
    return "لم تُضف بعد معلومات موثقة عن شروط وآلية الانتساب. يرجى مراجعة الإعلانات أو وسائل التواصل الرسمية المنشورة.";
  }

  return "لم أجد إجابة موثوقة عن هذا السؤال في قاعدة المعلومات الأولية. جرّب أحد الأسئلة المقترحة أو راجع الأقسام الرسمية في التطبيق.";
}

function AssistantPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([
    {
      role: "assistant",
      text: "مرحبًا بك! أنا المساعد المعلوماتي لتطبيق تجمع الفاو زاخو. اسألني عن المعلومات المنشورة، وسأوضح لك عندما لا تتوفر إجابة موثوقة.",
    },
  ]);

  function sendQuestion(value = question) {
    const text = value.trim();
    if (!text) return;

    setMessages((old) => [
      ...old,
      { role: "user", text },
      { role: "assistant", text: getAnswer(text) },
    ]);
    setQuestion("");
  }

  return (
    <AppShell
      arabicTitle="المساعد الذكي"
      title="Civic Assistant"
      subtitle="اسأل عن معلومات الحزب وخدماته"
    >
      <div className="mb-4 rounded-xl border p-4">
        <div className="mb-3 flex items-center gap-2 font-bold">
          <Bot className="size-5 text-accent" />
          كيف يمكنني مساعدتك؟
        </div>

        <div className="flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => sendQuestion(item)}
              className="rounded-full border px-3 py-2 text-right text-xs hover:bg-muted"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 space-y-3" aria-live="polite">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-2 rounded-xl p-3 ${
              message.role === "user"
                ? "bg-primary/10"
                : "card-soft"
            }`}
          >
            {message.role === "user" ? (
              <UserRound className="mt-1 size-4 shrink-0" />
            ) : (
              <Bot className="mt-1 size-4 shrink-0 text-accent" />
            )}
            <p className="text-sm leading-7">{message.text}</p>
          </div>
        ))}
      </div>

      <form
        className="sticky bottom-20 flex gap-2 rounded-xl border bg-background p-2"
        onSubmit={(event) => {
          event.preventDefault();
          sendQuestion();
        }}
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="اكتب سؤالك هنا..."
          aria-label="اكتب سؤالك"
          className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
        />
        <button
          type="submit"
          aria-label="إرسال السؤال"
          className="rounded-lg bg-primary p-3 text-primary-foreground"
        >
          <Send className="size-4" />
        </button>
      </form>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        النسخة الأولية — تحقّق من المعلومات عبر المصادر الرسمية.
      </p>
    </AppShell>
  );
}
