// Variáveis globais
let allData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 10;

// Função para obter texto de status - MOVIDA PARA O INÍCIO
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

// Elementos do DOM - com verificação de existência
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectFilesBtn = document.getElementById('selectFilesBtn');
const fileList = document.getElementById('fileList');
const processBtn = document.getElementById('processBtn');
const clearBtn = document.getElementById('clearBtn');
const resetBtn = document.getElementById('resetBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const notification = document.getElementById('notification');
const tableBody = document.getElementById('tableBody');
const pagination = document.getElementById('pagination');
const applyFilterBtn = document.getElementById('applyFilterBtn');
const empresaFilter = document.getElementById('empresaFilter');
const statusFilter = document.getElementById('statusFilter');
const dateFilter = document.getElementById('dateFilter');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const generateBlacklistBtn = document.getElementById('generateBlacklistBtn');
const generateDeliverersBtn = document.getElementById('generateDeliverersBtn');
const generateExpiringBtn = document.getElementById('generateExpiringBtn');

// Event Listeners - com verificação de existência
if (selectFilesBtn) selectFilesBtn.addEventListener('click', () => fileInput.click());
if (fileInput) fileInput.addEventListener('change', handleFileSelect);
if (processBtn) processBtn.addEventListener('click', processFiles);
if (clearBtn) clearBtn.addEventListener('click', clearFiles);
if (resetBtn) resetBtn.addEventListener('click', resetAll);
if (applyFilterBtn) applyFilterBtn.addEventListener('click', applyFilters);
if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportToCsv);
if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportToExcel);
if (generateBlacklistBtn) generateBlacklistBtn.addEventListener('click', generateBlacklistReport);
if (generateDeliverersBtn) generateDeliverersBtn.addEventListener('click', generateDeliverersReport);
if (generateExpiringBtn) generateExpiringBtn.addEventListener('click', generateExpiringReport);

// Drag and Drop - com verificação de existência
if (uploadArea) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
    });

    uploadArea.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFileSelect() {
    handleFiles(fileInput.files);
}

function handleFiles(files) {
    if (!fileList) return;
    
    fileList.innerHTML = '';
    
    if (files.length === 0) {
        showNotification('Nenhum arquivo selecionado', 'error');
        return;
    }
    
    const fileCopies = Array.from(files);
    for (let i = 0; i < fileCopies.length; i++) {
        const file = fileCopies[i];
        const fileItem = document.createElement('div');
        fileItem.className = 'd-flex align-items-center p-2 mb-2 border rounded';
        
        const icon = getFileIcon(file.name);
        const fileName = file.name.length > 30 ? file.name.substring(0, 30) + '...' : file.name;
        
        fileItem.innerHTML = `
            <i class="${icon} fs-4 me-3 text-primary"></i>
            <div class="flex-grow-1">
                <div class="fw-bold">${fileName}</div>
                <small class="text-muted">${formatFileSize(file.size)}</small>
            </div>
            <button class="btn btn-sm btn-outline-danger remove-file">
                <i class="bi bi-x"></i>
            </button>
        `;
        
        fileList.appendChild(fileItem);
        
        fileItem.querySelector('.remove-file').addEventListener('click', function() {
            fileItem.remove();
        });
    }
}

