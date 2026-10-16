/* =========================================================================
   CONTROLE DO MAPA LEAFLET, ESRI CANVAS, COROPLÉTICO E FOCO EM REDEC
   ========================================================================= */

// Limites geográficos reais do Estado do Rio de Janeiro (enquadra 100% sem cortes)
const RJ_BOUNDS = [
  [-23.38, -44.90], // Sudoeste (Paraty)
  [-20.76, -40.95]  // Nordeste (São Francisco de Itabapoana / Porciúncula)
];

let mapInstance = null;
let markersLayerGroup = null;
let currentScopeBounds = null;
let popupCloseTimer = null;
let redecAtiva = "ALL";
let municipioAtivo = "TODOS";
let MUNICIPIOS_ESCOPO = [];
let geojsonDataCache = null;

function atualizarMunicipiosEscopo() {
  if (redecAtiva === "ALL" || redecAtiva === "TODAS") {
    MUNICIPIOS_ESCOPO = Object.keys(MAPA_REDECS_RJ).sort((a, b) => a.localeCompare(b, "pt-BR"));
    const el = document.getElementById("mapTitle");
    if (el) el.textContent = "Estado do Rio de Janeiro (92 municípios)";
  } else {
    MUNICIPIOS_ESCOPO = Object.keys(MAPA_REDECS_RJ)
      .filter(m => normalizarTexto(MAPA_REDECS_RJ[m]) === normalizarTexto(redecAtiva))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    const el = document.getElementById("mapTitle");
    if (el) el.textContent = `Estado do Rio de Janeiro — ${redecAtiva}`;
  }
}

function obterCorPorQuantidade(qtd) {
  if (qtd > 50) return '#b91c1c'; // Vermelho intenso
  if (qtd > 20) return '#ea580c'; // Laranja forte
  if (qtd > 5)  return '#fb923c'; // Laranja médio
  if (qtd > 0)  return '#fed7aa'; // Pêssego suave
  return '#D4DAE3';               // Cinzento claro (sem ocorrências)
}

function obterEstiloFeature(feature, escopoSet, contagemMun) {
  const canonico = getNomeCanonicoMunicipio(feature.properties.NM_MUN);
  const isNoEscopo = escopoSet.has(normalizarTexto(canonico));
  const isMunSelecionado = (municipioAtivo !== "TODOS" && normalizarTexto(canonico) === normalizarTexto(municipioAtivo));
  const qtd = contagemMun[normalizarTexto(canonico)] || 0;
  const isRedecEspecifica = (redecAtiva !== "ALL" && redecAtiva !== "TODAS");

  // Se um município específico está selecionado:
  if (municipioAtivo !== "TODOS") {
    if (isMunSelecionado) {
      return {
        fillColor: qtd > 0 ? obterCorPorQuantidade(qtd) : "#2454A6",
        fillOpacity: 0.9,
        color: "#ffffff",
        weight: 2.5,
        opacity: 1
      };
    }
    return {
      fillColor: "transparent",
      fillOpacity: 0,
      color: "#64748B",
      weight: 0.8,
      dashArray: "2, 2",
      opacity: 0.4
    };
  }

  // Se uma REDEC específica está selecionada:
  if (isRedecEspecifica) {
    if (isNoEscopo) {
      // MUNICÍPIOS DA REDEC: TOTALMENTE PREENCHIDOS E DESTACADOS
      return {
        fillColor: qtd > 0 ? obterCorPorQuantidade(qtd) : "#2454A6",
        fillOpacity: 0.85,
        color: "#ffffff",
        weight: 2,
        opacity: 1
      };
    } else {
      // FORA DA REDEC: APENAS CONTORNO PONTILHADO (SEM PREENCHIMENTO)
      return {
        fillColor: "transparent",
        fillOpacity: 0,
        color: "#64748B",
        weight: 0.8,
        dashArray: "2, 2",
        opacity: 0.45
      };
    }
  }

  // TODAS AS REDECS: MAPA COROPLÉTICO COMPLETO
  return {
    fillColor: obterCorPorQuantidade(qtd),
    fillOpacity: qtd > 0 ? 0.85 : 0.5,
    color: "#ffffff",
    weight: 1.2,
    opacity: 1
  };
}

