function abrirModal() {
  document.getElementById("modal").style.display = "flex";
}

function fecharModal() {
  document.getElementById("modal").style.display = "none";
}
function salvarAgendamento() {

  const cliente = document.getElementById("cliente").value;
  const horario = document.getElementById("horario").value;

  const profissional = document.getElementById("profissional").value;
  const duracao = document.getElementById("duracao").value;

const colunas = document.querySelectorAll(".column");

const coluna = colunas[profissional];

  const card = document.createElement("div");

  card.classList.add("appointment");
const [hora, minuto] = horario.split(":");

const minutosTotais = (parseInt(hora) * 60) + parseInt(minuto);

const inicioAgenda = 14 * 60;

const diferenca = minutosTotais - inicioAgenda;

const posicaoTop = (diferenca / 20) * 80;

card.style.top = `${posicaoTop}px`;
  const altura = (duracao / 20) * 80;

card.style.height = `${altura - 10}px`;
  card.innerHTML = `
    <strong>${cliente}</strong>
    <span>Novo Atendimento</span>
    <small>${horario}</small>
  `;

  coluna.appendChild(card);
  const agendamento = {
  id: Date.now(),
  cliente,
  horario,
  profissional
};

let agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

agendamentos.push(agendamento);

localStorage.setItem("agendamentos", JSON.stringify(agendamentos));

  fecharModal();
}
window.onload = function(){

  const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

  agendamentos.forEach((agendamento)=>{

    const colunas = document.querySelectorAll(".column");

    const coluna = colunas[agendamento.profissional];

    const card = document.createElement("div");

    card.classList.add("appointment");
    card.dataset.id = agendamento.id;

    const [hora, minuto] = agendamento.horario.split(":");

    const minutosTotais = (parseInt(hora) * 60) + parseInt(minuto);

    const inicioAgenda = 14 * 60;

    const diferenca = minutosTotais - inicioAgenda;

    const posicaoTop = (diferenca / 20) * 80;

    card.style.top = `${posicaoTop}px`;

    card.innerHTML = `
      <strong>${agendamento.cliente}</strong>
      <span>Novo Atendimento</span>
      <small>${agendamento.horario}</small>
    `;

    coluna.appendChild(card);
card.onclick = function(){

  const novoHorario = prompt("Editar horário:", agendamento.horario);

  if(!novoHorario) return;

  agendamento.horario = novoHorario;

  const [hora, minuto] = agendamento.horario.split(":");

  const minutosTotais = (parseInt(hora) * 60) + parseInt(minuto);

  const inicioAgenda = 14 * 60;

  const diferenca = minutosTotais - inicioAgenda;

  const posicaoTop = (diferenca / 20) * 80;

  card.style.top = `${posicaoTop}px`;

  card.innerHTML = `
    <strong>${agendamento.cliente}</strong>
    <span>Novo Atendimento</span>
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

}
  });

}
