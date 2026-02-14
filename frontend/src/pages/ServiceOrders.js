import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    Grid,
    Tooltip,
    InputAdornment,
    Card,
    CardContent,
    LinearProgress,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    Assignment as PlanIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    TrendingUp as TrendingIcon,
    AssignmentTurnedIn as CompletedIcon,
    AccessTime as PendingIcon,
    AttachMoney as MoneyIcon,
    AutoFixHigh as MagicIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import styled from 'styled-components';

const PageWrapper = styled.div`
    min-height: 100vh;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    padding: 2.5rem;
`;

const GlassPanel = styled(Paper)`
    background: rgba(255, 255, 255, 0.85) !important;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.4) !important;
    box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.08) !important;
    border-radius: 24px !important;
    overflow: hidden;
`;

const StatCard = styled(Card)`
    background: white !important;
    border-radius: 20px !important;
    border: none !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
    transition: transform 0.2s ease-in-out;
    &:hover {
        transform: translateY(-5px);
    }
`;

const statusColors = {
    'PENDENTE': '#f59e0b',
    'EM_ANDAMENTO': '#3b82f6',
    'CONCLUIDO': '#10b981',
    'CANCELADO': '#ef4444'
};

const statusLabels = {
    'PENDENTE': 'Pendente',
    'EM_ANDAMENTO': 'Em Andamento',
    'CONCLUIDO': 'Concluído',
    'CANCELADO': 'Cancelado'
};

