/**
 * js/data.js
 * Funções de normalização de texto, datas, coordenadas e extração rigorosa
 * das colunas de Tipo e Subtipo da planilha.
 */

const DataProcessor = (() => {

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

    function normalizarData(valor) {
        if (!valor) return { dataBR: '', dataISO: '', timestamp: null };

        const str = String(valor).trim();

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
     * Padroniza a linha buscando com precisão os campos de Tipo, Subtipo e demais colunas
     */
    function padronizarRegistro(linhaBruta, idx) {
        let munBruto = '';
        let redecBruta = '';
        let dataBruta = '';
        let tipoF = '';
        let subtipoG = '';
        let latBruta = '';
        let lngBruta = '';

        if (Array.isArray(linhaBruta)) {
            dataBruta = linhaBruta[0];
            redecBruta = linhaBruta[1];
            munBruto = linhaBruta[2];
            tipoF = linhaBruta[5] || '';
            subtipoG = linhaBruta[6] || '';
            latBruta = linhaBruta[10];
            lngBruta = linhaBruta[11];
        } else if (linhaBruta && typeof linhaBruta === 'object') {
            munBruto = extrairCampo(linhaBruta, ['MUNICIPIO', 'MUNICÍPIO', 'CIDADE', 'LOCALIDADE', 'NM_MUN', 'NOME DO MUNICIPIO']);
            redecBruta = extrairCampo(linhaBruta, ['REDEC', 'REGIONAL', 'REGIAO', 'REGIÃO', 'COORDENADORIA']);
            dataBruta = extrairCampo(linhaBruta, ['DATA', 'DATA DO EVENTO', 'DATA DA OCORRENCIA', 'DATA_OCORRENCIA', 'CARIMBO DE DATA/HORA', 'TIMESTAMP', 'DT_EVENTO']);
            
            // Busca exata por variações comuns de cabeçalho para Tipo e Subtipo
            tipoF = extrairCampo(linhaBruta, ['TIPO', 'TIPO DE EVENTO', 'EVENTO', 'COL_F', 'F', 'TIPO_EVENTO']);
            subtipoG = extrairCampo(linhaBruta, ['SUBTIPO', 'SUB TIPO', 'SUB_TIPO', 'DETALHE', 'COL_G', 'G', 'SUBTIPO_EVENTO']);

            latBruta = extrairCampo(linhaBruta, ['LATITUDE', 'LAT', 'Y']);
            lngBruta = extrairCampo(linhaBruta, ['LONGITUDE', 'LONG', 'LNG', 'LON', 'X']);
        }

        const geo = resolverMunicipioERedec(munBruto, redecBruta);
        const infoData = normalizarData(dataBruta);

        const lat = parseFloat(String(latBruta).replace(',', '.'));
        const lng = parseFloat(String(lngBruta).replace(',', '.'));

        const tipoLimpo = tipoF ? String(tipoF).trim() : '';
        const subtipoLimpo = subtipoG ? String(subtipoG).trim() : '';

        let eventoFormatado = tipoLimpo;
        if (subtipoLimpo) {
            eventoFormatado += ` - ${subtipoLimpo}`;
        }
        if (!eventoFormatado) {
            eventoFormatado = 'Ocorrência Operacional';
        }

        return {
            _id: idx + 1,
            _raw: linhaBruta,
            municipio: geo.municipio,
            redec: geo.redec,
            data: infoData.dataBR,
            dataISO: infoData.dataISO,
            timestamp: infoData.timestamp,
            evento: eventoFormatado,
            tipoPuro: tipoLimpo || 'Outros',
            subtipoPuro: subtipoLimpo,
            latitude: !isNaN(lat) ? lat : null,
            longitude: !isNaN(lng) ? lng : null
        };
    }

    function processarRespostaAPI(json) {
        const resultadoPorModulo = {};

        CONFIG.MODULOS_VISIVEIS.forEach(mod => {
            resultadoPorModulo[mod.id] = [];
        });

        if (!json) return resultadoPorModulo;

        if (Array.isArray(json)) {
            resultadoPorModulo[CONFIG.MODULOS_VISIVEIS[0].id] = json.map(padronizarRegistro);
            return resultadoPorModulo;
        }

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
