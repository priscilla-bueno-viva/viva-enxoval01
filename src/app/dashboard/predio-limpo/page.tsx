'use client'
import { useState } from 'react'
import { getLavanderia, PW_PREDIOS, ELIS_PREDIOS } from '@/lib/supabase'
import PontoForm from '@/components/PontoForm'

const PONTOS = [
  { id: 'E', label: 'E — Estoque limpo pré-operação', descricao: 'Contagem do estoque antes da operação começar' },
  { id: 'F', label: 'F — Limpos entregues pela logística', descricao: 'Contagem dos limpos entregues no prédio' },
  { id: 'G', label: 'G — Estoque limpo pós-operação', descricao: 'Contagem do estoque após a operação' },
]

export default function PredioLimpoPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [predio, setPredio] = useState('')
  const lavanderia = predio ? getLavanderia(predio) : ''
  const TODOS = [...ELIS_PREDIOS, ...PW_PREDIOS].sort()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Prédio Limpo</h1>
          <p className="text-sm text-gray-400 mt-0.5">Pontos E · F · G</p>
        </div>
        <div className="flex gap-3 items-center">
          <select value={predio} onChange={e => setPredio(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
            <option value="">Selecionar prédio...</option>
            <optgroup label="ELIS">{ELIS_PREDIOS.map(p => <option key={p} value={p}>{p}</option>)}</optgroup>
            <optgroup label="PW">{PW_PREDIOS.sort().map(p => <option key={p} value={p}>{p}</option>)}</optgroup>
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
        </div>
      </div>

      {predio && lavanderia && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-500">Lavanderia:</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lavanderia === 'ELIS' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
            {lavanderia}
          </span>
        </div>
      )}

      {!predio ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
          Selecione um prédio para preencher os pontos E, F e G
        </div>
      ) : (
        <PontoForm
          table="predio_limpo"
          pontos={PONTOS}
          date={date}
          predio={predio}
          lavanderia={lavanderia}
          accentColor="#3B6D11"
        />
      )}
    </div>
  )
}
