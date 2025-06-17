const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ✅ DADOS MOCKADOS TEMPORÁRIOS (sem banco)
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

// Rota principal - servir HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota de status
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        app: 'TaskMaster Pro',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: 'Mock Data',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// ✅ API TAREFAS
app.get('/api/tasks', (req, res) => {
    res.json({
        success: true,
        count: mockTasks.length,
        tasks: mockTasks
    });
});

// Buscar tarefa específica
app.get('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const task = mockTasks.find(t => t.id == id);
    
    if (task) {
        res.json({
            success: true,
            task: task
        });
    } else {
        res.status(404).json({
            success: false,
            message: 'Tarefa não encontrada'
        });
    }
});

// Criar nova tarefa
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
        task: newTask
    });
});

// Atualizar tarefa completa
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
            task: mockTasks[taskIndex]
        });
    } else {
        res.status(404).json({
            success: false,
            message: 'Tarefa não encontrada'
        });
    }
});

// Atualizar apenas status da tarefa
app.patch('/api/tasks/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const task = mockTasks.find(t => t.id == id);
    
    if (task) {
        task.status = status;
        res.json({
            success: true,
            message: 'Status atualizado com sucesso!',
            task: task
        });
    } else {
        res.status(404).json({
            success: false,
            message: 'Tarefa não encontrada'
        });
    }
});

// Excluir tarefa
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const index = mockTasks.findIndex(t => t.id == id);
    
    if (index !== -1) {
        mockTasks.splice(index, 1);
        res.json({
            success: true,
            message: 'Tarefa excluída com sucesso!'
        });
    } else {
        res.status(404).json({
            success: false,
            message: 'Tarefa não encontrada'
        });
    }
});

// ✅ API USUÁRIOS
app.get('/api/users', (req, res) => {
    res.json({
        success: true,
        count: mockUsers.length,
        users: mockUsers
    });
});

// ✅ API AUTENTICAÇÃO (mockada)
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Login mockado - aceita qualquer credencial
    res.json({
        success: true,
        message: 'Login realizado com sucesso!',
        user: mockUsers[0],
        token: 'mock-token-123'
    });
});

app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    
    // Registro mockado
    res.json({
        success: true,
        message: 'Usuário cadastrado com sucesso!',
        user: {
            id: 2,
            name: name,
            email: email,
            is_active: true,
            created_at: new Date().toISOString()
        }
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

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 TaskMaster Pro - Servidor rodando na porta:', PORT);
    console.log('✅ Servidor ativo e aguardando requisições');
    console.log('🎯 APIs mockadas adicionadas');
    console.log('📊 Dados: 2 tarefas, 1 usuário');
});

// Capturar erros não tratados
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada:', reason);
});