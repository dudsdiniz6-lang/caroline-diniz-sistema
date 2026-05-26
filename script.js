const SUPABASE_URL = "https://oxvtfdxdlshbvtqtnpgo.supabase.co";
const SUPABASE_KEY = "sb_publishable_KQ58nMCXUZl0Nz5jEHkKKg_RbpL-QTw";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let dataSelecionada = new Date();
let servicoEditandoId = null;
const horariosAgenda = [
    "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00"
];
const usuarios = [
  {
    usuario:"eduarda",
    senha:"123",
    cargo:"dona",
    comissao:0
  },

  {
    usuario:"caroline",
    senha:"123",
    cargo:"dona",
    comissao:0
  },

  {
    usuario:"ana",
    senha:"123",
    cargo:"gerente",
    comissao:10
  },

  {
    usuario:"pedro",
    senha:"123",
    cargo:"funcionario",
    comissao:40
  },

  {
    usuario:"silamara",
    senha:"123",
    cargo:"funcionario",
    comissao:35
  },

  {
    usuario:"jessica",
    senha:"123",
    cargo:"funcionario",
    comissao:50
  },

  {
    usuario:"ssica",
    senha:"123",
    cargo:"funcionario",
    comissao:45
  },

  {
    usuario:"alice",
    senha:"123",
    cargo:"funcionario",
    comissao:30
  }
];

function formatarData(data){
  return data.toLocaleDateString("pt-BR");
}

function atualizarDataAgenda(){
  const campo = document.getElementById("data-agenda");
  if(campo) campo.innerText = formatarData(dataSelecionada);
}

function voltarDia(){
  dataSelecionada.setDate(dataSelecionada.getDate() - 1);
  atualizarDataAgenda();
  carregarAgenda();
}

function avancarDia(){
  dataSelecionada.setDate(dataSelecionada.getDate() + 1);
  atualizarDataAgenda();
  carregarAgenda();
}

function irParaHoje(){
  dataSelecionada = new Date();
  atualizarDataAgenda();
  carregarAgenda();
}

function abrirModal(){

  document.getElementById(
    "modal"
  ).style.display = "flex";

  const campoData =
    document.getElementById(
      "dataAgendamento"
    );

  if(campoData){

    campoData.value =
      dataSelecionada
        .toISOString()
        .split("T")[0];

  }

}

function fecharModal(){
  document.getElementById("modal").style.display = "none";
}

function fazerLogin(){
  const usuario = document.getElementById("usuario").value.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const senha = document.getElementById("senha").value.trim();

  const usuarioEncontrado = usuarios.find((item)=>{
    return item.usuario === usuario && item.senha === senha;
  });

  if(!usuarioEncontrado){
    alert("Usuário ou senha inválidos");
    return;
  }

  localStorage.setItem("usuarioLogado", JSON.stringify(usuarioEncontrado));
  window.usuarioAtual = usuarioEncontrado;
  document.getElementById("login-screen").style.display = "none";

  atualizarDataAgenda();
  carregarAgenda();
  carregarClientes();
  carregarHistoricoFinanceiro();
  aplicarPermissoes();
}

function sairSistema(){
  localStorage.removeItem("usuarioLogado");
  location.reload();
}

function calcularTop(horario){

  const [hora, minuto] = horario.split(":");

  const minutosTotais =
    Number(hora) * 60 + Number(minuto);

  const inicioAgenda = 7 * 60;

  return ((minutosTotais - inicioAgenda) / 30) * 80;

}

function criarCard(agendamento){
  const colunas = document.querySelectorAll(".column");
  const coluna = colunas[agendamento.profissional];

  if(!coluna) return;

  const card = document.createElement("div");
  card.classList.add("appointment");

  const statusClasse = (agendamento.status || "Agendado")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  card.classList.add(`status-${statusClasse}`);

  if(agendamento.servico){

  const classeServico =
    agendamento.servico
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replaceAll(" ","-");

  card.classList.add(
    classeServico
  );

}

  card.dataset.id = agendamento.id;
  card.style.top = `${calcularTop(agendamento.horario)}px`;

  const altura =
  ((agendamento.duracao || 30) / 30) * 80;
  card.style.height = `${altura - 10}px`;

  const [hora, minuto] =
  agendamento.horario.split(":");

const inicioMinutos =
  Number(hora)*60 + Number(minuto);

const fimMinutos =
  inicioMinutos +
  Number(agendamento.duracao || 20);

const horaFim =
  String(
    Math.floor(fimMinutos/60)
  ).padStart(2,"0");

const minutoFim =
  String(
    fimMinutos % 60
  ).padStart(2,"0");

const horarioFim =
  `${horaFim}:${minutoFim}`;

const agora = new Date();

const minutosAgora =
  (agora.getHours()*60)
  + agora.getMinutes();

const duracaoTotal =
  fimMinutos - inicioMinutos;

const progresso =
  Math.max(
    0,
    Math.min(
      100,
      (
        (
          minutosAgora
          - inicioMinutos
        )
        / duracaoTotal
      ) * 100
    )
  );

card.innerHTML = `
  <strong>${agendamento.cliente}</strong>

  <span>
    ${agendamento.servico || "Novo Atendimento"}
  </span>

  <small>
    ${agendamento.horario}
    •
    ${horarioFim}
  </small>

  <em>
    ${agendamento.status || "Agendado"}
  </em>

  <div
    class="barra-progresso-atendimento"
    style="width:${progresso}%"
  ></div>
`;
  card.onclick = function(){

  const acao = prompt(
  "Digite:\n1 - Editar horário\n2 - Faturar\n3 - Excluir\n4 - Confirmar\n5 - Finalizar\n6 - Cancelar atendimento\n7 - Enviar WhatsApp\n8 - Faltou\n9 - Reagendado"
);

if(acao === "7"){

  if(!agendamento.telefone){
    alert("Este agendamento não tem telefone cadastrado.");
    return;
  }

      const telefone = agendamento.telefone.replace(/\D/g, "");

      const mensagem = `Olá, ${agendamento.cliente}! Tudo bem?

Passando para confirmar seu horário no Caroline Diniz.

📅 Data: ${agendamento.data}
⏰ Horário: ${agendamento.horario}
✨ Serviço: ${agendamento.servico || "Atendimento"}

Pedimos que responda esta mensagem confirmando sua presença.`;
      const link = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;

      window.open(link, "_blank");

      return;
    }

    if(acao === "2"){

  const valor = prompt("Valor do atendimento:");

  if(!valor) return;

  const profissionalNome = ["Carol", "Jessica", "Fernanda", "Silamara"][agendamento.profissional];

      const profissionalUsuario = usuarios.find((usuario)=>{
  return (
    usuario.usuario.toLowerCase() === profissionalNome.toLowerCase()
  );
});

const porcentagemComissao =
  profissionalUsuario?.comissao || 0;

const comissao =
  Number(valor) * (porcentagemComissao / 100);

  supabaseClient
    .from("comandas")
    .insert([{
      id: Date.now(),
      cliente: agendamento.cliente,
      servico: agendamento.servico || "Novo Atendimento",
      valor: Number(valor),
      data: formatarData(dataSelecionada)
    }])
    .then(()=>{

     supabaseClient
  .from("comissoes")
  .insert([{
    id: Date.now(),
    profissional: profissionalNome,
    cliente: agendamento.cliente,
    servico: agendamento.servico || "Novo Atendimento",
    valor: Number(valor),
    comissao: comissao,
    data: formatarData(dataSelecionada)
  }]);

supabaseClient
  .from("consumo_servicos")
  .select("*")
  .eq("servico", agendamento.servico)
  .then((consumoResposta)=>{

    const consumos = consumoResposta.data || [];

    consumos.forEach((consumo)=>{

      supabaseClient
        .from("estoque")
        .select("*")
        .eq("produto", consumo.produto)
        .single()
        .then((produtoResposta)=>{

          const produto = produtoResposta.data;

          if(!produto) return;

          const novaQuantidade =
            Number(produto.quantidade) - Number(consumo.quantidade);

          supabaseClient
            .from("estoque")
            .update({
              quantidade:novaQuantidade
            })
            .eq("id", produto.id);

        });

    });

    carregarEstoque();

  });

carregarHistoricoFinanceiro();

card.style.opacity = "0.6";

alert("Atendimento faturado!");

    });

  return;
}

    if(acao === "3"){

      const confirmar = confirm("Deseja excluir este agendamento?");
      if(!confirmar) return;

      supabaseClient
        .from("Agendamentos")
        .delete()
        .eq("id", Number(agendamento.id))
        .then((resposta)=>{
          if(resposta.error){
            alert("Erro ao excluir: " + resposta.error.message);
            return;
          }

          card.remove();
          carregarAgenda();
        });

      return;
    }

    if(acao === "4"){
      atualizarStatus(agendamento, "Confirmado");
      return;
    }

    if(acao === "5"){
      atualizarStatus(agendamento, "Finalizado");
      return;
    }

    if(acao === "6"){
      atualizarStatus(agendamento, "Cancelado");
      return;
    }
    if(acao === "8"){
  atualizarStatus(agendamento, "Faltou");
  return;
}

if(acao === "9"){
  atualizarStatus(agendamento, "Reagendado");
  return;
}

    const novoHorario = prompt("Editar horário:", agendamento.horario);
    if(!novoHorario) return;

    supabaseClient
      .from("Agendamentos")
      .update({ horario: novoHorario })
      .eq("id", Number(agendamento.id))
      .then((resposta)=>{
        if(resposta.error){
          alert("Erro ao editar: " + resposta.error.message);
          return;
        }

        carregarAgenda();
      });
  };

  coluna.appendChild(card);
}

