/* =========================================================================
   CONTROLE DO MAPA LEAFLET, ESRI CANVAS, COROPLÉTICO E FOCO EM REDEC
   ========================================================================= */

// Limites reais do Estado do Rio de Janeiro (enquadra 100% do estado sem cortes)
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
  return '#D4DAE3';               // Cinza suave (sem ocorrências)
}

/* =========================================================================
   REGRAS VISUAIS: COROPLÉTICO PREENCHIDO vs APENAS CONTORNO
   ========================================================================= */
function obterEstiloFeature(feature, escopoSet, contagemMun) {
  const canonico = getNomeCanonicoMunicipio(feature.properties?.NM_MUN || feature.properties?.name);
  const isNoEscopo = escopoSet.has(normalizarTexto(canonico));
  const isMunSelecionado = (municipioAtivo !== "TODOS" && normalizarTexto(canonico) === normalizarTexto(municipioAtivo));
  const qtd = contagemMun[normalizarTexto(canonico)] || 0;
  const isRedecEspecifica = (redecAtiva !== "ALL" && redecAtiva !== "TODAS");

  // 1. Caso haja um município específico filtrado no dropdown
  if (municipioAtivo !== "TODOS") {
    if (isMunSelecionado) {
      return {
        fillColor: qtd > 0 ? obterCorPorQuantidade(qtd) : "#2454A6",
        fillOpacity: 0.90,
        color: "#ffffff",
        weight: 2.5,
        opacity: 1
      };
    }
    // Restante do estado: transparente apenas com contorno
    return {
      fillColor: "transparent",
      fillOpacity: 0,
      color: "#94A3B8",
      weight: 0.8,
      dashArray: "2, 3",
      opacity: 0.5
    };
  }

  // 2. Caso haja uma REDEC específica selecionada
  if (isRedecEspecifica) {
    if (isNoEscopo) {
      // MUNICÍPIOS DA REDEC: TOTALMENTE PREENCHIDOS E DESTACADOS
      return {
        fillColor: qtd > 0 ? obterCorPorQuantidade(qtd) : "#2454A6",
        fillOpacity: 0.88,
        color: "#ffffff",
        weight: 1.8,
        opacity: 1
      };
    } else {
      // RESTO DO ESTADO DO RJ: APENAS O CONTORNO (SEM PREENCHIMENTO)
      return {
        fillColor: "transparent",
        fillOpacity: 0,
        color: "#94A3B8",
        weight: 0.9,
        dashArray: "2, 2",
        opacity: 0.55
      };
    }
  }

  // 3. TODAS AS REDECS: MAPA COROPLÉTICO TOTALMENTE PREENCHIDO
  return {
    fillColor: obterCorPorQuantidade(qtd),
    fillOpacity: qtd > 0 ? 0.85 : 0.45,
    color: "#ffffff",
    weight: 1.2,
    opacity: 1
  };
}

/* =========================================================================
   INICIALIZAÇÃO DO MAPA (CRIA A CAMADA GEOJSON UMA ÚNICA VEZ)
   ========================================================================= */
function initMap() {
  if (mapInstance) return;

  // Cria o mapa e ajusta o enquadramento exato para todo o Rio de Janeiro
  mapInstance = L.map("map", { zoomControl: true, scrollWheelZoom: false });
  mapInstance.fitBounds(RJ_BOUNDS, { padding: [10, 10] });

  // Camada base Esri Light Gray Canvas (a mesma do seu projeto de contingência)
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

  // Tenta criar a malha GeoJSON imediatamente ou aguarda carregar
  tentarConstruirMalhaGeoJson();
}

