function abrirModal() {
  document.getElementById("modal").style.display = "flex";
}

function fecharModal() {
  document.getElementById("modal").style.display = "none";
}
function salvarAgendamento() {

  const cliente = document.getElementById("cliente").value;
  const horario = document.getElementById("horario").value;

  const coluna = document.querySelector(".column");

  const card = document.createElement("div");

  card.classList.add("appointment");

  card.innerHTML = `
    <strong>${cliente}</strong>
    <span>Novo Atendimento</span>
    <small>${horario}</small>
  `;

  coluna.appendChild(card);

  fecharModal();
}