function atualizarStatus(agendamento, status){
  supabaseClient
    .from("Agendamentos")
    .update({ status })
    .eq("id", Number(agendamento.id))
    .then((resposta)=>{
      if(resposta.error){
        alert("Erro ao atualizar status");
        return;
      }

      carregarAgenda();
    });
}
function salvarAgendamento(){

  const cliente =
    document.getElementById("cliente").value.trim();

  const servico =
    document.getElementById("servico").value.trim();

  const horario =
    document.getElementById("horario").value;

  const profissional =
    document.getElementById("profissional").value;

  const duracao =
    Number(
      document.getElementById("duracao").value
    );

  const preco =
    Number(
      document.getElementById(
        "precoAgendamento"
      )?.value || 0
    );

  const desconto =
    Number(
      document.getElementById(
        "descontoAgendamento"
      )?.value || 0
    );

  const observacao =
    document.getElementById(
      "observacaoAgendamento"
    )?.value || "";

  const dataCampo =
    document.getElementById(
      "dataAgendamento"
    )?.value;

  if(!cliente){
    alert("Selecione uma cliente.");
    return;
  }

  if(!servico){
    alert("Selecione um serviço.");
    return;
  }

  if(!horario){
    alert("Selecione um horário.");
    return;
  }

  const dataSalvar =
    dataCampo
      ? new Date(dataCampo)
          .toLocaleDateString("pt-BR")
      : formatarData(dataSelecionada);

  const agendamento = {

    id: Date.now(),

    cliente,

    telefone:"",

    horario,

    profissional,

    duracao,

    servico,

    preco,

    desconto,

    observacao,

    status:"Agendado",

    data:dataSalvar

  };

  supabaseClient
    .from("Agendamentos")
    .insert([agendamento])

    .then((resposta)=>{

      if(resposta.error){

        alert(
          "Erro ao salvar: "
          + resposta.error.message
        );

        return;
      }

      fecharModal();

      carregarAgenda();

      alert(
        "Agendamento salvo!"
      );

    });

}

function carregarAgenda(){

  const colunas = document.querySelectorAll(".column");
  const profissionais = document.querySelectorAll(".professional");

  const filtro =
    document.getElementById("filtroProfissional")?.value || "";

  const busca =
    document.getElementById("buscaCliente")
      ?.value
      .toLowerCase()
      .trim() || "";

  const agendaHeader =
    document.querySelector(".agenda-header");

  const agendaBody =
    document.querySelector(".agenda-body");

  colunas.forEach((coluna, index)=>{

    coluna.innerHTML = "";
    coluna.style.position = "relative";

    coluna.addEventListener("click", function(event){

      if(event.target.closest(".appointment")){
        return;
      }

      const rect = coluna.getBoundingClientRect();

      const y = event.clientY - rect.top;

      const bloco = Math.floor(y / 80);

      const horario = horariosAgenda[bloco];

      if(!horario) return;

      document.getElementById("profissional").value = index;

      document.getElementById("horario").value = horario;

      abrirModal();

    });

  });

  if(filtro === ""){

    agendaHeader.style.gridTemplateColumns =
      "80px repeat(4, 1fr)";

    agendaBody.style.gridTemplateColumns =
      "80px repeat(4, 1fr)";

    colunas.forEach((coluna)=>{
      coluna.style.display = "block";
    });

    profissionais.forEach((profissional)=>{
      profissional.style.display = "block";
    });

  }else{

    agendaHeader.style.gridTemplateColumns =
      "80px 1fr";

    agendaBody.style.gridTemplateColumns =
      "80px 1fr";

    colunas.forEach((coluna, index)=>{
      coluna.style.display =
        String(index) === filtro
          ? "block"
          : "none";
    });

    profissionais.forEach((profissional, index)=>{
      profissional.style.display =
        String(index) === filtro
          ? "block"
          : "none";
    });

  }

  supabaseClient
    .from("Agendamentos")
    .select("*")
    .eq("data", formatarData(dataSelecionada))
    .then((resposta)=>{

      const agendamentos =
        resposta.data || [];

      agendamentos.forEach((agendamento)=>{

        if(
          filtro !== "" &&
          agendamento.profissional != filtro
        ){
          return;
        }

        if(
          busca !== "" &&
          !agendamento.cliente
            .toLowerCase()
            .includes(busca)
        ){
          return;
        }

        criarCard(agendamento);

      });

      ativarArrastar();

    });

}

function salvarCliente(){

  const cliente = {
  nome: document.getElementById("nomeCliente").value,
  telefone: document.getElementById("telefoneCliente").value,
  aniversario: document.getElementById("aniversarioCliente").value,
  preferencia: document.getElementById("preferenciaCliente").value,
  alergias: document.getElementById("alergiasCliente").value,
    foto: document.getElementById("fotoCliente").value,
  observacoes: document.getElementById("observacaoCliente").value
};

  supabaseClient
    .from("clients")
    .insert([cliente])
    .then((resposta)=>{
      if(resposta.error){
        alert("Erro ao salvar cliente: " + resposta.error.message);
        return;
      }

      document.getElementById("nomeCliente").value = "";
      document.getElementById("telefoneCliente").value = "";
      document.getElementById("observacaoCliente").value = "";

      carregarClientes();
    });
}

