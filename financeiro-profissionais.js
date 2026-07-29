"use strict";

window.FinanceiroProfissionais = {
  abrirAba
};

function abrirAba(nome){

  if(nome === "resumo"){
    carregarResumoFinanceiroProfissionaisNovo();
    return;
  }

  if(nome === "pagamentos"){
    carregarPagamentosProfissionaisNovo();
    return;
  }

  if(nome === "vales"){
    carregarValesProfissionaisNovo();
    return;
  }

  if(nome === "extrato"){
    carregarExtratoFinanceiroProfissionaisNovo();
  }

}


/* =========================================================
   UTILITÁRIOS
========================================================= */

function financeiroFormatarMoeda(valor){

  return Number(valor || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );

}


function financeiroFormatarData(data){

  if(!data){
    return "-";
  }

  const partes = String(data).split("-");

  if(partes.length !== 3){
    return data;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;

}


function financeiroDataLocalISO(data){

  const ano = data.getFullYear();

  const mes = String(
    data.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    data.getDate()
  ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;

}


function financeiroPrimeiroDiaMes(){

  const hoje = new Date();

  return financeiroDataLocalISO(
    new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      1
    )
  );

}


function financeiroUltimoDiaMes(){

  const hoje = new Date();

  return financeiroDataLocalISO(
    new Date(
      hoje.getFullYear(),
      hoje.getMonth() + 1,
      0
    )
  );

}


function financeiroEscaparHTML(valor){

  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function financeiroNormalizarStatus(valor){

  return String(valor || "")
    .trim()
    .toLowerCase();
}


function financeiroMostrarErro(area, mensagem){

  if(!area){
    return;
  }

  area.innerHTML = `
    <div
      class="card"
      style="
        padding:20px;
        border-left:4px solid #b42318;
      "
    >
      <strong>Não foi possível carregar.</strong>

      <p style="margin:8px 0 0;">
        ${financeiroEscaparHTML(mensagem)}
      </p>
    </div>
  `;

}


/* =========================================================
   RESUMO
========================================================= */

async function carregarResumoFinanceiroProfissionaisNovo(){

  const area =
    document.getElementById(
      "conteudoFinanceiroProfissionais"
    );

  if(!area){
    return;
  }

  area.innerHTML = `
    <div class="card">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          gap:15px;
          flex-wrap:wrap;
        "
      >

        <div>
          <h2 style="margin:0 0 5px;">
            Resumo financeiro
          </h2>

          <p style="margin:0;">
            Comissões, vales e saldo dos profissionais.
          </p>
        </div>

        <div
          style="
            display:flex;
            align-items:flex-end;
            gap:10px;
            flex-wrap:wrap;
          "
        >

          <div>
            <label
              for="financeiroResumoDataInicio"
              style="
                display:block;
                margin-bottom:5px;
                font-size:13px;
              "
            >
              Data inicial
            </label>

            <input
              id="financeiroResumoDataInicio"
              type="date"
              value="${financeiroPrimeiroDiaMes()}"
            >
          </div>

          <div>
            <label
              for="financeiroResumoDataFim"
              style="
                display:block;
                margin-bottom:5px;
                font-size:13px;
              "
            >
              Data final
            </label>

            <input
              id="financeiroResumoDataFim"
              type="date"
              value="${financeiroUltimoDiaMes()}"
            >
          </div>

          <button
            type="button"
            class="principal"
            onclick="FinanceiroProfissionais.atualizarResumo()"
          >
            Atualizar
          </button>

        </div>

      </div>

      <div
        id="totaisGeraisFinanceiroProfissionais"
        style="margin-top:22px;"
      >
      </div>

      <div
        id="cardsResumoFinanceiro"
        style="
          display:grid;
          grid-template-columns:repeat(
            auto-fill,
            minmax(310px, 1fr)
          );
          gap:16px;
          margin-top:20px;
        "
      >
        Carregando...
      </div>

    </div>
  `;

  await atualizarResumoFinanceiroProfissionais();

}


window.FinanceiroProfissionais.atualizarResumo =
  atualizarResumoFinanceiroProfissionais;


async function atualizarResumoFinanceiroProfissionais(){

  const container =
    document.getElementById(
      "cardsResumoFinanceiro"
    );

  const areaTotais =
    document.getElementById(
      "totaisGeraisFinanceiroProfissionais"
    );

  if(!container){
    return;
  }

  const dataInicio =
    document.getElementById(
      "financeiroResumoDataInicio"
    )?.value;

  const dataFim =
    document.getElementById(
      "financeiroResumoDataFim"
    )?.value;

  if(!dataInicio || !dataFim){

    alert(
      "Informe a data inicial e a data final."
    );

    return;
  }

  if(dataInicio > dataFim){

    alert(
      "A data inicial não pode ser maior que a data final."
    );

    return;
  }

  container.innerHTML = `
    <div class="card">
      Calculando comissões...
    </div>
  `;

  if(areaTotais){
    areaTotais.innerHTML = "";
  }

  try{

    const profissionais =
      await obterProfissionais();

    const profissionaisAtivos =
      (profissionais || [])
        .filter(
          profissional =>
            profissional.ativo !== false
        )
        .sort(
          (a, b) =>
            String(a.nome || "")
              .localeCompare(
                String(b.nome || ""),
                "pt-BR"
              )
        );

    const {
      data: comandas,
      error: erroComandas
    } =
      await supabaseClient
        .from("comandas")
        .select(
          `
            id,
            profissional_id,
            data,
            status,
            cancelada
          `
        )
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .or(
          "cancelada.eq.false,cancelada.is.null"
        );

    if(erroComandas){
      throw erroComandas;
    }

const comandasValidas =
  (comandas || []).filter(comanda => {

    if(comanda.cancelada === true){
      return false;
    }

    const status =
      financeiroNormalizarStatus(
        comanda.status
      );
return ![
  "",
  "aberta",
  "aberto",
  "pendente",
  "cancelada",
  "cancelado"
].includes(status);

  });

const idsComandas =
  comandasValidas.map(
    comanda => comanda.id
  );

    let itens = [];

    if(idsComandas.length > 0){

      const {
        data: itensRecebidos,
        error: erroItens
      } =
        await supabaseClient
          .from("comanda_itens")
          .select(
            `
              id,
              comanda_id,
              profissional_id,
              descricao,
              valor,
              comissao_percentual
            `
          )
          .in(
            "comanda_id",
            idsComandas
          );

      if(erroItens){
        throw erroItens;
      }

     const idsBloqueados = new Set();

      itens =
        (itensRecebidos || []).filter(
          item =>
            !idsBloqueados.has(
              String(item.id)
            )
        );

    }

    const {
      data: vales,
      error: erroVales
    } =
      await supabaseClient
        .from("profissionais_vales")
        .select(
          `
            id,
            profissional_id,
            data_vale,
            valor,
            descricao,
            status,
            pagamento_comissao_id
          `
        )
        .lte("data_vale", dataFim);

    if(erroVales){
      throw erroVales;
    }

    const {
      data: pagamentos,
      error: erroPagamentos
    } =
      await supabaseClient
        .from("comissoes_pagamentos")
        .select(
          `
            id,
            profissional_id,
            data_inicio,
            data_fim,
            data_pagamento,
            saldo_resultante,
            status,
            created_at
          `
        )
        .order(
          "data_pagamento",
          {
            ascending: false
          }
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if(erroPagamentos){
      throw erroPagamentos;
    }

    const mapaComandas = {};

  comandasValidas.forEach(
      comanda => {

        mapaComandas[comanda.id] =
          comanda;

      }
    );

    const comissoesPorProfissional = {};

    itens.forEach(item => {

      const comanda =
        mapaComandas[item.comanda_id];

      if(!comanda){
        return;
      }

      const profissionalId =
        item.profissional_id ||
        comanda.profissional_id;

      if(!profissionalId){
        return;
      }

      const valor =
        Number(item.valor || 0);

      const percentual =
        Number(item.comissao_percentual || 0);

      const comissao =
        valor * percentual / 100;

      if(
        !comissoesPorProfissional[
          profissionalId
        ]
      ){

        comissoesPorProfissional[
          profissionalId
        ] = {
          valor: 0,
          quantidade: 0
        };

      }

      comissoesPorProfissional[
        profissionalId
      ].valor += comissao;

      comissoesPorProfissional[
        profissionalId
      ].quantidade += 1;

    });

    const valesPorProfissional = {};

    (vales || []).forEach(vale => {

      const status =
        financeiroNormalizarStatus(
          vale.status
        );

      const valeAberto =
        status === "aberto" ||
        status === "pendente";

      if(
        !valeAberto ||
        vale.pagamento_comissao_id
      ){
        return;
      }

      const profissionalId =
        vale.profissional_id;

      if(!profissionalId){
        return;
      }

      if(
        !valesPorProfissional[
          profissionalId
        ]
      ){

        valesPorProfissional[
          profissionalId
        ] = {
          valor: 0,
          quantidade: 0
        };

      }

      valesPorProfissional[
        profissionalId
      ].valor +=
        Number(vale.valor || 0);

      valesPorProfissional[
        profissionalId
      ].quantidade += 1;

    });

    const ultimoPagamentoPorProfissional =
      {};

    (pagamentos || []).forEach(
      pagamento => {

        const status =
          financeiroNormalizarStatus(
            pagamento.status
          );

        if(
          status === "cancelado" ||
          status === "cancelada"
        ){
          return;
        }

        const profissionalId =
          pagamento.profissional_id;

        if(
          profissionalId &&
          !ultimoPagamentoPorProfissional[
            profissionalId
          ]
        ){

          ultimoPagamentoPorProfissional[
            profissionalId
          ] = pagamento;

        }

      }
    );

    let totalComissoes = 0;
    let totalVales = 0;
    let totalSaldos = 0;
    let totalPagar = 0;

    const cards =
      profissionaisAtivos.map(
        profissional => {

          const dadosComissao =
            comissoesPorProfissional[
              profissional.id
            ] || {
              valor: 0,
              quantidade: 0
            };

          const dadosVales =
            valesPorProfissional[
              profissional.id
            ] || {
              valor: 0,
              quantidade: 0
            };

          const ultimoPagamento =
            ultimoPagamentoPorProfissional[
              profissional.id
            ];

         const saldoAnterior = 0;

          const comissao =
            Number(
              dadosComissao.valor || 0
            );

          const totalValesProfissional =
            Number(
              dadosVales.valor || 0
            );

          const totalDevido =
            comissao +
            saldoAnterior -
            totalValesProfissional;

          totalComissoes += comissao;

          totalVales +=
            totalValesProfissional;

          totalSaldos += saldoAnterior;

          totalPagar += totalDevido;

          const totalNegativo =
            totalDevido < 0;

          return `
           <div
  class="card"
  onclick="
    FinanceiroProfissionais
      .abrirDetalhesPeriodo(
        '${profissional.id}',
        '${dataInicio}',
        '${dataFim}'
      )
  "
  style="
    padding:18px;
    border:1px solid #e5e5e5;
    cursor:pointer;
    transition:0.2s;
  "
  onmouseenter="
    this.style.transform='translateY(-2px)';
    this.style.boxShadow='0 6px 18px rgba(0,0,0,0.10)';
  "
  onmouseleave="
    this.style.transform='none';
    this.style.boxShadow='none';
  "
>

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  align-items:flex-start;
                  gap:10px;
                "
              >

                <div>
                  <h3 style="margin:0;">
                    ${
                      financeiroEscaparHTML(
                        profissional.nome
                      )
                    }
                  </h3>

                  <small>
                    ${
                      dadosComissao.quantidade
                    }
                    item(ns) com comissão
                  </small>
                </div>

                <span
                  style="
                    padding:5px 8px;
                    border-radius:20px;
                    background:#f3f3f3;
                    font-size:12px;
                  "
                >
                  ${
                    financeiroEscaparHTML(
                      profissional
                        .tipo_pagamento ||
                      "semanal"
                    )
                  }
                </span>

              </div>

              <div
                style="
                  border-top:1px solid #ddd;
                  margin:14px 0;
                "
              ></div>

              <div
                style="
                  display:grid;
                  gap:10px;
                "
              >

                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    gap:15px;
                  "
                >
                  <span>Comissão do período</span>

                  <strong>
                    ${
                      financeiroFormatarMoeda(
                        comissao
                      )
                    }
                  </strong>
                </div>

                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    gap:15px;
                  "
                >
                  <span>
                    Vales pendentes
                    ${
                      dadosVales.quantidade > 0
                        ? `(${dadosVales.quantidade})`
                        : ""
                    }
                  </span>

                  <strong>
                    -${
                      financeiroFormatarMoeda(
                        totalValesProfissional
                      )
                    }
                  </strong>
                </div>

                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    gap:15px;
                  "
                >
                  <span>Saldo anterior</span>

                  <strong>
                    ${
                      financeiroFormatarMoeda(
                        saldoAnterior
                      )
                    }
                  </strong>
                </div>

              </div>

              <div
                style="
                  border-top:1px solid #ddd;
                  margin:14px 0;
                "
              ></div>

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  align-items:flex-end;
                  gap:15px;
                "
              >

                <div>
                  <small>Total a pagar</small>

                  <div
                    style="
                      font-size:22px;
                      font-weight:700;
                      margin-top:3px;
                      ${
                        totalNegativo
                          ? "color:#b42318;"
                          : ""
                      }
                    "
                  >
                    ${
                      financeiroFormatarMoeda(
                        totalDevido
                      )
                    }
                  </div>
                </div>

              <button
  type="button"
  onclick="
    event.stopPropagation();

    FinanceiroProfissionais
      .abrirDetalhesPeriodo(
        '${profissional.id}',
        '${dataInicio}',
        '${dataFim}'
      );
  "
>
  Ver detalhes
</button>

              </div>

            </div>
          `;

        }
      ).join("");

    container.innerHTML =
      cards ||
      `
        <div class="card">
          Nenhum profissional ativo encontrado.
        </div>
      `;

    if(areaTotais){

      areaTotais.innerHTML = `
        <div
          style="
            display:grid;
            grid-template-columns:repeat(
              auto-fit,
              minmax(180px, 1fr)
            );
            gap:12px;
          "
        >

          <div
            class="card"
            style="padding:15px;"
          >
            <small>Comissões</small>

            <div
              style="
                font-size:20px;
                font-weight:700;
                margin-top:5px;
              "
            >
              ${
                financeiroFormatarMoeda(
                  totalComissoes
                )
              }
            </div>
          </div>

          <div
            class="card"
            style="padding:15px;"
          >
            <small>Vales pendentes</small>

            <div
              style="
                font-size:20px;
                font-weight:700;
                margin-top:5px;
              "
            >
              -${
                financeiroFormatarMoeda(
                  totalVales
                )
              }
            </div>
          </div>

          <div
            class="card"
            style="padding:15px;"
          >
            <small>Saldos anteriores</small>

            <div
              style="
                font-size:20px;
                  font-weight:700;
                margin-top:5px;
              "
            >
              ${
                financeiroFormatarMoeda(
                  totalSaldos
                )
              }
            </div>
          </div>

          <div
            class="card"
            style="padding:15px;"
          >
            <small>Total previsto</small>
             <div
              style="
                font-size:20px;
                font-weight:700;
                margin-top:5px;
              "
            >
              ${
                financeiroFormatarMoeda(
                  totalPagar
                )
              }
            </div>
          </div>

        </div>
      `;

    }

  }catch(erro){

    console.error(
      "Erro no resumo financeiro:",
      erro
    );

    financeiroMostrarErro(
      container,
      erro?.message ||
      "Erro desconhecido."
    );

  }

}
/* =========================================================
   DETALHES DO PERÍODO
========================================================= */

window.FinanceiroProfissionais.abrirDetalhesPeriodo =
  carregarDetalhesFinanceiroProfissional;


async function carregarDetalhesFinanceiroProfissional(
  profissionalId,
  dataInicio,
  dataFim
){

  const area =
    document.getElementById(
      "conteudoFinanceiroProfissionais"
    );

  if(!area){
    return;
  }

  area.innerHTML = `
    <div class="card">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:15px;
          flex-wrap:wrap;
        "
      >

        <div>
          <h2 style="margin:0;">
            Detalhes do profissional
          </h2>

          <p style="margin:5px 0 0;">
            Carregando serviços realizados...
          </p>
        </div>

        <button
          type="button"
          onclick="
            FinanceiroProfissionais
              .abrirAba('resumo')
          "
        >
          Voltar
        </button>

      </div>

      <div
        id="detalhesFinanceiroProfissional"
        style="margin-top:20px;"
      >
        Carregando...
      </div>

    </div>
  `;

  const resultado =
    document.getElementById(
      "detalhesFinanceiroProfissional"
    );

  try{

    const profissionais =
      await obterProfissionais();

    const profissional =
      (profissionais || []).find(
        item =>
          String(item.id) ===
          String(profissionalId)
      );


    /* =========================
       BUSCAR COMANDAS
    ========================= */

    const {
      data: comandas,
      error: erroComandas
    } =
      await supabaseClient
        .from("comandas")
        .select(`
          id,
          data,
          status,
          cancelada,
          profissional_id,
          cliente_id
        `)
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .or(
          "cancelada.eq.false,cancelada.is.null"
        );

    if(erroComandas){
      throw erroComandas;
    }


    /* =========================
       FILTRAR COMANDAS VÁLIDAS
    ========================= */

    const comandasValidas =
      (comandas || []).filter(comanda => {

        if(comanda.cancelada === true){
          return false;
        }

        const status =
          financeiroNormalizarStatus(
            comanda.status
          );

      return ![
  "",
  "aberta",
  "aberto",
  "pendente",
  "cancelada",
  "cancelado"
].includes(status);

      });


    const mapaComandas = {};

    comandasValidas.forEach(comanda => {

      mapaComandas[comanda.id] =
        comanda;

    });


    const idsComandas =
      comandasValidas.map(
        comanda => comanda.id
      );


    /* =========================
       BUSCAR CLIENTES
    ========================= */

    const idsClientes =
      [
        ...new Set(
          comandasValidas
            .map(
              comanda =>
                comanda.cliente_id
            )
            .filter(Boolean)
        )
      ];


    const mapaClientes = {};


    if(idsClientes.length > 0){

      const {
        data: clientes,
        error: erroClientes
      } =
        await supabaseClient
          .from("clientes")
          .select(`
            id,
            nome
          `)
          .in(
            "id",
            idsClientes
          );

      if(erroClientes){
        throw erroClientes;
      }

      (clientes || []).forEach(cliente => {

        mapaClientes[cliente.id] =
          cliente.nome;

      });

    }


    /* =========================
       BUSCAR ITENS DAS COMANDAS
    ========================= */

    let itens = [];


    if(idsComandas.length > 0){

      const {
        data: itensRecebidos,
        error: erroItens
      } =
        await supabaseClient
          .from("comanda_itens")
          .select(`
            id,
            comanda_id,
            profissional_id,
            descricao,
            valor,
            comissao_percentual
          `)
          .in(
            "comanda_id",
            idsComandas
          );

      if(erroItens){
        throw erroItens;
      }


     const idsBloqueados = new Set();

      itens =
        (itensRecebidos || []).filter(
          item => {

            const comanda =
              mapaComandas[
                item.comanda_id
              ];

           const profissionalItem =
  item.profissional_id ??
  comanda?.profissional_id;

return (
  profissionalItem != null &&
  String(profissionalItem).trim() ===
    String(profissionalId).trim() &&
  !idsBloqueados.has(
    String(item.id)
  )
);

          }
        );

    }


    /* =========================
       CALCULAR TOTAIS
    ========================= */

    let totalServicos = 0;
    let totalComissao = 0;


    const linhas =
      itens.map(item => {

        const comanda =
          mapaComandas[item.comanda_id];

        const nomeCliente =
          mapaClientes[
            comanda?.cliente_id
          ] || "Cliente não informado";

        const valor =
          Number(item.valor || 0);

        const percentual =
          Number(
            item.comissao_percentual || 0
          );

        const valorComissao =
          valor * percentual / 100;

        totalServicos += valor;
        totalComissao += valorComissao;


        return `
          <tr
            style="
              border-top:1px solid #e5e5e5;
            "
          >

            <td style="padding:12px;">
              ${
                financeiroFormatarData(
                  comanda?.data
                )
              }
            </td>

            <td style="padding:12px;">
              ${
                financeiroEscaparHTML(
                  nomeCliente
                )
              }
            </td>

            <td style="padding:12px;">
              ${
                financeiroEscaparHTML(
                  item.descricao ||
                  "Serviço"
                )
              }
            </td>

            <td
              style="
                padding:12px;
                text-align:right;
              "
            >
              ${
                financeiroFormatarMoeda(
                  valor
                )
              }
            </td>

            <td
              style="
                padding:12px;
                text-align:center;
              "
            >
              ${
                percentual.toLocaleString(
                  "pt-BR"
                )
              }%
            </td>

            <td
              style="
                padding:12px;
                text-align:right;
                font-weight:700;
              "
            >
              ${
                financeiroFormatarMoeda(
                  valorComissao
                )
              }
            </td>

          </tr>
        `;

      }).join("");


    /* =========================
       MONTAR TELA
    ========================= */

    resultado.innerHTML = `

      <div
  style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:15px;
    flex-wrap:wrap;
  "
>

  <div>

    <h2 style="margin:0;">
      ${
        financeiroEscaparHTML(
          profissional?.nome ||
          "Profissional"
        )
      }
    </h2>

    <p style="margin:5px 0 0;">
      Período de
      ${
        financeiroFormatarData(
          dataInicio
        )
      }
      até
      ${
        financeiroFormatarData(
          dataFim
        )
      }
    </p>

  </div>

  <button
    type="button"
    class="principal"
    onclick="
      FinanceiroProfissionais
        .abrirPagamentoPeriodo(
          '${profissionalId}',
          '${dataInicio}',
          '${dataFim}'
        )
    "
  >
    Pagar comissão
  </button>

</div>

      <div
        style="
          display:grid;
          grid-template-columns:repeat(
            auto-fit,
            minmax(190px, 1fr)
          );
          gap:12px;
          margin-top:20px;
        "
         >

        <div
          class="card"
          style="padding:16px;"
        >
          <small>
            Serviços realizados
          </small>

          <div
            style="
              font-size:22px;
              font-weight:700;
              margin-top:5px;
            "
          >
            ${itens.length}
          </div>
        </div>


        <div
          class="card"
          style="padding:16px;"
        >
          <small>
            Valor faturado
          </small>

          <div
            style="
              font-size:22px;
              font-weight:700;
              margin-top:5px;
            "
          >
            ${
              financeiroFormatarMoeda(
                totalServicos
              )
            }
          </div>
        </div>


        <div
          class="card"
          style="padding:16px;"
        >
          <small>
            Comissão do período
          </small>

          <div
            style="
              font-size:22px;
              font-weight:700;
              margin-top:5px;
            "
          >
            ${
              financeiroFormatarMoeda(
                totalComissao
              )
            }
          </div>
        </div>

      </div>


      <div
        style="
          overflow-x:auto;
          margin-top:20px;
        "
      >

        ${
          itens.length === 0

            ? `
              <div
                style="
                  padding:30px;
                  text-align:center;
                  border:1px solid #ddd;
                  border-radius:8px;
                "
              >
                Nenhum serviço faturado encontrado neste período.
              </div>
            `

            : `
              <table
                style="
                  width:100%;
                  border-collapse:collapse;
                "
              >

                <thead>

                  <tr>

                    <th
                      style="
                        padding:12px;
                        text-align:left;
                      "
                    >
                      Data
                    </th>

                    <th
                      style="
                        padding:12px;
                        text-align:left;
                      "
                    >
                      Cliente
                    </th>

                    <th
                      style="
                        padding:12px;
                        text-align:left;
                      "
                    >
                      Serviço
                    </th>

                    <th
                      style="
                        padding:12px;
                        text-align:right;
                      "
                    >
                      Valor faturado
                    </th>

                    <th
                      style="
                        padding:12px;
                        text-align:center;
                      "
                    >
                      Comissão
                    </th>

                    <th
                      style="
                        padding:12px;
                        text-align:right;
                      "
                    >
                      Valor da comissão
                    </th>

                  </tr>

                </thead>


                <tbody>

                  ${linhas}

                </tbody>


                <tfoot>

                  <tr
                    style="
                      border-top:2px solid #222;
                    "
                  >

                    <td
                      colspan="3"
                      style="
                        padding:14px 12px;
                        font-weight:700;
                      "
                    >
                      Total
                    </td>

                    <td
                      style="
                        padding:14px 12px;
                        text-align:right;
                        font-weight:700;
                      "
                    >
                      ${
                        financeiroFormatarMoeda(
                          totalServicos
                        )
                      }
                    </td>

                    <td></td>

                    <td
                      style="
                        padding:14px 12px;
                        text-align:right;
                        font-weight:700;
                      "
                    >
                      ${
                        financeiroFormatarMoeda(
                          totalComissao
                        )
                      }
                    </td>

                  </tr>

                </tfoot>

              </table>
            `
        }

      </div>
    `;

  }catch(erro){

    console.error(
      "Erro ao carregar detalhes:",
      erro
    );

    financeiroMostrarErro(
      resultado,
      erro?.message ||
      "Erro desconhecido."
    );

  }

}
/* =========================================================
   PAGAMENTO DE COMISSÃO
========================================================= */

let pagamentoComissaoAtual = null;
let assinaturaCanvas = null;
let assinaturaContexto = null;
let assinaturaDesenhando = false;
let assinaturaPossuiTraco = false;

window.FinanceiroProfissionais.abrirPagamentoPeriodo =
  abrirPagamentoComissaoPeriodo;

window.FinanceiroProfissionais.confirmarPagamentoPeriodo =
  confirmarPagamentoComissaoPeriodo;

window.FinanceiroProfissionais.fecharModalPagamento =
  fecharModalPagamentoComissao;

window.FinanceiroProfissionais.limparAssinatura =
  limparAssinaturaPagamento;

window.FinanceiroProfissionais.visualizarRecibo =
  visualizarReciboComissao;

window.FinanceiroProfissionais.cancelarPagamento =
  cancelarPagamentoComissao;


function financeiroValorInput(valor){

  return Number(valor || 0).toFixed(2);

}


async function obterIdsItensComissaoBloqueados(){

  const { data, error } =
    await supabaseClient
      .from("comissoes_pagamentos_itens")
      .select("comanda_item_id");

  if(error){
    throw error;
  }

  return new Set(
    (data || []).map(item => String(item.comanda_item_id))
  );

}
function garantirModalPagamentoComissao(){

  let modal =
    document.getElementById(
      "modalPagamentoComissaoProfissional"
    );

  if(modal){
    return modal;
  }

  modal = document.createElement("div");

  modal.id =
    "modalPagamentoComissaoProfissional";

  modal.style.cssText = `
    display:none;
    position:fixed;
    inset:0;
    z-index:99999;
    background:rgba(0,0,0,0.48);
    align-items:center;
    justify-content:center;
    padding:20px;
  `;

  modal.innerHTML = `
    <div
      style="
        width:min(760px, 100%);
        max-height:92vh;
        overflow-y:auto;
        background:#fff;
        border-radius:14px;
        padding:24px;
        box-shadow:0 20px 50px rgba(0,0,0,0.25);
      "
    >
      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:15px;
        "
      >
        <div>
          <h2 style="margin:0;">
            Pagamento de comissão
          </h2>

          <p
            id="pagamentoComissaoSubtitulo"
            style="margin:5px 0 0;"
          ></p>
        </div>

        <button
          type="button"
          onclick="
            FinanceiroProfissionais
              .fecharModalPagamento()
          "
        >
          Fechar
        </button>
      </div>

      <div
        id="conteudoPagamentoComissao"
        style="margin-top:22px;"
      >
        Carregando...
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  return modal;

}


function fecharModalPagamentoComissao(){

  const modal =
    document.getElementById(
      "modalPagamentoComissaoProfissional"
    );

  if(modal){
    modal.style.display = "none";
  }

  pagamentoComissaoAtual = null;
  assinaturaCanvas = null;
  assinaturaContexto = null;
  assinaturaDesenhando = false;
  assinaturaPossuiTraco = false;

}


function prepararCanvasAssinatura(){

  assinaturaCanvas =
    document.getElementById(
      "pagamentoComissaoAssinaturaCanvas"
    );

  if(!assinaturaCanvas){
    return;
  }

  const proporcao =
    window.devicePixelRatio || 1;

  const largura =
    assinaturaCanvas.clientWidth || 600;

  const altura = 180;

  assinaturaCanvas.width =
    Math.floor(largura * proporcao);

  assinaturaCanvas.height =
    Math.floor(altura * proporcao);

  assinaturaCanvas.style.height =
    `${altura}px`;

  assinaturaContexto =
    assinaturaCanvas.getContext("2d");

  assinaturaContexto.scale(
    proporcao,
    proporcao
  );

  assinaturaContexto.lineWidth = 2;
  assinaturaContexto.lineCap = "round";
  assinaturaContexto.lineJoin = "round";
  assinaturaContexto.strokeStyle = "#111";

  assinaturaPossuiTraco = false;

  const obterPosicao = evento => {

    const retangulo =
      assinaturaCanvas
        .getBoundingClientRect();

    const toque =
      evento.touches?.[0] ||
      evento.changedTouches?.[0];

    const clienteX =
      toque?.clientX ??
      evento.clientX;

    const clienteY =
      toque?.clientY ??
      evento.clientY;

    return {
      x: clienteX - retangulo.left,
      y: clienteY - retangulo.top
    };

  };

  const iniciar = evento => {

    evento.preventDefault();

    assinaturaDesenhando = true;

    const ponto = obterPosicao(evento);

    assinaturaContexto.beginPath();

    assinaturaContexto.moveTo(
      ponto.x,
      ponto.y
    );

  };

  const desenhar = evento => {

    if(!assinaturaDesenhando){
      return;
    }

    evento.preventDefault();
const ponto = obterPosicao(evento);

    assinaturaContexto.lineTo(
      ponto.x,
      ponto.y
    );

    assinaturaContexto.stroke();

    assinaturaPossuiTraco = true;

  };

  const finalizar = evento => {

    if(evento){
      evento.preventDefault();
    }

    assinaturaDesenhando = false;

  };

  assinaturaCanvas.onmousedown = iniciar;
  assinaturaCanvas.onmousemove = desenhar;
  assinaturaCanvas.onmouseup = finalizar;
  assinaturaCanvas.onmouseleave = finalizar;

  assinaturaCanvas.ontouchstart = iniciar;
  assinaturaCanvas.ontouchmove = desenhar;
  assinaturaCanvas.ontouchend = finalizar;

}


function limparAssinaturaPagamento(){

  if(
    !assinaturaCanvas ||
    !assinaturaContexto
  ){
    return;
  }

  assinaturaContexto.clearRect(
    0,
    0,
    assinaturaCanvas.width,
    assinaturaCanvas.height
  );

  assinaturaPossuiTraco = false;

}


async function abrirPagamentoComissaoPeriodo(
  profissionalId,
  dataInicio,
  dataFim
){

  const modal =
    garantirModalPagamentoComissao();

  const conteudo =
    document.getElementById(
      "conteudoPagamentoComissao"
       );

  const subtitulo =
    document.getElementById(
      "pagamentoComissaoSubtitulo"
    );

  modal.style.display = "flex";

  conteudo.innerHTML =
    "Calculando fechamento...";

  try{

    const profissionais =
      await obterProfissionais();

    const profissional =
      (profissionais || []).find(
        item =>
          String(item.id) ===
          String(profissionalId)
      );

    if(!profissional){
      throw new Error(
        "Profissional não encontrado."
      );
    }


    const {
      data: pagamentosExistentes,
      error: erroPagamentoExistente
    } =
      await supabaseClient
        .from("comissoes_pagamentos")
        .select(`
          id,
          status,
          valor_pago
        `)
        .eq(
          "profissional_id",
          profissionalId
        )
        .eq(
          "data_inicio",
          dataInicio
        )
        .eq(
          "data_fim",
          dataFim
        );

    if(erroPagamentoExistente){
      throw erroPagamentoExistente;
    }

    const pagamentoAtivo =
      (pagamentosExistentes || []).find(
        pagamento => {

          const status =
            financeiroNormalizarStatus(
              pagamento.status
            );

          return ![
            "cancelado",
            "cancelada"
          ].includes(status);

        }
      );

    if(pagamentoAtivo){

      throw new Error(
        "Esse período já possui um pagamento registrado para esta profissional."
      );

    }


    const {
      data: comandas,
      error: erroComandas
    } =
      await supabaseClient
        .from("comandas")
        .select(`
          id,
          profissional_id,
          data,
          status,
          cancelada
        `)
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .or(
          "cancelada.eq.false,cancelada.is.null"
        );

    if(erroComandas){
      throw erroComandas;
    }

    const comandasValidas =
      (comandas || []).filter(comanda => {

        if(comanda.cancelada === true){
          return false;
        }

        const status =
          financeiroNormalizarStatus(
            comanda.status
          );
return ![
  "",
  "aberta",
  "aberto",
  "pendente",
  "cancelada",
  "cancelado"
].includes(status);

      });

    const mapaComandas = {};

    comandasValidas.forEach(comanda => {

      mapaComandas[comanda.id] =
        comanda;

    });

    const idsComandas =
      comandasValidas.map(
        comanda => comanda.id
      );

    const idsBloqueados = new Set();

    let itensProfissional = [];

    if(idsComandas.length > 0){

      const {
        data: itens,
        error: erroItens
      } =
        await supabaseClient
          .from("comanda_itens")
          .select(`
            id,
            comanda_id,
            profissional_id,
            descricao,
            valor,
            comissao_percentual
          `)
          .in(
            "comanda_id",
            idsComandas
          );

      if(erroItens){
        throw erroItens;
      }

      itensProfissional =
        (itens || []).filter(item => {

          const comanda =
            mapaComandas[
              item.comanda_id
            ];

          const profissionalItem =
  item.profissional_id ??
  comanda?.profissional_id;

return (
  profissionalItem != null &&
  String(profissionalItem).trim() ===
    String(profissionalId).trim() &&
  !idsBloqueados.has(
    String(item.id)
  )
);
        });

    }

    if(itensProfissional.length === 0){

      throw new Error(
        "Não existem serviços pendentes de comissão neste período."
      );

    }


    const comissaoPeriodo =
      itensProfissional.reduce(
        (total, item) => {

          const valor =
            Number(item.valor || 0);

          const percentual =
            Number(
              item.comissao_percentual || 0
            );

          return (
            total +
            valor * percentual / 100
          );

        },
        0
      );


    const {
      data: ultimoPagamento,
      error: erroUltimoPagamento
    } =
      await supabaseClient
        .from("comissoes_pagamentos")
        .select(`
          id,
          saldo_resultante,
          data_fim,
          status
        `)
        .eq(
          "profissional_id",
          profissionalId
        )
        .lt(
          "data_fim",
          dataInicio
        )
        .order(
          "data_fim",
          {
            ascending: false
          }
        )
        .limit(10);

    if(erroUltimoPagamento){
      throw erroUltimoPagamento;
    }

    const pagamentoAnterior =
      (ultimoPagamento || []).find(
        pagamento => {

          const status =
            financeiroNormalizarStatus(
              pagamento.status
            );

          return ![
            "cancelado",
            "cancelada"
          ].includes(status);

        }
      );

 const saldoAnterior = 0;


    const {
      data: vales,
      error: erroVales
    } =
      await supabaseClient
        .from("profissionais_vales")
        .select(`
          id,
          profissional_id,
          data_vale,
          valor,
          descricao,
          status,
          pagamento_comissao_id
        `)
       .eq(
  "profissional_id",
  profissionalId
)
.gte(
  "data_vale",
  dataInicio
)
.lte(
  "data_vale",
  dataFim
)
        .is(
          "pagamento_comissao_id",
          null
        );

    if(erroVales){
      throw erroVales;
    }

    const valesPendentes =
      (vales || []).filter(vale => {

        const status =
          financeiroNormalizarStatus(
            vale.status
          );

        return (
          status === "aberto" ||
          status === "pendente" ||
          !status
        );

      });

    const totalVales =
      valesPendentes.reduce(
        (total, vale) =>
          total +
          Number(vale.valor || 0),
        0
      );

 const totalDevido =
  comissaoPeriodo +
  saldoAnterior -
  totalVales;


    pagamentoComissaoAtual = {
      profissionalId,
      profissionalNome:
        profissional.nome,
      unidadeId:
        profissional.unidade_id || null,
      dataInicio,
      dataFim,
      comissaoPeriodo,
      saldoAnterior,
      totalVales,
      totalDevido,
      valesIds:
        valesPendentes.map(
          vale => vale.id
        ),
      itensIds:
        itensProfissional.map(
          item => item.id
        )
    };


    subtitulo.textContent =
      `${profissional.nome} — ${
        financeiroFormatarData(
          dataInicio
        )
      } até ${
        financeiroFormatarData(
          dataFim
        )
      }`;


    conteudo.innerHTML = `

      <div
        style="
          display:grid;
          gap:12px;
          padding:18px;
          border:1px solid #e5e5e5;
          border-radius:10px;
        "
      >
        <div
          style="
            display:flex;
            justify-content:space-between;
            gap:15px;
          "
        >
          <span>
            Comissão do período
            (${itensProfissional.length} serviço(s))
          </span>

          <strong>
            ${
              financeiroFormatarMoeda(
                comissaoPeriodo
              )
            }
          </strong>
        </div>

        <div
          style="
            display:flex;
            justify-content:space-between;
            gap:15px;
          "
        >
          <span>Saldo anterior</span>

          <strong>
            ${
              financeiroFormatarMoeda(
                saldoAnterior
              )
            }
          </strong>
        </div>

        <div
          style="
            display:flex;
            justify-content:space-between;
            gap:15px;
          "
        >
          <span>
             Vales descontados
            ${
              valesPendentes.length > 0
                ? `(${valesPendentes.length})`
                : ""
            }
          </span>

          <strong>
            -${
              financeiroFormatarMoeda(
                totalVales
              )
            }
          </strong>
        </div>

        <div
          style="
            border-top:2px solid #222;
            padding-top:13px;
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:15px;
          "
        >
          <strong>Total líquido</strong>

          <strong
            style="
              font-size:23px;
              ${
                totalDevido < 0
                  ? "color:#b42318;"
                  : ""
              }
            "
          >
            ${
              financeiroFormatarMoeda(
                totalDevido
              )
            }
          </strong>
        </div>
      </div>


      <div
        style="
          display:grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(220px, 1fr)
            );
          gap:15px;
          margin-top:20px;
        "
      >
        <div>
          <label
            for="pagamentoComissaoValorPago"
            style="
              display:block;
              margin-bottom:6px;
              font-weight:600;
            "
          >
            Valor pago
          </label>

          <input
            id="pagamentoComissaoValorPago"
            type="number"
            min="0"
            step="0.01"
            value="${
              financeiroValorInput(
                Math.max(
                  totalDevido,
                  0
                )
              )
            }"
            style="width:100%;"
          >
        </div>

        <div>
          <label
            for="pagamentoComissaoData"
            style="
              display:block;
              margin-bottom:6px;
              font-weight:600;
            "
          >
            Data do pagamento
          </label>

          <input
            id="pagamentoComissaoData"
            type="date"
            value="${
              financeiroDataLocalISO(
                new Date()
              )
            }"
            style="width:100%;"
          >
        </div>
      </div>


      <div style="margin-top:15px;">
        <label
          for="pagamentoComissaoObservacoes"
          style="
            display:block;
            margin-bottom:6px;
            font-weight:600;
          "
        >
          Observações
        </label>

        <textarea
          id="pagamentoComissaoObservacoes"
          rows="3"
          style="
            width:100%;
            resize:vertical;
          "
          placeholder="Observação opcional"
        ></textarea>
      </div>


      <div style="margin-top:18px;">
        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
            margin-bottom:7px;
          "
        >
          <label style="font-weight:600;">
            Assinatura da profissional
          </label>

          <button
            type="button"
            onclick="
              FinanceiroProfissionais
                .limparAssinatura()
            "
          >
            Limpar assinatura
          </button>
        </div>

        <canvas
          id="pagamentoComissaoAssinaturaCanvas"
          style="
            display:block;
            width:100%;
            height:180px;
            border:1px solid #bbb;
            border-radius:8px;
            background:#fff;
            touch-action:none;
            cursor:crosshair;
          "
        ></canvas>

        <small
          style="
            display:block;
            margin-top:6px;
          "
        >
          Assine usando o mouse ou o dedo.
        </small>
      </div>


      <div style="margin-top:15px;">
        <label
          for="pagamentoComissaoAssinaturaNome"
          style="
            display:block;
            margin-bottom:6px;
            font-weight:600;
          "
        >
          Nome da profissional
        </label>

        <input
          id="pagamentoComissaoAssinaturaNome"
          type="text"
          value="${
            financeiroEscaparHTML(
              profissional.nome
            )
          }"
          style="width:100%;"
        >

        <label
          style="
            display:flex;
            align-items:flex-start;
            gap:9px;
            margin-top:12px;
            cursor:pointer;
          "
        >
          <input
            id="pagamentoComissaoConfirmarAssinatura"
            type="checkbox"
            style="margin-top:3px;"
          >

          <span>
            Confirmo que os valores foram conferidos e que o pagamento foi realizado.
          </span>
        </label>
      </div>


      <div
        style="
          display:flex;
          justify-content:flex-end;
          gap:10px;
          margin-top:22px;
        "
      >
        <button
          type="button"
          onclick="
            FinanceiroProfissionais
              .fecharModalPagamento()
          "
        >
          Cancelar
        </button>

        <button
          id="botaoConfirmarPagamentoComissao"
          type="button"
          class="principal"
          onclick="
            FinanceiroProfissionais
              .confirmarPagamentoPeriodo()
          "
        >
          Finalizar pagamento
        </button>
      </div>
    `;

    requestAnimationFrame(
      prepararCanvasAssinatura
    );

  }catch(erro){

    console.error(
      "Erro ao abrir pagamento:",
      erro
    );

    financeiroMostrarErro(
      conteudo,
      erro?.message ||
      "Erro desconhecido."
    );

  }

}


async function confirmarPagamentoComissaoPeriodo(){

  if(!pagamentoComissaoAtual){

    alert(
      "Os dados do pagamento não foram carregados."
    );

    return;
  }

  const valorPago =
    Number(
      document.getElementById(
        "pagamentoComissaoValorPago"
      )?.value || 0
    );

  const dataPagamento =
    document.getElementById(
      "pagamentoComissaoData"
    )?.value;

  const observacoes =
    document.getElementById(
      "pagamentoComissaoObservacoes"
    )?.value?.trim() || null;

  const assinaturaNome =
    document.getElementById(
      "pagamentoComissaoAssinaturaNome"
    )?.value?.trim();

  const assinaturaConfirmada =
    document.getElementById(
      "pagamentoComissaoConfirmarAssinatura"
    )?.checked;

  const botao =
    document.getElementById(
      "botaoConfirmarPagamentoComissao"
    );

  if(
    !Number.isFinite(valorPago) ||
    valorPago < 0
  ){

    alert(
      "Informe um valor pago válido."
    );

    return;
  }

  if(!dataPagamento){

    alert(
      "Informe a data do pagamento."
    );

    return;
  }

  if(!assinaturaNome){

    alert(
      "Informe o nome da profissional."
    );

    return;
  }

  if(!assinaturaPossuiTraco){

    alert(
      "A profissional precisa assinar no campo indicado."
    );

    return;
  }

  if(!assinaturaConfirmada){

    alert(
      "Confirme a conferência e a realização do pagamento."
    );

    return;
  }

  const saldoResultante =
    Number(
      pagamentoComissaoAtual
        .totalDevido
    ) - valorPago;

  const assinaturaImagem =
    assinaturaCanvas
      .toDataURL("image/png");

  if(botao){

    botao.disabled = true;
    botao.textContent =
      "Finalizando...";

  }

  let pagamentoCriadoId = null;

  try{

    const {
      data: duplicados,
      error: erroDuplicados
    } =
      await supabaseClient
        .from("comissoes_pagamentos_itens")
        .select("comanda_item_id")
        .in(
          "comanda_item_id",
          pagamentoComissaoAtual.itensIds
        );

    if(erroDuplicados){
      throw erroDuplicados;
    }

    if((duplicados || []).length > 0){

      throw new Error(
        "Um ou mais serviços deste período já foram incluídos em outro pagamento. Atualize a tela e tente novamente."
      );

    }

    const {
      data: pagamentoCriado,
      error: erroPagamento
    } =
      await supabaseClient
        .from("comissoes_pagamentos")
        .insert({
          unidade_id:
            pagamentoComissaoAtual
              .unidadeId,

          profissional_id:
            pagamentoComissaoAtual
              .profissionalId,

          data_inicio:
            pagamentoComissaoAtual
              .dataInicio,

          data_fim:
            pagamentoComissaoAtual
              .dataFim,

          data_pagamento:
            dataPagamento,

          comissao_periodo:
            pagamentoComissaoAtual
              .comissaoPeriodo,

          saldo_anterior:
            pagamentoComissaoAtual
              .saldoAnterior,

          total_vales:
            pagamentoComissaoAtual
              .totalVales,

          total_devido:
            pagamentoComissaoAtual
              .totalDevido,

          valor_pago:
            valorPago,

          saldo_resultante:
            saldoResultante,

          observacoes,

          registrado_por:
            typeof usuarioLogado !==
              "undefined"
              ? usuarioLogado?.id || null
              : null,

          status:
            "ATIVO",

          assinatura:
            `Assinado por ${assinaturaNome}`,

          assinatura_data:
            new Date().toISOString(),

          assinatura_nome:
            assinaturaNome,

          assinatura_imagem:
            assinaturaImagem
        })
        .select("id")
        .single();

    if(erroPagamento){
      throw erroPagamento;
    }

    pagamentoCriadoId =
       pagamentoCriado.id;


    const vinculosItens =
      pagamentoComissaoAtual
        .itensIds.map(
          itemId => ({
            pagamento_id:
              pagamentoCriadoId,
            comanda_item_id:
              itemId
          })
        );

    const {
      error: erroVinculos
    } =
      await supabaseClient
        .from("comissoes_pagamentos_itens")
        .insert(vinculosItens);

    if(erroVinculos){

      await supabaseClient
        .from("comissoes_pagamentos")
        .delete()
        .eq("id", pagamentoCriadoId);

      throw erroVinculos;

    }


    if(
      pagamentoComissaoAtual
        .valesIds.length > 0
    ){

      const {
        error: erroAtualizarVales
      } =
        await supabaseClient
          .from("profissionais_vales")
          .update({
            pagamento_comissao_id:
              pagamentoCriadoId,

            status:
              "DESCONTADO"
          })
          .in(
            "id",
            pagamentoComissaoAtual
              .valesIds
          );

      if(erroAtualizarVales){

        await supabaseClient
          .from("comissoes_pagamentos_itens")
          .delete()
          .eq(
            "pagamento_id",
            pagamentoCriadoId
          );

        await supabaseClient
          .from("comissoes_pagamentos")
          .delete()
          .eq(
            "id",
            pagamentoCriadoId
          );

        throw erroAtualizarVales;

      }

    }

    alert(
      "Pagamento de comissão finalizado com sucesso."
    );

    fecharModalPagamentoComissao();

    FinanceiroProfissionais
      .abrirAba("pagamentos");

  }catch(erro){

    console.error(
      "Erro ao finalizar pagamento:",
      erro
    );

    alert(
      erro?.message ||
      "Não foi possível finalizar o pagamento."
    );

  }finally{

    if(botao){

      botao.disabled = false;
       botao.textContent =
        "Finalizar pagamento";

    }

  }

}


async function obterDadosReciboComissao(
  pagamentoId
){

  const {
    data: pagamento,
    error: erroPagamento
  } =
    await supabaseClient
      .from("comissoes_pagamentos")
      .select("*")
      .eq("id", pagamentoId)
      .single();

  if(erroPagamento){
    throw erroPagamento;
  }

  const profissionais =
    await obterProfissionais();

  const profissional =
    (profissionais || []).find(
      item =>
        String(item.id) ===
        String(pagamento.profissional_id)
    );

  const {
    data: vinculos,
    error: erroVinculos
  } =
    await supabaseClient
      .from("comissoes_pagamentos_itens")
      .select(`
        comanda_item_id
      `)
      .eq(
        "pagamento_id",
        pagamentoId
      );

  if(erroVinculos){
    throw erroVinculos;
  }

  const idsItens =
    (vinculos || []).map(
      item => item.comanda_item_id
    );

  let itens = [];

  if(idsItens.length > 0){

    const {
      data: itensRecebidos,
      error: erroItens
    } =
      await supabaseClient
        .from("comanda_itens")
        .select(`
          id,
          comanda_id,
          descricao,
          valor,
          comissao_percentual
        `)
        .in("id", idsItens);

    if(erroItens){
      throw erroItens;
    }

    itens = itensRecebidos || [];

  }

  const idsComandas =
    [
      ...new Set(
        itens
          .map(item => item.comanda_id)
          .filter(Boolean)
      )
    ];

  const mapaComandas = {};
  const mapaClientes = {};

  if(idsComandas.length > 0){

    const {
      data: comandas,
      error: erroComandas
    } =
      await supabaseClient
        .from("comandas")
        .select(`
          id,
          data,
          cliente_id
        `)
        .in("id", idsComandas);

    if(erroComandas){
      throw erroComandas;
    }

    (comandas || []).forEach(
      comanda => {
        mapaComandas[comanda.id] =
          comanda;
      }
    );

    const idsClientes =
      [
        ...new Set(
          (comandas || [])
            .map(
              comanda =>
                comanda.cliente_id
            )
            .filter(Boolean)
        )
      ];

    if(idsClientes.length > 0){

      const {
        data: clientes,
        error: erroClientes
      } =
        await supabaseClient
          .from("clientes")
          .select("id,nome")
          .in("id", idsClientes);

      if(erroClientes){
        throw erroClientes;
      }

      (clientes || []).forEach(
        cliente => {
          mapaClientes[cliente.id] =
            cliente.nome;
        }
      );

    }

  }

  return {
    pagamento,
    profissional,
    itens,
    mapaComandas,
    mapaClientes
  };

}


async function visualizarReciboComissao(
  pagamentoId
){

  try{

    const dados =
      await obterDadosReciboComissao(
        pagamentoId
      );

    const {
      pagamento,
      profissional,
      itens,
      mapaComandas,
      mapaClientes
    } = dados;

    const linhas =
      itens.map(item => {

        const comanda =
          mapaComandas[item.comanda_id];

        const cliente =
          mapaClientes[
            comanda?.cliente_id
          ] || "Cliente não informado";

        const valor =
          Number(item.valor || 0);

        const percentual =
          Number(
            item.comissao_percentual || 0
          );

        const comissao =
          valor * percentual / 100;

        return `
          <tr>
            <td>
              ${
                financeiroFormatarData(
                  comanda?.data
                )
              }
            </td>

            <td>
              ${
                financeiroEscaparHTML(
                  cliente
                )
              }
            </td>

            <td>
              ${
                financeiroEscaparHTML(
                  item.descricao ||
                  "Serviço"
                )
              }
            </td>

            <td class="direita">
              ${
                financeiroFormatarMoeda(
                  valor
                )
              }
            </td>

            <td class="direita">
              ${percentual.toLocaleString(
                "pt-BR"
              )}%
            </td>

            <td class="direita">
              ${
                financeiroFormatarMoeda(
                  comissao
                )
              }
            </td>
          </tr>
        `;

      }).join("");

    const janela =
      window.open(
        "",
        "_blank",
        "width=1000,height=800"
      );

    if(!janela){

      alert(
        "O navegador bloqueou a abertura do recibo."
      );

      return;
    }

    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>
          Recibo de comissão
        </title>

        <style>
          body{
            font-family:Arial,sans-serif;
            color:#111;
            margin:35px;
          }

          h1{
            text-align:center;
            font-size:24px;
            margin:0 0 25px;
          }

          .cabecalho{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px 25px;
            margin-bottom:25px;
          }

          .resumo{
            width:100%;
            max-width:500px;
            margin-left:auto;
            margin-top:20px;
          }

          .linha{
            display:flex;
            justify-content:space-between;
            gap:20px;
            padding:7px 0;
          }

          .total{
            border-top:2px solid #111;
            font-size:18px;
            font-weight:700;
          }

          table{
            width:100%;
            border-collapse:collapse;
            font-size:12px;
          }

          th,
          td{
            padding:8px;
            border-bottom:1px solid #ddd;
            text-align:left;
          }

          .direita{
            text-align:right;
          }

          .assinatura{
            margin-top:45px;
            text-align:center;
          }

          .assinatura img{
            max-width:420px;
            max-height:140px;
            display:block;
            margin:0 auto 5px;
          }

          .acoes{
            display:flex;
            justify-content:center;
            gap:10px;
            margin-bottom:25px;
          }

          button{
            padding:10px 16px;
            cursor:pointer;
          }

          @media print{
            .acoes{
              display:none;
            }

            body{
              margin:15mm;
            }
          }
        </style>
      </head>

      <body>
        <div class="acoes">
          <button onclick="window.print()">
            Imprimir ou salvar em PDF
          </button>

          <button onclick="window.close()">
            Fechar
          </button>
        </div>

        <h1>
        RECIBO DE PAGAMENTO DE COMISSÃO
        </h1>

        <div class="cabecalho">
          <div>
            <strong>Profissional:</strong>
            ${
              financeiroEscaparHTML(
                profissional?.nome ||
                pagamento.assinatura_nome ||
                "Profissional"
              )
            }
          </div>

          <div>
            <strong>Data do pagamento:</strong>
            ${
              financeiroFormatarData(
                pagamento.data_pagamento
              )
            }
          </div>

          <div>
            <strong>Período:</strong>
            ${
              financeiroFormatarData(
                pagamento.data_inicio
              )
            }
            até
            ${
              financeiroFormatarData(
                pagamento.data_fim
              )
            }
          </div>

          <div>
            <strong>Status:</strong>
            ${
              financeiroEscaparHTML(
                pagamento.status ||
                "ATIVO"
              )
            }
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Serviço</th>
              <th class="direita">Valor</th>
              <th class="direita">Comissão</th>
              <th class="direita">Valor comissão</th>
            </tr>
          </thead>

          <tbody>
            ${
              linhas ||
              `
                <tr>
                  <td colspan="6">
                    Nenhum item vinculado.
                  </td>
                </tr>
              `
            }
          </tbody>
        </table>

        <div class="resumo">
          <div class="linha">
            <span>Comissão do período</span>
            <strong>
              ${
                financeiroFormatarMoeda(
                  pagamento.comissao_periodo
                )
              }
            </strong>
          </div>

          <div class="linha">
            <span>Saldo anterior</span>
            <strong>
              ${
                financeiroFormatarMoeda(
                  pagamento.saldo_anterior
                )
              }
            </strong>
          </div>

          <div class="linha">
            <span>Vales descontados</span>
            <strong>
              -${
                financeiroFormatarMoeda(
                  pagamento.total_vales
                )
              }
            </strong>
          </div>

          <div class="linha">
            <span>Total devido</span>
            <strong>
              ${
                financeiroFormatarMoeda(
                  pagamento.total_devido
                )
              }
            </strong>
          </div>

          <div class="linha">
            <span>Valor pago</span>
            <strong>
              ${
                financeiroFormatarMoeda(
                  pagamento.valor_pago
                )
              }
            </strong>
          </div>

          <div class="linha total">
            <span>Saldo resultante</span>
            <strong>
              ${
                financeiroFormatarMoeda(
                  pagamento.saldo_resultante
                )
              }
            </strong>
          </div>
        </div>

        ${
          pagamento.observacoes
            ? `
              <p style="margin-top:30px;">
                <strong>Observações:</strong>
                ${
                  financeiroEscaparHTML(
                    pagamento.observacoes
                  )
                }
              </p>
            `
            : ""
        }

        <div class="assinatura">
          ${
            pagamento.assinatura_imagem
              ? `
                <img
                  src="${
                    pagamento.assinatura_imagem
                  }"
                  alt="Assinatura"
                >
              `
              : ""
          }

          <div>
            _______________________________________
          </div>

          <strong>
            ${
              financeiroEscaparHTML(
                pagamento.assinatura_nome ||
                profissional?.nome ||
                "Profissional"
              )
            }
          </strong>

          <div>
            Assinatura da profissional
          </div>
        </div>
      </body>
      </html>
    `);

    janela.document.close();

  }catch(erro){

    console.error(
      "Erro ao abrir recibo:",
      erro
    );

    alert(
      erro?.message ||
      "Não foi possível abrir o recibo."
    );

  }

}


