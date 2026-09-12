import React from 'react';
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
}

export const DynamicToolForm: React.FC<DynamicToolFormProps> = ({ 
  toolId, 
  formInputs, 
  onChange, 
  currentToolName,
  injectedClauseNotice,
  onClearInjectedNotice
}) => {
  const fields = TOOL_FIELD_SCHEMAS[toolId] || [];
  const guide = getDocumentToolGuide(toolId);

  return (
    <div className="space-y-3.5 text-xs">
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
          if (field.type === 'textarea') {
            return (
              <div key={field.key} className="col-span-1 sm:col-span-2">
                <div className="flex justify-between items-end mb-1.5">
                  <label className="block font-medium text-slate-300 text-xs sm:text-sm">{field.label}</label>
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
                  rows={field.rows || 5}
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
                <label className="block font-medium text-slate-300 text-xs sm:text-sm">{field.label}</label>
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
                type={field.type === 'number' ? 'number' : 'text'}
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
