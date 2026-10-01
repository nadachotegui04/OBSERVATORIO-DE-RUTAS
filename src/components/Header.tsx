import React from 'react';
import { Plane, Map, ArrowRightLeft, Table, Download, RefreshCw, Lock, ShieldCheck, Cloud, Loader2, LogOut, User } from 'lucide-react';
import { DatasetStats, AfacAuthUser } from '../types';

interface HeaderProps {
  activeView: 'single' | 'compare' | 'table';
  onViewChange: (view: 'single' | 'compare' | 'table') => void;
  stats: DatasetStats;
  onOpenExport: () => void;
  onRestoreDemo: () => void;
  isDemoLoaded: boolean;
  onOpenTable: () => void;
  isAdmin: boolean;
  onOpenAuthModal: () => void;
  isCloudSyncing?: boolean;
  afacUser?: AfacAuthUser | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  stats,
  onOpenExport,
  onRestoreDemo,
  isDemoLoaded,
  onOpenTable,
  isAdmin,
  onOpenAuthModal,
  isCloudSyncing = false,
  afacUser,
  onLogout,
}) => {
  return (
    <header className="min-h-[3.75rem] py-1.5 bg-slate-900 border-b border-slate-800 px-3 md:px-4 flex items-center justify-between gap-2 z-20 shrink-0">
      {/* Brand & Title — Compact institutional name visible without crowding right options */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-black shrink-0">
          <Plane className="w-4 h-4 text-slate-950 -rotate-45" />
        </div>
        <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
          <div className="shrink-0 hidden sm:block">
            <div className="flex items-center gap-2">
              <h1 className="text-[11px] md:text-xs font-bold text-white tracking-tight leading-tight whitespace-nowrap">
                Agencia Federal de Aviación Civil
              </h1>
            </div>
            <div className="leading-tight mt-0.5">
              <p className="text-[9px] md:text-[9.5px] font-medium text-slate-300 whitespace-nowrap">
                Dirección Ejecutiva de Transporte y Control Aeronáutico
              </p>
              <p className="text-[8.5px] md:text-[9px] font-medium text-cyan-400 whitespace-nowrap">
                Coordinación de Concesiones de Transporte Aéreo
              </p>
            </div>
          </div>
          <div className="h-6 w-px bg-slate-800 shrink-0 hidden sm:block"></div>
          <div className="flex flex-col justify-center min-w-0">
            <h2 className="text-[10.5px] sm:text-[11.5px] md:text-[12px] lg:text-[13px] font-extrabold text-white tracking-tight leading-snug flex items-center gap-1.5">
              <span className="text-cyan-400">Observatorio Gráfico de Rutas Aéreas Nacionales Autorizadas</span>
            </h2>
            <p className="text-[8px] sm:text-[8.5px] md:text-[9px] text-slate-400 font-medium leading-tight mt-0.5">
              (con base en información georreferenciada)
            </p>
          </div>
        </div>
      </div>

      {/* Compact View Switcher Tabs & Right Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* View Switcher Tabs (Compact) */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[10px] font-semibold">
          <button
            id="btn-view-single"
            onClick={() => onViewChange('single')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
              activeView === 'single'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Map className="w-3 h-3 shrink-0" />
            <span>Vista Individual</span>
          </button>

          <button
            id="btn-view-compare"
            onClick={() => onViewChange('compare')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
              activeView === 'compare'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ArrowRightLeft className="w-3 h-3 shrink-0" />
            <span>Modo Comparación</span>
          </button>

          <button
            id="btn-view-table"
            onClick={() => onViewChange('table')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
              activeView === 'table'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Table className="w-3 h-3 shrink-0" />
            <span>Tabla de Datos</span>
          </button>
        </div>

        {/* Cloud Status indicator (Compact) */}
        <div
          title={
            isCloudSyncing
              ? 'Sincronizando información con Firebase Firestore...'
              : 'Base de datos en la nube conectada: cualquier visitante verá automáticamente el dataset oficial publicado.'
          }
          className="hidden lg:flex items-center gap-1 px-2 py-1 bg-slate-950/80 border border-slate-800 rounded-lg text-[10px] text-slate-400 whitespace-nowrap"
        >
          {isCloudSyncing ? (
            <>
              <Loader2 className="w-2.5 h-2.5 text-cyan-400 animate-spin shrink-0" />
              <span className="text-cyan-300 font-medium">Sincronizando...</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <Cloud className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
              <span className="text-slate-300 font-medium">Nube Sincronizada</span>
            </>
          )}
        </div>

        {/* Demo data restore (admin only) */}
        {isAdmin && !isDemoLoaded && (
          <button
            onClick={onRestoreDemo}
            title="Restablecer dataset de prueba de aviación mexicana"
            className="hidden 2xl:flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold transition border border-slate-700 whitespace-nowrap"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Dataset Demo</span>
          </button>
        )}

        <button
          id="btn-open-export"
          onClick={onOpenExport}
          className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-500/40 rounded-lg text-[10px] font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
        >
          <Download className="w-3 h-3 shrink-0" />
          <span>Exportar / Descargar</span>
        </button>

        {/* AFAC User Badge & Logout (Compact) */}
        {afacUser && (
          <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
            <div
              title={`Usuario institucional autenticado: ${afacUser.email}`}
              className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 bg-slate-950/90 border border-slate-800 rounded-lg text-[10px] text-slate-300"
            >
              <div className="w-5 h-5 rounded-md bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-300 shrink-0">
                <User className="w-3 h-3" />
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="text-[10px] font-bold text-white max-w-[95px] truncate">
                  {afacUser.email.split('@')[0]}
                </span>
                <span className="text-[8.5px] text-emerald-400 font-mono">
                  @afac.gob.mx
                </span>
              </div>
            </div>

            {onLogout && (
              <button
                id="btn-afac-logout"
                onClick={onLogout}
                title="Cerrar sesión confidencial AFAC"
                className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800/80 text-slate-400 border border-slate-800 rounded-lg text-[10px] transition shadow-sm cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden 2xl:inline">Salir</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
