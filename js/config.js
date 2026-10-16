/* =========================================================================
   CONFIGURAÇÕES GERAIS, DICIONÁRIOS E MAPEAMENTO REDEC <-> MUNICÍPIOS
   ========================================================================= */

const CONFIG_URL_PLANILHA = "https://script.google.com/macros/s/AKfycbwC7sf80Z2HSS2PewAnM8T_AAOA9rn8KNGEA_pVoA0xcevecSisJrBPQi472V65Qo0l/exec";
const INTERVALO_AUTO_SYNC_MS = 5 * 60 * 1000;

const CONFIG_MODULOS = {
  "SISGEO": { ativo: true, rotulo: "SISGEO (Ocorrências)", tipo: "sisgeo", temPeriodo: true },
  "EVENTOS REDECS": { ativo: true, rotulo: "Eventos Operacionais", tipo: "eventos", temPeriodo: true },
  "DECRETAÇÃO": { ativo: true, rotulo: "Decretos de Emergência", tipo: "decretacao", temPeriodo: false },
  "PONTOS DE APOIO": { ativo: true, rotulo: "Pontos de Apoio", tipo: "pontos_apoio", temPeriodo: true },
  "AJUDA HUMANITÁRIA": { ativo: true, rotulo: "Ajuda Humanitária", tipo: "ajuda_humanitaria", temPeriodo: true }
};

