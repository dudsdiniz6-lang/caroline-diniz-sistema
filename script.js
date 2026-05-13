const usuarios = [
  { usuario:"eduarda", senha:"123", cargo:"dona" },
  { usuario:"caroline", senha:"123", cargo:"dona" },
  { usuario:"ana", senha:"123", cargo:"gerente" },
  { usuario:"pedro", senha:"123", cargo:"funcionario" },
  { usuario:"silamara", senha:"123", cargo:"funcionario" },
  { usuario:"jessica", senha:"123", cargo:"funcionario" },
  { usuario:"ssica", senha:"123", cargo:"funcionario" },
  { usuario:"alice", senha:"123", cargo:"funcionario" }
];

const mapaProfissionais = {
  carol: 0,
  jessica: 1,
  ssica: 1,
  fernanda: 2,
  silamara: 3
};

function abrirModal() {
  document.getElementById("modal").style.display = "flex";
}

function fecharModal() {
  document.getElementById("modal").style.display = "none";
}

function fazerLogin(){
  const usuario = document.getElementById("usuario").value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const senha = document.getElementById("senha").value.trim();

  const usuarioEncontrado = usuarios.find((item)=>{
    return item.usuario === usuario && item.senha === senha;
  });

  if(!usuarioEncontrado){
    alert("Usuário ou senha inválidos");
    return;
  }

  localStorage.setItem("usuarioLogado", JSON.stringify(usuarioEncontrado));

  document.getElementById("login-screen").style.display = "none";

  aplicarPermissoes();
  carregarAgenda();
}

function sairSistema(){
  localStorage.removeItem("usuarioLogado");
  location.reload();
}

function aplicarPermissoes(){
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

  if(!usuarioLogado) return;

  const menus = document.querySelectorAll("nav a");

  menus.forEach((menu)=>{
    const texto = menu.innerText;

    if(usuarioLogado.cargo === "gerente" && texto === "Financeiro"){
      menu.style.display = "none";
    }

    if(usuarioLogado.cargo === "funcionario"){
      if(texto === "Financeiro" || texto === "Comandas" || texto === "Relatórios"){
        menu.style.display = "none";
      }
    }
  });

  if(usuarioLogado.cargo === "funcionario"){
    const indiceUsuario = mapaProfissionais[usuarioLogado.usuario];

    const colunas = document.querySelectorAll(".column");
    const profissionais = document.querySelectorAll(".professional");

    colunas.forEach((coluna, index)=>{
      coluna.style.display = index === indiceUsuario ? "block" : "none";
    });

    profissionais.forEach((profissional, index)=>{
      profissional.style.display = index === indiceUsuario ? "block" : "none";
    });
  }
}

function calcularTop(horario) {
  const [hora, minuto] = horario.split(":");
  const minutosTotais = (parseInt(hora) * 60) + parseInt(minuto);
  const inicioAgenda = 14 * 60;
  const diferenca = minutosTotais - inicioAgenda;
  return (diferenca / 20) * 80;
}

function atualizarFinanceiro() {
  const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];
  const totalClientes = agendamentos.length;
  const faturamento = Number(localStorage.getItem("caixa")) || 0;
const atendimentosPagos = Number(localStorage.getItem("atendimentosPagos")) || 0;

  document.getElementById("clientes-total").innerText = totalClientes;
  document.getElementById("faturamento").innerText = `R$ ${faturamento}`;
  document.getElementById("atendimentos-pagos").innerText = atendimentosPagos;
}

