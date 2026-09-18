import React from 'react';
import { Save, Check, RefreshCw, Trash2 } from 'lucide-react';
import { TOOL_FIELD_SCHEMAS } from '../../lib/toolFieldSchemas';
import { getDocumentToolGuide } from '../../lib/documentToolGuides';
import { DocumentToolGuideAccordion } from './DocumentToolGuideAccordion';
import { AiSuggestButton } from './AiSuggestButton';
import { UIConstants } from '../../constants/ui';

export interface DynamicToolFormProps {
  toolId: string;
  formInputs: Record<string, any>;
  onChange: (key: string, value: any) => void;
  currentToolName: string;
  injectedClauseNotice?: string | null;
  onClearInjectedNotice?: () => void;
  lastSavedAt?: Date | null;
  isSavingDraft?: boolean;
  onClearDraft?: () => void;
}

export const DynamicToolForm: React.FC<DynamicToolFormProps> = ({ 
  toolId, 
  formInputs, 
  onChange, 
  currentToolName,
  injectedClauseNotice,
  onClearInjectedNotice,
  lastSavedAt,
  isSavingDraft,
  onClearDraft
}) => {
  const fields = TOOL_FIELD_SCHEMAS[toolId] || [];
  const guide = getDocumentToolGuide(toolId);

  return (
    <div className="space-y-3.5 text-xs">
      {/* 草稿自動保存狀態提示 */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/70 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          {isSavingDraft ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-amber-300">草稿自動儲存中...</span>
            </>
          ) : lastSavedAt ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">
                草稿已自動儲存至本機 ({lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
              </span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 text-slate-400" />
              <span>已啟用草稿自動保存（輸入時自動存入本機）</span>
            </>
          )}
        </div>
        {onClearDraft && Object.keys(formInputs || {}).some(k => Boolean(formInputs[k])) && (
          <button
            type="button"
            onClick={onClearDraft}
            className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="清空本表單已填寫內容並清除暫存"
          >
            <Trash2 className="w-3 h-3" />
            <span>清空重填</span>
          </button>
        )}
      </div>

      {/* 鼎川法律風格：法務指南、要件與必備文件清冊 */}
      {guide && <DocumentToolGuideAccordion guide={guide} />}

      {injectedClauseNotice && (
        <div 
          id="injected-clause-banner"
          className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 animate-pulse transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-medium">{injectedClauseNotice}</span>
          </div>
          {onClearInjectedNotice && (
            <button
              type="button"
              onClick={onClearInjectedNotice}
              className="text-emerald-400/70 hover:text-emerald-300 text-[11px] underline"
            >
              關閉提示
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {fields.map((field) => {
          const fieldId = `tool-${toolId}-${field.key}`;
          if (field.type === 'textarea') {
            return (
              <div key={field.key} className="col-span-1 sm:col-span-2">
                <div className="flex justify-between items-end mb-1.5">
                  <label htmlFor={fieldId} className="block font-medium text-slate-300 text-xs sm:text-sm">
                    {field.label}{field.required && <span className="ml-1 text-rose-400" aria-hidden="true">*</span>}
                  </label>
                  {field.showAiSuggest && (
                    <AiSuggestButton 
                      fieldLabel={field.label} 
                      fieldKey={field.key} 
                      toolName={currentToolName} 
                      incidentDetails={JSON.stringify(formInputs)} 
                      onSelect={(val) => onChange(field.key, val)} 
                    />
                  )}
                </div>
                <textarea
                  id={fieldId}
                  name={field.key}
                  rows={field.rows || 5}
                  required={field.required}
                  aria-required={field.required}
                  value={formInputs[field.key] || ''}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className={`${UIConstants.textarea} text-sm`}
                  placeholder={`請輸入${field.label}...`}
                />
              </div>
            );
          }
          
          return (
            <div key={field.key} className="col-span-1 sm:col-span-2 md:col-span-1">
              <div className="flex justify-between items-end mb-1.5">
                <label htmlFor={fieldId} className="block font-medium text-slate-300 text-xs sm:text-sm">
                  {field.label}{field.required && <span className="ml-1 text-rose-400" aria-hidden="true">*</span>}
                </label>
                {field.showAiSuggest && (
                  <AiSuggestButton 
                    fieldLabel={field.label} 
                    fieldKey={field.key} 
                    toolName={currentToolName} 
                    incidentDetails={JSON.stringify(formInputs)} 
                    onSelect={(val) => onChange(field.key, val)} 
                  />
                )}
              </div>
              <input
                id={fieldId}
                name={field.key}
                type={field.type === 'number' || field.type === 'date' ? field.type : 'text'}
                required={field.required}
                aria-required={field.required}
                value={formInputs[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                className={`${UIConstants.input} text-sm`}
                placeholder={`輸入${field.label}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
