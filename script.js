const SUPABASE_URL = "https://hndksymtlzqtbzgrvfkh.supabase.co";
const SUPABASE_KEY = "sb_publishable_F4-5yOEa-lfaK5I-arqfMg_-j9pU0N8";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioLogado = null;
let permissoesUsuario = [];
let unidadeAtualId = 1;
let dataAgenda = new Date();

function formatarDataBR(data){
  return data.toLocaleDateString("pt-BR");
}

function formatarDataISO(data){

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function dinheiro(valor){
  return `R$ ${Number(valor || 0).toFixed(2)}`;
}
function pode(chave){
  return true;
}

async function fazerLogin(){

  const usuario = document.getElementById("loginUsuario").value.trim().toLowerCase();
  const senha = document.getElementById("loginSenha").value.trim();

  if(!usuario || !senha){
    alert("Digite usuário e senha.");
    return;
  }

 const busca = document.getElementById("buscaCliente")?.value?.toLowerCase().trim() || "";
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

await carregarPermissoesUsuario();

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

carregarPermissoesUsuario().then(()=>{
  aplicarPermissoes();
  iniciarSistema();
});
}

function aplicarPermissoes(){

  if(!usuarioLogado) return;

  const regrasMenu = [
    { texto:"Agenda", permissao:"agenda_visualizar" },
    { texto:"Clientes", permissao:"clientes_visualizar" },
    { texto:"Profissionais", permissao:"profissionais_visualizar" },
    { texto:"Serviços", permissao:"servicos_visualizar" },
    { texto:"Pacotes", permissao:"pacotes_visualizar" },
    { texto:"Comandas", permissao:"comandas_visualizar" },
    { texto:"Caixa", permissao:"caixa_visualizar" },
    { texto:"Comissões", permissao:"comissoes_visualizar" },
    { texto:"Relatórios", permissao:"rel_profissional" },
    { texto:"Configurações", permissao:"configuracoes_visualizar" },
    { texto:"Gestores", permissao:"gestores_visualizar" }
  ];

  regrasMenu.forEach((regra)=>{

    const botoes = Array.from(
      document.querySelectorAll(".sidebar nav button")
    );

    const botao = botoes.find(b =>
      b.innerText.trim() === regra.texto
    );

    if(botao && !temPermissao(regra.permissao)){
      botao.style.display = "none";
    }

    if(botao && temPermissao(regra.permissao)){
      botao.style.display = "";
    }

  });

}

function esconderBotaoMenu(texto){

  document.querySelectorAll(".sidebar nav button").forEach((botao)=>{

    if(botao.innerText.trim() === texto){
      botao.style.display = "none";
    }

  });

}

function mostrarTela(nome){
  if(nome === "dashboard" && !pode("dashboard_visualizar")){
  alert("Você não tem permissão para visualizar o dashboard.");
  return;
}

  document.querySelectorAll(".tela").forEach((tela)=>{
    tela.classList.remove("ativa");
  });

  const tela = document.getElementById(`tela-${nome}`);

  if(tela){
    tela.classList.add("ativa");
  }

  if(nome === "dashboard") carregarDashboard();
  if(nome === "agenda") carregarAgenda();
  if(nome === "clientes") carregarClientes();
  if(nome === "profissionais") carregarProfissionais();
  if(nome === "servicos") carregarServicos();
  if(nome === "pacotes") carregarPacotes();
  if(nome === "comandas") carregarComandas();
  if(nome === "caixa") carregarCaixas();
  if(nome === "comissoes") carregarComissoes();
  if(nome === "configuracoes") carregarConfiguracoes();
  if(nome === "gestores") carregarGestores();
  if(nome === "relatorios"){
  document.getElementById("areaRelatorios").innerHTML = "";
}
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

  mostrarTela("dashboard");

  carregarClientes();
  carregarProfissionais();
  carregarServicos();

  carregarResumoAlertasAgenda();
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

    const diasSemana = [
      "domingo",
      "segunda-feira",
      "terça-feira",
      "quarta-feira",
      "quinta-feira",
      "sexta-feira",
      "sábado"
    ];

    campo.innerText =
      `${formatarDataBR(dataAgenda)} • ${diasSemana[dataAgenda.getDay()]}`;
  }

  const calendario = document.getElementById("calendarioAgenda");

  if(calendario){
    calendario.value = formatarDataISO(dataAgenda);
  }
}
async function salvarCliente(){

  const id = document.getElementById("clienteId").value;

 const dados = {
  unidade_id: unidadeAtualId,
  nome: document.getElementById("clienteNome").value.trim(),
  telefone: document.getElementById("clienteTelefone").value.trim(),
  aniversario: document.getElementById("clienteAniversario").value || null,
  observacoes: document.getElementById("clienteObservacoes").value.trim(),
  vip: document.getElementById("clienteVip").checked,
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
async function carregarClientes(){

  const lista = document.getElementById("listaClientes");

  if(!lista) return;

  lista.innerHTML = "";

  const busca =
    document.getElementById("buscaCliente")
      ?.value
      ?.toLowerCase()
      .trim() || "";

  const { data, error } = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  if(error){
    lista.innerHTML = "<div class='card'>Erro ao carregar clientes.</div>";
    return;
  }

  const clientes = (data || []).filter(cliente =>
    !busca ||
    cliente.nome?.toLowerCase().includes(busca) ||
    String(cliente.telefone || "").includes(busca)
  );

  if(clientes.length === 0){
    lista.innerHTML = "<div class='card'>Nenhum cliente encontrado.</div>";
    return;
  }

  clientes.forEach((cliente)=>{

    lista.innerHTML += `
      <div class="card">
        <h3>
  ${cliente.vip ? "⭐ " : ""}
  ${cliente.nome}
</h3>
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
    <label>
  <input
    id="profissionalUsaComissaoPadrao"
    type="checkbox"
    ${profissional?.usa_comissao_padrao !== false ? "checked" : ""}
    onchange="toggleComissaoPersonalizada()"
    style="width:auto;height:auto;"
  >
  Utilizar comissão padrão dos serviços
</label>

<div id="areaComissaoPersonalizada"></div>

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
  usa_comissao_padrao: document.getElementById("profissionalUsaComissaoPadrao")?.checked ?? true,
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
  .insert([dados])
  .select();

  }

  if(resposta.error){
    alert("Erro ao salvar profissional: " + resposta.error.message);
    return;
  }

  fecharModal();

  carregarProfissionais();
  carregarAgenda();
  const profissionalIdFinal = id || resposta.data?.[0]?.id;

if(profissionalIdFinal){
  await salvarComissoesPersonalizadas(profissionalIdFinal);
}

  alert("Profissional salvo com sucesso.");
}
async function carregarServicos(){

  const lista = document.getElementById("listaServicos");

  if(!lista) return;

  lista.innerHTML = "Carregando serviços...";

  const categoriaFiltro =
    document.getElementById("filtroCategoriaServico")?.value || "";

  const categorias = await carregarCategoriasServico();

  let query = supabaseClient
    .from("servicos")
    .select(`
      *,
      categorias_servicos(nome)
    `)
    .eq("ativo", true)
    .order("nome");

  if(categoriaFiltro){
    query = query.eq("categoria_id", Number(categoriaFiltro));
  }

  const { data, error } = await query;

  if(error){
    lista.innerHTML = "<div class='card'>Erro ao carregar serviços.</div>";
    return;
  }

  if(!data || data.length === 0){
    lista.innerHTML = "<div class='card'>Nenhum serviço cadastrado.</div>";
    return;
  }

  lista.innerHTML = `
    <div class="filtros" style="grid-column:1/-1;margin-bottom:15px;">
      <select id="filtroCategoriaServico" onchange="carregarServicos()">
        <option value="">Todas as categorias</option>

        ${categorias.map(cat=>`
          <option
            value="${cat.id}"
            ${String(categoriaFiltro) === String(cat.id) ? "selected" : ""}
          >
            ${cat.nome}
          </option>
        `).join("")}
      </select>
    </div>

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
        <span>${servico.categorias_servicos?.nome || "-"}</span>
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

  const categorias = await carregarCategoriasServico();

  abrirModal(`
    <h2>${id ? "Editar serviço" : "Novo serviço"}</h2>

    <input id="servicoId" type="hidden" value="${servico?.id || ""}">

    <label>Categoria</label>
    <select id="servicoCategoria">

      <option value="">Selecione</option>

      ${categorias.map(cat => `
        <option
          value="${cat.id}"
          ${String(servico?.categoria_id || "") === String(cat.id) ? "selected" : ""}
        >
          ${cat.nome}
        </option>
      `).join("")}

    </select>

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

  const categoriaId =
    document.getElementById("servicoCategoria").value;

  const dados = {
    unidade_id: unidadeAtualId,
    categoria_id: categoriaId ? Number(categoriaId) : null,
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
      clientes(nome, telefone, vip),
      profissionais(nome),
      servicos(nome, duracao, valor)
    `)
    .eq("data", formatarDataISO(dataAgenda))
    .order("horario");

  const bloqueiosResp = await supabaseClient
    .from("bloqueios_agenda")
    .select("*")
    .eq("ativo", true)
    .eq("data", formatarDataISO(dataAgenda));

  const profissionais = profissionaisResp.data || [];
  let agendamentos = agendamentosResp.data || [];
  const bloqueios = bloqueiosResp.data || [];

  agendamentos = agendamentos.filter(a =>
    a.status !== "Cancelado"
  );

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
const alturaBlocoAgenda = 48;
const alturaAgenda = horarios.length * alturaBlocoAgenda;
grade.innerHTML = `
  <div class="agenda-scroll">
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

          const bloqueiosProf = bloqueios.filter(b =>
            String(b.profissional_id) === String(profissional.id)
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
    onclick="abrirOpcoesHorarioAgenda('${profissional.id}', '${h}')"
  >
    <span class="hora-slot">${h}</span>
  </div>
`).join("")}

                ${bloqueiosProf.map(b=>{

                  const top = calcularTopAgenda(String(b.horario_inicio).slice(0,5));

                  const inicioMin = horarioParaMinutos(String(b.horario_inicio).slice(0,5));
                  const fimMin = horarioParaMinutos(String(b.horario_fim).slice(0,5));
                  const duracao = fimMin - inicioMin;

                  const altura = Math.max((duracao / 30) * alturaBlocoAgenda - 6, 42);

                  return `
                    <div
                      class="agenda-bloqueio-card"
                      style="top:${top + 4}px; height:${altura}px;"
                      onclick="event.stopPropagation(); abrirModalBloqueioAgenda(${b.id})"
                    >
                      <strong>Bloqueado</strong>
                      <span>${b.motivo || "Indisponível"}</span>
                      <small>
                        ${formatarHorarioBonito(String(b.horario_inicio).slice(0,5))}
                        -
                        ${formatarHorarioBonito(String(b.horario_fim).slice(0,5))}
                      </small>
                    </div>
                  `;
                }).join("")}

                ${agendaProf.map(a=>{

                  const top = calcularTopAgenda(a.horario);
                  const altura = Math.max((Number(a.duracao || 30) / 30) * alturaBlocoAgenda - 6, 58);
                  const fim = somarMinutosHorario(a.horario, a.duracao || 30);

                  return `
                    <div
                      class="agendamento-card status-${normalizarClasse(a.status)}"
                      style="top:${top + 4}px; height:${altura}px;"
                      onclick="event.stopPropagation(); abrirModalAgendamento(${a.id})"
                    >
                      ${(a.clientes?.vip === true || a.clientes?.vip === "true") ? `<div class="selo-vip-agenda">⭐ VIP</div>` : ""}

                      <strong>
                        ${a.recorrencia_id ? "🔁 " : ""}
                        ${a.clientes?.nome || "Cliente"}
                      </strong>

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
    </div>
  `;
}
function calcularTopAgenda(horario){

  const [hora, minuto] = horario.split(":").map(Number);

  const inicio = 7 * 60;
  const atual = hora * 60 + minuto;

  return ((atual - inicio) / 30) * 48;
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
  const clienteAlertaId =
  agendamento?.cliente_id || null;

const alertasClienteHtml =
  clienteAlertaId
    ? await carregarAlertasClienteAgenda(clienteAlertaId)
    : "";

  abrirModal(`
    <h2>${id ? "Editar agendamento" : "Novo agendamento"}</h2>

    <input id="agendamentoId" type="hidden" value="${agendamento?.id || ""}">
<label>Cliente</label>

<div style="display:flex;gap:8px;align-items:center;">

  <input
    id="agClienteBusca"
    placeholder="Digite o nome ou telefone da cliente..."
    value="${agendamento ? (clientes.find(c => String(c.id) === String(agendamento.cliente_id))?.nome || "") : ""}"
    oninput="filtrarClientesAgendamento()"
    style="flex:1;"
  >

  <button
    type="button"
    onclick="mostrarCadastroClienteRapidoAgendamento()"
  >
    +
  </button>

</div>

<div class="busca-cliente-agenda">

  <input
    id="agCliente"
    type="hidden"
    value="${agendamento?.cliente_id || ""}"
  >

  <div id="resultadoBuscaClientesAgendamento" class="resultado-busca"></div>

  ${alertasClienteHtml}

  <div id="areaClienteRapidoAgendamento"></div>

</div>

    <label>Profissional</label>
    <select id="agProfissional">
      <option value="">Selecione</option>
      ${profissionais.map(p=>`
        <option value="${p.id}" ${String(agendamento?.profissional_id || profissionalPre) === String(p.id) ? "selected" : ""}>
          ${p.nome}
        </option>
      `).join("")}
    </select>

    <div class="form-grid-2">
  <div>
    <label>Data</label>
    <input id="agData" type="date" value="${agendamento?.data || formatarDataISO(dataAgenda)}">
  </div>

  <div>
    <label>Horário</label>
    <input id="agHorario" type="time" value="${agendamento?.horario || horarioPre || "08:00"}">
  </div>
</div>
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

<div class="form-grid-2">

  <div>
    <label>Duração</label>
    <input id="agDuracao" type="number" value="${agendamento?.duracao || 30}">
  </div>

  <div>
    <label>Status</label>
    <select id="agStatus">
      ${["Agendado","Confirmado","Finalizado","Cancelado","Faltou","Reagendado"].map(st=>`
        <option value="${st}" ${agendamento?.status === st ? "selected" : ""}>${st}</option>
      `).join("")}
    </select>
  </div>

  <div>
    <label>Valor</label>
    <input id="agValor" type="number" value="${agendamento?.valor || 0}" oninput="calcularTotalAgendamento()">
  </div>

  <div>
    <label>Total</label>
    <input id="agTotal" type="number" value="${agendamento?.total || 0}" readonly>
  </div>

  <div>
    <label>Desconto</label>
    <input id="agDesconto" type="number" value="${agendamento?.desconto || 0}" oninput="calcularTotalAgendamento()">
  </div>

  <div>
    <label>Tipo de desconto</label>
    <select id="agTipoDesconto" onchange="calcularTotalAgendamento()">
      <option value="valor" ${agendamento?.tipo_desconto === "valor" ? "selected" : ""}>R$</option>
      <option value="porcentagem" ${agendamento?.tipo_desconto === "porcentagem" ? "selected" : ""}>%</option>
    </select>
  </div>

</div>
    <textarea
  id="agObservacoes"
  rows="2"
  style="min-height:60px;resize:vertical;"
>${agendamento?.observacoes || ""}</textarea>
${pode("agenda_recorrencia") ? `
  <label class="bloco-recorrencia-titulo">
    <input
      id="agRepetir"
      type="checkbox"
      style="width:auto;height:auto;"
      ${agendamento?.recorrencia_ativa ? "checked" : ""}
    >
    Repetir agendamento
  </label>

  <div id="areaRecorrenciaAgendamento" class="card-recorrencia">

    <div class="linha-recorrencia">

      <div style="flex:1;">
        <small>Repetir a cada</small>

        <div class="controle-recorrencia">

          <button
            type="button"
            onclick="alterarIntervaloRecorrencia(-1)"
          >
            −
          </button>

          <input
            id="agIntervaloRepeticao"
            type="number"
            min="1"
            value="${agendamento?.recorrencia_intervalo_dias || 7}"
          >

          <button
            type="button"
            onclick="alterarIntervaloRecorrencia(1)"
          >
            +
          </button>

          <span>dias</span>

        </div>

      </div>

      <div style="flex:1;">
        <small>Repetir até</small>

        <input
          id="agRepetirAte"
          type="date"
          value="${agendamento?.recorrencia_ate || ""}"
        >
      </div>

    </div>

  </div>
` : `
  <input id="agRepetir" type="hidden">
  <input id="agIntervaloRepeticao" type="hidden" value="7">
  <input id="agRepetirAte" type="hidden">
`}

${(!id && pode("agenda_adicionar")) || (id && pode("agenda_editar")) ? `
  <button class="principal" onclick="salvarAgendamento()">
    Salvar
  </button>
` : ""}

${id && pode("agenda_faturar") ? `
  <button onclick="faturarAgendamento(${id})">
    Faturar
  </button>
` : ""}

${id && pode("agenda_excluir") ? `
  <button onclick="excluirAgendamento(${id})">
    Excluir
  </button>
` : ""}

<button onclick="fecharModal()">
  Cancelar
</button>
`);

calcularTotalAgendamento();
carregarClientesParaBuscaAgendamento();
}
async function faturarAgendamento(id){

  return abrirFaturamentoClienteDia(id);

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
  if(agendamento.usar_pacote){

  const confirmar = confirm(
    "Este atendimento será faturado usando crédito de pacote. Deseja finalizar automaticamente?"
  );

  if(!confirmar) return;

  await salvarFaturamentoPacote(agendamento.id);
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

    <label>Pagamentos</label>

<div id="areaPagamentosFaturamento">
  <div class="linha-pagamento">
    <select class="fatFormaPagamento">
      <option value="">Forma</option>
      ${formas.map(f=>`
        <option value="${f.id}" data-nome="${f.nome}">${f.nome}</option>
      `).join("")}
    </select>

    <input class="fatValorPagamento" type="number" placeholder="Valor" value="${agendamento.total || 0}">
  </div>
</div>

<button type="button" onclick="adicionarLinhaPagamentoFaturamento()">
  + Adicionar pagamento
</button>
    <label>Finalização</label>

<select id="fatTipoRecebimento">
  <option value="receber_agora">
    Receber agora
  </option>

  <option value="deixar_em_aberto">
    Deixar em aberto
  </option>
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

 const tipoRecebimento =
  document.getElementById("fatTipoRecebimento").value;

const pagamentosInformados = Array.from(
  document.querySelectorAll(".linha-pagamento")
).map(linha => ({
  formaPagamentoId: Number(linha.querySelector(".fatFormaPagamento").value),
  formaNome: linha.querySelector(".fatFormaPagamento").selectedOptions[0]?.dataset.nome || "",
  valor: Number(linha.querySelector(".fatValorPagamento").value || 0)
})).filter(p => p.formaPagamentoId && p.valor > 0);

if(
  tipoRecebimento === "receber_agora" &&
  pagamentosInformados.length === 0
){
  alert("Informe pelo menos uma forma de pagamento.");
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
     status: tipoRecebimento === "receber_agora"
  ? "Fechada"
  : "Aberta"
    }])
    .select()
    .single();

  if(comandaResp.error){
    alert("Erro ao criar comanda: " + comandaResp.error.message);
    return;
  }

  const comanda = comandaResp.data;
  await consumirPacoteSeNecessario(agendamento);

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

 if(tipoRecebimento === "receber_agora"){

  const totalPagamentos = pagamentosInformados
    .reduce((soma, p) => soma + Number(p.valor || 0), 0);

  if(Number(totalPagamentos.toFixed(2)) !== Number(Number(agendamento.total || 0).toFixed(2))){
    alert("A soma dos pagamentos precisa ser igual ao total do atendimento.");
    return;
  }

  for(const pagamento of pagamentosInformados){

    await supabaseClient
      .from("pagamentos")
      .insert([{
        comanda_id: comanda.id,
        forma_pagamento_id: pagamento.formaPagamentoId,
        valor: pagamento.valor,
        data: agendamento.data
      }]);

    if(pagamento.formaNome !== "Crédito da Cliente"){

      await registrarEntradaCaixa(
        comanda.id,
        pagamento.formaPagamentoId,
        pagamento.valor
      );

    }

  }

}
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
<button onclick="abrirCancelamentoPacote()">
  Cancelar créditos
</button>
      </div>
    `;

  });

}


async function carregarCaixas(){

  const lista = document.getElementById("listaCaixas");

  if(!lista) return;

  lista.innerHTML = "Carregando caixas...";

  const { data, error } = await supabaseClient
    .from("caixas")
    .select("*")
    .neq("status", "Excluído")
    .order("id", { ascending:false });

  if(error){
    lista.innerHTML = "<div class='card'>Erro ao carregar caixas.</div>";
    return;
  }

  if(!data || data.length === 0){
    lista.innerHTML = "<div class='card'>Nenhum caixa encontrado.</div>";
    return;
  }

  lista.innerHTML = "";

  for(const caixa of data){

    const { data: movs } = await supabaseClient
      .from("caixa_movimentacoes")
      .select(`
        *,
        formas_pagamento(nome),
        comandas(
          id,
          total,
          clientes(nome)
        )
      `)
      .eq("caixa_id", caixa.id)
      .neq("cancelada", true);

const movimentacoes = (movs || []).filter(m =>
  m.cancelada !== true &&
  m.comandas?.status !== "Cancelada" &&
  m.comandas?.cancelada !== true
);

    const entradasPagamento = movimentacoes.filter(m =>
      m.tipo === "Entrada" &&
      m.forma_pagamento_id
    );

    const reforcos = movimentacoes.filter(m =>
      m.tipo === "Entrada" &&
      !m.forma_pagamento_id
    );

    const sangrias = movimentacoes.filter(m =>
      m.tipo === "Saída"
    );

    const totalEntradasPagamento = entradasPagamento
      .reduce((soma, m)=> soma + Number(m.valor || 0), 0);

    const totalReforcos = reforcos
      .reduce((soma, m)=> soma + Number(m.valor || 0), 0);

    const totalSangrias = sangrias
      .reduce((soma, m)=> soma + Number(m.valor || 0), 0);

    const totalEsperado =
      Number(caixa.abertura || 0) +
      totalEntradasPagamento +
      totalReforcos -
      totalSangrias;

    const porForma = {};

    entradasPagamento.forEach(m=>{

      const forma = m.formas_pagamento?.nome || "Forma não informada";

      if(!porForma[forma]){
        porForma[forma] = {
          total: 0,
          itens: []
        };
      }

      porForma[forma].total += Number(m.valor || 0);

      porForma[forma].itens.push({
        cliente: m.comandas?.clientes?.nome || "Cliente não informado",
        valor: Number(m.valor || 0)
      });

    });
lista.innerHTML += `
  <div class="caixa-card">

    <div
      class="caixa-resumo-topo"
      onclick="alternarDetalheCaixa(${caixa.id})"
    >
      <div>
        <h3>Caixa ${formatarDataComanda(caixa.data)}</h3>
        <small>
          ${caixa.status} • ${caixa.aberto_por || "Usuário não informado"}
        </small>
      </div>

      <div class="caixa-total">
        ${dinheiro(totalEsperado)}
        <small>Total esperado</small>
      </div>
    </div>

    <div class="caixa-acoes">
      ${caixa.status === "Aberto" ? `
        <button class="principal" onclick="abrirReforcoCaixa(${caixa.id})">
          Reforço
        </button>

        <button onclick="abrirSangriaCaixa(${caixa.id})">
          Sangria
        </button>

        <button onclick="abrirFechamentoCaixa(${caixa.id})">
          Fechar caixa
        </button>
      ` : ""}

      ${pode("caixa_excluir") ? `
        <button onclick="excluirCaixa(${caixa.id})">
          Excluir caixa
        </button>
      ` : ""}
    </div>

    <div
      id="detalheCaixa_${caixa.id}"
      class="caixa-detalhe"
    >

      <div class="caixa-metricas">

        <div class="caixa-metrica">
          <small>Abertura</small>
          <strong>${dinheiro(caixa.abertura || 0)}</strong>
        </div>

        <div class="caixa-metrica">
          <small>Entradas</small>
          <strong>${dinheiro(totalEntradasPagamento)}</strong>
        </div>

        <div class="caixa-metrica">
          <small>Reforços</small>
          <strong>${dinheiro(totalReforcos)}</strong>
        </div>

        <div class="caixa-metrica">
          <small>Sangrias</small>
          <strong>${dinheiro(totalSangrias)}</strong>
        </div>

      </div>

      ${caixa.status === "Fechado" ? `
        <div class="caixa-linha">
          <span>Fechamento</span>
          <strong>${dinheiro(caixa.fechamento || 0)}</strong>
        </div>

        <div class="caixa-linha">
          <span>Diferença</span>
          <strong>${dinheiro(caixa.diferenca || 0)}</strong>
        </div>
      ` : ""}

      <h3>Entradas por forma de pagamento</h3>

      ${Object.keys(porForma).length ? Object.keys(porForma).map(forma=>`
        <div style="margin-bottom:18px;">
          <div class="caixa-linha">
            <strong>${forma}</strong>
            <strong>${dinheiro(porForma[forma].total)}</strong>
          </div>

          ${porForma[forma].itens.map(item=>`
            <div class="caixa-linha">
              <small>${item.cliente}</small>
              <span>${dinheiro(item.valor)}</span>
            </div>
          `).join("")}
        </div>
      `).join("") : "<p>Nenhuma entrada de pagamento registrada.</p>"}

      <h3>Reforços</h3>

      ${reforcos.length ? reforcos.map(m=>`
        <div class="caixa-linha">
          <span>${m.descricao || "Reforço de caixa"}</span>
          <strong>${dinheiro(m.valor)}</strong>
        </div>
      `).join("") : "<p>Nenhum reforço registrado.</p>"}

      <h3>Sangrias</h3>

      ${sangrias.length ? sangrias.map(m=>`
        <div class="caixa-linha">
          <span>${m.descricao || "Sangria de caixa"}</span>
          <strong>${dinheiro(m.valor)}</strong>
        </div>
      `).join("") : "<p>Nenhuma sangria registrada.</p>"}

      <h3>Resumo final</h3>

      ${Object.keys(porForma).map(forma=>`
        <div class="caixa-linha">
          <span>${forma}</span>
          <strong>${dinheiro(porForma[forma].total)}</strong>
        </div>
      `).join("")}

      <div class="caixa-linha">
        <span>Reforços</span>
        <strong>${dinheiro(totalReforcos)}</strong>
      </div>

      <div class="caixa-linha">
        <span>Sangrias</span>
        <strong>${dinheiro(totalSangrias)}</strong>
      </div>

      <div class="caixa-linha">
        <strong>Total esperado</strong>
        <strong>${dinheiro(totalEsperado)}</strong>
      </div>

    </div>

  </div>
`;

  }

}


async function abrirCaixa(){

  const caixaAberto = await buscarCaixaAberto();

  if(caixaAberto){
    alert("Já existe um caixa aberto. Feche o caixa atual antes de abrir outro.");
    return;
  }

  const valor = Number(prompt("Informe o valor de abertura do caixa:") || 0);

  if(valor <= 0){
    alert("O valor de abertura precisa ser maior que zero.");
    return;
  }

  const { error } = await supabaseClient
    .from("caixas")
    .insert([{
      unidade_id: unidadeAtualId,
      data: formatarDataISO(new Date()),
      abertura: valor,
      status: "Aberto",
      aberto_por: usuarioLogado?.nome || usuarioLogado?.usuario || "Usuário"
    }]);

if(error){
  alert("Erro ao abrir caixa: " + error.message);
  return;
}

await registrarHistoricoOperacao(
  "abertura_caixa",
  "CAIXA",
  "Abertura de caixa realizada",
  {
    valor_abertura: valor
  }
);

carregarCaixas();

alert("Caixa aberto com sucesso.");
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
  let itensPacote = [];

  if(id){

    const pacoteResp = await supabaseClient
      .from("pacotes")
      .select("*")
      .eq("id", id)
      .single();

    pacote = pacoteResp.data;

    const itensResp = await supabaseClient
      .from("pacote_itens")
      .select("*")
      .eq("pacote_id", id);

    itensPacote = itensResp.data || [];
  }

  if(itensPacote.length === 0){
    itensPacote = [{
      servico_id: "",
      quantidade: 1,
      valor_sessao: 0
    }];
  }

  abrirModal(`
    <h2>${id ? "Editar pacote" : "Novo pacote"}</h2>

    <input id="pacoteId" type="hidden" value="${pacote?.id || ""}">

    <label>Nome do pacote</label>
    <input id="pacoteNome" value="${pacote?.nome || ""}" placeholder="Ex: Pacote Corporal Premium">

    <div id="itensPacoteArea">
      ${itensPacote.map((item, index)=>`
        <div class="card item-pacote" style="margin-bottom:15px;">
          <h3>Serviço ${index + 1}</h3>

          <label>Serviço</label>
          <select class="pacoteServicoItem" onchange="calcularTotalPacote()">
            <option value="">Selecione</option>
            ${servicos.map(servico=>`
              <option value="${servico.id}" ${String(item.servico_id || "") === String(servico.id) ? "selected" : ""}>
                ${servico.nome}
              </option>
            `).join("")}
          </select>

          <label>Quantidade de sessões</label>
          <input
            class="pacoteQuantidadeItem"
            type="number"
            min="1"
            value="${item.quantidade || 1}"
            oninput="calcularTotalPacote()"
          >

          <label>Valor por sessão</label>
          <input
            class="pacoteValorSessaoItem"
            type="number"
            min="0"
            value="${item.valor_sessao || 0}"
            oninput="calcularTotalPacote()"
          >
        </div>
      `).join("")}
    </div>

    <button type="button" onclick="adicionarItemPacote()">
      + Adicionar outro serviço
    </button>

    <label>Valor total do pacote</label>
    <input id="pacoteValor" type="number" value="${pacote?.valor || 0}" readonly>

    <label>Validade em dias</label>
    <input id="pacoteValidade" type="number" value="${pacote?.validade_dias || 90}">

    <button class="principal" onclick="salvarPacote()">
      Salvar pacote
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);

  window.servicosPacoteCache = servicos;
  calcularTotalPacote();
}
async function salvarPacote(){

  const id = document.getElementById("pacoteId").value;

  const nome = document.getElementById("pacoteNome").value.trim();
  const valor = Number(document.getElementById("pacoteValor").value || 0);
  const validade = Number(document.getElementById("pacoteValidade").value || 90);

  const itens = Array.from(document.querySelectorAll(".item-pacote")).map(item=>({
    servico_id: Number(item.querySelector(".pacoteServicoItem").value),
    quantidade: Number(item.querySelector(".pacoteQuantidadeItem").value || 1),
    valor_sessao: Number(item.querySelector(".pacoteValorSessaoItem").value || 0)
  })).filter(item => item.servico_id && item.quantidade > 0);

  if(!nome){
    alert("Digite o nome do pacote.");
    return;
  }

  if(itens.length === 0){
    alert("Adicione pelo menos um serviço ao pacote.");
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

  const itensSalvar = itens.map(item=>({
    pacote_id: pacoteId,
    servico_id: item.servico_id,
    quantidade: item.quantidade,
    valor_sessao: item.valor_sessao
  }));

  const salvarItens = await supabaseClient
    .from("pacote_itens")
    .insert(itensSalvar);

  if(salvarItens.error){
    alert("Erro ao salvar serviços do pacote: " + salvarItens.error.message);
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

  const itensResp = await supabaseClient
    .from("pacote_itens")
    .select("*")
    .eq("pacote_id", pacoteId);

  const pacote = pacoteResp.data;
  const itens = itensResp.data || [];

  if(!pacote){
    alert("Pacote não encontrado.");
    return;
  }

  if(itens.length === 0){
    alert("Este pacote não possui serviços cadastrados.");
    return;
  }

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

  const saldosSalvar = itens.map(item=>({
    pacote_cliente_id: pacoteCliente.id,
    servico_id: item.servico_id,
    quantidade_total: item.quantidade,
    quantidade_usada: 0,
    valor_sessao: item.valor_sessao || 0,
    cancelado: false
  }));

  const saldoResp = await supabaseClient
    .from("pacotes_saldos")
    .insert(saldosSalvar);

  if(saldoResp.error){
    alert("Erro ao criar saldos do pacote: " + saldoResp.error.message);
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

  alert("Pacote vendido e saldos criados para todos os serviços.");
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

const campoRepetir = document.getElementById("agRepetir");
const repetirAte = document.getElementById("agRepetirAte")?.value || null;
const intervaloDias = Number(document.getElementById("agIntervaloRepeticao")?.value || 7);

const repetir =
  campoRepetir &&
  campoRepetir.type !== "hidden" &&
  campoRepetir.checked === true &&
  repetirAte;

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

    const agendamentoAtualResp = await supabaseClient
      .from("agendamentos")
      .select("*")
      .eq("id", id)
      .single();

    const agendamentoAtual = agendamentoAtualResp.data;

    let modo = "unico";

    if(agendamentoAtual?.recorrencia_id){

      const escolha = prompt(
        "Este é um agendamento recorrente.\n\nDigite:\n1 - Alterar apenas este horário\n2 - Alterar este e todos os futuros"
      );

      if(escolha === "2"){
        modo = "futuros";
      }else if(escolha !== "1"){
        return;
      }

    }

    if(modo === "futuros"){

      resposta = await supabaseClient
        .from("agendamentos")
        .update(dados)
        .eq("recorrencia_id", agendamentoAtual.recorrencia_id)
        .gte("data", agendamentoAtual.data);

    }else{

      resposta = await supabaseClient
        .from("agendamentos")
        .update(dados)
        .eq("id", id);

    }

  }else{

}else{

  const agendamentosParaInserir = [];

  if(repetir){

    if(!repetirAte){
      alert("Informe até quando deseja repetir o agendamento.");
      return;
    }

    const recorrenciaId = gerarIdRecorrencia();

    const inicio = new Date(dados.data + "T00:00:00");
    const fim = new Date(repetirAte + "T00:00:00");

    let dataAtual = new Date(inicio);

    while(dataAtual <= fim){

      agendamentosParaInserir.push({
        ...dados,
        data: formatarDataISO(dataAtual),
        status: "Agendado",
        recorrencia_id: recorrenciaId,
        recorrencia_ativa: true,
        recorrencia_frequencia: "personalizada",
        recorrencia_intervalo_dias: intervaloDias,
        recorrencia_ate: repetirAte
      });

      dataAtual.setDate(dataAtual.getDate() + intervaloDias);
    }

  }else{

    agendamentosParaInserir.push(dados);

  }

  resposta = await supabaseClient
    .from("agendamentos")
    .insert(agendamentosParaInserir);

}
async function excluirAgendamento(id){

  const { data: agendamento, error: erroBusca } = await supabaseClient
    .from("agendamentos")
    .select("*")
    .eq("id", id)
    .single();

  if(erroBusca || !agendamento){
    alert("Agendamento não encontrado.");
    return;
  }

  const { data: comanda } = await supabaseClient
    .from("comandas")
    .select("*")
    .eq("agendamento_id", id)
    .maybeSingle();

  if(comanda){
    alert("Este atendimento já foi faturado. Para cancelar, vá até a aba Comandas e cancele a comanda.");
    return;
  }

  let modo = "unico";

  if(agendamento.recorrencia_id){

    const escolha = prompt(
      "Este é um agendamento recorrente.\n\nDigite:\n1 - Excluir apenas este horário\n2 - Excluir este e todos os futuros"
    );

    if(escolha === "2"){
      modo = "futuros";
    }else if(escolha !== "1"){
      return;
    }

  }else{

    const confirmar = confirm("Deseja excluir este agendamento?");
    if(!confirmar) return;

  }

  let resposta;

  if(modo === "futuros"){

    resposta = await supabaseClient
      .from("agendamentos")
      .delete()
      .eq("recorrencia_id", agendamento.recorrencia_id)
      .gte("data", agendamento.data);

  }else{

    resposta = await supabaseClient
      .from("agendamentos")
      .update({
        status: "Cancelado"
      })
      .eq("id", id);

  }

  if(resposta.error){
    alert("Erro ao excluir agendamento: " + resposta.error.message);
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
async function toggleComissaoPersonalizada(){

  const area = document.getElementById("areaComissaoPersonalizada");
  const checkbox = document.getElementById("profissionalUsaComissaoPadrao");

  if(!area || !checkbox) return;

  if(checkbox.checked){
    area.innerHTML = "";
    return;
  }

  const servicosResp = await supabaseClient
    .from("servicos")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  const servicos = servicosResp.data || [];

  area.innerHTML = `
    <h3>Comissões personalizadas</h3>

    ${servicos.map(servico=>`
      <div style="display:flex;gap:10px;margin-bottom:10px;">
        <div style="flex:1;">
          ${servico.nome}
        </div>

        <input
          type="number"
          id="comissaoServico_${servico.id}"
          value="${servico.comissao_padrao || 0}"
          style="width:100px;"
        >
      </div>
    `).join("")}
  `;
}
async function salvarComissoesPersonalizadas(profissionalId){

  const checkbox = document.getElementById("profissionalUsaComissaoPadrao");

  if(!checkbox || checkbox.checked){
    await supabaseClient
      .from("comissoes_regras")
      .delete()
      .eq("profissional_id", profissionalId);

    return;
  }

  const servicosResp = await supabaseClient
    .from("servicos")
    .select("*")
    .eq("ativo", true);

  const servicos = servicosResp.data || [];

  await supabaseClient
    .from("comissoes_regras")
    .delete()
    .eq("profissional_id", profissionalId);

  const regras = servicos.map((servico)=>{

    const campo = document.getElementById(`comissaoServico_${servico.id}`);

    return {
      profissional_id: profissionalId,
      servico_id: servico.id,
      percentual: Number(campo?.value || servico.comissao_padrao || 0)
    };

  });

  if(regras.length > 0){
    await supabaseClient
      .from("comissoes_regras")
      .insert(regras);
  }
}
async function abrirCancelamentoPacote(){

  const clientesResp = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  const clientes = clientesResp.data || [];

  abrirModal(`
    <h2>Cancelar créditos de pacote</h2>

    <label>Cliente</label>
    <select id="cancelarPacoteCliente" onchange="carregarPacotesClienteCancelamento()">
      <option value="">Selecione</option>
      ${clientes.map(c=>`
        <option value="${c.id}">${c.nome}</option>
      `).join("")}
    </select>

    <div id="pacotesClienteCancelamento"></div>

    <button onclick="fecharModal()">Fechar</button>
  `);
}

async function carregarPacotesClienteCancelamento(){

  const clienteId = Number(document.getElementById("cancelarPacoteCliente").value);
  const area = document.getElementById("pacotesClienteCancelamento");

  area.innerHTML = "";

  if(!clienteId) return;

  const { data, error } = await supabaseClient
    .from("pacotes_clientes")
    .select(`
      *,
      pacotes(nome, valor),
      pacotes_saldos(
        id,
        quantidade_total,
        quantidade_usada,
        cancelado,
        servicos(nome)
      )
    `)
    .eq("cliente_id", clienteId)
    .eq("status", "Ativo");

  if(error){
    area.innerHTML = "<div class='card'>Erro ao carregar pacotes.</div>";
    return;
  }

  if(!data || data.length === 0){
    area.innerHTML = "<div class='card'>Cliente sem pacotes ativos.</div>";
    return;
  }

  data.forEach((pacoteCliente)=>{

    area.innerHTML += `
      <div class="card">
        <h3>${pacoteCliente.pacotes?.nome || "Pacote"}</h3>

        ${(pacoteCliente.pacotes_saldos || []).map(saldo=>{
          const restante = Number(saldo.quantidade_total || 0) - Number(saldo.quantidade_usada || 0);

          return `
            <p>${saldo.servicos?.nome || "Serviço"}</p>
            <small>
              Saldo: ${restante}/${saldo.quantidade_total}
            </small>
          `;
        }).join("")}

        <br><br>

        <button class="principal" onclick="abrirOpcoesCancelamentoPacote(${pacoteCliente.id}, ${clienteId}, ${pacoteCliente.pacotes?.valor || 0})">
          Cancelar este pacote
        </button>
      </div>
    `;

  });
}
function abrirOpcoesCancelamentoPacote(pacoteClienteId, clienteId, valorPacote){

  abrirModal(`
    <h2>Cancelar pacote</h2>

    <p>Escolha como deseja cancelar este pacote:</p>

    <label>Tipo de cancelamento</label>
    <select id="tipoCancelamentoPacote">
      <option value="credito">Estornar como crédito para cliente</option>
      <option value="devolucao">Devolução de valor para cliente</option>
      <option value="sem_extorno">Cancelar sem extorno de valores</option>
    </select>

    <label>Valor de crédito para cliente</label>
    <input id="valorCreditoCancelamento" type="number" value="0">

    <label>Valor devolvido para cliente</label>
    <input id="valorDevolvidoCancelamento" type="number" value="0">

    <label>Observação</label>
    <textarea id="observacaoCancelamentoPacote"></textarea>

    <button class="principal" onclick="confirmarCancelamentoPacote(${pacoteClienteId}, ${clienteId})">
      Confirmar cancelamento
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);
}

async function confirmarCancelamentoPacote(pacoteClienteId, clienteId){

  const tipo = document.getElementById("tipoCancelamentoPacote").value;
  const valorCredito = Number(document.getElementById("valorCreditoCancelamento").value || 0);
  const valorDevolvido = Number(document.getElementById("valorDevolvidoCancelamento").value || 0);
  const observacao = document.getElementById("observacaoCancelamentoPacote").value.trim();

  const caixa = await buscarCaixaAberto();

  if(tipo === "devolucao" && !caixa){
    alert("Abra um caixa antes de registrar devolução de valor.");
    return;
  }

  await supabaseClient
    .from("pacotes_clientes")
    .update({
      status: "Cancelado",
      ativo: false,
      cancelado_em: new Date().toISOString(),
      motivo_cancelamento: observacao || tipo
    })
    .eq("id", pacoteClienteId);

  await supabaseClient
    .from("pacotes_saldos")
    .update({
      cancelado: true,
      cancelado_em: new Date().toISOString()
    })
    .eq("pacote_cliente_id", pacoteClienteId);

  await supabaseClient
    .from("cancelamentos_pacotes")
    .insert([{
      pacote_cliente_id: pacoteClienteId,
      cliente_id: clienteId,
      tipo_cancelamento: tipo,
      valor_devolvido: tipo === "devolucao" ? valorDevolvido : 0,
      valor_credito: tipo === "credito" ? valorCredito : 0,
      observacao
    }]);

  if(tipo === "credito" && valorCredito > 0){

    await supabaseClient
      .from("creditos_clientes")
      .insert([{
        cliente_id: clienteId,
        valor: valorCredito,
        descricao: "Crédito gerado por cancelamento de pacote",
        ativo: true
      }]);

  }

  if(tipo === "devolucao" && valorDevolvido > 0){

    await supabaseClient
      .from("caixa_movimentacoes")
      .insert([{
        caixa_id: caixa.id,
        tipo: "Saída",
        descricao: "Devolução de pacote para cliente",
        valor: Number(valorDevolvido),
        pacote_cliente_id: pacoteClienteId,
        cliente_id: clienteId
      }]);

  }

  fecharModal();

  alert("Pacote cancelado com sucesso.");
}
async function consumirPacoteSeNecessario(agendamento){

  if(!agendamento.usar_pacote || !agendamento.pacote_saldo_id){
    return;
  }

  await consumirSaldoPacoteAgendamento(agendamento);
}
window.clientesAgendamentoCache = [];

async function carregarClientesParaBuscaAgendamento(){

  const { data } = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  window.clientesAgendamentoCache = data || [];
}

function filtrarClientesAgendamento(){

  const busca = document.getElementById("agClienteBusca")?.value?.toLowerCase().trim() || "";
  const resultado = document.getElementById("resultadoBuscaClientesAgendamento");

  if(!resultado) return;

  resultado.innerHTML = "";

  if(busca.length < 2) return;

  const encontrados = (window.clientesAgendamentoCache || [])
    .filter(cliente =>
      cliente.nome.toLowerCase().includes(busca) ||
      String(cliente.telefone || "").includes(busca)
    )
    .slice(0, 10);

  encontrados.forEach((cliente)=>{

    resultado.innerHTML += `
      <div class="item-busca" onclick="selecionarClienteAgendamento(${cliente.id}, '${cliente.nome.replace(/'/g, "\\'")}')">
        <strong>${cliente.nome}</strong>
        <small>${cliente.telefone || ""}</small>
      </div>
    `;

  });
}

function selecionarClienteAgendamento(id, nome){

  document.getElementById("agCliente").value = id;
  document.getElementById("agClienteBusca").value = nome;

  document.getElementById("resultadoBuscaClientesAgendamento").innerHTML = "";

  verificarPacoteDisponivel();
}

function limparClienteAgendamento(){

  document.getElementById("agCliente").value = "";
  document.getElementById("agClienteBusca").value = "";
  document.getElementById("resultadoBuscaClientesAgendamento").innerHTML = "";
}
async function carregarComandas(){

  const lista = document.getElementById("listaComandas");

  if(!lista) return;

  lista.innerHTML = "Carregando comandas...";

  const busca =
    document.getElementById("buscaComanda")
      ?.value
      ?.toLowerCase()
      .trim() || "";

  const { data, error } = await supabaseClient
    .from("comandas")
    .select(`
      *,
      clientes(nome),
      profissionais(nome),
      comanda_itens(descricao)
    `)
    .order("data", { ascending:false })
    .order("id", { ascending:false });

  if(error){
    lista.innerHTML = `
      <div class="card">
        Erro ao carregar comandas.
      </div>
    `;
    return;
  }

  let comandas = data || [];

  if(busca){

    comandas = comandas.filter((comanda)=>{

      const cliente =
        comanda.clientes?.nome?.toLowerCase() || "";

      const servicos =
        (comanda.comanda_itens || [])
          .map(item => item.descricao || "")
          .join(" ")
          .toLowerCase();

      return (
        cliente.includes(busca) ||
        servicos.includes(busca)
      );

    });

  }

  if(comandas.length === 0){
    lista.innerHTML = `
      <div class="card">
        Nenhuma comanda encontrada.
      </div>
    `;
    return;
  }

  const porData = {};

  comandas.forEach((comanda)=>{

    const dataComanda =
      comanda.data || "Sem data";

    if(!porData[dataComanda]){
      porData[dataComanda] = [];
    }

    porData[dataComanda].push(comanda);

  });

  lista.innerHTML = "";

  Object.keys(porData).forEach((data)=>{

    lista.innerHTML += `
      <div style="grid-column:1/-1;margin:10px 0;">
        <h2 style="font-size:20px;">
          ${formatarDataComanda(data)}
        </h2>
      </div>
    `;

    porData[data].forEach((comanda)=>{

      const servicos =
        (comanda.comanda_itens || [])
          .map(item => item.descricao)
          .filter(Boolean)
          .join(", ") || "Sem itens";

      lista.innerHTML += `
        <div class="card">

          <h3>
            Comanda #${comanda.id}
          </h3>

          <p>
            Cliente:
            <strong>
              ${comanda.clientes?.nome || "-"}
            </strong>
          </p>

          <p>
            Serviço:
            <strong>
              ${servicos}
            </strong>
          </p>

          <p>
            Total:
            <strong>
              ${dinheiro(comanda.total || 0)}
            </strong>
          </p>

          <p>
            Status:
            <strong>
              ${comanda.status || "Aberta"}
            </strong>
          </p>

         <button onclick="abrirComanda(${comanda.id})">
  Visualizar
</button>

${comanda.status !== "Cancelada" && comanda.cancelada !== true ? `
  <button onclick="cancelarComandaPelaAba(${comanda.id})">
    Cancelar faturamento
  </button>
` : ""}

        </div>
      `;
    });

  });

}

function formatarDataComanda(data){

  if(!data || data === "Sem data"){
    return "Sem data";
  }

  const partes = String(data).split("-");

  if(partes.length !== 3){
    return data;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}
async function abrirComanda(comandaId){

  const { data: comanda, error } = await supabaseClient
    .from("comandas")
    .select(`
      *,
      clientes(nome, telefone),
      profissionais(nome),
      comanda_itens(*),
      pagamentos(*, formas_pagamento(nome))
    `)
    .eq("id", comandaId)
    .single();

  if(error || !comanda){
    alert("Erro ao abrir comanda.");
    return;
  }

  abrirModal(`
    <h2>Comanda #${comanda.id}</h2>

    <p><strong>Cliente:</strong> ${comanda.clientes?.nome || "-"}</p>
    <p><strong>Telefone:</strong> ${comanda.clientes?.telefone || "-"}</p>
    <p><strong>Status:</strong> ${comanda.status || "Aberta"}</p>

    <hr><br>

    <h3>Itens</h3>

    ${(comanda.comanda_itens || []).map(item=>`
      <div class="card">
        <strong>${item.descricao || "Item"}</strong>
        <p>Valor: ${dinheiro(item.valor)}</p>
        <small>Comissão: ${item.comissao_percentual || 0}%</small>
      </div>
    `).join("") || "<p>Nenhum item lançado.</p>"}

    <br>

    <h3>Pagamentos</h3>

    ${(comanda.pagamentos || []).map(pag=>`
      <div class="card">
        <strong>${dinheiro(pag.valor)}</strong>
        <p>${pag.formas_pagamento?.nome || "-"}</p>
        <small>${pag.data || ""}</small>
      </div>
    `).join("") || "<p>Nenhum pagamento lançado.</p>"}

    <br>

   <h3>Resumo</h3>
<p>Subtotal: ${dinheiro(comanda.subtotal)}</p>
<p>Desconto: ${dinheiro(comanda.desconto)}</p>
<p><strong>Total: ${dinheiro(comanda.total)}</strong></p>

<br>

${comanda.status !== "Fechada" ? `
  <button class="principal" onclick="abrirReceberComanda(${comanda.id})">
    Receber comanda
  </button>
` : ""}

<button onclick="fecharModal()">Fechar</button>
  `);
}
function gerarIdRecorrencia(){
  return "rec_" + Date.now() + "_" + Math.floor(Math.random() * 999999);
}

function adicionarDias(data, dias){

  const nova = new Date(data);
  nova.setDate(nova.getDate() + dias);
  return nova;
}

async function criarAgendamentosRecorrentes(dadosBase){

  const repetirAte = dadosBase.recorrencia_ate;
  const intervaloDias = Number(dadosBase.recorrencia_intervalo_dias || 7);

  if(!repetirAte){
    alert("Informe até quando deseja repetir o agendamento.");
    return;
  }

  if(!intervaloDias || intervaloDias <= 0){
    alert("Informe um intervalo válido para a recorrência.");
    return;
  }

  const inicio = new Date(dadosBase.data + "T00:00:00");
  const fim = new Date(repetirAte + "T00:00:00");

  if(fim <= inicio){
    alert("A data final da repetição precisa ser depois da data inicial.");
    return;
  }

  const recorrenciaId =
    dadosBase.recorrencia_id || gerarIdRecorrencia();

  const novosAgendamentos = [];

  let dataAtual = new Date(inicio);
  dataAtual.setDate(dataAtual.getDate() + intervaloDias);

  while(dataAtual <= fim){

    novosAgendamentos.push({
      ...dadosBase,
      data: formatarDataISO(dataAtual),
      recorrencia_id: recorrenciaId,
      recorrencia_ativa: true,
      recorrencia_frequencia: "personalizada",
      recorrencia_intervalo_dias: intervaloDias,
      recorrencia_ate: repetirAte,
      status: "Agendado"
    });

    dataAtual.setDate(dataAtual.getDate() + intervaloDias);
  }

  if(novosAgendamentos.length === 0){
    alert("Nenhum agendamento recorrente foi criado. Confira a data final.");
    return;
  }

  const { error } = await supabaseClient
    .from("agendamentos")
    .insert(novosAgendamentos);

  if(error){
    alert("Erro ao criar recorrências: " + error.message);
    return;
  }
}
function mudarDataAgendaPeloCalendario(){

  const valor = document.getElementById("calendarioAgenda")?.value;

  if(!valor) return;

  dataAgenda = new Date(valor + "T00:00:00");

  atualizarTextoDataAgenda();
  carregarAgenda();
}
async function abrirRelatorioProfissional(){

  const profissionaisResp = await supabaseClient
    .from("profissionais")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  const profissionais = profissionaisResp.data || [];

  const hoje = formatarDataISO(new Date());

  document.getElementById("areaRelatorios").innerHTML = `
    <div class="card">
      <h2>Atendimentos por profissional</h2>

      <label>Profissional</label>
      <select id="relProfissionalId">
        <option value="">Todos</option>
        ${profissionais.map(p=>`
          <option value="${p.id}">${p.nome}</option>
        `).join("")}
      </select>

      <label>Data inicial</label>
      <input id="relProfDataInicio" type="date" value="${hoje}">

      <label>Data final</label>
      <input id="relProfDataFim" type="date" value="${hoje}">

      <button class="principal" onclick="gerarRelatorioProfissional()">
        Gerar relatório
      </button>
    </div>

    <div id="resultadoRelatorioProfissional"></div>
  `;
}
async function gerarRelatorioProfissional(){

  const profissionalId = document.getElementById("relProfissionalId").value;
  const dataInicio = document.getElementById("relProfDataInicio").value;
  const dataFim = document.getElementById("relProfDataFim").value;
  const area = document.getElementById("resultadoRelatorioProfissional");

  area.innerHTML = "Gerando relatório...";

  let query = supabaseClient
    .from("comandas")
    .select(`
      *,
      profissionais(nome),
      comanda_itens(descricao, valor, comissao_percentual)
    `)
    .gte("data", dataInicio)
    .lte("data", dataFim)
    .in("status", ["Fechada", "Aberta", "Parcial"])
    .neq("cancelada", true);

  if(profissionalId){
    query = query.eq("profissional_id", profissionalId);
  }

  const { data, error } = await query;

  if(error){
    area.innerHTML = "<div class='card'>Erro ao gerar relatório.</div>";
    return;
  }

  const resumo = {};

  (data || []).forEach((comanda)=>{

    const profissional = comanda.profissionais?.nome || "Sem profissional";

    const itensUnicos = [];
    const chavesItens = new Set();

    (comanda.comanda_itens || []).forEach((item)=>{
      const chave = `${comanda.id}-${item.descricao}-${item.valor}`;

      if(!chavesItens.has(chave)){
        chavesItens.add(chave);
        itensUnicos.push(item);
      }
    });

    itensUnicos.forEach((item)=>{

      const servico = item.descricao || "Serviço";

      if(!resumo[profissional]){
        resumo[profissional] = {};
      }

      if(!resumo[profissional][servico]){
        resumo[profissional][servico] = {
          quantidade: 0,
          valor: 0,
          comissao: 0
        };
      }

      resumo[profissional][servico].quantidade += 1;
      resumo[profissional][servico].valor += Number(item.valor || 0);
      resumo[profissional][servico].comissao +=
        Number(item.valor || 0) * (Number(item.comissao_percentual || 0) / 100);

    });

  });

  area.innerHTML = "";

  Object.keys(resumo).forEach((profissional)=>{

    area.innerHTML += `<h2 style="margin:20px 0 10px;">${profissional}</h2>`;

    Object.keys(resumo[profissional]).forEach((servico)=>{

      const item = resumo[profissional][servico];

      area.innerHTML += `
        <div class="card">
          <h3>${servico}</h3>
          <p>Quantidade: ${item.quantidade}</p>
          <p>Total recebido: ${dinheiro(item.valor)}</p>
          <p>Comissão: ${dinheiro(item.comissao)}</p>
        </div>
      `;
    });
  });

  if(area.innerHTML === ""){
    area.innerHTML = "<div class='card'>Nenhum atendimento encontrado no período.</div>";
  }
}
async function abrirRelatorioPacotesVencendo(){

  document.getElementById("areaRelatorios").innerHTML = `

    <div class="card">

      <h2>Pacotes vencendo</h2>

      <label>Filtro</label>

      <select id="filtroPacoteVencendo">
        <option value="7">Vence em 7 dias</option>
        <option value="15">Vence em 15 dias</option>
        <option value="30">Vence em 30 dias</option>
        <option value="vencidos">Vencidos</option>
        <option value="todos">Todos</option>
      </select>

      <button class="principal"
        onclick="gerarRelatorioPacotesVencendo()">
        Gerar relatório
      </button>

    </div>

    <div id="resultadoPacotesVencendo"></div>

  `;
}
async function gerarRelatorioPacotesVencendo(){

  const filtro = document.getElementById("filtroPacoteVencendo").value;
  const area = document.getElementById("resultadoPacotesVencendo");

  area.innerHTML = "Carregando pacotes...";

  const hoje = new Date();
  const hojeISO = formatarDataISO(hoje);

  let dataLimite = new Date();

  if(!["vencidos", "todos"].includes(filtro)){
    dataLimite.setDate(dataLimite.getDate() + Number(filtro));
  }

  let query = supabaseClient
    .from("pacotes_clientes")
    .select(`
      *,
      clientes(nome, telefone),
      pacotes(nome),
      pacotes_saldos(
        id,
        quantidade_total,
        quantidade_usada,
        cancelado,
        servicos(nome)
      )
    `)
    .eq("ativo", true)
    .eq("status", "Ativo")
    .order("validade", { ascending:true });

  if(filtro === "vencidos"){
    query = query.lt("validade", hojeISO);
  }

  if(!["vencidos", "todos"].includes(filtro)){
    query = query.gte("validade", hojeISO).lte("validade", formatarDataISO(dataLimite));
  }

  const { data, error } = await query;

  if(error){
    area.innerHTML = "<div class='card'>Erro ao carregar pacotes vencendo.</div>";
    return;
  }

  if(!data || data.length === 0){
    area.innerHTML = "<div class='card'>Nenhum pacote encontrado.</div>";
    return;
  }

  area.innerHTML = "";

  data.forEach((pacoteCliente)=>{

    const saldos = pacoteCliente.pacotes_saldos || [];

    const saldoTexto = saldos.map(saldo=>{
      const restante =
        Number(saldo.quantidade_total || 0) -
        Number(saldo.quantidade_usada || 0);

      return `${saldo.servicos?.nome || "Serviço"}: ${restante}/${saldo.quantidade_total}`;
    }).join("<br>");

    area.innerHTML += `
      <div class="card">
        <h3>${pacoteCliente.clientes?.nome || "Cliente"}</h3>

        <p><strong>Pacote:</strong> ${pacoteCliente.pacotes?.nome || "-"}</p>
        <p><strong>Validade:</strong> ${formatarDataComanda(pacoteCliente.validade)}</p>
        <p><strong>Telefone:</strong> ${pacoteCliente.clientes?.telefone || "-"}</p>

        <p><strong>Créditos:</strong><br>${saldoTexto || "Sem saldo"}</p>

        <button onclick="abrirEstenderValidadePacote(${pacoteCliente.id}, '${pacoteCliente.validade || ""}')">
          Estender validade
        </button>
      </div>
    `;
  });
}
function abrirEstenderValidadePacote(pacoteClienteId, validadeAtual){

  abrirModal(`
    <h2>Estender validade do pacote</h2>

    <p>Validade atual: <strong>${formatarDataComanda(validadeAtual)}</strong></p>

    <label>Nova validade</label>
    <input id="novaValidadePacote" type="date" value="${validadeAtual || ""}">

    <label>Motivo/observação</label>
    <textarea id="motivoEstenderPacote"></textarea>

    <button class="principal" onclick="confirmarEstenderValidadePacote(${pacoteClienteId})">
      Salvar nova validade
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);
}

async function confirmarEstenderValidadePacote(pacoteClienteId){

  const novaValidade = document.getElementById("novaValidadePacote").value;

  if(!novaValidade){
    alert("Informe a nova validade.");
    return;
  }

  const { error } = await supabaseClient
    .from("pacotes_clientes")
    .update({
      validade: novaValidade
    })
    .eq("id", pacoteClienteId);

  if(error){
    alert("Erro ao alterar validade: " + error.message);
    return;
  }

  fecharModal();
  gerarRelatorioPacotesVencendo();

  alert("Validade atualizada com sucesso.");
}
async function abrirRelatorioClientesDevendo(){

  document.getElementById("areaRelatorios").innerHTML = `

    <div class="card">

      <h2>Clientes devendo</h2>

      <label>Filtro</label>

      <select id="filtroClientesDevendo">
        <option value="todos">Todos</option>
        <option value="abertas">Somente comandas abertas</option>
      </select>

      <button
        class="principal"
        onclick="gerarRelatorioClientesDevendo()">
        Gerar relatório
      </button>

    </div>

    <div id="resultadoClientesDevendo"></div>

  `;
}
async function gerarRelatorioClientesDevendo(){

  const area = document.getElementById("resultadoClientesDevendo");
  const filtro = document.getElementById("filtroClientesDevendo").value;

  area.innerHTML = "Carregando comandas em aberto...";

  let query = supabaseClient
    .from("comandas")
    .select(`
      *,
      clientes(nome, telefone),
      comanda_itens(descricao, valor)
    `)
    .order("data", { ascending:false });

  if(filtro === "abertas"){
    query = query.eq("status", "Aberta");
  }else{
    query = query.in("status", ["Aberta", "Em aberto"]);
  }

  const { data, error } = await query;

  if(error){
    area.innerHTML = "<div class='card'>Erro ao carregar clientes devendo.</div>";
    return;
  }

  if(!data || data.length === 0){
    area.innerHTML = "<div class='card'>Nenhuma comanda em aberto encontrada.</div>";
    return;
  }

  area.innerHTML = "";

  data.forEach((comanda)=>{

    const itens = (comanda.comanda_itens || [])
      .map(item => `${item.descricao || "Serviço"} - ${dinheiro(item.valor || 0)}`)
      .join("<br>");

    area.innerHTML += `
      <div class="card">
        <h3>${comanda.clientes?.nome || "Cliente"}</h3>

        <p><strong>Telefone:</strong> ${comanda.clientes?.telefone || "-"}</p>
        <p><strong>Data:</strong> ${formatarDataComanda(comanda.data)}</p>
        <p><strong>Serviços:</strong><br>${itens || "Sem itens"}</p>
        <p><strong>Total em aberto:</strong> ${dinheiro(comanda.total || 0)}</p>
        <p><strong>Status:</strong> ${comanda.status || "Aberta"}</p>

        <button onclick="abrirComanda(${comanda.id})">
          Abrir comanda
        </button>
      </div>
    `;

  });
}
async function abrirReceberComanda(comandaId){

  const { data: comanda, error } = await supabaseClient
    .from("comandas")
    .select(`
      *,
      clientes(nome),
      pagamentos(valor, formas_pagamento(nome))
    `)
    .eq("id", comandaId)
    .single();

  if(error || !comanda){
    alert("Erro ao abrir recebimento.");
    return;
  }

  const formasResp = await supabaseClient
    .from("formas_pagamento")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  const formas = formasResp.data || [];

  const total = Number(comanda.total || 0);
  const recebido = (comanda.pagamentos || [])
    .reduce((soma, p) => soma + Number(p.valor || 0), 0);

  const saldo = Math.max(total - recebido, 0);

  abrirModal(`
    <h2>Receber comanda #${comanda.id}</h2>

    <p><strong>Cliente:</strong> ${comanda.clientes?.nome || "-"}</p>
    <p><strong>Total:</strong> ${dinheiro(total)}</p>
    <p><strong>Recebido:</strong> ${dinheiro(recebido)}</p>
    <p><strong>Saldo:</strong> ${dinheiro(saldo)}</p>

    <label>Forma de pagamento</label>
    <select id="receberFormaPagamento">
      <option value="">Selecione</option>
      ${formas.map(f=>`
        <option value="${f.id}" data-nome="${f.nome}">
          ${f.nome}
        </option>
      `).join("")}
    </select>

    <label>Valor recebido</label>
    <input id="receberValor" type="number" value="${saldo}">

    <button class="principal" onclick="confirmarRecebimentoComanda(${comanda.id})">
      Adicionar pagamento
    </button>

    <button onclick="abrirComanda(${comanda.id})">
      Voltar
    </button>
  `);
}
async function confirmarRecebimentoComanda(comandaId){

  const formaPagamentoId = Number(document.getElementById("receberFormaPagamento").value);
  const valor = Number(document.getElementById("receberValor").value || 0);

  if(!formaPagamentoId){
    alert("Selecione a forma de pagamento.");
    return;
  }

  if(valor <= 0){
    alert("Informe um valor válido.");
    return;
  }

  const formaSelecionada =
    document.getElementById("receberFormaPagamento")
      .selectedOptions[0]
      .dataset.nome;

  const { data: comanda, error } = await supabaseClient
    .from("comandas")
    .select(`
      *,
      pagamentos(valor)
    `)
    .eq("id", comandaId)
    .single();

  if(error || !comanda){
    alert("Comanda não encontrada.");
    return;
  }

  const total = Number(comanda.total || 0);
  const recebidoAtual = (comanda.pagamentos || [])
    .reduce((soma, p) => soma + Number(p.valor || 0), 0);

  const saldoAtual = Math.max(total - recebidoAtual, 0);

  if(valor > saldoAtual){
    alert("O valor recebido não pode ser maior que o saldo em aberto.");
    return;
  }

  await supabaseClient
    .from("pagamentos")
    .insert([{
      comanda_id: comandaId,
      forma_pagamento_id: formaPagamentoId,
      valor,
      data: formatarDataISO(new Date())
    }]);

  if(formaSelecionada !== "Crédito da Cliente"){

    await registrarEntradaCaixa(
      comandaId,
      formaPagamentoId,
      valor
    );

  }

  const novoRecebido = recebidoAtual + valor;
  const novoStatus = novoRecebido >= total
    ? "Fechada"
    : "Parcial";

  await supabaseClient
    .from("comandas")
    .update({
      status: novoStatus
    })
    .eq("id", comandaId);

  alert("Pagamento adicionado.");

  abrirReceberComanda(comandaId);
}
function adicionarLinhaPagamentoFaturamento(){

  const area = document.getElementById("areaPagamentosFaturamento");

  if(!area) return;

  const primeiraLinha = area.querySelector(".linha-pagamento");

  if(!primeiraLinha) return;

  const novaLinha = primeiraLinha.cloneNode(true);

  novaLinha.querySelector(".fatFormaPagamento").value = "";
  novaLinha.querySelector(".fatValorPagamento").value = "";

  area.appendChild(novaLinha);
}
async function carregarAlertasClienteAgenda(clienteId){

  if(!clienteId) return "";

  let html = "";

  const hoje = formatarDataISO(new Date());

  const clienteResp = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("id", clienteId)
    .single();

  const cliente = clienteResp.data;

  if(cliente?.aniversario){

    const aniversario = String(cliente.aniversario).slice(5);
    const hojeMesDia = hoje.slice(5);

    if(aniversario === hojeMesDia){
      html += `
        <div class="card alerta-agenda">
          🎂 Hoje é aniversário desta cliente.
        </div>
      `;
    }

  }

  const pacotesResp = await supabaseClient
    .from("pacotes_clientes")
    .select(`
      *,
      pacotes(nome),
      pacotes_saldos(
        quantidade_total,
        quantidade_usada,
        servicos(nome)
      )
    `)
    .eq("cliente_id", clienteId)
    .eq("ativo", true)
    .eq("status", "Ativo");

  const pacotes = pacotesResp.data || [];

  pacotes.forEach((pc)=>{

    if(!pc.validade) return;

    const validade = new Date(pc.validade + "T00:00:00");
    const agora = new Date(hoje + "T00:00:00");

    const diasRestantes = Math.ceil((validade - agora) / (1000 * 60 * 60 * 24));

    if(diasRestantes >= 0 && diasRestantes <= 7){

      html += `
        <div class="card alerta-agenda">
          ⚠ Pacote vencendo em ${diasRestantes} dia(s): 
          <strong>${pc.pacotes?.nome || "Pacote"}</strong>
        </div>
      `;

    }

  });

  const comandasResp = await supabaseClient
    .from("comandas")
    .select("*")
    .eq("cliente_id", clienteId)
    .in("status", ["Aberta", "Parcial"]);

  const comandas = comandasResp.data || [];

  const totalAberto = comandas.reduce(
    (soma, c) => soma + Number(c.total || 0),
    0
  );

  if(totalAberto > 0){
    html += `
      <div class="card alerta-agenda">
        ⚠ Cliente possui comanda em aberto: 
        <strong>${dinheiro(totalAberto)}</strong>
      </div>
    `;
  }

  return html;
}
async function carregarResumoAlertasAgenda(){

  const local = document.getElementById("resumoAlertasAgenda");

  if(!local) return;

  local.innerHTML = `
    <div class="alerta-resumo" onclick="abrirCentralAlertas()">
      🔔 0 aniversários • 0 VIPs
    </div>
  `;
}
async function carregarCentralAlertasConteudo(){

  const area = document.getElementById("conteudoCentralAlertas");

  if(!area) return;

  const hoje = formatarDataISO(new Date());
  const hojeMesDia = hoje.slice(5);

  const clientesResp = await supabaseClient
    .from("clientes")
    .select("id,nome,telefone,aniversario,vip")
    .eq("ativo", true);

  const clientes = clientesResp.data || [];

  const aniversariantes = clientes.filter(c =>
    c.aniversario &&
    String(c.aniversario).slice(5) === hojeMesDia
  );

  const vips = clientes.filter(c => c.vip);

  const pacotesResp = await supabaseClient
    .from("pacotes_clientes")
    .select(`
      *,
      clientes(nome),
      pacotes(nome)
    `)
    .eq("ativo", true)
    .eq("status", "Ativo")
    .gte("validade", hoje);

  const pacotesVencendo = (pacotesResp.data || []).filter(p=>{
    const validade = new Date(p.validade + "T00:00:00");
    const agora = new Date(hoje + "T00:00:00");
    const dias = Math.ceil((validade - agora) / (1000 * 60 * 60 * 24));
    return dias <= 7;
  });

  const comandasResp = await supabaseClient
    .from("comandas")
    .select(`
      *,
      clientes(nome)
    `)
    .in("status", ["Aberta", "Parcial"]);

  const comandasAbertas = comandasResp.data || [];
  const clientesEmRisco = await buscarClientesEmRisco();

  area.innerHTML = `
    <div class="card">
      <h3>🎂 Aniversariantes de hoje</h3>
      ${aniversariantes.length ? aniversariantes.map(c=>`
        <p>${c.nome} ${c.telefone ? "• " + c.telefone : ""}</p>
      `).join("") : "<p>Nenhum aniversário hoje.</p>"}
    </div>

    <div class="card">
      <h3>⭐ Clientes VIP</h3>
      ${vips.length ? vips.map(c=>`
        <p>${c.nome} ${c.telefone ? "• " + c.telefone : ""}</p>
      `).join("") : "<p>Nenhuma cliente VIP cadastrada.</p>"}
    </div>

    <div class="card">
      <h3>📦 Pacotes vencendo em até 7 dias</h3>
      ${pacotesVencendo.length ? pacotesVencendo.map(p=>`
        <p>${p.clientes?.nome || "Cliente"} • ${p.pacotes?.nome || "Pacote"} • vence em ${formatarDataComanda(p.validade)}</p>
      `).join("") : "<p>Nenhum pacote vencendo.</p>"}
    </div>

    <div class="card">
      <h3>💰 Comandas em aberto</h3>
      ${comandasAbertas.length ? comandasAbertas.map(c=>`
        <p>${c.clientes?.nome || "Cliente"} • ${dinheiro(c.total || 0)} • ${c.status}</p>
      `).join("") : "<p>Nenhuma comanda em aberto.</p>"}
    </div>
    <div class="card">
  <h3>⚠ Clientes em risco</h3>
  ${clientesEmRisco.length ? clientesEmRisco.slice(0, 10).map(item=>`
    <p>
      ${item.cliente.nome}
      ${item.cliente.telefone ? "• " + item.cliente.telefone : ""}
      <br>
      <small>
        Última visita: ${formatarDataComanda(item.ultimaData)}
        • há ${item.diasSemVir} dias
      </small>
    </p>
  `).join("") : "<p>Nenhuma cliente em risco.</p>"}
</div>
  `;
}
async function buscarClientesEmRisco(){

  const { data: clientes } = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("ativo", true);

  const { data: comandas } = await supabaseClient
    .from("comandas")
    .select("*")
    .order("data", { ascending:false });

  const resultado = [];

  (clientes || []).forEach(cliente => {

    const ultimaComanda = (comandas || [])
      .filter(c => String(c.cliente_id) === String(cliente.id))
      .sort((a,b)=>new Date(b.data) - new Date(a.data))[0];

    if(!ultimaComanda) return;

    const diasSemVir = Math.floor(
      (new Date() - new Date(ultimaComanda.data))
      / (1000 * 60 * 60 * 24)
    );

    if(diasSemVir >= 60){

      resultado.push({
        cliente,
        diasSemVir,
        ultimaData: ultimaComanda.data
      });

    }

  });

  return resultado.sort((a,b)=>
    b.diasSemVir - a.diasSemVir
  );
}
async function carregarConfiguracoes(){

  const area = document.getElementById("areaConfiguracoes");

  if(!area) return;

  const { data } = await supabaseClient
    .from("configuracoes_sistema")
    .select("*");

  const diasRisco =
    data?.find(c => c.chave === "clientes_em_risco_dias")
      ?.valor || "60";

  const horaInicio =
    data?.find(c => c.chave === "agenda_hora_inicio")
      ?.valor || "07:00";

  const horaFim =
    data?.find(c => c.chave === "agenda_hora_fim")
      ?.valor || "20:00";

  const alturaBloco =
    data?.find(c => c.chave === "agenda_altura_bloco")
      ?.valor || "48";

  area.innerHTML = `

    <div class="card">

      <h3>Clientes em risco</h3>

      <label>
        Considerar cliente em risco após quantos dias sem retorno?
      </label>

      <input
        id="cfgClientesRiscoDias"
        type="number"
        value="${diasRisco}"
      >

    </div>

    <div class="card">

      <h3>Agenda</h3>

      <label>Horário inicial exibido</label>
      <input
        id="cfgAgendaHoraInicio"
        type="time"
        value="${horaInicio}"
      >

      <label>Horário final exibido</label>
      <input
        id="cfgAgendaHoraFim"
        type="time"
        value="${horaFim}"
      >

      <label>Altura visual dos horários</label>
      <input
        id="cfgAgendaAlturaBloco"
        type="number"
        value="${alturaBloco}"
      >

    </div>

    <div class="card">

      <button
        class="principal"
        onclick="salvarConfiguracoes()"
      >
        Salvar
      </button>

    </div>
<div class="card">

  <h3>Formas de pagamento</h3>

  <div id="listaFormasPagamentoConfig">
    Carregando formas...
  </div>

  <br>

  <label>Nova forma de pagamento</label>
  <input
    id="novaFormaPagamentoNome"
    placeholder="Ex: Voucher, Transferência, Link de pagamento"
  >

  <button
    class="principal"
    onclick="criarFormaPagamentoConfig()"
  >
    Adicionar forma
  </button>

</div>
  `;
  carregarFormasPagamentoConfig();

}

async function salvarConfiguracoes(){

  const dias =
    document.getElementById("cfgClientesRiscoDias").value;

  await supabaseClient
    .from("configuracoes_sistema")
    .update({ valor: dias })
    .eq("chave", "clientes_em_risco_dias");

  alert("Configurações salvas.");
}
async function salvarConfiguracoes(){

  const dias =
    document.getElementById("cfgClientesRiscoDias").value;

  await supabaseClient
    .from("configuracoes_sistema")
    .update({
      valor: dias
    })
    .eq("chave", "clientes_em_risco_dias");

  alert("Configurações salvas.");
}

async function carregarGestores(){

  const area = document.getElementById("areaGestores");

  if(!area) return;

  area.innerHTML = `

    <div class="card">
      <h3>Gestores e Acessos</h3>

      <button class="principal" onclick="carregarPerfisAcesso()">
        Perfis de acesso
      </button>

      <br><br>

      <button class="principal" onclick="carregarUsuariosSistema()">
        Usuários do sistema
      </button>
    </div>

  `;
}
const permissoesPadraoSistema = [

  { grupo:"Dashboard", chave:"dashboard_visualizar", nome:"Visualizar dashboard" },
  { grupo:"Agenda", chave:"agenda_visualizar", nome:"Visualizar agenda" },
  { grupo:"Agenda", chave:"agenda_adicionar", nome:"Adicionar agendamentos" },
  { grupo:"Agenda", chave:"agenda_editar", nome:"Editar agendamentos" },
  { grupo:"Agenda", chave:"agenda_excluir", nome:"Excluir agendamentos" },
  { grupo:"Agenda", chave:"agenda_faturar", nome:"Faturar atendimentos" },
  { grupo:"Agenda", chave:"agenda_recorrencia", nome:"Criar agendamentos recorrentes" },
  { grupo:"Agenda", chave:"agenda_ver_todas_profissionais", nome:"Ver agenda de todas as profissionais" },
  { grupo:"Agenda", chave:"agenda_ver_apenas_propria", nome:"Ver apenas a própria agenda" },

  { grupo:"Caixa", chave:"caixa_excluir", nome:"Excluir caixa" },

  { grupo:"Clientes", chave:"clientes_visualizar", nome:"Visualizar clientes" },
  { grupo:"Clientes", chave:"clientes_adicionar", nome:"Adicionar novos clientes" },
  { grupo:"Clientes", chave:"clientes_editar", nome:"Editar clientes" },
  { grupo:"Clientes", chave:"clientes_excluir", nome:"Excluir clientes" },
  { grupo:"Clientes", chave:"clientes_anamnese", nome:"Adicionar ficha de anamnese" },
  { grupo:"Clientes", chave:"clientes_vip", nome:"Marcar cliente VIP" },
  { grupo:"Clientes", chave:"clientes_ver_todos", nome:"Ver todos os clientes" },
{ grupo:"Clientes", chave:"clientes_ver_apenas_atendidos", nome:"Ver apenas clientes atendidos por esse profissional" },

  { grupo:"Profissionais", chave:"profissionais_visualizar", nome:"Visualizar profissionais" },
  { grupo:"Profissionais", chave:"profissionais_adicionar", nome:"Adicionar profissionais" },
  { grupo:"Profissionais", chave:"profissionais_editar", nome:"Alterar dados de profissionais" },
  { grupo:"Profissionais", chave:"profissionais_excluir", nome:"Apagar profissionais" },
  { grupo:"Profissionais", chave:"profissionais_comissao", nome:"Alterar comissões dos profissionais" },

  { grupo:"Serviços", chave:"servicos_visualizar", nome:"Visualizar serviços" },
  { grupo:"Serviços", chave:"servicos_adicionar", nome:"Adicionar serviços" },
  { grupo:"Serviços", chave:"servicos_editar", nome:"Editar serviços" },
  { grupo:"Serviços", chave:"servicos_excluir", nome:"Excluir serviços" },
  { grupo:"Serviços", chave:"servicos_comissao", nome:"Alterar comissão padrão dos serviços" },

  { grupo:"Pacotes", chave:"pacotes_visualizar", nome:"Visualizar pacotes" },
  { grupo:"Pacotes", chave:"pacotes_adicionar", nome:"Cadastrar pacotes" },
  { grupo:"Pacotes", chave:"pacotes_editar", nome:"Editar pacotes" },
  { grupo:"Pacotes", chave:"pacotes_vender", nome:"Vender pacotes" },
  { grupo:"Pacotes", chave:"pacotes_cancelar", nome:"Cancelar créditos/pacotes" },
  { grupo:"Pacotes", chave:"pacotes_estender", nome:"Estender validade de pacote" },

  { grupo:"Comandas", chave:"comandas_visualizar", nome:"Visualizar comandas" },
  { grupo:"Comandas", chave:"comandas_receber", nome:"Receber comandas" },
  { grupo:"Comandas", chave:"comandas_pagamento_parcial", nome:"Lançar pagamento parcial" },
  { grupo:"Comandas", chave:"comandas_cancelar", nome:"Cancelar comandas" },

  { grupo:"Caixa", chave:"caixa_visualizar", nome:"Visualizar caixa" },
  { grupo:"Caixa", chave:"caixa_abrir", nome:"Abrir caixa" },
  { grupo:"Caixa", chave:"caixa_fechar", nome:"Fechar caixa" },
  { grupo:"Caixa", chave:"caixa_movimentar", nome:"Lançar entradas/saídas" },
  { grupo:"Caixa", chave:"caixa_excluir", nome:"Excluir caixa" },

  { grupo:"Comissões", chave:"comissoes_visualizar", nome:"Visualizar comissões" },
  { grupo:"Comissões", chave:"comissoes_pagar", nome:"Marcar comissão como paga" },
  { grupo:"Comissões", chave:"comissoes_ver_todas", nome:"Ver comissão de todos os profissionais" },
{ grupo:"Comissões", chave:"comissoes_ver_apenas_propria", nome:"Ver apenas a própria comissão" },

  { grupo:"Relatórios", chave:"rel_profissional", nome:"Abrir relatório de atendimento por profissional" },
  { grupo:"Relatórios", chave:"rel_pacotes_vencendo", nome:"Abrir relatório de pacotes vencendo" },
  { grupo:"Relatórios", chave:"rel_vendas_geral", nome:"Abrir resumo geral de vendas" },
  { grupo:"Relatórios", chave:"rel_pacotes", nome:"Abrir resumo de pacotes" },
  { grupo:"Relatórios", chave:"rel_clientes_sumidos", nome:"Abrir relatório de clientes sumidos" },
  { grupo:"Relatórios", chave:"rel_clientes_devendo", nome:"Abrir relatório de clientes devendo" },

  { grupo:"Alertas", chave:"alertas_visualizar", nome:"Visualizar central de alertas" },
  { grupo:"Alertas", chave:"alertas_whatsapp", nome:"Enviar WhatsApp pelos alertas" },

  { grupo:"Configurações", chave:"configuracoes_visualizar", nome:"Visualizar configurações" },
  { grupo:"Configurações", chave:"configuracoes_editar", nome:"Editar configurações do sistema" },

  { grupo:"Gestores", chave:"gestores_visualizar", nome:"Visualizar gestores/acessos" },
  { grupo:"Gestores", chave:"gestores_editar", nome:"Editar permissões de acesso" },
  { grupo:"Gestores", chave:"gestores_usuarios", nome:"Criar/editar usuários do sistema" }

];

async function abrirPerfilAcesso(nomePerfil){

  const area = document.getElementById("areaGestores");

  area.innerHTML = "Carregando permissões...";

  const { data: perfil } = await supabaseClient
    .from("perfis_acesso")
    .select("*")
    .eq("nome", nomePerfil)
    .single();

  const { data: permissoes } = await supabaseClient
    .from("permissoes_acesso")
    .select("*")
    .eq("perfil_id", perfil.id);

  const grupos = {};

  permissoesPadraoSistema.forEach((item)=>{
    if(!grupos[item.grupo]){
      grupos[item.grupo] = [];
    }

    grupos[item.grupo].push(item);
  });

  let htmlPermissoes = "";

  Object.keys(grupos).forEach((grupo)=>{

    htmlPermissoes += `
      <h3 style="margin-top:22px;">${grupo}</h3>
    `;

    grupos[grupo].forEach((p)=>{

      const marcada =
        permissoes?.find(x => x.chave === p.chave)?.permitido || false;

      htmlPermissoes += `
        <label style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
          <input
            type="checkbox"
            class="permissaoPerfil"
            data-chave="${p.chave}"
            style="width:auto;height:auto;"
            ${marcada ? "checked" : ""}
          >
          ${p.nome}
        </label>
      `;
    });

  });

  area.innerHTML = `
    <div class="card">
      <h2>${nomePerfil}</h2>

      ${htmlPermissoes}

      <br>

      <button class="principal" onclick="salvarPermissoesPerfil(${perfil.id}, '${nomePerfil}')">
        Salvar permissões
      </button>

      <button onclick="carregarGestores()">
        Voltar
      </button>
    </div>
  `;
}

async function salvarPermissoesPerfil(perfilId, nomePerfil){

  const checks = document.querySelectorAll(".permissaoPerfil");

  await supabaseClient
    .from("permissoes_acesso")
    .delete()
    .eq("perfil_id", perfilId);

  const registros = Array.from(checks).map(campo=>({
    perfil_id: perfilId,
    chave: campo.dataset.chave,
    permitido: campo.checked
  }));

  await supabaseClient
    .from("permissoes_acesso")
    .insert(registros);

  alert("Permissões salvas.");

  abrirPerfilAcesso(nomePerfil);
}
async function carregarPerfisAcesso(){

  const area = document.getElementById("areaGestores");

  area.innerHTML = `

    <div class="card">
      <h3>Perfis do sistema</h3>

      <button class="principal" onclick="abrirPerfilAcesso('Dono')">Dono</button>
      <br><br>

      <button class="principal" onclick="abrirPerfilAcesso('Gestor')">Gestor</button>
      <br><br>

      <button class="principal" onclick="abrirPerfilAcesso('Recepcionista')">Recepcionista</button>
      <br><br>

      <button class="principal" onclick="abrirPerfilAcesso('Profissional')">Profissional</button>

      <br><br>

      <button onclick="carregarGestores()">Voltar</button>
    </div>

  `;
}
async function carregarUsuariosSistema(){

  const area = document.getElementById("areaGestores");

  area.innerHTML = "Carregando usuários...";

  const { data, error } = await supabaseClient
    .from("usuarios_sistema")
    .select(`
      *,
      perfis_acesso(nome)
    `)
    .order("nome");

  if(error){
    area.innerHTML = "<div class='card'>Erro ao carregar usuários.</div>";
    return;
  }

  area.innerHTML = `
    <div class="card">
      <h3>Usuários do sistema</h3>

      <button class="principal" onclick="abrirModalUsuarioSistema()">
        Novo usuário
      </button>

      <br><br>

      ${(data || []).map(usuario=>`
        <div class="linha-tabela" onclick="abrirModalUsuarioSistema(${usuario.id})">
          <span>${usuario.nome || usuario.usuario}</span>
          <span>${usuario.usuario}</span>
          <span>${usuario.perfis_acesso?.nome || usuario.cargo || "-"}</span>
        </div>
      `).join("") || "<p>Nenhum usuário cadastrado.</p>"}

      <br>

      <button onclick="carregarGestores()">Voltar</button>
    </div>
  `;
}
async function abrirModalUsuarioSistema(id = null){

  let usuario = null;

  if(id){
    const resp = await supabaseClient
      .from("usuarios_sistema")
      .select("*")
      .eq("id", id)
      .single();

    usuario = resp.data;
  }

  const perfisResp = await supabaseClient
    .from("perfis_acesso")
    .select("*")
    .order("nome");

  const perfis = perfisResp.data || [];

  abrirModal(`
    <h2>${id ? "Editar usuário" : "Novo usuário"}</h2>

    <input id="usuarioSistemaId" type="hidden" value="${usuario?.id || ""}">

    <label>Nome</label>
    <input id="usuarioSistemaNome" value="${usuario?.nome || ""}">

    <label>Usuário de login</label>
    <input id="usuarioSistemaLogin" value="${usuario?.usuario || ""}">

    <label>Senha</label>
    <input id="usuarioSistemaSenha" type="password" value="${usuario?.senha || ""}">

    <label>Perfil de acesso</label>
    <select id="usuarioSistemaPerfil">
      <option value="">Selecione</option>
      ${perfis.map(p=>`
        <option value="${p.id}" ${String(usuario?.perfil_acesso_id || "") === String(p.id) ? "selected" : ""}>
          ${p.nome}
        </option>
      `).join("")}
    </select>

    <label style="display:flex;gap:10px;align-items:center;">
      <input
        id="usuarioSistemaAtivo"
        type="checkbox"
        style="width:auto;height:auto;"
        ${usuario?.ativo !== false ? "checked" : ""}
      >
      Usuário ativo
    </label>

    <button class="principal" onclick="salvarUsuarioSistema()">
      Salvar usuário
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);
}
async function salvarUsuarioSistema(){

  const id = document.getElementById("usuarioSistemaId").value;

  const dados = {
    nome: document.getElementById("usuarioSistemaNome").value.trim(),
    usuario: document.getElementById("usuarioSistemaLogin").value.trim().toLowerCase(),
    senha: document.getElementById("usuarioSistemaSenha").value.trim(),
    perfil_acesso_id: Number(document.getElementById("usuarioSistemaPerfil").value),
    ativo: document.getElementById("usuarioSistemaAtivo").checked
  };

  if(!dados.nome){
    alert("Informe o nome do usuário.");
    return;
  }

  if(!dados.usuario){
    alert("Informe o usuário de login.");
    return;
  }

  if(!dados.senha){
    alert("Informe a senha.");
    return;
  }

  if(!dados.perfil_acesso_id){
    alert("Selecione o perfil de acesso.");
    return;
  }

  let resposta;

  if(id){
    resposta = await supabaseClient
      .from("usuarios_sistema")
      .update(dados)
      .eq("id", id);
  }else{
    resposta = await supabaseClient
      .from("usuarios_sistema")
      .insert([dados]);
  }

  if(resposta.error){
    alert("Erro ao salvar usuário: " + resposta.error.message);
    return;
  }

  fecharModal();
  carregarUsuariosSistema();

  alert("Usuário salvo com sucesso.");
}
async function carregarPermissoesUsuario(){

  permissoesUsuario = [];

  if(!usuarioLogado?.perfil_acesso_id){
    return;
  }

  const { data } = await supabaseClient
    .from("permissoes_acesso")
    .select("*")
    .eq("perfil_id", usuarioLogado.perfil_acesso_id)
    .eq("permitido", true);

  permissoesUsuario = (data || []).map(p => p.chave);
}

function temPermissao(chave){
  return true;
}
function adicionarItemPacote(){

  const area = document.getElementById("itensPacoteArea");

  if(!area) return;

  const index = area.querySelectorAll(".item-pacote").length;

  area.insertAdjacentHTML("beforeend", `
    <div class="card item-pacote" style="margin-bottom:15px;">
      <h3>Serviço ${index + 1}</h3>

      <label>Serviço</label>
      <select class="pacoteServicoItem" onchange="calcularTotalPacote()">
        <option value="">Selecione</option>
        ${(window.servicosPacoteCache || []).map(servico=>`
          <option value="${servico.id}">${servico.nome}</option>
        `).join("")}
      </select>

      <label>Quantidade de sessões</label>
      <input
        class="pacoteQuantidadeItem"
        type="number"
        min="1"
        value="1"
        oninput="calcularTotalPacote()"
      >

      <label>Valor por sessão</label>
      <input
        class="pacoteValorSessaoItem"
        type="number"
        min="0"
        value="0"
        oninput="calcularTotalPacote()"
      >
    </div>
  `);

  calcularTotalPacote();
}

function calcularTotalPacote(){

  let total = 0;

  document.querySelectorAll(".item-pacote").forEach((item)=>{

    const quantidade =
      Number(item.querySelector(".pacoteQuantidadeItem")?.value || 0);

    const valorSessao =
      Number(item.querySelector(".pacoteValorSessaoItem")?.value || 0);

    total += quantidade * valorSessao;

  });

  const campoTotal = document.getElementById("pacoteValor");

  if(campoTotal){
    campoTotal.value = total.toFixed(2);
  }
}
async function salvarFaturamentoPacote(agendamentoId){

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

  const { data: saldoPacote } = await supabaseClient
    .from("pacotes_saldos")
    .select("*")
    .eq("id", agendamento.pacote_saldo_id)
    .single();

  const valorSessao = Number(saldoPacote?.valor_sessao || 0);

  if(valorSessao <= 0){
    alert("Este pacote não possui valor por sessão cadastrado. Confira o cadastro do pacote.");
    return;
  }

  await consumirPacoteSeNecessario(agendamento);

  const percentualComissao = await buscarPercentualComissao(
    agendamento.profissional_id,
    agendamento.servico_id,
    agendamento.servicos?.comissao_padrao || 0
  );

  const comandaResp = await supabaseClient
    .from("comandas")
    .insert([{
      unidade_id: unidadeAtualId,
      agendamento_id: agendamento.id,
      cliente_id: agendamento.cliente_id,
      profissional_id: agendamento.profissional_id,
      data: agendamento.data,
      subtotal: valorSessao,
      desconto: 0,
      total: valorSessao,
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
    .from("comanda_itens")
    .insert([{
      comanda_id: comandaResp.data.id,
      servico_id: agendamento.servico_id,
      descricao: agendamento.servicos?.nome || "Serviço do pacote",
      valor: valorSessao,
      comissao_percentual: percentualComissao
    }]);

  await supabaseClient
    .from("agendamentos")
    .update({
      status: "Finalizado"
    })
    .eq("id", agendamento.id);

  fecharModal();
  carregarAgenda();

  alert("Atendimento de pacote finalizado com comissão calculada.");
}
async function cancelarAtendimentoFaturado(agendamento, comanda, motivo){

  const agora = new Date().toISOString();

  let comandasCancelar = [];

  if(comanda.faturamento_grupo_id){

    const { data: comandasGrupo } = await supabaseClient
      .from("comandas")
      .select("*")
      .eq("faturamento_grupo_id", comanda.faturamento_grupo_id);

    comandasCancelar = comandasGrupo || [];

  }else{

    comandasCancelar = [comanda];

  }

  const idsComandas = comandasCancelar.map(c => c.id);
  const idsAgendamentos = comandasCancelar
    .map(c => c.agendamento_id)
    .filter(Boolean);

  await supabaseClient
    .from("historico_cancelamentos")
    .insert([{
      tipo: "faturamento",
      referencia_id: comanda.faturamento_grupo_id || comanda.id,
      cliente_id: comanda.cliente_id,
      profissional_id: comanda.profissional_id,
      valor: comandasCancelar.reduce((soma, c)=> soma + Number(c.total || 0), 0),
      motivo,
      dados_antigos: {
        agendamento,
        comanda,
        comandas_canceladas: comandasCancelar
      }
    }]);

  if(comanda.faturamento_grupo_id){

    await supabaseClient
      .from("faturamentos_grupos")
      .update({
        status: "Cancelado",
        cancelado_em: agora,
        motivo_cancelamento: motivo
      })
      .eq("id", comanda.faturamento_grupo_id);

  }

  await supabaseClient
    .from("comandas")
    .update({
      status: "Cancelada",
      cancelada: true,
      cancelada_em: agora,
      motivo_cancelamento: motivo
    })
    .in("id", idsComandas);

  await supabaseClient
    .from("caixa_movimentacoes")
    .update({
      cancelada: true,
      cancelada_em: agora,
      motivo_cancelamento: motivo
    })
    .in("comanda_id", idsComandas);

  await supabaseClient
    .from("agendamentos")
    .update({
      status: "Cancelado"
    })
    .in("id", idsAgendamentos);
await registrarHistoricoOperacao(
  "cancelamento_faturamento",
  String(comanda.id),
  "Cancelamento de faturamento realizado",
  {
    cliente_id: comanda.cliente_id,
    valor: comanda.total,
    motivo: motivo
  }
);
  fecharModal();
  carregarAgenda();

  alert("Faturamento cancelado com histórico. Comissões, caixa e relatórios financeiros serão desconsiderados.");
}

async function carregarComissoes(){

  const lista = document.getElementById("listaComissoes");

  if(!lista) return;

  const hoje = formatarDataISO(new Date());

  lista.innerHTML = `
   <div class="comissoes-filtros">
      <div>
        <label>Data inicial</label>
        <input id="comissaoDataInicio" type="date" value="${hoje}">
      </div>

      <div>
        <label>Data final</label>
        <input id="comissaoDataFim" type="date" value="${hoje}">
      </div>

      <button class="principal" onclick="gerarComissoesPorPeriodo()">
        Gerar
      </button>
    </div>

    <div id="resultadoComissoes"></div>
  `;

  gerarComissoesPorPeriodo();
}

async function gerarComissoesPorPeriodo(){

  const area = document.getElementById("resultadoComissoes");

  if(!area) return;

  const inicio = document.getElementById("comissaoDataInicio")?.value;
  const fim = document.getElementById("comissaoDataFim")?.value;

  area.innerHTML = "Carregando comissões...";

  const { data, error } = await supabaseClient
    .from("comandas")
    .select(`
      *,
      clientes(nome),
      profissionais(nome),
      comanda_itens(descricao, valor, comissao_percentual)
    `)
    .gte("data", inicio)
    .lte("data", fim)
    .in("status", ["Fechada", "Aberta", "Parcial"])
    .neq("cancelada", true)
    .order("data", { ascending:true });

  if(error){
    area.innerHTML = "<div class='card'>Erro ao carregar comissões.</div>";
    return;
  }

  const porProfissional = {};

  (data || []).forEach((comanda)=>{

    const profissional = comanda.profissionais?.nome || "Sem profissional";
    const cliente = comanda.clientes?.nome || "Cliente não informado";

    const itensUnicos = [];
    const chaves = new Set();

    (comanda.comanda_itens || []).forEach((item)=>{

      const chave = `${comanda.id}-${item.descricao}-${item.valor}-${item.comissao_percentual}`;

      if(!chaves.has(chave)){
        chaves.add(chave);
        itensUnicos.push(item);
      }

    });

    itensUnicos.forEach((item)=>{

      if(!porProfissional[profissional]){
        porProfissional[profissional] = {
          totalComissao: 0,
          totalAtendimentos: 0,
          itens: []
        };
      }

      const valorReal = Number(item.valor || 0);
      const percentual = Number(item.comissao_percentual || 0);
      const valorComissao = valorReal * (percentual / 100);

      porProfissional[profissional].totalComissao += valorComissao;
      porProfissional[profissional].totalAtendimentos += 1;

      porProfissional[profissional].itens.push({
        data: comanda.data,
        cliente,
        servico: item.descricao || "Serviço",
        valorReal,
        percentual,
        valorComissao
      });

    });

  });

  window.comissoesPeriodoCache = porProfissional;

  const profissionais = Object.keys(porProfissional);

  if(profissionais.length === 0){
    area.innerHTML = "<div class='card'>Nenhuma comissão encontrada no período.</div>";
    return;
  }

  area.innerHTML = `
    <div class="tabela-comissoes">
      <div class="linha cabecalho">
        <span>Profissional</span>
        <span>Atendimentos</span>
        <span>Comissão total</span>
      </div>

      ${profissionais.map((profissional)=>{

        const dados = porProfissional[profissional];

        return `
          <div
            class="linha"
            style="cursor:pointer;"
            onclick="abrirPaginaDetalheComissao('${profissional.replace(/'/g, "\\'")}')"
          >
            <span>${profissional}</span>
            <span>${dados.totalAtendimentos}</span>
            <span>${dinheiro(dados.totalComissao)}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}
function abrirDetalheComissao(profissional){

  const dados = window.comissoesPeriodoCache?.[profissional];

  if(!dados) return;

  const id = `detalheComissao_${normalizarClasse(profissional)}`;
  const area = document.getElementById(id);

  if(!area) return;

  if(area.style.display === "block"){
    area.style.display = "none";
    return;
  }

  area.style.display = "block";

  const resumoServicos = {};

  dados.itens.forEach(item=>{
    if(!resumoServicos[item.servico]){
      resumoServicos[item.servico] = 0;
    }

    resumoServicos[item.servico] += 1;
  });

  area.innerHTML = `
    <div class="card" style="margin-top:10px;">

      <h3>Detalhamento de ${profissional}</h3>

      <div class="linha-tabela cabecalho">
        <span>Data</span>
        <span>Cliente</span>
        <span>Serviço</span>
        <span>Valor real</span>
        <span>Comissão</span>
      </div>

      ${dados.itens.map(item=>`
        <div class="linha-tabela">
          <span>${formatarDataComanda(item.data)}</span>
          <span>${item.cliente}</span>
          <span>${item.servico}</span>
          <span>${dinheiro(item.valorReal)}</span>
          <span>${dinheiro(item.valorComissao)}</span>
        </div>
      `).join("")}

      <br>

      <h3>Resumo final</h3>

      <p><strong>Total de serviços:</strong> ${dados.totalAtendimentos}</p>

      ${Object.keys(resumoServicos).map(servico=>`
        <p>${resumoServicos[servico]} ${servico}</p>
      `).join("")}

      <p><strong>Total de comissões:</strong> ${dinheiro(dados.totalComissao)}</p>

    </div>
  `;
}
function abrirPaginaDetalheComissao(profissional){

  const dados = window.comissoesPeriodoCache?.[profissional];

  if(!dados) return;

  mostrarTela("comissao-detalhe");

  document.getElementById("tituloComissaoDetalhe").innerText =
    `Comissões - ${profissional}`;

  const area = document.getElementById("areaComissaoDetalhe");

  const resumoServicos = {};

  dados.itens.forEach(item=>{
    if(!resumoServicos[item.servico]){
      resumoServicos[item.servico] = 0;
    }

    resumoServicos[item.servico] += 1;
  });

  area.innerHTML = `
    <div class="comissao-detalhe-grid">

      <div class="comissao-resumo-card">
        <small>Total de serviços</small>
        <strong>${dados.totalAtendimentos}</strong>
      </div>

      <div class="comissao-resumo-card">
        <small>Total de comissões</small>
        <strong>${dinheiro(dados.totalComissao)}</strong>
      </div>

      <div class="comissao-resumo-card">
        <small>Tipos de serviços</small>
        <strong>${Object.keys(resumoServicos).length}</strong>
      </div>

    </div>

    <div class="card">
      <h3>Resumo por serviço</h3>

      ${Object.keys(resumoServicos).map(servico=>`
        <p>${resumoServicos[servico]} ${servico}</p>
      `).join("")}
    </div>

    <div class="comissao-detalhe-tabela">
      <div class="linha cabecalho">
        <span>Data</span>
        <span>Cliente</span>
        <span>Serviço</span>
        <span>Valor real</span>
        <span>Comissão</span>
      </div>

      ${dados.itens.map(item=>`
        <div class="linha">
          <span>${formatarDataComanda(item.data)}</span>
          <span>${item.cliente}</span>
          <span>${item.servico}</span>
          <span>${dinheiro(item.valorReal)}</span>
          <span>${dinheiro(item.valorComissao)}</span>
        </div>
      `).join("")}
    </div>
  `;
}
function abrirOpcoesHorarioAgenda(profissionalId, horario){

  abrirModal(`
    <h2>O que deseja fazer?</h2>

    <p>Horário selecionado: <strong>${horario}</strong></p>

    <button class="principal" onclick="abrirModalAgendamento(null, '${profissionalId}', '${horario}')">
      Novo agendamento
    </button>

    <button onclick="abrirModalBloqueioAgenda(null, '${profissionalId}', '${horario}')">
      Bloquear horário
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);
}
function abrirOpcoesHorarioAgenda(profissionalId, horario){

  abrirModal(`
    <h2>O que deseja fazer?</h2>

    <p>Horário selecionado: <strong>${horario}</strong></p>

    <button class="principal" onclick="abrirModalAgendamento(null, '${profissionalId}', '${horario}')">
      Novo agendamento
    </button>

    <button onclick="abrirModalBloqueioAgenda(null, '${profissionalId}', '${horario}')">
      Bloquear horário
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);
}
async function abrirModalBloqueioAgenda(id = null, profissionalPre = "", horarioPre = ""){

  let bloqueio = null;

  if(id){
    const resp = await supabaseClient
      .from("bloqueios_agenda")
      .select("*")
      .eq("id", id)
      .single();

    bloqueio = resp.data;
  }

  const inicio = bloqueio?.horario_inicio?.slice(0,5) || horarioPre || "12:00";
  const fim = bloqueio?.horario_fim?.slice(0,5) || somarMinutosHorario(inicio, 60);

  abrirModal(`
    <h2>${id ? "Editar bloqueio" : "Bloquear horário"}</h2>

    <input id="bloqueioId" type="hidden" value="${bloqueio?.id || ""}">
    <input id="bloqueioProfissional" type="hidden" value="${bloqueio?.profissional_id || profissionalPre}">

    <label>Horário de início do bloqueio</label>
    <input id="bloqueioInicio" type="time" value="${inicio}">

    <label>Horário final do bloqueio</label>
    <input id="bloqueioFim" type="time" value="${fim}">

    <label>Descrição do bloqueio</label>
    <input
      id="bloqueioMotivo"
      value="${bloqueio?.motivo || ""}"
      placeholder="Ex: Almoço, Reunião, Folga"
    >

    <input
      id="bloqueioData"
      type="hidden"
      value="${bloqueio?.data || formatarDataISO(dataAgenda)}"
    >

    <label style="display:flex;gap:10px;align-items:center;">
      <input
        id="bloqueioRepetir"
        type="checkbox"
        style="width:auto;height:auto;"
        ${bloqueio?.recorrencia_ativa ? "checked" : ""}
      >
      Repetir bloqueio
    </label>

    <div class="form-grid-2">
      <div>
        <label>Intervalo em dias</label>
        <input
          id="bloqueioIntervalo"
          type="number"
          min="1"
          value="${bloqueio?.recorrencia_intervalo_dias || 7}"
        >
      </div>

      <div>
        <label>Repetir até</label>
        <input
          id="bloqueioRepetirAte"
          type="date"
          value="${bloqueio?.recorrencia_ate || ""}"
        >
      </div>
    </div>

    <button class="principal" onclick="salvarBloqueioAgenda()">
      Salvar bloqueio
    </button>

    ${id ? `
      <button onclick="excluirBloqueioAgenda(${id})">
        Excluir bloqueio
      </button>
    ` : ""}

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);
}

async function salvarBloqueioAgenda(){

  const id = document.getElementById("bloqueioId").value;

  const repetir = document.getElementById("bloqueioRepetir")?.checked || false;
  const repetirAte = document.getElementById("bloqueioRepetirAte")?.value || null;
  const intervalo = Number(document.getElementById("bloqueioIntervalo")?.value || 7);

  const dados = {
    unidade_id: unidadeAtualId,
    profissional_id: Number(document.getElementById("bloqueioProfissional").value),
    data: document.getElementById("bloqueioData").value,
    horario_inicio: document.getElementById("bloqueioInicio").value,
    horario_fim: document.getElementById("bloqueioFim").value,
    motivo: document.getElementById("bloqueioMotivo").value.trim(),
    ativo: true,
    recorrencia_ativa: repetir,
    recorrencia_intervalo_dias: intervalo,
    recorrencia_ate: repetirAte
  };

  if(!dados.profissional_id){
    alert("Profissional não identificado.");
    return;
  }

  if(!dados.horario_inicio || !dados.horario_fim){
    alert("Informe início e fim do bloqueio.");
    return;
  }

  if(horarioParaMinutos(dados.horario_fim) <= horarioParaMinutos(dados.horario_inicio)){
    alert("O horário final precisa ser maior que o inicial.");
    return;
  }

  let resp;

  if(id){

    resp = await supabaseClient
      .from("bloqueios_agenda")
      .update(dados)
      .eq("id", id);

  }else{

    if(repetir){
      dados.recorrencia_id = gerarIdRecorrencia();
    }

    resp = await supabaseClient
      .from("bloqueios_agenda")
      .insert([dados])
      .select()
      .single();

    if(!resp.error && repetir){
      await criarBloqueiosRecorrentes(dados);
    }

  }

  if(resp.error){
    alert("Erro ao salvar bloqueio: " + resp.error.message);
    return;
  }

  fecharModal();
  carregarAgenda();

  alert("Bloqueio salvo com sucesso.");
}
function horarioParaMinutos(horario){

  if(!horario) return 0;

  const [h, m] = String(horario)
    .slice(0,5)
    .split(":")
    .map(Number);

  return (h * 60) + m;
}
async function criarBloqueiosRecorrentes(dadosBase){

  if(!dadosBase.recorrencia_ate) return;

  const inicio = new Date(dadosBase.data + "T00:00:00");
  const fim = new Date(dadosBase.recorrencia_ate + "T00:00:00");

  let dataAtual = adicionarDias(
    inicio,
    Number(dadosBase.recorrencia_intervalo_dias || 7)
  );

  const bloqueios = [];

  while(dataAtual <= fim){

    bloqueios.push({
      ...dadosBase,
      data: formatarDataISO(dataAtual)
    });

    dataAtual = adicionarDias(
      dataAtual,
      Number(dadosBase.recorrencia_intervalo_dias || 7)
    );
  }

  if(bloqueios.length > 0){
    await supabaseClient
      .from("bloqueios_agenda")
      .insert(bloqueios);
  }
}
async function excluirBloqueioAgenda(id){

  const { data: bloqueio, error } = await supabaseClient
    .from("bloqueios_agenda")
    .select("*")
    .eq("id", id)
    .single();

  if(error || !bloqueio){
    alert("Bloqueio não encontrado.");
    return;
  }

  let modo = "unico";

  if(bloqueio.recorrencia_id){

    const escolha = prompt(
      "Este é um bloqueio recorrente.\n\nDigite:\n1 - Excluir apenas este bloqueio\n2 - Excluir este e todos os futuros"
    );

    if(escolha === "2"){
      modo = "futuros";
    }else if(escolha !== "1"){
      return;
    }

  }else{

    const confirmar = confirm("Deseja excluir este bloqueio?");
    if(!confirmar) return;

  }

  let resp;

  if(modo === "futuros"){

    resp = await supabaseClient
      .from("bloqueios_agenda")
      .update({ ativo:false })
      .eq("recorrencia_id", bloqueio.recorrencia_id)
      .gte("data", bloqueio.data);

  }else{

    resp = await supabaseClient
      .from("bloqueios_agenda")
      .update({ ativo:false })
      .eq("id", id);

  }

  if(resp.error){
    alert("Erro ao excluir bloqueio: " + resp.error.message);
    return;
  }

  fecharModal();
  carregarAgenda();

  alert("Bloqueio excluído.");
}
async function abrirFaturamentoClienteDia(agendamentoId){

  const { data: agendamentoBase, error } = await supabaseClient
    .from("agendamentos")
    .select(`
      *,
      clientes(nome),
      servicos(nome)
    `)
    .eq("id", agendamentoId)
    .single();

  if(error || !agendamentoBase){
    alert("Agendamento não encontrado.");
    return;
  }

  const { data: agendamentosDia } = await supabaseClient
    .from("agendamentos")
    .select(`
      *,
      servicos(nome, comissao_padrao),
      profissionais(nome)
    `)
    .eq("cliente_id", agendamentoBase.cliente_id)
    .eq("data", agendamentoBase.data)
    .neq("status", "Finalizado")
    .neq("status", "Cancelado")
    .order("horario");

let itens = agendamentosDia || [];

const idsAgendamentos = itens.map(item => item.id);

const comandasExistentesResp = await supabaseClient
  .from("comandas")
  .select("agendamento_id")
  .in("agendamento_id", idsAgendamentos)
  .neq("cancelada", true);

const idsJaFaturados = (comandasExistentesResp.data || [])
  .map(c => c.agendamento_id);

itens = itens.filter(item =>
  !idsJaFaturados.includes(item.id)
);

  if(itens.length === 0){
    alert("Não há serviços pendentes para faturar desta cliente neste dia.");
    return;
  }

  abrirModal(`
    <h2>Faturar cliente</h2>

    <p><strong>Cliente:</strong> ${agendamentoBase.clientes?.nome || "-"}</p>
    <p><strong>Data:</strong> ${formatarDataComanda(agendamentoBase.data)}</p>

    <br>

    <div id="listaItensFaturamentoCliente">

      ${itens.map(item=>`
        <label
          style="display:grid;grid-template-columns:30px 1fr 100px;gap:10px;align-items:center;border-bottom:1px solid #eee;padding:10px 0;"
        >
          <input
            type="checkbox"
            class="itemFaturamentoCliente"
            value="${item.id}"
            data-total="${item.usar_pacote ? 0 : Number(item.total || 0)}"
            checked
            onchange="calcularTotalFaturamentoCliente()"
            style="width:auto;height:auto;"
          >

          <span>
            <strong>${item.servicos?.nome || "Serviço"}</strong><br>
            <small>
              ${item.profissionais?.nome || "Profissional"}
              • ${formatarHorarioBonito(item.horario)}
              ${item.usar_pacote ? " • Pacote" : ""}
            </small>
          </span>

          <strong>
            ${item.usar_pacote ? dinheiro(0) : dinheiro(item.total || 0)}
          </strong>
        </label>
      `).join("")}

    </div>

    <br>

    <h3>Total: <span id="totalFaturamentoCliente">R$ 0,00</span></h3>

    <br>

    <button class="principal" onclick="confirmarFaturamentoClienteDia()">
      Continuar para pagamento
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);

  window.itensFaturamentoClienteCache = itens;

  calcularTotalFaturamentoCliente();
}

function calcularTotalFaturamentoCliente(){

  let total = 0;

  document.querySelectorAll(".itemFaturamentoCliente:checked").forEach(item=>{
    total += Number(item.dataset.total || 0);
  });

  const campo = document.getElementById("totalFaturamentoCliente");

  if(campo){
    campo.innerText = dinheiro(total);
  }
}
async function confirmarFaturamentoClienteDia(){

  const selecionados = Array.from(
    document.querySelectorAll(".itemFaturamentoCliente:checked")
  ).map(item => Number(item.value));

  if(selecionados.length === 0){
    alert("Selecione pelo menos um serviço para faturar.");
    return;
  }
  const caixa = await buscarCaixaAberto();

if(!caixa){
  alert("Não existe caixa aberto. Abra o caixa antes de faturar.");
  return;
}

  const itensSelecionados = (window.itensFaturamentoClienteCache || [])
    .filter(item => selecionados.includes(Number(item.id)));

  const totalReceber = itensSelecionados.reduce((soma, item)=>{
    return soma + (item.usar_pacote ? 0 : Number(item.total || 0));
  }, 0);

  const itensPacote = itensSelecionados.filter(item => item.usar_pacote);
  const itensPagos = itensSelecionados.filter(item => !item.usar_pacote);

  if(itensPacote.length > 0){
    for(const item of itensPacote){
      await salvarFaturamentoPacote(item.id);
    }
  }

  if(itensPagos.length === 0){
    fecharModal();
    carregarAgenda();
    alert("Atendimentos de pacote finalizados com sucesso.");
    return;
  }

  abrirModal(`
    <h2>Pagamento</h2>

    <p><strong>Total a receber:</strong> ${dinheiro(totalReceber)}</p>

    <div id="areaPagamentosFaturamento">
      <div class="linha-pagamento">
        <select class="fatFormaPagamento">
          <option value="">Forma</option>
        </select>

        <input
          class="fatValorPagamento"
          type="number"
          placeholder="Valor"
          value="${totalReceber.toFixed(2)}"
        >
      </div>
    </div>

    <button type="button" onclick="adicionarLinhaPagamentoFaturamento()">
      + Adicionar pagamento
    </button>

    <label>Finalização</label>
    <select id="fatTipoRecebimento">
      <option value="receber_agora">Receber agora</option>
      <option value="deixar_em_aberto">Deixar em aberto</option>
    </select>

    <button class="principal" onclick="salvarFaturamentoClienteDiaPago()">
      Confirmar faturamento
    </button>

    <button onclick="fecharModal()">Cancelar</button>
  `);

  window.itensFaturamentoClienteSelecionados = itensPagos;
  window.totalFaturamentoClienteSelecionado = totalReceber;

  await carregarFormasPagamentoNosSelects();
}
async function carregarFormasPagamentoNosSelects(){

  const { data } = await supabaseClient
    .from("formas_pagamento")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  const formas = data || [];

  document.querySelectorAll(".fatFormaPagamento").forEach(select=>{
    select.innerHTML = `
      <option value="">Forma</option>
      ${formas.map(f=>`
        <option value="${f.id}" data-nome="${f.nome}">
          ${f.nome}
        </option>
      `).join("")}
    `;
  });
}
async function salvarFaturamentoClienteDiaPago(){

  const botaoConfirmar = document.querySelector(
    'button[onclick="salvarFaturamentoClienteDiaPago()"]'
  );

  if(botaoConfirmar?.dataset.salvando === "true"){
    return;
  }

  if(botaoConfirmar){
    botaoConfirmar.dataset.salvando = "true";
    botaoConfirmar.disabled = true;
    botaoConfirmar.innerText = "Salvando...";
  }

  const tipoRecebimento =
    document.getElementById("fatTipoRecebimento").value;

  const itensPagos =
    window.itensFaturamentoClienteSelecionados || [];

  const totalReceber =
    Number(window.totalFaturamentoClienteSelecionado || 0);

  if(itensPagos.length === 0){
    alert("Nenhum serviço selecionado para faturar.");
    return;
  }

  const idsAgendamentos =
    itensPagos.map(item => item.id);

  const jaFaturadosResp = await supabaseClient
    .from("comandas")
    .select("id")
    .in("agendamento_id", idsAgendamentos)
    .neq("cancelada", true);

  if((jaFaturadosResp.data || []).length > 0){
    alert("Um ou mais serviços selecionados já foram faturados. Atualize a agenda e tente novamente.");

    if(botaoConfirmar){
      botaoConfirmar.dataset.salvando = "false";
      botaoConfirmar.disabled = false;
      botaoConfirmar.innerText = "Confirmar faturamento";
    }

    return;
  }

  const pagamentosInformados = Array.from(
    document.querySelectorAll(".linha-pagamento")
  ).map(linha => ({
    formaPagamentoId: Number(linha.querySelector(".fatFormaPagamento").value),
    formaNome: linha.querySelector(".fatFormaPagamento").selectedOptions[0]?.dataset.nome || "",
    valor: Number(linha.querySelector(".fatValorPagamento").value || 0)
  })).filter(p => p.formaPagamentoId && p.valor > 0);

  if(tipoRecebimento === "receber_agora"){

    if(pagamentosInformados.length === 0){
      alert("Informe pelo menos uma forma de pagamento.");

      if(botaoConfirmar){
        botaoConfirmar.dataset.salvando = "false";
        botaoConfirmar.disabled = false;
        botaoConfirmar.innerText = "Confirmar faturamento";
      }

      return;
    }

    const totalPagamentos = pagamentosInformados
      .reduce((soma, p) => soma + Number(p.valor || 0), 0);

    if(Number(totalPagamentos.toFixed(2)) !== Number(totalReceber.toFixed(2))){
      alert("A soma dos pagamentos precisa ser igual ao total selecionado.");

      if(botaoConfirmar){
        botaoConfirmar.dataset.salvando = "false";
        botaoConfirmar.disabled = false;
        botaoConfirmar.innerText = "Confirmar faturamento";
      }

      return;
    }

  }

  const primeiroItem = itensPagos[0];

  const grupoResp = await supabaseClient
    .from("faturamentos_grupos")
    .insert([{
      cliente_id: primeiroItem.cliente_id,
      data: primeiroItem.data,
      total: totalReceber,
      status: "Ativo"
    }])
    .select()
    .single();

  if(grupoResp.error){
    alert("Erro ao criar grupo de faturamento: " + grupoResp.error.message);
    return;
  }

  const grupo = grupoResp.data;

  const profissionaisUnicos = [
    ...new Set(itensPagos.map(item => item.profissional_id).filter(Boolean))
  ];

  const profissionalPrincipal =
    profissionaisUnicos.length === 1
      ? profissionaisUnicos[0]
      : null;

  const comandaResp = await supabaseClient
    .from("comandas")
    .insert([{
      unidade_id: unidadeAtualId,
      faturamento_grupo_id: grupo.id,
      agendamento_id: primeiroItem.id,
      cliente_id: primeiroItem.cliente_id,
      profissional_id: profissionalPrincipal,
      data: primeiroItem.data,
      subtotal: itensPagos.reduce((soma, item)=> soma + Number(item.valor || 0), 0),
      desconto: itensPagos.reduce((soma, item)=> soma + Number(item.desconto || 0), 0),
      total: totalReceber,
      status: tipoRecebimento === "receber_agora" ? "Fechada" : "Aberta",
      cancelada: false
    }])
    .select()
    .single();

  if(comandaResp.error){
    alert("Erro ao criar comanda: " + comandaResp.error.message);
    return;
  }

  const comanda = comandaResp.data;

  const itensComanda = [];

  for(const item of itensPagos){

    const percentualComissao = await buscarPercentualComissao(
      item.profissional_id,
      item.servico_id,
      item.servicos?.comissao_padrao || 0
    );

    itensComanda.push({
      comanda_id: comanda.id,
      servico_id: item.servico_id,
      descricao: item.servicos?.nome || "Serviço",
      valor: item.total,
      comissao_percentual: percentualComissao
    });

  }

  const itensResp = await supabaseClient
    .from("comanda_itens")
    .insert(itensComanda);

  if(itensResp.error){
    alert("Erro ao salvar itens da comanda: " + itensResp.error.message);
    return;
  }

  if(tipoRecebimento === "receber_agora"){

    for(const pagamento of pagamentosInformados){

      await supabaseClient
        .from("pagamentos")
        .insert([{
          comanda_id: comanda.id,
          forma_pagamento_id: pagamento.formaPagamentoId,
          valor: pagamento.valor,
          data: primeiroItem.data
        }]);

      if(pagamento.formaNome !== "Crédito da Cliente"){

        await registrarEntradaCaixa(
          comanda.id,
          pagamento.formaPagamentoId,
          pagamento.valor
        );

      }

    }

  }

await supabaseClient
  .from("agendamentos")
  .update({
    status: "Finalizado"
  })
  .in("id", idsAgendamentos);

  fecharModal();
  carregarAgenda();

  alert("Faturamento concluído com sucesso.");
}
function abrirReforcoCaixa(caixaId){

  abrirModal(`
    <h2>Reforço de caixa</h2>

    <label>Valor do reforço</label>
    <input id="valorReforcoCaixa" type="number" min="0" placeholder="Ex: 100">

    <label>Descrição</label>
    <input id="descricaoReforcoCaixa" value="Reforço de caixa">

    <button class="principal" onclick="salvarMovimentacaoCaixa(${caixaId}, 'Entrada')">
      Salvar reforço
    </button>

    <button onclick="fecharModal()">Cancelar</button>
  `);
}

function abrirSangriaCaixa(caixaId){

  abrirModal(`
    <h2>Sangria de caixa</h2>

    <label>Valor da sangria</label>
    <input id="valorSangriaCaixa" type="number" min="0" placeholder="Ex: 100">

    <label>Descrição</label>
    <input id="descricaoSangriaCaixa" value="Sangria de caixa">

    <button class="principal" onclick="salvarMovimentacaoCaixa(${caixaId}, 'Saída')">
      Salvar sangria
    </button>

    <button onclick="fecharModal()">Cancelar</button>
  `);
}

async function salvarMovimentacaoCaixa(caixaId, tipo){

  const valor =
    tipo === "Entrada"
      ? Number(document.getElementById("valorReforcoCaixa").value || 0)
      : Number(document.getElementById("valorSangriaCaixa").value || 0);

  const descricao =
    tipo === "Entrada"
      ? document.getElementById("descricaoReforcoCaixa").value.trim()
      : document.getElementById("descricaoSangriaCaixa").value.trim();

  if(valor <= 0){
    alert("Informe um valor maior que zero.");
    return;
  }

  const { error } = await supabaseClient
    .from("caixa_movimentacoes")
    .insert([{
      caixa_id: caixaId,
      tipo,
      descricao,
      valor
    }]);

  if(error){
    alert("Erro ao salvar movimentação: " + error.message);
    return;
  }

  await registrarHistoricoOperacao(
    tipo === "Entrada" ? "reforco_caixa" : "sangria_caixa",
    String(caixaId),
    tipo === "Entrada" ? "Reforço de caixa registrado" : "Sangria de caixa registrada",
    {
      caixa_id: caixaId,
      tipo,
      valor,
      descricao
    }
  );

  fecharModal();
  carregarCaixas();

  alert("Movimentação registrada.");
}
async function abrirFechamentoCaixa(caixaId){

  const { data: caixa } = await supabaseClient
    .from("caixas")
    .select("*")
    .eq("id", caixaId)
    .single();

  const { data: movs } = await supabaseClient
    .from("caixa_movimentacoes")
    .select("*")
    .eq("caixa_id", caixaId)
    .neq("cancelada", true);

  const movimentacoes = movs || [];

  const entradas = movimentacoes
    .filter(m => m.tipo === "Entrada")
    .reduce((soma, m) => soma + Number(m.valor || 0), 0);

  const saidas = movimentacoes
    .filter(m => m.tipo === "Saída")
    .reduce((soma, m) => soma + Number(m.valor || 0), 0);

  const esperado =
    Number(caixa?.abertura || 0) + entradas - saidas;

  abrirModal(`
    <h2>Fechar caixa</h2>

    <p><strong>Abertura:</strong> ${dinheiro(caixa?.abertura || 0)}</p>
    <p><strong>Entradas:</strong> ${dinheiro(entradas)}</p>
    <p><strong>Saídas:</strong> ${dinheiro(saidas)}</p>

    <hr>

    <p><strong>Total esperado:</strong> ${dinheiro(esperado)}</p>

    <label>Valor contado no caixa</label>
    <input id="valorFechamentoCaixa" type="number" value="${esperado.toFixed(2)}">

    <label>Observação</label>
    <textarea id="observacaoFechamentoCaixa"></textarea>

    <button class="principal" onclick="confirmarFechamentoCaixa(${caixaId}, ${esperado})">
      Confirmar fechamento
    </button>

    <button onclick="fecharModal()">Cancelar</button>
  `);
}
async function confirmarFechamentoCaixa(caixaId, esperado){

  const valorContado =
    Number(document.getElementById("valorFechamentoCaixa").value || 0);

  const observacao =
    document.getElementById("observacaoFechamentoCaixa").value.trim();

  const diferenca = valorContado - Number(esperado || 0);

  const { error } = await supabaseClient
    .from("caixas")
    .update({
      status: "Fechado",
      fechamento: valorContado,
      diferenca: diferenca,
      observacao_fechamento: observacao,
      fechado_em: new Date().toISOString()
    })
    .eq("id", caixaId);

  if(error){
    alert("Erro ao fechar caixa: " + error.message);
    return;
  }

  await registrarHistoricoOperacao(
    "fechamento_caixa",
    String(caixaId),
    "Fechamento de caixa realizado",
    {
      caixa_id: caixaId,
      valor_esperado: esperado,
      valor_contado: valorContado,
      diferenca: diferenca,
      observacao: observacao
    }
  );

  fecharModal();
  carregarCaixas();

  alert("Caixa fechado com sucesso.");
}
async function excluirCaixa(caixaId){

  if(!pode("caixa_excluir")){
    alert("Você não tem permissão para excluir caixa.");
    return;
  }

  const confirmar = confirm(
    "Deseja realmente excluir este caixa?"
  );

  if(!confirmar) return;

  const { error } = await supabaseClient
    .from("caixas")
    .update({
      status: "Excluído"
    })
    .eq("id", caixaId);

  if(error){
    alert("Erro ao excluir caixa: " + error.message);
    return;
  }

  await registrarHistoricoOperacao(
    "exclusao_caixa",
    String(caixaId),
    "Caixa excluído do sistema",
    {
      caixa_id: caixaId
    }
  );

  carregarCaixas();

  alert("Caixa excluído.");
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
    <textarea id="clienteObservacoes">${cliente?.observacoes || ""}</textarea>

    <label style="display:flex;gap:10px;align-items:center;">
      <input
        id="clienteVip"
        type="checkbox"
        style="width:auto;height:auto;"
        ${cliente?.vip ? "checked" : ""}
      >
      Cliente VIP ⭐
    </label>

    <button class="principal" onclick="salvarCliente()">
      Salvar
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);
}
function alternarDetalheCaixa(caixaId){

  const detalhe = document.getElementById(`detalheCaixa_${caixaId}`);

  if(!detalhe) return;

  detalhe.style.display =
    detalhe.style.display === "none" ? "block" : "none";
}
async function abrirCadastroClienteRapidoAgendamento(){

  abrirModal(`
    <h2>Novo cliente</h2>

    <label>Nome</label>
    <input id="clienteRapidoNome" placeholder="Nome da cliente">

    <label>Telefone</label>
    <input id="clienteRapidoTelefone" placeholder="Telefone">

    <button
      class="principal"
      onclick="salvarClienteRapidoAgendamento()"
    >
      Salvar cliente
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);

}
async function salvarClienteRapidoAgendamento(){

  const nome =
    document.getElementById("clienteRapidoNome").value.trim();

  const telefone =
    document.getElementById("clienteRapidoTelefone").value.trim();

  if(!nome){
    alert("Digite o nome da cliente.");
    return;
  }

  const { data, error } = await supabaseClient
    .from("clientes")
    .insert([{
      nome,
      telefone,
      ativo: true
    }])
    .select()
    .single();

  if(error){
    alert("Erro ao salvar cliente: " + error.message);
    return;
  }

  fecharModal();

  document.getElementById("agCliente").value = data.id;
  document.getElementById("agClienteBusca").value = data.nome;

  alert("Cliente cadastrado com sucesso.");
}
function mostrarCadastroClienteRapidoAgendamento(){

  const area = document.getElementById("areaClienteRapidoAgendamento");

  if(!area){
    alert("Área de cadastro rápido não encontrada.");
    return;
  }

  area.innerHTML = `
    <div class="card" style="margin:12px 0;">
      <h3>Cadastrar nova cliente</h3>

      <label>Nome</label>
      <input id="clienteRapidoNome" placeholder="Nome da cliente">

      <label>Telefone</label>
      <input id="clienteRapidoTelefone" placeholder="Telefone">

      <button
        class="principal"
        type="button"
        onclick="salvarClienteRapidoAgendamento()"
      >
        Salvar cliente
      </button>
    </div>
  `;
}

async function salvarClienteRapidoAgendamento(){

  const nome = document.getElementById("clienteRapidoNome")?.value.trim();
  const telefone = document.getElementById("clienteRapidoTelefone")?.value.trim();

  if(!nome){
    alert("Digite o nome da cliente.");
    return;
  }

  const { data, error } = await supabaseClient
    .from("clientes")
    .insert([{
      unidade_id: unidadeAtualId,
      nome,
      telefone,
      ativo: true
    }])
    .select()
    .single();

  if(error){
    alert("Erro ao salvar cliente: " + error.message);
    return;
  }

  document.getElementById("agCliente").value = data.id;
  document.getElementById("agClienteBusca").value = data.nome;

  const area = document.getElementById("areaClienteRapidoAgendamento");
  if(area) area.innerHTML = "";

  alert("Cliente cadastrada e selecionada.");
}
async function cancelarComandaPelaAba(comandaId){

  const { data: comanda, error } = await supabaseClient
    .from("comandas")
    .select("*")
    .eq("id", comandaId)
    .single();

  if(error || !comanda){
    alert("Comanda não encontrada.");
    return;
  }

  const motivo = prompt("Informe o motivo do cancelamento:");

  if(!motivo){
    alert("Informe o motivo do cancelamento.");
    return;
  }

  const agendamentoFake = {
    id: comanda.agendamento_id,
    cliente_id: comanda.cliente_id,
    profissional_id: comanda.profissional_id
  };

  await cancelarAtendimentoFaturado(
    agendamentoFake,
    comanda,
    motivo
  );

  carregarComandas();
}
async function registrarHistoricoOperacao(
  tipo,
  referencia,
  descricao,
  dados = {}
){

  await supabaseClient
    .from("historico_operacoes")
    .insert([{
      usuario_id: usuarioLogado?.id || null,
      usuario_nome:
        usuarioLogado?.nome ||
        usuarioLogado?.usuario ||
        "Sistema",

      tipo: tipo,
      referencia: referencia,
      descricao: descricao,
      dados: dados
    }]);

}
async function carregarDashboard(){

  const area = document.getElementById("areaDashboard");

  if(!area) return;

  area.innerHTML = "Carregando dashboard...";

  const hoje = formatarDataISO(new Date());

 const comandasResp = await supabaseClient
  .from("comandas")
  .select(`
    *,
    profissionais(nome),
    comanda_itens(valor, comissao_percentual)
  `)
  .eq("data", hoje)
  .neq("cancelada", true);

  const agendamentosResp = await supabaseClient
    .from("agendamentos")
    .select("*")
    .eq("data", hoje)
    .neq("status", "Cancelado");

  const caixaResp = await supabaseClient
    .from("caixas")
    .select("*")
    .eq("status", "Aberto")
    .maybeSingle();

  const clientesResp = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("ativo", true);
  const metasResp = await supabaseClient
  .from("metas_financeiras")
  .select("*")
  .eq("unidade_id", unidadeAtualId)
  .eq("ativo", true);

  const comandas = comandasResp.data || [];
  const agendamentos = agendamentosResp.data || [];
  const clientes = clientesResp.data || [];
  const metas = metasResp.data || [];

const metaDiaria =
  Number(metas.find(m => m.tipo === "diaria")?.valor || 0);

const metaSemanal =
  Number(metas.find(m => m.tipo === "semanal")?.valor || 0);

const metaMensal =
  Number(metas.find(m => m.tipo === "mensal")?.valor || 0);

const metaAnual =
  Number(metas.find(m => m.tipo === "anual")?.valor || 0);

  const faturamentoHoje = comandas
    .reduce((soma, c)=> soma + Number(c.total || 0), 0);
  const rankingProfissionais = {};

comandas.forEach((comanda)=>{

  const profissional =
    comanda.profissionais?.nome || "Sem profissional";

  if(!rankingProfissionais[profissional]){
    rankingProfissionais[profissional] = {
      faturamento: 0,
      atendimentos: 0,
      comissao: 0
    };
  }

  rankingProfissionais[profissional].faturamento +=
    Number(comanda.total || 0);

  rankingProfissionais[profissional].atendimentos += 1;

  (comanda.comanda_itens || []).forEach(item=>{
    rankingProfissionais[profissional].comissao +=
      Number(item.valor || 0) *
      (Number(item.comissao_percentual || 0) / 100);
  });

});

const rankingOrdenado = Object.entries(rankingProfissionais)
  .map(([nome, dados]) => ({ nome, ...dados }))
  .sort((a,b) => b.faturamento - a.faturamento);

const profissionalTop =
  rankingOrdenado[0]?.nome || "-";

const profissionalMaisAtendimentos =
  [...rankingOrdenado]
    .sort((a,b) => b.atendimentos - a.atendimentos)[0]?.nome || "-";

const comissaoHoje =
  rankingOrdenado.reduce((soma, p)=> soma + Number(p.comissao || 0), 0);

  const clientesAtendidos = agendamentos
    .filter(a => a.status === "Finalizado")
    .length;

  const totalAgenda = agendamentos.length;

  const ticketMedio =
    comandas.length > 0
      ? faturamentoHoje / comandas.length
      : 0;
  const inicioSemana = new Date();
inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());

const inicioMes = new Date();
inicioMes.setDate(1);

const inicioAno = new Date(new Date().getFullYear(), 0, 1);

async function calcularFaturamentoPeriodo(inicio, fim){
  const resp = await supabaseClient
    .from("comandas")
    .select("total")
    .gte("data", formatarDataISO(inicio))
    .lte("data", formatarDataISO(fim))
    .neq("cancelada", true);

  return (resp.data || [])
    .reduce((soma, c)=> soma + Number(c.total || 0), 0);
}

const faturamentoSemana = await calcularFaturamentoPeriodo(inicioSemana, new Date());
const faturamentoMes = await calcularFaturamentoPeriodo(inicioMes, new Date());
const faturamentoAno = await calcularFaturamentoPeriodo(inicioAno, new Date());

function porcentagemMeta(valor, meta){
  if(!meta || meta <= 0) return 0;
  return Math.min((valor / meta) * 100, 100);
}

  const clientesRisco = clientes.filter(c => {

    if(!c.ultima_visita) return false;

    const ultima = new Date(c.ultima_visita);
    const hojeData = new Date();

    const dias =
      (hojeData - ultima) / (1000 * 60 * 60 * 24);

    return dias >= 60;

  }).length;

  area.innerHTML = `

    <div class="dashboard-grid">

      <div class="dashboard-card">
        <h3>Faturamento hoje</h3>
        <strong>${dinheiro(faturamentoHoje)}</strong>
      </div>

      <div class="dashboard-card">
        <h3>Caixa</h3>
        <strong>
          ${caixaResp.data ? "ABERTO" : "FECHADO"}
        </strong>
      </div>

      <div class="dashboard-card">
        <h3>Clientes atendidas</h3>
        <strong>${clientesAtendidos}</strong>
      </div>

      <div class="dashboard-card">
        <h3>Agendamentos hoje</h3>
        <strong>${totalAgenda}</strong>
      </div>

      <div class="dashboard-card">
        <h3>Ticket médio</h3>
        <strong>${dinheiro(ticketMedio)}</strong>
      </div>
      <div class="dashboard-card">
  <h3>Profissional destaque hoje</h3>
  <strong>${profissionalTop}</strong>
</div>

<div class="dashboard-card">
  <h3>Mais atendimentos hoje</h3>
  <strong>${profissionalMaisAtendimentos}</strong>
</div>

<div class="dashboard-card">
  <h3>Comissão gerada hoje</h3>
  <strong>${dinheiro(comissaoHoje)}</strong>
</div>

      <div class="dashboard-card">
  <h3>Clientes em risco</h3>
  <strong>${clientesRisco}</strong>
</div>

<div class="dashboard-card">
  <h3>Meta diária</h3>
  <strong>${dinheiro(faturamentoHoje)} / ${dinheiro(metaDiaria)}</strong>
  <div class="barra-meta">
    <div style="width:${porcentagemMeta(faturamentoHoje, metaDiaria)}%"></div>
  </div>
</div>

<div class="dashboard-card">
  <h3>Meta semanal</h3>
  <strong>${dinheiro(faturamentoSemana)} / ${dinheiro(metaSemanal)}</strong>
  <div class="barra-meta">
    <div style="width:${porcentagemMeta(faturamentoSemana, metaSemanal)}%"></div>
  </div>
</div>

<div class="dashboard-card">
  <h3>Meta mensal</h3>
  <strong>${dinheiro(faturamentoMes)} / ${dinheiro(metaMensal)}</strong>
  <div class="barra-meta">
    <div style="width:${porcentagemMeta(faturamentoMes, metaMensal)}%"></div>
  </div>
</div>

<div class="dashboard-card">
  <h3>Meta anual</h3>
  <strong>${dinheiro(faturamentoAno)} / ${dinheiro(metaAnual)}</strong>
  <div class="barra-meta">
    <div style="width:${porcentagemMeta(faturamentoAno, metaAnual)}%"></div>
  </div>
</div>

</div>

<div class="dashboard-ranking">

  <h2>Ranking de profissionais hoje</h2>

  ${rankingOrdenado.length ? rankingOrdenado.map((p, index)=>`
    <div class="ranking-linha">
      <span>${index + 1}. ${p.nome}</span>
      <strong>${dinheiro(p.faturamento)}</strong>
      <small>${p.atendimentos} atendimento(s) • Comissão ${dinheiro(p.comissao)}</small>
    </div>
  `).join("") : "<p>Nenhum faturamento hoje.</p>"}

</div>

`;
}
async function carregarFormasPagamentoConfig(){

  const area = document.getElementById("listaFormasPagamentoConfig");

  if(!area) return;

  const { data, error } = await supabaseClient
  .from("formas_pagamento")
  .select("*")
  .order("nome");

  if(error){
    area.innerHTML = "Erro ao carregar formas de pagamento.";
    return;
  }

  area.innerHTML = "";
  const formasVisiveis = (data || []).filter(forma =>
  forma.cancelada !== true
);

 formasVisiveis.forEach((forma)=>{

    const ativo = forma.ativo === true;

    area.innerHTML += `
      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:10px;
          padding:10px;
          border:1px solid #eee;
          border-radius:10px;
          opacity:${ativo ? "1" : ".45"};
        "
      >

        <span>
          ${forma.nome}
          <small style="display:block;color:#777;">
            ${ativo ? "Ativa" : "Desativada"}
          </small>
        </span>

      <div style="display:flex;gap:8px;">
  <button onclick="toggleFormaPagamento(${forma.id})">
    ${ativo ? "Desativar" : "Ativar"}
  </button>

  <button onclick="cancelarFormaPagamento(${forma.id})">
    Cancelar
  </button>
</div>

      </div>
    `;

  });

}
async function criarFormaPagamentoConfig(){

  const nome = document.getElementById("novaFormaPagamentoNome").value.trim();

  if(!nome){
    alert("Digite um nome.");
    return;
  }

  const { error } = await supabaseClient
    .from("formas_pagamento")
    .insert([{
      nome,
      ativo: true
    }]);

  if(error){
    alert("Erro: " + error.message);
    return;
  }

  document.getElementById("novaFormaPagamentoNome").value = "";

  carregarFormasPagamentoConfig();
}
async function toggleFormaPagamento(id){

  const { data: forma, error: erroBusca } = await supabaseClient
    .from("formas_pagamento")
    .select("*")
    .eq("id", id)
    .single();

  if(erroBusca || !forma){
    alert("Forma de pagamento não encontrada.");
    return;
  }

  const { error } = await supabaseClient
    .from("formas_pagamento")
    .update({
      ativo: !forma.ativo
    })
    .eq("id", id);

  if(error){
    alert("Erro ao alterar forma de pagamento: " + error.message);
    return;
  }

  carregarFormasPagamentoConfig();
}
async function cancelarFormaPagamento(id){

  const confirmar = confirm(
    "Deseja cancelar esta forma de pagamento? Ela sairá da lista, mas o histórico financeiro será preservado."
  );

  if(!confirmar) return;

  const { error } = await supabaseClient
    .from("formas_pagamento")
    .update({
      ativo: false,
      cancelada: true,
      cancelada_em: new Date().toISOString()
    })
    .eq("id", id);

  if(error){
    alert("Erro ao cancelar forma de pagamento: " + error.message);
    return;
  }

  carregarFormasPagamentoConfig();
}
async function abrirModalCategoriaServico(){

  abrirModal(`
    <h2>Nova categoria</h2>

    <label>Nome da categoria</label>
    <input id="novaCategoriaServico">

    <button class="principal" onclick="salvarCategoriaServico()">
      Salvar
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);

}
async function salvarCategoriaServico(){

  const nome = document
    .getElementById("novaCategoriaServico")
    .value
    .trim();

  if(!nome){
    alert("Digite o nome.");
    return;
  }

  const { error } = await supabaseClient
    .from("categorias_servicos")
    .insert([{
      nome,
      ativo:true
    }]);

  if(error){
    alert("Erro: " + error.message);
    return;
  }

  fecharModal();

  alert("Categoria criada.");
}
async function carregarCategoriasServico(){

  const { data } = await supabaseClient
    .from("categorias_servicos")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  return data || [];
}
async function criarRecorrenciasAgendamentoSeguro(dadosBase){

  const repetirAte = dadosBase.recorrencia_ate;
  const intervaloDias = Number(dadosBase.recorrencia_intervalo_dias || 7);

  if(!repetirAte){
    alert("Informe até quando deseja repetir o agendamento.");
    return;
  }

  const inicio = new Date(dadosBase.data + "T00:00:00");
  const fim = new Date(repetirAte + "T00:00:00");

  if(fim <= inicio){
    alert("A data final precisa ser depois da data inicial.");
    return;
  }

  const novos = [];

  let atual = new Date(inicio);
  atual.setDate(atual.getDate() + intervaloDias);

  while(atual <= fim){

    novos.push({
      unidade_id: dadosBase.unidade_id,
      cliente_id: dadosBase.cliente_id,
      profissional_id: dadosBase.profissional_id,
      data: formatarDataISO(atual),
      horario: dadosBase.horario,
      servico_id: dadosBase.servico_id,
      duracao: dadosBase.duracao,
      valor: dadosBase.valor,
      desconto: dadosBase.desconto,
      tipo_desconto: dadosBase.tipo_desconto,
      total: dadosBase.total,
      status: "Agendado",
      observacoes: dadosBase.observacoes,
      usar_pacote: dadosBase.usar_pacote,
      pacote_cliente_id: dadosBase.pacote_cliente_id,
      pacote_saldo_id: dadosBase.pacote_saldo_id,
      recorrencia_id: dadosBase.recorrencia_id,
      recorrencia_ativa: true,
      recorrencia_frequencia: "personalizada",
      recorrencia_intervalo_dias: intervaloDias,
      recorrencia_ate: repetirAte
    });

    atual.setDate(atual.getDate() + intervaloDias);
  }

  if(novos.length === 0){
    alert("Nenhuma recorrência foi criada.");
    return;
  }

  const { error } = await supabaseClient
    .from("agendamentos")
    .insert(novos);

  if(error){
    alert("Erro ao criar recorrências: " + error.message);
    return;
  }

  alert(`${novos.length} agendamento(s) recorrente(s) criado(s).`);
}
