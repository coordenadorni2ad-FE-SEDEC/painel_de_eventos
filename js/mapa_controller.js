/* =========================================================================
   CONTROLE DO MAPA LEAFLET, ESRI CANVAS, COROPLÉTICO E FOCO EM REDEC
   ========================================================================= */

let mapInstance = null;
let markersLayerGroup = null;
let currentScopeBounds = null;
let popupCloseTimer = null;
let redecAtiva = "ALL";
let MUNICIPIOS_ESCOPO = [];
let geojsonDataGlobal = null;

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
  if (qtd > 50) return '#b91c1c';
  if (qtd > 20) return '#ea580c';
  if (qtd > 5)  return '#fb923c';
  if (qtd > 0)  return '#fed7aa';
  return '#D4DAE3';
}

function obterEstiloFeature(feature, escopoSet, contagemMun) {
  const canonico = getNomeCanonicoMunicipio(feature.properties.NM_MUN);
  const isNoEscopo = escopoSet.has(normalizarTexto(canonico));
  const qtd = contagemMun[normalizarTexto(canonico)] || 0;
  const isRedecEspecifica = (redecAtiva !== "ALL" && redecAtiva !== "TODAS");

  if (isRedecEspecifica) {
    if (isNoEscopo) {
      // MUNICÍPIOS DA REDEC: TOTALMENTE PREENCHIDOS E COLORIDOS
      return {
        fillColor: qtd > 0 ? obterCorPorQuantidade(qtd) : "#2454A6",
        fillOpacity: 0.85,
        color: "#ffffff",
        weight: 2,
        opacity: 1
      };
    } else {
      // FORA DA REDEC: APENAS CONTORNO PONTILHADO (TRANSPARENTE)
      return {
        fillColor: "transparent",
        fillOpacity: 0,
        color: "#64748B",
        weight: 0.8,
        dashArray: "2, 2",
        opacity: 0.5
      };
    }
  } else {
    // TODAS AS REDECS: COROPLÉTICO PREENCHIDO
    return {
      fillColor: obterCorPorQuantidade(qtd),
      fillOpacity: qtd > 0 ? 0.85 : 0.5,
      color: "#ffffff",
      weight: 1.2,
      opacity: 1
    };
  }
}

async function obterGeoJsonSeguro() {
  if (geojsonDataGlobal && geojsonDataGlobal.features) return geojsonDataGlobal;
  try {
    if (typeof GEOJSON !== "undefined" && GEOJSON.features) {
      geojsonDataGlobal = GEOJSON;
      return geojsonDataGlobal;
    }
  } catch (e) {}

  try {
    const resp = await fetch("./mapa.js");
    if (resp.ok) {
      const jsText = await resp.text();
      const s = jsText.indexOf("{"), e = jsText.lastIndexOf("}");
      if (s !== -1 && e !== -1) {
        geojsonDataGlobal = JSON.parse(jsText.substring(s, e + 1));
        return geojsonDataGlobal;
      }
    }
  } catch (err) {
    console.warn("Aguardando mapa.js...");
  }
  return null;
}

function initMap() {
  if (!mapInstance) {
    mapInstance = L.map("map", { zoomControl: true, scrollWheelZoom: false }).setView([-22.35, -42.7], 7.5);
    
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

  const contagemMun = {};
  filtrados.forEach(item => {
    const cNome = getNomeCanonicoMunicipio(item.m);
    const norm = normalizarTexto(cNome);
    if (norm) contagemMun[norm] = (contagemMun[norm] || 0) + (item.o || 1);
  });

  if (window._geojsonLayer) {
    mapInstance.removeLayer(window._geojsonLayer);
  }
  markersLayerGroup.clearLayers();

  const dadosGeoJson = await obterGeoJsonSeguro();

  if (dadosGeoJson && dadosGeoJson.features && dadosGeoJson.features.length) {
    function onEachFeature(feature, layer) {
      const canonico = getNomeCanonicoMunicipio(feature.properties.NM_MUN);
      const isNoEscopo = ESCOPO_SET.has(normalizarTexto(canonico));
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

    const camadasEscopo = window._geojsonLayer.getLayers().filter(l => 
      ESCOPO_SET.has(normalizarTexto(getNomeCanonicoMunicipio(l.feature.properties.NM_MUN)))
    );

    if (camadasEscopo.length > 0) {
      const bounds = L.featureGroup(camadasEscopo).getBounds();
      if (bounds.isValid()) {
        currentScopeBounds = bounds;
        mapInstance.fitBounds(bounds, { padding: [18, 18], animate: true });
      }
    } else {
      currentScopeBounds = window._geojsonLayer.getBounds();
      mapInstance.fitBounds(currentScopeBounds, { padding: [10, 10], animate: true });
    }
  } else {
    setTimeout(atualizarCamadasMapa, 300);
  }

  // Marcadores de ocorrências georreferenciadas
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

// Redimensionamento responsivo
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
