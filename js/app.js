/* =========================================================================
   APLICAÇÃO: CONTROLE DE ABAS, FILTROS, KPIS E TABELA
   ========================================================================= */

let abaAtiva = "SISGEO";
let todosRegistros = [];
let filtrados = [];
let pagina = 1;
const porPagina = 8;

window.addEventListener("DOMContentLoaded", () => {
  atualizarMunicipiosEscopo();
  renderizarBotoesNavegacao();
  configurarEventosGerais();
  initMap();
  carregarModulo(abaAtiva);

  document.getElementById("btnResetMap").addEventListener("click", () => {
    redecAtiva = "ALL";
    const sel = document.getElementById("filtroRedec");
    if (sel) sel.value = "TODAS";
    filtrar();
  });

  setInterval(() => {
    sincronizarAba(abaAtiva, true);
  }, INTERVALO_AUTO_SYNC_MS);
});

function tratarErroLogo(img) {
  img.parentElement.innerHTML = '<span style="font-size:24px;">🛡️</span>';
}

function renderizarBotoesNavegacao() {
  const container = document.getElementById("containerNavTabs");
  container.innerHTML = "";
  Object.entries(CONFIG_MODULOS).forEach(([nomeAba, conf]) => {
    if (!conf.ativo) return;
    const btn = document.createElement("button");
    btn.className = `tab-btn ${nomeAba === abaAtiva ? 'active' : ''}`;
    btn.textContent = conf.rotulo || nomeAba;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      abaAtiva = nomeAba;
      redecAtiva = "ALL";
      carregarModulo(nomeAba);
    });
    container.appendChild(btn);
  });
}

function configurarEventosGerais() {
  document.getElementById("btnSync").addEventListener("click", () => sincronizarAba(abaAtiva, false));
  
  const dIni = document.getElementById("dataInicio");
  const dFim = document.getElementById("dataFim");
  dIni.addEventListener("input", () => { desmarcarPresets(); filtrar(); });
  dFim.addEventListener("input", () => { desmarcarPresets(); filtrar(); });
  dIni.addEventListener("change", () => { desmarcarPresets(); filtrar(); });
  dFim.addEventListener("change", () => { desmarcarPresets(); filtrar(); });

  document.querySelectorAll(".btn-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-preset").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      aplicarPresetPeriodo(btn.dataset.preset);
    });
  });

  document.getElementById("btnAnt").addEventListener("click", () => {
    if (pagina > 1) { pagina--; renderizarTabela(); }
  });
  document.getElementById("btnProx").addEventListener("click", () => {
    const totalPags = Math.ceil(filtrados.length / porPagina) || 1;
    if (pagina < totalPags) { pagina++; renderizarTabela(); }
  });
}

function desmarcarPresets() {
  document.querySelectorAll(".btn-preset").forEach(b => b.classList.remove("active"));
}

function aplicarPresetPeriodo(tipo) {
  const dIni = document.getElementById("dataInicio");
  const dFim = document.getElementById("dataFim");
  const hoje = new Date();
  const formatIso = (d) => d.toISOString().substring(0, 10);

  if (tipo === "hoje") {
    dIni.value = formatIso(hoje); dFim.value = formatIso(hoje);
  } else if (tipo === "7d") {
    const pass = new Date(); pass.setDate(hoje.getDate() - 7);
    dIni.value = formatIso(pass); dFim.value = formatIso(hoje);
  } else if (tipo === "30d") {
    const pass = new Date(); pass.setDate(hoje.getDate() - 30);
    dIni.value = formatIso(pass); dFim.value = formatIso(hoje);
  } else if (tipo === "mes") {
    const prim = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    dIni.value = formatIso(prim); dFim.value = formatIso(hoje);
  } else if (tipo === "tudo") {
    definirLimitesDatasIniciais();
  }
  filtrar();
}

function carregarModulo(nomeAba) {
  const conf = CONFIG_MODULOS[nomeAba] || { tipo: "generico", temPeriodo: false };
  
  document.getElementById("barraPeriodo").style.display = conf.temPeriodo ? "flex" : "none";
  document.getElementById("tabelaTituloAba").textContent = conf.rotulo || nomeAba;

  const cacheData = localStorage.getItem("cache_aba_" + nomeAba);
  const cacheTime = localStorage.getItem("time_aba_" + nomeAba);

  if (cacheData) {
    try {
      todosRegistros = JSON.parse(cacheData);
      atualizarStatusConexao("online", `${conf.rotulo || nomeAba} (Cache)`);
      montarEstruturaModulo(conf.tipo);
      if (conf.temPeriodo) definirLimitesDatasIniciais();
      filtrar();
    } catch (e) {
      console.error("Erro no cache:", e);
    }
  }

  sincronizarAba(nomeAba, false);
}

