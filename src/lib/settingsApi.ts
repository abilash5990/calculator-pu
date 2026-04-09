export const SETTINGS_STORAGE_KEY = "finance_hub_settings";

export type SettingsTheme = "system" | "dark" | "light";
export type SettingsDefaultModule =
  | "dashboard"
  | "it-filing"
  | "plot-calc"
  | "loans"
  | "jewel-loan";
export type SettingsCurrency = "INR" | "USD" | "EUR" | "GBP";

export type AppSettings = {
  profile: {
    userName: string;
  };
  preferences: {
    defaultCurrency: SettingsCurrency;
    theme: SettingsTheme;
    defaultModule: SettingsDefaultModule;
  };
  integrations: {
    googleSheetId: string;
    autoSyncEnabled: boolean;
    telegramConfigured: boolean;
  };
};

export type SettingsStatus = {
  googleSheetsStatus: "connected" | "not_connected" | "error";
  telegramStatus: "connected" | "not_connected";
  lastSheetsReadAt: string | null;
  sheetsError: string | null;
};

export type SettingsApiResponse = {
  ok: boolean;
  message: string;
  settings: AppSettings;
  status: SettingsStatus;
  error: string | null;
};

export function defaultAppSettings(): AppSettings {
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

export function readLocalSettings(): AppSettings {
  const defaults = defaultAppSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, any>;
    if (parsed.profile || parsed.preferences || parsed.integrations) {
      return {
        profile: {
          userName: String(parsed.profile?.userName ?? defaults.profile.userName),
        },
        preferences: {
          defaultCurrency: (parsed.preferences?.defaultCurrency ?? defaults.preferences.defaultCurrency) as SettingsCurrency,
          theme: (parsed.preferences?.theme ?? defaults.preferences.theme) as SettingsTheme,
          defaultModule: (parsed.preferences?.defaultModule ?? defaults.preferences.defaultModule) as SettingsDefaultModule,
        },
        integrations: {
          googleSheetId: String(parsed.integrations?.googleSheetId ?? defaults.integrations.googleSheetId),
          autoSyncEnabled:
            typeof parsed.integrations?.autoSyncEnabled === "boolean"
              ? parsed.integrations.autoSyncEnabled
              : defaults.integrations.autoSyncEnabled,
          telegramConfigured:
            typeof parsed.integrations?.telegramConfigured === "boolean"
              ? parsed.integrations.telegramConfigured
              : defaults.integrations.telegramConfigured,
        },
      };
    }

    // Backward compatibility with older localStorage shape.
    return {
      ...defaults,
      profile: {
        userName: String(parsed.userName ?? defaults.profile.userName),
      },
      preferences: {
        ...defaults.preferences,
        defaultCurrency: (parsed.defaultCurrency ?? defaults.preferences.defaultCurrency) as SettingsCurrency,
      },
    };
  } catch {
    return defaults;
  }
}

export function writeLocalSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export async function fetchSettings(): Promise<SettingsApiResponse> {
  try {
    const res = await fetch("/api/settings");
    const json = (await res.json()) as SettingsApiResponse;
    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? json.message ?? "Failed to load settings");
    }
    writeLocalSettings(json.settings);
    return json;
  } catch (e: any) {
    return {
      ok: false,
      message: "Using local settings fallback",
      settings: readLocalSettings(),
      status: {
        googleSheetsStatus: "not_connected",
        telegramStatus: "not_connected",
        lastSheetsReadAt: null,
        sheetsError: null,
      },
      error: e?.message ?? "Failed to load settings",
    };
  }
}

export async function saveSettings(settings: AppSettings): Promise<SettingsApiResponse> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  const json = (await res.json()) as SettingsApiResponse;
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? json.message ?? "Failed to save settings");
  }
  writeLocalSettings(json.settings);
  return json;
}

export async function syncNow(): Promise<SettingsApiResponse> {
  const res = await fetch("/api/settings/sync", {
    method: "POST",
  });
  const json = (await res.json()) as SettingsApiResponse;
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? json.message ?? "Sync failed");
  }
  writeLocalSettings(json.settings);
  return json;
}

export async function connectSheets(googleSheetId: string): Promise<SettingsApiResponse> {
  const res = await fetch("/api/settings/connect-sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ googleSheetId }),
  });
  const json = (await res.json()) as SettingsApiResponse;
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? json.message ?? "Failed to connect sheets");
  }
  writeLocalSettings(json.settings);
  return json;
}

export async function connectTelegram(token: string): Promise<SettingsApiResponse> {
  const res = await fetch("/api/settings/connect-telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const json = (await res.json()) as SettingsApiResponse;
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? json.message ?? "Failed to connect Telegram");
  }
  writeLocalSettings(json.settings);
  return json;
}
