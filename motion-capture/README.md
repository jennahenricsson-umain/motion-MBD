# Motion Capture – Bollspel med ansiktsdetektion

Ett litet spel där bollar faller och exploderar när de träffar huvudet. Använder webbkamera och ansiktsdetektion (ml5/MediaPipe) för att spåra upp till 5 ansikten samtidigt.

## Krav

- **Node.js** (version 18 eller senare). Ladda ner från [nodejs.org](https://nodejs.org) om det inte är installerat.
- **Webbkamera** (för spelet).
- En modern webbläsare (Chrome, Firefox, Safari, Edge).

## Köra projektet på en ny dator

### 1. Hämta projektet

Om du använder Git:

```bash
git clone <url-till-repot>
cd motion-MBD/motion-capture
```

Om du bara har mapparna: öppna en terminal, gå till projektmappen och sedan in i `motion-capture`:

```bash
cd sökväg/till/motion-MBD/motion-capture
```

### 2. Installera bibliotek (dependencies)

Alla nödvändiga paket står i `package.json`. Installera dem med npm:

```bash
npm install
```

Detta installerar bland annat:

- **Next.js** – webbramverk
- **React** – gränssnitt
- **p5** – ritning och animation
- **ml5** – ansiktsdetektion (face mesh)
- **Tailwind CSS** – stilar
- **TypeScript** – typning

Inga andra steg behövs; `npm install` läser `package.json` och hämtar rätt versioner.

### 3. Starta utvecklingsservern

```bash
npm run dev
```

Öppna webbläsaren på [http://localhost:3000](http://localhost:3000).

### 4. Kamera

När sidan laddas kan webbläsaren fråga om kamerabehörighet. Godkänn så att spelet kan detektera ansikten.

## Övriga kommandon

- `npm run build` – bygg för produktion
- `npm start` – starta produktionsservern (kör `npm run build` först)
- `npm run lint` – köra ESLint

## Projektstruktur

- `app/page.tsx` – huvudsida
- `components/MotionCanvas.tsx` – p5-sketch, kamera, ansiktsdetektion, bollar och explosioner
- `package.json` – projektegenskaper och lista över alla bibliotek