async function cancelarPagamentoComissao(
  pagamentoId
){

  const confirmar =
    window.confirm(
      "Deseja cancelar este pagamento? Os serviços e os vales voltarão a ficar disponíveis."
    );

  if(!confirmar){
    return;
  }

  const motivo =
    window.prompt(
      "Informe o motivo do cancelamento:"
    );

  if(!motivo?.trim()){

    alert(
      "O motivo do cancelamento é obrigatório."
    );

    return;
  }

  try{

    const {
      error: erroPagamento
    } =
      await supabaseClient
        .from("comissoes_pagamentos")
        .update({
          status:
            "CANCELADO",

          cancelado_em:
            new Date().toISOString(),

          cancelado_por:
            typeof usuarioLogado !==
              "undefined"
              ? usuarioLogado?.id || null
              : null,

          motivo_cancelamento:
            motivo.trim()
        })
        .eq("id", pagamentoId);

    if(erroPagamento){
      throw erroPagamento;
    }

    const {
      error: erroVales
    } =
      await supabaseClient
        .from("profissionais_vales")
        .update({
          pagamento_comissao_id:
            null,

          status:
            "PENDENTE"
        })
        .eq(
          "pagamento_comissao_id",
          pagamentoId
        );

    if(erroVales){
      throw erroVales;
    }

    const {
      error: erroItens
    } =
      await supabaseClient
        .from("comissoes_pagamentos_itens")
        .delete()
        .eq(
          "pagamento_id",
          pagamentoId
        );

    if(erroItens){
      throw erroItens;
    }

    alert(
      "Pagamento cancelado com sucesso."
    );

    await listarPagamentosFinanceiroProfissionais();

  }catch(erro){

    console.error(
      "Erro ao cancelar pagamento:",
      erro
    );

    alert(
      erro?.message ||
      "Não foi possível cancelar o pagamento."
    );

  }

}


