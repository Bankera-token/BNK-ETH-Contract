# Bankera ERC223 Contract

## Gerneral Description

Contract should have an ethereum address to deposit reward balance. Once reward is set for round the claim amount is proportionally divided among token holders. For example Jack, John and Brown have 1, 2 and 2 tokens respectively. If 100 ether are rewarded, ethers can by claimed by Jack, John and Brown proportionally: 20, 40, 40 ether.

## Testing
Preparation:
```
start init.sh
npm i
```    
Run tests:
```
start runrpc.sh
start run.sh
```

## Requirements

### Permissions

Creator (contract owner) can do all admin functions.
Create hardcoded admin (address) list to allow them to use certain functions. Each different function for each different admin:
* distribute tokens to ETH addresses (issue admin)
* set reward for round (reward admin)
* adjust round length (round admin)

### Balances

Token issue method to issue specified count of Tokens to provided address by Contract owner, issue admin. Not more than total supply.
Token owner can transfer owning Tokens to different address.
Not issued tokens are not owned by anyone and are not included into reward calculation. (but can be issued any time until total supply limit)
On token issue: ``issuedTokens[currentRound] = (issuedTokens[last record] ?? 0) + issueAmount``
Token balances are being held in data structure: ``balances = address[] => round[] => token balance``
Round is increased each week (check for increase on issue, transfer, reward).
On issue, transfer:
* if round ID is not increased - increase to the up to date currentRound  number. Check for gaps and fill issuedTokens  with latest value in the same array for missing rounds.
* Check for existing address Token balance. Getting last record of ``balances[msg.sender]`` to check existing ``tokenBalance``
* Funding address. ``balances[msg.sender][currentRound] = currentBalance + tokenChange``
* Withdrawing from address. ``balances[msg.sender][currentRound] = currentBalance - tokenChange``

### Reward

Reward for each round: ``rewardList = round[] => reward ``
Last claimed round of each address ``claims = address[] => round``
On ETH receive, ETH is stored to Contract balance
Owner, Reward admin can call ``setReward`` for round method (one time for each round) and reward amount is set for provided round. ``rewardList[round] = reward``
Token Owner can claim reward in ETH. Calling ``claimReward(destinationAddress)``.
Token Owner can claim reward in ETH. Calling ``claimReward(destinationAddress, untilRound)`` while specifying round until which reward should be claimed. ``untilRound`` should be: ``lastClaimRound < untilRound <= currentRound``. ``untilRound`` is not included.

``lastClaimRound = claims[msg.sender] ?? 0``
```
reward = SUM(having claimRound from lastClaimRound + 1 to currentRound - 1) {
   return (balances[msg.seneder][claimRound] / issuedTokens[claimRound]) * rewardList[claimRound]
}
```

After claim. ``claims[msg.sender] = currentRound - 1``
Claimed ETH are sent to ``destinationAddress``

### Rounds

Have ``currentRoundStartBlock``
Rounds are calculated and adjusted to correlate to weekly timing.
``blocksPerRound  = 6000 x 7 = 42000`` (at the time of writing)
Function ``setBlocksPerRound(blocksPerRound)``to adjust ``blocksPerRound`` by Contract owner, Round admin
If performing token issue, transfer, claim, ``currentRound`` is updated based on ``currentBlock``, ``blocksPerRound`` and ``currentRoundStartBlock`` if needed.

``currentRound = currentRound + (currentBlock - currentRoundStartBlock) / blocksPerRound``

When updating ``currentRound``, ``currentRoundStartBlock`` is updated accordingly
``currentRoundStartBlock = currentRoundStartBlock + blocksPerRound * (currentRound - currentRoundBeforeUpdate)``
having ``currentRoundStartBlock <= currentBlock``