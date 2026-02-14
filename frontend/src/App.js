import React, { useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';

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
import Planning from './pages/Planning';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderForm from './pages/PurchaseOrderForm';
import ServiceOrders from './pages/ServiceOrders';

const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const pageTitle = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/clientes')) return 'Gestão de Clientes';
    if (path.startsWith('/equipamentos')) return 'Gestão de Equipamentos';
    if (path.startsWith('/locacoes')) return 'Gestão de Locações';
    if (path.startsWith('/projetos')) return 'Gestão de Projetos';
    if (path.startsWith('/inspecoes')) return 'Gestão de Inspeções';
    if (path.startsWith('/manutencoes')) return 'Gestão de Manutenções';
    if (path.startsWith('/financeiro')) return 'Gestão Financeira';
    if (path.startsWith('/relatorios')) return 'Relatórios e Analytics';
    if (path.startsWith('/ai')) return 'Assistente IA';
    if (path.startsWith('/planejamento')) return 'Planejamento e Controle';
    if (path.startsWith('/ordens-servico')) return 'Ordens de Serviço';
    if (path.startsWith('/compras/nova')) return 'Nova Ordem de Compra';
    if (path.startsWith('/compras/editar/')) return 'Editar Ordem de Compra';
    if (path.startsWith('/compras/')) return 'Detalhes da Ordem de Compra';
    if (path.startsWith('/compras')) return 'Gestão de Compras';
    return 'OFFCON';
  }, [location.pathname]);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, marginLeft: sidebarOpen ? '260px' : '0', transition: 'margin-left 0.3s' }}>
        <Header title={pageTitle} onMenuClick={() => setSidebarOpen((prev) => !prev)} notificationCount={3} />
        <main style={{ padding: '2rem', minHeight: 'calc(100vh - 73px)' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes/*" element={<Clientes />} />
            <Route path="/equipamentos/*" element={<Equipamentos />} />
            <Route path="/locacoes/*" element={<Locacoes />} />
            <Route path="/projetos/*" element={<Projetos />} />
            <Route path="/inspecoes/*" element={<Inspecoes />} />
            <Route path="/manutencoes/*" element={<Manutencoes />} />
            <Route path="/financeiro/*" element={<Financeiro />} />
            <Route path="/relatorios/*" element={<Relatorios />} />
            <Route path="/ai/*" element={<AIAssistant />} />
            <Route path="/planejamento/*" element={<Planning />} />
            <Route path="/compras" element={<PurchaseOrders />} />
            <Route path="/compras/nova" element={<PurchaseOrderForm />} />
            <Route path="/compras/editar/:id" element={<PurchaseOrderForm />} />
            <Route path="/ordens-servico" element={<ServiceOrders />} />
            <Route path="/compras/:id" element={<PurchaseOrderForm />} />
            <Route path="*" element={<div style={{ padding: '2rem' }}>Página não encontrada.</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <Router>
        <AppShell />
      </Router>
    </AppProvider>
  );
}

export default App;
