import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import DataTable from '../components/common/DataTable';
import {
  getClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente,
} from '../services/api';

const Container = styled.div`
  padding: 0;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
`;

const SearchContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const SearchInput = styled.div`
  position: relative;
  
  input {
    padding: 0.5rem 1rem 0.5rem 2.5rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.875rem;
    width: 300px;
    
    &:focus {
      outline: none;
      border-color: var(--primary);
    }
  }
  
  svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
  }
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: var(--primary-dark);
  }
`;

const Modal = styled.div`
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
  border-radius: 8px;
  padding: 2rem;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  
  &:hover {
    color: var(--text);
  }
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  
  &.full-width {
    grid-column: 1 / -1;
  }
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--text);
`;

const Input = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
  }
`;

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const TextArea = styled.textarea`
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.875rem;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  grid-column: 1 / -1;
`;

const CancelButton = styled(Button)`
  background: var(--secondary);
  
  &:hover {
    background: #475569;
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${(props) => (props.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)')};
  color: ${(props) => (props.active ? 'var(--success)' : 'var(--danger)')};
`;

const Clientes = ({ onPathChange }) => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    segmento: '',
    contato_nome: '',
    contato_email: '',
    contato_telefone: '',
    observacoes: '',
    ativo: 1,
  });

  useEffect(() => {
    onPathChange && onPathChange('/clientes');
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const response = await getClientes();
      setClientes(response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const response = await getClientes({ search: searchTerm });
      setClientes(response.data);
    } catch (error) {
      console.error('Erro ao pesquisar clientes:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        await updateCliente(editingCliente.id, formData);
      } else {
        await createCliente(formData);
      }
      setModalOpen(false);
      setEditingCliente(null);
      resetForm();
      loadClientes();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente: ' + error.response?.data?.error);
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData(cliente);
    setModalOpen(true);
  };

  const handleDelete = async (cliente) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente ${cliente.razao_social}?`)) {
      try {
        await deleteCliente(cliente.id);
        loadClientes();
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        alert('Erro ao excluir cliente: ' + error.response?.data?.error);
      }
    }
  };

  const handleView = (cliente) => {
    // Implementar visualização detalhada
    console.log('Visualizar cliente:', cliente);
  };

  const resetForm = () => {
    setFormData({
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      email: '',
      telefone: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      segmento: '',
      contato_nome: '',
      contato_email: '',
      contato_telefone: '',
      observacoes: '',
      ativo: 1,
    });
  };

  const openModal = () => {
    setEditingCliente(null);
    resetForm();
    setModalOpen(true);
  };

  const columns = [
    { key: 'razao_social', title: 'Razão Social' },
    { key: 'nome_fantasia', title: 'Nome Fantasia' },
    { key: 'cnpj', title: 'CNPJ' },
    { key: 'segmento', title: 'Segmento' },
    {
      key: 'ativo',
      title: 'Status',
      render: (value) => <StatusBadge active={value}>{value ? 'Ativo' : 'Inativo'}</StatusBadge>,
    },
    {
      key: 'data_cadastro',
      title: 'Data Cadastro',
      render: (value) => new Date(value).toLocaleDateString('pt-BR'),
    },
  ];

  return (
    <Container>
      <Header>
        <Title>Gestão de Clientes</Title>
        <SearchContainer>
          <SearchInput>
            <FaSearch />
            <input
              type="text"
              placeholder="Pesquisar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </SearchInput>
          <Button onClick={openModal}>
            <FaPlus /> Novo Cliente
          </Button>
        </SearchContainer>
      </Header>

      <DataTable
        columns={columns}
        data={clientes}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        emptyMessage="Nenhum cliente encontrado"
      />

      {modalOpen && (
        <Modal onClick={() => setModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
              </ModalTitle>
              <CloseButton onClick={() => setModalOpen(false)}>&times;</CloseButton>
            </ModalHeader>

            <Form onSubmit={handleSubmit}>
              <FormGroup>
                <Label>Razão Social *</Label>
                <Input
                  type="text"
                  value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label>Nome Fantasia</Label>
                <Input
                  type="text"
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>CNPJ *</Label>
                <Input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label>Segmento</Label>
                <Input
                  type="text"
                  value={formData.segmento}
                  onChange={(e) => setFormData({ ...formData, segmento: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>Telefone</Label>
                <Input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </FormGroup>

              <FormGroup className="full-width">
                <Label>Endereço</Label>
                <Input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>Cidade</Label>
                <Input
                  type="text"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>Estado</Label>
                <Input
                  type="text"
                  maxLength="2"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>CEP</Label>
                <Input
                  type="text"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>Status</Label>
                <Select
                  value={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: parseInt(e.target.value) })}
                >
                  <option value={1}>Ativo</option>
                  <option value={0}>Inativo</option>
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>Nome do Contato</Label>
                <Input
                  type="text"
                  value={formData.contato_nome}
                  onChange={(e) => setFormData({ ...formData, contato_nome: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>E-mail do Contato</Label>
                <Input
                  type="email"
                  value={formData.contato_email}
                  onChange={(e) => setFormData({ ...formData, contato_email: e.target.value })}
                />
              </FormGroup>

              <FormGroup>
                <Label>Telefone do Contato</Label>
                <Input
                  type="text"
                  value={formData.contato_telefone}
                  onChange={(e) => setFormData({ ...formData, contato_telefone: e.target.value })}
                />
              </FormGroup>

              <FormGroup className="full-width">
                <Label>Observações</Label>
                <TextArea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                />
              </FormGroup>

              <ButtonGroup>
                <CancelButton type="button" onClick={() => setModalOpen(false)}>
                  Cancelar
                </CancelButton>
                <Button type="submit">
                  {editingCliente ? 'Salvar Alterações' : 'Criar Cliente'}
                </Button>
              </ButtonGroup>
            </Form>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default Clientes;