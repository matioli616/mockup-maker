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
6. Clique em **Exportar** e escolha o formato:
   - **PNG Original** — 720×1280
   - **Feed Instagram** — 1080×1350 (4:5)
   - **Story Instagram** — 1080×1920 (9:16)

O estado (estampa, posição, tamanho, rotação, opacidade, blend, view, realismo) é
salvo automaticamente no `localStorage` e restaurado ao reabrir o editor.

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
types/
  mockup.ts             tipos (GarmentConfig, DesignTransform, ...)
public/garments/
  tshirt-front.jpg      blusa oversized preta — frente
  tshirt-back.jpg       blusa oversized preta — verso
```

A config da peça (dimensões da imagem e área de impressão de frente/verso) vive
inline em `components/editor/MockupEditor.tsx` (`GARMENT`).
