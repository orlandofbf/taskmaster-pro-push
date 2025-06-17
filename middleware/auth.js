const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            error: 'Token de acesso requerido' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar se o usuário ainda existe
        const userResult = await query(
            'SELECT id, email, nome FROM usuarios WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ 
                error: 'Usuário não encontrado' 
            });
        }

        req.user = userResult.rows[0];
        next();
    } catch (err) {
        console.error('Erro na autenticação:', err);
        return res.status(403).json({ 
            error: 'Token inválido' 
        });
    }
};

// Middleware para verificar se é admin
const requireAdmin = async (req, res, next) => {
    try {
        const userResult = await query(
            'SELECT is_admin FROM usuarios WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].is_admin) {
            return res.status(403).json({ 
                error: 'Acesso negado. Privilégios de administrador requeridos.' 
            });
        }

        next();
    } catch (err) {
        console.error('Erro na verificação de admin:', err);
        return res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    }
};

module.exports = {
    authenticateToken,
    requireAdmin
};