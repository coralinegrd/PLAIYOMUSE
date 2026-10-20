"use client";

import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon, LockIcon } from "./icons";

/**
 * Password input in the auth screens' style: lock icon on the left and an
 * eye toggle on the right to show/hide the value. Interactive, so it is a
 * Client Component; it renders a plain named input, so it works inside
 * the server-action forms used by login/signup.
 */
export default function PasswordField({
  label,
  name,
  autoComplete,
  required,
  minLength,
  placeholder,
}: {
  label: string;
  name: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="text-[15px] font-extrabold text-ink">
        {label}
      </label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary">
          <LockIcon />
        </span>
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-border bg-white py-3.5 pl-11 pr-12 font-semibold text-ink outline-none placeholder:font-semibold placeholder:text-muted/60 focus:border-primary"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted transition hover:text-ink"
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}
