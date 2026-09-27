import React, { useState } from 'react';
import { Lock, Unlock, ShieldCheck, KeyRound, AlertCircle, X, CheckCircle2, ShieldAlert } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLogin: (pin: string) => Promise<boolean> | boolean;
  onLogout: () => void;
  onChangePin: (oldPin: string, newPin: string) => Promise<boolean> | boolean;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onLogin,
  onLogout,
  onChangePin,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Tab to change PIN
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!pinInput.trim()) {
      setErrorMsg('Por favor introduce la clave de acceso.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await onLogin(pinInput.trim());
      if (success) {
        setPinInput('');
        setSuccessMsg('Acceso concedido como Administrador.');
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 800);
      } else {
        setErrorMsg('Clave de acceso incorrecta. Inténtalo nuevamente.');
      }
    } catch {
      setErrorMsg('Error al verificar la clave. Inténtalo nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPin.trim() || !newPin.trim()) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    if (newPin.length < 4) {
      setErrorMsg('La nueva clave debe tener al menos 4 caracteres.');
      return;
    }

    if (newPin !== confirmNewPin) {
      setErrorMsg('La nueva clave y su confirmación no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await onChangePin(currentPin.trim(), newPin.trim());
      if (success) {
        setSuccessMsg('Clave de administrador actualizada correctamente en la nube.');
        setCurrentPin('');
        setNewPin('');
        setConfirmNewPin('');
        setIsChangingPin(false);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg('La clave actual no es correcta.');
      }
    } catch {
      setErrorMsg('Error al actualizar la clave en la nube.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isAdmin ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                {isAdmin ? 'Panel de Administrador' : 'Control de Acceso Administrador'}
              </h2>
              <p className="text-xs text-slate-400">
                {isAdmin
                  ? 'Sesión de administración activa'
                  : 'Ingresa la clave para desbloquear la carga de archivos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {!isAdmin ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Clave o PIN de Acceso:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Introduce la clave de administrador"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Clave inicial predeterminada:</span>
                  <span className="font-mono font-bold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    AFAC2026
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                  ¿Por qué se solicita clave?
                </div>
                <p>
                  Para proteger la integridad cartográfica, solo usuarios con clave de acceso pueden subir,
                  mapear o sustituir archivos Excel/CSV de rutas aéreas. Todos los demás usuarios pueden
                  explorar el mapa libremente.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5"
                >
                  {isLoading ? (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                  {isLoading ? 'Verificando...' : 'Desbloquear'}
                </button>
              </div>
            </form>
          ) : (
            /* Admin Active View */
            <div className="space-y-4">
              <div className="bg-emerald-950/25 border border-emerald-800/40 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-emerald-300">Sesión de Administrador Habilitada</div>
                  <p className="text-slate-300">
                    Tienes permisos completos para subir nuevos archivos Excel, mapear columnas,
                    descargar plantillas y actualizar las rutas del mapa.
                  </p>
                </div>
              </div>

              {!isChangingPin ? (
                <div className="space-y-2.5 pt-1">
                  <button
                    onClick={() => setIsChangingPin(true)}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 hover:border-cyan-500/40 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                    Cambiar Clave de Administrador
                  </button>

                  <button
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                    className="w-full py-2.5 px-3 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 rounded-xl text-xs font-semibold text-rose-200 flex items-center justify-center gap-2 transition"
                  >
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    Cerrar Sesión (Volver a Modo Visualizador)
                  </button>
                </div>
              ) : (
                /* Change PIN Form */
                <form onSubmit={handleChangePinSubmit} className="space-y-3 pt-1 border-t border-slate-800">
                  <div className="text-xs font-bold text-slate-200">Modificar Clave de Acceso</div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Clave actual:</label>
                    <input
                      type="password"
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Nueva clave:</label>
                    <input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Confirmar nueva clave:</label>
                    <input
                      type="password"
                      value={confirmNewPin}
                      onChange={(e) => setConfirmNewPin(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsChangingPin(false)}
                      className="flex-1 py-1.5 px-3 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-1.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition"
                    >
                      Guardar Clave
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
