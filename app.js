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
    { sku: "RAC-001", nome: "Exclusive Fish 3kg", marca: "Royal Canin", pesoKg: 3, precoVenda: 29.9, stockMin: 3, stockAtual: 12, alerta: "OK" },
    { sku: "RAC-002", nome: "Junior 12kg", marca: "Royal Canin", pesoKg: 12, precoVenda: 79.9, stockMin: 2, stockAtual: 4, alerta: "OK" },
    { sku: "RAC-003", nome: "Fish 12kg", marca: "Royal Canin", pesoKg: 12, precoVenda: 74.9, stockMin: 2, stockAtual: 1, alerta: "BAIXO" },
    { sku: "RAC-004", nome: "Duck 12kg", marca: "Royal Canin", pesoKg: 12, precoVenda: 79.9, stockMin: 2, stockAtual: 3, alerta: "OK" },
    { sku: "RAC-005", nome: "Natsbi", marca: "Natsbi", pesoKg: 15, precoVenda: 89.9, stockMin: 1, stockAtual: 0, alerta: "BAIXO" },
  ],
  movimentos: [
    { data: "2024-01-02", tipo: "ENTRADA", motivo: "COMPRA", sku: "RAC-001", qtd: 10, custo: 20, precoVenda: null },
    { data: "2024-01-10", tipo: "SAÍDA", motivo: "VENDA", sku: "RAC-001", qtd: 2, custo: null, precoVenda: 29.9 },
    { data: "2024-01-15", tipo: "SAÍDA", motivo: "VENDA", sku: "RAC-005", qtd: 2, custo: null, precoVenda: 89.9 },
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
    <span></span>
    <span></span>
    <span></span>
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
  `;
  return el;
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
      fetch(`${API_BASE}/racoes`).then((r) => r.json()),
      fetch(`${API_BASE}/movimentos`).then((r) => r.json()),
      fetch(`${API_BASE}/dashboard`).then((r) => r.json()),
    ]);

    state.racoes = racoes.map((r) => ({
      sku: r.sku,
      nome: r.nome,
      marca: r.marca,
      pesoKg: r.peso_kg,
      precoVenda: r.preco_venda,
      stockMin: r.stock_minimo,
      stockAtual: r.stock_atual,
      alerta: r.alerta,
    }));

    state.movimentos = movimentos.map((m) => ({
      data: m.data_movimento,
      tipo: m.tipo,
      motivo: m.motivo,
      sku: m.sku,
      qtd: m.qtd_sacos,
      custo: m.custo_unitario,
      precoVenda: m.preco_venda_unitario,
    }));

    state.metrics = {
      valorStock: metrics.valor_em_stock,
      totalCompras: metrics.total_compras,
      totalVendas: metrics.total_vendas,
      lucro: metrics.lucro_estimado,
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
    { label: "Peso (kg)", name: "pesoKg", type: "number" },
    { label: "Preço venda (€)", name: "precoVenda", type: "number" },
    { label: "Stock mínimo", name: "stockMin", type: "number" },
    { label: "Ativo", name: "ativo", type: "select", options: ["SIM", "NÃO"] },
  ], (data) => {
    console.log("TODO: enviar para API", data);
    closeModal();
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
  ], (data) => {
    console.log("TODO: enviar para API", data);
    closeModal();
  });
});

loadData();
