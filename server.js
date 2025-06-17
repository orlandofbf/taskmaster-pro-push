const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ MANTER DADOS MOCKADOS COMO FALLBACK
const mockTasks = [
{
id: 1,
title: 'Implementar autenticação',
description: 'Sistema de login e registro',
status: 'pendente',
priority: 'urgente',
due_date: '2025-06-20',
created_at: '2025-06-17T07:00:00Z',
user_name: 'Usuário Padrão'
},
{
id: 2,
title: 'Configurar banco de dados',
description: 'Setup PostgreSQL',
status: 'concluida',
priority: 'alta',
due_date: '2025-06-18',
created_at: '2025-06-16T10:00:00Z',
user_name: 'Usuário Padrão'
}
];

const mockUsers = [
{
id: 1,
name: 'Usuário Padrão',
email: 'admin@taskmaster.com',
is_active: true,
created_at: '2025-06-17T07:00:00Z'
}
];

// ✅ CONFIGURAÇÃO POSTGRESQL (SEM INICIALIZAÇÃO AUTOMÁTICA)
const pool = new Pool({
host: process.env.DB_HOST || 'localhost',
port: process.env.DB_PORT || 5432,
database: process.env.DB_NAME || 'taskmaster_pro',
user: process.env.DB_USER || 'postgres',
password: process.env.DB_PASSWORD || 'admin123',
ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ✅ VARIÁVEL DE CONTROLE
let dbConnected = false;
let useDatabase = false;

// ✅ FUNÇÃO DE TESTE DE CONEXÃO (NÃO OBRIGATÓRIA)
async function testDatabaseConnection() {
try {
console.log('🔍 Testando conexão PostgreSQL...');
const result = await pool.query('SELECT NOW() as current_time');
console.log('✅ PostgreSQL conectado:', result.rows[0].current_time);
dbConnected = true;
return true;
} catch (error) {
console.log('⚠️ PostgreSQL não disponível:', error.message);
console.log('📋 Usando dados mockados como fallback');
dbConnected = false;
return false;
}
}

// Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rota principal - servir HTML
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota de status EXPANDIDA
app.get('/api/status', (req, res) => {
res.json({
success: true,
app: 'TaskMaster Pro',
version: '2.0.0',
environment: process.env.NODE_ENV || 'development',
database: dbConnected ? 'PostgreSQL' : 'Mock Data',
db_status: dbConnected ? 'connected' : 'disconnected',
timestamp: new Date().toISOString(),
port: PORT
});
});

// ✅ NOVA ROTA DE TESTE DE BANCO
app.get('/api/database/test', async (req, res) => {
try {
if (!dbConnected) {
return res.json({
success: false,
message: 'Banco não conectado',
using_mock: true
});
}

    const result = await pool.query('SELECT version() as version');
    res.json({
        success: true,
        message: 'Banco conectado e funcionando!',
        version: result.rows[0].version,
        timestamp: new Date().toISOString()
    });
} catch (error) {
    console.error('❌ Erro no teste do banco:', error);
    res.json({
        success: false,
        message: 'Erro ao testar banco',
        error: error.message,
        using_mock: true
    });
}
});

// ✅ MANTER TODAS AS ROTAS MOCKADAS FUNCIONANDO
app.get('/api/tasks', (req, res) => {
res.json({
success: true,
count: mockTasks.length,
tasks: mockTasks,
data_source: dbConnected ? 'database_ready' : 'mock'
});
});

app.get('/api/tasks/:id', (req, res) => {
const { id } = req.params;
const task = mockTasks.find(t => t.id == id);

if (task) {
    res.json({
        success: true,
        task: task,
        data_source: 'mock'
    });
} else {
    res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada'
    });
}
});

app.post('/api/tasks', (req, res) => {
const { title, description, priority, due_date } = req.body;
const newTask = {
id: Math.max(...mockTasks.map(t => t.id), 0) + 1,
title: title || 'Nova Tarefa',
description: description || '',
status: 'pendente',
priority: priority || 'media',
due_date: due_date || new Date().toISOString().split('T')[0],
created_at: new Date().toISOString(),
user_name: 'Usuário Padrão'
};

mockTasks.unshift(newTask);
res.json({
    success: true,
    message: 'Tarefa criada com sucesso!',
    task: newTask,
    data_source: 'mock'
});
});

app.put('/api/tasks/:id', (req, res) => {
const { id } = req.params;
const { title, description, priority, status, due_date } = req.body;
const taskIndex = mockTasks.findIndex(t => t.id == id);

if (taskIndex !== -1) {
    mockTasks[taskIndex] = {
        ...mockTasks[taskIndex],
        title: title || mockTasks[taskIndex].title,
        description: description || mockTasks[taskIndex].description,
        priority: priority || mockTasks[taskIndex].priority,
        status: status || mockTasks[taskIndex].status,
        due_date: due_date || mockTasks[taskIndex].due_date
    };
    
    res.json({
        success: true,
        message: 'Tarefa atualizada com sucesso!',
        task: mockTasks[taskIndex],
        data_source: 'mock'
    });
} else {
    res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada'
    });
}
});

app.patch('/api/tasks/:id/status', (req, res) => {
const { id } = req.params;
const { status } = req.body;
const task = mockTasks.find(t => t.id == id);

if (task) {
    task.status = status;
    res.json({
        success: true,
        message: 'Status atualizado com sucesso!',
        task: task,
        data_source: 'mock'
    });
} else {
    res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada'
    });
}
});

app.delete('/api/tasks/:id', (req, res) => {
const { id } = req.params;
const index = mockTasks.findIndex(t => t.id == id);

if (index !== -1) {
    mockTasks.splice(index, 1);
    res.json({
        success: true,
        message: 'Tarefa excluída com sucesso!',
        data_source: 'mock'
    });
} else {
    res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada'
    });
}
});

app.get('/api/users', (req, res) => {
res.json({
success: true,
count: mockUsers.length,
users: mockUsers,
data_source: 'mock'
});
});

app.post('/api/auth/login', (req, res) => {
const { email, password } = req.body;

res.json({
    success: true,
    message: 'Login realizado com sucesso!',
    user: mockUsers[0],
    token: 'mock-token-123',
    data_source: 'mock'
});
});

app.post('/api/auth/register', (req, res) => {
const { name, email, password } = req.body;

res.json({
    success: true,
    message: 'Usuário cadastrado com sucesso!',
    user: {
        id: 2,
        name: name,
        email: email,
        is_active: true,
        created_at: new Date().toISOString()
    },
    data_source: 'mock'
});
});

// Error handler
app.use((error, req, res, next) => {
console.error('❌ Erro:', error);
res.status(500).json({
success: false,
message: 'Erro interno do servidor',
error: error.message
});
});

// ✅ INICIALIZAÇÃO CUIDADOSA
app.listen(PORT, '0.0.0.0', async () => {
console.log('🚀 TaskMaster Pro - Servidor rodando na porta:', PORT);
console.log('✅ Servidor ativo e aguardando requisições');

// Testar conexão de forma assíncrona (não bloqueia a inicialização)
setTimeout(async () => {
    await testDatabaseConnection();
    console.log('🎯 Fase 2A: Conexão PostgreSQL testada');
    console.log('📊 Status:', dbConnected ? 'DB Disponível' : 'Usando Mock');
}, 2000);
});

// Capturar erros não tratados
process.on('uncaughtException', (error) => {
console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
console.error('❌ Promise rejeitada:', reason);
});