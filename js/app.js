/**
 * js/app.js
 * Orquestrador principal do Painel SEDEC-RJ / REDECs
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
        eventoSelecionado: 'TODOS',
        termoBusca: '',
        registrosFiltrados: [],
        paginaAtual: 1
    };

    const elTabs = document.getElementById('module-tabs');
    const elSelectRedec = document.getElementById('select-redec');
    const elSelectMunicipio = document.getElementById('select-municipio');
    const elSelectEvento = document.getElementById('select-evento');
    const elInputBusca = document.getElementById('input-busca');
    const elDateStart = document.getElementById('date-start');
    const elDateEnd = document.getElementById('date-end');
    const elBtnSync = document.getElementById('btn-sync');
    const elStatusDot = document.getElementById('status-indicator');
    const elLastSyncText = document.getElementById('last-sync-text');
    const elMapFilterStatus = document.getElementById('map-filter-status');

    MapaController.inicializar('map');

    popularSelectRedecs();
    popularSelectMunicipios('TODAS');
    popularSelectEventos();
    registrarEventosUI();
    carregarDadosIniciais();

    setInterval(() => { sincronizarComAPI(true); }, CONFIG.CACHE_TTL_MS);

    function carregarDadosIniciais() {
        try {
            const cacheSalvo = localStorage.getItem(CONFIG.CACHE_KEY);
            if (cacheSalvo) {
                const parsed = JSON.parse(cacheSalvo);
                if (parsed && parsed.dados) {
                    estadoApp.bancoPorModulo = parsed.dados;
                    atualizarStatusSync('online', `Cache (${parsed.horario || 'recente'})`);
                    renderizarAbas();
                    popularSelectEventos();
                    aplicarFiltros(false);
                }
            }
        } catch (err) {
            console.warn('Falha ao ler cache local:', err);
        }
        sincronizarComAPI(false);
    }

    async function sincronizarComAPI(silencioso = false) {
        if (!silencioso) atualizarStatusSync('syncing', 'Sincronizando...');

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
            } catch (e) {}

            atualizarStatusSync('online', `Atualizado às ${horarioFormatado}`);
            renderizarAbas();
            popularSelectEventos();
            aplicarFiltros(false);
        } catch (erro) {
            console.error('Erro ao sincronizar:', erro);
            atualizarStatusSync('error', 'Modo Offline (Cache)');
            renderizarAbas();
            popularSelectEventos();
            aplicarFiltros(false);
        }
    }

    function atualizarStatusSync(estado, texto) {
        if (elStatusDot) elStatusDot.className = `status-dot ${estado}`;
        if (elLastSyncText) elLastSyncText.textContent = texto;
    }

    function renderizarAbas() {
        if (!elTabs) return;
        elTabs.innerHTML = '';

        CONFIG.MODULOS_VISIVEIS.forEach(mod => {
            const lista = estadoApp.bancoPorModulo[mod.id] || [];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `tab-btn ${estadoApp.moduloAtivo === mod.id ? 'active' : ''}`;
            btn.innerHTML = `<span>${mod.rotulo}</span><span class="tab-count">${lista.length}</span>`;
            btn.addEventListener('click', () => {
                estadoApp.moduloAtivo = mod.id;
                estadoApp.paginaAtual = 1;
                renderizarAbas();
                popularSelectEventos();
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

    function popularSelectEventos() {
        if (!elSelectEvento) return;
        const valorAnterior = elSelectEvento.value;
        elSelectEvento.innerHTML = '<option value="TODOS">Todos os Eventos</option>';

        const baseModulo = estadoApp.bancoPorModulo[estadoApp.moduloAtivo] || [];
        const eventosSet = new Set();

        baseModulo.forEach(item => {
            if (item.tipoPuro && item.tipoPuro.trim() !== '' && item.tipoPuro !== 'Outros') {
                eventosSet.add(item.tipoPuro.trim());
            }
        });

        const eventosOrdenados = Array.from(eventosSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));

        eventosOrdenados.forEach(ev => {
            const opt = document.createElement('option');
            opt.value = ev;
            opt.textContent = ev;
            elSelectEvento.appendChild(opt);
        });

        if (eventosOrdenados.includes(valorAnterior)) {
            elSelectEvento.value = valorAnterior;
        } else {
            elSelectEvento.value = 'TODOS';
            estadoApp.eventoSelecionado = 'TODOS';
        }
    }

    window.selecionarMunicipioPeloMapa = (nomeMunicipio) => {
        const info = DataProcessor.resolverMunicipioERedec(nomeMunicipio, '');
        if (!info || !info.municipio) return;

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

    function aplicarFiltros(moverCameraMapa = true) {
        const baseModulo = estadoApp.bancoPorModulo[estadoApp.moduloAtivo] || [];

        const tsInicio = estadoApp.dataInicioISO ? new Date(`${estadoApp.dataInicioISO}T00:00:00`).getTime() : null;
        const tsFim = estadoApp.dataFimISO ? new Date(`${estadoApp.dataFimISO}T23:59:59`).getTime() : null;
        const buscaNorm = DataProcessor.normalizarChave(estadoApp.termoBusca);

        estadoApp.registrosFiltrados = baseModulo.filter(item => {
            if (tsInicio && (!item.timestamp || item.timestamp < tsInicio)) return false;
            if (tsFim && (!item.timestamp || item.timestamp > tsFim)) return false;

            if (estadoApp.redecSelecionada !== 'TODAS' && item.redec !== estadoApp.redecSelecionada) return false;
            if (estadoApp.municipioSelecionado !== 'TODOS' && item.municipio !== estadoApp.municipioSelecionado) return false;
            if (estadoApp.eventoSelecionado !== 'TODOS' && item.tipoPuro.trim() !== estadoApp.eventoSelecionado) return false;

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
            elMapFilterStatus.textContent = `Visão Regional: ${estadoApp.redecSelecionada}`;
        } else {
            elMapFilterStatus.textContent = 'Visão Estadual: Todas as REDECs (92 Municípios)';
        }
    }

    function atualizarKPIs() {
        const lista = estadoApp.registrosFiltrados;
        const setMunicipios = new Set();
        const contagemRedec = {};

        lista.forEach(item => {
            if (item.municipio && item.municipio !== 'Não Informado') setMunicipios.add(item.municipio);
            // Conta apenas REDECs oficiais válidas (REDEC 1 até REDEC 11)
            if (item.redec && item.redec.startsWith('REDEC ')) {
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
        // Limita estritamente a contagem a no máximo 11 regionais
        document.getElementById('kpi-redecs').textContent = Math.min(11, Object.keys(contagemRedec).length);
        document.getElementById('kpi-top-redec').textContent = topRedecNome;
        document.getElementById('kpi-top-redec-qtd').textContent = `${topRedecQtd} ocorrência(s)`;
    }

    function atualizarGraficoRedecs() {
        const container = document.getElementById('redec-bars-container');
        if (!container) return;

        const contagem = {};
        LISTA_REDECS_RJ.forEach(r => { contagem[r] = 0; });

        estadoApp.registrosFiltrados.forEach(item => {
            if (contagem[item.redec] !== undefined) contagem[item.redec]++;
        });

        const ranking = Object.entries(contagem).sort((a, b) => {
            const numA = parseInt(a[0].replace(/\D/g, '')) || 0;
            const numB = parseInt(b[0].replace(/\D/g, '')) || 0;
            return numA - numB;
        });

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

        thead.innerHTML = `<tr><th>Data</th><th>Município</th><th>REDEC</th><th>Descrição / Evento</th></tr>`;

        const totalPaginas = Math.max(1, Math.ceil(total / CONFIG.ITENS_POR_PAGINA));
        if (estadoApp.paginaAtual > totalPaginas) estadoApp.paginaAtual = totalPaginas;

        const inicio = (estadoApp.paginaAtual - 1) * CONFIG.ITENS_POR_PAGINA;
        const fim = inicio + CONFIG.ITENS_POR_PAGINA;
        const paginaItens = estadoApp.registrosFiltrados.slice(inicio, fim);

        tbody.innerHTML = '';
        if (paginaItens.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:22px; color:#64748b;">Nenhum registro encontrado.</td></tr>`;
        } else {
            paginaItens.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${item.data || '-'}</td><td><strong>${item.municipio}</strong></td><td>${item.redec.replace('REDEC ', '')}</td><td title="${item.evento}">${item.evento}</td>`;
                tr.addEventListener('click', () => {
                    if (item.municipio && item.municipio !== 'Não Informado') window.selecionarMunicipioPeloMapa(item.municipio);
                });
                tbody.appendChild(tr);
            });
        }

        pageInfo.textContent = `Página ${estadoApp.paginaAtual} de ${totalPaginas}`;
        btnPrev.disabled = estadoApp.paginaAtual <= 1;
        btnNext.disabled = estadoApp.paginaAtual >= totalPaginas;
    }

    function registrarEventosUI() {
        elSelectRedec.addEventListener('change', (e) => {
            estadoApp.redecSelecionada = e.target.value;
            estadoApp.municipioSelecionado = 'TODOS';
            popularSelectMunicipios(estadoApp.redecSelecionada);
            estadoApp.paginaAtual = 1;
            aplicarFiltros(true);
        });

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

        elSelectEvento.addEventListener('change', (e) => {
            estadoApp.eventoSelecionado = e.target.value;
            estadoApp.paginaAtual = 1;
            aplicarFiltros(false);
        });

        elInputBusca.addEventListener('input', (e) => {
            estadoApp.termoBusca = e.target.value;
            estadoApp.paginaAtual = 1;
            aplicarFiltros(false);
        });

        document.querySelectorAll('.btn-period').forEach(btn => {
            btn.addEventListener('click', () => { definirAtalhoPeriodo(btn.dataset.period); });
        });

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

        document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
            estadoApp.redecSelecionada = 'TODAS';
            estadoApp.municipioSelecionado = 'TODOS';
            estadoApp.eventoSelecionado = 'TODOS';
            estadoApp.termoBusca = '';
            elSelectRedec.value = 'TODAS';
            popularSelectMunicipios('TODAS');
            elSelectEvento.value = 'TODOS';
            elInputBusca.value = '';
            definirAtalhoPeriodo('tudo');
            MapaController.enquadrarEstadoRJ(true);
        });

        document.getElementById('btn-reset-map').addEventListener('click', () => {
            MapaController.enquadrarEstadoRJ(true);
        });

        elBtnSync.addEventListener('click', () => { sincronizarComAPI(false); });

        document.getElementById('btn-prev-page').addEventListener('click', () => {
            if (estadoApp.paginaAtual > 1) { estadoApp.paginaAtual--; atualizarTabela(); }
        });

        document.getElementById('btn-next-page').addEventListener('click', () => {
            estadoApp.paginaAtual++;
            atualizarTabela();
        });
    }
});
