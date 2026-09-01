import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { 
  FileCheck, 
  FileClock, 
  FileWarning, 
  FileText,
  Clock,
  ArrowUpRight,
  MoreVertical
} from 'lucide-react';
import { cn, formatDate, getStatusColor } from '../lib/utils';
import { Documento, Proceso } from '../types';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  trend?: string;
}

const StatCard = ({ label, value, icon: Icon, color, trend }: StatCardProps) => (
  <div className="bg-dark-card p-8 rounded-[2rem] shadow-2xl border border-slate-800/50 flex flex-col relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-16 -mt-16 blur-2xl" />
    <div className="flex justify-between items-start mb-6 relative z-10">
      <div className={cn("p-4 rounded-2xl shadow-lg", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <span className="flex items-center text-accent-cyan text-[10px] font-black uppercase tracking-widest bg-accent-cyan/10 px-3 py-1.5 rounded-xl border border-accent-cyan/20">
          <ArrowUpRight className="w-3 h-3 mr-1" />
          {trend}
        </span>
      )}
    </div>
    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 relative z-10">{label}</p>
    <div className="flex items-baseline space-x-2 relative z-10">
      <h3 className="text-4xl font-black text-white tracking-tighter">{value}</h3>
      <span className="text-slate-600 font-bold text-xs">unidades</span>
    </div>
  </div>
);

export const Dashboard = ({ documents, processes }: { documents: Documento[], processes: Proceso[] }) => {
  const stats = {
    approved: documents.filter(d => d.estado === 'Aprobado').length,
    review: documents.filter(d => d.estado === 'En revisión').length,
    draft: documents.filter(d => d.estado === 'Borrador').length,
    expired: documents.filter(d => d.fecha_proxima_revision && new Date(d.fecha_proxima_revision) < new Date()).length,
  };

  // Aggregate by process name
  const processStats = documents.reduce((acc: any, doc) => {
    const process = processes.find(p => p.id === doc.proceso_id);
    const procName = process?.nombre || 'Sin Proceso';
    acc[procName] = (acc[procName] || 0) + 1;
    return acc;
  }, {});

  const processData = Object.keys(processStats).map(key => ({
    name: key,
    value: processStats[key]
  }));

  const statusData = [
    { name: 'Aprobados', value: stats.approved, color: '#d946ef' },
    { name: 'Revisión', value: stats.review, color: '#22d3ee' },
    { name: 'Borrador', value: stats.draft, color: '#3b82f6' },
    { name: 'Vencidos', value: stats.expired, color: '#f43f5e' },
  ];

  const recentDocs = documents.slice(0, 5);

  return (
    <div className="space-y-10">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard label="Aprobados" value={stats.approved} icon={FileCheck} color="bg-gradient-to-br from-accent-purple to-accent-blue" trend="+12%" />
        <StatCard label="En Revisión" value={stats.review} icon={FileClock} color="bg-gradient-to-br from-accent-cyan to-accent-blue" />
        <StatCard label="Borradores" value={stats.draft} icon={FileText} color="bg-slate-800" />
        <StatCard label="Vencidos" value={stats.expired} icon={FileWarning} color="bg-gradient-to-br from-rose-500 to-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-dark-card p-10 rounded-[2.5rem] shadow-2xl border border-slate-800/50">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Distribución por Proceso</h3>
              <p className="text-xs text-slate-500 font-bold mt-1">Análisis de volumen documental</p>
            </div>
            <button className="p-2 text-slate-600 hover:text-white transition-colors bg-slate-800/30 rounded-xl">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: 800}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: 800}} 
                />
                <Tooltip 
                  cursor={{fill: '#1e293b', radius: 8}}
                  contentStyle={{ 
                    backgroundColor: '#1a1d23', 
                    borderRadius: '20px', 
                    border: '1px solid #334155', 
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
                    padding: '12px 16px'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" fill="url(#colorBar)" radius={[10, 10, 0, 0]} barSize={40}>
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d946ef" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-dark-card p-10 rounded-[2.5rem] shadow-2xl border border-slate-800/50">
          <h3 className="text-xl font-black text-white tracking-tight mb-2">Estado Global</h3>
          <p className="text-xs text-slate-500 font-bold mb-10">Resumen de cumplimiento</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1d23', 
                    borderRadius: '20px', 
                    border: '1px solid #334155',
                    padding: '12px'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-dark-card rounded-[2.5rem] shadow-2xl border border-slate-800/50 overflow-hidden">
        <div className="p-10 border-b border-slate-800/50 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">Últimas Modificaciones</h3>
            <p className="text-xs text-slate-500 font-bold mt-1">Actividad reciente del sistema</p>
          </div>
          <button className="px-6 py-3 bg-slate-800/50 text-accent-purple text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all border border-slate-800">
            Ver todo el historial
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/20">
                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Código</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Documento</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Versión</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Estado</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Actualizado</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {recentDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-800/30 transition-all group">
                  <td className="px-10 py-8 whitespace-nowrap text-xs font-black text-accent-purple tracking-wider">{doc.codigo}</td>
                  <td className="px-10 py-8 whitespace-nowrap">
                    <p className="text-sm font-black text-white tracking-tight">{doc.nombre}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Sostenibilidad</p>
                  </td>
                  <td className="px-10 py-8 whitespace-nowrap text-xs font-bold text-slate-400">v{doc.version}.0</td>
                  <td className="px-10 py-8 whitespace-nowrap">
                    <span className={cn(
                      "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                      doc.estado === 'Aprobado' ? "bg-accent-purple/10 text-accent-purple border-accent-purple/20" : 
                      doc.estado === 'En revisión' ? "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20" :
                      "bg-slate-800 text-slate-400 border-slate-700"
                    )}>
                      {doc.estado}
                    </span>
                  </td>
                  <td className="px-10 py-8 whitespace-nowrap text-xs font-bold text-slate-400">
                    <div className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-2 text-slate-600" />
                      {formatDate(doc.fecha_ultima_revision)}
                    </div>
                  </td>
                  <td className="px-10 py-8 whitespace-nowrap text-right">
                    <button className="p-3 text-slate-600 hover:text-accent-purple hover:bg-accent-purple/10 rounded-xl transition-all">
                      <FileText className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