/* =========================================================
   PAGAMENTOS
========================================================= */

async function carregarPagamentosProfissionaisNovo(){

  const area =
    document.getElementById(
      "conteudoFinanceiroProfissionais"
    );

  if(!area){
    return;
  }

  area.innerHTML = `
    <div class="card">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          gap:15px;
          flex-wrap:wrap;
        "
      >
        <div>
          <h2 style="margin:0 0 5px;">
            Fechamentos
          </h2>

          <p style="margin:0;">
            Pagamentos realizados, recibos e cancelamentos.
          </p>
        </div>

        <div
          style="
            display:flex;
            align-items:flex-end;
            gap:10px;
            flex-wrap:wrap;
          "
        >
          <div>
            <label
              for="filtroPagamentoDataInicio"
              style="
                display:block;
                margin-bottom:5px;
                font-size:13px;
              "
            >
              Data inicial
            </label>

            <input
              id="filtroPagamentoDataInicio"
              type="date"
              value="${financeiroPrimeiroDiaMes()}"
            >
          </div>

          <div>
            <label
              for="filtroPagamentoDataFim"
              style="
                display:block;
                margin-bottom:5px;
                font-size:13px;
              "
            >
              Data final
            </label>

            <input
              id="filtroPagamentoDataFim"
              type="date"
              value="${financeiroUltimoDiaMes()}"
            >
          </div>

          <button
            type="button"
            class="principal"
            onclick="
              FinanceiroProfissionais
                .atualizarPagamentos()
            "
          >
            Atualizar
          </button>
        </div>
      </div>

      <div
        id="totaisPagamentosFinanceiro"
        style="margin-top:22px;"
      ></div>

      <div
        id="listaPagamentosFinanceiroProfissionais"
        style="margin-top:20px;"
      >
        Carregando...
      </div>

    </div>
  `;

  await listarPagamentosFinanceiroProfissionais();

}


