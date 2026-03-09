import { useEffect, useState } from 'react';

import { themeTemplates } from './theme-templates';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeSettings {
  mode: ThemeMode;
  variables: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

const STORAGE_KEY = 'sutra-theme-settings';

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: 'system',
  variables: {
    light: {},
    dark: {},
  },
};

function normalizeVarName(name: string): string {
  return name.startsWith('--') ? name : `--${name}`;
}

function normalizeVars(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};

  const out: Record<string, string> = {};
  const entries = Object.entries(input as Record<string, unknown>);

  for (const [key, value] of entries) {
    if (typeof value !== 'string') continue;

    const trimmedKey = key.trim();
    if (!trimmedKey) continue;

    const keyWithoutDashes = trimmedKey.replace(/^--/, '');
    if (!/^[a-z0-9-]+$/i.test(keyWithoutDashes)) continue;

    out[normalizeVarName(keyWithoutDashes)] = value.trim();
  }

  return out;
}

export function normalizeThemeSettings(input: unknown): ThemeSettings {
  if (!input || typeof input !== 'object') {
    return DEFAULT_THEME_SETTINGS;
  }

  const raw = input as Record<string, unknown>;
  const mode =
    raw.mode === 'light' || raw.mode === 'dark' || raw.mode === 'system'
      ? raw.mode
      : DEFAULT_THEME_SETTINGS.mode;

  const variables =
    raw.variables && typeof raw.variables === 'object'
      ? (raw.variables as Record<string, unknown>)
      : {};

  return {
    mode,
    variables: {
      light: normalizeVars(variables.light),
      dark: normalizeVars(variables.dark),
    },
  };
}

export function parseThemeSettingsJson(text: string): ThemeSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Theme JSON is invalid. Please check syntax.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Theme JSON must be an object.');
  }

  return normalizeThemeSettings(parsed);
}

export function themeSettingsToJson(settings: ThemeSettings): string {
  return JSON.stringify(settings, null, 2);
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveThemeIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return getSystemPrefersDark();
}

export function applyThemeSettings(settings: ThemeSettings): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const isDark = resolveThemeIsDark(settings.mode);
  root.classList.toggle('dark', isDark);

  const keys = new Set([
    ...Object.keys(settings.variables.light),
    ...Object.keys(settings.variables.dark),
  ]);

  for (const cssVar of keys) {
    root.style.removeProperty(cssVar);
  }

  const vars = isDark ? settings.variables.dark : settings.variables.light;
  for (const [cssVar, cssValue] of Object.entries(vars)) {
    if (!cssValue) continue;
    root.style.setProperty(cssVar, cssValue);
  }
}

export function useThemeSettings() {
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME_SETTINGS;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_THEME_SETTINGS;
      return normalizeThemeSettings(JSON.parse(raw));
    } catch {
      return DEFAULT_THEME_SETTINGS;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(themeSettings));
    applyThemeSettings(themeSettings);
  }, [themeSettings]);

  useEffect(() => {
    if (typeof window === 'undefined' || themeSettings.mode !== 'system') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeSettings(themeSettings);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [themeSettings]);

  return {
    themeSettings,
    setThemeSettings,
    themeTemplates: themeTemplates as Record<string, string>,
  };
}
