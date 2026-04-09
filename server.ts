import express from "express";
import http from "http";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { verifyDbConnection, queryRows } from "./src/lib/db";

dotenv.config();

type LoanRecord = {
  id: string;
  loanAmount: number;
  interestRate: number;
  tenure: number;
  emi: number;
  totalInterest: number;
  totalPayment: number;
  createdAt: string;
};

type LoanInput = {
  loanAmount: number;
  interestRate: number;
  tenure: number;
};

type ITFilingRecord = {
  id: string;
  income: number;
  deductions: number;
  regime: "old" | "new";
  tax: number;
  monthlyTax: number;
  takeHomeMonthly: number;
  createdAt: string;
};

type ITFilingInput = {
  income: number;
  deductions: number;
  regime: "old" | "new";
};

type JewelLoanRecord = {
  id: string;
  weight: number;
  purity: number;
  marketRate: number;
  loanLTV: number;
  interestRate: number;
  goldValue: number;
  loanAmount: number;
  monthlyInterest: number;
  createdAt: string;
};

type JewelLoanInput = {
  weight: number;
  purity: number;
  marketRate: number;
  loanLTV: number;
  interestRate: number;
};

type PlotPurchaseRecord = {
  id: string;
  area: number;
  rate: number;
  registrationPercent: number;
  otherExpenses: number;
  totalCost: number;
  registrationCost: number;
  otherCosts: number;
  perSqftCost: number;
  createdAt: string;
};

type PlotPurchaseInput = {
  area: number;
  rate: number;
  registrationPercent: number;
  otherExpenses: number;
};

type ThemePreference = "system" | "dark" | "light";

type AppSettings = {
  profile: {
    userName: string;
  };
  preferences: {
    defaultCurrency: "INR" | "USD" | "EUR" | "GBP";
    theme: ThemePreference;
    defaultModule: "dashboard" | "it-filing" | "plot-calc" | "loans" | "jewel-loan";
  };
  integrations: {
    googleSheetId: string;
    autoSyncEnabled: boolean;
    telegramConfigured: boolean;
  };
};

const SETTINGS_FILE_PATH = path.join(process.cwd(), "data", "settings.json");

const DB_TABLES = {
  loans: safeTableName(process.env.DB_TABLE_LOANS || "loan_analytics"),
  itFiling: safeTableName(process.env.DB_TABLE_IT_FILING || "it_filing"),
  jewelLoan: safeTableName(process.env.DB_TABLE_JEWEL_LOAN || "jewel_loan"),
  plotPurchase: safeTableName(process.env.DB_TABLE_PLOT_PURCHASE || "plotcalculator"),
};