async function sincronizarAba(nomeAba, isBackground) {
  const conf = CONFIG_MODULOS[nomeAba] || { tipo: "generico" };
  const syncBtn = document.getElementById("btnSync");

  if (!isBackground) {
    syncBtn.classList.add("spinning");
    atualizarStatusConexao("syncing", `Carregando ${conf.rotulo || nomeAba}...`);
  }

  try {
    const urlFetch = `${CONFIG_URL_PLANILHA}?aba=${encodeURIComponent(nomeAba)}&t=${Date.now()}`;
    const resp = await fetch(urlFetch);
    const json = await resp.json();

    if (json && json.data) {
      const dadosPadronizados = json.data.map(r => padronizarLinha(r, conf.tipo));
      todosRegistros = dadosPadronizados;
      localStorage.setItem("cache_aba_" + nomeAba, JSON.stringify(dadosPadronizados));
      localStorage.setItem("time_aba_" + nomeAba, new Date().toISOString());

      montarEstruturaModulo(conf.tipo);
      if (conf.temPeriodo) definirLimitesDatasIniciais();
      filtrar();
      atualizarStatusConexao("online", `${conf.rotulo || nomeAba} atualizado (${dadosPadronizados.length} registros)`);
    }
  } catch (err) {
    console.error("Erro:", err);
    atualizarStatusConexao(todosRegistros.length > 0 ? "syncing" : "offline", "Erro de Conexão");
  } finally {
    syncBtn.classList.remove("spinning");
  }
}

function atualizarStatusConexao(tipo, texto) {
  document.getElementById("statusDot").className = "dot " + tipo;
  document.getElementById("statusText").textContent = texto;
  document.getElementById("subHeaderStatus").textContent = texto;
}

