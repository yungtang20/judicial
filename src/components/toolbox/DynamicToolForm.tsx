import React from 'react';
import { TOOL_FIELD_SCHEMAS } from '../../lib/toolFieldSchemas';
import { AiSuggestButton } from './AiSuggestButton';

export interface DynamicToolFormProps {
  toolId: string;
  formInputs: Record<string, any>;
  onChange: (key: string, value: any) => void;
  currentToolName: string;
}

export const DynamicToolForm: React.FC<DynamicToolFormProps> = ({ toolId, formInputs, onChange, currentToolName }) => {
  const fields = TOOL_FIELD_SCHEMAS[toolId] || [];

  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-2">
        {fields.map((field, index) => {
          if (field.type === 'textarea') {
            return (
              <div key={field.key} className="col-span-2">
                <div className="flex justify-between items-end mb-1">
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 text-sm focus:border-blue-500 outline-none leading-relaxed resize-y"
                />
              </div>
            );
          }
          
          return (
            <div key={field.key}>
              <div className="flex justify-between items-end mb-1">
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
                className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
