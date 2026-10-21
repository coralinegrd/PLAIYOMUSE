import type { ReactNode } from "react";

/**
 * Labelled text input with a leading icon, in the auth screens' style:
 * heavy ink label, rounded white field, Electric Blue icon.
 * Presentational only — safe in both Server and Client Components.
 */
export default function TextField({
  label,
  name,
  type = "text",
  required,
  autoComplete,
  placeholder,
  icon,
  minLength,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  icon: ReactNode;
  minLength?: number;
  defaultValue?: string;
}) {
  const id = `field-${name}`;
  return (
    <div>
      <label htmlFor={id} className="text-[15px] font-extrabold text-ink">
        {label}
      </label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary">
          {icon}
        </span>
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          minLength={minLength}
          defaultValue={defaultValue}
          className="w-full rounded-2xl border border-border bg-white py-3.5 pl-11 pr-4 font-semibold text-ink outline-none placeholder:font-semibold placeholder:text-muted/60 focus:border-primary"
        />
      </div>
    </div>
  );
}