function carregarClientes(){

  supabaseClient
    .from("clients")
    .select("*")
    .then((resposta)=>{

      const clientes = resposta.data || [];

      supabaseClient
        .from("comandas")
        .select("*")
        .then((financeiroResposta)=>{

          const historico = financeiroResposta.data || [];
          const lista = document.getElementById("listaClientes");
          const alertaAniversariantes =
  document.getElementById("alerta-aniversariantes");
          const clientesRetorno =
  document.getElementById("clientes-retorno");

          if(!lista) return;

          lista.innerHTML = "";

          const hoje = new Date();
          const diaHoje = String(hoje.getDate()).padStart(2,"0");
          const mesHoje = String(hoje.getMonth() + 1).padStart(2,"0");

          clientes.forEach((cliente)=>{

            const historicoCliente = historico.filter((item)=>{
              return item.cliente === cliente.nome;
            });

            const totalGasto = historicoCliente.reduce((total, item)=>{
              return total + Number(item.valor);
            }, 0);

            const quantidadeVisitas = historicoCliente.length;

            const ultimoProcedimento =
              historicoCliente.length > 0
                ? historicoCliente[historicoCliente.length - 1].servico
                : "Nenhum";

            let diasSemVir = 0;

            if(historicoCliente.length > 0){
              const ultimaData = historicoCliente[historicoCliente.length - 1].data;
              const partes = ultimaData.split("/");

              const dataUltimaVisita = new Date(
                partes[2],
                partes[1] - 1,
                partes[0]
              );

              diasSemVir = Math.floor(
                (hoje - dataUltimaVisita) / (1000 * 60 * 60 * 24)
              );
              if(
  clientesRetorno &&
  diasSemVir >= 20
){

  clientesRetorno.innerHTML += `
    <div class="cliente-card">

      <strong>
        ${cliente.nome}
      </strong>

      <small>
        ${diasSemVir} dias sem retornar
      </small>

      <button onclick="enviarMensagemRetorno(
        '${cliente.nome}',
        '${cliente.telefone}'
      )">
        Chamar cliente
      </button>

    </div>
  `;

}
            }

            lista.innerHTML += `
            ${
  cliente.aniversario &&
  cliente.aniversario.slice(5,10) === `${mesHoje}-${diaHoje}`
    ? `
      <div class="cliente-card">
        <strong>🎂 ${cliente.nome} faz aniversário hoje</strong>

        <button onclick="enviarMensagemAniversario(
          '${cliente.nome}',
          '${cliente.telefone}'
        )">
          Enviar parabéns
        </button>
      </div>
    `
    : ""
}
              <div class="cliente-card">
                <strong>${cliente.nome}</strong>

                ${
                  cliente.aniversario &&
                  cliente.aniversario.slice(5,10) === `${mesHoje}-${diaHoje}`
                   ? `
  <span class='aniversariante'>
    Aniversariante hoje 🎂
  </span>

  <button onclick="enviarMensagemAniversario(
    '${cliente.nome}',
    '${cliente.telefone}'
  )">
    Enviar parabéns
  </button>
`
                    : ""
                }
${
  cliente.foto
    ? `<img src="${cliente.foto}" class="foto-cliente">`
    : ""
}
                <p>${cliente.telefone}</p>

                <small>🎂 ${cliente.aniversario || "Não informado"}</small>
                <small>✨ ${cliente.preferencia || "Sem preferências"}</small>
                <small>⚠ ${cliente.alergias || "Sem alergias"}</small>
                <small>📝 ${cliente.observacoes || ""}</small>

                <hr>

                <small>💰 Total gasto: R$ ${totalGasto.toFixed(2)}</small>
                <small>📅 Visitas: ${quantidadeVisitas}</small>
                <small>💅 Último procedimento: ${ultimoProcedimento}</small>
                <small>⏳ Dias sem vir: ${diasSemVir}</small>

                ${
                  diasSemVir >= 30
                    ? "<span class='aniversariante'>Cliente para reativar</span>"
                    : ""
                }
                <button onclick="editarCliente('${cliente.id}')">
  Editar
</button>
<button onclick="verGaleriaCliente('${cliente.id}')">
  Galeria
</button>
<button onclick="excluirCliente('${cliente.id}')">
  Excluir
</button>
              </div>
            `;

          });

          document.getElementById("clientes-total").innerText = clientes.length;

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

      let total = 0;
      let totalComissoes = 0;
      const metaMensal = 30000;
      const hoje = new Date();

const diaAtual = hoje.getDate();

const ultimoDiaMes = new Date(
  hoje.getFullYear(),
  hoje.getMonth() + 1,
  0
).getDate();
      const ranking = {};
      const rankingServicos = {};
      const faturamentoMensal = {};
      const rankingProfissionais = {};
      let faltas = 0;
let totalAtendimentos = 0;

      historico.forEach((item)=>{

        total += Number(item.valor);
        totalComissoes += Number(item.valor) * 0.4;
        totalAtendimentos++;

if(item.status === "Faltou"){
  faltas++;
}
        
        if(!ranking[item.cliente]){
  ranking[item.cliente] = 0;
}

ranking[item.cliente] += Number(item.valor);
        if(!rankingServicos[item.servico]){
  rankingServicos[item.servico] = 0;
}

rankingServicos[item.servico] += 1;
        if(item.profissional){

  if(!rankingProfissionais[item.profissional]){
    rankingProfissionais[item.profissional] = 0;
  }

  rankingProfissionais[item.profissional] += Number(item.valor);

}
        const partesData = item.data.split("/");

const mesAno = `${partesData[1]}/${partesData[2]}`;

if(!faturamentoMensal[mesAno]){
  faturamentoMensal[mesAno] = 0;
}

faturamentoMensal[mesAno] += Number(item.valor);

        lista.innerHTML += `
          <div class="cliente-card">
            <strong>${item.cliente}</strong>
            <p>${item.servico} — R$ ${item.valor}</p>
            <small>${item.data}</small>
          </div>
        `;

      });

      const ctx = document.getElementById("graficoFinanceiro");

      if(ctx && typeof Chart !== "undefined"){

        const valores = historico.map((item)=> Number(item.valor));

        const nomes = historico.map((item)=> item.cliente);

        if(window.graficoFinanceiro){
          window.graficoFinanceiro.destroy();
        }

        window.graficoFinanceiro = new Chart(ctx,{
          type:"bar",
          data:{
            labels:nomes,
            datasets:[{
              label:"Faturamento",
              data:valores
            }]
          }
        });

      }
const rankingDiv = document.getElementById("ranking-clientes");
      const rankingServicosDiv = document.getElementById("ranking-servicos");
      const rankingProfissionaisDiv = document.getElementById("ranking-profissionais");
      const faturamentoMensalDiv = document.getElementById("faturamento-mensal");
      const taxaFaltasDiv = document.getElementById("taxa-faltas");
      const lucroLiquidoDiv = document.getElementById("lucro-liquido");
      const metaMensalDiv = document.getElementById("meta-mensal");
      const previsaoFaturamentoDiv = document.getElementById("previsao-faturamento");

if(rankingDiv){

  rankingDiv.innerHTML = "";

  Object.keys(ranking)
    .sort((a,b)=> ranking[b] - ranking[a])
    .slice(0,5)
    .forEach((cliente)=>{

      rankingDiv.innerHTML += `
        <div class="cliente-card">
          <strong>${cliente}</strong>
          <p>Total gasto</p>
          <small>R$ ${ranking[cliente].toFixed(2)}</small>
        </div>
      `;

    });

}

if(rankingServicosDiv){
  if(rankingProfissionaisDiv){

  rankingProfissionaisDiv.innerHTML = "";

  Object.keys(rankingProfissionais)
    .sort((a,b)=> rankingProfissionais[b] - rankingProfissionais[a])
    .forEach((profissional)=>{

      rankingProfissionaisDiv.innerHTML += `
        <div class="cliente-card">

          <strong>
            ${profissional}
          </strong>

          <p>Faturamento produzido</p>

          <small>
            R$ ${rankingProfissionais[profissional].toFixed(2)}
          </small>

        </div>
      `;

    });

}

  rankingServicosDiv.innerHTML = "";

  Object.keys(rankingServicos)
    .sort((a,b)=> rankingServicos[b] - rankingServicos[a])
    .slice(0,5)
    .forEach((servico)=>{

      rankingServicosDiv.innerHTML += `
        <div class="cliente-card">
          <strong>${servico}</strong>
          <p>Quantidade vendida</p>
          <small>${rankingServicos[servico]} vendas</small>
        </div>
      `;

    });

}

if(faturamentoMensalDiv){

  faturamentoMensalDiv.innerHTML = "";

  Object.keys(faturamentoMensal).forEach((mes)=>{

    faturamentoMensalDiv.innerHTML += `
      <div class="cliente-card">
        <strong>${mes}</strong>
        <p>Faturamento do mês</p>
        <small>R$ ${faturamentoMensal[mes].toFixed(2)}</small>
      </div>
    `;

  });

}

if(taxaFaltasDiv){

  const porcentagemFaltas =
    totalAtendimentos > 0
      ? ((faltas / totalAtendimentos) * 100).toFixed(1)
      : 0;

  taxaFaltasDiv.innerHTML = `
    <div class="cliente-card">
      <strong>${porcentagemFaltas}%</strong>
      <p>Taxa de faltas</p>
      <small>
        ${faltas} faltas em ${totalAtendimentos} atendimentos
      </small>
    </div>
  `;

}
    if(lucroLiquidoDiv){
    if(metaMensalDiv){

  const porcentagemMeta = Math.min(
    ((total / metaMensal) * 100),
    100
  );

  const falta = Math.max(
    metaMensal - total,
    0
  );

  metaMensalDiv.innerHTML = `
    <div class="cliente-card">

      <strong>
        ${porcentagemMeta.toFixed(1)}%
      </strong>

      <p>Meta mensal atingida</p>

      <small>
        Faturado: R$ ${total.toFixed(2)}
      </small>

      <small>
        Falta: R$ ${falta.toFixed(2)}
      </small>

      <div class="barra-meta">
        <div
          class="progresso-meta"
          style="width:${porcentagemMeta}%"
        ></div>
      </div>

    </div>
  `;

}

if(previsaoFaturamentoDiv){

  const mediaDiaria = total / diaAtual;

  const previsao = mediaDiaria * ultimoDiaMes;

  previsaoFaturamentoDiv.innerHTML = `
    <div class="cliente-card">

      <strong>
        R$ ${previsao.toFixed(2)}
      </strong>

      <p>Previsão de fechamento do mês</p>

      <small>
        Média diária: R$ ${mediaDiaria.toFixed(2)}
      </small>

      <small>
        Baseado em ${diaAtual} dias trabalhados
      </small>

    </div>
  `;

}

const lucroLiquido = total - totalComissoes;
  lucroLiquidoDiv.innerHTML = `
    <div class="cliente-card">
      <strong>R$ ${lucroLiquido.toFixed(2)}</strong>
      <p>Lucro líquido estimado</p>

      <small>
        Faturamento: R$ ${total.toFixed(2)}
      </small>

      <small>
        Comissões: R$ ${totalComissoes.toFixed(2)}
      </small>
    </div>
  `;

}  


document.getElementById("faturamento").innerText = `R$ ${total}`;
document.getElementById("atendimentos-pagos").innerText = historico.length;

    });

}
function carregarComissoes(){

  const lista = document.getElementById("lista-comissoes");

  if(!lista) return;

  lista.innerHTML = "";
  const metasDiv = document.getElementById("metas-profissionais");
  const resumoComissoesDiv = document.getElementById("resumo-comissoes");

if(metasDiv){
  metasDiv.innerHTML = "";
}

  supabaseClient
    .from("comissoes")
    .select("*")
    .then((resposta)=>{

      const comissoes = resposta.data || [];

      const resumo = {};

      comissoes.forEach((item)=>{
        const resumoProfissionais = {};

        if(!resumo[item.profissional]){
          resumo[item.profissional] = 0;
        }

        resumo[item.profissional] += Number(item.comissao);
        if(!resumoProfissionais[item.profissional]){

  const profissionalUsuario = usuarios.find((usuario)=>{
    return usuario.usuario.toLowerCase() === item.profissional.toLowerCase();
  });

  resumoProfissionais[item.profissional] = {
    total:0,
    porcentagem: profissionalUsuario?.comissao || 0
  };

}

resumoProfissionais[item.profissional].total += Number(item.comissao);

      });
const metas = {
  Carol:5000,
  Jessica:5000,
  Fernanda:5000,
  Silamara:5000
};
      Object.keys(resumo).forEach((profissional)=>{
        if(resumoComissoesDiv){

  resumoComissoesDiv.innerHTML = "";

  Object.keys(resumoProfissionais).forEach((profissional)=>{

    const dados = resumoProfissionais[profissional];

    resumoComissoesDiv.innerHTML += `
      <div class="cliente-card">

        <strong>
          ${profissional}
        </strong>

        <small>
          Comissão: ${dados.porcentagem}%
        </small>

        <small>
          Total a receber:
          R$ ${dados.total.toFixed(2)}
        </small>

      </div>
    `;

  });

}
const valorMeta = metas[profissional] || 5000;

const porcentagem = Math.min(
  (resumo[profissional] / valorMeta) * 100,
  100
);

metasDiv.innerHTML += `
  <div class="cliente-card">
    <strong>${profissional}</strong>

    <div class="barra-meta">
      <div 
        class="progresso-meta"
        style="width:${porcentagem}%"
      ></div>
    </div>

    <small>
      R$ ${resumo[profissional].toFixed(2)}
      / R$ ${valorMeta}
    </small>
  </div>
`;
        lista.innerHTML += `
          <div class="cliente-card">
            <strong>${profissional}</strong>
            <p>Total de comissão</p>
            <small>R$ ${resumo[profissional].toFixed(2)}</small>
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

  const secaoSelecionada = document.getElementById(secao);

  if(secaoSelecionada){
    secaoSelecionada.style.display = "block";
  }

  if(secao === "clientes-container"){
    carregarClientes();
  }

  if(secao === "financeiro-container"){
    carregarHistoricoFinanceiro();
  }

  if(secao === "comissoes-container"){
    carregarComissoes();
  }

}

function voltarAgenda(){

  const secoes = document.querySelectorAll(".clientes-container");

  secoes.forEach((item)=>{
    item.style.display = "none";
  });

  document.querySelector(".agenda-container").style.display = "block";

  carregarAgenda();
}

function ativarArrastar(){

  if(typeof interact === "undefined"){
    return;
  }

  interact(".appointment").draggable({
    listeners:{
      move(event){

        const target = event.target;

        const x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

        target.style.transform = `translate(${x}px, ${y}px)`;

        target.setAttribute("data-x", x);
        target.setAttribute("data-y", y);
      },

      end(event){

        const target = event.target;

        const x = parseFloat(target.getAttribute("data-x")) || 0;
        const y = parseFloat(target.getAttribute("data-y")) || 0;

        const colunas = Array.from(document.querySelectorAll(".column"));

        let colunaAtual = target.parentElement;
        let indiceAtual = colunas.indexOf(colunaAtual);

        const larguraColuna = colunaAtual.offsetWidth;

        let deslocamentoColunas = Math.round(x / larguraColuna);
        let novoIndice = indiceAtual + deslocamentoColunas;

        if(novoIndice < 0) novoIndice = 0;
        if(novoIndice > colunas.length - 1) novoIndice = colunas.length - 1;

        const novaColuna = colunas[novoIndice];

        novaColuna.appendChild(target);

        const topAtual = parseFloat(target.style.top) || 0;
        const novoTop = topAtual + y;
        const encaixado = Math.round(novoTop / 80) * 80;

        target.style.transform = "translate(0px, 0px)";
        target.style.top = `${encaixado}px`;

        target.setAttribute("data-x", 0);
        target.setAttribute("data-y", 0);

        const minutosDesdeInicio =
  (encaixado / 80) * 30;

const minutosTotais =
  (7 * 60) + minutosDesdeInicio;

        const hora = Math.floor(minutosTotais / 60);
        const minuto = minutosTotais % 60;

        const novoHorario = `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;

        target.querySelector("small").innerText = novoHorario;

        const id = Number(target.dataset.id);

        supabaseClient
          .from("Agendamentos")
          .update({
            horario: novoHorario,
            profissional: String(novoIndice)
          })
          .eq("id", id);
      }
    }
  });
}

