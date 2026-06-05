const SUPABASE_URL = "https://hndksymtlzqtbzgrvfkh.supabase.co";
const SUPABASE_KEY = "sb_publishable_F4-5yOEa-lfaK5I-arqfMg_-j9pU0N8";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioLogado = null;
let unidadeAtualId = 1;
let dataAgenda = new Date();

function formatarDataBR(data){
  return data.toLocaleDateString("pt-BR");
}

function formatarDataISO(data){
  return data.toISOString().split("T")[0];
}

function dinheiro(valor){
  return `R$ ${Number(valor || 0).toFixed(2)}`;
}

async function fazerLogin(){

  const usuario = document.getElementById("loginUsuario").value.trim().toLowerCase();
  const senha = document.getElementById("loginSenha").value.trim();

  if(!usuario || !senha){
    alert("Digite usuário e senha.");
    return;
  }

  const { data, error } = await supabaseClient
    .from("usuarios_sistema")
    .select("*")
    .eq("usuario", usuario)
    .eq("senha", senha)
    .eq("ativo", true)
    .single();

  if(error || !data){
    alert("Usuário ou senha inválidos.");
    return;
  }

  usuarioLogado = data;

  localStorage.setItem("usuarioLogado", JSON.stringify(data));

  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "flex";

  aplicarPermissoes();
  iniciarSistema();
}

function sairSistema(){
  localStorage.removeItem("usuarioLogado");
  location.reload();
}

function verificarLoginSalvo(){

  const salvo = localStorage.getItem("usuarioLogado");

  if(!salvo) return;

  usuarioLogado = JSON.parse(salvo);

  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "flex";

  aplicarPermissoes();
  iniciarSistema();
}

function aplicarPermissoes(){

  if(!usuarioLogado) return;

  const cargo = usuarioLogado.cargo;

  if(cargo === "funcionario"){

    esconderBotaoMenu("Clientes");
    esconderBotaoMenu("Profissionais");
    esconderBotaoMenu("Serviços");
    esconderBotaoMenu("Pacotes");
    esconderBotaoMenu("Caixa");
    esconderBotaoMenu("Comissões");

  }

  if(cargo === "gerente"){

    esconderBotaoMenu("Comissões");

  }

}

function esconderBotaoMenu(texto){

  document.querySelectorAll(".sidebar nav button").forEach((botao)=>{

    if(botao.innerText.trim() === texto){
      botao.style.display = "none";
    }

  });

}

function mostrarTela(nome){

  document.querySelectorAll(".tela").forEach((tela)=>{
    tela.classList.remove("ativa");
  });

  const tela = document.getElementById(`tela-${nome}`);

  if(tela){
    tela.classList.add("ativa");
  }

  if(nome === "agenda") carregarAgenda();
  if(nome === "clientes") carregarClientes();
  if(nome === "profissionais") carregarProfissionais();
  if(nome === "servicos") carregarServicos();
  if(nome === "pacotes") carregarPacotes();
  if(nome === "caixa") carregarCaixas();
  if(nome === "comissoes") carregarComissoes();
}

function abrirModal(html){

  const modal = document.getElementById("modal");
  const conteudo = document.getElementById("modalConteudo");

  conteudo.innerHTML = html;
  modal.style.display = "flex";
}

function fecharModal(){

  document.getElementById("modal").style.display = "none";
  document.getElementById("modalConteudo").innerHTML = "";
}

function iniciarSistema(){

  atualizarTextoDataAgenda();

  carregarAgenda();
  carregarClientes();
  carregarProfissionais();
  carregarServicos();
}

function voltarDia(){
  dataAgenda.setDate(dataAgenda.getDate() - 1);
  atualizarTextoDataAgenda();
  carregarAgenda();
}

function avancarDia(){
  dataAgenda.setDate(dataAgenda.getDate() + 1);
  atualizarTextoDataAgenda();
  carregarAgenda();
}

function irHoje(){
  dataAgenda = new Date();
  atualizarTextoDataAgenda();
  carregarAgenda();
}

function atualizarTextoDataAgenda(){

  const campo = document.getElementById("dataAgendaTexto");

  if(campo){
    campo.innerText = formatarDataBR(dataAgenda);
  }

}

window.onload = verificarLoginSalvo;

async function carregarClientes(){

  const lista = document.getElementById("listaClientes");

  if(!lista) return;

  lista.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  if(error){
    lista.innerHTML = "<div class='card'>Erro ao carregar clientes.</div>";
    return;
  }

  if(!data || data.length === 0){
    lista.innerHTML = "<div class='card'>Nenhum cliente cadastrado.</div>";
    return;
  }

  data.forEach((cliente)=>{

    lista.innerHTML += `
      <div class="card">
        <h3>${cliente.nome}</h3>
        <p>${cliente.telefone || "Sem telefone"}</p>
        <small>${cliente.observacoes || ""}</small>

        <br><br>

        <button class="principal" onclick="abrirModalCliente(${cliente.id})">
          Editar
        </button>
      </div>
    `;

  });

}

