import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  FaHome,
  FaUsers,
  FaBox,
  FaHandshake,
  FaProjectDiagram,
  FaClipboardCheck,
  FaTools,
  FaChartLine,
  FaFileAlt,
  FaTimes,
  FaRobot,
  FaCalendarAlt,
  FaShoppingCart,
  FaFileContract,
} from 'react-icons/fa';

const SidebarContainer = styled.aside`
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 260px;
  background: linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%);
  color: white;
  z-index: 1000;
  transform: translateX(${(props) => (props.isOpen ? '0' : '-100%')});
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 10px rgba(0, 0, 0, 0.1);
`;

const Logo = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  img {
    max-width: 180px;
    height: auto;
    filter: brightness(0) invert(1); /* Deixa o logo branco */
  }
  
  span {
    font-size: 0.75rem;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 0.5rem;
  }
`;

const Nav = styled.nav`
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
`;

const NavItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.5rem;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: all 0.2s;
  border-left: 3px solid transparent;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
  
  &.active {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    border-left-color: #60a5fa;
  }
  
  &.highlight {
    background: linear-gradient(90deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.2) 100%);
    border-left-color: #a78bfa;
    font-weight: 600;
    
    &:hover {
      background: linear-gradient(90deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.3) 100%);
    }
  }
  
  svg {
    font-size: 1.125rem;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  display: none;
  
  @media (max-width: 768px) {
    display: block;
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: ${(props) => (props.isOpen ? 'block' : 'none')};
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const menuItems = [
  { path: '/', icon: FaHome, label: 'Dashboard' },
  { path: '/ai', icon: FaRobot, label: 'Assistente IA', highlight: true },
  { path: '/clientes', icon: FaUsers, label: 'Clientes' },
  { path: '/equipamentos', icon: FaBox, label: 'Equipamentos' },
  { path: '/locacoes', icon: FaHandshake, label: 'Locações' },
  { path: '/projetos', icon: FaProjectDiagram, label: 'Projetos' },
  { path: '/planejamento', icon: FaCalendarAlt, label: 'Planejamento' },
  { path: '/manutencoes', icon: FaTools, label: 'Manutenções' },
  { path: '/financeiro', icon: FaChartLine, label: 'Financeiro' },
  { path: '/compras', icon: FaShoppingCart, label: 'Compras' },
  { path: '/ordens-servico', icon: FaFileContract, label: 'Ordens de Serviço' },
  { path: '/relatorios', icon: FaFileAlt, label: 'Relatórios' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const isItemActive = (itemPath) => {
    if (itemPath === '/') return location.pathname === '/';
    return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
  };

  return (
    <>
      <Overlay isOpen={isOpen} onClick={onClose} />
      <SidebarContainer isOpen={isOpen}>
        <CloseButton onClick={onClose}>
          <FaTimes />
        </CloseButton>
        <Logo>
          <img src="/logo.avif" alt="OFFCON Logo" />
          <span>Sistema de Gestão</span>
        </Logo>
        <Nav>
          {menuItems.map((item) => (
            <NavItem
              key={item.path}
              to={item.path}
              className={[
                isItemActive(item.path) ? 'active' : '',
                item.highlight ? 'highlight' : ''
              ].filter(Boolean).join(' ')}
              onClick={() => window.innerWidth <= 768 && onClose()}
            >
              <item.icon />
              {item.label}
            </NavItem>
          ))}
        </Nav>
      </SidebarContainer>
    </>
  );
};

export default Sidebar;
