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
  const [petForm, setPetForm] = useState({ nome: '', especie: '', raca: '', idade: '', peso: '' });

  const { data: petsData, loading: petsLoading, error: petsError } = useQuery(GET_PETS);
  const { data: usuariosData, loading: usuariosLoading, error: usuariosError, refetch: refetchUsuarios } = useQuery(GET_USUARIOS);
  const { data: consultasData, loading: consultasLoading, error: consultasError } = useQuery(GET_CONSULTAS);
  const { data: petDetalheData, loading: petDetalheLoading, error: petDetalheError } = useQuery(GET_PET, {
    variables: { id: petSelecionadoId || '' },
    skip: !petSelecionadoId,
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
  const consultas = consultasData?.consultas ?? fallbackConsultas;
  const petSelecionado = petDetalheData?.pet || pets.find((pet) => pet.id === petSelecionadoId) || pets[0] || null;
  const prontuarios = consultas.filter((consulta) => {
    if (!petSelecionado) return true;
    return consulta.pet?.nome === petSelecionado.nome;
  });

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

  const abrirPet = (pet) => {
    setPetSelecionadoId(pet.id);
    setPetEditando(false);
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
      });

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
        <aside className="dashboard-sidebar">
          <div className="breadcrumbs-panel">
            <div className="panel-header compact-header">
              <h3>Atalhos</h3>
            </div>
            <nav className="breadcrumbs-nav" aria-label="Atalhos de telas">
              <button type="button" className="breadcrumb-link active">Dashboard</button>
              <button type="button" className="breadcrumb-link">Pets</button>
              <button type="button" className="breadcrumb-link">Prontuários</button>
              <button type="button" className="breadcrumb-link">Usuários</button>
              <button type="button" className="breadcrumb-link">Login</button>
              <button type="button" className="breadcrumb-link">Cadastro</button>
            </nav>
          </div>

          <div className="panel-header">
            <h3>Pets</h3>
            <button type="button" className="panel-action">+ Novo</button>
          </div>

          <div className="pet-list">
            {petsLoading ? (
              <p className="empty-state">Carregando pets...</p>
            ) : petsError ? (
              <p className="empty-state">Não foi possível carregar os pets.</p>
            ) : (
              petsPagina.map((pet) => (
                <button
                  type="button"
                  key={pet.id}
                  className={`pet-card ${petSelecionado?.id === pet.id ? 'active' : ''}`}
                  onClick={() => abrirPet(pet)}
                >
                  <div className="pet-avatar">{pet.nome?.charAt(0).toUpperCase() || 'P'}</div>
                  <div className="pet-info">
                    <strong>{pet.nome}</strong>
                    <span>
                      {pet.especie} · {pet.raca}
                    </span>
                  </div>
                </button>
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
          <div className="summary-grid">
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

          <div className="patient-header">
            <div>
              <small>Paciente selecionado</small>
              <h2>{petSelecionado ? petSelecionado.nome : 'Nenhum pet encontrado'}</h2>
            </div>
            <button type="button" className="primary-button small-button">Abrir prontuário</button>
          </div>

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
                  {!petEditando && (
                    <button type="button" className="secondary-button" onClick={iniciarEdicaoPet}>Editar</button>
                  )}
                </div>

                {petEditando ? (
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
              <p className="empty-state">Selecione um pet para ver os detalhes.</p>
            )}
          </div>

          {!isTutorView && (
            <div className="admin-list-panel">
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

          <div className="record-panel">
            <div className="panel-header">
              <h3>Prontuários</h3>
              <button type="button" className="panel-action">Filtrar</button>
            </div>

            {isTutorView && consultasPetLoading ? (
              <p className="empty-state">Carregando prontuário do pet...</p>
            ) : isTutorView && consultasPetError ? (
              <p className="empty-state">Não foi possível carregar o prontuário deste pet.</p>
            ) : (!isTutorView && consultasLoading) ? (
              <p className="empty-state">Carregando prontuários...</p>
            ) : (!isTutorView && consultasError) ? (
              <p className="empty-state">Não foi possível carregar os prontuários.</p>
            ) : prontuarios.length === 0 && vacinasPet.length === 0 ? (
              <p className="empty-state">Nenhum prontuário cadastrado para este pet.</p>
            ) : (
              <>
                {prontuarios.map((consulta) => (
                  <article key={consulta.id} className="record-card">
                    <div className="record-topline">
                      <span className="record-tag">Consulta</span>
                      <time>{new Date(consulta.createdAt).toLocaleDateString('pt-BR')}</time>
                    </div>

                    <h4>{consulta.motivoConsulta}</h4>

                    <div className="record-meta">
                      <span>{consulta.veterinario?.nome || 'Veterinário'}</span>
                      <span>{consulta.pet?.nome || petSelecionado?.nome}</span>
                    </div>

                    <ul>
                      {consulta.procedimentos?.map((procedimento, index) => (
                        <li key={`${consulta.id}-${index}`}>{procedimento}</li>
                      ))}
                    </ul>

                    <p>{consulta.observacoes}</p>
                  </article>
                ))}

                {vacinasPet.length > 0 && (
                  <article className="record-card">
                    <div className="record-topline">
                      <span className="record-tag">Vacinas</span>
                      <span>{vacinasPet.length} registro(s)</span>
                    </div>

                    {vacinasPet.map((vacina) => (
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