async function abrirModalCliente(id = null){

  let cliente = null;

  if(id){

    const resposta = await supabaseClient
      .from("clientes")
      .select("*")
      .eq("id", id)
      .single();

    cliente = resposta.data;

  }

  abrirModal(`
    <h2>${id ? "Editar cliente" : "Novo cliente"}</h2>

    <input id="clienteId" type="hidden" value="${cliente?.id || ""}">

    <label>Nome</label>
    <input id="clienteNome" value="${cliente?.nome || ""}" placeholder="Nome da cliente">

    <label>Telefone</label>
    <input id="clienteTelefone" value="${cliente?.telefone || ""}" placeholder="Telefone">

    <label>Aniversário</label>
    <input id="clienteAniversario" type="date" value="${cliente?.aniversario || ""}">

    <label>Observações</label>
    <textarea id="clienteObservacoes" placeholder="Observações">${cliente?.observacoes || ""}</textarea>

    <button class="principal" onclick="salvarCliente()">
      Salvar
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);

}

async function salvarCliente(){

  const id = document.getElementById("clienteId").value;

  const dados = {
    unidade_id: unidadeAtualId,
    nome: document.getElementById("clienteNome").value.trim(),
    telefone: document.getElementById("clienteTelefone").value.trim(),
    aniversario: document.getElementById("clienteAniversario").value || null,
    observacoes: document.getElementById("clienteObservacoes").value.trim(),
    ativo: true
  };

  if(!dados.nome){
    alert("Digite o nome da cliente.");
    return;
  }

  let resposta;

  if(id){

    resposta = await supabaseClient
      .from("clientes")
      .update(dados)
      .eq("id", id);

  }else{

    resposta = await supabaseClient
      .from("clientes")
      .insert([dados]);

  }

  if(resposta.error){
    alert("Erro ao salvar cliente: " + resposta.error.message);
    return;
  }

  fecharModal();
  carregarClientes();
  carregarAgenda();

  alert("Cliente salvo com sucesso.");
}
async function carregarProfissionais(){

  const lista = document.getElementById("listaProfissionais");

  if(!lista) return;

  lista.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("profissionais")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending:true });

  if(error){
    lista.innerHTML = "<div class='card'>Erro ao carregar profissionais.</div>";
    return;
  }

  if(!data || data.length === 0){
    lista.innerHTML = "<div class='card'>Nenhum profissional cadastrado.</div>";
    return;
  }

  data.forEach((profissional)=>{

    lista.innerHTML += `
      <div class="card">
        <h3>${profissional.nome}</h3>
        <p>${profissional.especialidade || ""}</p>
        <small>${profissional.telefone || ""}</small>

        <br><br>

        <button class="principal" onclick="abrirModalProfissional(${profissional.id})">
          Editar
        </button>
      </div>
    `;

  });

}

async function abrirModalProfissional(id = null){

  let profissional = null;

  if(id){

    const resposta = await supabaseClient
      .from("profissionais")
      .select("*")
      .eq("id", id)
      .single();

    profissional = resposta.data;

  }

  abrirModal(`
    <h2>${id ? "Editar profissional" : "Novo profissional"}</h2>

    <input id="profissionalId" type="hidden" value="${profissional?.id || ""}">

    <label>Nome</label>
    <input id="profissionalNome" value="${profissional?.nome || ""}" placeholder="Nome">

    <label>Telefone</label>
    <input id="profissionalTelefone" value="${profissional?.telefone || ""}" placeholder="Telefone">

    <label>Especialidade</label>
    <input id="profissionalEspecialidade" value="${profissional?.especialidade || ""}" placeholder="Especialidade">

    <label>Ordem na agenda</label>
    <input id="profissionalOrdem" type="number" value="${profissional?.ordem || 0}" placeholder="Ordem">

    <button class="principal" onclick="salvarProfissional()">
      Salvar
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);

}

async function salvarProfissional(){

  const id = document.getElementById("profissionalId").value;

  const dados = {
    unidade_id: unidadeAtualId,
    nome: document.getElementById("profissionalNome").value.trim(),
    telefone: document.getElementById("profissionalTelefone").value.trim(),
    especialidade: document.getElementById("profissionalEspecialidade").value.trim(),
    ordem: Number(document.getElementById("profissionalOrdem").value || 0),
    ativo: true
  };

  if(!dados.nome){
    alert("Digite o nome do profissional.");
    return;
  }

  let resposta;

  if(id){

    resposta = await supabaseClient
      .from("profissionais")
      .update(dados)
      .eq("id", id);

  }else{

    resposta = await supabaseClient
      .from("profissionais")
      .insert([dados]);

  }

  if(resposta.error){
    alert("Erro ao salvar profissional: " + resposta.error.message);
    return;
  }

  fecharModal();

  carregarProfissionais();
  carregarAgenda();

  alert("Profissional salvo com sucesso.");
}
async function carregarServicos(){

  const lista = document.getElementById("listaServicos");

  if(!lista) return;

  lista.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("servicos")
    .select("*")
    .eq("ativo", true)
    .order("categoria");

  if(error){
    lista.innerHTML = "<div class='card'>Erro ao carregar serviços.</div>";
    return;
  }

  if(!data || data.length === 0){
    lista.innerHTML = "<div class='card'>Nenhum serviço cadastrado.</div>";
    return;
  }

  lista.innerHTML = `
    <div class="linha-tabela cabecalho">
      <span>Categoria</span>
      <span>Serviço</span>
      <span>Duração</span>
      <span>Valor</span>
      <span>Comissão</span>
    </div>
  `;

  data.forEach((servico)=>{

    lista.innerHTML += `
      <div class="linha-tabela" onclick="abrirModalServico(${servico.id})">
        <span>${servico.categoria || "-"}</span>
        <span>${servico.nome}</span>
        <span>${servico.duracao || 30} min</span>
        <span>${dinheiro(servico.valor)}</span>
        <span>${servico.comissao_padrao || 0}%</span>
      </div>
    `;

  });

}

