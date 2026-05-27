'use client'
import { useState } from 'react'
import PontoForm from '@/components/PontoForm'

const PONTOS_L = [
  { id: 'L', label: 'L — Sujos recebidos no depósito', descricao: 'Por talão — registre cada saco recebido', hasTalao: true, hasDataCOs: true, hasPredioOrigem: true },
]
const PONTOS_MN = [
  { id: 'M', label: 'M — Total bipado / contado no depósito', descricao: 'Total geral por lavanderia ao final do dia' },
  { id: 'N', label: 'N — Total confirmado pela lavanderia', descricao: 'Total que a lavanderia confirmou ter recebido' },
]

export default function DepositoSujoPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [lavanderia, setLavanderia] = useState<'PW' | 'ELIS'>('PW')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Depósito Sujo</h1>
          <p className="text-sm text-gray-400 mt-0.5">Pontos L · M · N — SKURBAN</p>
        </div>
        <div className="flex gap-3">
          <select value={lavanderia} onChange={e => setLavanderia(e.target.value as any)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
            <option value="PW">PW</option>
            <option value="ELIS">ELIS</option>
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
        </div>
      </div>

      <PontoForm
        table="deposito_sujo"
        pontos={PONTOS_L}
        date={date}
        lavanderia={lavanderia}
        accentColor="#A32D2D"
      />

      <div className="my-4 border-t border-gray-100" />

      <div className="mb-3">
        <h2 className="text-sm font-medium text-gray-700">Consolidado por lavanderia</h2>
        <p className="text-xs text-gray-400">M e N são totais globais — não por prédio</p>
      </div>

      <PontoForm
        table="deposito_sujo"
        pontos={PONTOS_MN}
        date={date}
        lavanderia={lavanderia}
        accentColor="#A32D2D"
      />
    </div>
  )
}
