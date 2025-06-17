// TaskMaster Pro - JavaScript Principal
class TaskMasterApp {
    constructor() {
        this.tasks = [
            {
                id: 1,
                title: 'Configurar ambiente de desenvolvimento',
                description: 'Instalar Node.js, configurar banco de dados e estrutura do projeto',
                status: 'concluida',
                priority: 'alta',
                createdAt: new Date('2025-01-15'),
                dueDate: new Date('2025-01-16')
            },
            {
                id: 2,
                title: 'Criar interface do usuário',
                description: 'Desenvolver frontend responsivo com HTML, CSS e JavaScript',
                status: 'em_progresso',
                priority: 'media',
                createdAt: new Date('2025-01-16'),
                dueDate: new Date('2025-01-20')
            },
            {
                id: 3,
                title: 'Implementar autenticação',
                description: 'Sistema de login e registro de usuários',
                status: 'pendente',
                priority: 'urgente',
                createdAt: new Date('2025-01-17'),
                dueDate: new Date('2025-01-25')
            },
            {
                id: 4,
                title: 'Configurar banco de dados',
                description: 'Setup PostgreSQL e criação das tabelas',
                status: 'pendente',
                priority: 'alta',
                createdAt: new Date('2025-01-17'),
                dueDate: new Date('2025-01-22')
            }
        ];
        
        this.currentFilter = { status: '', priority: '' };
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupModal();
        this.setupFilters();
        this.updateStats();
        this.renderTasks();
        this.renderRecentTasks();
        
        console.log('🚀 TaskMaster Pro inicializado com sucesso!');
    }

    // Navegação entre seções
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.content-section');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active de todos os links
                navLinks.forEach(l => l.classList.remove('active'));
                // Adiciona active ao link clicado
                link.classList.add('active');
                
