const SUPABASE_URL = "https://oxvtfdxdlshbvtqtnpgo.supabase.co";
const SUPABASE_KEY = "sb_publishable_KQ58nMCXUZl0Nz5jEHkKKg_RbpL-QTw";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

function abrirModal(){
  document.getElementById("modal").style.display = "flex";
}

function fecharModal(){
  document.getElementById("modal").style.display = "none";
}

function fazerLogin(){
  const usuario = document.getElementById("usuario").value.toLowerCase().trim();
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

  carregarAgenda();
  carregarClientes();
  carregarHistoricoFinanceiro();
}

function sairSistema(){
  localStorage.removeItem("usuarioLogado");
  location.reload();
}

function calcularTop(horario){
  const [hora, minuto] = horario.split(":");
  const minutosTotais = parseInt(hora) * 60 + parseInt(minuto);
  const inicioAgenda = 14 * 60;
  return ((minutosTotais - inicioAgenda) / 20) * 80;
}

function atualizarFinanceiro(){
  const faturamento = Number(localStorage.getItem("caixa")) || 0;
  const atendimentosPagos = Number(localStorage.getItem("atendimentosPagos")) || 0;

  document.getElementById("faturamento").innerText = `R$ ${faturamento}`;
  document.getElementById("atendimentos-pagos").innerText = atendimentosPagos;
}

function criarCard(agendamento){
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

   supabaseClient
  .from("comandas")
  .insert([{
    cliente: agendamento.cliente,
    servico: agendamento.servico || "Novo Atendimento",
    valor: Number(valor),
    data: new Date().toLocaleDateString("pt-BR")
  }])
  .then(()=>{

    carregarHistoricoFinanceiro();

  });

    atualizarFinanceiro();

    card.style.opacity = "0.6";

    alert("Atendimento faturado!");

    return;
  }

 if(acao === "3"){

  const confirmar = confirm("Deseja excluir este agendamento?");

  if(!confirmar) return;

  supabaseClient
    .from("Agendamentos")
    .delete()
    .eq("id", agendamento.id)
    .then(()=>{

      card.remove();

    });

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

};
  coluna.appendChild(card);
}

function salvarAgendamento(){
  const agendamento = {
    id: Date.now(),
    cliente: document.getElementById("cliente").value,
    horario: document.getElementById("horario").value,
    profissional: document.getElementById("profissional").value,
    duracao: document.getElementById("duracao").value,
    servico: document.getElementById("servico").value
  };

  supabaseClient
    .from("Agendamentos")
    .insert([agendamento])
    .then(()=>{
      criarCard(agendamento);
      fecharModal();
    });
}

function carregarAgenda(){
  const colunas = document.querySelectorAll(".column");

  colunas.forEach((coluna)=>{
    coluna.innerHTML = "";
  });

  supabaseClient
    .from("Agendamentos")
    .select("*")
    .then((resposta)=>{
      const agendamentos = resposta.data || [];

      agendamentos.forEach((agendamento)=>{
        criarCard(agendamento);
      });
    });
}

function salvarCliente(){
  const cliente = {
  nome: document.getElementById("nomeCliente").value,
  telefone: document.getElementById("telefoneCliente").value,
  observacoes: document.getElementById("observacaoCliente").value
};

 supabaseClient
  .from("Agendamentos")
  .delete()
  .eq("id", Number(agendamento.id))
  .then((resposta)=>{

    if(resposta.error){
      alert("Erro ao excluir no Supabase: " + resposta.error.message);
      console.log(resposta.error);
      return;
    }

    card.remove();

  });
function carregarClientes(){
  supabaseClient
    .from("clients")
    .select("*")
    .then((resposta)=>{
      const clientes = resposta.data || [];
      const lista = document.getElementById("listaClientes");

      lista.innerHTML = "";

      clientes.forEach((cliente)=>{
        lista.innerHTML += `
          <div class="cliente-card">
            <strong>${cliente.nome}</strong>
            <p>${cliente.telefone}</p>
            <small>$${cliente.observacoes || ""}</small>
          </div>
        `;
      });
    });
}

function carregarHistoricoFinanceiro(){

  const lista = document.getElementById("historico-financeiro");

  if(!lista) return;

  lista.innerHTML = "";

  supabaseClient
    .from("comandas")
    .select("*")
    .then((resposta)=>{

      const historico = resposta.data || [];

      historico.forEach((item)=>{

        lista.innerHTML += `
          <div class="cliente-card">
            <strong>${item.cliente}</strong>
            <p>${item.servico} — R$ ${item.valor}</p>
            <small>${item.data}</small>
          </div>
        `;

      });

    });

}

function mostrarSecao(secao){
  document.querySelector(".agenda-container").style.display = "none";

  const secoes = document.querySelectorAll(".clientes-container");

  secoes.forEach((item)=>{
    item.style.display = "none";
  });

  document.getElementById(secao).style.display = "block";
}

function voltarAgenda(){
  const secoes = document.querySelectorAll(".clientes-container");

  secoes.forEach((item)=>{
    item.style.display = "none";
  });

  document.querySelector(".agenda-container").style.display = "block";
}

window.onload = function(){
  atualizarFinanceiro();
};
