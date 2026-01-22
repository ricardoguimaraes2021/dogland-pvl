const state = {
  racoes: [],
  movimentos: [],
  metrics: {
    valorStock: 0,
    totalCompras: 0,
    totalVendas: 0,
    lucro: 0,
    lastUpdated: null,
  },
};

const API_BASE = "https://dimgrey-cattle-295935.hostingersite.com/api";

const fmtCurrency = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const fmtDate = (iso) => new Date(iso).toLocaleDateString("pt-PT");

const byId = (id) => document.getElementById(id);

const ui = {
  valorStock: byId("kpi-valor-stock"),
  totalVendas: byId("kpi-total-vendas"),
  lucro: byId("kpi-lucro"),
  cardValorStock: byId("card-valor-stock"),
  cardTotalCompras: byId("card-total-compras"),
  cardTotalVendas: byId("card-total-vendas"),
  cardLucro: byId("card-lucro"),
  lastUpdated: byId("last-updated"),
  restockTable: byId("restock-table"),
  racoesTable: byId("racoes-table"),
  movimentosTable: byId("movimentos-table"),
  modal: byId("modal-form"),
  modalTitle: byId("modal-title"),
  modalBody: byId("modal-body"),
  modalClose: byId("modal-close"),
  btnNovaRacao: byId("btn-nova-racao"),
  btnNovoMovimento: byId("btn-novo-movimento"),
};

const sampleData = {
  racoes: [
    { id: 1, sku: "RAC-001", nome: "Exclusive Fish 3kg", marca: "Royal Canin", pesoKg: 3, precoVenda: 29.9, stockMin: 3, stockAtual: 12, alerta: "OK" },
    { id: 2, sku: "RAC-002", nome: "Junior 12kg", marca: "Royal Canin", pesoKg: 12, precoVenda: 79.9, stockMin: 2, stockAtual: 4, alerta: "OK" },
    { id: 3, sku: "RAC-003", nome: "Fish 12kg", marca: "Royal Canin", pesoKg: 12, precoVenda: 74.9, stockMin: 2, stockAtual: 1, alerta: "BAIXO" },
    { id: 4, sku: "RAC-004", nome: "Duck 12kg", marca: "Royal Canin", pesoKg: 12, precoVenda: 79.9, stockMin: 2, stockAtual: 3, alerta: "OK" },
    { id: 5, sku: "RAC-005", nome: "Natsbi", marca: "Natsbi", pesoKg: 15, precoVenda: 89.9, stockMin: 1, stockAtual: 0, alerta: "BAIXO" },
  ],
  movimentos: [
    { id: 1, data: "2024-01-02", tipo: "ENTRADA", motivo: "COMPRA", sku: "RAC-001", qtd: 10, custo: 20, precoVenda: null, observacoes: "Stock inicial" },
    { id: 2, data: "2024-01-10", tipo: "SAÍDA", motivo: "VENDA", sku: "RAC-001", qtd: 2, custo: null, precoVenda: 29.9, observacoes: "" },
    { id: 3, data: "2024-01-15", tipo: "SAÍDA", motivo: "VENDA", sku: "RAC-005", qtd: 2, custo: null, precoVenda: 89.9, observacoes: "" },
  ],
  metrics: {
    valorStock: 1245.5,
    totalCompras: 890.0,
    totalVendas: 489.6,
    lucro: 142.2,
    lastUpdated: new Date().toISOString(),
  },
};

function setMetrics(metrics) {
  ui.valorStock.textContent = fmtCurrency.format(metrics.valorStock || 0);
  ui.totalVendas.textContent = fmtCurrency.format(metrics.totalVendas || 0);
  ui.lucro.textContent = fmtCurrency.format(metrics.lucro || 0);
  ui.cardValorStock.textContent = fmtCurrency.format(metrics.valorStock || 0);
  ui.cardTotalCompras.textContent = fmtCurrency.format(metrics.totalCompras || 0);
  ui.cardTotalVendas.textContent = fmtCurrency.format(metrics.totalVendas || 0);
  ui.cardLucro.textContent = fmtCurrency.format(metrics.lucro || 0);
  ui.lastUpdated.textContent = metrics.lastUpdated ? fmtDate(metrics.lastUpdated) : "--";
}

function renderTable(container, rows, templateFn) {
  const header = container.querySelector(".table__row--header");
  container.innerHTML = "";
  if (header) container.appendChild(header);
  rows.forEach((row) => container.appendChild(templateFn(row)));
}

