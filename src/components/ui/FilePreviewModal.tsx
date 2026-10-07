import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { renderAsync } from 'docx-preview';
import { Loader2, AlertTriangle, ExternalLink, FileText, FileSpreadsheet } from 'lucide-react';
import { FormModal, FormModalHeader, FormModalBody } from './FormModal';
import { cn } from '../../utils/helpers';

type PreviewableFileType = 'pdf' | 'excel' | 'word' | 'unsupported';

const getFileType = (nameOrUrl: string): PreviewableFileType => {
  const ext = (nameOrUrl.split(/[?#]/)[0].split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'excel';
  if (['docx', 'doc'].includes(ext)) return 'word';
  return 'unsupported';
};

interface FilePreviewModalProps {
  open: boolean;
  url: string;
  name: string;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ open, url, name, onClose }) => {
  const { t } = useTranslation();
  const fileType = getFileType(name || url);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sheets, setSheets] = useState<{ name: string; html: string }[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setStatus('loading');
    setSheets([]);
    setActiveSheet(0);
    let cancelled = false;

    if (fileType === 'pdf') {
      setStatus('ready');
      return;
    }

    if (fileType === 'excel') {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error('fetch failed');
          return res.arrayBuffer();
        })
        .then((buf) => {
          if (cancelled) return;
          const workbook = XLSX.read(buf, { type: 'array' });
          const parsedSheets = workbook.SheetNames.map((sheetName) => ({
            name: sheetName,
            html: XLSX.utils.sheet_to_html(workbook.Sheets[sheetName]),
          }));
          setSheets(parsedSheets);
          setStatus('ready');
        })
        .catch(() => {
          if (!cancelled) setStatus('error');
        });
      return () => {
        cancelled = true;
      };
    }

    if (fileType === 'word') {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error('fetch failed');
          return res.blob();
        })
        .then(async (blob) => {
          if (cancelled || !docxContainerRef.current) return;
          docxContainerRef.current.innerHTML = '';
          await renderAsync(blob, docxContainerRef.current, undefined, {
            className: 'docx-preview-content',
            inWrapper: true,
          });
          if (!cancelled) setStatus('ready');
        })
        .catch(() => {
          if (!cancelled) setStatus('error');
        });
      return () => {
        cancelled = true;
      };
    }

    setStatus('error');
    return undefined;
  }, [open, url, fileType]);

  if (!open) return null;

  return (
    <FormModal open={open} onCancel={onClose} width="80vw" top={24}>
      <FormModalHeader
        title={name}
        icon={fileType === 'excel' ? <FileSpreadsheet size={20} className="text-white" /> : <FileText size={20} className="text-white" />}
        iconClassName={
          fileType === 'pdf'
            ? 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_4px_10px_-2px_rgba(239,68,68,0.5)]'
            : fileType === 'excel'
              ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_4px_10px_-2px_rgba(16,185,129,0.5)]'
              : 'bg-gradient-to-br from-blue-400 to-blue-500 shadow-[0_4px_10px_-2px_rgba(59,130,246,0.5)]'
        }
        onClose={onClose}
      />

      <FormModalBody className="!p-0 relative">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-6 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 text-12 font-medium text-slate-600 dark:text-slate-300 shadow-sm hover:border-[#00529C] hover:text-[#00529C] dark:hover:text-blue-400 transition-colors"
        >
          <ExternalLink size={13} />
          {t('file_preview.open_new_tab')}
        </a>

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-2.5 py-24 text-slate-400 dark:text-slate-500">
            <Loader2 size={26} className="animate-spin" />
            <span className="text-13">{t('file_preview.loading')}</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center gap-2.5 py-24 text-center px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500">
              <AlertTriangle size={24} />
            </div>
            <p className="text-13 text-slate-500 dark:text-slate-400 max-w-sm">{t('file_preview.unavailable')}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-13 font-medium text-[#00529C] dark:text-blue-400 hover:underline"
            >
              {t('file_preview.open_new_tab')}
            </a>
          </div>
        )}

        {fileType === 'pdf' && status === 'ready' && (
          <iframe src={url} title={name} className="w-full border-0" style={{ height: 'calc(100vh - 140px)' }} />
        )}

        {fileType === 'excel' && status === 'ready' && (
          <div className="flex flex-col h-full">
            {sheets.length > 1 && (
              <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                {sheets.map((sheet, idx) => (
                  <button
                    key={sheet.name}
                    type="button"
                    onClick={() => setActiveSheet(idx)}
                    className={cn(
                      'px-3 py-1 rounded-full text-12 font-medium border transition-colors cursor-pointer',
                      idx === activeSheet
                        ? 'border-[#00529C] bg-blue-50 text-[#00529C] dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#00529C]/40'
                    )}
                  >
                    {sheet.name}
                  </button>
                ))}
              </div>
            )}
            <div
              className="flex-1 overflow-auto p-4 [&_table]:border-collapse [&_table]:text-12 [&_td]:border [&_td]:border-slate-200 [&_td]:dark:border-slate-700 [&_td]:px-2 [&_td]:py-1 [&_td]:whitespace-nowrap [&_td]:text-slate-700 [&_td]:dark:text-slate-200"
              dangerouslySetInnerHTML={{ __html: sheets[activeSheet]?.html || '' }}
            />
          </div>
        )}

        <div
          ref={docxContainerRef}
          className={cn(
            'p-6 overflow-auto',
            fileType === 'word' ? 'block' : 'hidden',
            status !== 'ready' && 'invisible h-0 overflow-hidden p-0'
          )}
          style={{ maxHeight: 'calc(100vh - 140px)' }}
        />
      </FormModalBody>
    </FormModal>
  );
};

export default FilePreviewModal;
