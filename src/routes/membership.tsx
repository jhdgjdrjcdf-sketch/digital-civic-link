import { createFileRoute } from "@tanstack/react-router";
import MembershipForm from "@/components/membership/MembershipForm";

export const Route = createFileRoute("/membership")({
  component: MembershipPage,
});

function MembershipPage() {
  return (
    <main dir="rtl" className="min-h-screen py-12 px-4">
      <div className="mx-auto max-w-3xl space-y-8">

        <header className="space-y-3 text-center">
          <p className="text-sm text-primary font-semibold">
            تجمع الفاو زاخو
          </p>

          <h1 className="text-4xl font-bold">
            طلب الانتماء
          </h1>

          <p className="text-muted-foreground">
            بوابة الانتساب والتواصل المؤسسي
          </p>
        </header>

        <div className="rounded-3xl border bg-card p-5 sm:p-8 shadow-sm">
          <MembershipForm />
        </div>

      </div>
    </main>
  );
}