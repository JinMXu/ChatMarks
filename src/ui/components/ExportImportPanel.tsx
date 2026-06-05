import { useState, useRef, useCallback } from 'preact/hooks';
import { useI18n } from '@/ui/hooks/useI18n';
import { exportToJsonBlob, exportToHtmlBlob, triggerDownload } from '@/shared/export-engine';
import type { ExportBookmarkNode } from '@/shared/export-engine';
import { previewImport, runImport } from '@/shared/import-engine';
import type { ImportPreview, ImportResult } from '@/shared/import-engine';

interface ExportImportPanelProps {
  onClose: () => void;
}

type Tab = 'export' | 'import';
type ExportPhase = 'idle' | 'preparing' | 'done' | 'error';
type ImportPhase = 'idle' | 'preview' | 'importing' | 'done' | 'error';

export default function ExportImportPanel({ onClose }: ExportImportPanelProps) {
  const { t, locale } = useI18n();
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const [tab, setTab] = useState<Tab>('export');

  // Export state
  const [exportPhase, setExportPhase] = useState<ExportPhase>('idle');
  const [exportBookmarkCount, setExportBookmarkCount] = useState(0);
  const [exportError, setExportError] = useState('');

  // Import state
  const [importPhase, setImportPhase] = useState<ImportPhase>('idle');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState('');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [selectedFileName, setSelectedFileName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetExport = () => {
    setExportPhase('idle');
    setExportBookmarkCount(0);
    setExportError('');
  };

  const resetImport = () => {
    setImportPhase('idle');
    setImportPreview(null);
    setImportResult(null);
    setImportError('');
    setImportProgress({ current: 0, total: 0 });
    setSelectedFileName('');
    setExpandedFolders(new Set());
  };

  const handleExport = async (format: 'json' | 'html') => {
    setExportPhase('preparing');
    setExportError('');
    try {
      const result = format === 'json' ? await exportToJsonBlob() : await exportToHtmlBlob();
      const ext = format === 'json' ? 'json' : 'html';
      const now = new Date().toISOString().slice(0, 10);
      triggerDownload(result.blob, `chatmarks-bookmarks-${now}.${ext}`);
      setExportBookmarkCount(result.bookmarkCount);
      setExportPhase('done');
    } catch (err) {
      setExportPhase('error');
      setExportError(String(err));
    }
  };

  const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const processFile = (file: File) => {
    setSelectedFileName(file.name);
    setImportError('');

    if (file.size > 50 * 1024 * 1024) {
      setImportPhase('error');
      setImportError(t('exportImport.fileTooLarge'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = reader.result as string;
        const preview = previewImport(content);
        setImportPreview(preview);
        setImportPhase('preview');

        const expanded = new Set<string>();
        const expandDeep = (nodes: ExportBookmarkNode[], depth: number) => {
          if (depth < 2) {
            for (const node of nodes) {
              if (node.children && node.children.length > 0) {
                expanded.add(node.id);
                expandDeep(node.children, depth + 1);
              }
            }
          }
        };
        expandDeep(preview.tree, 0);
        setExpandedFolders(expanded);
      } catch (err) {
        setImportPhase('error');
        setImportError(String(err));
      }
    };
    reader.onerror = () => {
      setImportPhase('error');
      setImportError(t('exportImport.parseError'));
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setImportPhase('importing');
    setImportError('');
    setImportProgress({ current: 0, total: 0 });

    try {
      const result = await runImport(
        importPreview.tree,
        importPreview.rootFolderName,
        (current, total) => setImportProgress({ current, total }),
      );
      setImportResult(result);
      setImportPhase('done');
    } catch (err) {
      setImportPhase('error');
      setImportError(String(err));
    }
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderPreviewNode = (node: ExportBookmarkNode, depth: number = 0) => {
    const isFolder = node.children && node.children.length > 0;
    const isExpanded = expandedFolders.has(node.id);

    if (isFolder) {
      return (
        <div key={node.id} class="cursor-default" style={{ paddingLeft: `${depth * 16}px` }}>
          <div class="flex items-center gap-1 py-1 px-2 cursor-pointer transition-colors duration-120 border-b border-border-light hover:bg-bg-hover" onClick={() => toggleFolder(node.id)}>
            <span class={`text-[10px] text-text-tertiary transition-transform duration-120 inline-block w-[14px] text-center shrink-0 ${isExpanded ? 'rotate-90' : ''}`}>&#9656;</span>
            <span class="text-sm shrink-0">&#128193;</span>
            <span class="text-sm font-medium text-text-primary truncate">{node.title}</span>
          </div>
          {isExpanded && node.children!.map((child) => renderPreviewNode(child, depth + 1))}
        </div>
      );
    }

    return (
      <div key={node.id} class="flex items-center gap-1 py-1 px-2 border-b border-border-light last:border-b-0" style={{ paddingLeft: `${depth * 16 + 22}px` }}>
        <span class="text-xs shrink-0 opacity-60">&#128278;</span>
        <span class="text-xs text-text-secondary truncate">{node.title}</span>
      </div>
    );
  };

  const getFileName = () => {
    if (selectedFileName) return selectedFileName;
    return t('exportImport.chooseFile');
  };

  return (
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center justify-between p-3 px-3 pt-3 pb-2 shrink-0">
        <h3 class="text-base font-bold tracking-[-0.01em] m-0">{t('exportImport.title')}</h3>
        <button class="btn-icon" onClick={onClose} title="Close">&times;</button>
      </div>

      {/* Tabs */}
      <div class="flex border-b border-border-light shrink-0 px-3">
        <button
          class={`flex-1 py-2 px-3 border-none bg-transparent cursor-pointer text-sm font-medium border-b-2 transition-colors duration-120 ${
            tab === 'export'
              ? 'text-accent border-accent font-semibold'
              : 'text-text-secondary border-transparent hover:text-text-primary'
          }`}
          onClick={() => setTab('export')}
        >
          {t('exportImport.exportTab')}
        </button>
        <button
          class={`flex-1 py-2 px-3 border-none bg-transparent cursor-pointer text-sm font-medium border-b-2 transition-colors duration-120 ${
            tab === 'import'
              ? 'text-accent border-accent font-semibold'
              : 'text-text-secondary border-transparent hover:text-text-primary'
          }`}
          onClick={() => setTab('import')}
        >
          {t('exportImport.importTab')}
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-3">
        {/* === Export Tab === */}
        {tab === 'export' && (
          <>
            {exportPhase === 'idle' && (
              <div class="flex flex-col items-center justify-center h-full gap-4 text-center">
                <p class="text-text-secondary text-sm leading-relaxed max-w-[280px]">{t('exportImport.exportDesc')}</p>
                <div class="flex flex-col gap-2 w-full max-w-[260px]">
                  <button
                    class="flex flex-col gap-1 p-3 px-4 border border-border rounded bg-bg-primary cursor-pointer transition-all duration-120 text-left hover:border-accent hover:shadow-xs"
                    onClick={() => handleExport('json')}
                  >
                    <span class="text-base font-semibold text-text-primary">{t('exportImport.jsonFormat')}</span>
                    <span class="text-xs text-text-tertiary">{t('exportImport.exportBtn')} (JSON)</span>
                  </button>
                  <button
                    class="flex flex-col gap-1 p-3 px-4 border border-border rounded bg-bg-primary cursor-pointer transition-all duration-120 text-left hover:border-accent hover:shadow-xs"
                    onClick={() => handleExport('html')}
                  >
                    <span class="text-base font-semibold text-text-primary">{t('exportImport.htmlFormat')}</span>
                    <span class="text-xs text-text-tertiary">{t('exportImport.exportBtn')} (HTML)</span>
                  </button>
                </div>
              </div>
            )}

            {exportPhase === 'preparing' && (
              <div class="flex flex-col items-center justify-center h-full gap-3">
                <div class="w-full h-1 bg-border rounded-full overflow-hidden">
                  <div class="organize-progress-fill" />
                </div>
                <p class="text-sm text-text-secondary text-center">{t('exportImport.preparing')}</p>
              </div>
            )}

            {exportPhase === 'done' && (
              <div class="flex flex-col items-center justify-center h-full gap-3 text-center">
                <p class="text-base text-success font-medium">{t('exportImport.exportDone', { n: exportBookmarkCount })}</p>
                <div class="flex items-center gap-2">
                  <button class="btn-primary" onClick={resetExport}>
                    {t('exportImport.exportAgain')}
                  </button>
                </div>
              </div>
            )}

            {exportPhase === 'error' && (
              <div class="flex flex-col items-center justify-center h-full gap-3">
                <p class="text-error text-sm text-center break-words leading-[1.5]">{t('exportImport.exportError', { error: exportError })}</p>
                <button class="btn-primary" onClick={resetExport}>
                  {t('exportImport.retry')}
                </button>
              </div>
            )}
          </>
        )}

        {/* === Import Tab === */}
        {tab === 'import' && (
          <>
            {importPhase === 'idle' && (
              <div class="flex flex-col items-center justify-center h-full gap-4 text-center">
                <p class="text-text-secondary text-sm leading-relaxed max-w-[280px]">{t('exportImport.importDesc')}</p>
                <div
                  class="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-border rounded cursor-pointer transition-all duration-120 w-full max-w-[280px] hover:border-accent hover:bg-accent-light"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <span class="text-[32px] opacity-60">&#128196;</span>
                  <span class="text-base font-medium text-text-primary">{t('exportImport.chooseFile')}</span>
                  <span class="text-xs text-text-tertiary">{t('exportImport.dropHint')}</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.html,.htm"
                  onChange={handleFileSelect}
                  class="hidden"
                />
              </div>
            )}

            {importPhase === 'preview' && importPreview && (
              <div class="flex flex-col gap-2">
                <p class="text-sm text-text-secondary m-0">
                  {t('exportImport.fileSelected', { name: selectedFileName })}
                </p>
                <p class="text-xs font-semibold text-accent bg-accent-light py-1 px-2 rounded-xs inline-block self-start">
                  {t('exportImport.formatDetected', { format: importPreview.format.toUpperCase() })}
                </p>
                <div class="flex gap-3 text-sm text-text-secondary">
                  <span>{t('exportImport.bookmarks', { n: importPreview.bookmarkCount })}</span>
                  <span>{t('exportImport.folders', { n: importPreview.folderCount })}</span>
                </div>
                <p class="text-sm text-text-secondary m-0 leading-[1.5]">
                  {t('exportImport.willImport', { count: importPreview.bookmarkCount })}
                  <strong class="text-text-primary">"{importPreview.rootFolderName}"</strong>
                </p>

                <div class="border border-border-light rounded overflow-y-auto max-h-[240px] bg-bg-secondary">
                  {importPreview.tree.map((node) => renderPreviewNode(node))}
                </div>

                <div class="flex items-center gap-2">
                  <button class="btn-primary" onClick={handleConfirmImport}>
                    {t('exportImport.confirmImport')}
                  </button>
                  <button class="btn-text" onClick={resetImport}>
                    {t('exportImport.cancel')}
                  </button>
                </div>
              </div>
            )}

            {importPhase === 'importing' && (
              <div class="flex flex-col items-center justify-center h-full gap-3">
                <div class="w-full h-1 bg-border rounded-full overflow-hidden">
                  <div class="organize-progress-fill" />
                </div>
                <p class="text-sm text-text-secondary text-center">
                  {importProgress.total > 0
                    ? t('exportImport.importingProgress', { current: importProgress.current, total: importProgress.total })
                    : t('exportImport.importing')}
                </p>
              </div>
            )}

            {importPhase === 'done' && importResult && (
              <div class="flex flex-col items-center justify-center h-full gap-3 text-center">
                <p class="text-base text-success font-medium">{t('exportImport.importDone', { imported: importResult.imported, skipped: importResult.skipped })}</p>
                {importResult.errors.length > 0 && (
                  <div class="flex flex-col gap-1 max-h-[150px] overflow-y-auto w-full">
                    {importResult.errors.map((err, i) => (
                      <p key={i} class="text-xs text-text-secondary break-words leading-[1.4] m-0">{err}</p>
                    ))}
                  </div>
                )}
                <div class="flex items-center gap-2">
                  <button class="btn-primary" onClick={resetImport}>
                    {t('exportImport.chooseAnother')}
                  </button>
                </div>
              </div>
            )}

            {importPhase === 'error' && (
              <div class="flex flex-col items-center justify-center h-full gap-3">
                <p class="text-error text-sm text-center break-words leading-[1.5]">{t('exportImport.importError', { error: importError })}</p>
                <div class="flex items-center gap-2">
                  <button class="btn-primary" onClick={resetImport}>
                    {t('exportImport.retry')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
