import React from 'react';

// Указываем, что наше поле должно принимать лейбл (название)
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full mb-4">
      {/* Текст над полем */}
      <label className="text-sm font-semibold text-razdwa-dark ml-1">
        {label}
      </label>
      
      {/* Само поле ввода со стилями Tailwind */}
      <input 
        className={`border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-razdwa-purple/50 transition-all ${className}`}
        {...props}
      />
    </div>
  );
};