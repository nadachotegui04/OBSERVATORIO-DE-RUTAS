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
    <header className="min-h-[4rem] py-2 bg-slate-900 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between z-20 shrink-0">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-black shrink-0">
          <Plane className="w-5 h-5 text-slate-950 -rotate-45" />
        </div>
        <div className="min-w-0 flex items-center gap-3">
          <div className="shrink-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs md:text-sm font-extrabold text-white tracking-tight leading-tight">
                Agencia Federal de Aviación Civil
              </h1>
            </div>
            <div className="leading-tight mt-0.5">
              <p className="text-[10.5px] md:text-[11px] font-bold text-slate-300 truncate">
                Dirección Ejecutiva de Transporte y Control Aeronáutico
              </p>
              <p className="text-[10px] md:text-[10.5px] font-semibold text-cyan-400 truncate">
                Coordinación de Concesiones y Transporte Aéreo
              </p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800 shrink-0"></div>
          <div className="min-w-0 shrink-0">
            <h2 className="text-xs md:text-sm font-black text-white tracking-tight flex items-center gap-1.5">
              <span className="text-cyan-400">Observatorio de Conectividad Aerocomercial.</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-medium">Plataforma de Inteligencia Aeronáutica</p>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
        <button
          id="btn-view-single"
          onClick={() => onViewChange('single')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
            activeView === 'single'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Vista Individual</span>
        </button>

        <button
          id="btn-view-compare"
          onClick={() => onViewChange('compare')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
            activeView === 'compare'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Modo Comparación</span>
        </button>

        <button
          id="btn-view-table"
          onClick={() => onViewChange('table')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
            activeView === 'table'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Tabla de Datos</span>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        {/* Cloud Status indicator */}
        <div
          title={
            isCloudSyncing
              ? 'Sincronizando información con Firebase Firestore...'
              : 'Base de datos en la nube conectada: cualquier visitante verá automáticamente el dataset oficial publicado.'
          }
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] text-slate-400"
        >
          {isCloudSyncing ? (
            <>
              <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
              <span className="text-cyan-300 font-medium">Nube: Sincronizando...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <Cloud className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-300 font-medium">Nube Sincronizada</span>
            </>
          )}
        </div>

        {/* Demo data restore (admin only) */}
        {isAdmin && !isDemoLoaded && (
          <button
            onClick={onRestoreDemo}
            title="Restablecer dataset de prueba de aviación mexicana"
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Dataset Demo</span>
          </button>
        )}

        <button
          id="btn-open-export"
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-500/40 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Exportar / Descargar</span>
        </button>

        {/* AFAC User Badge & Logout */}
        {afacUser && (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
            <div
              title={`Usuario institucional autenticado: ${afacUser.email}`}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-slate-300"
            >
              <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-300 shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="text-[11px] font-bold text-white max-w-[130px] truncate">
                  {afacUser.email.split('@')[0]}
                </span>
                <span className="text-[9px] text-emerald-400 font-mono">
                  @afac.gob.mx
                </span>
              </div>
            </div>

            {onLogout && (
              <button
                id="btn-afac-logout"
                onClick={onLogout}
                title="Cerrar sesión confidencial AFAC"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800/80 text-slate-400 border border-slate-800 rounded-xl text-xs transition shadow-sm cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Salir</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
