import React, { useState, useEffect } from 'react';
import { ColumnMapping, ParsedFileResult } from '../types';
import { Columns, CheckCircle2, AlertCircle, X, Layers, CheckSquare, Square, FileSpreadsheet } from 'lucide-react';

interface ColumnMapperModalProps {
  headers: string[];
  initialMapping: ColumnMapping;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mapping: ColumnMapping, selectedSheets?: string[]) => void;
  parsedResult?: ParsedFileResult | null;
}

export const ColumnMapperModal: React.FC<ColumnMapperModalProps> = ({
  headers,
  initialMapping,
  fileName,
  isOpen,
  onClose,
  onConfirm,
  parsedResult,
}) => {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping);
  const [selectedSheetNames, setSelectedSheetNames] = useState<string[]>([]);
  const [activeSheetTab, setActiveSheetTab] = useState<string>('');

  useEffect(() => {
    setMapping(initialMapping);
    if (parsedResult && parsedResult.sheets.length > 0) {
      setSelectedSheetNames(parsedResult.sheets.map((s) => s.name));
      setActiveSheetTab(parsedResult.sheets[0].name);
    }
  }, [initialMapping, parsedResult, isOpen]);

  if (!isOpen) return null;

  const currentSheet = parsedResult?.sheets.find((s) => s.name === activeSheetTab);
  const currentHeaders = currentSheet ? currentSheet.headers : headers;

  const handleChange = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value === '__NONE__' ? undefined : value,
    }));
  };

  const handleToggleSheet = (sheetName: string) => {
    setSelectedSheetNames((prev) =>
      prev.includes(sheetName)
        ? prev.filter((s) => s !== sheetName)
        : [...prev, sheetName]
    );
  };

  const handleSelectAllSheets = (select: boolean) => {
    if (!parsedResult) return;
    if (select) {
      setSelectedSheetNames(parsedResult.sheets.map((s) => s.name));
    } else {
      setSelectedSheetNames([]);
    }
  };

  const handleSave = () => {
    onConfirm(mapping, selectedSheetNames.length > 0 ? selectedSheetNames : undefined);
  };

  const requiredFields: { key: keyof ColumnMapping; label: string; desc: string }[] = [
    { key: 'originCode', label: 'Código IATA Origen', desc: 'Ej: MEX, CUN, GDL (Obligatorio)' },
    { key: 'destCode', label: 'Código IATA Destino', desc: 'Ej: TIJ, MTY, MID (Obligatorio)' },
    { key: 'originLat', label: 'Latitud Origen', desc: 'Ej: 19.4363' },
    { key: 'originLng', label: 'Longitud Origen', desc: 'Ej: -99.0721' },
    { key: 'destLat', label: 'Latitud Destino', desc: 'Ej: 21.0365' },
    { key: 'destLng', label: 'Longitud Destino', desc: 'Ej: -86.8771' },
  ];

  const optionalFields: { key: keyof ColumnMapping; label: string; desc: string }[] = [
    { key: 'originName', label: 'Nombre Aeropuerto Origen', desc: 'Ej: Benito Juárez' },
    { key: 'destName', label: 'Nombre Aeropuerto Destino', desc: 'Ej: Aeropuerto Cancún' },
    { key: 'airline', label: 'Aerolínea autorizada', desc: 'Ej: Aerovías de México, Concesionaria Vuela' },
    { key: 'authorizationDate', label: 'Fecha de Autorización', desc: 'Ej: 15/03/2016, 2021-06-30' },
  ];

  const hasMultipleSheets = parsedResult && parsedResult.sheets.length > 1;

  return (
    <div className="fixed inset-0 z-[1500] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
              <Columns className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Mapeo de Columnas y Pestañas Excel</h2>
              <p className="text-xs text-slate-400">
                Archivo: <span className="text-cyan-300 font-mono">{fileName}</span>
                {hasMultipleSheets && (
                  <span className="ml-2 text-[11px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-800">
                    {parsedResult.sheets.length} pestañas detectadas
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Multi-Sheet Selection Section (if multiple sheets exist) */}
          {hasMultipleSheets && (
            <div className="bg-slate-950/70 border border-cyan-900/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  <span>Pestañas (Aerolíneas) a incluir en el mapa:</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleSelectAllSheets(true)}
                    className="text-cyan-400 hover:text-cyan-300 underline font-medium"
                  >
                    Seleccionar todas
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAllSheets(false)}
                    className="text-slate-400 hover:text-slate-200 underline font-medium"
                  >
                    Deseleccionar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {parsedResult.sheets.map((sheet) => {
                  const isChecked = selectedSheetNames.includes(sheet.name);
                  const isCurrent = activeSheetTab === sheet.name;
                  return (
                    <div
                      key={sheet.name}
                      onClick={() => handleToggleSheet(sheet.name)}
                      className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition text-xs ${
                        isChecked
                          ? 'bg-cyan-950/40 border-cyan-700/60 text-slate-200'
                          : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span className="truncate font-medium" title={sheet.name}>
                          {sheet.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">
                        {sheet.rows.length}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-cyan-300/80 bg-cyan-950/30 p-2 rounded-lg border border-cyan-800/30">
                💡 <strong>Diferenciación automática:</strong> El nombre de cada pestaña se asignará automáticamente como aerolínea autorizada si la columna de aerolínea no está presente.
              </p>
            </div>
          )}

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-start gap-2.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              El sistema ha auto-detectado las columnas más probables. Si las coordenadas están vacías para códigos IATA oficiales de México (ej. MEX, CUN, GDL), el catálogo GIS las asignará automáticamente.
            </p>
          </div>

          {/* Required Columns */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Columnas de Rutas y Coordenadas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {requiredFields.map((field) => (
                <div key={field.key} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <label className="block font-semibold text-slate-200 mb-1">
                    {field.label}
                  </label>
                  <select
                    value={mapping[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {currentHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">{field.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Columns */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
              Columnas Opcionales y Métricas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {optionalFields.map((field) => (
                <div key={field.key} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <label className="block font-medium text-slate-300 mb-1">
                    {field.label}
                  </label>
                  <select
                    value={mapping[field.key] || '__NONE__'}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
                  >
                    <option value="__NONE__">-- Ninguna / No incluida --</option>
                    {currentHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">{field.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-950/50">
          <div className="text-xs text-slate-400">
            {hasMultipleSheets && (
              <span>
                Pestañas activas: <strong className="text-cyan-400">{selectedSheetNames.length}</strong> de {parsedResult.sheets.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={hasMultipleSheets && selectedSheetNames.length === 0}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Aplicar y Procesar Rutas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

