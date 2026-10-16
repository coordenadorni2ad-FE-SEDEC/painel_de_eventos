/**
 * js/data.js
 * Funções de normalização de texto, datas no padrão brasileiro (DD/MM/AAAA),
 * coordenadas, sanitização numérica e enriquecimento dos registros vindos da API.
 */

const DataProcessor = (() => {

    // Cria índice normalizado (sem acento/maiúsculo) -> Nome Canônico do Município e REDEC
    const INDICE_MUNICIPIOS = {};
    if (typeof MAPA_REDECS_RJ !== 'undefined') {
        for (const [nomeCanonico, redec] of Object.entries(MAPA_REDECS_RJ)) {
            const chave = normalizarChave(nomeCanonico);
            INDICE_MUNICIPIOS[chave] = {
                municipioCanonico: nomeCanonico,
                redec: redec
            };
        }
    }

    function normalizarChave(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .trim()
            .toUpperCase();
    }

    /**
     * Resolve o nome oficial do município e sua REDEC a partir de qualquer variação na planilha
     */
    function resolverMunicipioERedec(nomeBruto, redecBruta) {
        const chave = normalizarChave(nomeBruto);
        if (chave && INDICE_MUNICIPIOS[chave]) {
            return {
                municipio: INDICE_MUNICIPIOS[chave].municipioCanonico,
                redec: INDICE_MUNICIPIOS[chave].redec
            };
        }
        return {
            municipio: nomeBruto ? String(nomeBruto).trim() : 'Não Informado',
            redec: redecBruta ? String(redecBruta).trim() : 'NÃO IDENTIFICADA'
        };
    }

    /**
     * Converte qualquer formato de data (ISO, Date, DD/MM/YYYY, YYYY-MM-DD) para:
     * { dataBR: "DD/MM/AAAA", dataISO: "AAAA-MM-DD", timestamp: Number }
     */
    function normalizarData(valor) {
        if (!valor) return { dataBR: '', dataISO: '', timestamp: null };

        const str = String(valor).trim();

        // 1) Formato DD/MM/AAAA (com ou sem hora)
        const matchBR = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (matchBR) {
            const dia = matchBR[1].padStart(2, '0');
            const mes = matchBR[2].padStart(2, '0');
            const ano = matchBR[3];
            const iso = `${ano}-${mes}-${dia}`;
            const dt = new Date(`${iso}T12:00:00`);
            return {
                dataBR: `${dia}/${mes}/${ano}`,
                dataISO: iso,
                timestamp: isNaN(dt.getTime()) ? null : dt.getTime()
            };
        }

        // 2) Formato ISO AAAA-MM-DD (com ou sem T00:00:00)
        const matchISO = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
        if (matchISO) {
            const ano = matchISO[1];
            const mes = matchISO[2].padStart(2, '0');
            const dia = matchISO[3].padStart(2, '0');
            const iso = `${ano}-${mes}-${dia}`;
            const dt = new Date(`${iso}T12:00:00`);
            return {
                dataBR: `${dia}/${mes}/${ano}`,
                dataISO: iso,
                timestamp: isNaN(dt.getTime()) ? null : dt.getTime()
            };
        }

        // 3) Fallback para Date nativo
        const dt = new Date(str);
        if (!isNaN(dt.getTime())) {
            const dia = String(dt.getDate()).padStart(2, '0');
            const mes = String(dt.getMonth() + 1).padStart(2, '0');
            const ano = dt.getFullYear();
            const iso = `${ano}-${mes}-${dia}`;
            return {
                dataBR: `${dia}/${mes}/${ano}`,
                dataISO: iso,
                timestamp: new Date(`${iso}T12:00:00`).getTime()
            };
        }

        return { dataBR: str, dataISO: '', timestamp: null };
    }

    /**
     * Busca um campo dentro de um objeto testando múltiplos nomes possíveis de coluna
     */
    function extrairCampo(obj, candidatos) {
        if (!obj || typeof obj !== 'object') return '';
        const chavesObj = Object.keys(obj);

        for (const cand of candidatos) {
            const candNorm = normalizarChave(cand);
            for (const k of chavesObj) {
                if (normalizarChave(k) === candNorm && obj[k] !== null && obj[k] !== undefined && String(obj[k]).trim() !== '') {
                    return obj[k];
                }
            }
        }
        return '';
    }

    /**
     * Padroniza uma linha de qualquer aba da planilha para uso uniforme no painel
     */
    function padronizarRegistro(linhaBruta, idx) {
        const munBruto = extrairCampo(linhaBruta, [
            'MUNICIPIO', 'MUNICÍPIO', 'CIDADE', 'LOCALIDADE', 'NM_MUN', 'NOME DO MUNICIPIO'
        ]);
        const redecBruta = extrairCampo(linhaBruta, [
            'REDEC', 'REGIONAL', 'REGIAO', 'REGIÃO', 'COORDENADORIA'
        ]);
        const dataBruta = extrairCampo(linhaBruta, [
            'DATA', 'DATA DO EVENTO', 'DATA DA OCORRENCIA', 'DATA_OCORRENCIA', 'CARIMBO DE DATA/HORA', 'TIMESTAMP', 'CRIADO EM', 'DT_EVENTO'
        ]);
        const eventoBruto = extrairCampo(linhaBruta, [
            'EVENTO', 'TIPO', 'NATUREZA', 'OCORRENCIA', 'OCORRÊNCIA', 'COBRADE', 'DESastre', 'SITUACAO', 'SITUAÇÃO', 'ASSUNTO', 'DESCRICAO'
        ]);
        const latBruta = extrairCampo(linhaBruta, ['LATITUDE', 'LAT', 'Y', 'COORD_LAT']);
        const lngBruta = extrairCampo(linhaBruta, ['LONGITUDE', 'LONG', 'LNG', 'LON', 'X', 'COORD_LNG']);

        const geo = resolverMunicipioERedec(munBruto, redecBruta);
        const infoData = normalizarData(dataBruta);

        const lat = parseFloat(String(latBruta).replace(',', '.'));
        const lng = parseFloat(String(lngBruta).replace(',', '.'));

        return {
            _id: idx + 1,
            _raw: linhaBruta,
            municipio: geo.municipio,
            redec: geo.redec,
            data: infoData.dataBR,
            dataISO: infoData.dataISO,
            timestamp: infoData.timestamp,
            evento: eventoBruto ? String(eventoBruto).trim() : 'Registro Operacional',
            latitude: !isNaN(lat) ? lat : null,
            longitude: !isNaN(lng) ? lng : null
        };
    }

    /**
     * Normaliza o payload completo retornado pela API do Google Apps Script
     */
    function processarRespostaAPI(json) {
        const resultadoPorModulo = {};

        // Inicializa todos os módulos visíveis com lista vazia
        CONFIG.MODULOS_VISIVEIS.forEach(mod => {
            resultadoPorModulo[mod.id] = [];
        });

        if (!json) return resultadoPorModulo;

        // Caso a API retorne diretamente um Array (aba única)
        if (Array.isArray(json)) {
            resultadoPorModulo[CONFIG.MODULOS_VISIVEIS[0].id] = json.map(padronizarRegistro);
            return resultadoPorModulo;
        }

        // Caso a API retorne um Objeto { "SISGEO": [...], "EVENTOS REDECS": [...], ... } ou { data: { ... } }
        const fonteAbas = (json.data && typeof json.data === 'object' && !Array.isArray(json.data))
            ? json.data
            : json;

        const chavesRetornadas = Object.keys(fonteAbas);

        CONFIG.MODULOS_VISIVEIS.forEach(modulo => {
            const aliasesNorm = modulo.aliases.map(normalizarChave);

            const chaveEncontrada = chavesRetornadas.find(k => aliasesNorm.includes(normalizarChave(k)));
            if (chaveEncontrada && Array.isArray(fonteAbas[chaveEncontrada])) {
                resultadoPorModulo[modulo.id] = fonteAbas[chaveEncontrada]
                    .filter(item => item && typeof item === 'object')
                    .map((item, i) => padronizarRegistro(item, i));
            }
        });

        // Se nenhuma aba casou pelos aliases, mas há arrays no objeto, aloca o primeiro array na primeira aba
        const totalCarregado = Object.values(resultadoPorModulo).reduce((acc, arr) => acc + arr.length, 0);
        if (totalCarregado === 0) {
            for (const k of chavesRetornadas) {
                if (Array.isArray(fonteAbas[k]) && fonteAbas[k].length > 0) {
                    resultadoPorModulo[CONFIG.MODULOS_VISIVEIS[0].id] = fonteAbas[k].map((item, i) => padronizarRegistro(item, i));
                    break;
                }
            }
        }

        return resultadoPorModulo;
    }

    return {
        normalizarChave,
        normalizarData,
        resolverMunicipioERedec,
        processarRespostaAPI
    };
})();

window.DataProcessor = DataProcessor;
