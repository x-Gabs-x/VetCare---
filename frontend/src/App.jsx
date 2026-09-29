import { useQuery } from '@apollo/client/react';
import { useState } from 'react';
import './App.css';
import {
  GET_CONSULTAS,
  GET_CONSULTAS_POR_PET,
  GET_PET,
  GET_PETS,
  GET_USUARIOS,
  GET_VACINAS_POR_PET,
} from './graphql/queries';
import { fallbackConsultas, fallbackPets } from './data/fallbackData';

const initialLogin = {
  email: '',
  senha: '',
  manterConectado: true,
};

const initialCadastro = {
  nome: '',
  email: '',
  telefone: '',
  nomeAnimal: '',
  especie: '',
  raca: '',
  senha: '',
  confirmarSenha: '',
  aceitarTermos: false,
  receberNoticias: false,
};

function PetsProntuariosDashboard({ onLogout, perfil = 'administrador' }) {
  const isTutorView = perfil === 'tutor';
  const pageSize = 5;
  const [petsPage, setPetsPage] = useState(1);
  const [usuariosPage, setUsuariosPage] = useState(1);
  const [petSelecionadoId, setPetSelecionadoId] = useState(null);
  const [petEditando, setPetEditando] = useState(false);
  const [mostrarFormProntuario, setMostrarFormProntuario] = useState(false);
  const [mostrarFormPet, setMostrarFormPet] = useState(false);
  const [petFormStatus, setPetFormStatus] = useState('');
  const [petForm, setPetForm] = useState({ nome: '', especie: '', raca: '', idade: '', peso: '' });
  const [consultaForm, setConsultaForm] = useState({
    petId: '',
    veterinario: '',
    data: '',
    motivoConsulta: '',
    procedimentos: '',
    observacoes: '',
    status: 'agendada',
  });
  const [prontuarioForm, setProntuarioForm] = useState({
    tipo: 'consulta',
    petId: '',
    veterinario: '',
    data: '',
    motivo: '',
    procedimentos: '',
    observacoes: '',
    tipoVacina: '',
    reforco: '',
  });
  const [prontuarioManual, setProntuarioManual] = useState([]);
  const [vacinasAdicionadas, setVacinasAdicionadas] = useState([]);
  const [atalhoAtivo, setAtalhoAtivo] = useState('dashboard');
  const [abaAtiva, setAbaAtiva] = useState('dashboard');

  const { data: petsData, loading: petsLoading, error: petsError, refetch: refetchPets } = useQuery(GET_PETS);
  const { data: usuariosData, loading: usuariosLoading, error: usuariosError, refetch: refetchUsuarios } = useQuery(GET_USUARIOS);
  const { data: consultasData, loading: consultasLoading, error: consultasError } = useQuery(GET_CONSULTAS);
  const { data: petDetalheData, loading: petDetalheLoading, error: petDetalheError } = useQuery(GET_PET, {
    variables: { id: petSelecionadoId || '' },
    skip: !petSelecionadoId,
    fetchPolicy: 'cache-and-network',
  });
  const { data: consultasPetData, loading: consultasPetLoading, error: consultasPetError } = useQuery(GET_CONSULTAS_POR_PET, {
    variables: { petId: petSelecionadoId || '' },
    skip: !petSelecionadoId || !isTutorView,
    fetchPolicy: 'cache-and-network',
  });
  const { data: vacinasPetData, loading: vacinasPetLoading, error: vacinasPetError } = useQuery(GET_VACINAS_POR_PET, {
    variables: { petId: petSelecionadoId || '' },
    skip: !petSelecionadoId || !isTutorView,
    fetchPolicy: 'cache-and-network',
  });

  const usuarioAtual = JSON.parse(localStorage.getItem('vetcare_usuario') || sessionStorage.getItem('vetcare_usuario') || '{}');
  const petsBase = petsData?.pets ?? (isTutorView ? [] : fallbackPets);
  const pets = isTutorView
    ? petsBase.filter((pet) => {
        const tutorId = pet.tutor?.id || pet.tutor;
        return !usuarioAtual?.id || String(tutorId) === String(usuarioAtual.id);
      })
    : petsBase;
  const usuarios = usuariosData?.usuarios ?? [];
  const veterinarios = usuarios.filter((usuario) => usuario.perfil === 'veterinario' && usuario.ativo);
  const consultas = consultasData?.consultas ?? fallbackConsultas;
  const consultasPet = consultasPetData?.consultasPorPet ?? [];
  const vacinasPet = vacinasPetData?.vacinasPorPet ?? [];
  const petSelecionado = petDetalheData?.pet || pets.find((pet) => pet.id === petSelecionadoId) || pets[0] || null;
  const prontuarios = isTutorView
    ? consultasPet
    : consultas.filter((consulta) => {
        if (!petSelecionado) return true;
        return consulta.pet?.nome === petSelecionado.nome;
      });
  const historicoProntuarios = [...prontuarioManual, ...prontuarios];
  const vacinasAtuais = [...vacinasAdicionadas, ...vacinasPet];

  const totalPetsPages = Math.max(1, Math.ceil(pets.length / pageSize));
  const totalUsuariosPages = Math.max(1, Math.ceil(usuarios.length / pageSize));

  const petsPagina = pets.slice((petsPage - 1) * pageSize, petsPage * pageSize);
  const usuariosPagina = usuarios.slice((usuariosPage - 1) * pageSize, usuariosPage * pageSize);

  const mostrarPagina = (pagina, totalPaginas, setPagina) => {
    if (pagina < 1) return 1;
    if (pagina > totalPaginas) return totalPaginas;
    setPagina(pagina);
  };

  const atualizarUsuarioAdmin = async (usuarioId, payload) => {
    const token = localStorage.getItem('vetcare_token') || sessionStorage.getItem('vetcare_token');

    if (!token) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/usuarios/${usuarioId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.erro || 'Não foi possível atualizar o usuário.');
      }

      await refetchUsuarios();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUsuarioPerfilChange = async (usuarioId, perfil) => {
    await atualizarUsuarioAdmin(usuarioId, { perfil });
  };

  const handleUsuarioStatusChange = async (usuarioId, ativo) => {
    await atualizarUsuarioAdmin(usuarioId, { ativo });
  };

  const navegarParaSecao = (secao) => {
    setAtalhoAtivo(secao);
    setAbaAtiva(secao);
    const elemento = document.getElementById(secao);

    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const abrirPet = (pet) => {
    setPetSelecionadoId(pet.id);
    setPetEditando(false);
    setConsultaForm((prev) => ({
      ...prev,
      petId: pet.id,
      veterinario: prev.veterinario || (usuarioAtual?.perfil === 'veterinario' ? usuarioAtual.id : ''),
    }));
    setPetForm({
      nome: pet.nome || '',
      especie: pet.especie || '',
      raca: pet.raca || '',
      idade: pet.idade || '',
      peso: pet.peso || '',
    });
  };

  const iniciarEdicaoPet = () => {
    if (!petSelecionado) return;
    setPetForm({
      nome: petSelecionado.nome || '',
      especie: petSelecionado.especie || '',
      raca: petSelecionado.raca || '',
      idade: petSelecionado.idade || '',
      peso: petSelecionado.peso || '',
    });
    setPetEditando(true);
  };

  const handlePetFieldChange = (event) => {
    const { name, value } = event.target;
    setPetForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleConsultaFieldChange = (event) => {
    const { name, value } = event.target;
    setConsultaForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProntuarioFieldChange = (event) => {
    const { name, value } = event.target;
    setProntuarioForm((prev) => ({ ...prev, [name]: value }));
  };

  const limparFormularioConsulta = () => {
    setConsultaForm({
      petId: petSelecionado?.id || '',
      veterinario: '',
      data: '',
      motivoConsulta: '',
      procedimentos: '',
      observacoes: '',
      status: 'agendada',
    });
  };

  const criarPet = async () => {
    const token = localStorage.getItem('vetcare_token') || sessionStorage.getItem('vetcare_token');

    if (!token) {
      setPetFormStatus('Sua sessão expirou. Faça login novamente.');
      return;
    }

    try {
      if (!petForm.nome.trim() || !petForm.especie.trim() || petForm.idade === '' || petForm.peso === '') {
        setPetFormStatus('Preencha nome, espécie, idade e peso para cadastrar o pet.');
        return;
      }
      if (Number(petForm.idade) < 0 || Number(petForm.peso) < 0) {
        setPetFormStatus('Idade e peso não podem ser negativos.');
        return;
      }
      setPetFormStatus('');
      const payload = {
        nome: petForm.nome.trim(),
        especie: petForm.especie.trim(),
        raca: petForm.raca.trim(),
        idade: Number(petForm.idade),
        peso: Number(petForm.peso),
      };
      if (perfil === 'tutor') {
        delete payload.tutor;
      } else {
        payload.tutor = String(usuarioAtual?.id || '');
      }

      const response = await fetch('http://localhost:3000/pets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.erro || 'Não foi possível cadastrar o pet.');
      }

      setMostrarFormPet(false);
      setPetForm({ nome: '', especie: '', raca: '', idade: '', peso: '' });
      setPetFormStatus('Pet cadastrado com sucesso!');
      await refetchPets();
    } catch (error) {
      setPetFormStatus(error.message || 'Não foi possível cadastrar o pet.');
    }
  };

  const desativarPet = async (petId) => {
    const token = localStorage.getItem('vetcare_token') || sessionStorage.getItem('vetcare_token');

    if (!token) return;

    try {
      const response = await fetch(`http://localhost:3000/pets/${petId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.erro || 'Não foi possível remover o pet.');
      }

      window.location.reload();
    } catch (error) {
      console.error(error);
    }
  };

  const salvarConsulta = async () => {
    if (!consultaForm.petId || !consultaForm.veterinario || !consultaForm.motivoConsulta || !consultaForm.data || !usuarioAtual?.id) {
      return;
    }

    const token = localStorage.getItem('vetcare_token') || sessionStorage.getItem('vetcare_token');

    if (!token) {
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/consultas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pet: consultaForm.petId,
          veterinario: consultaForm.veterinario,
          motivoConsulta: consultaForm.motivoConsulta,
          procedimentos: consultaForm.procedimentos
            ? consultaForm.procedimentos.split('\n').map((item) => item.trim()).filter(Boolean)
            : [],
          observacoes: consultaForm.observacoes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.erro || 'Não foi possível registrar a consulta.');
      }

      const petRegistrado = pets.find((pet) => pet.id === consultaForm.petId) || petSelecionado;
      const consultaRegistrada = {
        id: result.consulta?.id || result.consulta?._id || `consulta-${Date.now()}`,
        createdAt: result.consulta?.createdAt || consultaForm.data,
        motivoConsulta: result.consulta?.motivoConsulta || consultaForm.motivoConsulta,
        procedimentos: result.consulta?.procedimentos || (consultaForm.procedimentos ? consultaForm.procedimentos.split('\n').map((item) => item.trim()).filter(Boolean) : ['Consulta registrada']),
        observacoes: result.consulta?.observacoes || consultaForm.observacoes || 'Sem observações adicionais.',
        veterinario: veterinarios.find((veterinario) => veterinario.id === consultaForm.veterinario) || { nome: 'Veterinário' },
        pet: { nome: petRegistrado?.nome || 'Pet' },
      };

      setProntuarioManual((prev) => [consultaRegistrada, ...prev]);
      limparFormularioConsulta();
    } catch (error) {
      console.error(error);
    }
  };

  const salvarProntuario = async () => {
    if (!prontuarioForm.petId || !prontuarioForm.veterinario || !prontuarioForm.data || !usuarioAtual?.id) {
      return;
    }

    const petSelecionadoNoRegistro = pets.find((pet) => pet.id === prontuarioForm.petId) || petSelecionado;
    const token = localStorage.getItem('vetcare_token') || sessionStorage.getItem('vetcare_token');

    if (!token) {
      return;
    }

    try {
      if (prontuarioForm.tipo === 'vacina') {
        if (!prontuarioForm.tipoVacina) {
          return;
        }

        const response = await fetch('http://localhost:3000/vacinas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pet: prontuarioForm.petId,
            veterinario: prontuarioForm.veterinario,
            tipo: prontuarioForm.tipoVacina,
            dataAplicacao: prontuarioForm.data,
            dataPrevistaReforco: prontuarioForm.reforco || null,
            observacoes: prontuarioForm.observacoes,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.erro || 'Não foi possível registrar a vacina.');
        }

        const novaVacina = {
          id: result.id || result._id || `manual-vacina-${Date.now()}`,
          tipo: result.tipo || prontuarioForm.tipoVacina,
          dataAplicacao: result.dataAplicacao || prontuarioForm.data,
          dataPrevistaReforco: result.dataPrevistaReforco || prontuarioForm.reforco || null,
          observacoes: result.observacoes || prontuarioForm.observacoes || 'Vacina registrada no prontuário.',
          veterinario: veterinarios.find((veterinario) => veterinario.id === prontuarioForm.veterinario) || { nome: 'Veterinário' },
          pet: { nome: petSelecionadoNoRegistro?.nome || 'Pet' },
        };

        setVacinasAdicionadas((prev) => [novaVacina, ...prev]);
      } else {
        if (!prontuarioForm.motivo) {
          return;
        }

        const response = await fetch('http://localhost:3000/consultas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pet: prontuarioForm.petId,
            veterinario: prontuarioForm.veterinario,
            motivoConsulta: prontuarioForm.motivo,
            procedimentos: prontuarioForm.procedimentos
              ? prontuarioForm.procedimentos.split('\n').map((item) => item.trim()).filter(Boolean)
              : [],
            observacoes: prontuarioForm.observacoes,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.erro || 'Não foi possível registrar o prontuário.');
        }

        const novoProntuario = {
          id: result.consulta?.id || result.consulta?._id || `manual-prontuario-${Date.now()}`,
          createdAt: result.consulta?.createdAt || prontuarioForm.data,
          motivoConsulta: result.consulta?.motivoConsulta || prontuarioForm.motivo,
          procedimentos: result.consulta?.procedimentos || (prontuarioForm.procedimentos ? prontuarioForm.procedimentos.split('\n').map((item) => item.trim()).filter(Boolean) : ['Atendimento registrado']),
          observacoes: result.consulta?.observacoes || prontuarioForm.observacoes || 'Consulta registrada no prontuário.',
          veterinario: veterinarios.find((veterinario) => veterinario.id === prontuarioForm.veterinario) || { nome: 'Veterinário' },
          pet: { nome: petSelecionadoNoRegistro?.nome || 'Pet' },
        };

        setProntuarioManual((prev) => [novoProntuario, ...prev]);
      }

      setProntuarioForm({
        tipo: 'consulta',
        petId: petSelecionado?.id || '',
        veterinario: '',
        data: '',
        motivo: '',
        procedimentos: '',
        observacoes: '',
        tipoVacina: '',
        reforco: '',
      });
      setMostrarFormProntuario(false);
    } catch (error) {
      console.error(error);
    }
  };

  const salvarEdicaoPet = async () => {
    if (!petSelecionado) return;

    const token = localStorage.getItem('vetcare_token') || sessionStorage.getItem('vetcare_token');

    if (!token) return;

    try {
      const response = await fetch(`http://localhost:3000/pets/${petSelecionado.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: petForm.nome,
          especie: petForm.especie,
          raca: petForm.raca,
          idade: Number(petForm.idade),
          peso: Number(petForm.peso),
        }),
      })
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.erro || 'Não foi possível atualizar o pet.');
      }

      setPetEditando(false);
      setPetSelecionadoId(petSelecionado.id);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="brand-mini">
          <span className="brand-symbol">✚</span>
          <div>
            <strong>VetCare</strong>
            <small>SaaS</small>
          </div>
        </div>

        <div className="dashboard-header-actions">
          <div className="search-box dashboard-search">
            <span>Buscar paciente, tutor, chip...</span>
          </div>

          <div className="profile-box">
            <div className="avatar-mini">D</div>
          </div>

          <button type="button" className="dashboard-logout" onClick={onLogout}>Sair</button>
        </div>
      </header>

      <main className="dashboard-shell">
        <aside id="pets" className="dashboard-sidebar">
          <div className="breadcrumbs-panel">
            <div className="panel-header compact-header">
              <h3>Atalhos</h3>
            </div>
            <nav className="breadcrumbs-nav" aria-label="Atalhos de telas">
              <button type="button" className={`breadcrumb-link ${atalhoAtivo === 'dashboard' ? 'active' : ''}`} onClick={() => navegarParaSecao('dashboard')}>Dashboard</button>
              <button type="button" className={`breadcrumb-link ${atalhoAtivo === 'pets' ? 'active' : ''}`} onClick={() => navegarParaSecao('pets')}>Pets</button>
              <button type="button" className={`breadcrumb-link ${atalhoAtivo === 'prontuarios' ? 'active' : ''}`} onClick={() => navegarParaSecao('prontuarios')}>Prontuários</button>
              <button type="button" className={`breadcrumb-link ${atalhoAtivo === 'consultas' ? 'active' : ''}`} onClick={() => navegarParaSecao('consultas')}>Consultas</button>
              <button type="button" className={`breadcrumb-link ${atalhoAtivo === 'agendamentos' ? 'active' : ''}`} onClick={() => navegarParaSecao('agendamentos')}>Agendamentos</button>
              <button type="button" className={`breadcrumb-link ${atalhoAtivo === 'vacinas' ? 'active' : ''}`} onClick={() => navegarParaSecao('vacinas')}>Vacinas</button>
              <button type="button" className={`breadcrumb-link ${atalhoAtivo === 'usuarios' ? 'active' : ''}`} onClick={() => navegarParaSecao('usuarios')}>Usuários</button>
            </nav>
          </div>

          {!isTutorView && (
            <div className="panel-header">
              <h3>Pets</h3>
              <button type="button" className="panel-action" onClick={() => setMostrarFormPet((prev) => !prev)}>{mostrarFormPet ? 'Fechar' : '+ Novo'}</button>
            </div>
          )}

          {!isTutorView && mostrarFormPet && pets.length > 0 && (
            <div className="pet-detail-panel" style={{ marginBottom: '16px' }}>
              <div className="pet-detail-header">
                <div className="pet-detail-avatar">+</div>
                <div>
                  <h3>Novo pet</h3>
                  <span>Adicionar animal ao cadastro</span>
                </div>
              </div>

              <div className="pet-edit-form">
                <div className="pet-edit-grid">
                  <label>
                    <span>Nome</span>
                    <input type="text" name="nome" value={petForm.nome} onChange={handlePetFieldChange} required />
                  </label>
                  <label>
                    <span>Espécie</span>
                    <input type="text" name="especie" value={petForm.especie} onChange={handlePetFieldChange} required />
                  </label>
                  <label>
                    <span>Raça</span>
                    <input type="text" name="raca" value={petForm.raca} onChange={handlePetFieldChange} />
                  </label>
                  <label>
                    <span>Idade</span>
                    <input type="number" min="0" name="idade" value={petForm.idade} onChange={handlePetFieldChange} required />
                  </label>
                  <label>
                    <span>Peso</span>
                    <input type="number" min="0" step="0.1" name="peso" value={petForm.peso} onChange={handlePetFieldChange} required />
                  </label>
                </div>

                <div className="pet-edit-actions">
                  <button type="button" className="secondary-button" onClick={() => setMostrarFormPet(false)}>Cancelar</button>
                  <button type="button" className="primary-button small-button" onClick={criarPet}>Salvar pet</button>
                </div>
                {petFormStatus && <p className="status-message" role="status">{petFormStatus}</p>}
              </div>
            </div>
          )}

          <div className="pet-list">
            {petsLoading ? (
              <p className="empty-state">Carregando pets...</p>
            ) : petsError ? (
              <p className="empty-state">Não foi possível carregar os pets.</p>
            ) : (
              petsPagina.map((pet) => (
                <div key={pet.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className={`pet-card ${petSelecionado?.id === pet.id ? 'active' : ''}`}
                    onClick={() => abrirPet(pet)}
                    style={{ flex: 1 }}
                  >
                    <div className="pet-avatar">{pet.nome?.charAt(0).toUpperCase() || 'P'}</div>
                    <div className="pet-info">
                      <strong>{pet.nome}</strong>
                      <span>
                        {pet.especie} · {pet.raca}
                      </span>
                    </div>
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="pagination-row">
            <button type="button" disabled={petsPage === 1} onClick={() => mostrarPagina(petsPage - 1, totalPetsPages, setPetsPage)}>
              Anterior
            </button>
            <span>
              {petsPage}/{totalPetsPages}
            </span>
            <button type="button" disabled={petsPage === totalPetsPages} onClick={() => mostrarPagina(petsPage + 1, totalPetsPages, setPetsPage)}>
              Próxima
            </button>
          </div>
        </aside>

        <section className="dashboard-content">
          {(abaAtiva === 'dashboard' || abaAtiva === 'pets') && (
            <div id="dashboard" className="summary-grid">
              <div className="summary-card summary-primary">
                <span>Pets ativos</span>
                <strong>{pets.length}</strong>
              </div>
              <div className="summary-card">
                <span>Prontuários</span>
                <strong>{prontuarios.length}</strong>
              </div>
              <div className="summary-card">
                <span>Última consulta</span>
                <strong>{prontuarios[0] ? 'Hoje' : 'Sem registro'}</strong>
              </div>
            </div>
          )}

          {abaAtiva === 'dashboard' && (
            <div className="pet-detail-panel" style={{ marginBottom: '20px' }}>
              <div className="pet-detail-header">
                <div className="pet-detail-avatar">{(usuarioAtual?.nome || 'U').charAt(0).toUpperCase()}</div>
                <div>
                  <h3>{usuarioAtual?.nome || 'Usuário'}</h3>
                  <span>{usuarioAtual?.perfil || 'perfil'} · {usuarioAtual?.email || 'E-mail não informado'}</span>
                </div>
              </div>
              <div className="pet-detail-grid">
                <div className="detail-item">
                  <span>Nome</span>
                  <strong>{usuarioAtual?.nome || 'Não informado'}</strong>
                </div>
                <div className="detail-item">
                  <span>Email</span>
                  <strong>{usuarioAtual?.email || 'Não informado'}</strong>
                </div>
                <div className="detail-item">
                  <span>Perfil</span>
                  <strong>{usuarioAtual?.perfil || 'Não informado'}</strong>
                </div>
                <div className="detail-item">
                  <span>Telefone</span>
                  <strong>{usuarioAtual?.telefone || 'Não informado'}</strong>
                </div>
              </div>
            </div>
          )}

          {(abaAtiva === 'dashboard' || abaAtiva === 'pets') && (
            <div className="patient-header">
              <div>
                <small>Paciente selecionado</small>
                <h2>{petSelecionado ? petSelecionado.nome : 'Nenhum pet encontrado'}</h2>
              </div>
              <button type="button" className="primary-button small-button">Abrir prontuário</button>
            </div>
          )}

          {(abaAtiva === 'dashboard' || abaAtiva === 'pets') && (
            <div className="pet-detail-panel">
            {petDetalheLoading ? (
              <p className="empty-state">Carregando dados do pet...</p>
            ) : petDetalheError ? (
              <p className="empty-state">Não foi possível carregar os dados do pet.</p>
            ) : petSelecionado ? (
              <>
                <div className="pet-detail-header">
                  <div className="pet-detail-avatar">{petSelecionado.nome?.charAt(0).toUpperCase() || 'P'}</div>
                  <div>
                    <h3>{petSelecionado.nome}</h3>
                    <span>{petSelecionado.especie} · {petSelecionado.raca || 'Raça não informada'}</span>
                  </div>
                  {!isTutorView && !petEditando && (
                    <button type="button" className="secondary-button" onClick={iniciarEdicaoPet}>Editar</button>
                  )}
                </div>

                {petEditando && !isTutorView ? (
                  <div className="pet-edit-form">
                    <div className="pet-edit-grid">
                      <label>
                        <span>Nome</span>
                        <input type="text" name="nome" value={petForm.nome} onChange={handlePetFieldChange} />
                      </label>
                      <label>
                        <span>Espécie</span>
                        <input type="text" name="especie" value={petForm.especie} onChange={handlePetFieldChange} />
                      </label>
                      <label>
                        <span>Raça</span>
                        <input type="text" name="raca" value={petForm.raca} onChange={handlePetFieldChange} />
                      </label>
                      <label>
                        <span>Idade</span>
                        <input type="number" name="idade" value={petForm.idade} onChange={handlePetFieldChange} />
                      </label>
                      <label>
                        <span>Peso</span>
                        <input type="number" step="0.1" name="peso" value={petForm.peso} onChange={handlePetFieldChange} />
                      </label>
                    </div>

                    <div className="pet-edit-actions">
                      <button type="button" className="secondary-button" onClick={() => setPetEditando(false)}>Cancelar</button>
                      <button type="button" className="primary-button small-button" onClick={salvarEdicaoPet}>Salvar alterações</button>
                    </div>
                  </div>
                ) : (
                  <div className="pet-detail-grid">
                    <div className="detail-item">
                      <span>Nome do pet</span>
                      <strong>{petSelecionado.nome}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Espécie</span>
                      <strong>{petSelecionado.especie}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Raça</span>
                      <strong>{petSelecionado.raca || 'Não informado'}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Idade</span>
                      <strong>{petSelecionado.idade} anos</strong>
                    </div>
                    <div className="detail-item">
                      <span>Peso</span>
                      <strong>{petSelecionado.peso} kg</strong>
                    </div>
                    <div className="detail-item">
                      <span>Tutor</span>
                      <strong>{petSelecionado.tutor?.nome || 'Não informado'}</strong>
                    </div>
                    <div className="detail-item">
                      <span>E-mail do tutor</span>
                      <strong>{petSelecionado.tutor?.email || 'Não informado'}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Telefone</span>
                      <strong>{petSelecionado.tutor?.telefone || 'Não informado'}</strong>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'flex-start' }}>
                <p className="empty-state">
                  {pets.length === 0
                    ? 'Você ainda não possui pets cadastrados.'
                    : 'Selecione um pet para ver os detalhes.'}
                </p>
                {!isTutorView && (
                  <>
                    <button
                      type="button"
                      className="primary-button small-button"
                      onClick={() => setMostrarFormPet((prev) => !prev)}
                    >
                      {mostrarFormPet ? 'Fechar cadastro' : 'Cadastrar pet'}
                    </button>

                    {mostrarFormPet && (
                      <div className="pet-detail-panel" style={{ width: '100%', marginTop: '8px' }}>
                        <div className="pet-detail-header">
                          <div className="pet-detail-avatar">+</div>
                          <div>
                            <h3>Novo pet</h3>
                            <span>Adicionar animal ao cadastro</span>
                          </div>
                        </div>

                        <div className="pet-edit-form">
                          <div className="pet-edit-grid">
                            <label>
                              <span>Nome</span>
                              <input type="text" name="nome" value={petForm.nome} onChange={handlePetFieldChange} required />
                            </label>
                            <label>
                              <span>Espécie</span>
                              <input type="text" name="especie" value={petForm.especie} onChange={handlePetFieldChange} required />
                            </label>
                            <label>
                              <span>Raça</span>
                              <input type="text" name="raca" value={petForm.raca} onChange={handlePetFieldChange} />
                            </label>
                            <label>
                              <span>Idade</span>
                              <input type="number" min="0" name="idade" value={petForm.idade} onChange={handlePetFieldChange} required />
                            </label>
                            <label>
                              <span>Peso</span>
                              <input type="number" min="0" step="0.1" name="peso" value={petForm.peso} onChange={handlePetFieldChange} required />
                            </label>
                          </div>

                          <div className="pet-edit-actions">
                            <button type="button" className="secondary-button" onClick={() => setMostrarFormPet(false)}>Cancelar</button>
                            <button type="button" className="primary-button small-button" onClick={criarPet}>Salvar pet</button>
                          </div>
                          {petFormStatus && <p className="status-message" role="status">{petFormStatus}</p>}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          )}

          {(abaAtiva === 'dashboard' || abaAtiva === 'consultas') && (
            <div id="consultas" className="record-panel">
              <div className="panel-header">
                <h3>Consultas</h3>
                {!isTutorView && <button type="button" className="panel-action">+ Marcar</button>}
              </div>

              {prontuarios.length > 0 ? prontuarios.map((consulta) => (
                <article key={consulta.id || Math.random()} className="record-card">
                  <div className="record-topline">
                    <span className="record-tag">Consulta</span>
                    <time>{consulta.createdAt ? new Date(consulta.createdAt).toLocaleDateString('pt-BR') : 'Data não informada'}</time>
                  </div>
                  <h4>{consulta.motivoConsulta || 'Consulta veterinária'}</h4>
                  <div className="record-meta">
                    <span>{consulta.veterinario?.nome || 'Veterinário'}</span>
                    <span>{consulta.pet?.nome || petSelecionado?.nome || 'Pet'}</span>
                  </div>
                  <ul>
                    {(consulta.procedimentos || ['Consulta realizada']).map((item, index) => (
                      <li key={`${consulta.id || 'consulta'}-${index}`}>{item}</li>
                    ))}
                  </ul>
                  {!isTutorView && (
                    <div className="pet-edit-actions">
                      <button type="button" className="secondary-button">Desmarcar</button>
                      <button type="button" className="primary-button small-button">Consultar</button>
                    </div>
                  )}
                </article>
              )) : (
                <p className="empty-state">Nenhuma consulta para este pet.</p>
              )}
            </div>
          )}

          {(abaAtiva === 'dashboard' || abaAtiva === 'agendamentos') && (
            <div id="agendamentos" className="record-panel">
              <div className="panel-header">
                <h3>Agendamentos</h3>
                {!isTutorView && <button type="button" className="panel-action">+ Agendar</button>}
              </div>

              {prontuarios.length > 0 ? prontuarios.map((consulta) => (
                <article key={consulta.id || Math.random()} className="record-card">
                  <div className="record-topline">
                    <span className="record-tag">Agendamento</span>
                    <time>{consulta.createdAt ? new Date(consulta.createdAt).toLocaleDateString('pt-BR') : 'Sem data'}</time>
                  </div>
                  <h4>{consulta.motivoConsulta || 'Consulta agendada'}</h4>
                  <div className="record-meta">
                    <span>{consulta.pet?.nome || petSelecionado?.nome || 'Pet'}</span>
                    <span>{consulta.veterinario?.nome || 'Veterinário'}</span>
                  </div>
                  {!isTutorView && (
                    <div className="pet-edit-actions">
                      <button type="button" className="secondary-button">Desmarcar</button>
                      <button type="button" className="primary-button small-button">Confirmar</button>
                    </div>
                  )}
                </article>
              )) : (
                <p className="empty-state">Nenhum agendamento registrado.</p>
              )}
            </div>
          )}

          {(abaAtiva === 'dashboard' || abaAtiva === 'vacinas') && (
            <div id="vacinas" className="record-panel">
              <div className="panel-header">
                <h3>Vacinas</h3>
                {!isTutorView && <button type="button" className="panel-action">+ Agendar</button>}
              </div>

              {petSelecionado ? (
                <>
                  {!isTutorView && (
                    <>
                      <div className="pet-detail-panel" style={{ marginBottom: '16px' }}>
                        <div className="pet-detail-header">
                          <div className="pet-detail-avatar">{petSelecionado.nome?.charAt(0).toUpperCase() || 'P'}</div>
                          <div>
                            <h3>{petSelecionado.nome}</h3>
                            <span>{petSelecionado.especie} · {petSelecionado.raca || 'Raça não informada'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pet-edit-form">
                        <div className="pet-edit-grid">
                          <label>
                            <span>Tipo da vacina</span>
                            <input type="text" value={prontuarioForm.tipoVacina} onChange={handleProntuarioFieldChange} name="tipoVacina" placeholder="Ex.: V10, antirrábica, giárdia" />
                          </label>
                          <label>
                            <span>Data da aplicação</span>
                            <input type="date" value={prontuarioForm.data} onChange={handleProntuarioFieldChange} name="data" />
                          </label>
                          <label>
                            <span>Data prevista do reforço</span>
                            <input type="date" value={prontuarioForm.reforco} onChange={handleProntuarioFieldChange} name="reforco" />
                          </label>
                        </div>

                        <div className="pet-edit-actions">
                          <button type="button" className="secondary-button" onClick={() => setProntuarioForm((prev) => ({ ...prev, tipoVacina: '', data: '', reforco: '', observacoes: '' }))}>Cancelar</button>
                          <button type="button" className="primary-button small-button" onClick={salvarProntuario}>Salvar vacinação</button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="record-card" style={{ marginTop: '20px' }}>
                    <div className="record-topline">
                      <span className="record-tag">Calendário</span>
                      <span>Próximas vacinas</span>
                    </div>

                    {vacinasAtuais.length > 0 ? vacinasAtuais.map((vacina) => (
                      <div key={vacina.id} style={{ marginTop: '12px', borderTop: '1px solid #edf2f5', paddingTop: '12px' }}>
                        <h4>{vacina.tipo}</h4>
                        <ul>
                          <li>Aplicação: {new Date(vacina.dataAplicacao).toLocaleDateString('pt-BR')}</li>
                          <li>Reforço: {vacina.dataPrevistaReforco ? new Date(vacina.dataPrevistaReforco).toLocaleDateString('pt-BR') : 'Sem reforço'}</li>
                          {vacina.observacoes && <li>Observações: {vacina.observacoes}</li>}
                        </ul>
                      </div>
                    )) : (
                      <p className="empty-state" style={{ marginTop: '12px' }}>Nenhuma vacina registrada para este pet.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="empty-state">Selecione um pet para agendar a vacinação.</p>
              )}
            </div>
          )}

          {!isTutorView && (abaAtiva === 'dashboard' || abaAtiva === 'usuarios') && (
            <div id="usuarios" className="admin-list-panel">
              <div className="panel-header">
                <h3>Usuários cadastrados</h3>
                <span className="panel-counter">{usuarios.length}</span>
              </div>

              {usuariosLoading ? (
                <p className="empty-state">Carregando usuários...</p>
              ) : usuariosError ? (
                <p className="empty-state">Não foi possível carregar os usuários.</p>
              ) : (
                <>
                  <div className="user-table">
                    <div className="user-table-header user-row">
                      <span>Nome</span>
                      <span>E-mail</span>
                      <span>Perfil</span>
                      <span>Status</span>
                    </div>

                    {usuariosPagina.map((usuario) => (
                      <div key={usuario.id} className="user-row">
                        <span>{usuario.nome}</span>
                        <span>{usuario.email}</span>
                        <span>
                          <select
                            className="profile-select"
                            value={usuario.perfil}
                            onChange={(event) => handleUsuarioPerfilChange(usuario.id, event.target.value)}
                          >
                            <option value="administrador">Administrador</option>
                            <option value="veterinario">Veterinário</option>
                            <option value="recepcionista">Recepcionista</option>
                            <option value="tutor">Tutor</option>
                          </select>
                        </span>
                        <span className="user-status-control">
                          <span className={`badge-status ${usuario.ativo ? 'online' : 'offline'}`}>
                            {usuario.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                          <label className="switch" aria-label={`Alterar status de ${usuario.nome}`}>
                            <input
                              type="checkbox"
                              checked={usuario.ativo}
                              onChange={(event) => handleUsuarioStatusChange(usuario.id, event.target.checked)}
                            />
                            <span className="slider" />
                          </label>
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pagination-row pagination-users">
                    <button type="button" disabled={usuariosPage === 1} onClick={() => mostrarPagina(usuariosPage - 1, totalUsuariosPages, setUsuariosPage)}>
                      Anterior
                    </button>
                    <span>
                      {usuariosPage}/{totalUsuariosPages}
                    </span>
                    <button type="button" disabled={usuariosPage === totalUsuariosPages} onClick={() => mostrarPagina(usuariosPage + 1, totalUsuariosPages, setUsuariosPage)}>
                      Próxima
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {(abaAtiva === 'dashboard' || abaAtiva === 'prontuarios') && (
            <div id="prontuarios" className="record-panel">
              <div className="panel-header">
                <h3>Prontuários</h3>
                {!isTutorView && <button type="button" className="panel-action">Filtrar</button>}
              </div>

              {!isTutorView && (
                <div className="pet-detail-panel" style={{ marginBottom: '18px' }}>
                  <div className="pet-detail-header">
                    <div className="pet-detail-avatar">+</div>
                    <div>
                      <h3>Nova consulta</h3>
                      <span>Registrar atendimento veterinário</span>
                    </div>
                  </div>

                  <div className="pet-edit-form">
                    <div className="pet-edit-grid">
                      <label>
                        <span>Pet</span>
                        <select name="petId" value={consultaForm.petId} onChange={handleConsultaFieldChange}>
                          <option value="">Selecione o pet</option>
                          {pets.map((pet) => (
                            <option key={pet.id} value={pet.id}>{pet.nome}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Veterinário</span>
                        <select name="veterinario" value={consultaForm.veterinario} onChange={handleConsultaFieldChange}>
                          <option value="">Selecione o veterinário</option>
                          {veterinarios.length === 0 && <option value="" disabled>Nenhum veterinário cadastrado</option>}
                          {veterinarios.map((veterinario) => (
                            <option key={veterinario.id} value={veterinario.id}>{veterinario.nome}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Data da consulta</span>
                        <input type="date" name="data" value={consultaForm.data} onChange={handleConsultaFieldChange} />
                      </label>
                      <label>
                        <span>Status</span>
                        <select name="status" value={consultaForm.status} onChange={handleConsultaFieldChange}>
                          <option value="agendada">Agendada</option>
                          <option value="realizada">Realizada</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </label>
                      <label style={{ gridColumn: '1 / -1' }}>
                        <span>Motivo da consulta</span>
                        <input
                          type="text"
                          name="motivoConsulta"
                          value={consultaForm.motivoConsulta}
                          onChange={handleConsultaFieldChange}
                          placeholder="Ex.: Consulta de rotina, dor abdominal, vacinação..."
                        />
                      </label>
                      <label style={{ gridColumn: '1 / -1' }}>
                        <span>Procedimentos realizados</span>
                        <textarea
                          name="procedimentos"
                          value={consultaForm.procedimentos}
                          onChange={handleConsultaFieldChange}
                          rows="3"
                          placeholder="Descreva exames, medicamentos, procedimentos e evolução."
                        />
                      </label>
                      <label style={{ gridColumn: '1 / -1' }}>
                        <span>Observações</span>
                        <textarea
                          name="observacoes"
                          value={consultaForm.observacoes}
                          onChange={handleConsultaFieldChange}
                          rows="3"
                          placeholder="Informe sintomas, conduta, orientações e retorno."
                        />
                      </label>
                    </div>

                    <div className="pet-edit-actions">
                      <button type="button" className="secondary-button" onClick={limparFormularioConsulta}>Limpar</button>
                      <button type="button" className="primary-button small-button" onClick={salvarConsulta}>Salvar consulta</button>
                    </div>
                  </div>
                </div>
              )}

              {!isTutorView && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                  <button type="button" className="primary-button small-button" onClick={() => setMostrarFormProntuario((prev) => !prev)}>
                    {mostrarFormProntuario ? 'Fechar prontuário' : 'Adicionar prontuário'}
                  </button>
                </div>
              )}

              {mostrarFormProntuario && !isTutorView && (
                <div className="pet-detail-panel" style={{ marginBottom: '18px' }}>
                  <div className="pet-detail-header">
                    <div className="pet-detail-avatar">+</div>
                    <div>
                      <h3>Adicionar prontuário</h3>
                      <span>Registrar consulta ou vacina para qualquer pet</span>
                    </div>
                  </div>

                  <div className="pet-edit-form">
                    <div className="pet-edit-grid">
                      <label>
                        <span>Tipo</span>
                        <select name="tipo" value={prontuarioForm.tipo} onChange={handleProntuarioFieldChange}>
                          <option value="consulta">Consulta</option>
                          <option value="vacina">Vacina</option>
                        </select>
                      </label>
                      <label>
                        <span>Pet</span>
                        <select name="petId" value={prontuarioForm.petId} onChange={handleProntuarioFieldChange}>
                          <option value="">Selecione o pet</option>
                          {pets.map((pet) => (
                            <option key={pet.id} value={pet.id}>{pet.nome}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Veterinário</span>
                        <select name="veterinario" value={prontuarioForm.veterinario} onChange={handleProntuarioFieldChange}>
                          <option value="">Selecione o veterinário</option>
                          {veterinarios.length === 0 && <option value="" disabled>Nenhum veterinário cadastrado</option>}
                          {veterinarios.map((veterinario) => (
                            <option key={veterinario.id} value={veterinario.id}>{veterinario.nome}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Data</span>
                        <input type="date" name="data" value={prontuarioForm.data} onChange={handleProntuarioFieldChange} />
                      </label>
                      {prontuarioForm.tipo === 'vacina' ? (
                        <>
                          <label>
                            <span>Tipo da vacina</span>
                            <input type="text" name="tipoVacina" value={prontuarioForm.tipoVacina} onChange={handleProntuarioFieldChange} placeholder="Ex.: V10" />
                          </label>
                          <label>
                            <span>Reforço</span>
                            <input type="date" name="reforco" value={prontuarioForm.reforco} onChange={handleProntuarioFieldChange} />
                          </label>
                        </>
                      ) : (
                        <label style={{ gridColumn: '1 / -1' }}>
                          <span>Motivo da consulta</span>
                          <input type="text" name="motivo" value={prontuarioForm.motivo} onChange={handleProntuarioFieldChange} placeholder="Ex.: Dor abdominal, check-up, vacinação..." />
                        </label>
                      )}
                      {prontuarioForm.tipo === 'consulta' && (
                        <label style={{ gridColumn: '1 / -1' }}>
                          <span>Procedimentos</span>
                          <textarea name="procedimentos" rows="3" value={prontuarioForm.procedimentos} onChange={handleProntuarioFieldChange} placeholder="Descreva os procedimentos realizados." />
                        </label>
                      )}
                      <label style={{ gridColumn: '1 / -1' }}>
                        <span>Observações</span>
                        <textarea name="observacoes" rows="3" value={prontuarioForm.observacoes} onChange={handleProntuarioFieldChange} placeholder="Descreva o atendimento, evolução e orientações." />
                      </label>
                    </div>

                    <div className="pet-edit-actions">
                      <button type="button" className="secondary-button" onClick={() => setMostrarFormProntuario(false)}>Cancelar</button>
                      <button type="button" className="primary-button small-button" onClick={salvarProntuario}>Salvar</button>
                    </div>
                  </div>
                </div>
              )}

              {isTutorView && consultasPetLoading ? (
                <p className="empty-state">Carregando prontuário do pet...</p>
              ) : isTutorView && consultasPetError ? (
                <p className="empty-state">Não foi possível carregar o prontuário deste pet.</p>
              ) : (!isTutorView && consultasLoading) ? (
                <p className="empty-state">Carregando prontuários...</p>
              ) : (!isTutorView && consultasError) ? (
                <p className="empty-state">Não foi possível carregar os prontuários.</p>
              ) : historicoProntuarios.length === 0 && vacinasAtuais.length === 0 ? (
                <p className="empty-state">Nenhum prontuário cadastrado para este pet.</p>
              ) : (
                <>
                  {historicoProntuarios.map((consulta) => (
                    <article key={consulta.id} className="record-card">
                      <div className="record-topline">
                        <span className="record-tag">Consulta</span>
                        <time>{consulta.createdAt ? new Date(consulta.createdAt).toLocaleDateString('pt-BR') : 'Data não informada'}</time>
                      </div>

                      <h4>{consulta.motivoConsulta || 'Consulta veterinária'}</h4>

                      <div className="record-meta">
                        <span>{consulta.veterinario?.nome || 'Veterinário'}</span>
                        <span>{consulta.pet?.nome || petSelecionado?.nome}</span>
                      </div>

                      <ul>
                        {(consulta.procedimentos || ['Consulta realizada']).map((procedimento, index) => (
                          <li key={`${consulta.id}-${index}`}>{procedimento}</li>
                        ))}
                      </ul>

                      <p>{consulta.observacoes || 'Sem observações adicionais.'}</p>
                    </article>
                  ))}

                  {vacinasAtuais.length > 0 && (
                    <article className="record-card">
                      <div className="record-topline">
                        <span className="record-tag">Vacinas</span>
                        <span>{vacinasAtuais.length} registro(s)</span>
                      </div>

                      {vacinasAtuais.map((vacina) => (
                        <div key={vacina.id} style={{ marginTop: '12px', borderTop: '1px solid #edf2f5', paddingTop: '12px' }}>
                          <h4>{vacina.tipo}</h4>
                          <div className="record-meta">
                            <span>{vacina.veterinario?.nome || 'Veterinário'}</span>
                            <span>{vacina.pet?.nome || petSelecionado?.nome}</span>
                          </div>
                          <ul>
                            <li>Aplicação: {new Date(vacina.dataAplicacao).toLocaleDateString('pt-BR')}</li>
                            <li>Reforço: {vacina.dataPrevistaReforco ? new Date(vacina.dataPrevistaReforco).toLocaleDateString('pt-BR') : 'Sem reforço'}</li>
                            {vacina.observacoes && <li>Observações: {vacina.observacoes}</li>}
                          </ul>
                        </div>
                      ))}
                    </article>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function App() {
  const [view, setView] = useState('login');
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [cadastroForm, setCadastroForm] = useState(initialCadastro);
  const [status, setStatus] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  const handleLoginChange = (event) => {
    const { name, value, type, checked } = event.target;
    setLoginForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCadastroChange = (event) => {
    const { name, value, type, checked } = event.target;
    setCadastroForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('vetcare_token');
    localStorage.removeItem('vetcare_usuario');
    sessionStorage.removeItem('vetcare_token');
    sessionStorage.removeItem('vetcare_usuario');
    setStatus('');
    setView('login');
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setStatus('');

    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email,
          senha: loginForm.senha,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.erro || 'Falha ao entrar no sistema.');
      }

      const storage = loginForm.manterConectado ? localStorage : sessionStorage;
      storage.setItem('vetcare_token', result.token);
      storage.setItem('vetcare_usuario', JSON.stringify(result.usuario));
      setStatus('Login realizado com sucesso!');

      const perfil = result.usuario?.perfil || 'tutor';
      setView(perfil === 'tutor' ? 'dashboard-tutor' : 'dashboard');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const handleCadastroSubmit = async (event) => {
    event.preventDefault();
    setStatus('');

    if (cadastroForm.senha !== cadastroForm.confirmarSenha) {
      setStatus('As senhas não conferem.');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: cadastroForm.nome,
          email: cadastroForm.email,
          telefone: cadastroForm.telefone,
          senha: cadastroForm.senha,
          perfil: 'tutor',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.erro || 'Não foi possível criar a conta.');
      }

      setStatus('Conta criada com sucesso! Faça login para continuar.');
      setView('login');
      setCadastroForm(initialCadastro);
    } catch (error) {
      setStatus(error.message);
    }
  };

  if (view === 'dashboard') {
    return <PetsProntuariosDashboard onLogout={handleLogout} perfil="administrador" />;
  }

  if (view === 'dashboard-tutor') {
    return <PetsProntuariosDashboard onLogout={handleLogout} perfil="tutor" />;
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-brandbar">
          <div className="brand-mini">
            <span className="brand-symbol">✚</span>
            <div>
              <strong>VetCare</strong>
              <small>SaaS</small>
            </div>
          </div>

          <div className="search-box">
            <span>Buscar paciente, tutor, chip...</span>
          </div>

          <div className="profile-box">
            <span>Quinta-feira, 24 de Outubro, 2024</span>
            <div className="avatar-mini">D</div>
          </div>
        </div>

        {view === 'login' ? (
          <div className="auth-layout">
            <section className="auth-hero">
              <div className="hero-header">
                <div className="brand-teal">
                  <span className="brand-symbol">✚</span>
                  <div>
                    <strong>VetCare</strong>
                    <small>SaaS</small>
                  </div>
                </div>
                <small className="label-tag">SISTEMA CLÍNICO</small>
              </div>

              <h1>Seja bem-vindo ao futuro da medicina veterinária.</h1>
              <p>
                Acesse sua plataforma integrada de gestão de clínicas e hospitais.
                Praticidade e eficiência para você e seus pacientes.
              </p>

              <div className="doctor-photo">
                <img
                  src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80"
                  alt="Veterinário com cachorro"
                />
              </div>
            </section>

            <section className="auth-card">
              <h2>Entrar</h2>
              <p className="subtitle">Acesse sua conta VetCare.</p>

              <form onSubmit={handleLoginSubmit} className="auth-form">
                <label className="field-label">E-mail ou CPF</label>
                <div className="input-wrap">
                  <span className="input-icon">✉</span>
                  <input
                    type="text"
                    name="email"
                    value={loginForm.email}
                    onChange={handleLoginChange}
                    placeholder="E-mail ou CPF"
                  />
                </div>

                <label className="field-label">Senha</label>
                <div className="input-wrap">
                  <span className="input-icon">◌</span>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    name="senha"
                    value={loginForm.senha}
                    onChange={handleLoginChange}
                    placeholder="Senha"
                  />
                  <button
                    type="button"
                    className="input-action"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    aria-label={showLoginPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showLoginPassword ? '🙈' : '👁'}
                  </button>
                </div>

                <div className="options-row single-option">
                  <label className="check-row">
                    <input
                      type="checkbox"
                      name="manterConectado"
                      checked={loginForm.manterConectado}
                      onChange={handleLoginChange}
                    />
                    <span>Manter conectado</span>
                  </label>
                </div>

                <button type="submit" className="primary-button">ACESSAR SISTEMA</button>

                {status ? <div className="status-message">{status}</div> : null}

                <p className="footer-text">
                  Ainda não tem uma conta?{' '}
                  <button type="button" className="link-button inline" onClick={() => setView('register')}>
                    Crie sua conta agora.
                  </button>
                </p>
              </form>
            </section>
          </div>
        ) : (
          <div className="auth-layout auth-layout-register">
            <section className="auth-hero register-hero">
              <div className="hero-header">
                <div className="brand-teal">
                  <span className="brand-symbol">✚</span>
                  <div>
                    <strong>VetCare</strong>
                    <small>SaaS</small>
                  </div>
                </div>
                <small className="label-tag">SISTEMA CLÍNICO</small>
              </div>

              <h1>Simplifique sua rotina. Potencialize seus resultados.</h1>
              <p>
                O VetCare é a plataforma completa para clínicas veterinárias e hospitais.
                Comunique, organize e automatize sua equipe em um único lugar.
              </p>

              <div className="doctor-photo">
                <img
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80"
                  alt="Equipe veterinária"
                />
              </div>

              <ul className="feature-list">
                <li>Gestão completa de pacientes</li>
                <li>Agendamento inteligente</li>
                <li>Faturamento e estoque</li>
                <li>Telemedicina e App do Tutor</li>
              </ul>
            </section>

            <section className="auth-card register-card">
              <div className="register-header-row">
                <h2>Criar Conta VetCare</h2>
                <button type="button" className="header-icon-button">＋</button>
              </div>

              <p className="subtitle">Preencha as informações para iniciar sua demonstração gratuita.</p>

              <form onSubmit={handleCadastroSubmit} className="auth-form register-form">
                <div className="section-title">1. Informações Pessoais</div>

                <div className="two-cols">
                  <div>
                    <label className="field-label">Nome do tutor</label>
                    <input
                      type="text"
                      name="nome"
                      value={cadastroForm.nome}
                      onChange={handleCadastroChange}
                      placeholder="Nome do tutor"
                    />
                  </div>

                  <div>
                    <label className="field-label">E-mail</label>
                    <input
                      type="email"
                      name="email"
                      value={cadastroForm.email}
                      onChange={handleCadastroChange}
                      placeholder="E-mail"
                    />
                  </div>
                </div>

                <div className="two-cols">
                  <div>
                    <label className="field-label">Telefone</label>
                    <input
                      type="tel"
                      name="telefone"
                      value={cadastroForm.telefone}
                      onChange={handleCadastroChange}
                      placeholder="Telefone"
                    />
                  </div>

                  <div>
                    <label className="field-label">Nome do animal</label>
                    <input
                      type="text"
                      name="nomeAnimal"
                      value={cadastroForm.nomeAnimal}
                      onChange={handleCadastroChange}
                      placeholder="Nome do animal"
                    />
                  </div>
                </div>

                <div className="two-cols">
                  <div>
                    <label className="field-label">Espécie</label>
                    <input
                      type="text"
                      name="especie"
                      value={cadastroForm.especie}
                      onChange={handleCadastroChange}
                      placeholder="Espécie"
                    />
                  </div>

                  <div>
                    <label className="field-label">Raça</label>
                    <input
                      type="text"
                      name="raca"
                      value={cadastroForm.raca || ''}
                      onChange={handleCadastroChange}
                      placeholder="Raça"
                    />
                  </div>
                </div>

                <div className="section-title">2. Acesso</div>

                <div className="password-box">
                  <label className="field-label">Senha</label>
                  <div className="input-wrap password-inline">
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      name="senha"
                      value={cadastroForm.senha}
                      onChange={handleCadastroChange}
                      placeholder="Senha"
                    />
                    <button
                      type="button"
                      className="input-action"
                      onClick={() => setShowRegisterPassword((prev) => !prev)}
                      aria-label={showRegisterPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showRegisterPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <div className="password-box">
                  <label className="field-label">Confirmar senha</label>
                  <div className="input-wrap password-inline">
                    <input
                      type={showRegisterConfirmPassword ? 'text' : 'password'}
                      name="confirmarSenha"
                      value={cadastroForm.confirmarSenha}
                      onChange={handleCadastroChange}
                      placeholder="Confirmar senha"
                    />
                    <button
                      type="button"
                      className="input-action"
                      onClick={() => setShowRegisterConfirmPassword((prev) => !prev)}
                      aria-label={showRegisterConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showRegisterConfirmPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <label className="check-row terms-row">
                  <input
                    type="checkbox"
                    name="aceitarTermos"
                    checked={cadastroForm.aceitarTermos}
                    onChange={handleCadastroChange}
                  />
                  <span>Concordo com os Termos de Uso e Política de Privacidade.</span>
                </label>

                <label className="check-row terms-row">
                  <input
                    type="checkbox"
                    name="receberNoticias"
                    checked={cadastroForm.receberNoticias}
                    onChange={handleCadastroChange}
                  />
                  <span>Desejo receber novidades e comunicações do VetCare.</span>
                </label>

                {status ? <div className="status-message">{status}</div> : null}

                <button type="submit" className="primary-button large-button">CRIAR CONTA E INICIAR TESTE GRÁTIS</button>

                <p className="footer-text centered">
                  Já possui uma conta?{' '}
                  <button type="button" className="link-button inline" onClick={() => setView('login')}>
                    Entre aqui.
                  </button>
                </p>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
