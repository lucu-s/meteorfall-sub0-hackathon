// File: scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  console.log("Iniciando despliegue en la red Paseo...");

  const initialSupplyString = "1000000";
  const initialSupply = ethers.utils.parseUnits(initialSupplyString, 18); // Ethers v5

  const [deployer] = await ethers.getSigners();
  console.log("Desplegando contratos con la cuenta:", deployer.address);

  // 1. Desplegar RockToken
  console.log("Desplegando RockToken...");
  const RockToken = await ethers.getContractFactory("RockToken");
  const rockToken = await RockToken.deploy(initialSupply);
  await rockToken.deployed(); // Ethers v5
  console.log(`✅ RockToken desplegado en: ${rockToken.address}`);

  // 2. Desplegar Meteorfall
  console.log("Desplegando Meteorfall...");
  const Meteorfall = await ethers.getContractFactory("Meteorfall");
  const meteorfall = await Meteorfall.deploy(rockToken.address);
  await meteorfall.deployed(); // Ethers v5
  console.log(`✅ Meteorfall desplegado en: ${meteorfall.address}`);

  console.log("\n--- Despliegue Completo ---");
  console.log(`ROCK_TOKEN_ADDRESS = "${rockToken.address}"`);
  console.log(`METEORFALL_ADDRESS = "${meteorfall.address}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
