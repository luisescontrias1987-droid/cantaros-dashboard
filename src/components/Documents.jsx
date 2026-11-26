// Documentos: subir a Supabase Storage (bucket "documentos"), ver,
// descargar y eliminar con PIN 2026.
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Eye, FileText, Trash2, Upload } from 'lucide-react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { PinModal, SectionTitle } from './ui.jsx';

const CATEGORIES = ['Manual', 'Ficha técnica', 'Menú', 'Guía', 'Otro'];

export default function Documents({ query }) {
  const d = useDashboard();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Manual');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [pinTarget, setPinTarget] = useState(null);
  const [pinError, setPinError] = useState('');

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return d.docs;
    return d.docs.filter(
      (x) =>
        String(x.title || '').toLowerCase().includes(q) ||
        String(x.category || '').toLowerCase().includes(q) ||
        String(x.note || '').toLowerCase().includes(q),
    );
  }, [d.docs, query]);

  const submit = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      setStatus('Elige un archivo y escribe un título.');
      return;
    }
    setBusy(true);
    setStatus('Subiendo…');
    try {
      await d.uploadDoc({ file, title: title.trim(), category, note: note.trim() });
      setStatus('Documento subido: ' + title.trim() + '.');
      setFile(null);
      setTitle('');
      setNote('');
      e.target.reset();
    } catch (err) {
      if (err.message === 'BUCKET_MISSING') {
        setStatus(
          'El bucket "documentos" no existe en Supabase Storage. Corre el SQL Supabase-Cantaros-Documentos-Storage.sql en el SQL Editor de Supabase y vuelve a intentar.',
        );
      } else {
        setStatus('No se pudo subir: ' + (err.message || err));
      }
    }
    setBusy(false);
  };

  const confirmDelete = async (pin) => {
    if (pin !== '2026') {
      setPinError('PIN incorrecto.');
      return;
    }
    setPinError('');
    const target = pinTarget;
    setPinTarget(null);
    setBusy(true);
    try {
      await d.deleteDoc({ id: target.id, filePath: target.file_path });
      setStatus('Documento eliminado: ' + target.title + '.');
    } catch (err) {
      setStatus('No se pudo eliminar: ' + (err.message || err));
    }
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-3xl p-4 sm:p-5">
        <SectionTitle title="Subir documento" subtitle="Manuales, fichas técnicas, menú y guías. Se guardan en Supabase Storage y se ven desde aquí." />
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Archivo</span>
            <input type="file" onChange={(e) => setFile(e.target.files && e.target.files[0])} className="input mt-1" required />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Título</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input mt-1" placeholder="Ej. Manual de capacitación" required />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Categoría</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input mt-1">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nota (opcional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="input mt-1" placeholder="Ej. Versión noviembre 2026" />
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" className="btn-primary" disabled={busy}>
              <Upload size={16} /> Subir documento
            </button>
          </div>
        </form>
        {status && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{status}</p>}
      </div>

      <div>
        <SectionTitle title="Documentos" subtitle={filtered.length + ' documento(s) guardado(s)'} />
        {filtered.length ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
            {filtered.map((doc, i) => (
              <motion.article
                key={doc.id}
                className="glass-card rounded-3xl p-4 flex flex-col"
                whileHover={{ y: -5 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-300">
                    <FileText size={19} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white leading-snug">{doc.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{doc.category || 'Sin categoría'}</p>
                  </div>
                </div>
                {doc.note && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{doc.note}</p>}
                <div className="mt-3 flex flex-wrap gap-2 pt-1 mt-auto">
                  {doc.file_url ? (
                    <>
                      <a href={doc.file_url} target="_blank" rel="noreferrer" className="btn-secondary">
                        <Eye size={15} /> Ver
                      </a>
                      <a href={doc.file_url} download className="btn-secondary">
                        <Download size={15} /> Descargar
                      </a>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 py-2">Sin archivo adjunto</span>
                  )}
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => {
                      setPinError('');
                      setPinTarget(doc);
                    }}
                    disabled={busy}
                  >
                    <Trash2 size={15} /> Eliminar
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Sin documentos todavía. Sube el primero con el formulario de arriba.</p>
        )}
      </div>

      <PinModal
        open={!!pinTarget}
        title="Eliminar documento"
        message={pinTarget ? '¿Eliminar "' + pinTarget.title + '"? Se borra el archivo y el registro. Escribe el PIN 2026 para confirmar.' : ''}
        error={pinError}
        onCancel={() => setPinTarget(null)}
        onOk={confirmDelete}
      />
    </div>
  );
}
