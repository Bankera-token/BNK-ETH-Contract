# Bankera ERC223 Contract

## General Description

The Contract has to have an Ethereum address in order to deposit a reward. Once the reward is set up for the weekly round, the claim amount will be proportionally divided among round token holders. For example, Jack, John and Bob have 1, 2 and 2 tokens respectively. If 100 ethers are placed in the round as a reward, Jack, John and Bob can claim 20, 40, 40 ethers respectively through the smart contract.

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

The creator (contract owner) can perform all the admin functions, such as creating  admin (address) list to allow admins to use certain functions. Different functions are assigned for each different admin:
* distribute tokens to ETH addresses (Issue admin); 
* set a reward for each weekly round (Reward admin);
* adjust the round length (Round admin).

### Balances

Token issue method to determine the specific amount of Tokens to be issued to the address provided by the Contract owner or issue admin.
The total Token supply cannot be exceeded. Token holders can transfer their own Tokens to different addresses. Not issued tokens are not owned by anyone and are not included into the reward calculation (but can be issued at any time until the total lifetime supply is reached).
On token issue: ``issuedTokens[currentRound] = (issuedTokens[last record] ?? 0) + issueAmount``
The Token balance is being held in the following data structure: ``balances = address[] => round[] => token balance``
The Round is increased weekly (check for an increase on Token issue, then transfer and reward). 
On Token issue, transfer:
* If the round ID has not been increased - increase to the most recent currentRound number. Check for gaps and fill issuedTokens with the latest value in the same array of missing Rounds.
* Check for existing Token balance in the address. Get the last record of ``balances[msg.sender]`` to check existing ``tokenBalance``
* Funding address: ``balances[msg.sender][currentRound] = currentBalance + tokenChange``
* Withdrawing from address: ``balances[msg.sender][currentRound] = currentBalance - tokenChange``

### Reward

Reward for each round: ``rewardList = round[] => reward ``
Latest claimed round of each address: ``claims = address[] => round``
When received, the ETH is stored in the Contract balance. The Owner (Reward admin) can call ``setReward`` for the Round method (one time for each Round) and a Reward amount is set for the provided round: ``rewardList[round] = reward``. Also round ``rewardRate`` is updated: ``rewardRate[round] = reward / issuedTokens[round]``.
The Token holder is entitled to a reward in ETH. Calling ``claimReward()``, the token holder will claim the reward in ETH. 
When calling ``claimRewardTillRound(untilRound)`` the Round until which the reward should be claimed has to be specified. ``untilRound`` should be: ``lastClaimRound < untilRound <= currentRound``. ``untilRound`` is not included in the claim.

``lastClaimRound = claims[msg.sender] ?? 0``
```
reward = SUM(having claimRound from lastClaimRound to currentRound - 1) {
   return balances[msg.seneder][claimRound] * rewardRate[claimRound]
}
```

After claiming, the claimed ETH amount is sent to the ``destinationAddress`` and claims are updated: ``claims[msg.sender] = currentRound``

### Rounds

Having ``currentRoundStartBlock``, the Rounds are calculated and adjusted to correlate to the  weekly timing.
``blocksPerRound  = 6000 x 7 = 42000`` (at the time of writing)
Function ``setBlocksPerRound(blocksPerRound)``to adjust ``blocksPerRound`` by the Contract owner or Round admin.
If performing token issue, transfer or claim, the ``currentRound`` is updated based on ``currentBlock``, ``blocksPerRound`` and ``currentRoundStartBlock``, if needed.

``currentRound = currentRound + (currentBlock - currentRoundStartBlock) / blocksPerRound``

When updating the ``currentRound``, ``currentRoundStartBlock`` is updated accordingly.
``currentRoundStartBlock = currentRoundStartBlock + blocksPerRound * (currentRound - currentRoundBeforeUpdate)``, if having ``currentRoundStartBlock <= currentBlock``.
