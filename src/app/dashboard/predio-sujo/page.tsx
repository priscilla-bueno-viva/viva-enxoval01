'use client'
import { useState, useEffect } from 'react'
import { getLavanderia, PW_PREDIOS, ELIS_PREDIOS, PECAS } from '@/lib/supabase'
import { createClient } from '@/lib/supabase'
import PontoForm from '@/components/PontoForm'

export default function PredioSujoPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [predio, setPredio] = useState('')
  const [jValues, setJValues] = useState<Record<string, string>>({})
  const lavanderia = predio ? getLavanderia(predio) : ''
  const supabase = createClient()

  // Load J (sujo esperado) from limpezas
  useEffect(() => {
    if (!predio || !date) return
    async function loadJ() {
      const { data } = await supabase
        .from('limpezas')
        .select('lenco_casal_esperado,lenco_solteiro_esperado,fronha_esperada,toalha_banho_esperada,toalha_rosto_esperada,toalha_piso_esperada')
        .eq('data', date)
        .eq('predio', predio)

      if (data && data.length > 0) {
        const totais = {
          lenco_casal: data.reduce((s, r) => s + (r.lenco_casal_esperado || 0), 0),
          lenco_solteiro: data.reduce((s, r) => s + (r.lenco_solteiro_esperado || 0), 0),
          fronha: data.reduce((s, r) => s + (r.fronha_esperada || 0), 0),
          toalha_banho: data.reduce((s, r) => s + (r.toalha_banho_esperada || 0), 0),
          toalha_rosto: data.reduce((s, r) => s + (r.toalha_rosto_esperada || 0), 0),
          toalha_piso: data.reduce((s, r) => s + (r.toalha_piso_esperada || 0), 0),
        }
        setJValues(Object.fromEntries(Object.entries(totais).map(([k, v]) => [k, String(v)])))
      } else {
        setJValues({})
      }
    }
    loadJ()
  }, [predio, date])

  const PONTOS = [
    { id: 'H', label: 'H — Sujo no depósito início da operação', descricao: 'Quantidade de sujo que ficou do dia anterior' },
    { id: 'I', label: 'I — Sujo retirado dos quartos', descricao: 'Por talão — preencha um talão por saco retirado', hasTalao: true, hasDataCOs: true },
    { id: 'J', label: 'J — Sujo esperado calculado', descricao: 'Calculado automaticamente com base nas limpezas do dia', readonly: true },
  ]

  const PECAS_SHORT = ['LC','LS','Fr','TB','TR','TP']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Prédio Sujo</h1>
          <p className="text-sm text-gray-400 mt-0.5">Pontos H · I · J</p>
        </div>
        <div className="flex gap-3">
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
          {Object.keys(jValues).length > 0 && (
            <span className="text-xs text-gray-400 ml-2">
              Sujo esperado (J): {PECAS.reduce((s, k) => s + (parseInt(jValues[k]) || 0), 0)} peças
            </span>
          )}
        </div>
      )}

      {!predio ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
          Selecione um prédio para preencher os pontos H, I e J
        </div>
      ) : (
        <div className="space-y-4">
          {/* H and I via PontoForm */}
          <PontoForm
            table="predio_sujo"
            pontos={PONTOS.filter(p => p.id !== 'J')}
            date={date}
            predio={predio}
            lavanderia={lavanderia}
            accentColor="#854F0B"
          />

          {/* J - read only from limpezas */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-50" style={{ borderLeftWidth: 3, borderLeftColor: '#888' }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-gray-400">J</span>
              <div>
                <div className="text-sm font-medium text-gray-900">J — Sujo esperado calculado</div>
                <div className="text-xs text-gray-400">Calculado automaticamente com base nas limpezas do dia</div>
              </div>
            </div>
            <div className="px-5 py-4">
              {Object.keys(jValues).length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma limpeza registrada para {predio} em {date}. Carregue as limpezas do dia primeiro.</p>
              ) : (
                <div className="grid grid-cols-6 gap-2">
                  {PECAS.map((k, i) => (
                    <div key={k}>
                      <label className="text-xs text-gray-400 block mb-1 text-center">{PECAS_SHORT[i]}</label>
                      <div className="w-full text-center rounded-lg border border-gray-100 bg-gray-50 px-1 py-1.5 text-sm text-gray-600">
                        {jValues[k] || 0}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
