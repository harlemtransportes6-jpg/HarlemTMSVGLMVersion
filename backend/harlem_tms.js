const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const { format, parseISO, isValid, parse } = require('date-fns');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações
const TABELAS_DIR = path.join(__dirname, 'Tabelas');
const RELATORIOS_DIR = path.join(__dirname, 'Relatorios');
if (!fs.existsSync(RELATORIOS_DIR)) {
    fs.mkdirSync(RELATORIOS_DIR);
}

// Mapeamento de colunas (unificado)
const COLUMN_MAPPING = {
    'ID_PEDIDO': {
        'Magazine Luiza': 'Referencia',
        'Pichau': 'N.º pedido',
        'PetLove': 'Pedido'
    },
    'DATA_PEDIDO': {
        'Magazine Luiza': 'Data',
        'Pichau': 'Data pedido',
        'PetLove': 'Data_Cadastro'
    },
    'STATUS_ENTREGA': {
        'Magazine Luiza': 'Descricao do Status',
        'Pichau': 'Situação',
        'PetLove': 'Ultima_Ocorrencia'
    },
    'DATA_STATUS': {
        'Magazine Luiza': 'Data Mobile',
        'Pichau': 'Data última ocorrência',
        'PetLove': 'Data_Ultima_Ocorrencia'
    },
    'NOME_DESTINATARIO': {
        'Magazine Luiza': 'Destinatario',
        'Pichau': 'Destinatário',
        'PetLove': 'Cliente'
    },
    'ENDERECO': {
        'Magazine Luiza': 'Endereco',
        'Pichau': 'Endereço',
        'PetLove': 'Endereco_Destinatario'
    },
    'BAIRRO': {
        'Magazine Luiza': 'Bairro',
        'Pichau': 'Bairro',
        'PetLove': 'Bairro_Destinatario'
    },
    'CIDADE': {
        'Magazine Luiza': 'Cidade',
        'Pichau': 'Cidade',
        'PetLove': 'Cidade_Destinatario'
    },
    'ESTADO': {
        'Magazine Luiza': 'Estado',
        'Pichau': 'Estado',
        'PetLove': 'Estado_Destinatario'
    },
    'CEP': {
        'Magazine Luiza': 'Cep',
        'Pichau': 'CEP',
        'PetLove': 'Cep_Destinatario'
    },
    'NOME_ENTREGADOR': {
        'Magazine Luiza': 'Condutor',
        'Pichau': 'Último motorista',
        'PetLove': 'Motorista_Lista'
    },
    'DATA_PREVISAO': {
        'Magazine Luiza': 'Data Previsao',
        'Pichau': 'Data prevista',
        'PetLove': 'Data_do_Carregamento_Lista'
    },
    'DATA_DISTRIBUICAO': {
        'Magazine Luiza': 'Data Distribuicao',
        'Pichau': 'Data expedicao',
        'PetLove': 'Data_do_Carregamento_Lista'
    },
    'PESO': {
        'Pichau': 'Peso real',
        'PetLove': 'Peso_Total_do_Pedido'
    },
    'QUANTIDADE_ITENS': {
        'Magazine Luiza': 'Quantidade',
        'Pichau': 'Qtde. itens'
    },
    'QUANTIDADE_VOLUMES': {
        'Pichau': 'Qtde. volumes'
    },
    'VALOR_MERCADORIA': {
        'Magazine Luiza': 'Valor da Nota',
        'Pichau': 'Valor pedido',
        'PetLove': 'Total_Mercadoria'
    }
};

// Mapeamento de status (unificado e simplificado)
const STATUS_MAPPING = {
    'FINALIZADO': ['Entregue', 'Finalizado'],
    'DEVOLVIDO': ['Devolucao', 'Devolvido'],
    'AUSENTE': ['Ausente'],
    'INSUCESSO': ['Insucesso', 'Attempt_fail'],
    'ROTA': ['Em Rota', 'Em Rota para Entrega'],
    'CANCELADO': ['Cancelado']
};

// Função para normalizar status
function normalizeStatus(status) {
    if (!status) return "DESCONHECIDO";
    status = status.toString().trim().toUpperCase();
    for (const [unified, originals] of Object.entries(STATUS_MAPPING)) {
        if (originals.some(orig => status.includes(orig.toUpperCase()))) {
            return unified;
        }
    }
    return "DESCONHECIDO";
}

// Função para normalizar datas
function normalizeDate(dateStr) {
    if (!dateStr) return null;
    // Tenta parsear no formato brasileiro (dd/mm/yyyy) ou ISO
    let date = parse(dateStr, 'dd/MM/yyyy', new Date());
    if (!isValid(date)) {
        date = parseISO(dateStr);
    }
    if (!isValid(date)) {
        return null;
    }
    return date;
}

