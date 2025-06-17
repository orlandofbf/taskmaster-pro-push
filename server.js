const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CONFIGURAÇÃO POSTGRESQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ✅ VARIÁVEL DE CONTROLE
let dbConnected = false;

// ✅ FUNÇÃO PARA CRIAR TABELAS
async function createTables() {
    try {
        console.log('📋 Criando tabelas...');
        
        // Criar tabela users
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Criar tabela tasks
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'pendente',
                priority VARCHAR(50) DEFAULT 'media',
                due_date DATE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Tabelas criadas com sucesso!');
        return true;
    } catch (error) {
        console.error('❌ Erro ao criar tabelas:', error.message);
        return false;
    }
}

// ✅ FUNÇÃO PARA INSERIR DADOS INICIAIS
async function seedDatabase() {
    try {
        console.log('🌱 Verificando dados iniciais...');
        
        // Verificar se já existe usuário
        const userCheck = await pool.query('SELECT COUNT(*) FROM users');
        if (parseInt(userCheck.rows[0].count) > 0) {
            console.log('📊 Dados já existem, pulando seed...');
            return true;
        }
        
        // Criar usuário padrão
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const userResult = await pool.query(`
            INSERT INTO users (name, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id
        `, ['Meu TaskMaster', 'meu@taskmaster.com', hashedPassword]);
        
        const userId = userResult.rows[0].id;
        
        // Criar tarefas iniciais
        const tasks = [
            {
                title: '🎯 Bem-vindo ao TaskMaster Pro!',
                description: 'Sistema de gerenciamento de tarefas com PostgreSQL funcionando perfeitamente.',
                status: 'concluida',
                priority: 'alta',
                due_date: '2025-06-18'
            },
            {
                title: '✅ Configurar perfil pessoal',
                description: 'Personalize suas informações e preferências no sistema.',
                status: 'pendente',
                priority: 'media',
                due_date: '2025-06-20'
            },
            {
                title: '🚀 Testar persistência de dados',
                description: 'Verificar se as tarefas são salvas corretamente no banco PostgreSQL.',
                status: 'pendente',
                priority: 'urgente',
                due_date: '2025-06-19'
            }
        ];
        
        for (const task of tasks) {
            await pool.query(`
                INSERT INTO tasks (title, description, status, priority, due_date, user_id)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [task.title, task.description, task.status, task.priority, task.due_date, userId]);
        }
        
        console.log('✅ Dados iniciais inseridos com sucesso!');
        return true;
    } catch (error) {
        console.error('❌ Erro ao inserir dados iniciais:', error.message);
        return false;
    }
}

// ✅ FUNÇÃO DE INICIALIZAÇÃO DO BANCO
async function initializeDatabase() {
    try {
        console.log('🔍 Testando conexão PostgreSQL...');
        const result = await pool.query('SELECT NOW() as current_time');
        console.log('✅ PostgreSQL conectado:', result.rows[0].current_time);
        
        // Criar tabelas
        const tablesCreated = await createTables();
        if (!tablesCreated) return false;
        
        // Inserir dados iniciais
        const dataSeeded = await seedDatabase();
        if (!dataSeeded) return false;
        
        dbConnected = true;
        return true;
    } catch (error) {
        console.log('⚠️ PostgreSQL não disponível:', error.message);
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

// Rota de status
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        app: 'TaskMaster Pro',
        version: '2.1.0',
        environment: process.env.NODE_ENV || 'development',
        database: dbConnected ? 'PostgreSQL' : 'Disconnected',
        db_status: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Rota de teste de banco
app.get('/api/database/test', async (req, res) => {
    try {
        if (!dbConnected) {
            return res.json({
                success: false,
                message: 'Banco não conectado'
            });
        }
        
        const result = await pool.query('SELECT version() as version');
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        const taskCount = await pool.query('SELECT COUNT(*) FROM tasks');
        
        res.json({
            success: true,
            message: 'Banco conectado e funcionando!',
            version: result.rows[0].version,
            users: parseInt(userCount.rows[0].count),
            tasks: parseInt(taskCount.rows[0].count),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Erro no teste do banco:', error);
        res.json({
            success: false,
            message: 'Erro ao testar banco',
            error: error.message
        });
    }
});

// ✅ ROTAS COM CONSULTAS SQL REAIS
app.get('/api/tasks', async (req, res) => {
    try {
        if (!dbConnected) {
            return res.status(503).json({
                success: false,
                message: 'Banco de dados não disponível'
            });
        }
        
        const result = await pool.query(`
            SELECT 
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,
                t.created_at,
                t.updated_at,
                u.name as user_name
            FROM tasks t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        `);
        
        res.json({
            success: true,
            count: result.rows.length,
            tasks: result.rows,
            data_source: 'postgresql'
        });
    } catch (error) {
        console.error('❌ Erro ao buscar tarefas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar tarefas',
            error: error.message
        });
    }
});

app.get('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!dbConnected) {
            return res.status(503).json({
                success: false,
                message: 'Banco de dados não disponível'
            });
        }
        
        const result = await pool.query(`
            SELECT 
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,
                t.created_at,
                t.updated_at,
                u.name as user_name
            FROM tasks t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarefa não encontrada'
            });
        }
        
        res.json({
            success: true,
            task: result.rows[0],
            data_source: 'postgresql'
        });
    } catch (error) {
        console.error('❌ Erro ao buscar tarefa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar tarefa',
            error: error.message
        });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description, priority, due_date } = req.body;
        
        if (!dbConnected) {
            return res.status(503).json({
                success: false,
                message: 'Banco de dados não disponível'
            });
        }
        
        // Por enquanto, usar o primeiro usuário
        const userResult = await pool.query('SELECT id FROM users LIMIT 1');
        const userId = userResult.rows[0]?.id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum usuário encontrado'
            });
        }
        
        const result = await pool.query(`
            INSERT INTO tasks (title, description, priority, due_date, user_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            title || 'Nova Tarefa',
            description || '',
            priority || 'media',
            due_date || new Date().toISOString().split('T')[0],
            userId
        ]);
        
        // Buscar tarefa com nome do usuário
        const taskWithUser = await pool.query(`
            SELECT 
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,
                t.created_at,
                t.updated_at,
                u.name as user_name
            FROM tasks t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.id = $1
        `, [result.rows[0].id]);
        
        res.json({
            success: true,
            message: 'Tarefa criada com sucesso!',
            task: taskWithUser.rows[0],
            data_source: 'postgresql'
        });
    } catch (error) {
        console.error('❌ Erro ao criar tarefa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar tarefa',
            error: error.message
        });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, priority, status, due_date } = req.body;
        
        if (!dbConnected) {
            return res.status(503).json({
                success: false,
                message: 'Banco de dados não disponível'
            });
        }
        
        const result = await pool.query(`
            UPDATE tasks 
            SET 
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                priority = COALESCE($3, priority),
                status = COALESCE($4, status),
                due_date = COALESCE($5, due_date),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `, [title, description, priority, status, due_date, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarefa não encontrada'
            });
        }
        
        // Buscar tarefa com nome do usuário
        const taskWithUser = await pool.query(`
            SELECT 
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,
                t.created_at,
                t.updated_at,
                u.name as user_name
            FROM tasks t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.id = $1
        `, [id]);
        
        res.json({
            success: true,
            message: 'Tarefa atualizada com sucesso!',
            task: taskWithUser.rows[0],
            data_source: 'postgresql'
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar tarefa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar tarefa',
            error: error.message
        });
    }
});

app.patch('/api/tasks/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!dbConnected) {
            return res.status(503).json({
                success: false,
                message: 'Banco de dados não disponível'
            });
        }
        
        const result = await pool.query(`
            UPDATE tasks 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarefa não encontrada'
            });
        }
        
        // Buscar tarefa com nome do usuário
        const taskWithUser = await pool.query(`
            SELECT 
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,
                t.created_at,
                t.updated_at,
                u.name as user_name
            FROM tasks t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.id = $1
        `, [id]);
        
        res.json({
            success: true,
            message: 'Status atualizado com sucesso!',
            task: taskWithUser.rows[0],
            data_source: 'postgresql'
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar status',
            error: error.message
        });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!dbConnected) {
            return res.status(503).json({
                success: false,
                message: 'Banco de dados não disponível'
            });
        }
        
        const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarefa não encontrada'
            });
        }
        
        res.json({
            success: true,
            message: 'Tarefa excluída com sucesso!',
            data_source: 'postgresql'
        });
    } catch (error) {
        console.error('❌ Erro ao excluir tarefa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir tarefa',
            error: error.message
        });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        if (!dbConnected) {
            return res.status(503).json({
                success: false,
                message: 'Banco de dados não disponível'
            });
        }
        
        const result = await pool.query(`
            SELECT id, name, email, is_active, created_at
            FROM users
            ORDER BY created_at DESC
        `);
        
        res.json({
            success: true,
            count: result.rows.length,
            users: result.rows,
            data_source: 'postgresql'
        });
    } catch (error) {
        console.error('❌ Erro ao buscar usuários:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar usuários',
            error: error.message
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!dbConnected) {
            return res.status(503).json({
                success: false,
                message: 'Banco de dados não disponível'
            });
        }
        
        const result = await pool.query(
            'SELECT id, name, email, password_hash, is_active FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }
        
        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }
        
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Usuário inativo'
            });
        }
        
        res.json({
            success: true,
            message: 'Login realizado com sucesso!',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                is_active: user.is_active
            },
            token: 'jwt-token-placeholder',
            data_source: 'postgresql'
        });
    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro no login',
            error: error.message
        });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!dbConnected) {
            return res.status(503).json({
                success: false,
                message: 'Banco de dados não disponível'
            });
        }
        
        // Verificar se email já existe
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email já cadastrado'
            });
        }
        
        // Criar hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Inserir usuário
        const result = await pool.query(`
            INSERT INTO users (name, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, name, email, is_active, created_at
        `, [name, email, hashedPassword]);
        
        res.json({
            success: true,
            message: 'Usuário cadastrado com sucesso!',
            user: result.rows[0],
            data_source: 'postgresql'
        });
    } catch (error) {
        console.error('❌ Erro no registro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro no registro',
            error: error.message
        });
    }
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

// ✅ INICIALIZAÇÃO COM BANCO
app.listen(PORT, '0.0.0.0', async () => {
    console.log('🚀 TaskMaster Pro - Servidor rodando na porta:', PORT);
    console.log('✅ Servidor ativo e aguardando requisições');
    
    // Inicializar banco de dados
    setTimeout(async () => {
        const initialized = await initializeDatabase();
        console.log('🎯 Fase 2B: Consultas SQL implementadas');
        console.log('📊 Status:', initialized ? 'PostgreSQL Ativo' : 'Falha na inicialização');
    }, 2000);
});

// Capturar erros não tratados
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada:', reason);
});