window.FinanceiroProfissionais.atualizarPagamentos =
  listarPagamentosFinanceiroProfissionais;


async function listarPagamentosFinanceiroProfissionais(){

  const area =
    document.getElementById(
      "listaPagamentosFinanceiroProfissionais"
    );

  const areaTotais =
    document.getElementById(
      "totaisPagamentosFinanceiro"
    );

  if(!area){
    return;
  }

  area.innerHTML =
    "Carregando fechamentos...";

  try{

    const dataInicio =
      document.getElementById(
        "filtroPagamentoDataInicio"
      )?.value;

    const dataFim =
      document.getElementById(
        "filtroPagamentoDataFim"
      )?.value;

    const profissionais =
      await obterProfissionais();

    const mapaProfissionais = {};

    (profissionais || []).forEach(
      profissional => {

        mapaProfissionais[
          profissional.id
        ] = profissional.nome;

      }
    );

    let consulta =
      supabaseClient
        .from("comissoes_pagamentos")
        .select("*")
        .order(
          "data_pagamento",
          {
            ascending: false
          }
        )
     .order(
          "created_at",
          {
            ascending: false
          }
        );

    if(dataInicio){
      consulta =
        consulta.gte(
          "data_pagamento",
          dataInicio
        );
    }

    if(dataFim){
      consulta =
        consulta.lte(
          "data_pagamento",
          dataFim
        );
    }

    const {
      data: pagamentos,
      error
    } = await consulta;

    if(error){
      throw error;
    }

    const lista =
      pagamentos || [];

    const ativos =
      lista.filter(
        pagamento =>
          ![
            "cancelado",
            "cancelada"
          ].includes(
            financeiroNormalizarStatus(
              pagamento.status
            )
          )
      );

    const totalPago =
      ativos.reduce(
        (total, pagamento) =>
          total +
          Number(
            pagamento.valor_pago || 0
          ),
        0
      );

    const totalComissoes =
      ativos.reduce(
        (total, pagamento) =>
          total +
          Number(
            pagamento.comissao_periodo || 0
          ),
        0
      );

    const totalVales =
      ativos.reduce(
        (total, pagamento) =>
          total +
          Number(
            pagamento.total_vales || 0
          ),
        0
      );

    const totalSaldos =
      ativos.reduce(
        (total, pagamento) =>
          total +
          Number(
            pagamento.saldo_resultante || 0
          ),
        0
      );

    if(areaTotais){

      areaTotais.innerHTML = `
        <div
          style="
            display:grid;
            grid-template-columns:repeat(
              auto-fit,
              minmax(170px, 1fr)
            );
            gap:12px;
          "
        >
          <div
            class="card"
            style="padding:15px;"
          >
            <small>Pagamentos ativos</small>

            <div
              style="
                font-size:21px;
                font-weight:700;
                margin-top:5px;
              "
            >
              ${ativos.length}
            </div>
          </div>

          <div
            class="card"
            style="padding:15px;"
          >
            <small>Comissões fechadas</small>

            <div
              style="
                font-size:21px;
                font-weight:700;
                margin-top:5px;
              "
            >
              ${
                financeiroFormatarMoeda(
                  totalComissoes
                )
              }
            </div>
          </div>

          <div
            class="card"
            style="padding:15px;"
             >
            <small>Vales descontados</small>

            <div
              style="
                font-size:21px;
                font-weight:700;
                margin-top:5px;
              "
            >
              ${
                financeiroFormatarMoeda(
                  totalVales
                )
              }
            </div>
          </div>

          <div
            class="card"
            style="padding:15px;"
          >
            <small>Total pago</small>

            <div
              style="
                font-size:21px;
                font-weight:700;
                margin-top:5px;
              "
            >
              ${
                financeiroFormatarMoeda(
                  totalPago
                )
              }
            </div>
          </div>

          <div
            class="card"
            style="padding:15px;"
          >
            <small>Saldo resultante</small>

            <div
              style="
                font-size:21px;
                font-weight:700;
                margin-top:5px;
              "
            >
              ${
                financeiroFormatarMoeda(
                  totalSaldos
                )
              }
            </div>
          </div>
        </div>
      `;

    }

    if(lista.length === 0){

      area.innerHTML = `
        <div
          style="
            padding:25px;
            text-align:center;
            border:1px solid #ddd;
            border-radius:8px;
          "
        >
          Nenhum fechamento registrado no período.
        </div>
      `;

      return;
    }

    area.innerHTML = `
      <div style="overflow-x:auto;">

        <table
          style="
            width:100%;
            border-collapse:collapse;
            min-width:1050px;
          "
        >
          <thead>
            <tr>
              <th style="padding:12px;text-align:left;">
                Profissional
              </th>

              <th style="padding:12px;text-align:left;">
                Período
              </th>

              <th style="padding:12px;text-align:right;">
                Comissão
              </th>

              <th style="padding:12px;text-align:right;">
                Vales
              </th>

              <th style="padding:12px;text-align:right;">
                Pago
              </th>

              <th style="padding:12px;text-align:right;">
                Saldo
              </th>

              <th style="padding:12px;text-align:center;">
                Assinatura
              </th>

              <th style="padding:12px;text-align:center;">
                Status
              </th>

              <th style="padding:12px;text-align:right;">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            ${
              lista.map(
                pagamento => {

                  const status =
                    financeiroNormalizarStatus(
                      pagamento.status
                    );

                  const cancelado =
                    status === "cancelado" ||
                    status === "cancelada";

                  return `
                    <tr
                      style="
                        border-top:1px solid #ddd;
                        ${
                          cancelado
                            ? "opacity:0.58;"
                            : ""
                        }
                      "
                    >
                      <td style="padding:12px;">
                        ${
                          financeiroEscaparHTML(
                            mapaProfissionais[
                              pagamento.profissional_id
                            ] ||
                            pagamento.assinatura_nome ||
                            "Profissional não encontrado"
                          )
                        }
                      </td>

                      <td style="padding:12px;">
                        ${
                          financeiroFormatarData(
                            pagamento.data_inicio
                          )
                        }
                        até
                        ${
                          financeiroFormatarData(
                            pagamento.data_fim
                          )
                        }
                      </td>

                      <td
                        style="
                          padding:12px;
                          text-align:right;
                        "
                      >
                        ${
                          financeiroFormatarMoeda(
                            pagamento
                              .comissao_periodo
                          )
                        }
                      </td>

                      <td
                        style="
                          padding:12px;
                          text-align:right;
                        "
                      >
                        ${
                          financeiroFormatarMoeda(
                            pagamento.total_vales
                          )
                        }
                      </td>

                      <td
                        style="
                          padding:12px;
                          text-align:right;
                          font-weight:700;
                        "
                      >
                        ${
                          financeiroFormatarMoeda(
                            pagamento.valor_pago
                          )
                        }
                      </td>

                      <td
                        style="
                          padding:12px;
                          text-align:right;
                          font-weight:700;
                        "
                      >
                        ${
                          financeiroFormatarMoeda(
                            pagamento.saldo_resultante
                          )
                        }
                      </td>

                      <td
                        style="
                          padding:12px;
                          text-align:center;
                        "
                      >
                        ${
                          pagamento.assinatura_imagem
                            ? "Assinada"
                            : "Sem imagem"
                        }
                      </td>

                      <td
                        style="
                          padding:12px;
                          text-align:center;
                        "
                      >
                        <span
                          style="
                            display:inline-block;
                            padding:5px 9px;
                            border-radius:20px;
                            font-size:12px;
                            background:${
                              cancelado
                                ? "#fde8e8"
                                : "#e8f5e9"
                            };
                          "
                        >
                          ${
                            financeiroEscaparHTML(
                              pagamento.status ||
                              "ATIVO"
                            )
                          }
                        </span>
                      </td>

                      <td
                        style="
                          padding:12px;
                          text-align:right;
                          white-space:nowrap;
                        "
                      >
                        <button
                          type="button"
                          onclick="
                            FinanceiroProfissionais
                              .visualizarRecibo(
                                '${pagamento.id}'
                              )
                          "
                        >
                          Recibo
                        </button>

                        ${
                          cancelado
                            ? ""
                            : `
                              <button
                                type="button"
                                style="
                                  margin-left:6px;
                                  color:#b42318;
                                "
                                onclick="
                                  FinanceiroProfissionais
                                    .cancelarPagamento(
                                      '${pagamento.id}'
                                    )
                                "
                              >
                                Cancelar
                              </button>
                            `
                        }
                      </td>
                    </tr>
                  `;

                }
              ).join("")
            }
          </tbody>
        </table>
      </div>
    `;

  }catch(erro){

    console.error(
      "Erro ao listar pagamentos:",
      erro
    );

    financeiroMostrarErro(
      area,
      erro?.message ||
      "Erro desconhecido."
    );

  }

}