function safeTableName(value: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe table name configured: ${value}`);
  }
  return value;
}

function computeLoan(input: LoanInput) {
  const { loanAmount, interestRate, tenure } = input;
  const monthlyRate = interestRate / 12 / 100;
  const numPayments = tenure * 12;
  const emiFloat =
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  const emi = Math.round(emiFloat);
  const totalPayment = emi * numPayments;
  const totalInterest = totalPayment - loanAmount;
  return { emi, totalPayment, totalInterest };
}

function computeITFiling(input: ITFilingInput) {
  const { income, deductions, regime } = input;
  const taxableIncome = Math.max(0, income - (regime === "old" ? deductions : 0)) ?? 0;
  let calculatedTax = 0;

  if (regime === "new") {
    if (taxableIncome <= 300000) calculatedTax = 0;
    else if (taxableIncome <= 600000) calculatedTax = (taxableIncome - 300000) * 0.05;
    else if (taxableIncome <= 900000) calculatedTax = 15000 + (taxableIncome - 600000) * 0.1;
    else if (taxableIncome <= 1200000) calculatedTax = 45000 + (taxableIncome - 900000) * 0.15;
    else if (taxableIncome <= 1500000) calculatedTax = 90000 + (taxableIncome - 1200000) * 0.2;
    else calculatedTax = 150000 + (taxableIncome - 1500000) * 0.3;
    if (taxableIncome <= 700000) calculatedTax = 0;
  } else {
    if (taxableIncome <= 250000) calculatedTax = 0;
    else if (taxableIncome <= 500000) calculatedTax = (taxableIncome - 250000) * 0.05;
    else if (taxableIncome <= 1000000) calculatedTax = 12500 + (taxableIncome - 500000) * 0.2;
    else calculatedTax = 112500 + (taxableIncome - 1000000) * 0.3;
    if (taxableIncome <= 500000) calculatedTax = 0;
  }

  const tax = calculatedTax * 1.04;
  const monthlyTax = tax / 12;
  const takeHomeMonthly = (income - tax) / 12;
  return { tax, monthlyTax, takeHomeMonthly };
}

function computeJewelLoan(input: JewelLoanInput) {
  const { weight, purity, marketRate, loanLTV, interestRate } = input;
  const goldValue = weight * marketRate * (purity / 24);
  const loanAmount = (goldValue * loanLTV) / 100;
  const monthlyInterest = (loanAmount * (interestRate / 100)) / 12;
  return { goldValue, loanAmount, monthlyInterest };
}

function computePlotPurchase(input: PlotPurchaseInput) {
  const { area, rate, registrationPercent, otherExpenses } = input;
  const baseCost = area * rate;
  const registrationCost = (baseCost * registrationPercent) / 100;
  const totalCost = baseCost + registrationCost + otherExpenses;
  const perSqftCost = totalCost / area;
  return { totalCost, registrationCost, otherCosts: otherExpenses, perSqftCost };
}

function defaultSettings(): AppSettings {
  return {
    profile: { userName: "Finance Hub User" },
    preferences: {
      defaultCurrency: "INR",
      theme: "system",
      defaultModule: "dashboard",
    },
    integrations: {
      googleSheetId: "",
      autoSyncEnabled: true,
      telegramConfigured: false,
    },
  };
}

function sanitizeSettings(input: unknown, base?: AppSettings): AppSettings {
  const seed = base ?? defaultSettings();
  const raw = (input ?? {}) as Record<string, any>;
  const profile = (raw.profile ?? {}) as Record<string, any>;
  const preferences = (raw.preferences ?? {}) as Record<string, any>;
  const integrations = (raw.integrations ?? {}) as Record<string, any>;

  const currencyRaw = String(preferences.defaultCurrency ?? seed.preferences.defaultCurrency).toUpperCase();
  const defaultCurrency: AppSettings["preferences"]["defaultCurrency"] =
    currencyRaw === "USD" || currencyRaw === "EUR" || currencyRaw === "GBP" ? currencyRaw : "INR";

  const themeRaw = String(preferences.theme ?? seed.preferences.theme);
  const theme: ThemePreference = themeRaw === "dark" || themeRaw === "light" ? themeRaw : "system";

  const moduleRaw = String(preferences.defaultModule ?? seed.preferences.defaultModule);
  const defaultModule: AppSettings["preferences"]["defaultModule"] =
    moduleRaw === "it-filing" || moduleRaw === "plot-calc" || moduleRaw === "loans" || moduleRaw === "jewel-loan"
      ? moduleRaw
      : "dashboard";

  return {
    profile: {
      userName: String(profile.userName ?? seed.profile.userName).trim() || "Finance Hub User",
    },
    preferences: { defaultCurrency, theme, defaultModule },
    integrations: {
      googleSheetId: String(integrations.googleSheetId ?? seed.integrations.googleSheetId).trim(),
      autoSyncEnabled:
        typeof integrations.autoSyncEnabled === "boolean"
          ? integrations.autoSyncEnabled
          : seed.integrations.autoSyncEnabled,
      telegramConfigured:
        typeof integrations.telegramConfigured === "boolean"
          ? integrations.telegramConfigured
          : seed.integrations.telegramConfigured,
    },
  };
}

function legacySettingsToModern(input: unknown): Partial<AppSettings> {
  const raw = (input ?? {}) as Record<string, any>;
  return {
    profile: { userName: String(raw.userName ?? "") },
    preferences: {
      defaultCurrency: String(raw.defaultCurrency ?? "INR") as AppSettings["preferences"]["defaultCurrency"],
      theme: "system",
      defaultModule: "dashboard",
    },
    integrations: {
      googleSheetId: "",
      autoSyncEnabled: true,
      telegramConfigured: false,
    },
  };
}

async function readSettingsFromDisk(): Promise<AppSettings> {
  const defaults = defaultSettings();
  try {
    const raw = await fs.readFile(SETTINGS_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const parsedObj = parsed as Record<string, any>;
    const looksLegacy =
      parsedObj != null &&
      typeof parsedObj === "object" &&
      ("userName" in parsedObj || "defaultCurrency" in parsedObj);
    if (looksLegacy) return sanitizeSettings(legacySettingsToModern(parsed), defaults);
    return sanitizeSettings(parsed, defaults);
  } catch {
    return defaults;
  }
}

async function writeSettingsToDisk(settings: AppSettings): Promise<void> {
  const folder = path.dirname(SETTINGS_FILE_PATH);
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), "utf8");
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      message: "Futuristic Finance Hub API is active",
      loanApi: "ready",
    });
  });

  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  let appSettings: AppSettings = await readSettingsFromDisk();
  let dbReady = false;
  let dbError: string | null = null;
  let lastDbReadAt: string | null = null;

  function asNumber(row: Record<string, any>, key: string, fallbackKey?: string): number {
    const raw = row[key] ?? (fallbackKey ? row[fallbackKey] : undefined);
    return Number(raw);
  }

  function asString(row: Record<string, any>, key: string, fallbackKey?: string): string {
    const raw = row[key] ?? (fallbackKey ? row[fallbackKey] : undefined);
    if (raw instanceof Date) return raw.toISOString();
    return String(raw ?? "");
  }

  async function initDb() {
    try {
      await verifyDbConnection();
      dbReady = true;
      dbError = null;
    } catch (e: any) {
      dbReady = false;
      dbError = e?.message ?? "Failed to initialize MySQL";
      console.error("MySQL init failed:", e);
    }
  }

  function settingsStatus() {
    const telegramConnected =
      Boolean(String(process.env.TELEGRAM_BOT_TOKEN ?? "").trim()) || appSettings.integrations.telegramConfigured;
    const googleSheetsStatus =
      dbReady ? ("connected" as const) : dbError ? ("error" as const) : ("not_connected" as const);
    return {
      googleSheetsStatus,
      telegramStatus: telegramConnected ? ("connected" as const) : ("not_connected" as const),
      lastSheetsReadAt: lastDbReadAt,
      sheetsError: dbError,
    };
  }

  async function fetchLoanRecordsForDashboard(): Promise<LoanRecord[]> {
    const rows = await queryRows<Record<string, any>>(
      `SELECT * FROM \`${DB_TABLES.loans}\` ORDER BY createdAt DESC`,
    );
    const records: LoanRecord[] = [];
    for (const row of rows) {
      const record: LoanRecord = {
        id: asString(row, "id"),
        loanAmount: asNumber(row, "loanAmount", "loan_amount"),
        interestRate: asNumber(row, "interestRate", "interest_rate"),
        tenure: asNumber(row, "tenure"),
        emi: asNumber(row, "emi"),
        totalInterest: asNumber(row, "totalInterest", "total_interest"),
        totalPayment: asNumber(row, "totalPayment", "total_payment"),
        createdAt: asString(row, "createdAt", "created_at"),
      };
      if (
        !record.id ||
        ![record.loanAmount, record.interestRate, record.tenure, record.emi, record.totalInterest, record.totalPayment].every(
          Number.isFinite,
        )
      ) {
        continue;
      }
      records.push(record);
    }
    return records;
  }

  async function fetchITRecordsForDashboard(): Promise<ITFilingRecord[]> {
    const rows = await queryRows<Record<string, any>>(
      `SELECT * FROM \`${DB_TABLES.itFiling}\` ORDER BY createdAt DESC`,
    );
    const records: ITFilingRecord[] = [];
    for (const row of rows) {
      const regimeRaw = asString(row, "regime").toLowerCase();
      const regime = regimeRaw === "old" ? "old" : "new";
      const record: ITFilingRecord = {
        id: asString(row, "id"),
        income: asNumber(row, "income"),
        deductions: asNumber(row, "deductions"),
        regime,
        tax: asNumber(row, "tax"),
        monthlyTax: asNumber(row, "monthlyTax", "monthly_tax"),
        takeHomeMonthly: asNumber(row, "takeHomeMonthly", "take_home_monthly"),
        createdAt: asString(row, "createdAt", "created_at"),
      };
      if (!record.id || ![record.income, record.deductions, record.tax, record.monthlyTax, record.takeHomeMonthly].every(Number.isFinite)) {
        continue;
      }
      records.push(record);
    }
    return records;
  }

  async function fetchJewelRecordsForDashboard(): Promise<JewelLoanRecord[]> {
    const rows = await queryRows<Record<string, any>>(
      `SELECT * FROM \`${DB_TABLES.jewelLoan}\` ORDER BY createdAt DESC`,
    );
    const records: JewelLoanRecord[] = [];
    for (const row of rows) {
      const record: JewelLoanRecord = {
        id: asString(row, "id"),
        weight: asNumber(row, "weight"),
        purity: asNumber(row, "purity"),
        marketRate: asNumber(row, "marketRate", "market_rate"),
        loanLTV: asNumber(row, "loanLTV", "loan_ltv"),
        interestRate: asNumber(row, "interestRate", "interest_rate"),
        goldValue: asNumber(row, "goldValue", "gold_value"),
        loanAmount: asNumber(row, "loanAmount", "loan_amount"),
        monthlyInterest: asNumber(row, "monthlyInterest", "monthly_interest"),
        createdAt: asString(row, "createdAt", "created_at"),
      };
      if (
        !record.id ||
        ![record.weight, record.purity, record.marketRate, record.loanLTV, record.interestRate, record.goldValue, record.loanAmount, record.monthlyInterest].every(Number.isFinite)
      ) {
        continue;
      }
      records.push(record);
    }
    return records;
  }

  async function fetchPlotRecordsForDashboard(): Promise<PlotPurchaseRecord[]> {
    const rows = await queryRows<Record<string, any>>(
      `SELECT * FROM \`${DB_TABLES.plotPurchase}\` ORDER BY createdAt DESC`,
    );
    const records: PlotPurchaseRecord[] = [];
    for (const row of rows) {
      const record: PlotPurchaseRecord = {
        id: asString(row, "id"),
        area: asNumber(row, "area"),
        rate: asNumber(row, "rate"),
        registrationPercent: asNumber(row, "registrationPercent", "registration_percent"),
        otherExpenses: asNumber(row, "otherExpenses", "other_expenses"),
        totalCost: asNumber(row, "totalCost", "total_cost"),
        registrationCost: asNumber(row, "registrationCost", "registration_cost"),
        otherCosts: asNumber(row, "otherCosts", "other_costs"),
        perSqftCost: asNumber(row, "perSqftCost", "per_sqft_cost"),
        createdAt: asString(row, "createdAt", "created_at"),
      };
      if (
        !record.id ||
        ![record.area, record.rate, record.registrationPercent, record.otherExpenses, record.totalCost, record.registrationCost, record.otherCosts, record.perSqftCost].every(Number.isFinite)
      ) {
        continue;
      }
      records.push(record);
    }
    return records;
  }

  apiRouter.get("/settings", (_req, res) => {
    return res.json({
      ok: true,
      message: "Settings loaded",
      settings: appSettings,
      status: settingsStatus(),
      error: null,
    });
  });

  apiRouter.put("/settings", async (req, res) => {
    try {
      appSettings = sanitizeSettings(req.body, appSettings);
      await writeSettingsToDisk(appSettings);
      return res.json({
        ok: true,
        message: "Settings updated",
        settings: appSettings,
        status: settingsStatus(),
        error: null,
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        message: "Failed to update settings",
        settings: appSettings,
        status: settingsStatus(),
        error: e?.message ?? "Internal server error",
      });
    }
  });

  apiRouter.post("/settings/connect-sheets", async (req, res) => {
    try {
      const googleSheetId = String(req.body?.googleSheetId ?? "").trim();
      appSettings = sanitizeSettings(
        {
          ...appSettings,
          integrations: {
            ...appSettings.integrations,
            googleSheetId,
          },
        },
        appSettings,
      );
      await writeSettingsToDisk(appSettings);
      return res.json({
        ok: true,
        message: "Settings updated (MySQL is active storage)",
        settings: appSettings,
        status: settingsStatus(),
        error: null,
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        message: "Failed to update settings",
        settings: appSettings,
        status: settingsStatus(),
        error: e?.message ?? "Internal server error",
      });
    }
  });

  apiRouter.post("/settings/connect-telegram", async (req, res) => {
    try {
      const configured = Boolean(String(req.body?.token ?? "").trim()) || appSettings.integrations.telegramConfigured;
      appSettings = sanitizeSettings(
        {
          ...appSettings,
          integrations: {
            ...appSettings.integrations,
            telegramConfigured: configured,
          },
        },
        appSettings,
      );
      await writeSettingsToDisk(appSettings);
      return res.json({
        ok: true,
        message: configured ? "Telegram status updated" : "Telegram status unchanged",
        settings: appSettings,
        status: settingsStatus(),
        error: null,
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        message: "Failed to update Telegram status",
        settings: appSettings,
        status: settingsStatus(),
        error: e?.message ?? "Internal server error",
      });
    }
  });

  apiRouter.post("/settings/sync", async (_req, res) => {
    try {
      await initDb();
      if (!dbReady) {
        return res.status(500).json({
          ok: false,
          message: "MySQL is not connected",
          settings: appSettings,
          status: settingsStatus(),
          error: dbError ?? "MySQL init failed",
        });
      }
      await Promise.allSettled([
        fetchLoanRecordsForDashboard(),
        fetchITRecordsForDashboard(),
        fetchJewelRecordsForDashboard(),
        fetchPlotRecordsForDashboard(),
      ]);
      lastDbReadAt = new Date().toISOString();
      return res.json({
        ok: true,
        message: "MySQL sync completed",
        settings: appSettings,
        status: settingsStatus(),
        error: null,
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        message: "Sync failed",
        settings: appSettings,
        status: settingsStatus(),
        error: e?.message ?? "Internal server error",
      });
    }
  });

  apiRouter.get("/dashboard", async (_req, res) => {
    const refreshedAt = new Date().toISOString();
    const telegramConnected = Boolean(String(process.env.TELEGRAM_BOT_TOKEN ?? "").trim());

    try {
      await initDb();
      if (!dbReady) {
        return res.json({
          refreshedAt,
          lastSheetsReadAt: lastDbReadAt,
          sheetsConfigured: false,
          sheetsError: dbError ?? "MySQL not configured",
          googleSheetsStatus: "not_configured" as const,
          telegramStatus: telegramConnected ? ("connected" as const) : ("not_connected" as const),
          kpis: {
            totalLoanPrincipal: 0,
            activeLoanCases: 0,
            monthlyTaxEstimate: null as number | null,
            plotRatePerSqft: null as number | null,
            estimatedTaxFromLatestIT: null as number | null,
          },
          chartSeries: [] as { day: string; count: number }[],
          activity: [] as {
            id: string;
            kind: "loan" | "it" | "jewel" | "plot";
            title: string;
            subtitle: string;
            createdAt: string;
          }[],
          recentRecords: [] as {
            id: string;
            source: string;
            label: string;
            detail: string;
            amountLabel: string;
            status: string;
            updatedAt: string;
          }[],
          moduleErrors: {} as Record<string, string>,
        });
      }

      let loans: LoanRecord[] = [];
      let itRecords: ITFilingRecord[] = [];
      let jewelRecords: JewelLoanRecord[] = [];
      let plotRecords: PlotPurchaseRecord[] = [];
      const moduleErrors: Record<string, string> = {};

      const results = await Promise.allSettled([
        fetchLoanRecordsForDashboard(),
        fetchITRecordsForDashboard(),
        fetchJewelRecordsForDashboard(),
        fetchPlotRecordsForDashboard(),
      ]);

      const labels = ["loans", "itFiling", "jewelLoan", "plotPurchase"] as const;
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          const v = r.value;
          if (i === 0) loans = v as LoanRecord[];
          else if (i === 1) itRecords = v as ITFilingRecord[];
          else if (i === 2) jewelRecords = v as JewelLoanRecord[];
          else plotRecords = v as PlotPurchaseRecord[];
        } else {
          moduleErrors[labels[i]] = r.reason?.message ?? "Failed to load";
        }
      });

      lastDbReadAt = refreshedAt;

      const totalLoanPrincipal = loans.reduce((s, l) => s + l.loanAmount, 0);
      const activeLoanCases = loans.length;
      const latestIT = itRecords[0];
      const monthlyTaxEstimate = latestIT != null ? latestIT.monthlyTax : null;
      const estimatedTaxFromLatestIT = latestIT != null ? latestIT.tax : null;
      const latestPlot = plotRecords[0];
      const plotRatePerSqft = latestPlot != null ? latestPlot.rate : null;

      const activity: {
        id: string;
        kind: "loan" | "it" | "jewel" | "plot";
        title: string;
        subtitle: string;
        createdAt: string;
      }[] = [];

      for (const l of loans.slice(0, 20)) {
        activity.push({
          id: `loan-${l.id}`,
          kind: "loan",
          title: "Loan calculation saved",
          subtitle: `Principal ${l.loanAmount.toLocaleString("en-IN")} · ${l.tenure}y @ ${l.interestRate}%`,
          createdAt: l.createdAt,
        });
      }
      for (const r of itRecords.slice(0, 20)) {
        activity.push({
          id: `it-${r.id}`,
          kind: "it",
          title: "IT filing estimate saved",
          subtitle: `${r.regime === "new" ? "New" : "Old"} regime · tax ${Math.round(r.tax).toLocaleString("en-IN")}`,
          createdAt: r.createdAt,
        });
      }
      for (const j of jewelRecords.slice(0, 20)) {
        activity.push({
          id: `jewel-${j.id}`,
          kind: "jewel",
          title: "Jewel loan calculation saved",
          subtitle: `${j.weight}g · loan ${Math.round(j.loanAmount).toLocaleString("en-IN")}`,
          createdAt: j.createdAt,
        });
      }
      for (const p of plotRecords.slice(0, 20)) {
        activity.push({
          id: `plot-${p.id}`,
          kind: "plot",
          title: "Plot valuation saved",
          subtitle: `${p.area} sqft · ${p.rate.toLocaleString("en-IN")}/sqft`,
          createdAt: p.createdAt,
        });
      }

      activity.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const activityTop = activity.slice(0, 12);

      const dayKeys: string[] = [];
      for (let d = 6; d >= 0; d--) {
        const dt = new Date();
        dt.setHours(0, 0, 0, 0);
        dt.setDate(dt.getDate() - d);
        dayKeys.push(dt.toISOString().slice(0, 10));
      }
      const counts = new Map<string, number>();
      for (const k of dayKeys) counts.set(k, 0);

      function bumpDay(iso: string) {
        const t = Date.parse(iso);
        if (Number.isNaN(t)) return;
        const key = new Date(t).toISOString().slice(0, 10);
        if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      for (const l of loans) bumpDay(l.createdAt);
      for (const r of itRecords) bumpDay(r.createdAt);
      for (const j of jewelRecords) bumpDay(j.createdAt);
      for (const p of plotRecords) bumpDay(p.createdAt);

      const chartSeries = dayKeys.map((day) => ({ day, count: counts.get(day) ?? 0 }));

      const recentRecords: {
        id: string;
        source: string;
        label: string;
        detail: string;
        amountLabel: string;
        status: string;
        updatedAt: string;
      }[] = [];

      for (const l of loans.slice(0, 8)) {
        recentRecords.push({
          id: `loan-${l.id}`,
          source: "Loan",
          label: `Case ${l.id.slice(0, 8)}`,
          detail: `${l.tenure}y · ${l.interestRate}%`,
          amountLabel: new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(l.loanAmount),
          status: "Saved",
          updatedAt: l.createdAt,
        });
      }
      for (const r of itRecords.slice(0, 8)) {
        recentRecords.push({
          id: `it-${r.id}`,
          source: "IT Filing",
          label: r.regime === "new" ? "New regime" : "Old regime",
          detail: `Income ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(r.income)}`,
          amountLabel: new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(r.tax),
          status: "Computed",
          updatedAt: r.createdAt,
        });
      }
      for (const j of jewelRecords.slice(0, 6)) {
        recentRecords.push({
          id: `jewel-${j.id}`,
          source: "Jewel",
          label: `${j.weight}g @ ${j.purity}K`,
          detail: `LTV ${j.loanLTV}%`,
          amountLabel: new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(j.loanAmount),
          status: "Saved",
          updatedAt: j.createdAt,
        });
      }
      for (const p of plotRecords.slice(0, 6)) {
        recentRecords.push({
          id: `plot-${p.id}`,
          source: "Plot",
          label: `${p.area} sqft`,
          detail: `Total ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(p.totalCost)}`,
          amountLabel: `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(p.rate)}/sqft`,
          status: "Saved",
          updatedAt: p.createdAt,
        });
      }

      recentRecords.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

      const googleSheetsStatus =
        Object.keys(moduleErrors).length >= 4 ? ("error" as const) : ("synced" as const);

      return res.json({
        refreshedAt,
        lastSheetsReadAt: lastDbReadAt,
        sheetsConfigured: true,
        sheetsError: null as string | null,
        googleSheetsStatus,
        telegramStatus: telegramConnected ? ("connected" as const) : ("not_connected" as const),
        kpis: {
          totalLoanPrincipal,
          activeLoanCases,
          monthlyTaxEstimate,
          plotRatePerSqft,
          estimatedTaxFromLatestIT,
        },
        chartSeries,
        activity: activityTop,
        recentRecords: recentRecords.slice(0, 14),
        moduleErrors,
      });
    } catch (e: any) {
      console.error("Dashboard aggregate failed:", e);
      return res.status(500).json({
        error: e?.message ?? "Internal server error",
        refreshedAt,
        lastSheetsReadAt: lastDbReadAt,
      });
    }
  });

  app.post("/api/loans/save", async (req, res) => {
    try {
      await initDb();
      if (!dbReady) return res.status(500).json({ error: dbError ?? "MySQL not initialized" });

      const body = req.body ?? {};
      const loanAmount = Number(body.loanAmount);
      const interestRate = Number(body.interestRate);
      const tenure = Number(body.tenure);

      const errors: string[] = [];
      if (!Number.isFinite(loanAmount) || loanAmount <= 0) errors.push("loanAmount must be a positive number");
      if (!Number.isFinite(interestRate) || interestRate <= 0 || interestRate > 30) errors.push("interestRate must be > 0 and <= 30");
      if (!Number.isFinite(tenure) || tenure <= 0 || tenure > 50) errors.push("tenure must be > 0 and <= 50");
      if (errors.length) return res.status(400).json({ error: errors.join("; ") });

      const computed = computeLoan({ loanAmount, interestRate, tenure });
      const record: LoanRecord = {
        id: crypto.randomUUID(),
        loanAmount,
        interestRate,
        tenure,
        emi: computed.emi,
        totalInterest: computed.totalInterest,
        totalPayment: computed.totalPayment,
        createdAt: new Date().toISOString(),
      };

      await queryRows(
        `INSERT INTO \`${DB_TABLES.loans}\` (id, loanAmount, interestRate, tenure, emi, totalInterest, totalPayment, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [record.id, record.loanAmount, record.interestRate, record.tenure, record.emi, record.totalInterest, record.totalPayment, record.createdAt],
      );
      return res.status(201).json({ record });
    } catch (e: any) {
      console.error("Save loan failed:", e);
      return res.status(500).json({ error: e?.message ?? "Internal server error" });
    }
  });

  app.get("/api/loans", async (_req, res) => {
    try {
      await initDb();
      if (!dbReady) return res.status(500).json({ error: dbError ?? "MySQL not initialized" });
      const records = await fetchLoanRecordsForDashboard();
      return res.json({ records });
    } catch (e: any) {
      console.error("Fetch loans failed:", e);
      return res.status(500).json({ error: e?.message ?? "Internal server error" });
    }
  });

  app.post("/api/it-filing/save", async (req, res) => {
    try {
      await initDb();
      if (!dbReady) return res.status(500).json({ error: dbError ?? "MySQL not initialized" });

      const body = req.body ?? {};
      const income = Number(body.income);
      const deductions = Number(body.deductions);
      const regimeRaw = String(body.regime ?? "");
      const regime = regimeRaw === "old" ? "old" : regimeRaw === "new" ? "new" : null;

      const errors: string[] = [];
      if (!Number.isFinite(income) || income <= 0) errors.push("income must be a positive number");
      if (!Number.isFinite(deductions) || deductions < 0) errors.push("deductions must be >= 0");
      if (!regime) errors.push("regime must be either 'old' or 'new'");
      if (errors.length) return res.status(400).json({ error: errors.join("; ") });

      const computed = computeITFiling({ income, deductions, regime });
      const record: ITFilingRecord = {
        id: crypto.randomUUID(),
        income,
        deductions,
        regime,
        tax: computed.tax,
        monthlyTax: computed.monthlyTax,
        takeHomeMonthly: computed.takeHomeMonthly,
        createdAt: new Date().toISOString(),
      };

      await queryRows(
        `INSERT INTO \`${DB_TABLES.itFiling}\` (id, income, deductions, regime, tax, monthlyTax, takeHomeMonthly, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [record.id, record.income, record.deductions, record.regime, record.tax, record.monthlyTax, record.takeHomeMonthly, record.createdAt],
      );
      return res.status(201).json({ record });
    } catch (e: any) {
      console.error("Save ITFiling failed:", e);
      return res.status(500).json({ error: e?.message ?? "Internal server error" });
    }
  });

  app.get("/api/it-filing", async (_req, res) => {
    try {
      await initDb();
      if (!dbReady) return res.status(500).json({ error: dbError ?? "MySQL not initialized" });
      const records = await fetchITRecordsForDashboard();
      return res.json({ records });
    } catch (e: any) {
      console.error("Fetch ITFiling failed:", e);
      return res.status(500).json({ error: e?.message ?? "Internal server error" });
    }
  });

  app.post("/api/jewel-loan/save", async (req, res) => {
    try {
      await initDb();
      if (!dbReady) return res.status(500).json({ error: dbError ?? "MySQL not initialized" });

      const body = req.body ?? {};
      const weight = Number(body.weight);
      const purity = Number(body.purity);
      const marketRate = Number(body.marketRate);
      const loanLTV = Number(body.loanLTV);
      const interestRate = Number(body.interestRate);

      const errors: string[] = [];
      if (!Number.isFinite(weight) || weight <= 0) errors.push("weight must be > 0");
      if (!Number.isFinite(purity) || purity <= 0 || purity > 24) errors.push("purity must be > 0 and <= 24");
      if (!Number.isFinite(marketRate) || marketRate <= 0) errors.push("marketRate must be > 0");
      if (!Number.isFinite(loanLTV) || loanLTV <= 0 || loanLTV > 100) errors.push("loanLTV must be > 0 and <= 100");
      if (!Number.isFinite(interestRate) || interestRate <= 0 || interestRate > 30) errors.push("interestRate must be > 0 and <= 30");
      if (errors.length) return res.status(400).json({ error: errors.join("; ") });

      const computed = computeJewelLoan({ weight, purity, marketRate, loanLTV, interestRate });
      const record: JewelLoanRecord = {
        id: crypto.randomUUID(),
        weight,
        purity,
        marketRate,
        loanLTV,
        interestRate,
        goldValue: computed.goldValue,
        loanAmount: computed.loanAmount,
        monthlyInterest: computed.monthlyInterest,
        createdAt: new Date().toISOString(),
      };

      await queryRows(
        `INSERT INTO \`${DB_TABLES.jewelLoan}\` (id, weight, purity, marketRate, loanLTV, interestRate, goldValue, loanAmount, monthlyInterest, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [record.id, record.weight, record.purity, record.marketRate, record.loanLTV, record.interestRate, record.goldValue, record.loanAmount, record.monthlyInterest, record.createdAt],
      );
      return res.status(201).json({ record });
    } catch (e: any) {
      console.error("Save JewelLoan failed:", e);
      return res.status(500).json({ error: e?.message ?? "Internal server error" });
    }
  });

  app.get("/api/jewel-loan", async (_req, res) => {
    try {
      await initDb();
      if (!dbReady) return res.status(500).json({ error: dbError ?? "MySQL not initialized" });
      const records = await fetchJewelRecordsForDashboard();
      return res.json({ records });
    } catch (e: any) {
      console.error("Fetch JewelLoan failed:", e);
      return res.status(500).json({ error: e?.message ?? "Internal server error" });
    }
  });

  app.post("/api/plot-purchase/save", async (req, res) => {
    try {
      await initDb();
      if (!dbReady) return res.status(500).json({ error: dbError ?? "MySQL not initialized" });

      const body = req.body ?? {};
      const area = Number(body.area);
      const rate = Number(body.rate);
      const registrationPercent = Number(body.registrationPercent);
      const otherExpenses = Number(body.otherExpenses);

      const errors: string[] = [];
      if (!Number.isFinite(area) || area <= 0) errors.push("area must be > 0");
      if (!Number.isFinite(rate) || rate <= 0) errors.push("rate must be > 0");
      if (!Number.isFinite(registrationPercent) || registrationPercent < 0) errors.push("registrationPercent must be >= 0");
      if (!Number.isFinite(otherExpenses) || otherExpenses < 0) errors.push("otherExpenses must be >= 0");
      if (errors.length) return res.status(400).json({ error: errors.join("; ") });

      const computed = computePlotPurchase({ area, rate, registrationPercent, otherExpenses });
      const record: PlotPurchaseRecord = {
        id: crypto.randomUUID(),
        area,
        rate,
        registrationPercent,
        otherExpenses,
        totalCost: computed.totalCost,
        registrationCost: computed.registrationCost,
        otherCosts: computed.otherCosts,
        perSqftCost: computed.perSqftCost,
        createdAt: new Date().toISOString(),
      };

      await queryRows(
        `INSERT INTO \`${DB_TABLES.plotPurchase}\` (id, area, rate, registrationPercent, otherExpenses, totalCost, registrationCost, otherCosts, perSqftCost, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [record.id, record.area, record.rate, record.registrationPercent, record.otherExpenses, record.totalCost, record.registrationCost, record.otherCosts, record.perSqftCost, record.createdAt],
      );
      return res.status(201).json({ record });
    } catch (e: any) {
      console.error("Save PlotPurchase failed:", e);
      return res.status(500).json({ error: e?.message ?? "Internal server error" });
    }
  });

  app.get("/api/plot-purchase", async (_req, res) => {
    try {
      await initDb();
      if (!dbReady) return res.status(500).json({ error: dbError ?? "MySQL not initialized" });
      const records = await fetchPlotRecordsForDashboard();
      return res.json({ records });
    } catch (e: any) {
      console.error("Fetch PlotPurchase failed:", e);
      return res.status(500).json({ error: e?.message ?? "Internal server error" });
    }
  });

  const httpServer = http.createServer(app);
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite (first run may take a minute)...");
    try {
      const vite = await createViteServer({
        root: process.cwd(),
        server: {
          middlewareMode: true,
          hmr: { server: httpServer },
        },
        appType: "spa",
      });
      app.use((req, res, next) => {
        if (req.originalUrl?.startsWith("/api")) return next();
        return vite.middlewares(req, res, next);
      });
    } catch (e) {
      console.error("Vite middleware init failed:", e);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.once("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the other dev server or set PORT=3001 in .env.`);
      process.exit(1);
    }
    throw err;
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
