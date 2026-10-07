import { toast } from '../../../../store/toastStore';
import { useThemeStore } from '../../../../store/themeStore';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Modal, Form, Input, Select, Segmented, Empty, Tooltip, Switch } from 'antd';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import CodeMirror from '@uiw/react-codemirror';
import { html as htmlLang } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { Search, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useAvailableKeysQuery,
  useTemplateParamsQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
} from '../hooks/useNotificationTemplateQueries';
import type { INotificationTemplate } from '../../types';
import {
  FormModal,
  FormModalHeader,
  FormModalBody,
  FormSectionCard,
  FormModalFooter,
  formFieldLabel as fieldLabel,
  formInputClass as inputClass,
} from '../../../../components/ui/FormModal';
import { getApiErrorMessage } from '../../../../utils/helpers';
import { QUILL_FONT_OPTIONS } from '../../../../utils/quillConfig';

interface NotificationTemplateModalProps {
  open: boolean;
  onClose: () => void;
  editingRecord: INotificationTemplate | null;
}

type EditorMode = 'visual' | 'html' | 'preview';

const FULL_HTML_DOCUMENT_RE = /<!DOCTYPE|<html[\s>]|<head[\s>]/i;
const isFullHtmlDocument = (html: string) => FULL_HTML_DOCUMENT_RE.test(html);

