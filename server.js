const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// Importar configuração do banco
const { query, testConnection, initializeDatabase } = require('./config/database');

// Inicializar banco de dados
const { execSync } = require('child_process');
try {
    console.log('🔧 Inicializando banco de dados...');
    execSync('node init-db.js', { stdio: 'inherit' });
    console.log('✅ Banco inicializado com sucesso!');
} catch (error) {
    console.log('⚠️ Erro ao inicializar banco:', error.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ✅ ROTAS DA API - ADICIONADAS AS ROTAS DE AUTENTICAÇÃO
app.use('/api/auth', require('./routes/auth'));

// Rota de teste do banco
app.get('/api/test-db', async (req, res) => {
    try {
        const result = await query('SELECT datetime("now") as current_time, sqlite_version() as db_version');
        res.json({
            success: true,
            message: 'Conexão com banco funcionando!',
            timestamp: result.rows[0].current_time,
            database: `SQLite v${result.rows[0].db_version}`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro na conexão com banco',
            error: error.message
        });
    }
});

// Rota para listar tarefas
app.get('/api/tasks', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,
                t.created_at,
                u.name as user_name 
            FROM tasks t 
            JOIN users u ON t.user_id = u.id 
            ORDER BY t.created_at DESC
        `);
        
        res.json({
            success: true,
            count: result.rows.length,
            tasks: result.rows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar tarefas',
            error: error.message
        });
    }
});

// Rota para buscar uma tarefa específica
app.get('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(`
            SELECT 
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,
                t.created_at,
                u.name as user_name 
            FROM tasks t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.id = ?
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarefa não encontrada'
            });
        }
        
        res.json({
            success: true,
            task: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar tarefa',
            error: error.message
        });
    }
});

// Rota para criar nova tarefa
app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description, priority, due_date, user_id } = req.body;
        
        // Se não tiver user_id, usar o usuário padrão
        const defaultUserId = user_id || '550e8400-e29b-41d4-a716-446655440000';
        
        const result = await query(`
            INSERT INTO tasks (title, description, priority, due_date, user_id, status)
            VALUES (?, ?, ?, ?, ?, 'pendente')
        `, [title, description, priority, due_date, defaultUserId]);
        
        // Buscar a tarefa criada
        const createdTask = await query(`
            SELECT 
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,
                t.created_at,
                u.name as user_name 
            FROM tasks t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.id = ?
        `, [result.lastID]);
        
        res.json({
            success: true,
            message: 'Tarefa criada com sucesso!',
            task: createdTask.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao criar tarefa',
            error: error.message
        });
    }
});

// Rota para atualizar tarefa
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, priority, status, due_date } = req.body;
        
        const result = await query(`
            UPDATE tasks 
            SET title = ?, description = ?, priority = ?, status = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [title, description, priority, status, due_date, id]);
        
        if (result.rowsAffected === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarefa não encontrada'
            });
        }
        
        // Buscar a tarefa atualizada
        const updatedTask = await query(`
            SELECT 
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,
                t.created_at,
                u.name as user_name 
            FROM tasks t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.id = ?
        `, [id]);
        
        res.json({
            success: true,
            message: 'Tarefa atualizada com sucesso!',
            task: updatedTask.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar tarefa',
            error: error.message
        });
    }
});

// Rota para atualizar status da tarefa
app.patch('/api/tasks/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const result = await query(`
            UPDATE tasks 
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [status, id]);
        
        if (result.rowsAffected === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarefa não encontrada'
            });
        }
        
        // Buscar a tarefa atualizada
        const updatedTask = await query(`
            SELECT 
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,
                t.created_at,
                u.name as user_name 
            FROM tasks t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.id = ?
        `, [id]);
        
        res.json({
            success: true,
            message: 'Status atualizado com sucesso!',
            task: updatedTask.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar status',
            error: error.message
        });
    }
});

// Rota para excluir tarefa
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(`
            DELETE FROM tasks 
            WHERE id = ?
        `, [id]);
        
        if (result.rowsAffected === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarefa não encontrada'
            });
        }
        
        res.json({
            success: true,
            message: 'Tarefa excluída com sucesso!'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir tarefa',
            error: error.message
        });
    }
});

// Rota para listar usuários
app.get('/api/users', async (req, res) => {
    try {
        const result = await query(`
            SELECT id, name, email, is_active, created_at 
            FROM users 
            ORDER BY created_at DESC
        `);
        
        res.json({
            success: true,
            count: result.rows.length,
            users: result.rows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar usuários',
            error: error.message
        });
    }
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota de status da aplicação
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        app: 'TaskMaster Pro',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: 'SQLite',
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 TaskMaster Pro v2.0.0`);
    console.log(`?? Servidor rodando na porta ${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️ Banco: SQLite`);
    console.log('─'.repeat(50));
    
    // Inicializar banco de dados
    await initializeDatabase();
    
    // Testar conexão com banco ao iniciar
    const dbConnected = await testConnection();
    if (dbConnected) {
        console.log('🎯 Aplicação pronta para uso!');
    } else {
        console.log('⚠️  Aplicação iniciada, mas sem conexão com banco');
    }
});
