import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_CONSULTAS_POR_PET, GET_VACINAS_POR_PET } from '../graphql/queries';
import { apiRequest } from '../lib/api';
import './PetsProntuariosPage.css';

const petVazio = { nome: '', especie: '', raca: '', idade: '', peso: '', tutor: '' };
const prontuarioVazio = {
  dataAtendimento: new Date().toISOString().slice(0, 10),
  motivo: '',
  anamnese: '',
  diagnostico: '',
  tratamento: '',
  observacoes: '',
  retornoEm: '',
};

function dataFormatada(valor) {
  if (!valor) return 'Não informada';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? 'Não informada' : data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function dataParaFormulario(valor) {
  return valor ? new Date(valor).toISOString().slice(0, 10) : '';
}

function campoTexto(label, name, form, setForm, options = {}) {
  const id = `campo-${name}`;
  return (
    <label className={options.wide ? 'workspace-field workspace-field-wide' : 'workspace-field'} htmlFor={id} key={name}>
      <span>{label}</span>
      {options.multiline ? (
        <textarea id={id} name={name} rows="3" maxLength={5000} value={form[name]} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} />
      ) : (
        <input id={id} name={name} type={options.type || 'text'} min={options.min} step={options.step} maxLength={options.maxLength} required={options.required} value={form[name]} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} />
      )}
    </label>
  );
}

