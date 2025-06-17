const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const router = express.Router();

// Registrar usuário
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
  try {
    console.log('📝 Tentativa de registro:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { name, email, password } = req.body;

    // Verificar se usuário já existe
    console.log('🔍 Verificando se usuário existe:', email);
    const existingUser = await query('SELECT id FROM users WHERE email = ?', [email]);

    if (existingUser.rows && existingUser.rows.length > 0) {
      console.log('❌ Usuário já existe');
      return res.status(400).json({ 
        success: false,
        message: 'Usuário já existe com este email' 
      });
    }

    // Hash da senha
    console.log('🔐 Gerando hash da senha...');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Inserir usuário
    console.log('💾 Inserindo usuário no banco...');
    const userId = uuidv4();
    const insertResult = await query(
      'INSERT INTO users (id, name, email, password, is_active, created_at) VALUES (?, ?, ?, ?, 1, datetime("now"))',
      [userId, name, email, hashedPassword]
    );

    console.log('✅ Usuário inserido com sucesso:', userId);

    // Gerar token JWT
    const token = jwt.sign(
      { id: userId, email },
      process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_123456789',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso!',
      token,
      user: { id: userId, name, email }
    });

  } catch (error) {
    console.error('❌ Erro no registro:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Senha é obrigatória')
], async (req, res) => {
  try {
    console.log('🔐 Tentativa de login:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Buscar usuário
    console.log('🔍 Buscando usuário:', email);
    const userResult = await query('SELECT * FROM users WHERE email = ?', [email]);

    if (!userResult.rows || userResult.rows.length === 0) {
      console.log('❌ Usuário não encontrado');
      return res.status(400).json({ 
        success: false,
        message: 'Credenciais inválidas' 
      });
    }

    const user = userResult.rows[0];
    console.log('✅ Usuário encontrado:', user.name);

    // Verificar senha
    console.log('🔐 Verificando senha...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Senha inválida');
      return res.status(400).json({ 
        success: false,
        message: 'Credenciais inválidas' 
      });
    }

    console.log('✅ Login válido');

    // Gerar token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_123456789',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });

  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Verificar token
router.get('/verify', (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Token não fornecido' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_123456789');
    
    res.json({
      success: true,
      message: 'Token válido',
      user: decoded
    });
  } catch (error) {
    res.status(401).json({ 
      success: false,
      message: 'Token inválido' 
    });
  }
});

module.exports = router;