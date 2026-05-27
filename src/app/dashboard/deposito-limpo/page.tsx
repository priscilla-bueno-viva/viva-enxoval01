'use client'
import { useState } from 'react'
import PontoForm from '@/components/PontoForm'

const PONTOS = [
  { id: 'A', label: 'A — Estoque limpo 7h pré-envio', descricao: 'Bipagem do estoque antes de subir os limpos' },
  { id: 'B', label: 'B — Limpos recebidos manhã', descricao: 'Bipagem dos limpos recebidos pela manhã' },
  { id: 'C', label: 'C — Limpos enviados para os prédios', descricao: 'Bipagem de envio para os prédios' },
  { id: 'D', label: 'D — Estoque limpo pós-separação', descricao: 'Bipagem do estoque após separação' },
]

export default function DepositoLimpoPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [lavanderia, setLavanderia] = useState<'PW' | 'ELIS'>('PW')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Depósito Limpo</h1>
          <p className="text-sm text-gray-400 mt-0.5">Pontos A · B · C · D — SKURBAN</p>
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
        table="deposito_limpo"
        pontos={PONTOS}
        date={date}
        lavanderia={lavanderia}
        accentColor="#185FA5"
      />
    </div>
  )
}
