import { Settings } from "lucide-react";

import { toEgp } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FLAT_CENTS,
  TAX_RATE,
} from "@/config/constants";
import { DashboardTopbar } from "@/features/dashboard/components/dashboard-topbar";
import { EmptyPanelState } from "@/features/dashboard/components/panel";
import { SettingsForm } from "@/features/dashboard/components/settings-form";
import { getAdminStoreSettings } from "@/features/dashboard/services/api/dashboard.server";
import type { StoreSettingsFormValues } from "@/features/dashboard/types";

export async function SettingsAdminPage({ isDemo }: { isDemo: boolean }) {
  const settings = await getAdminStoreSettings();

  if (!settings) {
    return (
      <>
        <DashboardTopbar title="Settings" subtitle="Store configuration" />
        <div className="px-5 py-6 lg:px-8">
          <EmptyPanelState
            icon={<Settings />}
            title="Settings are not in the database yet"
            body="Run the migrations against your Supabase project and this pane will fill in."
          />
        </div>
      </>
    );
  }

  const defaultValues: StoreSettingsFormValues = {
    storeName: settings.store_name ?? siteConfig.name,
    supportEmail: settings.support_email ?? siteConfig.support.email,
    supportPhone: settings.support_phone ?? "",
    announcement: settings.announcement ?? "",
    freeShippingThreshold: toEgp(
      settings.free_shipping_threshold_cents ?? FREE_SHIPPING_THRESHOLD_CENTS,
    ),
    shippingFlat: toEgp(settings.shipping_flat_cents ?? SHIPPING_FLAT_CENTS),
    taxRatePercent: Number(((settings.tax_rate ?? TAX_RATE) * 100).toFixed(2)),
  };

  return (
    <>
      <DashboardTopbar
        title="Settings"
        subtitle={isDemo ? "Demo session — changes are disabled" : "Store configuration"}
      />

      <div className="px-5 py-6 lg:px-8">
        <SettingsForm defaultValues={defaultValues} />
      </div>
    </>
  );
}