async function abrirModalServico(id = null){

  let servico = null;

  if(id){

    const resposta = await supabaseClient
      .from("servicos")
      .select("*")
      .eq("id", id)
      .single();

    servico = resposta.data;

  }

  abrirModal(`
    <h2>${id ? "Editar serviço" : "Novo serviço"}</h2>

    <input id="servicoId" type="hidden" value="${servico?.id || ""}">

    <label>Categoria</label>
    <input id="servicoCategoria" value="${servico?.categoria || ""}" placeholder="Ex: Cabelo, Unhas, Estética">

    <label>Nome do serviço</label>
    <input id="servicoNome" value="${servico?.nome || ""}" placeholder="Nome do serviço">

    <label>Duração em minutos</label>
    <input id="servicoDuracao" type="number" value="${servico?.duracao || 30}">

    <label>Valor</label>
    <input id="servicoValor" type="number" value="${servico?.valor || 0}">

    <label>Comissão padrão (%)</label>
    <input id="servicoComissao" type="number" value="${servico?.comissao_padrao || 40}">

    <button class="principal" onclick="salvarServico()">
      Salvar
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);

}

async function salvarServico(){

  const id = document.getElementById("servicoId").value;

  const dados = {
    unidade_id: unidadeAtualId,
    categoria: document.getElementById("servicoCategoria").value.trim(),
    nome: document.getElementById("servicoNome").value.trim(),
    duracao: Number(document.getElementById("servicoDuracao").value || 30),
    valor: Number(document.getElementById("servicoValor").value || 0),
    comissao_padrao: Number(document.getElementById("servicoComissao").value || 0),
    ativo: true
  };

  if(!dados.nome){
    alert("Digite o nome do serviço.");
    return;
  }

  let resposta;

  if(id){

    resposta = await supabaseClient
      .from("servicos")
      .update(dados)
      .eq("id", id);

  }else{

    resposta = await supabaseClient
      .from("servicos")
      .insert([dados]);

  }

  if(resposta.error){
    alert("Erro ao salvar serviço: " + resposta.error.message);
    return;
  }

  fecharModal();

  carregarServicos();
  carregarAgenda();

  alert("Serviço salvo com sucesso.");
}
async function carregarAgenda(){

  atualizarTextoDataAgenda();

  const grade = document.getElementById("agendaGrade");
  if(!grade) return;

  grade.innerHTML = "Carregando agenda...";

  const busca = document.getElementById("buscaAgenda")?.value?.toLowerCase().trim() || "";

  const profissionaisResp = await supabaseClient
    .from("profissionais")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending:true });

  const agendamentosResp = await supabaseClient
    .from("agendamentos")
    .select(`
      *,
      clientes(nome, telefone),
      profissionais(nome),
      servicos(nome, duracao, valor)
    `)
    .eq("data", formatarDataISO(dataAgenda))
    .order("horario");

  const profissionais = profissionaisResp.data || [];
  let agendamentos = agendamentosResp.data || [];

  if(busca){
    agendamentos = agendamentos.filter(item =>
      item.clientes?.nome?.toLowerCase().includes(busca)
    );
  }

  if(profissionais.length === 0){
    grade.innerHTML = "<div class='card'>Cadastre profissionais para montar a agenda.</div>";
    return;
  }

  const horarios = gerarHorariosAgenda();
  const alturaAgenda = horarios.length * 80;

  grade.innerHTML = `
    <div class="agenda-profissional-wrapper">

      <div class="agenda-coluna-horarios">
        <div class="agenda-cabecalho">Horário</div>
        ${horarios.map(h=>`
          <div class="agenda-horario">${h}</div>
        `).join("")}
      </div>

      ${profissionais.map(profissional=>{

        const agendaProf = agendamentos.filter(a =>
          String(a.profissional_id) === String(profissional.id)
        );

        return `
          <div class="agenda-coluna-profissional">

            <div class="agenda-cabecalho">
              ${profissional.nome}
            </div>

            <div class="agenda-coluna-corpo" style="height:${alturaAgenda}px;">

              ${horarios.map(h=>`
                <div 
                  class="agenda-slot"
                  onclick="abrirModalAgendamento(null, '${profissional.id}', '${h}')"
                ></div>
              `).join("")}

              ${agendaProf.map(a=>{

                const top = calcularTopAgenda(a.horario);
                const altura = Math.max((Number(a.duracao || 30) / 30) * 80 - 8, 70);
                const fim = somarMinutosHorario(a.horario, a.duracao || 30);

                return `
                  <div 
                    class="agendamento-card status-${normalizarClasse(a.status)}"
                    style="top:${top + 4}px; height:${altura}px;"
                    onclick="event.stopPropagation(); abrirModalAgendamento(${a.id})"
                  >
                    <strong>${a.clientes?.nome || "Cliente"}</strong>
                    <span>${a.servicos?.nome || "Serviço"}</span>
                    <small>${formatarHorarioBonito(a.horario)} - ${formatarHorarioBonito(fim)}</small>
                    <em>${a.status || "Agendado"}</em>
                  </div>
                `;
              }).join("")}

            </div>
          </div>
        `;
      }).join("")}

    </div>
  `;
}

function calcularTopAgenda(horario){

  const [hora, minuto] = horario.split(":").map(Number);

  const inicio = 7 * 60;
  const atual = hora * 60 + minuto;

  return ((atual - inicio) / 30) * 80;
}

function gerarHorariosAgenda(){

  const horarios = [];

  for(let hora = 7; hora <= 20; hora++){
    horarios.push(`${String(hora).padStart(2,"0")}:00`);

    if(hora !== 20){
      horarios.push(`${String(hora).padStart(2,"0")}:30`);
    }
  }

  return horarios;
}

function normalizarClasse(texto){

  return String(texto || "agendado")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "-");

}
async function abrirModalAgendamento(id = null, profissionalPre = "", horarioPre = ""){

  const clientesResp = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  const profissionaisResp = await supabaseClient
    .from("profissionais")
    .select("*")
    .eq("ativo", true)
    .order("ordem");

  const servicosResp = await supabaseClient
    .from("servicos")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  let agendamento = null;

  if(id){
    const resposta = await supabaseClient
      .from("agendamentos")
      .select("*")
      .eq("id", id)
      .single();

    agendamento = resposta.data;
  }

  const clientes = clientesResp.data || [];
  const profissionais = profissionaisResp.data || [];
  const servicos = servicosResp.data || [];

  abrirModal(`
    <h2>${id ? "Editar agendamento" : "Novo agendamento"}</h2>

    <input id="agendamentoId" type="hidden" value="${agendamento?.id || ""}">

    <label>Cliente</label>
    <select id="agCliente" onchange="verificarPacoteDisponivel()">
      <option value="">Selecione</option>
      ${clientes.map(c=>`
        <option value="${c.id}" ${String(agendamento?.cliente_id || "") === String(c.id) ? "selected" : ""}>
          ${c.nome}
        </option>
      `).join("")}
    </select>

    <label>Profissional</label>
    <select id="agProfissional">
      <option value="">Selecione</option>
      ${profissionais.map(p=>`
        <option value="${p.id}" ${String(agendamento?.profissional_id || profissionalPre) === String(p.id) ? "selected" : ""}>
          ${p.nome}
        </option>
      `).join("")}
    </select>

    <label>Data</label>
    <input id="agData" type="date" value="${agendamento?.data || formatarDataISO(dataAgenda)}">

    <label>Horário</label>
    <input id="agHorario" type="time" value="${agendamento?.horario || horarioPre || "08:00"}">

    <label>Serviço</label>
    <select id="agServico" onchange="preencherDadosServicoAgendamento(); verificarPacoteDisponivel();">
      <option value="">Selecione</option>
      ${servicos.map(s=>`
        <option 
          value="${s.id}"
          data-valor="${s.valor}"
          data-duracao="${s.duracao}"
          ${String(agendamento?.servico_id || "") === String(s.id) ? "selected" : ""}
        >
          ${s.nome} - ${dinheiro(s.valor)}
        </option>
      `).join("")}
    </select>
<div id="areaPacoteAgendamento"></div>

<label>Duração</label>
    <input id="agDuracao" type="number" value="${agendamento?.duracao || 30}">

    <label>Valor</label>
    <input id="agValor" type="number" value="${agendamento?.valor || 0}" oninput="calcularTotalAgendamento()">

    <label>Desconto</label>
    <input id="agDesconto" type="number" value="${agendamento?.desconto || 0}" oninput="calcularTotalAgendamento()">

    <label>Tipo de desconto</label>
    <select id="agTipoDesconto" onchange="calcularTotalAgendamento()">
      <option value="valor" ${agendamento?.tipo_desconto === "valor" ? "selected" : ""}>R$</option>
      <option value="porcentagem" ${agendamento?.tipo_desconto === "porcentagem" ? "selected" : ""}>%</option>
    </select>

    <label>Total</label>
    <input id="agTotal" type="number" value="${agendamento?.total || 0}" readonly>

    <label>Status</label>
    <select id="agStatus">
      ${["Agendado","Confirmado","Finalizado","Cancelado","Faltou","Reagendado"].map(st=>`
        <option value="${st}" ${agendamento?.status === st ? "selected" : ""}>${st}</option>
      `).join("")}
    </select>

    <label>Observações</label>
    <textarea id="agObservacoes">${agendamento?.observacoes || ""}</textarea>

    <button class="principal" onclick="salvarAgendamento()">
      Salvar
    </button>

    ${id ? `
      <button onclick="faturarAgendamento(${id})">
        Faturar
      </button>
    ` : ""}

    ${id ? `
      <button onclick="excluirAgendamento(${id})">
        Excluir
      </button>
    ` : ""}

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);

  calcularTotalAgendamento();
}
async function faturarAgendamento(id){

  const { data: agendamento, error } = await supabaseClient
    .from("agendamentos")
    .select(`
      *,
      clientes(nome),
      profissionais(nome),
      servicos(nome, comissao_padrao)
    `)
    .eq("id", id)
    .single();

  if(error || !agendamento){
    alert("Agendamento não encontrado.");
    return;
  }

  const formasResp = await supabaseClient
    .from("formas_pagamento")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  const formas = formasResp.data || [];

  abrirModal(`
    <h2>Faturar atendimento</h2>

    <p><strong>Cliente:</strong> ${agendamento.clientes?.nome || "-"}</p>
    <p><strong>Serviço:</strong> ${agendamento.servicos?.nome || "-"}</p>
    <p><strong>Profissional:</strong> ${agendamento.profissionais?.nome || "-"}</p>

    <br>

    <label>Subtotal</label>
    <input id="fatSubtotal" type="number" value="${agendamento.valor || 0}" readonly>

    <label>Desconto</label>
    <input id="fatDesconto" type="number" value="${agendamento.desconto || 0}" readonly>

    <label>Total</label>
    <input id="fatTotal" type="number" value="${agendamento.total || 0}" readonly>

    <label>Forma de pagamento</label>
    <select id="fatFormaPagamento">
      <option value="">Selecione</option>
      ${formas.map(f=>`
        <option value="${f.id}">${f.nome}</option>
      `).join("")}
    </select>

    <button class="principal" onclick="salvarFaturamento(${agendamento.id})">
      Confirmar faturamento
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);
}

async function salvarFaturamento(agendamentoId){

  const formaPagamentoId = Number(document.getElementById("fatFormaPagamento").value);

  if(!formaPagamentoId){
    alert("Selecione a forma de pagamento.");
    return;
  }

  const { data: agendamento, error } = await supabaseClient
    .from("agendamentos")
    .select(`
      *,
      servicos(nome, comissao_padrao)
    `)
    .eq("id", agendamentoId)
    .single();

  if(error || !agendamento){
    alert("Agendamento não encontrado.");
    return;
  }

  const comandaResp = await supabaseClient
    .from("comandas")
    .insert([{
      unidade_id: unidadeAtualId,
      agendamento_id: agendamento.id,
      cliente_id: agendamento.cliente_id,
      profissional_id: agendamento.profissional_id,
      data: agendamento.data,
      subtotal: agendamento.valor,
      desconto: agendamento.desconto,
      total: agendamento.total,
      status: "Fechada"
    }])
    .select()
    .single();

  if(comandaResp.error){
    alert("Erro ao criar comanda: " + comandaResp.error.message);
    return;
  }

  const comanda = comandaResp.data;

  const percentualComissao = await buscarPercentualComissao(
    agendamento.profissional_id,
    agendamento.servico_id,
    agendamento.servicos?.comissao_padrao || 0
  );

  await supabaseClient
    .from("comanda_itens")
    .insert([{
      comanda_id: comanda.id,
      servico_id: agendamento.servico_id,
      descricao: agendamento.servicos?.nome || "Serviço",
      valor: agendamento.total,
      comissao_percentual: percentualComissao
    }]);

  await supabaseClient
    .from("pagamentos")
    .insert([{
      comanda_id: comanda.id,
      forma_pagamento_id: formaPagamentoId,
      valor: agendamento.total,
      data: agendamento.data
    }]);
  await registrarEntradaCaixa(
  comanda.id,
  formaPagamentoId,
  agendamento.total
);

  await supabaseClient
    .from("agendamentos")
    .update({
      status: "Finalizado"
    })
    .eq("id", agendamento.id);

  fecharModal();
  carregarAgenda();

  alert("Atendimento faturado com sucesso.");
}

async function buscarPercentualComissao(profissionalId, servicoId, padrao){

  const { data } = await supabaseClient
    .from("comissoes_regras")
    .select("*")
    .eq("profissional_id", profissionalId)
    .eq("servico_id", servicoId)
    .maybeSingle();

  if(data){
    return Number(data.percentual || 0);
  }

  return Number(padrao || 0);
}
async function carregarPacotes(){

  const lista = document.getElementById("listaPacotes");

  if(!lista) return;

  lista.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("pacotes")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  if(error){
    lista.innerHTML = "<div class='card'>Erro ao carregar pacotes.</div>";
    return;
  }

  if(!data || data.length === 0){
    lista.innerHTML = "<div class='card'>Nenhum pacote cadastrado.</div>";
    return;
  }

  data.forEach((pacote)=>{

    lista.innerHTML += `
      <div class="card">
        <h3>${pacote.nome}</h3>
        <p>${dinheiro(pacote.valor)}</p>
        <small>Validade: ${pacote.validade_dias || 90} dias</small>

        <br><br>

        <button class="principal" onclick="abrirModalPacote(${pacote.id})">
          Editar
        </button>
        <button onclick="venderPacote(${pacote.id})">
  Vender
</button>
      </div>
    `;

  });

}

async function carregarComissoes(){

  const lista = document.getElementById("listaComissoes");

  if(!lista) return;

  lista.innerHTML = "Carregando...";

  const { data, error } = await supabaseClient
    .from("comandas")
    .select(`
      *,
      profissionais(nome),
      comanda_itens(valor, comissao_percentual)
    `)
    .eq("status", "Fechada");

  if(error){
    lista.innerHTML = "<div class='card'>Erro ao carregar comissões.</div>";
    return;
  }

  const resumo = {};

  (data || []).forEach((comanda)=>{

    const nome = comanda.profissionais?.nome || "Sem profissional";

    if(!resumo[nome]){
      resumo[nome] = 0;
    }

    (comanda.comanda_itens || []).forEach((item)=>{
      resumo[nome] += Number(item.valor || 0) * (Number(item.comissao_percentual || 0) / 100);
    });

  });

  lista.innerHTML = "";

  Object.keys(resumo).forEach((nome)=>{

    lista.innerHTML += `
      <div class="card">
        <h3>${nome}</h3>
        <p>Total comissão</p>
        <strong>${dinheiro(resumo[nome])}</strong>
      </div>
    `;

  });

  if(lista.innerHTML === ""){
    lista.innerHTML = "<div class='card'>Nenhuma comissão encontrada.</div>";
  }
}

async function carregarCaixas(){

  const lista = document.getElementById("listaCaixas");

  if(!lista) return;

  lista.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("caixas")
    .select("*")
    .order("id", { ascending:false });

  if(error){
    lista.innerHTML = "<div class='card'>Erro ao carregar caixas.</div>";
    return;
  }

  if(!data || data.length === 0){
    lista.innerHTML = "<div class='card'>Nenhum caixa aberto.</div>";
    return;
  }

  data.forEach((caixa)=>{

    lista.innerHTML += `
      <div class="card">
        <h3>${caixa.data}</h3>
        <p>Abertura: ${dinheiro(caixa.abertura)}</p>
        <small>Status: ${caixa.status}</small>
      </div>
    `;

  });

}

async function abrirCaixa(){

  const valor = Number(prompt("Valor de abertura do caixa:") || 0);

  const { error } = await supabaseClient
    .from("caixas")
    .insert([{
      unidade_id: unidadeAtualId,
      data: formatarDataISO(new Date()),
      abertura: valor,
      status: "Aberto"
    }]);

  if(error){
    alert("Erro ao abrir caixa: " + error.message);
    return;
  }

  carregarCaixas();

  alert("Caixa aberto.");
}
async function buscarCaixaAberto(){

  const { data, error } = await supabaseClient
    .from("caixas")
    .select("*")
    .eq("status", "Aberto")
    .order("id", { ascending:false })
    .limit(1)
    .maybeSingle();

  if(error){
    return null;
  }

  return data;
}

async function registrarEntradaCaixa(comandaId, formaPagamentoId, valor){

  const caixa = await buscarCaixaAberto();

  if(!caixa){
    alert("Não existe caixa aberto. Abra o caixa antes de faturar.");
    throw new Error("Caixa fechado");
  }

  const { error } = await supabaseClient
    .from("caixa_movimentacoes")
    .insert([{
      caixa_id: caixa.id,
      tipo: "Entrada",
      descricao: "Pagamento de atendimento",
      valor: Number(valor || 0),
      comanda_id: comandaId,
      forma_pagamento_id: formaPagamentoId
    }]);

  if(error){
    alert("Erro ao registrar entrada no caixa: " + error.message);
    throw error;
  }
}
async function abrirModalPacote(id = null){

  const servicosResp = await supabaseClient
    .from("servicos")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  const servicos = servicosResp.data || [];

  let pacote = null;
  let itemPacote = null;

  if(id){

    const pacoteResp = await supabaseClient
      .from("pacotes")
      .select("*")
      .eq("id", id)
      .single();

    pacote = pacoteResp.data;

    const itemResp = await supabaseClient
      .from("pacote_itens")
      .select("*")
      .eq("pacote_id", id)
      .maybeSingle();

    itemPacote = itemResp.data;
  }

  abrirModal(`
    <h2>${id ? "Editar pacote" : "Novo pacote"}</h2>

    <input id="pacoteId" type="hidden" value="${pacote?.id || ""}">

    <label>Nome do pacote</label>
    <input id="pacoteNome" value="${pacote?.nome || ""}" placeholder="Ex: Pacote Drenagem 10 sessões">

    <label>Serviço do pacote</label>
    <select id="pacoteServico">
      <option value="">Selecione</option>
      ${servicos.map(servico=>`
        <option value="${servico.id}" ${String(itemPacote?.servico_id || "") === String(servico.id) ? "selected" : ""}>
          ${servico.nome} - ${dinheiro(servico.valor)}
        </option>
      `).join("")}
    </select>

    <label>Quantidade de sessões/créditos</label>
    <input id="pacoteQuantidade" type="number" value="${itemPacote?.quantidade || 1}">

    <label>Valor total do pacote</label>
    <input id="pacoteValor" type="number" value="${pacote?.valor || 0}">

    <label>Validade em dias</label>
    <input id="pacoteValidade" type="number" value="${pacote?.validade_dias || 90}">

    <button class="principal" onclick="salvarPacote()">
      Salvar pacote
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);
}

