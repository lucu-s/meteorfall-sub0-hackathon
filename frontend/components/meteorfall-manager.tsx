"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, ExternalLink, LogOut, Copy, Loader2, Check, Coins, Zap, Shield, Upload, Camera, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { meteorfallAbi } from "@/lib/meteorfall-abi"
import {
  METEORFALL_ADDRESS,
  PASEO_CHAIN_ID,
  PASEO_EXPLORER,
  PASEO_RPC_URL,
  IMPACTO_CATEGORIAS,
  IMPACTO_AMENAZAS,
} from "@/lib/constants"
import type { ethers } from "ethers"

interface Impact {
  id: string
  rastreador: string
  txHash: string
  contadorValidaciones: string
  categoria?: string
  amenaza?: string
  imageUrl?: string
}

const getImpactPlaceholderImage = (categoria?: string, impactoId?: string) => {
  // Impact ID 1: Large pothole in road
  if (impactoId === "1") {
    return 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20desde%202025-11-15%2015-32-52-h4PtIQUuT9F45G1wWbQByHcjCQWbQl.png'
  }
  // Impact ID 2: Broken/hanging traffic light
  if (impactoId === "2") {
    return 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20desde%202025-11-15%2016-32-08-ENUGBI08zagb0LabAoROjfwCFcQ1JM.png'
  }
  
  // Use impact ID to select from a variety of images for other reports
  const imageVariants = [
    '/large-pothole-crater-in-urban-street-asphalt-damag.jpg',
    '/broken-street-light-pole-damaged-urban-lighting.jpg',
    '/cracked-damaged-sidewalk-concrete-urban.jpg',
    '/water-pipe-leak-flooding-urban-street.jpg',
    '/broken-traffic-light-signal-urban-intersection.jpg',
    '/deep-pothole-road-damage-urban-street.jpg',
    '/blocked-damaged-sewer-drain-urban-flooding.jpg',
    '/urban-infrastructure-damage-city-problem.jpg',
  ]
  
  // If we have an impact ID, use it to deterministically select an image
  if (impactoId) {
    const index = parseInt(impactoId) % imageVariants.length
    return imageVariants[index]
  }
  
  // Fallback to category-based selection
  const placeholderMap: Record<string, string> = {
    'crater': '/large-pothole-crater-in-urban-street-asphalt-damag.jpg',
    'luminaria': '/broken-street-light-pole-damaged-urban-lighting.jpg',
    'banqueta': '/cracked-damaged-sidewalk-concrete-urban.jpg',
    'agua': '/water-pipe-leak-flooding-urban-street.jpg',
    'semaforo': '/broken-traffic-light-signal-urban-intersection.jpg',
    'bacha': '/deep-pothole-road-damage-urban-street.jpg',
    'alcantarilla': '/blocked-damaged-sewer-drain-urban-flooding.jpg',
    'otro': '/urban-infrastructure-damage-city-problem.jpg',
  }
  
  return placeholderMap[categoria || 'otro'] || placeholderMap.otro
}

