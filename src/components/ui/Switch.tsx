import React from 'react';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className = ''
}: SwitchProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <h3 className="font-medium text-gray-900 dark:text-white">{label}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      )}
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-emerald-500 focus-visible:ring-offset-2
          ${checked ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'}
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            ${checked ? 'translate-x-6' : 'translate-x-1'}
            inline-block h-4 w-4 transform rounded-full
            bg-white transition-transform
          `}
        />
      </button>
    </div>
  );
}
