// Variáveis globais para os gráficos
let statusChartInstance = null;
let empresaChartInstance = null;

// Função para destruir os gráficos existentes
function destroyCharts() {
    if (statusChartInstance) {
        statusChartInstance.destroy();
        statusChartInstance = null;
    }
    if (empresaChartInstance) {
        empresaChartInstance.destroy();
        empresaChartInstance = null;
    }
    
    // Limpar canvas
    const statusCanvas = document.getElementById('statusChart');
    const empresaCanvas = document.getElementById('empresaChart');
    if (statusCanvas) {
        const statusCtx = statusCanvas.getContext('2d');
        statusCtx.clearRect(0, 0, statusCanvas.width, statusCanvas.height);
    }
    if (empresaCanvas) {
        const empresaCtx = empresaCanvas.getContext('2d');
        empresaCtx.clearRect(0, 0, empresaCanvas.width, empresaCanvas.height);
    }
}

// Função para renderizar os gráficos
function renderCharts() {
    console.log('Renderizando gráficos com', allData.length, 'registros');
    
    destroyCharts();
    
    if (allData.length === 0) {
        console.log('Não há dados para renderizar gráficos');
        return;
    }
    
    // Gráfico de Status
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    const statusCounts = {};
    
    allData.forEach(item => {
        const status = item.STATUS_ENTREGA || 'DESCONHECIDO';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('Contagem de status:', statusCounts);
    
    statusChartInstance = new Chart(statusCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(statusCounts).map(status => getStatusText(status)),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#2ecc71', '#3498db', '#e74c3c', '#f39c12', '#9b59b6', '#95a5a6'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Status de Entregas'
                }
            }
        }
    });
    
    // Gráfico de Empresas
    const empresaCtx = document.getElementById('empresaChart').getContext('2d');
    const empresaCounts = {};
    
    allData.forEach(item => {
        const empresa = item.EMPRESA || 'DESCONHECIDA';
        empresaCounts[empresa] = (empresaCounts[empresa] || 0) + 1;
    });
    
    console.log('Contagem de empresas:', empresaCounts);
    
    empresaChartInstance = new Chart(empresaCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(empresaCounts),
            datasets: [{
                label: 'Número de Pedidos',
                data: Object.values(empresaCounts),
                backgroundColor: '#3498db'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Pedidos por Empresa'
                }
            }
        }
    });
    
    console.log('Gráficos renderizados com sucesso');
}

// Função para obter texto de status
function getStatusText(status) {
    if (!status) return 'Desconhecido';
    
    switch (status.toUpperCase()) {
        case 'FINALIZADO': return 'Entregue';
        case 'ROTA': return 'Em Rota';
        case 'DEVOLVIDO': return 'Devolvido';
        case 'AUSENTE': return 'Ausente';
        case 'CANCELADO': return 'Cancelado';
        case 'EM_SEPARACAO': return 'Em Separação';
        case 'AGUARDANDO_PAGAMENTO': return 'Aguardando Pagamento';
        case 'AGUARDANDO_RETIRADA': return 'Aguardando Retirada';
        case 'AGUARDANDO_ENVIO': return 'Aguardando Envio';
        default: return status;
    }
}

// Tornar as funções disponíveis globalmente
window.destroyCharts = destroyCharts;
window.renderCharts = renderCharts;
window.getStatusText = getStatusText;