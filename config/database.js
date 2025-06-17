const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Caminho do banco de dados
const dbPath = path.join(__dirname, '..', 'database.sqlite');

// Criar conexão com SQLite
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar SQLite:', err.message);
    } else {
        console.log('✅ Conectado ao banco SQLite');
    }
});

// Função para executar queries
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
            db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ rows });
                }
            });
        } else {
            db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ 
                        rows: [{ id: this.lastID }],
                        rowsAffected: this.changes,
                        lastID: this.lastID
                    });
                }
            });
        }
    });
}

// Função para testar conexão
async function testConnection() {
    try {
        await query("SELECT 1 as test");
        console.log('✅ Conexão com SQLite OK');
        return true;
    } catch (error) {
        console.error('❌ Erro na conexão SQLite:', error.message);
        return false;
    }
}

// Inicializar tabelas
async function initializeDatabase() {
    try {
        // Verificar se coluna password existe na tabela users
        const tableInfo = await query("PRAGMA table_info(users)");
        const hasPasswordColumn = tableInfo.rows.some(row => row.name === 'password');
        
        if (!hasPasswordColumn) {
            console.log('🔧 Adicionando coluna password à tabela users...');
            await query("ALTER TABLE users ADD COLUMN password TEXT");
            console.log('✅ Coluna password adicionada');
            
            // Atualizar usuário padrão com senha
            const defaultPassword = await bcrypt.hash('admin123', 12);
            await query("UPDATE users SET password = ? WHERE email = 'admin@taskmaster.com'", [defaultPassword]);
            console.log('✅ Senha padrão definida para admin@taskmaster.com');
            console.log('🔐 Login: admin@taskmaster.com / admin123');
        }

        // Criar tabela users (se não existir) - AGORA COM PASSWORD
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Criar tabela tasks
        await query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_progresso', 'concluida')),
                priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
                due_date DATETIME,
                user_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Inserir usuário padrão se não existir
        const existingUsers = await query("SELECT COUNT(*) as count FROM users");
        if (existingUsers.rows[0].count === 0) {
            const defaultPassword = await bcrypt.hash('admin123', 12);
            await query(`
                INSERT INTO users (id, name, email, password, is_active)
                VALUES ('149aaad6-8b7e-493b-8a43-93a06ad5836a', 'Usuário Padrão', 'admin@taskmaster.com', ?, true)
            `, [defaultPassword]);

            // Inserir algumas tarefas de exemplo
            const sampleTasks = [
                {
                    title: 'Configurar ambiente de desenvolvimento',
                    description: 'Instalar Node.js, VS Code e dependências do projeto',
                    priority: 'alta',
                    status: 'concluida'
                },
                {
                    title: 'Criar sistema de autenticação',
                    description: 'Implementar login e cadastro de usuários',
                    priority: 'urgente',
                    status: 'em_progresso'
                },
                {
                    title: 'Implementar notificações push',
                    description: 'Adicionar sistema de notificações em tempo real',
                    priority: 'media',
                    status: 'pendente'
                },
                {
                    title: 'Fazer deploy da aplicação',
                    description: 'Configurar Railway e colocar aplicação online',
                    priority: 'alta',
                    status: 'em_progresso'
                }
            ];

            for (const task of sampleTasks) {
                await query(`
                    INSERT INTO tasks (title, description, priority, status, user_id)
                    VALUES (?, ?, ?, ?, '149aaad6-8b7e-493b-8a43-93a06ad5836a')
                `, [task.title, task.description, task.priority, task.status]);
            }

            console.log('✅ Dados iniciais inseridos');
        }

        console.log('✅ Banco de dados inicializado');
    } catch (error) {
        console.error('❌ Erro ao inicializar banco:', error.message);
    }
}

module.exports = {
    query,
    testConnection,
    initializeDatabase
};