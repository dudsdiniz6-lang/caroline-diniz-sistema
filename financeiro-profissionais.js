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
      "aberta",
      "aberto",
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

      itens = itensRecebidos || [];

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

          const saldoAnterior =
            Number(
              ultimoPagamento
                ?.saldo_resultante || 0
            );

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

window.FinanceiroProfissionais
  .abrirDetalhesPeriodo =
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
          profissional_id
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
          "aberta",
          "aberto",
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

      itens =
        (itensRecebidos || []).filter(
          item => {

            const comanda =
              mapaComandas[
                item.comanda_id
              ];

            const profissionalItem =
              item.profissional_id ||
              comanda?.profissional_id;

            return (
              String(profissionalItem) ===
              String(profissionalId)
            );

          }
        );

    }

    let totalServicos = 0;
    let totalComissao = 0;

    const linhas =
      itens.map(item => {

        const comanda =
          mapaComandas[item.comanda_id];

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

    resultado.innerHTML = `
      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
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
                      colspan="2"
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

      <h2 style="margin-top:0;">
        Fechamentos
      </h2>

      <p>
        Os fechamentos serão carregados nesta aba.
      </p>

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


async function listarPagamentosFinanceiroProfissionais(){

  const area =
    document.getElementById(
      "listaPagamentosFinanceiroProfissionais"
    );

  if(!area){
    return;
  }

  try{

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

    const {
      data: pagamentos,
      error
    } =
      await supabaseClient
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

    if(error){
      throw error;
    }

    if(
      !pagamentos ||
      pagamentos.length === 0
    ){

      area.innerHTML = `
        <div
          style="
            padding:25px;
            text-align:center;
            border:1px solid #ddd;
            border-radius:8px;
          "
        >
          Nenhum fechamento registrado.
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

              <th style="padding:12px;text-align:center;">
                Status
              </th>
            </tr>
          </thead>

          <tbody>

            ${
              pagamentos.map(
                pagamento => `
                  <tr
                    style="
                      border-top:1px solid #ddd;
                    "
                  >
                    <td style="padding:12px;">
                      ${
                        financeiroEscaparHTML(
                          mapaProfissionais[
                            pagamento.profissional_id
                          ] ||
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
                        text-align:center;
                      "
                    >
                      ${
                        financeiroEscaparHTML(
                          pagamento.status ||
                          "ATIVO"
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
