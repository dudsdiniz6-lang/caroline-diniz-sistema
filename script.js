function abrirModal() {
  document.getElementById("modal").style.display = "flex";
}

function fecharModal() {
  document.getElementById("modal").style.display = "none";
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

  const faturamento = totalClientes * 70;

  document.getElementById("clientes-total").innerText = totalClientes;

  document.getElementById("faturamento").innerText = `R$ ${faturamento}`;
}

function criarCard(agendamento) {

  const colunas = document.querySelectorAll(".column");

  const coluna = colunas[agendamento.profissional];

  const card = document.createElement("div");

  card.classList.add("appointment");

  if (agendamento.servico) {
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

  card.onclick = function () {

    const novoHorario = prompt("Editar horário:", agendamento.horario);

    if (!novoHorario) return;

    agendamento.horario = novoHorario;

    card.style.top = `${calcularTop(agendamento.horario)}px`;

    card.innerHTML = `
      <strong>${agendamento.cliente}</strong>
      <span>${agendamento.servico || "Novo Atendimento"}</span>
      <small>${agendamento.horario}</small>
    `;

    let agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

    agendamentos = agendamentos.map((item) => {

      if (item.id == card.dataset.id) {
        item.horario = agendamento.horario;
      }

      return item;
    });

    localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
  };

  coluna.appendChild(card);
}

function salvarAgendamento() {

  const cliente = document.getElementById("cliente").value;

  const horario = document.getElementById("horario").value;

  const profissional = document.getElementById("profissional").value;

  const duracao = document.getElementById("duracao").value;

  const servico = document.getElementById("servico").value;

  let agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

  const conflito = agendamentos.some((item) => {

    return item.profissional == profissional &&
           item.horario == horario;
  });

  if (conflito) {

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

window.onload = function () {

  const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

  agendamentos.forEach((agendamento) => {

    criarCard(agendamento);
  });

  atualizarFinanceiro();
};
