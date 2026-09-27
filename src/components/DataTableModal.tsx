import React, { useState, useMemo } from 'react';
import { FlightRoute } from '../types';
import { Table, Search, ArrowUpDown, Plane, X, ExternalLink } from 'lucide-react';

interface DataTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: FlightRoute[];
  onSelectRoute?: (route: FlightRoute) => void;
}

export const DataTableModal: React.FC<DataTableModalProps> = ({
  isOpen,
  onClose,
  routes,
  onSelectRoute,
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<keyof FlightRoute>('authorizationDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  if (!isOpen) return null;

  const handleSort = (field: keyof FlightRoute) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const filteredRoutes = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = routes.filter((r) => {
      if (!q) return true;
      return (
        r.originCode.toLowerCase().includes(q) ||
        r.destCode.toLowerCase().includes(q) ||
        r.originName.toLowerCase().includes(q) ||
        r.destName.toLowerCase().includes(q) ||
        r.airline.toLowerCase().includes(q) ||
        (r.sheetName && r.sheetName.toLowerCase().includes(q)) ||
        (r.authorizationDate && r.authorizationDate.toLowerCase().includes(q)) ||
        (r.period && r.period.toLowerCase().includes(q))
      );
    });

    result.sort((a, b) => {
      let valA: any = a[sortBy] ?? '';
      let valB: any = b[sortBy] ?? '';

      if (typeof valA === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });

    return result;
  }, [routes, search, sortBy, sortOrder]);

  return (
    <div className="fixed inset-0 z-[1500] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Tabla de Datos de Rutas Aéreas</h2>
              <p className="text-xs text-slate-400">
                Mostrando <span className="text-cyan-300 font-bold">{filteredRoutes.length}</span> de{' '}
                <span className="text-slate-300">{routes.length}</span> rutas filtradas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por IATA, ciudad, aerolínea..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950 sticky top-0 z-10 border-b border-slate-800">
              <tr className="text-slate-400 font-semibold text-[11px]">
                <th
                  onClick={() => handleSort('originCode')}
                  className="px-4 py-3 cursor-pointer hover:text-cyan-400 transition"
                >
                  <div className="flex items-center gap-1">
                    Origen <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('destCode')}
                  className="px-4 py-3 cursor-pointer hover:text-cyan-400 transition"
                >
                  <div className="flex items-center gap-1">
                    Destino <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('airline')}
                  className="px-4 py-3 cursor-pointer hover:text-cyan-400 transition"
                >
                  <div className="flex items-center gap-1">
                    Aerolínea / Pestaña <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('flightType')}
                  className="px-4 py-3 cursor-pointer hover:text-cyan-400 transition text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    Tipo <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('distanceKm')}
                  className="px-4 py-3 cursor-pointer hover:text-cyan-400 transition text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    Distancia <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('authorizationDate')}
                  className="px-4 py-3 cursor-pointer hover:text-cyan-400 transition text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    Fecha de Autorización <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredRoutes.map((route) => (
                <tr
                  key={route.id}
                  className="hover:bg-slate-800/40 transition group text-slate-200"
                >
                  <td className="px-4 py-2.5">
                    <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                      <span className="bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60 text-[11px]">
                        {route.originCode}
                      </span>
                      <span className="font-sans text-[11px] text-slate-300 font-normal truncate max-w-[140px]" title={route.originName}>
                        {route.originName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-bold text-purple-400 flex items-center gap-1.5">
                      <span className="bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/60 text-[11px]">
                        {route.destCode}
                      </span>
                      <span className="font-sans text-[11px] text-slate-300 font-normal truncate max-w-[140px]" title={route.destName}>
                        {route.destName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-sans font-medium text-slate-300">
                    <div className="flex flex-col gap-0.5">
                      <span>{route.airline}</span>
                      {route.sheetName && route.sheetName !== route.airline && (
                        <span className="text-[10px] text-cyan-400/80 font-mono bg-cyan-950/40 px-1.5 py-0.2 rounded w-fit border border-cyan-800/40">
                          Hoja: {route.sheetName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center font-sans">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        route.flightType === 'Internacional'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                          : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                      }`}
                    >
                      {route.flightType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-400">
                    {route.distanceKm.toLocaleString()} km
                  </td>
                  <td className="px-4 py-2.5 text-center font-sans">
                    <span className="px-2.5 py-0.5 bg-slate-800/90 text-amber-300 font-mono rounded text-[11px] border border-slate-700 font-bold">
                      {route.authorizationDate || route.period || (route.year ? String(route.year) : 'S/F')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {onSelectRoute && (
                      <button
                        onClick={() => {
                          onSelectRoute(route);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-cyan-900/50 hover:bg-cyan-700 text-cyan-300 hover:text-white rounded text-[11px] font-sans font-medium transition cursor-pointer"
                      >
                        Ver en Mapa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Autorizaciones Registradas:</span>
            <strong className="text-amber-400 font-bold font-mono text-sm">
              {filteredRoutes.length.toLocaleString()}
            </strong>
            <span>autorizaciones</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
