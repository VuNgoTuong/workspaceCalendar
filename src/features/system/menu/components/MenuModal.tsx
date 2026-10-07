import React, { useEffect, useMemo } from 'react';
import { Form, Input, Select, InputNumber, Switch } from 'antd';
import { ChevronDown } from 'lucide-react';
import type { MenuItem } from '../../types';
import { ICON_OPTIONS, getMenuIcon } from '../../../../constants/iconRegistry';
import { useTranslation } from 'react-i18next';
import {
  FormModal,
  FormModalHeader,
  FormModalBody,
  FormModalFooter,
  formFieldLabel as fieldLabel,
  formInputClass as inputClass,
} from '../../../../components/ui/FormModal';

interface MenuModalProps {
  open: boolean;
  onCancel: () => void;
  editingRecord: MenuItem | null;
  onSubmit: (values: any) => void;
  confirmLoading: boolean;
  allMenus: MenuItem[];
}

const MenuModalComponent: React.FC<MenuModalProps> = ({
  open,
  onCancel,
  editingRecord,
  onSubmit,
  confirmLoading,
  allMenus,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (editingRecord) {
        form.setFieldsValue({
          ...editingRecord,
          parentId: editingRecord.parentId || undefined,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          index: 0,
          isActive: true,
        });
      }
    }
  }, [open, editingRecord, form]);

  const handleFinish = (values: any) => {
    onSubmit({
      ...values,
      parentId: values.parentId || null,
    });
  };

  const parentOptions = useMemo(
    () =>
      allMenus
        .filter((m) => !m.parentId && (!editingRecord || m.id !== editingRecord.id))
        .map((m) => ({
          value: m.id,
          label: m.name,
        })),
    [allMenus, editingRecord]
  );

  const iconOptions = useMemo(
    () =>
      ICON_OPTIONS.map((item) => {
        const IconComponent = getMenuIcon(item.value);
        const labelText = `${item.value} (${t(`icon_registry.${item.value}`, item.hint)})`;
        return {
          value: item.value,
          labelAsString: labelText,
          label: (
            <div className="flex items-center gap-2.5 py-1">
              <IconComponent size={16} className="text-slate-500 flex-shrink-0" />
              <span className="font-medium text-slate-700 dark:text-slate-300">{labelText}</span>
            </div>
          )
        };
      }),
    [t]
  );

  return (
    <FormModal open={open} onCancel={onCancel} width={900}>
      <FormModalHeader
        title={editingRecord ? t('menu.edit_title') : t('menu.add_title')}
        subtitle={editingRecord ? t('menu.edit_subtitle') : t('menu.add_subtitle')}
        onClose={onCancel}
      />

      <Form form={form} layout="vertical" onFinish={handleFinish} className="flex flex-col">
        <FormModalBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              <Form.Item
                name="name"
                label={fieldLabel(t('menu.name'))}
                rules={[{ required: true, message: t('menu.name_required') }]}
                className="mb-0"
              >
                <Input placeholder={t('menu.name_placeholder')} className={inputClass} />
              </Form.Item>

              <Form.Item
                name="url"
                label={fieldLabel(t('menu.url'))}
                rules={[{ required: true, message: t('menu.url_required') }]}
                className="mb-0"
              >
                <Input placeholder={t('menu.url_placeholder')} className={inputClass} />
              </Form.Item>

              <Form.Item name="parentId" label={fieldLabel(t('menu.parent'))} className="mb-0">
                <Select
                  placeholder={t('menu.parent_placeholder')}
                  allowClear
                  className="premium-select h-10"
                  classNames={{ popup: { root: 'premium-select-dropdown' } }}
                  suffixIcon={<ChevronDown size={14} className="text-slate-400" />}
                  options={parentOptions}
                />
              </Form.Item>
            </div>

            <div className="flex flex-col gap-4">
              <Form.Item
                name="icon"
                label={fieldLabel(t('menu.icon'))}
                rules={[{ required: true, message: t('menu.icon_required') }]}
                className="mb-0"
              >
                <Select
                  showSearch
                  placeholder={t('menu.icon_placeholder')}
                  className="premium-select h-10"
                  classNames={{ popup: { root: 'premium-select-dropdown' } }}
                  suffixIcon={<ChevronDown size={14} className="text-slate-400" />}
                  options={iconOptions}
                  optionLabelProp="label"
                  filterOption={(input, option) => {
                    const searchStr = (option as any)?.labelAsString || '';
                    return searchStr.toLowerCase().includes(input.toLowerCase());
                  }}
                />
              </Form.Item>

              <Form.Item
                name="index"
                label={fieldLabel(t('menu.index'))}
                rules={[{ required: true, message: t('menu.index_required') }]}
                className="mb-0"
              >
                <InputNumber min={0} className="w-full h-10 rounded-lg flex items-center" />
              </Form.Item>

              <Form.Item name="isActive" label={fieldLabel(t('menu.status'))} valuePropName="checked" className="mb-0">
                <Switch checkedChildren={t('menu.active')} unCheckedChildren={t('menu.inactive')} />
              </Form.Item>
            </div>
          </div>
        </FormModalBody>

        <FormModalFooter
          onCancel={onCancel}
          cancelText={t('menu.cancel')}
          submitText={editingRecord ? t('menu.submit_edit') : t('menu.submit_add')}
          loading={confirmLoading}
        />
      </Form>
    </FormModal>
  );
};

export const MenuModal = React.memo(MenuModalComponent);
export default MenuModal;
