export const METEORFALL_ADDRESS = "0x09554bAFAf79e20310029161A3348758A60B685b"
export const PASEO_CHAIN_ID = 420420422
export const PASEO_RPC_URL = "https://testnet-passet-hub-eth-rpc.polkadot.io"
export const PASEO_EXPLORER = "https://blockscout-passet-hub.parity-testnet.parity.io/"

export const ARKIV_RPC_URL = "https://mendoza.hoodi.arkiv.network/rpc"
export const ARKIV_WS_URL = "wss://mendoza.hoodi.arkiv.network/rpc/ws"

export const IMPACTO_CATEGORIAS = [
  { id: "crater-calzada", label: "Cráter en Calzada" },
  { id: "falla-luminaria", label: "Falla en Luminaria" },
  { id: "dano-vereda", label: "Daño en Vereda" },
  { id: "perdida-agua", label: "Pérdida de Agua" },
  { id: "semaforo-danado", label: "Semáforo Dañado" },
  { id: "bache-profundo", label: "Bache Profundo" },
  { id: "senal-caida", label: "Señal Caída" },
  { id: "alcantarilla-abierta", label: "Alcantarilla Abierta" },
  { id: "otro", label: "Otro" },
]

export const IMPACTO_AMENAZAS = [
  {
    id: "baja",
    label: "Baja",
    color: "bg-[#00FF85] hover:bg-[#00FF85]/90 text-[#101820] font-semibold shadow-[0_0_20px_rgba(0,255,133,0.4)]",
  },
  {
    id: "media",
    label: "Media",
    color: "bg-[#FFD633] hover:bg-[#FFD633]/90 text-[#101820] font-semibold shadow-[0_0_20px_rgba(255,214,51,0.4)]",
  },
  {
    id: "alta",
    label: "Alta",
    color: "bg-[#FF004D] hover:bg-[#FF004D]/90 text-white font-semibold shadow-[0_0_20px_rgba(255,0,77,0.4)]",
  },
  {
    id: "critica",
    label: "Crítica",
    color:
      "bg-[#FF004D] hover:bg-[#FF004D]/90 text-white font-bold shadow-[0_0_25px_rgba(255,0,77,0.6)] border-2 border-[#FF004D]/50",
  },
]