window.onload = function(){

  atualizarDataAgenda();

  carregarHistoricoFinanceiro();

  carregarClientes();

  carregarCaixa();

  carregarEstoque();

  carregarConsumoServicos();

  carregarHorariosAgenda();

  carregarClientesAgendamento();

  carregarServicosSalao();

  carregarCategoriasServicos();

  carregarPacotes();
    atualizarLinhaHorarioAtual();

setInterval(
  atualizarLinhaHorarioAtual,
  60000
);

};
let eventoInstalacao = null;

window.addEventListener("beforeinstallprompt", (event)=>{
  event.preventDefault();

  eventoInstalacao = event;

  const botao = document.getElementById("btn-instalar");

  if(botao){
    botao.style.display = "inline-block";
  }
});

document.addEventListener("click", (event)=>{

  if(event.target && event.target.id === "btn-instalar"){

    if(!eventoInstalacao){
      alert("Instalação ainda não disponível neste navegador.");
      return;
    }

    eventoInstalacao.prompt();

    eventoInstalacao.userChoice.then(()=>{
      eventoInstalacao = null;
      document.getElementById("btn-instalar").style.display = "none";
    });
  }

});
function editarCliente(id){

  supabaseClient
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()
    .then((resposta)=>{

      const cliente = resposta.data;

      if(!cliente) return;

      const nome = prompt("Nome:", cliente.nome);
      if(nome === null) return;

      const telefone = prompt("Telefone:", cliente.telefone || "");
      const aniversario = prompt("Aniversário:", cliente.aniversario || "");
      const preferencia = prompt("Preferência:", cliente.preferencia || "");
      const alergias = prompt("Alergias:", cliente.alergias || "");
      const observacoes = prompt("Observações:", cliente.observacoes || "");

      supabaseClient
        .from("clients")
        .update({
          nome,
          telefone,
          aniversario,
          preferencia,
          alergias,
          observacoes
        })
        .eq("id", id)
        .then(()=>{

          alert("Cliente atualizado!");
          carregarClientes();

        });

    });

}
function excluirCliente(id){

  const confirmar = confirm(
    "Deseja realmente excluir esta cliente?"
  );

  if(!confirmar) return;

  supabaseClient
    .from("clients")
    .delete()
    .eq("id", id)
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao excluir cliente.");
        return;
      }

      alert("Cliente excluída!");
      carregarClientes();

    });

}
function aplicarPermissoes(){

  const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

  if(!usuario) return;

  const links = document.querySelectorAll("nav a");

  links.forEach((link)=>{

    const texto = link.innerText.trim();

    if(usuario.cargo === "funcionario"){

      if(
        texto === "Financeiro" ||
        texto === "Comissões" ||
        texto === "Configurações"
      ){
        link.style.display = "none";
      }

    }

    if(usuario.cargo === "gerente"){

      if(texto === "Configurações"){
        link.style.display = "none";
      }

    }

  });

}
function salvarFotoCliente(){

  const imagem = document.getElementById("fotoAntesDepois").value;
  const descricao = document.getElementById("descricaoFoto").value;

  const clienteId = prompt(
    "Digite o ID da cliente para salvar a foto:"
  );

  if(!clienteId || !imagem) return;

  supabaseClient
    .from("fotos_clientes")
    .insert([{
      id: Date.now(),
      cliente_id: clienteId,
      imagem: imagem,
      descricao: descricao,
      data: new Date().toLocaleDateString("pt-BR")
    }])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao salvar foto.");
        return;
      }

      alert("Foto salva com sucesso!");

      document.getElementById("fotoAntesDepois").value = "";
      document.getElementById("descricaoFoto").value = "";

    });

}
function salvarFotoCliente(){

  const imagem = document.getElementById("fotoAntesDepois").value;
  const descricao = document.getElementById("descricaoFoto").value;

  const clienteId = prompt(
    "Digite o ID da cliente para salvar a foto:"
  );

  if(!clienteId || !imagem) return;

  supabaseClient
    .from("fotos_clientes")
    .insert([{
      id: Date.now(),
      cliente_id: clienteId,
      imagem: imagem,
      descricao: descricao,
      data: new Date().toLocaleDateString("pt-BR")
    }])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao salvar foto.");
        return;
      }

      alert("Foto salva com sucesso!");

      document.getElementById("fotoAntesDepois").value = "";
      document.getElementById("descricaoFoto").value = "";

    });

}
function verGaleriaCliente(clienteId){

  supabaseClient
    .from("fotos_clientes")
    .select("*")
    .eq("cliente_id", clienteId)
    .then((resposta)=>{

      const fotos = resposta.data || [];

      if(fotos.length === 0){
        alert("Esta cliente ainda não possui fotos salvas.");
        return;
      }

      let mensagem = "Galeria da cliente:\n\n";

      fotos.forEach((foto)=>{
        mensagem += `${foto.data} - ${foto.descricao || "Sem descrição"}\n${foto.imagem}\n\n`;
      });

      alert(mensagem);

    });

}
function salvarCaixa(){

  const entrada = Number(
    document.getElementById("entradaCaixa").value || 0
  );

  const despesa = Number(
    document.getElementById("despesaCaixa").value || 0
  );

  supabaseClient
    .from("caixa")
    .insert([{
      id: Date.now(),
      entrada,
      despesa,
      data: new Date().toLocaleDateString("pt-BR")
    }])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao salvar caixa.");
        return;
      }

      alert("Caixa salvo!");

      document.getElementById("entradaCaixa").value = "";
      document.getElementById("despesaCaixa").value = "";

      carregarCaixa();

    });

}
function carregarCaixa(){

  const caixaDiv = document.getElementById("caixa-diario");

  if(!caixaDiv) return;

  caixaDiv.innerHTML = "";

  supabaseClient
    .from("caixa")
    .select("*")
    .then((resposta)=>{

      const caixas = resposta.data || [];

      let totalEntrada = 0;
      let totalDespesa = 0;

      caixas.forEach((item)=>{

        totalEntrada += Number(item.entrada || 0);
        totalDespesa += Number(item.despesa || 0);

      });

      const saldo = totalEntrada - totalDespesa;

      caixaDiv.innerHTML = `
        <div class="cliente-card">

          <strong>
            R$ ${saldo.toFixed(2)}
          </strong>

          <p>Saldo do caixa</p>

          <small>
            Entradas: R$ ${totalEntrada.toFixed(2)}
          </small>

          <small>
            Despesas: R$ ${totalDespesa.toFixed(2)}
          </small>

        </div>
      `;

    });

}
function salvarProdutoEstoque(){

  const produto = document.getElementById("produtoEstoque").value;
  const quantidade = Number(document.getElementById("quantidadeEstoque").value || 0);
  const custo = Number(document.getElementById("custoEstoque").value || 0);

  supabaseClient
    .from("estoque")
    .insert([{
      id: Date.now(),
      produto,
      quantidade,
      custo
    }])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao salvar produto.");
        return;
      }

      alert("Produto salvo!");

      document.getElementById("produtoEstoque").value = "";
      document.getElementById("quantidadeEstoque").value = "";
      document.getElementById("custoEstoque").value = "";

      carregarEstoque();

    });

}
function carregarEstoque(){

  const lista = document.getElementById("lista-estoque");

  if(!lista) return;

  lista.innerHTML = "";

  supabaseClient
    .from("estoque")
    .select("*")
    .then((resposta)=>{

      const produtos = resposta.data || [];

      produtos.forEach((produto)=>{

        const estoqueBaixo = produto.quantidade <= 3;

        lista.innerHTML += `
          <div class="cliente-card">

            <strong>
              ${produto.produto}
            </strong>

            ${
              estoqueBaixo
                ? "<span class='aniversariante'>Estoque baixo</span>"
                : ""
            }

            <small>
              Quantidade: ${produto.quantidade}
            </small>

            <small>
              Custo: R$ ${Number(produto.custo).toFixed(2)}
            </small>

          </div>
        `;

      });

    });

}
function salvarConsumoServico(){

  const servico = document.getElementById("servicoConsumo").value;
  const produto = document.getElementById("produtoConsumo").value;
  const quantidade = Number(document.getElementById("quantidadeConsumo").value || 0);

  supabaseClient
    .from("consumo_servicos")
    .insert([{
      id: Date.now(),
      servico,
      produto,
      quantidade
    }])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao salvar consumo.");
        return;
      }

      alert("Consumo salvo!");

      document.getElementById("servicoConsumo").value = "";
      document.getElementById("produtoConsumo").value = "";
      document.getElementById("quantidadeConsumo").value = "";

    });

}
function carregarConsumoServicos(){

  const lista = document.getElementById("lista-consumo-servicos");

  if(!lista) return;

  lista.innerHTML = "";

  supabaseClient
    .from("consumo_servicos")
    .select("*")
    .then((resposta)=>{

      const consumos = resposta.data || [];

      consumos.forEach((item)=>{

        lista.innerHTML += `
          <div class="cliente-card">

            <strong>
              ${item.servico}
            </strong>

            <small>
              Produto: ${item.produto}
            </small>

            <small>
              Quantidade consumida: ${item.quantidade}
            </small>

          </div>
        `;

      });

    });

}
function gerarFechamentoMensal(){

  const div = document.getElementById("fechamento-mensal");

  if(!div) return;

  div.innerHTML = "";

  supabaseClient
    .from("comissoes")
    .select("*")
    .then((resposta)=>{

      const comissoes = resposta.data || [];

      const fechamento = {};

      comissoes.forEach((item)=>{

        if(!fechamento[item.profissional]){
          fechamento[item.profissional] = {
            producao:0,
            comissao:0
          };
        }

        fechamento[item.profissional].producao += Number(item.valor);
        fechamento[item.profissional].comissao += Number(item.comissao);

      });

      Object.keys(fechamento).forEach((profissional)=>{

        const dados = fechamento[profissional];

        div.innerHTML += `
          <div class="cliente-card">

            <strong>${profissional}</strong>

            <p>Produção mensal: R$ ${dados.producao.toFixed(2)}</p>

            <small>
              Comissão a pagar: R$ ${dados.comissao.toFixed(2)}
            </small>

          </div>
        `;

      });

    });

}
function enviarMensagemAniversario(nome, telefone){

  if(!telefone){
    alert("Cliente sem telefone cadastrado.");
    return;
  }

  const numero = telefone.replace(/\D/g, "");

  const mensagem = `Olá, ${nome}! 🎂✨

Hoje é um dia muito especial e não poderíamos deixar de passar aqui para desejar um feliz aniversário!

Que seu novo ciclo seja repleto de saúde, felicidade, autoestima e momentos incríveis. 💖

Com carinho,
Equipe Caroline Diniz`;

  const link =
    `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;

  window.open(link, "_blank");

}
function enviarMensagemRetorno(nome, telefone){

  if(!telefone){
    alert("Cliente sem telefone.");
    return;
  }

  const numero = telefone.replace(/\D/g, "");

  const mensagem = `Olá, ${nome}! 💖

Sentimos sua falta aqui no Caroline Diniz ✨

Já faz um tempinho desde seu último atendimento e será um prazer te receber novamente para cuidar da sua autoestima e beleza.

Quer agendar seu próximo horário?`;

  const link =
    `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;

  window.open(link, "_blank");

}
function carregarHorariosAgenda(){

  const selectHorario = document.getElementById("horario");

  if(!selectHorario) return;

  selectHorario.innerHTML = `
    <option value="">Selecione o horário</option>
  `;

  horariosAgenda.forEach((horario)=>{

    selectHorario.innerHTML += `
      <option value="${horario}">
        ${horario}
      </option>
    `;

  });

}
function carregarClientesAgendamento(){

  const lista =
    document.getElementById("listaClientesAgendamento");

  if(!lista) return;

  lista.innerHTML = "";

  supabaseClient
    .from("clients")
    .select("*")
    .then((resposta)=>{

      const clientes = resposta.data || [];

      clientes.forEach((cliente)=>{

        lista.innerHTML += `
          <option value="${cliente.nome}">
        `;

      });

    });

}
function abrirCadastroRapidoCliente(){

  const nome = prompt("Nome da cliente:");
  if(!nome) return;

  const telefone = prompt("Telefone:");

  supabaseClient
    .from("clients")
    .insert([{
      nome,
      telefone
    }])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao cadastrar cliente.");
        return;
      }

      alert("Cliente cadastrada!");

      carregarClientes();
      carregarClientesAgendamento();

    });

}
function salvarServicoSalao(){

  const nome = document.getElementById("nomeServicoSalao").value;
  const categoria = document.getElementById("categoriaServicoSalao").value;
  const descricao = document.getElementById("descricaoServicoSalao").value;

  const comissao = Number(
    document.getElementById("comissaoServicoSalao").value || 0
  );

  const duracao = document.getElementById("duracaoServicoSalao").value;

  const valor = Number(
    document.getElementById("valorServicoSalao").value || 0
  );

  const custo = Number(
    document.getElementById("custoServicoSalao").value || 0
  );

 

 if(
  !nome ||
  !categoria ||
  !comissao ||
  !duracao ||
  !valor
){
  alert(
    "Preencha todos os campos obrigatórios."
  );
  return;
}

  const dadosServico = {
    nome,
    categoria,
    descricao,
    comissao_padrao: comissao,
    duracao,
    valor,
    custo,
  };

  if(servicoEditandoId){

    supabaseClient
      .from("servicos_salao")
      .update(dadosServico)
      .eq("id", servicoEditandoId)
      .then((resposta)=>{

        if(resposta.error){
          alert("Erro ao atualizar serviço.");
          return;
        }

        servicoEditandoId = null;
        alert("Serviço atualizado!");
        fecharModalServico();
        carregarServicosSalao();

      });

    return;
  }

  supabaseClient
    .from("servicos_salao")
    .insert([{
      id: Date.now(),
      ...dadosServico
    }])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao salvar serviço.");
        return;
      }

      alert("Serviço salvo!");
      fecharModalServico();
      carregarServicosSalao();

    });

}
function carregarServicosSalao(){

  const lista =
    document.getElementById("lista-servicos-salao");

  const selectServico =
    document.getElementById("servico");
    const listaServicosAgendamento =
  document.getElementById("listaServicosAgendamento");

  const filtroCategoria =
    document.getElementById("filtroCategoriaServico");

  const busca =
    document.getElementById("buscaServico")
      ?.value
      .toLowerCase()
      .trim() || "";

  if(lista){
    lista.innerHTML = "";
  }

 if(selectServico && selectServico.tagName === "SELECT"){
  selectServico.innerHTML = "";
}

if(listaServicosAgendamento){
  listaServicosAgendamento.innerHTML = "";
}
  supabaseClient
    .from("servicos_salao")
    .select("*")
    .then((resposta)=>{

      const servicos = resposta.data || [];

      const categorias = [];

      servicos.forEach((servico)=>{

        if(
          servico.categoria &&
          !categorias.includes(servico.categoria)
        ){
          categorias.push(servico.categoria);
        }

      });

      if(filtroCategoria){

        filtroCategoria.innerHTML = `
          <option value="">
            Todas as categorias
          </option>
        `;

        categorias.forEach((categoria)=>{

          filtroCategoria.innerHTML += `
            <option value="${categoria}">
              ${categoria}
            </option>
          `;

        });

      }

      const categoriaSelecionada =
        filtroCategoria?.value || "";

      servicos.forEach((servico)=>{

        if(
          categoriaSelecionada &&
          servico.categoria !== categoriaSelecionada
        ){
          return;
        }

        if(
          busca &&
          !servico.nome.toLowerCase().includes(busca)
        ){
          return;
        }

        if(lista){

          lista.innerHTML += `
            <div class="linha-servico" onclick="editarServicoSalao('${servico.id}')">

              <span>
                ${servico.categoria || "-"}
              </span>

              <span>
                ${servico.nome}
              </span>

              <span>
                ${servico.duracao} min
              </span>

              <span>
                R$ ${Number(servico.valor).toFixed(2)}
              </span>

            </div>
          `;

        }

        if(selectServico){

          selectServico.innerHTML += `
            <option
              value="${servico.nome}"
              data-duracao="${servico.duracao}"
              data-valor="${servico.valor}"
            >
              ${servico.nome}
            </option>
          `;

        }

      });

    });

}
function atualizarServicoSelecionado(){

  const select = document.getElementById("servico");
  const option = select.options[select.selectedIndex];

  const duracao = option.getAttribute("data-duracao");
  const valor = option.getAttribute("data-valor");

  if(duracao){
    document.getElementById("duracao").value = duracao;
  }

  const info = document.getElementById("info-servico-agendamento");

  if(info && valor){
    info.innerHTML = `
      <div class="cliente-card">
        <strong>Valor do serviço</strong>
        <p>R$ ${Number(valor).toFixed(2)}</p>
      </div>
    `;
  }
}

 function abrirModalServico(){

  servicoEditandoId = null;

  document.getElementById("nomeServicoSalao").value = "";
  document.getElementById("categoriaServicoSalao").value = "";
  document.getElementById("descricaoServicoSalao").value = "";
  document.getElementById("comissaoServicoSalao").value = "";
  document.getElementById("duracaoServicoSalao").value = "";
  document.getElementById("valorServicoSalao").value = "";
  document.getElementById("custoServicoSalao").value = "";

  document.getElementById("modal-servico").style.display = "flex";

}
function adicionarCategoriaServico(){

  const nome =
    document.getElementById(
      "novaCategoriaServico"
    ).value;

  if(!nome){
    alert("Digite o nome da categoria.");
    return;
  }

  supabaseClient
    .from("categorias_servicos")
    .insert([{
      id: Date.now(),
      nome
    }])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao salvar categoria.");
        return;
      }

      fecharModalCategoria();

      carregarCategoriasServicos();

    });

}
function editarServicoSalao(id){

  supabaseClient
    .from("servicos_salao")
    .select("*")
    .eq("id", id)
    .single()
    .then((resposta)=>{

      const servico = resposta.data;

      if(!servico) return;

      servicoEditandoId = id;

      document.getElementById("modal-servico").style.display = "flex";

      document.getElementById("nomeServicoSalao").value = servico.nome || "";
      document.getElementById("categoriaServicoSalao").value = servico.categoria || "";
      document.getElementById("descricaoServicoSalao").value = servico.descricao || "";
      document.getElementById("comissaoServicoSalao").value = servico.comissao_padrao || "";
      document.getElementById("duracaoServicoSalao").value = servico.duracao || "";
      document.getElementById("valorServicoSalao").value = servico.valor || "";
      document.getElementById("custoServicoSalao").value = servico.custo || "";

    });

}
function excluirCategoriaServico(id){

  const confirmar = confirm(
    "Deseja excluir esta categoria?"
  );

  if(!confirmar) return;

  supabaseClient
    .from("categorias_servicos")
    .delete()
    .eq("id", id)
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao excluir categoria.");
        return;
      }

      carregarCategoriasServicos();

    });

}
function fecharModalServico(){

  document.getElementById("modal-servico").style.display = "none";

}

