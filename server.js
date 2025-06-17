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

// Rota de teste simples
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'TaskMaster Pro está funcionando!',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Rota de status
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        app: 'TaskMaster Pro',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        port: PORT
    });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 TaskMaster Pro - Servidor rodando na porta:', PORT);
    console.log('✅ Servidor ativo e aguardando requisições');
});