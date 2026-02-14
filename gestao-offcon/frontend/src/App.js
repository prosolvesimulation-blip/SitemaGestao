import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import Layout from './components/common/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Equipamentos from './pages/Equipamentos';
import Locacoes from './pages/Locacoes';
import Projetos from './pages/Projetos';
import Inspecoes from './pages/Inspecoes';
import Manutencoes from './pages/Manutencoes';
import Financeiro from './pages/Financeiro';
import Relatorios from './pages/Relatorios';
import AIAssistant from './pages/AIAssistant';

const pageTitles = {
  '/': 'Dashboard',
  '/clientes': 'Gestão de Clientes',
  '/equipamentos': 'Gestão de Equipamentos',
  '/locacoes': 'Gestão de Locações',
  '/projetos': 'Gestão de Projetos',
  '/inspecoes': 'Gestão de Inspeções',
  '/manutencoes': 'Gestão de Manutenções',
  '/financeiro': 'Gestão Financeira',
  '/relatorios': 'Relatórios',
  '/ai': 'Assistente IA',
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPath, setCurrentPath] = useState('/');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <AppProvider>
      <Router>
        <div style={{ display: 'flex' }}>
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div style={{ flex: 1, marginLeft: sidebarOpen ? '260px' : '0', transition: 'margin-left 0.3s' }}>
            <Header
              title={pageTitles[currentPath] || 'OFFCON'}
              onMenuClick={toggleSidebar}
              notificationCount={3}
            />
            <main style={{ padding: '2rem', minHeight: 'calc(100vh - 73px)' }}>
              <Routes>
                <Route path="/" element={<Dashboard onPathChange={setCurrentPath} />} />
                <Route path="/clientes/*" element={<Clientes onPathChange={setCurrentPath} />} />
                <Route path="/equipamentos/*" element={<Equipamentos onPathChange={setCurrentPath} />} />
                <Route path="/locacoes/*" element={<Locacoes onPathChange={setCurrentPath} />} />
                <Route path="/projetos/*" element={<Projetos onPathChange={setCurrentPath} />} />
                <Route path="/inspecoes/*" element={<Inspecoes onPathChange={setCurrentPath} />} />
                <Route path="/manutencoes/*" element={<Manutencoes onPathChange={setCurrentPath} />} />
                <Route path="/financeiro/*" element={<Financeiro onPathChange={setCurrentPath} />} />
                <Route path="/relatorios/*" element={<Relatorios onPathChange={setCurrentPath} />} />
                <Route path="/ai/*" element={<AIAssistant onPathChange={setCurrentPath} />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;