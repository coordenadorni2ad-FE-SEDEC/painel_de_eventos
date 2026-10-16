/**
 * js/config.js
 * Configurações globais, URL da API (Google Apps Script), módulos de abas
 * e Dicionário Canônico dos 92 Municípios do Estado do Rio de Janeiro -> 11 REDECs.
 */

const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbwC7sf80Z2HSS2PewAnM8T_AAOA9rn8KNGEA_pVoA0xcevecSisJrBPQi472V65Qo0l/exec',
    CACHE_KEY: 'SEDEC_RJ_PAINEL_CACHE_V2',
    CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutos
    ITENS_POR_PAGINA: 25,

    // Módulos visíveis como abas no Dashboard (demais abas da planilha ficam ocultas como backend)
    MODULOS_VISIVEIS: [
        { id: 'SISGEO',            rotulo: 'SISGEO',            aliases: ['SISGEO', 'OCORRENCIAS SISGEO', 'CHAMADOS'] },
        { id: 'EVENTOS REDECS',    rotulo: 'EVENTOS REDECS',    aliases: ['EVENTOS REDECS', 'EVENTOS_REDECS', 'EVENTOS', 'REDECS'] },
        { id: 'DECRETAÇÃO',        rotulo: 'DECRETAÇÃO',        aliases: ['DECRETAÇÃO', 'DECRETACAO', 'DECRETOS'] },
        { id: 'PONTOS DE APOIO',   rotulo: 'PONTOS DE APOIO',   aliases: ['PONTOS DE APOIO', 'PONTOS_DE_APOIO', 'ABRIGOS'] },
        { id: 'AJUDA HUMANITÁRIA', rotulo: 'AJUDA HUMANITÁRIA', aliases: ['AJUDA HUMANITÁRIA', 'AJUDA HUMANITARIA', 'AJUDA_HUMANITARIA'] }
    ]
};

/**
 * Dicionário Canônico: 92 Municípios do Estado do Rio de Janeiro mapeados para as 11 REDECs
 */
