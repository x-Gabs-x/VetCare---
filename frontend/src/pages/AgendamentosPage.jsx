import { useEffect, useMemo, useState } from 'react'
import './AgendamentosPage.css'

function formatarData(data) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(data))
}

function lerUsuarioSalvo() {
  try {
    return JSON.parse(
      localStorage.getItem('vetcare_usuario') ||
      sessionStorage.getItem('vetcare_usuario') ||
      localStorage.getItem('usuario') ||
      'null',
    )
  } catch {
    return null
  }
}

function lerTokenSalvo() {
  return (
    localStorage.getItem('vetcare_token') ||
    sessionStorage.getItem('vetcare_token') ||
    localStorage.getItem('token') ||
    ''
  )
}

function dataAtualDaClinica() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

const horariosAgendamento = Array.from({ length: 20 }, (_, indice) => {
  const minutos = 8 * 60 + indice * 30
  const hora = String(Math.floor(minutos / 60)).padStart(2, '0')
  const minuto = String(minutos % 60).padStart(2, '0')
  return `${hora}:${minuto}`
})

async function enviarApi(caminho, token, opcoes = {}) {
  const resposta = await fetch(`http://localhost:3000${caminho}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...opcoes.headers,
    },
  })
  const dados = await resposta.json()
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível concluir a operação.')
  return dados
}

export default function AgendamentosPage({ onConsultasAtualizadas, onAgendamentosAtualizados }) {
  const [filtro, setFiltro] = useState('todos')
  const [agendamentos, setAgendamentos] = useState([])
  const [usuario] = useState(lerUsuarioSalvo)
  const [pendencias, setPendencias] = useState([])
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [formAberto, setFormAberto] = useState('')
  const [modalNovoAgendamento, setModalNovoAgendamento] = useState(false)
  const [opcoes, setOpcoes] = useState(null)
  const [opcoesCadastro, setOpcoesCadastro] = useState({ pets: [], veterinarios: [] })
  const [proposta, setProposta] = useState({ veterinarioProposto: '', agendamentoEmergencia: '', justificativaEmergencia: '' })
  const [salvando, setSalvando] = useState(false)
  const [formAgendamentoAberto, setFormAgendamentoAberto] = useState(false)
  const [pets, setPets] = useState([])
  const [opcoesCriacao, setOpcoesCriacao] = useState({ veterinarios: [], emergencias: [] })
  const [blocosDisponiveis, setBlocosDisponiveis] = useState([])
  const [blocos, setBlocos] = useState([])
  const [tipoNovoAgendamento, setTipoNovoAgendamento] = useState('comum')
  const [novoAgendamento, setNovoAgendamento] = useState({
    pet: '',
    veterinario: '',
    data: dataAtualDaClinica(),
    horario: '',
    observacoes: '',
    justificativaEmergencia: '',
    blocoEmergenciaId: '',
  })
  const [formNovoAgendamento, setFormNovoAgendamento] = useState({
    pet: '',
    veterinario: '',
    data: dataAtualDaClinica(),
    horario: '08:00',
    observacoes: '',
  })
  const [dataBlocos, setDataBlocos] = useState(dataAtualDaClinica())
  const [configuracaoBlocos, setConfiguracaoBlocos] = useState([
    { veterinario: '', horario: '08:00' },
    { veterinario: '', horario: '08:30' },
  ])
  const token = lerTokenSalvo()
  const ehRecepcao = usuario?.perfil === 'recepcionista'
  const ehAdministracao = usuario?.perfil === 'administrador'
  const podeVerFila = ehRecepcao || ehAdministracao
  const podeMarcarEmergencia = ehRecepcao || ehAdministracao

  async function carregarAgendamentos() {
    const query = `query {
      agendamentos {
        id data horario status observacoes tipoAgendamento justificativaEmergencia
        pet { id nome especie raca }
        veterinario { id nome email }
        veterinarioReserva { id nome }
      }
    }`
    const resposta = await fetch('http://localhost:3000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query }),
    })
    const resultado = await resposta.json()
    if (!resposta.ok || resultado.errors?.length) {
      throw new Error(resultado.errors?.[0]?.message || 'Não foi possível carregar os agendamentos.')
    }
    setAgendamentos(resultado.data?.agendamentos || [])
  }

  async function carregarPendencias() {
    if (!podeVerFila) return
    const resultado = await enviarApi('/agendamentos/alertas', token)
    setPendencias(resultado.pendencias || [])
  }

  async function atualizarDados() {
    await Promise.all([
      carregarAgendamentos(),
      carregarPendencias(),
      onAgendamentosAtualizados?.(),
    ])
  }

  useEffect(() => {
    carregarAgendamentos().catch((errorCarregamento) => setErro(errorCarregamento.message))
  }, [])

  useEffect(() => {
    if (!podeVerFila) return undefined
    const atualizarFila = () => carregarPendencias().catch((errorFila) => setErro(errorFila.message))
    atualizarFila()
    const intervalo = window.setInterval(atualizarFila, 60_000)
    return () => window.clearInterval(intervalo)
  }, [podeVerFila])

  useEffect(() => {
    if (!formAgendamentoAberto) return

    async function carregarOpcoesFormulario() {
      try {
        const [listaPets, dadosOpcoes, blocosDoDia] = await Promise.all([
          enviarApi('/pets', token),
          enviarApi(`/agendamentos/opcoes-remanejamento?data=${encodeURIComponent(novoAgendamento.data)}`, token),
          enviarApi(`/agendamentos/blocos-emergencia?data=${encodeURIComponent(novoAgendamento.data)}`, token),
        ])
        setPets(listaPets)
        setOpcoesCriacao(dadosOpcoes)
        setBlocosDisponiveis(blocosDoDia)
      } catch (errorOpcoes) {
        setErro(errorOpcoes.message)
      }
    }

    carregarOpcoesFormulario()
  }, [formAgendamentoAberto, novoAgendamento.data])

  useEffect(() => {
    if (!formAgendamentoAberto || !ehAdministracao) return

    enviarApi(`/agendamentos/blocos-emergencia?data=${encodeURIComponent(dataBlocos)}`, token)
      .then(setBlocos)
      .catch((errorBlocos) => setErro(errorBlocos.message))
  }, [formAgendamentoAberto, ehAdministracao, dataBlocos])

  const listaFiltrada = useMemo(() => {
    if (filtro === 'todos') return agendamentos
    return agendamentos.filter((agendamento) => agendamento.status === filtro)
  }, [agendamentos, filtro])

  async function submeterNovoAgendamento(evento) {
    evento.preventDefault()
    setSalvando(true)
    setErro('')
    setMensagem('')

    const corpo = {
      pet: novoAgendamento.pet,
      veterinario: novoAgendamento.veterinario,
      data: novoAgendamento.data,
      horario: novoAgendamento.horario,
      observacoes: novoAgendamento.observacoes,
    }

    if (tipoNovoAgendamento === 'emergencia') {
      corpo.emergencia = true
      corpo.justificativaEmergencia = novoAgendamento.justificativaEmergencia
      corpo.blocoEmergenciaId = novoAgendamento.blocoEmergenciaId
    } else if (tipoNovoAgendamento === 'encaixe') {
      corpo.encaixeRecepcao = true
      corpo.blocoEmergenciaId = novoAgendamento.blocoEmergenciaId
    }

    try {
      await enviarApi('/agendamentos', token, {
        method: 'POST',
        body: JSON.stringify(corpo),
      })
      setMensagem('Agendamento criado com sucesso.')
      setFormAgendamentoAberto(false)
      setNovoAgendamento({
        pet: '',
        veterinario: '',
        data: dataAtualDaClinica(),
        horario: '',
        observacoes: '',
        justificativaEmergencia: '',
        blocoEmergenciaId: '',
      })
      await atualizarDados()
    } catch (errorCriacao) {
      setErro(errorCriacao.message)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarBlocosEmergencia(evento) {
    evento.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      await enviarApi('/agendamentos/blocos-emergencia', token, {
        method: 'POST',
        body: JSON.stringify({ data: dataBlocos, blocos: configuracaoBlocos }),
      })
      const atualizados = await enviarApi(`/agendamentos/blocos-emergencia?data=${encodeURIComponent(dataBlocos)}`, token)
      setBlocos(atualizados)
      setMensagem('Blocos de emergência reservados para a data escolhida.')
    } catch (errorReserva) {
      setErro(errorReserva.message)
    } finally {
      setSalvando(false)
    }
  }

  async function liberarBloco(blocoId) {
    setSalvando(true)
    setErro('')
    try {
      await enviarApi(`/agendamentos/blocos-emergencia/${blocoId}/liberar`, token, { method: 'PATCH' })
      const atualizados = await enviarApi(`/agendamentos/blocos-emergencia?data=${encodeURIComponent(dataBlocos)}`, token)
      setBlocos(atualizados)
      setMensagem('Bloco liberado para encaixe no mesmo dia.')
    } catch (errorLiberacao) {
      setErro(errorLiberacao.message)
    } finally {
      setSalvando(false)
    }
  }

  function atualizarNovoAgendamento(campo, valor) {
    setNovoAgendamento((atual) => ({ ...atual, [campo]: valor }))
  }

  function selecionarBloco(id) {
    const bloco = blocosDisponiveis.find((item) => item._id === id)
    setNovoAgendamento((atual) => ({
      ...atual,
      blocoEmergenciaId: id,
      veterinario: bloco?.veterinario?._id || bloco?.veterinario?.id || '',
      horario: bloco?.horario || '',
    }))
  }

  async function concluirAtendimento(agendamentoId) {
    setSalvando(true)
    setErro('')
    try {
      await enviarApi(`/agendamentos/${agendamentoId}/concluir`, token, { method: 'PATCH' })
      setMensagem('Atendimento concluído e registrado.')
      await onConsultasAtualizadas?.()
      await atualizarDados()
    } catch (errorConclusao) {
      setErro(errorConclusao.message)
    } finally {
      setSalvando(false)
    }
  }

  async function abrirModalNovoAgendamento() {
    setErro('')
    setMensagem('')
    try {
      const [listaPets, listaVeterinarios] = await Promise.all([
        enviarApi('/pets', token),
        enviarApi('/usuarios?perfil=veterinario', token),
      ])
      setOpcoesCadastro({
        pets: Array.isArray(listaPets) ? listaPets : [],
        veterinarios: Array.isArray(listaVeterinarios) ? listaVeterinarios : [],
      })
      setFormNovoAgendamento({
        pet: listaPets?.[0]?._id || listaPets?.[0]?.id || '',
        veterinario: listaVeterinarios?.[0]?._id || listaVeterinarios?.[0]?.id || '',
        data: dataAtualDaClinica(),
        horario: '08:00',
        observacoes: '',
      })
      setModalNovoAgendamento(true)
    } catch (errorCadastro) {
      setErro(errorCadastro.message)
    }
  }

  async function abrirFormulario(agendamento) {
    setErro('')
    setMensagem('')
    setFormAberto(agendamento.id)
    setOpcoes(null)
    setProposta({ veterinarioProposto: '', agendamentoEmergencia: '', justificativaEmergencia: '' })
    try {
      const data = agendamento.data.slice(0, 10)
      const resultado = await enviarApi(`/agendamentos/opcoes-remanejamento?data=${encodeURIComponent(data)}`, token)
      setOpcoes(resultado)
    } catch (errorFormulario) {
      setErro(errorFormulario.message)
    }
  }

  async function salvarNovoAgendamento(evento) {
    evento.preventDefault()
    setSalvando(true)
    setErro('')
    setMensagem('')

    try {
      await enviarApi('/agendamentos', token, {
        method: 'POST',
        body: JSON.stringify({
          pet: formNovoAgendamento.pet,
          veterinario: formNovoAgendamento.veterinario,
          data: formNovoAgendamento.data,
          horario: formNovoAgendamento.horario,
          observacoes: formNovoAgendamento.observacoes,
        }),
      })
      setMensagem('Agendamento criado com sucesso.')
      setModalNovoAgendamento(false)
      setFormNovoAgendamento({
        pet: opcoesCadastro.pets[0]?._id || opcoesCadastro.pets[0]?.id || '',
        veterinario: opcoesCadastro.veterinarios[0]?._id || opcoesCadastro.veterinarios[0]?.id || '',
        data: dataAtualDaClinica(),
        horario: '08:00',
        observacoes: '',
      })
      await atualizarDados()
    } catch (errorCriacao) {
      setErro(errorCriacao.message)
    } finally {
      setSalvando(false)
    }
  }

  async function enviarProposta(evento, agendamentoId) {
    evento.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      await enviarApi(`/agendamentos/${agendamentoId}/remanejamentos`, token, {
        method: 'POST',
        body: JSON.stringify(proposta),
      })
      setMensagem('Proposta enviada para aprovação da administração.')
      setFormAberto('')
      await atualizarDados()
    } catch (errorProposta) {
      setErro(errorProposta.message)
    } finally {
      setSalvando(false)
    }
  }

  async function aceitarAgendamento(agendamento) {
    setSalvando(true)
    setErro('')
    try {
      await enviarApi(`/agendamentos/${agendamento.id}/aceitar`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          motivoConsulta: agendamento.observacoes || 'Consulta veterinária agendada',
          observacoes: agendamento.observacoes || '',
        }),
      })
      setMensagem('Agendamento aceito e convertido em consulta.')
      await onConsultasAtualizadas?.()
      await atualizarDados()
    } catch (errorAceite) {
      setErro(errorAceite.message)
    } finally {
      setSalvando(false)
    }
  }

  async function decidirProposta(id, aprovar) {
    setSalvando(true)
    setErro('')
    try {
      if (aprovar) {
        await enviarApi(`/agendamentos/remanejamentos/${id}/aprovar`, token, { method: 'PATCH' })
        setMensagem('Aprovada. A recepção deve registrar a resposta do tutor.')
      } else {
        const motivo = window.prompt('Informe o motivo da recusa administrativa:')
        if (!motivo?.trim()) return
        await enviarApi(`/agendamentos/remanejamentos/${id}/recusar`, token, {
          method: 'PATCH',
          body: JSON.stringify({ motivo }),
        })
        setMensagem('Proposta recusada; o veterinário original continua responsável.')
      }
      await atualizarDados()
    } catch (errorDecisao) {
      setErro(errorDecisao.message)
    } finally {
      setSalvando(false)
    }
  }

  async function registrarRespostaTutor(id, confirmado) {
    setSalvando(true)
    setErro('')
    try {
      const motivo = confirmado ? undefined : window.prompt('Observação sobre a recusa do tutor:')
      await enviarApi(`/agendamentos/remanejamentos/${id}/confirmacao-tutor`, token, {
        method: 'PATCH',
        body: JSON.stringify({ confirmado, motivo }),
      })
      setMensagem(confirmado
        ? 'Confirmação registrada; o novo veterinário foi atribuído e o original ficou como reserva.'
        : 'Recusa registrada; o veterinário original continua responsável.')
      await atualizarDados()
    } catch (errorTutor) {
      setErro(errorTutor.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section className="page-shell">
      <div className="page-header">
        <h1>Agendamentos</h1>
        <button type="button" className="primary-btn" onClick={abrirModalNovoAgendamento}>+ Novo agendamento</button>
      </div>

      {modalNovoAgendamento && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Novo agendamento">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Novo agendamento</h2>
              <button type="button" className="close-btn" onClick={() => setModalNovoAgendamento(false)}>×</button>
            </div>

            <form className="modal-form" onSubmit={salvarNovoAgendamento}>
              <label>
                Pet
                <select value={formNovoAgendamento.pet} onChange={(evento) => setFormNovoAgendamento((atual) => ({ ...atual, pet: evento.target.value }))} required>
                  <option value="">Selecione um pet</option>
                  {opcoesCadastro.pets.map((pet) => (
                    <option key={pet._id || pet.id} value={pet._id || pet.id}>{pet.nome}</option>
                  ))}
                </select>
              </label>

              <label>
                Veterinário
                <select value={formNovoAgendamento.veterinario} onChange={(evento) => setFormNovoAgendamento((atual) => ({ ...atual, veterinario: evento.target.value }))} required>
                  <option value="">Selecione um veterinário</option>
                  {opcoesCadastro.veterinarios.map((veterinario) => (
                    <option key={veterinario._id || veterinario.id} value={veterinario._id || veterinario.id}>{veterinario.nome}</option>
                  ))}
                </select>
              </label>

              <div className="field-row">
                <label>
                  Data
                  <input type="date" value={formNovoAgendamento.data} onChange={(evento) => setFormNovoAgendamento((atual) => ({ ...atual, data: evento.target.value }))} required />
                </label>

                <label>
                  Horário
                  <select value={formNovoAgendamento.horario} onChange={(evento) => setFormNovoAgendamento((atual) => ({ ...atual, horario: evento.target.value }))} required>
                    {horariosAgendamento.map((horario) => (
                      <option key={horario} value={horario}>{horario}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Observações
                <textarea value={formNovoAgendamento.observacoes} onChange={(evento) => setFormNovoAgendamento((atual) => ({ ...atual, observacoes: evento.target.value }))} rows={4} placeholder="Detalhes do atendimento ou motivo do agendamento" />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setModalNovoAgendamento(false)} disabled={salvando}>Cancelar</button>
                <button type="submit" className="primary-btn" disabled={salvando}>Salvar agendamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {podeVerFila && (
        <section className="workflow-panel" aria-labelledby="workflow-title">
          <div className="workflow-heading">
            <div>
              <h2 id="workflow-title">Fila de remanejamentos</h2>
              <p>Propostas aguardando decisão ou confirmação do tutor.</p>
            </div>
            <span className="page-badge">{pendencias.length} pendente(s)</span>
          </div>
          {erro && <p className="workflow-message error" role="alert">{erro}</p>}
          {mensagem && <p className="workflow-message success" role="status">{mensagem}</p>}
          {pendencias.length === 0 ? (
            <p className="workflow-empty">Nenhum remanejamento pendente.</p>
          ) : (
            <div className="workflow-list">
              {pendencias.map((pendencia) => (
                <article key={pendencia._id} className={`workflow-item ${pendencia.alertaUmaHora ? 'urgent' : ''}`}>
                  <div className="workflow-copy">
                    <strong>{pendencia.agendamento?.pet?.nome || 'Pet'} · {formatarData(pendencia.agendamento.data)} às {pendencia.agendamento.horario}</strong>
                    <span>{pendencia.veterinarioOriginal?.nome} → {pendencia.veterinarioProposto?.nome}</span>
                    <small>{pendencia.justificativaEmergencia}</small>
                    <span className="workflow-state">
                      {pendencia.estado === 'aguardando_aprovacao' ? 'Aguardando administração' : 'Aguardando confirmação do tutor'}
                      {pendencia.alertaUmaHora && ' · Consulta em até 1 hora'}
                    </span>
                  </div>
                  <div className="workflow-actions">
                    {ehAdministracao && pendencia.estado === 'aguardando_aprovacao' && (
                      <>
                        <button type="button" disabled={salvando} onClick={() => decidirProposta(pendencia._id, true)}>Aprovar</button>
                        <button type="button" disabled={salvando} onClick={() => decidirProposta(pendencia._id, false)}>Recusar</button>
                      </>
                    )}
                    {podeVerFila && pendencia.estado === 'aguardando_tutor' && (
                      <>
                        <button type="button" disabled={salvando} onClick={() => registrarRespostaTutor(pendencia._id, true)}>Tutor confirmou</button>
                        <button type="button" disabled={salvando} onClick={() => registrarRespostaTutor(pendencia._id, false)}>Tutor recusou</button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {erro && !podeVerFila && <p className="workflow-message error" role="alert">{erro}</p>}
      <div className="filter-bar">
        <button type="button" className={filtro === 'todos' ? 'filter-btn active' : 'filter-btn'} onClick={() => setFiltro('todos')}>Todos</button>
        <button type="button" className={filtro === 'agendado' ? 'filter-btn active' : 'filter-btn'} onClick={() => setFiltro('agendado')}>Agendados</button>
        <button type="button" className={filtro === 'confirmado' ? 'filter-btn active' : 'filter-btn'} onClick={() => setFiltro('confirmado')}>Confirmados</button>
        <button type="button" className={filtro === 'concluido' ? 'filter-btn active' : 'filter-btn'} onClick={() => setFiltro('concluido')}>Concluídos</button>
      </div>

      <div className="agenda-list">
        {listaFiltrada.map((agendamento) => (
          <article key={agendamento.id} className="agenda-card">
            <div className="agenda-pet">
              <div className="pet-avatar">🐾</div>
              <div>
                <h3>{agendamento.pet?.nome || 'Pet'}</h3>
                <small>{agendamento.veterinario?.nome || 'Veterinário'}</small>
                {agendamento.veterinarioReserva && <small>Reserva: {agendamento.veterinarioReserva.nome}</small>}
              </div>
            </div>
            <div className="agenda-info">
              <span>{agendamento.pet?.especie || 'Espécie'}</span>
              <span>{formatarData(agendamento.data)}</span>
              <span>{agendamento.horario}</span>
              {agendamento.tipoAgendamento === 'emergencia' && <strong className="emergency-label">Emergência: {agendamento.justificativaEmergencia}</strong>}
              {agendamento.tipoAgendamento === 'encaixe' && <strong className="emergency-label">Encaixe liberado pela recepção</strong>}
            </div>
            <div className="agenda-meta">
              <span className={`status-badge ${agendamento.status?.toLowerCase()}`}>{agendamento.status}</span>
              <small>{agendamento.observacoes || 'Sem observações'}</small>
              {['administrador', 'veterinario'].includes(usuario?.perfil) && agendamento.status === 'agendado' && (
                <button type="button" className="transfer-btn" disabled={salvando} onClick={() => aceitarAgendamento(agendamento)}>Aceitar agendamento</button>
              )}
              {['administrador', 'veterinario'].includes(usuario?.perfil) && agendamento.status === 'confirmado' && (
                <button type="button" className="transfer-btn" disabled={salvando} onClick={() => concluirAtendimento(agendamento.id)}>Concluir atendimento</button>
              )}
              {podeVerFila && !['cancelado', 'concluido'].includes(agendamento.status) && agendamento.tipoAgendamento !== 'emergencia' && (
                <button type="button" className="transfer-btn" onClick={() => abrirFormulario(agendamento)}>Propor remanejamento</button>
              )}
            </div>
            {formAberto === agendamento.id && (
              <form className="transfer-form" onSubmit={(evento) => enviarProposta(evento, agendamento.id)}>
                <label>
                  Emergência que motivou a proposta
                  <select required value={proposta.agendamentoEmergencia} onChange={(evento) => setProposta({ ...proposta, agendamentoEmergencia: evento.target.value })} disabled={!opcoes}>
                    <option value="">Selecione a emergência</option>
                    {opcoes?.emergencias.map((emergencia) => (
                      <option key={emergencia._id} value={emergencia._id}>{emergencia.pet?.nome || 'Pet'} · {emergencia.horario}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Veterinário proposto
                  <select required value={proposta.veterinarioProposto} onChange={(evento) => setProposta({ ...proposta, veterinarioProposto: evento.target.value })} disabled={!opcoes}>
                    <option value="">Selecione o veterinário</option>
                    {opcoes?.veterinarios.filter((veterinario) => veterinario._id !== agendamento.veterinario?.id).map((veterinario) => (
                      <option key={veterinario._id} value={veterinario._id}>{veterinario.nome}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Justificativa da emergência
                  <textarea required minLength={10} value={proposta.justificativaEmergencia} onChange={(evento) => setProposta({ ...proposta, justificativaEmergencia: evento.target.value })} />
                </label>
                <div className="workflow-actions">
                  <button type="submit" disabled={salvando || !opcoes}>Enviar para aprovação</button>
                  <button type="button" onClick={() => setFormAberto('')}>Cancelar</button>
                </div>
              </form>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