function carregarCategoriasServicos(){

  const select = document.getElementById("categoriaServicoSalao");
  const chips = document.getElementById("categorias-servicos-chips");

  if(select){
    select.innerHTML = `
      <option value="">
        Selecione a categoria
      </option>
    `;
  }

  if(chips){
    chips.innerHTML = "";
  }

  supabaseClient
    .from("categorias_servicos")
    .select("*")
    .then((resposta)=>{

      const categorias = resposta.data || [];

      categorias.forEach((categoria)=>{

        if(select){

          select.innerHTML += `
            <option value="${categoria.nome}">
              ${categoria.nome}
            </option>
          `;

        }

        if(chips){

          chips.innerHTML += `
            <div class="chip-categoria-box">

              <button class="chip-categoria">
                ${categoria.nome}
              </button>

              <button
                class="btn-excluir-categoria"
                onclick="excluirCategoriaServico('${categoria.id}')"
              >
                ×
              </button>

            </div>
          `;

        }

      });

    });

}
function abrirModalCategoria(){

  document.getElementById(
    "novaCategoriaServico"
  ).value = "";

  document.getElementById(
    "modal-categoria"
  ).style.display = "flex";

}

function fecharModalCategoria(){

  document.getElementById(
    "modal-categoria"
  ).style.display = "none";

}

