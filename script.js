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

const colunas = document.querySelectorAll(".column");

const coluna = colunas[profissional];

  const card = document.createElement("div");

  card.classList.add("appointment");
const [hora, minuto] = horario.split(":");

const minutosTotais = (parseInt(hora) * 60) + parseInt(minuto);

const inicioAgenda = 14 * 60;

const diferenca = minutosTotais - inicioAgenda;

const posicaoTop = (diferenca / 20) * 40;

card.style.top = `${posicaoTop}px`;
  card.innerHTML = `
    <strong>${cliente}</strong>
    <span>Novo Atendimento</span>
    <small>${horario}</small>
  `;

  coluna.appendChild(card);

  fecharModal();
}