/* =========================================================
   VALES
========================================================= */

async function carregarValesProfissionaisNovo(){

  const area =
    document.getElementById(
      "conteudoFinanceiroProfissionais"
    );

  if(!area){
    return;
  }
   area.innerHTML = `
    <div class="card">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:15px;
          flex-wrap:wrap;
        "
      >

        <div>
          <h2 style="margin:0 0 5px;">
            Vales
          </h2>

          <p style="margin:0;">
            Adiantamentos entregues aos profissionais.
          </p>
        </div>

        <button
          type="button"
          class="principal"
          onclick="abrirModalNovoValeProfissional()"
        >
          Registrar novo vale
        </button>

      </div>

      <div
        id="listaValesProfissionais"
        style="margin-top:25px;"
      >
        Carregando...
      </div>

    </div>
  `;

  if(
    typeof listarValesProfissionais ===
    "function"
  ){

    await listarValesProfissionais();

  }else{

    financeiroMostrarErro(
      document.getElementById(
        "listaValesProfissionais"
      ),
      "A função listarValesProfissionais não foi localizada."
    );

  }

}


/* =========================================================
   EXTRATO
========================================================= */

async function carregarExtratoFinanceiroProfissionaisNovo(){

  const area =
    document.getElementById(
      "conteudoFinanceiroProfissionais"
    );

  if(!area){
    return;
  }

  const profissionais =
    await obterProfissionais();

  const profissionaisAtivos =
    (profissionais || [])
      .filter(
        profissional =>
          profissional.ativo !== false
      )
      .sort(
        (a, b) =>
          String(a.nome || "")
            .localeCompare(
              String(b.nome || ""),
              "pt-BR"
            )
      );

  area.innerHTML = `
    <div class="card">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          gap:15px;
          flex-wrap:wrap;
        "
      >

        <div>
          <h2 style="margin:0 0 5px;">
            Extrato financeiro
          </h2>

          <p style="margin:0;">
            Consulte as movimentações de cada profissional.
          </p>
        </div>

        <div
          style="
            display:flex;
            gap:10px;
            align-items:flex-end;
            flex-wrap:wrap;
          "
        >

          <div>
            <label
              for="extratoFinanceiroProfissionalId"
              style="
                display:block;
                margin-bottom:5px;
                font-size:13px;
              "
            >
              Profissional
            </label>

            <select
              id="extratoFinanceiroProfissionalId"
            >
              <option value="">
                Selecione
              </option>

              ${
                profissionaisAtivos.map(
                  profissional => `
                    <option
                      value="${profissional.id}"
                    >
                      ${
                        financeiroEscaparHTML(
                          profissional.nome
                        )
                      }
                    </option>
                  `
                ).join("")
              }
            </select>
          </div>

          <button
            type="button"
            class="principal"
            onclick="
              FinanceiroProfissionais
                .carregarExtratoSelecionado()
            "
          >
            Consultar
          </button>

        </div>

      </div>

      <div
        id="resultadoExtratoFinanceiroProfissionais"
        style="margin-top:22px;"
      >
        Selecione um profissional.
      </div>

    </div>
  `;

}


