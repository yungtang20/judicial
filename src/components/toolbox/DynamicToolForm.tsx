import React from 'react';
import { TOOL_FIELD_SCHEMAS } from '../../lib/toolFieldSchemas';
import { AiSuggestButton } from './AiSuggestButton';
import { UIConstants } from '../../constants/ui';

export interface DynamicToolFormProps {
  toolId: string;
  formInputs: Record<string, any>;
  onChange: (key: string, value: any) => void;
  currentToolName: string;
}

export const DynamicToolForm: React.FC<DynamicToolFormProps> = ({ toolId, formInputs, onChange, currentToolName }) => {
  const fields = TOOL_FIELD_SCHEMAS[toolId] || [];

  return (
    <div className="space-y-3.5 text-xs">
      <div className="grid grid-cols-2 gap-3">
        {fields.map((field) => {
          if (field.type === 'textarea') {
            return (
              <div key={field.key} className="col-span-2">
                <div className="flex justify-between items-end mb-1.5">
                  <label className="block font-medium text-slate-300">{field.label}</label>
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
                  className={UIConstants.textarea}
                  placeholder={`請輸入${field.label}...`}
                />
              </div>
            );
          }
          
          return (
            <div key={field.key} className={field.type === 'number' ? 'col-span-1' : 'col-span-2 sm:col-span-1'}>
              <div className="flex justify-between items-end mb-1.5">
                <label className="block font-medium text-slate-300">{field.label}</label>
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
                className={UIConstants.input}
                placeholder={`輸入${field.label}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
