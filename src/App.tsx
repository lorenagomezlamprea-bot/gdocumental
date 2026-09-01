/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Sidebar, TopBar } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { DocumentList } from './components/DocumentList';
import { AdminModule } from './components/AdminModule';
import { ApprovedRepository } from './components/ApprovedRepository';
import { AccessControl } from './components/AccessControl';
import { AuditLog } from './components/AuditLog';
import { Documento, Proceso, TipoDocumento, UserRole, UserProfile } from './types';
import { logAccion } from './lib/audit';
import { LogIn, Loader2, Clock, AlertTriangle, LogOut } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [authView, setAuthView] = useState<'login' | 'request' | 'success'>('login');
  
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [processes, setProcesses] = useState<Proceso[]>([]);
  const [types, setTypes] = useState<TipoDocumento[]>([]);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error && error.code === 'PGRST116') {
        // El perfil no existe, si es el correo maestro, lo creamos
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email === 'jefaturasostenibilidad@gmail.com') {
          const { data: newProfile, error: createError } = await supabase
            .from('perfiles')
            .insert([{
              id: userId,
              email: user.email,
              nombre_completo: 'Administrador Maestro',
              rol: 'superadmin',
              estado: 'activo'
            }])
            .select()
            .single();
          
          if (!createError && newProfile) {
            setProfile(newProfile);
            return;
          }
        }
        throw error;
      }
      if (error) throw error;
      
      if (data) {
        // REGLA DE ORO: El correo maestro siempre debe ser superadmin
        // Usamos el email de la sesión/usuario de auth por si no está en la tabla perfiles
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email === 'jefaturasostenibilidad@gmail.com' && data.rol !== 'superadmin') {
          data.rol = 'superadmin';
          // Intento de corrección automática en DB
          supabase.from('perfiles').update({ rol: 'superadmin' }).eq('id', userId).then();
        }
        
        setProfile(data);
        // LOG: Login
        logAccion(userId, 'LOGIN', 'auth', userId, { email: data.email });
      } else {
        console.warn('Profile not found for user:', userId);
        setProfile(null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!profile || profile.estado !== 'aprobado') return;
    try {
      const [docsRes, procRes, typesRes] = await Promise.all([
        supabase.from('documentos').select('*').order('fecha_ultima_revision', { ascending: false }),
        supabase.from('procesos').select('*').order('nombre'),
        supabase.from('tipos_documento').select('*').order('nombre')
      ]);

      if (docsRes.data) setDocuments(docsRes.data as Documento[]);
      if (procRes.data) setProcesses(procRes.data as Proceso[]);
      if (typesRes.data) setTypes(typesRes.data as TipoDocumento[]);

      // Fetch pending users if admin
      if (profile.rol === 'superadmin' || profile.rol === 'administrador') {
        const { count } = await supabase
          .from('perfiles')
          .select('*', { count: 'exact', head: true })
          .eq('estado', 'pendiente');
        setPendingUsersCount(count || 0);
      }
    } catch (err: any) {
      console.error('General error in fetchData:', err);
    }
  };

  const notifications = (() => {
    const list = [];
    
    // Document expiry notifications
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    documents.forEach(doc => {
      if (doc.estado === 'Obsoleto') return;
      const expiryDate = new Date(doc.fecha_proxima_revision);
      if (expiryDate <= thirtyDaysFromNow) {
        const isExpired = expiryDate < today;
        const diffTime = Math.abs(expiryDate.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        list.push({
          type: 'expiry',
          title: isExpired ? 'Documento Vencido' : 'Próximo a Vencer',
          message: `${doc.codigo} - ${doc.nombre}. ${isExpired ? `Vencido hace ${diffDays} días` : `Vence en ${diffDays} días`}.`,
          view: 'documents',
          id: doc.id
        });
      }
    });

    // Pending access requests
    if (pendingUsersCount > 0) {
      list.push({
        type: 'access',
        title: 'Solicitudes Pendientes',
        message: `Hay ${pendingUsersCount} solicitudes de acceso esperando aprobación.`,
        view: 'access_control'
      });
    }

    return list;
  })();

  useEffect(() => {
    if (session && profile) fetchData();
  }, [session, profile]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nombreCompleto = formData.get('nombre_completo') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre_completo: nombreCompleto
        }
      }
    });

    if (error) {
      // Supabase error for already registered user often contains "already registered"
      if (error.message.includes('already registered') || error.status === 422) {
        alert('Este correo ya tiene una cuenta registrada. Si ya solicitaste acceso, espera la aprobación o intenta iniciar sesión.');
      } else {
        alert(error.message);
      }
      return;
    }

    setAuthView('success');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-accent-purple/20 border-t-accent-purple rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-dark-bg rounded-full border border-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    if (authView === 'login') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[50rem] h-[50rem] bg-accent-purple/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[50rem] h-[50rem] bg-accent-blue/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
          
          <div className="max-w-md w-full bg-dark-card rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden relative z-10">
            <div className="p-10 bg-gradient-to-br from-accent-purple to-accent-blue text-white text-center relative">
              <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl p-4 transition-transform hover:scale-105 duration-500">
                <img src="/Logo_corpo-1.png" alt="EVECA Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter">EVECA</h1>
              <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Gestor Documental</p>
            </div>
            <form onSubmit={handleLogin} className="p-10 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Correo Electrónico</label>
                <input 
                  name="email"
                  type="email" 
                  required
                  className="w-full bg-slate-800/30 border border-slate-800 rounded-2xl py-4 px-6 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-accent-purple transition-all outline-none"
                  placeholder="usuario@eveca.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Contraseña</label>
                <input 
                  name="password"
                  type="password" 
                  required
                  className="w-full bg-slate-800/30 border border-slate-800 rounded-2xl py-4 px-6 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-accent-purple transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-white text-dark-bg font-black py-4 rounded-2xl hover:bg-accent-purple hover:text-white transition-all shadow-xl shadow-black/20 uppercase tracking-widest text-xs"
              >
                Iniciar Sesión
              </button>
              
              <div className="text-center pt-4">
                <p className="text-xs text-slate-500 font-bold">
                  ¿No tienes cuenta?{' '}
                  <button 
                    type="button"
                    onClick={() => setAuthView('request')}
                    className="text-accent-purple font-black hover:underline ml-1"
                  >
                    Solicitar acceso
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      );
    }

    if (authView === 'request') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[50rem] h-[50rem] bg-accent-blue/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          
          <div className="max-w-md w-full bg-dark-card rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden relative z-10">
            <div className="p-10 bg-gradient-to-br from-accent-blue to-accent-cyan text-white text-center">
              <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl p-4 transition-transform hover:scale-105">
                <img src="/Logo_corpo-1.png" alt="EVECA Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter">Solicitar Acceso</h1>
              <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Área de Sostenibilidad</p>
            </div>
            <form onSubmit={handleSignUp} className="p-10 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Nombre Completo</label>
                <input 
                  name="nombre_completo"
                  type="text" 
                  required
                  className="w-full bg-slate-800/30 border border-slate-800 rounded-2xl py-4 px-6 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-accent-blue transition-all outline-none"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Correo Electrónico</label>
                <input 
                  name="email"
                  type="email" 
                  required
                  className="w-full bg-slate-800/30 border border-slate-800 rounded-2xl py-4 px-6 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-accent-blue transition-all outline-none"
                  placeholder="usuario@eveca.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Contraseña</label>
                <input 
                  name="password"
                  type="password" 
                  required
                  className="w-full bg-slate-800/30 border border-slate-800 rounded-2xl py-4 px-6 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-accent-blue transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Confirmar Contraseña</label>
                <input 
                  name="confirm_password"
                  type="password" 
                  required
                  className="w-full bg-slate-800/30 border border-slate-800 rounded-2xl py-4 px-6 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-accent-blue transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-white text-dark-bg font-black py-4 rounded-2xl hover:bg-accent-blue hover:text-white transition-all shadow-xl shadow-black/20 uppercase tracking-widest text-xs"
              >
                Enviar Solicitud
              </button>
              
              <div className="text-center pt-4">
                <button 
                  type="button"
                  onClick={() => setAuthView('login')}
                  className="text-xs text-slate-500 font-bold hover:text-accent-blue transition-colors"
                >
                  Volver al Inicio de Sesión
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    if (authView === 'success') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-accent-purple/5 animate-pulse" />
          
          <div className="max-w-md w-full bg-dark-card rounded-[3rem] shadow-2xl border border-slate-800 overflow-hidden relative z-10">
            <div className="p-16 text-center">
              <div className="w-24 h-24 bg-accent-purple/10 text-accent-purple rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner border border-accent-purple/20">
                <Clock className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-black text-white mb-4 tracking-tight">Solicitud Enviada</h1>
              <p className="text-slate-500 text-xs font-bold leading-relaxed mb-10 px-4 uppercase tracking-widest">
                Tu solicitud está en revisión. La Jefatura de Sostenibilidad validará tus credenciales en las próximas horas.
              </p>
              <button 
                onClick={() => setAuthView('login')}
                className="w-full bg-accent-purple text-white font-black py-5 rounded-2xl hover:bg-white hover:text-dark-bg transition-all shadow-xl shadow-accent-purple/20 uppercase tracking-[0.2em] text-xs"
              >
                Regresar al Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  if (session && !profile && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-eveca-bg p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-eveca-primary/10 text-eveca-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Inicializando Cuenta</h1>
            <p className="text-gray-500 mb-8 px-4">
              Estamos configurando tu perfil en el sistema de sostenibilidad. Esto solo tomará unos segundos.
            </p>
            <button 
              onClick={() => fetchProfile(session.user.id)}
              className="w-full bg-eveca-primary text-white font-bold py-4 rounded-xl hover:bg-eveca-green-light transition-all shadow-lg mb-4"
            >
              Verificar Estado
            </button>
            <button 
              onClick={handleLogout}
              className="inline-flex items-center space-x-2 text-gray-400 hover:text-red-500 font-bold transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (profile && profile.estado !== 'aprobado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-eveca-bg p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-12 text-center">
            <div className={cn(
              "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6",
              profile.estado === 'pendiente' ? "bg-amber-50 text-amber-500" : "bg-red-50 text-red-500"
            )}>
              {profile.estado === 'pendiente' ? <Clock className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              {profile.estado === 'pendiente' ? 'Acceso Pendiente' : 'Acceso Denegado'}
            </h1>
            <p className="text-gray-500 mb-8 px-4">
              {profile.estado === 'pendiente' 
                ? "Tu cuenta está pendiente de aprobación por la Jefatura de Sostenibilidad. Te notificaremos cuando sea activada."
                : "Tu solicitud de acceso ha sido rechazada o revocada por el administrador del sistema."}
            </p>
            <button 
              onClick={handleLogout}
              className="inline-flex items-center space-x-2 text-gray-400 hover:text-red-500 font-bold transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const role = profile?.rol || 'visualizador';

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard documents={documents} processes={processes} />;
      case 'approved':
        return <ApprovedRepository documents={documents} processes={processes} types={types} currentUserProfile={profile} />;
      case 'documents':
        return <DocumentList documents={documents} processes={processes} types={types} onRefresh={fetchData} isReadOnly={role === 'visualizador'} currentUserProfile={profile} />;
      case 'admin':
        return <AdminModule processes={processes} types={types} onRefresh={fetchData} onViewChange={setCurrentView} currentUserProfile={profile} />;
      case 'access_control':
        return <AccessControl />;
      case 'audit_log':
        return <AuditLog />;
      default:
        return <Dashboard documents={documents} processes={processes} />;
    }
  };

  const getTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Panel de Control';
      case 'approved': return 'Documentación Aprobada';
      case 'documents': return 'Gestión Documental';
      case 'admin': return 'Configuración del Sistema';
      case 'access_control': return 'Control de Accesos';
      case 'audit_log': return 'Auditoría y Trazabilidad';
      default: return 'EVECA Sostenibilidad';
    }
  };

  return (
    <div className="flex min-h-screen bg-dark-bg">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        role={role} 
        userEmail={session.user.email}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 flex flex-col min-w-0">
        <TopBar 
          title={getTitle()} 
          onSearch={setSearchTerm}
          notifications={notifications}
          userProfile={profile}
          onLogout={handleLogout}
          onViewChange={setCurrentView}
        />
        
        <div className="flex-1 p-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-700">
            {renderContent()}
          </div>
        </div>
        
        <footer className="py-10 px-10 border-t border-slate-800/50 bg-dark-bg">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
            <p>© 2026 EVECA - EXTRACTORA DE ACEITE DE PALMA</p>
            <div className="flex items-center space-x-8">
              <span>SISTEMA DE GESTIÓN v1.2.0</span>
              <span className="text-accent-purple cursor-pointer hover:text-white transition-colors">SOPORTE TÉCNICO</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