// Função para ler um arquivo (CSV ou Excel) e retornar um array de objetos
function readFile(filePath, empresa) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.csv') {
        return new Promise((resolve, reject) => {
            const results = [];
            fs.createReadStream(filePath)
                .pipe(csv({ separator: ';' }))
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', reject);
        });
    } else if (ext === '.xlsx' || ext === '.xls') {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return xlsx.utils.sheet_to_json(worksheet);
    } else {
        throw new Error(`Formato de arquivo não suportado: ${ext}`);
    }
}

// Função para carregar e padronizar um arquivo
async function loadFile(filePath, empresa) {
    try {
        const data = await readFile(filePath, empresa);
        // Padronizar colunas: converter para maiúsculas e remover espaços
        const normalizedData = data.map(row => {
            const normalizedRow = {};
            for (const key in row) {
                normalizedRow[key.trim().toUpperCase()] = row[key];
            }
            return normalizedRow;
        });

        // Mapear colunas
        const mappedData = normalizedData.map(row => {
            const newRow = { EMPRESA: empresa };
            for (const [unifiedCol, sourceMap] of Object.entries(COLUMN_MAPPING)) {
                const sourceCol = sourceMap[empresa];
                if (sourceCol && row[sourceCol.toUpperCase()] !== undefined) {
                    newRow[unifiedCol] = row[sourceCol.toUpperCase()];
                }
            }
            return newRow;
        });

        // Normalizar status
        mappedData.forEach(row => {
            if (row.STATUS_ENTREGA) {
                row.STATUS_ENTREGA = normalizeStatus(row.STATUS_ENTREGA);
            }
        });

        // Normalizar datas
        const dateCols = ['DATA_PEDIDO', 'DATA_STATUS', 'DATA_PREVISAO', 'DATA_DISTRIBUICAO'];
        mappedData.forEach(row => {
            dateCols.forEach(col => {
                if (row[col]) {
                    row[col] = normalizeDate(row[col]);
                }
            });
        });

        // Preencher nulos
        mappedData.forEach(row => {
            if (!row.NOME_ENTREGADOR) {
                row.NOME_ENTREGADOR = 'esperando motorista';
            }
        });

        return mappedData;
    } catch (error) {
        console.error(`Erro ao carregar arquivo ${filePath}:`, error);
        return [];
    }
}

