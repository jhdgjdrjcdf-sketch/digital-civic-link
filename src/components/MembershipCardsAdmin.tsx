import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  RefreshCw,
  CreditCard,
  ShieldCheck,
  ShieldX,
  CalendarDays,
} from "lucide-react";

type MembershipCard = {
  id: string;
  membership_number: string;
  status: string;
  issued_at: string;
  expires_at: string | null;
  applicant_id: string;
};

export default function MembershipCardsAdmin() {
  const [cards, setCards] = useState<MembershipCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function loadCards() {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("membership_cards")
      .select(
        "id, membership_number, status, issued_at, expires_at, applicant_id",
      )
      .order("issued_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setCards([]);
    } else {
      setCards((data ?? []) as MembershipCard[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadCards();
  }, []);

  async function revokeCard(cardId: string) {
    const confirmed = window.confirm(
      "هل أنت متأكد من إلغاء بطاقة العضوية؟",
    );

    if (!confirmed) return;

    const { error: revokeError } = await supabase.rpc(
      "revoke_membership_card",
      { p_card_id: cardId },
    );

    if (revokeError) {
      setError(revokeError.message);
      return;
    }

    await loadCards();
  }

  const filteredCards = cards.filter((card) =>
    card.membership_number
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("ar-IQ");
  }

  return (
    <section className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold">
              إدارة بطاقات العضوية الرقمية
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            متابعة البطاقات الصادرة وحالات العضوية.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadCards()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            إجمالي البطاقات
          </p>
          <p className="mt-2 text-2xl font-bold">{cards.length}</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            البطاقات النشطة
          </p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {cards.filter((card) => card.status === "active").length}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            البطاقات الملغاة
          </p>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {cards.filter((card) => card.status === "revoked").length}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث برقم العضوية..."
          className="w-full rounded-lg border bg-background py-3 pr-10 pl-4 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-muted-foreground">
          جارٍ تحميل البطاقات...
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="rounded-xl border p-10 text-center text-muted-foreground">
          لا توجد بطاقات عضوية مطابقة.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[700px] text-right text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-4">رقم العضوية</th>
                <th className="p-4">تاريخ الإصدار</th>
                <th className="p-4">تاريخ الانتهاء</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">الإجراء</th>
              </tr>
            </thead>

            <tbody>
              {filteredCards.map((card) => (
                <tr key={card.id} className="border-t">
                  <td className="p-4 font-mono font-semibold" dir="ltr">
                    {card.membership_number}
                  </td>

                  <td className="p-4">
                    <span className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {formatDate(card.issued_at)}
                    </span>
                  </td>

                  <td className="p-4">
                    {card.expires_at
                      ? formatDate(card.expires_at)
                      : "غير محدد"}
                  </td>

                  <td className="p-4">
                    {card.status === "active" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-green-700">
                        <ShieldCheck className="h-4 w-4" />
                        نشطة
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-red-700">
                        <ShieldX className="h-4 w-4" />
                        ملغاة
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    {card.status === "active" && (
                      <button
                        type="button"
                        onClick={() => void revokeCard(card.id)}
                        className="rounded-lg border border-red-300 px-3 py-2 text-red-600 hover:bg-red-50"
                      >
                        إلغاء البطاقة
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}