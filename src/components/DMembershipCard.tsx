
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, ShieldCheck, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type MembershipCardRecord = {
  id: string;
  member_name: string;
  membership_number: string;
  verification_token: string;
  status: "active" | "revoked";
  issued_at: string;
  expires_at: string | null;
};

export default function DigitalMembershipCard() {
  const [card, setCard] = useState<MembershipCardRecord | null>(null);
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadCard() {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        if (alive) {
          setError("يرجى تسجيل الدخول لعرض البطاقة.");
          setLoading(false);
        }
        return;
      }

      const { data, error: queryError } = await supabase
        .from("membership_cards")
        .select(
          "id, member_name, membership_number, verification_token, status, issued_at, expires_at"
        )
        .eq("applicant_id", auth.user.id)
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!alive) return;

      if (queryError) {
        setError("تعذر تحميل البطاقة حالياً.");
        setLoading(false);
        return;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      const verificationUrl =
        `${window.location.origin}/membership/verify/${data.verification_token}`;

      const qrData = await QRCode.toDataURL(verificationUrl, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: "M",
        color: {
          dark: "#102b25",
          light: "#ffffff",
        },
      });

      if (!alive) return;

      setCard(data as MembershipCardRecord);
      setQr(qrData);
      setLoading(false);
    }

    loadCard();

    return () => {
      alive = false;
    };
  }, []);

  const downloadQr = () => {
    if (!qr || !card) return;

    const anchor = document.createElement("a");
    anchor.href = qr;
    anchor.download = `${card.membership_number}-qr.png`;
    anchor.click();
  };

  if (loading) {
    return (
      <div className="membership-panel animate-pulse">
        جارٍ تحميل البطاقة...
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="membership-error">
        {error}
      </p>
    );
  }

  if (!card) {
    return (
      <section className="membership-panel" dir="rtl">
        <div className="membership-empty-icon">
          <CreditCard />
        </div>
        <h2>لا توجد بطاقة صادرة حتى الآن</h2>
        <p>تظهر البطاقة هنا بعد اعتماد الطلب من الإدارة.</p>
      </section>
    );
  }

  const active =
    card.status === "active" &&
    (!card.expires_at || new Date(card.expires_at) > new Date());

  return (
    <section className="membership-card-wrap" dir="rtl">
      <article className="membership-card">
        <div className="membership-card-pattern" aria-hidden="true" />

        <div className="membership-card-top">
          <div className="membership-seal">
            <ShieldCheck size={25} />
          </div>

          <div>
            <p className="membership-card-kicker">
              DIGITAL MEMBERSHIP
            </p>
            <h2>بطاقة العضوية الرقمية</h2>
            <p className="membership-card-org">
              تجمع الفاو زاخو
            </p>
          </div>

          <span className="membership-card-mark">DCL</span>
        </div>

        <div className="membership-card-main">
          <div>
            <span className="membership-card-label">
              اسم العضو
            </span>
            <h3>{card.member_name}</h3>

            <span className="membership-card-label">
              رقم العضوية
            </span>

            <strong className="membership-number" dir="ltr">
              {card.membership_number}
            </strong>
          </div>

          <div className="membership-qr">
            <img
              src={qr}
              alt="رمز QR للتحقق من البطاقة"
            />
            <small>امسح للتحقق</small>
          </div>
        </div>

        <div className="membership-card-bottom">
          <span
            className={
              active
                ? "membership-status active"
                : "membership-status revoked"
            }
          >
            {active ? "عضوية سارية" : "غير سارية"}
          </span>

          <span>
            تاريخ الإصدار:{" "}
            {new Date(card.issued_at).toLocaleDateString("ar-IQ")}
          </span>
        </div>
      </article>

      <div className="membership-card-actions">
        <button
          type="button"
          onClick={downloadQr}
          className="membership-download"
        >
          <Download size={17} />
          تنزيل رمز التحقق
        </button>

        <p>
          لا تشارك رمز QR مع الآخرين؛ فهو يتيح التحقق من حالة البطاقة.
        </p>
      </div>
    </section>
  );
}
