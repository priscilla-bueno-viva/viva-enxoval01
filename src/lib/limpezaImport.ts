// Tarefas do Metabase que não trocam enxoval
const TIPOS_SEM_ENXOVAL = ['INSPECTION', 'DELIVER_ITEM']
const STATUS_IGNORADOS = ['cancelled', 'deleted']

export function getUnidade(r: any): string {
  return String(r['Unidade'] || r['unidade'] || r['Listing'] || '').trim()
}

export function getStatus(r: any): string {
  return String(r['Status'] || r['status'] || '').toLowerCase().trim()
}

// Data da limpeza em YYYY-MM-DD, aceitando serial do Excel ou "30/9/2026, 18:00"
export function getDataLimpeza(r: any): string | null {
  const v = r['Data da Limpeza']
  if (v === undefined || v === null || v === '') return null
  if (typeof v === 'number') {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000)
    return d.toISOString().split('T')[0]
  }
  const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const iso = String(v).match(/^(\d{4}-\d{2}-\d{2})/)
  return iso ? iso[1] : null
}

export function usaEnxoval(r: any): boolean {
  const tipo = String(r['Tipo'] || '').toUpperCase().trim()
  if (tipo && TIPOS_SEM_ENXOVAL.includes(tipo)) return false
  return !STATUS_IGNORADOS.includes(getStatus(r))
}

// Se o arquivo tem "Data da Limpeza", mantém só as tarefas da data escolhida
export function filtrarPorData(data: any[], date: string): any[] {
  if (!data.some(r => getDataLimpeza(r))) return data
  return data.filter(r => getDataLimpeza(r) === date)
}

export function avisoSemData(data: any[], date: string): string {
  const datas = Array.from(new Set(data.map(getDataLimpeza).filter(Boolean))) as string[]
  if (!datas.length || datas.includes(date)) return ''
  const fmt = (d: string) => d.split('-').reverse().join('/')
  return `O arquivo não tem limpezas em ${fmt(date)}. Datas no arquivo: ${datas.sort().map(fmt).join(', ')}. Troque a data no topo e carregue de novo.`
}
