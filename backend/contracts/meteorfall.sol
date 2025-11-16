// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Interfaz para el token $ROCK (ERC-20 estándar)
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

contract Meteorfall {
    // ----------------------------------------------------------------
    // ESTRUCTURAS Y ESTADO
    // ----------------------------------------------------------------
    
    struct Impacto {
        address rastreador;
        bytes32 arkivId;                // ID del manifiesto de datos en Arkiv
        uint256 contadorValidaciones;
        mapping(address => bool) yaValidado;
        address[] listaValidadores;     // Necesaria para asignar recompensas pendientes
        bool recompensasHabilitadas;    // Renombrada desde 'pagadoCompletamente'
    }

    mapping(uint256 => Impacto) public impactos;
    uint256 public nextImpactoId = 1;
    
    // NUEVO: Mapeo para el patrón Pull-over-Push.
    // Almacena cuánto $ROCK puede retirar cada dirección.
    mapping(address => uint256) public recompensasPendientes;

    IERC20 public tokenRock;
    
    // Constantes (Punto 3 y 60/40)
    uint256 private constant UMBRAL_VALIDACION = 4;
    uint256 private constant RECOMPENSA_TOTAL = 1000 * (10**18); // 1000 $ROCK
    
    // Nueva división 60/40
    uint256 private constant RECOMPENSA_RASTREADOR = (RECOMPENSA_TOTAL * 60) / 100; // 600 $ROCK (60%)
    uint256 private constant RECOMPENSA_TOTAL_VALIDADORES = (RECOMPENSA_TOTAL * 40) / 100; // 400 $ROCK (40%)
    
    // Cálculo de precisión: 400 $ROCK / 4 Validadores = 100 $ROCK cada uno.
    // La matemática es exacta, no se genera "polvo".
    uint256 private constant RECOMPENSA_INDIVIDUAL_VALIDADOR = RECOMPENSA_TOTAL_VALIDADORES / UMBRAL_VALIDACION; // 20 $ROCK

    // ----------------------------------------------------------------
    // EVENTOS
    // ----------------------------------------------------------------
    
    event NuevoImpactoReportado(uint256 indexed impactoId, address indexed rastreador);
    event ImpactoValidado(uint256 indexed impactoId, address indexed validador, uint256 nuevoContador);
    
    // NUEVO: Eventos para el patrón de retiro.
    event RecompensasHabilitadas(uint256 indexed impactoId, uint256 montoTotal);
    event RecompensaRetirada(address indexed usuario, uint256 monto);

    // ----------------------------------------------------------------
    // CONSTRUCTOR
    // ----------------------------------------------------------------
    
    constructor(address _tokenRockAddress) {
        tokenRock = IERC20(_tokenRockAddress);
    }

    // ----------------------------------------------------------------
    // FUNCIONES PRINCIPALES DEL JUEGO
    // ----------------------------------------------------------------
    
    function reportarImpacto(bytes32 _arkivId) public {
        // Obtenemos una referencia de almacenamiento al nuevo impacto
        Impacto storage nuevoImpacto = impactos[nextImpactoId];

        // Asignamos los valores a cada campo individualmente
        nuevoImpacto.rastreador = msg.sender;
        nuevoImpacto.arkivId = _arkivId;
        
        emit NuevoImpactoReportado(nextImpactoId, msg.sender);
        nextImpactoId++;
    }

    function validarImpacto(uint256 _impactoId) public {
        Impacto storage impacto = impactos[_impactoId];

        // Verificaciones
        require(impacto.rastreador != address(0), "Impacto no encontrado.");
        require(impacto.yaValidado[msg.sender] == false, "Ya has validado este impacto.");
        require(impacto.rastreador != msg.sender, "No puedes validar tu propio reporte.");
        require(impacto.recompensasHabilitadas == false, "Las recompensas de este impacto ya fueron habilitadas."); 
        
        // Efectos (Actualización de estado)
        impacto.yaValidado[msg.sender] = true;
        impacto.contadorValidaciones++;
        
        if (impacto.contadorValidaciones <= UMBRAL_VALIDACION) {
            impacto.listaValidadores.push(msg.sender);
        }

        emit ImpactoValidado(_impactoId, msg.sender, impacto.contadorValidaciones);
        
        // Habilitación de Recompensas (sin interacción externa)
        if (impacto.contadorValidaciones == UMBRAL_VALIDACION) {
            _habilitarRecompensas(_impactoId, impacto);
        }
    }
    
    // ----------------------------------------------------------------
    // FUNCIONES DE RETIRO (Pull-over-Push)
    // ----------------------------------------------------------------

    /**
     * @notice Habilita las recompensas para el retiro (Patrón Pull-over-Push).
     * @dev Sigue el patrón Checks-Effects-Interactions.
     * @dev Esta función NO realiza transferencias (Interactions), solo actualiza el estado (Effects).
     */
    function _habilitarRecompensas(uint256 _impactoId, Impacto storage impacto) private {
        // 1. Checks (Ya se hicieron en validarImpacto, pero doble chequeo)
        if (impacto.recompensasHabilitadas) return;

        // 2. Effects (Corrección Riesgo Reentrada - Punto 1)
        // Se actualiza el estado ANTES de cualquier lógica de cálculo.
        impacto.recompensasHabilitadas = true; 

        // 3. Effects (Asignación de recompensas pendientes - 60/40)
        recompensasPendientes[impacto.rastreador] += RECOMPENSA_RASTREADOR;

        for (uint i = 0; i < impacto.listaValidadores.length; i++) {
            // Aseguramos que solo pagamos al número exacto del umbral
            if (i < UMBRAL_VALIDACION) {
                address validador = impacto.listaValidadores[i];
                recompensasPendientes[validador] += RECOMPENSA_INDIVIDUAL_VALIDADOR;
            }
        }
        
        // 4. Interactions (Ninguna)
        emit RecompensasHabilitadas(_impactoId, RECOMPENSA_TOTAL);
    }

    /**
     * @notice Permite a los usuarios (Rastreador y Validadores) retirar sus $ROCK ganados.
     * @dev Sigue el patrón Checks-Effects-Interactions para prevenir reentrada en el retiro.
     */
    function retirarRecompensa() public {
        // 1. Checks
        uint256 monto = recompensasPendientes[msg.sender];
        require(monto > 0, "No tienes recompensas pendientes para retirar.");

        // 2. Effects (Prevención de Reentrada en la función de retiro)
        // Se resetea el balance del usuario ANTES de la transferencia.
        recompensasPendientes[msg.sender] = 0;

        // 3. Interactions (Solución Punto 2 - Gas)
        // El usuario (msg.sender) paga el gas de esta única transferencia.
        require(tokenRock.transfer(msg.sender, monto), "Fallo la transferencia del token.");

        emit RecompensaRetirada(msg.sender, monto);
    }

    // ----------------------------------------------------------------
    // FUNCIONES DE LECTURA (Frontend)
    // ----------------------------------------------------------------

    function getContadorValidaciones(uint256 _impactoId) public view returns (uint256) {
        return impactos[_impactoId].contadorValidaciones;
    }

    function getArkivId(uint256 _impactoId) public view returns (bytes32) { // Renombrada desde getHashEvidencia
        return impactos[_impactoId].arkivId; // Accede al nuevo campo arkivId
    }
}
