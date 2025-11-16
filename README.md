# ⚡️ Meteorfall

Entrega para el **sub0 Hackathon (Polkadot Main Track)**.

Meteorfall convierte la apatía cívica en una acción colectiva y lucrativa. Es una dApp que gamifica el reporte de infraestructura urbana (baches, luces rotas) usando un sistema de incentivos "Reporta-Valida-Gana".

## Arquitectura (Ejecución Técnica)

* **Frontend:** Next.js, Vercel, Sequence.js (para login social).
* **Backend (Smart Contracts):** Hardhat, Solidity.
* **Lógica de Negocio:** Desplegado en **Polkadot (Testnet de Paseo)**.
    * `Meteorfall.sol`: Maneja la lógica de validación y recompensas.
    * `RockToken.sol`: El token de utilidad ERC-20 ($ROCK).


## Cómo Probarlo

1.  **Frontend:** `https://v0-meteorfallmockups-ten.vercel.app/`
2.  **Contrato (Paseo):** `https://blockscout-passet-hub.parity-testnet.parity.io/address/0x09554bAFAf79e20310029161A3348758A60B685b`

## Ejecutar Localmente

### Backend (Hardhat)

```bash
cd backend
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network paseo_testnet

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
