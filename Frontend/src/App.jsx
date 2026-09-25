import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import './App.css'

import DashboardPage from './pages/DashboardPage'
import AgendamentosPage from './pages/AgendamentosPage'
import PetsPage from './pages/PetsPage'
import ConsultasPage from './pages/ConsultasPage'
import VacinasPage from './pages/VacinasPage'
import UsuariosPage from './pages/UsuariosPage'
import ConfiguracoesPage from './pages/ConfiguracoesPage'
import LoginPage from './pages/LoginPage'
import CadastroPage from './pages/CadastroPage'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '▣' },
  { label: 'Agendamentos', path: '/agendamentos', icon: '▤' },
  { label: 'Pets & Prontuários', path: '/pets', icon: '◫' },
  { label: 'Consultas', path: '/consultas', icon: '◌' },
  { label: 'Vacinas', path: '/vacinas', icon: '◍' },
  { label: 'Usuários', path: '/usuarios', icon: '◎' },
  { label: 'Configurações', path: '/configuracoes', icon: '⚙' },
]

function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-box">
            <div className="brand-mark">✚</div>
            <div>
              <div className="brand-name">VetCare</div>
              <small>Sistema Clínico</small>
            </div>
          </div>

          <nav className="nav-list">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="profile-mini">
            <div className="avatar-circle">D</div>
            <div>
              <strong>Dra. Camila Torres</strong>
              <small>CRMV-SP 48.291</small>
            </div>
          </div>
          <NavLink to="/login" className="logout-btn">Sair da conta</NavLink>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="search-box">Buscar pet, tutor, chip...</div>
          <div className="topbar-actions">
            <button type="button" className="user-badge">Clínica Central</button>
            <button type="button" className="icon-btn">🔔</button>
            <button type="button" className="icon-btn">⚙</button>
            <div className="avatar">CT</div>
          </div>
        </header>

        <div className="content-area">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/agendamentos" element={<AgendamentosPage />} />
            <Route path="/pets" element={<PetsPage />} />
            <Route path="/consultas" element={<ConsultasPage />} />
            <Route path="/vacinas" element={<VacinasPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<CadastroPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}

export default App