const MAPA_REDECS_RJ = {
    // 1. REDEC METROPOLITANA (8 municípios)
    "Rio de Janeiro": "REDEC METROPOLITANA",
    "Niterói": "REDEC METROPOLITANA",
    "São Gonçalo": "REDEC METROPOLITANA",
    "Itaboraí": "REDEC METROPOLITANA",
    "Maricá": "REDEC METROPOLITANA",
    "Tanguá": "REDEC METROPOLITANA",
    "Rio Bonito": "REDEC METROPOLITANA",
    "Cachoeiras de Macacu": "REDEC METROPOLITANA",

    // 2. REDEC BAIXADA FLUMINENSE (11 municípios)
    "Duque de Caxias": "REDEC BAIXADA FLUMINENSE",
    "Nova Iguaçu": "REDEC BAIXADA FLUMINENSE",
    "Belford Roxo": "REDEC BAIXADA FLUMINENSE",
    "São João de Meriti": "REDEC BAIXADA FLUMINENSE",
    "Mesquita": "REDEC BAIXADA FLUMINENSE",
    "Nilópolis": "REDEC BAIXADA FLUMINENSE",
    "Queimados": "REDEC BAIXADA FLUMINENSE",
    "Japeri": "REDEC BAIXADA FLUMINENSE",
    "Paracambi": "REDEC BAIXADA FLUMINENSE",
    "Seropédica": "REDEC BAIXADA FLUMINENSE",
    "Itaguaí": "REDEC BAIXADA FLUMINENSE",

    // 3. REDEC SUL I - COSTA VERDE (3 municípios)
    "Mangaratiba": "REDEC SUL I - COSTA VERDE",
    "Angra dos Reis": "REDEC SUL I - COSTA VERDE",
    "Paraty": "REDEC SUL I - COSTA VERDE",

    // 4. REDEC SUL II - MÉDIO PARAÍBA (12 municípios)
    "Resende": "REDEC SUL II - MÉDIO PARAÍBA",
    "Itatiaia": "REDEC SUL II - MÉDIO PARAÍBA",
    "Porto Real": "REDEC SUL II - MÉDIO PARAÍBA",
    "Quatis": "REDEC SUL II - MÉDIO PARAÍBA",
    "Barra Mansa": "REDEC SUL II - MÉDIO PARAÍBA",
    "Volta Redonda": "REDEC SUL II - MÉDIO PARAÍBA",
    "Pinheiral": "REDEC SUL II - MÉDIO PARAÍBA",
    "Piraí": "REDEC SUL II - MÉDIO PARAÍBA",
    "Rio Claro": "REDEC SUL II - MÉDIO PARAÍBA",
    "Barra do Piraí": "REDEC SUL II - MÉDIO PARAÍBA",
    "Valença": "REDEC SUL II - MÉDIO PARAÍBA",
    "Rio das Flores": "REDEC SUL II - MÉDIO PARAÍBA",

    // 5. REDEC CENTRO-SUL (11 municípios)
    "Vassouras": "REDEC CENTRO-SUL",
    "Mendes": "REDEC CENTRO-SUL",
    "Engenheiro Paulo de Frontin": "REDEC CENTRO-SUL",
    "Miguel Pereira": "REDEC CENTRO-SUL",
    "Paty do Alferes": "REDEC CENTRO-SUL",
    "Paraíba do Sul": "REDEC CENTRO-SUL",
    "Três Rios": "REDEC CENTRO-SUL",
    "Comendador Levy Gasparian": "REDEC CENTRO-SUL",
    "Areal": "REDEC CENTRO-SUL",
    "Sapucaia": "REDEC CENTRO-SUL",
    "São José do Vale do Rio Preto": "REDEC CENTRO-SUL",

    // 6. REDEC SERRANA I (5 municípios)
    "Petrópolis": "REDEC SERRANA I",
    "Teresópolis": "REDEC SERRANA I",
    "Guapimirim": "REDEC SERRANA I",
    "Magé": "REDEC SERRANA I",
    "Sumidouro": "REDEC SERRANA I",

    // 7. REDEC SERRANA II (11 municípios)
    "Nova Friburgo": "REDEC SERRANA II",
    "Bom Jardim": "REDEC SERRANA II",
    "Duas Barras": "REDEC SERRANA II",
    "Carmo": "REDEC SERRANA II",
    "Cantagalo": "REDEC SERRANA II",
    "Cordeiro": "REDEC SERRANA II",
    "Macuco": "REDEC SERRANA II",
    "São Sebastião do Alto": "REDEC SERRANA II",
    "Santa Maria Madalena": "REDEC SERRANA II",
    "Trajano de Moraes": "REDEC SERRANA II",
    "Silva Jardim": "REDEC SERRANA II",

    // 8. REDEC BAIXADA LITORÂNEA (9 municípios)
    "Araruama": "REDEC BAIXADA LITORÂNEA",
    "Armação dos Búzios": "REDEC BAIXADA LITORÂNEA",
    "Arraial do Cabo": "REDEC BAIXADA LITORÂNEA",
    "Cabo Frio": "REDEC BAIXADA LITORÂNEA",
    "Casimiro de Abreu": "REDEC BAIXADA LITORÂNEA",
    "Iguaba Grande": "REDEC BAIXADA LITORÂNEA",
    "Rio das Ostras": "REDEC BAIXADA LITORÂNEA",
    "São Pedro da Aldeia": "REDEC BAIXADA LITORÂNEA",
    "Saquarema": "REDEC BAIXADA LITORÂNEA",

    // 9. REDEC NORTE (9 municípios)
    "Campos dos Goytacazes": "REDEC NORTE",
    "Macaé": "REDEC NORTE",
    "São João da Barra": "REDEC NORTE",
    "São Francisco de Itabapoana": "REDEC NORTE",
    "Quissamã": "REDEC NORTE",
    "Carapebus": "REDEC NORTE",
    "Conceição de Macabu": "REDEC NORTE",
    "Cardoso Moreira": "REDEC NORTE",
    "São Fidélis": "REDEC NORTE",

    // 10. REDEC NOROESTE (13 municípios)
    "Itaperuna": "REDEC NOROESTE",
    "Bom Jesus do Itabapoana": "REDEC NOROESTE",
    "Italva": "REDEC NOROESTE",
    "Laje do Muriaé": "REDEC NOROESTE",
    "Miracema": "REDEC NOROESTE",
    "Natividade": "REDEC NOROESTE",
    "Porciúncula": "REDEC NOROESTE",
    "Santo Antônio de Pádua": "REDEC NOROESTE",
    "Aperibé": "REDEC NOROESTE",
    "Cambuci": "REDEC NOROESTE",
    "Itaocara": "REDEC NOROESTE",
    "São José de Ubá": "REDEC NOROESTE",
    "Varre-Sai": "REDEC NOROESTE"
};

// Lista ordenada das REDECs únicas
const LISTA_REDECS_RJ = Array.from(new Set(Object.values(MAPA_REDECS_RJ))).sort();

window.CONFIG = CONFIG;
window.MAPA_REDECS_RJ = MAPA_REDECS_RJ;
window.LISTA_REDECS_RJ = LISTA_REDECS_RJ;