function getFileIcon(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    if (extension === 'csv') return 'bi bi-file-earmark-text';
    if (extension === 'xlsx' || extension === 'xls') return 'bi bi-file-earmark-excel';
    return 'bi bi-file-earmark';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function clearFiles() {
    if (fileList) fileList.innerHTML = '';
    if (fileInput) fileInput.value = '';
}

function resetAll() {
    console.log('Resetando tudo...');
    allData = [];
    filteredData = [];
    currentPage = 1;
    
    if (tableBody) tableBody.innerHTML = '';
    if (pagination) pagination.innerHTML = '';
    
    if (typeof destroyCharts === 'function') destroyCharts();
    
    const totalPedidos = document.getElementById('totalPedidos');
    const entregasHoje = document.getElementById('entregasHoje');
    const pedidosAtrasados = document.getElementById('pedidosAtrasados');
    const entregadoresAtivos = document.getElementById('entregadoresAtivos');
    
    if (totalPedidos) totalPedidos.textContent = '0';
    if (entregasHoje) entregasHoje.textContent = '0';
    if (pedidosAtrasados) pedidosAtrasados.textContent = '0';
    if (entregadoresAtivos) entregadoresAtivos.textContent = '0';
    
    if (empresaFilter) empresaFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    if (dateFilter) dateFilter.value = '';
    
    showNotification('Sistema resetado', 'success');
}

function processFiles() {
    if (!fileList) return;
    
    const fileItems = fileList.querySelectorAll('.d-flex');
    
    if (fileItems.length === 0) {
        showNotification('Nenhum arquivo para processar', 'error');
        return;
    }
    
    resetAll();
    
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    if (processBtn) {
        processBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processando...';
        processBtn.disabled = true;
    }
    
    const formData = new FormData();
    
    if (fileInput) {
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('files', fileInput.files[i]);
        }
    }
    
    fetch('/api/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`Erro ${response.status}: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log('Upload bem-sucedido:', data);
            return fetch('/api/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } else {
            throw new Error(data.error || 'Erro no upload');
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`Erro ${response.status}: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log('Processamento bem-sucedido:', data);
            return fetch('/api/data');
        } else {
            throw new Error(data.error || 'Erro no processamento');
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`Erro ${response.status}: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Dados recebidos:', data);
        allData = data;
        filteredData = [...allData];
        
        updateStats();
        renderTable();
        renderCharts();
        
        showNotification('Arquivos processados com sucesso!', 'success');
    })
    .catch(error => {
        console.error('Erro:', error);
        showNotification('Erro: ' + error.message, 'error');
    })
    .finally(() => {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (processBtn) {
            processBtn.innerHTML = '<i class="bi bi-play-circle me-2"></i>Processar Arquivos';
            processBtn.disabled = false;
        }
    });
}

function updateStats() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    
    const entregasHoje = allData.filter(item => {
        if (!item.DATA_PREVISAO) return false;
        
        // Converter para objeto Date se for string
        const dataPrevisao = typeof item.DATA_PREVISAO === 'string' 
            ? new Date(item.DATA_PREVISAO) 
            : item.DATA_PREVISAO;
        
        return dataPrevisao >= hoje && dataPrevisao < amanha;
    }).length;
    
    const pedidosAtrasados = allData.filter(item => {
        if (!item.DATA_PREVISAO) return false;
        
        // Converter para objeto Date se for string
        const dataPrevisao = typeof item.DATA_PREVISAO === 'string' 
            ? new Date(item.DATA_PREVISAO) 
            : item.DATA_PREVISAO;
        
        return dataPrevisao < new Date() && item.STATUS_ENTREGA !== 'FINALIZADO';
    }).length;
    
    const entregadoresAtivos = new Set(
        allData.map(item => item.NOME_ENTREGADOR).filter(Boolean)
    ).size;
    
    const totalPedidos = document.getElementById('totalPedidos');
    const entregasHojeElement = document.getElementById('entregasHoje');
    const pedidosAtrasadosElement = document.getElementById('pedidosAtrasados');
    const entregadoresAtivosElement = document.getElementById('entregadoresAtivos');
    
    if (totalPedidos) totalPedidos.textContent = allData.length;
    if (entregasHojeElement) entregasHojeElement.textContent = entregasHoje;
    if (pedidosAtrasadosElement) pedidosAtrasadosElement.textContent = pedidosAtrasados;
    if (entregadoresAtivosElement) entregadoresAtivosElement.textContent = entregadoresAtivos;
}

function renderTable() {
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    paginatedData.forEach(item => {
        const row = document.createElement('tr');
        const statusClass = getStatusClass(item.STATUS_ENTREGA);
        const statusText = getStatusText(item.STATUS_ENTREGA);
        
        row.innerHTML = `
            <td>${item.ID_PEDIDO || ''}</td>
            <td>${item.EMPRESA || ''}</td>
            <td>${item.NOME_DESTINATARIO || ''}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>${item.NOME_ENTREGADOR || ''}</td>
            <td>${formatDate(item.DATA_PREVISAO)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" title="Ver detalhes">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    renderPagination();
}

function renderPagination() {
    if (!pagination) return;
    
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    pagination.innerHTML = '';
    
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" tabindex="-1">Anterior</a>`;
    prevLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });
    pagination.appendChild(prevLi);
    
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = i;
            renderTable();
        });
        pagination.appendChild(li);
    }
    
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#">Próximo</a>`;
    nextLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });
    pagination.appendChild(nextLi);
}