async function salvarPacote(){

  const id = document.getElementById("pacoteId").value;

  const nome = document.getElementById("pacoteNome").value.trim();
  const servicoId = Number(document.getElementById("pacoteServico").value);
  const quantidade = Number(document.getElementById("pacoteQuantidade").value || 1);
  const valor = Number(document.getElementById("pacoteValor").value || 0);
  const validade = Number(document.getElementById("pacoteValidade").value || 90);

  if(!nome){
    alert("Digite o nome do pacote.");
    return;
  }

  if(!servicoId){
    alert("Selecione o serviço do pacote.");
    return;
  }

  if(quantidade <= 0){
    alert("Informe uma quantidade válida.");
    return;
  }

  const dadosPacote = {
    unidade_id: unidadeAtualId,
    nome,
    valor,
    validade_dias: validade,
    ativo: true
  };

  let pacoteId = id;

  if(id){

    const atualizar = await supabaseClient
      .from("pacotes")
      .update(dadosPacote)
      .eq("id", id);

    if(atualizar.error){
      alert("Erro ao atualizar pacote: " + atualizar.error.message);
      return;
    }

    await supabaseClient
      .from("pacote_itens")
      .delete()
      .eq("pacote_id", id);

  }else{

    const criar = await supabaseClient
      .from("pacotes")
      .insert([dadosPacote])
      .select()
      .single();

    if(criar.error){
      alert("Erro ao criar pacote: " + criar.error.message);
      return;
    }

    pacoteId = criar.data.id;
  }

  const item = await supabaseClient
    .from("pacote_itens")
    .insert([{
      pacote_id: pacoteId,
      servico_id: servicoId,
      quantidade
    }]);

  if(item.error){
    alert("Erro ao salvar serviço do pacote: " + item.error.message);
    return;
  }

  fecharModal();
  carregarPacotes();

  alert("Pacote salvo com sucesso.");
}
async function venderPacote(pacoteId){

  const clientesResp = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  const formasResp = await supabaseClient
    .from("formas_pagamento")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  const pacoteResp = await supabaseClient
    .from("pacotes")
    .select("*")
    .eq("id", pacoteId)
    .single();

  const itemResp = await supabaseClient
    .from("pacote_itens")
    .select("*, servicos(nome)")
    .eq("pacote_id", pacoteId)
    .single();

  const clientes = clientesResp.data || [];
  const formas = formasResp.data || [];
  const pacote = pacoteResp.data;
  const item = itemResp.data;

  abrirModal(`
    <h2>Vender pacote</h2>

    <p><strong>${pacote.nome}</strong></p>
    <p>${item.servicos?.nome || ""} • ${item.quantidade} sessões</p>
    <p>Valor: ${dinheiro(pacote.valor)}</p>

    <label>Cliente</label>
    <select id="vendaPacoteCliente">
      <option value="">Selecione</option>
      ${clientes.map(c=>`
        <option value="${c.id}">${c.nome}</option>
      `).join("")}
    </select>

    <label>Forma de pagamento</label>
    <select id="vendaPacoteForma">
      <option value="">Selecione</option>
      ${formas.map(f=>`
        <option value="${f.id}">${f.nome}</option>
      `).join("")}
    </select>

    <button class="principal" onclick="confirmarVendaPacote(${pacote.id})">
      Confirmar venda
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);
}

async function confirmarVendaPacote(pacoteId){

  const clienteId = Number(document.getElementById("vendaPacoteCliente").value);
  const formaPagamentoId = Number(document.getElementById("vendaPacoteForma").value);

  if(!clienteId){
    alert("Selecione a cliente.");
    return;
  }

  if(!formaPagamentoId){
    alert("Selecione a forma de pagamento.");
    return;
  }

  const caixa = await buscarCaixaAberto();

  if(!caixa){
    alert("Não existe caixa aberto. Abra o caixa antes de vender pacote.");
    return;
  }

  const pacoteResp = await supabaseClient
    .from("pacotes")
    .select("*")
    .eq("id", pacoteId)
    .single();

  const itemResp = await supabaseClient
    .from("pacote_itens")
    .select("*")
    .eq("pacote_id", pacoteId)
    .single();

  const pacote = pacoteResp.data;
  const item = itemResp.data;

  const validade = new Date();
  validade.setDate(validade.getDate() + Number(pacote.validade_dias || 90));

  const pacoteClienteResp = await supabaseClient
    .from("pacotes_clientes")
    .insert([{
      cliente_id: clienteId,
      pacote_id: pacoteId,
      data_compra: formatarDataISO(new Date()),
      validade: formatarDataISO(validade),
      ativo: true,
      status: "Ativo"
    }])
    .select()
    .single();

  if(pacoteClienteResp.error){
    alert("Erro ao vender pacote: " + pacoteClienteResp.error.message);
    return;
  }

  const pacoteCliente = pacoteClienteResp.data;

  const saldoResp = await supabaseClient
    .from("pacotes_saldos")
    .insert([{
      pacote_cliente_id: pacoteCliente.id,
      servico_id: item.servico_id,
      quantidade_total: item.quantidade,
      quantidade_usada: 0,
      cancelado: false
    }]);

  if(saldoResp.error){
    alert("Erro ao criar saldo do pacote: " + saldoResp.error.message);
    return;
  }

  const comandaResp = await supabaseClient
    .from("comandas")
    .insert([{
      unidade_id: unidadeAtualId,
      cliente_id: clienteId,
      data: formatarDataISO(new Date()),
      subtotal: pacote.valor,
      desconto: 0,
      total: pacote.valor,
      status: "Fechada",
      forma_origem: "pacote"
    }])
    .select()
    .single();

  if(comandaResp.error){
    alert("Erro ao criar comanda do pacote: " + comandaResp.error.message);
    return;
  }

  await supabaseClient
    .from("pagamentos")
    .insert([{
      comanda_id: comandaResp.data.id,
      forma_pagamento_id: formaPagamentoId,
      valor: pacote.valor,
      data: formatarDataISO(new Date())
    }]);

  await registrarEntradaCaixa(
    comandaResp.data.id,
    formaPagamentoId,
    pacote.valor
  );

  fecharModal();
  carregarPacotes();

  alert("Pacote vendido e saldo criado para a cliente.");
}
async function verificarPacoteDisponivel(){

  const clienteId = Number(document.getElementById("agCliente")?.value || 0);
  const servicoId = Number(document.getElementById("agServico")?.value || 0);

  const area = document.getElementById("areaPacoteAgendamento");

  if(!area) return;

  area.innerHTML = "";

  if(!clienteId || !servicoId) return;

  const { data, error } = await supabaseClient
    .from("pacotes_clientes")
    .select(`
      *,
      pacotes(nome),
      pacotes_saldos(
        id,
        servico_id,
        quantidade_total,
        quantidade_usada,
        cancelado
      )
    `)
    .eq("cliente_id", clienteId)
    .eq("ativo", true)
    .eq("status", "Ativo");

  if(error || !data) return;

  let saldoEncontrado = null;
  let pacoteClienteEncontrado = null;

  data.forEach((pacoteCliente)=>{

    (pacoteCliente.pacotes_saldos || []).forEach((saldo)=>{

      const restante =
        Number(saldo.quantidade_total || 0) -
        Number(saldo.quantidade_usada || 0);

      if(
        String(saldo.servico_id) === String(servicoId) &&
        restante > 0 &&
        saldo.cancelado !== true
      ){
        saldoEncontrado = saldo;
        pacoteClienteEncontrado = pacoteCliente;
      }

    });

  });

  if(!saldoEncontrado) return;

  const restante =
    Number(saldoEncontrado.quantidade_total || 0) -
    Number(saldoEncontrado.quantidade_usada || 0);

  area.innerHTML = `
    <div class="card" style="margin-bottom:15px;">
      <h3>Pacote disponível</h3>

      <p>
        ${pacoteClienteEncontrado.pacotes?.nome || "Pacote"}
      </p>

      <small>
        Saldo restante: ${restante} sessão(ões)
      </small>

      <label style="display:flex;gap:10px;align-items:center;margin-top:12px;">
        <input
          id="agUsarPacote"
          type="checkbox"
          onchange="alternarUsoPacoteAgenda()"
          data-pacote-cliente-id="${pacoteClienteEncontrado.id}"
          data-pacote-saldo-id="${saldoEncontrado.id}"
          style="width:auto;height:auto;margin:0;"
        >
        Usar pacote neste atendimento
      </label>
    </div>
  `;
}

function alternarUsoPacoteAgenda(){

  const checkbox = document.getElementById("agUsarPacote");

  if(!checkbox) return;

  if(checkbox.checked){

    document.getElementById("agValor").dataset.valorOriginal =
      document.getElementById("agValor").value;

    document.getElementById("agDesconto").dataset.valorOriginal =
      document.getElementById("agDesconto").value;

    document.getElementById("agValor").value = 0;
    document.getElementById("agDesconto").value = 0;
    document.getElementById("agTotal").value = 0;

  }else{

    const valorOriginal =
      document.getElementById("agValor").dataset.valorOriginal || 0;

    const descontoOriginal =
      document.getElementById("agDesconto").dataset.valorOriginal || 0;

    document.getElementById("agValor").value = valorOriginal;
    document.getElementById("agDesconto").value = descontoOriginal;

    calcularTotalAgendamento();

  }

}

async function consumirSaldoPacoteAgendamento(agendamento){

  if(!agendamento.usar_pacote || !agendamento.pacote_saldo_id){
    return;
  }

  const { data: saldo, error } = await supabaseClient
    .from("pacotes_saldos")
    .select("*")
    .eq("id", agendamento.pacote_saldo_id)
    .single();

  if(error || !saldo){
    alert("Erro ao localizar saldo do pacote.");
    throw new Error("Saldo não encontrado");
  }

  const restante =
    Number(saldo.quantidade_total || 0) -
    Number(saldo.quantidade_usada || 0);

  if(restante <= 0){
    alert("Este pacote não possui saldo disponível.");
    throw new Error("Saldo insuficiente");
  }

  const atualizar = await supabaseClient
    .from("pacotes_saldos")
    .update({
      quantidade_usada: Number(saldo.quantidade_usada || 0) + 1
    })
    .eq("id", saldo.id);

  if(atualizar.error){
    alert("Erro ao consumir saldo do pacote: " + atualizar.error.message);
    throw atualizar.error;
  }
}
function preencherDadosServicoAgendamento(){

  const select = document.getElementById("agServico");
  const option = select.options[select.selectedIndex];

  const valor = Number(option?.dataset?.valor || 0);
  const duracao = Number(option?.dataset?.duracao || 30);

  document.getElementById("agValor").value = valor;
  document.getElementById("agDuracao").value = duracao;

  calcularTotalAgendamento();
}

function calcularTotalAgendamento(){

  const valor = Number(document.getElementById("agValor")?.value || 0);
  const desconto = Number(document.getElementById("agDesconto")?.value || 0);
  const tipo = document.getElementById("agTipoDesconto")?.value || "valor";

  let descontoFinal = tipo === "porcentagem"
    ? valor * (desconto / 100)
    : desconto;

  const total = Math.max(valor - descontoFinal, 0);

  document.getElementById("agTotal").value = total.toFixed(2);
}

async function salvarAgendamento(){

  const id = document.getElementById("agendamentoId").value;
  const checkboxPacote = document.getElementById("agUsarPacote");

  const dados = {
    unidade_id: unidadeAtualId,
    cliente_id: Number(document.getElementById("agCliente").value),
    profissional_id: Number(document.getElementById("agProfissional").value),
    data: document.getElementById("agData").value,
    horario: document.getElementById("agHorario").value,
    servico_id: Number(document.getElementById("agServico").value),
    duracao: Number(document.getElementById("agDuracao").value || 30),
    valor: Number(document.getElementById("agValor").value || 0),
    desconto: Number(document.getElementById("agDesconto").value || 0),
    tipo_desconto: document.getElementById("agTipoDesconto").value,
    total: Number(document.getElementById("agTotal").value || 0),
    status: document.getElementById("agStatus").value,
    observacoes: document.getElementById("agObservacoes").value.trim(),
    usar_pacote: checkboxPacote?.checked || false,
    pacote_cliente_id: checkboxPacote?.checked ? Number(checkboxPacote.dataset.pacoteClienteId) : null,
    pacote_saldo_id: checkboxPacote?.checked ? Number(checkboxPacote.dataset.pacoteSaldoId) : null
  };

  if(!dados.cliente_id){
    alert("Selecione uma cliente.");
    return;
  }

  if(!dados.profissional_id){
    alert("Selecione um profissional.");
    return;
  }

  if(!dados.servico_id){
    alert("Selecione um serviço.");
    return;
  }

  let resposta;

  if(id){
    resposta = await supabaseClient
      .from("agendamentos")
      .update(dados)
      .eq("id", id);
  }else{
    resposta = await supabaseClient
      .from("agendamentos")
      .insert([dados]);
  }

  if(resposta.error){
    alert("Erro ao salvar agendamento: " + resposta.error.message);
    return;
  }

  dataAgenda = new Date(dados.data + "T00:00:00");

  fecharModal();
  atualizarTextoDataAgenda();
  carregarAgenda();

  alert("Agendamento salvo com sucesso.");
}

async function excluirAgendamento(id){

  const confirmar = confirm("Deseja excluir este agendamento?");

  if(!confirmar) return;

  const { error } = await supabaseClient
    .from("agendamentos")
    .delete()
    .eq("id", id);

  if(error){
    alert("Erro ao excluir agendamento: " + error.message);
    return;
  }

  fecharModal();
  carregarAgenda();

  alert("Agendamento excluído.");
}
function somarMinutosHorario(horario, duracao){

  const [hora, minuto] = horario.split(":").map(Number);

  const total = hora * 60 + minuto + Number(duracao || 0);

  const h = Math.floor(total / 60);
  const m = total % 60;

  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

function formatarHorarioBonito(horario){

  if(!horario) return "";

  const [hora, minuto] = horario.split(":");

  return minuto === "00"
    ? `${Number(hora)}h`
    : `${Number(hora)}h${minuto}`;
}

function horarioEstaOcupado(horario, agendamento){

  const [h, m] = horario.split(":").map(Number);
  const minutosHorario = h * 60 + m;

  const [ih, im] = agendamento.horario.split(":").map(Number);
  const inicio = ih * 60 + im;

  const fim = inicio + Number(agendamento.duracao || 30);

  return minutosHorario > inicio && minutosHorario < fim;
}
