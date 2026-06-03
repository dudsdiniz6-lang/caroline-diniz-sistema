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

async function abrirModal(){

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

  const selectProfissional =
    document.getElementById(
      "profissional"
    );
    
  if(selectProfissional){

    selectProfissional.innerHTML =
      '<option value="">Selecione</option>';

    const resposta =
      await supabaseClient
        .from("profissionais_salao")
        .select("*")
        .eq("ativo", true)
        .order("nome");

  const profissionais =
  resposta.data || [];

profissionais.forEach((profissional)=>{

  selectProfissional.innerHTML += `

    <option value="${profissional.id}">
      ${profissional.nome}
    </option>

  `;

});

if(window.profissionalPreSelecionado){

  selectProfissional.value =
    window.profissionalPreSelecionado;

}

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
  const coluna =
  document.querySelector(
    `.column[data-profissional-id="${agendamento.profissional}"]`
  );

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
supabaseClient
  .from("comandas")
  .select("*")
  .eq("cliente", agendamento.cliente)
  .eq("data", agendamento.data)
  .then((resp)=>{

    const venda =
      (resp.data || [])[0];

    if(
      venda &&
      venda.status === "FECHADO"
    ){

      card.style.background =
        "#dff7df";

      card.style.border =
        "1px solid #8bcf99";

    }

  });
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

  abrirModalFaturamento(
    agendamento,
    function(valor, formaPagamento, servicosSelecionados){

      const profissionalNome =
        ["Carol","Jessica","Fernanda","Silamara"][agendamento.profissional] || "";

      const profissionalUsuario = usuarios.find((usuario)=>{
        return (
          (usuario.usuario || "").toLowerCase()
          ===
          (profissionalNome || "").toLowerCase()
        );
      });

      const porcentagemComissao =
        profissionalUsuario?.comissao || 0;

      const comissao =
        Number(valor) * (porcentagemComissao / 100);

      let pagamentosFinal =
        Array.isArray(window.pagamentosFaturamento)
          ? window.pagamentosFaturamento
          : [];

      if(
        pagamentosFinal.length === 0 &&
        formaPagamento &&
        String(formaPagamento).trim() !== "" &&
        formaPagamento !== "EM ABERTO"
      ){
        pagamentosFinal = [{
          valor: Number(valor),
          forma: formaPagamento,
          data: new Date().toLocaleDateString("pt-BR")
        }];
      }

      const totalPago =
        pagamentosFinal.reduce((soma,pag)=>{
          return soma + Number(pag.valor || 0);
        },0);

      const statusVenda =
        totalPago >= Number(valor)
          ? "FECHADO"
          : "EM ABERTO";

      supabaseClient
        .from("comandas")
        .insert([{
          id: Date.now(),

          cliente: agendamento.cliente,

          servico:
            servicosSelecionados
              .map(item => item.servico)
              .join(", "),

          valor: Number(valor),

          data: formatarData(dataSelecionada),

          forma_pagamento:
            JSON.stringify(pagamentosFinal),

          profissional: profissionalNome,

          horario: agendamento.horario,

          status: statusVenda
        }])
        .then((respostaComanda)=>{

          if(respostaComanda.error){
            alert("Erro ao salvar venda: " + respostaComanda.error.message);
            return;
          }

          supabaseClient
            .from("comissoes")
            .insert([{
              id: Date.now() + 10,
              profissional: profissionalNome,
              cliente: agendamento.cliente,
              servico:
                servicosSelecionados
                  .map(item => item.servico)
                  .join(", "),
              valor: Number(valor),
              comissao: comissao,
              data: formatarData(dataSelecionada)
            }]);

          pagamentosFinal.forEach((pagamento,index)=>{

            supabaseClient
              .from("financeiro")
              .insert([{
                id: Date.now() + index + 100,
                tipo: "entrada",
                descricao: "Pagamento venda - " + agendamento.cliente,
                valor: Number(pagamento.valor || 0),
                data: pagamento.data || formatarData(dataSelecionada),
                forma_pagamento: pagamento.forma || "-"
              }]);

          });

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
                      Number(produto.quantidade) -
                      Number(consumo.quantidade);

                    supabaseClient
                      .from("estoque")
                      .update({
                        quantidade: novaQuantidade
                      })
                      .eq("id", produto.id);

                  });

              });

              carregarEstoque();

            });

          carregarHistoricoFinanceiro();

          if(typeof carregarVendas === "function"){
            carregarVendas();
          }

          card.style.opacity = "0.6";

          if(statusVenda === "FECHADO"){
            card.style.background = "#dff7df";
            card.style.border = "1px solid #8bcf99";
          }

          alert("Atendimento faturado!");

        });

    }
  );

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

  const cliente = document.getElementById("cliente").value.trim();
  const servico = document.getElementById("servico").value.trim();
  const horario = document.getElementById("horario").value;
  const profissional = document.getElementById("profissional").value;
  const duracao = Number(document.getElementById("duracao").value);
  const dataCampo = document.getElementById("dataAgendamento")?.value;

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

  if(dataCampo){
    const partes = dataCampo.split("-");

    dataSelecionada = new Date(
      Number(partes[0]),
      Number(partes[1]) - 1,
      Number(partes[2])
    );

    atualizarDataAgenda();
  }

  const agendamento = {
    cliente,
    telefone: "",
    horario,
    profissional,
    duracao,
    servico,
    status: "Agendado",
    data: formatarData(dataSelecionada)
  };

  supabaseClient
    .from("Agendamentos")
    .insert([agendamento])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao salvar: " + resposta.error.message);
        console.log(resposta.error);
        return;
      }

      fecharModal();
      carregarAgenda();
      alert("Agendamento salvo!");

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

    window.profissionalPreSelecionado =
  coluna.dataset.profissionalId || "";

document.getElementById("horario").value = horario;

abrirEscolhaHorario(
  coluna.dataset.profissionalId || "",
  horario
);

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
         if(
  window.graficoFinanceiro &&
  typeof window.graficoFinanceiro.destroy === "function"
){
  window.graficoFinanceiro.destroy();
}
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
    return (usuario.usuario || "").toLowerCase() === item.profissional.toLowerCase();
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

  document.querySelectorAll(".clientes-container").forEach((item)=>{
    item.style.display = "none";
  });

  const selecionada =
  document.getElementById(secao);

