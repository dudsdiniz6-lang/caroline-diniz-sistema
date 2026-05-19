const SUPABASE_URL = "https://oxvtfdxdlshbvtqtnpgo.supabase.co";
const SUPABASE_KEY = "sb_publishable_KQ58nMCXUZl0Nz5jEHkKKg_RbpL-QTw";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let dataSelecionada = new Date();

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
      const ranking = {};

      historico.forEach((item)=>{

        total += Number(item.valor);
        if(!ranking[item.cliente]){
  ranking[item.cliente] = 0;
}

ranking[item.cliente] += Number(item.valor);

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

      document.getElementById("faturamento").innerText = `R$ ${total}`;
      document.getElementById("atendimentos-pagos").innerText = historico.length;

    });

}
function carregarComissoes(){

  const lista = document.getElementById("lista-comissoes");

  if(!lista) return;

  lista.innerHTML = "";
  const metasDiv = document.getElementById("metas-profissionais");

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