const MAPA_REDECS_RJ = {
  "Angra dos Reis": "REDEC 4 - Costa Verde", "Aperibé": "REDEC 11 - Noroeste", "Araruama": "REDEC 9 - Baixada Litorânea",
  "Areal": "REDEC 7 - Serrana I", "Armação dos Búzios": "REDEC 9 - Baixada Litorânea", "Arraial do Cabo": "REDEC 9 - Baixada Litorânea",
  "Barra do Piraí": "REDEC 5 - Sul I", "Barra Mansa": "REDEC 5 - Sul I", "Belford Roxo": "REDEC 2 - Baixada Fluminense",
  "Bom Jardim": "REDEC 8 - Serrana II", "Bom Jesus do Itabapoana": "REDEC 11 - Noroeste", "Cabo Frio": "REDEC 9 - Baixada Litorânea",
  "Cachoeiras de Macacu": "REDEC 3 - Metropolitana", "Cambuci": "REDEC 11 - Noroeste", "Campos dos Goytacazes": "REDEC 10 - Norte",
  "Cantagalo": "REDEC 8 - Serrana II", "Carapebus": "REDEC 10 - Norte", "Cardoso Moreira": "REDEC 11 - Noroeste",
  "Carmo": "REDEC 7 - Serrana I", "Casimiro de Abreu": "REDEC 9 - Baixada Litorânea", "Comendador Levy Gasparian": "REDEC 5 - Sul I",
  "Conceição de Macabu": "REDEC 10 - Norte", "Cordeiro": "REDEC 8 - Serrana II", "Duas Barras": "REDEC 8 - Serrana II",
  "Duque de Caxias": "REDEC 2 - Baixada Fluminense", "Engenheiro Paulo de Frontin": "REDEC 6 - Sul II", "Guapimirim": "REDEC 2 - Baixada Fluminense",
  "Iguaba Grande": "REDEC 9 - Baixada Litorânea", "Itaboraí": "REDEC 3 - Metropolitana", "Itaguaí": "REDEC 6 - Sul II",
  "Italva": "REDEC 11 - Noroeste", "Itaocara": "REDEC 11 - Noroeste", "Itaperuna": "REDEC 11 - Noroeste",
  "Itatiaia": "REDEC 5 - Sul I", "Japeri": "REDEC 6 - Sul II", "Laje do Muriaé": "REDEC 11 - Noroeste",
  "Macaé": "REDEC 9 - Baixada Litorânea", "Macuco": "REDEC 8 - Serrana II", "Magé": "REDEC 2 - Baixada Fluminense",
  "Mangaratiba": "REDEC 4 - Costa Verde", "Maricá": "REDEC 3 - Metropolitana", "Mendes": "REDEC 6 - Sul II",
  "Mesquita": "REDEC 2 - Baixada Fluminense", "Miguel Pereira": "REDEC 6 - Sul II", "Miracema": "REDEC 11 - Noroeste",
  "Natividade": "REDEC 11 - Noroeste", "Nilópolis": "REDEC 2 - Baixada Fluminense", "Niterói": "REDEC 3 - Metropolitana",
  "Nova Friburgo": "REDEC 8 - Serrana II", "Nova Iguaçu": "REDEC 2 - Baixada Fluminense", "Paracambi": "REDEC 6 - Sul II",
  "Paraty": "REDEC 4 - Costa Verde", "Paraíba do Sul": "REDEC 5 - Sul I", "Paty do Alferes": "REDEC 5 - Sul I",
  "Petrópolis": "REDEC 7 - Serrana I", "Pinheiral": "REDEC 5 - Sul I", "Piraí": "REDEC 6 - Sul II",
  "Porciúncula": "REDEC 11 - Noroeste", "Porto Real": "REDEC 5 - Sul I", "Quatis": "REDEC 5 - Sul I",
  "Queimados": "REDEC 6 - Sul II", "Quissamã": "REDEC 10 - Norte", "Resende": "REDEC 5 - Sul I",
  "Rio Bonito": "REDEC 9 - Baixada Litorânea", "Rio Claro": "REDEC 6 - Sul II", "Rio das Flores": "REDEC 5 - Sul I",
  "Rio das Ostras": "REDEC 9 - Baixada Litorânea", "Rio de Janeiro": "REDEC 1 - Capital", "Santa Maria Madalena": "REDEC 8 - Serrana II",
  "Santo Antônio de Pádua": "REDEC 11 - Noroeste", "Sapucaia": "REDEC 7 - Serrana I", "Saquarema": "REDEC 9 - Baixada Litorânea",
  "Seropédica": "REDEC 6 - Sul II", "Silva Jardim": "REDEC 9 - Baixada Litorânea", "Sumidouro": "REDEC 7 - Serrana I",
  "São Fidélis": "REDEC 11 - Noroeste", "São Francisco de Itabapoana": "REDEC 10 - Norte", "São Gonçalo": "REDEC 3 - Metropolitana",
  "São José de Ubá": "REDEC 11 - Noroeste", "São José do Vale do Rio Preto": "REDEC 7 - Serrana I", "São João da Barra": "REDEC 10 - Norte",
  "São João de Meriti": "REDEC 2 - Baixada Fluminense", "São Pedro da Aldeia": "REDEC 9 - Baixada Litorânea", "São Sebastião do Alto": "REDEC 8 - Serrana II",
  "Tanguá": "REDEC 3 - Metropolitana", "Teresópolis": "REDEC 7 - Serrana I", "Trajano de Moraes": "REDEC 8 - Serrana II",
  "Três Rios": "REDEC 5 - Sul I", "Valença": "REDEC 5 - Sul I", "Varre-Sai": "REDEC 11 - Noroeste",
  "Vassouras": "REDEC 5 - Sul I", "Volta Redonda": "REDEC 5 - Sul I"
};

function normalizarTexto(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function getNomeCanonicoMunicipio(nomeMun) {
  if (MAPA_REDECS_RJ[nomeMun]) return nomeMun;
  const nKey = normalizarTexto(nomeMun);
  for (const k of Object.keys(MAPA_REDECS_RJ)) {
    if (normalizarTexto(k) === nKey) return k;
  }
  return String(nomeMun || "").trim();
}

function getRedecDoMunicipio(nomeMun) {
  const canonico = getNomeCanonicoMunicipio(nomeMun);
  return MAPA_REDECS_RJ[canonico] || "Outra REDEC";
}