if(selecionada){

  selecionada.style.display = "block";

  if(secao === "relatorios-container"){

    selecionada.style.marginLeft =
      "180px";

    selecionada.style.width =
      "calc(100% - 180px)";

    selecionada.style.padding =
      "40px";

    selecionada.style.boxSizing =
      "border-box";

  }

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

  if(secao === "profissionais-container"){
    carregarProfissionais();
      
  }

  if(secao === "servicos-container"){
    carregarServicosSalao();
  }

  if(secao === "pacotes-container"){
    carregarPacotes();
  }
   if(
  secao === "configuracoes-container" ||
  secao === "caixa-container"
){

  const tela =
    document.getElementById(secao);

  if(tela){

    tela.style.display = "block";

    tela.style.marginLeft =
      "180px";

    tela.style.width =
      "calc(100% - 180px)";

    tela.style.padding =
      "40px";

    tela.style.boxSizing =
      "border-box";

    }

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

carregarProfissionaisAgenda();

setTimeout(criarPainelAgendaProfissionais, 1800);

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
      if(texto === "Configurações"){

  link.setAttribute(
  "onclick",
  "abrirConfiguracoes(); return false;"
);

}

  });

}
function salvarCliente(){

  const cliente = {
    nome: document.getElementById("nomeCliente").value,
    telefone: document.getElementById("telefoneCliente").value,
    aniversario: document.getElementById("aniversarioCliente")?.value || "",
    preferencia: document.getElementById("preferenciaCliente")?.value || "",
    alergias: document.getElementById("alergiasCliente")?.value || "",
    foto: document.getElementById("fotoCliente")?.value || "",
    observacoes: document.getElementById("observacaoCliente")?.value || ""
  };

  if(!cliente.nome){
    alert("Digite o nome da cliente.");
    return;
  }

  supabaseClient
    .from("clients")
    .insert([cliente])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao salvar cliente: " + resposta.error.message);
        return;
      }

      alert("Cliente salva!");

      document.getElementById("nomeCliente").value = "";
      document.getElementById("telefoneCliente").value = "";

      if(document.getElementById("aniversarioCliente")){
        document.getElementById("aniversarioCliente").value = "";
      }

      if(document.getElementById("preferenciaCliente")){
        document.getElementById("preferenciaCliente").value = "";
      }

      if(document.getElementById("alergiasCliente")){
        document.getElementById("alergiasCliente").value = "";
      }

      if(document.getElementById("fotoCliente")){
        document.getElementById("fotoCliente").value = "";
      }

      if(document.getElementById("observacaoCliente")){
        document.getElementById("observacaoCliente").value = "";
      }

      carregarClientes();
      carregarClientesAgendamento();

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

  const caixaDiv =
    document.getElementById("caixa-lateral");

  if(!caixaDiv) return;

  caixaDiv.innerHTML = `
    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:28px;
    ">
      <h2 style="margin:0;font-size:26px;font-weight:700;">
        Controle de Caixa
      </h2>

      <button
        onclick="abrirNovoCaixa()"
        style="
          background:#111;
          color:#fff;
          border:none;
          padding:14px 22px;
          border-radius:16px;
          font-weight:700;
          cursor:pointer;
        "
      >
        + Novo Caixa
      </button>
    </div>

    <div style="
      display:grid;
      grid-template-columns:1fr 2fr 1fr 1fr 1fr;
      padding:12px;
      font-size:13px;
      font-weight:700;
      color:#555;
      border-bottom:1px solid #ddd;
    ">
      <span>Data</span>
      <span>Dono</span>
      <span>Tipo</span>
      <span>Abertura</span>
      <span>Status</span>
    </div>
  `;

  supabaseClient
    .from("caixa")
    .select("*")
    .order("id",{ascending:false})
    .then((resposta)=>{

      const caixas = resposta.data || [];

      caixas.forEach((caixa)=>{

        caixaDiv.innerHTML += `
          <div
            onclick="abrirDetalhesCaixa('${caixa.id}')"
            style="
              display:grid;
              grid-template-columns:1fr 2fr 1fr 1fr 1fr;
              padding:18px 12px;
              border-bottom:1px solid #eee;
              align-items:center;
              cursor:pointer;
            "
          >
            <span>${caixa.data || "-"}</span>
            <strong>${caixa.dono || "Caixa Geral"}</strong>
            <span>${caixa.tipo || "Compartilhado"}</span>
            <span>R$ ${Number(caixa.abertura || caixa.entrada || 0).toFixed(2)}</span>
            <span style="
              color:${caixa.status === "Fechado" ? "#777" : "#ff5a1f"};
              font-weight:700;
            ">
              ${caixa.status || "Aberto"}
            </span>
          </div>
        `;

      });

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
  duracao === "" ||
  valor === ""
){
  alert("Preencha todos os campos obrigatórios.");
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
      <div
        class="linha-servico"
        onclick="editarServicoSalao('${servico.id}')"
      >

        <span>
          ${servico.categoria || "-"}
        </span>

        <span>
          ${servico.nome}
        </span>

        <span>
          ${servico.duracao || 0} min
        </span>

        <span>
          R$ ${Number(servico.valor || 0).toFixed(2)}
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

function abrirModalServico(modoEdicao = false){

  if(!modoEdicao){
    servicoEditandoId = null;
  }

  let modal = document.getElementById("modal-servico");

  if(!modal){

    modal = document.createElement("div");
    modal.id = "modal-servico";
   modal.style.cssText = `
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

   modal.innerHTML = `
  <div style="
    background:#fff;
    width:460px;
    max-width:92%;
    border-radius:26px;
    padding:30px;
    box-shadow:0 24px 70px rgba(0,0,0,.22);
    display:flex;
    flex-direction:column;
    gap:14px;
    font-family:inherit;
  ">

    <div style="margin-bottom:6px;">
      <h2 style="margin:0;font-size:24px;font-weight:700;color:#222;">
        Novo serviço
      </h2>
      <p style="margin:6px 0 0;color:#777;font-size:14px;">
        Cadastre um procedimento do salão.
      </p>
    </div>

    <input id="nomeServicoSalao" placeholder="Nome do serviço" style="padding:14px;border:1px solid #e2e2e2;border-radius:14px;font-size:14px;">

    <select id="categoriaServicoSalao" style="padding:14px;border:1px solid #e2e2e2;border-radius:14px;font-size:14px;background:#fff;">
      <option value="">Selecione a categoria</option>
    </select>

    <textarea id="descricaoServicoSalao" placeholder="Descrição" style="padding:14px;border:1px solid #e2e2e2;border-radius:14px;font-size:14px;min-height:80px;"></textarea>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <input id="duracaoServicoSalao" type="number" placeholder="Duração min." style="padding:14px;border:1px solid #e2e2e2;border-radius:14px;font-size:14px;">
      <input id="valorServicoSalao" type="number" placeholder="Valor R$" style="padding:14px;border:1px solid #e2e2e2;border-radius:14px;font-size:14px;">
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <input id="comissaoServicoSalao" type="number" placeholder="Comissão %" style="padding:14px;border:1px solid #e2e2e2;border-radius:14px;font-size:14px;">
      <input id="custoServicoSalao" type="number" placeholder="Custo R$" style="padding:14px;border:1px solid #e2e2e2;border-radius:14px;font-size:14px;">
    </div>

    <div style="display:flex;gap:10px;margin-top:10px;">
      <button onclick="fecharModalServico()" style="flex:1;padding:14px;border:none;border-radius:14px;background:#f1f1f1;color:#333;font-weight:600;">
        Cancelar
      </button>

      <button onclick="salvarServicoSalao()" style="flex:1;padding:14px;border:none;border-radius:14px;background:#111;color:#fff;font-weight:700;">
        Salvar serviço
      </button>
    </div>

  </div>
`;

    document.body.appendChild(modal);

    carregarCategoriasServicos();
  }

  document.getElementById("nomeServicoSalao").value = "";
  document.getElementById("descricaoServicoSalao").value = "";
  document.getElementById("comissaoServicoSalao").value = "";
  document.getElementById("duracaoServicoSalao").value = "";
  document.getElementById("valorServicoSalao").value = "";
  document.getElementById("custoServicoSalao").value = "";

  modal.style.display = "flex";

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

  const modal =
    document.getElementById(
      "modal-categoria"
    );

  modal.style.display = "flex";
  modal.style.zIndex = "1000000";
  modal.style.position = "fixed";

}

function fecharModalCategoria(){

  document.getElementById(
    "modal-categoria"
  ).style.display = "none";

}

function abrirModalPacote(modoEdicao = false){

  if(!modoEdicao){

    window.pacoteEditandoId = null;

    document.getElementById("nomePacote").value = "";
    document.getElementById("validadePacote").value = "";
    document.getElementById("valorTotalPacote").innerText = "R$ 0,00";

    document.getElementById("itensPacote").innerHTML = "";

    adicionarLinhaItemPacote();

  }

  document.getElementById("modal-pacote").style.display = "flex";

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
        item.querySelector(".servico-item-pacote").value;

      const valor = Number(
        item.querySelector(".valor-item-pacote").value || 0
      );

      const qtd = Number(
        item.querySelector(".qtd-item-pacote").value || 0
      );

      if(servico && valor && qtd){

        itens.push({
          servico,
          valor,
          qtd
        });

        valorTotal += valor * qtd;

      }

    });

  if(!nome || itens.length === 0){
    alert("Adicione pelo menos um serviço.");
    return;
  }

  const dadosPacote = {
    nome,
    itens: JSON.stringify(itens),
    servicos: itens.map(i=>i.servico).join(", "),
    valor: valorTotal,
    validade_dias: validade,
    status
  };

  if(window.pacoteEditandoId){

    supabaseClient
      .from("pacotes")
      .update(dadosPacote)
      .eq("id", window.pacoteEditandoId)
      .then((resposta)=>{

        if(resposta.error){
          alert("Erro ao atualizar pacote: " + resposta.error.message);
          return;
        }

        alert("Pacote atualizado!");

        window.pacoteEditandoId = null;

        fecharModalPacote();
        carregarPacotes();

      });

    return;
  }

  supabaseClient
    .from("pacotes")
    .insert([{
      id: Date.now(),
      ...dadosPacote
    }])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro: " + resposta.error.message);
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
          <div class="linha-servico" onclick="editarPacote('${pacote.id}')">

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

async function abrirSeletorServico(){

  const idProfissional =
    document.getElementById(
      "profissional"
    ).value;

  if(!idProfissional){

    alert(
      "Selecione um profissional primeiro."
    );

    return;
  }

  const resposta =
    await supabaseClient
      .from("profissionais_salao")
      .select("*")
      .eq("id", idProfissional)
      .single();

  const profissional =
    resposta.data;

  window.categoriasPermitidasAgendamento =
    profissional?.categorias || [];

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
        if(
  window.categoriasPermitidasAgendamento &&
  window.categoriasPermitidasAgendamento.length
){

  window.servicosAgenda =
    window.servicosAgenda.filter(
      servico => {

        return window
          .categoriasPermitidasAgendamento
          .includes(servico.categoria);

      }
    );

}

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

item.innerHTML = `

  <div style="
    display:flex;
    flex-direction:column;
    gap:4px;
  ">

    <span style="
      font-size:16px;
      font-weight:600;
      color:#222;
    ">
      ${servico.nome}
    </span>

    <span style="
      font-size:13px;
      color:#ff5a1f;
      font-weight:500;
    ">
      R$ ${Number(servico.valor || 0).toFixed(2)}
      •
      ${servico.duracao || 0}min
    </span>

  </div>

`;

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
let categoriasSelecionadasProfissional = [];
let horariosProfissionalConfig = {
  segunda: [],
  terca: [],
  quarta: [],
  quinta: [],
  sexta: [],
  sabado: [],
  domingo: []
};

function abrirModalProfissional(){

  document.getElementById("nomeProfissional").value = "";
  document.getElementById("telefoneProfissional").value = "";
  document.getElementById("especialidadeProfissional").value = "";

  categoriasSelecionadasProfissional = [];

  horariosProfissionalConfig = {
    segunda: [],
    terca: [],
    quarta: [],
    quinta: [],
    sexta: [],
    sabado: [],
    domingo: []
  };

  document.getElementById("categoriasProfissional").value = "";
  document.getElementById("horariosProfissional").value = "";

  document.getElementById("categoriasProfissionalTexto").innerText =
    "Selecionar categorias";

  document.getElementById("horariosProfissionalTexto").innerText =
    "Configurar horários";

  document.getElementById("modal-profissional").style.display = "flex";

}

function fecharModalProfissional(){
  document.getElementById("modal-profissional").style.display = "none";
}

function salvarProfissional(){

  const profissional = {
    nome: document.getElementById("nomeProfissional").value,
    telefone: document.getElementById("telefoneProfissional").value,
    especialidade: document.getElementById("especialidadeProfissional").value,

    categorias: categoriasSelecionadasProfissional,
    categorias_json: JSON.stringify(categoriasSelecionadasProfissional),

    horarios_json: [JSON.stringify(horariosProfissionalConfig)],

    hora_inicio: "",
    hora_fim: "",
    intervalo_minutos: 30,
    percentual_comis: 0,
    ativo: true
  };

  if(!profissional.nome){
    alert("Digite o nome do profissional.");
    return;
  }

  if(window.profissionalEditando){

    supabaseClient
      .from("profissionais_salao")
      .update(profissional)
      .eq("id", window.profissionalEditando)
      .then((resposta)=>{

        if(resposta.error){
          alert(resposta.error.message);
          return;
        }

        window.profissionalEditando = null;

        fecharModalProfissional();

        carregarProfissionais();

        carregarProfissionaisAgenda();

        alert("Profissional atualizado!");

      });

  }else{

    supabaseClient
      .from("profissionais_salao")
      .insert([profissional])
      .then((resposta)=>{

        if(resposta.error){
          alert(resposta.error.message);
          return;
        }

        fecharModalProfissional();

        carregarProfissionais();

        carregarProfissionaisAgenda();

        alert("Profissional salvo!");

      });

  }

}

async function editarProfissional(id){

  const resposta =
    await supabaseClient
      .from("profissionais_salao")
      .select("*")
      .eq("id", id)
      .single();

  const profissional =
    resposta.data;

  if(!profissional) return;

  window.profissionalEditando = id;

  abrirModalProfissional();

  document.getElementById("nomeProfissional").value =
    profissional.nome || "";

  document.getElementById("telefoneProfissional").value =
    profissional.telefone || "";

  document.getElementById("especialidadeProfissional").value =
    profissional.especialidade || "";

}
function abrirSeletorCategoriasProfissional(){

  document.getElementById("modal-categorias-profissional").style.display = "flex";

  const lista = document.getElementById("lista-categorias-profissional");

  lista.innerHTML = "";

  supabaseClient
    .from("categorias_servicos")
    .select("*")
    .then((resposta)=>{

      const categorias = resposta.data || [];

      categorias.forEach((categoria)=>{

        const marcada =
          categoriasSelecionadasProfissional.includes(categoria.nome)
            ? "checked"
            : "";

        lista.innerHTML += `
          <label class="cliente-card">
            <input
              type="checkbox"
              value="${categoria.nome}"
              ${marcada}
              onchange="alternarCategoriaProfissional(this)"
            >
            ${categoria.nome}
          </label>
        `;

      });

    });

}

function fecharSeletorCategoriasProfissional(){
  document.getElementById("modal-categorias-profissional").style.display = "none";
}

function alternarCategoriaProfissional(input){

  if(input.checked){
    categoriasSelecionadasProfissional.push(input.value);
  }else{
    categoriasSelecionadasProfissional =
      categoriasSelecionadasProfissional.filter((item)=> item !== input.value);
  }

}

function confirmarCategoriasProfissional(){

  document.getElementById("categoriasProfissional").value =
    categoriasSelecionadasProfissional.join(", ");

  document.getElementById("categoriasProfissionalTexto").innerText =
    categoriasSelecionadasProfissional.length
      ? categoriasSelecionadasProfissional.join(", ")
      : "Selecionar categorias";

  fecharSeletorCategoriasProfissional();

}

function abrirModalHorariosProfissional(){

  document.getElementById("modal-horarios-profissional").style.display = "flex";

  renderizarHorariosProfissional();

}

function fecharModalHorariosProfissional(){
  document.getElementById("modal-horarios-profissional").style.display = "none";
}

function renderizarHorariosProfissional(){

  const lista = document.getElementById("lista-horarios-profissional");

  const dias = {
    segunda:"Segunda",
    terca:"Terça",
    quarta:"Quarta",
    quinta:"Quinta",
    sexta:"Sexta",
    sabado:"Sábado",
    domingo:"Domingo"
  };

  lista.innerHTML = "";

  Object.keys(dias).forEach((dia)=>{

    lista.innerHTML += `
      <div class="cliente-card">
        <strong>${dias[dia]}</strong>

        <div id="horarios-${dia}"></div>

        <button type="button" onclick="adicionarHorarioDia('${dia}')">
          + Adicionar horário
        </button>
      </div>
    `;

  });

  Object.keys(dias).forEach((dia)=>{
    renderizarHorarioDia(dia);
  });

}

function adicionarHorarioDia(dia){

  horariosProfissionalConfig[dia].push({
    inicio:"08:00",
    fim:"18:00"
  });

  renderizarHorarioDia(dia);

}

function removerHorarioDia(dia, index){

  horariosProfissionalConfig[dia].splice(index, 1);

  renderizarHorarioDia(dia);

}

function atualizarHorarioDia(dia, index, campo, valor){

  horariosProfissionalConfig[dia][index][campo] = valor;

}

function renderizarHorarioDia(dia){

  const div = document.getElementById(`horarios-${dia}`);

  if(!div) return;

  div.innerHTML = "";

  horariosProfissionalConfig[dia].forEach((horario, index)=>{

    div.innerHTML += `
      <div class="linha-horario-profissional">

        <label>
          Entrada
          <input
            type="time"
            value="${horario.inicio}"
            onchange="atualizarHorarioDia('${dia}', ${index}, 'inicio', this.value)"
          >
        </label>

        <label>
          Saída
          <input
            type="time"
            value="${horario.fim}"
            onchange="atualizarHorarioDia('${dia}', ${index}, 'fim', this.value)"
          >
        </label>

        <button type="button" onclick="removerHorarioDia('${dia}', ${index})">
          ×
        </button>

      </div>
    `;

  });

}
function confirmarHorariosProfissional(){

  document.getElementById("horariosProfissional").value =
    JSON.stringify(horariosProfissionalConfig);

  document.getElementById("horariosProfissionalTexto").innerText =
    "Horários configurados";

  fecharModalHorariosProfissional();

}
async function carregarProfissionaisAgenda(){

  const resposta = await supabaseClient
    .from("profissionais_salao")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  window.profissionaisAgendaSistema = resposta.data || [];

  const filtro = document.getElementById("filtroProfissional");
  const select = document.getElementById("profissional");
  const agendaHeader = document.querySelector(".agenda-header");
  const agendaBody = document.querySelector(".agenda-body");

  if(filtro){
    filtro.innerHTML = `<option value="">Todos Profissionais</option>`;
  }

  if(select){
    select.innerHTML = `<option value="">Selecione</option>`;
  }

  if(agendaHeader){
    agendaHeader.innerHTML = `<div class="time-column"></div>`;
  }

  if(agendaBody){
    agendaBody.innerHTML = `
      <div class="time-column">
        ${horariosAgenda.map(horario => `<div aula="tempo">${horario}</div>`).join("")}
      </div>
    `;
  }

  window.profissionaisAgendaSistema.forEach((profissional)=>{

    if(filtro){
      filtro.innerHTML += `
        <option value="${profissional.id}">
          ${profissional.nome}
        </option>
      `;
    }

    if(select){
      select.innerHTML += `
        <option value="${profissional.id}">
          ${profissional.nome}
        </option>
      `;
    }

   if(agendaHeader){
  agendaHeader.innerHTML += `
    <div
      class="professional"
      data-profissional-id="${profissional.id}"
    >
      ${profissional.nome}
    </div>
  `;
}
    if(agendaBody){
      agendaBody.innerHTML += `
        <div class="column" data-profissional-id="${profissional.id}"></div>
      `;
    }

  });

  const quantidade = window.profissionaisAgendaSistema.length || 1;

  if(agendaHeader){
    agendaHeader.style.gridTemplateColumns = `80px repeat(${quantidade}, 1fr)`;
  }

  if(agendaBody){
    agendaBody.style.gridTemplateColumns = `80px repeat(${quantidade}, 1fr)`;
  }

  carregarAgenda();
  
function carregarProfissionais(){

  const lista = document.getElementById("lista-profissionais");

  if(!lista) return;

  lista.innerHTML = "";

  supabaseClient
    .from("profissionais_salao")
    .select("*")
    .order("nome", { ascending:true })
    .then((resposta)=>{

      const profissionais = resposta.data || [];

      profissionais.forEach((profissional)=>{

        lista.innerHTML += `
          <div class="cliente-card" onclick="editarProfissional('${profissional.id}')">
            <strong>${profissional.nome}</strong>
            <p>${profissional.especialidade || "Sem especialidade"}</p>
            <small>Telefone: ${profissional.telefone || "-"}</small>
            <small>Categorias: ${profissional.categorias || "-"}</small>
          </div>
        `;

      });

    });

}
async function editarProfissional(id){

  const resposta =
    await supabaseClient
      .from("profissionais_salao")
      .select("*")
      .eq("id", id)
      .single();

  const profissional = resposta.data;

  if(!profissional){
    alert("Profissional não encontrado.");
    return;
  }

  window.profissionalEditando = id;

  abrirModalProfissional();

  document.getElementById("nomeProfissional").value =
    profissional.nome || "";

  document.getElementById("telefoneProfissional").value =
    profissional.telefone || "";

  document.getElementById("especialidadeProfissional").value =
    profissional.especialidade || "";

  categoriasSelecionadasProfissional =
    profissional.categorias || [];

  document.getElementById("categoriasProfissionalTexto").innerText =
    categoriasSelecionadasProfissional.length
      ? categoriasSelecionadasProfissional.join(", ")
      : "Selecionar categorias";

}
function abrirModalCaixa(){

  let modal = document.getElementById("modal-caixa-completo");

  if(!modal){

    modal = document.createElement("div");
    modal.id = "modal-caixa-completo";

    modal.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.45);
      display:none;
      align-items:center;
      justify-content:center;
    modal.style.zIndex = "999999";
    `;

    modal.innerHTML = `
      <div style="
        background:#fff;
        width:460px;
        max-width:92%;
        border-radius:26px;
        padding:30px;
        box-shadow:0 24px 70px rgba(0,0,0,.22);
        display:flex;
        flex-direction:column;
        gap:14px;
        font-family:inherit;
      ">

        <div>
          <h2 style="margin:0;font-size:24px;font-weight:700;color:#222;">
            Movimento de caixa
          </h2>
          <p style="margin:6px 0 0;color:#777;font-size:14px;">
            Registre entradas e saídas do dia.
          </p>
        </div>

        <select id="tipoMovimentoCaixa" style="padding:14px;border:1px solid #e2e2e2;border-radius:14px;font-size:14px;background:#fff;">
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>

        <input id="valorMovimentoCaixa" type="number" placeholder="Valor R$" style="padding:14px;border:1px solid #e2e2e2;border-radius:14px;font-size:14px;">

        <input id="descricaoMovimentoCaixa" placeholder="Descrição" style="padding:14px;border:1px solid #e2e2e2;border-radius:14px;font-size:14px;">

        <div style="display:flex;gap:10px;margin-top:10px;">
          <button onclick="fecharModalCaixa()" style="flex:1;padding:14px;border:none;border-radius:14px;background:#f1f1f1;color:#333;font-weight:600;">
            Cancelar
          </button>

          <button onclick="salvarMovimentoCaixa()" style="flex:1;padding:14px;border:none;border-radius:14px;background:#111;color:#fff;font-weight:700;">
            Salvar
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

  }

  document.getElementById("valorMovimentoCaixa").value = "";
  document.getElementById("descricaoMovimentoCaixa").value = "";

  modal.style.display = "flex";

}

function fecharModalCaixa(){

  document.getElementById("modal-caixa-completo").style.display = "none";

}

function salvarMovimentoCaixa(){

  const tipo = document.getElementById("tipoMovimentoCaixa").value;
  const valor = Number(document.getElementById("valorMovimentoCaixa").value || 0);
  const descricao = document.getElementById("descricaoMovimentoCaixa").value || "";

  if(!valor){
    alert("Digite o valor.");
    return;
  }

  const movimento = {
    id: Date.now(),
    entrada: tipo === "entrada" ? valor : 0,
    despesa: tipo === "saida" ? valor : 0,
    descricao,
    tipo,
    data: new Date().toLocaleDateString("pt-BR")
  };

  supabaseClient
    .from("caixa")
    .insert([movimento])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao salvar caixa: " + resposta.error.message);
        return;
      }

      fecharModalCaixa();

      carregarCaixa();

      alert("Movimento salvo!");

    });

}

setTimeout(()=>{

  const nav = document.querySelector("nav");

  if(nav && !document.getElementById("menu-caixa")){

    nav.insertAdjacentHTML(
      "beforeend",
      `
        <a
          id="menu-caixa"
          href="#"
          onclick="mostrarSecao('caixa-container'); carregarCaixa();"
        >
          Caixa
        </a>
      `
    );

  }

  if(!document.getElementById("caixa-container")){

    const container = document.createElement("div");

    container.id = "caixa-container";
    container.className = "clientes-container";
container.style.display = "none";

container.style.marginLeft = "180px";
container.style.width = "calc(100% - 180px)";
container.style.padding = "35px";
container.style.boxSizing = "border-box";

    container.innerHTML = `
      <div id="caixa-lateral"></div>
    `;

    document.body.appendChild(container);

  }

},1000);
function abrirNovoCaixa(){

  let modal = document.getElementById("modal-novo-caixa");

  if(!modal){

    modal = document.createElement("div");
    modal.id = "modal-novo-caixa";
    modal.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.35);
      display:none;
      align-items:center;
      justify-content:center;
      z-index:9999;
    `;

    modal.innerHTML = `
      <div style="
        background:#fff;
        width:560px;
        max-width:92%;
        border-radius:26px;
        padding:34px 42px;
        box-shadow:0 24px 70px rgba(0,0,0,.18);
        display:flex;
        flex-direction:column;
        gap:18px;
      ">

        <h2 style="margin:0;font-size:22px;">
          ← Abrir Caixa
        </h2>

        <select id="tipoNovoCaixa" style="padding:14px;border:0;font-size:16px;">
          <option value="compartilhado">Caixa Compartilhado</option>
          <option value="individual">Caixa Individual</option>
        </select>

        <small style="color:#999;">
          Todos os colaboradores com permissão podem manipular o caixa.
        </small>

        <label>Data do caixa</label>
        <input id="dataNovoCaixa" type="date" style="padding:14px;border:1px solid #ddd;border-radius:6px;">

<select id="donoNovoCaixa" style="padding:14px;border:1px solid #ddd;border-radius:6px;background:#fff;">
  <option value="">Caixa Geral / Sem dono</option>
</select>
        <small style="color:#777;">
          Deixe este campo em branco para tornar o caixa geral e sem dono.
        </small>

        <input id="valorAberturaCaixa" type="number" placeholder="Valor Abertura (R$)" style="padding:14px;border:1px solid #ddd;border-radius:6px;">


        <input id="observacaoNovoCaixa" placeholder="Observações" style="padding:14px;border:1px solid #ddd;border-radius:6px;">

        <div style="display:flex;justify-content:flex-end;gap:18px;margin-top:10px;">
          <button onclick="fecharNovoCaixa()" style="border:none;background:transparent;font-weight:700;">
            Cancelar
          </button>

          <button onclick="salvarNovoCaixa()" style="border:none;background:#ff5a1f;color:#fff;padding:13px 28px;border-radius:6px;font-weight:700;">
            Salvar
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

  }

  document.getElementById("dataNovoCaixa").value =
    new Date().toISOString().split("T")[0];

  carregarProfissionaisNovoCaixa();
    modal.style.display = "flex";

}

function fecharNovoCaixa(){
  document.getElementById("modal-novo-caixa").style.display = "none";
}

function salvarNovoCaixa(){

  const tipo = document.getElementById("tipoNovoCaixa").value;
  const data = document.getElementById("dataNovoCaixa").value;
  const valor = Number(document.getElementById("valorAberturaCaixa").value || 0);

  supabaseClient
    .from("caixa")
    .insert([{
  id: Date.now(),
  entrada: valor,
  despesa: 0,
  data: data.split("-").reverse().join("/")
}])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao abrir caixa: " + resposta.error.message);
        return;
      }

      fecharNovoCaixa();
      carregarCaixa();

      alert("Caixa aberto!");

    });

}
setTimeout(()=>{

  const nav = document.querySelector("nav");

  if(nav && !document.getElementById("menu-caixa")){

    nav.insertAdjacentHTML(
      "beforeend",
      `
        <a
          id="menu-caixa"
          href="#"
          onclick="mostrarSecao('caixa-container'); carregarCaixa();"
        >
          Caixa
        </a>
      `
    );

  }

  if(!document.getElementById("caixa-container")){

    const container = document.createElement("div");

    container.id = "caixa-container";
    container.className = "clientes-container";
    container.style.display = "none";

    container.innerHTML = `
      <div id="caixa-lateral"></div>
    `;

    document.body.appendChild(container);

    carregarCaixa();

  }

},1000);
function carregarProfissionaisNovoCaixa(){

  const select = document.getElementById("donoNovoCaixa");

  if(!select) return;

  select.innerHTML = `
    <option value="">Caixa Geral / Sem dono</option>
  `;

  supabaseClient
    .from("profissionais_salao")
    .select("*")
    .eq("ativo", true)
    .order("nome")
    .then((resposta)=>{

      const profissionais = resposta.data || [];

      profissionais.forEach((profissional)=>{

        select.innerHTML += `
          <option value="${profissional.nome}">
            ${profissional.nome}
          </option>
        `;

      });

    });

}
function abrirDetalhesCaixa(caixaId){

  let tela =
    document.getElementById(
      "detalhes-caixa"
    );

  if(!tela){

    tela = document.createElement("div");

    tela.id = "detalhes-caixa";

    tela.style.cssText = `
      position:fixed;
      inset:0;
      background:#fff;
      z-index:99999;
      overflow:auto;
      padding:40px;
    `;

    document.body.appendChild(tela);

  }

  supabaseClient
    .from("caixa")
    .select("*")
    .eq("id", caixaId)
    .single()
    .then((resposta)=>{

      const caixa =
        resposta.data;

      if(!caixa) return;

      tela.innerHTML = `

        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:30px;
        ">

          <div>

            <h1 style="
              margin:0;
              font-size:30px;
            ">
              Caixa
            </h1>

            <p style="
              color:#777;
              margin-top:10px;
            ">
              ${caixa.data}
              •
              ${caixa.dono || "Caixa Geral"}
            </p>

          </div>

          <button
            onclick="fecharDetalhesCaixa()"
            style="
              background:#111;
              color:#fff;
              border:none;
              padding:12px 18px;
              border-radius:14px;
              cursor:pointer;
            "
          >
            Fechar
          </button>

        </div>

        <div style="
          display:grid;
          grid-template-columns:
          repeat(4,1fr);
          gap:18px;
          margin-bottom:30px;
        ">

          <div class="cliente-card">
            <strong>
              R$ ${Number(caixa.abertura || caixa.entrada || 0).toFixed(2)}
            </strong>
            <p>Abertura</p>
          </div>

          <div class="cliente-card">
            <strong id="saldo-atual-caixa">
              R$ 0,00
            </strong>
            <p>Saldo Atual</p>
          </div>

          <div class="cliente-card">
            <strong>
              ${caixa.status || "Aberto"}
            </strong>
            <p>Status</p>
          </div>

          <div class="cliente-card">
            <strong>
              ${caixa.tipo || "-"}
            </strong>
            <p>Tipo</p>
          </div>

        </div>

        <div style="
          display:flex;
          gap:12px;
          margin-bottom:28px;
        ">

          <button
            onclick="
              adicionarMovimentoCaixa(
                '${caixa.id}',
                'Reforço'
              )
            "
            style="
              background:#ff5a1f;
              color:#fff;
              border:none;
              padding:14px 18px;
              border-radius:14px;
            "
          >
            + Reforço
          </button>

          <button
            onclick="
              adicionarMovimentoCaixa(
                '${caixa.id}',
                'Sangria'
              )
            "
            style="
              background:#111;
              color:#fff;
              border:none;
              padding:14px 18px;
              border-radius:14px;
            "
          >
            Sangria
          </button>

          <button
            onclick="
              fecharCaixa(
                '${caixa.id}'
              )
            "
            style="
              background:#d63031;
              color:#fff;
              border:none;
              padding:14px 18px;
              border-radius:14px;
            "
          >
            Fechar Caixa
          </button>

        </div>

        <div id="movimentacoes-caixa"></div>

      `;

      carregarMovimentacoesCaixa(
        caixa.id
      );

    });

}

function fecharDetalhesCaixa(){

  document
    .getElementById(
      "detalhes-caixa"
    )
    .remove();

}
function carregarMovimentacoesCaixa(caixaId){

  const lista = document.getElementById("movimentacoes-caixa");

  if(!lista) return;

  lista.innerHTML = `
    <h2 style="margin-bottom:18px;">Movimentações</h2>
  `;

  supabaseClient
    .from("caixa_movimentacoes")
    .select("*")
    .eq("caixa_id", caixaId)
    .order("id",{ascending:false})
    .then((resposta)=>{

      const movimentos = resposta.data || [];

      let saldo = 0;

      movimentos.forEach((mov)=>{

        saldo += Number(mov.entrada || 0);
        saldo -= Number(mov.saida || 0);

        lista.innerHTML += `
          <div class="cliente-card">
            <strong>${mov.tipo || "Movimento"}</strong>
            <p>${mov.descricao || "-"}</p>
            <small>${mov.forma_pagamento || "-"}</small>
            <small>${mov.data || "-"}</small>
            <small>
              Entrada: R$ ${Number(mov.entrada || 0).toFixed(2)}
            </small>
            <small>
              Saída: R$ ${Number(mov.saida || 0).toFixed(2)}
            </small>
          </div>
        `;

      });

      const saldoEl = document.getElementById("saldo-atual-caixa");

      if(saldoEl){
        saldoEl.innerText = `R$ ${saldo.toFixed(2)}`;
      }

    });

}

function adicionarMovimentoCaixa(caixaId, tipo){

  const valor = Number(prompt(`Valor do ${tipo}:`) || 0);

  if(!valor) return;

  supabaseClient
    .from("caixa_movimentacoes")
    .insert([{
      id: Date.now(),
      caixa_id: Number(caixaId),
      data: new Date().toLocaleDateString("pt-BR"),
      tipo,
      forma_pagamento: "Manual",
      descricao: tipo,
      entrada: tipo === "Reforço" ? valor : 0,
      saida: tipo === "Sangria" ? valor : 0,
      origem: "manual"
    }])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro: " + resposta.error.message);
        return;
      }

      carregarMovimentacoesCaixa(caixaId);
      carregarCaixa();

    });

}

function fecharCaixa(caixaId){

  const confirmar = confirm("Deseja fechar este caixa?");

  if(!confirmar) return;

  supabaseClient
    .from("caixa")
    .update({
      status: "Fechado",
      fechado_em: new Date().toLocaleString("pt-BR")
    })
    .eq("id", caixaId)
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao fechar caixa: " + resposta.error.message);
        return;
      }

      alert("Caixa fechado!");

      fecharDetalhesCaixa();
      carregarCaixa();

    });

}
}
/* =========================
   MÓDULO CAIXA COMPLETO
========================= */

function garantirAbaCaixa(){

  const nav = document.querySelector("nav");

  if(nav && !document.getElementById("menu-caixa")){

    nav.insertAdjacentHTML(
      "beforeend",
      `
        <a
          id="menu-caixa"
          href="#"
          onclick="mostrarSecao('caixa-container'); carregarCaixa();"
        >
          Caixa
        </a>
      `
    );

  }

  if(!document.getElementById("caixa-container")){

    const container = document.createElement("div");

    container.id = "caixa-container";
    container.className = "clientes-container";
    container.style.display = "none";

    container.innerHTML = `
      <div id="caixa-lateral"></div>
    `;

    document.body.appendChild(container);

  }

}

function carregarCaixa(){

  garantirAbaCaixa();

  const caixaDiv = document.getElementById("caixa-lateral");

  if(!caixaDiv) return;

  caixaDiv.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;">
      <h2 style="margin:0;font-size:26px;font-weight:700;">
        Controle de Caixa
      </h2>

      <button onclick="abrirNovoCaixa()" style="background:#111;color:#fff;border:none;padding:14px 22px;border-radius:16px;font-weight:700;cursor:pointer;">
        + Novo Caixa
      </button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 2fr 1fr 1fr 1fr;padding:12px;font-size:13px;font-weight:700;color:#555;border-bottom:1px solid #ddd;">
      <span>Data</span>
      <span>Dono</span>
      <span>Tipo</span>
      <span>Abertura</span>
      <span>Status</span>
    </div>
  `;

  supabaseClient
    .from("caixa")
    .select("*")
    .order("id",{ascending:false})
    .then((resposta)=>{

      const caixas = resposta.data || [];

      caixas.forEach((caixa)=>{

        caixaDiv.innerHTML += `
          <div onclick="abrirDetalhesCaixa('${caixa.id}')" style="display:grid;grid-template-columns:1fr 2fr 1fr 1fr 1fr;padding:18px 12px;border-bottom:1px solid #eee;align-items:center;cursor:pointer;">
            <span>${caixa.data || "-"}</span>
            <strong>${caixa.dono || "Caixa Geral"}</strong>
            <span>${caixa.tipo || "Compartilhado"}</span>
            <span>R$ ${Number(caixa.abertura || caixa.entrada || 0).toFixed(2)}</span>
            <span style="color:${caixa.status === "Fechado" ? "#777" : "#ff5a1f"};font-weight:700;">
              ${caixa.status || "Aberto"}
            </span>
          </div>
        `;

      });

    });

}

function abrirNovoCaixa(){

  let modal = document.getElementById("modal-novo-caixa");

  if(!modal){

    modal = document.createElement("div");
    modal.id = "modal-novo-caixa";

    modal.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.35);
      display:none;
      align-items:center;
      justify-content:center;
      z-index:9999;
    `;

    modal.innerHTML = `
      <div style="background:#fff;width:560px;max-width:92%;border-radius:26px;padding:34px 42px;box-shadow:0 24px 70px rgba(0,0,0,.18);display:flex;flex-direction:column;gap:18px;">

        <h2 style="margin:0;font-size:22px;">← Abrir Caixa</h2>

        <select id="tipoNovoCaixa" style="padding:14px;border:1px solid #ddd;border-radius:8px;font-size:16px;background:#fff;">
          <option value="Compartilhado">Caixa Compartilhado</option>
          <option value="Individual">Caixa Individual</option>
        </select>

        <small style="color:#999;">
          Todos os colaboradores com permissão podem manipular o caixa.
        </small>

        <label>Data do caixa</label>

        <input id="dataNovoCaixa" type="date" style="padding:14px;border:1px solid #ddd;border-radius:8px;">

        <select id="donoNovoCaixa" style="padding:14px;border:1px solid #ddd;border-radius:8px;background:#fff;">
          <option value="">Caixa Geral / Sem dono</option>
        </select>

        <small style="color:#777;">
          Selecione o profissional dono do caixa ou deixe como geral.
        </small>

        <input id="valorAberturaCaixa" type="number" placeholder="Valor Abertura (R$)" style="padding:14px;border:1px solid #ddd;border-radius:8px;">

        <input id="observacaoNovoCaixa" placeholder="Observações" style="padding:14px;border:1px solid #ddd;border-radius:8px;">

        <div style="display:flex;justify-content:flex-end;gap:18px;margin-top:10px;">
          <button onclick="fecharNovoCaixa()" style="border:none;background:transparent;font-weight:700;">
            Cancelar
          </button>

          <button onclick="salvarNovoCaixa()" style="border:none;background:#ff5a1f;color:#fff;padding:13px 28px;border-radius:8px;font-weight:700;">
            Salvar
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

  }

  document.getElementById("dataNovoCaixa").value =
    new Date().toISOString().split("T")[0];

  carregarProfissionaisNovoCaixa();

  modal.style.display = "flex";

}

function fecharNovoCaixa(){
  document.getElementById("modal-novo-caixa").style.display = "none";
}

function carregarProfissionaisNovoCaixa(){

  const select = document.getElementById("donoNovoCaixa");

  if(!select) return;

  select.innerHTML = `
    <option value="">Caixa Geral / Sem dono</option>
  `;

  supabaseClient
    .from("profissionais_salao")
    .select("*")
    .eq("ativo", true)
    .order("nome")
    .then((resposta)=>{

      const profissionais = resposta.data || [];

      profissionais.forEach((profissional)=>{

        select.innerHTML += `
          <option value="${profissional.nome}">
            ${profissional.nome}
          </option>
        `;

      });

    });

}

function salvarNovoCaixa(){

  const tipo = document.getElementById("tipoNovoCaixa").value;
  const data = document.getElementById("dataNovoCaixa").value;
  const dono = document.getElementById("donoNovoCaixa").value;
  const abertura = Number(document.getElementById("valorAberturaCaixa").value || 0);
  const observacao = document.getElementById("observacaoNovoCaixa").value || "";

  supabaseClient
    .from("caixa")
    .insert([{
      id: Date.now(),
      data: data.split("-").reverse().join("/"),
      dono: dono || "Caixa Geral",
      tipo,
      abertura,
      entrada: abertura,
      despesa: 0,
      status: "Aberto",
      observacao
    }])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao abrir caixa: " + resposta.error.message);
        return;
      }

      fecharNovoCaixa();
      carregarCaixa();

      alert("Caixa aberto!");

    });

}