// Função para unificar tabelas
async function unifyTables() {
    const files = {
        'Magazine Luiza': path.join(TABELAS_DIR, 'MagazineLuiza.csv'),
        'Pichau': path.join(TABELAS_DIR, 'Pichau.xlsx'),
        'PetLove': path.join(TABELAS_DIR, 'PetLoveRelatorioTMS.xlsx')
    };

    const allData = [];
    for (const [empresa, filePath] of Object.entries(files)) {
        if (fs.existsSync(filePath)) {
            const data = await loadFile(filePath, empresa);
            allData.push(...data);
        } else {
            console.warn(`Aviso: Arquivo ${filePath} não encontrado. Pulando.`);
        }
    }

    if (allData.length === 0) {
        throw new Error('Nenhum arquivo encontrado em Tabelas/');
    }

    // Remover duplicatas por ID_PEDIDO e EMPRESA
    const uniqueData = [];
    const seen = new Set();
    allData.forEach(row => {
        const key = `${row.ID_PEDIDO}_${row.EMPRESA}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueData.push(row);
        }
    });

    // Salvar arquivo unificado (CSV)
    const unifiedFile = path.join(RELATORIOS_DIR, 'tabela_unificada.csv');
    // Converter para CSV (usando xlsx para escrever CSV com separador ;)
    const worksheet = xlsx.utils.json_to_sheet(uniqueData);
    const csvContent = xlsx.utils.sheet_to_csv(worksheet, { FS: ';' });
    fs.writeFileSync(unifiedFile, csvContent, 'utf8');
    console.log(`Tabela unificada salva em ${unifiedFile}`);

    return uniqueData;
}

// Função para gerar blacklist de clientes
function generateBlacklist(data) {
    const insucessos = ['AUSENTE', 'INSUCESSO', 'DEVOLVIDO'];
    const filtered = data.filter(row => insucessos.includes(row.STATUS_ENTREGA));

    // Agrupar por destinatário, CEP e cidade
    const grouped = {};
    filtered.forEach(row => {
        const key = `${row.NOME_DESTINATARIO}_${row.CEP}_${row.CIDADE}`;
        if (!grouped[key]) {
            grouped[key] = {
                NOME_DESTINATARIO: row.NOME_DESTINATARIO,
                CEP: row.CEP,
                CIDADE: row.CIDADE,
                Total_Insucessos: 0,
                Ultimo_Insucesso: null,
                Motivos: new Set()
            };
        }
        grouped[key].Total_Insucessos += 1;
        if (row.DATA_STATUS && (!grouped[key].Ultimo_Insucesso || row.DATA_STATUS > grouped[key].Ultimo_Insucesso)) {
            grouped[key].Ultimo_Insucesso = row.DATA_STATUS;
        }
        grouped[key].Motivos.add(row.STATUS_ENTREGA);
    });

    // Filtrar apenas os com mais de 2 insucessos
    const blacklist = Object.values(grouped)
        .filter(item => item.Total_Insucessos > 2)
        .map(item => ({
            ...item,
            Motivos: Array.from(item.Motivos).join(', ')
        }))
        .sort((a, b) => b.Total_Insucessos - a.Total_Insucessos);

    // Salvar em Excel
    const blacklistFile = path.join(RELATORIOS_DIR, 'blacklist_clientes.xlsx');
    const worksheet = xlsx.utils.json_to_sheet(blacklist);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Blacklist');
    xlsx.writeFile(workbook, blacklistFile);
    console.log(`Blacklist salva em ${blacklistFile} (${blacklist.length} entradas)`);

    return blacklist;
}

// Função para gerar pontuação de entregadores
function generateEntregadoresPontuacao(data) {
    // Agrupar por entregador
    const grouped = {};
    data.forEach(row => {
        const entregador = row.NOME_ENTREGADOR || 'esperando motorista';
        if (!grouped[entregador]) {
            grouped[entregador] = {
                NOME_ENTREGADOR: entregador,
                Total_Pedidos: 0,
                Sucessos: 0
            };
        }
        grouped[entregador].Total_Pedidos += 1;
        if (row.STATUS_ENTREGA === 'FINALIZADO') {
            grouped[entregador].Sucessos += 1;
        }
    });

    const stats = Object.values(grouped).map(item => {
        const taxaSucesso = item.Total_Pedidos > 0 ? item.Sucessos / item.Total_Pedidos : 0;
        return {
            ...item,
            Taxa_Sucesso: taxaSucesso,
            Pontuacao: taxaSucesso > 0.97 ? 'Alta (>97%)' : 'Normal'
        };
    }).sort((a, b) => b.Taxa_Sucesso - a.Taxa_Sucesso);

    // Salvar em Excel
    const entregadoresFile = path.join(RELATORIOS_DIR, 'pontuacao_entregadores.xlsx');
    const worksheet = xlsx.utils.json_to_sheet(stats);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Entregadores');
    xlsx.writeFile(workbook, entregadoresFile);
    console.log(`Pontuação de entregadores salva em ${entregadoresFile}`);

    return stats;
}

// Função para filtrar pedidos vencendo hoje
function filterPedidosVencendoHoje(data) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const filtrado = data.filter(row => {
        if (!row.DATA_PREVISAO) return false;
        const dataPrevisao = new Date(row.DATA_PREVISAO);
        return dataPrevisao >= hoje && dataPrevisao < amanha && row.STATUS_ENTREGA !== 'FINALIZADO';
    });

    // Salvar em Excel
    const pedidosVencendoFile = path.join(RELATORIOS_DIR, 'pedidos_vencendo_hoje.xlsx');
    const worksheet = xlsx.utils.json_to_sheet(filtrado);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Pedidos Vencendo Hoje');
    xlsx.writeFile(workbook, pedidosVencendoFile);
    console.log(`Pedidos vencendo hoje salvos em ${pedidosVencendoFile} (${filtrado.length})`);

    return filtrado;
}

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, TABELAS_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use('/downloads', express.static(RELATORIOS_DIR));

// Endpoint para upload de arquivos
app.post('/api/upload', upload.array('files', 3), (req, res) => {
    res.json({ success: true, message: 'Arquivos recebidos com sucesso' });
});

// Endpoint para processar os arquivos
app.post('/api/process', async (req, res) => {
    try {
        console.log('Iniciando processamento dos arquivos...');
        
        // Executar o processamento real
        const data = await unifyTables();
        generateBlacklist(data);
        generateEntregadoresPontuacao(data);
        filterPedidosVencendoHoje(data);
        
        console.log('Processamento concluído!');
        res.json({ success: true, message: 'Processamento concluído' });
    } catch (error) {
        console.error('Erro no processamento:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para obter dados unificados
app.get('/api/data', (req, res) => {
    try {
        const unifiedFile = path.join(RELATORIOS_DIR, 'tabela_unificada.csv');
        
        if (!fs.existsSync(unifiedFile)) {
            return res.status(404).json({ error: 'Nenhum dado processado encontrado' });
        }
        
        // Ler o arquivo CSV gerado pelo processamento
        const results = [];
        fs.createReadStream(unifiedFile)
            .pipe(csv({ separator: ';' }))
            .on('data', (data) => results.push(data))
            .on('end', () => {
                res.json(results);
            })
            .on('error', (error) => {
                throw error;
            });
    } catch (error) {
        console.error('Erro ao ler dados:', error);
        res.status(500).json({ error: 'Erro ao ler dados' });
    }
});

// Endpoint para baixar relatórios
app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(RELATORIOS_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    res.download(filePath, filename, (err) => {
        if (err) {
            console.error('Erro ao baixar arquivo:', err);
            res.status(500).json({ error: 'Erro ao baixar arquivo' });
        }
    });
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro no servidor:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});