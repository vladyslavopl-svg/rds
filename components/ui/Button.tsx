import React from 'react';

// Описываем, какие настройки может принимать наша кнопка
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '',
  ...props 
}) => {
  // Базовые стили для всех кнопок (отступы, скругления, шрифт)
  const baseStyles = "px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center active:scale-95";
  
  // Визуальные стили в зависимости от типа кнопки
  const variants = {
    primary: "bg-razdwa-purple text-white hover:bg-purple-700 shadow-md", // Фиолетовая (главная)
    secondary: "bg-razdwa-dark text-white hover:bg-gray-800",             // Темно-синяя (второстепенная)
    outline: "border-2 border-razdwa-purple text-razdwa-purple hover:bg-purple-50" // Прозрачная с рамкой
  };

  const widthClass = fullWidth ? "w-full" : "w-auto";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};