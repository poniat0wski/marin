"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { UserPreferences } from "@/lib/types";

export function ProfileForm({ initial }: { initial: UserPreferences }) {
  const [prefs, setPrefs] = useState(initial);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const categoryText = prefs.categories.join(", ");
  const brandText = prefs.brands.join(", ");

  const profileStrength = useMemo(() => {
    let score = 0;
    if (prefs.marketplace) score += 20;
    if (prefs.categories.length > 0) score += 20;
    if (prefs.brands.length > 0) score += 20;
    if (prefs.budgetMax > prefs.budgetMin) score += 20;
    if (prefs.preferredUngatingType) score += 20;

    return score;
  }, [prefs]);

  const saveProfile = () => {
    setSavedAt(new Date().toLocaleString("en-US"));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seller preferences</CardTitle>
          <CardDescription>
            This profile controls personalization logic for recommendations and confidence weighting.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm text-slate-600">Marketplace</label>
            <Select
              value={prefs.marketplace}
              onChange={(event) => setPrefs((current) => ({ ...current, marketplace: event.target.value }))}
            >
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="DE">Germany</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-600">Experience level</label>
            <Select
              value={prefs.experienceLevel}
              onChange={(event) =>
                setPrefs((current) => ({
                  ...current,
                  experienceLevel: event.target.value as UserPreferences["experienceLevel"],
                }))
              }
            >
              <option value="new">New seller</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-600">Target categories (comma separated)</label>
            <Input
              value={categoryText}
              onChange={(event) =>
                setPrefs((current) => ({
                  ...current,
                  categories: event.target.value
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                }))
              }
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-600">Target brands (comma separated)</label>
            <Input
              value={brandText}
              onChange={(event) =>
                setPrefs((current) => ({
                  ...current,
                  brands: event.target.value
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                }))
              }
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-600">Budget minimum</label>
            <Input
              type="number"
              min={0}
              value={prefs.budgetMin}
              onChange={(event) =>
                setPrefs((current) => ({ ...current, budgetMin: Number(event.target.value) || 0 }))
              }
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-600">Budget maximum</label>
            <Input
              type="number"
              min={0}
              value={prefs.budgetMax}
              onChange={(event) =>
                setPrefs((current) => ({ ...current, budgetMax: Number(event.target.value) || 0 }))
              }
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm text-slate-600">Preferred ungating path</label>
            <Select
              value={prefs.preferredUngatingType}
              onChange={(event) =>
                setPrefs((current) => ({
                  ...current,
                  preferredUngatingType: event.target.value as UserPreferences["preferredUngatingType"],
                }))
              }
            >
              <option value="both">Both</option>
              <option value="auto">Auto-ungate</option>
              <option value="ten_unit">10-unit</option>
            </Select>
          </div>

          <div className="md:col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Profile completeness</p>
              <p className="text-xs text-slate-600">Higher completeness improves recommendation quality.</p>
            </div>
            <Badge variant={profileStrength >= 80 ? "high" : "medium"}>{profileStrength}%</Badge>
          </div>

          <div className="md:col-span-2 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {savedAt ? `Last saved: ${savedAt}` : "Changes are local in MVP until Supabase write APIs are enabled."}
            </p>
            <Button type="button" onClick={saveProfile}>
              Save preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
