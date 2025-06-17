const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configuração do PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Função para executar queries (similar ao SQLite)
async function query(sql, params = []) {
    try {
        const result = await pool.query(sql, params);
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            return { rows: result.rows };
        } else {
            return { 
                rows: result.rows,
                rowsAffected: result.rowCount,
                lastID: result.rows[0]?.id || null
            };
        }
    } catch (error) {
        throw error;
    }
}

// Função para testar conexão
async function testConnection() {
    try {
        await pool.query("SELECT 1 as test");
        console.log('✅ Conexão com PostgreSQL OK');
        return true;
    } catch (error) {
        console.error('❌ Erro na conexão PostgreSQL:', error.message);
        return false;
    }
}

// Inicializar tabelas
async function initializeDatabase() {
    try {
        console.log('🔧 Inicializando banco PostgreSQL...');

        // Criar extensão para UUID apenas se necessário
        await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Criar tabela users
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Criar tabela tasks
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_progresso', 'concluida')),
                priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
                due_date TIMESTAMP,
                user_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Verificar se usuário padrão existe
        const existingUsers = await pool.query("SELECT COUNT(*) as count FROM users");
        if (existingUsers.rows[0].count == 0) {
            const defaultPassword = await bcrypt.hash('admin123', 12);
            // Inserir usuário padrão
            await pool.query(`
                INSERT INTO users (id, name, email, password, is_active)
                VALUES ('personal-user-2025', 'Meu TaskMaster', 'meu@taskmaster.com', $1, true)
            `, [defaultPassword]);

            // Inserir tarefas de exemplo
            const sampleTasks = [
                {
                    title: '🎯 Bem-vindo ao TaskMaster Pro!',
                    description: 'Esta é sua primeira tarefa. Explore as funcionalidades!',
                    priority: 'alta',
                    status: 'pendente'
                },
                {
                    title: '✅ Configurar perfil pessoal',
                    description: 'Personalize suas informações e preferências',
                    priority: 'media',
                    status: 'pendente'
                },
                {
                    title: '🚀 Testar persistência de dados',
                    description: 'Criar, editar e excluir tarefas para testar o sistema',
                    priority: 'alta',
                    status: 'em_progresso'
                }
            ];

            for (const task of sampleTasks) {
                await pool.query(`
                    INSERT INTO tasks (title, description, priority, status, user_id)
                    VALUES ($1, $2, $3, $4, 'personal-user-2025')
                `, [task.title, task.description, task.priority, task.status]);
            }

            console.log('✅ Dados iniciais inseridos');
            console.log('🔐 Login: meu@taskmaster.com / admin123');
        }

        console.log('✅ Banco PostgreSQL inicializado');
        console.log('👤 Modo Pessoal ativo');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar banco:', error.message);
        throw error;
    }
}

module.exports = {
    pool,
    query,
    testConnection,
    initializeDatabase
};