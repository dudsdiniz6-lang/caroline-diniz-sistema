(function(){

  function dataISO(data){
    return data.toISOString().slice(0, 10);
  }


  function primeiroDiaMesAtual(){

    const hoje = new Date();

    return dataISO(
      new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        1
      )
    );

  }

async function instalarPanoramaRelatorios(){

  const area =
    document.getElementById(
      "areaPanoramaRelatorios"
    );

  if(!area){
    return;
  }


  /*
    Evita montar a tela novamente caso
    o módulo já esteja carregado.
  */

  if(area.dataset.instalado === "true"){
    return;
  }

  area.dataset.instalado = "true";


  /*
  ==========================================
  MONTA A TELA IMEDIATAMENTE
  ==========================================
  */

  area.innerHTML = `
    <div class="relatorios-filtros">

      <div>
        <label>Data inicial</label>

        <input
          id="relatorioDataInicial"
          type="date"
          value="${primeiroDiaMesAtual()}"
        >
      </div>


      <div>
        <label>Data final</label>

        <input
          id="relatorioDataFinal"
          type="date"
          value="${dataISO(new Date())}"
        >
      </div>


      <div>
        <label>Categoria de serviço</label>

        <select id="relatorioCategoria">
          <option value="">
            Todas as categorias
          </option>
        </select>
      </div>


      <div>
        <label>Profissional</label>

        <select id="relatorioProfissional">
          <option value="">
            Todos os profissionais
          </option>
        </select>
      </div>


      <div class="relatorios-filtro-botao">

        <button
          type="button"
          class="principal"
          onclick="carregarPanoramaRelatorios()"
        >
          Aplicar filtros
        </button>

      </div>

    </div>


    <div id="relatoriosMensagem">

      <div class="card">
        Escolha o período e clique em Aplicar filtros.
      </div>

    </div>


    <div
      id="relatoriosIndicadores"
      class="relatorios-indicadores"
    ></div>


    <div
      id="relatoriosConteudo"
      class="relatorios-conteudo"
    ></div>
  `;


  /*
  ==========================================
  CARREGA AS OPÇÕES EM SEGUNDO PLANO
  ==========================================
  */

  try{

    const [
      categoriasResposta,
      profissionaisResposta
    ] = await Promise.all([

      supabaseClient
        .from("categorias_servicos")
        .select("id,nome")
        .order("nome"),

      supabaseClient
        .from("profissionais")
        .select("id,nome")
        .eq("ativo", true)
        .order("nome")

    ]);


    const campoCategoria =
      document.getElementById(
        "relatorioCategoria"
      );

    const campoProfissional =
      document.getElementById(
        "relatorioProfissional"
      );


    if(
      campoCategoria &&
      !categoriasResposta.error
    ){

      campoCategoria.innerHTML = `
        <option value="">
          Todas as categorias
        </option>

        ${(categoriasResposta.data || [])
          .map(categoria => `
            <option value="${categoria.id}">
              ${categoria.nome}
            </option>
          `)
          .join("")
        }
      `;

    }


    if(
      campoProfissional &&
      !profissionaisResposta.error
    ){

      campoProfissional.innerHTML = `
        <option value="">
          Todos os profissionais
        </option>

        ${(profissionaisResposta.data || [])
          .map(profissional => `
            <option value="${profissional.id}">
              ${profissional.nome}
            </option>
          `)
          .join("")
        }
      `;

    }


  }catch(erro){

    console.error(
      "Erro ao carregar filtros do relatório:",
      erro
    );

  }

}

  window.carregarPanoramaRelatorios =
  async function(){

    const mensagem =
      document.getElementById(
        "relatoriosMensagem"
      );

    const indicadores =
      document.getElementById(
        "relatoriosIndicadores"
      );

    const conteudo =
      document.getElementById(
        "relatoriosConteudo"
      );

    const botao =
      document.querySelector(
        '.relatorios-filtro-botao button'
      );


    if(
      !mensagem ||
      !indicadores ||
      !conteudo
    ){
      return;
    }


    const dataInicial =
      document.getElementById(
        "relatorioDataInicial"
      )?.value;

    const dataFinal =
      document.getElementById(
        "relatorioDataFinal"
      )?.value;

    const categoriaId =
      document.getElementById(
        "relatorioCategoria"
      )?.value || "";

    const profissionalId =
      document.getElementById(
        "relatorioProfissional"
      )?.value || "";


    if(!dataInicial || !dataFinal){

      alert(
        "Informe a data inicial e a data final."
      );

      return;

    }


    if(dataInicial > dataFinal){

      alert(
        "A data inicial não pode ser maior que a data final."
      );

      return;

    }


    mensagem.innerHTML = `
      <div class="card">
        Preparando o relatório...
      </div>
    `;

    indicadores.innerHTML = "";
    conteudo.innerHTML = "";


    if(botao){

      botao.disabled = true;
      botao.textContent = "Carregando...";

    }


    try{

      const {
        data,
        error
      } = await supabaseClient.rpc(
        "panorama_geral_relatorios",
        {
          p_unidade_id:
            Number(unidadeAtualId),

          p_data_inicial:
            dataInicial,

          p_data_final:
            dataFinal,

          p_categoria_id:
            categoriaId
              ? Number(categoriaId)
              : null,

          p_profissional_id:
            profissionalId
              ? Number(profissionalId)
              : null
        }
      );


      if(error){
        throw error;
      }


      const resultado =
        data || {};


      mensagem.innerHTML = "";


      indicadores.innerHTML = `

        <div class="relatorio-indicador destaque">

          <small>
            Clientes cadastrados
          </small>

          <strong>
            ${Number(
              resultado.clientes_cadastrados || 0
            )}
          </strong>

        </div>


        <div class="relatorio-indicador">

          <small>
            Clientes atendidos
          </small>

          <strong>
            ${Number(
              resultado.clientes_atendidos || 0
            )}
          </strong>

        </div>


        <div class="relatorio-indicador">

          <small>
            Visitas realizadas
          </small>

          <strong>
            ${Number(
              resultado.visitas_realizadas || 0
            )}
          </strong>

        </div>


        <div class="relatorio-indicador">

          <small>
            Procedimentos realizados
          </small>

          <strong>
            ${Number(
              resultado.procedimentos_realizados || 0
            )}
          </strong>

        </div>


        <div class="relatorio-indicador destaque">

          <small>
            Valor faturado em procedimentos
          </small>

          <strong>
            ${dinheiro(
              Number(
                resultado.valor_faturado || 0
              )
            )}
          </strong>

        </div>

      `;


      conteudo.innerHTML = `
        <div class="relatorio-bloco">

          <div class="relatorio-bloco-cabecalho">

            <h2>Panorama do período</h2>

            <small>
              De ${dataInicial.split("-").reverse().join("/")}
              até ${dataFinal.split("-").reverse().join("/")}
            </small>

          </div>

          <div class="relatorio-vazio">
            Indicadores carregados com sucesso.
          </div>

        </div>
      `;


    }catch(erro){

      console.error(
        "Erro ao carregar o relatório:",
        erro
      );


      mensagem.innerHTML = `
        <div class="card">
          Não foi possível carregar o relatório:
          <strong>
            ${
              erro?.message ||
              "erro desconhecido"
            }
          </strong>
        </div>
      `;

    }finally{

      if(botao){

        botao.disabled = false;
        botao.textContent = "Aplicar filtros";

      }

    }

  };
  window.instalarPanoramaRelatorios =
    instalarPanoramaRelatorios;


  if(document.readyState === "loading"){

    document.addEventListener(
      "DOMContentLoaded",
      instalarPanoramaRelatorios
    );

  }else{

    instalarPanoramaRelatorios();

  }


})();
