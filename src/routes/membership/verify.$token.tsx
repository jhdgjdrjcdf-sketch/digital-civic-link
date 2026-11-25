import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";

type Verification = {
  membership_number: string;
  status: "active" | "revoked" | "expired";
  issued_at: string;
  expires_at: string | null;
  is_valid: boolean;
  message: string;
};

export const Route = createFileRoute("/membership/verify/$token")({
  component: VerifyMembershipPage,
  staticData: { sitemap: false },
});

function VerifyMembershipPage() {
  const { token } = Route.useParams();
  const [result, setResult] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const api = import.meta.env.VITE_MEMBERSHIP_API_URL;

    if (!api || !/^[a-f0-9]{64}$/i.test(token)) {
      setLoading(false);
      return;
    }

    fetch(`${api.replace(/\/$/, "")}/v1/membership/verify/${token}`)
      .then(response => response.ok ? response.json() : null)
      .then(data => setResult(data))
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <main className="membership-page" dir="rtl">
      <section className="membership-verify-panel">
        <div className="membership-verify-brand">DCL</div>
        <span className="membership-eyebrow">
          OFFICIAL CARD VERIFICATION
        </span>

        <h1>التحقق من بطاقة العضوية</h1>

        {loading ? (
          <p>جارٍ التحقق من البطاقة...</p>
        ) : result ? (
          <>
            <div className={result.is_valid ? "verify-state valid" : "verify-state invalid"}>
              {result.is_valid ? <CheckCircle2 /> : <ShieldAlert />}
              <strong>
                {result.is_valid ? "بطاقة صالحة" : "بطاقة غير سارية"}
              </strong>
            </div>

            <dl className="verify-details">
              <div>
                <dt>رقم العضوية</dt>
                <dd dir="ltr">{result.membership_number}</dd>
              </div>
              <div>
                <dt>الحالة</dt>
                <dd>
                  {result.status === "active"
                    ? "سارية"
                    : result.status === "revoked"
                      ? "ملغاة"
                      : "منتهية"}
                </dd>
              </div>
              <div>
                <dt>تاريخ الإصدار</dt>
                <dd>
                  {new Date(result.issued_at).toLocaleDateString("ar-IQ")}
                </dd>
              </div>

              {result.expires_at && (
                <div>
                  <dt>تاريخ الانتهاء</dt>
                  <dd>
                    {new Date(result.expires_at).toLocaleDateString("ar-IQ")}
                  </dd>
                </div>
              )}
            </dl>
          </>
        ) : (
          <div className="verify-state invalid">
            <ShieldAlert />
            <strong>تعذر التحقق من البطاقة</strong>
          </div>
        )}

        <p className="membership-privacy-note">
          تعرض هذه الصفحة بيانات تحقق محدودة فقط، ولا تعرض اسم العضو
          أو رقم هاتفه أو وثائق هويته.
        </p>
      </section>
    </main>
  );
}