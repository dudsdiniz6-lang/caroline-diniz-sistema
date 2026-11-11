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
function relatorioEscaparHTML(valor){

  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function relatorioListaVazia(
  quantidadeColunas,
  mensagem
){

  return `
    <tr>
      <td
        colspan="${quantidadeColunas}"
        style="
          padding:30px;
          text-align:center;
          color:#777;
        "
      >
        ${mensagem}
      </td>
    </tr>
  `;

}


window.abrirAbaPanorama =
  function(aba){

    document
      .querySelectorAll(
        ".botao-aba-panorama"
      )
      .forEach(botao => {

        botao.classList.remove(
          "principal"
        );

      });


    document
      .querySelectorAll(
        ".conteudo-aba-panorama"
      )
      .forEach(conteudo => {

        conteudo.style.display =
          "none";

      });


    document
      .getElementById(
        `botaoPanorama${aba}`
      )
      ?.classList.add(
        "principal"
      );


    const conteudoAtivo =
      document.getElementById(
        `conteudoPanorama${aba}`
      );


    if(conteudoAtivo){

      conteudoAtivo.style.display =
        "block";

    }

  };


function montarDetalhesPanorama(
  resultado
){

  const servicos =
    resultado.servicos || [];

  const clientes =
    resultado.clientes || [];

  const pacotes =
    resultado.pacotes || [];

  const profissionais =
    resultado.profissionais || [];


  const profissionalMaisAtendeu =
    [...profissionais]
      .sort(
        (a, b) =>
          Number(b.procedimentos || 0) -
          Number(a.procedimentos || 0)
      )[0];


  const profissionalMaisFaturou =
    [...profissionais]
      .sort(
        (a, b) =>
          Number(b.valor_faturado || 0) -
          Number(a.valor_faturado || 0)
      )[0];


  return `
    <div
      style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-bottom:18px;
      "
    >

      <button
        id="botaoPanoramaServicos"
        type="button"
        class="botao-aba-panorama principal"
        onclick="abrirAbaPanorama('Servicos')"
      >
        Serviços
      </button>

      <button
        id="botaoPanoramaClientes"
        type="button"
        class="botao-aba-panorama"
        onclick="abrirAbaPanorama('Clientes')"
      >
        Clientes
      </button>

      <button
        id="botaoPanoramaPacotes"
        type="button"
        class="botao-aba-panorama"
        onclick="abrirAbaPanorama('Pacotes')"
      >
        Pacotes
      </button>

      <button
        id="botaoPanoramaProfissionais"
        type="button"
        class="botao-aba-panorama"
        onclick="abrirAbaPanorama('Profissionais')"
      >
        Profissionais
      </button>

    </div>


    <div
      id="conteudoPanoramaServicos"
      class="conteudo-aba-panorama"
    >

      <div class="relatorio-bloco">

        <div class="relatorio-bloco-cabecalho">
          <h2>Serviços mais realizados</h2>

          <small>
            Ordenados pela quantidade realizada
          </small>
        </div>


        <div class="relatorio-tabela-container">

          <table class="relatorio-tabela">

            <thead>
              <tr>
                <th>Posição</th>
                <th>Serviço</th>

                <th class="numero">
                  Quantidade
                </th>

                <th class="numero">
                  Valor bruto
                </th>

                <th class="numero">
                  Comissão
                </th>

                <th class="numero">
                  Valor líquido
                </th>
              </tr>
            </thead>

            <tbody>

              ${
                servicos.length
                  ? servicos.map(
                      (servico, indice) => `
                        <tr>
                          <td>
                            ${indice + 1}º
                          </td>

                          <td>
                            <strong>
                              ${
                                relatorioEscaparHTML(
                                  servico.servico_nome
                                )
                              }
                            </strong>
                          </td>

                          <td class="numero">
                            ${
                              Number(
                                servico.quantidade || 0
                              )
                            }
                          </td>

                          <td class="numero">
                            ${
                              dinheiro(
                                Number(
                                  servico.valor_bruto || 0
                                )
                              )
                            }
                          </td>

                          <td class="numero">
                            ${
                              dinheiro(
                                Number(
                                  servico.valor_comissao || 0
                                )
                              )
                            }
                          </td>

                          <td class="numero">
                            <strong>
                              ${
                                dinheiro(
                                  Number(
                                    servico.valor_liquido || 0
                                  )
                                )
                              }
                            </strong>
                          </td>
                        </tr>
                      `
                    ).join("")
                  : relatorioListaVazia(
                      6,
                      "Nenhum serviço encontrado no período."
                    )
              }

            </tbody>

          </table>

        </div>

      </div>

    </div>


    <div
      id="conteudoPanoramaClientes"
      class="conteudo-aba-panorama"
      style="display:none;"
    >

      <div class="relatorio-bloco">

        <div class="relatorio-bloco-cabecalho">
          <h2>Clientes que mais gastaram</h2>

          <small>
            Considerando procedimentos faturados
          </small>
        </div>


        <div class="relatorio-tabela-container">

          <table class="relatorio-tabela">

            <thead>
              <tr>
                <th>Posição</th>
                <th>Cliente</th>
                <th>Serviços realizados</th>

                <th class="numero">
                  Visitas
                </th>

                <th class="numero">
                  Procedimentos
                </th>

                <th class="numero">
                  Total gasto
                </th>
              </tr>
            </thead>

            <tbody>

              ${
                clientes.length
                  ? clientes.map(
                      (cliente, indice) => `
                        <tr>
                          <td>
                            ${indice + 1}º
                          </td>

                          <td>
                            <strong>
                              ${
                                relatorioEscaparHTML(
                                  cliente.cliente_nome
                                )
                              }
                            </strong>
                          </td>

                          <td>
                            ${
                              (cliente.servicos || [])
                                .map(servico => `
                                  <div
                                    style="
                                      margin-bottom:5px;
                                    "
                                  >
                                    ${
                                      relatorioEscaparHTML(
                                        servico.servico
                                      )
                                    }

                                    · ${Number(
                                      servico.quantidade || 0
                                    )}x

                                    · ${dinheiro(
                                      Number(
                                        servico.valor || 0
                                      )
                                    )}
                                  </div>
                                `)
                                .join("")
                            }
                          </td>

                          <td class="numero">
                            ${
                              Number(
                                cliente.visitas || 0
                              )
                            }
                          </td>

                          <td class="numero">
                            ${
                              Number(
                                cliente.procedimentos || 0
                              )
                            }
                          </td>

                          <td class="numero">
                            <strong>
                              ${
                                dinheiro(
                                  Number(
                                    cliente.total_gasto || 0
                                  )
                                )
                              }
                            </strong>
                          </td>
                        </tr>
                      `
                    ).join("")
                  : relatorioListaVazia(
                      6,
                      "Nenhuma cliente encontrada no período."
                    )
              }

            </tbody>

          </table>

        </div>

      </div>

    </div>


    <div
      id="conteudoPanoramaPacotes"
      class="conteudo-aba-panorama"
      style="display:none;"
    >

      <div class="relatorio-bloco">

        <div class="relatorio-bloco-cabecalho">
          <h2>Pacotes mais vendidos</h2>

          <small>
            Ordenados pela quantidade vendida
          </small>
        </div>


        <div class="relatorio-tabela-container">

          <table class="relatorio-tabela">

            <thead>
              <tr>
                <th>Posição</th>
                <th>Pacote</th>

                <th class="numero">
                  Quantidade
                </th>

                <th class="numero">
                  Valor vendido
                </th>

                <th class="numero">
                  Comissão
                </th>

                <th class="numero">
                  Valor líquido
                </th>
              </tr>
            </thead>

            <tbody>

              ${
                pacotes.length
                  ? pacotes.map(
                      (pacote, indice) => `
                        <tr>
                          <td>
                            ${indice + 1}º
                          </td>

                          <td>
                            <strong>
                              ${
                                relatorioEscaparHTML(
                                  pacote.pacote_nome
                                )
                              }
                            </strong>
                          </td>

                          <td class="numero">
                            ${
                              Number(
                                pacote.quantidade || 0
                              )
                            }
                          </td>

                          <td class="numero">
                            ${
                              dinheiro(
                                Number(
                                  pacote.valor_vendido || 0
                                )
                              )
                            }
                          </td>

                          <td class="numero">
                            ${
                              dinheiro(
                                Number(
                                  pacote.valor_comissao || 0
                                )
                              )
                            }
                          </td>

                          <td class="numero">
                            <strong>
                              ${
                                dinheiro(
                                  Number(
                                    pacote.valor_liquido || 0
                                  )
                                )
                              }
                            </strong>
                          </td>
                        </tr>
                      `
                    ).join("")
                  : relatorioListaVazia(
                      6,
                      "Nenhum pacote vendido no período."
                    )
              }

            </tbody>

          </table>

        </div>

      </div>

    </div>


    <div
      id="conteudoPanoramaProfissionais"
      class="conteudo-aba-panorama"
      style="display:none;"
    >

      <div
        class="relatorios-indicadores"
        style="margin-bottom:18px;"
      >

        <div class="relatorio-indicador destaque">
          <small>Profissional que mais atendeu</small>

          <strong>
            ${
              relatorioEscaparHTML(
                profissionalMaisAtendeu
                  ?.profissional_nome ||
                "Sem resultado"
              )
            }
          </strong>

          <small>
            ${
              Number(
                profissionalMaisAtendeu
                  ?.procedimentos || 0
              )
            } procedimentos
          </small>
        </div>


        <div class="relatorio-indicador destaque">
          <small>Profissional que mais faturou</small>

          <strong>
            ${
              relatorioEscaparHTML(
                profissionalMaisFaturou
                  ?.profissional_nome ||
                "Sem resultado"
              )
            }
          </strong>

          <small>
            ${
              dinheiro(
                Number(
                  profissionalMaisFaturou
                    ?.valor_faturado || 0
                )
              )
            }
          </small>
        </div>

      </div>


      <div class="relatorio-bloco">

        <div class="relatorio-bloco-cabecalho">
          <h2>Desempenho dos profissionais</h2>
        </div>


        <div class="relatorio-tabela-container">

          <table class="relatorio-tabela">

            <thead>
              <tr>
                <th>Profissional</th>

                <th class="numero">
                  Clientes
                </th>

                <th class="numero">
                  Visitas
                </th>

                <th class="numero">
                  Procedimentos
                </th>

                <th class="numero">
                  Faturado
                </th>

                <th class="numero">
                  Comissão
                </th>

                <th class="numero">
                  Líquido
                </th>
              </tr>
            </thead>

            <tbody>

              ${
                profissionais.length
                  ? profissionais.map(
                      profissional => `
                        <tr>
                          <td>
                            <strong>
                              ${
                                relatorioEscaparHTML(
                                  profissional.profissional_nome
                                )
                              }
                            </strong>
                          </td>

                          <td class="numero">
                            ${
                              Number(
                                profissional.clientes_atendidos || 0
                              )
                            }
                          </td>

                          <td class="numero">
                            ${
                              Number(
                                profissional.visitas || 0
                              )
                            }
                          </td>

                          <td class="numero">
                            ${
                              Number(
                                profissional.procedimentos || 0
                              )
                            }
                          </td>

                          <td class="numero">
                            ${
                              dinheiro(
                                Number(
                                  profissional.valor_faturado || 0
                                )
                              )
                            }
                          </td>

                          <td class="numero">
                            ${
                              dinheiro(
                                Number(
                                  profissional.valor_comissao || 0
                                )
                              )
                            }
                          </td>

                          <td class="numero">
                            <strong>
                              ${
                                dinheiro(
                                  Number(
                                    profissional.valor_liquido || 0
                                  )
                                )
                              }
                            </strong>
                          </td>
                        </tr>
                      `
                    ).join("")
                  : relatorioListaVazia(
                      7,
                      "Nenhum atendimento encontrado."
                    )
              }

            </tbody>

          </table>

        </div>

      </div>

    </div>
  `;

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

if(
  !categoriaId &&
  !profissionalId
){

  conteudo.innerHTML =
    montarDetalhesPanorama(
      resultado
    );

}else{

  conteudo.innerHTML = `
    <div class="relatorio-bloco">

      <div class="relatorio-bloco-cabecalho">
        <h2>Resultado filtrado</h2>

        <small>
          De ${
            dataInicial
              .split("-")
              .reverse()
              .join("/")
          }
          até ${
            dataFinal
              .split("-")
              .reverse()
              .join("/")
          }
        </small>
      </div>

      <div class="relatorio-vazio">
        Remova os filtros de categoria e profissional
        para visualizar os rankings completos.
      </div>

    </div>
  `;

}


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
