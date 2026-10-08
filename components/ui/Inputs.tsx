
import React, { useId } from 'react';

interface BaseProps {
    label?: string;
    className?: string;
}

interface InputProps extends BaseProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> { id?: string; }
interface TextAreaProps extends BaseProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> { id?: string; }
interface SelectProps extends BaseProps, Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
    options: { value: string; label: string }[];
    id?: string;
}

const baseInputClass = "w-full mt-1 p-1.5 text-sm bg-gray-900 border border-gray-600 rounded-md focus:ring-1 focus:ring-cyan-500 outline-none transition-colors placeholder-gray-600";
const labelClass = "text-xs font-semibold text-gray-400 block";

export const StyledInput: React.FC<InputProps> = ({ label, className = "", id, name, ...props }) => {
    const generatedId = useId();
    const actualId = id || generatedId;
    return (
        <div className={className}>
            {label && <label htmlFor={actualId} className={labelClass}>{label}</label>}
            <input id={actualId} name={name || actualId} className={baseInputClass} {...props} />
        </div>
    );
};

export const StyledTextArea: React.FC<TextAreaProps> = ({ label, className = "", id, name, ...props }) => {
    const generatedId = useId();
    const actualId = id || generatedId;
    return (
        <div className={className}>
            {label && <label htmlFor={actualId} className={labelClass}>{label}</label>}
            <textarea id={actualId} name={name || actualId} className={`${baseInputClass} resize-y`} {...props} />
        </div>
    );
};

export const StyledSelect: React.FC<SelectProps> = ({ label, options, className = "", id, name, ...props }) => {
    const generatedId = useId();
    const actualId = id || generatedId;
    return (
        <div className={className}>
            {label && <label htmlFor={actualId} className={labelClass}>{label}</label>}
            <select id={actualId} name={name || actualId} className={baseInputClass} {...props}>
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
};

export const StyledRange: React.FC<InputProps> = ({ label, className = "", id, name, ...props }) => {
    const generatedId = useId();
    const actualId = id || generatedId;
    return (
        <div className={className}>
            {label && <label htmlFor={actualId} className={labelClass}>{label}</label>}
            <input 
                id={actualId}
                name={name || actualId}
                type="range" 
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-1"
                {...props} 
            />
        </div>
    );
};
