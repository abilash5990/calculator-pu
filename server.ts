import express from "express";
import http from "http";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

dotenv.config();

type LoanRecord = {
  id: string;
  loanAmount: number;
  interestRate: number;
  tenure: number;
  emi: number;
  totalInterest: number;
  totalPayment: number;
  createdAt: string; // ISO string
};

type LoanInput = {
  loanAmount: number;
  interestRate: number;
  tenure: number;
};

const LOAN_HEADERS = [
  "id",
  "loanAmount",
  "interestRate",
  "tenure",
  "emi",
  "totalInterest",
  "totalPayment",
  "createdAt",
];

function computeLoan(input: LoanInput) {
  const { loanAmount, interestRate, tenure } = input;

  const monthlyRate = interestRate / 12 / 100;
  const numPayments = tenure * 12;

  // Standard EMI formula (P * r * (1+r)^n / ((1+r)^n - 1))
  const emiFloat =
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  // Keep the same rounding strategy as the frontend for consistency.
  const emi = Math.round(emiFloat);
  const totalPayment = emi * numPayments;
  const totalInterest = totalPayment - loanAmount;

  return { emi, totalPayment, totalInterest };
}

type ITFilingRecord = {
  id: string;
  income: number;
  deductions: number;
  regime: "old" | "new";
  tax: number; // includes 4% cess
  monthlyTax: number;
  takeHomeMonthly: number;
  createdAt: string;
};

type ITFilingInput = {
  income: number;
  deductions: number;
  regime: "old" | "new";
};

const ITFILING_HEADERS = [
  "id",
  "income",
  "deductions",
  "regime",
  "tax",
  "monthlyTax",
  "takeHomeMonthly",
  "createdAt",
];

function computeITFiling(input: ITFilingInput) {
  const { income, deductions, regime } = input;

  const taxableIncome =
    Math.max(0, income - (regime === "old" ? deductions : 0)) ?? 0;
  let calculatedTax = 0;

  if (regime === "new") {
    // New Regime Slabs (Simplified for 2024-25) - match frontend logic.
    if (taxableIncome <= 300000) calculatedTax = 0;
    else if (taxableIncome <= 600000) calculatedTax = (taxableIncome - 300000) * 0.05;
    else if (taxableIncome <= 900000) calculatedTax = 15000 + (taxableIncome - 600000) * 0.1;
    else if (taxableIncome <= 1200000) calculatedTax = 45000 + (taxableIncome - 900000) * 0.15;
    else if (taxableIncome <= 1500000) calculatedTax = 90000 + (taxableIncome - 1200000) * 0.2;
    else calculatedTax = 150000 + (taxableIncome - 1500000) * 0.3;

    // Revisions/Rebates
    if (taxableIncome <= 700000) calculatedTax = 0;
  } else {
    // Old Regime Slabs - match frontend logic.
    if (taxableIncome <= 250000) calculatedTax = 0;
    else if (taxableIncome <= 500000) calculatedTax = (taxableIncome - 250000) * 0.05;
    else if (taxableIncome <= 1000000) calculatedTax = 12500 + (taxableIncome - 500000) * 0.2;
    else calculatedTax = 112500 + (taxableIncome - 1000000) * 0.3;

    if (taxableIncome <= 500000) calculatedTax = 0;
  }

  // Add 4% Cess
  const tax = calculatedTax * 1.04;
  const monthlyTax = tax / 12;
  const takeHomeMonthly = (income - tax) / 12;

  return { tax, monthlyTax, takeHomeMonthly };
}

