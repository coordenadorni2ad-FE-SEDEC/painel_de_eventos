/**
 * js/app.js
 * Orquestrador principal do Painel SEDEC-RJ / REDECs:
 * - Cache inteligente (localStorage + verificação em segundo plano a cada 5 min)
 * - Navegação entre abas (módulos operacionais)
 * - Filtro de período (Hoje, 7D, 30D, Mês Atual, Tudo e intervalo personalizado)
 * - Filtros dependentes (REDEC <-> Município + Busca textual)
 * - Atualização sincronizada de KPIs, Gráfico por REDEC, Tabela paginada e Mapa Leaflet
 */

document.addEventListener('DOMContentLoaded', () => {
    const estadoApp = {
        bancoPorModulo: {},
        moduloAtivo: CONFIG.MODULOS_VISIVEIS[0].id,
        periodoAtivo: 'tudo',
        dataInicioISO: '',
        dataFimISO: '',
        redecSelecionada: 'TODAS',
        municipioSelecionado: 'TODOS',
        termoBusca: '',
        registrosFiltrados: [],
        paginaAtual: 1
    };

    // Referências de DOM
    const elTabs = document.getElementById('module-tabs');
    const elSelectRedec = document.getElementById('select-redec');
    const elSelectMunicipio = document.getElementById('select-municipio');
    const elInputBusca = document.getElementById('input-busca');
    const elDateStart = document.getElementById('date-start');
    const elDateEnd = document.getElementById('date-end');
    const elBtnSync = document.getElementById('btn-sync');
    const elStatusDot = document.getElementById('status-indicator');
    const elLastSyncText = document.getElementById('last-sync-text');
    const elMapFilterStatus = document.getElementById('map-filter-status');

    // 1. Inicializa o Mapa Leaflet
    MapaController.inicializar('map');

    // 2. Popula Select de REDECs
    popularSelectRedecs();
    popularSelectMunicipios('TODAS');

    // 3. Registra Eventos de Interface
    registrarEventosUI();

    // 4. Carrega Dados (Cache Local imediato + Sincronização com API)
    carregarDadosIniciais();

    // 5. Verificação silenciosa a cada 5 minutos
    setInterval(() => {
        sincronizarComAPI(true);
    }, CONFIG.CACHE_TTL_MS);

    // =========================================================================
    // FUNÇÕES DE DADOS E CACHE
    // =========================================================================
    function carregarDadosIniciais() {
        try {
            const cacheSalvo = localStorage.getItem(CONFIG.CACHE_KEY);
            if (cacheSalvo) {
                const parsed = JSON.parse(cacheSalvo);
                if (parsed && parsed.dados) {
                    estadoApp.bancoPorModulo = parsed.dados;
                    atualizarStatusSync('online', `Cache (${ parsed.horario || 'recente' })`);
                    renderizarAbas();
                    aplicarFiltros(false);
                }
            }
        } catch (err) {
            console.warn('Falha ao ler cache local:', err);
        }

        sincronizarComAPI(false);
    }

    async function sincronizarComAPI(silencioso = false) {
        if (!silencioso) {
            atualizarStatusSync('syncing', 'Sincronizando...');
        }

        try {
            const resposta = await fetch(CONFIG.API_URL, { cache: 'no-store' });
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

            const json = await resposta.json();
            const processado = DataProcessor.processarRespostaAPI(json);

            estadoApp.bancoPorModulo = processado;

            const agora = new Date();
            const horarioFormatado = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            try {
                localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
                    horario: horarioFormatado,
                    timestamp: agora.getTime(),
                    dados: processado
                }));
            } catch (e) {
                console.warn('Aviso: limite de localStorage atingido.');
            }

            atualizarStatusSync('online', `Atualizado às ${horarioFormatado}`);
            renderizarAbas();
            aplicarFiltros(false);
        } catch (erro) {
            console.error('Erro ao sincronizar com a API:', erro);
            atualizarStatusSync('error', 'Modo Offline (Cache)');
            renderizarAbas();
            aplicarFiltros(false);
        }
    }

    function atualizarStatusSync(estado, texto) {
        if (elStatusDot) {
            elStatusDot.className = `status-dot ${estado}`;
        }
        if (elLastSyncText) {
            elLastSyncText.textContent = texto;
        }
    }

    // =========================================================================
    // NAVEGAÇÃO POR ABAS E PERÍODO
    // =========================================================================
    function renderizarAbas() {
        if (!elTabs) return;
        elTabs.innerHTML = '';

        CONFIG.MODULOS_VISIVEIS.forEach(mod => {
            const lista = estadoApp.bancoPorModulo[mod.id] || [];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `tab-btn ${estadoApp.moduloAtivo === mod.id ? 'active' : ''}`;
            btn.innerHTML = `
                <span>${mod.rotulo}</span>
                <span class="tab-count">${lista.length}</span>
            `;
            btn.addEventListener('click', () => {
                estadoApp.moduloAtivo = mod.id;
                estadoApp.paginaAtual = 1;
                renderizarAbas();
                aplicarFiltros(false);
            });
            elTabs.appendChild(btn);
        });
    }

    function definirAtalhoPeriodo(codigoPeriodo) {
        estadoApp.periodoAtivo = codigoPeriodo;
        const hoje = new Date();
        const formatarISO = (dt) => {
            const a = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const d = String(dt.getDate()).padStart(2, '0');
            return `${a}-${m}-${d}`;
        };

        if (codigoPeriodo === 'tudo') {
            estadoApp.dataInicioISO = '';
            estadoApp.dataFimISO = '';
        } else if (codigoPeriodo === 'hoje') {
            const iso = formatarISO(hoje);
            estadoApp.dataInicioISO = iso;
            estadoApp.dataFimISO = iso;
        } else if (codigoPeriodo === '7d') {
            const inicio = new Date(hoje);
            inicio.setDate(hoje.getDate() - 6);
            estadoApp.dataInicioISO = formatarISO(inicio);
            estadoApp.dataFimISO = formatarISO(hoje);
        } else if (codigoPeriodo === '30d') {
            const inicio = new Date(hoje);
            inicio.setDate(hoje.getDate() - 29);
            estadoApp.dataInicioISO = formatarISO(inicio);
            estadoApp.dataFimISO = formatarISO(hoje);
        } else if (codigoPeriodo === 'mes') {
            const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            estadoApp.dataInicioISO = formatarISO(inicio);
            estadoApp.dataFimISO = formatarISO(hoje);
        }

        if (elDateStart) elDateStart.value = estadoApp.dataInicioISO;
        if (elDateEnd) elDateEnd.value = estadoApp.dataFimISO;

        document.querySelectorAll('.btn-period').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.period === codigoPeriodo);
        });

        estadoApp.paginaAtual = 1;
        aplicarFiltros(false);
    }

    // =========================================================================
    // FILTROS DEPENDENTES (REDEC <-> MUNICÍPIO)
    // =========================================================================
    function popularSelectRedecs() {
        if (!elSelectRedec) return;
        elSelectRedec.innerHTML = '<option value="TODAS">Todas as REDECs (11)</option>';
        LISTA_REDECS_RJ.forEach(redec => {
            const opt = document.createElement('option');
            opt.value = redec;
            opt.textContent = redec;
            elSelectRedec.appendChild(opt);
        });
    }

    function popularSelectMunicipios(redecFiltro = 'TODAS') {
        if (!elSelectMunicipio) return;
        const valorAnterior = elSelectMunicipio.value;
        elSelectMunicipio.innerHTML = '<option value="TODOS">Todos os Municípios</option>';

        const municipios = Object.entries(MAPA_REDECS_RJ)
            .filter(([, redec]) => redecFiltro === 'TODAS' || redec === redecFiltro)
            .map(([mun]) => mun)
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));

        municipios.forEach(mun => {
            const opt = document.createElement('option');
            opt.value = mun;
            opt.textContent = mun;
            elSelectMunicipio.appendChild(opt);
        });

        if (municipios.includes(valorAnterior)) {
            elSelectMunicipio.value = valorAnterior;
        } else {
            elSelectMunicipio.value = 'TODOS';
            estadoApp.municipioSelecionado = 'TODOS';
        }
    }

    // Permite clicar em um polígono no mapa para filtrar o município
    window.selecionarMunicipioPeloMapa = (nomeMunicipio) => {
        const info = DataProcessor.resolverMunicipioERedec(nomeMunicipio, '');
        if (!info || !info.municipio) return;

        // Se clicar no mesmo município já filtrado, limpa o filtro e volta para visão geral
        if (estadoApp.municipioSelecionado === info.municipio) {
            estadoApp.redecSelecionada = 'TODAS';
            estadoApp.municipioSelecionado = 'TODOS';
            elSelectRedec.value = 'TODAS';
            popularSelectMunicipios('TODAS');
            aplicarFiltros(true);
            return;
        }

        estadoApp.redecSelecionada = info.redec;
        elSelectRedec.value = info.redec;
        popularSelectMunicipios(info.redec);

        estadoApp.municipioSelecionado = info.municipio;
        elSelectMunicipio.value = info.municipio;
        estadoApp.paginaAtual = 1;

        aplicarFiltros(true);
    };

    // =========================================================================
    // APLICAÇÃO DOS FILTROS E ATUALIZAÇÃO DE COMPONENTES
    // =========================================================================
    function aplicarFiltros(moverCameraMapa = true) {
        const baseModulo = estadoApp.bancoPorModulo[estadoApp.moduloAtivo] || [];

        const tsInicio = estadoApp.dataInicioISO ? new Date(`${estadoApp.dataInicioISO}T00:00:00`).getTime() : null;
        const tsFim = estadoApp.dataFimISO ? new Date(`${estadoApp.dataFimISO}T23:59:59`).getTime() : null;
        const buscaNorm = DataProcessor.normalizarChave(estadoApp.termoBusca);

        estadoApp.registrosFiltrados = baseModulo.filter(item => {
            // 1. Filtro de Período
            if (tsInicio && (!item.timestamp || item.timestamp < tsInicio)) return false;
            if (tsFim && (!item.timestamp || item.timestamp > tsFim)) return false;

            // 2. Filtro de REDEC
            if (estadoApp.redecSelecionada !== 'TODAS' && item.redec !== estadoApp.redecSelecionada) {
                return false;
            }

            // 3. Filtro de Município
            if (estadoApp.municipioSelecionado !== 'TODOS' && item.municipio !== estadoApp.municipioSelecionado) {
                return false;
            }

            // 4. Filtro de Busca Rápida
            if (buscaNorm) {
                const textoLinha = DataProcessor.normalizarChave(
                    `${item.municipio} ${item.redec} ${item.evento} ${item.data} ${JSON.stringify(item._raw)}`
                );
                if (!textoLinha.includes(buscaNorm)) return false;
            }

            return true;
        });

        atualizarKPIs();
        atualizarGraficoRedecs();
        atualizarTabela();
        atualizarStatusBarraMapa();

        MapaController.atualizarMapa({
            registrosFiltrados: estadoApp.registrosFiltrados,
            redec: estadoApp.redecSelecionada,
            municipio: estadoApp.municipioSelecionado,
            moverCamera: moverCameraMapa
        });
    }

    function atualizarStatusBarraMapa() {
        if (!elMapFilterStatus) return;
        if (estadoApp.municipioSelecionado !== 'TODOS') {
            elMapFilterStatus.textContent = `Foco Municipal: ${estadoApp.municipioSelecionado} (${estadoApp.redecSelecionada})`;
        } else if (estadoApp.redecSelecionada !== 'TODAS') {
            elMapFilterStatus.textContent = `Visão Regional: ${estadoApp.redecSelecionada} (Demais municípios em contorno)`;
        } else {
            elMapFilterStatus.textContent = 'Visão Estadual: Todas as REDECs (92 Municípios)';
        }
    }

    function atualizarKPIs() {
        const lista = estadoApp.registrosFiltrados;
        const setMunicipios = new Set();
        const contagemRedec = {};

        lista.forEach(item => {
            if (item.municipio && item.municipio !== 'Não Informado') {
                setMunicipios.add(item.municipio);
            }
            if (item.redec && item.redec !== 'NÃO IDENTIFICADA') {
                contagemRedec[item.redec] = (contagemRedec[item.redec] || 0) + 1;
            }
        });

        let topRedecNome = '-';
        let topRedecQtd = 0;
        for (const [redec, qtd] of Object.entries(contagemRedec)) {
            if (qtd > topRedecQtd) {
                topRedecQtd = qtd;
                topRedecNome = redec.replace('REDEC ', '');
            }
        }

        document.getElementById('kpi-total').textContent = lista.length.toLocaleString('pt-BR');
        document.getElementById('kpi-modulo-nome').textContent = `Módulo: ${estadoApp.moduloAtivo}`;
        document.getElementById('kpi-municipios').textContent = setMunicipios.size;
        document.getElementById('kpi-redecs').textContent = Object.keys(contagemRedec).length;
        document.getElementById('kpi-top-redec').textContent = topRedecNome;
        document.getElementById('kpi-top-redec-qtd').textContent = `${topRedecQtd} ocorrência(s)`;
    }

    function atualizarGraficoRedecs() {
        const container = document.getElementById('redec-bars-container');
        if (!container) return;

        const contagem = {};
        LISTA_REDECS_RJ.forEach(r => { contagem[r] = 0; });

        estadoApp.registrosFiltrados.forEach(item => {
            if (contagem[item.redec] !== undefined) {
                contagem[item.redec]++;
            }
        });

        const ranking = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
        const maiorValor = Math.max(1, ...ranking.map(([, v]) => v));

        container.innerHTML = '';
        ranking.forEach(([redec, qtd]) => {
            const pct = Math.round((qtd / maiorValor) * 100);
            const row = document.createElement('div');
            row.className = `redec-bar-row ${estadoApp.redecSelecionada === redec ? 'selected' : ''}`;
            row.innerHTML = `
                <span class="redec-bar-label" title="${redec}">${redec.replace('REDEC ', '')}</span>
                <div class="redec-bar-track">
                    <div class="redec-bar-fill" style="width: ${pct}%"></div>
                </div>
                <span class="redec-bar-value">${qtd}</span>
            `;

            row.addEventListener('click', () => {
                const novaRedec = (estadoApp.redecSelecionada === redec) ? 'TODAS' : redec;
                estadoApp.redecSelecionada = novaRedec;
                estadoApp.municipioSelecionado = 'TODOS';
                elSelectRedec.value = novaRedec;
                popularSelectMunicipios(novaRedec);
                estadoApp.paginaAtual = 1;
                aplicarFiltros(true);
            });

            container.appendChild(row);
        });
    }

    function atualizarTabela() {
        const thead = document.getElementById('table-head');
        const tbody = document.getElementById('table-body');
        const counter = document.getElementById('table-counter');
        const pageInfo = document.getElementById('page-info');
        const btnPrev = document.getElementById('btn-prev-page');
        const btnNext = document.getElementById('btn-next-page');

        const total = estadoApp.registrosFiltrados.length;
        counter.textContent = `${total} registro(s) encontrado(s)`;

        thead.innerHTML = `
            <tr>
                <th>Data</th>
                <th>Município</th>
                <th>REDEC</th>
                <th>Descrição / Evento</th>
            </tr>
        `;

        const totalPaginas = Math.max(1, Math.ceil(total / CONFIG.ITENS_POR_PAGINA));
        if (estadoApp.paginaAtual > totalPaginas) estadoApp.paginaAtual = totalPaginas;

        const inicio = (estadoApp.paginaAtual - 1) * CONFIG.ITENS_POR_PAGINA;
        const fim = inicio + CONFIG.ITENS_POR_PAGINA;
        const paginaItens = estadoApp.registrosFiltrados.slice(inicio, fim);

        tbody.innerHTML = '';

        if (paginaItens.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; padding:22px; color:#64748b;">
                        Nenhum registro encontrado para os filtros selecionados.
                    </td>
                </tr>
            `;
        } else {
            paginaItens.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.data || '-'}</td>
                    <td><strong>${item.municipio}</strong></td>
                    <td>${item.redec.replace('REDEC ', '')}</td>
                    <td title="${item.evento}">${item.evento}</td>
                `;
                tr.addEventListener('click', () => {
                    if (item.municipio && item.municipio !== 'Não Informado') {
                        window.selecionarMunicipioPeloMapa(item.municipio);
                    }
                });
                tbody.appendChild(tr);
            });
        }

        pageInfo.textContent = `Página ${estadoApp.paginaAtual} de ${totalPaginas}`;
        btnPrev.disabled = estadoApp.paginaAtual <= 1;
        btnNext.disabled = estadoApp.paginaAtual >= totalPaginas;
    }

    // =========================================================================
    // EVENTOS DE INTERAÇÃO DO USUÁRIO
    // =========================================================================
    function registrarEventosUI() {
        // Mudança de REDEC
        elSelectRedec.addEventListener('change', (e) => {
            estadoApp.redecSelecionada = e.target.value;
            estadoApp.municipioSelecionado = 'TODOS';
            popularSelectMunicipios(estadoApp.redecSelecionada);
            estadoApp.paginaAtual = 1;
            aplicarFiltros(true);
        });

        // Mudança de Município
        elSelectMunicipio.addEventListener('change', (e) => {
            estadoApp.municipioSelecionado = e.target.value;
            if (estadoApp.municipioSelecionado !== 'TODOS') {
                const info = DataProcessor.resolverMunicipioERedec(estadoApp.municipioSelecionado, '');
                if (info.redec && estadoApp.redecSelecionada === 'TODAS') {
                    estadoApp.redecSelecionada = info.redec;
                    elSelectRedec.value = info.redec;
                    popularSelectMunicipios(info.redec);
                    elSelectMunicipio.value = info.municipio;
                }
            }
            estadoApp.paginaAtual = 1;
            aplicarFiltros(true);
        });

        // Busca textual
        elInputBusca.addEventListener('input', (e) => {
            estadoApp.termoBusca = e.target.value;
            estadoApp.paginaAtual = 1;
            aplicarFiltros(false);
        });

        // Botões rápidos de período
        document.querySelectorAll('.btn-period').forEach(btn => {
            btn.addEventListener('click', () => {
                definirAtalhoPeriodo(btn.dataset.period);
            });
        });

        // Datas personalizadas
        const onCustomDateChange = () => {
            estadoApp.periodoAtivo = 'custom';
            estadoApp.dataInicioISO = elDateStart.value;
            estadoApp.dataFimISO = elDateEnd.value;
            document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
            estadoApp.paginaAtual = 1;
            aplicarFiltros(false);
        };
        elDateStart.addEventListener('change', onCustomDateChange);
        elDateEnd.addEventListener('change', onCustomDateChange);

        // Botão Limpar Filtros
        document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
            estadoApp.redecSelecionada = 'TODAS';
            estadoApp.municipioSelecionado = 'TODOS';
            estadoApp.termoBusca = '';
            elSelectRedec.value = 'TODAS';
            popularSelectMunicipios('TODAS');
            elInputBusca.value = '';
            definirAtalhoPeriodo('tudo');
            MapaController.enquadrarEstadoRJ(true);
        });

        // Botão Enquadrar RJ no Mapa
        document.getElementById('btn-reset-map').addEventListener('click', () => {
            MapaController.enquadrarEstadoRJ(true);
        });

        // Botão Sincronizar Manual
        elBtnSync.addEventListener('click', () => {
            sincronizarComAPI(false);
        });

        // Paginação
        document.getElementById('btn-prev-page').addEventListener('click', () => {
            if (estadoApp.paginaAtual > 1) {
                estadoApp.paginaAtual--;
                atualizarTabela();
            }
        });

        document.getElementById('btn-next-page').addEventListener('click', () => {
            estadoApp.paginaAtual++;
            atualizarTabela();
        });
    }
});