function montarEstruturaModulo(tipo) {
  const cKPIs = document.getElementById("containerKPIs");
  const cFiltros = document.getElementById("containerFiltros");
  const cGraficos = document.getElementById("containerGraficos");

  cKPIs.innerHTML = ""; cFiltros.innerHTML = ""; cGraficos.innerHTML = "";

  if (tipo === "sisgeo") {
    cKPIs.innerHTML = `
      <div class="kpi-card" style="border-left: 3px solid var(--orange);"><div class="kpi-label">Ocorrências SISGEO</div><div class="kpi-val" id="kpiSisTotal">-</div><div class="kpi-sub">Total de chamados</div></div>
      <div class="kpi-card" style="border-left: 3px solid var(--blue);"><div class="kpi-label" style="color:var(--blue);">Municípios Afetados</div><div class="kpi-val" id="kpiSisMuns" style="color:var(--blue);">-</div><div class="kpi-sub">Cidades atendidas</div></div>
      <div class="kpi-card" style="border-left: 3px solid var(--green);"><div class="kpi-label" style="color:var(--green);">Georreferenciados</div><div class="kpi-val" id="kpiSisCoords" style="color:var(--green);">-</div><div class="kpi-sub">Pontos no mapa</div></div>
      <div class="kpi-card" style="border-left: 3px solid var(--purple);"><div class="kpi-label" style="color:var(--purple);">Epicentro Municipal</div><div class="kpi-val" id="kpiSisTopMun" style="font-size:15px; color:var(--purple);">-</div><div class="kpi-sub" id="kpiSisTopMunSub">Maior volume</div></div>
    `;

    cFiltros.innerHTML = `
      <div class="filter-group"><label>Região (REDEC)</label><select id="filtroRedec"><option value="TODAS">Todas as REDECs</option></select></div>
      <div class="filter-group"><label>Município</label><select id="filtroMun"><option value="TODOS">Todos os Municípios</option></select></div>
      <div class="filter-group"><label>Tipo de Ocorrência</label><select id="filtroTipo"><option value="TODAS">Todos os Tipos</option></select></div>
      <div class="filter-group"><label>Pesquisar</label><input type="text" id="filtroTexto" placeholder="Bairro ou endereço..."></div>
    `;

    cGraficos.innerHTML = `
      <div class="chart-panel"><div class="chart-header"><div class="chart-title">Top Municípios SISGEO</div></div><div id="chartSisgeoMuns"></div></div>
      <div class="chart-panel"><div class="chart-header"><div class="chart-title">Tipologias Principais</div></div><div id="chartSisgeoTipos"></div></div>
    `;
  } else if (tipo === "eventos") {
    cKPIs.innerHTML = `
      <div class="kpi-card" style="border-left: 3px solid var(--orange);"><div class="kpi-label">Ocorrências</div><div class="kpi-val" id="kpiOcorr">-</div><div class="kpi-sub">Total computado</div></div>
      <div class="kpi-card" style="border-left: 3px solid var(--red);"><div class="kpi-label" style="color:var(--red);">Óbitos</div><div class="kpi-val" id="kpiObitos" style="color:var(--red);">-</div><div class="kpi-sub" id="kpiDesap">- desaparecidos</div></div>
      <div class="kpi-card" style="border-left: 3px solid var(--amber);"><div class="kpi-label" style="color:var(--amber);">Desabrigados</div><div class="kpi-val" id="kpiDesab" style="color:var(--amber);">-</div><div class="kpi-sub">Acolhimento público</div></div>
      <div class="kpi-card" style="border-left: 3px solid var(--blue);"><div class="kpi-label" style="color:var(--blue);">Desalojados</div><div class="kpi-val" id="kpiDesal" style="color:var(--blue);">-</div><div class="kpi-sub">Com parentes</div></div>
    `;

    cFiltros.innerHTML = `
      <div class="filter-group"><label>REDEC</label><select id="filtroRedec"><option value="TODAS">Todas</option></select></div>
      <div class="filter-group"><label>Município</label><select id="filtroMun"><option value="TODOS">Todos</option></select></div>
      <div class="filter-group"><label>Tipologia</label><select id="filtroTipo"><option value="TODAS">Todas</option><option value="desliz">Deslizamento</option><option value="inund">Inundação</option><option value="arvore">Árvore</option><option value="desabam">Desabamento</option></select></div>
      <div class="filter-group"><label>Busca Livre</label><input type="text" id="filtroTexto" placeholder="Pesquisar relato..."></div>
    `;

    cGraficos.innerHTML = `
      <div class="chart-panel"><div class="chart-header"><div class="chart-title">Ocorrências por REDEC</div></div><div id="chartRedecBarras"></div></div>
      <div class="chart-panel"><div class="chart-header"><div class="chart-title">Desalojados por REDEC</div></div><div id="chartDanosBarras"></div></div>
    `;
  }

  popularDropdownsModulo(tipo);
  anexarEventosModulo();
}

function popularDropdownsModulo(tipo) {
  const selRedec = document.getElementById("filtroRedec");
  const selMun = document.getElementById("filtroMun");
  const selTipo = document.getElementById("filtroTipo");

  if (selRedec) {
    const redecs = [...new Set(Object.values(MAPA_REDECS_RJ))].sort();
    redecs.forEach(r => selRedec.innerHTML += `<option value="${r}">${r}</option>`);
  }
  if (selMun) {
    const muns = Object.keys(MAPA_REDECS_RJ).sort((a,b) => a.localeCompare(b, "pt-BR"));
    muns.forEach(m => selMun.innerHTML += `<option value="${m}">${m}</option>`);
  }
  if (selTipo && tipo === "sisgeo") {
    const tipos = [...new Set(todosRegistros.map(r => r.tipo).filter(Boolean))].sort();
    tipos.forEach(t => selTipo.innerHTML += `<option value="${t}">${t}</option>`);
  }
}

function anexarEventosModulo() {
  const inputs = document.querySelectorAll("#containerFiltros select, #containerFiltros input");
  inputs.forEach(el => {
    el.addEventListener("change", () => {
      if (el.id === "filtroRedec") {
        redecAtiva = el.value;
      }
      filtrar();
    });
    el.addEventListener("input", filtrar);
  });
}

function definirLimitesDatasIniciais() {
  const datas = todosRegistros.map(r => r.d_iso).filter(Boolean).sort();
  if (datas.length === 0) return;

  const dIni = document.getElementById("dataInicio");
  const dFim = document.getElementById("dataFim");
  dIni.min = datas[0]; dIni.max = datas[datas.length - 1];
  dFim.min = datas[0]; dFim.max = datas[datas.length - 1];
  dIni.value = datas[0]; dFim.value = datas[datas.length - 1];
}

