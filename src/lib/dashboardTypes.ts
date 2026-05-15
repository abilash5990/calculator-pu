export type ActivityKind = "loan" | "it" | "jewel" | "plot" | "system";

export type DashboardNotification = {
  id: string;
  type: "success" | "warning" | "danger" | "info";
  title: string;
  message: string;
  createdAt: string;
};

export type DashboardPayload = {
  refreshedAt: string;
  lastSheetsReadAt: string | null;
  sheetsConfigured: boolean;
  sheetsError: string | null;
  googleSheetsStatus: "synced" | "not_configured" | "error";
  telegramStatus: "connected" | "not_connected";
  financialYear: string;
  kpis: {
    totalLoanPrincipal: number;
    activeLoanCases: number;
    monthlyTaxEstimate: number | null;
    plotRatePerSqft: number | null;
    estimatedTaxFromLatestIT: number | null;
    totalJewelLoanValue: number;
    totalPlotInvestment: number;
    totalSavedRecords: number;
    monthActivityCount: number;
    pendingMonthlyEmi: number;
    totalAssets: number;
    netPosition: number;
  };
  health: { score: number; status: string; risk: string; suggestion: string };
  insights: string[];
  chartSeries: { day: string; count: number }[];
  chartSeries30d: { day: string; count: number }[];
  assetBreakdown: { name: string; value: number }[];
  activity: { id: string; kind: ActivityKind; title: string; subtitle: string; createdAt: string }[];
  recentRecords: {
    id: string;
    source: string;
    label: string;
    detail: string;
    amountLabel: string;
    status: string;
    updatedAt: string;
  }[];
  notifications: DashboardNotification[];
  moduleErrors: Record<string, string>;
};

export type ChartRange = "7d" | "30d";

export const AI_PROMPT_KEY = "finance_hub_ai_prompt";
