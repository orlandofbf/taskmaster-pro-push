const { query } = require('../config/database');

class Task {
    // Criar tabela de tarefas
    static async createTable() {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS tarefas (
                id SERIAL PRIMARY KEY,
                titulo VARCHAR(255) NOT NULL,
                descricao TEXT,
                status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_progresso', 'concluida')),
                prioridade VARCHAR(10) DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
                data_vencimento TIMESTAMP,
                usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                categoria VARCHAR(50),
                tags TEXT[],
                anexos JSONB DEFAULT '[]',
                tempo_estimado INTEGER, -- em minutos
                tempo_gasto INTEGER DEFAULT 0, -- em minutos
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        try {
            await query(createTableQuery);
            console.log('✅ Tabela tarefas criada/verificada');
        } catch (err) {
            console.error('❌ Erro ao criar tabela tarefas:', err);
            throw err;
        }
    }

    // Criar nova tarefa
    static async create(taskData) {
        const {
            titulo,
            descricao,
            status = 'pendente',
            prioridade = 'media',
            data_vencimento,
            usuario_id,
            categoria,
            tags = [],
            tempo_estimado
        } = taskData;

        try {
            const result = await query(
                `INSERT INTO tarefas (
                    titulo, descricao, status, prioridade, data_vencimento,
                    usuario_id, categoria, tags, tempo_estimado
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *`,
                [titulo, descricao, status, prioridade, data_vencimento, usuario_id, categoria, tags, tempo_estimado]
            );

            return result.rows[0];
        } catch (err) {
            console.error('Erro ao criar tarefa:', err);
            throw err;
        }
    }

    // Buscar tarefas por usuário
    static async findByUserId(userId, filters = {}) {
        let whereClause = 'WHERE usuario_id = $1';
        let params = [userId];
        let paramCount = 1;

        // Adicionar filtros
        if (filters.status) {
            paramCount++;
            whereClause += ` AND status = $${paramCount}`;
            params.push(filters.status);
        }

        if (filters.prioridade) {
            paramCount++;
            whereClause += ` AND prioridade = $${paramCount}`;
            params.push(filters.prioridade);
        }

        if (filters.categoria) {
            paramCount++;
            whereClause += ` AND categoria = $${paramCount}`;
            params.push(filters.categoria);
        }

        // Ordenação
        let orderBy = 'ORDER BY created_at DESC';
        if (filters.orderBy) {
            const validOrders = ['created_at', 'data_vencimento', 'prioridade', 'titulo'];
            if (validOrders.includes(filters.orderBy)) {
                orderBy = `ORDER BY ${filters.orderBy} ${filters.orderDirection || 'ASC'}`;
            }
        }

        try {
            const result = await query(
                `SELECT * FROM tarefas ${whereClause} ${orderBy}`,
                params
            );
            return result.rows;
        } catch (err) {
            console.error('Erro ao buscar tarefas:', err);
            throw err;
        }
    }

    // Buscar tarefa por ID
    static async findById(id, userId) {
        try {
            const result = await query(
                'SELECT * FROM tarefas WHERE id = $1 AND usuario_id = $2',
                [id, userId]
            );
            return result.rows[0] || null;
        } catch (err) {
            console.error('Erro ao buscar tarefa por ID:', err);
            throw err;
        }
    }

    // Atualizar tarefa
    static async update(id, userId, updateData) {
        const {
            titulo,
            descricao,
            status,
            prioridade,
            data_vencimento,
            categoria,
            tags,
            tempo_estimado,
            tempo_gasto
        } = updateData;

        try {
            const result = await query(
                `UPDATE tarefas SET 
                    titulo = COALESCE($1, titulo),
                    descricao = COALESCE($2, descricao),
                    status = COALESCE($3, status),
                    prioridade = COALESCE($4, prioridade),
                    data_vencimento = COALESCE($5, data_vencimento),
                    categoria = COALESCE($6, categoria),
                    tags = COALESCE($7, tags),
                    tempo_estimado = COALESCE($8, tempo_estimado),
                    tempo_gasto = COALESCE($9, tempo_gasto),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $10 AND usuario_id = $11
                RETURNING *`,
                [titulo, descricao, status, prioridade, data_vencimento, categoria, tags, tempo_estimado, tempo_gasto, id, userId]
            );

            return result.rows[0] || null;
        } catch (err) {
            console.error('Erro ao atualizar tarefa:', err);
            throw err;
        }
    }

    // Deletar tarefa
    static async delete(id, userId) {
        try {
            const result = await query(
                'DELETE FROM tarefas WHERE id = $1 AND usuario_id = $2 RETURNING id',
                [id, userId]
            );
            return result.rows.length > 0;
        } catch (err) {
            console.error('Erro ao deletar tarefa:', err);
            throw err;
        }
    }

    // Estatísticas do usuário
    static async getStats(userId) {
        try {
            const result = await query(
                `SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
                    COUNT(*) FILTER (WHERE status = 'em_progresso') as em_progresso,
                    COUNT(*) FILTER (WHERE status = 'concluida') as concluidas,
                    COUNT(*) FILTER (WHERE data_vencimento < NOW() AND status != 'concluida') as atrasadas
                FROM tarefas WHERE usuario_id = $1`,
                [userId]
            );
            return result.rows[0];
        } catch (err) {
            console.error('Erro ao buscar estatísticas:', err);
            throw err;
        }
    }
}

module.exports = Task;