type JewelLoanRecord = {
  id: string;
  weight: number; // grams
  purity: number; // karat
  marketRate: number; // per gram
  loanLTV: number; // %
  interestRate: number; // % per annum
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

const JEWEL_LOAN_HEADERS = [
  "id",
  "weight",
  "purity",
  "marketRate",
  "loanLTV",
  "interestRate",
  "goldValue",
  "loanAmount",
  "monthlyInterest",
  "createdAt",
];

function computeJewelLoan(input: JewelLoanInput) {
  const { weight, purity, marketRate, loanLTV, interestRate } = input;

  const goldValue = weight * marketRate * (purity / 24);
  const loanAmount = (goldValue * loanLTV) / 100;
  const monthlyInterest = (loanAmount * (interestRate / 100)) / 12;

  return { goldValue, loanAmount, monthlyInterest };
}

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

const PLOT_PURCHASE_HEADERS = [
  "id",
  "area",
  "rate",
  "registrationPercent",
  "otherExpenses",
  "totalCost",
  "registrationCost",
  "otherCosts",
  "perSqftCost",
  "createdAt",
];

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
    profile: {
      userName: "Finance Hub User",
    },
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
  const theme: ThemePreference =
    themeRaw === "dark" || themeRaw === "light" ? themeRaw : "system";

  const moduleRaw = String(preferences.defaultModule ?? seed.preferences.defaultModule);
  const defaultModule: AppSettings["preferences"]["defaultModule"] =
    moduleRaw === "it-filing" ||
    moduleRaw === "plot-calc" ||
    moduleRaw === "loans" ||
    moduleRaw === "jewel-loan"
      ? moduleRaw
      : "dashboard";

  return {
    profile: {
      userName: String(profile.userName ?? seed.profile.userName).trim() || "Finance Hub User",
    },
    preferences: {
      defaultCurrency,
      theme,
      defaultModule,
    },
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
    profile: {
      userName: String(raw.userName ?? ""),
    },
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
    if (looksLegacy) {
      return sanitizeSettings(legacySettingsToModern(parsed), defaults);
    }
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

function normalizeSheetId(sheetId: string) {
  // Some users paste the full URL with a trailing slash; keep only the id.
  return sheetId.replace(/\/$/, "");
}

function normalizeSheetName(name: string) {
  return name.replace(/\s+/g, "").toLowerCase();
}

function columnNumberToLetter(columnNumber: number) {
  // 1 -> A, 26 -> Z, 27 -> AA, ...
  let temp = "";
  let letter = "";
  let n = columnNumber;
  while (n > 0) {
    letter = String.fromCharCode(((n - 1) % 26) + 65);
    temp = letter + temp;
    n = Math.floor((n - 1) / 26);
  }
  return temp;
}

function isHeaderRow(row: any[], headers: string[]) {
  return headers.every((h, i) => String(row[i] ?? "") === h);
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), ms),
    ),
  ]);
}

function sheetsValues(result: unknown): any[][] {
  const r = result as { data?: { values?: any[][] } };
  return r.data?.values ?? [];
}

async function ensureSheetHeaders(
  sheets: any,
  spreadsheetId: string,
  tabName: string,
  headers: string[],
) {
  const lastColLetter = columnNumberToLetter(headers.length);
  const headerRange = `${tabName}!A1:${lastColLetter}1`;

  // If the tab doesn't exist, create it first.
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });
  } catch {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: tabName },
            },
          },
        ],
      },
    });
  }

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: headerRange,
  });

  const existingHeader = existing.data.values?.[0] ?? [];
  const matches =
    existingHeader.length >= headers.length &&
    headers.every((h, i) => String(existingHeader[i] ?? "") === h);

  if (!matches) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: headerRange,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  }
}

