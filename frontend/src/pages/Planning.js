import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
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
  LinearProgress,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Divider,
  Avatar,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  CalendarToday as CalendarIcon,
  Comment as CommentIcon,
  Link as LinkIcon,
  Refresh as RefreshIcon,
  Assignment as TaskIcon,
  Person as PersonIcon,
  TrendingUp as ProgressIcon,
  AutoFixHigh as MagicIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { ptBR } from 'date-fns/locale';
import { format, parseISO, isValid, addDays, startOfDay, differenceInDays } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import api from '../services/api';
import './Planning.css';

// Styled Components
const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 2rem;
`;

const GlassPanel = styled(Paper)`
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.1) !important;
  border-radius: 16px !important;
  overflow: hidden;
`;

const GanttBar = styled.div`
  position: absolute;
  height: 28px;
  background: ${props => props.isMilestone ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #3b82f6, #1d4ed8)'};
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  z-index: 5;
  
  &:hover {
    transform: scaleY(1.1);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
  }

  ${props => props.isCompleted && `
    background: linear-gradient(90deg, #10b981, #059669);
  `}
`;

const TodayLine = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ef4444;
  z-index: 10;
  pointer-events: none;
  
  &::after {
    content: 'Hoje';
    position: absolute;
    top: -20px;
    left: -20px;
    background: #ef4444;
    color: white;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
  }
`;

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ p: 4 }}>{children}</Box>}
    </div>
  );
}

const statusColors = {
  pendente: '#94a3b8',
  em_andamento: '#f59e0b',
  concluido: '#10b981',
  cancelado: '#ef4444'
};

const statusLabels = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
};

