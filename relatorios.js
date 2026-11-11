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