function criarCard(agendamento) {
  const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

  if(usuarioLogado && usuarioLogado.cargo === "funcionario"){
    const indiceUsuario = mapaProfissionais[usuarioLogado.usuario];

    if(indiceUsuario != agendamento.profissional){
      return;
    }
  }

  const colunas = document.querySelectorAll(".column");
  const coluna = colunas[agendamento.profissional];

  const card = document.createElement("div");
  card.classList.add("appointment");

  if(agendamento.servico){
    card.classList.add(agendamento.servico);
  }

  card.dataset.id = agendamento.id;
  card.style.top = `${calcularTop(agendamento.horario)}px`;

  const altura = ((agendamento.duracao || 20) / 20) * 80;
  card.style.height = `${altura - 10}px`;

  card.innerHTML = `
    <strong>${agendamento.cliente}</strong>
    <span>${agendamento.servico || "Novo Atendimento"}</span>
    <small>${agendamento.horario}</small>
  `;

  card.onclick = function(){
    const acao = prompt("Digite:\n1 - Editar horário\n2 - Faturar\n3 - Cancelar");

if(acao === "2"){
 const valor = prompt("Valor do atendimento:");

if(!valor) return;

let caixa = Number(localStorage.getItem("caixa")) || 0;

caixa += Number(valor);

localStorage.setItem("caixa", caixa);
  let atendimentosPagos = Number(localStorage.getItem("atendimentosPagos")) || 0;

atendimentosPagos++;

localStorage.setItem("atendimentosPagos", atendimentosPagos);
  let historico = JSON.parse(localStorage.getItem("historicoFinanceiro")) || [];

historico.push({
  cliente: agendamento.cliente,
  servico: agendamento.servico || "Novo Atendimento",
  valor: Number(valor),
  data: new Date().toLocaleDateString("pt-BR")
});

localStorage.setItem("historicoFinanceiro", JSON.stringify(historico));

carregarHistoricoFinanceiro();

document.getElementById("faturamento").innerText = `R$ ${caixa}`;

card.style.opacity = "0.6";

alert("Atendimento faturado!");
  return;
}

if(acao === "3"){
  return;
}

const novoHorario = prompt("Editar horário:", agendamento.horario);

    if(!novoHorario) return;

    agendamento.horario = novoHorario;
    card.style.top = `${calcularTop(agendamento.horario)}px`;

    card.innerHTML = `
      <strong>${agendamento.cliente}</strong>
      <span>${agendamento.servico || "Novo Atendimento"}</span>
      <small>${agendamento.horario}</small>
    `;

    let agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

    agendamentos = agendamentos.map((item)=>{
      if(item.id == card.dataset.id){
        item.horario = agendamento.horario;
      }

      return item;
    });

    localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
  };

  card.oncontextmenu = function(event){
    event.preventDefault();

    const confirmar = confirm("Deseja excluir este agendamento?");

    if(!confirmar) return;

    card.remove();

    let agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

    agendamentos = agendamentos.filter((item)=>{
      return item.id != agendamento.id;
    });

    localStorage.setItem("agendamentos", JSON.stringify(agendamentos));

    atualizarFinanceiro();
  };

  coluna.appendChild(card);
}

function salvarAgendamento(){
  const cliente = document.getElementById("cliente").value;
  const horario = document.getElementById("horario").value;
  const profissional = document.getElementById("profissional").value;
  const duracao = document.getElementById("duracao").value;
  const servico = document.getElementById("servico").value;

  let agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

  const conflito = agendamentos.some((item)=>{
    return item.profissional == profissional && item.horario == horario;
  });

  if(conflito){
    alert("Já existe um atendimento nesse horário.");
    return;
  }

  const agendamento = {
    id: Date.now(),
    cliente,
    horario,
    profissional,
    duracao,
    servico
  };

  agendamentos.push(agendamento);
  localStorage.setItem("agendamentos", JSON.stringify(agendamentos));

  criarCard(agendamento);
  atualizarFinanceiro();
  fecharModal();
}

function carregarAgenda(){
  const colunas = document.querySelectorAll(".column");

  colunas.forEach((coluna)=>{
    coluna.innerHTML = "";
  });

  const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

  agendamentos.forEach((agendamento)=>{
    criarCard(agendamento);
  });

  atualizarFinanceiro();
}

window.onload = function(){

  atualizarFinanceiro();

  carregarClientes();

  carregarHistoricoFinanceiro();

};
function salvarCliente(){

  const nome = document.getElementById("nomeCliente").value;

  const telefone = document.getElementById("telefoneCliente").value;

  const observacao = document.getElementById("observacaoCliente").value;

  const cliente = {
    id: Date.now(),
    nome,
    telefone,
    observacao
  };

  let clientes = JSON.parse(localStorage.getItem("clientes")) || [];

  clientes.push(cliente);

  localStorage.setItem("clientes", JSON.stringify(clientes));

  carregarClientes();

}

function carregarClientes(){

  const lista = document.getElementById("listaClientes");

  lista.innerHTML = "";

  const clientes = JSON.parse(localStorage.getItem("clientes")) || [];

  clientes.forEach((cliente)=>{

    const card = document.createElement("div");

    card.classList.add("cliente-card");

    card.innerHTML = `
      <strong>${cliente.nome}</strong>
      <p>${cliente.telefone}</p>
      <small>${cliente.observacao}</small>
    `;

    lista.appendChild(card);

  });

}
function mostrarClientes(){

  const clientes = document.getElementById("clientes-container");

  clientes.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}
function carregarHistoricoFinanceiro(){

  const lista = document.getElementById("historico-financeiro");

  if(!lista) return;

  lista.innerHTML = "";

  const historico = JSON.parse(localStorage.getItem("historicoFinanceiro")) || [];

  historico.forEach((item)=>{

    const div = document.createElement("div");

    div.classList.add("cliente-card");

    div.innerHTML = `
      <strong>${item.cliente}</strong>
      <p>${item.servico} — R$ ${item.valor}</p>
      <small>${item.data}</small>
    `;

    lista.appendChild(div);

  });

}
function mostrarSecao(secao){

  const secoes = document.querySelectorAll(".clientes-container");

  secoes.forEach((item)=>{
    item.style.display = "none";
  });

  document.getElementById(secao).style.display = "block";

}
