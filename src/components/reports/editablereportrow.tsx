import React, { useState, useEffect } from 'react';
import { Check, X, Edit2, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { format } from 'date-fns';

interface EditableReportRowProps {
  report: any;
  onSave: (reportId: string, updates: Record<string, any>) => Promise<void>;
  canEdit: boolean;
  editableFields: string[];
  formatters?: Record<string, (value: any) => string>;
}

export function EditableReportRow({
  report,
  onSave,
  canEdit,
  editableFields,
  formatters = {},
}: EditableReportRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditing) {
      const initialValues: Record<string, any> = {};
      editableFields.forEach((field) => {
        initialValues[field] = report[field] || '';
      });
      setEditedValues(initialValues);
      setErrors({});
    }
  }, [isEditing, report, editableFields]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedValues({});
    setErrors({});
  };

  const validateField = (field: string, value: any): string | null => {
    const numericFields = [
      'sales',
      'purchase',
      'labor_cost',
      'utilities',
      'promotion',
      'cleaning',
      'misc',
      'communication',
      'others',
      'customers',
      'lunch_customers',
      'dinner_customers',
    ];

    if (numericFields.includes(field)) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return '数値を入力してください';
      }
      if (numValue < 0) {
        return '0以上の値を入力してください';
      }
    }

    return null;
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    Object.keys(editedValues).forEach((field) => {
      const error = validateField(field, editedValues[field]);
      if (error) {
        newErrors[field] = error;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    const changes = Object.keys(editedValues).reduce((acc, key) => {
      if (editedValues[key] !== report[key]) {
        acc[key] = editedValues[key];
      }
      return acc;
    }, {} as Record<string, any>);

    if (Object.keys(changes).length === 0) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(report.id, changes);
      setIsEditing(false);
      setEditedValues({});
      setErrors({});
    } catch (error) {
      console.error('Failed to save changes:', error);
      setErrors({ _general: '保存に失敗しました。もう一度お試しください。' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditedValues((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const renderCell = (field: string, value: any) => {
    if (!isEditing) {
      const formatter = formatters[field];
      return (
        <span className="text-sm">
          {formatter ? formatter(value) : value || '-'}
        </span>
      );
    }

    const isNumeric = [
      'sales',
      'purchase',
      'labor_cost',
      'utilities',
      'promotion',
      'cleaning',
      'misc',
      'communication',
      'others',
      'customers',
      'lunch_customers',
      'dinner_customers',
    ].includes(field);

    return (
      <div className="space-y-1">
        <input
          type={isNumeric ? 'number' : 'text'}
          value={editedValues[field] ?? ''}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className={`w-full px-2 py-1 text-sm border rounded ${
            errors[field]
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          } focus:outline-none focus:ring-1`}
          disabled={isSaving}
          min={isNumeric ? 0 : undefined}
        />
        {errors[field] && (
          <span className="text-xs text-red-600">{errors[field]}</span>
        )}
      </div>
    );
  };

  return (
    <tr className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        {format(new Date(report.date), 'yyyy/MM/dd')}
      </td>
      {editableFields.map((field) => (
        <td key={field} className="px-4 py-3 whitespace-nowrap">
          {renderCell(field, report[field])}
        </td>
      ))}
      <td className="px-4 py-3 whitespace-nowrap text-right">
        {canEdit && (
          <div className="flex items-center justify-end gap-2">
            {!isEditing ? (
              <Button
                onClick={handleEdit}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="編集"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  disabled={isSaving}
                  title="保存"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={isSaving}
                  title="キャンセル"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </td>
      {errors._general && (
        <td colSpan={editableFields.length + 2} className="px-4 py-2">
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {errors._general}
          </div>
        </td>
      )}
    </tr>
  );
}
