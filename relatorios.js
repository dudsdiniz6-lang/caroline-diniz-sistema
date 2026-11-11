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


    const categorias =
      categoriasResposta.data || [];

    const profissionais =
      profissionaisResposta.data || [];


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

            ${categorias.map(categoria => `
              <option value="${categoria.id}">
                ${categoria.nome}
              </option>
            `).join("")}
          </select>
        </div>


        <div>
          <label>Profissional</label>

          <select id="relatorioProfissional">
            <option value="">
              Todos os profissionais
            </option>

            ${profissionais.map(profissional => `
              <option value="${profissional.id}">
                ${profissional.nome}
              </option>
            `).join("")}
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


      <div id="relatoriosMensagem"></div>

      <div
        id="relatoriosIndicadores"
        class="relatorios-indicadores"
      ></div>

      <div
        id="relatoriosConteudo"
        class="relatorios-conteudo"
      ></div>
    `;


    await carregarPanoramaRelatorios();

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
        Carregando o panorama geral...
      </div>
    `;

    indicadores.innerHTML = "";
    conteudo.innerHTML = "";


    try{

      /*
      ==========================================
      BUSCA TODAS AS COMANDAS DO PERÍODO
      ==========================================
      */

      const comandas = [];

      const TAMANHO_PAGINA = 500;

      let inicio = 0;


      while(true){

        const {
          data: pagina,
          error
        } = await supabaseClient
          .from("comandas")
          .select(`
            id,
            data,
            cliente_id,
            profissional_id,
            cancelada,
            clientes(
              id,
              nome
            ),
            profissionais(
              id,
              nome
            ),
            comanda_itens(
              id,
              servico_id,
              profissional_id,
              tipo_item,
              descricao,
              valor,
              servicos(
                id,
                nome,
                categoria_id
              )
            )
          `)
          .eq(
            "unidade_id",
            unidadeAtualId
          )
          .gte(
            "data",
            dataInicial
          )
          .lte(
            "data",
            dataFinal
          )
          .or(
            "cancelada.eq.false,cancelada.is.null"
          )
          .order(
            "data",
            {
              ascending:true
            }
          )
          .range(
            inicio,
            inicio + TAMANHO_PAGINA - 1
          );


        if(error){
          throw error;
        }


        const registros =
          pagina || [];


        comandas.push(
          ...registros
        );


        if(
          registros.length <
          TAMANHO_PAGINA
        ){
          break;
        }


        inicio += TAMANHO_PAGINA;

      }


      /*
      ==========================================
      FILTRA SOMENTE PROCEDIMENTOS

      PRODUTOS NÃO ENTRAM NESTE RELATÓRIO.
      ==========================================
      */

      const procedimentos = [];


      comandas.forEach(comanda => {

        (comanda.comanda_itens || [])
          .forEach(item => {

            const tipoItem =
              String(
                item.tipo_item || ""
              )
                .trim()
                .toUpperCase();


            if(tipoItem === "PRODUTO"){
              return;
            }


            /*
              Itens antigos podem não possuir
              tipo_item, mas possuem servico_id.
            */

            if(!item.servico_id){
              return;
            }


            const profissionalReal =
              item.profissional_id ||
              comanda.profissional_id;


            if(
              categoriaId &&
              String(
                item.servicos?.categoria_id
              ) !== String(categoriaId)
            ){
              return;
            }


            if(
              profissionalId &&
              String(profissionalReal) !==
                String(profissionalId)
            ){
              return;
            }


            procedimentos.push({
              ...item,

              comandaId:
                comanda.id,

              data:
                comanda.data,

              clienteId:
                comanda.cliente_id,

              clienteNome:
                comanda.clientes?.nome ||
                "Cliente não informada",

              profissionalId:
                profissionalReal,

              profissionalNome:
                comanda.profissionais?.nome ||
                "Profissional não informado",

              servicoNome:
                item.servicos?.nome ||
                item.descricao ||
                "Serviço"
            });

          });

      });


      /*
      ==========================================
      CÁLCULOS PRINCIPAIS
      ==========================================
      */

      const clientesAtendidos =
        new Set(
          procedimentos
            .map(item => item.clienteId)
            .filter(Boolean)
        );


      const visitasRealizadas =
        new Set(
          procedimentos
            .filter(item =>
              item.clienteId &&
              item.data
            )
            .map(item =>
              `${item.clienteId}:${item.data}`
            )
        );


      const valorFaturado =
        procedimentos.reduce(
          (soma, item) =>
            soma +
            Number(item.valor || 0),
          0
        );


      /*
      ==========================================
      CLIENTES CADASTRADOS NO PERÍODO
      ==========================================
      */

      let clientesCadastrados = null;


      const {
        count: quantidadeClientes,
        error: erroClientes
      } = await supabaseClient
        .from("clientes")
        .select(
          "id",
          {
            count:"exact",
            head:true
          }
        )
        .eq(
          "unidade_id",
          unidadeAtualId
        )
        .gte(
          "created_at",
          `${dataInicial}T00:00:00`
        )
        .lte(
          "created_at",
          `${dataFinal}T23:59:59`
        );


      if(!erroClientes){

        clientesCadastrados =
          quantidadeClientes || 0;

      }else{

        console.warn(
          "Não foi possível contar os clientes cadastrados:",
          erroClientes
        );

      }


      /*
      ==========================================
      EXIBE OS INDICADORES
      ==========================================
      */

      mensagem.innerHTML = "";


      indicadores.innerHTML = `

        <div class="relatorio-indicador destaque">
          <small>Clientes cadastrados</small>

          <strong>
            ${
              clientesCadastrados === null
                ? "Não disponível"
                : clientesCadastrados
            }
          </strong>
        </div>


        <div class="relatorio-indicador">
          <small>Clientes atendidos</small>

          <strong>
            ${clientesAtendidos.size}
          </strong>
        </div>


        <div class="relatorio-indicador">
          <small>Visitas realizadas</small>

          <strong>
            ${visitasRealizadas.size}
          </strong>
        </div>


        <div class="relatorio-indicador">
          <small>Procedimentos realizados</small>

          <strong>
            ${procedimentos.length}
          </strong>
        </div>


        <div class="relatorio-indicador destaque">
          <small>Valor faturado em procedimentos</small>

          <strong>
            ${dinheiro(valorFaturado)}
          </strong>
        </div>

      `;


      conteudo.innerHTML = `
        <div class="relatorio-bloco">

          <div class="relatorio-bloco-cabecalho">
            <h2>Detalhamento do período</h2>

            <small>
              As tabelas serão adicionadas no próximo passo.
            </small>
          </div>

          <div class="relatorio-vazio">
            Dados principais carregados corretamente.
          </div>

        </div>
      `;


      /*
        Guarda os dados para montarmos as tabelas
        no próximo passo sem repetir os cálculos.
      */

      window.dadosPanoramaRelatorios = {
        comandas,
        procedimentos,
        clientesAtendidos,
        visitasRealizadas,
        valorFaturado
      };


    }catch(erro){

      console.error(
        "Erro ao carregar panorama:",
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

    }

  };
      const indicadores =
        document.getElementById(
          "relatoriosIndicadores"
        );

      const conteudo =
        document.getElementById(
          "relatoriosConteudo"
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
          Carregando o panorama geral...
        </div>
      `;

      indicadores.innerHTML = "";
      conteudo.innerHTML = "";


      /*
        No próximo passo entraremos com os cálculos
        e as consultas das comandas.
      */

      mensagem.innerHTML = `
        <div class="card">
          Filtros carregados corretamente.
        </div>
      `;

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
