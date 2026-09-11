# MockupDrop

Editor de mockups de camiseta streetwear que roda 100% no browser. Faz upload da
estampa, posiciona sobre uma blusa oversized (frente ou verso), ajusta tamanho,
rotação, opacidade e blend mode, e exporta em alta resolução — pronto pra post.

Ferramenta de uso pessoal. Sem backend, sem conta, sem upload pra servidor: a
estampa nunca sai da sua máquina.

## Como usar

1. Abra `/editor`.
2. Clique em **Upload PNG / SVG** (ou arraste a imagem pro canvas).
3. Arraste a estampa pra posicionar e use as alças pra redimensionar. A área
   tracejada é a zona de impressão sugerida.
4. Ajuste **rotação**, **opacidade** e **blend mode** na sidebar.
5. Ligue **Realismo** pra aplicar a textura/dobras do tecido por cima da estampa
   no export (efeito de estampa DTG).
6. Ligue **Remover preto** se a estampa tem fundo preto chapado — os pixels
   escuros viram transparentes e o preto real do tecido aparece por baixo, sem
   o efeito "adesivo colado". Ajuste **Sensibilidade** (quão claro ainda conta
   como "preto") e **Suavidade** (transição da borda).
7. Clique em **Exportar** e escolha o formato:
   - **PNG Original** — 720×1280
   - **Feed Instagram** — 1080×1350 (4:5)
   - **Story Instagram** — 1080×1920 (9:16)

O estado (estampa, posição, tamanho, rotação, opacidade, blend, view, realismo,
remover preto) é salvo automaticamente no `localStorage` e restaurado ao reabrir
o editor.

### Lote (várias estampas de uma vez)

Na sidebar, em **Lote**, selecione várias imagens do mesmo tamanho (ex.: 50
PNGs). A primeira carrega no canvas normalmente — posicione na **frente**,
troque pro **verso** e posicione lá também (cada lado guarda a própria
posição/tamanho/rotação), ajuste opacidade/blend/realismo/remover-preto.
Depois clique em **Gerar lote (.zip)** no formato desejado: o app aplica essa
mesma configuração de cada lado a todas as outras estampas e baixa um único
`.zip` com frente **e** verso de cada uma, numeradas — `001-frente.png`,
`001-verso.png`, `002-frente.png`, `002-verso.png`, ... — pronto pra subir
como par de fotos de produto numa loja.

### CSV de importação do Shopify

Com um lote carregado, a sidebar mostra **CSV Shopify**: preenche marca,
tipo, tags, preço e estoque (aplicado a todos os produtos do lote) e clica em
**Baixar CSV Shopify**. Gera um `.csv` pronto pra importar em
Configurações → Importar produtos, um produto por estampa (`estampa-001`,
`estampa-002`, ...), como rascunho. O CSV **não leva imagem** — o Shopify só
aceita imagem por URL pública nesse tipo de import, e este app não tem
servidor. Depois de importar, arrasta os PNGs do `.zip` do lote pra cada
produto: o número bate (`estampa-001` ↔ `001-frente.png`/`001-verso.png`).

### Atalhos de teclado (no editor)

| Tecla | Ação |
|---|---|
| ↑ ↓ ← → | Move a estampa 1px |
| Shift + ↑ ↓ ← → | Move a estampa 10px |
| `R` | Reseta a posição pra área de impressão |
| `F` | Alterna frente / verso |
| `Delete` / `Backspace` | Remove a estampa do canvas |
| `Esc` | Desseleciona a estampa |

## Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **react-rnd** — drag & resize da estampa
- Composição e export via **Canvas 2D** (`lib/export.ts`)
- **JSZip** — empacota o lote de mockups num único `.zip`

## Rodar localmente

```bash
npm install
npm run dev      # http://localhost:3000
```

Outros comandos:

```bash
npm run build    # build de produção
npm run start    # sobe o build
npm run lint     # eslint
```

## Estrutura

```
app/
  page.tsx              landing
  editor/page.tsx       rota do editor
components/editor/
  MockupEditor.tsx      editor completo (client component)
lib/
  export.ts             composição garment + estampa + realismo, export PNG
  batchExport.ts        aplica a config de cada lado a N estampas, gera frente+verso numeradas no .zip
  imageProcessing.ts    knockout de preto (luminância) da estampa
  image.ts              helpers de imagem/arquivo compartilhados
  shopifyCsv.ts         gera o CSV de importação de produtos do Shopify
types/
  mockup.ts             tipos (GarmentConfig, DesignTransform, ...)
public/garments/
  tshirt-front.jpg      blusa oversized preta — frente
  tshirt-back.jpg       blusa oversized preta — verso
```

A config da peça (dimensões da imagem e área de impressão de frente/verso) vive
inline em `components/editor/MockupEditor.tsx` (`GARMENT`).
