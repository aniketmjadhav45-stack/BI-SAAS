import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, TrendingUp, HeadphonesIcon, DollarSign, Settings, LogOut, Sparkles, Save } from 'lucide-react';

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Ask Datapulse', path: '/ask', icon: Sparkles },
    { name: 'My Reports', path: '/reports', icon: Save },
    { name: 'Sales', path: '/sales', icon: TrendingUp },
    { name: 'Support', path: '/support', icon: HeadphonesIcon },
    { name: 'Finance', path: '/finance', icon: DollarSign },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const userName = user?.user_metadata?.full_name || user?.email || 'User';

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'transparent' }}>
      {/* Sidebar */}
      <aside style={{ width: 'var(--sidebar-width)', backgroundColor: 'rgba(11, 17, 33, 0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h1 style={{ color: 'var(--accent-color)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Datapulse</h1>
        </div>
        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem 1.5rem',
                color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'rgba(255, 107, 53, 0.1)' : 'transparent',
                borderRight: isActive ? '3px solid var(--accent-color)' : '3px solid transparent',
                textDecoration: 'none',
                fontWeight: 500,
              })}
            >
              <item.icon size={20} style={{ marginRight: '0.75rem' }} />
              {item.name}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={handleLogout}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: 'var(--text-secondary)', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: 500,
              width: '100%'
            }}
          >
            <LogOut size={20} style={{ marginRight: '0.75rem' }} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 2rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(11, 17, 33, 0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>{userName}</p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{user?.email}</p>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600 }}>
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
