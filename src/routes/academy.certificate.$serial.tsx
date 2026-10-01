import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, CheckCircle2, Printer, XCircle } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingList } from "@/components/States";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/academy/certificate/$serial")({
  head: ({ params }) => ({
    meta: [
      { title: `Certificate ${params.serial} — أكاديمية القيادة` },
      { name: "description", content: "Digital certificate issued by the Leadership Academy, verifiable by QR code." },
      { property: "og:title", content: `Certificate ${params.serial} — أكاديمية القيادة` },
      { property: "og:description", content: "Verified digital certificate from the Leadership Academy." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CertificatePage,
});

type Verified = {
  valid: boolean;
  serial?: string;
  student?: string;
  course?: string;
  instructor?: string;
  issued_at?: string;
  hours?: number;
  score?: number;
};

function CertificatePage() {
  const { serial } = Route.useParams();
  const [qr, setQr] = useState("");
  const query = useQuery({
    queryKey: ["academy", "verify", serial],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_certificate", { _serial: serial });
      if (error) throw error;
      return data as unknown as Verified;
    },
  });

  useEffect(() => {
    const url = `${window.location.origin}/academy/certificate/${encodeURIComponent(serial)}`;
    QRCode.toDataURL(url, { margin: 1, width: 240 }).then(setQr).catch(() => setQr(""));
  }, [serial]);

  const c = query.data;
  return (
    <AppShell arabicTitle="أكاديمية القيادة" title="Certificate">
      {query.isPending ? (
        <LoadingList rows={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : !c?.valid ? (
        <EmptyState
          title="Certificate not found"
          description={`No valid certificate matches “${serial}”. Check the number and try again.`}
          action={<Button asChild size="sm" variant="outline"><Link to="/academy/verify">Try another number</Link></Button>}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-accent/15 p-3 text-sm font-semibold print:hidden">
            <CheckCircle2 className="size-5 text-accent" /> This certificate is valid
          </div>
          <article className="relative overflow-hidden rounded-2xl border-4 border-double border-accent bg-card p-6 text-center shadow-sm">
            <Award className="mx-auto size-10 text-accent" />
            <p className="mt-2 font-arabic text-lg font-bold">أكاديمية القيادة</p>
            <p className="text-xs tracking-widest text-muted-foreground uppercase">Certificate of completion</p>
            <p className="mt-5 text-xs text-muted-foreground">This certifies that</p>
            <p className="mt-1 text-2xl font-bold">{c.student || "Learner"}</p>
            <p className="mt-3 text-xs text-muted-foreground">has successfully completed</p>
            <p className="mt-1 text-lg font-semibold">{c.course}</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
              <Info label="Issued" value={c.issued_at ? new Date(c.issued_at).toLocaleDateString("en-GB") : "—"} />
              <Info label="Hours" value={String(c.hours ?? 0)} />
              <Info label="Score" value={`${c.score ?? 100}%`} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Instructor: {c.instructor}</p>
            {qr ? <img src={qr} alt="QR code to verify this certificate" className="mx-auto mt-4 size-28" /> : null}
            <p className="mt-2 font-mono text-xs">{c.serial}</p>
          </article>
          <Button className="w-full print:hidden" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> Print or save as PDF
          </Button>
        </div>
      )}
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

export { XCircle };
