
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type MembershipRequest = {
  id: string;
  applicant_id: string;
  full_name: string;
  phone: string;
  governorate: string;
  district: string;
  education_level: string;
  reason: string;
  id_photo_path: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export const Route = createFileRoute("/admin/membership")({
  component: MembershipAdmin,
});

function MembershipAdmin() {
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MembershipRequest | null>(null);
  const [error, setError] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("membership_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError("تعذر تحميل الطلبات أو ليس لديك صلاحية الإدارة.");
    } else {
      setRequests(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const updateStatus = async (
    request: MembershipRequest,
    status: "approved" | "rejected"
  ) => {
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      setError("يجب تسجيل الدخول.");
      return;
    }

    const { error } = await supabase
      .from("membership_requests")
      .update({
        status,
        reviewed_by: authData.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (error) {
      setError("تعذر تحديث حالة الطلب.");
      return;
    }

    setSelected(null);
    await loadRequests();
  };

  const viewIdentity = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("membership-id")
      .createSignedUrl(path, 60);

    if (error || !data?.signedUrl) {
      setError("تعذر الوصول إلى وثيقة الهوية.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const pending = requests.filter(r => r.status === "pending").length;
  const approved = requests.filter(r => r.status === "approved").length;
  const rejected = requests.filter(r => r.status === "rejected").length;

  const stats = [
    { label: "إجمالي الطلبات", value: requests.length },
    { label: "قيد المراجعة", value: pending },
    { label: "المقبولة", value: approved },
    { label: "المرفوضة", value: rejected },
  ];

  return (
    <main dir="rtl" className="min-h-screen p-4 sm:p-8 space-y-8">

      <header>
        <p className="text-sm text-primary">لوحة الإدارة</p>
        <h1 className="text-3xl font-bold mt-2">
          إدارة طلبات الانتماء
        </h1>
        <p className="text-muted-foreground mt-2">
          مراجعة الطلبات واتخاذ القرارات الإدارية.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-2xl border p-4">
            <p className="text-sm text-muted-foreground">
              {stat.label}
            </p>
            <p className="text-3xl font-bold mt-2">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-red-600">
          {error}
        </p>
      )}

      <section className="rounded-2xl border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold">طلبات الانتساب</h2>
          <button
            onClick={loadRequests}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            تحديث
          </button>
        </div>

        {loading ? (
          <p className="p-8 text-center">جارٍ تحميل الطلبات...</p>
        ) : requests.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">
            لا توجد طلبات حالياً.
          </p>
        ) : (
          <div className="divide-y">
            {requests.map(request => (
              <button
                key={request.id}
                onClick={() => setSelected(request)}
                className="w-full text-right p-4 hover:bg-muted/50 transition"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {request.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {request.governorate} - {request.district}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(request.created_at).toLocaleDateString("ar-IQ")}
                    </p>
                  </div>

                  <span className="text-xs rounded-full border px-3 py-1 h-fit">
                    {request.status === "pending"
                      ? "قيد المراجعة"
                      : request.status === "approved"
                      ? "مقبول"
                      : "مرفوض"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-background p-6 space-y-5">

            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">
                تفاصيل الطلب
              </h2>

              <button
                onClick={() => setSelected(null)}
                className="rounded-lg border px-3 py-2"
              >
                إغلاق
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <p><strong>الاسم:</strong> {selected.full_name}</p>
              <p><strong>الهاتف:</strong> {selected.phone}</p>
              <p><strong>المحافظة:</strong> {selected.governorate}</p>
              <p><strong>القضاء:</strong> {selected.district}</p>
              <p><strong>التحصيل الدراسي:</strong> {selected.education_level}</p>

              <div>
                <strong>سبب الانضمام:</strong>
                <p className="mt-2 whitespace-pre-wrap">
                  {selected.reason}
                </p>
              </div>
            </div>

            <button
              onClick={() => viewIdentity(selected.id_photo_path)}
              className="w-full rounded-xl border p-3"
            >
              عرض صورة البطاقة (للمخولين فقط)
            </button>

            {selected.status === "pending" && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => updateStatus(selected, "approved")}
                  className="rounded-xl bg-green-600 text-white p-3"
                >
                  الموافقة
                </button>

                <button
                  onClick={() => updateStatus(selected, "rejected")}
                  className="rounded-xl bg-red-600 text-white p-3"
                >
                  رفض الطلب
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </main>
  );
}