// CARREGAMENTO ROBUSTO DO GEOJSON (Procura variável global ou faz fetch em múltiplos caminhos)
async function carregarGeoJsonGarantido() {
  if (geojsonDataCache && geojsonDataCache.features) return geojsonDataCache;

  // 1. Tenta pegar a variável declarada em mapa.js
  try {
    if (typeof GEOJSON !== "undefined" && GEOJSON.features) {
      geojsonDataCache = GEOJSON;
      return geojsonDataCache;
    }
    if (window.GEOJSON && window.GEOJSON.features) {
      geojsonDataCache = window.GEOJSON;
      return geojsonDataCache;
    }
    if (window.geojsonRio && window.geojsonRio.features) {
      geojsonDataCache = window.geojsonRio;
      return geojsonDataCache;
    }
  } catch (e) {}

  // 2. Se não estiver no escopo global, busca via fetch testando caminhos relativos
  const caminhos = ["mapa.js", "./mapa.js", "../mapa.js"];
  for (const path of caminhos) {
    try {
      const resp = await fetch(path);
      if (resp.ok) {
        const text = await resp.text();
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start !== -1 && end !== -1) {
          geojsonDataCache = JSON.parse(text.substring(start, end + 1));
          return geojsonDataCache;
        }
      }
    } catch (err) {}
  }

  return null;
}

function initMap() {
  if (!mapInstance) {
    // Inicialização com limites exatos do Estado do Rio de Janeiro
    mapInstance = L.map("map", { zoomControl: true, scrollWheelZoom: false });
    mapInstance.fitBounds(RJ_BOUNDS, { padding: [10, 10] });

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri &mdash; SEDEC RJ",
      maxZoom: 14
    }).addTo(mapInstance);

    markersLayerGroup = L.layerGroup().addTo(mapInstance);

    mapInstance.on("popupclose", function() {
      popupCloseTimer = setTimeout(function() {
        let hasOpen = false;
        mapInstance.eachLayer(l => { if (l instanceof L.Popup) hasOpen = true; });
        if (!hasOpen && currentScopeBounds && currentScopeBounds.isValid()) {
          mapInstance.fitBounds(currentScopeBounds, { padding: [14, 14], animate: true, duration: 0.6 });
        }
      }, 80);
    });

    mapInstance.on("popupopen", function() {
      if (popupCloseTimer) {
        clearTimeout(popupCloseTimer);
        popupCloseTimer = null;
      }
    });
  }

  atualizarCamadasMapa();
}