function filtrar() {
  const conf = CONFIG_MODULOS[abaAtiva] || { tipo: "generico", temPeriodo: false };
  const tipo = conf.tipo;

  const dtIni = document.getElementById("dataInicio").value;
  const dtFim = document.getElementById("dataFim").value;
  const fTexto = normalizarTexto(document.getElementById("filtroTexto")?.value);
  const fRedec = document.getElementById("filtroRedec")?.value;
  const fMun = document.getElementById("filtroMun")?.value;
  const fTipo = document.getElementById("filtroTipo")?.value;

  filtrados = todosRegistros.filter(item => {
    if (conf.temPeriodo && item.d_iso) {
      if (dtIni && item.d_iso < dtIni) return false;
      if (dtFim && item.d_iso > dtFim) return false;
    }

    if (fRedec && fRedec !== "TODAS") {
      if (normalizarTexto(item.r) !== normalizarTexto(fRedec)) return false;
    }
    if (fMun && fMun !== "TODOS") {
      if (normalizarTexto(item.m) !== normalizarTexto(fMun)) return false;
    }

    if (tipo === "sisgeo") {
      if (fTipo && fTipo !== "TODAS" && item.tipo !== fTipo) return false;
      if (fTexto && !normalizarTexto(`${item.m} ${item.bairro} ${item.endereco} ${item.tipo} ${item.subtipo}`).includes(fTexto)) return false;
    } else if (tipo === "eventos") {
      if (fTipo === "desliz" && !(item.dz > 0)) return false;
      if (fTipo === "inund" && !(item.in > 0)) return false;
      if (fTipo === "arvore" && !(item.ar > 0)) return false;
      if (fTipo === "desabam" && !(item.es > 0)) return false;
      if (fTexto && !normalizarTexto(`${item.r} ${item.m} ${item.desc} ${item.dc}`).includes(fTexto)) return false;
    }

    return true;
  });

  if (conf.temPeriodo && dtIni && dtFim) {
    document.getElementById("periodoResumoLabel").textContent = `Exibindo: ${formatarParaDDMMAAAA(dtIni)} até ${formatarParaDDMMAAAA(dtFim)} (${filtrados.length} registros)`;
  }

  atualizarKPIs(tipo);
  atualizarGraficos(tipo);
  atualizarCamadasMapa();
  pagina = 1;
  renderizarTabela();
}

function atualizarKPIs(tipo) {
  if (tipo === "sisgeo") {
    const total = filtrados.length;
    const munsSet = new Set(filtrados.map(i => i.m).filter(m => m && !m.includes("NÃO INFORMADO")));
    const comCoords = filtrados.filter(i => i.tem_coords).length;

    const contMun = {};
    filtrados.forEach(i => { if (i.m) contMun[i.m] = (contMun[i.m] || 0) + 1; });
    const topMunSort = Object.entries(contMun).sort((a, b) => b[1] - a[1]);
    const topNome = topMunSort.length > 0 ? topMunSort[0][0] : "-";
    const topQtd = topMunSort.length > 0 ? topMunSort[0][1] : 0;

    document.getElementById("kpiSisTotal").textContent = Number(total).toLocaleString('pt-BR');
    document.getElementById("kpiSisMuns").textContent = munsSet.size;
    document.getElementById("kpiSisCoords").textContent = `${Number(comCoords).toLocaleString('pt-BR')} (${total > 0 ? Math.round((comCoords/total)*100) : 0}%)`;
    document.getElementById("kpiSisTopMun").textContent = topNome;
    document.getElementById("kpiSisTopMunSub").textContent = `${topQtd} chamados`;
  } else if (tipo === "eventos") {
    const sum = (fn) => filtrados.reduce((a, b) => a + (fn(b) || 0), 0);
    document.getElementById("kpiOcorr").textContent = Number(sum(b => b.o)).toLocaleString('pt-BR');
    document.getElementById("kpiObitos").textContent = Number(sum(b => b.ob)).toLocaleString('pt-BR');
    document.getElementById("kpiDesab").textContent = Number(sum(b => b.db)).toLocaleString('pt-BR');
    document.getElementById("kpiDesal").textContent = Number(sum(b => b.dl)).toLocaleString('pt-BR');
  }
}