function abrirDetalhesCaixa(caixaId){

  let tela = document.getElementById("detalhes-caixa");

  if(!tela){

    tela = document.createElement("div");
    tela.id = "detalhes-caixa";

    tela.style.cssText = `
      position:fixed;
      inset:0;
      background:#fff;
      z-index:99999;
      overflow:auto;
      padding:40px;
    `;

    document.body.appendChild(tela);

  }

  supabaseClient
    .from("caixa")
    .select("*")
    .eq("id", caixaId)
    .single()
    .then((resposta)=>{

      const caixa = resposta.data;

      if(!caixa) return;

      tela.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:30px;">
          <div>
            <h1 style="margin:0;font-size:30px;">Caixa</h1>
            <p style="color:#777;margin-top:10px;">
              ${caixa.data} • ${caixa.dono || "Caixa Geral"}
            </p>
          </div>

          <button onclick="fecharDetalhesCaixa()" style="background:#111;color:#fff;border:none;padding:12px 18px;border-radius:14px;cursor:pointer;">
            Fechar
          </button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:30px;">
          <div class="cliente-card">
            <strong>R$ ${Number(caixa.abertura || caixa.entrada || 0).toFixed(2)}</strong>
            <p>Abertura</p>
          </div>

          <div class="cliente-card">
            <strong id="saldo-atual-caixa">R$ 0,00</strong>
            <p>Saldo Atual</p>
          </div>

          <div class="cliente-card">
            <strong>${caixa.status || "Aberto"}</strong>
            <p>Status</p>
          </div>

          <div class="cliente-card">
            <strong>${caixa.tipo || "-"}</strong>
            <p>Tipo</p>
          </div>
        </div>

        <div style="display:flex;gap:12px;margin-bottom:28px;">
          <button onclick="adicionarMovimentoCaixa('${caixa.id}','Reforço')" style="background:#ff5a1f;color:#fff;border:none;padding:14px 18px;border-radius:14px;">
            + Reforço
          </button>

          <button onclick="adicionarMovimentoCaixa('${caixa.id}','Sangria')" style="background:#111;color:#fff;border:none;padding:14px 18px;border-radius:14px;">
            Sangria
          </button>

          <button onclick="fecharCaixa('${caixa.id}')" style="background:#d63031;color:#fff;border:none;padding:14px 18px;border-radius:14px;">
            Fechar Caixa
          </button>
        </div>

        <div id="movimentacoes-caixa"></div>
      `;

      carregarMovimentacoesCaixa(caixa.id);

    });

}

function fecharDetalhesCaixa(){

  const tela = document.getElementById("detalhes-caixa");

  if(tela) tela.remove();

}

function carregarMovimentacoesCaixa(caixaId){

  const lista = document.getElementById("movimentacoes-caixa");

  if(!lista) return;

  lista.innerHTML = `<h2 style="margin-bottom:18px;">Movimentações</h2>`;

  supabaseClient
    .from("caixa_movimentacoes")
    .select("*")
    .eq("caixa_id", caixaId)
    .order("id",{ascending:false})
    .then((resposta)=>{

      const movimentos = resposta.data || [];

      let saldo = 0;

      movimentos.forEach((mov)=>{

        saldo += Number(mov.entrada || 0);
        saldo -= Number(mov.saida || 0);

        lista.innerHTML += `
          <div class="cliente-card">
            <strong>${mov.tipo || "Movimento"}</strong>
            <p>${mov.descricao || "-"}</p>
            <small>Forma: ${mov.forma_pagamento || "-"}</small>
            <small>Data: ${mov.data || "-"}</small>
            <small>Entrada: R$ ${Number(mov.entrada || 0).toFixed(2)}</small>
            <small>Saída: R$ ${Number(mov.saida || 0).toFixed(2)}</small>
          </div>
        `;

      });

      const saldoEl = document.getElementById("saldo-atual-caixa");

      if(saldoEl){
        saldoEl.innerText = `R$ ${saldo.toFixed(2)}`;
      }

    });

}

function adicionarMovimentoCaixa(caixaId, tipo){

  const valor = Number(prompt(`Valor do ${tipo}:`) || 0);

  if(!valor) return;

  supabaseClient
    .from("caixa_movimentacoes")
    .insert([{
      id: Date.now(),
      caixa_id: Number(caixaId),
      data: new Date().toLocaleDateString("pt-BR"),
      tipo,
      forma_pagamento: "Manual",
      descricao: tipo,
      entrada: tipo === "Reforço" ? valor : 0,
      saida: tipo === "Sangria" ? valor : 0,
      origem: "manual"
    }])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro: " + resposta.error.message);
        return;
      }

      carregarMovimentacoesCaixa(caixaId);
      carregarCaixa();

    });

}

function fecharCaixa(caixaId){

  const confirmar = confirm("Deseja fechar este caixa?");

  if(!confirmar) return;

  supabaseClient
    .from("caixa")
    .update({
      status: "Fechado",
      fechado_em: new Date().toLocaleString("pt-BR")
    })
    .eq("id", caixaId)
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao fechar caixa: " + resposta.error.message);
        return;
      }

      alert("Caixa fechado!");

      fecharDetalhesCaixa();
      carregarCaixa();

    });

}

/* =========================
   PAINEL PROFISSIONAIS AGENDA
========================= */

window.profissionaisVisiveisAgendaFinal = [];

function criarPainelAgendaProfissionais(){

  const antigo = document.getElementById("painel-profissionais-agenda");

  if(antigo) antigo.remove();

  const painel = document.createElement("div");

  painel.id = "painel-profissionais-agenda";

  painel.style.cssText = `
    position:fixed;
    left:260px;
    top:0;
    width:280px;
    height:100vh;
    background:#fff;
    z-index:20;
    box-shadow:4px 0 24px rgba(0,0,0,.10);
    padding:24px 18px;
    overflow:auto;
    transform:translateX(-250px);
    transition:.25s ease;
  `;

 painel.onclick = function(event){

  if(
    event.target.closest("input") ||
    event.target.closest("label")
  ){
    return;
  }

  const aberto =
    painel.dataset.aberto === "1";

  if(aberto){

    painel.style.transform =
      "translateX(-250px)";

    painel.dataset.aberto = "0";

  }else{

    painel.style.transform =
      "translateX(0)";

    painel.dataset.aberto = "1";

  }

};

  painel.innerHTML = `
    <h3 style="margin:0 0 28px 0;font-size:16px;font-weight:700;">
      Configurações
    </h3>

    <p style="font-size:13px;color:#777;margin-bottom:14px;">
      Profissionais
    </p>

    <div id="lista-profissionais-painel-agenda"></div>
  `;

  document.body.appendChild(painel);

  carregarProfissionaisPainelAgenda();

}

function carregarProfissionaisPainelAgenda(){

  const lista = document.getElementById("lista-profissionais-painel-agenda");

  if(!lista) return;

  lista.innerHTML = "";

 supabaseClient
  .from("profissionais_salao")
  .select("*")
  .order("nome")
  .then((resposta)=>{

      const profissionais = resposta.data || [];

      document.querySelectorAll(".professional").forEach((header,index)=>{
        if(profissionais[index]){
          header.dataset.profissionalId = profissionais[index].id;
        }
      });

      document.querySelectorAll(".column").forEach((coluna,index)=>{
        if(profissionais[index]){
          coluna.dataset.profissionalId = profissionais[index].id;
        }
      });

      if(window.profissionaisVisiveisAgendaFinal.length === 0){
        window.profissionaisVisiveisAgendaFinal =
          profissionais.map(p => String(p.id));
      }

      profissionais.forEach((profissional)=>{

        const id = String(profissional.id);

        const marcado =
          window.profissionaisVisiveisAgendaFinal.includes(id)
            ? "checked"
            : "";

        lista.innerHTML += `
          <label style="display:flex;align-items:center;gap:10px;margin-bottom:14px;font-size:14px;cursor:pointer;">
            <input
              type="checkbox"
              value="${id}"
              ${marcado}
              onchange="alternarProfissionalAgenda(this)"
              style="width:16px;height:16px;accent-color:#111;"
            >
            <span>${profissional.nome}</span>
          </label>
        `;

      });

      aplicarFiltroProfissionaisAgenda();

    });

}

function alternarProfissionalAgenda(input){

  const id = String(input.value);

  if(input.checked){

    if(!window.profissionaisVisiveisAgendaFinal.includes(id)){
      window.profissionaisVisiveisAgendaFinal.push(id);
    }

  }else{

    window.profissionaisVisiveisAgendaFinal =
      window.profissionaisVisiveisAgendaFinal.filter(item => item !== id);

  }

  aplicarFiltroProfissionaisAgenda();

}

function aplicarFiltroProfissionaisAgenda(){

  const visiveis = window.profissionaisVisiveisAgendaFinal || [];

  document.querySelectorAll(".professional").forEach((header)=>{

    const id = String(header.dataset.profissionalId || "");

    header.style.display =
      visiveis.includes(id)
        ? "block"
        : "none";

  });

  document.querySelectorAll(".column").forEach((coluna)=>{

    const id = String(coluna.dataset.profissionalId || "");

    coluna.style.display =
      visiveis.includes(id)
        ? "block"
        : "none";

  });

  const quantidade = visiveis.length || 1;

  const agendaHeader = document.querySelector(".agenda-header");
  const agendaBody = document.querySelector(".agenda-body");

  if(agendaHeader){
    agendaHeader.style.gridTemplateColumns =
      `80px repeat(${quantidade}, 1fr)`;
  }

  if(agendaBody){
    agendaBody.style.gridTemplateColumns =
      `80px repeat(${quantidade}, 1fr)`;
  }

}

setTimeout(()=>{

  garantirAbaCaixa();
  carregarCaixa();
  criarPainelAgendaProfissionais();

},2000);
function ajustarHorariosLateraisAgenda(){

  const agendaBody = document.querySelector(".agenda-body");

  if(!agendaBody) return;

  let colunaTempo = agendaBody.querySelector(".time-column");

  if(!colunaTempo){

    colunaTempo = document.createElement("div");
    colunaTempo.className = "time-column";
    agendaBody.prepend(colunaTempo);

  }

  colunaTempo.innerHTML = "";

  horariosAgenda.forEach((horario)=>{

    colunaTempo.innerHTML += `
      <div style="
        height:80px;
        min-height:80px;
        box-sizing:border-box;
        border-bottom:1px solid #eee;
        display:flex;
        align-items:flex-start;
        justify-content:center;
        padding-top:6px;
        font-size:12px;
        color:#666;
        font-weight:600;
      ">
        ${horario}
      </div>
    `;

  });

}

setTimeout(ajustarHorariosLateraisAgenda, 2200);
function salvarCliente(){

  const cliente = {
    nome: document.getElementById("nomeCliente").value,
    telefone: document.getElementById("telefoneCliente").value,
    aniversario: document.getElementById("aniversarioCliente")?.value || "",
    preferencia: document.getElementById("preferenciaCliente")?.value || "",
    alergias: document.getElementById("alergiasCliente")?.value || "",
    foto: document.getElementById("fotoCliente")?.value || "",
    observacoes: document.getElementById("observacaoCliente")?.value || ""
  };

  if(!cliente.nome){
    alert("Digite o nome da cliente.");
    return;
  }

  supabaseClient
    .from("clients")
    .insert([cliente])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao salvar cliente: " + resposta.error.message);
        return;
      }

      alert("Cliente salva!");

      document.getElementById("nomeCliente").value = "";
      document.getElementById("telefoneCliente").value = "";

      if(document.getElementById("aniversarioCliente")){
        document.getElementById("aniversarioCliente").value = "";
      }

      if(document.getElementById("preferenciaCliente")){
        document.getElementById("preferenciaCliente").value = "";
      }

      if(document.getElementById("alergiasCliente")){
        document.getElementById("alergiasCliente").value = "";
      }

      if(document.getElementById("fotoCliente")){
        document.getElementById("fotoCliente").value = "";
      }

      if(document.getElementById("observacaoCliente")){
        document.getElementById("observacaoCliente").value = "";
      }

      carregarClientes();
      carregarClientesAgendamento();

    });

}
function garantirBotaoSalvarCliente(){

  const nomeCliente =
    document.getElementById("nomeCliente");

  if(!nomeCliente) return;

  if(document.getElementById("btn-salvar-cliente")) return;

  const botao = document.createElement("button");

  botao.id = "btn-salvar-cliente";
  botao.innerText = "Salvar Cliente";
  botao.onclick = salvarCliente;

  botao.style.cssText = `
    width:100%;
    background:#ff7a00;
    color:#fff;
    border:none;
    padding:16px;
    border-radius:12px;
    font-weight:700;
    cursor:pointer;
    margin:16px 0;
  `;

  const telefoneCliente =
    document.getElementById("telefoneCliente");

  if(telefoneCliente){
    telefoneCliente.insertAdjacentElement("afterend", botao);
  }else{
    nomeCliente.insertAdjacentElement("afterend", botao);
  }

}

setTimeout(garantirBotaoSalvarCliente, 2000);
function garantirBotaoNovaCategoriaServico(){

  const select =
    document.getElementById("categoriaServicoSalao");

  if(!select) return;

  if(document.getElementById("btn-nova-categoria-servico")) return;

  const botao = document.createElement("button");

  botao.id = "btn-nova-categoria-servico";
  botao.innerText = "+ Nova categoria";
  botao.onclick = abrirModalCategoria;

  botao.style.cssText = `
    width:100%;
    background:#111;
    color:#fff;
    border:none;
    padding:13px;
    border-radius:12px;
    font-weight:700;
    cursor:pointer;
    margin:10px 0 16px;
  `;

  select.insertAdjacentElement("afterend", botao);

}

setInterval(garantirBotaoNovaCategoriaServico, 1000);
function recarregarPainelProfissionaisAgenda(){

  const painel =
    document.getElementById("painel-profissionais-agenda");

  if(!painel) return;

  carregarProfissionaisPainelAgenda();

}

setInterval(recarregarPainelProfissionaisAgenda, 3000);

function carregarProfissionais(){

  const lista = document.getElementById("lista-profissionais");

  if(!lista) return;

  lista.innerHTML = "";

  supabaseClient
    .from("profissionais_salao")
    .select("*")
    .order("nome")
    .then((resposta)=>{

      const profissionais = resposta.data || [];

      profissionais.forEach((profissional)=>{

        lista.innerHTML += `
          <div class="cliente-card" onclick="editarProfissional('${profissional.id}')">
            <strong>${profissional.nome || "Sem nome"}</strong>
            <small>${profissional.telefone || ""}</small>
            <small>${profissional.especialidade || ""}</small>
          </div>
        `;

      });

    });

}
function adicionarCategoriaServico(){

  const campo =
    document.getElementById("novaCategoriaServico");

  const nome = campo?.value?.trim();

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
        alert("Erro ao salvar categoria: " + resposta.error.message);
        return;
      }

      alert("Categoria salva!");

      campo.value = "";

      fecharModalCategoria();
      carregarCategoriasServicos();

    });

}
function abrirEscolhaHorario(profissionalId, horario){

  const acao = confirm(
    "Clique em OK para criar um novo agendamento.\n\nClique em Cancelar para bloquear este horário."
  );

  if(acao){

    window.profissionalPreSelecionado = profissionalId;

    document.getElementById("horario").value = horario;

    abrirModal();

  }else{

    abrirModalBloqueioHorario(profissionalId, horario);

  }

}

function abrirModalBloqueioHorario(profissionalId, horarioInicio){

  let modal = document.getElementById("modal-bloqueio-horario");

  if(!modal){

    modal = document.createElement("div");
    modal.id = "modal-bloqueio-horario";

    modal.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.35);
      display:none;
      align-items:center;
      justify-content:center;
      z-index:99999;
    `;

    modal.innerHTML = `
      <div style="
        background:#fff;
        width:560px;
        max-width:92%;
        border-radius:26px;
        padding:34px 42px;
        box-shadow:0 24px 70px rgba(0,0,0,.18);
        display:flex;
        flex-direction:column;
        gap:18px;
      ">

        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h2 style="margin:0;font-size:22px;">
            ← Bloqueio de horário
          </h2>

          <button
            onclick="salvarBloqueioHorario()"
            style="
              border:none;
              background:transparent;
              font-weight:700;
              cursor:pointer;
            "
          >
            SALVAR
          </button>
        </div>

        <input id="bloqueioProfissionalId" type="hidden">

        <input
          id="bloqueioProfissionalNome"
          placeholder="Colaborador"
          readonly
          style="padding:14px;border:1px solid #ddd;border-radius:8px;"
        >

        <input
          id="bloqueioData"
          type="date"
          style="padding:14px;border:1px solid #ddd;border-radius:8px;"
        >

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <input
            id="bloqueioInicio"
            type="time"
            style="padding:14px;border:1px solid #ddd;border-radius:8px;"
          >

          <input
            id="bloqueioFim"
            type="time"
            style="padding:14px;border:1px solid #ddd;border-radius:8px;"
          >
        </div>

        <input
          id="bloqueioDescricao"
          placeholder="Descrição"
          style="padding:14px;border:1px solid #ddd;border-radius:8px;"
        >

        <label style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          color:#ff5a1f;
          font-weight:600;
          margin-top:10px;
        ">
          Repetir Bloqueio de Horário
          <input id="bloqueioRepetir" type="checkbox">
        </label>

        <div style="display:flex;justify-content:flex-end;gap:18px;margin-top:18px;">
          <button
            onclick="fecharModalBloqueioHorario()"
            style="border:none;background:transparent;font-weight:700;"
          >
            Cancelar
          </button>

          <button
            onclick="salvarBloqueioHorario()"
            style="
              border:none;
              background:#ff5a1f;
              color:#fff;
              padding:13px 28px;
              border-radius:8px;
              font-weight:700;
            "
          >
            Salvar
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

  }

  const profissionalNome =
    document
      .querySelector(`.professional[data-profissional-id="${profissionalId}"]`)
      ?.innerText || "Profissional";

  document.getElementById("bloqueioProfissionalId").value = profissionalId;
  document.getElementById("bloqueioProfissionalNome").value = profissionalNome;

  document.getElementById("bloqueioData").value =
    dataSelecionada.toISOString().split("T")[0];

  document.getElementById("bloqueioInicio").value = horarioInicio;

  const partes = horarioInicio.split(":");
  const fim = new Date();
  fim.setHours(Number(partes[0]));
  fim.setMinutes(Number(partes[1]) + 30);

  document.getElementById("bloqueioFim").value =
    String(fim.getHours()).padStart(2,"0") +
    ":" +
    String(fim.getMinutes()).padStart(2,"0");

  document.getElementById("bloqueioDescricao").value = "";
  document.getElementById("bloqueioRepetir").checked = false;

  modal.style.display = "flex";

}

function fecharModalBloqueioHorario(){

  const modal =
    document.getElementById("modal-bloqueio-horario");

  if(modal) modal.style.display = "none";

}

function salvarBloqueioHorario(){

  const profissionalId =
    document.getElementById("bloqueioProfissionalId").value;

  const profissionalNome =
    document.getElementById("bloqueioProfissionalNome").value;

  const dataCampo =
    document.getElementById("bloqueioData").value;

  const inicio =
    document.getElementById("bloqueioInicio").value;

  const fim =
    document.getElementById("bloqueioFim").value;

  const descricao =
    document.getElementById("bloqueioDescricao").value || "fechado";

  const repetir =
    document.getElementById("bloqueioRepetir").checked;

  if(!profissionalId || !dataCampo || !inicio || !fim){
    alert("Preencha os dados do bloqueio.");
    return;
  }

  supabaseClient
    .from("bloqueios_agenda")
    .insert([{
      id: Date.now(),
      profissional_id: profissionalId,
      profissional_nome: profissionalNome,
      data: dataCampo.split("-").reverse().join("/"),
      horario_inicio: inicio,
      horario_fim: fim,
      descricao,
      repetir,
      criado_em: new Date().toLocaleString("pt-BR")
    }])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao salvar bloqueio: " + resposta.error.message);
        return;
      }

      fecharModalBloqueioHorario();
      carregarAgenda();

      alert("Horário bloqueado!");

    });

}
function abrirEscolhaHorario(profissionalId, horario){

  const antigo = document.getElementById("menu-escolha-horario");
  if(antigo) antigo.remove();

  const menu = document.createElement("div");

  menu.id = "menu-escolha-horario";

  menu.style.cssText = `
    position:fixed;
    left:50%;
    top:50%;
    transform:translate(-50%,-50%);
    background:#fff;
    border-radius:4px;
    box-shadow:0 8px 30px rgba(0,0,0,.25);
    z-index:999999;
    min-width:190px;
    padding:8px 0;
  `;

  menu.innerHTML = `
    <div onclick="abrirAgendamentoPeloMenu('${profissionalId}','${horario}')" style="padding:12px 18px;cursor:pointer;">
      Novo Atendimento
    </div>

    <div onclick="alert('Nova venda será configurada depois.')" style="padding:12px 18px;cursor:pointer;">
      Nova Venda
    </div>

    <div onclick="abrirBloqueioPeloMenu('${profissionalId}','${horario}')" style="padding:12px 18px;cursor:pointer;">
      Bloqueio de Horário
    </div>
  `;

  document.body.appendChild(menu);

}

function abrirAgendamentoPeloMenu(profissionalId, horario){

  const menu = document.getElementById("menu-escolha-horario");
  if(menu) menu.remove();

  window.profissionalPreSelecionado = profissionalId;

  document.getElementById("horario").value = horario;

  abrirModal();

}

function abrirBloqueioPeloMenu(profissionalId, horario){

  const menu = document.getElementById("menu-escolha-horario");
  if(menu) menu.remove();

  abrirModalBloqueioHorario(profissionalId, horario);

}
function carregarBloqueiosAgenda(){

  document
    .querySelectorAll(".bloqueio-agenda")
    .forEach(item => item.remove());

  supabaseClient
    .from("bloqueios_agenda")
    .select("*")
    .eq("data", formatarData(dataSelecionada))
    .then((resposta)=>{

      const bloqueios = resposta.data || [];

      bloqueios.forEach((bloqueio)=>{

        const coluna = document.querySelector(
          `.column[data-profissional-id="${bloqueio.profissional_id}"]`
        );

        if(!coluna) return;

        const card = document.createElement("div");

        card.className = "bloqueio-agenda";

        const inicio = bloqueio.horario_inicio;
        const fim = bloqueio.horario_fim;

        card.style.cssText = `
          position:absolute;
          top:${calcularTop(inicio)}px;
          left:4px;
          right:4px;
          height:${calcularAlturaBloqueio(inicio, fim)}px;
          background:#ddd;
          border-left:5px solid #999;
          border-radius:8px;
          padding:8px;
          font-size:12px;
          color:#111;
          z-index:4;
          box-sizing:border-box;
        `;

        card.onclick = function(event){
  event.stopPropagation();

  excluirBloqueioAgenda(bloqueio.id);
};

card.innerHTML = `
  <strong>${inicio} - ${fim}</strong><br>
  ${bloqueio.descricao || "fechado"}
`;

        coluna.appendChild(card);

      });

    });

}

function calcularAlturaBloqueio(inicio, fim){

  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fim.split(":").map(Number);

  const minutosInicio = hi * 60 + mi;
  const minutosFim = hf * 60 + mf;

  const duracao = minutosFim - minutosInicio;

  return Math.max((duracao / 30) * 80 - 8, 40);

}

if(!window.carregarAgendaOriginalBloqueio){

  window.carregarAgendaOriginalBloqueio = carregarAgenda;

  carregarAgenda = function(){

    window.carregarAgendaOriginalBloqueio();

    setTimeout(carregarBloqueiosAgenda, 800);

  };

}
function excluirBloqueioAgenda(id){

  const confirmar = confirm(
    "Deseja excluir este bloqueio de horário?"
  );

  if(!confirmar) return;

  supabaseClient
    .from("bloqueios_agenda")
    .delete()
    .eq("id", Number(id))
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao excluir bloqueio: " + resposta.error.message);
        return;
      }

      alert("Bloqueio excluído!");

      carregarAgenda();

    });

}

function abrirConfiguracoes(){

  let container =
    document.getElementById("configuracoes-container");

  if(!container){

    container = document.createElement("div");
    container.id = "configuracoes-container";
    container.className = "clientes-container";
    document.body.appendChild(container);

  }

  mostrarSecao("configuracoes-container");

  container.innerHTML = `
    <h2>Configurações</h2>

    <div
      onclick="abrirFormasPagamento()"
      class="cliente-card"
      style="cursor:pointer;"
    >
      <strong>Formas de pagamento</strong>

      <p>
        Cadastre Pix, dinheiro,
        cartão de crédito, débito
        e outras formas.
      </p>

    </div>
  `;

}

function abrirFormasPagamento(){

  const container =
    document.getElementById("configuracoes-container");

  container.innerHTML = `
    <button onclick="abrirConfiguracoes()">
      ← Voltar
    </button>

    <h2 style="margin:22px 0;">
      Formas de pagamento
    </h2>

    <div class="cliente-card">
      <input
        id="novaFormaPagamento"
        placeholder="Ex: Pix, Dinheiro, Crédito, Débito"
      >

      <button onclick="salvarFormaPagamento()">
        Salvar forma
      </button>
    </div>

    <div id="lista-formas-pagamento"></div>
  `;

  carregarFormasPagamento();

}

function salvarFormaPagamento(){

  const campo =
    document.getElementById("novaFormaPagamento");

  const nome = campo.value.trim();

  if(!nome){
    alert("Digite a forma de pagamento.");
    return;
  }

  supabaseClient
    .from("formas_pagamento")
    .insert([{
      id: Date.now(),
      nome,
      ativo: true,
      criado_em: new Date().toLocaleString("pt-BR")
    }])
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao salvar forma: " + resposta.error.message);
        return;
      }

      campo.value = "";
      carregarFormasPagamento();

    });

}

function carregarFormasPagamento(){

  const lista =
    document.getElementById("lista-formas-pagamento");

  if(!lista) return;

  lista.innerHTML = "";

  supabaseClient
    .from("formas_pagamento")
    .select("*")
    .order("nome")
    .then((resposta)=>{

      const formas = resposta.data || [];

      formas.forEach((forma)=>{

        lista.innerHTML += `
          <div class="cliente-card">
            <strong>${forma.nome}</strong>

            <button onclick="excluirFormaPagamento('${forma.id}')">
              Excluir
            </button>
          </div>
        `;

      });

    });

}

function excluirFormaPagamento(id){

  const confirmar =
    confirm("Deseja excluir esta forma de pagamento?");

  if(!confirmar) return;

  supabaseClient
    .from("formas_pagamento")
    .delete()
    .eq("id", Number(id))
    .then(()=>{

      carregarFormasPagamento();

    });

}
function controlarPainelProfissionaisPorTela(){

  const painel =
    document.getElementById(
      "painel-profissionais-agenda"
    );

  if(!painel) return;

  const agendaAberta =
    document.querySelector(".agenda-container")
      ?.style.display !== "none";

  if(agendaAberta){

    painel.style.display = "block";

    document.body.style.marginLeft = "";

  }else{

    painel.style.display = "none";

    document.body.style.marginLeft = "0px";

    const containerPrincipal =
      document.querySelector(
        ".main-content"
      );

    if(containerPrincipal){

      containerPrincipal.style.marginLeft =
        "0px";

      containerPrincipal.style.width =
        "calc(100% - 140px)";

    }

  }

}

setInterval(
  controlarPainelProfissionaisPorTela,
  500
);

function restaurarLayoutPrincipal(){

  const principal =
    document.querySelector(".agenda-container")?.parentElement;

  if(principal){
    principal.style.marginLeft = "";
    principal.style.paddingLeft = "";
    principal.style.width = "";
  }

  const painel =
    document.getElementById("painel-profissionais-agenda");

  if(painel){
    painel.style.position = "fixed";
    painel.style.left = "180px";
    painel.style.transform = "translateX(-250px)";
    painel.style.zIndex = "20";
  }

}

setTimeout(restaurarLayoutPrincipal, 1000);
setInterval(restaurarLayoutPrincipal, 3000);
function corrigirTelaConfiguracoes(){

  const config =
    document.getElementById("configuracoes-container");

  if(!config) return;

  config.style.marginLeft = "0px";
  config.style.paddingLeft = "40px";
  config.style.width = "100%";
  config.style.boxSizing = "border-box";

}

setInterval(corrigirTelaConfiguracoes, 700);

function editarServicoSalao(id){

  supabaseClient
    .from("servicos_salao")
    .select("*")
    .eq("id", id)
    .single()
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao buscar serviço.");
        return;
      }

      const servico = resposta.data;

      servicoEditandoId = id;

      abrirModalServico(true);

      document.getElementById("nomeServicoSalao").value = servico.nome || "";
      document.getElementById("categoriaServicoSalao").value = servico.categoria || "";
      document.getElementById("descricaoServicoSalao").value = servico.descricao || "";
      document.getElementById("comissaoServicoSalao").value = servico.comissao_padrao || "";
      document.getElementById("duracaoServicoSalao").value = servico.duracao || "";
      document.getElementById("valorServicoSalao").value = servico.valor || "";
      document.getElementById("custoServicoSalao").value = servico.custo || "";

    });

}
function editarPacote(id){

  supabaseClient
    .from("pacotes")
    .select("*")
    .eq("id", id)
    .single()
    .then((resposta)=>{

      if(resposta.error){
        alert("Erro ao buscar pacote: " + resposta.error.message);
        return;
      }

      const pacote = resposta.data;

      if(!pacote){
        alert("Pacote não encontrado.");
        return;
      }

      window.pacoteEditandoId = id;

      abrirModalPacote(true);

      document.getElementById("nomePacote").value = pacote.nome || "";
      document.getElementById("validadePacote").value = pacote.validade_dias || "";
      document.getElementById("statusPacote").value = pacote.status || "";

      document.getElementById("itensPacote").innerHTML = "";

      let itens = [];

      try{
        itens = JSON.parse(pacote.itens || "[]");
      }catch(e){
        itens = [];
      }

      itens.forEach((item)=>{

        adicionarLinhaItemPacote();

        const linhas =
          document.querySelectorAll(".item-pacote");

        const linha =
          linhas[linhas.length - 1];

        linha.querySelector(".servico-item-pacote").value =
          item.servico || "";

        linha.querySelector(".valor-item-pacote").value =
          item.valor || "";

        linha.querySelector(".qtd-item-pacote").value =
          item.qtd || "";

      });

      calcularValorPacote();

    });

}
function abrirModalFaturamento(agendamento, callback){

  window.pagamentosFaturamento = [];

  let modal =
    document.getElementById("modal-faturamento");

  if(!modal){

    modal = document.createElement("div");
    modal.id = "modal-faturamento";

    modal.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.45);
      display:none;
      align-items:center;
      justify-content:center;
      z-index:999999;
    `;

    document.body.appendChild(modal);

  }

  modal.innerHTML = `
    <div style="
      background:#fff;
      width:540px;
      max-width:94%;
      border-radius:24px;
      padding:28px;
      display:flex;
      flex-direction:column;
      gap:16px;
    ">

      <h2 style="margin:0;">
        Faturar atendimento
      </h2>

      <p style="margin:0;color:#777;">
        Cliente: <strong>${agendamento.cliente}</strong>
      </p>

      <div id="lista-servicos-faturamento"></div>

      <strong id="total-faturamento">
        Total: R$ 0,00
      </strong>

      <strong id="restante-faturamento" style="color:#ff5a1f;">
        Restante: R$ 0,00
      </strong>

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr auto;
        gap:10px;
        align-items:center;
      ">
        <input
          id="valorParcialFaturamento"
          type="number"
          placeholder="Valor pago"
          style="padding:14px;border:1px solid #ddd;border-radius:12px;"
        >

        <select
          id="formaPagamentoFaturamento"
          style="padding:14px;border:1px solid #ddd;border-radius:12px;"
        >
          <option value="">Forma</option>
        </select>

        <button
          onclick="adicionarPagamentoFaturamento()"
          style="
            padding:14px;
            border:none;
            border-radius:12px;
            background:#ff5a1f;
            color:#fff;
            font-weight:700;
            cursor:pointer;
          "
        >
          +
        </button>
      </div>

      <div id="lista-pagamentos-faturamento"></div>

      <div style="display:flex;gap:10px;margin-top:10px;">
        <button
          onclick="document.getElementById('modal-faturamento').style.display='none'"
          style="flex:1;padding:14px;border:none;border-radius:12px;"
        >
          Cancelar
        </button>

        <button
          id="btnSalvarFaturamento"
          style="flex:1;padding:14px;border:none;border-radius:12px;background:#111;color:#fff;"
        >
          Salvar
        </button>
      </div>

    </div>
  `;

  supabaseClient
    .from("Agendamentos")
    .select("*")
    .eq("cliente", agendamento.cliente)
    .eq("data", agendamento.data)
    .then((respAgendamentos)=>{

      const agendamentosDia = respAgendamentos.data || [];

      supabaseClient
        .from("servicos_salao")
        .select("*")
        .then((respServicos)=>{

          const servicosCadastrados = respServicos.data || [];
          const lista = document.getElementById("lista-servicos-faturamento");

          lista.innerHTML = "";

          agendamentosDia.forEach((item)=>{

            const nomeServicoAgendamento =
              (item.servico || "")
                .toLowerCase()
                .trim();

            const servicoInfo =
              servicosCadastrados.find((s)=>{
                return (
                  (s.nome || "")
                    .toLowerCase()
                    .trim()
                  === nomeServicoAgendamento
                );
              });

            let valor =
              Number(
                item.valor ||
                servicoInfo?.valor ||
                0
              );

            if(!valor){

              const valorManual = prompt(
                "Informe o valor de: " + item.servico
              );

              valor = Number(valorManual || 0);

            }

            lista.innerHTML += `
              <label style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                padding:12px 0;
                border-bottom:1px solid #eee;
                cursor:pointer;
              ">

                <span>
                  <input
                    type="checkbox"
                    class="check-servico-faturamento"
                    data-servico="${item.servico}"
                    data-valor="${valor}"
                    ${item.id === agendamento.id ? "checked" : ""}
                    onchange="atualizarTotalFaturamento()"
                  >

                  ${item.data} — ${item.servico}
                </span>

                <strong>
                  R$ ${valor.toFixed(2)}
                </strong>

              </label>
            `;

       });

          atualizarTotalFaturamento();

        });

    });


  supabaseClient
    .from("formas_pagamento")
    .select("*")
    .order("nome")
    .then((resposta)=>{

      const select =
        document.getElementById("formaPagamentoFaturamento");

      (resposta.data || []).forEach((forma)=>{

        select.innerHTML += `
          <option value="${forma.nome}">
            ${forma.nome}
          </option>
        `;

      });

    });

  document.getElementById("btnSalvarFaturamento").onclick = function(){

    const selecionados =
      Array.from(
        document.querySelectorAll(".check-servico-faturamento:checked")
      );

    if(selecionados.length === 0){
      alert("Selecione pelo menos um serviço.");
      return;
    }

    const servicosSelecionados =
      selecionados.map(item => ({
        servico: item.dataset.servico,
        valor: Number(item.dataset.valor || 0)
      }));

    const total =
      servicosSelecionados.reduce((soma,item)=> soma + item.valor, 0);

    modal.style.display = "none";

    const formaPagamentoSelecionada =
  document.getElementById(
    "formaPagamentoFaturamento"
  )?.value || "";

console.log(
  "FORMA PAGAMENTO:",
  formaPagamentoSelecionada
);

callback(
  total,
  formaPagamentoSelecionada,
  servicosSelecionados
);

  };

  modal.style.display = "flex";

}
function atualizarTotalFaturamento(){

  const checks =
    document.querySelectorAll(".check-servico-faturamento:checked");

  let total = 0;

  checks.forEach((check)=>{
    total += Number(check.dataset.valor || 0);
  });

  const totalEl = document.getElementById("total-faturamento");

  if(totalEl){
    totalEl.innerText = "Total: R$ " + total.toFixed(2);
  }

  atualizarPagamentosFaturamento();

}

function adicionarPagamentoFaturamento(){

  const valorCampo = document.getElementById("valorParcialFaturamento");
  const formaCampo = document.getElementById("formaPagamentoFaturamento");

  const valor = Number(valorCampo.value || 0);
  const forma = formaCampo.value;

  if(!valor || !forma){
    alert("Informe valor e forma de pagamento.");
    return;
  }

  const totalTexto =
    document
      .getElementById("total-faturamento")
      .innerText
      .replace("Total: R$ ","")
      .replace(",",".");

  const total = Number(totalTexto || 0);

  const jaPago =
    window.pagamentosFaturamento.reduce((soma,item)=>{
      return soma + Number(item.valor || 0);
    },0);

  if(jaPago + valor > total){
    alert("O valor informado ultrapassa o total.");
    return;
  }

  window.pagamentosFaturamento.push({
    valor,
    forma
  });

  valorCampo.value = "";
  formaCampo.value = "";

  atualizarPagamentosFaturamento();

}

function atualizarPagamentosFaturamento(){

  const lista = document.getElementById("lista-pagamentos-faturamento");
  const restanteEl = document.getElementById("restante-faturamento");

  if(!lista || !restanteEl) return;

  const totalTexto =
    document
      .getElementById("total-faturamento")
      .innerText
      .replace("Total: R$ ","")
      .replace(",",".");

  const total = Number(totalTexto || 0);

  const pago =
    window.pagamentosFaturamento.reduce((soma,item)=>{
      return soma + Number(item.valor || 0);
    },0);

  const restante = total - pago;

  restanteEl.innerText =
    "Restante: R$ " + restante.toFixed(2);

  lista.innerHTML = "";

  window.pagamentosFaturamento.forEach((item,index)=>{

    lista.innerHTML += `
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        padding:10px 0;
        border-bottom:1px solid #eee;
        font-size:14px;
      ">
        <span>
          ${item.forma} — R$ ${Number(item.valor).toFixed(2)}
        </span>

        <button
          onclick="removerPagamentoFaturamento(${index})"
          style="
            border:none;
            background:transparent;
            color:#d63031;
            font-weight:700;
            cursor:pointer;
          "
        >
          remover
        </button>
      </div>
    `;

  });

}

function removerPagamentoFaturamento(index){

  window.pagamentosFaturamento.splice(index,1);

  atualizarPagamentosFaturamento();

}
function garantirAbaVendas(){

  const nav = document.querySelector("nav");

  if(nav && !document.getElementById("menu-vendas")){

    nav.insertAdjacentHTML(
      "beforeend",
      `
        <a
          id="menu-vendas"
          href="#"
          onclick="mostrarSecao('vendas-container'); carregarVendas(); return false;"
        >
          Vendas
        </a>
      `
    );

  }

  if(!document.getElementById("vendas-container")){

    const container = document.createElement("div");

    container.id = "vendas-container";
    container.className = "clientes-container";
    container.style.display = "none";

    container.innerHTML = `
      <h2>Vendas</h2>
      <div id="lista-vendas"></div>
    `;

    document.body.appendChild(container);

  }

}

function carregarVendas(){

  garantirAbaVendas();

  const lista =
    document.getElementById("lista-vendas");

  if(!lista) return;

 lista.innerHTML = `
  <div style="
    display:grid;
    grid-template-columns:1.5fr 2fr 1fr 1fr 1fr 1fr 1fr;
    padding:12px;
    font-weight:700;
    border-bottom:1px solid #ddd;
    color:#555;
  ">
    <span>Cliente</span>
    <span>Serviços</span>
    <span>Valor</span>
    <span>Status</span>
    <span>Pagamento</span>
    <span>Data</span>
    <span>Ações</span>
  </div>
`;

  supabaseClient
    .from("comandas")
    .select("*")
    .order("id",{ascending:false})
    .then((resposta)=>{

      const vendas = resposta.data || [];

      vendas.forEach((venda)=>{

        lista.innerHTML += `
          <div
            onclick="abrirHistoricoVenda('${venda.id}')"
            style="
              cursor:pointer;
              display:grid;
              grid-template-columns:1.5fr 2fr 1fr 1fr 1fr 1fr 1fr;
              padding:16px 12px;
              border-bottom:1px solid #eee;
              align-items:center;
              gap:10px;
            "
          >
            <strong>${venda.cliente || "-"}</strong>

            <span>${venda.servico || "-"}</span>

            <span>
              R$ ${Number(venda.valor || 0).toFixed(2)}
            </span>

            <span style="
              color:${venda.status === "FECHADO" ? "#16a34a" : "#dc2626"};
              font-weight:700;
            ">
              ${venda.status || "EM ABERTO"}
            </span>

           <span>

<span>
  ${
    venda.status === "FECHADO"
      ? "QUITADO"
      : "-"
  }
</span>
</span>

            <span>${venda.data || "-"}</span>
            <button
  onclick="event.stopPropagation(); cancelarVenda('${venda.id}')"
  style="
    border:none;
    background:#d63031;
    color:#fff;
    padding:8px 12px;
    border-radius:8px;
    font-weight:700;
    cursor:pointer;
  "
>
  Cancelar
</button>
          </div>
        `;

      });

    });

}
setTimeout(()=>{
  garantirAbaVendas();
},1500);
function abrirBaixaVenda(id){

  let modal =
    document.getElementById("modal-baixa-venda");

  if(!modal){

    modal = document.createElement("div");
    modal.id = "modal-baixa-venda";

    modal.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.45);
      display:none;
      align-items:center;
      justify-content:center;
      z-index:999999;
    `;

    modal.innerHTML = `
      <div style="
        background:#fff;
        width:420px;
        max-width:92%;
        border-radius:24px;
        padding:28px;
        display:flex;
        flex-direction:column;
        gap:14px;
      ">

        <h2 style="margin:0;">
          Baixar venda
        </h2>

        <select
          id="formaPagamentoBaixaVenda"
          style="padding:14px;border:1px solid #ddd;border-radius:12px;"
        >
          <option value="">Forma de pagamento</option>
        </select>

        <div style="display:flex;gap:10px;">
          <button
            onclick="fecharModalBaixaVenda()"
            style="flex:1;padding:14px;border:none;border-radius:12px;"
          >
            Cancelar
          </button>

          <button
            onclick="confirmarBaixaVenda('${id}')"
            style="flex:1;padding:14px;border:none;border-radius:12px;background:#111;color:#fff;"
          >
            Confirmar
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

  }

  const select =
    document.getElementById("formaPagamentoBaixaVenda");

  select.innerHTML = `
    <option value="">Forma de pagamento</option>
  `;

  supabaseClient
    .from("formas_pagamento")
    .select("*")
    .order("nome")
    .then((resposta)=>{

      (resposta.data || []).forEach((forma)=>{

        select.innerHTML += `
          <option value="${forma.nome}">
            ${forma.nome}
          </option>
        `;

      });

    });

  modal.style.display = "flex";

}

