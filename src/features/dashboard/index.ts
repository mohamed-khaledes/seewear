/**
 * Public surface of the dashboard feature. Client-safe.
 * Pages and data access live in `@/features/dashboard/server`.
 */
export { DashboardSidebar } from "./components/dashboard-sidebar";
export { DashboardTopbar } from "./components/dashboard-topbar";
export { KpiCard } from "./components/kpi-card";
export { Panel, EmptyPanelState } from "./components/panel";
export { useDemoGuard } from "./hooks/use-demo-guard";
export * from "./types";
