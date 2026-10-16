/**
 * js/mapa_controller.js
 * Controlador do Mapa Interativo (Leaflet.js) - Painel SEDEC-RJ / REDECs
 * Responsável pela malha coroplética dos 92 municípios, alternância de preenchimento
 * vs. contorno transparente ao filtrar REDEC, ajuste de câmera e plotagem de pontos.
 */

const MapaController = (() => {
    let map = null;
    let geojsonLayer = null;
    let markersLayer = null;
    let infoControl = null;
    let legendControl = null;

    // Enquadramento oficial cobrindo 100% do Estado do Rio de Janeiro (sem cortar Norte/Noroeste)
    const RJ_BOUNDS = [
        [-23.38, -44.90], // Sudoeste (Paraty)
        [-20.76, -40.95]  // Nordeste (Porciúncula / São Francisco de Itabapoana)
    ];

    let estadoAtual = {
        contagemPorMunicipio: {},
        redecSelecionada: 'TODAS',
        municipioSelecionado: 'TODOS'
    };

    function normalizarTexto(texto) {
        if (!texto) return '';
        return String(texto)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .trim()
            .toUpperCase();
    }

    function obterRedecDoMunicipio(nomeMunicipio) {
        const nomeNorm = normalizarTexto(nomeMunicipio);
        if (typeof MAPA_REDECS_RJ === 'undefined') return null;

        for (const [munKey, redecVal] of Object.entries(MAPA_REDECS_RJ)) {
            if (normalizarTexto(munKey) === nomeNorm) {
                return redecVal;
            }
        }
        return null;
    }

    /**
     * Escala coroplética de pêssego suave a vermelho escuro
     */
    function obterCorCoropletica(qtd) {
        if (!qtd || qtd <= 0) return '#fee5d9'; // Pêssego suave (0 ocorrências)
        if (qtd >= 50) return '#67000d';        // Vermelho bordô escuro
        if (qtd >= 25) return '#a50f15';        // Vermelho escuro
        if (qtd >= 10) return '#cb181d';        // Vermelho médio-forte
        if (qtd >= 5)  return '#ef3b2c';        // Vermelho vivo
        if (qtd >= 2)  return '#fb6a4a';        // Laranja avermelhado
        return '#fcae91';                       // Salmão claro (1 ocorrência)
    }

    /**
     * Regra Visual Principal dos Polígonos:
     * - Todas as REDECs: 92 municípios 100% preenchidos na escala coroplética com borda branca.
     * - REDEC/Município Filtrado: Municípios da seleção 100% preenchidos e coloridos;
     *   todos os demais municípios do RJ ficam transparentes exibindo apenas a linha de contorno.
     */
    function calcularEstiloPoligono(feature) {
        const props = feature.properties || {};
        const nomeMun = props.NM_MUN || props.NM_MUNICIP || props.name || '';
        const nomeNorm = normalizarTexto(nomeMun);
        const redecMun = obterRedecDoMunicipio(nomeMun);
        const qtd = estadoAtual.contagemPorMunicipio[nomeNorm] || 0;

        const filtroRedecAtivo = estadoAtual.redecSelecionada &&
                                 estadoAtual.redecSelecionada !== 'TODAS';

        const filtroMunAtivo = estadoAtual.municipioSelecionado &&
                               estadoAtual.municipioSelecionado !== 'TODOS';

        // 1. Visão Geral ("Todas as REDECs")
        if (!filtroRedecAtivo && !filtroMunAtivo) {
            return {
                fillColor: obterCorCoropletica(qtd),
                weight: 1.2,
                opacity: 1,
                color: '#ffffff',
                fillOpacity: 0.85
            };
        }

        // Verifica se o município pertence à seleção atual
        let pertenceASelecao = false;
        if (filtroMunAtivo) {
            pertenceASelecao = (nomeNorm === normalizarTexto(estadoAtual.municipioSelecionado));
        } else if (filtroRedecAtivo) {
            pertenceASelecao = (normalizarTexto(redecMun) === normalizarTexto(estadoAtual.redecSelecionada));
        }

        // 2. Município pertence à REDEC/Filtro selecionado -> 100% preenchido e colorido
        if (pertenceASelecao) {
            return {
                fillColor: obterCorCoropletica(qtd),
                weight: 1.8,
                opacity: 1,
                color: '#ffffff',
                fillOpacity: 0.92
            };
        }

        // 3. Município fora da REDEC selecionada -> Transparente mantendo apenas contorno do Estado
        return {
            fillColor: 'transparent',
            weight: 1.0,
            opacity: 0.65,
            color: '#94a3b8',
            fillOpacity: 0.0
        };
    }

    function inicializar(containerId = 'map') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (map) {
            map.invalidateSize();
            return;
        }

        map = L.map(containerId, {
            zoomControl: true,
            attributionControl: true,
            minZoom: 6,
            maxZoom: 18,
            zoomSnap: 0.25
        });

        // Mapa Base: Esri Light Gray Canvas
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ | SEDEC-RJ',
            maxZoom: 16
        }).addTo(map);

        // Pane elevado para os circleMarkers não piscarem nem ficarem atrás dos polígonos
        map.createPane('markersPane');
        map.getPane('markersPane').style.zIndex = 650;

        markersLayer = L.layerGroup().addTo(map);

        criarControleInfo();
        criarControleLegenda();
        renderizarMalhaGeoJSON();
        enquadrarEstadoRJ(false);

        setTimeout(() => {
            if (map) map.invalidateSize();
        }, 250);

        window.addEventListener('resize', () => {
            if (map) map.invalidateSize();
        });
    }

    function renderizarMalhaGeoJSON() {
        const dadosGeo = (typeof GEOJSON !== 'undefined') ? GEOJSON : window.GEOJSON;
        if (!dadosGeo || !dadosGeo.features) {
            console.error('[MapaController] Constante GEOJSON não encontrada em mapa.js');
            return;
        }

        if (geojsonLayer) {
            map.removeLayer(geojsonLayer);
        }

        geojsonLayer = L.geoJSON(dadosGeo, {
            style: calcularEstiloPoligono,
            onEachFeature: configurarInteracaoPoligono
        }).addTo(map);
    }

    function configurarInteracaoPoligono(feature, layer) {
        const props = feature.properties || {};
        const nomeMun = props.NM_MUN || props.NM_MUNICIP || props.name || '';

        layer.on({
            mouseover: (e) => {
                const target = e.target;
                const redecMun = obterRedecDoMunicipio(nomeMun) || 'Não mapeada';
                const qtd = estadoAtual.contagemPorMunicipio[normalizarTexto(nomeMun)] || 0;

                target.setStyle({
                    weight: 2.5,
                    color: '#0f172a'
                });

                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                    target.bringToFront();
                }

                atualizarPainelInfo({ nome: nomeMun, redec: redecMun, qtd: qtd });
            },
            mouseout: (e) => {
                if (geojsonLayer) {
                    geojsonLayer.resetStyle(e.target);
                }
                atualizarPainelInfo(null);
            },
            click: () => {
                if (typeof window.selecionarMunicipioPeloMapa === 'function') {
                    window.selecionarMunicipioPeloMapa(nomeMun);
                }
            }
        });
    }

    function criarControleInfo() {
        infoControl = L.control({ position: 'topright' });
        infoControl.onAdd = function () {
            this._div = L.DomUtil.create('div', 'mapa-info-box');
            this._div.style.cssText = 'background:rgba(255,255,255,0.94); padding:8px 12px; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.15); font-family:Inter,sans-serif; font-size:12px; line-height:1.4; min-width:175px; pointer-events:none; border-left:4px solid #cb181d;';
            atualizarPainelInfo(null);
            return this._div;
        };
        infoControl.addTo(map);
    }

    function atualizarPainelInfo(dados) {
        if (!infoControl || !infoControl._div) return;
        if (!dados) {
            infoControl._div.innerHTML = '<strong>Estado do Rio de Janeiro</strong><br><span style="color:#64748b;">Passe o mouse sobre um município</span>';
        } else {
            infoControl._div.innerHTML = `
                <strong style="font-size:13px; color:#0f172a;">${dados.nome}</strong><br>
                <span style="color:#475569; font-weight:600;">${dados.redec}</span><br>
                <span style="color:#cb181d; font-weight:700;">${dados.qtd}</span> ocorrência(s)
            `;
        }
    }

    function criarControleLegenda() {
        legendControl = L.control({ position: 'bottomright' });
        legendControl.onAdd = function () {
            const div = L.DomUtil.create('div', 'mapa-legend-box');
            div.style.cssText = 'background:rgba(255,255,255,0.94); padding:8px 10px; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.15); font-family:Inter,sans-serif; font-size:11px; line-height:18px; color:#334155;';
            const faixas = [0, 1, 2, 5, 10, 25, 50];
            let html = '<strong style="display:block; margin-bottom:4px;">Ocorrências</strong>';

            for (let i = 0; i < faixas.length; i++) {
                const de = faixas[i];
                const ate = faixas[i + 1];
                const cor = obterCorCoropletica(de);
                const rotulo = de === 0 ? '0' : (ate ? `${de} &ndash; ${ate - 1}` : `${de}+`);
                html += `
                    <div style="display:flex; align-items:center; gap:6px;">
                        <i style="width:13px; height:13px; background:${cor}; display:inline-block; border:1px solid #cbd5e1; border-radius:2px;"></i>
                        <span>${rotulo}</span>
                    </div>
                `;
            }
            div.innerHTML = html;
            return div;
        };
        legendControl.addTo(map);
    }

    function enquadrarEstadoRJ(animar = true) {
        if (!map) return;
        map.fitBounds(RJ_BOUNDS, {
            padding: [14, 14],
            animate: animar,
            duration: 0.6
        });
    }

    function ajustarCameraParaFiltro(redec, municipio) {
        if (!map || !geojsonLayer) return;

        const filtroRedecAtivo = redec && redec !== 'TODAS';
        const filtroMunAtivo = municipio && municipio !== 'TODOS';

        if (!filtroRedecAtivo && !filtroMunAtivo) {
            enquadrarEstadoRJ(true);
            return;
        }

        const boundsGrupo = L.latLngBounds([]);

        geojsonLayer.eachLayer((layer) => {
            const props = layer.feature.properties || {};
            const nomeMun = props.NM_MUN || props.NM_MUNICIP || props.name || '';
            const nomeNorm = normalizarTexto(nomeMun);
            const redecMun = obterRedecDoMunicipio(nomeMun);

            if (filtroMunAtivo && nomeNorm === normalizarTexto(municipio)) {
                boundsGrupo.extend(layer.getBounds());
            } else if (!filtroMunAtivo && filtroRedecAtivo && normalizarTexto(redecMun) === normalizarTexto(redec)) {
                boundsGrupo.extend(layer.getBounds());
            }
        });

        if (boundsGrupo.isValid()) {
            map.fitBounds(boundsGrupo, {
                padding: [28, 28],
                maxZoom: filtroMunAtivo ? 11.25 : 9.5,
                animate: true,
                duration: 0.6
            });
        } else {
            enquadrarEstadoRJ(true);
        }
    }

    function plotarCoordenadas(registros) {
        if (!map || !markersLayer) return;

        markersLayer.clearLayers();
        if (!Array.isArray(registros) || registros.length === 0) return;

        registros.forEach((item) => {
            const lat = item.latitude;
            const lng = item.longitude;

            if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng) &&
                lat <= -20.5 && lat >= -23.6 && lng >= -45.0 && lng <= -40.7) {

                const marker = L.circleMarker([lat, lng], {
                    pane: 'markersPane',
                    radius: 6,
                    fillColor: '#ea580c',
                    color: '#991b1b',
                    weight: 1.5,
                    opacity: 1,
                    fillOpacity: 0.9
                });

                marker.bindPopup(`
                    <div style="font-family:Inter,sans-serif; font-size:12px; line-height:1.4;">
                        <strong style="color:#991b1b;">${item.evento || 'Ocorrência'}</strong><br>
                        <strong>Município:</strong> ${item.municipio || '-'}<br>
                        <strong>REDEC:</strong> ${item.redec || '-'}<br>
                        ${item.data ? `<strong>Data:</strong> ${item.data}<br>` : ''}
                        <span style="color:#64748b; font-size:11px;">Coord: ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
                    </div>
                `);

                markersLayer.addLayer(marker);
            }
        });
    }

    function atualizarMapa({
        registrosFiltrados = [],
        redec = 'TODAS',
        municipio = 'TODOS',
        moverCamera = true
    } = {}) {
        if (!map) inicializar('map');

        const mudouFiltroGeografico =
            estadoAtual.redecSelecionada !== redec ||
            estadoAtual.municipioSelecionado !== municipio;

        estadoAtual.redecSelecionada = redec || 'TODAS';
        estadoAtual.municipioSelecionado = municipio || 'TODOS';

        const novaContagem = {};
        if (Array.isArray(registrosFiltrados)) {
            registrosFiltrados.forEach((reg) => {
                const chave = normalizarTexto(reg.municipio);
                if (chave) {
                    novaContagem[chave] = (novaContagem[chave] || 0) + 1;
                }
            });
        }

        estadoAtual.contagemPorMunicipio = novaContagem;

        if (geojsonLayer) {
            geojsonLayer.setStyle(calcularEstiloPoligono);
        } else {
            renderizarMalhaGeoJSON();
        }

        plotarCoordenadas(registrosFiltrados);

        if (moverCamera && mudouFiltroGeografico) {
            ajustarCameraParaFiltro(estadoAtual.redecSelecionada, estadoAtual.municipioSelecionado);
        }
    }

    return {
        inicializar,
        atualizarMapa,
        enquadrarEstadoRJ,
        ajustarCameraParaFiltro
    };
})();

window.MapaController = MapaController;
