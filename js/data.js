/* =========================================================================
   PADRONIZAÇÃO, SINCRONIZAÇÃO E CACHE LOCAL
   ========================================================================= */

function normalizarDataParaISO(dataBruta) {
  if (!dataBruta) return '';
  let str = String(dataBruta).replace(/[`´']/g, '').trim();
  const mIso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (mIso) return `${mIso[1]}-${mIso[2].padStart(2, '0')}-${mIso[3].padStart(2, '0')}`;
  const mBr = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (mBr) {
    let y = mBr[3].length === 2 ? "20" + mBr[3] : mBr[3];
    return `${y}-${mBr[2].padStart(2, '0')}-${mBr[1].padStart(2, '0')}`;
  }
  return '';
}

function formatarParaDDMMAAAA(dataISO) {
  if (!dataISO) return '-';
  const p = dataISO.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dataISO;
}

function parseNum(val) {
  if (val === undefined || val === null || val === "") return 0;
  const n = parseFloat(String(val).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function padronizarLinha(raw, tipo) {
  const keys = Object.keys(raw);
  const findKey = (term) => keys.find(k => k.includes(term));

  if (tipo === "sisgeo") {
    const kData = findKey("Data Ocorrência") || findKey("DATA") || keys[3];
    const kMun = findKey("Município") || findKey("MUNIC") || keys[15];
    const kTipo = findKey("Tipo") || keys[5];
    const kSubtipo = findKey("Subtipo") || keys[6];
    const kCoords = findKey("Latitude/Longitude") || findKey("COORD") || keys[17];
    const kEnd = findKey("Endereço") || keys[8];
    const kBairro = findKey("Bairro") || keys[19];
    const kViatura = findKey("Viatura") || keys[7];

    const dIso = normalizarDataParaISO(raw[kData]);
    const munBruto = raw[kMun] ? String(raw[kMun]).trim() : 'NÃO INFORMADO';
    const canonico = getNomeCanonicoMunicipio(munBruto);
    
    let lat = null, lon = null;
    const coordsStr = String(raw[kCoords] || '').trim();
    if (coordsStr.includes(',')) {
      const parts = coordsStr.split(',');
      const pLat = parseFloat(parts[0].trim());
      const pLon = parseFloat(parts[1].trim());
      if (!isNaN(pLat) && !isNaN(pLon) && pLat < 0 && pLon < 0) {
        lat = pLat; lon = pLon;
      }
    }

    return {
      d_iso: dIso,
      d_fmt: formatarParaDDMMAAAA(dIso),
      h: raw[kData] ? String(raw[kData]).substring(11, 16) : '',
      m: canonico,
      r: getRedecDoMunicipio(canonico),
      tipo: raw[kTipo] ? String(raw[kTipo]).trim() : 'Outros',
      subtipo: raw[kSubtipo] ? String(raw[kSubtipo]).trim() : '',
      endereco: raw[kEnd] ? String(raw[kEnd]).trim() : '',
      bairro: raw[kBairro] ? String(raw[kBairro]).trim() : '',
      viatura: raw[kViatura] ? String(raw[kViatura]).trim() : '',
      lat: lat, lon: lon,
      tem_coords: (lat !== null && lon !== null)
    };
  } else if (tipo === "eventos") {
    const dIso = normalizarDataParaISO(raw[findKey("DATA")]);
    const munBruto = raw[findKey("MUNIC")] ? String(raw[findKey("MUNIC")]).trim() : 'NÃO INFORMADO';
    const canonico = getNomeCanonicoMunicipio(munBruto);

    return {
      d_iso: dIso,
      d_fmt: formatarParaDDMMAAAA(dIso),
      h: raw[findKey("HORA")] ? String(raw[findKey("HORA")]).substring(0, 5) : '',
      m: canonico,
      r: getRedecDoMunicipio(canonico),
      desc: raw[findKey("DESCRI")] ? String(raw[findKey("DESCRI")]).trim() : '',
      o: parseNum(raw[findKey("SOMAT")]),
      ob: parseNum(raw[findKey("ÓBITOS")] || raw[findKey("OBITOS")]),
      db: parseNum(raw[findKey("DESABRIG")]),
      dl: parseNum(raw[findKey("DESALOJ")]),
      af: parseNum(raw[findKey("AFETADOS")]),
      dz: parseNum(raw[findKey("DESLIZ")]),
      in: parseNum(raw[findKey("INUNDA")]),
      ar: parseNum(raw[findKey("ÁRVORE")]),
      es: parseNum(raw[findKey("DESABAMENTO")]),
      pa: parseNum(raw[findKey("PONTOS DE APOIO")]),
      sr: parseNum(raw[findKey("SIRENE - MOBILIZA")]),
      dc: raw[findKey("DECRETO")] ? String(raw[findKey("DECRETO")]).trim() : '',
      lat: null, lon: null, tem_coords: false
    };
  }
  return raw;
}
