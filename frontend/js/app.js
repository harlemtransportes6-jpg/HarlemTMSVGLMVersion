// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Garantir que as variáveis globais existam
    if (typeof allData === 'undefined') window.allData = [];
    if (typeof filteredData === 'undefined') window.filteredData = [];
    
    // Inicializar a interface
    updateStats();
    renderTable();
    renderCharts();
});