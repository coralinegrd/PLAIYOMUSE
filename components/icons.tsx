/**
 * Small inline icon set for the auth/landing screens (stroke icons in
 * currentColor, plus the official multicolour Google "G").
 * No icon library is installed in this project, so these are hand-written
 * SVGs sized at 1.25rem by default.
 */

type IconProps = { className?: string };

function StrokeIcon({
  className = "h-5 w-5",
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function EnvelopeIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </StrokeIcon>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </StrokeIcon>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </StrokeIcon>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M9.9 4.24A9.5 9.5 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A13.5 13.5 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    </StrokeIcon>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </StrokeIcon>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </StrokeIcon>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="m3.5 10.8 8.5-7.3 8.5 7.3" />
      <path d="M5.8 8.9V19a1.8 1.8 0 0 0 1.8 1.8h8.8A1.8 1.8 0 0 0 18.2 19V8.9" />
      <path d="M10 20.8v-5.5h4v5.5" />
    </StrokeIcon>
  );
}

export function CompassIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" stroke="none" />
    </StrokeIcon>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </StrokeIcon>
  );
}

export function MessageIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </StrokeIcon>
  );
}

export function PinIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </StrokeIcon>
  );
}

/** Official multicolour Google "G" mark. */
export function GoogleIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.75 12c0-.8.14-1.57.52-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.98 11.98 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