window.FinanceiroProfissionais
  .carregarExtratoSelecionado =
    async function(){

      const profissionalId =
        document.getElementById(
          "extratoFinanceiroProfissionalId"
        )?.value;

      if(!profissionalId){

        alert(
          "Selecione um profissional."
        );

        return;
      }

      await carregarExtratoProfissional(
        profissionalId
      );

    };


window.FinanceiroProfissionais
  .abrirExtratoProfissional =
    async function(profissionalId){

      abrirAbaFinanceiroProfissionais(
        "extrato"
      );

      await new Promise(
        resolver =>
          setTimeout(
            resolver,
            50
          )
      );

      const select =
        document.getElementById(
          "extratoFinanceiroProfissionalId"
        );

      if(select){
        select.value = profissionalId;
      }

      await carregarExtratoProfissional(
        profissionalId
      );

    };


async function carregarExtratoProfissional(
  profissionalId
){

  const area =
    document.getElementById(
      "resultadoExtratoFinanceiroProfissionais"
    );

  if(!area){
    return;
  }

  area.innerHTML = "Carregando extrato...";

  try{

    const {
      data: vales,
      error: erroVales
    } =
      await supabaseClient
        .from("profissionais_vales")
        .select("*")
        .eq(
          "profissional_id",
          profissionalId
        );

    if(erroVales){
      throw erroVales;
    }

    const {
      data: pagamentos,
      error: erroPagamentos
    } =
      await supabaseClient
        .from("comissoes_pagamentos")
        .select("*")
        .eq(
          "profissional_id",
          profissionalId
        );

    if(erroPagamentos){
      throw erroPagamentos;
    }

    const movimentos = [];

    (vales || []).forEach(vale => {

      movimentos.push({
        data:
          vale.data_vale ||
          vale.created_at,
        tipo: "Vale",
        descricao:
          vale.descricao ||
          "Adiantamento",
        valor:
          -Math.abs(
            Number(vale.valor || 0)
          ),
        status:
          vale.status || "ABERTO"
      });

    });

    (pagamentos || []).forEach(
      pagamento => {

        movimentos.push({
          data:
            pagamento.data_pagamento ||
            pagamento.created_at,
          tipo: "Pagamento",
          descricao:
            `Fechamento de ${
              financeiroFormatarData(
                pagamento.data_inicio
              )
            } até ${
              financeiroFormatarData(
                pagamento.data_fim
              )
            }`,
          valor:
            -Math.abs(
              Number(
                pagamento.valor_pago || 0
              )
            ),
          status:
            pagamento.status || "ATIVO"
        });

      }
    );

    movimentos.sort(
      (a, b) =>
        new Date(b.data) -
        new Date(a.data)
    );

    if(movimentos.length === 0){

      area.innerHTML = `
        <div
          style="
            padding:25px;
            text-align:center;
            border:1px solid #ddd;
            border-radius:8px;
          "
        >
          Nenhuma movimentação encontrada.
        </div>
      `;

      return;
    }

    area.innerHTML = `
      <div style="overflow-x:auto;">

        <table
          style="
            width:100%;
            border-collapse:collapse;
          "
        >

          <thead>
            <tr>
              <th style="padding:12px;text-align:left;">
                Data
              </th>

              <th style="padding:12px;text-align:left;">
                Tipo
              </th>

              <th style="padding:12px;text-align:left;">
                Descrição
              </th>

              <th style="padding:12px;text-align:right;">
                Valor
              </th>

              <th style="padding:12px;text-align:center;">
                Status
              </th>
            </tr>
          </thead>

          <tbody>

            ${
              movimentos.map(
                movimento => `
                  <tr
                    style="
                      border-top:1px solid #ddd;
                    "
                  >
                    <td style="padding:12px;">
                      ${
                        movimento.data
                          ? new Date(
                              movimento.data
                            ).toLocaleDateString(
                              "pt-BR"
                            )
                          : "-"
                      }
                    </td>

                    <td style="padding:12px;">
                      ${
                        financeiroEscaparHTML(
                          movimento.tipo
                        )
                      }
                    </td>

                    <td style="padding:12px;">
                      ${
                        financeiroEscaparHTML(
                          movimento.descricao
                        )
                      }
                    </td>

                    <td
                      style="
                        padding:12px;
                        text-align:right;
                        font-weight:700;
                      "
                    >
                      ${
                        financeiroFormatarMoeda(
                          movimento.valor
                        )
                      }
                    </td>

                    <td
                      style="
                        padding:12px;
                        text-align:center;
                      "
                    >
                      ${
                        financeiroEscaparHTML(
                          movimento.status
                        )
                      }
                    </td>
                  </tr>
                `
              ).join("")
            }

          </tbody>

        </table>

      </div>
    `;

  }catch(erro){

    console.error(
      "Erro ao carregar extrato:",
      erro
    );

    financeiroMostrarErro(
      area,
      erro?.message ||
      "Erro desconhecido."
    );

  }

}
            
