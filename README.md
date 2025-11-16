# ⚡️ Meteorfall

Meteorfall es una DApp de innovación cívica desarrollada con tecnología blockchain, que transforma la acción ciudadana de reportar fallas urbanas en una experiencia gamificada, transparente y colaborativa.
Su objetivo es reconstruir la confianza entre ciudadanía e instituciones públicas mediante la creación de un sistema descentralizado de registro y validación urbana, donde cada reporte ciudadano se convierte en un dato verificable e inmutable dentro de la red de Polkadot.
La propuesta se distingue por integrar impacto social, tecnología Web3 y economía de tokens, dentro de una narrativa visual potente y una experiencia de usuario que combina juego, participación y transparencia.

## Arquitectura (Ejecución Técnica)

* **Frontend:** Next.js, Vercel, Sequence.js (para login social).
* **Backend (Smart Contracts):** Hardhat, Solidity.
* **Lógica de Negocio:** Desplegado en **Polkadot (Testnet de Paseo)**.
    * `Meteorfall.sol`: Maneja la lógica de validación y recompensas.
    * `RockToken.sol`: El token de utilidad ERC-20 ($ROCK).


## Cómo Probarlo

1.  **Frontend:** `https://meteorfall-io.vercel.app/`
2.  **Contrato (Paseo):** `https://blockscout-passet-hub.parity-testnet.parity.io/address/0x09554bAFAf79e20310029161A3348758A60B685b`

## Ejecutar Localmente

### Backend (Hardhat)

```bash
cd backend
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network paseo_testnet

