import { Badge } from "@/components/ui/badge";
import type { ConfidenceLevel, RiskLevel, UngatingType, UpdateType } from "@/lib/types";

export function ConfidenceBadge({
  level,
  className,
}: {
  level: ConfidenceLevel;
  className?: string;
}) {
  const variant = level === "high" ? "high" : level === "medium" ? "medium" : "low";
  return (
    <Badge variant={variant} className={className}>
      Confidence: {level}
    </Badge>
  );
}

export function RiskBadge({
  level,
  className,
}: {
  level: RiskLevel;
  className?: string;
}) {
  const variant = level === "low" ? "high" : level === "medium" ? "medium" : "low";
  return (
    <Badge variant={variant} className={className}>
      Risk: {level}
    </Badge>
  );
}

export function UngatingBadge({
  type,
  className,
}: {
  type: UngatingType;
  className?: string;
}) {
  return (
    <Badge variant="info" className={className}>
      {type === "auto" ? "Auto-ungate" : "10-unit"}
    </Badge>
  );
}

export function UpdateBadge({
  type,
  className,
}: {
  type: UpdateType;
  className?: string;
}) {
  const variant = type === "new" ? "high" : type === "updated" ? "info" : "low";
  return (
    <Badge variant={variant} className={className}>
      {type}
    </Badge>
  );
}