export function MeteorfallManager() {
  const [address, setAddress] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)

  const [impactos, setImpactos] = useState<Impact[]>([])
  const [isValidating, setIsValidating] = useState<string | null>(null)

  const [pendingRewards, setPendingRewards] = useState<string>("0.0")
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string>("")
  const [copied, setCopied] = useState(false)

  const [impactoId, setImpactoId] = useState("")
  const [arkivId, setArkivId] = useState("")
  const [addressInput, setAddressInput] = useState("")

  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null)
  const [selectedAmenaza, setSelectedAmenaza] = useState<string | null>(null)
  const [loadingStep, setLoadingStep] = useState("")

  const [uploadedImage, setUploadedImage] = useState<string | null>(null)

  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successTxHash, setSuccessTxHash] = useState("")
  const [successArkivId, setSuccessArkivId] = useState("")

  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationTxHash, setValidationTxHash] = useState("")
  const [validatedImpactId, setValidatedImpactId] = useState("")

  useEffect(() => {
    const checkExistingConnection = async () => {
      if (typeof window.ethereum !== "undefined") {
        try {
          const { ethers } = await import("ethers")
          const ethProvider = new ethers.BrowserProvider(window.ethereum)
          const accounts = await ethProvider.listAccounts()

          if (accounts.length > 0) {
            console.log("[v0] Found existing connection, hydrating state...")
            await hydrateState(ethProvider)
          }
        } catch (e) {
          console.log("[v0] No existing connection found")
        }
      }
    }

    checkExistingConnection()
  }, [])

  const hydrateState = async (ethProvider: ethers.BrowserProvider) => {
    try {
      const { ethers } = await import("ethers")
      const ethersSigner = await ethProvider.getSigner()
      const userAddress = await ethersSigner.getAddress()

      const network = await ethProvider.getNetwork()
      if (Number(network.chainId) !== PASEO_CHAIN_ID) {
        await switchToPaseoNetwork()
      }

      const meteorfallContract = new ethers.Contract(METEORFALL_ADDRESS, meteorfallAbi, ethersSigner)

      setProvider(ethProvider)
      setSigner(ethersSigner)
      setAddress(userAddress)
      setContract(meteorfallContract)

      await fetchPastImpactos(meteorfallContract)
      await fetchPendingRewards(meteorfallContract, userAddress)

      console.log("[v0] State hydrated: Signer, Contract, Events and Rewards ready")
    } catch (e) {
      console.error("[v0] Error hydrating state:", e)
      throw e
    }
  }

  const fetchPendingRewards = async (contractInstance: ethers.Contract, userAddress: string) => {
    if (!contractInstance || !userAddress) return

    console.log("[v0] Fetching pending rewards...")
    try {
      const { ethers } = await import("ethers")
      const ethProvider = new ethers.BrowserProvider(window.ethereum)
      const currentSigner = await ethProvider.getSigner()
      const freshContract = new ethers.Contract(METEORFALL_ADDRESS, meteorfallAbi, currentSigner)

      const rewardsWei = await freshContract.recompensasPendientes(userAddress)
      const rewardsFormatted = ethers.formatUnits(rewardsWei, 18)
      setPendingRewards(rewardsFormatted)
      console.log("[v0] Pending rewards:", rewardsFormatted, "$ROCK")
    } catch (e) {
      console.error("[v0] Error fetching pending rewards:", e)
      setError("No se pudo consultar el saldo de recompensas.")
    }
  }

  useEffect(() => {
    if (!contract || !address) return

    console.log("[v0] Setting up event listeners...")

    const handleNewImpact = (impactoId: bigint, rastreador: string, event: any) => {
      console.log("[v0] Event: NuevoImpactoReportado", { impactoId: impactoId.toString(), rastreador })
      const newImpact: Impact = {
        id: impactoId.toString(),
        rastreador: rastreador,
        txHash: event.log.transactionHash,
        contadorValidaciones: "0",
        categoria: rastreador.toLowerCase() === address?.toLowerCase() ? selectedCategoria || undefined : undefined,
        amenaza: rastreador.toLowerCase() === address?.toLowerCase() ? selectedAmenaza || undefined : undefined,
      }
      
      setImpactos((current) => {
        const exists = current.some(imp => imp.id === newImpact.id)
        if (exists) {
          console.log("[v0] Impact already exists, skipping duplicate")
          return current
        }
        return [newImpact, ...current]
      })

      if (rastreador.toLowerCase() === address.toLowerCase()) {
        setSelectedCategoria(null)
        setSelectedAmenaza(null)
      }
    }

    const handleImpactValidated = (impactoId: bigint, validador: string, nuevoContador: bigint) => {
      console.log("[v0] Event: ImpactoValidado", {
        impactoId: impactoId.toString(),
        validador,
        nuevoContador: nuevoContador.toString(),
      })

      setImpactos((current) =>
        current.map((impacto) =>
          impacto.id === impactoId.toString()
            ? { ...impacto, contadorValidaciones: nuevoContador.toString() }
            : impacto,
        ),
      )

      if (validador.toLowerCase() === address.toLowerCase()) {
        setIsValidating(null)
      }
    }

    const handleRewardsEnabled = (impactoId: bigint) => {
      console.log(`[v0] Event: RecompensasHabilitadas for impact ${impactoId}`)
      // Refresh rewards balance when rewards are enabled
      fetchPendingRewards(contract, address)
    }

    const handleRewardWithdrawn = (usuario: string, monto: bigint) => {
      console.log(`[v0] Event: RecompensaRetirada by ${usuario}`)
      if (usuario.toLowerCase() === address.toLowerCase()) {
        console.log("[v0] I withdrew rewards! Updating balance to 0.")
        setPendingRewards("0.0")
        setIsWithdrawing(false)
      }
    }

    contract.on("NuevoImpactoReportado", handleNewImpact)
    contract.on("ImpactoValidado", handleImpactValidated)
    contract.on("RecompensasHabilitadas", handleRewardsEnabled)
    contract.on("RecompensaRetirada", handleRewardWithdrawn)

    return () => {
      console.log("[v0] Cleaning up event listeners")
      contract.off("NuevoImpactoReportado", handleNewImpact)
      contract.off("ImpactoValidado", handleImpactValidated)
      contract.off("RecompensasHabilitadas", handleRewardsEnabled)
      contract.off("RecompensaRetirada", handleRewardWithdrawn)
    }
  }, [contract, address])

  const handleDisconnect = () => {
    setProvider(null)
    setSigner(null)
    setAddress(null)
    setContract(null)
    setError(null)
    setResult("")
    setImpactos([])
    setPendingRewards("0.0")
  }

  const handleWithdraw = async () => {
    if (!contract) {
      setError("El contrato no está listo.")
      return
    }
    if (Number.parseFloat(pendingRewards) <= 0) {
      setError("No tienes recompensas para retirar.")
      return
    }

    setError(null)
    setIsWithdrawing(true)

    try {
      console.log("[v0] Sending Tx: retirarRecompensa()...")
      const tx = await contract.retirarRecompensa()
      console.log("[v0] Withdrawal transaction sent:", tx.hash)

      await tx.wait(1)
      console.log("[v0] Withdrawal transaction confirmed")

      setResult(`✅ ¡Recompensas retiradas exitosamente!\n\nHash: ${tx.hash}\n${pendingRewards} $ROCK transferidos`)
    } catch (e: any) {
      console.error("[v0] Error in retirarRecompensa:", e)
      if (e.code === "ACTION_REJECTED") {
        setError("Transacción rechazada por el usuario.")
      } else if (e.message.includes("No tienes recompensas pendientes")) {
        setError("Error: El contrato dice que no tienes recompensas.")
      } else {
        setError("Falló el retiro. Revisa la consola.")
      }
      setIsWithdrawing(false)
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    setError(null)

    try {
      const { ethers } = await import("ethers")
      const ethProvider = new ethers.BrowserProvider(window.ethereum)
      await ethProvider.send("eth_requestAccounts", [])
      const accounts = await ethProvider.listAccounts()

      if (accounts.length > 0) {
        await hydrateState(ethProvider)
      }
    } catch (e) {
      console.error("[v0] Error connecting wallet:", e)
      setError("No se pudo conectar la billetera.")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(address || "")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreateReportWithArkiv = async () => {
    if (!contract || !selectedCategoria || !selectedAmenaza) return

    setIsLoading(true)
    setError(null)
    setLoadingStep("Creando registro en Arkiv (Paso 1/2)...")

    try {
      const response = await fetch("/api/crear-reporte", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoria: selectedCategoria,
          amenaza: selectedAmenaza,
          imageUrl: uploadedImage
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }))
        throw new Error(errorData.error || "Error al crear registro en Arkiv")
      }

      const data = await response.json()
      const arkivReportId = data.arkivId

      console.log("[v0] Arkiv ID received:", arkivReportId)

      const { ethers } = await import("ethers")
      const ethProvider = new ethers.BrowserProvider(window.ethereum)
      const currentSigner = await ethProvider.getSigner()
      const freshContract = new ethers.Contract(METEORFALL_ADDRESS, meteorfallAbi, currentSigner)

      setLoadingStep("Reportando impacto en blockchain (Paso 2/2)...")
      const tx = await freshContract.reportarImpacto(arkivReportId)
      console.log("[v0] Report transaction sent:", tx.hash)

      await tx.wait(1)
      console.log("[v0] Report transaction confirmed")

      setSuccessArkivId(arkivReportId)
      setSuccessTxHash(tx.hash)
      setShowSuccessModal(true)
      
      setSelectedCategoria(null)
      setSelectedAmenaza(null)
      setUploadedImage(null)
    } catch (e: any) {
      console.error("[v0] Error creating report:", e)
      if (e.code === "ACTION_REJECTED" || e.code === 4001) {
        setError("❌ Transacción cancelada. Por favor, aprueba la transacción en tu billetera para continuar.")
      } else {
        setError(e.message || "Falló la creación del reporte. Revisa la consola.")
      }
    } finally {
      setIsLoading(false)
      setLoadingStep("")
    }
  }

  const callReadFunction = async (functionName: string, args: any[]) => {
    if (!contract) {
      setError("El contrato no está listo.")
      return
    }

    setIsLoading(true)
    setError(null)
    setLoadingStep(`Llamando a ${functionName}...`)

    try {
      const result = await contract[functionName](...args)
      setResult(`Resultado de ${functionName}: ${result.toString()}`)
    } catch (e: any) {
      console.error(`[v0] Error calling ${functionName}:`, e)
      setError(`Falló la llamada a ${functionName}. Revisa la consola.`)
    } finally {
      setIsLoading(false)
      setLoadingStep("")
    }
  }

  const callWriteFunction = async (functionName: string, args: any[]) => {
    if (!contract) {
      setError("El contrato no está listo.")
      return
    }

    setIsLoading(true)
    setError(null)
    setIsValidating(null)
    setLoadingStep(`Llamando a ${functionName}...`)

    try {
      const tx = await contract[functionName](...args)
      console.log(`[v0] ${functionName} transaction sent:`, tx.hash)

      await tx.wait(1)
      console.log(`[v0] ${functionName} transaction confirmed`)

      setResult(`✅ ¡${functionName} ejecutado exitosamente!\n\nHash: ${tx.hash}`)
    } catch (e: any) {
      console.error(`[v0] Error calling ${functionName}:`, e)
      if (e.code === "ACTION_REJECTED") {
        setError("Transacción rechazada por el usuario.")
      } else {
        setError(`Falló la llamada a ${functionName}. Revisa la consola.`)
      }
    } finally {
      setIsLoading(false)
      setIsValidating(null)
      setLoadingStep("")
    }
  }

  const handleValidar = async (impactoId: string) => {
    if (!contract) {
      setError("El contrato no está listo.")
      return
    }

    setIsLoading(true)
    setError(null)
    setIsValidating(impactoId)
    setLoadingStep("Validando impacto...")

    try {
      const tx = await contract.validarImpacto(impactoId)
      console.log("[v0] Validation transaction sent:", tx.hash)

      await tx.wait(1)
      console.log("[v0] Validation transaction confirmed")

      setValidatedImpactId(impactoId)
      setValidationTxHash(tx.hash)
      setShowValidationModal(true)
    } catch (e: any) {
      console.error("[v0] Error validating impact:", e)
      if (e.code === "ACTION_REJECTED") {
        setError("Transacción rechazada por el usuario.")
      } else {
        setError("Falló la validación del impacto. Revisa la consola.")
      }
    } finally {
      setIsLoading(false)
      setIsValidating(null)
      setLoadingStep("")
    }
  }

  const switchToPaseoNetwork = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${PASEO_CHAIN_ID.toString(16)}` }],
      })
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${PASEO_CHAIN_ID.toString(16)}`,
                chainName: "Paseo Testnet (Smart Contracts)",
                rpcUrls: [PASEO_RPC_URL],
                blockExplorerUrls: [PASEO_EXPLORER],
                nativeCurrency: {
                  name: "Paseo",
                  symbol: "PAS",
                  decimals: 18,
                },
              },
            ],
          })
        } catch (addError) {
          console.error("[v0] Error adding Paseo network:", addError)
          throw addError
        }
      } else {
        console.error("[v0] Error switching to Paseo network:", switchError)
        throw switchError
      }
    }
  }

  const fetchPastImpactos = async (contractInstance: ethers.Contract) => {
    if (!contractInstance) return

    console.log("[v0] Fetching past impactos...")
    try {
      const { ethers } = await import("ethers")
      const ethProvider = new ethers.BrowserProvider(window.ethereum)
      const currentNetwork = await ethProvider.getNetwork()

      // Create a fresh signer and contract instance with the current network
      const currentSigner = await ethProvider.getSigner()
      const freshContract = new ethers.Contract(METEORFALL_ADDRESS, meteorfallAbi, currentSigner)

      // Get the current block number to limit the query range
      const currentBlock = await ethProvider.getBlockNumber()
      const fromBlock = Math.max(0, currentBlock - 1000)

      console.log(`[v0] Querying events from block ${fromBlock} to ${currentBlock}`)

      const filter = freshContract.filters.NuevoImpactoReportado()
      const pastImpactos = await freshContract.queryFilter(filter, fromBlock, "latest")

      const impacts: Impact[] = await Promise.all(
        pastImpactos.map(async (event: any) => {
          const impactoId = event.args.impactoId.toString()
          try {
            const contador = await freshContract.getContadorValidaciones(impactoId)
            return {
              id: impactoId,
              rastreador: event.args.rastreador,
              txHash: event.transactionHash,
              contadorValidaciones: contador.toString(),
            }
          } catch (error) {
            console.error(`[v0] Error fetching counter for impact ${impactoId}:`, error)
            return {
              id: impactoId,
              rastreador: event.args.rastreador,
              txHash: event.transactionHash,
              contadorValidaciones: "0",
            }
          }
        })
      )

      setImpactos(impacts)
      console.log("[v0] Past impactos fetched:", impacts.length, "reports with validation counters")
    } catch (e) {
      console.error("[v0] Error fetching past impactos:", e)
      setError("No se pudo consultar los reportes pasados.")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeUploadedImage = () => {
    setUploadedImage(null)
  }

  if (!address || !contract) {
    return (
      <Card className="glass-card w-full max-w-md mx-auto px-4 meteor-pulse">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-2xl sm:text-3xl font-heading text-neon flex flex-col sm:flex-row items-center gap-3 justify-center">
            <img
              src="/images/design-mode/Favicon.png"
              alt="Meteorfall"
              className="h-[52px] w-[52px] flex-shrink-0"
            />
            <span className="leading-none text-center sm:text-left">METEORFALL</span>
          </CardTitle>
          <CardDescription className="text-center text-sm sm:text-base px-2">
            Sobrevive. Reporta. Reconstruye.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-[#101820] font-bold shadow-[0_0_30px_rgba(0,229,255,0.5)] border border-[#00E5FF]/50"
            size="lg"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                CONECTANDO...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                INGRESAR O REGISTRARSE
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive" className="border-[#FF004D] bg-[#FF004D]/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-xs text-[#A6A6A6] text-center space-y-1 pt-2">
            <p>Puedes usar tu email, red social (Google) o billetera existente.</p>
            <p className="text-[#00E5FF]">Red: Paseo Testnet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl space-y-4 sm:space-y-6 px-4 sm:px-0">
      {/* Header Card */}
      <Card className="glass-card meteor-pulse">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 w-full sm:w-auto">
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-heading text-neon flex flex-col sm:flex-row items-center sm:items-start gap-3">
                <img
                  src="/images/design-mode/Favicon.png"
                  alt="Meteorfall"
                  className="h-[52px] w-[52px] flex-shrink-0"
                />
                <span className="leading-none text-center sm:text-left">METEORFALL</span>
              </CardTitle>
              <CardDescription className="text-[#A6A6A6] text-xs sm:text-sm text-center sm:text-left">
                Conectado a Paseo Testnet
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="border-[#00E5FF]/30 hover:bg-[#00E5FF]/10 bg-transparent text-[#00E5FF] w-full sm:w-auto"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Desconectar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-[#101820]/50 border border-[#00E5FF]/30 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
            <div className="w-full sm:w-auto">
              <p className="text-sm text-[#A6A6A6] mb-1">Tu Billetera</p>
              <p className="font-mono text-base sm:text-lg text-[#00E5FF] break-all">{truncateAddress(address)}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="hover:bg-[#00E5FF]/10 self-end sm:self-auto"
            >
              {copied ? (
                <CheckCircle2 className="h-5 w-5 text-[#00FF85]" />
              ) : (
                <Copy className="h-5 w-5 text-[#00E5FF]" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Card */}
      <Card className="glass-card data-glow">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl font-heading flex items-center gap-2 text-[#FFD633]">
            <Coins className="h-5 w-5 sm:h-6 sm:w-6" />
            MIS RECOMPENSAS
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Valida reportes de otros usuarios para ganar tokens $ROCK
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 rounded-lg bg-gradient-to-br from-[#FFD633]/20 to-[#FF004D]/10 border border-[#FFD633]/40 shadow-[0_0_25px_rgba(255,214,51,0.3)]">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-xs sm:text-sm text-[#A6A6A6] font-medium">SALDO PENDIENTE</p>
              <p className="text-3xl sm:text-4xl font-bold text-white flex items-baseline gap-2 font-heading justify-center sm:justify-start">
                {Number.parseFloat(pendingRewards).toFixed(4)}
                <span className="text-lg sm:text-xl text-[#FFD633] font-bold">$ROCK</span>
              </p>
            </div>

            <Button
              onClick={handleWithdraw}
              disabled={isWithdrawing || Number.parseFloat(pendingRewards) <= 0}
              size="lg"
              className="bg-gradient-to-r from-[#FFD633] to-[#FF004D] hover:from-[#FFD633]/90 hover:to-[#FF004D]/90 text-[#101820] font-bold shadow-[0_0_20px_rgba(255,214,51,0.4)] w-full sm:w-auto"
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  RETIRANDO...
                </>
              ) : (
                <>
                  <Coins className="mr-2 h-5 w-5" />
                  RETIRAR
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl font-heading flex items-center gap-2 text-[#00E5FF]">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
            SMART CONTRACT
          </CardTitle>
          <CardDescription className="space-y-2">
            <div className="font-mono text-xs break-all text-[#A6A6A6]">{METEORFALL_ADDRESS}</div>
            <a
              href={`${PASEO_EXPLORER}/address/${METEORFALL_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#00E5FF] hover:underline flex items-center gap-1"
            >
              Ver en Blockscout <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="glass-card border-[#00E5FF]/60 shadow-[0_0_30px_rgba(0,229,255,0.2)]">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl font-heading flex items-center gap-3 text-[#00E5FF]">
            <img src="/images/design-mode/Favicon.png" alt="Meteorfall" className="h-12 w-12 flex-shrink-0" />
            <span>CREAR REPORTE</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
          {/* Categoría Section */}
          <div className="space-y-3">
            <Label className="text-sm sm:text-base font-semibold text-white font-heading">CATEGORÍA DEL IMPACTO</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {IMPACTO_CATEGORIAS.map((cat) => (
                <Button
                  key={cat.id}
                  onClick={() => setSelectedCategoria(cat.id)}
                  variant={selectedCategoria === cat.id ? "default" : "outline"}
                  className={`h-auto py-3 px-3 text-xs sm:text-sm font-semibold ${
                    selectedCategoria === cat.id
                      ? "bg-[#00E5FF] text-[#101820] shadow-[0_0_20px_rgba(0,229,255,0.5)]"
                      : "bg-[#101820]/80 border-[#00E5FF]/30 hover:bg-[#00E5FF]/10 text-white"
                  }`}
                  type="button"
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Amenaza Section */}
          <div className="space-y-3">
            <Label className="text-sm sm:text-base font-semibold text-white font-heading">NIVEL DE AMENAZA</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {IMPACTO_AMENAZAS.map((am) => (
                <Button
                  key={am.id}
                  onClick={() => setSelectedAmenaza(am.id)}
                  className={`h-auto py-4 px-4 text-sm sm:text-base font-bold ${am.color} ${
                    selectedAmenaza === am.id ? "ring-4 ring-offset-2 ring-offset-[#101820]" : "opacity-80 hover:opacity-100"
                  }`}
                  type="button"
                >
                  {am.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm sm:text-base font-semibold text-white font-heading">
              ADJUNTAR FOTO DE LA FALLA
            </Label>
            {!uploadedImage ? (
              <label className="block border-2 border-dashed border-[#00E5FF]/30 rounded-lg p-8 hover:border-[#00E5FF]/50 transition-colors bg-[#101820]/30 cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex gap-3">
                    <Upload className="h-8 w-8 text-[#00E5FF] group-hover:scale-110 transition-transform" />
                    <Camera className="h-8 w-8 text-[#00E5FF] group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-[#00E5FF] font-semibold">Arrastra tu imagen aquí o haz click para subir</p>
                  <p className="text-xs text-[#A6A6A6]">Soporta JPG, PNG, WEBP</p>
                </div>
              </label>
            ) : (
              <div className="relative border-2 border-[#00E5FF]/50 rounded-lg p-4 bg-[#101820]/30">
                <Button
                  onClick={removeUploadedImage}
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full bg-[#FF004D] hover:bg-[#FF004D]/80"
                >
                  <X className="h-4 w-4" />
                </Button>
                <img
                  src={uploadedImage || "/placeholder.svg"}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <p className="text-xs text-[#00FF85] text-center mt-2 font-semibold">✓ Imagen cargada</p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleCreateReportWithArkiv}
            disabled={isLoading || !selectedCategoria || !selectedAmenaza}
            className="w-full bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-[#101820] font-bold shadow-[0_0_30px_rgba(0,229,255,0.6)] text-base sm:text-lg py-6"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span>{loadingStep || "PROCESANDO..."}</span>
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                CREAR REPORTE COMPLETO
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive" className="border-[#FF004D] bg-[#FF004D]/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl font-heading flex items-center gap-2 text-[#00E5FF]">
            <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
            REPORTES EN TIEMPO REAL
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Valida reportes de otros usuarios para ganar recompensas. Necesitas 4 validaciones para habilitar
            recompensas.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {impactos.length === 0 ? (
            <div className="text-center py-8 text-[#A6A6A6]">
              <p className="text-sm">No se han encontrado reportes aún.</p>
              <p className="text-xs mt-2">Crea el primer reporte o espera a que se carguen los eventos.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {impactos.map((impacto) => {
                const esMiReporte = impacto.rastreador.toLowerCase() === address.toLowerCase()
                const isProcessing = isValidating === impacto.id
                const categoria = IMPACTO_CATEGORIAS.find(c => c.id === impacto.categoria)
                const amenaza = IMPACTO_AMENAZAS.find(a => a.id === impacto.amenaza)

                return (
                  <div
                    key={impacto.id}
                    className="p-4 rounded-lg bg-[#101820]/60 border border-[#00E5FF]/30 hover:border-[#00E5FF]/50 transition-all shadow-[0_0_15px_rgba(0,229,255,0.1)]"
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden border border-[#00E5FF]/30">
                        <img 
                          src={impacto.imageUrl || getImpactPlaceholderImage(impacto.categoria, impacto.id) || "/placeholder.svg"}
                          alt={categoria?.label || "Impacto"}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-xs sm:text-sm font-bold text-[#00E5FF] font-heading">
                              IMPACTO ID: {impacto.id}
                            </p>
                            {categoria && (
                              <p className="text-xs text-white font-semibold">{categoria.label}</p>
                            )}
                            {amenaza && (
                              <span className={`inline-block text-xs px-2 py-1 rounded ${amenaza.color} font-bold`}>
                                {amenaza.label}
                              </span>
                            )}
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-[#A6A6A6] font-medium">VALIDACIONES</p>
                            <p className="text-2xl font-bold text-[#00E5FF] font-heading">
                              {impacto.contadorValidaciones} / 4
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-[#A6A6A6] truncate" title={impacto.rastreador}>
                          Rastreador: {esMiReporte ? "TÚ" : truncateAddress(impacto.rastreador)}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <Button
                            onClick={() => handleValidar(impacto.id)}
                            disabled={esMiReporte || isProcessing}
                            size="sm"
                            variant={esMiReporte ? "outline" : "default"}
                            className={
                              esMiReporte
                                ? "opacity-50 cursor-not-allowed border-[#A6A6A6]/30 flex-1"
                                : "bg-[#00FF85] hover:bg-[#00FF85]/90 text-[#101820] font-bold shadow-[0_0_15px_rgba(0,255,133,0.4)] flex-1"
                            }
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                Validando...
                              </>
                            ) : (
                              <>
                                <Check className="mr-1 h-4 w-4" />
                                Validar
                              </>
                            )}
                          </Button>

                          <Button
                            onClick={() => window.open(`${PASEO_EXPLORER}/tx/${impacto.txHash}`, '_blank')}
                            size="sm"
                            variant="outline"
                            className="border-[#00E5FF]/30 hover:bg-[#00E5FF]/10 text-[#00E5FF] flex-1"
                          >
                            Ver en Blockscout
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation success modal */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent className="glass-card border-[#00FF85]/60 shadow-[0_0_40px_rgba(0,255,133,0.4)] max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="bg-[#00FF85]/20 p-4 rounded-full">
                <CheckCircle2 className="h-16 w-16 text-[#00FF85]" />
              </div>
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-heading text-center text-[#00FF85]">
              Validación Exitosa
            </DialogTitle>
            <DialogDescription className="text-center text-[#A6A6A6] pt-2">
              Has validado exitosamente el Impacto ID {validatedImpactId}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="p-4 bg-[#101820]/60 rounded-lg border border-[#00E5FF]/30">
              <p className="text-xs text-[#A6A6A6] mb-1">Hash de Transacción:</p>
              <p className="font-mono text-sm text-[#00E5FF] break-all">{validationTxHash}</p>
            </div>

            <Button
              onClick={() => window.open(`${PASEO_EXPLORER}/tx/${validationTxHash}`, "_blank")}
              className="w-full bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-[#101820] font-bold shadow-[0_0_20px_rgba(0,229,255,0.5)]"
              size="lg"
            >
              Ver Transacción en Blockscout
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>

            <Button
              onClick={() => setShowValidationModal(false)}
              variant="outline"
              className="w-full border-[#00E5FF]/30 hover:bg-[#00E5FF]/10 text-[#00E5FF]"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report creation success modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="glass-card border-[#00FF85]/60 shadow-[0_0_40px_rgba(0,255,133,0.4)] max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="bg-[#00FF85]/20 p-4 rounded-full">
                <CheckCircle2 className="h-16 w-16 text-[#00FF85]" />
              </div>
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-heading text-center text-[#00FF85]">
              Reporte Creado Exitosamente
            </DialogTitle>
            <DialogDescription className="text-center text-[#A6A6A6] pt-2">
              Tu reporte ha sido registrado en la blockchain.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="p-4 bg-[#101820]/60 rounded-lg border border-[#00E5FF]/30">
              <p className="text-xs text-[#A6A6A6] mb-1">Hash de Transacción:</p>
              <p className="font-mono text-sm text-[#00E5FF] break-all">{successTxHash}</p>
            </div>

            <Button
              onClick={() => window.open(`${PASEO_EXPLORER}/tx/${successTxHash}`, "_blank")}
              className="w-full bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-[#101820] font-bold shadow-[0_0_20px_rgba(0,229,255,0.5)]"
              size="lg"
            >
              Ver Transacción en Blockscout
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>

            <Button
              onClick={() => setShowSuccessModal(false)}
              variant="outline"
              className="w-full border-[#00E5FF]/30 hover:bg-[#00E5FF]/10 text-[#00E5FF]"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
