const { ethers } = require("hardhat");

// --- 1. CONFIGURACIÓN (¡EN MINÚSCULAS!) ---
const ROCK_TOKEN_ADDRESS = "0x5cb4970bc6a20a3080137be320da01a2a1e3b5a5";
const METEORFALL_ADDRESS = "0x09554bafaf79e20310029161a3348758a60b685b";

const AMOUNT_TO_FUND_STRING = "500000";
// ------------------------------------

async function main() {
  const amountToFund = ethers.utils.parseUnits(AMOUNT_TO_FUND_STRING, 18);
  const [deployer] = await ethers.getSigners();

  console.log(`Financiando contrato desde la cuenta: ${deployer.address}`);

  const rockToken = await ethers.getContractAt(
    "RockToken",
    ROCK_TOKEN_ADDRESS,
    deployer
  );

  console.log(
    `Transfiriendo ${AMOUNT_TO_FUND_STRING} $ROCK al contrato Meteorfall (${METEORFALL_ADDRESS})...`
  );

  // (Regla #1) La transferencia ahora funcionará
  const tx = await rockToken.transfer(METEORFALL_ADDRESS, amountToFund);

  console.log("Transacción enviada, esperando confirmación...");
  await tx.wait();

  console.log("✅ Transferencia completada. Hash:", tx.hash);

  const contractBalance = await rockToken.balanceOf(METEORFALL_ADDRESS);
  console.log(
    `Nuevo saldo del contrato Meteorfall: ${ethers.utils.formatUnits(
      contractBalance,
      18
    )} $ROCK`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