export const NotificationTemplateModal: React.FC<NotificationTemplateModalProps> = ({
  open,
  onClose,
  editingRecord,
}) => {
  const { t } = useTranslation();
  const { themeMode } = useThemeStore();
  const [form] = Form.useForm();
  const [body, setBody] = useState('');
  const [editorMode, setEditorMode] = useState<EditorMode>('html');
  const [paramSearch, setParamSearch] = useState('');
  const quillRef = useRef<ReactQuill>(null);

  const { data: availableKeys = [], isLoading: keysLoading } = useAvailableKeysQuery();
  const { data: params = [] } = useTemplateParamsQuery();
  const createMutation = useCreateTemplateMutation();
  const updateMutation = useUpdateTemplateMutation();

  const isEditing = !!editingRecord;
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      if (editingRecord) {
        form.setFieldsValue({
          code: editingRecord.code,
          subject: editingRecord.subject,
          isActive: editingRecord.isActive !== false,
        });
        setBody(editingRecord.body || '');
      } else {
        form.resetFields();
        form.setFieldsValue({ isActive: true });
        setBody('');
      }
      setEditorMode('html');
    }
  }, [open, editingRecord, form]);

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }, { font: QUILL_FONT_OPTIONS }, { size: [] }],
      ['bold', 'italic', 'underline', 'strike', { color: [] }, { background: [] }],
      [{ script: 'sub' }, { script: 'super' }, { list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }, { align: [] }, { direction: 'rtl' }],
      ['blockquote', 'code-block', 'link', 'image', 'video'],
      ['clean'],
    ],
  }), []);

  const filteredParams = useMemo(() => {
    if (!paramSearch.trim()) return params;
    const q = paramSearch.toLowerCase();
    return params.filter((p) => p.key.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }, [params, paramSearch]);

  const insertParam = (key: string) => {
    const token = `{{${key}}}`;
    if (editorMode === 'visual') {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        const range = editor.getSelection(true);
        const index = range ? range.index : editor.getLength();
        editor.insertText(index, token);
        editor.setSelection(index + token.length, 0);
        setBody(editor.root.innerHTML);
        return;
      }
    }
    setBody((prev) => prev + token);
  };

  const copyParam = (key: string) => {
    const token = `{{${key}}}`;
    navigator.clipboard.writeText(token);
    toast.success(t('notification_template.modal.toast_copy', { token }));
  };

  const bodyIsFullHtmlDocument = useMemo(() => isFullHtmlDocument(body), [body]);

  const handleModeChange = (mode: EditorMode) => {
    if (mode === 'visual' && bodyIsFullHtmlDocument) {
      toast.error(t('notification_template.modal.visual_unsupported_full_html'));
      return;
    }

    if (editorMode === 'html' && mode === 'visual') {
      Modal.confirm({
        title: t('notification_template.modal.confirm_switch_title'),
        content: t('notification_template.modal.confirm_switch_content'),
        okText: t('notification_template.modal.confirm_switch_ok'),
        cancelText: t('notification_template.modal.confirm_switch_cancel'),
        onOk: () => setEditorMode('visual'),
      });
      return;
    }
    setEditorMode(mode);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        code: values.code,
        subject: values.subject,
        body,
        isActive: values.isActive ?? true,
      };

      if (isEditing && editingRecord) {
        updateMutation.mutate(
          { id: editingRecord.id, data: payload },
          {
            onSuccess: () => {
              toast.success(t('notification_template.modal.toast_update_success'));
              onClose();
            },
            onError: (err: any) => toast.error(t('notification_template.modal.toast_update_error', { error: getApiErrorMessage(err) || t('notification_template.modal.update_error_default') })),
          }
        );
      } else {
        createMutation.mutate(payload, {
          onSuccess: () => {
            toast.success(t('notification_template.modal.toast_create_success'));
            onClose();
          },
          onError: (err: any) => toast.error(t('notification_template.modal.toast_create_error', { error: getApiErrorMessage(err) || t('notification_template.modal.create_error_default') })),
        });
      }
    } catch {
    }
  };

  return (
    <FormModal open={open} onCancel={onClose} width={1200}>
      <FormModalHeader
        title={isEditing ? t('notification_template.modal.edit_title') : t('notification_template.modal.add_title')}
        subtitle={t('notification_template.modal.subtitle')}
        onClose={onClose}
      />

      <FormModalBody>
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          <FormSectionCard number={1} title={t('notification_template.modal.section_content')} className="flex-1 min-w-0">
            <Form form={form} layout="vertical" className="flex flex-col gap-1">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                <div className="sm:col-span-5">
                  <Form.Item
                    name="code"
                    label={fieldLabel(t('notification_template.modal.name_label'))}
                    rules={[{ required: true, message: t('notification_template.modal.name_required') }]}
                    className="mb-0"
                  >
                    <Select
                      placeholder={t('notification_template.modal.name_placeholder')}
                      disabled={isEditing}
                      loading={keysLoading}
                      options={availableKeys.map((k) => ({ value: k.code, label: k.name }))}
                      showSearch
                      optionFilterProp="label"
                      className="h-10"
                    />
                  </Form.Item>
                </div>
                <div className="sm:col-span-5">
                  <Form.Item
                    name="subject"
                    label={fieldLabel(t('notification_template.modal.subject_label'))}
                    rules={[{ required: true, message: t('notification_template.modal.subject_required') }]}
                    className="mb-0"
                  >
                    <Input placeholder={t('notification_template.modal.subject_placeholder')} className={inputClass} />
                  </Form.Item>
                </div>
                <div className="sm:col-span-2 flex flex-col justify-end">
                  <Form.Item
                    name="isActive"
                    valuePropName="checked"
                    label={fieldLabel(t('notification_template.modal.status_label'))}
                    className="mb-0"
                  >
                    <Switch />
                  </Form.Item>
                </div>
              </div>
            </Form>

            <div className="flex flex-col gap-2 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('notification_template.modal.body_label')}</span>
                <Segmented
                  value={editorMode}
                  onChange={(v) => handleModeChange(v as EditorMode)}
                  options={[
                    {
                      label: bodyIsFullHtmlDocument ? (
                        <Tooltip title={t('notification_template.modal.visual_unsupported_full_html')}>
                          <span>{t('notification_template.modal.mode_visual')}</span>
                        </Tooltip>
                      ) : t('notification_template.modal.mode_visual'),
                      value: 'visual',
                      disabled: bodyIsFullHtmlDocument,
                    },
                    { label: t('notification_template.modal.mode_html'), value: 'html' },
                    { label: t('notification_template.modal.mode_preview'), value: 'preview' },
                  ]}
                />
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden" style={{ height: 340 }}>
                {editorMode === 'visual' && (
                  <ReactQuill ref={quillRef} theme="snow" value={body} onChange={setBody} modules={quillModules} style={{ height: 300 }} />
                )}
                {editorMode === 'html' && (
                  <CodeMirror
                    value={body}
                    onChange={setBody}
                    height="100%"
                    theme={themeMode === 'dark' ? oneDark : 'light'}
                    extensions={[htmlLang()]}
                    basicSetup={{ foldGutter: true, autocompletion: true }}
                    className="h-full text-xs [&_.cm-editor]:h-full [&_.cm-scroller]:font-mono"
                  />
                )}
                {editorMode === 'preview' && (
                  <iframe title="preview" srcDoc={body} className="w-full h-full border-0 bg-white" sandbox="" />
                )}
              </div>
            </div>
          </FormSectionCard>

          <FormSectionCard number={2} title={t('notification_template.modal.params_label')} className="lg:w-[300px] lg:shrink-0">
            <div className="flex flex-col gap-2">
              <Input
                placeholder={t('notification_template.modal.params_search_placeholder')}
                prefix={<Search size={14} className="text-slate-400" />}
                value={paramSearch}
                onChange={(e) => setParamSearch(e.target.value)}
                allowClear
                className={inputClass}
              />
              <div className="flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: 420 }}>
                {filteredParams.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<span className="text-xs text-slate-400">{t('notification_template.modal.params_empty')}</span>}
                  />
                ) : (
                  filteredParams.map((p) => (
                    <div
                      key={p.key}
                      onClick={() => insertParam(p.key)}
                      className="group flex items-center justify-between gap-2 rounded-lg border border-slate-100 dark:border-slate-800 px-2.5 py-2 cursor-pointer hover:border-[#00529C]/40 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-semibold text-[#00529C] dark:text-blue-400 truncate">{`{{${p.key}}}`}</div>
                        <div className="text-11 text-slate-400 truncate">{p.description}</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyParam(p.key);
                        }}
                        className="shrink-0 p-1 rounded-md border-0 bg-transparent text-slate-400 hover:text-[#00529C] hover:bg-white dark:hover:bg-slate-800 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </FormSectionCard>
        </div>
      </FormModalBody>

      <FormModalFooter
        onCancel={onClose}
        cancelText={t('notification_template.modal.cancel')}
        submitText={t('notification_template.modal.submit')}
        loading={saving}
        htmlType="button"
        onSubmit={handleSubmit}
      />
    </FormModal>
  );
};

export default NotificationTemplateModal;
