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
      "flex items-center w-full p-3 my-1 rounded-lg transition-all duration-200 group",
      active 
        ? "bg-eveca-primary text-white shadow-md" 
        : "text-gray-600 hover:bg-white hover:text-eveca-primary hover:shadow-sm"
    )}
  >
    <Icon className={cn("w-5 h-5", !collapsed && "mr-3")} />
    {!collapsed && <span className="font-medium text-sm">{label}</span>}
    {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-eveca-oil" />}
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
    <aside className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col sticky top-0">
      <div className="p-6 flex items-center border-b border-gray-100">
        <img src="/Logo_corpo-1.png" alt="EVECA Logo" className="w-10 h-10 object-contain mr-3" />
        <div>
          <h1 className="text-lg font-bold text-eveca-primary leading-tight">EVECA</h1>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Sostenibilidad</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="mb-8">
          <p className="px-3 mb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">General</p>
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

        {role === 'superadmin' && (
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

        {(role === 'superadmin' || role === 'administrador' || role === 'editor') && (
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

      <div className="p-4 border-t border-gray-100">
        <div className="bg-gray-50 rounded-xl p-3 flex items-center mb-3">
          <div className="w-8 h-8 rounded-full bg-eveca-accent flex items-center justify-center text-white font-bold text-xs uppercase">
            {userEmail?.substring(0, 2) || 'EV'}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-xs font-bold text-gray-900 truncate">{userEmail || 'Usuario Eveca'}</p>
            <p className="text-[10px] text-gray-500 capitalize">{role.replace('_', ' ')}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4 mr-2" />
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
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-50">
      <div className="flex items-center flex-1">
        <h2 className="text-xl font-bold text-gray-800 mr-8">{title}</h2>
        <div className="max-w-md w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por código o nombre..." 
            className="w-full bg-gray-50 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-eveca-primary transition-all"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Notificaciones */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => {
              setNotifOpen(!notifOpen);
              setUserOpen(false);
            }}
            className={cn(
              "p-2 text-gray-400 hover:text-eveca-primary hover:bg-gray-50 rounded-full transition-all relative",
              notifOpen && "text-eveca-primary bg-gray-50"
            )}
          >
            <Bell className="w-5 h-5" />
            {totalNotifs > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
              <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notificaciones</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onViewChange(n.view);
                        setNotifOpen(false);
                      }}
                      className="w-full p-4 flex items-start hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-3",
                        n.type === 'expiry' ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-blue-500"
                      )}>
                        {n.type === 'expiry' ? <Clock className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 leading-tight mb-1">{n.title}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-2">{n.message}</p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-gray-300 ml-2 mt-1" />
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No tienes notificaciones nuevas</p>
                  </div>
                )}
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
              "p-2 text-gray-400 hover:text-eveca-primary hover:bg-gray-50 rounded-full transition-all relative",
              userOpen && "text-eveca-primary bg-gray-50"
            )}
          >
            <User className="w-5 h-5" />
          </button>

          {userOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
              <div className="p-6 bg-eveca-primary text-white">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3 backdrop-blur-sm text-lg font-bold">
                  {userProfile?.nombre_completo?.substring(0, 1) || userProfile?.email?.substring(0, 1).toUpperCase()}
                </div>
                <p className="font-bold text-sm truncate">{userProfile?.nombre_completo || 'Usuario EVECA'}</p>
                <p className="text-[10px] text-white/70 truncate">{userProfile?.email}</p>
              </div>
              <div className="p-2">
                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                  <span className="inline-block px-2 py-0.5 bg-eveca-primary/10 text-eveca-primary text-[10px] font-bold rounded uppercase tracking-wider">
                    {userProfile?.rol.replace('_', ' ')}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setUserOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-bold"
                >
                  <LogOut className="w-4 h-4 mr-3" />
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
