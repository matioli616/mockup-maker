import { describe, expect, it } from 'vitest'
import { buildShopifyCsv, type ShopifyCsvRowInput } from './shopifyCsv'

function row(overrides: Partial<ShopifyCsvRowInput> = {}): ShopifyCsvRowInput {
  return {
    num: '001',
    vendor: 'SixOneSix',
    productType: 'Camiseta Oversized',
    tags: 'streetwear, oversized',
    price: '99.90',
    inventoryQty: '10',
    ...overrides,
  }
}

describe('buildShopifyCsv', () => {
  it('inclui o cabeçalho do formato de importação do Shopify', () => {
    const csv = buildShopifyCsv([])
    const [header] = csv.split('\r\n')
    expect(header).toBe(
      [
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
      ].join(','),
    )
  })

  it('gera handle, título e SKU numerados a partir de `num`', () => {
    const csv = buildShopifyCsv([row({ num: '007' })])
    expect(csv).toContain('estampa-007')
    expect(csv).toContain('Estampa 007')
    expect(csv).toContain('EST-007')
  })

  it('sempre grava como rascunho (status draft)', () => {
    const csv = buildShopifyCsv([row()])
    const dataLine = csv.split('\r\n')[1]
    expect(dataLine.endsWith('draft')).toBe(true)
  })

  it('usa 0 quando preço ou estoque vêm em branco', () => {
    // tags sem vírgula aqui de propósito — split(',') ingênuo não entende
    // aspas de CSV, então uma tag com vírgula quebraria a contagem de colunas
    const csv = buildShopifyCsv([row({ price: '  ', inventoryQty: '', tags: 'streetwear' })])
    const cells = csv.split('\r\n')[1].split(',')
    // Variant Price é a 9ª coluna, Variant Inventory Qty a 10ª (1-indexado)
    expect(cells[8]).toBe('0')
    expect(cells[9]).toBe('0')
  })

  it('faz o escaping de vírgula e aspas nos campos de texto livre (tags)', () => {
    const csv = buildShopifyCsv([row({ tags: 'preto, "edição limitada"' })])
    expect(csv).toContain('"preto, ""edição limitada"""')
  })

  it('gera uma linha por produto do lote, na ordem recebida', () => {
    const csv = buildShopifyCsv([row({ num: '001' }), row({ num: '002' }), row({ num: '003' })])
    const lines = csv.trim().split('\r\n')
    expect(lines).toHaveLength(4) // header + 3 produtos
    expect(lines[1]).toContain('estampa-001')
    expect(lines[2]).toContain('estampa-002')
    expect(lines[3]).toContain('estampa-003')
  })
})
