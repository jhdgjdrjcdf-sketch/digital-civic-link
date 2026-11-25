import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import MembershipForm from "@/components/MembershipForm";

export const Route = createFileRoute("/membership")({
  component: MembershipPage,
  staticData: { sitemap: false },
});

function MembershipPage() {
  return (
    <main className="membership-page" dir="rtl">
      <div className="membership-page-inner">
        <header className="membership-hero">
          <div className="membership-hero-top">
            <span className="membership-brand">
              <ShieldCheck size={18} /> DIGITAL CIVIC LINK
            </span>
            <span className="membership-live">
              <i /> بوابة الخدمات الرقمية
            </span>
          </div>

          <span className="membership-eyebrow">
            <Sparkles size={14} /> MEMBERSHIP SERVICES
          </span>

          <h1>قسم الانتماء</h1>

          <p>
            بوابة رقمية آمنة لإدارة طلبات العضوية ومتابعة حالة الطلب
            والبطاقة الإلكترونية.
          </p>

          <div className="membership-hero-actions">
            <Link
              to="/membership/card"
              className="membership-primary-link"
            >
              عرض بطاقتي <ArrowLeft size={16} />
            </Link>

            <span className="membership-trust">
              <ShieldCheck size={15} />
              بياناتك محمية بصلاحيات وصول محددة
            </span>
          </div>

          <div className="membership-orb orb-one" />
          <div className="membership-orb orb-two" />
        </header>

        <section className="membership-content-grid">
          <aside className="membership-info">
            <span className="membership-eyebrow">
              HOW IT WORKS
            </span>

            <h2>خطوات واضحة وتجربة رقمية</h2>

            <ol>
              <li>
                <b>01</b>
                <span>
                  <strong>إرسال الطلب</strong>
                  <small>أكمل بيانات الطلب المطلوبة.</small>
                </span>
              </li>

              <li>
                <b>02</b>
                <span>
                  <strong>المراجعة الإدارية</strong>
                  <small>تظهر حالة الطلب بعد مراجعته.</small>
                </span>
              </li>

              <li>
                <b>03</b>
                <span>
                  <strong>إصدار البطاقة</strong>
                  <small>تُنشأ البطاقة تلقائياً عند الموافقة.</small>
                </span>
              </li>
            </ol>

            <div className="membership-info-note">
              <ShieldCheck size={18} />
              <p>
                رمز QR مخصص للتحقق من حالة البطاقة، ولا يكشف
                وثائق الهوية أو بيانات الاتصال.
              </p>
            </div>
          </aside>

          <section className="membership-form-panel">
            <div className="membership-form-heading">
              <span className="membership-eyebrow">
                APPLICATION
              </span>
              <h2>طلب الانتماء</h2>
              <p>يرجى إدخال المعلومات المطلوبة بدقة.</p>
            </div>

            <MembershipForm />
          </section>
        </section>
      </div>
    </main>
  );
}