function atualizarGraficos(tipo) {
  if (tipo === "sisgeo") {
    const munMap = {}, tipoMap = {};
    filtrados.forEach(i => {
      if (i.m && !i.m.includes("NÃO INFORMADO")) munMap[i.m] = (munMap[i.m] || 0) + 1;
      if (i.tipo) tipoMap[i.tipo] = (tipoMap[i.tipo] || 0) + 1;
    });

    renderizarBarraGenerica("chartSisgeoMuns", munMap, "var(--orange)", "chamados");
    renderizarBarraGenerica("chartSisgeoTipos", tipoMap, "var(--blue)", "chamados");
  } else if (tipo === "eventos") {
    const redecMap = {}, danosMap = {};
    filtrados.forEach(i => {
      if (!i.r || i.r.includes("ESTADUAL")) return;
      redecMap[i.r] = (redecMap[i.r] || 0) + (i.o || 1);
      danosMap[i.r] = (danosMap[i.r] || 0) + (i.dl || 0);
    });
    renderizarBarraGenerica("chartRedecBarras", redecMap, "var(--orange)");
    renderizarBarraGenerica("chartDanosBarras", danosMap, "var(--blue)", "pessoas");
  }
}

function renderizarBarraGenerica(elemId, dataMap, cor, sufixo = "") {
  const el = document.getElementById(elemId);
  if (!el) return;
  el.innerHTML = "";
  const sorted = Object.entries(dataMap).sort((a, b) => b[1] - a[1]);
  const maxVal = sorted.length > 0 ? sorted[0][1] : 1;

  if (sorted.length === 0) {
    el.innerHTML = `<div style="font-size:10.5px; color:var(--text-muted); padding:6px 0;">Sem registros.</div>`;
    return;
  }

  sorted.slice(0, 6).forEach(([label, val]) => {
    const perc = Math.round((val / maxVal) * 100);
    el.innerHTML += `
      <div class="bar-row">
        <div class="bar-label-line">
          <span style="font-weight:600; color:#cbd5e1;">${label}</span>
          <span style="font-weight:700; color:#fff;">${Number(val).toLocaleString('pt-BR')} ${sufixo}</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${perc}%; background:${cor};"></div></div>
      </div>`;
  });
}

function renderizarTabela() {
  const conf = CONFIG_MODULOS[abaAtiva] || { tipo: "generico" };
  const tipo = conf.tipo;
  const thead = document.getElementById("tabelaCabecalho");
  const tbody = document.getElementById("tabelaCorpo");
  thead.innerHTML = ""; tbody.innerHTML = "";

  const total = filtrados.length;
  const totalPags = Math.ceil(total / porPagina) || 1;
  document.getElementById("tabelaContador").textContent = `${total} registro(s)`;
  document.getElementById("pageTxt").textContent = `Pág. ${pagina} / ${totalPags}`;
  document.getElementById("btnAnt").disabled = (pagina <= 1);
  document.getElementById("btnProx").disabled = (pagina >= totalPags);

  if (total === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">Nenhum registro encontrado.</td></tr>`;
    return;
  }

  const inicio = (pagina - 1) * porPagina;
  const itens = filtrados.slice(inicio, inicio + porPagina);

  if (tipo === "sisgeo") {
    thead.innerHTML = `
      <tr>
        <th>Data/Hora</th>
        <th>Município</th>
        <th>Tipologia</th>
        <th style="min-width:160px;">Endereço</th>
        <th>Viatura</th>
        <th style="text-align:center;">GPS</th>
      </tr>`;

    itens.forEach(i => {
      tbody.innerHTML += `
        <tr>
          <td style="white-space:nowrap; font-family:monospace; color:var(--text-muted);">
            <div style="color:#cbd5e1; font-weight:600;">${i.d_fmt}</div>
            <div style="font-size:10px;">${i.h}</div>
          </td>
          <td style="white-space:nowrap;">
            <div style="font-weight:700; color:#fff;">${i.m}</div>
            <div style="font-size:10px; color:var(--text-muted);">${i.bairro || '-'}</div>
          </td>
          <td>
            <span class="badge badge-arvore">${i.tipo}</span>
            <div style="color:var(--text-muted); font-size:10px;">${i.subtipo || ''}</div>
          </td>
          <td style="color:var(--text-muted); font-size:10px;">${i.endereco || '-'}</td>
          <td style="white-space:nowrap; font-family:monospace; color:#38bdf8;">${i.viatura || '-'}</td>
          <td style="text-align:center;">${i.tem_coords ? `<span class="badge badge-ativo">OK</span>` : `<span class="badge" style="background:#334155; color:#94a3b8;">-</span>`}</td>
        </tr>`;
    });
  }
}
