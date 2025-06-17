const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Task = require('../models/Task');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

// Validações
const taskValidation = [
    body('titulo').trim().isLength({ min: 1, max: 255 }).withMessage('Título é obrigatório e deve ter até 255 caracteres'),
    body('descricao').optional().trim().isLength({ max: 5000 }).withMessage('Descrição deve ter até 5000 caracteres'),
    body('status').optional().isIn(['pendente', 'em_progresso', 'concluida']).withMessage('Status inválido'),
    body('prioridade').optional().isIn(['baixa', 'media', 'alta', 'urgente']).withMessage('Prioridade inválida'),
    body('data_vencimento').optional().isISO8601().withMessage('Data de vencimento inválida'),
    body('categoria').optional().trim().isLength({ max: 50 }).withMessage('Categoria deve ter até 50 caracteres'),
    body('tags').optional().isArray().withMessage('Tags devem ser um array'),
    body('tempo_estimado').optional().isInt({ min: 1 }).withMessage('Tempo estimado deve ser um número positivo')
];

// GET /api/tasks - Listar tarefas do usuário
router.get('/', [
    query('status').optional().isIn(['pendente', 'em_progresso', 'concluida']).withMessage('Status inválido'),
    query('prioridade').optional().isIn(['baixa', 'media', 'alta', 'urgente']).withMessage('Prioridade inválida'),
    query('categoria').optional().trim(),
    query('orderBy').optional().isIn(['created_at', 'data_vencimento', 'prioridade', 'titulo']).withMessage('Ordenação inválida'),
    query('orderDirection').optional().isIn(['ASC', 'DESC']).withMessage('Direção da ordenação inválida')
], async (req, res) => {
    try {
        // Verificar erros de validação
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Parâmetros inválidos',
                details: errors.array()
            });
        }

        const filters = {
            status: req.query.status,
            prioridade: req.query.prioridade,
            categoria: req.query.categoria,
            orderBy: req.query.orderBy,
            orderDirection: req.query.orderDirection
        };

        const tasks = await Task.findByUserId(req.user.id, filters);

        res.json({
            tasks,
            total: tasks.length
        });

    } catch (err) {
        console.error('Erro ao listar tarefas:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/tasks/stats - Estatísticas das tarefas
router.get('/stats', async (req, res) => {
    try {
        const stats = await Task.getStats(req.user.id);
        
        res.json({
            stats: {
                total: parseInt(stats.total),
                pendentes: parseInt(stats.pendentes),
                em_progresso: parseInt(stats.em_progresso),
                concluidas: parseInt(stats.concluidas),
                atrasadas: parseInt(stats.atrasadas)
            }
        });

    } catch (err) {
        console.error('Erro ao buscar estatísticas:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/tasks/:id - Obter tarefa específica
router.get('/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'ID da tarefa inválido' });
        }

        const task = await Task.findById(taskId, req.user.id);
        
        if (!task) {
            return res.status(404).json({ error: 'Tarefa não encontrada' });
        }

        res.json({ task });

    } catch (err) {
        console.error('Erro ao buscar tarefa:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/tasks - Criar nova tarefa
router.post('/', taskValidation, async (req, res) => {
    try {
        // Verificar erros de validação
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: errors.array()
            });
        }

        const taskData = {
            ...req.body,
            usuario_id: req.user.id
        };

        const task = await Task.create(taskData);

        res.status(201).json({
            message: 'Tarefa criada com sucesso',
            task
        });

    } catch (err) {
        console.error('Erro ao criar tarefa:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /api/tasks/:id - Atualizar tarefa
router.put('/:id', taskValidation, async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'ID da tarefa inválido' });
        }

        // Verificar erros de validação
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: errors.array()
            });
        }

        const updatedTask = await Task.update(taskId, req.user.id, req.body);
        
        if (!updatedTask) {
            return res.status(404).json({ error: 'Tarefa não encontrada' });
        }

        res.json({
            message: 'Tarefa atualizada com sucesso',
            task: updatedTask
        });

    } catch (err) {
        console.error('Erro ao atualizar tarefa:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE /api/tasks/:id - Deletar tarefa
router.delete('/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'ID da tarefa inválido' });
        }

        const deleted = await Task.delete(taskId, req.user.id);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Tarefa não encontrada' });
        }

        res.json({ message: 'Tarefa deletada com sucesso' });

    } catch (err) {
        console.error('Erro ao deletar tarefa:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;