function applyFilters() {
    const empresaValue = empresaFilter ? empresaFilter.value : '';
    const statusValue = statusFilter ? statusFilter.value : '';
    const dateValue = dateFilter ? dateFilter.value : '';
    
    filteredData = allData.filter(item => {
        let matchesDate = true;
        
        if (dateValue) {
            if (!item.DATA_PREVISAO) {
                matchesDate = false;
            } else {
                // Converter para objeto Date se for string
                const dataPrevisao = typeof item.DATA_PREVISAO === 'string' 
                    ? new Date(item.DATA_PREVISAO) 
                    : item.DATA_PREVISAO;
                
                const filterDate = new Date(dateValue);
                matchesDate = dataPrevisao.toDateString() === filterDate.toDateString();
            }
        }
        
        return (
            (empresaValue === '' || item.EMPRESA === empresaValue) &&
            (statusValue === '' || item.STATUS_ENTREGA === statusValue) &&
            matchesDate
        );
    });
    
    currentPage = 1;
    renderTable();
    showNotification('Filtros aplicados com sucesso!', 'success');
}

function getStatusClass(status) {
    if (!status) return 'status-secondary';
    
    switch (status.toUpperCase()) {
        case 'FINALIZADO': return 'status-success';
        case 'ROTA': return 'status-info';
        case 'DEVOLVIDO': 
        case 'AUSENTE': 
        case 'CANCELADO': return 'status-danger';
        case 'EM_SEPARACAO':
        case 'AGUARDANDO_PAGAMENTO':
        case 'AGUARDANDO_RETIRADA':
        case 'AGUARDANDO_ENVIO': return 'status-warning';
        default: return 'status-secondary';
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function exportToCsv() {
    if (filteredData.length === 0) {
        showNotification('Nenhum dado para exportar', 'error');
        return;
    }
    
    let csv = 'ID Pedido,Empresa,Cliente,Status,Entregador,Data Previsão,Endereço,Cidade,Estado,CEP\n';
    
    filteredData.forEach(item => {
        csv += `"${item.ID_PEDIDO}","${item.EMPRESA}","${item.NOME_DESTINATARIO}","${getStatusText(item.STATUS_ENTREGA)}","${item.NOME_ENTREGADOR}","${item.DATA_PREVISAO}","${item.ENDERECO}","${item.CIDADE}","${item.ESTADO}","${item.CEP}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'dados_unificados.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Dados exportados para CSV com sucesso!', 'success');
}

function exportToExcel() {
    if (filteredData.length === 0) {
        showNotification('Nenhum dado para exportar', 'error');
        return;
    }
    
    const dataForExport = filteredData.map(item => ({
        'ID Pedido': item.ID_PEDIDO,
        'Empresa': item.EMPRESA,
        'Cliente': item.NOME_DESTINATARIO,
        'Status': getStatusText(item.STATUS_ENTREGA),
        'Entregador': item.NOME_ENTREGADOR,
        'Data Previsão': item.DATA_PREVISAO,
        'Endereço': item.ENDERECO,
        'Cidade': item.CIDADE,
        'Estado': item.ESTADO,
        'CEP': item.CEP
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataForExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados Unificados');
    XLSX.writeFile(wb, 'dados_unificados.xlsx');
    
    showNotification('Dados exportados para Excel com sucesso!', 'success');
}

function generateBlacklistReport() {
    const blacklistData = allData
        .filter(item => ['DEVOLVIDO', 'AUSENTE', 'CANCELADO'].includes(item.STATUS_ENTREGA))
        .reduce((acc, item) => {
            const key = `${item.NOME_DESTINATARIO}_${item.CEP}_${item.CIDADE}`;
            if (!acc[key]) {
                acc[key] = {
                    cliente: item.NOME_DESTINATARIO,
                    cep: item.CEP,
                    cidade: item.CIDADE,
                    insucessos: 0,
                    ultimoInsucesso: item.DATA_PREVISAO,
                    motivos: []
                };
            }
            acc[key].insucessos++;
            acc[key].motivos.push(getStatusText(item.STATUS_ENTREGA));
            return acc;
        }, {});
    
    const reportData = Object.values(blacklistData)
        .filter(item => item.insucessos > 2)
        .map(item => ({
            'Cliente': item.cliente,
            'CEP': item.cep,
            'Cidade': item.cidade,
            'Total de Insucessos': item.insucessos,
            'Último Insucesso': item.ultimoInsucesso,
            'Motivos': item.motivos.join(', ')
        }));
    
    if (reportData.length === 0) {
        showNotification('Nenhum cliente na blacklist encontrado', 'error');
        return;
    }
    
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Blacklist de Clientes');
    XLSX.writeFile(wb, 'blacklist_clientes.xlsx');
    
    showNotification('Relatório de blacklist gerado com sucesso!', 'success');
}

function generateDeliverersReport() {
    const deliverersData = allData.reduce((acc, item) => {
        if (!acc[item.NOME_ENTREGADOR]) {
            acc[item.NOME_ENTREGADOR] = {
                entregador: item.NOME_ENTREGADOR,
                totalPedidos: 0,
                sucessos: 0
            };
        }
        acc[item.NOME_ENTREGADOR].totalPedidos++;
        if (item.STATUS_ENTREGA === 'FINALIZADO') {
            acc[item.NOME_ENTREGADOR].sucessos++;
        }
        return acc;
    }, {});
    
    const reportData = Object.values(deliverersData).map(item => {
        const taxaSucesso = (item.sucessos / item.totalPedidos * 100).toFixed(2);
        return {
            'Entregador': item.entregador,
            'Total de Pedidos': item.totalPedidos,
            'Entregas Realizadas': item.sucessos,
            'Taxa de Sucesso (%)': taxaSucesso,
            'Pontuação': taxaSucesso > 97 ? 'Alta (>97%)' : 'Normal'
        };
    });
    
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pontuação de Entregadores');
    XLSX.writeFile(wb, 'pontuacao_entregadores.xlsx');
    
    showNotification('Relatório de entregadores gerado com sucesso!', 'success');
}

function generateExpiringReport() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    
    const expiringData = allData.filter(item => {
        if (!item.DATA_PREVISAO) return false;
        
        // Converter para objeto Date se for string
        const dataPrevisao = typeof item.DATA_PREVISAO === 'string' 
            ? new Date(item.DATA_PREVISAO) 
            : item.DATA_PREVISAO;
        
        return dataPrevisao >= hoje && dataPrevisao < amanha && item.STATUS_ENTREGA !== 'FINALIZADO';
    });
    
    if (expiringData.length === 0) {
        showNotification('Nenhum pedido vencendo hoje encontrado', 'error');
        return;
    }
    
    const reportData = expiringData.map(item => ({
        'ID Pedido': item.ID_PEDIDO,
        'Empresa': item.EMPRESA,
        'Cliente': item.NOME_DESTINATARIO,
        'Status': getStatusText(item.STATUS_ENTREGA),
        'Entregador': item.NOME_ENTREGADOR,
        'Endereço': item.ENDERECO,
        'Cidade': item.CIDADE,
        'Estado': item.ESTADO,
        'CEP': item.CEP
    }));
    
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos Vencendo Hoje');
    XLSX.writeFile(wb, 'pedidos_vencendo_hoje.xlsx');
    
    showNotification('Relatório de pedidos vencendo hoje gerado com sucesso!', 'success');
}

function showNotification(message, type) {
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Tornar as funções disponíveis globalmente
window.updateStats = updateStats;
window.renderTable = renderTable;
window.renderPagination = renderPagination;
window.applyFilters = applyFilters;
window.getStatusClass = getStatusClass;
window.getStatusText = getStatusText;
window.formatDate = formatDate;
window.exportToCsv = exportToCsv;
window.exportToExcel = exportToExcel;
window.generateBlacklistReport = generateBlacklistReport;
window.generateDeliverersReport = generateDeliverersReport;
window.generateExpiringReport = generateExpiringReport;
window.showNotification = showNotification;