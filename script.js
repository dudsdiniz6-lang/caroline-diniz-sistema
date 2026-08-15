const SUPABASE_URL = "https://hndksymtlzqtbzgrvfkh.supabase.co";
const SUPABASE_KEY = "sb_publishable_F4-5yOEa-lfaK5I-arqfMg_-j9pU0N8";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioLogado = null;
let permissoesUsuario = [];
let unidadeAtualId = 1;
let dataAgenda = new Date();
let modeloAnamneseAtual = null;

const cacheSistema = {
  clientes: null,
  profissionais: null,
  servicos: null,
  formasPagamento: null,
  unidades: null
};

let assinaturaEstruturaAgenda = "";

const telasCarregadas = {
  agenda: false,
  confirmacoes: false,
  clientes: false,
  profissionais: false,
  servicos: false,
  prontuarios: false,
  pacotes: false,
  comandas: false,
  comissoes: false,
  financeiroProfissionais: false,
  configuracoes: false,
  auditoria: false
};
function invalidarTela(nome){
  if(Object.prototype.hasOwnProperty.call(telasCarregadas, nome)){
    telasCarregadas[nome] = false;
  }
}

function limparCache(nome){

  if(nome){
    cacheSistema[nome] = null;
    return;
  }

  Object.keys(cacheSistema).forEach(chave=>{
    cacheSistema[chave] = null;
  });

}
async function obterServicos(){

  if(cacheSistema.servicos){
    return cacheSistema.servicos;
  }

  const { data, error } = await supabaseClient
    .from("servicos")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  if(error){
    console.error(error);
    return [];
  }

  cacheSistema.servicos = data || [];

  return cacheSistema.servicos;
}
async function obterClientes(){

  if(cacheSistema.clientes){
    return cacheSistema.clientes;
  }

  const { data, error } = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  if(error){
    console.error(error);
    return [];
  }

  cacheSistema.clientes = data || [];

  return cacheSistema.clientes;
}

async function obterProfissionais(){

  if(cacheSistema.profissionais){
    return cacheSistema.profissionais;
  }

  const { data, error } = await supabaseClient
    .from("profissionais")
    .select("*")
    .eq("ativo", true)
    .order("ordem");

  if(error){
    console.error(error);
    return [];
  }

  cacheSistema.profissionais = data || [];

  return cacheSistema.profissionais;
}

