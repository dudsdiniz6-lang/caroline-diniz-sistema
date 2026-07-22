"use strict";

window.FinanceiroProfissionais = {

    iniciar,

    abrirAba,

    resumo: {
        carregar: carregarResumo
    },

    pagamentos: {
        carregar: carregarPagamentos
    },

    vales: {
        carregar: carregarVales
    },

    extrato: {
        carregar: carregarExtrato
    },

    historico: {
        carregar: carregarHistorico
    }

};

function iniciar(){

    console.log("Financeiro dos profissionais carregado.");

}

function abrirAba(nome){

    switch(nome){

        case "resumo":
            FinanceiroProfissionais.resumo.carregar();
            break;

        case "pagamentos":
            FinanceiroProfissionais.pagamentos.carregar();
            break;

        case "vales":
            FinanceiroProfissionais.vales.carregar();
            break;

        case "extrato":
            FinanceiroProfissionais.extrato.carregar();
            break;

        case "historico":
            FinanceiroProfissionais.historico.carregar();
            break;

    }

}

async function carregarResumo(){

    console.log("Resumo");

}

async function carregarPagamentos(){

    console.log("Pagamentos");

}

async function carregarVales(){

    console.log("Vales");

}

async function carregarExtrato(){

    console.log("Extrato");

}

async function carregarHistorico(){

    console.log("Histórico");

}

document.addEventListener("DOMContentLoaded", iniciar);