async function createSheetsClient() {
  const { google } = await import("googleapis");
  const credentialsPath = path.join(process.cwd(), "credentials.json");
  let credentials: { client_email: string; private_key: string } | null = null;

  try {
    const credentialsRaw = await fs.readFile(credentialsPath, "utf8");
    credentials = JSON.parse(credentialsRaw) as {
      client_email: string;
      private_key: string;
    };
  } catch (e: any) {
    if (e?.code !== "ENOENT") {
      throw e;
    }
  }

  if (!credentials) {
    const clientEmail = String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "").trim();
    const privateKeyRaw = String(process.env.GOOGLE_PRIVATE_KEY ?? "").trim();
    const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

    if (!clientEmail || !privateKey) {
      throw new Error(
        "Google credentials missing: add credentials.json in project root, or set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env",
      );
    }

    credentials = {
      client_email: clientEmail,
      private_key: privateKey,
    };
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

async function resolveLoanTabName(sheets: any, spreadsheetId: string) {
  const envTab = process.env.LOAN_SHEET_TAB;
  const candidates = [
    ...(envTab ? [envTab] : []),
    "LoanAnalytics",
    "Loan Analytics",
  ];

  const sheetsMeta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  const existingTitles = (sheetsMeta.data.sheets ?? [])
    .map((s: any) => s?.properties?.title)
    .filter(Boolean) as string[];

  for (const candidate of candidates) {
    const match = existingTitles.find(
      (t) => normalizeSheetName(t) === normalizeSheetName(candidate),
    );
    if (match) return match;
  }

  // Default behavior: create "LoanAnalytics" if none exist.
  return "LoanAnalytics";
}

async function resolveSheetTabName(
  sheets: any,
  spreadsheetId: string,
  envTabKey: string | undefined,
  candidates: string[],
  defaultTabName: string,
) {
  const envTab = envTabKey ? process.env[envTabKey] : undefined;
  const candidateList = [
    ...(envTab ? [envTab] : []),
    ...candidates,
  ];

  const sheetsMeta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  const existingTitles = (sheetsMeta.data.sheets ?? [])
    .map((s: any) => s?.properties?.title)
    .filter(Boolean) as string[];

  for (const candidate of candidateList) {
    const match = existingTitles.find(
      (t) => normalizeSheetName(t) === normalizeSheetName(candidate),
    );
    if (match) return match;
  }

  return defaultTabName;
}

async function ensureLoanHeaders(sheets: any, spreadsheetId: string, tabName: string) {
  const headerRange = `${tabName}!A1:H1`;

  // If the tab doesn't exist, create it first.
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });
  } catch {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: tabName },
            },
          },
        ],
      },
    });
  }

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: headerRange,
  });

  const existingHeader = existing.data.values?.[0] ?? [];
  const matches =
    existingHeader.length >= LOAN_HEADERS.length &&
    LOAN_HEADERS.every((h, i) => String(existingHeader[i] ?? "") === h);

  if (!matches) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: headerRange,
      valueInputOption: "RAW",
      requestBody: { values: [LOAN_HEADERS] },
    });
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      message: "Futuristic Finance Hub API is active",
      loanApi: "lazy",
    });
  });

  // Telegram Webhook Placeholder (unrelated to Google Sheets loan storage)
  app.post("/api/telegram/webhook", (req, res) => {
    console.log("Telegram Webhook received:", req.body);
    res.sendStatus(200);
  });

  /** Mounted at /api so GET /dashboard resolves to /api/dashboard before Vite's SPA fallback. */
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  let sheets: any | null = null;
  let spreadsheetId: string | null = null;

  let sheetsBasePromise: Promise<void> | null = null;
  let sheetsBaseError: string | null = null;

  let loanTabName: string | null = null;
  let loanInitError: string | null = null;
  let loanInitPromise: Promise<void> | null = null;

  let itTabName: string | null = null;
  let itInitError: string | null = null;
  let itInitPromise: Promise<void> | null = null;

  let jewelTabName: string | null = null;
  let jewelInitError: string | null = null;
  let jewelInitPromise: Promise<void> | null = null;

  let plotTabName: string | null = null;
  let plotInitError: string | null = null;
  let plotInitPromise: Promise<void> | null = null;
  let appSettings: AppSettings = await readSettingsFromDisk();

  function sheetIdFromSettingsOrEnv() {
    return normalizeSheetId(
      String(appSettings.integrations.googleSheetId || process.env.GOOGLE_SHEET_ID || ""),
    );
  }

  function resetSheetsInitState() {
    sheets = null;
    spreadsheetId = null;
    sheetsBasePromise = null;
    sheetsBaseError = null;
    loanTabName = null;
    loanInitError = null;
    loanInitPromise = null;
    itTabName = null;
    itInitError = null;
    itInitPromise = null;
    jewelTabName = null;
    jewelInitError = null;
    jewelInitPromise = null;
    plotTabName = null;
    plotInitError = null;
    plotInitPromise = null;
  }

  async function initSheetsBase() {
    if (sheetsBasePromise) return sheetsBasePromise;

    sheetsBasePromise = (async () => {
      try {
        sheets = await withTimeout(
          createSheetsClient(),
          7000,
          "Timed out creating Google Sheets client",
        );
        spreadsheetId = sheetIdFromSettingsOrEnv();
        if (!spreadsheetId) {
          throw new Error("Missing GOOGLE_SHEET_ID in environment");
        }
      } catch (e: any) {
        sheetsBaseError = e?.message ?? "Failed to initialize Google Sheets";
        console.error("Sheets base init failed:", e);
      }
    })();

    return sheetsBasePromise;
  }

  async function initLoanSheets() {
    if (loanInitPromise) return loanInitPromise;

    loanInitPromise = (async () => {
      await initSheetsBase();
      if (!sheets || !spreadsheetId) return;

      try {
        loanTabName = await withTimeout(
          resolveLoanTabName(sheets, spreadsheetId),
          7000,
          "Timed out resolving loan tab name",
        );
        await withTimeout(
          ensureLoanHeaders(sheets, spreadsheetId, loanTabName),
          7000,
          "Timed out ensuring loan sheet headers",
        );
      } catch (e: any) {
        loanInitError = e?.message ?? "Failed to initialize Loan Sheets";
        console.error("Loan Sheets init failed:", e);
      }
    })();

    return loanInitPromise;
  }

  async function initITSheets() {
    if (itInitPromise) return itInitPromise;

    itInitPromise = (async () => {
      await initSheetsBase();
      if (!sheets || !spreadsheetId) return;

      try {
        itTabName = await withTimeout(
          resolveSheetTabName(
            sheets,
            spreadsheetId,
            "IT_SHEET_TAB",
            ["ITFiling", "IT Filing"],
            "ITFiling",
          ),
          7000,
          "Timed out resolving IT filing tab name",
        );
        await withTimeout(
          ensureSheetHeaders(sheets, spreadsheetId, itTabName, ITFILING_HEADERS),
          7000,
          "Timed out ensuring IT filing sheet headers",
        );
      } catch (e: any) {
        itInitError = e?.message ?? "Failed to initialize IT Filing Sheets";
        console.error("ITFiling Sheets init failed:", e);
      }
    })();

    return itInitPromise;
  }

  async function initJewelSheets() {
    if (jewelInitPromise) return jewelInitPromise;

    jewelInitPromise = (async () => {
      await initSheetsBase();
      if (!sheets || !spreadsheetId) return;

      try {
        jewelTabName = await withTimeout(
          resolveSheetTabName(
            sheets,
            spreadsheetId,
            "JEWEL_SHEET_TAB",
            ["JewelLoan", "Jewel Loan"],
            "JewelLoan",
          ),
          7000,
          "Timed out resolving jewel loan tab name",
        );
        await withTimeout(
          ensureSheetHeaders(sheets, spreadsheetId, jewelTabName, JEWEL_LOAN_HEADERS),
          7000,
          "Timed out ensuring jewel loan sheet headers",
        );
      } catch (e: any) {
        jewelInitError = e?.message ?? "Failed to initialize Jewel Loan Sheets";
        console.error("JewelLoan Sheets init failed:", e);
      }
    })();

    return jewelInitPromise;
  }

  async function initPlotSheets() {
    if (plotInitPromise) return plotInitPromise;

    plotInitPromise = (async () => {
      await initSheetsBase();
      if (!sheets || !spreadsheetId) return;

      try {
        plotTabName = await withTimeout(
          resolveSheetTabName(
            sheets,
            spreadsheetId,
            "PLOT_SHEET_TAB",
            ["PlotCalculator", "Plot Calculator", "PlotPurchase", "Plot Purchase"],
            "PlotCalculator",
          ),
          7000,
          "Timed out resolving plot purchase tab name",
        );
        await withTimeout(
          ensureSheetHeaders(sheets, spreadsheetId, plotTabName, PLOT_PURCHASE_HEADERS),
          7000,
          "Timed out ensuring plot purchase sheet headers",
        );
      } catch (e: any) {
        plotInitError = e?.message ?? "Failed to initialize Plot Purchase Sheets";
        console.error("PlotCalculator Sheets init failed:", e);
      }
    })();

    return plotInitPromise;
  }

  /** Updated whenever /api/dashboard successfully reads from Sheets (at least one tab). */
  let lastSheetsReadAt: string | null = null;

  async function fetchLoanRecordsForDashboard(): Promise<LoanRecord[]> {
    await initLoanSheets();
    if (!sheets || !spreadsheetId || !loanTabName) return [];
    const result = await withTimeout(
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${loanTabName}!A:H`,
      }),
      7000,
      "Timed out while reading loan records from Google Sheets",
    );
    const rows = sheetsValues(result);
    const records: LoanRecord[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && LOAN_HEADERS.every((h, idx) => String(row[idx] ?? "") === h)) {
        continue;
      }
      if (row.length < 8) continue;
      const record: LoanRecord = {
        id: String(row[0]),
        loanAmount: Number(row[1]),
        interestRate: Number(row[2]),
        tenure: Number(row[3]),
        emi: Number(row[4]),
        totalInterest: Number(row[5]),
        totalPayment: Number(row[6]),
        createdAt: String(row[7]),
      };
      if (!record.id) continue;
      if (
        ![record.loanAmount, record.interestRate, record.tenure, record.emi, record.totalInterest, record.totalPayment].every(
          Number.isFinite,
        )
      ) {
        continue;
      }
      records.push(record);
    }
    records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return records;
  }

  async function fetchITRecordsForDashboard(): Promise<ITFilingRecord[]> {
    await initITSheets();
    if (!sheets || !spreadsheetId || !itTabName) return [];
    const result = await withTimeout(
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${itTabName}!A:H` }),
      7000,
      "Timed out while reading IT filing records from Google Sheets",
    );
    const rows = sheetsValues(result);
    const records: ITFilingRecord[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && isHeaderRow(row, ITFILING_HEADERS)) continue;
      if (row.length < ITFILING_HEADERS.length) continue;
      const record: ITFilingRecord = {
        id: String(row[0]),
        income: Number(row[1]),
        deductions: Number(row[2]),
        regime: (String(row[3]) === "old" ? "old" : "new") as "old" | "new",
        tax: Number(row[4]),
        monthlyTax: Number(row[5]),
        takeHomeMonthly: Number(row[6]),
        createdAt: String(row[7]),
      };
      if (!record.id) continue;
      if (record.regime !== "old" && record.regime !== "new") continue;
      if (![record.income, record.deductions, record.tax, record.monthlyTax, record.takeHomeMonthly].every(Number.isFinite)) {
        continue;
      }
      records.push(record);
    }
    records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return records;
  }

  async function fetchJewelRecordsForDashboard(): Promise<JewelLoanRecord[]> {
    await initJewelSheets();
    if (!sheets || !spreadsheetId || !jewelTabName) return [];
    const result = await withTimeout(
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${jewelTabName}!A:J` }),
      7000,
      "Timed out while reading jewel loan records from Google Sheets",
    );
    const rows = sheetsValues(result);
    const records: JewelLoanRecord[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && isHeaderRow(row, JEWEL_LOAN_HEADERS)) continue;
      if (row.length < JEWEL_LOAN_HEADERS.length) continue;
      const record: JewelLoanRecord = {
        id: String(row[0]),
        weight: Number(row[1]),
        purity: Number(row[2]),
        marketRate: Number(row[3]),
        loanLTV: Number(row[4]),
        interestRate: Number(row[5]),
        goldValue: Number(row[6]),
        loanAmount: Number(row[7]),
        monthlyInterest: Number(row[8]),
        createdAt: String(row[9]),
      };
      if (!record.id) continue;
      if (
        ![record.weight, record.purity, record.marketRate, record.loanLTV, record.interestRate, record.goldValue, record.loanAmount, record.monthlyInterest].every(
          Number.isFinite,
        )
      ) {
        continue;
      }
      records.push(record);
    }
    records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return records;
  }

  async function fetchPlotRecordsForDashboard(): Promise<PlotPurchaseRecord[]> {
    await initPlotSheets();
    if (!sheets || !spreadsheetId || !plotTabName) return [];
    const result = await withTimeout(
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${plotTabName}!A:J` }),
      7000,
      "Timed out while reading plot purchase records from Google Sheets",
    );
    const rows = sheetsValues(result);
    const records: PlotPurchaseRecord[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && isHeaderRow(row, PLOT_PURCHASE_HEADERS)) continue;
      if (row.length < PLOT_PURCHASE_HEADERS.length) continue;
      const record: PlotPurchaseRecord = {
        id: String(row[0]),
        area: Number(row[1]),
        rate: Number(row[2]),
        registrationPercent: Number(row[3]),
        otherExpenses: Number(row[4]),
        totalCost: Number(row[5]),
        registrationCost: Number(row[6]),
        otherCosts: Number(row[7]),
        perSqftCost: Number(row[8]),
        createdAt: String(row[9]),
      };
      if (!record.id) continue;
      if (
        ![record.area, record.rate, record.registrationPercent, record.otherExpenses, record.totalCost, record.registrationCost, record.otherCosts, record.perSqftCost].every(
          Number.isFinite,
        )
      ) {
        continue;
      }
      records.push(record);
    }
    records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return records;
  }

  function settingsStatus() {
    const sheetConnected = Boolean(sheetIdFromSettingsOrEnv());
    const telegramConnected =
      Boolean(String(process.env.TELEGRAM_BOT_TOKEN ?? "").trim()) ||
      appSettings.integrations.telegramConfigured;
    const googleSheetsStatus =
      !sheetConnected
        ? ("not_connected" as const)
        : sheetsBaseError
          ? ("error" as const)
          : ("connected" as const);
    return {
      googleSheetsStatus,
      telegramStatus: telegramConnected ? ("connected" as const) : ("not_connected" as const),
      lastSheetsReadAt,
      sheetsError: sheetsBaseError,
    };
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
      resetSheetsInitState();
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
    const googleSheetId = normalizeSheetId(String(req.body?.googleSheetId ?? ""));
    if (!googleSheetId) {
      return res.status(400).json({
        ok: false,
        message: "googleSheetId is required",
        settings: appSettings,
        status: settingsStatus(),
        error: "Missing googleSheetId",
      });
    }
    try {
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
      resetSheetsInitState();
      await initSheetsBase();
      return res.json({
        ok: true,
        message: sheetsBaseError ? "Connected with warnings" : "Google Sheets connected",
        settings: appSettings,
        status: settingsStatus(),
        error: sheetsBaseError,
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        message: "Failed to connect Google Sheets",
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
      await initSheetsBase();
      if (!sheetIdFromSettingsOrEnv()) {
        return res.status(400).json({
          ok: false,
          message: "Google Sheets is not connected",
          settings: appSettings,
          status: settingsStatus(),
          error: "Missing GOOGLE_SHEET_ID",
        });
      }

      const results = await Promise.allSettled([
        fetchLoanRecordsForDashboard(),
        fetchITRecordsForDashboard(),
        fetchJewelRecordsForDashboard(),
        fetchPlotRecordsForDashboard(),
      ]);

      const failedCount = results.filter((r) => r.status === "rejected").length;
      lastSheetsReadAt = new Date().toISOString();
      return res.json({
        ok: failedCount < results.length,
        message: failedCount ? `Sync finished with ${failedCount} module error(s)` : "Sync completed",
        settings: appSettings,
        status: settingsStatus(),
        error: failedCount ? "One or more modules failed during sync" : null,
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
      await initSheetsBase();

      if (!spreadsheetId || sheetsBaseError) {
        return res.json({
          refreshedAt,
          lastSheetsReadAt,
          sheetsConfigured: false,
          sheetsError: sheetsBaseError ?? (spreadsheetId ? null : "Missing GOOGLE_SHEET_ID in environment"),
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

      lastSheetsReadAt = refreshedAt;

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

      const chartSeries = dayKeys.map((day) => ({
        day,
        count: counts.get(day) ?? 0,
      }));

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
        lastSheetsReadAt,
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
        lastSheetsReadAt,
      });
    }
  });

  app.post("/api/loans/save", async (req, res) => {
    try {
      await initLoanSheets();
      if (!sheets || !spreadsheetId || !loanTabName) {
        return res.status(500).json({
          error: loanInitError ?? "Google Sheets not initialized",
        });
      }

      const body = req.body ?? {};
      const loanAmount = Number(body.loanAmount);
      const interestRate = Number(body.interestRate);
      const tenure = Number(body.tenure);

      const errors: string[] = [];
      if (!Number.isFinite(loanAmount) || loanAmount <= 0) errors.push("loanAmount must be a positive number");
      if (!Number.isFinite(interestRate) || interestRate <= 0 || interestRate > 30) errors.push("interestRate must be > 0 and <= 30");
      if (!Number.isFinite(tenure) || tenure <= 0 || tenure > 50) errors.push("tenure must be > 0 and <= 50");

      if (errors.length) {
        return res.status(400).json({ error: errors.join("; ") });
      }

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

      await withTimeout(
        sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${loanTabName}!A:H`,
          valueInputOption: "RAW",
          requestBody: {
            values: [[
              record.id,
              record.loanAmount,
              record.interestRate,
              record.tenure,
              record.emi,
              record.totalInterest,
              record.totalPayment,
              record.createdAt,
            ]],
          },
        }),
        7000,
        "Timed out while saving loan record to Google Sheets",
      );

      return res.status(201).json({ record });
    } catch (e: any) {
      console.error("Save loan failed:", e);
      return res.status(500).json({ error: e?.message ?? "Internal server error" });
    }
  });

  app.get("/api/loans", async (_req, res) => {
    try {
      await initLoanSheets();
      if (!sheets || !spreadsheetId || !loanTabName) {
        return res.status(500).json({
          error: loanInitError ?? "Google Sheets not initialized",
        });
      }

      const range = `${loanTabName}!A:H`;
      const result = await withTimeout(
        sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
        }),
        7000,
        "Timed out while reading loan records from Google Sheets",
      );

      const rows = sheetsValues(result);
      const records: LoanRecord[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // Skip header row if present.
        if (
          i === 0 &&
          LOAN_HEADERS.every((h, idx) => String(row[idx] ?? "") === h)
        ) {
          continue;
        }

        if (row.length < 8) continue;

        const record: LoanRecord = {
          id: String(row[0]),
          loanAmount: Number(row[1]),
          interestRate: Number(row[2]),
          tenure: Number(row[3]),
          emi: Number(row[4]),
          totalInterest: Number(row[5]),
          totalPayment: Number(row[6]),
          createdAt: String(row[7]),
        };

        // Basic sanity to avoid propagating bad rows.
        if (!record.id) continue;
        if (![record.loanAmount, record.interestRate, record.tenure, record.emi, record.totalInterest, record.totalPayment].every(Number.isFinite)) {
          continue;
        }

        records.push(record);
      }

      records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return res.json({ records });
    } catch (e: any) {
      console.error("Fetch loans failed:", e);
      return res.status(500).json({ error: e?.message ?? "Internal server error" });
    }
  });

  // --- ITFiling APIs ---
  app.post("/api/it-filing/save", async (req, res) => {
    try {
      await initITSheets();
      if (!sheets || !spreadsheetId || !itTabName) {
        return res.status(500).json({
          error: itInitError ?? sheetsBaseError ?? "Google Sheets not initialized",
        });
      }

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

      await withTimeout(
        sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${itTabName}!A:H`,
          valueInputOption: "RAW",
          requestBody: {
            values: [[
              record.id,
              record.income,
              record.deductions,
              record.regime,
              record.tax,
              record.monthlyTax,
              record.takeHomeMonthly,
              record.createdAt,
            ]],
          },
        }),
        7000,
        "Timed out while saving IT filing record to Google Sheets",
      );

      return res.status(201).json({ record });
    } catch (e: any) {
      console.error("Save ITFiling failed:", e);
      return res.status(500).json({ error: e?.message ?? "Internal server error" });
    }
  });

  app.get("/api/it-filing", async (_req, res) => {
    try {
      await initITSheets();
      if (!sheets || !spreadsheetId || !itTabName) {
        return res.status(500).json({
          error: itInitError ?? sheetsBaseError ?? "Google Sheets not initialized",
        });
      }

      const range = `${itTabName}!A:H`;
      const result = await withTimeout(
        sheets.spreadsheets.values.get({ spreadsheetId, range }),
        7000,
        "Timed out while reading IT filing records from Google Sheets",
      );
      const rows = sheetsValues(result);
      const records: ITFilingRecord[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        if (i === 0 && isHeaderRow(row, ITFILING_HEADERS)) continue;
        if (row.length < ITFILING_HEADERS.length) continue;

        const record: ITFilingRecord = {
          id: String(row[0]),
          income: Number(row[1]),
          deductions: Number(row[2]),
          regime: (String(row[3]) === "old" ? "old" : "new") as "old" | "new",
          tax: Number(row[4]),
          monthlyTax: Number(row[5]),
          takeHomeMonthly: Number(row[6]),
          createdAt: String(row[7]),
        };

        if (!record.id) continue;
        if (record.regime !== "old" && record.regime !== "new") continue;
        if (![record.income, record.deductions, record.tax, record.monthlyTax, record.takeHomeMonthly].every(Number.isFinite)) {
          continue;
        }

        records.push(record);
      }

      records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return res.json({ records });
    } catch (e: any) {
      console.error("Fetch ITFiling failed:", e);
      return res.status(500).json({ error: e?.message ?? "Internal server error" });
    }
  });

  // --- JewelLoan APIs ---
  app.post("/api/jewel-loan/save", async (req, res) => {
    try {
      await initJewelSheets();
      if (!sheets || !spreadsheetId || !jewelTabName) {
        return res.status(500).json({
          error: jewelInitError ?? sheetsBaseError ?? "Google Sheets not initialized",
        });
      }

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

      await withTimeout(
        sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${jewelTabName}!A:J`,
          valueInputOption: "RAW",
          requestBody: {
            values: [[
              record.id,
              record.weight,
              record.purity,
              record.marketRate,
              record.loanLTV,
              record.interestRate,
              record.goldValue,
              record.loanAmount,
              record.monthlyInterest,
              record.createdAt,
            ]],
          },
        }),
        7000,
        "Timed out while saving jewel loan record to Google Sheets",
      );

      return res.status(201).json({ record });
    } catch (e: any) {
      console.error("Save JewelLoan failed:", e);
      return res.status(500).json({ error: e?.message ?? "Internal server error" });
    }
  });

  app.get("/api/jewel-loan", async (_req, res) => {
    try {
      await initJewelSheets();
      if (!sheets || !spreadsheetId || !jewelTabName) {
        return res.status(500).json({
          error: jewelInitError ?? sheetsBaseError ?? "Google Sheets not initialized",
        });
      }

      const range = `${jewelTabName}!A:J`;
      const result = await withTimeout(
        sheets.spreadsheets.values.get({ spreadsheetId, range }),
        7000,
        "Timed out while reading jewel loan records from Google Sheets",
      );
      const rows = sheetsValues(result);
      const records: JewelLoanRecord[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (i === 0 && isHeaderRow(row, JEWEL_LOAN_HEADERS)) continue;
        if (row.length < JEWEL_LOAN_HEADERS.length) continue;

        const record: JewelLoanRecord = {
          id: String(row[0]),
          weight: Number(row[1]),
          purity: Number(row[2]),
          marketRate: Number(row[3]),
          loanLTV: Number(row[4]),
          interestRate: Number(row[5]),
          goldValue: Number(row[6]),
          loanAmount: Number(row[7]),
          monthlyInterest: Number(row[8]),
          createdAt: String(row[9]),
        };

        if (!record.id) continue;
        if (![record.weight, record.purity, record.marketRate, record.loanLTV, record.interestRate, record.goldValue, record.loanAmount, record.monthlyInterest].every(Number.isFinite)) {
          continue;
        }

        records.push(record);
      }

      records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return res.json({ records });
    } catch (e: any) {
      console.error("Fetch JewelLoan failed:", e);
      return res.status(500).json({ error: e?.message ?? "Internal server error" });
    }
  });

  // --- Plot Purchase APIs ---
  app.post("/api/plot-purchase/save", async (req, res) => {
    try {
      await initPlotSheets();
      if (!sheets || !spreadsheetId || !plotTabName) {
        return res.status(500).json({
          error: plotInitError ?? sheetsBaseError ?? "Google Sheets not initialized",
        });
      }

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

      await withTimeout(
        sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${plotTabName}!A:J`,
          valueInputOption: "RAW",
          requestBody: {
            values: [[
              record.id,
              record.area,
              record.rate,
              record.registrationPercent,
              record.otherExpenses,
              record.totalCost,
              record.registrationCost,
              record.otherCosts,
              record.perSqftCost,
              record.createdAt,
            ]],
          },
        }),
        7000,
        "Timed out while saving plot purchase record to Google Sheets",
      );

      return res.status(201).json({ record });
    } catch (e: any) {
      console.error("Save PlotPurchase failed:", e);
      return res.status(500).json({ error: e?.message ?? "Internal server error" });
    }
  });

  app.get("/api/plot-purchase", async (_req, res) => {
    try {
      await initPlotSheets();
      if (!sheets || !spreadsheetId || !plotTabName) {
        return res.status(500).json({
          error: plotInitError ?? sheetsBaseError ?? "Google Sheets not initialized",
        });
      }

      const range = `${plotTabName}!A:J`;
      const result = await withTimeout(
        sheets.spreadsheets.values.get({ spreadsheetId, range }),
        7000,
        "Timed out while reading plot purchase records from Google Sheets",
      );
      const rows = sheetsValues(result);
      const records: PlotPurchaseRecord[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (i === 0 && isHeaderRow(row, PLOT_PURCHASE_HEADERS)) continue;
        if (row.length < PLOT_PURCHASE_HEADERS.length) continue;

        const record: PlotPurchaseRecord = {
          id: String(row[0]),
          area: Number(row[1]),
          rate: Number(row[2]),
          registrationPercent: Number(row[3]),
          otherExpenses: Number(row[4]),
          totalCost: Number(row[5]),
          registrationCost: Number(row[6]),
          otherCosts: Number(row[7]),
          perSqftCost: Number(row[8]),
          createdAt: String(row[9]),
        };

        if (!record.id) continue;
        if (![record.area, record.rate, record.registrationPercent, record.otherExpenses, record.totalCost, record.registrationCost, record.otherCosts, record.perSqftCost].every(Number.isFinite)) {
          continue;
        }

        records.push(record);
      }

      records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
      // Never let Vite's SPA dev server answer /api/* — it returns index.html and breaks fetch().json().
      app.use((req, res, next) => {
        if (req.originalUrl?.startsWith("/api")) {
          return next();
        }
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
      console.error(
        `Port ${PORT} is already in use. Stop the other dev server or set PORT=3001 in .env.`,
      );
      process.exit(1);
    }
    throw err;
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
