import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function LegalDisclaimer() {
  return (
    <Card className="border-amber-200 bg-amber-50/80">
      <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Ungating approval is never guaranteed.</p>
          <p>
            This product is a decision-support system. Amazon approval depends on invoice quality,
            supplier legitimacy, account health, and changing marketplace requirements.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
