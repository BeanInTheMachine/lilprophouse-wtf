interface InputFormGroupProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
  className?: string;
}

export default function InputFormGroup({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  textarea = false,
  rows = 4,
  className = '',
}: InputFormGroupProps) {
  const inputClasses = `w-full px-4 py-2.5 rounded-xl border text-sm font-medium text-brand-black placeholder:text-brand-gray-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-purple-semi-transparent focus:border-brand-purple ${
    error ? 'border-brand-red' : 'border-border-med'
  }`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={name} className="text-sm font-bold text-brand-black">
        {label}
        {required && <span className="text-brand-red ml-0.5">*</span>}
      </label>
      {textarea ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className={inputClasses}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={inputClasses}
        />
      )}
      {error && <span className="text-xs text-brand-red">{error}</span>}
    </div>
  );
}