async function obterCategorias(){

  if(cacheSistema.categorias){
    return cacheSistema.categorias;
  }

  const { data, error } = await supabaseClient
    .from("categorias_servicos")
    .select("*")
    .order("nome");

  if(error){
    console.error(error);
    return [];
  }

  cacheSistema.categorias = data || [];

  return cacheSistema.categorias;
}
async function obterFormasPagamento(){

  const { data, error } = await supabaseClient
    .from("formas_pagamento")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending:true });

  if(error){
    console.error("Erro ao buscar formas de pagamento:", error);
    return [];
  }

  cacheSistema.formasPagamento = data || [];

  return data || [];
}
function formatarDataBR(data){
  return data.toLocaleDateString("pt-BR");
}
function formatarDataISO(data){

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

async function registrarAuditoria(
  modulo,
  acao,
  tabela,
  registroId = null,
  valorAnterior = null,
  valorNovo = null,
  observacoes = null
){

  try{

    await supabaseClient.rpc(
      "registrar_auditoria_sistema",
      {
        p_usuario_id: usuarioLogado?.id || null,
        p_usuario_nome: usuarioLogado?.nome || usuarioLogado?.usuario || null,
        p_modulo: modulo,
        p_acao: acao,
        p_tabela: tabela,
        p_registro_id:
  registroId !== null && registroId !== undefined
    ? String(registroId)
    : null,
        p_valor_anterior: valorAnterior,
        p_valor_novo: valorNovo,
        p_observacoes: observacoes,
        p_dispositivo: navigator.userAgent
      }
    );

  }catch(erro){

    console.error(
      "Erro ao registrar auditoria:",
      erro
    );

  }

}
function dinheiro(valor){
  return `R$ ${Number(valor || 0).toFixed(2)}`;
}
function pode(chave){

  if(!usuarioLogado) return false;

  const usuario =
    (usuarioLogado.usuario || "").toLowerCase();

  const nome =
    (usuarioLogado.nome || "").toLowerCase();

  if(
    usuario === "duda" ||
    usuario === "eduarda" ||
    nome.includes("eduarda") ||
    nome.includes("duda")
  ){
    return true;
  }

  return permissoesUsuario.includes(chave);
}
async function gerarHashSenha(senha){
  const encoder = new TextEncoder();
  const data = encoder.encode(senha);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function fazerLogin(){

  const usuario = document.getElementById("loginUsuario").value.trim().toLowerCase();
  const senha = document.getElementById("loginSenha").value.trim();

  if(!usuario || !senha){
    alert("Digite usuário e senha.");
    return;
  }

  const senhaHash = await gerarHashSenha(senha);

  let { data, error } = await supabaseClient
    .from("usuarios_sistema")
    .select("*")
    .eq("usuario", usuario)
    .eq("senha_hash", senhaHash)
    .eq("ativo", true)
    .single();

  if(error || !data){

    const tentativaAntiga = await supabaseClient
      .from("usuarios_sistema")
      .select("*")
      .eq("usuario", usuario)
      .eq("senha", senha)
      .eq("ativo", true)
      .single();

    if(tentativaAntiga.error || !tentativaAntiga.data){
      alert("Usuário ou senha inválidos.");
      return;
    }

    data = tentativaAntiga.data;

    await supabaseClient
      .from("usuarios_sistema")
      .update({ senha_hash: senhaHash })
      .eq("id", data.id);
  }

  usuarioLogado = data;
  localStorage.setItem("usuarioLogado", JSON.stringify(data));

  await carregarPermissoesUsuario();

  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "flex";

  aplicarPermissoesMenu();

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
    aplicarPermissoesMenu();
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

async function mostrarTela(nome){

  if(nome === "dashboard" && !pode("dashboard_visualizar")){
    alert("Você não tem permissão para visualizar o dashboard.");
    return;
  }
  if(nome === "agenda" && !pode("agenda_visualizar")){
  alert("Você não tem permissão para acessar agenda.");
  return;
}
  if(nome === "confirmacoes" && !pode("agenda_visualizar")){
  alert("Você não tem permissão para acessar confirmações.");
  return;
}

if(nome === "clientes" && !pode("clientes_visualizar")){
  alert("Você não tem permissão para acessar clientes.");
  return;
}

if(nome === "profissionais" && !pode("profissionais_visualizar")){
  alert("Você não tem permissão para acessar profissionais.");
  return;
}

if(nome === "servicos" && !pode("servicos_visualizar")){
  alert("Você não tem permissão para acessar serviços.");
  return;
}

if(nome === "prontuarios" && !pode("prontuarios_visualizar")){
  alert("Você não tem permissão para acessar prontuários.");
  return;
}

if(nome === "pacotes" && !pode("pacotes_visualizar")){
  alert("Você não tem permissão para acessar pacotes.");
  return;
}

if(nome === "comissoes" && !pode("comissoes_visualizar")){
  alert("Você não tem permissão para acessar comissões.");
  return;
}
  if(nome === "financeiroProfissionais" && !pode("comissoes_visualizar")){
  alert("Você não tem permissão para acessar o financeiro dos profissionais.");
  return;
}

  if(nome === "caixa" && !pode("caixa_visualizar")){
    alert("Você não tem permissão para acessar caixa.");
    return;
  }

  if(nome === "comandas" && !pode("comandas_visualizar")){
    alert("Você não tem permissão para acessar comandas.");
    return;
  }

  if(nome === "configuracoes" && !pode("configuracoes_visualizar")){
    alert("Você não tem permissão para acessar configurações.");
    return;
  }

  if(nome === "auditoria" && !pode("auditoria_visualizar")){
    alert("Você não tem permissão para acessar auditoria.");
    return;
  }

  if(nome === "gestores" && !pode("gestores_visualizar")){
    alert("Você não tem permissão para acessar gestores.");
    return;
  }

  if(nome === "relatorios" && !pode("relatorios_visualizar")){
    alert("Você não tem permissão para acessar relatórios.");
    return;
  }

  document.querySelectorAll(".tela").forEach((tela)=>{
    tela.classList.remove("ativa");
  });

  const tela = document.getElementById(`tela-${nome}`);

  if(tela){
    tela.classList.add("ativa");
  }

if(nome === "dashboard"){
  await carregarDashboard();
}

if(nome === "agenda" && !telasCarregadas.agenda){
  await carregarAgenda();
  telasCarregadas.agenda = true;
}

if(nome === "confirmacoes" && !telasCarregadas.confirmacoes){
  await carregarConfirmacoes();
  telasCarregadas.confirmacoes = true;
}

if(nome === "clientes" && !telasCarregadas.clientes){
  await carregarClientes();
  telasCarregadas.clientes = true;
}

if(nome === "profissionais" && !telasCarregadas.profissionais){
  await carregarProfissionais();
  telasCarregadas.profissionais = true;
}

if(nome === "servicos" && !telasCarregadas.servicos){
  await carregarServicos();
  telasCarregadas.servicos = true;
}

if(nome === "prontuarios" && !telasCarregadas.prontuarios){
  await carregarProntuarios();
  telasCarregadas.prontuarios = true;
}

if(nome === "pacotes" && !telasCarregadas.pacotes){
  await carregarPacotes();
  telasCarregadas.pacotes = true;
}

if(nome === "comandas" && !telasCarregadas.comandas){
  await carregarComandas();
  telasCarregadas.comandas = true;
}

if(nome === "caixa"){
  await abrirAbaFinanceiro("caixa");
}

if(nome === "comissoes" && !telasCarregadas.comissoes){
  await carregarComissoes();
  telasCarregadas.comissoes = true;
}

if(
  nome === "financeiroProfissionais" &&
  !telasCarregadas.financeiroProfissionais
){
  await carregarFinanceiroProfissionais();
  telasCarregadas.financeiroProfissionais = true;
}

if(nome === "configuracoes" && !telasCarregadas.configuracoes){
  await carregarConfiguracoes();
  telasCarregadas.configuracoes = true;
}

if(nome === "gestores"){
  await carregarGestores();
}

if(nome === "configuracoes" && !telasCarregadas.configuracoes){
  await carregarConfiguracoes();
  telasCarregadas.configuracoes = true;
}

if(nome === "gestores"){
  await carregarGestores();
}

if(nome === "auditoria" && !telasCarregadas.auditoria){
  await carregarAuditoria();
  telasCarregadas.auditoria = true;
}

if(nome === "relatorios"){
  document.getElementById("areaRelatorios").innerHTML = "";
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

let politicasSistema = {};

async function carregarPoliticasSistema(){

  const { data, error } = await supabaseClient
    .from("politicas_sistema")
    .select("*")
    .eq("ativo", true);

  if(error){
    console.error("Erro ao carregar políticas:", error);
    politicasSistema = {};
    return;
  }

  politicasSistema = {};

  (data || []).forEach(p => {
    const chaveCompleta = `${p.modulo}.${p.chave}`;

    if(p.tipo === "boolean"){
      politicasSistema[chaveCompleta] = p.valor_boolean;
    }

    if(p.tipo === "numero"){
      politicasSistema[chaveCompleta] = Number(p.valor_numero || 0);
    }

    if(p.tipo === "texto"){
      politicasSistema[chaveCompleta] = p.valor_texto || "";
    }
  });
}

function politica(chave, valorPadrao = false){
  if(Object.prototype.hasOwnProperty.call(politicasSistema, chave)){
    return politicasSistema[chave];
  }

  return valorPadrao;
}

function politica(chave, valorPadrao = false){
  if(Object.prototype.hasOwnProperty.call(politicasSistema, chave)){
    return politicasSistema[chave];
  }

  return valorPadrao;
}
async function iniciarSistema(){

  await carregarPoliticasSistema();

  atualizarTextoDataAgenda();

  await mostrarTela("dashboard");

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

  if(!id && !pode("clientes_criar")){
    alert("Você não tem permissão para criar clientes.");
    return;
  }

  if(id && !pode("clientes_editar")){
    alert("Você não tem permissão para editar clientes.");
    return;
  }

  let clienteAntes = null;

  if(id){
    const antesResp = await supabaseClient
      .from("clientes")
      .select("*")
      .eq("id", id)
      .single();

    clienteAntes = antesResp.data || null;
  }

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
      .insert([dados])
      .select()
      .single();

  }

if(resposta.error){
  alert("Erro ao salvar cliente: " + resposta.error.message);
  return;
}

limparCache("clientes");

const clienteIdSalvo =
  id || resposta.data?.id || null;

await registrarHistoricoOperacao(
  id ? "edicao_cliente" : "criacao_cliente",
  String(clienteIdSalvo || ""),
  id ? "Cliente alterada" : "Nova cliente criada",
  {
    cliente_id: clienteIdSalvo,
    antes: clienteAntes,
    depois: dados
  }
);

await registrarAuditoria(
  "CLIENTES",
  id ? "EDIÇÃO" : "CRIAÇÃO",
  "clientes",
  clienteIdSalvo,
  clienteAntes,
  dados,
  id
    ? "Cadastro da cliente alterado"
    : "Nova cliente cadastrada"
);

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

<button onclick="abrirHistoricoCliente(${cliente.id})">
  Histórico
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
    .order("ordem");

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

        ${pode("profissionais_editar") ? `
          <button class="principal" onclick="abrirModalProfissional(${profissional.id})">
            Editar
          </button>
        ` : ""}
      </div>
    `;

  });

}
async function abrirModalProfissional(id = null){

  if(!id && !pode("profissionais_criar")){
    alert("Você não tem permissão para criar profissionais.");
    return;
  }

  if(id && !pode("profissionais_editar")){
    alert("Você não tem permissão para editar profissionais.");
    return;
  }

  let profissional = null;

  if(id){
    const resposta = await supabaseClient
      .from("profissionais")
      .select("*")
      .eq("id", id)
      .single();

    profissional = resposta.data;
  }

  const usaPadrao = profissional?.usa_comissao_padrao !== false;

  abrirModal(`
    <h2>${id ? "Editar profissional" : "Novo profissional"}</h2>

    <input
      id="profissionalId"
      type="hidden"
      value="${profissional?.id || ""}"
    >

    <label>Nome</label>
    <input
      id="profissionalNome"
      value="${profissional?.nome || ""}"
      placeholder="Nome"
    >

    <label>Telefone</label>
    <input
      id="profissionalTelefone"
      value="${profissional?.telefone || ""}"
      placeholder="Telefone"
    >

    <label>Especialidade</label>
    <input
      id="profissionalEspecialidade"
      value="${profissional?.especialidade || ""}"
      placeholder="Especialidade"
    >

    <label>Ordem na agenda</label>
    <input
      id="profissionalOrdem"
      type="number"
      value="${profissional?.ordem || 0}"
      placeholder="Ordem"
    >

    <div class="card" style="margin-top:18px;">

      <h3>Configuração de comissão</h3>

      <label style="display:flex;gap:10px;align-items:center;">
        <input
          id="profissionalUsaComissaoPadrao"
          type="checkbox"
          ${usaPadrao ? "checked" : ""}
          onchange="selecionarTipoComissaoProfissional('padrao')"
          style="width:auto;height:auto;"
        >

        Utilizar comissão padrão dos serviços
      </label>

      <label style="display:flex;gap:10px;align-items:center;">
        <input
          id="profissionalUsaComissaoPersonalizada"
          type="checkbox"
          ${!usaPadrao ? "checked" : ""}
          onchange="selecionarTipoComissaoProfissional('personalizada')"
          style="width:auto;height:auto;"
        >

        Comissão personalizada
      </label>

    </div>

   <div id="areaComissaoPersonalizada"></div>

<div class="card" style="margin-top:18px;">

  <h3>Configuração de pagamento</h3>

  <label>Tipo de pagamento</label>

  <select id="profissionalTipoPagamento">
    <option value="semanal"
      ${profissional?.tipo_pagamento=="semanal"?"selected":""}>
      Semanal
    </option>

    <option value="quinzenal"
      ${profissional?.tipo_pagamento=="quinzenal"?"selected":""}>
      Quinzenal
    </option>

    <option value="mensal"
      ${profissional?.tipo_pagamento=="mensal"?"selected":""}>
      Mensal
    </option>
  </select>

  <label>Dia do fechamento</label>

  <input
    id="profissionalDiaFechamento"
    type="number"
    min="1"
    max="31"
    value="${profissional?.dia_fechamento ?? 5}"
  >

  <label>Dias para pagamento</label>

  <input
    id="profissionalDiasPagamento"
    type="number"
    min="0"
    value="${profissional?.dias_para_pagamento ?? 0}"
  >

  <label style="display:flex;gap:10px;align-items:center;margin-top:12px;">

    <input
      id="profissionalPermiteVale"
      type="checkbox"
      style="width:auto;height:auto;"
      ${profissional?.permite_vale!==false?"checked":""}
    >

    Permitir vales
  </label>

  <label>Limite de vale</label>

  <input
    id="profissionalLimiteVale"
    type="number"
    step="0.01"
    value="${profissional?.limite_vale ?? 0}"
  >

  <label>Observações</label>

  <textarea
    id="profissionalObsPagamento"
    rows="3"
  >${profissional?.observacoes_pagamento || ""}</textarea>

</div>

<button
      class="principal"
      onclick="salvarProfissional()"
    >
      Salvar
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);

  if(!usaPadrao){
    await carregarComissoesPersonalizadasProfissional(
      profissional?.id || null
    );
  }
}

async function selecionarTipoComissaoProfissional(tipo){

  const checkboxPadrao =
    document.getElementById("profissionalUsaComissaoPadrao");

  const checkboxPersonalizada =
    document.getElementById("profissionalUsaComissaoPersonalizada");

  const area =
    document.getElementById("areaComissaoPersonalizada");

  if(!checkboxPadrao || !checkboxPersonalizada || !area) return;

  if(tipo === "padrao"){
    checkboxPadrao.checked = true;
    checkboxPersonalizada.checked = false;
    area.innerHTML = "";
    return;
  }

  checkboxPadrao.checked = false;
  checkboxPersonalizada.checked = true;

  const profissionalId = Number(
    document.getElementById("profissionalId")?.value || 0
  );

  await carregarComissoesPersonalizadasProfissional(
    profissionalId || null
  );
}
async function carregarComissoesPersonalizadasProfissional(profissionalId = null){

  const area =
    document.getElementById("areaComissaoPersonalizada");

  if(!area) return;

  area.innerHTML = "Carregando serviços...";

  const [servicosResp, categoriasResp, regrasResp] = await Promise.all([
    supabaseClient
      .from("servicos")
      .select("id, nome, categoria_id, comissao_padrao")
      .eq("ativo", true)
      .order("nome"),

    supabaseClient
      .from("categorias_servicos")
      .select("id, nome")
      .order("nome"),

    profissionalId
      ? supabaseClient
          .from("comissoes_regras")
          .select("servico_id, percentual")
          .eq("profissional_id", profissionalId)
      : Promise.resolve({ data: [], error: null })
  ]);

  if(servicosResp.error){
    console.error(servicosResp.error);
    area.innerHTML = "Erro ao carregar serviços.";
    return;
  }

  if(categoriasResp.error){
    console.error(categoriasResp.error);
    area.innerHTML = "Erro ao carregar categorias.";
    return;
  }

  const servicos = servicosResp.data || [];
  const categorias = categoriasResp.data || [];
  const regras = regrasResp.data || [];

  const nomeCategoria = {};

  categorias.forEach(categoria => {
    nomeCategoria[categoria.id] = categoria.nome;
  });

  const grupos = {};

  servicos.forEach(servico => {

    const categoria =
      nomeCategoria[servico.categoria_id] || "Sem categoria";

    if(!grupos[categoria]){
      grupos[categoria] = [];
    }

    grupos[categoria].push(servico);
  });

  area.innerHTML = `
    <div class="card" style="margin-top:15px;">

      <h3>Comissões personalizadas</h3>

      <small>
        Preencha somente os serviços com comissão diferente.
        Campos vazios continuarão usando a comissão padrão.
      </small>

      ${Object.keys(grupos).map(categoria => `

        <div style="margin-top:22px;">

          <h3 style="border-bottom:1px solid #ddd;padding-bottom:8px;">
            ${categoria}
          </h3>

          ${grupos[categoria].map(servico => {

            const regra = regras.find(item =>
              Number(item.servico_id) === Number(servico.id)
            );

            return `
              <div
                style="
                  display:grid;
                  grid-template-columns:1fr 140px;
                  gap:12px;
                  align-items:center;
                  margin-bottom:10px;
                "
              >

                <div>
                  <strong>${servico.nome}</strong><br>
                  <small>
                    Padrão: ${Number(servico.comissao_padrao || 0)}%
                  </small>
                </div>

                <input
                  id="comissaoServico_${servico.id}"
                  class="campo-comissao-personalizada"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Usar padrão"
                  value="${regra ? Number(regra.percentual) : ""}"
                >

              </div>
            `;
          }).join("")}

        </div>
      `).join("")}

    </div>
  `;
}
async function salvarProfissional(){

  const id =
    document.getElementById("profissionalId").value;

  if(!id && !pode("profissionais_criar")){
    alert("Você não tem permissão para criar profissionais.");
    return;
  }

  if(id && !pode("profissionais_editar")){
    alert("Você não tem permissão para alterar profissionais.");
    return;
  }

  const usaComissaoPadrao =
    document.getElementById(
      "profissionalUsaComissaoPadrao"
    )?.checked === true;

  const dados = {
    unidade_id: unidadeAtualId,
    nome:
      document.getElementById(
        "profissionalNome"
      ).value.trim(),

    telefone:
      document.getElementById(
        "profissionalTelefone"
      ).value.trim(),

    especialidade:
      document.getElementById(
        "profissionalEspecialidade"
      ).value.trim(),

    ordem: Number(
      document.getElementById(
        "profissionalOrdem"
      ).value || 0
    ),

    usa_comissao_padrao: usaComissaoPadrao,
   tipo_pagamento:
  document.getElementById(
    "profissionalTipoPagamento"
  ).value,

dia_fechamento:
  Number(
    document.getElementById(
      "profissionalDiaFechamento"
    ).value || 5
  ),

dias_para_pagamento:
  Number(
    document.getElementById(
      "profissionalDiasPagamento"
    ).value || 0
  ),

permite_vale:
  document.getElementById(
    "profissionalPermiteVale"
  ).checked,

limite_vale:
  Number(
    document.getElementById(
      "profissionalLimiteVale"
    ).value || 0
  ),

observacoes_pagamento:
  document.getElementById(
    "profissionalObsPagamento"
  ).value.trim(),
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
      .eq("id", id)
      .select()
      .single();

  }else{

    resposta = await supabaseClient
      .from("profissionais")
      .insert([dados])
      .select()
      .single();
  }

if(resposta.error){
  alert(
    "Erro ao salvar profissional: " +
    resposta.error.message
  );
  return;
}

limparCache("profissionais");

const profissionalIdFinal =
    Number(id || resposta.data?.id);

  try{

    await salvarComissoesPersonalizadas(
      profissionalIdFinal
    );
    limparCacheComissoesProfissional(
  profissionalIdFinal
);

  }catch(erro){

    alert(erro.message);
    return;
  }

  fecharModal();

  carregarProfissionais();
  carregarAgenda();

  alert("Profissional salvo com sucesso.");
}
let timerPesquisaServico = null;

function pesquisarServicoComAtraso(){

  clearTimeout(timerPesquisaServico);

  timerPesquisaServico = setTimeout(() => {

    carregarServicos(true);

  }, 300);

}
async function carregarServicos(mantereFoco = false){

  const lista =
    document.getElementById("listaServicos");

  if(!lista) return;

  // Guarda os filtros ANTES de recriar o HTML
  const categoriaFiltro =
    document.getElementById("filtroCategoriaServico")
      ?.value || "";

  const campoBusca =
    document.getElementById("buscaServico");

  const buscaOriginal =
    campoBusca?.value || "";

  const busca =
    buscaOriginal
      .toLowerCase()
      .trim();

  const categorias =
    await carregarCategoriasServico();

  let query = supabaseClient
    .from("servicos")
    .select(`
      *,
      categorias_servicos(nome)
    `)
    .eq("ativo", true)
    .order("nome");

  if(categoriaFiltro){
    query = query.eq(
      "categoria_id",
      Number(categoriaFiltro)
    );
  }

  const { data, error } =
    await query;

  if(error){

    console.error(
      "Erro ao carregar serviços:",
      error
    );

    lista.innerHTML = `
      <div class="card">
        Erro ao carregar serviços.
      </div>
    `;

    return;
  }

  let servicos = data || [];

  // FILTRO DA PESQUISA
  if(busca){

    servicos = servicos.filter(servico => {

      const nome =
        String(servico.nome || "")
          .toLowerCase();

      const categoria =
        String(
          servico.categorias_servicos?.nome || ""
        ).toLowerCase();

      return (
        nome.includes(busca) ||
        categoria.includes(busca)
      );

    });

  }

  // MONTA A TELA
  lista.innerHTML = `

    <div class="servicos-filtros">

      <input
        id="buscaServico"
        placeholder="Pesquisar serviço..."
        value="${buscaOriginal}"
        oninput="pesquisarServicoComAtraso()"
      >

      <select
        id="filtroCategoriaServico"
        onchange="carregarServicos()"
      >

        <option value="">
          Todas as categorias
        </option>

        ${categorias.map(cat => `
          <option
            value="${cat.id}"
            ${
              String(categoriaFiltro) ===
              String(cat.id)
                ? "selected"
                : ""
            }
          >
            ${cat.nome}
          </option>
        `).join("")}

      </select>

    </div>

    <div class="servicos-grid">

      ${
        servicos.length
          ? servicos.map(servico => `

            <div
              class="servico-card"
              onclick="abrirModalServico(${servico.id})"
            >

              <div>

                <small>
                  ${
                    servico.categorias_servicos?.nome ||
                    "Sem categoria"
                  }
                </small>

                <h3>
                  ${servico.nome}
                </h3>

              </div>

              <div class="servico-info">

                <span>
                  ${servico.duracao || 30} min
                </span>

                <strong>
                  ${dinheiro(servico.valor)}
                </strong>

                <em>
                  ${servico.comissao_padrao || 0}% comissão
                </em>

              </div>

            </div>

          `).join("")

          : `

            <div class="card">
              Nenhum serviço encontrado.
            </div>

          `
      }

    </div>
  `;


  // DEVOLVE O FOCO PARA A PESQUISA
  if(mantereFoco){

    const novoCampo =
      document.getElementById("buscaServico");

    if(novoCampo){

      novoCampo.focus();

      const tamanho =
        novoCampo.value.length;

      novoCampo.setSelectionRange(
        tamanho,
        tamanho
      );

    }

  }

}
async function abrirModalServico(id = null){

  if(!id && !pode("servicos_criar")){
    alert("Você não tem permissão para criar serviços.");
    return;
  }

  if(id && !pode("servicos_editar")){
    alert("Você não tem permissão para editar serviços.");
    return;
  }

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
  const salas = await carregarSalas();

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
<input
  id="servicoComissao"
  type="number"
  value="${servico?.comissao_padrao || 40}"
>

<label>Sala utilizada</label>

<select id="servicoSala">

  <option value="">
    Nenhuma
  </option>

  ${salas.map(sala => `
    <option
      value="${sala.id}"
      ${String(servico?.sala_id || "") === String(sala.id) ? "selected" : ""}
    >
      ${sala.nome}
    </option>
  `).join("")}

</select>

<button class="principal" onclick="salvarServico()">
      Salvar
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);

}
let resolverReajusteServico = null;

function perguntarAplicacaoReajusteServico(
  nomeServico,
  valorAntigo,
  valorNovo
){

  return new Promise(resolve => {

    resolverReajusteServico = resolve;

    abrirModal(`
      <h2>Alteração de valor</h2>

      <p>
        O valor do serviço
        <strong>${nomeServico}</strong>
        foi alterado.
      </p>

      <div
        style="
          background:#f7f7f7;
          padding:14px;
          border-radius:8px;
          margin:15px 0;
        "
      >
        <div>
          Valor anterior:
          <strong>${dinheiro(valorAntigo)}</strong>
        </div>

        <div style="margin-top:6px;">
          Novo valor:
          <strong>${dinheiro(valorNovo)}</strong>
        </div>
      </div>

      <p>
        Como deseja aplicar esta alteração?
      </p>

      <button
        class="principal"
        style="width:100%; margin-top:10px;"
        onclick="responderReajusteServico('existentes')"
      >
        Aplicar aos agendamentos já existentes
      </button>

      <button
        style="width:100%; margin-top:10px;"
        onclick="responderReajusteServico('novos')"
      >
        Aplicar somente aos novos agendamentos
      </button>

      <button
        style="width:100%; margin-top:10px;"
        onclick="responderReajusteServico(null)"
      >
        Cancelar
      </button>
    `);

  });

}

function responderReajusteServico(escolha){

  fecharModal();

  if(resolverReajusteServico){

    resolverReajusteServico(escolha);

    resolverReajusteServico = null;

  }

}

async function atualizarValorAgendamentosServico(
  servicoId,
  novoValor
){

  const hoje = formatarDataISO(new Date());

  const {
    data: agendamentos,
    error: erroBusca
  } =
    await supabaseClient
      .from("agendamentos")
      .select(`
        id,
        valor,
        desconto,
        tipo_desconto,
        total,
        usar_pacote,
        status,
        data
      `)
      .eq("servico_id", Number(servicoId))
      .gte("data", hoje)
      .neq("status", "Finalizado")
      .neq("status", "Cancelado")
      .neq("status", "Faltou");

  if(erroBusca){
    throw new Error(
      "Erro ao buscar agendamentos: " +
      erroBusca.message
    );
  }

  const agendamentosAtualizar =
    (agendamentos || []).filter(
      agendamento =>
        agendamento.usar_pacote !== true
    );

  for(const agendamento of agendamentosAtualizar){

    const desconto =
      Number(agendamento.desconto || 0);

    const tipoDesconto =
      agendamento.tipo_desconto || "valor";

    const descontoFinal =
      tipoDesconto === "porcentagem"
        ? Number(novoValor) * (desconto / 100)
        : desconto;

    const novoTotal =
      Math.max(
        Number(novoValor) - descontoFinal,
        0
      );

    const { error: erroAtualizacao } =
      await supabaseClient
        .from("agendamentos")
        .update({
          valor: Number(novoValor),
          total: Number(novoTotal.toFixed(2))
        })
        .eq("id", agendamento.id);

    if(erroAtualizacao){
      throw new Error(
        "Erro ao atualizar agendamento: " +
        erroAtualizacao.message
      );
    }

  }

  return agendamentosAtualizar.length;

}
async function salvarServico(){

  const id =
    document.getElementById(
      "servicoId"
    ).value;

  if(id && !pode("servicos_editar")){

    alert(
      "Você não tem permissão para alterar serviços."
    );

    return;

  }

  if(!id && !pode("servicos_criar")){

    alert(
      "Você não tem permissão para criar serviços."
    );

    return;

  }

  let servicoAntes = null;

  if(id){

    const antesResp =
      await supabaseClient
        .from("servicos")
        .select("*")
        .eq("id", id)
        .single();

    if(antesResp.error){

      alert(
        "Erro ao buscar o serviço: " +
        antesResp.error.message
      );

      return;

    }

    servicoAntes =
      antesResp.data || null;

  }

  const categoriaId =
    document.getElementById(
      "servicoCategoria"
    ).value;

  const dados = {

    unidade_id: unidadeAtualId,

    categoria_id: categoriaId
        ? Number(categoriaId)
        : null,

    sala_id:
        document.getElementById("servicoSala").value || null,
    nome:
      document.getElementById(
        "servicoNome"
      ).value.trim(),

    duracao:
      Number(
        document.getElementById(
          "servicoDuracao"
        ).value || 30
      ),

    valor:
      Number(
        document.getElementById(
          "servicoValor"
        ).value || 0
      ),

    comissao_padrao:
      Number(
        document.getElementById(
          "servicoComissao"
        ).value || 0
      ),

    ativo: true

  };

  if(!dados.nome){

    alert(
      "Digite o nome do serviço."
    );

    return;

  }

  let aplicacaoReajuste = null;

  const valorFoiAlterado =
    id &&
    servicoAntes &&
    Number(servicoAntes.valor || 0) !==
    Number(dados.valor || 0);

  if(valorFoiAlterado){

    aplicacaoReajuste =
      await perguntarAplicacaoReajusteServico(
        dados.nome,
        Number(servicoAntes.valor || 0),
        Number(dados.valor || 0)
      );

    if(!aplicacaoReajuste){

      abrirModalServico(
        Number(id)
      );

      return;

    }

  }

  let resposta;

  if(id){

    resposta =
      await supabaseClient
        .from("servicos")
        .update(dados)
        .eq("id", id);

  }else{

    resposta =
      await supabaseClient
        .from("servicos")
        .insert([dados])
        .select()
        .single();

  }

  if(resposta.error){

    alert(
      "Erro ao salvar serviço: " +
      resposta.error.message
    );

    return;

  }

  let quantidadeAtualizada = 0;

  if(
    id &&
    valorFoiAlterado &&
    aplicacaoReajuste === "existentes"
  ){

    try{

      quantidadeAtualizada =
        await atualizarValorAgendamentosServico(
          Number(id),
          dados.valor
        );

    }catch(erro){

      alert(
        "O serviço foi atualizado, mas ocorreu um erro " +
        "ao atualizar os agendamentos.\n\n" +
        erro.message
      );

      limparCache("servicos");

      carregarServicos();
      carregarAgenda();

      return;

    }

  }

  limparCache("servicos");

  await registrarHistoricoOperacao(
    id
      ? "edicao_servico"
      : "criacao_servico",

    String(
      id ||
      resposta.data?.id ||
      ""
    ),

    id
      ? "Serviço alterado"
      : "Novo serviço criado",

    {
      servico_id:
        id ||
        resposta.data?.id ||
        null,

      antes: servicoAntes,

      depois: dados,

      aplicacao_reajuste:
        aplicacaoReajuste,

      agendamentos_atualizados:
        quantidadeAtualizada
    }
  );

  fecharModal();

  carregarServicos();
  carregarAgenda();

  if(
    valorFoiAlterado &&
    aplicacaoReajuste === "existentes"
  ){

    alert(
      "Serviço salvo com sucesso.\n\n" +
      quantidadeAtualizada +
      " agendamento(s) futuro(s) atualizado(s)."
    );

    return;

  }

  if(
    valorFoiAlterado &&
    aplicacaoReajuste === "novos"
  ){

    alert(
      "Serviço salvo com sucesso.\n\n" +
      "Os agendamentos existentes permaneceram " +
      "com o valor anterior."
    );

    return;

  }

  alert(
    "Serviço salvo com sucesso."
  );

}
async function carregarAgenda(){

  atualizarTextoDataAgenda();

  const grade = document.getElementById("agendaGrade");
  if(!grade) return;

  grade.innerHTML = "Carregando agenda...";

  const busca =
    document.getElementById("buscaAgenda")
      ?.value
      ?.toLowerCase()
      .trim() || "";

  const dataAgendaISO = formatarDataISO(dataAgenda);

  const [
    profissionaisResultado,
    agendamentosResp,
    bloqueiosResp
  ] = await Promise.all([

    obterProfissionais(),

    supabaseClient
      .from("agendamentos")
      .select(`
        *,
        clientes(nome, telefone, vip),
        profissionais(nome),
        servicos(nome, duracao, valor)
      `)
      .eq("data", dataAgendaISO)
      .order("horario"),

    supabaseClient
      .from("bloqueios_agenda")
      .select("*")
      .eq("ativo", true)
      .eq("data", dataAgendaISO)

  ]);

  if(agendamentosResp.error){
    console.error(
      "Erro ao carregar agendamentos:",
      agendamentosResp.error
    );
  }

  if(bloqueiosResp.error){
    console.error(
      "Erro ao carregar bloqueios:",
      bloqueiosResp.error
    );
  }

  let profissionais = profissionaisResultado || [];
  let agendamentos = agendamentosResp.data || [];
  const bloqueios = bloqueiosResp.data || [];

  /*
    Busca pendências somente das clientes
    que estão agendadas na data selecionada.
  */
  const clientesIdsAgenda = [
    ...new Set(
      agendamentos
        .map(a => a.cliente_id)
        .filter(Boolean)
    )
  ];

  const pendenciasPorCliente = {};

  if(clientesIdsAgenda.length > 0){

    const {
      data: pendencias,
      error: erroPendencias
    } = await supabaseClient
      .from("financeiro_lancamentos")
      .select("cliente_id, valor")
      .eq("tipo", "PENDENCIA")
      .eq("status", "ATIVO")
      .in("cliente_id", clientesIdsAgenda);

    if(erroPendencias){
      console.error(
        "Erro ao carregar pendências:",
        erroPendencias
      );
    }

    (pendencias || []).forEach(p => {

      if(!p.cliente_id) return;

      if(!pendenciasPorCliente[p.cliente_id]){
        pendenciasPorCliente[p.cliente_id] = 0;
      }

      pendenciasPorCliente[p.cliente_id] +=
        Number(p.valor || 0);
    });
  }

  /*
    Usuário que pode visualizar somente
    a própria agenda.
  */
  if(
    pode("agenda_ver_propria") &&
    !pode("agenda_ver_todos")
  ){

    const profissionalIdUsuario =
      usuarioLogado?.profissional_id;

    profissionais = profissionais.filter(p =>
      String(p.id) === String(profissionalIdUsuario)
    );

    agendamentos = agendamentos.filter(a =>
      String(a.profissional_id) ===
      String(profissionalIdUsuario)
    );
  }

  /*
    Remove cancelados.
  */
agendamentos = agendamentos.filter(a => {

  const status = String(a.status || "")
    .trim()
    .toLowerCase();

  return status !== "cancelado" &&
         status !== "cancelada";
});

  /*
    Busca pelo nome da cliente.
  */
  if(busca){

    agendamentos = agendamentos.filter(item =>
      item.clientes?.nome
        ?.toLowerCase()
        .includes(busca)
    );
  }

  if(profissionais.length === 0){

    grade.innerHTML = `
      <div class="card">
        Cadastre profissionais para montar a agenda.
      </div>
    `;

    return;
  }

  const horarios = gerarHorariosAgenda();
  const alturaBlocoAgenda = 48;
  const alturaAgenda =
    horarios.length * alturaBlocoAgenda;

  /*
    Organiza agendamentos e bloqueios por profissional
    antes de montar o HTML.
  */
  const agendaPorProfissional = {};
  const bloqueiosPorProfissional = {};

  agendamentos.forEach(a => {

    const profissionalId =
      String(a.profissional_id);

    if(!agendaPorProfissional[profissionalId]){
      agendaPorProfissional[profissionalId] = [];
    }

    agendaPorProfissional[profissionalId].push(a);
  });

  bloqueios.forEach(b => {

    const profissionalId =
      String(b.profissional_id);

    if(!bloqueiosPorProfissional[profissionalId]){
      bloqueiosPorProfissional[profissionalId] = [];
    }

    bloqueiosPorProfissional[profissionalId].push(b);
  });

  grade.innerHTML = `
    <div class="agenda-scroll">
      <div class="agenda-profissional-wrapper">

        <div class="agenda-coluna-horarios">

          <div class="agenda-cabecalho">
            Horário
          </div>

          ${horarios.map(h => `
            <div class="agenda-horario">
              ${h}
            </div>
          `).join("")}

        </div>

        ${profissionais.map(profissional => {

          const profissionalId =
            String(profissional.id);

          const agendaProf =
            agendaPorProfissional[profissionalId] || [];

          const bloqueiosProf =
            bloqueiosPorProfissional[profissionalId] || [];

          return `
            <div class="agenda-coluna-profissional">

              <div class="agenda-cabecalho">
                ${profissional.nome}
              </div>

              <div
                class="agenda-coluna-corpo"
                style="height:${alturaAgenda}px;"
              >

                ${horarios.map(h => `
                  <div
                    class="agenda-slot"
                    onclick="
                      abrirOpcoesHorarioAgenda(
                        '${profissional.id}',
                        '${h}'
                      )
                    "
                  >
                    <span class="hora-slot">
                      ${h}
                    </span>
                  </div>
                `).join("")}

                ${bloqueiosProf.map(b => {

                  const horarioInicio =
                    String(b.horario_inicio).slice(0, 5);

                  const horarioFim =
                    String(b.horario_fim).slice(0, 5);

                  const top =
                    calcularTopAgenda(horarioInicio);

                  const inicioMin =
                    horarioParaMinutos(horarioInicio);

                  const fimMin =
                    horarioParaMinutos(horarioFim);

                  const duracao =
                    fimMin - inicioMin;

                  const altura = Math.max(
                    (duracao / 30) *
                      alturaBlocoAgenda - 6,
                    42
                  );

                  return `
                    <div
                      class="agenda-bloqueio-card"
                      style="
                        top:${top + 4}px;
                        height:${altura}px;
                      "
                      onclick="
                        event.stopPropagation();
                        abrirModalBloqueioAgenda(${b.id})
                      "
                    >
                      <strong>Bloqueado</strong>

                      <span>
                        ${b.motivo || "Indisponível"}
                      </span>

                      <small>
                        ${formatarHorarioBonito(horarioInicio)}
                        -
                        ${formatarHorarioBonito(horarioFim)}
                      </small>
                    </div>
                  `;
                }).join("")}

                ${agendaProf.map(a => {

                  const horario =
                    String(a.horario).slice(0, 5);

                  const duracao = Number(
                    a.duracao ||
                    a.servicos?.duracao ||
                    30
                  );

                  const top =
                    calcularTopAgenda(horario);

                  const altura = Math.max(
                    (duracao / 30) *
                      alturaBlocoAgenda - 6,
                    58
                  );

                  const fim =
                    somarMinutosHorario(
                      horario,
                      duracao
                    );

                  const clienteVip =
                    a.clientes?.vip === true ||
                    a.clientes?.vip === "true";

                  const valorPendencia = Number(
                    pendenciasPorCliente[a.cliente_id] || 0
                  );

                  return `
                    <div
                      class="
                        agendamento-card
                        status-${normalizarClasse(a.status)}
                      "
                      style="
                        top:${top + 4}px;
                        height:${altura}px;
                      "
                      onclick="
                        event.stopPropagation();
                        abrirModalAgendamento(${a.id})
                      "
                    >

                      ${clienteVip ? `
                        <div class="selo-vip-agenda">
                          ⭐ VIP
                        </div>
                      ` : ""}

                      ${valorPendencia > 0 ? `
                        <div
                          class="bolinha-pendencia-agenda"
                          title="Cliente possui pendência financeira: ${dinheiro(valorPendencia)}"
                        ></div>
                      ` : ""}

                      <strong>
                        ${a.recorrencia_id ? "🔁 " : ""}
                        ${a.clientes?.nome || "Cliente"}
                      </strong>

                      <span>
                        ${a.servicos?.nome || "Serviço"}
                      </span>

                      <small>
                        ${formatarHorarioBonito(horario)}
                        -
                        ${formatarHorarioBonito(fim)}
                      </small>

                      <em>
                        ${a.status || "Agendado"}
                      </em>

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
function obterConfigAgenda(){

  const horaInicio =
    localStorage.getItem("agenda_hora_inicio") || "07:00";

  const horaFim =
    localStorage.getItem("agenda_hora_fim") || "20:00";

  const alturaBloco =
    Number(localStorage.getItem("agenda_altura_bloco") || 48);

  return {
    horaInicio,
    horaFim,
    alturaBloco
  };
}
function calcularTopAgenda(horario){

  const config = obterConfigAgenda();

  const [hora, minuto] = horario.split(":").map(Number);
  const [horaInicio, minutoInicio] = config.horaInicio.split(":").map(Number);

  const inicio = horaInicio * 60 + minutoInicio;
  const atual = hora * 60 + minuto;

  return ((atual - inicio) / 30) * config.alturaBloco;
}
function gerarHorariosAgenda(){

  const config = obterConfigAgenda();

  const [horaInicial] = config.horaInicio.split(":").map(Number);
  const [horaFinal] = config.horaFim.split(":").map(Number);

  const horarios = [];

  for(let hora = horaInicial; hora <= horaFinal; hora++){

    horarios.push(`${String(hora).padStart(2,"0")}:00`);

    if(hora !== horaFinal){
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

  const clientes = await obterClientes();
  const profissionais = await obterProfissionais();
  const servicos = await obterServicos();

  let agendamento = null;

  if(id){
    const resposta = await supabaseClient
      .from("agendamentos")
      .select("*")
      .eq("id", id)
      .single();

    agendamento = resposta.data;
  }

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
   <label>Serviço</label>

<input
  id="agServicoBusca"
  placeholder="Digite para buscar o serviço..."
  value="${agendamento ? (servicos.find(s => String(s.id) === String(agendamento.servico_id))?.nome || "") : ""}"
  oninput="filtrarServicosAgendamento()"
>

<input
  id="agServico"
  type="hidden"
  value="${agendamento?.servico_id || ""}"
>

<div id="resultadoBuscaServicosAgendamento" class="resultado-busca"></div>
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

${(!id && pode("agenda_criar")) || (id && pode("agenda_editar")) ? `
  <button class="principal" onclick="salvarAgendamento()">
    Salvar
  </button>
` : ""}

${id && pode("agenda_faturar") ? `
  <button onclick="faturarAgendamento(${id})">
    Faturar
  </button>
` : ""}

${id && pode("agenda_cancelar") ? `
  <button onclick="excluirAgendamento(${id})">
    Excluir
  </button>
` : ""}

<button onclick="fecharModal()">
  Cancelar
</button>
`);
carregarServicosParaBuscaAgendamento(servicos);
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
const cacheComissoesProfissionais = {};

async function carregarCacheComissoesProfissional(profissionalId){

  if(cacheComissoesProfissionais[profissionalId]){
    return cacheComissoesProfissionais[profissionalId];
  }

  const [profissionalResp, regrasResp] = await Promise.all([
    supabaseClient
      .from("profissionais")
      .select("usa_comissao_padrao")
      .eq("id", profissionalId)
      .single(),

    supabaseClient
      .from("comissoes_regras")
      .select("servico_id, percentual")
      .eq("profissional_id", profissionalId)
  ]);

  const usaPadrao =
    profissionalResp.data?.usa_comissao_padrao !== false;

  const regras = {};

  (regrasResp.data || []).forEach(regra => {
    regras[regra.servico_id] = Number(regra.percentual || 0);
  });

  cacheComissoesProfissionais[profissionalId] = {
    usaPadrao,
    regras
  };

  return cacheComissoesProfissionais[profissionalId];
}

function limparCacheComissoesProfissional(profissionalId){

  if(profissionalId){
    delete cacheComissoesProfissionais[profissionalId];
    return;
  }

  Object.keys(cacheComissoesProfissionais).forEach(id => {
    delete cacheComissoesProfissionais[id];
  });
}
async function buscarPercentualComissao(
  profissionalId,
  servicoId,
  padrao
){

  if(!profissionalId){
    return Number(padrao || 0);
  }

  const cache = await carregarCacheComissoesProfissional(
    profissionalId
  );

  if(cache.usaPadrao){
    return Number(padrao || 0);
  }

  if(
    Object.prototype.hasOwnProperty.call(
      cache.regras,
      servicoId
    )
  ){
    return Number(cache.regras[servicoId] || 0);
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

  const { data: caixas, error: erroCaixas } = await supabaseClient
    .from("caixas")
    .select("*")
    .neq("status", "Excluído")
    .order("id", { ascending:false });

  if(erroCaixas){
    console.error("Erro ao carregar caixas:", erroCaixas);
    lista.innerHTML = "<div class='card'>Erro ao carregar caixas.</div>";
    return;
  }

  if(!caixas || caixas.length === 0){
    lista.innerHTML = "<div class='card'>Nenhum caixa encontrado.</div>";
    return;
  }

  const caixasIds = caixas.map(caixa => caixa.id);

  const { data: todasMovimentacoes, error: erroMovimentacoes } =
    await supabaseClient
      .from("caixa_movimentacoes")
      .select(`
        *,
        formas_pagamento(nome),
        comandas(
          id,
          total,
          status,
          cancelada,
          clientes(nome)
        )
      `)
      .in("caixa_id", caixasIds)
      .neq("cancelada", true);

  if(erroMovimentacoes){
    console.error(
      "Erro ao carregar movimentações dos caixas:",
      erroMovimentacoes
    );

    lista.innerHTML =
      "<div class='card'>Erro ao carregar movimentações dos caixas.</div>";

    return;
  }

  const movimentacoesPorCaixa = {};

  (todasMovimentacoes || []).forEach(movimentacao => {

    if(!movimentacoesPorCaixa[movimentacao.caixa_id]){
      movimentacoesPorCaixa[movimentacao.caixa_id] = [];
    }

    movimentacoesPorCaixa[movimentacao.caixa_id].push(movimentacao);
  });

  const htmlCaixas = caixas.map(caixa => {

    const movimentacoes = (
      movimentacoesPorCaixa[caixa.id] || []
    ).filter(m =>
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

    const totalEntradasPagamento = entradasPagamento.reduce(
      (soma, movimentacao) =>
        soma + Number(movimentacao.valor || 0),
      0
    );

    const totalReforcos = reforcos.reduce(
      (soma, movimentacao) =>
        soma + Number(movimentacao.valor || 0),
      0
    );

    const totalSangrias = sangrias.reduce(
      (soma, movimentacao) =>
        soma + Number(movimentacao.valor || 0),
      0
    );

    const totalDinheiroEntradas = entradasPagamento
      .filter(movimentacao =>
        (
          movimentacao.formas_pagamento?.nome || ""
        ).toLowerCase().includes("dinheiro")
      )
      .reduce(
        (soma, movimentacao) =>
          soma + Number(movimentacao.valor || 0),
        0
      );

    const totalDinheiro =
      Number(caixa.abertura || 0) +
      totalDinheiroEntradas +
      totalReforcos -
      totalSangrias;

    const totalTodasFormas =
      totalEntradasPagamento +
      totalReforcos -
      totalSangrias;

    const porForma = {};

    entradasPagamento.forEach(movimentacao => {

      const forma =
        movimentacao.formas_pagamento?.nome ||
        "Forma não informada";

      if(!porForma[forma]){
        porForma[forma] = {
          total: 0,
          itens: []
        };
      }

      porForma[forma].total += Number(
        movimentacao.valor || 0
      );

      porForma[forma].itens.push({
        cliente:
          movimentacao.comandas?.clientes?.nome ||
          "Cliente não informado",

        valor: Number(movimentacao.valor || 0)
      });
    });

    return `
      <div class="caixa-card">

        <div
          class="caixa-resumo-topo"
          onclick="alternarDetalheCaixa(${caixa.id})"
        >
          <div>
            <h3>
              Caixa ${formatarDataComanda(caixa.data)}
            </h3>

            <small>
              ${caixa.status}
              •
              ${caixa.aberto_por || "Usuário não informado"}
            </small>
          </div>
        </div>

        <div class="caixa-acoes">

          ${caixa.status === "Aberto" ? `

            ${pode("caixa_reforco") ? `
              <button
                class="principal"
                onclick="abrirReforcoCaixa(${caixa.id})"
              >
                Reforço
              </button>
            ` : ""}

            ${pode("caixa_sangria") ? `
              <button
                onclick="abrirSangriaCaixa(${caixa.id})"
              >
                Sangria
              </button>
            ` : ""}

            ${pode("caixa_fechar") ? `
              <button
                onclick="abrirFechamentoCaixa(${caixa.id})"
              >
                Fechar caixa
              </button>
            ` : ""}

          ` : ""}

          ${pode("caixa_excluir") ? `
            <button
              onclick="excluirCaixa(${caixa.id})"
            >
              Excluir caixa
            </button>
          ` : ""}

        </div>

        <div
          id="detalheCaixa_${caixa.id}"
          class="caixa-detalhe"
        >

          <h3>Abertura do caixa</h3>

          <div class="caixa-linha">
            <span>Valor de abertura</span>
            <strong>
              ${dinheiro(caixa.abertura || 0)}
            </strong>
          </div>

          <h3>Entradas por forma de pagamento</h3>

          ${
            Object.keys(porForma).length
              ? Object.keys(porForma).map(forma => `
                  <div style="margin-bottom:18px;">

                    <div class="caixa-linha">
                      <strong>${forma}</strong>
                      <strong>
                        ${dinheiro(porForma[forma].total)}
                      </strong>
                    </div>

                    ${
                      porForma[forma].itens.map(item => `
                        <div class="caixa-linha">
                          <small>${item.cliente}</small>
                          <span>${dinheiro(item.valor)}</span>
                        </div>
                      `).join("")
                    }

                  </div>
                `).join("")
              : "<p>Nenhuma entrada de pagamento registrada.</p>"
          }

          <h3>Reforço</h3>

          ${
            reforcos.length
              ? reforcos.map(movimentacao => `
                  <div class="caixa-linha">
                    <span>
                      ${
                        movimentacao.descricao ||
                        "Reforço de caixa"
                      }
                    </span>

                    <strong>
                      ${dinheiro(movimentacao.valor)}
                    </strong>
                  </div>
                `).join("")
              : "<p>Nenhum reforço registrado.</p>"
          }

          <h3>Sangria</h3>

          ${
            sangrias.length
              ? sangrias.map(movimentacao => `
                  <div class="caixa-linha">
                    <span>
                      ${
                        movimentacao.descricao ||
                        "Sangria de caixa"
                      }
                    </span>

                    <strong>
                      ${dinheiro(movimentacao.valor)}
                    </strong>
                  </div>
                `).join("")
              : "<p>Nenhuma sangria registrada.</p>"
          }

          <h3>Resumo final</h3>

          <div class="caixa-linha">
            <span>Total em dinheiro</span>
            <strong>${dinheiro(totalDinheiro)}</strong>
          </div>

          <div class="caixa-linha">
            <span>Total todas as formas de pagamento</span>
            <strong>
              ${dinheiro(totalTodasFormas)}
            </strong>
          </div>

          ${caixa.status === "Fechado" ? `

            <div class="caixa-linha">
              <span>Fechamento informado</span>
              <strong>
                ${dinheiro(caixa.fechamento || 0)}
              </strong>
            </div>

            <div class="caixa-linha">
              <span>Diferença</span>
              <strong>
                ${dinheiro(caixa.diferenca || 0)}
              </strong>
            </div>

            ${
              usuarioLogado?.perfil === "dono" ||
              pode("caixa_reabrir")
                ? `
                  <button
                    onclick="reabrirCaixa(${caixa.id})"
                  >
                    Reabrir caixa
                  </button>
                `
                : ""
            }

          ` : ""}

        </div>

      </div>
    `;
  }).join("");

  lista.innerHTML = htmlCaixas;
}
async function abrirCaixa(){
  if(!pode("caixa_abrir")){
  alert("Você não tem permissão para abrir caixa.");
  return;
}

  const caixaAberto = await buscarCaixaAberto();

  if(caixaAberto){
    alert("Já existe um caixa aberto. Feche o caixa atual antes de abrir outro.");
    return;
  }

  abrirModal(`
    <h2>Abrir caixa</h2>

    <label>Valor de abertura</label>
    <input
      id="valorAberturaCaixa"
      type="number"
      min="0.01"
      step="0.01"
      placeholder="Ex: 300"
    >

    <button class="principal" onclick="confirmarAberturaCaixa()">
      Confirmar abertura
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);
}
async function buscarCaixaAberto(){

  const { data, error } = await supabaseClient
    .from("caixas")
    .select("*")
    .eq("status", "Aberto")
    .eq("aberto_por_usuario_id", usuarioLogado?.id)
    .order("id", { ascending:false })
    .limit(1)
    .maybeSingle();

  if(error){
    console.error("Erro ao buscar caixa aberto:", error);
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

  if(!id && !pode("pacotes_criar")){
    alert("Você não tem permissão para criar pacotes.");
    return;
  }

  if(id && !pode("pacotes_editar")){
    alert("Você não tem permissão para editar pacotes.");
    return;
  }

const servicos = await obterServicos();

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
  if(!pode("pacotes_criar")){
  alert("Você não tem permissão para criar ou editar pacotes.");
  return;
}

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

  const clientes = await obterClientes();
  const formas = await obterFormasPagamento();

  const pacoteResp = await supabaseClient
    .from("pacotes")
    .select("*")
    .eq("id", pacoteId)
    .single();

  if(pacoteResp.error || !pacoteResp.data){
    console.error("Erro ao carregar pacote:", pacoteResp.error);
    alert("Não foi possível carregar este pacote.");
    return;
  }

  const itemResp = await supabaseClient
    .from("pacote_itens")
    .select(`
      id,
      pacote_id,
      servico_id,
      quantidade,
      servicos(nome)
    `)
    .eq("pacote_id", pacoteId);

  if(itemResp.error){
    console.error("Erro ao carregar itens:", itemResp.error);
    alert("Não foi possível carregar os serviços do pacote.");
    return;
  }

  const pacote = pacoteResp.data;
  const itens = itemResp.data || [];

  const descricaoItens = itens.length
    ? itens.map(item => `
        <div>
          ${item.servicos?.nome || "Serviço"}
          • ${item.quantidade || 0} sessões
        </div>
      `).join("")
    : `
        <div>
          Nenhum serviço cadastrado neste pacote.
        </div>
      `;

  abrirModal(`
    <h2>Vender pacote</h2>

    <p>
      <strong>${pacote.nome}</strong>
    </p>

    <div>
      ${descricaoItens}
    </div>

    <p>
      Valor:
      <strong>${dinheiro(pacote.valor)}</strong>
    </p>

    <label>Cliente</label>

    <select id="vendaPacoteCliente">
      <option value="">Selecione</option>

      ${(clientes || []).map(c => `
        <option value="${c.id}">
          ${c.nome}
        </option>
      `).join("")}
    </select>

    <label>Tipo de recebimento</label>

    <select
      id="vendaPacoteTipoRecebimento"
      onchange="alterarTipoRecebimentoPacote()"
    >
      <option value="receber_agora">
        Receber agora
      </option>

      <option value="a_receber">
        Anotar para pagar depois
      </option>
    </select>

    <div id="areaPagamentoVendaPacote">

      <label>Forma de pagamento</label>

      <select id="vendaPacoteForma">
        <option value="">Selecione</option>

        ${(formas || []).map(f => `
          <option
            value="${f.id}"
            data-nome="${f.nome}"
          >
            ${f.nome}
          </option>
        `).join("")}
      </select>

    </div>

    <button
      type="button"
      class="principal"
      onclick="confirmarVendaPacote(${pacote.id})"
    >
      Confirmar venda
    </button>

    <button
      type="button"
      onclick="fecharModal()"
    >
      Cancelar
    </button>
  `);
}
function alterarTipoRecebimentoPacote(){

  const tipo =
    document.getElementById("vendaPacoteTipoRecebimento")?.value;

  const area =
    document.getElementById("areaPagamentoVendaPacote");

  if(!area) return;

  area.style.display =
    tipo === "receber_agora"
      ? "block"
      : "none";
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
async function confirmarVendaPacote(pacoteId){

  const clienteId = Number(
    document.getElementById("vendaPacoteCliente")?.value || 0
  );

  const tipoRecebimento =
    document.getElementById("vendaPacoteTipoRecebimento")?.value;

  const formaPagamentoId = Number(
    document.getElementById("vendaPacoteForma")?.value || 0
  );

  if(!clienteId){
    alert("Selecione a cliente.");
    return;
  }

  if(!tipoRecebimento){
    alert("Selecione o tipo de recebimento.");
    return;
  }

  let caixa = null;

  if(tipoRecebimento === "receber_agora"){

    if(!formaPagamentoId){
      alert("Selecione a forma de pagamento.");
      return;
    }

    caixa = await buscarCaixaAberto();

    if(!caixa){
      alert("Não existe caixa aberto. Abra o caixa antes de receber o pagamento.");
      return;
    }
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

  validade.setDate(
    validade.getDate() + Number(pacote.validade_dias || 90)
  );

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

  const saldosSalvar = itens.map(item => ({
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
      status: tipoRecebimento === "receber_agora"
        ? "Fechada"
        : "A Receber",
      forma_origem: "pacote",
      cancelada: false
    }])
    .select()
    .single();

  if(comandaResp.error){
    alert("Erro ao criar comanda do pacote: " + comandaResp.error.message);
    return;
  }

  const comanda = comandaResp.data;

  if(tipoRecebimento === "receber_agora"){

    const pagamentoResp = await supabaseClient
      .from("pagamentos")
      .insert([{
        comanda_id: comanda.id,
        forma_pagamento_id: formaPagamentoId,
        valor: pacote.valor,
        data: formatarDataISO(new Date())
      }]);

    if(pagamentoResp.error){
      alert("Erro ao registrar pagamento: " + pagamentoResp.error.message);
      return;
    }

    await supabaseClient
      .from("financeiro_lancamentos")
      .insert([{
        unidade_id: unidadeAtualId,
        tipo: "RECEBIMENTO",
        origem: "PACOTE",
        origem_id: comanda.id,
        cliente_id: clienteId,
        caixa_id: caixa.id,
        forma_pagamento_id: formaPagamentoId,
        valor: pacote.valor,
        data: new Date().toISOString(),
        usuario_id: usuarioLogado?.id || null,
        status: "ATIVO",
        observacao: `Venda do pacote: ${pacote.nome}`
      }]);

    await registrarEntradaCaixa(
      comanda.id,
      formaPagamentoId,
      pacote.valor
    );

  }else{

    const pendenciaResp = await supabaseClient
      .from("financeiro_lancamentos")
      .insert([{
        unidade_id: unidadeAtualId,
        tipo: "PENDENCIA",
        origem: "PACOTE",
        origem_id: comanda.id,
        cliente_id: clienteId,
        forma_pagamento_id: null,
        valor: pacote.valor,
        data: new Date().toISOString(),
        usuario_id: usuarioLogado?.id || null,
        status: "ATIVO",
        observacao: `Pacote anotado para pagar depois: ${pacote.nome}`
      }]);

 if(pendenciaResp.error){
  alert("Erro ao registrar pendência: " + pendenciaResp.error.message);
  return;
}

carregarPacotes();
carregarComandas();
carregarPendenciasFinanceiras();

alert(
  tipoRecebimento === "receber_agora"
    ? "Pacote vendido e pagamento registrado."
    : "Pacote vendido e lançado como A Receber."
);
}
  carregarPacotes();
  carregarComandas();
  carregarPendenciasFinanceiras();

  alert(
    tipoRecebimento === "receber_agora"
      ? "Pacote vendido e pagamento registrado."
      : "Pacote vendido e lançado como A Receber."
  );
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

  const servicoId = document.getElementById("agServico")?.value;

  if(!servicoId) return;

  const servico = servicosAgendamentoCache.find(s =>
    String(s.id) === String(servicoId)
  );

  if(!servico) return;

  const campoDuracao = document.getElementById("agDuracao");
  const campoValor = document.getElementById("agValor");
  const campoDesconto = document.getElementById("agDesconto");
  const campoTipoDesconto = document.getElementById("agTipoDesconto");

  if(campoDuracao){
    campoDuracao.value = servico.duracao || 30;
  }

  if(campoValor){
    campoValor.value = Number(servico.valor || 0);
  }

  if(campoDesconto && !campoDesconto.value){
    campoDesconto.value = 0;
  }

  if(campoTipoDesconto && !campoTipoDesconto.value){
    campoTipoDesconto.value = "valor";
  }

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
function horarioParaMinutos(horario){
  const [h, m] = horario.split(":").map(Number);
  return (h * 60) + m;
}

function horariosConflitam(inicioA, duracaoA, inicioB, duracaoB){
  const startA = horarioParaMinutos(inicioA);
  const endA = startA + Number(duracaoA || 30);

  const startB = horarioParaMinutos(inicioB);
  const endB = startB + Number(duracaoB || 30);

  return startA < endB && endA > startB;
}

async function existeConflitoAgendamento(dados, idIgnorar = null){

  const { data, error } = await supabaseClient
    .from("agendamentos")
    .select("id, data, horario, duracao, status, cliente_id")
    .eq("unidade_id", dados.unidade_id)
    .eq("profissional_id", dados.profissional_id)
    .eq("data", dados.data)
    .neq("status", "Cancelado");

  if(error){
    console.error("Erro ao verificar conflito de agenda:", error);
    alert("Erro ao verificar disponibilidade do horário.");
    return true;
  }

  const agendamentos = data || [];

  return agendamentos.some(ag => {
    if(idIgnorar && Number(ag.id) === Number(idIgnorar)) return false;

    return horariosConflitam(
      dados.horario,
      dados.duracao,
      ag.horario,
      ag.duracao
    );
  });
}
async function salvarAgendamento(){

  const id = document.getElementById("agendamentoId").value;

  if(!id && !pode("agenda_criar")){
    alert("Você não tem permissão para criar agendamentos.");
    return;
  }

  if(id && !pode("agenda_editar")){
    alert("Você não tem permissão para editar agendamentos.");
    return;
  }
  const checkboxPacote = document.getElementById("agUsarPacote");

  const repetirAte = document.getElementById("agRepetirAte")?.value || "";
  const intervaloDias = Number(document.getElementById("agIntervaloRepeticao")?.value || 7);
  const repetir = repetirAte !== "";

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
  if(politica("agenda.bloquear_conflito_profissional", true)){

  const temConflito = await existeConflitoAgendamento(dados, id || null);

  if(temConflito){
    alert("Este horário já está ocupado para este profissional. Escolha outro horário.");
    return;
  }

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

    const agendamentosParaInserir = [];

    if(repetir){

      if(!intervaloDias || intervaloDias <= 0){
        alert("Informe um intervalo válido.");
        return;
      }

      const inicio = new Date(dados.data + "T00:00:00");
      const fim = new Date(repetirAte + "T00:00:00");

      if(fim <= inicio){
        alert("A data final da repetição precisa ser depois da data inicial.");
        return;
      }

      const recorrenciaId = gerarIdRecorrencia();

      let dataAtual = new Date(inicio);

      while(dataAtual <= fim){
const dadosRepeticao = {
  ...dados,
  data: formatarDataISO(dataAtual)
};

if(politica("agenda.bloquear_conflito_profissional", true)){

  const conflitoRepeticao = await existeConflitoAgendamento(dadosRepeticao);

  if(conflitoRepeticao){
    alert(`Conflito encontrado no dia ${formatarDataComanda(dadosRepeticao.data)} às ${dadosRepeticao.horario}. A repetição foi bloqueada.`);
    return;
  }

}
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

  if(resposta.error){
    alert("Erro ao salvar agendamento: " + resposta.error.message);
    return;
  }

  dataAgenda = new Date(dados.data + "T00:00:00");

const nomeCliente =
  document.getElementById("agClienteBusca")?.value || "Cliente";

fecharModal();
atualizarTextoDataAgenda();
carregarAgenda();

await registrarHistoricoOperacao(
  id ? "edicao_agendamento" : "criacao_agendamento",
  String(dados.cliente_id),
  `${id ? "Agendamento alterado" : "Novo agendamento"} - ${nomeCliente}`,
  {
    cliente_id: dados.cliente_id,
    profissional_id: dados.profissional_id,
    data: dados.data,
    horario: dados.horario,
    servico_id: dados.servico_id,
    valor: dados.total,
    recorrente: repetir,
    repetir_ate: repetirAte || null,
    intervalo_dias: repetir ? intervaloDias : null
  }
);

alert("Agendamento salvo com sucesso.");
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

const servicos = await obterServicos();

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

${comanda.status !== "Cancelada" && comanda.cancelada !== true && pode("comandas_cancelar") ? `
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
  clientes(nome),
  profissionais(nome),
  comanda_itens(
    descricao,
    valor,
    comissao_percentual,
    profissional_id
  )
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

  const total = Number(comanda.total || 0);
  const recebido = (comanda.pagamentos || [])
    .reduce((soma, p) => soma + Number(p.valor || 0), 0);

  const saldo = Math.max(total - recebido, 0);

  abrirModal(`
    <h2>Finalizar comanda #${comanda.id}</h2>

    <p><strong>Cliente:</strong> ${comanda.clientes?.nome || "-"}</p>
    <p><strong>Total:</strong> ${dinheiro(total)}</p>
    <p><strong>Recebido:</strong> ${dinheiro(recebido)}</p>
    <p><strong>Saldo:</strong> ${dinheiro(saldo)}</p>

    <hr>

    <button class="principal" onclick="abrirRecebimentoAgora(${comanda.id})">
      Receber agora
    </button>

    <button onclick="lancarComandaAReceber(${comanda.id})">
      Cliente vai pagar depois
    </button>

    <button onclick="abrirComanda(${comanda.id})">
      Voltar
    </button>
  `);
}
async function abrirRecebimentoAgora(comandaId){

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
    <h2>Receber agora - Comanda #${comanda.id}</h2>

    <p><strong>Cliente:</strong> ${comanda.clientes?.nome || "-"}</p>
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

    <button onclick="abrirReceberComanda(${comanda.id})">
      Voltar
    </button>
  `);
}
async function lancarComandaAReceber(comandaId){

  const { data: comanda, error } = await supabaseClient
    .from("comandas")
    .select(`
      *,
      clientes(nome),
      pagamentos(valor)
    `)
    .eq("id", comandaId)
    .single();

  if(error || !comanda){
    alert("Comanda não encontrada.");
    return;
  }

  const total = Number(comanda.total || 0);
  const recebido = (comanda.pagamentos || [])
    .reduce((soma, p) => soma + Number(p.valor || 0), 0);

  const saldo = Math.max(total - recebido, 0);

  if(saldo <= 0){
    alert("Esta comanda não possui saldo em aberto.");
    return;
  }

  const confirmar = confirm(
    `Lançar ${dinheiro(saldo)} como pendência financeira para ${comanda.clientes?.nome || "cliente"}?`
  );

  if(!confirmar) return;

  const { error: erroLancamento } = await supabaseClient
    .from("financeiro_lancamentos")
    .insert([{
      unidade_id: comanda.unidade_id,
      tipo: "PENDENCIA",
      origem: "COMANDA",
      origem_id: comanda.id,
      cliente_id: comanda.cliente_id,
      profissional_id: comanda.profissional_id,
      valor: saldo,
      data: new Date().toISOString(),
      usuario_id: usuarioLogado?.id || null,
      status: "ATIVO",
      observacao: "Comanda lançada como A Receber"
    }]);

  if(erroLancamento){
    alert("Erro ao lançar pendência: " + erroLancamento.message);
    return;
  }

  await supabaseClient
    .from("comandas")
    .update({
      status: "A Receber"
    })
    .eq("id", comanda.id);

  fecharModal();
  carregarComandas();
  carregarPendenciasFinanceiras();

  alert("Comanda lançada como A Receber.");
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
  await supabaseClient
  .from("financeiro_lancamentos")
  .insert([{
    unidade_id: comanda.unidade_id,
    tipo: "RECEBIMENTO",
    origem: "COMANDA",
    origem_id: comandaId,
    cliente_id: comanda.cliente_id,
    profissional_id: comanda.profissional_id,
    forma_pagamento_id: formaPagamentoId,
    valor: valor,
    data: new Date().toISOString(),
    usuario_id: usuarioLogado?.id || null,
    status: "ATIVO",
    observacao: "Recebimento de comanda"
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

  const { data, error } = await supabaseClient
    .from("financeiro_lancamentos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("tipo", "PENDENCIA")
    .eq("status", "ATIVO");

  if(error || !data || data.length === 0){
    return "";
  }

  const total = data.reduce((soma, item) => soma + Number(item.valor || 0), 0);

  return `
    <div class="alerta-financeiro-cliente">
      <strong>Atenção financeira</strong>
      <p>Cliente possui ${dinheiro(total)} em aberto.</p>

      <button
        type="button"
        class="principal"
        onclick="abrirReceberPendenciasCliente(${clienteId})"
      >
        Receber agora
      </button>
    </div>
  `;
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

  area.innerHTML = `
    <div class="config-layout">

      <div class="config-menu-interno">
        <button class="principal" onclick="abrirAbaConfiguracao('geral')">
          Geral
        </button>

        <button onclick="abrirAbaConfiguracao('formas')">
          Formas de pagamento
        </button>

        <button onclick="abrirAbaConfiguracao('politicas')">
          Políticas do Sistema
        </button>
      </div>

      <div id="conteudoConfiguracoes" class="config-conteudo">
        Carregando...
      </div>

    </div>
  `;

  abrirAbaConfiguracao("geral");
}
async function abrirAbaFinanceiro(aba){

  const area = document.getElementById("conteudoFinanceiro");

  if(!area) return;

  if(aba === "caixa"){

    area.innerHTML = `
      <div class="topo">
        <button class="principal" onclick="abrirCaixa()">
          Abrir Caixa
        </button>
      </div>

      <div id="listaCaixas" class="cards"></div>
    `;

    carregarCaixas();
    return;
  }

  if(aba === "pendencias"){

  area.innerHTML = `
    <h2>Pendências Financeiras</h2>

    <input
      id="buscaPendenciaCliente"
      placeholder="Pesquisar cliente..."
      oninput="carregarPendenciasFinanceiras()"
    >

    <br><br>

    <div id="listaPendencias" class="cards">
      Carregando...
    </div>
  `;

  carregarPendenciasFinanceiras();
  return;
}

if(aba === "creditos"){

  area.innerHTML = `
    <h2>Créditos da Cliente</h2>

    <input
      id="buscaCreditoCliente"
      placeholder="Pesquisar cliente..."
      oninput="carregarCreditosClientes()"
    >

    <br><br>

    <button class="principal" onclick="abrirNovoCreditoCliente()">
      Adicionar crédito
    </button>

    <div id="listaCreditosClientes" class="cards">
      Carregando...
    </div>
  `;

  carregarCreditosClientes();
  return;
}

  if(aba === "recebimentos"){

    area.innerHTML = `
      <h2>Recebimentos</h2>

      <p>Em desenvolvimento.</p>
    `;

    return;
  }

  if(aba === "extrato"){

    area.innerHTML = `
      <h2>Extrato Financeiro</h2>

      <p>Em desenvolvimento.</p>
    `;

    return;
  }

}
async function carregarConfiguracoesFormasPagamento(){

  const conteudo = document.getElementById("conteudoConfiguracoes");

  conteudo.innerHTML = `
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
async function carregarPoliticasSistemaTela(){

  const conteudo = document.getElementById("conteudoConfiguracoes");

  conteudo.innerHTML = `
    <div class="card">
      <h3>Políticas do Sistema</h3>
      <div id="listaPoliticasSistema">Carregando políticas...</div>
    </div>
  `;

  const lista = document.getElementById("listaPoliticasSistema");

  const { data, error } = await supabaseClient
    .from("politicas_sistema")
    .select("*")
    .eq("ativo", true)
    .order("modulo", { ascending:true })
    .order("nome", { ascending:true });

  if(error){
    lista.innerHTML = "Erro ao carregar políticas.";
    return;
  }

  if(!data || data.length === 0){
    lista.innerHTML = "Nenhuma política cadastrada.";
    return;
  }

  const grupos = {};

  data.forEach(p => {
    if(!grupos[p.modulo]) grupos[p.modulo] = [];
    grupos[p.modulo].push(p);
  });

  lista.innerHTML = Object.keys(grupos).map(modulo => `
    <div class="card">
      <h3>${modulo.toUpperCase()}</h3>

      ${grupos[modulo].map(p => `
        <div class="caixa-linha">
          <div>
            <strong>${p.nome}</strong><br>
            <small>${p.descricao || ""}</small>
          </div>

          ${p.tipo === "boolean" ? `
            <input
              type="checkbox"
              ${p.valor_boolean ? "checked" : ""}
              onchange="salvarPoliticaBoolean(${p.id}, this.checked)"
            >
          ` : ""}

          ${p.tipo === "numero" ? `
            <input
              type="number"
              value="${p.valor_numero || 0}"
              onchange="salvarPoliticaNumero(${p.id}, this.value)"
            >
          ` : ""}

          ${p.tipo === "texto" ? `
            <input
              type="text"
              value="${p.valor_texto || ""}"
              onchange="salvarPoliticaTexto(${p.id}, this.value)"
            >
          ` : ""}
        </div>
      `).join("")}

    </div>
  `).join("");
}
async function salvarPoliticaBoolean(id, valor){

  const { error } = await supabaseClient
    .from("politicas_sistema")
    .update({ valor_boolean: valor })
    .eq("id", id);

  if(error){
    alert("Erro ao salvar política.");
    return;
  }

  await carregarPoliticasSistema();
}
async function salvarPoliticaNumero(id, valor){

  const { error } = await supabaseClient
    .from("politicas_sistema")
    .update({ valor_numero: Number(valor || 0) })
    .eq("id", id);

  if(error){
    alert("Erro ao salvar política.");
    return;
  }

  await carregarPoliticasSistema();
}
async function salvarPoliticaTexto(id, valor){

  const { error } = await supabaseClient
    .from("politicas_sistema")
    .update({ valor_texto: valor })
    .eq("id", id);

  if(error){
    alert("Erro ao salvar política.");
    return;
  }

  await carregarPoliticasSistema();
}
async function abrirAbaConfiguracao(aba){

  const conteudo = document.getElementById("conteudoConfiguracoes");
  if(!conteudo) return;

  if(aba === "geral"){
    await carregarConfiguracoesGerais();
  }

  if(aba === "formas"){
    await carregarConfiguracoesFormasPagamento();
  }

  if(aba === "politicas"){
    await carregarPoliticasSistemaTela();
  }
}
async function carregarConfiguracoesGerais(){

  const conteudo =
    document.getElementById("conteudoConfiguracoes");

  if(!conteudo) return;

  const { data, error } = await supabaseClient
    .from("configuracoes_sistema")
    .select("chave, valor")
    .in("chave", [
      "clientes_em_risco_dias",
      "agenda_hora_inicio",
      "agenda_hora_fim",
      "agenda_altura_bloco"
    ]);

  if(error){
    console.error(error);
    conteudo.innerHTML = "Erro ao carregar configurações.";
    return;
  }

  const configuracoes = {};

  (data || []).forEach(item => {
    configuracoes[item.chave] = item.valor;
  });

  conteudo.innerHTML = `
    <div class="card">

      <h2>Configurações gerais</h2>

      <label>Clientes em risco após quantos dias</label>
      <input
        id="cfgClientesRiscoDias"
        type="number"
        value="${configuracoes.clientes_em_risco_dias || 30}"
      >

      <label>Horário inicial da agenda</label>
      <input
        id="cfgAgendaHoraInicio"
        type="time"
        value="${configuracoes.agenda_hora_inicio || "07:00"}"
      >

      <label>Horário final da agenda</label>
      <input
        id="cfgAgendaHoraFim"
        type="time"
        value="${configuracoes.agenda_hora_fim || "20:00"}"
      >

      <label>Altura dos horários da agenda</label>
      <input
        id="cfgAgendaAlturaBloco"
        type="number"
        value="${configuracoes.agenda_altura_bloco || 48}"
      >

      <button
        class="principal"
        onclick="salvarConfiguracoes()"
      >
        Salvar configurações
      </button>

    </div>

    <div class="card">

      <h2>Segurança financeira</h2>

      <p>
        Defina a senha necessária para cancelar uma
        pendência financeira.
      </p>

      <label>Nova senha</label>
      <input
        id="cfgNovaSenhaCancelarPendencia"
        type="password"
        autocomplete="new-password"
      >

      <label>Confirmar nova senha</label>
      <input
        id="cfgConfirmarSenhaCancelarPendencia"
        type="password"
        autocomplete="new-password"
      >

      <button
        class="principal"
        onclick="salvarSenhaCancelarPendencia()"
      >
        Salvar senha
      </button>

    </div>
  `;
}
async function salvarSenhaCancelarPendencia(){

  if(!pode("configuracoes_editar")){
    alert("Você não tem permissão para alterar configurações.");
    return;
  }

  const novaSenha =
    document
      .getElementById("cfgNovaSenhaCancelarPendencia")
      ?.value
      ?.trim();

  const confirmarSenha =
    document
      .getElementById("cfgConfirmarSenhaCancelarPendencia")
      ?.value
      ?.trim();

  if(!novaSenha){
    alert("Digite a nova senha.");
    return;
  }

  if(novaSenha.length < 6){
    alert("A senha precisa ter pelo menos 6 caracteres.");
    return;
  }

  if(novaSenha !== confirmarSenha){
    alert("As senhas não são iguais.");
    return;
  }

  const confirmar = confirm(
    "Deseja alterar a senha de cancelamento de pendências?"
  );

  if(!confirmar) return;

  const { data, error } = await supabaseClient.rpc(
    "alterar_senha_cancelamento_pendencia",
    {
      p_nova_senha: novaSenha
    }
  );

  if(error){
    console.error(error);
    alert("Erro ao salvar senha: " + error.message);
    return;
  }

  if(data?.sucesso === false){
    alert(data.mensagem || "Não foi possível salvar a senha.");
    return;
  }

  document.getElementById(
    "cfgNovaSenhaCancelarPendencia"
  ).value = "";

  document.getElementById(
    "cfgConfirmarSenhaCancelarPendencia"
  ).value = "";

  await registrarHistoricoOperacao(
    "alteracao_senha_cancelamento_pendencia",
    null,
    "Senha de cancelamento de pendências alterada",
    {}
  );

  alert("Senha salva com sucesso.");
}
async function salvarConfiguracoes(){
  if(!pode("configuracoes_editar")){
  alert("Você não tem permissão para alterar configurações.");
  return;
}

  const dias =
    document.getElementById("cfgClientesRiscoDias").value;

  const horaInicio =
    document.getElementById("cfgAgendaHoraInicio").value;

  const horaFim =
    document.getElementById("cfgAgendaHoraFim").value;

  const alturaBloco =
    document.getElementById("cfgAgendaAlturaBloco").value;

  await supabaseClient
    .from("configuracoes_sistema")
    .update({ valor: dias })
    .eq("chave", "clientes_em_risco_dias");

  await supabaseClient
    .from("configuracoes_sistema")
    .update({ valor: horaInicio })
    .eq("chave", "agenda_hora_inicio");

  await supabaseClient
    .from("configuracoes_sistema")
    .update({ valor: horaFim })
    .eq("chave", "agenda_hora_fim");

  await supabaseClient
    .from("configuracoes_sistema")
    .update({ valor: alturaBloco })
    .eq("chave", "agenda_altura_bloco");

  localStorage.setItem("agenda_hora_inicio", horaInicio);
  localStorage.setItem("agenda_hora_fim", horaFim);
  localStorage.setItem("agenda_altura_bloco", alturaBloco);

  alert("Configurações salvas.");

  carregarAgenda();
}

async function carregarGestores(){

  const area = document.getElementById("areaGestores");

  if(!area) return;

  area.innerHTML = `

    <div style="
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:20px;
    ">

      <div class="card">
        <h3>Usuários</h3>
        <p>Gerenciar usuários do sistema.</p>

        <button
          class="principal"
          onclick="carregarUsuariosSistemaV2()"
        >
          Abrir
        </button>
      </div>

      <div class="card">
        <h3>Perfis</h3>
        <p>Criar e editar perfis.</p>

        <button
          class="principal"
          onclick="carregarPerfisSistemaV2()"
        >
          Abrir
        </button>
      </div>

      <div class="card">
        <h3>Permissões</h3>
        <p>Permissões por perfil.</p>

      <button
  class="principal"
  onclick="carregarPermissoesSistemaV2()"
>
  Abrir
</button>
      </div>

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

  const { data, error } = await supabaseClient
    .from("perfis_permissoes")
    .select("*")
    .eq("perfil_id", usuarioLogado.perfil_acesso_id)
    .eq("permitido", true);

  if(error){
    console.error("Erro ao carregar permissões:", error);
    return;
  }

  permissoesUsuario = (data || []).map(p => p.permissao);

  console.log("Permissões carregadas:", permissoesUsuario);
}
function temPermissao(chave){
  return pode(chave);
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

  if(!pode("comandas_cancelar")){
    alert("Você não tem permissão para cancelar faturamentos.");
    return;
  }

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
 let idsAgendamentos = comandasCancelar
  .map(c => c.agendamento_id)
  .filter(Boolean);

const itensResp = await supabaseClient
  .from("comanda_itens")
  .select("agendamento_id")
  .in("comanda_id", idsComandas);

const idsItensAgendamentos = (itensResp.data || [])
  .map(item => item.agendamento_id)
  .filter(Boolean);

idsAgendamentos = [
  ...new Set([
    ...idsAgendamentos,
    ...idsItensAgendamentos
  ])
];
  const comandasComItensResp = await supabaseClient
  .from("comandas")
  .select(`
    cliente_id,
    data,
    comanda_itens(servico_id)
  `)
  .in("id", idsComandas);

const servicosCancelados = [];

(comandasComItensResp.data || []).forEach(c=>{
  (c.comanda_itens || []).forEach(item=>{
    if(item.servico_id){
      servicosCancelados.push(item.servico_id);
    }
  });
});

if(servicosCancelados.length > 0){

  const agsResp = await supabaseClient
    .from("agendamentos")
    .select("id")
    .eq("cliente_id", comanda.cliente_id)
    .eq("data", comanda.data)
    .in("servico_id", servicosCancelados);

  const idsPorServico = (agsResp.data || []).map(a => a.id);

  idsAgendamentos = [
    ...new Set([
      ...idsAgendamentos,
      ...idsPorServico
    ])
  ];

}

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
  const { error: erroCancelarPendencias } = await supabaseClient
  .from("financeiro_lancamentos")
  .update({
    status: "CANCELADO"
  })
  .eq("origem", "COMANDA")
  .in("origem_id", idsComandas)
  .eq("status", "ATIVO");

if(erroCancelarPendencias){
  alert(
    "A comanda foi cancelada, mas ocorreu um erro ao cancelar a pendência: " +
    erroCancelarPendencias.message
  );
}
if(idsAgendamentos.length > 0){

  await supabaseClient
    .from("agendamentos")
    .update({
      status: "Agendado"
    })
    .in("id", idsAgendamentos);

}
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
carregarComandas();
carregarPendenciasFinanceiras();

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

  let profissionaisQuery = supabaseClient
    .from("profissionais")
    .select("id,nome");

  if(pode("comissoes_ver_propria") && !pode("comissoes_ver_todas")){
    profissionaisQuery = profissionaisQuery.eq(
      "id",
      usuarioLogado?.profissional_id
    );
  }

  const profissionaisResp = await profissionaisQuery;

  const mapaProfissionais = {};

  (profissionaisResp.data || []).forEach(p=>{
    mapaProfissionais[p.id] = p.nome;
  });

  let comandasQuery = supabaseClient
    .from("comandas")
    .select(`
      *,
      clientes(nome),
      profissionais(nome),
      comanda_itens(
        id,
        descricao,
        valor,
        comissao_percentual,
        profissional_id,
        agendamento_id
      )
    `)
    .gte("data", inicio)
    .lte("data", fim)
    .in("status", ["Fechada", "Aberta", "Parcial"])
    .neq("cancelada", true);

  if(pode("comissoes_ver_propria") && !pode("comissoes_ver_todas")){
    comandasQuery = comandasQuery.eq(
      "profissional_id",
      usuarioLogado?.profissional_id
    );
  }

  const { data, error } = await comandasQuery
    .order("data", { ascending:true });

  if(error){
    area.innerHTML = "<div class='card'>Erro ao carregar comissões.</div>";
    return;
  }

  const porProfissional = {};

  (data || []).forEach((comanda)=>{

    const cliente = comanda.clientes?.nome || "Cliente não informado";

    (comanda.comanda_itens || []).forEach((item)=>{

      const profissionalId =
        item.profissional_id || comanda.profissional_id;

      if(
        pode("comissoes_ver_propria") &&
        !pode("comissoes_ver_todas") &&
        String(profissionalId) !== String(usuarioLogado?.profissional_id)
      ){
        return;
      }

      const profissional =
        mapaProfissionais[profissionalId] ||
        comanda.profissionais?.nome ||
        "Sem profissional";

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

 const nomesProfissionaisComissao = Object.keys(porProfissional);

if(nomesProfissionaisComissao.length === 0){
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

${nomesProfissionaisComissao.map((profissional)=>{

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
        Cadastre Pix, dinheiro, cartão de crédito,
        débito e outras formas.
      </p>
    </div>

    <div
      onclick="abrirConfiguracoesSalas()"
      class="cliente-card"
      style="cursor:pointer;"
    >
      <strong>Salas</strong>

      <p>
        Cadastre, edite, ative ou desative as salas.
      </p>
    </div>
  `;
}
function abrirConfiguracoesSalas(){

  const container =
    document.getElementById("configuracoes-container");

  container.innerHTML = `
    <button onclick="abrirConfiguracoes()">
      ← Voltar
    </button>

    <h2 style="margin:22px 0;">
      Salas
    </h2>

    <div class="cliente-card">

      <label>Nome da sala</label>

      <input
        id="novaSalaNome"
        placeholder="Ex: Sala Facial"
      >

      <button
        class="principal"
        onclick="salvarNovaSala()"
      >
        Adicionar sala
      </button>

    </div>

    <div id="lista-configuracoes-salas"></div>
  `;

  carregarConfiguracoesSalas();
}
async function salvarNovaSala(){

  const campo =
    document.getElementById("novaSalaNome");

  const nome = campo.value.trim();

  if(!nome){
    alert("Digite o nome da sala.");
    return;
  }

  const { data: salaExistente, error: erroBusca } =
    await supabaseClient
      .from("salas")
      .select("id")
      .eq("unidade_id", unidadeAtualId)
      .ilike("nome", nome)
      .maybeSingle();

  if(erroBusca){
    console.error(erroBusca);
    alert("Erro ao verificar a sala.");
    return;
  }

  if(salaExistente){
    alert("Já existe uma sala com esse nome.");
    return;
  }

  const { error } = await supabaseClient
    .from("salas")
    .insert([{
      unidade_id: unidadeAtualId,
      nome,
      ativo: true
    }]);

  if(error){
    console.error(error);
    alert("Erro ao cadastrar sala: " + error.message);
    return;
  }

  campo.value = "";

  carregarConfiguracoesSalas();

}
async function carregarConfiguracoesSalas(){

  const lista =
    document.getElementById("lista-configuracoes-salas");

  if(!lista) return;

  lista.innerHTML = `
    <p>Carregando salas...</p>
  `;

  const { data, error } = await supabaseClient
    .from("salas")
    .select("*")
    .eq("unidade_id", unidadeAtualId)
    .order("nome");

  if(error){
    console.error(error);

    lista.innerHTML = `
      <p>Erro ao carregar salas.</p>
    `;

    return;
  }

  const salas = data || [];

  if(salas.length === 0){

    lista.innerHTML = `
      <div class="cliente-card">
        Nenhuma sala cadastrada.
      </div>
    `;

    return;
  }

  lista.innerHTML = salas.map(sala => `

    <div class="cliente-card">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:15px;
      ">

        <div>
          <strong>${sala.nome}</strong>

          <p style="margin:5px 0 0;">
            ${sala.ativo ? "Ativa" : "Inativa"}
          </p>
        </div>

        <div style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        ">

          <button
            onclick="editarSala(${sala.id})"
          >
            Editar
          </button>

          <button
            onclick="alterarStatusSala(
              ${sala.id},
              ${sala.ativo}
            )"
          >
            ${sala.ativo ? "Desativar" : "Ativar"}
          </button>

          <button
            onclick="excluirSala(${sala.id})"
          >
            Excluir
          </button>

        </div>

      </div>

    </div>

  `).join("");

}
async function editarSala(id){

  const { data: sala, error } = await supabaseClient
    .from("salas")
    .select("*")
    .eq("id", id)
    .single();

  if(error || !sala){
    alert("Não foi possível localizar a sala.");
    return;
  }

  const novoNome = prompt(
    "Digite o novo nome da sala:",
    sala.nome
  );

  if(novoNome === null) return;

  const nome = novoNome.trim();

  if(!nome){
    alert("O nome da sala não pode ficar vazio.");
    return;
  }

  const { data: salaExistente, error: erroBusca } =
    await supabaseClient
      .from("salas")
      .select("id")
      .eq("unidade_id", unidadeAtualId)
      .ilike("nome", nome)
      .neq("id", id)
      .maybeSingle();

  if(erroBusca){
    console.error(erroBusca);
    alert("Erro ao verificar o nome da sala.");
    return;
  }

  if(salaExistente){
    alert("Já existe outra sala com esse nome.");
    return;
  }

  const { error: erroAtualizacao } =
    await supabaseClient
      .from("salas")
      .update({
        nome
      })
      .eq("id", id);

  if(erroAtualizacao){
    console.error(erroAtualizacao);
    alert(
      "Erro ao alterar sala: " +
      erroAtualizacao.message
    );
    return;
  }

  carregarConfiguracoesSalas();

}
async function alterarStatusSala(id, statusAtual){

  const novoStatus = !statusAtual;

  const { error } = await supabaseClient
    .from("salas")
    .update({
      ativo: novoStatus
    })
    .eq("id", id);

  if(error){
    console.error(error);
    alert(
      "Erro ao alterar situação da sala: " +
      error.message
    );
    return;
  }

  carregarConfiguracoesSalas();

}
async function excluirSala(id){

  const { data: servicos, error: erroServicos } =
    await supabaseClient
      .from("servicos")
      .select("id, nome")
      .eq("sala_id", id)
      .limit(10);

  if(erroServicos){
    console.error(erroServicos);
    alert("Erro ao verificar os serviços da sala.");
    return;
  }

  if(servicos && servicos.length > 0){

    const nomes =
      servicos
        .map(servico => "• " + servico.nome)
        .join("\n");

    alert(
      "Esta sala está vinculada aos seguintes serviços:\n\n" +
      nomes +
      "\n\nRemova a sala dos serviços antes de excluí-la."
    );

    return;
  }

  const confirmar = confirm(
    "Deseja realmente excluir esta sala?"
  );

  if(!confirmar) return;

  const { error } = await supabaseClient
    .from("salas")
    .delete()
    .eq("id", id);

  if(error){
    console.error(error);
    alert("Erro ao excluir sala: " + error.message);
    return;
  }

  carregarConfiguracoesSalas();

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
    console.error("Erro ao buscar agendamento:", error);
    alert("Agendamento não encontrado.");
    return;
  }

 const dataHoje = agendamentoBase.data;

  const { data: agendamentosCliente, error: erroAgendamentos } =
    await supabaseClient
      .from("agendamentos")
      .select(`
        *,
        servicos(nome, comissao_padrao),
        profissionais(nome)
      `)
      .eq("cliente_id", agendamentoBase.cliente_id);

  if(erroAgendamentos){
    console.error(
      "Erro ao carregar os agendamentos da cliente:",
      erroAgendamentos
    );

    alert("Erro ao carregar os agendamentos da cliente.");
    return;
  }

  let itens = agendamentosCliente || [];
  console.table(itens);

  itens = itens.filter(item => {

    const status =
      String(item.status || "")
        .trim()
        .toLowerCase();

    const cancelado =
      status === "cancelado" ||
      status === "cancelada";

    const dataValida =
      item.data >= dataHoje;

    return !cancelado && dataValida;
  });

  const idsAgendamentos =
    itens.map(item => item.id);

  if(idsAgendamentos.length > 0){

    const { data: comandasExistentes, error: erroComandas } =
      await supabaseClient
        .from("comandas")
        .select("agendamento_id, cancelada")
        .in("agendamento_id", idsAgendamentos);

    if(erroComandas){
      console.error(
        "Erro ao verificar comandas existentes:",
        erroComandas
      );

      alert("Erro ao verificar os serviços já faturados.");
      return;
    }

    const idsJaFaturados =
      (comandasExistentes || [])
        .filter(comanda =>
          comanda.cancelada !== true
        )
        .map(comanda =>
          Number(comanda.agendamento_id)
        );

    itens = itens.filter(item =>
      !idsJaFaturados.includes(Number(item.id))
    );
  }

function removerDuplicadosFaturamento(lista){

  const itensUnicos = new Map();

  lista.forEach(item => {

    const chave = [
      item.data || "",
      String(item.horario || "").slice(0, 5),
      item.profissional_id || item.profissionais?.id || "",
      item.servico_id || item.servicos?.id || item.servico_nome || item.servicos?.nome || "",
      item.pacote_cliente_id || item.pacote_id || ""
    ].join("|");

    if(!itensUnicos.has(chave)){
      itensUnicos.set(chave, item);
    }
  });

  return Array.from(itensUnicos.values());
}

const itensHoje = removerDuplicadosFaturamento(
  itens.filter(item =>
    item.data === dataHoje
  )
);

const itensFuturos = removerDuplicadosFaturamento(
  itens.filter(item =>
    item.data > dataHoje
  )
);

  if(
    itensHoje.length === 0 &&
    itensFuturos.length === 0
  ){
    alert(
      "Não há serviços pendentes para faturar desta cliente."
    );

    return;
  }

  const montarItem = (item, futuro = false) => `
    <label
      style="
        display:grid;
        grid-template-columns:30px 1fr 100px;
        gap:10px;
        align-items:center;
        border-bottom:1px solid #eee;
        padding:10px 0;
      "
    >
      <input
        type="checkbox"
        class="itemFaturamentoCliente"
        value="${item.id}"
        data-total="${
          item.usar_pacote
            ? 0
            : Number(item.total || 0)
        }"
        ${futuro ? "" : "checked"}
        onchange="calcularTotalFaturamentoCliente()"
        style="
          width:auto;
          height:auto;
        "
      >

      <span>
        <strong>
          ${item.servicos?.nome || "Serviço"}
        </strong>

        <br>

        <small>
          ${
            futuro
              ? `${formatarDataComanda(item.data)} • `
              : ""
          }

          ${item.profissionais?.nome || "Profissional"}

          • ${formatarHorarioBonito(item.horario)}

          ${item.usar_pacote ? " • Pacote" : ""}
        </small>
      </span>

      <strong>
        ${
          item.usar_pacote
            ? dinheiro(0)
            : dinheiro(item.total || 0)
        }
      </strong>
    </label>
  `;

  abrirModal(`
    <h2>Faturar cliente</h2>

    <p>
      <strong>Cliente:</strong>
      ${agendamentoBase.clientes?.nome || "-"}
    </p>

    <p>
      <strong>Data atual:</strong>
      ${formatarDataComanda(dataHoje)}
    </p>

    <br>

    <h3>Serviços de hoje</h3>

    <div id="listaItensFaturamentoCliente">
      ${
        itensHoje.length
          ? itensHoje
              .map(item =>
                montarItem(item, false)
              )
              .join("")
          : "<p>Nenhum serviço pendente para hoje.</p>"
      }
    </div>

    ${
      itensFuturos.length
        ? `
          <div
            class="card"
            style="margin-top:18px;"
          >

            <label
              style="
                display:flex;
                gap:10px;
                align-items:center;
                margin:0;
              "
            >
              <input
                type="checkbox"
                id="mostrarAgendamentosFuturosFaturamento"
                onchange="alternarAgendamentosFuturosFaturamento()"
                style="
                  width:auto;
                  height:auto;
                  margin:0;
                "
              >

              Ver ou dar baixa em agendamentos futuros
            </label>

            <div
              id="areaAgendamentosFuturosFaturamento"
              style="
                display:none;
                margin-top:15px;
              "
            >
              <h3>Agendamentos futuros</h3>

              ${
                itensFuturos
                  .map(item =>
                    montarItem(item, true)
                  )
                  .join("")
              }
            </div>

          </div>
        `
        : ""
    }

    <br>

    <h3>
      Total:
      <span id="totalFaturamentoCliente">
        R$ 0,00
      </span>
    </h3>

    <br>

    <button
      class="principal"
      onclick="confirmarFaturamentoClienteDia()"
    >
      Continuar para pagamento
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);

  window.itensFaturamentoClienteCache = itens;

  calcularTotalFaturamentoCliente();
}
function alternarAgendamentosFuturosFaturamento(){

  const checkbox = document.getElementById(
    "mostrarAgendamentosFuturosFaturamento"
  );

  const area = document.getElementById(
    "areaAgendamentosFuturosFaturamento"
  );

  if(!area) return;

  area.style.display = checkbox?.checked
    ? "block"
    : "none";

  if(!checkbox?.checked){

    area
      .querySelectorAll(".itemFaturamentoCliente")
      .forEach(item => {
        item.checked = false;
      });
  }

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

  if(!pode("comandas_faturar")){
    alert("Você não tem permissão para faturar atendimentos.");
    return;
  }

  const botaoConfirmar = document.querySelector(
    'button[onclick="salvarFaturamentoClienteDiaPago()"]'
  );

  if(botaoConfirmar?.dataset.salvando === "true") return;

  if(botaoConfirmar){
    botaoConfirmar.dataset.salvando = "true";
    botaoConfirmar.disabled = true;
    botaoConfirmar.innerText = "Salvando...";
  }

  const tipoRecebimento = document.getElementById("fatTipoRecebimento").value;
  const itensPagos = window.itensFaturamentoClienteSelecionados || [];
  const totalReceber = Number(window.totalFaturamentoClienteSelecionado || 0);

  if(itensPagos.length === 0){
    alert("Nenhum serviço selecionado para faturar.");
    return;
  }

  const idsAgendamentos = itensPagos.map(item => item.id);

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
    profissionaisUnicos.length === 1 ? profissionaisUnicos[0] : null;

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
      status: tipoRecebimento === "receber_agora" ? "Fechada" : "A Receber",
      cancelada: false
    }])
    .select()
    .single();

  if(comandaResp.error){
    alert("Erro ao criar comanda: " + comandaResp.error.message);
    return;
  }

  const comanda = comandaResp.data;

 const itensComanda =
  await Promise.all(
    itensPagos.map(async item => {

      const percentualComissao =
        await buscarPercentualComissao(
          item.profissional_id,
          item.servico_id,
          item.servicos?.comissao_padrao || 0
        );

      return {
        comanda_id: comanda.id,
        servico_id: item.servico_id,
        agendamento_id: item.id,
        profissional_id: item.profissional_id,
        descricao: item.servicos?.nome || "Serviço",
        valor: item.total,
        comissao_percentual: percentualComissao
      };

    })
  );

  const itensResp = await supabaseClient
    .from("comanda_itens")
    .insert(itensComanda);

  if(itensResp.error){
    alert("Erro ao salvar itens da comanda: " + itensResp.error.message);
    return;
  }

if(tipoRecebimento === "receber_agora"){

    const pagamentosBanco =
      pagamentosInformados.map(pagamento => ({
        comanda_id: comanda.id,
        forma_pagamento_id: pagamento.formaPagamentoId,
        valor: pagamento.valor,
        data: primeiroItem.data
      }));

    const lancamentosFinanceiros =
      pagamentosInformados.map(pagamento => ({
        unidade_id: unidadeAtualId,
        tipo: "RECEBIMENTO",
        origem: "COMANDA",
        origem_id: comanda.id,
        cliente_id: primeiroItem.cliente_id,
        profissional_id: profissionalPrincipal,
        forma_pagamento_id: pagamento.formaPagamentoId,
        valor: pagamento.valor,
        data: new Date().toISOString(),
        usuario_id: usuarioLogado?.id || null,
        status: "ATIVO",
        observacao: "Recebimento de faturamento"
      }));

    const [
      pagamentosResp,
      financeiroResp
    ] = await Promise.all([

      supabaseClient
        .from("pagamentos")
        .insert(pagamentosBanco),

      supabaseClient
        .from("financeiro_lancamentos")
        .insert(lancamentosFinanceiros)

    ]);

    if(pagamentosResp.error){
      throw pagamentosResp.error;
    }

    if(financeiroResp.error){
      throw financeiroResp.error;
    }

    const pagamentosParaCaixa =
  pagamentosInformados.filter(
    pagamento =>
      pagamento.formaNome !== "Crédito da Cliente"
  );

if(pagamentosParaCaixa.length > 0){

  const caixa = await buscarCaixaAberto();

  if(!caixa){
    throw new Error(
      "Não existe caixa aberto."
    );
  }

  const movimentacoesCaixa =
    pagamentosParaCaixa.map(pagamento => ({
      caixa_id: caixa.id,
      tipo: "Entrada",
      descricao: "Pagamento de atendimento",
      valor: Number(pagamento.valor || 0),
      comanda_id: comanda.id,
      forma_pagamento_id: pagamento.formaPagamentoId
    }));

  const caixaResp =
    await supabaseClient
      .from("caixa_movimentacoes")
      .insert(movimentacoesCaixa);

  if(caixaResp.error){
    throw caixaResp.error;
  }

}
}else{

 const pendenciaResp = await supabaseClient
  .from("financeiro_lancamentos")
  .insert([{
    unidade_id: unidadeAtualId,
    tipo: "PENDENCIA",
    origem: "COMANDA",
    origem_id: comanda.id,
    cliente_id: primeiroItem.cliente_id,
    profissional_id: profissionalPrincipal,
    valor: totalReceber,
    data: new Date().toISOString(),
    usuario_id: usuarioLogado?.id || null,
    status: "ATIVO",
    observacao: "Faturamento lançado como A Receber"
  }]);

if(pendenciaResp.error){
  throw pendenciaResp.error;
}

} // FECHA O ELSE

await supabaseClient
  .from("agendamentos")
  .update({
    status: "Finalizado"
  })
  .in("id", idsAgendamentos);

  await registrarHistoricoOperacao(
    "faturamento_cliente",
    String(comanda.id),
    "Cliente faturada",
    {
      comanda_id: comanda.id,
      faturamento_grupo_id: grupo.id,
      cliente_id: primeiroItem.cliente_id,
      total: totalReceber,
      tipo_recebimento: tipoRecebimento,
      agendamentos: idsAgendamentos,
      itens: itensComanda.map(item => ({
        servico_id: item.servico_id,
        profissional_id: item.profissional_id,
        valor: item.valor,
        comissao_percentual: item.comissao_percentual
      })),
      pagamentos: pagamentosInformados.map(p => ({
        forma_pagamento_id: p.formaPagamentoId,
        forma: p.formaNome,
        valor: p.valor
      }))
    }
  );

  fecharModal();

alert("Faturamento concluído com sucesso.");

Promise.all([
  carregarAgenda(),
  carregarComandas(),
  carregarPendenciasFinanceiras()
]).catch(erro => {
  console.error(
    "Erro ao atualizar telas após faturamento:",
    erro
  );
});
}
function abrirReforcoCaixa(caixaId){

  if(!pode("caixa_reforco")){
    alert("Você não tem permissão para adicionar reforço de caixa.");
    return;
  }

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

  if(!pode("caixa_sangria")){
    alert("Você não tem permissão para realizar sangria de caixa.");
    return;
  }

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
async function existemComandasAbertasNoDia(dataCaixa){

  const { data, error } = await supabaseClient
    .from("comandas")
    .select("id, clientes(nome)")
    .eq("data", dataCaixa)
    .eq("status", "Aberta")
    .neq("cancelada", true);

  if(error){
    console.error("Erro ao verificar comandas abertas:", error);
    alert("Erro ao verificar comandas abertas.");
    return true;
  }

  return data || [];
}
async function abrirFechamentoCaixa(caixaId){

  if(!pode("caixa_fechar")){
    alert("Você não tem permissão para fechar caixa.");
    return;
  }

  const { data: caixa } = await supabaseClient
    .from("caixas")
    .select("*")
    .eq("id", caixaId)
    .single();
  if(politica("caixa.bloquear_fechamento_comanda_aberta", true)){

  const comandasAbertas = await existemComandasAbertasNoDia(caixa.data);

  if(comandasAbertas.length > 0){

    const nomes = comandasAbertas
      .map(c => c.clientes?.nome || `Comanda #${c.id}`)
      .join("\n");

    alert(
      `Não é possível fechar o caixa.\n\n` +
      `Existem ${comandasAbertas.length} comandas abertas neste dia:\n\n` +
      nomes
    );

    return;
  }
}

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

${id ? `
  <button onclick="abrirHistoricoCliente(${id})">
    Histórico da cliente
  </button>
` : ""}

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

limparCache("categorias");

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
async function carregarSalas(){

  const { data, error } = await supabaseClient
    .from("salas")
    .select("*")
    .eq("unidade_id", unidadeAtualId)
    .eq("ativo", true)
    .order("nome");

  if(error){
    console.error(error);
    return [];
  }

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
async function abrirHistoricoCliente(clienteId){

  const { data: cliente, error: erroCliente } = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("id", clienteId)
    .single();

  if(erroCliente || !cliente){
    alert("Cliente não encontrada.");
    return;
  }

  const hoje = formatarDataISO(new Date());

  const atendimentosResp = await supabaseClient
    .from("agendamentos")
    .select(`
      *,
      profissionais(nome),
      servicos(nome)
    `)
    .eq("cliente_id", clienteId)
    .lt("data", hoje)
    .neq("status", "Cancelado")
    .order("data", { ascending:false });

  const futurosResp = await supabaseClient
    .from("agendamentos")
    .select(`
      *,
      profissionais(nome),
      servicos(nome)
    `)
    .eq("cliente_id", clienteId)
    .gte("data", hoje)
    .neq("status", "Cancelado")
    .order("data", { ascending:true })
    .order("horario", { ascending:true });

  const atendimentos = atendimentosResp.data || [];
  const futuros = futurosResp.data || [];

  const telefoneLimpo =
    String(cliente.telefone || "").replace(/\D/g, "");

  const telefoneWhats =
    telefoneLimpo.startsWith("55")
      ? telefoneLimpo
      : `55${telefoneLimpo}`;

  abrirModal(`
    <h2>Histórico da cliente</h2>

    <div class="card">
      <h3>${cliente.nome}</h3>
      <p><strong>Telefone:</strong> ${cliente.telefone || "-"}</p>
      <p><strong>Observações:</strong> ${cliente.observacoes || "-"}</p>

      ${telefoneLimpo ? `
        <button onclick="window.open('https://wa.me/${telefoneWhats}', '_blank')">
          WhatsApp
        </button>
      ` : ""}
    </div>

    <div class="card">
      <h3>Agendamentos futuros</h3>

      ${futuros.length ? futuros.map(a=>`
        <div class="linha-historico-cliente">
          <strong>${formatarDataComanda(a.data)} às ${formatarHorarioBonito(a.horario)}</strong>
          <span>${a.servicos?.nome || "Serviço"}</span>
          <small>${a.profissionais?.nome || "Profissional"} • ${a.status || "-"}</small>
        </div>
      `).join("") : "<p>Nenhum agendamento futuro.</p>"}
    </div>

    <div class="card">
      <h3>Histórico de atendimentos</h3>

      ${atendimentos.length ? atendimentos.map(a=>`
        <div class="linha-historico-cliente">
          <strong>${formatarDataComanda(a.data)} às ${formatarHorarioBonito(a.horario)}</strong>
          <span>${a.servicos?.nome || "Serviço"}</span>
          <small>${a.profissionais?.nome || "Profissional"} • ${a.status || "-"}</small>
        </div>
      `).join("") : "<p>Nenhum atendimento anterior encontrado.</p>"}
    </div>

    <button onclick="abrirModalCliente(${clienteId})">
      Voltar
    </button>

    <button onclick="fecharModal()">
      Fechar
    </button>
  `);
}
async function excluirAgendamento(id){

  if(!pode("agenda_cancelar")){
    alert("Você não tem permissão para cancelar agendamentos.");
    return;
  }

  const { data: agendamento, error } = await supabaseClient
    .from("agendamentos")
    .select("*")
    .eq("id", id)
    .single();

  if(error || !agendamento){
    alert("Agendamento não encontrado.");
    return;
  }

  const { data: comanda } = await supabaseClient
    .from("comandas")
    .select("*")
    .eq("agendamento_id", id)
    .neq("cancelada", true)
    .maybeSingle();

  if(comanda){
    alert("Este atendimento já foi faturado. Para cancelar, vá até a aba Comandas e cancele a comanda.");
    return;
  }

  let modo = "unico";

  if(agendamento.recorrencia_id){

    const escolha = prompt(
      "Este é um agendamento recorrente.\n\nDigite:\n1 - Cancelar apenas este horário\n2 - Cancelar este e todos os futuros"
    );

    if(escolha === "2"){
      modo = "futuros";
    }else if(escolha !== "1"){
      return;
    }

  }else{

    const confirmar = confirm("Deseja cancelar este agendamento?");
    if(!confirmar) return;

  }

  let resposta;

  if(modo === "futuros"){

    resposta = await supabaseClient
      .from("agendamentos")
      .update({
        status: "Cancelado"
      })
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
    alert("Erro ao cancelar agendamento: " + resposta.error.message);
    return;
  }

fecharModal();

await carregarAgenda();

await registrarHistoricoOperacao(
  "cancelamento_agendamento",
  String(id),
  "Agendamento cancelado",
  {
    agendamento_id: id,
    cliente_id: agendamento?.cliente_id || null,
    profissional_id: agendamento?.profissional_id || null
  }
);

  alert("Agendamento cancelado.");
}
async function reabrirCaixa(caixaId){

if(
  usuarioLogado?.perfil !== "dono" &&
  !pode("caixa_reabrir")
){
  alert("Você não tem permissão para reabrir caixa.");
  return;
}

  const motivo = prompt("Informe o motivo da reabertura do caixa:");

  if(!motivo){
    alert("Informe o motivo.");
    return;
  }

  const { error } = await supabaseClient
    .from("caixas")
    .update({
      status: "Aberto",
      fechamento: null,
      diferenca: null,
      observacao_fechamento: null,
      fechado_em: null
    })
    .eq("id", caixaId);

  if(error){
    alert("Erro ao reabrir caixa: " + error.message);
    return;
  }

  await registrarHistoricoOperacao(
    "reabertura_caixa",
    String(caixaId),
    "Caixa reaberto",
    {
      caixa_id: caixaId,
      motivo
    }
  );

  carregarCaixas();

  alert("Caixa reaberto com sucesso.");
}
async function confirmarAberturaCaixa(){

  if(!pode("caixa_abrir")){
    alert("Você não tem permissão para abrir caixa.");
    return;
  }

  const valor = Number(document.getElementById("valorAberturaCaixa").value || 0);
  if(valor <= 0){
    alert("O valor de abertura precisa ser maior que zero.");
    return;
  }

  const caixaAberto = await buscarCaixaAberto();

  if(caixaAberto){
    alert("Já existe um caixa aberto. Feche o caixa atual antes de abrir outro.");
    fecharModal();
    return;
  }

  const { error } = await supabaseClient
    .from("caixas")
   .insert([{
  unidade_id: unidadeAtualId,
  data: formatarDataISO(new Date()),
  abertura: valor,
  status: "Aberto",
  aberto_por: usuarioLogado?.nome || usuarioLogado?.usuario || "Usuário",
  aberto_por_usuario_id: usuarioLogado?.id
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

  fecharModal();
  carregarCaixas();

  alert("Caixa aberto com sucesso.");
}
let servicosAgendamentoCache = [];

function carregarServicosParaBuscaAgendamento(servicos){
  servicosAgendamentoCache = servicos || [];
}

function filtrarServicosAgendamento(){

  const termo = document.getElementById("agServicoBusca")?.value?.toLowerCase().trim() || "";
  const resultado = document.getElementById("resultadoBuscaServicosAgendamento");

  if(!resultado) return;

  resultado.innerHTML = "";

  if(!termo){
    return;
  }

  const filtrados = servicosAgendamentoCache
    .filter(s => s.nome?.toLowerCase().includes(termo))
    .slice(0, 10);

  filtrados.forEach((servico)=>{

    resultado.innerHTML += `
      <div
        class="item-busca"
        onclick="selecionarServicoAgendamento(${servico.id})"
      >
        <strong>${servico.nome}</strong>
        <small>${dinheiro(servico.valor)} • ${servico.duracao || 30} min</small>
      </div>
    `;

  });
}

function selecionarServicoAgendamento(servicoId){

  const servico = servicosAgendamentoCache.find(s =>
    String(s.id) === String(servicoId)
  );

  if(!servico) return;

  document.getElementById("agServico").value = servico.id;
  document.getElementById("agServicoBusca").value = servico.nome;

  document.getElementById("resultadoBuscaServicosAgendamento").innerHTML = "";

  preencherDadosServicoAgendamento();
  verificarPacoteDisponivel();
}
function somarMinutosHorario(horario, duracao){

  if(!horario) return "00:00";

  const [hora, minuto] = String(horario).split(":").map(Number);

  const total = (hora * 60) + minuto + Number(duracao || 0);

  const h = Math.floor(total / 60);
  const m = total % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function somarMinutosHorario(horario, duracao){

  if(!horario) return "00:00";

  const [hora, minuto] = String(horario).split(":").map(Number);

  const total = (hora * 60) + minuto + Number(duracao || 0);

  const h = Math.floor(total / 60);
  const m = total % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
async function carregarAuditoria(){

  const lista = document.getElementById("listaAuditoria");

  if(!lista) return;

  lista.innerHTML = "Carregando auditoria...";

  const busca =
    document.getElementById("buscaAuditoria")?.value?.toLowerCase().trim() || "";

const { data, error } = await supabaseClient
  .from("historico_operacoes")
  .select("*")
    .order("criado_em", { ascending: false })
    .limit(150);

  if(error){
    lista.innerHTML = "<div class='card'>Erro ao carregar auditoria.</div>";
    return;
  }

  let registros = data || [];

  if(busca){
    registros = registros.filter(item =>
      (item.usuario_nome || "").toLowerCase().includes(busca) ||
      (item.tipo || "").toLowerCase().includes(busca) ||
      (item.descricao || "").toLowerCase().includes(busca) ||
      JSON.stringify(item.dados || {}).toLowerCase().includes(busca)
    );
  }

  if(registros.length === 0){
    lista.innerHTML = "<div class='card'>Nenhum registro encontrado.</div>";
    return;
  }

  lista.innerHTML = registros.map(item=>{

    const dados = item.dados || {};

    return `
      <div class="auditoria-card">

        <div class="auditoria-topo">
          <div>
            <strong>${item.usuario_nome || "Sistema"}</strong>
            <small>${new Date(item.criado_em).toLocaleString("pt-BR")}</small>
          </div>

          <span>${formatarTipoAuditoria(item.tipo)}</span>
        </div>

        <h3>${item.descricao || "-"}</h3>

        <div class="auditoria-dados">
        <div id="auditoria-${item.id}">Carregando detalhes...</div>
        </div>

      </div>
    `;

  }).join("");
  for(const item of registros){

  const areaDetalhe = document.getElementById(`auditoria-${item.id}`);

  if(areaDetalhe){
    areaDetalhe.innerHTML = await montarResumoAuditoria(item.dados || {});
  }

}
}
function formatarTipoAuditoria(tipo){

  const nomes = {
    criacao_agendamento: "Agendamento criado",
    edicao_agendamento: "Agendamento editado",
    cancelamento_agendamento: "Agendamento cancelado",
    faturamento_cliente: "Faturamento",
    cancelamento_faturamento: "Cancelamento",
    abertura_caixa: "Abertura de caixa",
    fechamento_caixa: "Fechamento de caixa",
    reabertura_caixa: "Reabertura de caixa",
    criacao_cliente: "Cliente criada",
    edicao_cliente: "Cliente editada",
    criacao_servico: "Serviço criado",
    edicao_servico: "Serviço editado"
  };

  return nomes[tipo] || tipo || "Operação";
}

async function montarResumoAuditoria(dados){

  if(!dados || Object.keys(dados).length === 0){
    return "<small>Sem detalhes adicionais.</small>";
  }

  let clienteNome = "";
  let profissionalNome = "";
  let servicoNome = "";

  if(dados.cliente_id){
    const resp = await supabaseClient
      .from("clientes")
      .select("nome")
      .eq("id", dados.cliente_id)
      .single();

    clienteNome = resp.data?.nome || "";
  }

  if(dados.profissional_id){
    const resp = await supabaseClient
      .from("profissionais")
      .select("nome")
      .eq("id", dados.profissional_id)
      .single();

    profissionalNome = resp.data?.nome || "";
  }

  if(dados.servico_id){
    const resp = await supabaseClient
      .from("servicos")
      .select("nome")
      .eq("id", dados.servico_id)
      .single();

    servicoNome = resp.data?.nome || "";
  }

  const linhas = [];

  if(clienteNome){
    linhas.push(`<p><strong>Cliente:</strong> ${clienteNome}</p>`);
  }

  if(profissionalNome){
    linhas.push(`<p><strong>Profissional:</strong> ${profissionalNome}</p>`);
  }

  if(servicoNome){
    linhas.push(`<p><strong>Serviço:</strong> ${servicoNome}</p>`);
  }

  if(dados.data){
    linhas.push(`<p><strong>Data:</strong> ${dados.data}</p>`);
  }

  if(dados.horario){
    linhas.push(`<p><strong>Horário:</strong> ${dados.horario}</p>`);
  }

  if(dados.valor){
    linhas.push(`<p><strong>Valor:</strong> ${dinheiro(dados.valor)}</p>`);
  }

  if(dados.total){
    linhas.push(`<p><strong>Total:</strong> ${dinheiro(dados.total)}</p>`);
  }

  return linhas.join("");
}
async function carregarProntuarios(){

  const area = document.getElementById("areaProntuarios");

  if(!area) return;

  area.innerHTML = "Carregando prontuários...";

  const modelosResp = await supabaseClient
    .from("anamnese_modelos")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  const fichasResp = await supabaseClient
    .from("anamneses_clientes")
    .select(`
      *,
      clientes(nome, telefone),
      anamnese_modelos(nome)
    `)
    .order("criado_em", { ascending:false });

  const modelos = modelosResp.data || [];
let fichas = fichasResp.data || [];


if(pode("prontuarios_ver_proprios") && !pode("prontuarios_ver_todos")){

  const profissionalId = usuarioLogado?.profissional_id;

  const agendamentosResp = await supabaseClient
    .from("agendamentos")
    .select("cliente_id")
    .eq("profissional_id", profissionalId);

  const idsClientes = [
    ...new Set(
      (agendamentosResp.data || []).map(a => a.cliente_id)
    )
  ];

  fichas = fichas.filter(ficha =>
    idsClientes.includes(ficha.cliente_id)
  );
}


const campoBuscaProntuario = document.getElementById("buscaProntuario");

const buscaOriginalProntuario = campoBuscaProntuario?.value || "";
const busca = buscaOriginalProntuario.toLowerCase().trim();

const fichasFiltradas = busca
  ? fichas.filter(ficha =>
      (ficha.clientes?.nome || "").toLowerCase().includes(busca) ||
      (ficha.anamnese_modelos?.nome || "").toLowerCase().includes(busca)
    )
  : fichas;

  area.innerHTML = `
    <div class="card">
      <h3>Nova ficha</h3>
      <p>Vincule um modelo de anamnese a uma cliente.</p>
      <button class="principal" onclick="abrirModalAnamneseCliente()">
        Criar ficha
      </button>
    </div>

    <div class="card">
      <h3>Modelos cadastrados</h3>
      ${modelos.length ? modelos.map(modelo=>`
        <div class="caixa-linha">
          <span>${modelo.nome}</span>
          <div style="display:flex;gap:8px;">
  <button onclick="abrirModalModeloAnamnese(${modelo.id})">
    Editar
  </button>

  <button onclick="abrirPerguntasModeloAnamnese(${modelo.id})">
    Perguntas
  </button>
</div>
        </div>
      `).join("") : "<p>Nenhum modelo cadastrado.</p>"}
    </div>

  <div class="card" style="grid-column:1/-1;">
    <input
      id="buscaProntuario"
      placeholder="Pesquisar por cliente ou modelo..."
   value="${buscaOriginalProntuario}"
      oninput="carregarProntuarios()"
      style="margin-bottom:15px;"
    >

    <h3>Fichas de clientes</h3>

 ${fichasFiltradas.length ? fichasFiltradas.map(ficha=>`
        <div class="caixa-linha">
          <span>
            <strong>${ficha.clientes?.nome || "Cliente"}</strong><br>
            <small>${ficha.anamnese_modelos?.nome || "Modelo"}</small><br>
${badgeStatusAnamnese(ficha.status)}
          </span>

        <div style="display:flex;gap:8px;">
  <button onclick="abrirFichaAnamnese(${ficha.id})">
    Abrir
  </button>

  <button onclick="alterarStatusFichaAnamnese(${ficha.id})">
    Status
  </button>

  <button onclick="excluirFichaAnamnese(${ficha.id})">
    Excluir
  </button>
</div>
        </div>
`).join("") : "<p>Nenhuma ficha encontrada.</p>"}
    </div>
  `;
}
function abrirModalModeloAnamnese(){

  abrirModal(`
    <h2>Novo modelo de anamnese</h2>

    <label>Nome do modelo</label>
    <input
      id="modeloAnamneseNome"
      placeholder="Ex: Anamnese Capilar, Facial, Corporal"
    >

    <label>Descrição</label>
    <textarea
      id="modeloAnamneseDescricao"
      placeholder="Descreva quando este modelo será usado"
    ></textarea>

    <button class="principal" onclick="salvarModeloAnamnese()">
      Salvar modelo
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);
}
async function salvarModeloAnamnese(){

  const id = document.getElementById("modeloAnamneseId")?.value || "";
  const nome = document.getElementById("modeloAnamneseNome").value.trim();
  const descricao = document.getElementById("modeloAnamneseDescricao").value.trim();

  if(!nome){
    alert("Digite o nome do modelo.");
    return;
  }

  const dados = {
    unidade_id: unidadeAtualId,
    nome,
    descricao,
    ativo: true
  };

  let resposta;

  if(id){
    resposta = await supabaseClient
      .from("anamnese_modelos")
      .update(dados)
      .eq("id", id);
  }else{
    resposta = await supabaseClient
      .from("anamnese_modelos")
      .insert([dados]);
  }

  if(resposta.error){
    alert("Erro ao salvar modelo: " + resposta.error.message);
    return;
  }

  fecharModal();
  carregarProntuarios();

  alert("Modelo salvo com sucesso.");
}
async function abrirModalModeloAnamnese(id = null){

  let modelo = null;

  if(id){
    const resp = await supabaseClient
      .from("anamnese_modelos")
      .select("*")
      .eq("id", id)
      .single();

    modelo = resp.data;
  }

  abrirModal(`
    <h2>${id ? "Editar modelo" : "Novo modelo de anamnese"}</h2>

    <input id="modeloAnamneseId" type="hidden" value="${modelo?.id || ""}">

    <label>Nome do modelo</label>
    <input
      id="modeloAnamneseNome"
      value="${modelo?.nome || ""}"
      placeholder="Ex: Anamnese Capilar, Facial, Corporal"
    >

    <label>Descrição</label>
    <textarea
      id="modeloAnamneseDescricao"
      placeholder="Descreva quando este modelo será usado"
    >${modelo?.descricao || ""}</textarea>

    <button class="principal" onclick="salvarModeloAnamnese()">
      Salvar modelo
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);
}
async function carregarPerguntasAnamnese(){

  const lista =
    document.getElementById("listaPerguntasAnamnese");

  if(!lista) return;

  lista.innerHTML = "Carregando perguntas...";

  const { data, error } = await supabaseClient
    .from("anamnese_perguntas")
    .select("*")
    .eq("modelo_id", modeloAnamneseAtual)
    .eq("ativo", true)
    .order("ordem");

  if(error){
    lista.innerHTML = "<div class='card'>Erro ao carregar perguntas.</div>";
    return;
  }

  if(!data || data.length === 0){
    lista.innerHTML = "<div class='card'>Nenhuma pergunta cadastrada.</div>";
    return;
  }

  lista.innerHTML = data.map(pergunta => `
    <div class="card">
      <strong>${pergunta.pergunta}</strong>
      <p>Tipo: ${pergunta.tipo}</p>

      <div style="display:flex;gap:8px;margin-top:10px;">
        <button onclick="abrirModalPerguntaAnamnese(${pergunta.id})">
          Editar
        </button>

        <button onclick="desativarPerguntaAnamnese(${pergunta.id})">
          Remover
        </button>
      </div>
    </div>
  `).join("");
}
async function abrirModalPerguntaAnamnese(id = null){

  let perguntaAtual = null;

  if(id){
    const resp = await supabaseClient
      .from("anamnese_perguntas")
      .select("*")
      .eq("id", id)
      .single();

    perguntaAtual = resp.data;
  }

  abrirModal(`
    <h2>${id ? "Editar pergunta" : "Nova pergunta"}</h2>

    <input id="perguntaAnamneseId" type="hidden" value="${perguntaAtual?.id || ""}">

    <label>Pergunta</label>
    <input
      id="perguntaAnamneseTexto"
      value="${perguntaAtual?.pergunta || ""}"
    >

    <label>Tipo</label>
    <select id="perguntaAnamneseTipo">
      <option value="texto" ${perguntaAtual?.tipo === "texto" ? "selected" : ""}>Texto</option>
      <option value="sim_nao" ${perguntaAtual?.tipo === "sim_nao" ? "selected" : ""}>Sim / Não</option>
      <option value="numero" ${perguntaAtual?.tipo === "numero" ? "selected" : ""}>Número</option>
      <option value="multipla_escolha" ${perguntaAtual?.tipo === "multipla_escolha" ? "selected" : ""}>Múltipla escolha</option>
    </select>

    <button class="principal" onclick="salvarPerguntaAnamnese()">
      Salvar
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);
}
async function salvarPerguntaAnamnese(){

  const id = document.getElementById("perguntaAnamneseId")?.value || "";
  const pergunta = document.getElementById("perguntaAnamneseTexto").value.trim();
  const tipo = document.getElementById("perguntaAnamneseTipo").value;

  if(!modeloAnamneseAtual){
    alert("Modelo de anamnese não selecionado.");
    return;
  }

  if(!pergunta){
    alert("Digite a pergunta.");
    return;
  }

  const dados = {
    modelo_id: modeloAnamneseAtual,
    pergunta,
    tipo,
    opcoes: null,
    obrigatoria: false,
    ordem: 0,
    ativo: true
  };

  let resposta;

  if(id){
    resposta = await supabaseClient
      .from("anamnese_perguntas")
      .update(dados)
      .eq("id", id);
  }else{
    resposta = await supabaseClient
      .from("anamnese_perguntas")
      .insert([dados]);
  }

  if(resposta.error){
    alert("Erro ao salvar pergunta: " + resposta.error.message);
    return;
  }

  fecharModal();
  carregarPerguntasAnamnese();

  alert("Pergunta salva.");
}
async function desativarPerguntaAnamnese(id){

  const confirmar = confirm("Deseja remover esta pergunta do modelo?");

  if(!confirmar) return;

  const { error } = await supabaseClient
    .from("anamnese_perguntas")
    .update({
      ativo: false
    })
    .eq("id", id);

  if(error){
    alert("Erro ao remover pergunta: " + error.message);
    return;
  }

  carregarPerguntasAnamnese();
}
async function abrirModalAnamneseCliente(){

  if(!pode("prontuarios_criar")){
    alert("Você não tem permissão para criar prontuários.");
    return;
  }

  const [
    clientesResp,
    modelosResp
  ] = await Promise.all([

    supabaseClient
      .from("clientes")
      .select("id, nome, telefone")
      .eq("ativo", true)
      .order("nome"),

    supabaseClient
      .from("anamnese_modelos")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome")

  ]);

  if(clientesResp.error){

    alert(
      "Erro ao carregar clientes: " +
      clientesResp.error.message
    );

    return;
  }

  if(modelosResp.error){

    alert(
      "Erro ao carregar modelos: " +
      modelosResp.error.message
    );

    return;
  }

  const clientes =
    clientesResp.data || [];

  const modelos =
    modelosResp.data || [];

  if(clientes.length === 0){

    alert(
      "Nenhuma cliente cadastrada."
    );

    return;
  }

  if(modelos.length === 0){

    alert(
      "Nenhum modelo de prontuário cadastrado."
    );

    return;
  }

  abrirModal(`
    <h2>Nova ficha</h2>

    <p>
      Selecione a cliente e o modelo de prontuário.
    </p>

    <label>Pesquisar cliente</label>

    <input
      id="buscaClienteAnamnese"
      type="text"
      placeholder="Digite o nome da cliente"
      oninput="filtrarClientesAnamnese()"
    >

    <label>Cliente</label>

    <select id="anamneseCliente">

      <option value="">
        Selecione a cliente
      </option>

      ${clientes.map(cliente => `
        <option
          value="${cliente.id}"
          data-nome="${String(
            cliente.nome || ""
          ).toLowerCase()}"
        >
          ${cliente.nome}
          ${
            cliente.telefone
              ? ` - ${cliente.telefone}`
              : ""
          }
        </option>
      `).join("")}

    </select>

    <label>Modelo de prontuário</label>

    <select id="anamneseModelo">

      <option value="">
        Selecione o modelo
      </option>

      ${modelos.map(modelo => `
        <option value="${modelo.id}">
          ${modelo.nome}
        </option>
      `).join("")}

    </select>

    <button
      class="principal"
      onclick="salvarAnamneseCliente()"
    >
      Criar ficha
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);

}
function filtrarClientesAnamnese(){

  const busca =
    document
      .getElementById(
        "buscaClienteAnamnese"
      )
      ?.value
      ?.toLowerCase()
      ?.trim() || "";

  const select =
    document.getElementById(
      "anamneseCliente"
    );

  if(!select) return;

  Array
    .from(select.options)
    .forEach((option, indice) => {

      if(indice === 0){
        option.hidden = false;
        return;
      }

      const nome =
        option.dataset.nome || "";

      option.hidden =
        busca &&
        !nome.includes(busca);

    });

  select.value = "";

}
async function salvarAnamneseCliente(){

  const clienteId =
    document.getElementById("anamneseCliente").value;

  const modeloId =
    document.getElementById("anamneseModelo").value;

  if(!clienteId){
    alert("Selecione a cliente.");
    return;
  }

  if(!modeloId){
    alert("Selecione o modelo.");
    return;
  }

  const { error } = await supabaseClient
    .from("anamneses_clientes")
    .insert([{
      unidade_id: unidadeAtualId,
      cliente_id: Number(clienteId),
      modelo_id: Number(modeloId),
      status: "Em preenchimento"
    }]);

  if(error){
    alert("Erro ao criar ficha: " + error.message);
    return;
  }

  fecharModal();
  carregarProntuarios();

  alert("Ficha criada com sucesso.");
}
async function abrirFichaAnamnese(fichaId){

  const fichaResp = await supabaseClient
    .from("anamneses_clientes")
    .select(`
      *,
      clientes(nome, telefone),
      anamnese_modelos(nome)
    `)
    .eq("id", fichaId)
    .single();

  const ficha = fichaResp.data;

  if(!ficha){
    alert("Ficha não encontrada.");
    return;
  }

  const perguntasResp = await supabaseClient
    .from("anamnese_perguntas")
    .select("*")
    .eq("modelo_id", ficha.modelo_id)
    .eq("ativo", true)
    .order("ordem");

  const respostasResp = await supabaseClient
    .from("anamnese_respostas")
    .select("*")
    .eq("anamnese_cliente_id", fichaId);

  const perguntas = perguntasResp.data || [];
  const respostas = respostasResp.data || [];

  abrirModal(`
    <h2>${ficha.anamnese_modelos?.nome || "Prontuário"}</h2>

    <p><strong>Cliente:</strong> ${ficha.clientes?.nome || "-"}</p>
    <p><strong>Status:</strong> ${ficha.status}</p>

    <input id="fichaAnamneseId" type="hidden" value="${ficha.id}">

    ${perguntas.map(pergunta=>{

      const respostaAtual =
        respostas.find(r => String(r.pergunta_id) === String(pergunta.id))?.resposta || "";

      if(pergunta.tipo === "sim_nao"){
        return `
          <label>${pergunta.pergunta}</label>
          <select class="resposta-anamnese" data-pergunta-id="${pergunta.id}">
            <option value="">Selecione</option>
            <option value="Sim" ${respostaAtual === "Sim" ? "selected" : ""}>Sim</option>
            <option value="Não" ${respostaAtual === "Não" ? "selected" : ""}>Não</option>
          </select>
        `;
      }

      if(pergunta.tipo === "numero"){
        return `
          <label>${pergunta.pergunta}</label>
          <input
            class="resposta-anamnese"
            data-pergunta-id="${pergunta.id}"
            type="number"
            value="${respostaAtual}"
          >
        `;
      }

      return `
        <label>${pergunta.pergunta}</label>
        <textarea
          class="resposta-anamnese"
          data-pergunta-id="${pergunta.id}"
        >${respostaAtual}</textarea>
      `;
    }).join("")}

    <div class="card" style="margin-top:20px;">
      <h3>Assinatura digital</h3>

      <p>
        Declaro que as informações preenchidas são verdadeiras e autorizo o uso
        dessas informações para avaliação e acompanhamento estético.
      </p>

      <label>CPF da cliente</label>
      <input
        id="cpfAssinanteAnamnese"
        value="${ficha.cpf_assinante || ""}"
        placeholder="CPF da cliente"
      >

      <label>Assinatura</label>

      ${
        ficha.assinatura_base64
          ? `
            <img
              src="${ficha.assinatura_base64}"
              style="width:100%;max-height:160px;border:1px solid #ddd;border-radius:10px;background:#fff;"
            >
            <p><small>Assinada em: ${ficha.assinado_em ? new Date(ficha.assinado_em).toLocaleString("pt-BR") : "-"}</small></p>
          `
          : `
            <canvas
              id="canvasAssinaturaAnamnese"
              width="500"
              height="180"
              style="width:100%;height:180px;border:1px solid #ddd;border-radius:10px;background:#fff;touch-action:none;"
            ></canvas>

            <div style="display:flex;gap:8px;margin-top:10px;">
              <button onclick="limparAssinaturaAnamnese()">
                Limpar assinatura
              </button>

              <button class="principal" onclick="salvarAssinaturaAnamnese()">
                Salvar assinatura
              </button>
            </div>
          `
      }
    </div>

    <button class="principal" onclick="salvarRespostasAnamnese()">
      Salvar respostas
    </button>

    <button onclick="fecharModal()">
      Fechar
    </button>
  `);

  if(!ficha.assinatura_base64){
    iniciarCanvasAssinaturaAnamnese();
  }
}
async function salvarRespostasAnamnese(){

  const fichaId = document.getElementById("fichaAnamneseId")?.value;

  if(!fichaId){
    alert("Ficha não encontrada.");
    return;
  }

  const campos = Array.from(
    document.querySelectorAll(".resposta-anamnese")
  );

  for(const campo of campos){

    const perguntaId = Number(campo.dataset.perguntaId);
    const resposta = campo.value || "";

    const existenteResp = await supabaseClient
      .from("anamnese_respostas")
      .select("id")
      .eq("anamnese_cliente_id", fichaId)
      .eq("pergunta_id", perguntaId)
      .maybeSingle();

    if(existenteResp.data){

      await supabaseClient
        .from("anamnese_respostas")
        .update({
          resposta
        })
        .eq("id", existenteResp.data.id);

    }else{

      await supabaseClient
        .from("anamnese_respostas")
        .insert([{
          anamnese_cliente_id: Number(fichaId),
          pergunta_id: perguntaId,
          resposta
        }]);

    }

  }

  await supabaseClient
    .from("anamneses_clientes")
    .update({
      status: "Em preenchimento"
    })
    .eq("id", fichaId);

  fecharModal();
  carregarProntuarios();

  alert("Respostas salvas.");
}
async function abrirPerguntasModeloAnamnese(modeloId){

  modeloAnamneseAtual = modeloId;

  document.querySelectorAll(".tela").forEach((tela)=>{
    tela.classList.remove("ativa");
  });

  document
    .getElementById("tela-perguntas-anamnese")
    .classList.add("ativa");

  carregarPerguntasAnamnese();
}
function badgeStatusAnamnese(status){

  if(status === "Assinado"){
    return `<span class="badge-status verde">Assinado</span>`;
  }

  if(status === "Finalizado"){
    return `<span class="badge-status azul">Finalizado</span>`;
  }

  return `<span class="badge-status amarelo">Em preenchimento</span>`;
}
async function alterarStatusFichaAnamnese(fichaId){

  const novoStatus = prompt(
    "Digite o novo status:\n\n1 - Em preenchimento\n2 - Finalizado\n3 - Assinado"
  );

  let status = "";

  if(novoStatus === "1") status = "Em preenchimento";
  if(novoStatus === "2") status = "Finalizado";
  if(novoStatus === "3") status = "Assinado";

  if(!status){
    alert("Status inválido.");
    return;
  }

  const { error } = await supabaseClient
    .from("anamneses_clientes")
    .update({ status })
    .eq("id", fichaId);

  if(error){
    alert("Erro ao alterar status: " + error.message);
    return;
  }

  carregarProntuarios();
}
async function excluirFichaAnamnese(fichaId){

  const confirmar = confirm(
    "Deseja excluir esta ficha? As respostas vinculadas também serão removidas."
  );

  if(!confirmar) return;

  await supabaseClient
    .from("anamnese_respostas")
    .delete()
    .eq("anamnese_cliente_id", fichaId);

  const { error } = await supabaseClient
    .from("anamneses_clientes")
    .delete()
    .eq("id", fichaId);

  if(error){
    alert("Erro ao excluir ficha: " + error.message);
    return;
  }

  carregarProntuarios();
}
let assinaturaAnamneseDesenhando = false;

function iniciarCanvasAssinaturaAnamnese(){

  const canvas = document.getElementById("canvasAssinaturaAnamnese");

  if(!canvas) return;

  const ctx = canvas.getContext("2d");

  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  function posicao(evento){

    const rect = canvas.getBoundingClientRect();

    const toque = evento.touches ? evento.touches[0] : evento;

    return {
      x: (toque.clientX - rect.left) * (canvas.width / rect.width),
      y: (toque.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function iniciar(evento){
    assinaturaAnamneseDesenhando = true;
    const p = posicao(evento);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    evento.preventDefault();
  }

  function desenhar(evento){

    if(!assinaturaAnamneseDesenhando) return;

    const p = posicao(evento);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    evento.preventDefault();
  }

  function parar(){
    assinaturaAnamneseDesenhando = false;
  }

  canvas.addEventListener("mousedown", iniciar);
  canvas.addEventListener("mousemove", desenhar);
  canvas.addEventListener("mouseup", parar);
  canvas.addEventListener("mouseleave", parar);

  canvas.addEventListener("touchstart", iniciar);
  canvas.addEventListener("touchmove", desenhar);
  canvas.addEventListener("touchend", parar);
}
function limparAssinaturaAnamnese(){

  const canvas = document.getElementById("canvasAssinaturaAnamnese");

  if(!canvas) return;

  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
async function salvarAssinaturaAnamnese(){

  const fichaId = document.getElementById("fichaAnamneseId")?.value;
  const cpf = document.getElementById("cpfAssinanteAnamnese")?.value?.trim() || "";
  const canvas = document.getElementById("canvasAssinaturaAnamnese");

  if(!fichaId || !canvas){
    alert("Ficha ou assinatura não encontrada.");
    return;
  }

  const assinaturaBase64 = canvas.toDataURL("image/png");

  const { error } = await supabaseClient
    .from("anamneses_clientes")
    .update({
      cpf_assinante: cpf,
      assinatura_base64: assinaturaBase64,
      usuario_responsavel: usuarioLogado?.nome || usuarioLogado?.usuario || "Sistema",
      assinado_em: new Date().toISOString(),
      status: "Assinado"
    })
    .eq("id", fichaId);

  if(error){
    alert("Erro ao salvar assinatura: " + error.message);
    return;
  }

  fecharModal();
  carregarProntuarios();

  alert("Assinatura salva com sucesso.");
}


async function editarUsuarioSistema(usuarioId){

  if(!pode("gestores_editar_usuario")){
    alert("Você não tem permissão para editar usuários.");
    return;
  }

  const usuarioResp = await supabaseClient
    .from("usuarios_sistema")
    .select("*")
    .eq("id", usuarioId)
    .single();

  const profissionaisResp = await supabaseClient
    .from("profissionais")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  const perfisResp = await supabaseClient
    .from("perfis_acesso")
    .select("*")
    .order("nome");

  const usuario = usuarioResp.data;
  const profissionais = profissionaisResp.data || [];
  const perfis = perfisResp.data || [];

  abrirModal(`
    <h2>Editar usuário</h2>

    <input id="usuarioSistemaId" type="hidden" value="${usuario.id}">

    <label>Nome</label>
    <input id="usuarioSistemaNome" value="${usuario.nome || ""}">

    <label>Login</label>
    <input id="usuarioSistemaLogin" value="${usuario.usuario || ""}">

    <label>Senha</label>
    <input id="usuarioSistemaSenha" value="${usuario.senha || ""}">


   <label>Perfil</label>

<select id="usuarioPerfilId">

  ${perfis.map(p=>`
    <option
      value="${p.id}"
      ${String(usuario.perfil_acesso_id || "") === String(p.id) ? "selected" : ""}
    >
      ${p.nome}
    </option>
  `).join("")}

</select>
    <label>Profissional vinculado</label>
    <select id="usuarioProfissionalId">
      <option value="">Não vinculado</option>

      ${profissionais.map(p=>`
        <option
          value="${p.id}"
          ${String(usuario.profissional_id || "") === String(p.id) ? "selected" : ""}
        >
          ${p.nome}
        </option>
      `).join("")}
    </select>

    <button class="principal" onclick="salvarUsuarioSistema()">
      Salvar usuário
    </button>

    <button onclick="fecharModal()">Cancelar</button>
  `);
}
async function salvarUsuarioSistema(){

  const id = document.getElementById("usuarioSistemaId").value;

  const profissionalId =
    document.getElementById("usuarioProfissionalId").value;
  const perfilId =
  document.getElementById("usuarioPerfilId").value;

 const dados = {
  nome: document.getElementById("usuarioSistemaNome").value.trim(),
  usuario: document.getElementById("usuarioSistemaLogin").value.trim(),
  senha: document.getElementById("usuarioSistemaSenha").value.trim(),

  perfil_acesso_id: perfilId ? Number(perfilId) : null,

  profissional_id: profissionalId ? Number(profissionalId) : null
};

  if(!dados.nome || !dados.usuario || !dados.senha){
    alert("Preencha nome, login e senha.");
    return;
  }

  const { error } = await supabaseClient
    .from("usuarios_sistema")
    .update(dados)
    .eq("id", id);

  if(error){
    alert("Erro ao salvar usuário: " + error.message);
    return;
  }

  fecharModal();
  carregarGestores();

  alert("Usuário salvo com sucesso.");
}
async function carregarUsuariosSistemaV2(){

  const area = document.getElementById("areaGestores");

  const usuariosResp = await supabaseClient
    .from("usuarios_sistema")
    .select(`
      *,
      profissionais(nome),
      perfis_acesso(nome)
    `)
    .order("nome");

  const usuarios = usuariosResp.data || [];

  area.innerHTML = `

    <div class="card">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
      ">

        <h2>Usuários do sistema</h2>

        <button
          class="principal"
          onclick="abrirModalNovoUsuarioV2()"
        >
          Novo usuário
        </button>

      </div>

      <br>

      ${usuarios.map(usuario => `

        <div class="caixa-linha">

          <span>

            <strong>${usuario.nome}</strong><br>

            <small>
              Login: ${usuario.usuario}
            </small><br>

            <small>
              Perfil:
              ${usuario.perfis_acesso?.nome || "Sem perfil"}
            </small><br>

            <small>
              Profissional:
              ${usuario.profissionais?.nome || "Não vinculado"}
            </small>

          </span>

          <button
            onclick="editarUsuarioSistema(${usuario.id})"
          >
            Editar
          </button>

        </div>

      `).join("")}

      <br>

      <button onclick="carregarGestores()">
        Voltar
      </button>

    </div>
  `;
}
async function carregarPerfisSistemaV2(){

  const area = document.getElementById("areaGestores");

  const perfisResp = await supabaseClient
    .from("perfis_acesso")
    .select("*")
    .order("nome");

  const perfis = perfisResp.data || [];

  area.innerHTML = `

    <div class="card">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
      ">

        <h2>Perfis do sistema</h2>

        <button
          class="principal"
          onclick="abrirModalNovoPerfil()"
        >
          Novo perfil
        </button>

      </div>

      <br>

      ${perfis.map(perfil => `

        <div class="caixa-linha">

          <span>
            <strong>${perfil.nome}</strong>
          </span>

          <button
            onclick="editarPerfilSistema(${perfil.id})"
          >
            Editar
          </button>

        </div>

      `).join("")}

      <br>

      <button onclick="carregarGestores()">
        Voltar
      </button>

    </div>
  `;
}
async function abrirModalNovoUsuarioV2(){

  alert("Vamos construir modal novo");

}
async function abrirModalNovoPerfil(){

  abrirModal(`

    <h2>Novo perfil</h2>

    <label>Nome perfil</label>

    <input id="novoPerfilNome">

    <button class="principal"
      onclick="salvarNovoPerfil()">
      Salvar
    </button>

  `);

}
async function salvarNovoPerfil(){

  const nome =
    document.getElementById("novoPerfilNome").value.trim();

  if(!nome){
    alert("Digite o nome.");
    return;
  }

  await supabaseClient
    .from("perfis_acesso")
    .insert({
      nome
    });

  fecharModal();

  carregarPerfisSistemaV2();

}
async function editarPerfilSistema(perfilId){

  const perfilResp = await supabaseClient
    .from("perfis_acesso")
    .select("*")
    .eq("id", perfilId)
    .single();

  const perfil = perfilResp.data;

 const grupos = [

{
  titulo:"DASHBOARD",
  itens:[
    ["dashboard_visualizar","Visualizar dashboard"],
    ["dashboard_financeiro","Visualizar financeiro"],
    ["dashboard_metas","Visualizar metas"],
    ["dashboard_ranking","Visualizar ranking"]
  ]
},

{
  titulo:"AGENDA",
  itens:[
    ["agenda_visualizar","Visualizar módulo agenda"],

    ["agenda_ver_propria","Ver apenas própria agenda"],
    ["agenda_ver_todos","Ver agenda de todos"],

    ["agenda_criar","Criar agendamento"],
    ["agenda_editar","Editar agendamento"],
    ["agenda_cancelar","Cancelar agendamento"],
    ["agenda_recorrencia","Criar recorrência"],
    ["agenda_bloqueio","Criar bloqueios"],
    ["agenda_faturar","Faturar atendimento"]
  ]
},

{
  titulo:"CLIENTES",
  itens:[
    ["clientes_visualizar","Visualizar módulo clientes"],

    ["clientes_ver_proprios","Ver apenas meus clientes"],
    ["clientes_ver_todos","Ver todos clientes"],

    ["clientes_criar","Criar cliente"],
    ["clientes_editar","Editar cliente"],
    ["clientes_excluir","Excluir cliente"],
    ["clientes_vip","Marcar VIP"],
    ["clientes_observacoes","Ver observações internas"],
    ["clientes_historico","Ver histórico completo"]
  ]
},

{
  titulo:"PROFISSIONAIS",
  itens:[
    ["profissionais_visualizar","Visualizar profissionais"],
    ["profissionais_criar","Criar profissional"],
    ["profissionais_editar","Editar profissional"],
    ["profissionais_excluir","Excluir profissional"],
    ["profissionais_comissao","Alterar comissão profissional"]
  ]
},

{
  titulo:"SERVIÇOS",
  itens:[
    ["servicos_visualizar","Visualizar serviços"],
    ["servicos_criar","Criar serviço"],
    ["servicos_editar","Editar serviço"],
    ["servicos_excluir","Excluir serviço"],
    ["servicos_valor","Alterar valor"],
    ["servicos_comissao","Alterar comissão"]
  ]
},

{
  titulo:"PRONTUÁRIOS",
  itens:[
    ["prontuarios_visualizar","Visualizar prontuários"],

    ["prontuarios_ver_proprios","Ver apenas meus prontuários"],
    ["prontuarios_ver_todos","Ver todos prontuários"],

    ["prontuarios_criar","Criar ficha"],
    ["prontuarios_editar","Editar respostas"],
    ["prontuarios_modelos","Criar modelos"],
    ["prontuarios_perguntas","Criar perguntas"],
    ["prontuarios_assinatura","Assinatura digital"],
    ["prontuarios_excluir","Excluir ficha"]
  ]
},

{
  titulo:"PACOTES",
  itens:[
    ["pacotes_visualizar","Visualizar pacotes"],
    ["pacotes_criar","Criar pacote"],
    ["pacotes_editar","Editar pacote"],
    ["pacotes_vender","Vender pacote"],
    ["pacotes_consumir","Consumir saldo"],
    ["pacotes_cancelar","Cancelar pacote"]
  ]
},

{
  titulo:"COMANDAS",
  itens:[
    ["comandas_visualizar","Visualizar comandas"],
    ["comandas_criar","Criar comanda"],
    ["comandas_editar","Editar comanda"],
    ["comandas_faturar","Faturar cliente"],
    ["comandas_cancelar","Cancelar faturamento"],
    ["comandas_desconto","Aplicar desconto"]
  ]
},

{
  titulo:"CAIXA",
  itens:[
    ["caixa_visualizar","Visualizar caixa"],
    ["caixa_abrir","Abrir caixa"],
    ["caixa_fechar","Fechar caixa"],
    ["caixa_sangria","Sangria"],
    ["caixa_reforco","Reforço"],
    ["caixa_reabrir","Reabrir caixa"]
  ]
},

{
  titulo:"COMISSÕES",
  itens:[
    ["comissoes_visualizar","Visualizar comissões"],

    ["comissoes_ver_propria","Ver própria comissão"],
    ["comissoes_ver_todas","Ver comissão de todos"],

    ["comissoes_gerar","Gerar comissão"],
    ["comissoes_editar","Editar comissão"],
    ["comissoes_pagar","Marcar paga"]
  ]
},

{
  titulo:"RELATÓRIOS",
  itens:[
    ["relatorios_visualizar","Visualizar relatórios"],
    ["relatorios_exportar","Exportar relatórios"],
    ["relatorios_financeiros","Relatórios financeiros"]
  ]
},

{
  titulo:"CONFIGURAÇÕES",
  itens:[
    ["configuracoes_visualizar","Visualizar configurações"],
    ["configuracoes_editar","Editar configurações"]
  ]
},

{
  titulo:"GESTORES",
  itens:[
    ["gestores_visualizar","Visualizar gestores"],
    ["gestores_criar_usuario","Criar usuário"],
    ["gestores_editar_usuario","Editar usuário"],
    ["gestores_criar_perfil","Criar perfil"],
    ["gestores_permissoes","Editar permissões"]
  ]
},

{
  titulo:"AUDITORIA",
  itens:[
    ["auditoria_visualizar","Visualizar auditoria"],
    ["auditoria_financeira","Auditoria financeira"]
  ]
}

];
  const permissoesResp = await supabaseClient
    .from("perfis_permissoes")
    .select("*")
    .eq("perfil_id", perfilId);

  const salvas = permissoesResp.data || [];

  abrirModal(`

    <h2>${perfil.nome}</h2>

    <input
      id="perfilPermissaoId"
      type="hidden"
      value="${perfilId}"
    >

    <div style="
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:20px;
      max-height:500px;
      overflow:auto;
    ">

      ${grupos.map(grupo=>`

        <div style="
          border:1px solid #eee;
          border-radius:16px;
          padding:20px;
        ">

          <h3>${grupo.titulo}</h3>

          ${grupo.itens.map(([chave,nome])=>`

            <label style="
              display:flex;
              gap:10px;
              margin-bottom:12px;
              align-items:center;
            ">

              <input
                type="checkbox"
                class="checkPermissaoPerfil"
                value="${chave}"

                ${salvas.find(p=>p.permissao===chave)?.permitido ? "checked" : ""}
              >

              ${nome}

            </label>

          `).join("")}

        </div>

      `).join("")}

    </div>

    <br>

    <button
      class="principal"
      onclick="salvarPermissoesPerfilV2()"
    >
      Salvar permissões
    </button>

  `);
}
async function salvarPermissoesPerfilV2(){

  const perfilId =
    document.getElementById("perfilPermissaoId").value;

  const checks = Array.from(
    document.querySelectorAll(".checkPermissaoPerfil")
  );

  await supabaseClient
    .from("perfis_permissoes")
    .delete()
    .eq("perfil_id", perfilId);

  const dados = checks.map(check => ({
    perfil_id: Number(perfilId),
    permissao: check.value,
    permitido: check.checked
  }));

  await supabaseClient
    .from("perfis_permissoes")
    .insert(dados);

  alert("Permissões salvas.");

  fecharModal();

}
async function carregarPermissoesSistemaV2(){

  const area = document.getElementById("areaGestores");

  if(!area) return;

  const perfisResp = await supabaseClient
    .from("perfis_acesso")
    .select("*")
    .order("nome");

  const perfis = perfisResp.data || [];

  area.innerHTML = `

    <div class="card">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:18px;
      ">
        <div>
          <h2>Permissões por perfil</h2>
          <p style="margin:4px 0;color:#777;">
            Configure o que cada perfil pode acessar no sistema.
          </p>
        </div>

        <button onclick="carregarGestores()">
          Voltar
        </button>
      </div>

      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
        gap:16px;
      ">

        ${perfis.map(perfil=>`

          <div class="permissao-card">

            <h3>${perfil.nome}</h3>

            <p style="color:#777;font-size:14px;">
              Editar acessos laterais, ações e permissões deste perfil.
            </p>

            <button
              class="principal"
              onclick="editarPerfilSistema(${perfil.id})"
            >
              Configurar permissões
            </button>

          </div>

        `).join("")}

      </div>

    </div>

  `;
}
function aplicarPermissoesMenu(){

  if(!pode("dashboard_visualizar")){
    document.getElementById("menu-dashboard")?.remove();
  }

  if(!pode("agenda_visualizar")){
    document.getElementById("menu-agenda")?.remove();
  }

  if(!pode("clientes_visualizar")){
    document.getElementById("menu-clientes")?.remove();
  }

  if(!pode("profissionais_visualizar")){
    document.getElementById("menu-profissionais")?.remove();
  }

  if(!pode("servicos_visualizar")){
    document.getElementById("menu-servicos")?.remove();
  }

  if(!pode("prontuarios_visualizar")){
    document.getElementById("menu-prontuarios")?.remove();
  }

  if(!pode("pacotes_visualizar")){
    document.getElementById("menu-pacotes")?.remove();
  }

  if(!pode("comandas_visualizar")){
    document.getElementById("menu-comandas")?.remove();
  }

  if(!pode("relatorios_visualizar")){
    document.getElementById("menu-relatorios")?.remove();
  }

  if(!pode("configuracoes_visualizar")){
    document.getElementById("menu-configuracoes")?.remove();
  }

  if(!pode("gestores_visualizar")){
    document.getElementById("menu-gestores")?.remove();
  }

  if(!pode("caixa_visualizar")){
    document.getElementById("menu-caixa")?.remove();
  }

  if(!pode("comissoes_visualizar")){
    document.getElementById("menu-comissoes")?.remove();
  }

  if(!pode("auditoria_visualizar")){
    document.getElementById("menu-auditoria")?.remove();
  }

}
async function carregarPendenciasFinanceiras(){

  const lista = document.getElementById("listaPendencias");
  if(!lista) return;

  const busca =
    document
      .getElementById("buscaPendenciaCliente")
      ?.value
      ?.toLowerCase()
      .trim() || "";

  lista.innerHTML = "Carregando...";

  const { data, error } = await supabaseClient
    .from("financeiro_lancamentos")
    .select("*")
    .eq("tipo", "PENDENCIA")
    .eq("status", "ATIVO")
    .order("data", { ascending: true });

  if(error){
    lista.innerHTML = "Erro ao carregar pendências.";
    return;
  }

  if(!data || data.length === 0){
    lista.innerHTML = `
      <div class="card">
        Nenhuma pendência financeira.
      </div>
    `;
    return;
  }

  const clientesIds = [
    ...new Set(
      data
        .map(p => p.cliente_id)
        .filter(Boolean)
    )
  ];

  const clientesResp = await supabaseClient
    .from("clientes")
    .select("id,nome")
    .in("id", clientesIds);

  const clientes = clientesResp.data || [];

  const pendencias = data
    .map(p => ({
      ...p,
      clienteNome:
        clientes.find(c =>
          String(c.id) === String(p.cliente_id)
        )?.nome || "Cliente não informado"
    }))
    .filter(p =>
      !busca ||
      p.clienteNome
        .toLowerCase()
        .includes(busca)
    );

  if(pendencias.length === 0){
    lista.innerHTML = `
      <div class="card">
        Nenhuma pendência encontrada.
      </div>
    `;
    return;
  }

  const porCliente = {};

  pendencias.forEach(p => {

    if(!porCliente[p.cliente_id]){
      porCliente[p.cliente_id] = {
        nome: p.clienteNome,
        total: 0,
        itens: []
      };
    }

    porCliente[p.cliente_id].total +=
      Number(p.valor || 0);

    porCliente[p.cliente_id].itens.push(p);
  });

  lista.innerHTML = "";

  Object.keys(porCliente).forEach(clienteId => {

    const grupo = porCliente[clienteId];

    lista.innerHTML += `
      <div class="card">

        <h3>${grupo.nome}</h3>

        <p>
          Total em aberto:
          <strong>${dinheiro(grupo.total)}</strong>
        </p>

        <p>
          Pendências:
          ${grupo.itens.length}
        </p>

        <button
          class="principal"
          onclick="abrirReceberPendenciasCliente(${clienteId})"
        >
          Receber
        </button>

        <button
          onclick="abrirCancelarPendenciasCliente(${clienteId})"
        >
          Cancelar pendência
        </button>

      </div>
    `;
  });
}
window.abrirReceberPendenciasCliente = async function(clienteId){

  const { data: cliente, error: erroCliente } = await supabaseClient
    .from("clientes")
    .select("id, nome")
    .eq("id", clienteId)
    .single();

  if(erroCliente){
    console.error(erroCliente);
    alert("Erro ao localizar a cliente.");
    return;
  }

  const { data: pendencias, error } = await supabaseClient
    .from("financeiro_lancamentos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("tipo", "PENDENCIA")
    .eq("status", "ATIVO")
    .order("data", { ascending: true });

  if(error){
    console.error(error);
    alert("Erro ao carregar as pendências.");
    return;
  }

  if(!pendencias || pendencias.length === 0){
    alert("Esta cliente não possui pendências ativas.");
    carregarPendenciasFinanceiras();
    return;
  }

  const { data: formasPagamento, error: erroFormas } = await supabaseClient
    .from("formas_pagamento")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");

  if(erroFormas){
    console.error(erroFormas);
    alert("Erro ao carregar as formas de pagamento.");
    return;
  }

  const total = pendencias.reduce(
    (soma, item) => soma + Number(item.valor || 0),
    0
  );

  abrirModal(`
    <h2>Receber pendência</h2>

    <p>
      <strong>Cliente:</strong>
      ${cliente?.nome || "Cliente"}
    </p>

    <p>
      <strong>Total em aberto:</strong>
      ${dinheiro(total)}
    </p>

    <label>Forma de pagamento</label>

    <select id="pendenciaFormaPagamento">
      <option value="">Selecione</option>

      ${(formasPagamento || []).map(forma => `
        <option value="${forma.id}">
          ${forma.nome}
        </option>
      `).join("")}
    </select>

    <label>Valor recebido</label>

    <input
      type="number"
      id="pendenciaValorPago"
      step="0.01"
      min="0.01"
      value="${total.toFixed(2)}"
    >

    <button
      type="button"
      class="principal"
      onclick="confirmarRecebimentoPendenciasCliente(${clienteId})"
    >
      Confirmar recebimento
    </button>

    <button type="button" onclick="fecharModal()">
      Voltar
    </button>
  `);
};
async function abrirCancelarPendenciasCliente(clienteId){

  const { data: cliente } = await supabaseClient
    .from("clientes")
    .select("id, nome")
    .eq("id", clienteId)
    .single();

  const { data: pendencias, error } = await supabaseClient
    .from("financeiro_lancamentos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("tipo", "PENDENCIA")
    .eq("status", "ATIVO")
    .order("data", { ascending: true });

  if(error){
    alert("Erro ao carregar pendências.");
    return;
  }

  if(!pendencias || pendencias.length === 0){
    alert("Esta cliente não possui pendências ativas.");
    carregarPendenciasFinanceiras();
    return;
  }

  abrirModal(`
    <h2>Cancelar pendência</h2>

    <p>
      <strong>Cliente:</strong>
      ${cliente?.nome || "Cliente"}
    </p>

    <p>
      Escolha exatamente qual pendência deseja cancelar.
    </p>

    <hr>

    ${pendencias.map(p => `
      <div class="caixa-linha">

        <span>
          ${formatarDataComanda(p.data)}
          <br>
          <small>
            ${p.observacao || "Pendência financeira"}
          </small>
        </span>

        <div>
          <strong>
            ${dinheiro(p.valor)}
          </strong>

          <button
            onclick="confirmarCancelamentoPendencia(${p.id}, ${clienteId})"
          >
            Cancelar esta
          </button>
        </div>

      </div>
    `).join("")}

    <hr>

    <button onclick="fecharModal()">
      Voltar
    </button>
  `);
}
async function confirmarCancelamentoPendencia(
  lancamentoId,
  clienteId
){

  const confirmar = confirm(
    "Tem certeza que deseja cancelar esta pendência financeira?"
  );

  if(!confirmar) return;

  const senha = prompt(
    "Digite a senha de autorização para cancelar a pendência:"
  );

  if(senha === null) return;

  if(!senha.trim()){
    alert("Digite a senha.");
    return;
  }

  const { data, error } = await supabaseClient.rpc(
    "cancelar_pendencia_financeira",
    {
      p_lancamento_id: lancamentoId,
      p_senha: senha
    }
  );

  if(error){
    console.error(error);
    alert(
      "Erro ao cancelar pendência: " +
      error.message
    );
    return;
  }

  if(!data?.sucesso){
    alert(
      data?.mensagem ||
      "Não foi possível cancelar a pendência."
    );
    return;
  }

  await registrarHistoricoOperacao(
    "cancelamento_pendencia_financeira",
    String(lancamentoId),
    "Pendência financeira cancelada",
    {
      lancamento_id: lancamentoId,
      cliente_id: clienteId
    }
  );

  fecharModal();

  await carregarPendenciasFinanceiras();

  alert("Pendência financeira cancelada.");
}
window.abrirReceberPendenciasCliente = async function(clienteId){

  const { data: cliente, error: erroCliente } = await supabaseClient
    .from("clientes")
    .select("id, nome")
    .eq("id", clienteId)
    .single();

  if(erroCliente){
    console.error(erroCliente);
    alert("Erro ao localizar a cliente.");
    return;
  }

  const { data: pendencias, error } = await supabaseClient
    .from("financeiro_lancamentos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("tipo", "PENDENCIA")
    .eq("status", "ATIVO")
    .order("data", { ascending: true });

  if(error){
    console.error(error);
    alert("Erro ao carregar as pendências.");
    return;
  }

  if(!pendencias || pendencias.length === 0){
    alert("Esta cliente não possui pendências ativas.");
    return;
  }

  const { data: formasPagamento, error: erroFormas } = await supabaseClient
    .from("formas_pagamento")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");

  if(erroFormas){
    console.error(erroFormas);
    alert("Erro ao carregar as formas de pagamento.");
    return;
  }

  const total = pendencias.reduce(
    (soma, item) => soma + Number(item.valor || 0),
    0
  );

  abrirModal(`
    <h2>Receber pendência</h2>

    <p>
      <strong>Cliente:</strong>
      ${cliente?.nome || "Cliente"}
    </p>

    <p>
      <strong>Total em aberto:</strong>
      ${dinheiro(total)}
    </p>

    <label>Forma de pagamento</label>

    <select id="pendenciaFormaPagamento">
      <option value="">Selecione</option>

      ${(formasPagamento || []).map(forma => `
        <option value="${forma.id}">
          ${forma.nome}
        </option>
      `).join("")}
    </select>

    <label>Valor recebido</label>

    <input
      type="number"
      id="pendenciaValorPago"
      step="0.01"
      min="0.01"
      value="${total.toFixed(2)}"
    >

    <button
      type="button"
      class="principal"
      onclick="confirmarRecebimentoPendenciasCliente(${clienteId})"
    >
      Confirmar recebimento
    </button>

    <button
      type="button"
      onclick="fecharModal()"
    >
      Voltar
    </button>
  `);
};
async function confirmarRecebimentoPendenciasCliente(clienteId){

  const formaPagamentoId = Number(document.getElementById("pendenciaFormaPagamento").value);
  let valorPago = Number(document.getElementById("pendenciaValorPago").value || 0);

  if(!formaPagamentoId){
    alert("Selecione a forma de pagamento.");
    return;
  }

  if(valorPago <= 0){
    alert("Informe um valor válido.");
    return;
  }

  const { data: pendencias, error } = await supabaseClient
    .from("financeiro_lancamentos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("tipo", "PENDENCIA")
    .eq("status", "ATIVO")
    .order("data", { ascending:true });

  if(error || !pendencias || pendencias.length === 0){
    alert("Nenhuma pendência encontrada.");
    return;
  }

  const totalAberto = pendencias.reduce((soma, p)=> soma + Number(p.valor || 0), 0);

  if(valorPago > totalAberto){
    alert("O valor pago não pode ser maior que o total em aberto.");
    return;
  }

  await supabaseClient
    .from("financeiro_lancamentos")
    .insert([{
      unidade_id: unidadeAtualId,
      tipo: "RECEBIMENTO",
      origem: "PENDENCIA_CLIENTE",
      origem_id: null,
      cliente_id: clienteId,
      forma_pagamento_id: formaPagamentoId,
      valor: valorPago,
      data: new Date().toISOString(),
      usuario_id: usuarioLogado?.id || null,
      status: "ATIVO",
      observacao: "Recebimento de pendências financeiras"
    }]);

  let restante = valorPago;

  for(const p of pendencias){

    if(restante <= 0) break;

    const valorPendencia = Number(p.valor || 0);
    const valorBaixado = Math.min(restante, valorPendencia);
    const novoSaldo = valorPendencia - valorBaixado;

    if(p.origem === "COMANDA" && p.origem_id){
      await registrarEntradaCaixa(
        p.origem_id,
        formaPagamentoId,
        valorBaixado
      );
    }

    if(novoSaldo <= 0){

      await supabaseClient
        .from("financeiro_lancamentos")
        .update({
          status: "QUITADO"
        })
        .eq("id", p.id);

      if(p.origem === "COMANDA" && p.origem_id){
        await supabaseClient
          .from("comandas")
          .update({ status: "Fechada" })
          .eq("id", p.origem_id);
      }

    }else{

      await supabaseClient
        .from("financeiro_lancamentos")
        .update({
          valor: novoSaldo,
          observacao: (p.observacao || "") + ` | Parcial recebido: ${dinheiro(valorBaixado)}`
        })
        .eq("id", p.id);

    }

    restante -= valorBaixado;
  }

  fecharModal();
  carregarPendenciasFinanceiras();
  carregarComandas();
  carregarCaixas();

  alert("Recebimento registrado com sucesso.");
}

async function carregarCreditosClientes(){

    const area = document.getElementById("listaCreditosClientes");

    if(!area) return;

    area.innerHTML = "Carregando...";

    const { data, error } = await supabaseClient
        .from("carteira_clientes")
        .select("*")
        .eq("ativo", true)
        .order("id",{ascending:false});

    if(error){
        area.innerHTML = "Erro ao carregar créditos.";
        return;
    }

    if(!data || data.length === 0){
        area.innerHTML = `
            <div class="card">
                Nenhum crédito cadastrado.
            </div>
        `;
        return;
    }

    const clientesResp = await supabaseClient
        .from("clientes")
        .select("id,nome");

    const clientes = clientesResp.data || [];

    area.innerHTML = "";

    data.forEach(c=>{

        const cliente = clientes.find(x => String(x.id) === String(c.cliente_id));

        area.innerHTML += `

            <div class="card">

                <h3>${cliente?.nome || "Cliente"}</h3>

                <p>
                    Tipo:
                    <strong>${c.tipo}</strong>
                </p>

                <p>
                    Saldo disponível:
                    <strong>${dinheiro(c.saldo)}</strong>
                </p>

                <button onclick="abrirCarteiraCliente(${c.cliente_id})">
                    Movimentações
                </button>

            </div>

        `;

    });

}
async function abrirNovoCreditoCliente(){

  const clientesResp = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  if(clientesResp.error){
    alert("Erro ao carregar clientes: " + clientesResp.error.message);
    return;
  }

  const formasResp = await supabaseClient
    .from("formas_pagamento")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  if(formasResp.error){
    alert("Erro ao carregar formas de pagamento: " + formasResp.error.message);
    return;
  }

  const clientes = clientesResp.data || [];
  const formas = formasResp.data || [];

  abrirModal(`
    <h2>Novo crédito</h2>

    <label>Cliente</label>
    <select id="creditoCliente">
      <option value="">Selecione</option>
      ${clientes.map(c=>`
        <option value="${c.id}">${c.nome}</option>
      `).join("")}
    </select>

    <label>Tipo</label>
    <select id="creditoTipo">
      <option value="CREDITO">Crédito</option>
      <option value="VALE_PRESENTE">Vale-presente</option>
      <option value="BONUS">Bônus</option>
    </select>

    <label>Valor</label>
    <input id="creditoValor" type="number" min="0" step="0.01">

    <label>Forma de pagamento</label>
    <select id="creditoFormaPagamento">
      <option value="">Selecione</option>
      ${formas.map(f=>`
        <option value="${f.id}">${f.nome}</option>
      `).join("")}
    </select>

    <label>Observação</label>
    <textarea id="creditoObservacao"></textarea>

    <button class="principal" onclick="salvarNovoCredito()">
      Salvar
    </button>

    <button onclick="fecharModal()">
      Cancelar
    </button>
  `);
}
async function salvarNovoCredito(){

  const clienteId = Number(document.getElementById("creditoCliente").value);
  const tipo = document.getElementById("creditoTipo").value;
  const valor = Number(document.getElementById("creditoValor").value || 0);
  const formaPagamentoId = Number(document.getElementById("creditoFormaPagamento").value);
  const observacao = document.getElementById("creditoObservacao").value.trim();

  if(!clienteId){
    alert("Selecione uma cliente.");
    return;
  }

  if(valor <= 0){
    alert("Informe um valor válido.");
    return;
  }

  if(!formaPagamentoId){
    alert("Selecione a forma de pagamento.");
    return;
  }

  const carteiraResp = await supabaseClient
    .from("carteira_clientes")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("tipo", tipo)
    .maybeSingle();

  let carteiraId = null;
  let novoSaldo = valor;

  if(carteiraResp.data){

    carteiraId = carteiraResp.data.id;
    novoSaldo = Number(carteiraResp.data.saldo || 0) + valor;

    const updateResp = await supabaseClient
      .from("carteira_clientes")
      .update({
        saldo: novoSaldo,
        atualizado_em: new Date().toISOString(),
        observacao
      })
      .eq("id", carteiraId);

    if(updateResp.error){
      alert("Erro ao atualizar carteira: " + updateResp.error.message);
      return;
    }

  }else{

    const insertResp = await supabaseClient
      .from("carteira_clientes")
      .insert([{
        unidade_id: unidadeAtualId,
        cliente_id: clienteId,
        tipo,
        saldo: valor,
        observacao,
        ativo: true
      }])
      .select()
      .single();

    if(insertResp.error){
      alert("Erro ao criar carteira: " + insertResp.error.message);
      return;
    }

    carteiraId = insertResp.data.id;
  }

  await supabaseClient
    .from("carteira_movimentacoes")
    .insert([{
      carteira_id: carteiraId,
      cliente_id: clienteId,
      tipo: "ENTRADA",
      origem: "COMPRA",
      origem_id: null,
      valor,
      data: new Date().toISOString(),
      observacao: observacao || "Compra de crédito",
      usuario_id: usuarioLogado?.id || null
    }]);

  await supabaseClient
    .from("financeiro_lancamentos")
    .insert([{
      unidade_id: unidadeAtualId,
      tipo: "CREDITO",
      origem: "CARTEIRA",
      origem_id: carteiraId,
      cliente_id: clienteId,
      forma_pagamento_id: formaPagamentoId,
      valor,
      data: new Date().toISOString(),
      usuario_id: usuarioLogado?.id || null,
      status: "ATIVO",
      observacao: observacao || "Compra de crédito"
    }]);

  await registrarEntradaCaixa(
    null,
    formaPagamentoId,
    valor
  );

  await registrarHistoricoOperacao(
    "credito_cliente",
    String(clienteId),
    "Crédito lançado para cliente",
    {
      cliente_id: clienteId,
      carteira_id: carteiraId,
      tipo,
      valor,
      novo_saldo: novoSaldo,
      forma_pagamento_id: formaPagamentoId,
      observacao
    }
  );

  fecharModal();
  carregarCreditosClientes();
  carregarCaixas();

  alert("Crédito lançado com sucesso.");
}
async function abrirDetalhesPendenciasCliente(clienteId){

  const { data: cliente } = await supabaseClient
    .from("clientes")
    .select("id,nome")
    .eq("id", clienteId)
    .single();

  const { data: pendencias, error } = await supabaseClient
    .from("financeiro_lancamentos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("tipo", "PENDENCIA")
    .eq("status", "ATIVO")
    .order("data", { ascending:true });

  if(error || !pendencias || pendencias.length === 0){
    alert("Nenhuma pendência encontrada.");
    return;
  }

  const idsComandas = pendencias
    .filter(p => p.origem === "COMANDA" && p.origem_id)
    .map(p => p.origem_id);

  let itensComandas = [];

  if(idsComandas.length > 0){
    const itensResp = await supabaseClient
      .from("comanda_itens")
      .select(`
        comanda_id,
        descricao,
        valor,
        profissionais(nome)
      `)
      .in("comanda_id", idsComandas);

    itensComandas = itensResp.data || [];
  }

  const total = pendencias.reduce((soma, p)=> soma + Number(p.valor || 0), 0);

  abrirModal(`
    <h2>Detalhes das pendências</h2>

    <p><strong>Cliente:</strong> ${cliente?.nome || "-"}</p>
    <p><strong>Total em aberto:</strong> ${dinheiro(total)}</p>

    <hr>

    ${pendencias.map(p => {

      const itens = itensComandas.filter(i => String(i.comanda_id) === String(p.origem_id));

      return `
        <div class="card">
          <h3>${formatarDataComanda(p.data)}</h3>

          <p>
            Valor em aberto:
            <strong>${dinheiro(p.valor)}</strong>
          </p>

          ${itens.length ? itens.map(i => `
            <div class="caixa-linha">
              <span>
                ${i.descricao || "Serviço"}
                <br>
                <small>${i.profissionais?.nome || ""}</small>
              </span>
              <strong>${dinheiro(i.valor)}</strong>
            </div>
          `).join("") : `
            <p>Sem detalhamento vinculado.</p>
          `}
        </div>
      `;
    }).join("")}

    <button class="principal" onclick="abrirReceberPendenciasCliente(${clienteId})">
      Receber
    </button>

    <button onclick="fecharModal()">
      Fechar
    </button>
  `);
}
function instalarModuloFinanceiroProfissionais(){

  if(document.getElementById("tela-financeiroProfissionais")){
    return;
  }

  const telaComissoes =
    document.getElementById("tela-comissoes");

  if(!telaComissoes) return;

  const novaTela = document.createElement("section");

  novaTela.id = "tela-financeiroProfissionais";
  novaTela.className = "tela";

  novaTela.innerHTML = `
    <div class="topo">
      <h1>Financeiro dos Profissionais</h1>
    </div>

    <div id="listaFinanceiroProfissionais"></div>
  `;

  telaComissoes.insertAdjacentElement(
    "afterend",
    novaTela
  );

  const botao = document.createElement("button");

  botao.id = "menu-financeiro-profissionais";
  botao.textContent = "Financeiro dos Profissionais";
  botao.className =
    document.getElementById("menu-comissoes").className;

  botao.onclick = () =>
    mostrarTela("financeiroProfissionais");

  document
    .getElementById("menu-comissoes")
    .insertAdjacentElement(
      "afterend",
      botao
    );

}
async function carregarFinanceiroProfissionais(){

  const area =
    document.getElementById(
      "listaFinanceiroProfissionais"
    );

  if(!area) return;

  area.innerHTML = `
    <div class="abas-financeiro-profissionais">

      <button
        id="abaFinanceiroProfissionaisResumo"
        class="principal"
        onclick="abrirAbaFinanceiroProfissionais('resumo')"
      >
        Resumo
      </button>

      <button
        id="abaFinanceiroProfissionaisFechamentos"
        onclick="abrirAbaFinanceiroProfissionais('fechamentos')"
      >
        Fechamentos
      </button>

      <button
        id="abaFinanceiroProfissionaisVales"
        onclick="abrirAbaFinanceiroProfissionais('vales')"
      >
        Vales
      </button>

      <button
        id="abaFinanceiroProfissionaisExtrato"
        onclick="abrirAbaFinanceiroProfissionais('extrato')"
      >
        Extrato
      </button>

    </div>

    <div
      id="conteudoFinanceiroProfissionais"
      style="margin-top:20px;"
    ></div>
  `;

  abrirAbaFinanceiroProfissionais("resumo");
}


function abrirAbaFinanceiroProfissionais(aba){

  const botoes = {

    resumo:
      "abaFinanceiroProfissionaisResumo",

    fechamentos:
      "abaFinanceiroProfissionaisFechamentos",

    vales:
      "abaFinanceiroProfissionaisVales",

    extrato:
      "abaFinanceiroProfissionaisExtrato"

  };

  Object.values(botoes).forEach(id=>{

    const botao =
      document.getElementById(id);

    if(botao){
      botao.classList.remove("principal");
    }

  });

  const botaoAtivo =
    document.getElementById(botoes[aba]);

  if(botaoAtivo){
    botaoAtivo.classList.add("principal");
  }

  if(aba === "resumo"){
    FinanceiroProfissionais.abrirAba("resumo");
  }

  if(aba === "fechamentos"){
    FinanceiroProfissionais.abrirAba("pagamentos");
  }

  if(aba === "vales"){
    FinanceiroProfissionais.abrirAba("vales");
  }

  if(aba === "extrato"){
    FinanceiroProfissionais.abrirAba("extrato");
  }

}
async function listarValesProfissionais(){

  const area =
    document.getElementById(
      "listaValesProfissionais"
    );

  if(!area) return;

  const { data: vales, error } =
    await supabaseClient
      .from("profissionais_vales")
      .select("*")
      .order("data_vale", {
        ascending: false
      })
      .order("created_at", {
        ascending: false
      });

  if(error){

    console.error(error);

    area.innerHTML = `
      <p>
        Não foi possível carregar os vales.
      </p>
    `;

    return;
  }

  if(!vales || vales.length === 0){

    area.innerHTML = `
      <div style="
        padding:25px;
        text-align:center;
        border:1px solid #ddd;
        border-radius:8px;
      ">
        Nenhum vale registrado.
      </div>
    `;

    return;
  }

  const profissionais =
    await obterProfissionais();

  const mapaProfissionais = {};

  (profissionais || []).forEach(profissional=>{

    mapaProfissionais[profissional.id] =
      profissional.nome;

  });

  area.innerHTML = `
    <div style="overflow-x:auto;">

      <table style="
        width:100%;
        border-collapse:collapse;
      ">

        <thead>
          <tr>
            <th style="text-align:left;padding:12px;">
              Data
            </th>

            <th style="text-align:left;padding:12px;">
              Profissional
            </th>

            <th style="text-align:left;padding:12px;">
              Descrição
            </th>

            <th style="text-align:right;padding:12px;">
              Valor
            </th>

            <th style="text-align:center;padding:12px;">
              Status
            </th>

              Assinatura
</th>

<th style="text-align:center;padding:12px;">
  Ações
</th>

</tr>
        </thead>

        <tbody>

          ${vales.map(vale=>{

            const nomeProfissional =
              mapaProfissionais[vale.profissional_id]
              || "Profissional não encontrado";

            const dataFormatada =
              formatarDataValeProfissional(
                vale.data_vale
              );

            const valorFormatado =
              Number(
                vale.valor || 0
              ).toLocaleString(
                "pt-BR",
                {
                  style: "currency",
                  currency: "BRL"
                }
              );

            const status =
              vale.status || "pendente";

            return `
              <tr style="
                border-top:1px solid #ddd;
              ">

                <td style="padding:12px;">
                  ${dataFormatada}
                </td>

                <td style="padding:12px;">
                  ${nomeProfissional}
                </td>

                <td style="padding:12px;">
                  ${vale.descricao || "-"}
                </td>

                <td style="
                  padding:12px;
                  text-align:right;
                  font-weight:600;
                ">
                  ${valorFormatado}
                </td>

                <td style="
                  padding:12px;
                  text-align:center;
                ">
               ${
  String(status).toLowerCase() === "pendente"
    ? "Pendente"
    : String(status).toLowerCase() === "cancelado"
      ? "Cancelado"
      : "Quitado"
}
                </td>

                <td style="
                  padding:12px;
                  text-align:center;
                ">

                  ${vale.assinatura
                    ? `
                      <button
                        type="button"
                        onclick="visualizarAssinaturaVale('${vale.id}')"
                      >
                        Visualizar
                      </button>
                    `
                    : "Sem assinatura"
                  }

                </td>
                <td style="
  padding:12px;
  text-align:center;
">

  ${
    String(status).toLowerCase() === "pendente"
      ? `
        <button
          type="button"
          onclick="cancelarValeProfissional('${vale.id}')"
          style="color:#b42318;"
        >
          Cancelar
        </button>
      `
      : "-"
  }

</td>

              </tr>
            `;

          }).join("")}

        </tbody>

      </table>

    </div>
  `;
}
async function cancelarValeProfissional(valeId){

  const confirmar = confirm(
    "Deseja realmente cancelar este vale?\n\n" +
    "Ele deixará de ser descontado do profissional, mas continuará registrado no histórico."
  );

  if(!confirmar) return;

  const { data: vale, error: erroBusca } =
    await supabaseClient
      .from("profissionais_vales")
      .select("*")
      .eq("id", valeId)
      .single();

  if(erroBusca || !vale){
    alert("Vale não encontrado.");
    return;
  }

  const statusAtual =
    String(vale.status || "")
      .trim()
      .toLowerCase();

  if(statusAtual !== "pendente"){
    alert(
      "Somente vales pendentes podem ser cancelados."
    );
    return;
  }

  if(vale.pagamento_comissao_id){
    alert(
      "Este vale já está vinculado a um pagamento de comissão e não pode ser cancelado por aqui."
    );
    return;
  }

  const { error } =
    await supabaseClient
      .from("profissionais_vales")
      .update({
        status: "cancelado"
      })
      .eq("id", valeId);

  if(error){
    console.error(error);
    alert("Erro ao cancelar vale.");
    return;
  }

  await registrarHistoricoOperacao(
    "cancelamento_vale",
    String(valeId),
    "Vale de profissional cancelado",
    {
      vale_id: valeId,
      profissional_id: vale.profissional_id,
      valor: vale.valor,
      data_vale: vale.data_vale,
      descricao: vale.descricao
    }
  );

  alert("Vale cancelado com sucesso.");

  await listarValesProfissionais();

  if(
    typeof carregarFinanceiroProfissionais === "function"
  ){
    telasCarregadas.financeiroProfissionais = false;
  }

}

function formatarDataValeProfissional(data){

  if(!data) return "-";

  const partes =
    String(data).split("-");

  if(partes.length !== 3){
    return data;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


async function abrirModalNovoValeProfissional(){

  let modal =
    document.getElementById(
      "modalNovoValeProfissional"
    );

  if(modal){
    modal.remove();
  }

  const profissionais =
    await obterProfissionais();

  const profissionaisAtivos =
    (profissionais || []).filter(
      profissional =>
        profissional.ativo !== false
    );

  modal =
    document.createElement("div");

  modal.id =
    "modalNovoValeProfissional";

  modal.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.55);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:99999;
    padding:20px;
  `;

  modal.innerHTML = `
    <div style="
      background:#fff;
      width:100%;
      max-width:650px;
      max-height:95vh;
      overflow-y:auto;
      border-radius:10px;
      padding:25px;
    ">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:20px;
      ">

        <h2 style="margin:0;">
          Registrar novo vale
        </h2>

        <button
          type="button"
          onclick="fecharModalNovoValeProfissional()"
          style="
            border:none;
            background:transparent;
            font-size:26px;
            cursor:pointer;
          "
        >
          ×
        </button>

      </div>

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:15px;
      ">

        <div style="grid-column:1 / -1;">

          <label>
            Profissional
          </label>

          <select
            id="valeProfissionalId"
            style="width:100%;"
          >
            <option value="">
              Selecione
            </option>

            ${profissionaisAtivos.map(
              profissional => `
                <option value="${profissional.id}">
                  ${profissional.nome}
                </option>
              `
            ).join("")}

          </select>

        </div>

        <div>

          <label>
            Data do vale
          </label>

          <input
            type="date"
            id="valeData"
            value="${obterDataAtualVale()}"
            style="width:100%;"
          >

        </div>

        <div>

          <label>
            Valor
          </label>

          <input
            type="number"
            id="valeValor"
            min="0.01"
            step="0.01"
            placeholder="0,00"
            style="width:100%;"
          >

        </div>

        <div style="grid-column:1 / -1;">

          <label>
            Descrição
          </label>

          <textarea
            id="valeDescricao"
            rows="3"
            placeholder="Exemplo: adiantamento solicitado pelo profissional"
            style="width:100%;resize:vertical;"
          ></textarea>

        </div>

      </div>

      <div style="margin-top:20px;">

        <label>
          Assinatura do profissional
        </label>

        <p style="
          margin:5px 0 10px;
          font-size:13px;
        ">
          O profissional deve assinar no espaço abaixo.
        </p>

        <canvas
          id="canvasAssinaturaVale"
          width="580"
          height="180"
          style="
            width:100%;
            height:180px;
            border:1px solid #999;
            border-radius:6px;
            background:#fff;
            touch-action:none;
            cursor:crosshair;
          "
        ></canvas>

        <button
          type="button"
          onclick="limparAssinaturaVale()"
          style="margin-top:8px;"
        >
          Limpar assinatura
        </button>

      </div>

      <div style="
        display:flex;
        justify-content:flex-end;
        gap:10px;
        margin-top:25px;
      ">

        <button
          type="button"
          onclick="fecharModalNovoValeProfissional()"
        >
          Cancelar
        </button>

        <button
          type="button"
          class="principal"
          id="botaoSalvarValeProfissional"
          onclick="salvarValeProfissional()"
        >
          Salvar vale
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  iniciarCanvasAssinaturaVale();
}


function obterDataAtualVale(){

  const agora = new Date();

  const ano =
    agora.getFullYear();

  const mes =
    String(
      agora.getMonth() + 1
    ).padStart(2, "0");

  const dia =
    String(
      agora.getDate()
    ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}


function fecharModalNovoValeProfissional(){

  const modal =
    document.getElementById(
      "modalNovoValeProfissional"
    );

  if(modal){
    modal.remove();
  }

  assinaturaValePreenchida = false;
  desenhandoAssinaturaVale = false;
}


function iniciarCanvasAssinaturaVale(){

  const canvas =
    document.getElementById(
      "canvasAssinaturaVale"
    );

  if(!canvas) return;

  const contexto =
    canvas.getContext("2d");

  contexto.lineWidth = 2;
  contexto.lineCap = "round";
  contexto.lineJoin = "round";
  contexto.strokeStyle = "#000";

  assinaturaValePreenchida = false;
  desenhandoAssinaturaVale = false;

  function obterPosicao(evento){

    const retangulo =
      canvas.getBoundingClientRect();

    const ponto =
      evento.touches
        ? evento.touches[0]
        : evento;

    return {
      x:
        (
          ponto.clientX -
          retangulo.left
        ) *
        (
          canvas.width /
          retangulo.width
        ),

      y:
        (
          ponto.clientY -
          retangulo.top
        ) *
        (
          canvas.height /
          retangulo.height
        )
    };
  }

  function iniciarDesenho(evento){

    evento.preventDefault();

    desenhandoAssinaturaVale = true;

    const posicao =
      obterPosicao(evento);

    contexto.beginPath();

    contexto.moveTo(
      posicao.x,
      posicao.y
    );
  }

  function desenhar(evento){

    if(!desenhandoAssinaturaVale){
      return;
    }

    evento.preventDefault();

    const posicao =
      obterPosicao(evento);

    contexto.lineTo(
      posicao.x,
      posicao.y
    );

    contexto.stroke();

    assinaturaValePreenchida = true;
  }

  function finalizarDesenho(evento){

    if(evento){
      evento.preventDefault();
    }

    desenhandoAssinaturaVale = false;

    contexto.closePath();
  }

  canvas.addEventListener(
    "mousedown",
    iniciarDesenho
  );

  canvas.addEventListener(
    "mousemove",
    desenhar
  );

  canvas.addEventListener(
    "mouseup",
    finalizarDesenho
  );

  canvas.addEventListener(
    "mouseleave",
    finalizarDesenho
  );

  canvas.addEventListener(
    "touchstart",
    iniciarDesenho,
    {
      passive: false
    }
  );

  canvas.addEventListener(
    "touchmove",
    desenhar,
    {
      passive: false
    }
  );

  canvas.addEventListener(
    "touchend",
    finalizarDesenho,
    {
      passive: false
    }
  );
}


function limparAssinaturaVale(){

  const canvas =
    document.getElementById(
      "canvasAssinaturaVale"
    );

  if(!canvas) return;

  const contexto =
    canvas.getContext("2d");

  contexto.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  assinaturaValePreenchida = false;
}


async function salvarValeProfissional(){

  const profissionalId =
    document.getElementById(
      "valeProfissionalId"
    )?.value;

  const dataVale =
    document.getElementById(
      "valeData"
    )?.value;

  const valor =
    Number(
      document.getElementById(
        "valeValor"
      )?.value || 0
    );

  const descricao =
    document.getElementById(
      "valeDescricao"
    )?.value?.trim() || "";

  if(!profissionalId){

    alert("Selecione o profissional.");

    return;
  }

  if(!dataVale){

    alert("Informe a data do vale.");

    return;
  }

  if(!valor || valor <= 0){

    alert("Informe um valor válido.");

    return;
  }

  if(!assinaturaValePreenchida){

    alert(
      "A assinatura do profissional é obrigatória."
    );

    return;
  }

  const canvas =
    document.getElementById(
      "canvasAssinaturaVale"
    );

  if(!canvas) return;

  const profissionais =
    await obterProfissionais();

  const profissional =
    (profissionais || []).find(
      item =>
        String(item.id) ===
        String(profissionalId)
    );

  const botao =
    document.getElementById(
      "botaoSalvarValeProfissional"
    );

  if(botao){
    botao.disabled = true;
    botao.textContent = "Salvando...";
  }

  const assinatura =
    canvas.toDataURL("image/png");

  const dados = {
    profissional_id: profissionalId,
    data_vale: dataVale,
    valor: valor,
    descricao: descricao || null,
    status: "pendente",
    assinatura: assinatura,
    assinatura_data:
      new Date().toISOString(),
    assinatura_nome:
      profissional?.nome || null,
    registrado_por:
      usuarioLogado?.id || null
  };

  const { error } =
    await supabaseClient
      .from("profissionais_vales")
      .insert(dados);

  if(error){

    console.error(error);

    alert(
      "Não foi possível salvar o vale."
    );

    if(botao){
      botao.disabled = false;
      botao.textContent = "Salvar vale";
    }

    return;
  }

  alert("Vale registrado com sucesso.");

  fecharModalNovoValeProfissional();

  await carregarValesProfissionais();
}


async function visualizarAssinaturaVale(valeId){

  const { data: vale, error } =
    await supabaseClient
      .from("profissionais_vales")
      .select(
        "assinatura, assinatura_nome, assinatura_data"
      )
      .eq("id", valeId)
      .single();

  if(error || !vale?.assinatura){

    console.error(error);

    alert(
      "Não foi possível carregar a assinatura."
    );

    return;
  }

  const dataAssinatura =
    vale.assinatura_data
      ? new Date(
          vale.assinatura_data
        ).toLocaleString("pt-BR")
      : "-";

  const modal =
    document.createElement("div");

  modal.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.55);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:100000;
    padding:20px;
  `;

  modal.innerHTML = `
    <div style="
      background:#fff;
      width:100%;
      max-width:600px;
      border-radius:10px;
      padding:25px;
    ">

      <h2 style="margin-top:0;">
        Assinatura do vale
      </h2>

      <p>
        <strong>Profissional:</strong>
        ${vale.assinatura_nome || "-"}
      </p>

      <p>
        <strong>Data da assinatura:</strong>
        ${dataAssinatura}
      </p>

      <div style="
        border:1px solid #ccc;
        border-radius:6px;
        padding:10px;
        margin-top:15px;
      ">

        <img
          src="${vale.assinatura}"
          alt="Assinatura do profissional"
          style="
            width:100%;
            max-height:250px;
            object-fit:contain;
          "
        >

      </div>

      <div style="
        display:flex;
        justify-content:flex-end;
        margin-top:20px;
      ">

        <button
          type="button"
          onclick="this.closest('div[style*=fixed]').remove()"
        >
          Fechar
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(modal);
}
if(document.readyState === "loading"){

  document.addEventListener(
    "DOMContentLoaded",
    instalarModuloFinanceiroProfissionais
  );

}else{

  instalarModuloFinanceiroProfissionais();

}
async function carregarConfirmacoes(){

  const lista = document.getElementById("listaConfirmacoes");
  if(!lista) return;


  const data = formatarDataISO(dataAgenda);

  const { data: agendamentos, error } = await supabaseClient
    .from("agendamentos")
    .select(`
      *,
      clientes(nome, telefone),
      profissionais(nome),
      servicos(nome)
    `)
    .eq("data", data)
    .neq("status", "Cancelado")
    .order("horario");

  if(error){
    console.error(error);
    lista.innerHTML = "Erro ao carregar confirmações.";
    return;
  }

  if(!agendamentos || agendamentos.length === 0){
    lista.innerHTML = `
      <div class="card">
        Nenhum agendamento encontrado para este dia.
      </div>
    `;
    return;
  }

  lista.innerHTML = agendamentos.map(a => {

    const status = a.confirmacao_status || "pendente";

    const textosStatus = {
      pendente: "Pendente",
      enviado: "Confirmação enviada",
      confirmado: "Confirmado",
      cancelado: "Cancelado"
    };

    return `
      <div class="card confirmacao-card confirmacao-${status}">

        <div>
          <h3>${a.clientes?.nome || "Cliente"}</h3>

          <p>
            ${formatarHorarioBonito(a.horario)}
            - ${a.servicos?.nome || "Serviço"}
          </p>

          <p>
            Profissional: ${a.profissionais?.nome || "Não informado"}
          </p>

          <p>
            Telefone: ${a.clientes?.telefone || "Não informado"}
          </p>

          <strong>
            ${textosStatus[status] || "Pendente"}
          </strong>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">

          <button
            onclick="enviarConfirmacaoWhatsApp(${a.id})"
          >
            Enviar WhatsApp
          </button>

          <button
            onclick="marcarConfirmacaoAgendamento(${a.id}, 'confirmado')"
          >
            Confirmar
          </button>

          <button
            onclick="marcarConfirmacaoAgendamento(${a.id}, 'cancelado')"
          >
            Cancelar
          </button>

        </div>

      </div>
    `;
  }).join("");
}
function enviarConfirmacoesDia(){
  alert("O envio de todas as confirmações será configurado depois.");
}