async function atualizarCamadasMapa() {
  if (!mapInstance) return;

  atualizarMunicipiosEscopo();
  const ESCOPO_SET = new Set(MUNICIPIOS_ESCOPO.map(m => normalizarTexto(m)));

  // Contagem de ocorrências por município
  const contagemMun = {};
  filtrados.forEach(item => {
    const cNome = getNomeCanonicoMunicipio(item.m);
    const norm = normalizarTexto(cNome);
    if (norm) contagemMun[norm] = (contagemMun[norm] || 0) + (item.o || 1);
  });

  // Limpa camadas anteriores (SEM PISCAR)
  if (window._geojsonLayer) {
    mapInstance.removeLayer(window._geojsonLayer);
  }
  markersLayerGroup.clearLayers();

  const dadosGeoJson = await carregarGeoJsonGarantido();

  if (dadosGeoJson && dadosGeoJson.features && dadosGeoJson.features.length) {
    function onEachFeature(feature, layer) {
      const canonico = getNomeCanonicoMunicipio(feature.properties.NM_MUN);
      const redecNome = getRedecDoMunicipio(canonico);
      const qtd = contagemMun[normalizarTexto(canonico)] || 0;

      layer.bindTooltip(`<b>${canonico}</b><br><span style="font-size:10px;opacity:.85;">${redecNome}</span><br><b>${qtd}</b> ocorrência(s)`, {
        sticky: true,
        direction: "top",
        offset: [0, -10],
        className: "mun-tooltip",
        opacity: 1
      });

      layer.on({
        mouseover(e) {
          e.target.setStyle({ fillOpacity: 0.95, weight: 2.5, color: "#16243F" });
        },
        mouseout(e) {
          window._geojsonLayer.resetStyle(e.target);
          e.target.closeTooltip();
        },
        click(e) {
          e.target.closeTooltip();
          const popupContent = `
            <div class="popup-nome">${canonico}</div>
            <div class="popup-redec">${redecNome}</div>
            <div style="font-size:12px;color:#16243F;margin-top:4px;">
              <strong>${qtd}</strong> ocorrência(s) registrada(s).
            </div>
          `;
          e.target.bindPopup(popupContent).openPopup();
          mapInstance.fitBounds(e.target.getBounds(), { padding: [35, 35], animate: true, duration: 0.6 });
        }
      });
    }

    window._geojsonLayer = L.geoJSON(dadosGeoJson, {
      style: (feat) => obterEstiloFeature(feat, ESCOPO_SET, contagemMun),
      onEachFeature
    }).addTo(mapInstance);

    // AJUSTE DINÂMICO DE ZOOM (MUNICÍPIO / REDEC / ESTADO)
    if (municipioAtivo !== "TODOS") {
      const camadaMun = window._geojsonLayer.getLayers().find(l => 
        normalizarTexto(getNomeCanonicoMunicipio(l.feature.properties.NM_MUN)) === normalizarTexto(municipioAtivo)
      );
      if (camadaMun) {
        currentScopeBounds = camadaMun.getBounds();
        mapInstance.fitBounds(currentScopeBounds, { padding: [30, 30], animate: true, duration: 0.6 });
      }
    } else if (redecAtiva !== "ALL" && redecAtiva !== "TODAS") {
      const camadasEscopo = window._geojsonLayer.getLayers().filter(l => 
        ESCOPO_SET.has(normalizarTexto(getNomeCanonicoMunicipio(l.feature.properties.NM_MUN)))
      );
      if (camadasEscopo.length > 0) {
        currentScopeBounds = L.featureGroup(camadasEscopo).getBounds();
        mapInstance.fitBounds(currentScopeBounds, { padding: [20, 20], animate: true, duration: 0.6 });
      }
    } else {
      currentScopeBounds = L.latLngBounds(RJ_BOUNDS);
      mapInstance.fitBounds(currentScopeBounds, { padding: [10, 10], animate: true });
    }
  }

  // PLOTAGEM DOS PONTOS (SEM PISCAR)
  const pontosComCoords = filtrados.filter(i => i.tem_coords);
  pontosComCoords.slice(0, 300).forEach(pt => {
    const marker = L.circleMarker([pt.lat, pt.lon], {
      radius: 4.5,
      fillColor: '#ea580c',
      color: '#ffffff',
      weight: 1.5,
      opacity: 1,
      fillOpacity: 0.95
    });

    marker.bindPopup(`
      <div style="font-size:11.5px; line-height:1.4;">
        <strong style="color:#ea580c;">${pt.tipo || 'Ocorrência'}</strong><br>
        <strong>${pt.m}</strong> - ${pt.bairro || ''}<br>
        <span style="color:#64748b; font-size:11px;">${pt.endereco || ''}</span><br>
        <span style="color:#0284c7; font-size:10px;">Vtr: ${pt.viatura || '-'} | ${pt.d_fmt} ${pt.h}</span>
      </div>
    `);
    markersLayerGroup.addLayer(marker);
  });

  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize({ animate: false });
  }, 60);
}

// Redimensionamento inteligente
let resizeDebounce = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeDebounce);
  resizeDebounce = setTimeout(() => {
    if (mapInstance) {
      mapInstance.invalidateSize({ animate: false });
      if (currentScopeBounds && currentScopeBounds.isValid()) {
        mapInstance.fitBounds(currentScopeBounds, { padding: [14, 14], animate: false });
      }
    }
  }, 180);
});