                // Esconde todas as seções
                sections.forEach(s => s.classList.remove('active'));
                // Mostra a seção correspondente
                const targetSection = document.getElementById(link.dataset.section);
                if (targetSection) {
                    targetSection.classList.add('active');
                }
            });
        });
    }

    // Configurar modal de tarefas
    setupModal() {
        const newTaskBtn = document.getElementById('newTaskBtn');
        const taskModal = document.getElementById('taskModal');
        const closeTaskModal = document.getElementById('closeTaskModal');
        const cancelTask = document.getElementById('cancelTask');
        const taskForm = document.getElementById('taskForm');

        // Abrir modal
        newTaskBtn.addEventListener('click', () => {
            taskModal.classList.add('active');
        });

        // Fechar modal
        const closeModal = () => {
            taskModal.classList.remove('active');
            taskForm.reset();
        };

        closeTaskModal.addEventListener('click', closeModal);
        cancelTask.addEventListener('click', closeModal);

        // Fechar clicando fora
        taskModal.addEventListener('click', (e) => {
            if (e.target === taskModal) {
                closeModal();
            }
        });

        // Submeter formulário
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTask();
            closeModal();
        });
    }

    // Configurar filtros
    setupFilters() {
        const statusFilter = document.getElementById('statusFilter');
        const priorityFilter = document.getElementById('priorityFilter');

        statusFilter.addEventListener('change', (e) => {
            this.currentFilter.status = e.target.value;
            this.renderTasks();
        });

        priorityFilter.addEventListener('change', (e) => {
            this.currentFilter.priority = e.target.value;
            this.renderTasks();
        });
    }

    // Criar nova tarefa
    createTask() {
        const formData = {
            id: Date.now(),
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            status: document.getElementById('taskStatus').value,
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value ? 
                     new Date(document.getElementById('taskDueDate').value) : null,
            createdAt: new Date()
        };

        this.tasks.unshift(formData);
        this.updateStats();
        this.renderTasks();
        this.renderRecentTasks();
        
        this.showNotification('Tarefa criada com sucesso!', 'success');
    }

    // Atualizar estatísticas
    updateStats() {
        const stats = {
            total: this.tasks.length,
            pendente: this.tasks.filter(t => t.status === 'pendente').length,
            em_progresso: this.tasks.filter(t => t.status === 'em_progresso').length,
            concluida: this.tasks.filter(t => t.status === 'concluida').length
        };

        document.getElementById('totalTasks').textContent = stats.total;
        document.getElementById('pendingTasks').textContent = stats.pendente;
        document.getElementById('inProgressTasks').textContent = stats.em_progresso;
        document.getElementById('completedTasks').textContent = stats.concluida;
    }

    // Renderizar lista de tarefas
    renderTasks() {
        const tasksList = document.getElementById('tasksList');
        let filteredTasks = this.tasks;

        // Aplicar filtros
        if (this.currentFilter.status) {
            filteredTasks = filteredTasks.filter(t => t.status === this.currentFilter.status);
        }
        if (this.currentFilter.priority) {
            filteredTasks = filteredTasks.filter(t => t.priority === this.currentFilter.priority);
        }

        if (filteredTasks.length === 0) {
            tasksList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Nenhuma tarefa encontrada</p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = filteredTasks.map(task => `
            <div class="task-item" data-task-id="${task.id}">
                <div class="task-info">
                    <h4>${task.title}</h4>
                    <p>${task.description}</p>
                    ${task.dueDate ? `<small style="color: #888;">Vencimento: ${this.formatDate(task.dueDate)}</small>` : ''}
                </div>
                <div class="task-meta">
                    <span class="task-status ${task.status}">${this.getStatusLabel(task.status)}</span>
                    <span class="task-priority ${task.priority}">${this.getPriorityLabel(task.priority)}</span>
                    <div class="task-actions">
                        <button class="btn-icon" onclick="app.toggleTaskStatus(${task.id})" title="Alterar Status">
                            <i class="fas fa-sync"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="app.deleteTask(${task.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Renderizar tarefas recentes
    renderRecentTasks() {
        const recentTasksList = document.getElementById('recentTasksList');
        const recentTasks = this.tasks
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 3);

        recentTasksList.innerHTML = recentTasks.map(task => `
            <div class="task-item">
                <div class="task-info">
                    <h4>${task.title}</h4>
                    <p>${task.description}</p>
                </div>
                <div class="task-meta">
                    <span class="task-status ${task.status}">${this.getStatusLabel(task.status)}</span>
                    <span class="task-priority ${task.priority}">${this.getPriorityLabel(task.priority)}</span>
                </div>
            </div>
        `).join('');
    }

    // Alternar status da tarefa
    toggleTaskStatus(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const statusCycle = ['pendente', 'em_progresso', 'concluida'];
        const currentIndex = statusCycle.indexOf(task.status);
        const nextIndex = (currentIndex + 1) % statusCycle.length;
        
        task.status = statusCycle[nextIndex];
        
        this.updateStats();
        this.renderTasks();
        this.renderRecentTasks();
        
        this.showNotification(`Status alterado para: ${this.getStatusLabel(task.status)}`, 'info');
    }

    // Excluir tarefa
    deleteTask(taskId) {
        if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.updateStats();
            this.renderTasks();
            this.renderRecentTasks();
            
            this.showNotification('Tarefa excluída com sucesso!', 'success');
        }
    }

    // Utilitários
    getStatusLabel(status) {
        const labels = {
            'pendente': 'Pendente',
            'em_progresso': 'Em Progresso',
            'concluida': 'Concluída'
        };
        return labels[status] || status;
    }

    getPriorityLabel(priority) {
        const labels = {
            'baixa': 'Baixa',
            'media': 'Média',
            'alta': 'Alta',
            'urgente': 'Urgente'
        };
        return labels[priority] || priority;
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('pt-BR');
    }

    // Sistema de notificações
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Mostrar notificação
        setTimeout(() => notification.classList.add('show'), 100);

        // Remover após 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
}

// Inicializar aplicação quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TaskMasterApp();
});