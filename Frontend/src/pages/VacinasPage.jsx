import { useEffect, useState } from 'react'
import { graphqlRequest } from '../lib/graphql'
import './VacinasPage.css'

const PAGINA_QUERY = `
  query PaginaVacinas($dias: Int) {
    lembretesVacinas(dias: $dias) {
      id
      tipo
      dataAplicacao
      dataPrevistaReforco
      pet {
        id
        nome
        raca
        idade
        tutor {
          nome
        }
      }
    }
    pets {
      id
      nome
      especie
    }
  }
`

const HISTORICO_QUERY = `
  query Historico($petId: ID!) {
    vacinasPorPet(petId: $petId) {
      id
      tipo
      dataAplicacao
      dataPrevistaReforco
      observacoes
      veterinario {
        nome
      }
    }
  }
`

// timeZone UTC pra nao mostrar um dia a menos (mesmo problema do backend)
function formatarData(valor) {
  if (!valor) return '-'
  return new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function diasAteReforco(valor) {
  if (!valor) return null

  const data = new Date(valor)
  const agora = new Date()
  const hoje = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate())
  const reforco = Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate())

  return Math.round((reforco - hoje) / (1000 * 60 * 60 * 24))
}

function statusVacina(dataReforco) {
  const dias = diasAteReforco(dataReforco)

  if (dias === null) return { texto: 'Sem reforço', classe: 'status-neutro' }
  if (dias < 0) return { texto: `Atrasada (${Math.abs(dias)} dias)`, classe: 'status-atrasado' }
  if (dias === 0) return { texto: 'Reforço hoje', classe: 'status-alerta' }
  if (dias <= 7) return { texto: `Vence em ${dias} dias`, classe: 'status-alerta' }
  return { texto: 'Em dia', classe: 'status-ok' }
}

function StatusTag({ dataReforco }) {
  const status = statusVacina(dataReforco)
  return <span className={`vacinas-status ${status.classe}`}>{status.texto}</span>
}

function VacinasPage() {
  const [lembretes, setLembretes] = useState([])
  const [pets, setPets] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [petId, setPetId] = useState('')
  const [historico, setHistorico] = useState([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)
  const [erroHistorico, setErroHistorico] = useState('')
  const [jaBuscou, setJaBuscou] = useState(false)

  useEffect(() => {
    async function carregarPagina() {
      try {
        const data = await graphqlRequest(PAGINA_QUERY, { dias: 30 })
        setLembretes(data.lembretesVacinas)
        setPets(data.pets)
      } catch (err) {
        setErro(err.message)
      } finally {
        setCarregando(false)
      }
    }

    carregarPagina()
  }, [])

  async function buscarHistorico(e) {
    e.preventDefault()
    if (!petId) return

    setCarregandoHistorico(true)
    setErroHistorico('')

    try {
      const data = await graphqlRequest(HISTORICO_QUERY, { petId })
      setHistorico(data.vacinasPorPet)
    } catch (err) {
      setErroHistorico(err.message)
      setHistorico([])
    } finally {
      setCarregandoHistorico(false)
      setJaBuscou(true)
    }
  }

  // numeros dos cards, calculados em cima dos lembretes que ja vieram
  const vencendoNaSemana = lembretes.filter((v) => diasAteReforco(v.dataPrevistaReforco) <= 7).length
  const petsComReforco = new Set(lembretes.map((v) => v.pet?.id)).size

  const hojeTexto = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <h1>Vacinas &amp; Alertas</h1>
          <p className="vacinas-data">{hojeTexto}</p>
        </div>
        <span className="page-badge">Vacinas</span>
      </div>

      {erro && <p className="vacinas-erro">Erro ao carregar a página: {erro}</p>}

      <div className="vacinas-cards">
        <div className="vacinas-card-resumo">
          <span>Reforços nos próximos 30 dias</span>
          <strong>{carregando ? '...' : lembretes.length}</strong>
        </div>
        <div className="vacinas-card-resumo alerta">
          <span>Vencendo em até 7 dias</span>
          <strong>{carregando ? '...' : vencendoNaSemana}</strong>
        </div>
        <div className="vacinas-card-resumo">
          <span>Pets com reforço pendente</span>
          <strong>{carregando ? '...' : petsComReforco}</strong>
        </div>
      </div>

      <div className="vacinas-bloco">
        <h2>Próximos reforços</h2>

        {carregando && <p>Carregando lembretes...</p>}
        {!carregando && !erro && lembretes.length === 0 && (
          <p className="vacinas-vazio">Nenhum reforço previsto para os próximos 30 dias.</p>
        )}

        {lembretes.length > 0 && (
          <div className="vacinas-tabela-wrapper">
            <table className="vacinas-tabela">
              <thead>
                <tr>
                  <th>Pet</th>
                  <th>Tutor</th>
                  <th>Vacina</th>
                  <th>Aplicação</th>
                  <th>Reforço</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lembretes.map((vacina) => (
                  <tr key={vacina.id}>
                    <td>
                      {vacina.pet ? (
                        <div className="vacinas-pet">
                          <span className="vacinas-avatar">{vacina.pet.nome.charAt(0)}</span>
                          <div>
                            <strong>{vacina.pet.nome}</strong>
                            <small>
                              {vacina.pet.raca || 'Sem raça definida'}, {vacina.pet.idade}a
                            </small>
                          </div>
                        </div>
                      ) : (
                        'Pet removido'
                      )}
                    </td>
                    <td>{vacina.pet?.tutor?.nome || '-'}</td>
                    <td>{vacina.tipo}</td>
                    <td>{formatarData(vacina.dataAplicacao)}</td>
                    <td>{formatarData(vacina.dataPrevistaReforco)}</td>
                    <td>
                      <StatusTag dataReforco={vacina.dataPrevistaReforco} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="vacinas-bloco">
        <h2>Histórico por pet</h2>

        <form className="vacinas-form" onSubmit={buscarHistorico}>
          <select value={petId} onChange={(e) => setPetId(e.target.value)}>
            <option value="">Selecione um pet</option>
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.nome} ({pet.especie})
              </option>
            ))}
          </select>
          <button type="submit" disabled={!petId || carregandoHistorico}>
            {carregandoHistorico ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {erroHistorico && <p className="vacinas-erro">Erro ao buscar histórico: {erroHistorico}</p>}
        {jaBuscou && !erroHistorico && historico.length === 0 && (
          <p className="vacinas-vazio">Esse pet ainda não tem vacinas registradas.</p>
        )}

        {historico.length > 0 && (
          <div className="vacinas-tabela-wrapper">
            <table className="vacinas-tabela">
              <thead>
                <tr>
                  <th>Vacina</th>
                  <th>Aplicação</th>
                  <th>Reforço</th>
                  <th>Veterinário</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((vacina) => (
                  <tr key={vacina.id}>
                    <td>
                      {vacina.tipo}
                      {vacina.observacoes && <small>{vacina.observacoes}</small>}
                    </td>
                    <td>{formatarData(vacina.dataAplicacao)}</td>
                    <td>{formatarData(vacina.dataPrevistaReforco)}</td>
                    <td>{vacina.veterinario?.nome || '-'}</td>
                    <td>
                      <StatusTag dataReforco={vacina.dataPrevistaReforco} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default VacinasPage