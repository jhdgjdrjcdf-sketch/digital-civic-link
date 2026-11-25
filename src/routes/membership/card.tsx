import { createFileRoute, Link } from "@tanstack/react-router";
import DigitalMembershipCard from "@/components/DigitalMembershipCard";

export const Route = createFileRoute("/membership/card")({
  component: MembershipCardPage,
  staticData: { sitemap: false },
});

function MembershipCardPage() {
  return (
    <main className="membership-page" dir="rtl">
      <div className="membership-page-inner">
        <Link to="/membership" className="membership-back">
          العودة إلى قسم الانتماء
        </Link>

        <header className="membership-hero">
          <span className="membership-eyebrow">DIGITAL IDENTITY</span>
          <h1>بطاقتك الرقمية</h1>
          <p>
            بطاقة إلكترونية للتحقق من حالة العضوية وتاريخ إصدارها.
          </p>
        </header>

        <DigitalMembershipCard />
      </div>
    </main>
  );
}