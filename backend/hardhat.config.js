require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Carga las variables

// --- Verificación de variables ---
const rpcUrl = process.env.PASEO_RPC_URL;
const chainId = process.env.PASEO_CHAIN_ID;
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

if (!rpcUrl || !chainId || !privateKey) {
  throw new Error(
    "Error: Faltan variables de entorno (RPC, ChainID o Private Key)."
  );
}
// --- Fin Verificación ---

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.21", // Tu versión
  networks: {
    paseo_testnet: {
      url: rpcUrl,
      chainId: parseInt(chainId),
      accounts: [privateKey],
    },
  },
  etherscan: {
    apiKey: {
      paseo_testnet: "NO_SE_NECESITA_API_KEY",
    },
    customChains: [
      {
        network: "paseo_testnet",
        chainId: parseInt(chainId),
        urls: {
          apiURL: "https://blockscout-passet-hub.parity-testnet.parity.io/api",
          browserURL: "https://blockscout-passet-hub.parity-testnet.parity.io/",
        },
      },
    ],
  },
};
