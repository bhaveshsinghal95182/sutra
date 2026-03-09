import {
  Bell,
  Database,
  Info,
  Keyboard,
  type LucideIcon,
  Monitor,
  Palette,
  Shield,
  Type,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import JsonCodeEditor from '@/components/ui/json-code-editor';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  parseThemeSettingsJson,
  resolveThemeIsDark,
  type ThemeMode,
  type ThemeSettings,
  themeSettingsToJson,
} from '@/lib/theme-settings';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vimMode: boolean;
  onVimModeChange: (enabled: boolean) => void;
  showLineNumbers: boolean;
  onShowLineNumbersChange: (enabled: boolean) => void;
  themeSettings: ThemeSettings;
  onThemeSettingsChange: (settings: ThemeSettings) => void;
  themeTemplates: Record<string, string>;
}

const sections = [
  { id: 'editor', label: 'Editor', icon: Type },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'display', label: 'Display', icon: Monitor },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'about', label: 'About', icon: Info },
];

const SettingsDialog = ({
  open,
  onOpenChange,
  vimMode,
  onVimModeChange,
  showLineNumbers,
  onShowLineNumbersChange,
  themeSettings,
  onThemeSettingsChange,
  themeTemplates,
}: SettingsDialogProps) => {
  const [activeSection, setActiveSection] = useState('editor');

  // Dummy state for all the placeholder settings
  const [fontSize, setFontSize] = useState('14');
  const [wordWrap, setWordWrap] = useState(true);
  const [minimap, setMinimap] = useState(false);
  const [themeJsonText, setThemeJsonText] = useState(() =>
    themeSettingsToJson(themeSettings)
  );
  const [themeJsonError, setThemeJsonError] = useState<string | null>(null);
  const [compactMode, setCompactMode] = useState(false);
  const [sidebarPosition, setSidebarPosition] = useState('left');
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(true);
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [notifyUpdates, setNotifyUpdates] = useState(true);
  const [notifySave, setNotifySave] = useState(false);
  const [notifyErrors, setNotifyErrors] = useState(true);
  const [telemetry, setTelemetry] = useState(false);
  const [crashReports, setCrashReports] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [backupInterval, setBackupInterval] = useState('5');
  const isDarkTheme = resolveThemeIsDark(themeSettings.mode);

  const handleThemeModeChange = (mode: string) => {
    onThemeSettingsChange({
      ...themeSettings,
      mode: mode as ThemeMode,
    });
  };

  const handleApplyThemeJson = () => {
    try {
      const parsed = parseThemeSettingsJson(themeJsonText);
      onThemeSettingsChange(parsed);
      setThemeJsonError(null);
    } catch (error) {
      setThemeJsonError(
        error instanceof Error ? error.message : 'Invalid theme JSON.'
      );
    }
  };

  const handleResetThemeJson = () => {
    const text = themeSettingsToJson(themeSettings);
    setThemeJsonText(text);
    setThemeJsonError(null);
  };

  const SettingRow = ({
    icon: Icon,
    label,
    description,
    children,
  }: {
    icon: LucideIcon;
    label: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <Icon size={16} className="text-muted-foreground shrink-0" />
        <div className="space-y-0.5">
          <Label className="text-sm text-foreground">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
      {title}
    </h3>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'editor':
        return (
          <div className="space-y-1">
            <SectionHeader title="Keybindings" />
            <SettingRow
              icon={Keyboard}
              label="Vim keybindings"
              description="Use Vim-style keyboard shortcuts"
            >
              <Switch checked={vimMode} onCheckedChange={onVimModeChange} />
            </SettingRow>
            <Separator className="bg-sidebar-border" />
            <SectionHeader title="Text" />
            <SettingRow
              icon={Type}
              label="Font size"
              description="Base font size in pixels"
            >
              <RadioGroup
                value={fontSize}
                onValueChange={setFontSize}
                className="flex gap-2"
              >
                {['12', '14', '16', '18'].map((s) => (
                  <div key={s} className="flex items-center gap-1">
                    <RadioGroupItem value={s} id={`fs-${s}`} />
                    <Label
                      htmlFor={`fs-${s}`}
                      className="text-xs text-muted-foreground cursor-pointer"
                    >
                      {s}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </SettingRow>
            <SettingRow
              icon={Type}
              label="Line numbers"
              description="Show line numbers in the gutter"
            >
              <Switch
                checked={showLineNumbers}
                onCheckedChange={onShowLineNumbersChange}
              />
            </SettingRow>
            <SettingRow
              icon={Type}
              label="Word wrap"
              description="Wrap long lines to fit the editor width"
            >
              <Switch checked={wordWrap} onCheckedChange={setWordWrap} />
            </SettingRow>
            <SettingRow
              icon={Type}
              label="Minimap"
              description="Show a minimap of the document"
            >
              <Switch checked={minimap} onCheckedChange={setMinimap} />
            </SettingRow>
          </div>
        );
      case 'appearance':
        return (
          <div className="space-y-1">
            <SectionHeader title="Theme" />
            <SettingRow
              icon={Palette}
              label="Color theme"
              description="Choose light, dark, or system mode"
            >
              <RadioGroup
                value={themeSettings.mode}
                onValueChange={handleThemeModeChange}
                className="flex gap-2"
              >
                {['light', 'dark', 'system'].map((t) => (
                  <div key={t} className="flex items-center gap-1">
                    <RadioGroupItem value={t} id={`theme-${t}`} />
                    <Label
                      htmlFor={`theme-${t}`}
                      className="text-xs text-muted-foreground cursor-pointer capitalize"
                    >
                      {t}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </SettingRow>
            <SettingRow
              icon={Palette}
              label="Compact mode"
              description="Reduce padding and margins throughout the UI"
            >
              <Switch checked={compactMode} onCheckedChange={setCompactMode} />
            </SettingRow>
            <Separator className="bg-sidebar-border" />
            <SectionHeader title="Templates" />
            <p className="text-xs text-muted-foreground mb-2">
              Click a template to apply it instantly.
            </p>
            <div className="grid grid-cols-2 gap-2 pb-2">
              {Object.entries(themeTemplates).map(([name, json]) => {
                const parsed = JSON.parse(json) as {
                  variables?: {
                    dark?: { primary?: string; background?: string };
                  };
                };
                const previewPrimary =
                  parsed.variables?.dark?.primary ?? 'var(--primary)';
                const previewBg =
                  parsed.variables?.dark?.background ?? 'var(--card)';
                return (
                  <button
                    key={name}
                    onClick={() => {
                      const settings = parseThemeSettingsJson(json);
                      onThemeSettingsChange(settings);
                      setThemeJsonText(json);
                      setThemeJsonError(null);
                    }}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                      'border-sidebar-border hover:border-primary/40 hover:bg-muted/50'
                    )}
                  >
                    <div
                      className="size-8 shrink-0 rounded-md border border-border/40 shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${previewPrimary} 40%, ${previewBg} 100%)`,
                      }}
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <Separator className="bg-sidebar-border" />
            <div className="space-y-2 py-2">
              <Label className="text-sm text-foreground">Theme JSON</Label>
              <p className="text-xs text-muted-foreground">
                Override CSS variables for light and dark modes. Use keys like
                <code className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  background
                </code>{' '}
                or
                <code className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  --background
                </code>
                .
              </p>
              <div className="h-72 overflow-hidden rounded-md border border-sidebar-border bg-card focus-within:ring-2 focus-within:ring-ring">
                <JsonCodeEditor
                  value={themeJsonText}
                  onChange={setThemeJsonText}
                  isDark={isDarkTheme}
                  className="h-full w-full overflow-hidden [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto"
                />
              </div>
              {themeJsonError ? (
                <p className="text-xs text-destructive">{themeJsonError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Tip: color tokens used across the app include `background`,
                  `foreground`, `primary`, `muted`, `border`, `sidebar`, and
                  `sidebar-foreground`.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button size="sm" onClick={handleApplyThemeJson}>
                  Apply JSON
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetThemeJson}
                >
                  Reset Editor
                </Button>
              </div>
            </div>
          </div>
        );
      case 'display':
        return (
          <div className="space-y-1">
            <SectionHeader title="Layout" />
            <SettingRow
              icon={Monitor}
              label="Sidebar position"
              description="Place the sidebar on the left or right"
            >
              <RadioGroup
                value={sidebarPosition}
                onValueChange={setSidebarPosition}
                className="flex gap-2"
              >
                {['left', 'right'].map((p) => (
                  <div key={p} className="flex items-center gap-1">
                    <RadioGroupItem value={p} id={`pos-${p}`} />
                    <Label
                      htmlFor={`pos-${p}`}
                      className="text-xs text-muted-foreground cursor-pointer capitalize"
                    >
                      {p}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </SettingRow>
            <SettingRow
              icon={Monitor}
              label="Breadcrumbs"
              description="Show file path breadcrumbs above the editor"
            >
              <Switch
                checked={showBreadcrumbs}
                onCheckedChange={setShowBreadcrumbs}
              />
            </SettingRow>
            <SettingRow
              icon={Monitor}
              label="Status bar"
              description="Show the status bar at the bottom"
            >
              <Switch
                checked={showStatusBar}
                onCheckedChange={setShowStatusBar}
              />
            </SettingRow>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-1">
            <SectionHeader title="Alerts" />
            <SettingRow
              icon={Bell}
              label="Update notifications"
              description="Get notified about new updates"
            >
              <Switch
                checked={notifyUpdates}
                onCheckedChange={setNotifyUpdates}
              />
            </SettingRow>
            <SettingRow
              icon={Bell}
              label="Save confirmations"
              description="Show a toast when files are saved"
            >
              <Switch checked={notifySave} onCheckedChange={setNotifySave} />
            </SettingRow>
            <SettingRow
              icon={Bell}
              label="Error alerts"
              description="Show alerts on parsing or save errors"
            >
              <Switch
                checked={notifyErrors}
                onCheckedChange={setNotifyErrors}
              />
            </SettingRow>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-1">
            <SectionHeader title="Telemetry" />
            <SettingRow
              icon={Shield}
              label="Usage analytics"
              description="Send anonymous usage data to help improve the app"
            >
              <Switch checked={telemetry} onCheckedChange={setTelemetry} />
            </SettingRow>
            <SettingRow
              icon={Shield}
              label="Crash reports"
              description="Automatically send crash reports"
            >
              <Switch
                checked={crashReports}
                onCheckedChange={setCrashReports}
              />
            </SettingRow>
          </div>
        );
      case 'data':
        return (
          <div className="space-y-1">
            <SectionHeader title="Storage" />
            <SettingRow
              icon={Database}
              label="Auto-save"
              description="Automatically save changes as you type"
            >
              <Switch checked={autoSave} onCheckedChange={setAutoSave} />
            </SettingRow>
            <SettingRow
              icon={Database}
              label="Backup interval"
              description="Minutes between automatic backups"
            >
              <RadioGroup
                value={backupInterval}
                onValueChange={setBackupInterval}
                className="flex gap-2"
              >
                {['1', '5', '15', '30'].map((i) => (
                  <div key={i} className="flex items-center gap-1">
                    <RadioGroupItem value={i} id={`backup-${i}`} />
                    <Label
                      htmlFor={`backup-${i}`}
                      className="text-xs text-muted-foreground cursor-pointer"
                    >
                      {i}m
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </SettingRow>
          </div>
        );
      case 'about':
        return (
          <div className="space-y-4">
            <SectionHeader title="Application" />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="text-foreground font-medium">
                  Markdown Editor
                </span>{' '}
                v0.1.0
              </p>
              <p>
                A minimal, distraction-free markdown editor built with React.
              </p>
              <Separator className="bg-sidebar-border" />
              <p className="text-xs">© 2026 — All rights reserved.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-130 max-h-[85vh] p-0 bg-sidebar border-sidebar-border overflow-hidden">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex h-full min-h-0">
          {/* Sidebar */}
          <div className="w-48 shrink-0 border-r border-sidebar-border p-3 space-y-1 overflow-y-auto">
            <h2 className="text-sm font-semibold text-foreground px-2 py-1.5 mb-2">
              Settings
            </h2>
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                  activeSection === id
                    ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 overscroll-contain">
            <h2 className="text-base font-semibold text-foreground mb-4 capitalize">
              {activeSection}
            </h2>
            {renderContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
