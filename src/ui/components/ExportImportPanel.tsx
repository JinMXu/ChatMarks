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

        // Auto-expand first level of tree
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
        <div key={node.id} class="eit-folder" style={{ paddingLeft: `${depth * 16}px` }}>
          <div class="eit-folder-header" onClick={() => toggleFolder(node.id)}>
            <span class={`eit-folder-arrow ${isExpanded ? 'open' : ''}`}>&#9656;</span>
            <span class="eit-folder-icon">&#128193;</span>
            <span class="eit-folder-name">{node.title}</span>
          </div>
          {isExpanded && node.children!.map((child) => renderPreviewNode(child, depth + 1))}
        </div>
      );
    }

    return (
      <div key={node.id} class="eit-bookmark" style={{ paddingLeft: `${depth * 16 + 22}px` }}>
        <span class="eit-bookmark-icon">&#128278;</span>
        <span class="eit-bookmark-title">{node.title}</span>
      </div>
    );
  };

  const getFileName = () => {
    if (selectedFileName) return selectedFileName;
    return t('exportImport.chooseFile');
  };

  return (
    <div class="export-import-panel">
      <div class="export-import-header">
        <h3>{t('exportImport.title')}</h3>
        <button class="btn-icon" onClick={onClose} title="Close">&times;</button>
      </div>

      {/* Tabs */}
      <div class="export-import-tabs">
        <button
          class={`export-import-tab ${tab === 'export' ? 'active' : ''}`}
          onClick={() => setTab('export')}
        >
          {t('exportImport.exportTab')}
        </button>
        <button
          class={`export-import-tab ${tab === 'import' ? 'active' : ''}`}
          onClick={() => setTab('import')}
        >
          {t('exportImport.importTab')}
        </button>
      </div>

      <div class="export-import-body">
        {/* === Export Tab === */}
        {tab === 'export' && (
          <>
            {exportPhase === 'idle' && (
              <div class="export-import-idle">
                <p>{t('exportImport.exportDesc')}</p>
                <div class="export-import-format-select">
                  <button
                    class="export-import-format-option"
                    onClick={() => handleExport('json')}
                  >
                    <span class="eif-format-label">{t('exportImport.jsonFormat')}</span>
                    <span class="eif-format-desc">{t('exportImport.exportBtn')} (JSON)</span>
                  </button>
                  <button
                    class="export-import-format-option"
                    onClick={() => handleExport('html')}
                  >
                    <span class="eif-format-label">{t('exportImport.htmlFormat')}</span>
                    <span class="eif-format-desc">{t('exportImport.exportBtn')} (HTML)</span>
                  </button>
                </div>
              </div>
            )}

            {exportPhase === 'preparing' && (
              <div class="export-import-loading">
                <div class="organize-progress-bar">
                  <div class="organize-progress-fill" />
                </div>
                <p class="export-import-progress-text">{t('exportImport.preparing')}</p>
              </div>
            )}

            {exportPhase === 'done' && (
              <div class="export-import-done">
                <p>{t('exportImport.exportDone', { n: exportBookmarkCount })}</p>
                <div class="export-import-actions">
                  <button class="btn-primary" onClick={resetExport}>
                    {t('exportImport.exportAgain')}
                  </button>
                </div>
              </div>
            )}

            {exportPhase === 'error' && (
              <div class="export-import-error">
                <p>{t('exportImport.exportError', { error: exportError })}</p>
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
              <div class="export-import-idle">
                <p>{t('exportImport.importDesc')}</p>
                <div
                  class="export-import-file-picker"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <span class="eifp-icon">&#128196;</span>
                  <span class="eifp-text">{t('exportImport.chooseFile')}</span>
                  <span class="eifp-hint">{t('exportImport.dropHint')}</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.html,.htm"
                  onChange={handleFileSelect}
                  class="export-import-file-input-hidden"
                />
              </div>
            )}

            {importPhase === 'preview' && importPreview && (
              <div class="export-import-preview">
                <p class="export-import-file-selected">
                  {t('exportImport.fileSelected', { name: selectedFileName })}
                </p>
                <p class="export-import-format-badge">
                  {t('exportImport.formatDetected', { format: importPreview.format.toUpperCase() })}
                </p>
                <div class="export-import-counts">
                  <span>{t('exportImport.bookmarks', { n: importPreview.bookmarkCount })}</span>
                  <span>{t('exportImport.folders', { n: importPreview.folderCount })}</span>
                </div>
                <p class="export-import-will-import">
                  {t('exportImport.willImport', { count: importPreview.bookmarkCount })}
                  <strong>"{importPreview.rootFolderName}"</strong>
                </p>

                <div class="export-import-tree">
                  {importPreview.tree.map((node) => renderPreviewNode(node))}
                </div>

                <div class="export-import-actions">
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
              <div class="export-import-loading">
                <div class="organize-progress-bar">
                  <div class="organize-progress-fill" />
                </div>
                <p class="export-import-progress-text">
                  {importProgress.total > 0
                    ? t('exportImport.importingProgress', { current: importProgress.current, total: importProgress.total })
                    : t('exportImport.importing')}
                </p>
              </div>
            )}

            {importPhase === 'done' && importResult && (
              <div class="export-import-done">
                <p>{t('exportImport.importDone', { imported: importResult.imported, skipped: importResult.skipped })}</p>
                {importResult.errors.length > 0 && (
                  <div class="export-import-results">
                    {importResult.errors.map((err, i) => (
                      <p key={i} class="export-import-result-item">{err}</p>
                    ))}
                  </div>
                )}
                <div class="export-import-actions">
                  <button class="btn-primary" onClick={resetImport}>
                    {t('exportImport.chooseAnother')}
                  </button>
                </div>
              </div>
            )}

            {importPhase === 'error' && (
              <div class="export-import-error">
                <p>{t('exportImport.importError', { error: importError })}</p>
                <div class="export-import-actions">
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
