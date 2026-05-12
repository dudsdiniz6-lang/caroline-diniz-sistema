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

const totalMinutos = (parseInt(hora) * 60) + parseInt(minuto);

const inicioAgenda = 8 * 60;

const posicao = ((totalMinutos - inicioAgenda) / 20) * 80;

card.style.position = "absolute";

card.style.top = `${posicao}px`;

card.style.left = "0";

card.style.right = "0";

  card.innerHTML = `
    <strong>${cliente}</strong>
    <span>Novo Atendimento</span>
    <small>${horario}</small>
  `;

  coluna.appendChild(card);

  fecharModal();
}
