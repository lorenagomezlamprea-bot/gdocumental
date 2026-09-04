import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  CheckCircle, 
  Settings, 
  LogOut, 
  Search,
  Bell,
  User,
  History,
  FileUp,
  Filter,
  Users,
  AlertCircle,
  Clock,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';
interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  collapsed?: boolean;
}

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full p-3 my-1 rounded-xl transition-all duration-300 group relative overflow-hidden",
      active 
        ? "text-white" 
        : "text-slate-400 hover:text-white"
    )}
  >
    {active && (
      <div className="absolute inset-0 bg-gradient-to-r from-accent-purple/20 to-transparent border-l-2 border-accent-purple" />
    )}
    <Icon className={cn("w-5 h-5 relative z-10 transition-transform group-hover:scale-110", !collapsed && "mr-3", active && "text-accent-purple")} />
    {!collapsed && <span className="font-bold text-xs uppercase tracking-widest relative z-10">{label}</span>}
    {active && !collapsed && (
      <div className="ml-auto w-1 h-4 rounded-full bg-accent-purple relative z-10" />
    )}
  </button>
);

export const Sidebar = ({ 
  currentView, 
  onViewChange,
  role,
  userEmail,
  onLogout
}: { 
  currentView: string, 
  onViewChange: (view: string) => void,
  role: string,
  userEmail?: string,
  onLogout?: () => void
}) => {
  return (
    <aside className="w-64 h-screen bg-dark-bg border-r border-slate-800/50 flex flex-col sticky top-0">
      <div className="p-8 flex items-center">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-white/5">
          <img src="/Logo_corpo-1.png" alt="EVECA Logo" className="w-8 h-8 object-contain" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tighter">EVECA</h1>
          <p className="text-[9px] uppercase tracking-[0.2em] text-accent-purple font-black">Sostenibilidad</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 overflow-y-auto">
        <div className="mb-10">
          <p className="px-3 mb-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">General</p>
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => onViewChange('dashboard')} 
          />
          <SidebarItem 
            icon={CheckCircle} 
            label="Aprobados" 
            active={currentView === 'approved'} 
            onClick={() => onViewChange('approved')} 
          />
        </div>

        {(userEmail === 'jefaturasostenibilidad@gmail.com') && (
          <div className="mb-8">
            <p className="px-3 mb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Seguridad</p>
            <SidebarItem 
              icon={Users} 
              label="Control de Accesos" 
              active={currentView === 'access_control'} 
              onClick={() => onViewChange('access_control')} 
            />
          </div>
        )}

        {(userEmail === 'jefaturasostenibilidad@gmail.com') && (
          <div className="mb-8">
            <p className="px-3 mb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Gestión</p>
            <SidebarItem 
              icon={FileText} 
              label="Documentos" 
              active={currentView === 'documents'} 
              onClick={() => onViewChange('documents')} 
            />
          </div>
        )}

        {(role === 'superadmin' || role === 'administrador') && (
          <div className="mb-8">
            <p className="px-3 mb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Configuración</p>
            <SidebarItem 
              icon={Settings} 
              label="Administración" 
              active={currentView === 'admin'} 
              onClick={() => onViewChange('admin')} 
            />
          </div>
        )}
      </nav>

      <div className="p-6 border-t border-slate-800/50">
        <div className="bg-dark-card rounded-2xl p-4 flex items-center mb-4 border border-slate-800/30">
          <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center text-accent-purple font-black text-sm uppercase shadow-inner">
            {userEmail?.substring(0, 2) || 'EV'}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-xs font-black text-white truncate">{userEmail || 'Usuario Eveca'}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{role.replace('_', ' ')}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center w-full p-3 text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all text-xs font-black uppercase tracking-widest"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};

