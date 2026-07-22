"use strict";

window.FinanceiroProfissionais = {

    abrirAba

};

function abrirAba(nome){

    switch(nome){

        case "resumo":
            carregarResumoFinanceiroProfissionaisNovo();
            break;

        case "pagamentos":
            carregarPagamentosProfissionaisNovo();
            break;

        case "vales":
            carregarValesProfissionais();
            break;

        case "extrato":
            carregarExtratoFinanceiroProfissionaisNovo();
            break;

    }

}

async function carregarResumoFinanceiroProfissionaisNovo(){

    const area =
        document.getElementById(
            "conteudoFinanceiroProfissionais"
        );

    if(!area) return;

    area.innerHTML = `
        <div class="card">

            <h2>Resumo Financeiro</h2>

            <div id="cardsResumoFinanceiro"
                 style="
                    display:grid;
                    grid-template-columns:repeat(auto-fill,minmax(320px,1fr));
                    gap:20px;
                    margin-top:20px;
                 ">
            </div>

        </div>
    `;

    await montarResumoFinanceiro();

}

async function montarResumoFinanceiro(){

    const container =
        document.getElementById(
            "cardsResumoFinanceiro"
        );

    if(!container) return;

    const profissionais =
        await obterProfissionais();

    container.innerHTML = "";

    (profissionais || [])
    .filter(p => p.ativo !== false)
    .forEach(p=>{

        container.innerHTML += `

        <div
            class="card"
            style="padding:20px;">

            <h3>${p.nome}</h3>

            <hr>

            <div
            id="resumoFinanceiro_${p.id}">

                Carregando...

            </div>

        </div>

        `;

    });

}

async function carregarPagamentosProfissionaisNovo(){

    const area =
        document.getElementById(
            "conteudoFinanceiroProfissionais"
        );

    if(!area) return;

    area.innerHTML=`

        <div class="card">

            <h2>Pagamentos</h2>

            Em desenvolvimento.

        </div>

    `;

}

async function carregarExtratoFinanceiroProfissionaisNovo(){

    const area =
        document.getElementById(
            "conteudoFinanceiroProfissionais"
        );

    if(!area) return;

    area.innerHTML=`

        <div class="card">

            <h2>Extrato</h2>

            Em desenvolvimento.

        </div>

    `;

}