function fecharModalBaixaVenda(){

  const modal =
    document.getElementById("modal-baixa-venda");

  if(modal) modal.style.display = "none";

}

function confirmarBaixaVenda(id){

  const forma =
    document.getElementById(
      "formaPagamentoBaixaVenda"
    ).value;

  if(!forma){
    alert("Selecione a forma de pagamento.");
    return;
  }

  supabaseClient
    .from("comandas")
    .select("*")
    .eq("id", id)
    .single()
    .then((busca)=>{

      if(busca.error || !busca.data){
        alert("Erro ao buscar venda.");
        return;
      }

      const venda = busca.data;

      supabaseClient
        .from("comandas")
        .update({
          forma_pagamento: forma,
          status: "FECHADO",
          pago_em: new Date().toISOString()
        })
        .eq("id", id)
        .then((resposta)=>{

          if(resposta.error){

            console.error(resposta);

            alert("Erro ao atualizar venda.");

            return;

          }

          supabaseClient
            .from("financeiro")
            .insert([{
              id: Date.now(),
              tipo: "entrada",
              descricao:
                "Venda fechada - " +
                (venda.cliente || ""),
              valor: Number(venda.valor || 0),
              data: new Date().toLocaleDateString("pt-BR"),
              forma_pagamento: forma
            }])
            .then((financeiroResposta)=>{

              if(financeiroResposta.error){
                alert(
                  "Venda fechada, mas erro ao enviar ao financeiro."
                );
              }else{
                alert(
                  "Venda fechada e enviada ao faturamento!"
                );
              }

              fecharModalBaixaVenda();

              carregarVendas();

              if(typeof carregarHistoricoFinanceiro === "function"){
                carregarHistoricoFinanceiro();
              }

            });

        });

    });

}
function cancelarVenda(id){

  const confirmar =
    confirm("Deseja cancelar esta venda? Ela sairá do financeiro, mas ficará registrada como CANCELADA em Vendas.");

  if(!confirmar) return;

  supabaseClient
    .from("comandas")
    .select("*")
    .eq("id", id)
    .single()
    .then((busca)=>{

      if(busca.error || !busca.data){
        alert("Erro ao buscar venda.");
        return;
      }

      const venda = busca.data;

      supabaseClient
        .from("comandas")
        .update({
          status: "CANCELADA",
          forma_pagamento: venda.forma_pagamento || "-"
        })
        .eq("id", id)
        .then((resposta)=>{

          if(resposta.error){
            alert("Erro ao cancelar venda: " + resposta.error.message);
            return;
          }

          supabaseClient
            .from("financeiro")
            .delete()
            .eq("descricao", "Venda fechada - " + (venda.cliente || ""))
            .eq("valor", Number(venda.valor || 0))
            .then(()=>{

              alert("Venda cancelada e removida do financeiro.");

              carregarVendas();

              if(typeof carregarHistoricoFinanceiro === "function"){
                carregarHistoricoFinanceiro();
              }

            });

        });

    });

}
function abrirHistoricoVenda(id){

  supabaseClient
    .from("comandas")
    .select("*")
    .eq("id", id)
    .single()
    .then((resposta)=>{

      const venda = resposta.data;

      if(!venda){
        alert("Venda não encontrada.");
        return;
      }

      let pagamentos = [];

      try{
        pagamentos =
          JSON.parse(
            venda.forma_pagamento || "[]"
          );
      }catch{
        pagamentos = [];
      }

      const totalPago =
        pagamentos.reduce((soma,item)=>{
          return soma + Number(item.valor || 0);
        },0);

      const restante =
        Number(venda.valor || 0) - totalPago;

      let htmlPagamentos = "";

      pagamentos.forEach((p)=>{

        htmlPagamentos += `
          <div style="
            padding:10px 0;
            border-bottom:1px solid #eee;
          ">
            ${p.data || "-"}
            <br>
            ${p.forma} — R$ ${Number(p.valor).toFixed(2)}
          </div>
        `;

      });

      const modal = document.createElement("div");

      modal.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.45);
        display:flex;
        justify-content:center;
        align-items:center;
        z-index:999999;
      `;

      modal.innerHTML = `
        <div style="
          background:#fff;
          width:520px;
          max-width:94%;
          border-radius:22px;
          padding:28px;
        ">

          <h2>Histórico da venda</h2>

          <strong>
            Valor total:
            R$ ${Number(venda.valor).toFixed(2)}
          </strong>

          <div style="margin-top:18px;">
            ${htmlPagamentos || "Nenhum pagamento."}
          </div>

          <div style="margin-top:18px;">
            <strong>
              Total pago:
              R$ ${totalPago.toFixed(2)}
            </strong>
            <br>
            <strong style="color:#d63031;">
              Restante:
              R$ ${restante.toFixed(2)}
            </strong>
          </div>

          <div style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
            margin-top:20px;
          ">

            <input
              id="valorNovoPagamento"
              type="number"
              placeholder="Valor"
              style="
                padding:14px;
                border:1px solid #ddd;
                border-radius:12px;
              "
            >

            <select
              id="formaNovoPagamento"
              style="
                padding:14px;
                border:1px solid #ddd;
                border-radius:12px;
              "
            >
              <option value="">
                Forma pagamento
              </option>
            </select>

          </div>

          <div style="
            display:flex;
            gap:10px;
            margin-top:22px;
          ">

            <button
              onclick="this.closest('div').parentNode.parentNode.remove()"
              style="
                flex:1;
                padding:14px;
                border:none;
                border-radius:12px;
              "
            >
              Fechar
            </button>

            <button
              onclick="adicionarPagamentoVenda('${venda.id}')"
              style="
                flex:1;
                padding:14px;
                border:none;
                border-radius:12px;
                background:#111;
                color:#fff;
              "
            >
              Adicionar pagamento
            </button>

          </div>

        </div>
      `;
supabaseClient
  .from("formas_pagamento")
  .select("*")
  .order("nome")
  .then((resp)=>{

    const select =
      document.getElementById(
        "formaNovoPagamento"
      );

    (resp.data || [])
      .forEach((forma)=>{

        select.innerHTML += `
          <option value="${forma.nome}">
            ${forma.nome}
          </option>
        `;

      });

  });
      document.body.appendChild(modal);

    });

}
function adicionarPagamentoVenda(id){

  const valor =
    Number(
      document
        .getElementById("valorNovoPagamento")
        .value || 0
    );

  const forma =
    document
      .getElementById("formaNovoPagamento")
      .value;

  if(!valor || !forma){
    alert("Informe valor e forma.");
    return;
  }

  supabaseClient
    .from("comandas")
    .select("*")
    .eq("id", id)
    .single()
    .then((resposta)=>{

      const venda = resposta.data;

      let pagamentos = [];

      try{

        pagamentos =
          JSON.parse(
            venda.forma_pagamento || "[]"
          );

      }catch{

        pagamentos = [];

      }

      pagamentos.push({
        valor,
        forma,
        data:
          new Date()
            .toLocaleDateString("pt-BR")
      });

      const totalPago =
        pagamentos.reduce((soma,item)=>{
          return soma + Number(item.valor || 0);
        },0);

      const restante =
        Number(venda.valor || 0)
        - totalPago;

      const status =
        restante <= 0
          ? "FECHADO"
          : "EM ABERTO";

      supabaseClient
        .from("comandas")
        .update({
          forma_pagamento:
            JSON.stringify(pagamentos),

          status
        })
        .eq("id", id)
        .then(()=>{

          alert("Pagamento lançado!");

          carregarVendas();

          document
            .querySelectorAll(
              "body > div"
            )
            .forEach(el=>{

              if(
                el.innerText
                  ?.includes(
                    "Histórico da venda"
                  )
              ){
                el.remove();
              }

            });

          abrirHistoricoVenda(id);

        });

    });

}
function garantirAbaRelatorios(){

  const nav = document.querySelector("nav");

  if(nav && !document.getElementById("menu-relatorios")){

    nav.insertAdjacentHTML(
      "beforeend",
      `
        <a
          id="menu-relatorios"
          href="#"
          onclick="mostrarSecao('relatorios-container'); carregarRelatorios(); return false;"
        >
          Relatórios
        </a>
      `
    );

  }

  if(!document.getElementById("relatorios-container")){

    const container = document.createElement("div");

    container.id = "relatorios-container";
    container.className = "clientes-container";
    container.style.display = "none";

    container.innerHTML = `
      <h2>Relatórios</h2>

      <div id="cards-relatorios" style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
        gap:18px;
        margin-top:20px;
      "></div>
    `;

    document.body.appendChild(container);

  }

}

function carregarRelatorios(
  filtro="todos",
  inicioPersonalizado="",
  fimPersonalizado=""
){

  const container =
    document.getElementById(
      "relatorios-container"
    );

  if(!container) return;

  container.innerHTML = `
    <h2>Central de Relatórios</h2>
    <div style="
display:flex;
gap:12px;
margin:20px 0 28px;
flex-wrap:wrap;
">

<button onclick="carregarRelatorios('hoje')" class="cliente-card">
Hoje
</button>

<button onclick="carregarRelatorios('semana')" class="cliente-card">
Semana
</button>

<button onclick="carregarRelatorios('mes')" class="cliente-card">
Mês
</button>

<button onclick="carregarRelatorios('todos')" class="cliente-card">
Tudo
</button>
<input
  type="date"
  id="relatorio-inicio"
  class="cliente-card"
>

<input
  type="date"
  id="relatorio-fim"
  class="cliente-card"
>

<button
  onclick="
    carregarRelatorios(
      'personalizado',
      document.getElementById('relatorio-inicio').value,
      document.getElementById('relatorio-fim').value
    )
  "
  class="cliente-card"
>
Aplicar
</button>

</div>

    <div
      id="cards-relatorios"
      style="
        display:grid;
        grid-template-columns:
        repeat(auto-fit,minmax(320px,1fr));
        gap:20px;
        margin-top:25px;
      "
    ></div>
  `;

  supabaseClient
    .from("comandas")
    .select("*")
    .then((resposta)=>{

      const vendas =
        resposta.data || [];
        const hoje =
  new Date();

let vendasFiltradas =
  vendas;

if(filtro==="hoje"){

  const dataHoje =
    hoje.toLocaleDateString("pt-BR");

  vendasFiltradas =
    vendas.filter(v=>
      v.data === dataHoje
    );

}

if(filtro==="semana"){

  const seteDias =
    new Date();

  seteDias.setDate(
    hoje.getDate()-7
  );

  vendasFiltradas =
    vendas.filter(v=>{

      const partes =
        (v.data||"")
          .split("/");

      if(partes.length!==3)
        return false;

      const dataVenda =
        new Date(
          partes[2],
          partes[1]-1,
          partes[0]
        );

      return dataVenda >= seteDias;

    });

}

if(filtro==="mes"){

  const mesAtual =
    hoje.getMonth()+1;

  const anoAtual =
    hoje.getFullYear();

  vendasFiltradas =
    vendas.filter(v=>{

      const partes =
        (v.data||"")
          .split("/");

      if(partes.length!==3)
        return false;

      return (
        Number(partes[1])
          === mesAtual
        &&
        Number(partes[2])
          === anoAtual
      );

    });

}
        if(
  filtro==="personalizado"
){

 const inicio =
  inicioPersonalizado;

const fim =
  fimPersonalizado;

  if(inicio && fim){

    vendasFiltradas =
      vendas.filter(v=>{

        const partes =
          (v.data||"")
            .split("/");

        if(partes.length!==3)
          return false;

        const dataVenda =
          new Date(
            partes[2],
            partes[1]-1,
            partes[0]
          );

      const partesInicio =
  inicio.split("-");

const partesFim =
  fim.split("-");

const dataInicio =
  new Date(
    partesInicio[0],
    partesInicio[1] - 1,
    partesInicio[2]
  );

const dataFim =
  new Date(
    partesFim[0],
    partesFim[1] - 1,
    partesFim[2],
    23,59,59
  );

        return (
          dataVenda
          >= dataInicio
          &&
          dataVenda
          <= dataFim
        );

      });

  }

}

      let faturamento = 0;
      let aberto = 0;
      let cancelado = 0;
      let fechadas = 0;

      const porDia = {};
      const pagamentos = {};
const profissionais = {};
const clientes = {};
const servicos = {};
        const pendencias = [];

      vendasFiltradas.forEach((venda)=>{

        const valor =
          Number(venda.valor || 0);

        if(venda.status==="FECHADO"){

          faturamento += valor;
          fechadas++;

          porDia[venda.data || "-"] =
            (porDia[venda.data || "-"] || 0)
            + valor;

        }

       if(venda.status==="EM ABERTO"){
  aberto += valor;

  pendencias.push({
    cliente: venda.cliente || "-",
    servico: venda.servico || "-",
    profissional: venda.profissional || "-",
    valor: valor
  });
}

        if(venda.status==="CANCELADA"){
          cancelado += valor;
        }

        pagamentos[
          venda.forma_pagamento || "-"
        ] =
        (
          pagamentos[
            venda.forma_pagamento || "-"
          ] || 0
        ) + valor;
         profissionais[
  venda.profissional || "-"
] =
(
  profissionais[
    venda.profissional || "-"
  ] || 0
) + valor;

clientes[
  venda.cliente || "-"
] =
(
  clientes[
    venda.cliente || "-"
  ] || 0
) + valor;

servicos[
  venda.servico || "-"
] =
(
  servicos[
    venda.servico || "-"
  ] || 0
) + valor;

});

      const ticketMedio =
        fechadas
          ? faturamento / fechadas
          : 0;

      document.getElementById(
        "cards-relatorios"
      ).innerHTML = `

      <div class="cliente-card"
style="
background:#fff;
border-radius:22px;
padding:28px;
box-shadow:0 10px 30px rgba(0,0,0,.08);
border:1px solid #eee;
">

<h3 style="
margin:0 0 22px;
font-size:22px;
">
💰 Financeiro Geral
</h3>

<div style="
display:grid;
grid-template-columns:1fr 1fr;
gap:16px;
">

<div style="
background:#f8fafc;
padding:18px;
border-radius:16px;
">
<small>Faturamento</small>

<h2 style="margin:8px 0 0;color:#16a34a;">
R$ ${faturamento.toFixed(2)}
</h2>
</div>

<div style="
background:#fef2f2;
padding:18px;
border-radius:16px;
">
<small>Em aberto</small>

<h2 style="margin:8px 0 0;color:#dc2626;">
R$ ${aberto.toFixed(2)}
</h2>
</div>

<div style="
background:#fff7ed;
padding:18px;
border-radius:16px;
">
<small>Cancelado</small>

<h2 style="margin:8px 0 0;color:#ea580c;">
R$ ${cancelado.toFixed(2)}
</h2>
</div>

<div style="
background:#eff6ff;
padding:18px;
border-radius:16px;
">
<small>Ticket Médio</small>

<h2 style="margin:8px 0 0;color:#2563eb;">
R$ ${ticketMedio.toFixed(2)}
</h2>
</div>

</div>

</div>

 <div class="cliente-card"
style="
background:#fff;
border-radius:22px;
padding:28px;
box-shadow:0 10px 30px rgba(0,0,0,.08);
">

<h3 style="margin:0 0 20px;">
📅 Faturamento por Dia
</h3>

${
  Object.entries(porDia)
  .sort((a,b)=>b[1]-a[1])
  .map(([dia,valor])=>

    `<div style="
      display:flex;
      justify-content:space-between;
      padding:14px;
      margin-bottom:12px;
      background:#f8fafc;
      border-radius:14px;
    ">

      <span>${dia}</span>

      <strong style="color:#16a34a;">
        R$ ${valor.toFixed(2)}
      </strong>

    </div>`

  ).join("")
}

</div>

     <div class="cliente-card"
style="
background:#fff;
border-radius:22px;
padding:28px;
box-shadow:0 10px 30px rgba(0,0,0,.08);
">

<h3 style="margin:0 0 20px;">
💳 Formas de Pagamento
</h3>

${
  Object.entries(pagamentos)
  .sort((a,b)=>b[1]-a[1])
  .map(([forma,valor])=>

    `<div style="
      display:flex;
      justify-content:space-between;
      padding:14px;
      margin-bottom:12px;
      background:#f8fafc;
      border-radius:14px;
    ">

      <span>${forma}</span>

      <strong style="color:#2563eb;">
        R$ ${valor.toFixed(2)}
      </strong>

    </div>`

  ).join("")
}

</div>

     <div class="cliente-card"
style="
background:#fff;
border-radius:22px;
padding:28px;
box-shadow:0 10px 30px rgba(0,0,0,.08);
">

<h3 style="margin:0 0 20px;">
⚡ Resumo Rápido
</h3>

<div style="
display:grid;
gap:14px;
">

<div style="
background:#f8fafc;
padding:18px;
border-radius:14px;
">
Vendas fechadas:
<strong>
${fechadas}
</strong>
</div>

<div style="
background:#f8fafc;
padding:18px;
border-radius:14px;
">
Total comandas:
<strong>
${vendasFiltradas.length}
</strong>
</div>

<div style="
background:#f8fafc;
padding:18px;
border-radius:14px;
">
Ticket médio:
<strong>
R$ ${ticketMedio.toFixed(2)}
</strong>
</div>

</div>

</div>

<div class="cliente-card"
style="
background:#fff;
border-radius:22px;
padding:28px;
box-shadow:0 10px 30px rgba(0,0,0,.08);
">

<h3 style="margin:0 0 20px;">
🏆 Ranking Profissionais
</h3>

${
  Object.entries(profissionais)
  .sort((a,b)=>b[1]-a[1])
  .map(([nome,valor],index)=>

    `<div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:14px;
      margin-bottom:12px;
      background:#f8fafc;
      border-radius:14px;
    ">

      <span>
        #${index+1}
        ${nome}
      </span>

      <strong style="color:#ea580c;">
        R$ ${valor.toFixed(2)}
      </strong>

    </div>`

  ).join("")
}

</div>

<div class="cliente-card"
style="
background:#fff;
border-radius:22px;
padding:28px;
box-shadow:0 10px 30px rgba(0,0,0,.08);
">

<h3 style="margin:0 0 20px;">
👑 Top Clientes
</h3>

${
  Object.keys(clientes).length === 0
    ? `<p>Nenhum cliente nesse período.</p>`
    : Object.entries(clientes)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,10)
      .map(([nome,valor],index)=>

        `<div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:14px;
          margin-bottom:12px;
          background:#f8fafc;
          border-radius:14px;
        ">
          <span>
            #${index+1}
            ${nome}
          </span>

          <strong style="color:#7c3aed;">
            R$ ${valor.toFixed(2)}
          </strong>
        </div>`

      ).join("")
}

</div>

<div class="cliente-card"
style="
background:#fff;
border-radius:22px;
padding:28px;
box-shadow:0 10px 30px rgba(0,0,0,.08);
">

<h3 style="margin:0 0 20px;">
✨ Serviços Mais Vendidos
</h3>

${
  Object.entries(servicos)
  .sort((a,b)=>b[1]-a[1])
  .slice(0,10)
  .map(([nome,valor],index)=>

    `<div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:14px;
      margin-bottom:12px;
      background:#f8fafc;
      border-radius:14px;
    ">

      <span>
        #${index+1}
        ${nome}
      </span>

      <strong style="
        color:#0f766e;
      ">
        R$ ${valor.toFixed(2)}
      </strong>

    </div>`

  ).join("")
}

</div>
<div class="cliente-card"
style="
background:#fff;
border-radius:22px;
padding:28px;
box-shadow:0 10px 30px rgba(0,0,0,.08);
">

<h3 style="margin:0 0 20px;">
⚠️ Pendências em Aberto
</h3>

${
  pendencias.length === 0
    ? `<p>Nenhuma pendência em aberto.</p>`
    : pendencias
      .map((item)=>

        `<div style="
          padding:14px;
          margin-bottom:12px;
          background:#fef2f2;
          border-radius:14px;
        ">

          <strong>${item.cliente}</strong>

          <p style="margin:6px 0;">
            ${item.servico}
          </p>

          <small>
            Profissional: ${item.profissional}
          </small>

          <br>

          <strong style="color:#dc2626;">
            R$ ${item.valor.toFixed(2)}
          </strong>

        </div>`

      ).join("")
}

</div>

`;

    });

}

function preencherRelatorioLista(id, dados, tipo){

  const div =
    document.getElementById(id);

  if(!div) return;

  div.innerHTML = "";

  const itens =
    Object.keys(dados)
      .sort((a,b)=> dados[b] - dados[a]);

  if(itens.length === 0){
    div.innerHTML = `<div class="cliente-card">Nenhum dado encontrado.</div>`;
    return;
  }

  itens.forEach((nome)=>{

    const valor = dados[nome];

    div.innerHTML += `
      <div class="cliente-card">
        <strong>${nome}</strong>
        <p>
          ${
            tipo === "R$"
              ? "R$ " + Number(valor).toFixed(2)
              : valor + " " + tipo
          }
        </p>
      </div>
    `;

  });

}
function abrirRelatorioFinanceiro(){
  document.getElementById("conteudo-relatorio").innerHTML =
    "<h3>Financeiro</h3>";
}

function abrirRelatorioProfissionais(){
  document.getElementById("conteudo-relatorio").innerHTML =
    "<h3>Profissionais</h3>";
}

function abrirRelatorioClientes(){
  document.getElementById("conteudo-relatorio").innerHTML =
    "<h3>Clientes</h3>";
}

function abrirRelatorioServicos(){
  document.getElementById("conteudo-relatorio").innerHTML =
    "<h3>Serviços</h3>";
}

function abrirRelatorioPendencias(){
  document.getElementById("conteudo-relatorio").innerHTML =
    "<h3>Pendências</h3>";
}
setTimeout(()=>{

  const nav =
    document.querySelector("nav");

  if(
    nav &&
    !document.getElementById(
      "menu-relatorios"
    )
  ){

    nav.innerHTML += `
      <a
        id="menu-relatorios"
        href="#"
        onclick="
          mostrarSecao(
            'relatorios-container'
          );
          carregarRelatorios();
          return false;
        "
      >
        Relatórios
      </a>
    `;

  }

},2000);
function garantirAbaRelatorios(){

  let nav =
    document.querySelector("nav");

  if(
    nav &&
    !document.getElementById(
      "menu-relatorios"
    )
  ){

    const link =
      document.createElement("a");

    link.id =
      "menu-relatorios";

    link.href = "#";

    link.innerText =
      "Relatórios";

  
  link.onclick = function(){

  document.querySelector(".agenda-container").style.display = "none";

  document.querySelectorAll(".clientes-container").forEach((item)=>{
    item.style.display = "none";
  });

  let tela =
    document.getElementById("relatorios-container");

  if(!tela){

    tela = document.createElement("div");
    tela.id = "relatorios-container";
    tela.className = "clientes-container";
    document.body.appendChild(tela);

  }

  tela.style.display = "block";
  tela.style.marginLeft = "180px";
  tela.style.width = "calc(100% - 180px)";
  tela.style.padding = "40px";
  tela.style.boxSizing = "border-box";

  carregarRelatorios();

  return false;

};
    nav.appendChild(link);

  }

}
garantirAbaRelatorios();

function montarListaRelatorio(
  titulo,
  dados
){

  let html = `
    <div class="cliente-card">
      <h3>${titulo}</h3>
  `;

  Object
    .entries(dados)
    .sort((a,b)=> b[1]-a[1])
    .forEach(([nome,valor])=>{

      html += `
        <p>
          ${nome} —
          ${
            Number.isInteger(valor)
              ? valor
              : "R$ " +
                Number(valor)
                  .toFixed(2)
          }
        </p>
      `;

    });

  html += "</div>";

  return html;

}
