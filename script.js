const SUPABASE_URL = "https://oxvtfdxdlshbvtqtnpgo.supabase.co";
const SUPABASE_KEY = "sb_publishable_KQ58nMCXUZl0Nz5jEHkKKg_RbpL-QTw";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let dataSelecionada = new Date();

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
  document.getElementById("modal").style.display = "flex";
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
  const minutosTotais = parseInt(hora) * 60 + parseInt(minuto);
  const inicioAgenda = 14 * 60;
  return ((minutosTotais - inicioAgenda) / 20) * 80;
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
    <em>${agendamento.status || "Agendado"}</em>
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

  const comissao = Number(valor) * 0.4;
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

  const agendamento = {
    id: Date.now(),
    cliente: document.getElementById("cliente").value,
    telefone: document.getElementById("telefoneAgendamento").value,
    horario: document.getElementById("horario").value,
    profissional: document.getElementById("profissional").value,
    duracao: document.getElementById("duracao").value,
    servico: document.getElementById("servico").value,
    status: "Agendado",
    data: formatarData(dataSelecionada)
  };

  supabaseClient
  .from("Agendamentos")
  .select("*")
  .eq("data", agendamento.data)
  .eq("horario", agendamento.horario)
  .eq("profissional", agendamento.profissional)
  .then((verificacao)=>{

    const conflito = verificacao.data || [];

    if(conflito.length > 0){

      const continuar = confirm(
        "Já existe cliente neste horário. Deseja continuar mesmo assim?"
      );

      if(!continuar){
        return;
      }

    }

    supabaseClient
      .from("Agendamentos")
      .insert([agendamento])
      .then((resposta)=>{

        if(resposta.error){
          alert("Erro ao salvar agendamento: " + resposta.error.message);
          return;
        }

        criarCard(agendamento);
        fecharModal();

      });

  });
}

function carregarAgenda(){

  const colunas = document.querySelectorAll(".column");
  const profissionais = document.querySelectorAll(".professional");
  const filtro = document.getElementById("filtroProfissional")?.value || "";
  const busca = document.getElementById("buscaCliente")?.value.toLowerCase().trim() || "";

  const agendaHeader = document.querySelector(".agenda-header");
  const agendaBody = document.querySelector(".agenda-body");

 colunas.forEach((coluna)=>{
  coluna.innerHTML = "";
  coluna.style.position = "relative";
});

  if(filtro === ""){
    agendaHeader.style.gridTemplateColumns = "80px repeat(4, 1fr)";
    agendaBody.style.gridTemplateColumns = "80px repeat(4, 1fr)";

    colunas.forEach((coluna)=>{
      coluna.style.display = "block";
    });

    profissionais.forEach((profissional)=>{
      profissional.style.display = "block";
    });

  }else{
    agendaHeader.style.gridTemplateColumns = "80px 1fr";
    agendaBody.style.gridTemplateColumns = "80px 1fr";

    colunas.forEach((coluna, index)=>{
      coluna.style.display = String(index) === filtro ? "block" : "none";
    });

    profissionais.forEach((profissional, index)=>{
      profissional.style.display = String(index) === filtro ? "block" : "none";
    });
  }

  supabaseClient
    .from("Agendamentos")
    .select("*")
    .eq("data", formatarData(dataSelecionada))
    .then((resposta)=>{

      const agendamentos = resposta.data || [];

      agendamentos.forEach((agendamento)=>{

        if(filtro !== "" && agendamento.profissional != filtro){
          return;
        }
        if(busca !== "" && !agendamento.cliente.toLowerCase().includes(busca)){
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
            }

            lista.innerHTML += `
              <div class="cliente-card">
                <strong>${cliente.nome}</strong>

                ${
                  cliente.aniversario &&
                  cliente.aniversario.slice(5,10) === `${mesHoje}-${diaHoje}`
                    ? "<span class='aniversariante'>Aniversariante hoje 🎂</span>"
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
      const rankingProfissionaisDiv = document.getElementById("ranking-profissionais");
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

        if(!resumo[item.profissional]){
          resumo[item.profissional] = 0;
        }

        resumo[item.profissional] += Number(item.comissao);

      });
const metas = {
  Carol:5000,
  Jessica:5000,
  Fernanda:5000,
  Silamara:5000
};
      Object.keys(resumo).forEach((profissional)=>{
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

        const minutosDesdeInicio = (encaixado / 80) * 20;
        const minutosTotais = (14 * 60) + minutosDesdeInicio;

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
