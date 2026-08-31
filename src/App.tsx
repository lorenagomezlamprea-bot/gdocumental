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
import { Documento, Proceso, TipoDocumento, UserRole, UserProfile } from './types';
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
      
      if (error) throw error;
      
      if (data) {
        setProfile(data);
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
      <div className="min-h-screen flex items-center justify-center bg-eveca-bg">
        <Loader2 className="w-8 h-8 text-eveca-primary animate-spin" />
      </div>
    );
  }

  if (!session) {
    if (authView === 'login') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-eveca-bg p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-8 bg-eveca-primary text-white text-center">
              <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm overflow-hidden p-2">
                <img src="/Logo_corpo-1.png" alt="EVECA Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-bold">Gestor Documental</h1>
              <p className="text-white/60 text-sm mt-2">Área de Sostenibilidad</p>
            </div>
            <form onSubmit={handleLogin} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Correo Electrónico</label>
                <input 
                  name="email"
                  type="email" 
                  required
                  className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-eveca-primary transition-all outline-none"
                  placeholder="usuario@eveca.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Contraseña</label>
                <input 
                  name="password"
                  type="password" 
                  required
                  className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-eveca-primary transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-eveca-primary text-white font-bold py-4 rounded-xl hover:bg-eveca-green-light transition-all shadow-lg shadow-eveca-primary/20"
              >
                Iniciar Sesión
              </button>
              
              <div className="text-center pt-2">
                <p className="text-sm text-gray-400">
                  ¿No tienes cuenta?{' '}
                  <button 
                    type="button"
                    onClick={() => setAuthView('request')}
                    className="text-eveca-primary font-bold hover:underline"
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
        <div className="min-h-screen flex items-center justify-center bg-eveca-bg p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-8 bg-eveca-primary text-white text-center">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm overflow-hidden p-2">
                <img src="/Logo_corpo-1.png" alt="EVECA Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-bold">Solicitar Acceso</h1>
              <p className="text-white/60 text-sm mt-2">Crea tu cuenta para el Área de Sostenibilidad</p>
            </div>
            <form onSubmit={handleSignUp} className="p-8 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nombre Completo</label>
                <input 
                  name="nombre_completo"
                  type="text" 
                  required
                  className="w-full bg-gray-50 border-gray-100 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-eveca-primary transition-all outline-none"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Correo Electrónico</label>
                <input 
                  name="email"
                  type="email" 
                  required
                  className="w-full bg-gray-50 border-gray-100 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-eveca-primary transition-all outline-none"
                  placeholder="usuario@eveca.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Contraseña</label>
                <input 
                  name="password"
                  type="password" 
                  required
                  className="w-full bg-gray-50 border-gray-100 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-eveca-primary transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Confirmar Contraseña</label>
                <input 
                  name="confirm_password"
                  type="password" 
                  required
                  className="w-full bg-gray-50 border-gray-100 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-eveca-primary transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-eveca-primary text-white font-bold py-4 rounded-xl hover:bg-eveca-green-light transition-all shadow-lg shadow-eveca-primary/20 mt-4"
              >
                Enviar Solicitud
              </button>
              
              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => setAuthView('login')}
                  className="text-sm text-gray-400 hover:text-eveca-primary font-bold"
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
        <div className="min-h-screen flex items-center justify-center bg-eveca-bg p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Solicitud Enviada</h1>
              <p className="text-gray-500 mb-8 px-4">
                Tu solicitud de acceso fue enviada correctamente. La Jefatura de Sostenibilidad revisará tu solicitud y te notificaremos cuando sea aprobada.
              </p>
              <button 
                onClick={() => setAuthView('login')}
                className="w-full bg-eveca-primary text-white font-bold py-4 rounded-xl hover:bg-eveca-green-light transition-all shadow-lg"
              >
                Volver al Login
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
        return <ApprovedRepository documents={documents} processes={processes} types={types} />;
      case 'documents':
        return <DocumentList documents={documents} processes={processes} types={types} onRefresh={fetchData} isReadOnly={role === 'visualizador'} currentUserProfile={profile} />;
      case 'admin':
        return <AdminModule processes={processes} types={types} onRefresh={fetchData} onViewChange={setCurrentView} />;
      case 'access_control':
        return <AccessControl />;
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
      default: return 'EVECA Sostenibilidad';
    }
  };

  return (
    <div className="flex min-h-screen bg-eveca-bg">
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
        
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            {renderContent()}
          </div>
        </div>
        
        <footer className="py-6 px-8 border-t border-gray-200 bg-white">
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
            <p>© 2026 EVECA - Extracción Sostenible de Aceite de Palma</p>
            <div className="flex space-x-4">
              <span>Versión del Sistema 1.1.0</span>
              <span className="text-eveca-primary cursor-pointer hover:underline">Soporte Técnico</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
