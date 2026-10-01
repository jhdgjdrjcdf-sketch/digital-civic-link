import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/academy/verify")({
  head: () => ({
    meta: [
      { title: "Verify a certificate — أكاديمية القيادة" },
      { name: "description", content: "Check whether a Leadership Academy certificate is valid." },
      { property: "og:title", content: "Verify a certificate — أكاديمية القيادة" },
      { property: "og:description", content: "Check whether a Leadership Academy certificate is valid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const [serial, setSerial] = useState("");
  return (
    <AppShell arabicTitle="أكاديمية القيادة" title="Verify a certificate">
      <form
        className="card-soft space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const value = serial.trim().toUpperCase();
          if (value) navigate({ to: "/academy/certificate/$serial", params: { serial: value } });
        }}
      >
        <p className="text-sm text-muted-foreground">
          Enter the certificate number (for example FZ-2026-AB12CD34) or scan the QR code on the certificate.
        </p>
        <Input value={serial} maxLength={40} onChange={(e) => setSerial(e.target.value)} placeholder="FZ-2026-…" />
        <Button type="submit" className="w-full">Check certificate</Button>
      </form>
    </AppShell>
  );
}
