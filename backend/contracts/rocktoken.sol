// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// Importamos el contrato ERC-20 estándar de OpenZeppelin.
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title RockToken
 * @dev Contrato ERC-20 estándar para $ROCK.
 * Minta una cantidad inicial de tokens a la dirección que lo despliega (el "Deployer").
 */
contract RockToken is ERC20 {

    /**
     * @param initialSupply La cantidad total de tokens a crear en el despliegue.
     * La cantidad debe incluir los 18 decimales (ej: 1,000,000 * 10**18).
     */
    constructor(uint256 initialSupply) ERC20("Meteorfall ROCK", "ROCK") {
        // _mint crea los tokens y los asigna al 'msg.sender' (tu billetera).
        _mint(msg.sender, initialSupply);
    }
}