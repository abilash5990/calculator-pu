import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Settings as SettingsIcon, 
  User, 
  Save, 
  ShieldCheck
} from "lucide-react";

interface AppSettings {
  defaultCurrency: string;
  userName: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>({
    defaultCurrency: "INR",
    userName: "User",
  });

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem("finance_hub_settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("finance_hub_settings", JSON.stringify(settings));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleChange = (field: keyof AppSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar for Settings */}
        <div className="space-y-4">
          <div className="glass p-6 rounded-3xl border border-white/10">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Settings Categories</h3>
            <nav className="space-y-2">
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-400 text-sm font-medium transition-colors">
                <User size={18} />
                Profile Info
              </button>
            </nav>
          </div>

          <div className="glass p-6 rounded-3xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
            <ShieldCheck className="text-blue-500 shrink-0 mt-1" size={18} />
            <p className="text-xs text-gray-400 leading-relaxed">
              Integration configuration is handled on the server using environment variables and `credentials.json`.
            </p>
          </div>
        </div>

        {/* Main Settings Form */}
        <div className="md:col-span-2 space-y-8">
          {/* Profile Section */}
          <div className="glass p-8 rounded-3xl border border-white/10">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <User className="text-blue-500" />
              Profile Preferences
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Display Name</label>
                <input 
                  type="text" 
                  value={settings.userName}
                  onChange={(e) => handleChange("userName", e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Default Currency</label>
                <select 
                  value={settings.defaultCurrency}
                  onChange={(e) => handleChange("defaultCurrency", e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                >
                  <option value="INR">Indian Rupee (â¹) - INR</option>
                  <option value="USD">US Dollar ($) - USD</option>
                  <option value="EUR">Euro (â‚¬) - EUR</option>
                  <option value="GBP">British Pound (Â£) - GBP</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-4">
            {isSaved && (
              <motion.span 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-green-500 text-sm font-bold"
              >
                Settings Saved Successfully!
              </motion.span>
            )}
            <button 
              onClick={handleSave}
              className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
            >
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
