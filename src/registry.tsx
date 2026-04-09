import { 
  Calculator, 
  TrendingUp, 
  LandPlot, 
  Gem, 
  PieChart, 
  Settings as SettingsIcon,
  LucideIcon
} from "lucide-react";
import React from "react";

// Lazy load components to keep the initial bundle small
const PlotCalculator = React.lazy(() => import("./components/PlotCalculator"));
const LoanAnalytics = React.lazy(() => import("./components/LoanAnalytics"));
const JewelLoan = React.lazy(() => import("./components/JewelLoan"));
const ITFiling = React.lazy(() => import("./components/ITFiling"));
const Settings = React.lazy(() => import("./components/Settings"));
const Dashboard = React.lazy(() => import("./components/Dashboard"));

export interface Module {
  id: string;
  label: string;
  icon: LucideIcon;
  component: React.LazyExoticComponent<any>;
  description: string;
  isFullWidth?: boolean;
}

export const APP_MODULES: Module[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: PieChart,
    component: Dashboard,
    description: "Welcome back to your futuristic financial command center.",
    isFullWidth: false
  },
  {
    id: "it-filing",
    label: "IT Filing",
    icon: Calculator,
    component: ITFiling,
    description: "Calculate your income tax liability and plan your filings.",
    isFullWidth: true
  },
  {
    id: "plot-calc",
    label: "Plot Purchase",
    icon: LandPlot,
    component: PlotCalculator,
    description: "Analyze plot purchase costs, registration, and market trends.",
    isFullWidth: true
  },
  {
    id: "loans",
    label: "Loan Analytics",
    icon: TrendingUp,
    component: LoanAnalytics,
    description: "Visualize loan repayment schedules and interest projections.",
    isFullWidth: true
  },
  {
    id: "jewel-loan",
    label: "Jewel Loan",
    icon: Gem,
    component: JewelLoan,
    description: "Calculate gold loan eligibility and interest rates.",
    isFullWidth: true
  },
  {
    id: "settings",
    label: "Settings",
    icon: SettingsIcon,
    component: Settings,
    description: "Configure your API keys, currency, and profile preferences.",
    isFullWidth: true
  }
];

export type TabId = typeof APP_MODULES[number]["id"];