function tentarConstruirMalhaGeoJson() {
  if (window._geojsonLayer) return;

  let geoFonte = null;
  if (typeof GEOJSON !== "undefined" && GEOJSON.features) geoFonte = GEOJSON;
  else if (window.GEOJSON && window.GEOJSON.features) geoFonte = window.GEOJSON;
  else if (window.geojsonRio && window.geojsonRio.features) geoFonte = window.geojsonRio;

  if (geoFonte && geoFonte.features && geoFonte.features.length) {
    atualizarMunicipiosEscopo();
    const ESCOPO_SET = new Set(MUNICIPIOS_ESCOPO.map(m => normalizarTexto(m)));

    function onEachFeature(feature, layer) {
      const canonico = getNomeCanonicoMunicipio(feature.properties?.NM_MUN || feature.properties?.name);
      const redecNome = getRedecDoMunicipio(canonico);

      layer.bindTooltip(`<b>${canonico}</b><br><span style="font-size:10px;opacity:.85;">${redecNome}</span>`, {
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
          const ESCOPO_ATUAL = new Set(MUNICIPIOS_ESCOPO.map(m => normalizarTexto(m)));
          const contagemMun = obterContagemAtualMunicipios();
          e.target.setStyle(obterEstiloFeature(e.target.feature, ESCOPO_ATUAL, contagemMun));
          e.target.closeTooltip();
        },
        click(e) {
          e.target.closeTooltip();
          const contagemMun = obterContagemAtualMunicipios();
          const qtd = contagemMun[normalizarTexto(canonico)] || 0;
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

    window._geojsonLayer = L.geoJSON(geoFonte, {
      style: (feat) => obterEstiloFeature(feat, ESCOPO_SET, {}),
      onEachFeature
    }).addTo(mapInstance);

    // Enquadra inicialmente no estado completo do RJ
    currentScopeBounds = L.latLngBounds(RJ_BOUNDS);
    mapInstance.fitBounds(currentScopeBounds, { padding: [10, 10], animate: false });

    // Atualiza imediatamente com os dados que já estiverem carregados
    atualizarCamadasMapa();
  } else {
    // Se o mapa.js ainda estiver carregando, tenta novamente após 150ms
    setTimeout(tentarConstruirMalhaGeoJson, 150);
  }
}

function obterContagemAtualMunicipios() {
  const contagemMun = {};
  if (Array.isArray(filtrados)) {
    filtrados.forEach(item => {
      const cNome = getNomeCanonicoMunicipio(item.m);
      const norm = normalizarTexto(cNome);
      if (norm) contagemMun[norm] = (contagemMun[norm] || 0) + (item.o || 1);
    });
  }
  return contagemMun;
}

/* =========================================================================
   ATUALIZAÇÃO DE CORES, CONTORNOS E PONTOS (SEM RECRIAR A CAMADA)
   ========================================================================= */
function atualizarCamadasMapa() {
  if (!mapInstance) return;

  atualizarMunicipiosEscopo();
  const ESCOPO_SET = new Set(MUNICIPIOS_ESCOPO.map(m => normalizarTexto(m)));
  const contagemMun = obterContagemAtualMunicipios();

  // 1. Atualiza estilos dos polígonos instantaneamente
  if (window._geojsonLayer) {
    window._geojsonLayer.eachLayer(layer => {
      layer.setStyle(obterEstiloFeature(layer.feature, ESCOPO_SET, contagemMun));
    });

    // 2. Ajuste dinâmico de Zoom com animação suave
    if (municipioAtivo !== "TODOS") {
      const camadaMun = window._geojsonLayer.getLayers().find(l => 
        normalizarTexto(getNomeCanonicoMunicipio(l.feature.properties?.NM_MUN || l.feature.properties?.name)) === normalizarTexto(municipioAtivo)
      );
      if (camadaMun) {
        currentScopeBounds = camadaMun.getBounds();
        mapInstance.fitBounds(currentScopeBounds, { padding: [30, 30], animate: true, duration: 0.6 });
      }
    } else if (redecAtiva !== "ALL" && redecAtiva !== "TODAS") {
      const camadasEscopo = window._geojsonLayer.getLayers().filter(l => 
        ESCOPO_SET.has(normalizarTexto(getNomeCanonicoMunicipio(l.feature.properties?.NM_MUN || l.feature.properties?.name)))
      );
      if (camadasEscopo.length > 0) {
        currentScopeBounds = L.featureGroup(camadasEscopo).getBounds();
        mapInstance.fitBounds(currentScopeBounds, { padding: [18, 18], animate: true, duration: 0.6 });
      }
    } else {
      currentScopeBounds = L.latLngBounds(RJ_BOUNDS);
      mapInstance.fitBounds(currentScopeBounds, { padding: [10, 10], animate: true, duration: 0.6 });
    }
  }

  // 3. Atualiza os pontos de ocorrência (sem piscadeira contínua)
  markersLayerGroup.clearLayers();
  if (Array.isArray(filtrados)) {
    const pontosComCoords = filtrados.filter(i => i.tem_coords);
    pontosComCoords.slice(0, 350).forEach(pt => {
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
  }

  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize({ animate: false });
  }, 80);
}

// Redimensionamento responsivo de tela
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
