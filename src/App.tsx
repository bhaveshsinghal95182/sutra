import './App.css';

import { VaultSelector } from './components/vault-selector/vault-selector';
import VaultView from './components/vault-view/vault-view';
import { useThemeSettings } from './lib/theme-settings';
import { useFolderStore } from './store/useFolderStore';

function App() {
  const { folder } = useFolderStore();
  const { themeSettings, setThemeSettings, themeTemplates } =
    useThemeSettings();

  if (folder) {
    return (
      <VaultView
        themeSettings={themeSettings}
        onThemeSettingsChange={setThemeSettings}
        themeTemplates={themeTemplates}
      />
    );
  }

  return <VaultSelector />;
}

export default App;
