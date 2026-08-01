import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full mb-4">
      <label className="text-sm font-semibold text-razdwa-dark ml-1">
        {label}
      </label>
      <textarea 
        className={`border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-razdwa-purple/50 transition-all min-h-[120px] resize-y ${className}`}
        {...props}
      />
    </div>
  );
};