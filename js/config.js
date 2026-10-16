/**
 * js/config.js
 * Configurações globais, URL da API (Google Apps Script), módulos de abas
 * e Dicionário Canônico atualizado conforme documento oficial das REDECs.
 */

const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbwC7sf80Z2HSS2PewAnM8T_AAOA9rn8KNGEA_pVoA0xcevecSisJrBPQi472V65Qo0l/exec',
    CACHE_KEY: 'SEDEC_RJ_PAINEL_CACHE_V2',
    CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutos
    ITENS_POR_PAGINA: 25,

    MODULOS_VISIVEIS: [
        { id: 'SISGEO',            rotulo: 'SISGEO',            aliases: ['SISGEO', 'OCORRENCIAS SISGEO', 'CHAMADOS'] },
        { id: 'EVENTOS REDECS',    rotulo: 'EVENTOS REDECS',    aliases: ['EVENTOS REDECS', 'EVENTOS_REDECS', 'EVENTOS', 'REDECS'] },
        { id: 'DECRETAÇÃO',        rotulo: 'DECRETAÇÃO',        aliases: ['DECRETAÇÃO', 'DECRETACAO', 'DECRETOS'] },
        { id: 'PONTOS DE APOIO',   rotulo: 'PONTOS DE APOIO',   aliases: ['PONTOS DE APOIO', 'PONTOS_DE_APOIO', 'ABRIGOS'] },
        { id: 'AJUDA HUMANITÁRIA', rotulo: 'AJUDA HUMANITÁRIA', aliases: ['AJUDA HUMANITÁRIA', 'AJUDA HUMANITARIA', 'AJUDA_HUMANITARIA'] }
    ]
};

/**
 * Dicionário Canônico Oficial dos 92 Municípios mapeados para as REDECs corretas (Documento SEDEC)
 */
