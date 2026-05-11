import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import RacoFloatingBot from '@/components/RacoFloatingBot';
import ViewAsSelector from '@/components/ViewAsSelector';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useLens } from '@/lib/LensContext';
import { base44 } from '@/api/base44Client';
import {
  Home, MessageSquare, Activity, Users, TrendingUp, Building2,
  MapPin, BarChart3, Megaphone, Settings, Shield, ChevronDown,
  Menu, X, Bell, LogOut, User, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  {
    group: 'Today',
    items: [
      { label: 'Home', path: '/', icon: Home },
      { label: 'Ask Raco', path: '/ask', icon: MessageSquare },
      { label: 'Activity', path: '/activity', icon: Activity },
    ],
  },
  {
    group: 'Network',
    items: [
      { label: 'Contacts', path: '/contacts', icon: Users },
      { label: 'Leads & Buyers', path: '/leads', icon: TrendingUp },
    ],
  },
  {
    group: 'Property',
    items: [
      { label: 'Inventory & Sellers', path: '/inventory', icon: Building2 },
      { label: 'Zones & Projects', path: '/zones', icon: MapPin },
      { label: 'Deals', path: '/deals', icon: BarChart3 },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { label: 'Market Insights', path: '/market', icon: BarChart3 },
      { label: 'Marketing & Sources', path: '/marketing', icon: Megaphone },
    ],
  },
  {
    group: 'Operations',
    items: [
      { label: 'Compliance & Audit', path: '/compliance', icon: Shield },
      { label: 'Users & Admin', path: '/admin', icon: Settings },
    ],
  },
];

function NavItem({ item, collapsed }) {
  const location = useLocation();
  const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
  return (
    <Link
      to={item.path}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
      )}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export default function Layout() {
  const { user } = useAuth();
  const { lensUser, setLensUser } = useLens();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const visibleNav = NAV.map(g => ({
    ...g,
    items: g.items.filter(item => {
      if (item.path === '/admin' && !isAdmin) return false;
      if (item.path === '/compliance' && !isAdmin) return false;
      return true;
    }),
  })).filter(g => g.items.length > 0);

  const Sidebar = (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar transition-all duration-200',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-2 px-4 py-5 border-b border-sidebar-border', collapsed && 'justify-center px-2')}>
        <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-sidebar-primary-foreground">R</span>
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-semibold text-sidebar-foreground leading-none">Raco AI</div>
            <div className="text-[10px] text-sidebar-foreground/50 mt-0.5">Realco Capital</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {visibleNav.map(group => (
          <div key={group.group}>
            {!collapsed && (
              <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.group}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem key={item.path} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className={cn('border-t border-sidebar-border p-3', collapsed && 'flex justify-center')}>
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-sidebar-primary/30 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-sidebar-foreground/70" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-sidebar-foreground truncate">{user?.full_name || 'Agent'}</div>
              <div className="text-[10px] text-sidebar-foreground/50 truncate">{user?.role}</div>
            </div>
            <button
              onClick={() => base44.auth.logout('/')}
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => base44.auth.logout('/')}
            className="text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute bottom-20 -right-3 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground/80 shadow-sm"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 rotate-90" />}
      </button>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {/* Desktop sidebar */}
      <div className="hidden md:block relative shrink-0">{Sidebar}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-56 z-50">{Sidebar}</div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 h-12 border-b border-hairline bg-card flex items-center px-4 gap-3">
          <button
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <ViewAsSelector />
          <button className="w-8 h-8 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-evergreen/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-evergreen">
                {(user?.full_name || 'A').charAt(0)}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block">
              {user?.full_name?.split(' ')[0] || 'Agent'}
            </span>
          </div>
        </header>

        {/* Lens banner */}
        {lensUser && (
          <div className="shrink-0 px-4 py-2 bg-brass-tint border-b border-brass/30 flex items-center justify-between">
            <span className="text-xs font-medium text-brass">
              👁 Viewing data as <strong>{lensUser.full_name}</strong> — {lensUser.pixxi_email || lensUser.primary_email}
            </span>
            <button onClick={() => setLensUser(null)} className="text-xs text-brass hover:text-brass-light font-medium underline">
              Exit
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Raco AI floating bot — draggable, visible on all pages */}
      <RacoFloatingBot />
    </div>
  );
}