export const TopBar = ({ 
  title, 
  onSearch, 
  notifications = [], 
  userProfile, 
  onLogout,
  onViewChange 
}: { 
  title: string, 
  onSearch?: (q: string) => void,
  notifications?: any[],
  userProfile: UserProfile | null,
  onLogout: () => void,
  onViewChange: (view: string) => void
}) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(event.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalNotifs = notifications.length;

  return (
    <header className="h-20 bg-dark-bg/80 backdrop-blur-md border-b border-slate-800/50 flex items-center justify-between px-10 sticky top-0 z-50">
      <div className="flex items-center flex-1">
        <h2 className="text-2xl font-black text-white tracking-tight mr-10">{title}</h2>
        <div className="max-w-md w-full relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="w-full bg-dark-card border border-slate-800/50 rounded-2xl py-3 pl-12 pr-6 text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-accent-purple/50 outline-none transition-all"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-6">
        {/* Notificaciones */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => {
              setNotifOpen(!notifOpen);
              setUserOpen(false);
            }}
            className={cn(
              "p-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-2xl transition-all relative",
              notifOpen && "text-accent-purple bg-accent-purple/10"
            )}
          >
            <Bell className="w-5 h-5" />
            {totalNotifs > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-accent-purple rounded-full border-2 border-dark-bg shadow-lg shadow-accent-purple/50"></span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-4 w-96 bg-dark-card rounded-[2rem] shadow-2xl border border-slate-800 p-2 animate-in fade-in zoom-in duration-300 origin-top-right">
              <div className="p-6">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-4">Notificaciones</p>
                <div className="space-y-2 max-h-[30rem] overflow-y-auto pr-2">
                  {notifications.length > 0 ? (
                    notifications.map((n, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onViewChange(n.view);
                          setNotifOpen(false);
                        }}
                        className="w-full p-4 flex items-start bg-slate-800/20 hover:bg-slate-800/40 rounded-2xl transition-all text-left border border-transparent hover:border-slate-700 group"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mr-4 shadow-inner",
                          n.type === 'expiry' ? "bg-amber-500/10 text-amber-500" : "bg-accent-blue/10 text-accent-blue"
                        )}>
                          {n.type === 'expiry' ? <Clock className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-white leading-tight mb-1 group-hover:text-accent-purple transition-colors">{n.title}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{n.message}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-700 ml-2 mt-1" />
                      </button>
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <div className="w-16 h-16 bg-slate-800/30 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-700">
                        <Bell className="w-8 h-8" />
                      </div>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sin novedades</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Perfil */}
        <div className="relative" ref={userRef}>
          <button 
            onClick={() => {
              setUserOpen(!userOpen);
              setNotifOpen(false);
            }}
            className={cn(
              "p-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-2xl transition-all relative",
              userOpen && "text-accent-purple bg-accent-purple/10"
            )}
          >
            <User className="w-5 h-5" />
          </button>

          {userOpen && (
            <div className="absolute right-0 mt-4 w-72 bg-dark-card rounded-[2rem] shadow-2xl border border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300 origin-top-right">
              <div className="p-8 bg-gradient-to-br from-accent-purple to-accent-blue relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl text-2xl font-black text-accent-purple relative z-10">
                  {userProfile?.nombre_completo?.substring(0, 1) || userProfile?.email?.substring(0, 1).toUpperCase()}
                </div>
                <p className="font-black text-lg text-white truncate relative z-10 leading-tight">{userProfile?.nombre_completo || 'Usuario EVECA'}</p>
                <p className="text-xs text-white/70 truncate relative z-10 font-bold">{userProfile?.email}</p>
              </div>
              <div className="p-4">
                <div className="px-4 py-3 mb-2">
                  <span className="inline-block px-3 py-1 bg-accent-purple/10 text-accent-purple text-[10px] font-black rounded-lg uppercase tracking-[0.2em] border border-accent-purple/20">
                    {userProfile?.rol.replace('_', ' ')}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setUserOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center p-4 text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-2xl transition-all text-xs font-black uppercase tracking-widest"
                >
                  <LogOut className="w-4 h-4 mr-4" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
