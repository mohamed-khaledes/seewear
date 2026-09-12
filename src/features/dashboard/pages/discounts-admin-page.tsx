import { Tags } from "lucide-react";

import { DashboardTopbar } from "@/features/dashboard/components/dashboard-topbar";
import { DiscountsManager } from "@/features/dashboard/components/discounts-manager";
import { EmptyPanelState } from "@/features/dashboard/components/panel";
import { getDiscounts } from "@/features/dashboard/services/api/dashboard.server";

export async function DiscountsAdminPage() {
  const codes = await getDiscounts();

  return (
    <>
      <DashboardTopbar
        title="Discounts"
        subtitle={`${codes.filter((code) => code.active).length} active of ${codes.length}`}
      />

      <div className="px-5 py-6 lg:px-8">
        {codes.length === 0 ? (
          <div className="grid gap-4">
            <DiscountsManager codes={[]} />
            <EmptyPanelState
              icon={<Tags />}
              title="No codes yet"
              body="Create one and it becomes valid at checkout straight away."
            />
          </div>
        ) : (
          <DiscountsManager codes={codes} />
        )}
      </div>
    </>
  );
}
