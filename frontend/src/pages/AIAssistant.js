import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import {
  FaRobot,
  FaPaperPlane,
  FaImage,
  FaCheck,
  FaTimes,
  FaSpinner,
  FaKey,
  FaCog,
  FaTrash,
  FaExclamationTriangle
} from 'react-icons/fa';
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
  background: var(--background);
`;

const Header = styled.div`
  background: white;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  h1 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .ai-badge {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
`;

const ConfigButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  
  &:hover {
    background: var(--border);
  }
`;

const ChatContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Message = styled.div`
  display: flex;
  gap: 1rem;
  max-width: 80%;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    ${props => props.isUser ? `
      background: var(--primary);
      color: white;
    ` : `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    `}
  }
  
  .content {
    background: ${props => props.isUser ? 'var(--primary)' : 'white'};
    color: ${props => props.isUser ? 'white' : 'var(--text)'};
    padding: 1rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    
    p {
      margin: 0 0 0.5rem 0;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
    
    .timestamp {
      font-size: 0.75rem;
      opacity: 0.7;
      margin-top: 0.5rem;
    }
  }
`;

const ConfirmationCard = styled.div`
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 0.5rem;
  
  h4 {
    margin: 0 0 0.5rem 0;
    color: #92400e;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  pre {
    background: white;
    padding: 0.75rem;
    border-radius: 4px;
    font-size: 0.75rem;
    overflow-x: auto;
    margin: 0.5rem 0;
  }
  
  .actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  
  &.confirm {
    background: var(--success);
    color: white;
    
    &:hover {
      background: #059669;
    }
  }
  
  &.cancel {
    background: var(--danger);
    color: white;
    
    &:hover {
      background: #dc2626;
    }
  }
`;

const InputContainer = styled.div`
  background: white;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
`;

const Input = styled.textarea`
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: 24px;
  resize: none;
  font-family: inherit;
  font-size: 0.875rem;
  min-height: 24px;
  max-height: 120px;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
  }
`;

const IconButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &.image {
    background: var(--background);
    color: var(--text);
    
    &:hover {
      background: var(--border);
    }
  }
  
  &.send {
    background: var(--primary);
    color: white;
    
    &:hover {
      background: var(--primary-dark);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`;

const ImagePreview = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem;
  background: var(--background);
  border-radius: 8px;
  margin-bottom: 0.5rem;
  
  img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
  }
  
  button {
    background: none;
    border: none;
    color: var(--danger);
    cursor: pointer;
    padding: 0.25rem;
  }
`;

// Guided Operation Components
const GuidedPanel = styled.div`
  background: white;
  border-bottom: 1px solid var(--border);
  padding: 1rem 1.5rem;
`;

const SelectorSection = styled.div`
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const PlanningRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
`;

const PlanningToggle = styled.button`
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 2px solid ${props => props.active ? '#0284c7' : 'var(--border)'};
  background: ${props => props.active ? '#e0f2fe' : 'white'};
  color: ${props => props.active ? '#075985' : 'var(--text)'};
  font-weight: 600;
  cursor: pointer;
`;

const OSSelect = styled.select`
  min-width: 320px;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
`;

const TableButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const TableButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 2px solid ${props => props.active ? 'var(--primary)' : 'var(--border)'};
  background: ${props => props.active ? 'var(--primary)' : 'white'};
  color: ${props => props.active ? 'white' : 'var(--text)'};
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--primary);
    background: ${props => props.active ? 'var(--primary)' : 'rgba(30, 58, 138, 0.05)'};
  }
  
  .icon {
    font-size: 1.1rem;
  }
`;

const OperationButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const OperationButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 2px solid ${props => props.active ? props.color || 'var(--primary)' : 'var(--border)'};
  background: ${props => props.active ? props.color || 'var(--primary)' : 'white'};
  color: ${props => props.active ? 'white' : 'var(--text)'};
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${props => props.color || 'var(--primary)'};
    background: ${props => props.active ? props.color || 'var(--primary)' : `${props.color || 'var(--primary)'}10`};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FieldsHelper = styled.div`
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-top: 0.75rem;
  
  .helper-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #0369a1;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .fields-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .field-tag {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    
    &.required {
      background: #fee2e2;
      color: #991b1b;
      font-weight: 600;
    }
    
    &.optional {
      background: #e5e7eb;
      color: #374151;
    }
  }
  
  .toggle-optional {
    font-size: 0.75rem;
    color: #0369a1;
    background: none;
    border: none;
    cursor: pointer;
    margin-top: 0.5rem;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ConfigModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  
  h2 {
    margin: 0 0 1.5rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
  
  label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  select, input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.875rem;
    
    &:focus {
      outline: none;
      border-color: var(--primary);
    }
  }
  
  .help-text {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
  }
`;

const AIAssistant = ({ onPathChange }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);

  // Configurações
  const [config, setConfig] = useState({
    provider: localStorage.getItem('ai_provider') || 'groq',
    apiKey: localStorage.getItem('ai_api_key') || '',
    model: localStorage.getItem('ai_model') || 'llama-3.3-70b-versatile'
  });

  const [providers, setProviders] = useState([]);
  const [modules, setModules] = useState([]);
  const [configStatus, setConfigStatus] = useState({
    defaultProvider: 'groq',
    serverSideKeys: { groq: false }
  });
  const [availableOS, setAvailableOS] = useState([]);

  // Guided Operations State
  const [guidedTables, setGuidedTables] = useState([]);
  const [guidedOperations, setGuidedOperations] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [tableConfig, setTableConfig] = useState(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [planningMode, setPlanningMode] = useState(false);
  const [selectedPlanningOS, setSelectedPlanningOS] = useState('');

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    onPathChange && onPathChange('/ai');
    loadProviders();
    loadConfigStatus();
    loadAvailableOS();
    loadModules();
    loadGuidedData();
    addWelcomeMessage();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load table config when table is selected
  useEffect(() => {
    if (selectedTable) {
      loadTableConfig(selectedTable);
    } else {
      setTableConfig(null);
    }
  }, [selectedTable]);

  const addWelcomeMessage = () => {
    setMessages([{
      id: Date.now(),
      isUser: false,
      text: 'Olá! Sou seu assistente inteligente do sistema OFFCON.\n\n🎯 **Modo Guiado**: Selecione uma tabela e operação acima para operações precisas.\n\n💬 **Modo Livre**: Ou simplesmente digite sua solicitação no campo abaixo.\n\nComo posso ajudar você hoje?',
      timestamp: new Date()
    }]);
  };

  const loadProviders = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ai/providers`);
      setProviders(Object.entries(response.data.providers).map(([key, value]) => ({
        id: key,
        ...value
      })));
    } catch (error) {
      console.error('Erro ao carregar provedores:', error);
    }
  };

  const loadConfigStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ai/config-status`);
      setConfigStatus(response.data);
    } catch (error) {
      console.error('Erro ao carregar status de configuração IA:', error);
    }
  };

  const loadAvailableOS = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/planning/available-os`);
      setAvailableOS(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar OS para planejamento:', error);
    }
  };

  const loadModules = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ai/modules`);
      setModules(response.data.modules);
    } catch (error) {
      console.error('Erro ao carregar módulos:', error);
    }
  };

  const loadGuidedData = async () => {
    try {
      const [tablesRes, opsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/ai/guided-tables`),
        axios.get(`${API_BASE_URL}/ai/guided-operations`)
      ]);
      setGuidedTables(tablesRes.data.tables);
      setGuidedOperations(opsRes.data.operations);
    } catch (error) {
      console.error('Erro ao carregar dados guiados:', error);
    }
  };

  const loadTableConfig = async (tableId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ai/guided-config/${tableId}`);
      setTableConfig(response.data.config);
    } catch (error) {
      console.error('Erro ao carregar config da tabela:', error);
      setTableConfig(null);
    }
  };

  const handleTableSelect = (tableId) => {
    if (selectedTable === tableId) {
      setSelectedTable(null);
      setSelectedOperation(null);
    } else {
      setSelectedTable(tableId);
      // Auto-select INSERT when table is selected
      if (!selectedOperation) {
        setSelectedOperation('INSERT');
      }
    }
    setShowOptionalFields(false);
  };

  const handleOperationSelect = (opId) => {
    if (selectedOperation === opId) {
      setSelectedOperation(null);
    } else {
      setSelectedOperation(opId);
    }
  };

  const getPlaceholderText = () => {
    if (planningMode) {
      return selectedPlanningOS
        ? 'Ex: No item 3.2, altere o término para 2026-03-10 e progresso 60%'
        : 'Selecione uma OS para usar o modo Planejamento (WBS)';
    }

    if (selectedTable && selectedOperation && tableConfig) {
      const opName = guidedOperations.find(o => o.id === selectedOperation)?.name || selectedOperation;
      return `${opName} ${tableConfig.name}... (ex: ${getExampleText()})`;
    }
    return selectedImage
      ? "Descreva a imagem ou deixe em branco..."
      : "Digite sua mensagem... (ex: Cadastrar cliente Petrobras)";
  };

  const getExampleText = () => {
    if (!tableConfig || !selectedOperation) return '';

    switch (selectedOperation) {
      case 'INSERT':
        const fields = tableConfig.requiredFields?.slice(0, 2).map(f => f.label).join(' e ') || '';
        return `Informe ${fields}`;
      case 'UPDATE':
        return `Alterar campo do ${tableConfig.name.slice(0, -1).toLowerCase()}`;
      case 'QUERY':
        return `Listar todos ou buscar por critério`;
      case 'DELETE':
        return `Remover por ID ou nome`;
      default:
        return '';
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedImage) return;
    const providerConfig = getCurrentProvider();
    const serverKeyAvailable = Boolean(providerConfig?.serverSideKeyAvailable || configStatus?.serverSideKeys?.[config.provider]);
    const requiresApiKey = providerConfig ? providerConfig.requiresApiKey : true;

    if (!config.apiKey && requiresApiKey && !serverKeyAvailable) {
      setShowConfig(true);
      return;
    }

    const messageText = inputMessage;
    setInputMessage('');

    // Adiciona mensagem do usuário
    const userMessage = {
      id: Date.now(),
      isUser: true,
      text: messageText,
      image: selectedImage,
      guidedContext: selectedTable && selectedOperation ? { table: selectedTable, operation: selectedOperation } : null,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      let response;

      if (selectedImage) {
        // Analisa imagem
        const formData = new FormData();
        formData.append('image', selectedImage.file);
        formData.append('provider', config.provider);
        formData.append('apiKey', config.apiKey);
        formData.append('prompt', messageText || 'Analise esta imagem');
        if (selectedTable) formData.append('table', selectedTable);
        if (selectedOperation) formData.append('operation', selectedOperation);

        response = await axios.post(`${API_BASE_URL}/ai/analyze-image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success) {
          const analysis = response.data.analysis;

          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            isUser: false,
            text: analysis.confirmation_message || 'Análise concluída.',
            analysis: analysis,
            requiresConfirmation: analysis.suggested_action != null,
            timestamp: new Date()
          }]);

          if (analysis.suggested_action) {
            setPendingConfirmation(analysis.suggested_action);
          }
        }
      } else if (planningMode) {
        if (!selectedPlanningOS) {
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            isUser: false,
            text: 'Selecione uma OS para usar o modo Planejamento (WBS).',
            isError: true,
            timestamp: new Date()
          }]);
          return;
        }

        response = await axios.post(`${API_BASE_URL}/ai/planning-chat`, {
          message: messageText,
          os_id: Number(selectedPlanningOS),
          provider: config.provider,
          apiKey: config.apiKey || undefined,
          model: config.model
        });

        if (response.data.success) {
          const aiResponse = response.data;
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            isUser: false,
            text: aiResponse.message,
            command: aiResponse.command,
            requiresConfirmation: true,
            timestamp: new Date()
          }]);
          setPendingConfirmation(aiResponse.command);
        } else if (response.data.error) {
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            isUser: false,
            text: `⚠️ ${response.data.error}`,
            isError: true,
            timestamp: new Date()
          }]);
        }
      } else if (selectedTable && selectedOperation) {
        // Guided Operation - API específica
        response = await axios.post(`${API_BASE_URL}/ai/guided-chat`, {
          message: messageText,
          table: selectedTable,
          operation: selectedOperation,
          provider: config.provider,
          apiKey: config.apiKey || undefined,
          model: config.model
        });

        if (response.data.success) {
          const aiResponse = response.data;

          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            isUser: false,
            text: aiResponse.message,
            command: aiResponse.command,
            requiresConfirmation: aiResponse.requiresConfirmation,
            guidedResult: aiResponse.autoExecuted ? aiResponse.result : null,
            timestamp: new Date()
          }]);

          if (aiResponse.requiresConfirmation) {
            setPendingConfirmation(aiResponse.command);
          }
        } else if (response.data.error) {
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            isUser: false,
            text: `⚠️ ${response.data.error}`,
            isError: true,
            timestamp: new Date()
          }]);
        }
      } else {
        // Chat normal (modo livre)
        response = await axios.post(`${API_BASE_URL}/ai/chat`, {
          message: messageText,
          provider: config.provider,
          apiKey: config.apiKey || undefined,
          model: config.model
        });

        if (response.data.success) {
          const aiResponse = response.data;

          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            isUser: false,
            text: aiResponse.message,
            command: aiResponse.command,
            requiresConfirmation: aiResponse.requiresConfirmation,
            timestamp: new Date()
          }]);

          if (aiResponse.requiresConfirmation) {
            setPendingConfirmation(aiResponse.command);
          }
        }
      }
    } catch (error) {
      console.error('Erro:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        isUser: false,
        text: `Erro: ${error.response?.data?.error || error.message}`,
        isError: true,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      setSelectedImage(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingConfirmation) return;

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/ai/execute`, {
        command: pendingConfirmation
      });

      let displayMessage = '';
      if (response.data.success) {
        displayMessage = `✅ ${response.data.message}`;
      } else {
        if (Array.isArray(response.data.results)) {
          const failures = response.data.results.filter(r => !r.success);
          displayMessage = `❌ Erro em ${failures.length} ação(ões):\n` +
            failures.map(f => `- ${f.command.data?.razao_social || f.command.table}: ${f.error}`).join('\n');
        } else {
          displayMessage = `❌ Erro: ${response.data.result?.error || 'Desconhecido'}`;
        }
      }

      setMessages(prev => [...prev, {
        id: Date.now(),
        isUser: false,
        text: displayMessage,
        timestamp: new Date()
      }]);

      setPendingConfirmation(null);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        isUser: false,
        text: `❌ Erro ao executar: ${error.message}`,
        isError: true,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAction = () => {
    setPendingConfirmation(null);
    setMessages(prev => [...prev, {
      id: Date.now(),
      isUser: false,
      text: 'Ação cancelada.',
      timestamp: new Date()
    }]);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage({
          file,
          preview: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const saveConfig = () => {
    localStorage.setItem('ai_provider', config.provider);
    localStorage.setItem('ai_api_key', config.apiKey);
    localStorage.setItem('ai_model', config.model);
    setShowConfig(false);
  };

  const getCurrentProvider = () => {
    return providers.find(p => p.id === config.provider);
  };

  return (
    <Container>
      <Header>
        <Title>
          <h1>
            <FaRobot />
            Assistente IA
            <span className="ai-badge">BETA</span>
          </h1>
        </Title>
        <ConfigButton onClick={() => setShowConfig(true)}>
          <FaKey />
          {(config.apiKey || configStatus?.serverSideKeys?.[config.provider]) ? 'Configurado' : 'Configurar API'}
        </ConfigButton>
      </Header>

      {/* Guided Operations Panel */}
      <GuidedPanel>
        <SelectorSection>
          <div className="label">🗂️ Planejamento (WBS)</div>
          <PlanningRow>
            <PlanningToggle
              active={planningMode}
              onClick={() => setPlanningMode(!planningMode)}
            >
              {planningMode ? 'Modo Planejamento Ativo' : 'Ativar Modo Planejamento'}
            </PlanningToggle>
            <OSSelect
              value={selectedPlanningOS}
              onChange={(e) => setSelectedPlanningOS(e.target.value)}
              disabled={!planningMode}
            >
              <option value="">Selecione a OS para contexto completo</option>
              {availableOS.map(os => (
                <option key={os.id} value={os.id}>
                  {os.numero || `OS ${os.id}`} - {os.cliente_nome || 'Sem cliente'}
                </option>
              ))}
            </OSSelect>
          </PlanningRow>
        </SelectorSection>

        <SelectorSection>
          <div className="label">🎯 Selecione a Tabela</div>
          <TableButtons>
            {guidedTables.map(table => (
              <TableButton
                key={table.id}
                active={selectedTable === table.id}
                onClick={() => handleTableSelect(table.id)}
              >
                <span className="icon">{table.icon}</span>
                {table.name}
              </TableButton>
            ))}
          </TableButtons>
        </SelectorSection>

        {selectedTable && (
          <SelectorSection>
            <div className="label">⚡ Operação</div>
            <OperationButtons>
              {guidedOperations.map(op => (
                <OperationButton
                  key={op.id}
                  active={selectedOperation === op.id}
                  color={op.color}
                  onClick={() => handleOperationSelect(op.id)}
                >
                  <span>{op.icon}</span>
                  {op.name}
                </OperationButton>
              ))}
            </OperationButtons>
          </SelectorSection>
        )}

        {tableConfig && selectedOperation && (
          <FieldsHelper>
            <div className="helper-title">
              📋 Campos para {selectedOperation === 'INSERT' ? 'Cadastrar' : selectedOperation === 'UPDATE' ? 'Atualizar' : selectedOperation === 'QUERY' ? 'Buscar' : 'Deletar'} {tableConfig.name}
            </div>
            <div className="fields-list">
              {tableConfig.requiredFields?.map(field => (
                <span key={field.name} className="field-tag required" title={field.pattern || field.example || ''}>
                  {field.label} *
                </span>
              ))}
              {showOptionalFields && tableConfig.optionalFields?.map(field => (
                <span key={field.name} className="field-tag optional" title={field.pattern || field.example || ''}>
                  {field.label}
                </span>
              ))}
            </div>
            {tableConfig.optionalFields?.length > 0 && (
              <button
                className="toggle-optional"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
              >
                {showOptionalFields ? '▲ Ocultar opcionais' : `▼ Ver ${tableConfig.optionalFields.length} campos opcionais`}
              </button>
            )}
          </FieldsHelper>
        )}
      </GuidedPanel>

      <ChatContainer>
        {messages.map((msg) => (
          <div key={msg.id}>
            <Message isUser={msg.isUser}>
              <div className="avatar">
                {msg.isUser ? 'Você' : <FaRobot />}
              </div>
              <div className="content">
                <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>
                {msg.image && (
                  <img
                    src={msg.image.preview}
                    alt="Anexada"
                    style={{ maxWidth: '200px', marginTop: '0.5rem', borderRadius: '4px' }}
                  />
                )}
                <div className="timestamp">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </Message>

            {msg.requiresConfirmation && pendingConfirmation && (
              <ConfirmationCard>
                <h4>
                  <FaExclamationTriangle />
                  Confirmar Ação
                </h4>
                <p>A IA sugere a seguinte ação:</p>
                <pre>{JSON.stringify(pendingConfirmation, null, 2)}</pre>
                <div className="actions">
                  <ActionButton className="confirm" onClick={handleConfirmAction}>
                    <FaCheck /> Confirmar
                  </ActionButton>
                  <ActionButton className="cancel" onClick={handleCancelAction}>
                    <FaTimes /> Cancelar
                  </ActionButton>
                </div>
              </ConfirmationCard>
            )}
          </div>
        ))}

        {isLoading && (
          <Message isUser={false}>
            <div className="avatar">
              <FaRobot />
            </div>
            <div className="content">
              <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          </Message>
        )}

        <div ref={chatEndRef} />
      </ChatContainer>

      <InputContainer>
        {selectedImage && (
          <div style={{ width: '100%' }}>
            <ImagePreview>
              <img src={selectedImage.preview} alt="Preview" />
              <span>{selectedImage.file.name}</span>
              <button onClick={() => setSelectedImage(null)}>
                <FaTrash />
              </button>
            </ImagePreview>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', alignItems: 'flex-end' }}>
          <IconButton
            className="image"
            onClick={() => fileInputRef.current?.click()}
            title="Enviar imagem"
          >
            <FaImage />
          </IconButton>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleImageSelect}
          />

          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder={getPlaceholderText()}
            rows={1}
          />

          <IconButton
            className="send"
            onClick={handleSendMessage}
            disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
          >
            {isLoading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaPaperPlane />}
          </IconButton>
        </div>
      </InputContainer>

      {showConfig && (
        <ConfigModal onClick={() => setShowConfig(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <h2>
              <FaCog />
              Configurar IA
            </h2>

            <FormGroup>
              <label>Provedor de IA</label>
              <select
                value={config.provider}
                onChange={(e) => setConfig({ ...config, provider: e.target.value })}
              >
                {providers.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} - {provider.description}
                  </option>
                ))}
              </select>
              <div className="help-text">
                Escolha seu provedor de IA preferido
              </div>
            </FormGroup>

            <FormGroup>
              <label>API Key</label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="Sua chave de API"
              />
              <div className="help-text">
                {configStatus?.serverSideKeys?.groq
                  ? 'Groq já configurado no servidor (groq.txt). Você pode deixar este campo vazio para Groq.'
                  : 'Sua chave não é armazenada no servidor.'}
              </div>
            </FormGroup>

            {getCurrentProvider()?.models && (
              <FormGroup>
                <label>Modelo</label>
                <select
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                >
                  {getCurrentProvider().models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
              </FormGroup>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <ActionButton className="cancel" onClick={() => setShowConfig(false)}>
                Cancelar
              </ActionButton>
              <ActionButton className="confirm" onClick={saveConfig}>
                <FaCheck /> Salvar
              </ActionButton>
            </div>
          </ModalContent>
        </ConfigModal>
      )}
    </Container>
  );
};

export default AIAssistant;