function restockRow(row) {
  const el = document.createElement("div");
  el.className = "table__row";
  el.innerHTML = `
    <span>${row.sku}</span>
    <span>${row.nome}</span>
    <span>${row.stockAtual}</span>
    <span>${row.stockMin}</span>
  `;
  return el;
}

function racaoRow(row) {
  const el = document.createElement("div");
  el.className = "table__row";
  el.innerHTML = `
    <span>${row.sku}</span>
    <span>${row.nome}</span>
    <span>${row.marca}</span>
    <span>${row.pesoKg} kg</span>
    <span>${fmtCurrency.format(row.precoVenda)}</span>
    <span>${row.stockAtual}</span>
    <span class="pill" style="background:${row.alerta === "BAIXO" ? "rgba(231,76,60,0.15)" : "rgba(39,174,96,0.15)"};color:${row.alerta === "BAIXO" ? "#c0392b" : "#1e8449"}">${row.alerta}</span>
    <span class="actions">
      <button class="btn btn--ghost btn--sm" data-action="edit" data-id="${row.id}">Editar</button>
      <button class="btn btn--ghost btn--sm" data-action="delete" data-id="${row.id}">Apagar</button>
    </span>
  `;
  return el;
}

function movimentoRow(row) {
  const el = document.createElement("div");
  el.className = "table__row";
  el.innerHTML = `
    <span>${fmtDate(row.data)}</span>
    <span>${row.tipo}</span>
    <span>${row.motivo}</span>
    <span>${row.sku}</span>
    <span>${row.qtd}</span>
    <span>${row.custo ? fmtCurrency.format(row.custo) : "—"}</span>
    <span>${row.precoVenda ? fmtCurrency.format(row.precoVenda) : "—"}</span>
    <span class="actions">
      <button class="btn btn--ghost btn--sm" data-action="edit-mov" data-id="${row.id}">Editar</button>
      <button class="btn btn--ghost btn--sm" data-action="delete-mov" data-id="${row.id}">Apagar</button>
    </span>
  `;
  return el;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || "Erro ao comunicar com a API";
    throw new Error(message);
  }
  return data;
}

async function loadData() {
  if (!API_BASE) {
    state.racoes = sampleData.racoes;
    state.movimentos = sampleData.movimentos;
    state.metrics = sampleData.metrics;
    render();
    return;
  }

  try {
    const [racoes, movimentos, metrics] = await Promise.all([
      apiRequest("/racoes"),
      apiRequest("/movimentos"),
      apiRequest("/dashboard"),
    ]);

    state.racoes = racoes.map((r) => ({
      id: r.id,
      sku: r.sku,
      nome: r.nome,
      marca: r.marca,
      pesoKg: Number(r.peso_kg || 0),
      precoVenda: Number(r.preco_venda || 0),
      stockMin: Number(r.stock_minimo || 0),
      stockAtual: Number(r.stock_atual || 0),
      alerta: r.alerta,
      fornecedor: r.fornecedor || "",
      variante: r.variante || "",
      ativo: r.ativo,
    }));

    state.movimentos = movimentos.map((m) => ({
      id: m.id,
      data: m.data_movimento,
      tipo: m.tipo,
      motivo: m.motivo,
      sku: m.sku,
      qtd: Number(m.qtd_sacos || 0),
      custo: m.custo_unitario === null ? null : Number(m.custo_unitario),
      precoVenda: m.preco_venda_unitario === null ? null : Number(m.preco_venda_unitario),
      observacoes: m.observacoes || "",
    }));

    state.metrics = {
      valorStock: Number(metrics.valor_em_stock || 0),
      totalCompras: Number(metrics.total_compras || 0),
      totalVendas: Number(metrics.total_vendas || 0),
      lucro: Number(metrics.lucro_estimado || 0),
      lastUpdated: metrics.last_updated,
    };
  } catch (err) {
    console.error("Falha ao carregar API, usando dados locais", err);
    state.racoes = sampleData.racoes;
    state.movimentos = sampleData.movimentos;
    state.metrics = sampleData.metrics;
  }

  render();
}

function render() {
  setMetrics(state.metrics);
  const restock = state.racoes.filter((r) => r.alerta === "BAIXO");
  renderTable(ui.restockTable, restock, restockRow);
  renderTable(ui.racoesTable, state.racoes, racaoRow);
  renderTable(ui.movimentosTable, state.movimentos, movimentoRow);
}

