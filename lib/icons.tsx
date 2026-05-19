import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { w?: number }

const base = (w?: number) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: w ?? 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export const Icon = {
  estimate: ({ w, ...p }: IconProps) => (
    <svg {...base(w)} {...p}>
      <path d="M7 3h7l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  ),
  jobs: ({ w, ...p }: IconProps) => (
    <svg {...base(w)} {...p}>
      <path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  ),
  clients: ({ w, ...p }: IconProps) => (
    <svg {...base(w)} {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 14.5c3.5 0 6 2 6 5.5" />
    </svg>
  ),
  invoices: ({ w, ...p }: IconProps) => (
    <svg {...base(w)} {...p}>
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  ),
  receipts: ({ w, ...p }: IconProps) => (
    <svg {...base(w)} {...p}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <circle cx="9" cy="12.5" r="2" />
      <path d="M14 11h4M14 14h3" />
    </svg>
  ),
  plus: ({ w, ...p }: IconProps) => (
    <svg {...base(w ?? 2.2)} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  chev: ({ w, ...p }: IconProps) => (
    <svg {...base(w ?? 2)} {...p}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
  back: ({ w, ...p }: IconProps) => (
    <svg {...base(w ?? 2)} {...p}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  ),
  download: ({ w, ...p }: IconProps) => (
    <svg {...base(w ?? 2)} {...p}>
      <path d="M12 4v12M6 10l6 6 6-6M4 20h16" />
    </svg>
  ),
  send: ({ w, ...p }: IconProps) => (
    <svg {...base(w ?? 2)} {...p}>
      <path d="M4 12l16-8-6 18-3-7-7-3z" />
    </svg>
  ),
  warn: ({ w, ...p }: IconProps) => (
    <svg {...base(w ?? 2)} {...p}>
      <path d="M12 3L2 20h20L12 3z" />
      <path d="M12 10v5M12 18v.5" />
    </svg>
  ),
  check: ({ w, ...p }: IconProps) => (
    <svg {...base(w ?? 2)} {...p}>
      <path d="M5 12l5 5L20 6" />
    </svg>
  ),
  camera: ({ w, ...p }: IconProps) => (
    <svg {...base(w)} {...p}>
      <path d="M4 8h4l2-3h4l2 3h4v11H4V8z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  ),
  phone: ({ w, ...p }: IconProps) => (
    <svg {...base(w)} {...p}>
      <path d="M5 4h3l2 5-2 1a12 12 0 006 6l1-2 5 2v3a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
    </svg>
  ),
  mail: ({ w, ...p }: IconProps) => (
    <svg {...base(w)} {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  ),
  sync: ({ w, ...p }: IconProps) => (
    <svg {...base(w ?? 2)} {...p}>
      <path d="M4 12a8 8 0 0113-6l2-2v6h-6l2-2a5 5 0 00-8 4" />
      <path d="M20 12a8 8 0 01-13 6l-2 2v-6h6l-2 2a5 5 0 008-4" />
    </svg>
  ),
  retry: ({ w, ...p }: IconProps) => (
    <svg {...base(w ?? 2)} {...p}>
      <path d="M3 12a9 9 0 1 0 2.6-6.3L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  trash: ({ w, ...p }: IconProps) => (
    <svg {...base(w)} {...p}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  ),
  leaf: ({ w, ...p }: IconProps) => (
    <svg {...base(w)} {...p}>
      <path d="M20 4c-9 0-16 6-16 14 0 0 6-1 10-5s6-9 6-9z" />
      <path d="M4 20c4-4 8-7 14-12" />
    </svg>
  ),
  repeat: ({ w, ...p }: IconProps) => (
    <svg {...base(w ?? 2)} {...p}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  ),
  search: ({ w, ...p }: IconProps) => (
    <svg {...base(w ?? 2)} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  ),
}