function abrirModalPacote(){

  document.getElementById("nomePacote").value = "";
  document.getElementById("validadePacote").value = "";
  document.getElementById("valorTotalPacote").innerText = "R$ 0,00";

  document.getElementById("itensPacote").innerHTML = "";

  document.getElementById("modal-pacote").style.display = "flex";

  adicionarLinhaItemPacote();

}

function fecharModalPacote(){

  document.getElementById(
    "modal-pacote"
  ).style.display = "none";

}

function carregarServicosPacote(){

  const select =
    document.getElementById("servicosPacote");

  if(!select) return;

  select.innerHTML = `
    <option value="">
      Selecione o serviço
    </option>
  `;

  supabaseClient
    .from("servicos_salao")
    .select("*")
    .then((resposta)=>{

      const servicos = resposta.data || [];

      servicos.forEach((servico)=>{

    if(
  selectServico &&
  selectServico.tagName === "SELECT"
){

  selectServico.innerHTML += `
    <option value="${servico.nome}">
      ${servico.nome}
    </option>
  `;

}

if(listaServicosAgendamento){

  listaServicosAgendamento.innerHTML += `
    <option value="${servico.nome}">
  `;

}

      });

    });

}

function salvarPacote(){

  const nome =
    document.getElementById("nomePacote").value;

  const validade =
    document.getElementById("validadePacote").value;

  const status =
    document.getElementById("statusPacote").value;

  const itens = [];

  let valorTotal = 0;

  document
    .querySelectorAll(".item-pacote")
    .forEach((item)=>{

      const servico =
        item.querySelector(
          ".servico-item-pacote"
        ).value;

      const valor = Number(
        item.querySelector(
          ".valor-item-pacote"
        ).value || 0
      );

      const qtd = Number(
        item.querySelector(
          ".qtd-item-pacote"
        ).value || 0
      );

      if(
        servico &&
        valor &&
        qtd
      ){

        itens.push({
          servico,
          valor,
          qtd
        });

        valorTotal += valor * qtd;

      }

    });

  if(
    !nome ||
    itens.length === 0
  ){
    alert(
      "Adicione pelo menos um serviço."
    );
    return;
  }

  supabaseClient
    .from("pacotes")
    .insert([{

      id: Date.now(),

      nome,

      itens: JSON.stringify(itens),

      servicos:
        itens
          .map(i=>i.servico)
          .join(", "),

      valor: valorTotal,

      validade_dias: validade,

      status

    }])

    .then((resposta)=>{

      if(resposta.error){

        alert(
          "Erro: " +
          resposta.error.message
        );

        return;

      }

      alert("Pacote salvo!");

      fecharModalPacote();

      carregarPacotes();

    });

}

