import React, { Suspense, lazy, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, X, Upload as UploadIcon, FileUp, Eye } from 'lucide-react';
import { toast } from '../../store/toastStore';
import { resolveAttachmentUrl } from '../../utils/helpers';
import { isImageFile, isPreviewableDocFile } from '../../utils/fileType';

const AppLightbox = lazy(() => import('./AppLightbox'));
const FilePreviewModal = lazy(() => import('./FilePreviewModal'));

export interface AttachmentFile {
  id: string;
  name: string;
  size: number;
  file?: File;
  url?: string;
}

interface FileAttachmentInputProps {
  files: AttachmentFile[];
  onChange: (files: AttachmentFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const useFilePreviewUrls = (files: AttachmentFile[]) => {
  const cacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const cache = cacheRef.current;
    const liveIds = new Set(files.map((f) => f.id));
    cache.forEach((url, id) => {
      if (!liveIds.has(id)) {
        URL.revokeObjectURL(url);
        cache.delete(id);
      }
    });
  }, [files]);

  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, []);

  return useMemo(() => {
    const cache = cacheRef.current;
    const map = new Map<string, string>();
    files.forEach((f) => {
      if (f.url) {
        map.set(f.id, resolveAttachmentUrl(f.url));
        return;
      }
      if (f.file) {
        let objectUrl = cache.get(f.id);
        if (!objectUrl) {
          objectUrl = URL.createObjectURL(f.file);
          cache.set(f.id, objectUrl);
        }
        map.set(f.id, objectUrl);
      }
    });
    return map;
  }, [files]);
};

export const FileAttachmentInput: React.FC<FileAttachmentInputProps> = ({
  files,
  onChange,
  disabled,
  maxFiles = 5,
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useFilePreviewUrls(files);

  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = React.useState<AttachmentFile | null>(null);

  const imageFiles = useMemo(() => files.filter((f) => isImageFile(f.name) && previewUrls.get(f.id)), [files, previewUrls]);
  const imageSlides = useMemo(
    () => imageFiles.map((f) => ({ src: previewUrls.get(f.id) || '', alt: f.name, title: f.name })),
    [imageFiles, previewUrls]
  );

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const remainingSlots = maxFiles - files.length;
    if (remainingSlots <= 0) {
      toast.warning(t('file_attachment.toast_max_reached', { max: maxFiles }));
      return;
    }

    const incoming = Array.from(fileList);
    if (incoming.length > remainingSlots) {
      toast.warning(t('file_attachment.toast_truncated', { max: maxFiles, remaining: remainingSlots }));
    }

    const pickedFiles = incoming.slice(0, remainingSlots);
    const picked: AttachmentFile[] = pickedFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      size: file.size,
      file,
    }));

    onChange([...files, ...picked]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (id: string) => onChange(files.filter((f) => f.id !== id));

  const handlePreview = (f: AttachmentFile) => {
    const url = previewUrls.get(f.id);
    if (!url) return;
    if (isImageFile(f.name)) {
      const idx = imageFiles.findIndex((img) => img.id === f.id);
      if (idx >= 0) setLightboxIndex(idx);
      return;
    }
    if (isPreviewableDocFile(f.name)) {
      setPreviewDoc(f);
    }
  };

  const isMax = files.length >= maxFiles;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Upload Dropzone Header Box */}
      <button
        type="button"
        disabled={disabled || isMax}
        onClick={() => inputRef.current?.click()}
        className={`group relative flex items-center gap-3 w-full p-3 rounded-2xl border border-dashed text-left transition-all duration-200 ${
          isMax
            ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-60 cursor-not-allowed'
            : 'border-blue-200/90 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 hover:border-[#00529C] dark:hover:border-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 cursor-pointer'
        }`}
      >
        <div className="w-10 h-10 rounded-xl bg-[#00529C]/10 dark:bg-blue-400/15 flex items-center justify-center shrink-0 text-[#00529C] dark:text-blue-400">
          <UploadIcon size={18} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-13 font-semibold text-slate-800 dark:text-slate-100">
            {t('file_attachment.dropzone_title')}
          </span>
          <span className="text-11 text-slate-400 dark:text-slate-500 truncate">
            {t('file_attachment.dropzone_hint', { max: maxFiles })}
          </span>
        </div>
        <span className="text-xs font-semibold text-[#00529C] dark:text-blue-400 shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs">
          {files.length}/{maxFiles}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {/* List of uploaded files or empty state */}
      {files.length === 0 ? (
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-1.5 py-4 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
        >
          <FileUp size={22} className="text-slate-300 dark:text-slate-600" />
          <span className="text-12 font-medium text-slate-500 dark:text-slate-400">
            {t('file_attachment.empty_title')}
          </span>
          <span className="text-11 text-slate-400 dark:text-slate-500">
            {t('file_attachment.empty_hint')}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {files.map((f) => {
            const previewUrl = previewUrls.get(f.id);
            const isImage = isImageFile(f.name);
            const isPreviewable = !!previewUrl && (isImage || isPreviewableDocFile(f.name));

            return (
              <div
                key={f.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
              >
                {isPreviewable ? (
                  <button
                    type="button"
                    onClick={() => handlePreview(f)}
                    className="flex flex-1 min-w-0 items-center gap-2.5 cursor-pointer text-left"
                  >
                    {isImage ? (
                      <img
                        src={previewUrl}
                        alt={f.name}
                        referrerPolicy="no-referrer"
                        className="h-7 w-7 shrink-0 rounded-md object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <Paperclip size={14} className="shrink-0 text-[#00529C] dark:text-blue-400" />
                    )}
                    <span className="flex-1 min-w-0 truncate text-13 font-medium text-slate-700 dark:text-slate-200">
                      {f.name}
                    </span>
                    <span className="shrink-0 text-11 text-slate-400 dark:text-slate-500">{formatSize(f.size)}</span>
                    <Eye size={13} className="shrink-0 text-slate-400" />
                  </button>
                ) : (
                  <div className="flex flex-1 min-w-0 items-center gap-2.5">
                    <Paperclip size={14} className="shrink-0 text-[#00529C] dark:text-blue-400" />
                    <span className="flex-1 min-w-0 truncate text-13 font-medium text-slate-700 dark:text-slate-200">
                      {f.name}
                    </span>
                    <span className="shrink-0 text-11 text-slate-400 dark:text-slate-500">{formatSize(f.size)}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(f.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-slate-400 cursor-pointer hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {lightboxIndex !== null && (
        <Suspense fallback={null}>
          <AppLightbox index={lightboxIndex} slides={imageSlides} onClose={() => setLightboxIndex(null)} />
        </Suspense>
      )}

      {previewDoc && (
        <Suspense fallback={null}>
          <FilePreviewModal
            open
            url={previewUrls.get(previewDoc.id) || ''}
            name={previewDoc.name}
            onClose={() => setPreviewDoc(null)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default FileAttachmentInput;