export default function PetsProntuariosPage({ secao, usuario, pets, petsLoading, petsError, usuarios, petSelecionadoId, onSelectPet, onNavigate, refetchPets, refetchPetDetalhe, refetchProntuarios }) {
  const [busca, setBusca] = useState('');
  const [modoPet, setModoPet] = useState(null);
  const [petForm, setPetForm] = useState(petVazio);
  const [modoProntuario, setModoProntuario] = useState(null);
  const [prontuarioForm, setProntuarioForm] = useState(prontuarioVazio);
  const [resultadoProntuarios, setResultadoProntuarios] = useState({ petId: '', revisao: -1, items: [], erro: '' });
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [revisao, setRevisao] = useState(0);

  const isTutor = usuario?.perfil === 'tutor';
  const podeRegistrar = ['administrador', 'veterinario'].includes(usuario?.perfil);
  const podeArquivar = usuario?.perfil === 'administrador';
  const tutores = usuarios.filter((item) => item.perfil === 'tutor' && item.ativo);
  const petSelecionado = pets.find((pet) => pet.id === petSelecionadoId) || pets[0] || null;
  const petId = petSelecionado?.id || '';
  const dadosAtuais = resultadoProntuarios.petId === petId && resultadoProntuarios.revisao === revisao;
  const prontuarios = dadosAtuais ? resultadoProntuarios.items : [];
  const carregandoProntuarios = Boolean(petId) && !dadosAtuais;
  const erroProntuarios = dadosAtuais ? resultadoProntuarios.erro : '';
  const petsFiltrados = pets.filter((pet) => `${pet.nome} ${pet.especie} ${pet.raca || ''} ${pet.tutor?.nome || ''}`.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')));

  const { data: consultasData, loading: consultasLoading, error: consultasError } = useQuery(GET_CONSULTAS_POR_PET, {
    variables: { petId },
    skip: !petId,
  });
  const { data: vacinasData, loading: vacinasLoading, error: vacinasError } = useQuery(GET_VACINAS_POR_PET, {
    variables: { petId },
    skip: !petId,
  });

  useEffect(() => {
    if (!petId) return;
    let ativo = true;
    apiRequest(`/prontuarios?petId=${encodeURIComponent(petId)}`)
      .then((dados) => { if (ativo) setResultadoProntuarios({ petId, revisao, items: dados, erro: '' }); })
      .catch((erro) => { if (ativo) setResultadoProntuarios({ petId, revisao, items: [], erro: erro.message }); });
    return () => { ativo = false; };
  }, [petId, revisao]);

  const consultas = consultasData?.consultasPorPet || [];
  const vacinas = vacinasData?.vacinasPorPet || [];
  const historico = [
    ...prontuarios.map((item) => ({ tipo: 'prontuario', data: item.dataAtendimento, item })),
    ...consultas.map((item) => ({ tipo: 'consulta', data: item.createdAt, item })),
    ...vacinas.map((item) => ({ tipo: 'vacina', data: item.dataAplicacao, item })),
  ].sort((a, b) => new Date(b.data) - new Date(a.data));

  function abrirNovoPet() {
    setPetForm({ ...petVazio, tutor: isTutor ? usuario.id : '' });
    setModoPet('novo');
    setMensagem('');
  }

  function abrirEdicaoPet() {
    if (!petSelecionado) return;
    setPetForm({
      nome: petSelecionado.nome,
      especie: petSelecionado.especie,
      raca: petSelecionado.raca || '',
      idade: String(petSelecionado.idade),
      peso: String(petSelecionado.peso),
      tutor: petSelecionado.tutor?.id || '',
    });
    setModoPet('editar');
    setMensagem('');
  }

  async function salvarPet(event) {
    event.preventDefault();
    const idade = Number(petForm.idade);
    const peso = Number(petForm.peso);
    if (!petForm.nome.trim() || !petForm.especie.trim() || petForm.idade === '' || petForm.peso === '' || !Number.isInteger(idade) || idade < 0 || !Number.isFinite(peso) || peso < 0) {
      setMensagem('Informe nome, espécie, idade inteira e peso válido.');
      return;
    }
    if (!isTutor && !petForm.tutor) {
      setMensagem('Selecione um tutor para o pet.');
      return;
    }
    setSalvando(true);
    setMensagem('');
    try {
      const payload = {
        nome: petForm.nome.trim(),
        especie: petForm.especie.trim(),
        raca: petForm.raca.trim(),
        idade,
        peso,
        ...(!isTutor ? { tutor: petForm.tutor } : {}),
      };
      const resultado = await apiRequest(modoPet === 'novo' ? '/pets' : `/pets/${petId}`, {
        method: modoPet === 'novo' ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      });
      await refetchPets();
      if (modoPet === 'editar' && petSelecionadoId && refetchPetDetalhe) await refetchPetDetalhe();
      onSelectPet({ ...resultado, id: resultado.id || resultado._id });
      setModoPet(null);
      setMensagem(modoPet === 'novo' ? 'Pet cadastrado com sucesso.' : 'Dados do pet atualizados.');
    } catch (erro) {
      setMensagem(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  async function arquivarPet() {
    if (!petSelecionado || !window.confirm(`Arquivar ${petSelecionado.nome}? O histórico clínico será preservado.`)) return;
    setSalvando(true);
    setMensagem('');
    try {
      await apiRequest(`/pets/${petId}`, { method: 'DELETE' });
      onSelectPet(null);
      await refetchPets();
      setMensagem('Pet arquivado. O histórico clínico foi preservado.');
    } catch (erro) {
      setMensagem(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  function abrirNovoProntuario() {
    setProntuarioForm({ ...prontuarioVazio, dataAtendimento: new Date().toISOString().slice(0, 10) });
    setModoProntuario({ tipo: 'novo' });
    setMensagem('');
  }

  function abrirEdicaoProntuario(item) {
    setProntuarioForm({
      dataAtendimento: dataParaFormulario(item.dataAtendimento),
      motivo: item.motivo || '',
      anamnese: item.anamnese || '',
      diagnostico: item.diagnostico || '',
      tratamento: item.tratamento || '',
      observacoes: item.observacoes || '',
      retornoEm: dataParaFormulario(item.retornoEm),
    });
    setModoProntuario({ tipo: 'editar', id: item._id, veterinario: item.veterinario?.nome || 'Não informado' });
    setMensagem('');
  }

  async function salvarProntuario(event) {
    event.preventDefault();
    if (!petId || !prontuarioForm.motivo.trim() || !prontuarioForm.dataAtendimento) {
      setMensagem('Informe o pet, a data e o motivo do atendimento.');
      return;
    }
    setSalvando(true);
    setMensagem('');
    try {
      const payload = {
        pet: petId,
        ...prontuarioForm,
        motivo: prontuarioForm.motivo.trim(),
        dataAtendimento: `${prontuarioForm.dataAtendimento}T12:00:00.000Z`,
        retornoEm: prontuarioForm.retornoEm ? `${prontuarioForm.retornoEm}T12:00:00.000Z` : null,
      };
      await apiRequest(modoProntuario.tipo === 'novo' ? '/prontuarios' : `/prontuarios/${modoProntuario.id}`, {
        method: modoProntuario.tipo === 'novo' ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      });
      setModoProntuario(null);
      setRevisao((valor) => valor + 1);
      await refetchProntuarios();
      setMensagem(modoProntuario.tipo === 'novo' ? 'Prontuário registrado com sucesso.' : 'Prontuário atualizado.');
    } catch (erro) {
      setMensagem(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  async function arquivarProntuario(item) {
    if (!window.confirm(`Arquivar o atendimento “${item.motivo}”?`)) return;
    setSalvando(true);
    setMensagem('');
    try {
      await apiRequest(`/prontuarios/${item._id}`, { method: 'DELETE' });
      setRevisao((valor) => valor + 1);
      await refetchProntuarios();
      setMensagem('Prontuário arquivado.');
    } catch (erro) {
      setMensagem(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="workspace-eyebrow">{secao === 'pets' ? 'Pacientes' : 'Histórico clínico'}</span>
          <h1>{secao === 'pets' ? 'Pets' : 'Prontuários'}</h1>
          <p>{secao === 'pets' ? 'Cadastre pacientes e acompanhe seus dados.' : 'Consulte os atendimentos, consultas e vacinas de cada pet.'}</p>
        </div>
        {secao === 'pets' ? (
          <button type="button" className="primary-button small-button" onClick={abrirNovoPet}>+ Novo pet</button>
        ) : podeRegistrar && petSelecionado ? (
          <button type="button" className="primary-button small-button" onClick={abrirNovoProntuario}>+ Novo prontuário</button>
        ) : null}
      </div>

      {mensagem && <div className="workspace-message" role="status">{mensagem}</div>}

      {secao === 'pets' && (
        <>
          <div className="workspace-stats">
            <div className="summary-card summary-primary"><span>Pets ativos</span><strong>{pets.length}</strong></div>
            <div className="summary-card"><span>Paciente selecionado</span><strong>{petSelecionado?.nome || 'Nenhum'}</strong></div>
            <div className="summary-card"><span>Registros clínicos</span><strong>{historico.length}</strong></div>
          </div>
          <label className="workspace-search">
            <span>Buscar por nome, espécie, raça ou tutor</span>
            <input type="search" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar pet" />
          </label>
          {petsLoading ? <p className="empty-state">Carregando pets...</p> : petsError ? <p className="empty-state">Não foi possível carregar os pets.</p> : petsFiltrados.length ? (
            <div className="workspace-pet-list">
              {petsFiltrados.map((pet) => (
                <button type="button" key={pet.id} className={`workspace-pet-item ${petSelecionado?.id === pet.id ? 'selected' : ''}`} onClick={() => onSelectPet(pet)}>
                  <span className="pet-avatar">{pet.nome.charAt(0).toUpperCase()}</span>
                  <span><strong>{pet.nome}</strong><small>{pet.especie}{pet.raca ? ` · ${pet.raca}` : ''} · Tutor: {pet.tutor?.nome || 'Não informado'}</small></span>
                </button>
              ))}
            </div>
          ) : <p className="empty-state">{busca ? 'Nenhum pet corresponde à busca.' : 'Nenhum pet cadastrado. Use “Novo pet” para começar.'}</p>}

          {petSelecionado && (
            <section className="pet-detail-panel workspace-detail">
              <div className="workspace-section-heading">
                <div><span className="workspace-eyebrow">Paciente selecionado</span><h2>{petSelecionado.nome}</h2></div>
                <div className="workspace-actions">
                  <button type="button" className="secondary-button" onClick={abrirEdicaoPet}>Editar pet</button>
                  <button type="button" className="primary-button small-button" onClick={() => onNavigate('prontuarios')}>Abrir prontuário</button>
                </div>
              </div>
              <div className="pet-detail-grid">
                <div className="detail-item"><span>Espécie</span><strong>{petSelecionado.especie}</strong></div>
                <div className="detail-item"><span>Raça</span><strong>{petSelecionado.raca || 'Não informada'}</strong></div>
                <div className="detail-item"><span>Idade</span><strong>{petSelecionado.idade} anos</strong></div>
                <div className="detail-item"><span>Peso</span><strong>{petSelecionado.peso} kg</strong></div>
                <div className="detail-item"><span>Tutor</span><strong>{petSelecionado.tutor?.nome || 'Não informado'}</strong></div>
                <div className="detail-item"><span>E-mail do tutor</span><strong>{petSelecionado.tutor?.email || 'Não informado'}</strong></div>
              </div>
              {podeArquivar && <button type="button" className="workspace-danger" disabled={salvando} onClick={arquivarPet}>Arquivar pet</button>}
            </section>
          )}
        </>
      )}

      {secao === 'prontuarios' && (
        <>
          <label className="workspace-field workspace-pet-select" htmlFor="pet-prontuario">
            <span>Paciente</span>
            <select id="pet-prontuario" value={petId} onChange={(event) => onSelectPet(pets.find((pet) => pet.id === event.target.value))}>
              {pets.length === 0 && <option value="">Nenhum pet cadastrado</option>}
              {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.nome} · {pet.tutor?.nome || 'Sem tutor'}</option>)}
            </select>
          </label>
          {petSelecionado ? (
            <>
              <div className="workspace-stats">
                <div className="summary-card summary-primary"><span>Prontuários</span><strong>{prontuarios.length}</strong></div>
                <div className="summary-card"><span>Consultas</span><strong>{consultas.length}</strong></div>
                <div className="summary-card"><span>Vacinas</span><strong>{vacinas.length}</strong></div>
              </div>
              <div className="workspace-section-heading"><div><span className="workspace-eyebrow">Histórico de {petSelecionado.nome}</span><h2>Atendimentos</h2></div></div>
              {carregandoProntuarios || consultasLoading || vacinasLoading ? <p className="empty-state">Carregando histórico...</p> : erroProntuarios || consultasError || vacinasError ? <p className="empty-state" role="alert">{erroProntuarios || 'Não foi possível carregar todo o histórico.'}</p> : historico.length === 0 ? <p className="empty-state">Nenhum prontuário cadastrado para este pet.</p> : (
                <div className="workspace-timeline">
                  {historico.map(({ tipo, item, data }) => (
                    <article className="record-card" key={`${tipo}-${item._id || item.id}`}>
                      <div className="record-topline"><span className="record-tag">{tipo === 'prontuario' ? 'Prontuário' : tipo === 'consulta' ? 'Consulta' : 'Vacina'}</span><time>{dataFormatada(data)}</time></div>
                      <h3>{tipo === 'prontuario' ? item.motivo : tipo === 'consulta' ? item.motivoConsulta : item.tipo}</h3>
                      <div className="record-meta"><span>{item.veterinario?.nome || 'Profissional não informado'}</span><span>{petSelecionado.nome}</span></div>
                      {tipo === 'prontuario' && <div className="workspace-record-body">
                        {item.anamnese && <p><strong>Anamnese:</strong> {item.anamnese}</p>}
                        {item.diagnostico && <p><strong>Diagnóstico:</strong> {item.diagnostico}</p>}
                        {item.tratamento && <p><strong>Tratamento:</strong> {item.tratamento}</p>}
                        {item.observacoes && <p><strong>Observações:</strong> {item.observacoes}</p>}
                        {item.retornoEm && <p><strong>Retorno:</strong> {dataFormatada(item.retornoEm)}</p>}
                      </div>}
                      {tipo === 'consulta' && <div className="workspace-record-body">
                        {item.procedimentos?.length > 0 && <p><strong>Procedimentos:</strong> {item.procedimentos.join(', ')}</p>}
                        {item.observacoes && <p><strong>Observações:</strong> {item.observacoes}</p>}
                      </div>}
                      {tipo === 'vacina' && <div className="workspace-record-body">
                        <p><strong>Aplicação:</strong> {dataFormatada(item.dataAplicacao)}</p>
                        {item.dataPrevistaReforco && <p><strong>Reforço:</strong> {dataFormatada(item.dataPrevistaReforco)}</p>}
                        {item.observacoes && <p><strong>Observações:</strong> {item.observacoes}</p>}
                      </div>}
                      {tipo === 'prontuario' && podeRegistrar && <div className="workspace-actions workspace-record-actions">
                        <button type="button" className="secondary-button" onClick={() => abrirEdicaoProntuario(item)}>Editar</button>
                        {podeArquivar && <button type="button" className="workspace-danger" disabled={salvando} onClick={() => arquivarProntuario(item)}>Arquivar</button>}
                      </div>}
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : <p className="empty-state">Cadastre um pet para iniciar o prontuário.</p>}
        </>
      )}

      {modoPet && <div className="workspace-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModoPet(null); }}>
        <form className="workspace-modal" onSubmit={salvarPet} aria-label={modoPet === 'novo' ? 'Cadastrar pet' : 'Editar pet'}>
          <div className="workspace-section-heading"><h2>{modoPet === 'novo' ? 'Novo pet' : `Editar ${petSelecionado?.nome}`}</h2><button type="button" className="workspace-close" onClick={() => setModoPet(null)} aria-label="Fechar">×</button></div>
          <div className="workspace-form-grid">
            {campoTexto('Nome', 'nome', petForm, setPetForm, { required: true, maxLength: 120 })}
            {campoTexto('Espécie', 'especie', petForm, setPetForm, { required: true, maxLength: 120 })}
            {campoTexto('Raça', 'raca', petForm, setPetForm, { maxLength: 120 })}
            {campoTexto('Idade em anos', 'idade', petForm, setPetForm, { type: 'number', min: '0', step: '1', required: true })}
            {campoTexto('Peso em kg', 'peso', petForm, setPetForm, { type: 'number', min: '0', step: '0.01', required: true })}
            {!isTutor && <label className="workspace-field" htmlFor="campo-tutor"><span>Tutor</span><select id="campo-tutor" value={petForm.tutor} required onChange={(event) => setPetForm((current) => ({ ...current, tutor: event.target.value }))}><option value="">Selecione um tutor</option>{tutores.map((tutor) => <option key={tutor.id} value={tutor.id}>{tutor.nome} · {tutor.email}</option>)}</select></label>}
          </div>
          {!isTutor && tutores.length === 0 && <p className="workspace-hint">Cadastre um usuário com perfil tutor antes de adicionar o pet.</p>}
          {mensagem && <p className="workspace-message" role="alert">{mensagem}</p>}
          <div className="workspace-actions"><button type="button" className="secondary-button" onClick={() => setModoPet(null)}>Cancelar</button><button type="submit" className="primary-button small-button" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar pet'}</button></div>
        </form>
      </div>}

      {modoProntuario && <div className="workspace-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModoProntuario(null); }}>
        <form className="workspace-modal" onSubmit={salvarProntuario} aria-label={modoProntuario.tipo === 'novo' ? 'Novo prontuário' : 'Editar prontuário'}>
          <div className="workspace-section-heading"><h2>{modoProntuario.tipo === 'novo' ? 'Novo prontuário' : 'Editar prontuário'}</h2><button type="button" className="workspace-close" onClick={() => setModoProntuario(null)} aria-label="Fechar">×</button></div>
          <p className="workspace-hint">Paciente: <strong>{petSelecionado?.nome}</strong> · Profissional responsável: <strong>{modoProntuario.tipo === 'editar' ? modoProntuario.veterinario : usuario?.nome}</strong></p>
          <div className="workspace-form-grid">
            {campoTexto('Data do atendimento', 'dataAtendimento', prontuarioForm, setProntuarioForm, { type: 'date', required: true })}
            {campoTexto('Retorno previsto', 'retornoEm', prontuarioForm, setProntuarioForm, { type: 'date' })}
            {campoTexto('Motivo do atendimento', 'motivo', prontuarioForm, setProntuarioForm, { required: true, maxLength: 200, wide: true })}
            {campoTexto('Anamnese', 'anamnese', prontuarioForm, setProntuarioForm, { multiline: true, wide: true })}
            {campoTexto('Diagnóstico', 'diagnostico', prontuarioForm, setProntuarioForm, { multiline: true, wide: true })}
            {campoTexto('Tratamento', 'tratamento', prontuarioForm, setProntuarioForm, { multiline: true, wide: true })}
            {campoTexto('Observações', 'observacoes', prontuarioForm, setProntuarioForm, { multiline: true, wide: true })}
          </div>
          {mensagem && <p className="workspace-message" role="alert">{mensagem}</p>}
          <div className="workspace-actions"><button type="button" className="secondary-button" onClick={() => setModoProntuario(null)}>Cancelar</button><button type="submit" className="primary-button small-button" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar prontuário'}</button></div>
        </form>
      </div>}
    </div>
  );
}