const ServiceOrders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, total_value: 0 });

    const [formData, setFormData] = useState({
        numero: '',
        cliente_id: '',
        status: 'PENDENTE',
        data_previsao_conclusao: '',
        valor_total: 0,
        observacoes: ''
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [osRes, cliRes, statsRes] = await Promise.all([
                api.get('/ordens-servico'),
                api.get('/clientes'),
                api.get('/ordens-servico/stats')
            ]);
            console.log('OS Data:', osRes.data);
            setOrders(Array.isArray(osRes.data) ? osRes.data : []);
            setClientes(Array.isArray(cliRes.data) ? cliRes.data : []);
            setStats((statsRes.data && typeof statsRes.data === 'object' && !Array.isArray(statsRes.data)) ? statsRes.data : { total: 0, active: 0, completed: 0, total_value: 0 });
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredOrders = useMemo(() => {
        if (!Array.isArray(orders)) return [];
        return orders.filter(order => {
            const matchesSearch =
                (order.numero?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (order.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [orders, searchTerm, statusFilter]);

    const handleOpenDialog = (order = null) => {
        if (order) {
            setSelectedOrder(order);
            setFormData({
                numero: order.numero,
                cliente_id: order.cliente_id,
                status: order.status,
                data_previsao_conclusao: order.data_previsao_conclusao || '',
                valor_total: order.valor_total || 0,
                observacoes: order.observacoes || ''
            });
        } else {
            setSelectedOrder(null);
            setFormData({
                numero: `OS-${Date.now().toString().slice(-4)}`,
                cliente_id: '',
                status: 'PENDENTE',
                data_previsao_conclusao: '',
                valor_total: 0,
                observacoes: ''
            });
        }
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.cliente_id || !formData.numero) {
            alert('Por favor, preencha o número da OS e selecione um cliente.');
            return;
        }
        try {
            console.log('Enviando OS:', formData);
            if (selectedOrder) {
                await api.put(`/ordens-servico/${selectedOrder.id}`, formData);
            } else {
                await api.post('/ordens-servico', formData);
            }
            setDialogOpen(false);
            loadData();
        } catch (error) {
            console.error('Erro ao salvar OS:', error);
            alert('Erro ao salvar Ordem de Serviço. Verifique os dados e tente novamente.');
        }
    };

    const handleGenerateTemplate = async (os_id) => {
        if (!window.confirm('Deseja gerar o cronograma padrão para esta OS? Isso substituirá qualquer planejamento existente.')) return;
        try {
            await api.post(`/planning/standard-template/${os_id}`);
            alert('Cronograma padrão gerado com sucesso! Você será redirecionado para o planejamento.');
            navigate(`/planejamento?os_id=${os_id}`);
            loadData();
        } catch (error) {
            console.error('Erro ao gerar cronograma:', error);
            alert('Falha ao gerar cronograma.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Deseja realmente excluir esta OS? Isso também removerá seu planejamento vinculado.')) {
            try {
                await api.delete(`/ordens-servico/${id}`);
                loadData();
            } catch (error) {
                console.error('Erro ao excluir OS:', error);
            }
        }
    };

    return (
        <PageWrapper>
            {/* Header Section */}
            <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="h2" sx={{ fontWeight: 900, color: '#1e293b', mb: 1, letterSpacing: '-0.02em' }}>
                        Módulo de Ordens de Serviço
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#64748b', fontWeight: 500 }}>
                        Gerenciamento centralizado de contratos, prazos e execuções.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<AddIcon />}
                    sx={{
                        borderRadius: '16px',
                        px: 4,
                        height: 64,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                        boxShadow: '0 10px 20px -5px rgba(30, 58, 138, 0.4)',
                        textTransform: 'none'
                    }}
                    onClick={() => handleOpenDialog()}
                >
                    Nova Ordem de Serviço
                </Button>
            </Box>

            {/* Stats Dashboard */}
            <Grid container spacing={4} sx={{ mb: 5 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <PendingIcon sx={{ color: '#64748b', mr: 1 }} />
                                <Typography variant="overline" sx={{ fontWeight: 700, color: '#64748b' }}>TOTAL OS</Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.total}</Typography>
                            <LinearProgress variant="determinate" value={100} sx={{ mt: 2, height: 4, borderRadius: 2, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#94a3b8' } }} />
                        </CardContent>
                    </StatCard>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <TrendingIcon sx={{ color: '#f59e0b', mr: 1 }} />
                                <Typography variant="overline" sx={{ fontWeight: 700, color: '#f59e0b' }}>ATIVAS</Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: '#f59e0b' }}>{stats.active}</Typography>
                            <LinearProgress variant="determinate" value={(stats.active / stats.total) * 100 || 0} sx={{ mt: 2, height: 4, borderRadius: 2, bgcolor: '#fef3c7', '& .MuiLinearProgress-bar': { bgcolor: '#f59e0b' } }} />
                        </CardContent>
                    </StatCard>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <CompletedIcon sx={{ color: '#10b981', mr: 1 }} />
                                <Typography variant="overline" sx={{ fontWeight: 700, color: '#10b981' }}>CONCLUÍDAS</Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: '#10b981' }}>{stats.completed}</Typography>
                            <LinearProgress variant="determinate" value={(stats.completed / stats.total) * 100 || 0} sx={{ mt: 2, height: 4, borderRadius: 2, bgcolor: '#dcfce7', '& .MuiLinearProgress-bar': { bgcolor: '#10b981' } }} />
                        </CardContent>
                    </StatCard>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <MoneyIcon sx={{ color: '#3b82f6', mr: 1 }} />
                                <Typography variant="overline" sx={{ fontWeight: 700, color: '#3b82f6' }}>VALOR GLOBAL</Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e3a8a' }}>R$ {stats.total_value?.toLocaleString()}</Typography>
                            <LinearProgress variant="determinate" value={100} sx={{ mt: 2, height: 4, borderRadius: 2, bgcolor: '#dbeafe', '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6' } }} />
                        </CardContent>
                    </StatCard>
                </Grid>
            </Grid>

            {/* Main Content Panel */}
            <GlassPanel>
                {/* Filter Bar */}
                <Box sx={{ p: 4, display: 'flex', gap: 3, alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <TextField
                        placeholder="Buscar por número ou cliente..."
                        variant="outlined"
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'white' } }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: '#94a3b8' }} />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <FormControl sx={{ minWidth: 200 }} size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={statusFilter}
                            label="Status"
                            onChange={(e) => setStatusFilter(e.target.value)}
                            sx={{ borderRadius: '12px', bgcolor: 'white' }}
                        >
                            <MenuItem value="ALL">Todos os Status</MenuItem>
                            {Object.keys(statusColors).map(s => <MenuItem key={s} value={s}>{statusLabels[s]}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <IconButton onClick={loadData} sx={{ bgcolor: '#f1f5f9', p: 1.5 }}><RefreshIcon /></IconButton>
                </Box>

                <TableContainer sx={{ maxHeight: '600px' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 800, color: '#475569', py: 3, bgcolor: 'rgba(241, 245, 249, 0.5)' }}>NÚMERO</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#475569', py: 3, bgcolor: 'rgba(241, 245, 249, 0.5)' }}>CLIENTE</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#475569', py: 3, bgcolor: 'rgba(241, 245, 249, 0.5)' }}>STATUS</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#475569', py: 3, bgcolor: 'rgba(241, 245, 249, 0.5)' }}>PREVISÃO</TableCell>
                                <TableCell sx={{ fontWeight: 800, color: '#475569', py: 3, bgcolor: 'rgba(241, 245, 249, 0.5)' }}>VALOR ESTIMADO</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 800, color: '#475569', py: 3, bgcolor: 'rgba(241, 245, 249, 0.5)' }}>AÇÕES</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                                <TableRow key={order.id} hover sx={{ '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.04)' } }}>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>{order.numero}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>{order.cliente_nome}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={statusLabels[order.status]}
                                            size="small"
                                            sx={{
                                                bgcolor: `${statusColors[order.status]}15`,
                                                color: statusColors[order.status],
                                                fontWeight: 800,
                                                border: `1px solid ${statusColors[order.status]}30`,
                                                borderRadius: '8px',
                                                fontSize: '0.7rem',
                                                textTransform: 'uppercase'
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ color: '#64748b', fontWeight: 500 }}>
                                        {order.data_previsao_conclusao ? new Date(order.data_previsao_conclusao).toLocaleDateString('pt-BR') : 'N/A'}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#1e3a8a' }}>
                                        R$ {order.valor_total?.toLocaleString()}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                            <Tooltip title="Gerar Cronograma Padrão">
                                                <IconButton
                                                    sx={{ bgcolor: '#f0f9ff', color: '#0369a1', '&:hover': { bgcolor: '#e0f2fe' } }}
                                                    onClick={() => handleGenerateTemplate(order.id)}
                                                >
                                                    <MagicIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Acessar Planejamento">
                                                <IconButton
                                                    sx={{ bgcolor: '#dbeafe', color: '#1e40af', '&:hover': { bgcolor: '#bfdbfe' } }}
                                                    onClick={() => navigate(`/planejamento?os_id=${order.id}`)}
                                                >
                                                    <PlanIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Editar Detalhes">
                                                <IconButton
                                                    sx={{ bgcolor: '#f1f5f9', color: '#475569', '&:hover': { bgcolor: '#e2e8f0' } }}
                                                    onClick={() => handleOpenDialog(order)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Remover OS">
                                                <IconButton
                                                    sx={{ bgcolor: '#fee2e2', color: '#dc2626', '&:hover': { bgcolor: '#fecaca' } }}
                                                    onClick={() => handleDelete(order.id)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                        <Typography variant="body1" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma ordem de serviço encontrada.</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </GlassPanel>

            {/* OS Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: '24px', p: 2, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' } }}
            >
                <DialogTitle sx={{ fontWeight: 900, fontSize: '1.6rem', color: '#1e293b' }}>
                    {selectedOrder ? 'Editar Ordem de Serviço' : 'Gerar Nova Ordem de Serviço'}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 4, color: '#64748b' }}>Preencha as informações básicas para iniciar o controle operacional.</Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Número da OS"
                                variant="filled"
                                value={formData.numero}
                                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                                InputProps={{ sx: { borderRadius: '12px' } }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth variant="filled">
                                <InputLabel>Cliente Solicitante</InputLabel>
                                <Select
                                    value={formData.cliente_id}
                                    label="Cliente"
                                    onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                                    sx={{ borderRadius: '12px' }}
                                >
                                    {clientes.map(c => <MenuItem key={c.id} value={c.id}>{c.razao_social}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth variant="filled">
                                <InputLabel>Status Operacional</InputLabel>
                                <Select
                                    value={formData.status}
                                    label="Status"
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    sx={{ borderRadius: '12px' }}
                                >
                                    {Object.keys(statusLabels).map(s => <MenuItem key={s} value={s}>{statusLabels[s]}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                label="Previsão de Entrega"
                                type="date"
                                variant="filled"
                                InputLabelProps={{ shrink: true }}
                                value={formData.data_previsao_conclusao}
                                onChange={(e) => setFormData({ ...formData, data_previsao_conclusao: e.target.value })}
                                InputProps={{ sx: { borderRadius: '12px' } }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Valor Global do Contrato (R$)"
                                type="number"
                                variant="filled"
                                value={formData.valor_total}
                                onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                                InputProps={{ sx: { borderRadius: '12px' } }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Observações e Escopo"
                                multiline
                                rows={4}
                                variant="filled"
                                value={formData.observacoes}
                                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                                InputProps={{ sx: { borderRadius: '12px' } }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 4, gap: 2 }}>
                    <Button onClick={() => setDialogOpen(false)} sx={{ fontWeight: 600, color: '#64748b' }}>DESCARTAR</Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        disabled={!formData.cliente_id || !formData.numero}
                        sx={{ px: 5, py: 1.5, borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}
                    >
                        {selectedOrder ? 'Salvar Alterações' : 'Confirmar e Criar OS'}
                    </Button>
                </DialogActions>
            </Dialog>
        </PageWrapper>
    );
};

export default ServiceOrders;
