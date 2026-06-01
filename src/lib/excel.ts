import * as XLSX from 'xlsx'

export function exportXLSX(sheets: { name: string; data: any[][] }[], filename: string) {
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.data)
    XLSX.utils.book_append_sheet(wb, ws, s.name)
  }
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function ExportButton({ onClick, label = 'Exportar Excel' }: { onClick: () => void; label?: string }) {
  return null // replaced inline below — this file is just the utility
}