function openModal(title, fields, onSubmit) {
  ui.modalTitle.textContent = title;
  ui.modalBody.innerHTML = "";
  fields.forEach((field) => {
    const wrapper = document.createElement("div");
    wrapper.className = "field";
    const label = document.createElement("label");
    label.textContent = field.label;
    const input = field.type === "select" ? document.createElement("select") : document.createElement("input");
    input.name = field.name;
    input.required = field.required ?? true;
    if (field.type !== "select") input.type = field.type || "text";
    if (field.options) {
      field.options.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        input.appendChild(option);
      });
    }
    if (field.value !== undefined) {
      input.value = field.value;
    }
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    ui.modalBody.appendChild(wrapper);
  });

  const submit = document.createElement("button");
  submit.className = "btn btn--primary";
  submit.textContent = "Guardar";
  submit.type = "submit";
  ui.modalBody.appendChild(submit);

  ui.modalBody.onsubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(ui.modalBody);
    onSubmit(Object.fromEntries(formData.entries()));
  };

  ui.modal.classList.add("is-open");
}

function closeModal() {
  ui.modal.classList.remove("is-open");
}

ui.modalClose.addEventListener("click", closeModal);
ui.modal.addEventListener("click", (event) => {
  if (event.target === ui.modal) closeModal();
});

document.querySelectorAll("[data-scroll]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = document.querySelector(btn.dataset.scroll);
    if (target) target.scrollIntoView({ behavior: "smooth" });
  });
});

ui.btnNovaRacao.addEventListener("click", () => {
  openModal("Nova ração", [
    { label: "SKU", name: "sku" },
    { label: "Nome", name: "nome" },
    { label: "Marca", name: "marca" },
    { label: "Variante/Sabor", name: "variante", required: false },
    { label: "Peso (kg)", name: "pesoKg", type: "number" },
    { label: "Fornecedor", name: "fornecedor", required: false },
    { label: "Preço venda (€)", name: "precoVenda", type: "number" },
    { label: "Stock mínimo", name: "stockMin", type: "number" },
    { label: "Ativo", name: "ativo", type: "select", options: ["SIM", "NÃO"] },
  ], (data) => {
    if (!data.sku || !data.nome || !data.marca) {
      alert("Preenche SKU, Nome e Marca.");
      return;
    }
    apiRequest("/racoes", {
      method: "POST",
      body: JSON.stringify({
        sku: data.sku,
        nome: data.nome,
        marca: data.marca,
        variante: data.variante || null,
        pesoKg: Number(data.pesoKg || 0),
        fornecedor: data.fornecedor || null,
        precoVenda: Number(data.precoVenda || 0),
        stockMin: Number(data.stockMin || 0),
        ativo: data.ativo,
      }),
    })
      .then(() => loadData())
      .then(() => closeModal())
      .catch((err) => alert(err.message));
  });
});

ui.btnNovoMovimento.addEventListener("click", () => {
  openModal("Novo movimento", [
    { label: "Data", name: "data", type: "date" },
    { label: "Tipo", name: "tipo", type: "select", options: ["ENTRADA", "SAÍDA"] },
    { label: "Motivo", name: "motivo", type: "select", options: ["COMPRA", "VENDA", "CONSUMO_CASA", "AJUSTE"] },
    { label: "SKU", name: "sku" },
    { label: "Quantidade", name: "qtd", type: "number" },
    { label: "Custo unitário (€)", name: "custo", type: "number", required: false },
    { label: "Preço venda (€)", name: "precoVenda", type: "number", required: false },
    { label: "Observações", name: "observacoes", required: false },
  ], (data) => {
    if (!data.data || !data.sku || !data.qtd) {
      alert("Preenche Data, SKU e Quantidade.");
      return;
    }
    if (Number(data.qtd) <= 0) {
      alert("Quantidade deve ser maior que zero.");
      return;
    }
    if (data.tipo === "ENTRADA" && data.motivo === "COMPRA" && !data.custo) {
      alert("Custo unitário é obrigatório para compras.");
      return;
    }
    if (data.tipo === "SAÍDA" && data.motivo === "VENDA" && !data.precoVenda) {
      alert("Preço de venda é obrigatório para vendas.");
      return;
    }
    apiRequest("/movimentos", {
      method: "POST",
      body: JSON.stringify({
        data: data.data,
        tipo: data.tipo,
        motivo: data.motivo,
        sku: data.sku,
        qtd: Number(data.qtd || 0),
        custo: data.custo ? Number(data.custo) : null,
        precoVenda: data.precoVenda ? Number(data.precoVenda) : null,
        observacoes: data.observacoes || null,
      }),
    })
      .then(() => loadData())
      .then(() => closeModal())
      .catch((err) => alert(err.message));
  });
});

