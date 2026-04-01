import { LegalDisclaimer } from "@/components/legal-disclaimer";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/profile-form";
import { getUserPreferences } from "@/lib/data";

export default async function SettingsPage() {
  const preferences = await getUserPreferences();

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Profile & Settings"
        description="Tune marketplace and budget preferences to personalize recommendation ranking."
      />

      <LegalDisclaimer />
      <ProfileForm initial={preferences} />
    </div>
  );
}
