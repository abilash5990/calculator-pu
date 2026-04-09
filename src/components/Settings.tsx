import { useEffect, useState } from "react";
import {
  AlertCircle,
  Link2,
  RefreshCw,
  Save,
  Send,
  Settings as SettingsIcon,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  type AppSettings,
  connectSheets,
  connectTelegram,
  defaultAppSettings,
  fetchSettings,
  saveSettings,
  syncNow,
  writeLocalSettings,
} from "../lib/settingsApi";

type Notice = { type: "success" | "error" | "info"; text: string } | null;

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [sheetInput, setSheetInput] = useState("");
  const [telegramToken, setTelegramToken] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetchSettings();
      if (!active) return;
      setSettings(res.settings);
      setSheetInput(res.settings.integrations.googleSheetId);
      if (!res.ok && res.error) {
        setNotice({ type: "info", text: `${res.message}: ${res.error}` });
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  function update(next: AppSettings) {
    setSettings(next);
    writeLocalSettings(next);
  }

  async function handleSave() {
    setSaving(true);
    setNotice(null);
    try {
      const res = await saveSettings(settings);
      setSettings(res.settings);
      setNotice({ type: "success", text: "Preferences saved." });
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message ?? "Failed to save preferences" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncNow() {
    setSaving(true);
    setNotice(null);
    try {
      const res = await syncNow();
      setSettings(res.settings);
      setNotice({ type: "success", text: res.message });
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message ?? "Sync failed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleConnectSheets() {
    setSaving(true);
    setNotice(null);
    try {
      const res = await connectSheets(sheetInput);
      setSettings(res.settings);
      setNotice({ type: "success", text: res.message });
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message ?? "Failed to connect sheets" });
    } finally {
      setSaving(false);
    }
  }

  async function handleConnectTelegram() {
    setSaving(true);
    setNotice(null);
    try {
      const res = await connectTelegram(telegramToken);
      setSettings(res.settings);
      setTelegramToken("");
      setNotice({ type: "success", text: res.message });
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message ?? "Failed to connect Telegram" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="glass-card-primary rounded-3xl p-8 border border-white/10 animate-pulse h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {notice && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : notice.type === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-blue-500/30 bg-blue-500/10 text-blue-300"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <aside className="space-y-4">
          <div className="glass-card-tertiary p-5 rounded-3xl border border-white/8">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
              Preferences Hub
            </h3>
            <nav className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/10">
                <User size={16} className="text-blue-400" />
                Profile
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl">
                <SettingsIcon size={16} className="text-purple-400" />
                App Preferences
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl">
                <Link2 size={16} className="text-emerald-400" />
                Integrations
              </div>
            </nav>
          </div>

          <div className="glass-card-tertiary p-5 rounded-3xl border border-blue-500/20 bg-blue-500/[0.06] flex items-start gap-3">
            <ShieldCheck className="text-blue-400 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-slate-400 leading-relaxed">
              Settings are saved to API and mirrored in local cache for offline fallback.
            </p>
          </div>
        </aside>

        <section className="lg:col-span-2 space-y-6">
          <div className="glass-card-primary p-6 rounded-3xl border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User size={18} className="text-blue-400" />
              Profile
            </h3>
            <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={settings.profile.userName}
              onChange={(e) =>
                update({
                  ...settings,
                  profile: { ...settings.profile, userName: e.target.value },
                })
              }
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
              placeholder="Enter your name"
            />
          </div>

          <div className="glass-card-secondary p-6 rounded-3xl border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <SettingsIcon size={18} className="text-purple-400" />
              App Preferences
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Currency</label>
                <select
                  value={settings.preferences.defaultCurrency}
                  onChange={(e) =>
                    update({
                      ...settings,
                      preferences: {
                        ...settings.preferences,
                        defaultCurrency: e.target.value as AppSettings["preferences"]["defaultCurrency"],
                      },
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Theme</label>
                <select
                  value={settings.preferences.theme}
                  onChange={(e) =>
                    update({
                      ...settings,
                      preferences: {
                        ...settings.preferences,
                        theme: e.target.value as AppSettings["preferences"]["theme"],
                      },
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
                >
                  <option value="system">System</option>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Default Module</label>
                <select
                  value={settings.preferences.defaultModule}
                  onChange={(e) =>
                    update({
                      ...settings,
                      preferences: {
                        ...settings.preferences,
                        defaultModule: e.target.value as AppSettings["preferences"]["defaultModule"],
                      },
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="loans">Loan Analytics</option>
                  <option value="it-filing">IT Filing</option>
                  <option value="plot-calc">Plot Purchase</option>
                  <option value="jewel-loan">Jewel Loan</option>
                </select>
              </div>
            </div>
          </div>

          <div className="glass-card-secondary p-6 rounded-3xl border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Link2 size={18} className="text-emerald-400" />
              Integrations
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <input
                  type="text"
                  value={sheetInput}
                  onChange={(e) => setSheetInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
                  placeholder="Google Sheet ID"
                />
                <button
                  type="button"
                  onClick={() => void handleConnectSheets()}
                  disabled={saving}
                  className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition disabled:opacity-70"
                >
                  Connect Sheets
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <input
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
                  placeholder="Telegram token (optional test)"
                />
                <button
                  type="button"
                  onClick={() => void handleConnectTelegram()}
                  disabled={saving}
                  className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold transition disabled:opacity-70"
                >
                  Configure Telegram
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.integrations.autoSyncEnabled}
                  onChange={(e) =>
                    update({
                      ...settings,
                      integrations: {
                        ...settings.integrations,
                        autoSyncEnabled: e.target.checked,
                      },
                    })
                  }
                />
                Auto sync on dashboard load
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => void handleSyncNow()}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold transition inline-flex items-center gap-2 disabled:opacity-70"
            >
              <RefreshCw size={16} />
              Sync Now
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition inline-flex items-center gap-2 disabled:opacity-70"
            >
              {saving ? <AlertCircle size={16} /> : <Save size={16} />}
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                writeLocalSettings(defaultAppSettings());
                setSettings(defaultAppSettings());
                setNotice({ type: "info", text: "Local cache reset to defaults." });
              }}
              className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold transition inline-flex items-center gap-2"
            >
              <Send size={16} />
              Reset Local Cache
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
