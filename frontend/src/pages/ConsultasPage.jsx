import { useMemo, useState } from 'react';
import './ConsultasPage.css';

const statusConsulta = {
  agendada: { texto: 'Agendada', classe: 'agendada' },
  cancelada: { texto: 'Cancelada', classe: 'cancelada' },
  concluida: { texto: 'Concluída', classe: 'concluida' },
};

function formatarData(consulta) {
  if (consulta.agendamento?.data) {
    return `${new Date(consulta.agendamento.data).toLocaleDateString('pt-BR')} às ${consulta.agendamento.horario}`;
  }

  return consulta.createdAt
    ? new Date(consulta.createdAt).toLocaleDateString('pt-BR')
    : 'Data não informada';
}

export default function ConsultasPage({
  consultas,
  isTutorView,
  consultaStatus,
  usuarioAtual,
  petSelecionado,
  onMarcar,
  onConcluir,
  onDesmarcar,
  onReabrir,
}) {
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [paginaConsultas, setPaginaConsultas] = useState(1);
  const podeGerenciar = ['administrador', 'veterinario'].includes(usuarioAtual?.perfil);
  const consultasFiltradas = useMemo(() => {
    if (filtroStatus === 'todos') return consultas;
    return consultas.filter((consulta) => consulta.status === filtroStatus);
  }, [consultas, filtroStatus]);
  const totalPaginasConsultas = Math.max(1, Math.ceil(consultasFiltradas.length / 8));
  const paginaConsultasAtual = Math.min(paginaConsultas, totalPaginasConsultas);
  const consultasDaPagina = consultasFiltradas.slice((paginaConsultasAtual - 1) * 8, paginaConsultasAtual * 8);

  function selecionarFiltro(status) {
    setFiltroStatus(status);
    setPaginaConsultas(1);
  }

  return (
    <section id="consultas" className="workspace-page consultas-page">
      <div className="workspace-heading consultas-header">
        <div>
          <span className="workspace-eyebrow">Atendimentos</span>
          <h1>Consultas</h1>
          <p>Acompanhe os atendimentos dos pacientes.</p>
        </div>

        {!isTutorView && (
          <button type="button" className="primary-button small-button" onClick={onMarcar}>
            + Marcar consulta
          </button>
        )}
      </div>

      {consultaStatus && (
        <p className="consultas-message" role="status">
          {consultaStatus}
        </p>
      )}

      <div className="consultas-filtros" aria-label="Filtrar consultas por status">
        <button type="button" className={filtroStatus === 'todos' ? 'ativo' : ''} onClick={() => selecionarFiltro('todos')}>Todas</button>
        <button type="button" className={filtroStatus === 'agendada' ? 'ativo' : ''} onClick={() => selecionarFiltro('agendada')}>Agendadas</button>
        <button type="button" className={filtroStatus === 'cancelada' ? 'ativo' : ''} onClick={() => selecionarFiltro('cancelada')}>Canceladas</button>
        <button type="button" className={filtroStatus === 'concluida' ? 'ativo' : ''} onClick={() => selecionarFiltro('concluida')}>Concluídas</button>
      </div>

      {consultasFiltradas.length > 0 ? (
        <div className="consultas-lista">
          {consultasDaPagina.map((consulta, index) => {
            const status = statusConsulta[consulta.status] || {
              texto: consulta.status || 'Não informado',
              classe: 'neutro',
            };
            const nomePet = consulta.pet?.nome || petSelecionado?.nome || 'Pet';

            return (
              <article key={consulta.id || index} className="consultas-card">
                <div className="consultas-card-header">
                  <div className="consultas-paciente">
                    <span className="consultas-avatar">{nomePet.charAt(0).toUpperCase()}</span>
                    <div>
                      <h2>{nomePet}</h2>
                      <p>Veterinário: <strong>{consulta.veterinario?.nome || 'Não informado'}</strong></p>
                    </div>
                  </div>

                  <span className={`consultas-status ${status.classe}`}>{status.texto}</span>
                </div>

                <div className="consultas-detalhes">
                  <p><span>Motivo</span><strong>{consulta.motivoConsulta || 'Consulta veterinária'}</strong></p>
                  <p><span>Data</span><strong>{formatarData(consulta)}</strong></p>
                </div>

                {consulta.procedimentos?.length > 0 && (
                  <div className="consultas-procedimentos">
                    <span>Procedimentos</span>
                    <ul>
                      {consulta.procedimentos.map((item, procedimentoIndex) => (
                        <li key={`${consulta.id || 'consulta'}-${procedimentoIndex}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {!isTutorView && podeGerenciar && consulta.status !== 'concluida' && (
                  <div className="consultas-acoes">
                    {consulta.status === 'cancelada' ? (
                      <button type="button" className="secondary-button" onClick={() => onReabrir(consulta)}>
                        Reabrir consulta
                      </button>
                    ) : (
                      <button type="button" className="secondary-button" onClick={() => onDesmarcar(consulta)}>
                        Cancelar
                      </button>
                    )}

                    <button type="button" className="primary-button small-button" onClick={() => onConcluir(consulta)}>
                      Concluir atendimento
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="consultas-vazio">
          {consultas.length === 0
            ? 'Nenhuma consulta para este pet.'
            : 'Nenhuma consulta encontrada com este status.'}
        </p>
      )}

      {totalPaginasConsultas > 1 && (
        <div className="consultas-pagination">
          <button type="button" disabled={paginaConsultasAtual === 1} onClick={() => setPaginaConsultas((pagina) => pagina - 1)}>Anterior</button>
          <span>{paginaConsultasAtual}/{totalPaginasConsultas}</span>
          <button type="button" disabled={paginaConsultasAtual === totalPaginasConsultas} onClick={() => setPaginaConsultas((pagina) => pagina + 1)}>Próxima</button>
        </div>
      )}
    </section>
  );
}
