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
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <span className="flex items-center text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
          <ArrowUpRight className="w-3 h-3 mr-1" />
          {trend}
        </span>
      )}
    </div>
    <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
    <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
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
    { name: 'Aprobados', value: stats.approved, color: '#1B4332' },
    { name: 'Revisión', value: stats.review, color: '#D4A373' },
    { name: 'Borrador', value: stats.draft, color: '#2D6A4F' },
    { name: 'Vencidos', value: stats.expired, color: '#C1121F' },
  ];

  const recentDocs = documents.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Documentos Aprobados" value={stats.approved} icon={FileCheck} color="bg-eveca-primary" />
        <StatCard label="En Revisión" value={stats.review} icon={FileClock} color="bg-eveca-accent" />
        <StatCard label="Borradores" value={stats.draft} icon={FileText} color="bg-eveca-green-light" />
        <StatCard label="Vencidos/Próximos" value={stats.expired} icon={FileWarning} color="bg-eveca-red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Distribución por Proceso</h3>
            <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="w-5 h-5" /></button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#868E96', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#868E96', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#F8F9FA'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#1B4332" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Estado Global</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Últimas Modificaciones</h3>
          <button className="text-eveca-primary text-sm font-bold hover:underline">Ver todo</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Versión</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-eveca-primary">{doc.codigo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{doc.nombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">v{doc.version}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border", getStatusColor(doc.estado))}>
                      {doc.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                      {formatDate(doc.fecha_ultima_revision)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="text-gray-400 hover:text-eveca-primary transition-colors">
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
