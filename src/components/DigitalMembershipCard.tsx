import { useEffect, useState } from "react";
import QRCode from "qrcode";

type MembershipStatus = "active" | "pending" | "suspended" | "revoked";

interface DigitalMembershipCardProps {
  fullName: string;
  membershipNumber: string;
  issuedAt: string;
  status: MembershipStatus;
  verificationUrl: string;
}

const statusLabels: Record<MembershipStatus, string> = {
  active: "عضوية فعّالة",
  pending: "قيد المراجعة",
  suspended: "معلّقة",
  revoked: "ملغاة",
};

export default function DigitalMembershipCard({
  fullName,
  membershipNumber,
  issuedAt,
  status,
  verificationUrl,
}: DigitalMembershipCardProps) {
  const [qrCode, setQrCode] = useState("");
  const [qrError, setQrError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function generateQRCode() {
      try {
        const image = await QRCode.toDataURL(verificationUrl, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: "H",
          color: {
            dark: "#0B1F3A",
            light: "#FFFFFF",
          },
        });

        if (mounted) {
          setQrCode(image);
          setQrError(false);
        }
      } catch {
        if (mounted) {
          setQrError(true);
        }
      }
    }

    if (verificationUrl) {
      generateQRCode();
    }

    return () => {
      mounted = false;
    };
  }, [verificationUrl]);

  const formattedDate = new Intl.DateTimeFormat("ar-IQ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(issuedAt));

  async function copyMembershipNumber() {
    try {
      await navigator.clipboard.writeText(membershipNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      dir="rtl"
      className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
      aria-label="بطاقة العضوية الرقمية"
    >
      {/* Card Header */}
      <div className="relative overflow-hidden bg-[#0B1F3A] px-6 py-7 text-white">
        <div
          className="pointer-events-none absolute -left-12 -top-16 h-48 w-48 rounded-full border border-white/10"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -bottom-20 -right-10 h-52 w-52 rounded-full border border-white/10"
          aria-hidden="true"
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white/70">
                DIGITAL MEMBERSHIP CARD
              </p>
              <h2 className="mt-2 text-xl font-bold">
                بطاقة العضوية الرقمية
              </h2>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <span className="text-xl font-bold">DCL</span>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm text-white/65">اسم العضو</p>
            <h3 className="mt-2 text-2xl font-bold">{fullName}</h3>
          </div>
        </div>
      </div>

      {/* Membership Information */}
      <div className="space-y-5 p-6">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">
            رقم العضوية
          </p>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p
              dir="ltr"
              className="break-all text-lg font-bold tracking-wider text-[#0B1F3A]"
            >
              {membershipNumber}
            </p>

            <button
              type="button"
              onClick={copyMembershipNumber}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              aria-label="نسخ رقم العضوية"
            >
              {copied ? "تم النسخ" : "نسخ"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-500">تاريخ الإصدار</p>
            <p className="mt-2 text-sm font-bold text-slate-800">
              {formattedDate}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-500">حالة العضوية</p>
            <p className="mt-2 text-sm font-bold text-slate-800">
              {statusLabels[status] ?? "غير معروفة"}
            </p>
          </div>
        </div>

        {/* QR Verification */}
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <h4 className="font-bold text-[#0B1F3A]">
            التحقق من العضوية
          </h4>

          <p className="mt-1 text-center text-xs text-slate-500">
            امسح رمز QR للتحقق من صلاحية البطاقة
          </p>

          <div className="mt-4 flex h-48 w-48 items-center justify-center rounded-xl bg-white p-3">
            {qrCode ? (
              <img
                src={qrCode}
                alt="رمز QR للتحقق من العضوية"
                className="h-full w-full object-contain"
              />
            ) : (
              <p className="text-center text-xs text-slate-400">
                {qrError
                  ? "تعذر إنشاء رمز التحقق"
                  : "جارٍ إنشاء رمز QR..."}
              </p>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Digital Civic Link
          </p>
        </div>

        <div className="border-t border-slate-100 pt-4 text-center">
          <p className="text-xs text-slate-400">
            هذه البطاقة إلكترونية، وتخضع حالة العضوية للتحقق من قاعدة البيانات.
          </p>
        </div>
      </div>
    </section>
  );
}