const MAPA_REDECS_RJ = {
    // REDEC 1 - CAPITAL[cite: 3]
    "Rio de Janeiro": "REDEC 1 - CAPITAL",

    // REDEC 2 - BAIXADA FLUMINENSE
    "Belford Roxo": "REDEC 2 - BAIXADA FLUMINENSE",
    "Duque de Caxias": "REDEC 2 - BAIXADA FLUMINENSE",
    "Guapimirim": "REDEC 2 - BAIXADA FLUMINENSE",
    "Magé": "REDEC 2 - BAIXADA FLUMINENSE",
    "Mesquita": "REDEC 2 - BAIXADA FLUMINENSE",
    "Nilópolis": "REDEC 2 - BAIXADA FLUMINENSE",
    "Nova Iguaçu": "REDEC 2 - BAIXADA FLUMINENSE",
    "São João de Meriti": "REDEC 2 - BAIXADA FLUMINENSE",

    // REDEC 3 - METROPOLITANA[cite: 2, 3, 4]
    "Cachoeiras de Macacu": "REDEC 3 - METROPOLITANA",
    "Itaboraí": "REDEC 3 - METROPOLITANA",
    "Maricá": "REDEC 3 - METROPOLITANA",
    "Niterói": "REDEC 3 - METROPOLITANA",
    "São Gonçalo": "REDEC 3 - METROPOLITANA",
    "Tanguá": "REDEC 3 - METROPOLITANA",

    // REDEC 4 - COSTA VERDE[cite: 2, 3]
    "Angra dos Reis": "REDEC 4 - COSTA VERDE",
    "Mangaratiba": "REDEC 4 - COSTA VERDE",
    "Paraty": "REDEC 4 - COSTA VERDE",

    // REDEC 5 - SUL I[cite: 2, 3, 4]
    "Barra do Piraí": "REDEC 5 - SUL I",
    "Barra Mansa": "REDEC 5 - SUL I",
    "Comendador Levy Gasparian": "REDEC 5 - SUL I",
    "Itatiaia": "REDEC 5 - SUL I",
    "Paraíba do Sul": "REDEC 5 - SUL I",
    "Paty do Alferes": "REDEC 5 - SUL I",
    "Pinheiral": "REDEC 5 - SUL I",
    "Porto Real": "REDEC 5 - SUL I",
    "Quatis": "REDEC 5 - SUL I",
    "Resende": "REDEC 5 - SUL I",
    "Rio das Flores": "REDEC 5 - SUL I",
    "Três Rios": "REDEC 5 - SUL I",
    "Valença": "REDEC 5 - SUL I",
    "Vassouras": "REDEC 5 - SUL I",
    "Volta Redonda": "REDEC 5 - SUL I",

    // REDEC 6 - SUL II[cite: 2, 3, 4]
    "Engenheiro Paulo de Frontin": "REDEC 6 - SUL II",
    "Itaguaí": "REDEC 6 - SUL II",
    "Japeri": "REDEC 6 - SUL II",
    "Mendes": "REDEC 6 - SUL II",
    "Miguel Pereira": "REDEC 6 - SUL II",
    "Paracambi": "REDEC 6 - SUL II",
    "Piraí": "REDEC 6 - SUL II",
    "Queimados": "REDEC 6 - SUL II",
    "Rio Claro": "REDEC 6 - SUL II",
    "Seropédica": "REDEC 6 - SUL II",

    // REDEC 7 - SERRANA I[cite: 2, 3, 4]
    "Areal": "REDEC 7 - SERRANA I",
    "Carmo": "REDEC 7 - SERRANA I",
    "Petrópolis": "REDEC 7 - SERRANA I",
    "Sapucaia": "REDEC 7 - SERRANA I",
    "São José do Vale do Rio Preto": "REDEC 7 - SERRANA I",
    "Sumidouro": "REDEC 7 - SERRANA I",
    "Teresópolis": "REDEC 7 - SERRANA I",

    // REDEC 8 - SERRANA II[cite: 2, 3, 4]
    "Bom Jardim": "REDEC 8 - SERRANA II",
    "Cantagalo": "REDEC 8 - SERRANA II",
    "Cordeiro": "REDEC 8 - SERRANA II",
    "Duas Barras": "REDEC 8 - SERRANA II",
    "Macuco": "REDEC 8 - SERRANA II",
    "Nova Friburgo": "REDEC 8 - SERRANA II",
    "Santa Maria Madalena": "REDEC 8 - SERRANA II",
    "São Sebastião do Alto": "REDEC 8 - SERRANA II",
    "Trajano de Moraes": "REDEC 8 - SERRANA II",

    // REDEC 9 - BAIXADA LITORÂNEA[cite: 2, 3, 4]
    "Araruama": "REDEC 9 - BAIXADA LITORÂNEA",
    "Armação dos Búzios": "REDEC 9 - BAIXADA LITORÂNEA",
    "Arraial do Cabo": "REDEC 9 - BAIXADA LITORÂNEA",
    "Cabo Frio": "REDEC 9 - BAIXADA LITORÂNEA",
    "Casimiro de Abreu": "REDEC 9 - BAIXADA LITORÂNEA",
    "Iguaba Grande": "REDEC 9 - BAIXADA LITORÂNEA",
    "Macaé": "REDEC 9 - BAIXADA LITORÂNEA",
    "Rio Bonito": "REDEC 9 - BAIXADA LITORÂNEA",
    "Rio das Ostras": "REDEC 9 - BAIXADA LITORÂNEA",
    "São Pedro da Aldeia": "REDEC 9 - BAIXADA LITORÂNEA",
    "Saquarema": "REDEC 9 - BAIXADA LITORÂNEA",
    "Silva Jardim": "REDEC 9 - BAIXADA LITORÂNEA",

    // REDEC 10 - NORTE[cite: 2, 3, 4]
    "Campos dos Goytacazes": "REDEC 10 - NORTE",
    "Carapebus": "REDEC 10 - NORTE",
    "Conceição de Macabu": "REDEC 10 - NORTE",
    "Quissamã": "REDEC 10 - NORTE",
    "São Francisco de Itabapoana": "REDEC 10 - NORTE",
    "São João da Barra": "REDEC 10 - NORTE",

    // REDEC 11 - NOROESTE[cite: 2, 3, 4]
    "Aperibé": "REDEC 11 - NOROESTE",
    "Bom Jesus do Itabapoana": "REDEC 11 - NOROESTE",
    "Cambuci": "REDEC 11 - NOROESTE",
    "Cardoso Moreira": "REDEC 11 - NOROESTE",
    "Italva": "REDEC 11 - NOROESTE",
    "Itaocara": "REDEC 11 - NOROESTE",
    "Itaperuna": "REDEC 11 - NOROESTE",
    "Laje do Muriaé": "REDEC 11 - NOROESTE",
    "Miracema": "REDEC 11 - NOROESTE",
    "Natividade": "REDEC 11 - NOROESTE",
    "Porciúncula": "REDEC 11 - NOROESTE",
    "Santo Antônio de Pádua": "REDEC 11 - NOROESTE",
    "São Fidélis": "REDEC 11 - NOROESTE",
    "São José de Ubá": "REDEC 11 - NOROESTE",
    "Varre-Sai": "REDEC 11 - NOROESTE"
};

const LISTA_REDECS_RJ = Array.from(new Set(Object.values(MAPA_REDECS_RJ))).sort();

window.CONFIG = CONFIG;
window.MAPA_REDECS_RJ = MAPA_REDECS_RJ;
window.LISTA_REDECS_RJ = LISTA_REDECS_RJ;
