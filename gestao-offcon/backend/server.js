const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const path = require('path');

// Rotas da API
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/equipamentos', require('./routes/equipamentos'));
app.use('/api/locacoes', require('./routes/locacoes'));
app.use('/api/projetos', require('./routes/projetos'));
app.use('/api/inspecoes', require('./routes/inspecoes'));
app.use('/api/manutencoes', require('./routes/manutencoes'));
app.use('/api/financeiro', require('./routes/financeiro'));
app.use('/api/relatorios', require('./routes/relatorios'));
app.use('/api/ai', require('./routes/ai'));

// Serve Frontend estático em produção
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'build', 'index.html'));
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor OFFCON rodando na porta ${PORT}`);
  console.log(`📊 API disponível em: http://localhost:${PORT}/api`);
});

module.exports = app;