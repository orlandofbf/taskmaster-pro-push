const { initializeDatabase } = require('./config/database');

async function init() {
    try {
        console.log('🔧 Inicializando banco de dados...');
        await initializeDatabase();
        console.log('🎯 Inicialização concluída!');
    } catch (error) {
        console.error('💥 Falha na inicialização:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    init();
}

module.exports = init;