function carregarPacotes(){

  const lista =
    document.getElementById("lista-pacotes");

  if(!lista) return;

  lista.innerHTML = "";

  supabaseClient
    .from("pacotes")
    .select("*")
    .then((resposta)=>{

      const pacotes = resposta.data || [];

      pacotes.forEach((pacote)=>{

        lista.innerHTML += `
          <div class="linha-servico">

            <span>
              ${pacote.nome}
            </span>

            <span>
              ${pacote.servicos}
            </span>

            <span>
              R$ ${Number(pacote.valor).toFixed(2)}
            </span>

            <span>
              ${pacote.status}
            </span>

          </div>
        `;

      });

    });

}
function adicionarLinhaItemPacote(){

  const container =
    document.getElementById("itensPacote");

  container.innerHTML += `

    <div class="item-pacote">

      <select
  class="servico-item-pacote"
  onchange="preencherValorItemPacote(this)"
>
        <option value="">
          Escolha o serviço
        </option>
      </select>

      <input
        type="number"
        class="valor-item-pacote"
        placeholder="Valor sessão"
        oninput="calcularValorPacote()"
      >

      <input
        type="number"
        class="qtd-item-pacote"
        placeholder="Sessões"
        oninput="calcularValorPacote()"
      >

      <span class="subtotal-item">
        R$ 0,00
      </span>

      <button
        type="button"
        onclick="this.parentElement.remove(); calcularValorPacote();"
      >
        ×
      </button>

    </div>

  `;

  carregarServicosItensPacote();

}
function carregarServicosItensPacote(){

  supabaseClient
    .from("servicos_salao")
    .select("*")
    .then((resposta)=>{

      const servicos =
        resposta.data || [];

      document
        .querySelectorAll(
          ".servico-item-pacote"
        )
        .forEach((select)=>{

          if(
            select.options.length > 1
          ) return;

          servicos.forEach((servico)=>{

            select.innerHTML += `
              <option
  value="${servico.nome}"
  data-valor="${servico.valor}"
>
  ${servico.nome}
</option>
            `;

          });

        });

    });

}

