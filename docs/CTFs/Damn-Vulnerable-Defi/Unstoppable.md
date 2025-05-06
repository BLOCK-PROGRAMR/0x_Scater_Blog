
#  Unstoppable Challenge

## Challenge Overview
This challenge involves exploiting a flashloan vulnerability in the UnstoppableVault contract. The vault offers flash loans with a fee and allows the owner to pause the contract and execute arbitrary changes. The goal is to exploit the flashloan mechanism, triggering an unwanted state change.

##  Smart Contract Breakdown

###  Important State Variables
- `FEE_FACTOR`: The fee for flashloans (5%).
- `GRACE_PERIOD`: The period after which the flashloan fee changes.
- `feeRecipient`: The address to which the flashloan fees are sent.
- `end`: The timestamp that determines the end of the grace period.

###  Critical Functions
- **`maxFlashLoan`**: Returns the maximum amount for a flashloan based on the total assets in the vault.
- **`flashFee`**: Calculates the fee for the flashloan.
- **`flashLoan`**: Executes the flashloan by transferring tokens, calling the borrower's callback, and ensuring the correct fee is returned.
- **`execute`**: Allows the owner to execute arbitrary changes when the contract is paused.
- **`setPause`**: Pauses or unpauses the vault.

### ⚠️ Potential Vulnerability
The vault is vulnerable to a **Denial of Service (DoS) attack** via the flashloan function. An attacker can trigger a failure in the `flashLoan` function, causing the vault to enter a paused state and preventing further flashloans.

##  Vulnerability Explained
The vulnerability occurs when the `flashLoan` function fails due to an invalid state (e.g., an incorrect balance). If this happens, the vault is paused, and ownership is transferred to the attacker. This results in the vault being stuck in a paused state, rendering the flashloan feature unusable.

##  Exploit Strategy
1. **FlashLoan Attack**: The attacker initiates a flashloan with an invalid amount or token to trigger the revert condition in the `flashLoan` function.
2. **Vault Pause**: Upon failure, the vault enters a paused state, preventing any further flashloans.
3. **Ownership Transfer**: The attacker gains control of the vault by transferring ownership, allowing them to alter the contract or withdraw funds.

##  Exploit Code (Solidity)

```solidity
function test_unstoppable() public checkSolvedByPlayer {
    // DOS attack by using an external call to the vault to stop the flashloan
    token.transfer(address(vault), 2);
}
```
### Proof of exploit 

``` text
FlashLoanStatus(success: false)
Paused(account: UnstoppableMonitor: [0xfF2Bd636B9Fc89645C2D336aeaDE2E4AbaFe1eA5])
OwnershipTransferred(previousOwner: UnstoppableMonitor, newOwner: deployer)
```

🔗 **GitHub**: [View](https://github.com/BLOCK-PROGRAMR/SCATER70/tree/main/ctf/damn-vulnerable-defi)