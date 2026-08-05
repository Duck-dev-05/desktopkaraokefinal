import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

export interface AppSettings {
  micDevice: string;
  micGain: number;
  noiseSuppression: boolean;
  outputDevice: string;
  masterVolume: number;
  videoQuality: string;
  showBackgroundVideo: boolean;
  lyricsSync: string;
}

const defaultSettings: AppSettings = {
  micDevice: 'default',
  micGain: 75,
  noiseSuppression: true,
  outputDevice: 'default',
  masterVolume: 100,
  videoQuality: '1080p',
  showBackgroundVideo: true,
  lyricsSync: 'smooth',
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
