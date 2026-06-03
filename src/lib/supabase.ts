import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const createClient = () => createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const PECAS = ['lenco_casal','lenco_solteiro','fronha','toalha_banho','toalha_rosto','toalha_piso']
export const PECAS_LABEL = ['Lençol Casal','Lençol Solteiro','Fronha','Toalha Banho','Toalha Rosto','Toalha Piso']
export const PECAS_SHORT = ['LC','LS','Fr','TB','TR','TP']

export const ELIS_PREDIOS = ['SPZ','PQJ']
export const PW_PREDIOS = ['AGR','AYH','AYM','AYR','CNZ','DGE','FYP','HBV','HLK','KAS','NUN','NXB','NXD','NXF','NXH','NXP','NXV','PVF','PVJ','PVN','PVP','SCN','TOF','URB','ZOM']
export const TODOS_PREDIOS = [...ELIS_PREDIOS, ...PW_PREDIOS]

export function getLavanderia(predio: string) {
  return ELIS_PREDIOS.includes(predio) ? 'ELIS' : 'PW'
}

export function calcTotal(pecas: Record<string, number | null>) {
  return PECAS.reduce((s, k) => s + (pecas[k] || 0), 0)
}

// Padrão de enxoval por prédio e combinação
export const PADRAO: Record<string, Record<string, number[]>> = {
  PQJ: {
    'Studio | Q1:Queen | 1 banh': [3,0,4,2,1,1],
    '1BDR | Q1:Casal | 1 banh': [3,0,4,2,1,1],
    '1BDR | Q1:Queen | 1 banh': [3,0,4,2,1,1],
  },
  SPZ: {
    'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1],
    'Studio | Q1:Solteiro | 1 banh': [0,6,4,2,1,1],
    'Studio | Q1:Solteiro + Q2:Solteiro | 1 banh': [0,6,4,2,1,1],
    '2BDR | Q1:Solteiro + Q2:Solteiro | 1 banh': [0,6,4,2,1,1],
    '4BDR | Q1:Solteiro + Q2:Solteiro + Q3:Solteiro | 2 banh': [0,12,8,4,2,2],
  },
  AGR: { '1BDR | Q1:Casal | 1 banh': [3,0,4,2,1,1], '2BDR | Q1:Casal + Q2:Solteiro | 1 banh': [6,0,6,3,1,1] },
  AYH: { 'Studio | Q1:Queen | 1 banh': [3,0,4,2,1,1], '1BDR | Q1:Queen | 1 banh': [3,0,4,2,1,1] },
  AYM: { 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1], '1BDR | Q1:Casal | 1 banh': [3,0,4,2,1,1] },
  AYR: { 'Studio | Q1:Queen | 1 banh': [3,0,4,2,1,1], '1BDR | Q1:Queen | 1 banh': [3,0,4,2,1,1], '2BDR | Q1:Queen + Q2:Queen | 1 banh': [6,0,8,4,1,1] },
  CNZ: { 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1], 'Studio | Q1:Solteiro | 1 banh': [0,6,4,2,1,1] },
  DGE: { 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1], 'Studio | Q1:Casal + Sofá Cama | 1 banh': [3,0,4,2,1,1], '1BDR | Q1:Casal + Sofá Cama | 1 banh': [3,0,4,2,1,1] },
  FYP: { 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1], 'Studio | Q1:Queen | 1 banh': [3,0,4,2,1,1], '1BDR | 2 banh': [3,0,4,2,2,1], '1BDR | Q1:Queen | 1 banh': [3,0,4,2,1,1], '2BDR | Q1:Queen + Q2:Solteiro | 2 banh': [6,0,6,3,2,2] },
  HBV: { 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1] },
  HLK: { 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1], '1BDR | Q1:Casal | 1 banh': [3,0,4,2,1,1] },
  KAS: { 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1], 'Studio | Q1:Solteiro | 1 banh': [0,3,2,1,1,1] },
  NUN: { 'Studio | Q1:Queen | 1 banh': [3,0,4,2,1,1], '1BDR | Q1:Queen | 1 banh': [3,0,4,2,1,1], '2BDR | Q1:Queen + Q2:Queen | 2 banh': [6,0,8,4,2,2] },
  NXB: { 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1], 'Studio | Q1:Queen | 1 banh': [3,0,4,2,1,1], 'Duplex 1 BDR | Q1:Queen | 1 banh': [3,0,4,2,1,1] },
  NXD: { 'Studio | 1 banh': [3,0,4,2,1,1], 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1], 'Studio | Q1:King | 1 banh': [3,0,4,2,1,1], 'Studio | Q1:Queen | 1 banh': [3,0,4,2,1,1] },
  NXF: { 'Studio | Q1:Queen | 1 banh': [3,0,4,2,1,1], 'Duplex 1 BDR | Q1:Queen | 1 banh': [3,0,4,2,1,1] },
  NXH: { 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1], 'Studio | Q1:Queen | 1 banh': [3,0,4,2,1,1], 'Duplex 1 BDR | Q1:Queen | 1 banh': [3,0,4,2,1,1] },
  NXP: { 'Studio | Q1:Casal + Sofá Cama | 1 banh': [3,0,4,2,1,1], 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1], 'Studio | Q1:Queen | 1 banh': [3,0,4,2,1,1], 'Duplex 2 BDR | Q1:Queen + Q2:Solteiro | 1 banh': [6,0,6,3,2,1] },
  NXV: { 'Studio | 1 banh': [3,0,4,2,1,1], 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1], '1BDR | Q1:Casal | 1 banh': [3,0,4,2,1,1] },
  PVF: { 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1], '1BDR | Q1:Casal + Sofá Cama | 1 banh': [5,0,6,4,2,1], '1BDR | Q1:Casal | 1 banh': [3,0,4,2,1,1], 'Duplex 1 BDR | Q1:Casal | 1 banh': [3,0,4,2,1,1], '3BDR | Q1:Casal + Q2:Casal + Q3:Casal | 2 banh': [9,0,12,6,2,2] },
  PVJ: { 'Studio | Q1:Queen + Sofá Cama | 1 banh': [5,0,6,4,2,1], 'Studio | Q1:Queen | 1 banh': [3,0,4,2,1,1], '1BDR | Q1:Queen + Sofá Cama | 1 banh': [5,0,6,4,2,1], '1BDR | Q1:Queen | 1 banh': [3,0,4,2,1,1], 'Duplex 1 BDR | Q1:Queen + Sofá Cama | 1 banh': [5,0,6,4,2,1] },
  PVN: { 'Studio | Q1:Queen + Sofá Cama | 1 banh': [5,0,6,4,2,1], 'Studio | Q1:Queen | 1 banh': [3,0,4,2,1,1], '1BDR | Q1:Queen + Sofá Cama | 1 banh': [5,0,6,4,2,1], '1BDR | Q1:Queen | 1 banh': [3,0,4,2,1,1] },
  PVP: { 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1], 'Studio | Q1:Queen + Sofá Cama | 1 banh': [5,0,6,4,2,1], 'Studio | Q1:Queen | 1 banh': [3,0,4,2,1,1], '1BDR | Q1:Queen + Sofá Cama | 1 banh': [5,0,6,4,2,1], '2BDR | Q1:Queen + Q2:Solteiro + Sofá Cama | 1 banh': [8,0,8,5,1,1] },
  SCN: { 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1], 'Studio | Q1:Solteiro | 1 banh': [0,6,4,2,1,1], '3BDR | Q1:Solteiro + Q2:Solteiro + Q3:Solteiro | 3 banh': [0,9,6,3,3,3] },
  TOF: { 'Studio | Q1:Queen | 1 banh': [3,0,4,2,1,1], '1BDR | Q1:Queen | 1 banh': [3,0,4,2,1,1], '2BDR | Q1:Queen + Q2:Queen | 1 banh': [6,0,8,4,1,1], '2BDR | Q1:Queen + Q2:Solteiro | 1 banh': [6,0,6,3,1,1] },
  URB: { 'Studio | Q1:Casal | 1 banh': [3,0,4,2,1,1] },
  ZOM: { 'Studio | Q1:Queen | 1 banh': [3,0,4,2,1,1] },
}
