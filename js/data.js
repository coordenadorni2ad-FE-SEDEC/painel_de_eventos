/**
 * js/data.js
 * Funções de normalização de texto, datas, coordenadas e extração rigorosa
 * da Coluna F (Tipo de Evento) e Coluna G (Subtipo) para o módulo SISGEO.
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
     * Padroniza uma linha mapeando explicitamente a Coluna F (tipo) e Coluna G (subtipo)
     * Ignora textos longos na coluna de tipo para evitar poluição no filtro.
     */
    function padronizarRegistro(linhaBruta, idx) {
        // Se a linha for um array puro (ex: [valA, valB, valC, valD, valE, valF, valG])
        let objTrabalho = linhaBruta;
        if (Array.isArray(linhaBruta)) {
            objTrabalho = {
                colA: linhaBruta[0],
                colB: linhaBruta[1],
                colC: linhaBruta[2],
                colD: linhaBruta[3],
                colE: linhaBruta[4],
                colF: linhaBruta[5], // Coluna F: Tipo de Evento
                colG: linhaBruta[6], // Coluna G: Subtipo
                colH: linhaBruta[7]
            };
        }

        const munBruto = extrairCampo(objTrabalho, [
            'MUNICIPIO', 'MUNICÍPIO', 'CIDADE', 'LOCALIDADE', 'NM_MUN', 'NOME DO MUNICIPIO', 'COL_C', 'COL_D'
        ]);
        const redecBruta = extrairCampo(objTrabalho, [
            'REDEC', 'REGIONAL', 'REGIAO', 'REGIÃO', 'COORDENADORIA'
        ]);
        const dataBruta = extrairCampo(objTrabalho, [
            'DATA', 'DATA DO EVENTO', 'DATA DA OCORRENCIA', 'DATA_OCORRENCIA', 'CARIMBO DE DATA/HORA', 'TIMESTAMP', 'CRIADO EM', 'DT_EVENTO'
        ]);

        // Captura rigorosa da Coluna F (Tipo) e Coluna G (Subtipo)
        let tipoF = extrairCampo(objTrabalho, ['TIPO', 'EVENTO', 'NATUREZA', 'OCORRENCIA', 'OCORRÊNCIA', 'COBRADE', 'COL_F']);
        let subtipoG = extrairCampo(objTrabalho, ['SUBTIPO', 'SUB_TIPO', 'DETALHE', 'CLASSIFICACAO', 'COL_G']);
        let descricaoLivre = extrairCampo(objTrabalho, ['DESCRICAO', 'DESCRIÇÃO', 'HISTORICO', 'OBS', 'OBSERVACAO']);

        const latBruta = extrairCampo(objTrabalho, ['LATITUDE', 'LAT', 'Y', 'COORD_LAT']);
        const lngBruta = extrairCampo(objTrabalho, ['LONGITUDE', 'LONG', 'LNG', 'LON', 'X', 'COORD_LNG']);

        const geo = resolverMunicipioERedec(munBruto, redecBruta);
        const infoData = normalizarData(dataBruta);

        const lat = parseFloat(String(latBruta).replace(',', '.'));
        const lng = parseFloat(String(lngBruta).replace(',', '.'));

        // Validação de segurança: Se o tipo F vier vazio ou for uma frase muito longa (descrição disfarçada),
        // busca nas outras colunas ou define como "Ocorrência".
        let tipoLimpo = 'Ocorrência';
        if (tipoF && String(tipoF).trim().length > 0 && String(tipoF).length < 50 && !String(tipoF).includes('http')) {
            tipoLimpo = String(tipoF).trim();
        } else if (descricaoLivre && String(descricaoLivre).length < 50) {
            tipoLimpo = String(descricaoLivre).trim();
        }

        let subtipoLimpo = '';
        if (subtipoG && String(subtipoG).trim().length > 0 && String(subtipoG).length < 50) {
            subtipoLimpo = String(subtipoG).trim();
        }

        let eventoFormatado = tipoLimpo;
        if (subtipoLimpo) {
            eventoFormatado += ` - ${subtipoLimpo}`;
        }

        return {
            _id: idx + 1,
            _raw: objTrabalho,
            municipio: geo.municipio,
            redec: geo.redec,
            data: infoData.dataBR,
            dataISO: infoData.dataISO,
            timestamp: infoData.timestamp,
            evento: eventoFormatado,
            tipoPuro: tipoLimpo,
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
