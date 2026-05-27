'use client'
import { PECAS_LABEL, PECAS_SHORT, PECAS } from '@/lib/supabase'

interface PecasFormProps {
  prefix: string
  values: Record<string, string>
  onChange: (key: string, val: string) => void
  readOnly?: boolean
  highlight?: boolean
}

export default function PecasForm({ prefix, values, onChange, readOnly, highlight }: PecasFormProps) {
  return (
    <div className="grid grid-cols-6 gap-2 mt-2">
      {PECAS.map((k, i) => (
        <div key={k}>
          <label className="block text-xs text-gray-400 mb-1 text-center">{PECAS_SHORT[i]}</label>
          <input
            type="number"
            min="0"
            value={values[k] ?? ''}
            onChange={e => onChange(k, e.target.value)}
            placeholder="—"
            readOnly={readOnly}
            title={PECAS_LABEL[i]}
            className={`w-full text-center rounded-lg border text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-200
              ${readOnly ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100' : 
                highlight ? 'bg-yellow-50 border-yellow-200 focus:border-yellow-400' : 
                'bg-white border-gray-200 focus:border-blue-300'}
            `}
          />
        </div>
      ))}
    </div>
  )
}

export function PecasHeader() {
  return (
    <div className="grid grid-cols-6 gap-2">
      {PECAS_LABEL.map((l, i) => (
        <div key={l} className="text-xs text-gray-400 text-center">{PECAS_SHORT[i]}</div>
      ))}
    </div>
  )
}

export function PecasSummary({ values }: { values: Record<string, number | null> }) {
  const total = PECAS.reduce((s, k) => s + (values[k] || 0), 0)
  return (
    <div className="grid grid-cols-7 gap-2 mt-1">
      {PECAS.map((k, i) => (
        <div key={k} className="text-center">
          <div className="text-xs text-gray-400">{PECAS_SHORT[i]}</div>
          <div className="text-sm font-medium text-gray-900">{values[k] ?? '—'}</div>
        </div>
      ))}
      <div className="text-center">
        <div className="text-xs text-gray-400">Total</div>
        <div className="text-sm font-semibold text-blue-900">{total}</div>
      </div>
    </div>
  )
}
