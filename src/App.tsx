import './App.css';

import { VaultSelector } from './components/vault-selector/vault-selector';
import VaultView from './components/vault-view/vault-view';
import { useFolderStore } from './store/useFolderStore';

function App() {
  const { folder } = useFolderStore();

  if (folder) {
    return <VaultView />;
  }

  return <VaultSelector />;
}

export default App;