ui.racoesTable.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const id = Number(button.dataset.id);
  const racao = state.racoes.find((r) => r.id === id);
  if (!racao) return;

  if (action === "delete") {
    if (!confirm(`Apagar a ração ${racao.nome}?`)) return;
    apiRequest(`/racoes/${id}`, { method: "DELETE" })
      .then(() => loadData())
      .catch((err) => alert(err.message));
    return;
  }

  if (action === "edit") {
    openModal("Editar ração", [
      { label: "SKU", name: "sku", value: racao.sku },
      { label: "Nome", name: "nome", value: racao.nome },
      { label: "Marca", name: "marca", value: racao.marca },
      { label: "Variante/Sabor", name: "variante", required: false, value: racao.variante },
      { label: "Peso (kg)", name: "pesoKg", type: "number", value: racao.pesoKg },
      { label: "Fornecedor", name: "fornecedor", required: false, value: racao.fornecedor },
      { label: "Preço venda (€)", name: "precoVenda", type: "number", value: racao.precoVenda },
      { label: "Stock mínimo", name: "stockMin", type: "number", value: racao.stockMin },
      { label: "Ativo", name: "ativo", type: "select", options: ["SIM", "NÃO"], value: racao.ativo },
    ], (data) => {
      if (!data.sku || !data.nome || !data.marca) {
        alert("Preenche SKU, Nome e Marca.");
        return;
      }
      apiRequest(`/racoes/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          sku: data.sku,
          nome: data.nome,
          marca: data.marca,
          variante: data.variante || null,
          pesoKg: Number(data.pesoKg || 0),
          fornecedor: data.fornecedor || null,
          precoVenda: Number(data.precoVenda || 0),
          stockMin: Number(data.stockMin || 0),
          ativo: data.ativo,
        }),
      })
        .then(() => loadData())
        .then(() => closeModal())
        .catch((err) => alert(err.message));
    });
  }
});

ui.movimentosTable.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const id = Number(button.dataset.id);
  const movimento = state.movimentos.find((m) => m.id === id);
  if (!movimento) return;

  if (action === "delete-mov") {
    if (!confirm("Apagar este movimento?")) return;
    apiRequest(`/movimentos/${id}`, { method: "DELETE" })
      .then(() => loadData())
      .catch((err) => alert(err.message));
    return;
  }

  if (action === "edit-mov") {
    openModal("Editar movimento", [
      { label: "Data", name: "data", type: "date", value: movimento.data },
      { label: "Tipo", name: "tipo", type: "select", options: ["ENTRADA", "SAÍDA"], value: movimento.tipo },
      { label: "Motivo", name: "motivo", type: "select", options: ["COMPRA", "VENDA", "CONSUMO_CASA", "AJUSTE"], value: movimento.motivo },
      { label: "SKU", name: "sku", value: movimento.sku },
      { label: "Quantidade", name: "qtd", type: "number", value: movimento.qtd },
      { label: "Custo unitário (€)", name: "custo", type: "number", required: false, value: movimento.custo ?? "" },
      { label: "Preço venda (€)", name: "precoVenda", type: "number", required: false, value: movimento.precoVenda ?? "" },
      { label: "Observações", name: "observacoes", required: false, value: movimento.observacoes },
    ], (data) => {
      if (!data.data || !data.sku || !data.qtd) {
        alert("Preenche Data, SKU e Quantidade.");
        return;
      }
      if (Number(data.qtd) <= 0) {
        alert("Quantidade deve ser maior que zero.");
        return;
      }
      if (data.tipo === "ENTRADA" && data.motivo === "COMPRA" && !data.custo) {
        alert("Custo unitário é obrigatório para compras.");
        return;
      }
      if (data.tipo === "SAÍDA" && data.motivo === "VENDA" && !data.precoVenda) {
        alert("Preço de venda é obrigatório para vendas.");
        return;
      }
      apiRequest(`/movimentos/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          data: data.data,
          tipo: data.tipo,
          motivo: data.motivo,
          sku: data.sku,
          qtd: Number(data.qtd || 0),
          custo: data.custo ? Number(data.custo) : null,
          precoVenda: data.precoVenda ? Number(data.precoVenda) : null,
          observacoes: data.observacoes || null,
        }),
      })
        .then(() => loadData())
        .then(() => closeModal())
        .catch((err) => alert(err.message));
    });
  }
});

loadData();
