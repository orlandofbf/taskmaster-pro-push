const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

class User {
    // Criar tabela de usuários
    static async createTable() {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                avatar_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        try {
            await query(createTableQuery);
            console.log('✅ Tabela usuarios criada/verificada');
        } catch (err) {
            console.error('❌ Erro ao criar tabela usuarios:', err);
            throw err;
        }
    }

    // Criar novo usuário
    static async create(userData) {
        const { nome, email, senha } = userData;
        
        try {
            // Verificar se email já existe
            const existingUser = await query(
                'SELECT id FROM usuarios WHERE email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                throw new Error('Email já está em uso');
            }

            // Criptografar senha
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(senha, saltRounds);

            // Inserir usuário
            const result = await query(
                `INSERT INTO usuarios (nome, email, senha) 
                 VALUES ($1, $2, $3) 
                 RETURNING id, nome, email, created_at`,
                [nome, email, hashedPassword]
            );

            return result.rows[0];
        } catch (err) {
            console.error('Erro ao criar usuário:', err);
            throw err;
        }
    }

    // Buscar usuário por email
    static async findByEmail(email) {
        try {
            const result = await query(
                'SELECT * FROM usuarios WHERE email = $1',
                [email]
            );
            return result.rows[0] || null;
        } catch (err) {
            console.error('Erro ao buscar usuário por email:', err);
            throw err;
        }
    }

    // Buscar usuário por ID
    static async findById(id) {
        try {
            const result = await query(
                'SELECT id, nome, email, is_admin, avatar_url, created_at FROM usuarios WHERE id = $1',
                [id]
            );
            return result.rows[0] || null;
        } catch (err) {
            console.error('Erro ao buscar usuário por ID:', err);
            throw err;
        }
    }

    // Verificar senha
    static async verifyPassword(plainPassword, hashedPassword) {
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (err) {
            console.error('Erro ao verificar senha:', err);
            return false;
        }
    }

    // Atualizar usuário
    static async update(id, updateData) {
        const { nome, email, avatar_url } = updateData;
        
        try {
            const result = await query(
                `UPDATE usuarios 
                 SET nome = $1, email = $2, avatar_url = $3, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $4 
                 RETURNING id, nome, email, avatar_url, updated_at`,
                [nome, email, avatar_url, id]
            );

            return result.rows[0] || null;
        } catch (err) {
            console.error('Erro ao atualizar usuário:', err);
            throw err;
        }
    }

    // Deletar usuário
    static async delete(id) {
        try {
            const result = await query(
                'DELETE FROM usuarios WHERE id = $1 RETURNING id',
                [id]
            );
            return result.rows.length > 0;
        } catch (err) {
            console.error('Erro ao deletar usuário:', err);
            throw err;
        }
    }
}

module.exports = User;