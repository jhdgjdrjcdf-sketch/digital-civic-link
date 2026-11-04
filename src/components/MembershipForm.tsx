
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import LiveIdCapture from "./LiveIdCapture";

const educationOptions = [
  "ابتدائية",
  "متوسطة",
  "إعدادية",
  "دبلوم",
  "بكالوريوس",
  "دبلوم عالي",
  "ماجستير",
  "دكتوراه",
  "أخرى",
];

export default function MembershipForm() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [district, setDistrict] = useState("");
  const [education, setEducation] = useState("");
  const [reason, setReason] = useState("");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);

  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || fullName.trim().split(/\s+/).length < 3) {
      return setError("يرجى إدخال الاسم الثلاثي.");
    }

    if (!/^7\d{9}$/.test(phone)) {
      return setError("أدخل رقم هاتف عراقي صحيحاً بعد +964.");
    }

    if (!governorate || !district || !education) {
      return setError("يرجى إكمال جميع المعلومات.");
    }

    if (reason.trim().length < 20) {
      return setError("يرجى كتابة سبب الانضمام بشكل أوضح.");
    }

    if (!idPhoto) {
      return setError("يجب التقاط صورة البطاقة الوطنية.");
    }

    if (!adultConfirmed || !privacyConsent) {
      return setError("يرجى تأكيد العمر والموافقة على سياسة الخصوصية.");
    }

    if (idPhoto.type !== "image/jpeg" || idPhoto.size > 8 * 1024 * 1024) {
      return setError("الصورة يجب أن تكون JPEG وأقل من 8 ميغابايت.");
    }

    setLoading(true);

    let uploadedPath: string | null = null;

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("يجب تسجيل الدخول قبل تقديم الطلب.");
      }

      const userId = authData.user.id;
      const filePath = `${userId}/${crypto.randomUUID()}.jpg`;

      const { data: uploaded, error: uploadError } =
        await supabase.storage
          .from("membership-id")
          .upload(filePath, idPhoto, {
            contentType: "image/jpeg",
            upsert: false,
          });

      if (uploadError) throw uploadError;

      uploadedPath = uploaded.path;

      const { error: insertError } = await supabase
        .from("membership_requests")
        .insert({
          applicant_id: userId,
          full_name: fullName.trim(),
          phone: `+964${phone}`,
          governorate,
          district,
          education_level: education,
          reason: reason.trim(),
          id_photo_path: uploaded.path,
          status: "pending",
        });

      if (insertError) throw insertError;

      setSubmitted(true);
    } catch (err) {
      if (uploadedPath) {
        await supabase.storage
          .from("membership-id")
          .remove([uploadedPath]);
      }

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء إرسال الطلب."
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-3xl border p-8 text-center space-y-4">
        <div className="text-4xl">✓</div>
        <h2 className="text-2xl font-bold">
          تم استلام طلبك بنجاح
        </h2>
        <p className="text-muted-foreground">
          طلبك الآن قيد المراجعة من قبل الإدارة المختصة.
          سيتم تحديث حالة الطلب بعد اتخاذ القرار.
        </p>
        <span className="inline-block rounded-full bg-yellow-500/10 px-4 py-2 text-yellow-700">
          قيد المراجعة
        </span>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border bg-background p-3 outline-none focus:ring-2 focus:ring-primary";

  return (
    <form onSubmit={handleSubmit} className="space-y-7" dir="rtl">

      <section className="space-y-4">
        <h2 className="text-lg font-bold">
          المعلومات الشخصية
        </h2>

        <label className="block space-y-2">
          <span>الاسم الثلاثي *</span>
          <input
            className={inputClass}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="الاسم الثلاثي"
            autoComplete="name"
            required
          />
        </label>

        <label className="block space-y-2">
          <span>رقم الهاتف *</span>
          <div className="flex gap-2">
            <span className="rounded-xl border p-3 bg-muted">
              +964
            </span>
            <input
              className={inputClass}
              value={phone}
              onChange={e =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="7XXXXXXXXX"
              inputMode="numeric"
              autoComplete="tel-national"
              required
            />
          </div>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-2">
            <span className="block">المحافظة *</span>
            <input
              className={inputClass}
              value={governorate}
              onChange={e => setGovernorate(e.target.value)}
              placeholder="المحافظة"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="block">القضاء *</span>
            <input
              className={inputClass}
              value={district}
              onChange={e => setDistrict(e.target.value)}
              placeholder="القضاء"
              required
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">
          التحصيل الدراسي
        </h2>

        <select
          className={inputClass}
          value={education}
          onChange={e => setEducation(e.target.value)}
          required
        >
          <option value="">اختر التحصيل الدراسي</option>
          {educationOptions.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">
          طلب الانتماء
        </h2>

        <label className="block space-y-2">
          <span>لماذا ترغب بالانضمام إلى التجمع؟ *</span>
          <textarea
            className={`${inputClass} min-h-32 resize-y`}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="اكتب نبذة عن دوافعك ورغبتك في المشاركة..."
            minLength={20}
            maxLength={2000}
            required
          />
          <span className="text-xs text-muted-foreground">
            {reason.length}/2000
          </span>
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">
          التحقق من الهوية
        </h2>

        <p className="text-sm text-muted-foreground">
          تُستخدم صورة البطاقة للتحقق من الهوية فقط،
          وتُتاح حصراً للمسؤولين المخولين.
        </p>

        <LiveIdCapture onCapture={setIdPhoto} />
      </section>

      <section className="space-y-4 rounded-2xl border p-4">
        <label className="flex gap-3 items-start">
          <input
            type="checkbox"
            checked={adultConfirmed}
            onChange={e => setAdultConfirmed(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            أؤكد أن عمري 18 عاماً أو أكثر.
          </span>
        </label>

        <label className="flex gap-3 items-start">
          <input
            type="checkbox"
            checked={privacyConsent}
            onChange={e => setPrivacyConsent(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            أوافق على سياسة الخصوصية ومعالجة بياناتي
            لغرض مراجعة طلب الانتماء، وأعلم من يستطيع
            الاطلاع عليها ومدة الاحتفاظ بها.
          </span>
        </label>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary p-4 font-semibold text-primary-foreground disabled:opacity-50"
      >
        {loading ? "جارٍ إرسال الطلب..." : "إرسال طلب الانتماء"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        إرسال الطلب لا يعني القبول التلقائي في التجمع.
      </p>
    </form>
  );
}
