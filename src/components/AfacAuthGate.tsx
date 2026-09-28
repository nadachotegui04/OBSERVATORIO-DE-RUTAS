import React, { useState } from 'react';
import {
  ShieldCheck,
  Mail,
  KeyRound,
  AlertTriangle,
  Plane,
  Building2,
  Eye,
  EyeOff,
  FileText,
  ArrowRight
} from 'lucide-react';
import { AfacAuthUser } from '../types';
import { isAfacEmail, authenticateAfacUser, logAfacAccessAudit } from '../firebase';

interface AfacAuthGateProps {
  onLoginSuccess: (user: AfacAuthUser) => void;
}

export const AfacAuthGate: React.FC<AfacAuthGateProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMsg('ACCESO DENEGADO: Este sistema es de uso estrictamente confidencial para personal de la Agencia Federal de Aviación Civil.');
      return;
    }

    // Strict domain check: silently verify @afac.gob.mx without leaking domain in the error
    if (!isAfacEmail(cleanEmail)) {
      await logAfacAccessAudit(cleanEmail, 'DENIED', 'Dominio no autorizado');
      setErrorMsg(
        'ACCESO DENEGADO: Este sistema es de uso estrictamente confidencial para personal de la Agencia Federal de Aviación Civil.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await authenticateAfacUser(cleanEmail, password.trim() || 'AFAC2026');
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMsg(
          'ACCESO DENEGADO: Este sistema es de uso estrictamente confidencial para personal de la Agencia Federal de Aviación Civil.'
        );
      }
    } catch {
      setErrorMsg(
        'ACCESO DENEGADO: Este sistema es de uso estrictamente confidencial para personal de la Agencia Federal de Aviación Civil.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 overflow-y-auto select-none">
      {/* Background Ambience / Aviation Grids */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"></div>
      </div>

      <div className="relative w-full max-w-lg bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-2xl shadow-cyan-950/40 p-6 sm:p-8 backdrop-blur-2xl text-slate-100 my-auto">
        {/* Government Header / Seal */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-cyan-400 font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>PORTAL INSTITUCIONAL DE CONTROL Y SEGURIDAD</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-sky-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950">
              <Plane className="w-6 h-6 -rotate-45" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Agencia Federal de Aviación Civil
          </h2>
          <p className="text-xs sm:text-sm font-bold text-slate-200 tracking-wide mt-1">
            Dirección Ejecutiva de Transporte y Control Aeronáutico
          </p>
          <p className="text-xs sm:text-sm font-bold text-cyan-300 tracking-wide mt-0.5">
            Coordinación de Concesiones y Transporte Aéreo
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-800">
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              <span className="text-cyan-400">Observatorio de Conectividad Aerocomercial.</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Sistema de Inteligencia Cartográfica y Rutas Aéreas (SIG-AFAC)
            </p>
          </div>

          <div className="mt-3 inline-block px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] text-amber-300 font-semibold">
            🔒 INFORMACIÓN CONFIDENCIAL Y RESERVADA • ACCESO RESTRINGIDO
          </div>
        </div>

        {/* Error / Denial Alert Banner */}
        {errorMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-950/60 border border-rose-600/80 text-rose-200 text-xs flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-lg shadow-rose-950/50">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block uppercase tracking-wide">Acceso Denegado por Seguridad</span>
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field - Discreet, without leaking required domain */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>Correo Electrónico Institucional</span>
            </label>

            <div className="relative">
              <input
                id="input-afac-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="usuario@correo.gob.mx"
                className="w-full bg-slate-950/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition font-sans"
              />
            </div>
          </div>

          {/* Password / Access Key Field */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>Contraseña o Clave de Acceso Institucional</span>
            </label>

            <div className="relative">
              <input
                id="input-afac-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition font-sans pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            id="btn-afac-login"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-xl cursor-pointer bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 shadow-cyan-500/25 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                <span>Verificando Credenciales...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Ingresar al Sistema Confidencial</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Legal Disclaimer Toggle */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShowDisclaimer(!showDisclaimer)}
            className="text-[11px] text-slate-500 hover:text-slate-400 underline transition cursor-pointer inline-flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            {showDisclaimer ? 'Ocultar aviso de confidencialidad' : 'Ver aviso de confidencialidad y términos de uso'}
          </button>

          {showDisclaimer && (
            <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 text-left leading-relaxed animate-in fade-in duration-200">
              <strong>AVISO DE SEGURIDAD Y CONFIDENCIALIDAD:</strong> Toda la información contenida en esta plataforma (rutas, flujos de pasajeros, frecuencias de vuelo y capacidades operativas del espacio aéreo mexicano) es para uso exclusivo del personal autorizado de la Agencia Federal de Aviación Civil (AFAC). Toda sesión, consulta y exportación queda registrada con fines de auditoría. El uso indebido será sancionado conforme a la legislación aplicable en materia de aviación civil y seguridad nacional.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