export default function Planning() {
  const [searchParams] = useSearchParams();
  const osId = searchParams.get('os_id');
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [wbsData, setWbsData] = useState([]);
  const [ganttData, setGanttData] = useState([]);
  const [todayActivities, setTodayActivities] = useState([]);
  const [selectedOS, setSelectedOS] = useState(null);
  const [availableOS, setAvailableOS] = useState([]);
  const [selectedOsId, setSelectedOsId] = useState('');
  const [loadingAvailableOS, setLoadingAvailableOS] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiApplyLoading, setAiApplyLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiInfo, setAiInfo] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Dialogs
  const [activityDialog, setActivityDialog] = useState({ open: false, activity: null, parentId: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, activity: null });

  // Form
  const [formData, setFormData] = useState({
    descricao: '',
    data_inicio: null,
    data_fim: null,
    status: 'pendente',
    progresso: 0,
    responsavel: '',
    tipo: 'entrega'
  });

  // Loaders
  const loadOS = useCallback(async () => {
    if (!osId) return;
    try {
      const res = await api.get(`/ordens-servico/${osId}`);
      setSelectedOS(res.data);
    } catch (e) {
      console.error('Erro ao carregar OS:', e);
    }
  }, [osId]);

  const loadWBS = useCallback(async () => {
    if (!osId) return;
    setLoading(true);
    try {
      const response = await api.get(`/planning/wbs?os_id=${osId}`);
      setWbsData(response.data);
    } catch (error) { console.error(error); }
    setLoading(false);
  }, [osId]);

  const loadToday = useCallback(async () => {
    if (!osId) return;
    try {
      const response = await api.get(`/planning/hoje?os_id=${osId}`);
      setTodayActivities(response.data);
    } catch (error) { console.error(error); }
  }, [osId]);

  const loadGantt = useCallback(async () => {
    if (!osId) return;
    try {
      const response = await api.get(`/planning/gantt?os_id=${osId}`);
      setGanttData(response.data);
    } catch (error) { console.error(error); }
  }, [osId]);

  const loadAvailableOS = useCallback(async () => {
    if (osId) return;
    setLoadingAvailableOS(true);
    try {
      const response = await api.get('/planning/available-os');
      const list = Array.isArray(response.data) ? response.data : [];
      setAvailableOS(list);
      if (list.length > 0) {
        setSelectedOsId(String(list[0].id));
      }
    } catch (error) {
      console.error('Erro ao carregar OS disponíveis:', error);
    } finally {
      setLoadingAvailableOS(false);
    }
  }, [osId]);

  useEffect(() => {
    if (osId) {
      loadOS();
      loadWBS();
      loadToday();
    }
  }, [osId, loadOS, loadWBS, loadToday]);

  useEffect(() => {
    if (activeTab === 1) loadGantt();
  }, [activeTab, loadGantt]);

  useEffect(() => {
    if (!osId) {
      loadAvailableOS();
    }
  }, [osId, loadAvailableOS]);

  // WBS Toggle
  const toggleExpand = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Actions
  const openActivityDialog = (activity = null, parentId = null) => {
    if (activity) {
      setFormData({
        descricao: activity.descricao,
        data_inicio: activity.data_inicio ? parseISO(activity.data_inicio) : null,
        data_fim: activity.data_fim ? parseISO(activity.data_fim) : null,
        status: activity.status,
        progresso: activity.progresso || 0,
        responsavel: activity.responsavel || '',
        tipo: activity.tipo || 'entrega'
      });
    } else {
      setFormData({
        descricao: '', data_inicio: null, data_fim: null, status: 'pendente', progresso: 0, responsavel: '', tipo: 'entrega'
      });
    }
    setActivityDialog({ open: true, activity, parentId });
  };

  const handleGenerateTemplate = async () => {
    if (!window.confirm('Deseja gerar o cronograma padrão para esta OS? Isso substituirá qualquer planejamento existente.')) return;
    try {
      setLoading(true);
      await api.post(`/planning/standard-template/${osId}`);
      loadWBS();
      if (activeTab === 1) loadGantt();
    } catch (e) {
      console.error(e);
      alert('Falha ao gerar cronograma.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveActivity = async () => {
    try {
      const p = {
        ...formData,
        os_id: osId,
        data_inicio: formData.data_inicio ? format(formData.data_inicio, 'yyyy-MM-dd') : null,
        data_fim: formData.data_fim ? format(formData.data_fim, 'yyyy-MM-dd') : null
      };
      if (activityDialog.activity) {
        await api.put(`/planning/wbs/${activityDialog.activity.id}`, p);
      } else {
        await api.post('/planning/wbs', { ...p, codigo: `WBS-${Date.now().toString().slice(-4)}`, parent_id: activityDialog.parentId });
      }
      loadWBS();
      setActivityDialog({ open: false });
    } catch (e) { console.error(e); }
  };

  const handleGenerateAiSuggestion = async () => {
    if (!osId || !aiPrompt.trim()) return;

    try {
      setAiLoading(true);
      setAiError('');
      setAiInfo('');
      const response = await api.post('/ai/planning-chat', {
        os_id: Number(osId),
        message: aiPrompt.trim()
      });

      if (!response.data?.success || !response.data?.command) {
        setAiSuggestion(null);
        setAiError(response.data?.error || 'Não foi possível gerar a sugestão do agente.');
        return;
      }

      setAiSuggestion(response.data.command);
      setAiInfo(response.data.message || 'Sugestão gerada. Revise e aplique.');
    } catch (error) {
      setAiSuggestion(null);
      setAiError(error.response?.data?.error || error.message || 'Erro ao consultar agente de IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiSuggestion = async () => {
    if (!aiSuggestion) return;

    try {
      setAiApplyLoading(true);
      setAiError('');
      setAiInfo('');
      const response = await api.post('/ai/execute', { command: aiSuggestion });

      if (!response.data?.success) {
        setAiError(response.data?.result?.error || response.data?.message || 'Falha ao aplicar atualização via agente.');
        return;
      }

      setAiInfo(response.data?.message || 'Atualização aplicada com sucesso.');
      setAiSuggestion(null);
      await Promise.all([loadWBS(), loadGantt(), loadToday()]);
    } catch (error) {
      setAiError(error.response?.data?.error || error.message || 'Erro ao aplicar atualização de planejamento.');
    } finally {
      setAiApplyLoading(false);
    }
  };

  // Renderers
  const renderWBSRow = (item, level = 0) => {
    const isExpanded = expandedRows[item.id];
    const hasChildren = item.children && item.children.length > 0;

    return (
      <React.Fragment key={item.id}>
        <TableRow className="wbs-row animate-fade" sx={{ bgcolor: level === 0 ? 'rgba(59, 130, 246, 0.03)' : 'transparent' }}>
          <TableCell sx={{ pl: level * 4 + 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {hasChildren && (
                <IconButton size="small" onClick={() => toggleExpand(item.id)}>
                  {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                </IconButton>
              )}
              {!hasChildren && <Box sx={{ width: 34 }} />}
              <Typography variant="subtitle2" sx={{ fontWeight: level === 0 ? 800 : 500, color: '#334155' }}>
                {item.codigo}
              </Typography>
            </Box>
          </TableCell>
          <TableCell>
            <Typography variant="body2" sx={{ fontWeight: level === 0 ? 600 : 400 }}>{item.descricao}</Typography>
          </TableCell>
          <TableCell>
            <Chip
              label={statusLabels[item.status]}
              size="small"
              className="status-chip"
              sx={{ bgcolor: `${statusColors[item.status]}20`, color: statusColors[item.status], border: `1px solid ${statusColors[item.status]}50` }}
            />
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LinearProgress
                variant="determinate"
                value={item.progresso}
                sx={{ width: 80, height: 6, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { borderRadius: 3 } }}
              />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>{item.progresso}%</Typography>
            </Box>
          </TableCell>
          <TableCell sx={{ color: '#64748b', fontSize: '0.8rem' }}>
            {item.data_inicio ? format(parseISO(item.data_inicio), 'dd/MM/yy') : '-'}
          </TableCell>
          <TableCell sx={{ color: '#64748b', fontSize: '0.8rem' }}>
            {item.data_fim ? format(parseISO(item.data_fim), 'dd/MM/yy') : '-'}
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem' }}>{item.responsavel ? item.responsavel[0] : '?'}</Avatar>
              <Typography variant="caption">{item.responsavel}</Typography>
            </Box>
          </TableCell>
          <TableCell align="right">
            <IconButton size="small" onClick={() => openActivityDialog(null, item.id)} color="primary"><AddIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={() => openActivityDialog(item)}><EditIcon fontSize="small" /></IconButton>
            <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, activity: item })}><DeleteIcon fontSize="small" /></IconButton>
          </TableCell>
        </TableRow>
        {isExpanded && item.children?.map(child => renderWBSRow(child, level + 1))}
      </React.Fragment>
    );
  };

  const renderGanttView = () => {
    if (!ganttData.length) return <Typography sx={{ p: 4, textAlign: 'center' }}>Sem dados de cronograma.</Typography>;

    const startDate = new Date(Math.min(...ganttData.map(t => new Date(t.start))));
    const endDate = new Date(Math.max(...ganttData.map(t => new Date(t.end))));
    const totalDays = differenceInDays(endDate, startDate) + 14;
    const timelineStart = addDays(startDate, -7);

    const days = Array.from({ length: totalDays }, (_, i) => addDays(timelineStart, i));
    const dayWidth = 40;

    return (
      <Box sx={{ overflowX: 'auto', position: 'relative' }}>
        <Box sx={{ display: 'flex', minWidth: totalDays * dayWidth + 300 }}>
          {/* List */}
          <Box sx={{ width: 300, flexShrink: 0, borderRight: '1px solid #e2e8f0', bgcolor: 'white' }}>
            <Box sx={{ height: 60, borderBottom: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', px: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>ATIVIDADES</Typography>
            </Box>
            {ganttData.map(task => (
              <Box key={task.id} sx={{ height: 48, display: 'flex', alignItems: 'center', px: 2, borderBottom: '1px solid #f1f5f9' }}>
                <Typography variant="caption" noWrap sx={{ fontWeight: 600 }}>{task.code} - {task.name}</Typography>
              </Box>
            ))}
          </Box>

          {/* Timeline */}
          <Box sx={{ flex: 1, position: 'relative' }}>
            <Box sx={{ display: 'flex', height: 60, borderBottom: '2px solid #e2e8f0' }}>
              {days.map((day, i) => (
                <Box key={i} sx={{
                  width: dayWidth, flexShrink: 0, borderRight: '1px solid #f1f5f9',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  bgcolor: (day.getDay() === 0 || day.getDay() === 6) ? '#f8fafc' : 'white'
                }}>
                  <Typography variant="caption" sx={{ fontSize: '0.6rem', color: '#64748b' }}>{format(day, 'MMM', { locale: ptBR })}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{format(day, 'dd')}</Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ position: 'relative' }}>
              {/* Lines */}
              {days.map((day, i) => (
                <Box key={i} sx={{
                  position: 'absolute', left: i * dayWidth, top: 0, bottom: ganttData.length * 48,
                  width: 1, borderRight: '1px solid #f1f5f9', zIndex: 1,
                  bgcolor: (day.getDay() === 0 || day.getDay() === 6) ? 'rgba(248, 250, 252, 0.5)' : 'transparent'
                }} />
              ))}

              {/* Bars */}
              {ganttData.map((task, i) => {
                const startOffset = differenceInDays(new Date(task.start), timelineStart) * dayWidth;
                const width = (differenceInDays(new Date(task.end), new Date(task.start)) + 1) * dayWidth;
                return (
                  <Box key={task.id} sx={{ height: 48, position: 'relative', borderBottom: '1px solid #f1f5f9' }}>
                    <GanttBar
                      style={{ left: startOffset + 4, width: width - 8, top: 10 }}
                      isMilestone={task.type === 'marco'}
                      isCompleted={task.status === 'concluido'}
                    >
                      {task.progress}%
                    </GanttBar>
                  </Box>
                );
              })}

              {/* Today */}
              <TodayLine style={{ left: differenceInDays(new Date(), timelineStart) * dayWidth }} />
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  if (!osId) {
    return (
      <PageWrapper>
        <Box sx={{ maxWidth: 980, mx: 'auto', py: 6 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
            Planejamento por Ordem de Serviço
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: '#64748b' }}>
            Selecione uma OS para abrir o planejamento (WBS, Gantt e fila de execução).
          </Typography>

          <GlassPanel sx={{ p: 4, mb: 4 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <FormControl fullWidth>
                  <InputLabel>Ordem de Serviço</InputLabel>
                  <Select
                    label="Ordem de Serviço"
                    value={selectedOsId}
                    onChange={(e) => setSelectedOsId(e.target.value)}
                    disabled={loadingAvailableOS || availableOS.length === 0}
                  >
                    {availableOS.map((os) => (
                      <MenuItem key={os.id} value={String(os.id)}>
                        {os.numero} | {os.cliente_nome || 'Sem cliente'} | {os.status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={() => selectedOsId && navigate(`/planejamento?os_id=${selectedOsId}`)}
                  disabled={!selectedOsId}
                >
                  Abrir Planejamento
                </Button>
              </Grid>
            </Grid>
          </GlassPanel>

          <GlassPanel>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700 }}>OS</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Emissão</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Previsão</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Ação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availableOS.length > 0 ? (
                    availableOS.map((os) => (
                      <TableRow key={os.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{os.numero}</TableCell>
                        <TableCell>{os.cliente_nome || '-'}</TableCell>
                        <TableCell>{os.status}</TableCell>
                        <TableCell>{os.data_emissao ? format(parseISO(os.data_emissao), 'dd/MM/yyyy') : '-'}</TableCell>
                        <TableCell>{os.data_previsao_conclusao ? format(parseISO(os.data_previsao_conclusao), 'dd/MM/yyyy') : '-'}</TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="outlined" onClick={() => navigate(`/planejamento?os_id=${os.id}`)}>
                            Abrir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        {loadingAvailableOS ? 'Carregando ordens de serviço...' : 'Nenhuma ordem de serviço encontrada.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </GlassPanel>

          <Box sx={{ mt: 3 }}>
            <Button variant="text" onClick={() => navigate('/ordens-servico')}>
              Ir para Ordens de Serviço
            </Button>
          </Box>
        </Box>
      </PageWrapper>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <PageWrapper>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/ordens-servico')} sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#f1f5f9' } }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 900, color: '#1e293b', mb: 0.5 }}>
                {selectedOS ? `OS: ${selectedOS.numero}` : 'Cronograma'}
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b' }}>
                {selectedOS ? `${selectedOS.cliente_nome} | ${selectedOS.status} | ${wbsData.length} Atividades` : 'Planejamento e Controle Operacional'}
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" size="large" startIcon={<AddIcon />} sx={{ borderRadius: 3, px: 4, height: 56, background: 'var(--primary-gradient)', boxShadow: '0 10px 15px -3px rgba(102, 126, 234, 0.4)' }} onClick={() => openActivityDialog()}>
            Nova Atividade
          </Button>
        </Box>

        <GlassPanel>
          <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f8fbff 0%, #eef6ff 100%)' }}>
            <Card sx={{ borderRadius: 3, border: '1px solid #bfdbfe', boxShadow: 'none', background: '#ffffffcc' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e3a8a' }}>
                      Agente de IA do Planejamento
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Peça ajustes no WBS/Gantt da OS atual sem trocar de aba.
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={selectedOS?.numero ? `OS ${selectedOS.numero}` : `OS ${osId}`}
                    sx={{ fontWeight: 700, bgcolor: '#dbeafe', color: '#1e40af' }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={5}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Ex: No item 3.2, mova término para 2026-03-10, progresso 60% e responsável Carlos."
                  />
                  <Button
                    variant="contained"
                    onClick={handleGenerateAiSuggestion}
                    disabled={aiLoading || !aiPrompt.trim()}
                    sx={{ minWidth: 180, height: 40 }}
                  >
                    {aiLoading ? <CircularProgress size={20} color="inherit" /> : 'Gerar Sugestão'}
                  </Button>
                </Box>

                {aiError && <Alert severity="error" sx={{ mt: 2 }}>{aiError}</Alert>}
                {aiInfo && <Alert severity="success" sx={{ mt: 2 }}>{aiInfo}</Alert>}

                {aiSuggestion && (
                  <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: '#0f172a', color: '#e2e8f0', overflowX: 'auto' }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#93c5fd' }}>
                      Preview do comando gerado pelo agente
                    </Typography>
                    <Box component="pre" sx={{ m: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(aiSuggestion, null, 2)}
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => setAiSuggestion(null)}
                        disabled={aiApplyLoading}
                      >
                        Descartar
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleApplyAiSuggestion}
                        disabled={aiApplyLoading}
                      >
                        {aiApplyLoading ? <CircularProgress size={20} color="inherit" /> : 'Aplicar no Planejamento'}
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>

          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tab label="Estrutura Analítica (WBS)" className="premium-tab" />
            <Tab label="Cronograma de Gantt" className="premium-tab" />
            <Tab label="Fila de Execução" className="premium-tab" />
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadWBS} sx={{ borderRadius: 2 }}>Atualizar</Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Código</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Atividade</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Progresso</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Início</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Término</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Dono</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wbsData.length > 0 ? (
                    wbsData.map(item => renderWBSRow(item))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                        <Box sx={{ maxWidth: 400, mx: 'auto' }}>
                          <MagicIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
                          <Typography variant="h6" gutterBottom>Sem Atividades Planejadas</Typography>
                          <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                            Esta Ordem de Serviço ainda não possui um cronograma. Deseja aplicar o modelo padrão baseado no Cronograma da OFFCON?
                          </Typography>
                          <Button
                            variant="contained"
                            startIcon={<MagicIcon />}
                            onClick={handleGenerateTemplate}
                            sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' }}
                          >
                            Aplicar Modelo Padrão
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            {renderGanttView()}
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Grid container spacing={3}>
              {todayActivities.map(act => (
                <Grid item xs={12} md={4} key={act.id}>
                  <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' } }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Chip label={act.codigo} size="small" sx={{ fontWeight: 800 }} />
                        <Chip label={statusLabels[act.status]} size="small" sx={{ bgcolor: `${statusColors[act.status]}20`, color: statusColors[act.status] }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{act.descricao}</Typography>
                      <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon sx={{ color: '#94a3b8', fontSize: '1.2rem' }} />
                          <Typography variant="body2">{act.responsavel || 'Pool'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarIcon sx={{ color: '#94a3b8', fontSize: '1.2rem' }} />
                          <Typography variant="body2">{format(parseISO(act.data_fim), 'dd/MM/yyyy')}</Typography>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>Progresso</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>{act.progresso}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={act.progresso} sx={{ height: 6, borderRadius: 3 }} />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>
        </GlassPanel>

        {/* Create/Edit Dialog */}
        <Dialog open={activityDialog.open} onClose={() => setActivityDialog({ open: false })} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 2 } }}>
          <DialogTitle sx={{ fontWeight: 800, fontSize: '1.5rem' }}>{activityDialog.activity ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <TextField fullWidth label="Descrição da Atividade" value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} variant="filled" />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <DatePicker label="Data de Início" value={formData.data_inicio} onChange={d => setFormData({ ...formData, data_inicio: d })} slotProps={{ textField: { fullWidth: true, variant: 'filled' } }} />
                </Grid>
                <Grid item xs={6}>
                  <DatePicker label="Previsão de Término" value={formData.data_fim} onChange={d => setFormData({ ...formData, data_fim: d })} slotProps={{ textField: { fullWidth: true, variant: 'filled' } }} />
                </Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth variant="filled">
                    <InputLabel>Status</InputLabel>
                    <Select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <MenuItem value="pendente">Pendente</MenuItem>
                      <MenuItem value="em_andamento">Em Andamento</MenuItem>
                      <MenuItem value="concluido">Concluído</MenuItem>
                      <MenuItem value="cancelado">Cancelado</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth variant="filled">
                    <InputLabel>Tipo</InputLabel>
                    <Select value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })}>
                      <MenuItem value="entrega">Entrega</MenuItem>
                      <MenuItem value="marco">Marco</MenuItem>
                      <MenuItem value="resumo">Resumo</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <TextField fullWidth label="Responsável" value={formData.responsavel} onChange={e => setFormData({ ...formData, responsavel: e.target.value })} variant="filled" />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setActivityDialog({ open: false })} sx={{ color: '#64748b' }}>Cancelar</Button>
            <Button onClick={handleSaveActivity} variant="contained" sx={{ px: 4, borderRadius: 2 }}>Salvar Alterações</Button>
          </DialogActions>
        </Dialog>
      </PageWrapper>
    </LocalizationProvider>
  );
}
