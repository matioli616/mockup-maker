// Gera um CSV no formato de importação de produtos do Shopify
// (Configurações → Importar produtos). Cobre só os campos de texto do
// produto — Handle, Title, Vendor, Type, Tags, preço, estoque — pra criar
// os N produtos de uma vez em rascunho (Status: draft).
//
// Não inclui "Image Src": o Shopify importa imagem por URL pública, e uma
// estampa recém-exportada por este app só existe como arquivo local (o app
// não tem servidor). As imagens do lote (.zip, já numeradas 001-frente.png/
// 001-verso.png) continuam precisando ser arrastadas manualmente pra cada
// produto depois do import — o número bate com o Handle (estampa-001).

export interface ShopifyCsvRowInput {
  num: string // "001"
  vendor: string
  productType: string
  tags: string
  price: string
  inventoryQty: string
}

const HEADERS = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Type',
  'Tags',
  'Published',
  'Variant SKU',
  'Variant Price',
  'Variant Inventory Qty',
  'Variant Inventory Policy',
  'Variant Fulfillment Service',
  'Variant Requires Shipping',
  'Variant Taxable',
  'Status',
]

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function buildShopifyCsv(rows: ShopifyCsvRowInput[]): string {
  const lines = rows.map((r) => {
    const price = r.price.trim() || '0'
    const qty = r.inventoryQty.trim() || '0'
    return [
      `estampa-${r.num}`,
      `Estampa ${r.num}`,
      '', // Body (HTML) — preenche depois no admin
      r.vendor,
      r.productType,
      r.tags,
      'TRUE',
      `EST-${r.num}`,
      price,
      qty,
      'deny',
      'manual',
      'TRUE',
      'TRUE',
      'draft', // rascunho — revisa antes de publicar
    ]
      .map(csvCell)
      .join(',')
  })
  return [HEADERS.join(','), ...lines].join('\r\n') + '\r\n'
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