function calcularValorPacote(){

  let total = 0;

  document.querySelectorAll(".item-pacote").forEach((item)=>{

    const valorCampo =
      item.querySelector(".valor-item-pacote");

    const qtdCampo =
      item.querySelector(".qtd-item-pacote");

    const subtotalSpan =
      item.querySelector(".subtotal-item");

    const valor =
      Number(valorCampo?.value || 0);

    const qtd =
      Number(qtdCampo?.value || 0);

    const subtotal = valor * qtd;

    total += subtotal;

    if(subtotalSpan){

      subtotalSpan.innerText =
        `R$ ${subtotal.toFixed(2)}`;

    }

  });

  const totalPacote =
    document.getElementById(
      "valorTotalPacote"
    );

  if(totalPacote){

    totalPacote.innerText =
      `R$ ${total.toFixed(2)}`;

  }

}
function preencherValorItemPacote(select){

  const option =
    select.options[select.selectedIndex];

  const valor =
    option.getAttribute("data-valor");

  const linha =
    select.closest(".item-pacote");

  if(!linha) return;

  const inputValor =
    linha.querySelector(
      ".valor-item-pacote"
    );

  if(
    inputValor &&
    valor
  ){

    inputValor.value = valor;

    calcularValorPacote();

  }

}
function atualizarLinhaHorarioAtual(){

  const agenda =
    document.querySelector(".agenda-body");

  if(!agenda) return;

  let linha =
    document.getElementById(
      "linha-horario-atual"
    );

  if(!linha){

    linha = document.createElement("div");

    linha.id =
      "linha-horario-atual";

    agenda.appendChild(linha);

  }

  const agora = new Date();

  const minutosAgora =
    (agora.getHours() * 60)
    + agora.getMinutes();

  const inicioAgenda = 7 * 60;

 const top =
  ((minutosAgora - inicioAgenda)
  / 30) * 80;

  linha.style.top = `${top}px`;

}

function carregarServicosAgendamento(){

  const lista =
    document.getElementById(
      "listaServicosAgendamento"
    );

  if(!lista) return;

  lista.innerHTML = "";

  supabaseClient
    .from("servicos_salao")
    .select("*")
    .then((resposta)=>{

      console.log(
        "SERVIÇOS:",
        resposta.data
      );

      const servicos =
        resposta.data || [];

      servicos.forEach((servico)=>{

        lista.innerHTML += `
          <option value="${servico.nome}">
        `;

      });

    });

}
let categoriaSelecionadaServico = "";

function abrirSeletorServico(){

  document.getElementById(
    "modal-seletor-servico"
  ).style.display = "flex";

  carregarSeletorServico();
}

function fecharSeletorServico(){

  document.getElementById(
    "modal-seletor-servico"
  ).style.display = "none";

}

function carregarSeletorServico(){

  supabaseClient
    .from("servicos_salao")
    .select("*")
    .then((resposta)=>{

      window.servicosAgenda =
        resposta.data || [];

      const categorias =
        [...new Set(
          window.servicosAgenda.map(
            s=>s.categoria
          )
        )];

      const divCategorias =
        document.getElementById(
          "categorias-seletor-servico"
        );

      divCategorias.innerHTML = "";

      categorias.forEach((categoria)=>{

        divCategorias.innerHTML += `

          <button
            onclick="
              categoriaSelecionadaServico='${categoria}';
              renderizarServicosSeletor();
            "
          >
            ${categoria}
          </button>

        `;

      });

      renderizarServicosSeletor();

    });

}

function renderizarServicosSeletor(){

  const busca = document
    .getElementById("buscaServicoSeletor")
    .value
    .toLowerCase();

  const lista = document
    .getElementById("lista-seletor-servicos");

  lista.innerHTML = "";

  (window.servicosAgenda || [])
    .filter((servico)=>{

      const categoriaOk =
        !categoriaSelecionadaServico ||
        servico.categoria === categoriaSelecionadaServico;

      const buscaOk =
        servico.nome.toLowerCase().includes(busca);

      return categoriaOk && buscaOk;

    })
    .forEach((servico)=>{

      const item = document.createElement("div");

      item.className = "item-servico-seletor";
      item.innerText = servico.nome;

      item.onclick = function(){
        selecionarServicoAgenda(servico.nome);
      };

      lista.appendChild(item);

    });

}

function selecionarServicoAgenda(nome){

  const servico =
    (window.servicosAgenda || [])
      .find(
        (item)=> item.nome === nome
      );

  document.getElementById(
    "servico"
  ).value = nome;

  document.getElementById(
    "servicoSelecionadoTexto"
  ).innerText = nome;

  if(servico){

    document.getElementById(
      "duracao"
    ).value = servico.duracao || 30;

    const precoCampo =
      document.getElementById(
        "precoAgendamento"
      );

    if(precoCampo){

      precoCampo.value =
        servico.valor || 0;
        calcularResumoAgendamento();

    }

    const info =
      document.getElementById(
        "info-servico-agendamento"
      );

    if(info){

      info.innerHTML = `
        <div class="cliente-card">

          <strong>
            Valor do serviço
          </strong>

          <p>
            R$ ${Number(
              servico.valor || 0
            ).toFixed(2)}
          </p>

        </div>
      `;

    }

  }

  fecharSeletorServico();

}
function abrirSeletorCliente(){

  document.getElementById(
    "modal-seletor-cliente"
  ).style.display = "flex";

  carregarSeletorCliente();

}

function fecharSeletorCliente(){

  document.getElementById(
    "modal-seletor-cliente"
  ).style.display = "none";

}

function carregarSeletorCliente(){

  supabaseClient
    .from("clients")
    .select("*")
    .then((resposta)=>{

      window.clientesAgenda =
        resposta.data || [];

      renderizarClientesSeletor();

    });

}

function renderizarClientesSeletor(){

  const busca =
    document.getElementById(
      "buscaClienteSeletor"
    ).value.toLowerCase();

  const lista =
    document.getElementById(
      "lista-seletor-clientes"
    );

  lista.innerHTML = "";

  (window.clientesAgenda || [])
    .filter((cliente)=>
      cliente.nome
        .toLowerCase()
        .includes(busca)
    )
    .forEach((cliente)=>{

      const item =
        document.createElement("div");

      item.className =
        "item-servico-seletor";

      item.innerText =
        cliente.nome;

      item.onclick = function(){
        selecionarClienteAgenda(cliente.nome);
      };

      lista.appendChild(item);

    });

}

function selecionarClienteAgenda(nome){

  document.getElementById("cliente").value = nome;

  document.getElementById(
    "clienteSelecionadoTexto"
  ).innerText = nome;

  fecharSeletorCliente();

}
function calcularResumoAgendamento(){

  const preco =
    Number(
      document.getElementById("precoAgendamento")?.value || 0
    );

  const desconto =
    Number(
      document.getElementById("descontoAgendamento")?.value || 0
    );

  const tipo =
    document.getElementById("tipoDescontoAgendamento")?.value || "valor";

  let valorDesconto = 0;

  if(tipo === "porcentagem"){
    valorDesconto = preco * (desconto / 100);
  }else{
    valorDesconto = desconto;
  }

  const total =
    Math.max(preco - valorDesconto, 0);

  const subtotal =
    document.getElementById("subtotalAgendamento");

  const totalCampo =
    document.getElementById("totalAgendamento");

  if(subtotal){
    subtotal.innerText = `R$ ${preco.toFixed(2)}`;
  }

  if(totalCampo){
    totalCampo.innerText = `R$ ${total.toFixed(2)}`;
  }

}
