import Link from "next/link";

import { LegalDisclaimer } from "@/components/legal-disclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const faqItems = [
  {
    q: "Does this guarantee ungating approval?",
    a: "No. Approval is never guaranteed. This platform helps prioritize promising options using confidence and risk signals.",
  },
  {
    q: "What makes a recommendation useful?",
    a: "Each product includes supplier source notes, invoice quality context, estimated quantity, risk level, and the latest validation timestamp.",
  },
  {
    q: "How often does data update?",
    a: "Recommendation lists and update labels refresh daily. New, updated, and removed changes are tracked in the updates feed.",
  },
  {
    q: "What invoice details matter most?",
    a: "Supplier and buyer details, itemized quantities, pricing, and dates should be present and consistent with your Seller Central business details.",
  },
  {
    q: "Can Amazon requirements change?",
    a: "Yes. Amazon can change ungating requirements at any time, which is why every recommendation includes validation timestamps and risk context.",
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
        ? Back to landing
      </Link>

      <div className="mt-6 space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">Help & FAQ</h1>
        <p className="text-slate-600">
          Guidance for using recommendations responsibly when planning ungating attempts.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {faqItems.map((item) => (
          <Card key={item.q}>
            <CardHeader>
              <CardTitle>{item.q}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700">{item.a}</CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <LegalDisclaimer />
      </div>
    </main>
  );
}
