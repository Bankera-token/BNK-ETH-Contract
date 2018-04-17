pragma solidity ^0.4.18;

import "./SafeMath.sol";
/*
 * ERC20 interface
 * see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 {

	function totalSupply() public constant returns (uint256);
	function balanceOf(address _owner) public constant returns (uint256);
	function transfer(address _to, uint256 _value) public returns (bool success);
	function transferFrom(address _from, address _to, uint256 _value) public returns (bool success);
	function approve(address _spender, uint256 _value) public returns (bool success);
	function allowance(address _owner, address _spender) public constant returns (uint256);

	/* ERC20 Events */
	event Transfer(address indexed _from, address indexed _to, uint256 _value);
	event Approval(address indexed _owner, address indexed _spender, uint256 _value);
}

contract ContractReceiver {
	function tokenFallback(address _from, uint256 _value, bytes _data) public;
}

contract ERC223 is ERC20 {

	function transfer(address _to, uint256 _value, bytes _data) public returns (bool success);
	function transfer(address _to, uint256 _value, bytes _data, string _custom_fallback) public returns (bool success);

	/* ERC223 Events */
	event Transfer(address indexed _from, address indexed _to, uint256 _value, bytes _data);
}

contract BankeraToken is ERC223, SafeMath {

	string public constant name = "Bankera";     // Set the name for display purposes
	string public constant symbol = "BNK";      // Set the symbol for display purposes
	uint8 public constant decimals = 8;         // Amount of decimals for display purposes
	uint256 private issued = 0;   				// tokens count issued to addresses
	uint256 private totalTokens = 25000000000 * 100000000; //25,000,000,000.0000 0000 BNK

	address private contractOwner;
	address private rewardManager;
	address private roundManager;
	address private issueManager;
	uint64 public currentRound = 0;

	bool public paused = false;

	mapping (uint64 => Reward) public reward;	//key - round, value - reward in round
	mapping (address => AddressBalanceInfoStructure) public accountBalances;	//key - address, value - address balance info
	mapping (uint64 => uint256) public issuedTokensInRound;	//key - round, value - issued tokens

	uint256 public blocksPerRound; // blocks per round
	uint256 public lastBlockNumberInRound;

	struct Reward {
		uint64 roundNumber;
		uint256 rewardInWei;
		uint256 rewardRate; //reward rate in wei. 1 sBNK - xxx wei
		bool isConfigured;
	}

	struct AddressBalanceInfoStructure {
		uint256 addressBalance;
		mapping (uint => uint256) roundBalanceMap; //key - round number, value - total token amount in round
		mapping (uint64 => bool) wasModifiedInRoundMap; //key - round number, value - is modified in round
		uint64[] mapKeys;	//round balance map keys
		uint64 claimedRewardTillRound;
		uint256 totalClaimedReward;
	}

	/* Initializes contract with initial blocks per round number*/
	function BankeraToken(uint256 _blocksPerRound, uint64 _round) public {
		contractOwner = msg.sender;
		lastBlockNumberInRound = block.number;

		blocksPerRound = _blocksPerRound;
		currentRound = _round;
	}

	function() public whenNotPaused payable {
	}

	// Public functions
	/**
	 * @dev Reject all ERC223 compatible tokens
	 * @param _from address The address that is transferring the tokens
	 * @param _value uint256 the amount of the specified token
	 * @param _data Bytes The data passed from the caller.
	 */
	function tokenFallback(address _from, uint256 _value, bytes _data) public whenNotPaused view {
		revert();
	}

	function setReward(uint64 _roundNumber, uint256 _roundRewardInWei) public whenNotPaused onlyRewardManager {
		isNewRound();

		Reward storage rewardInfo = reward[_roundNumber];

		//validations
		assert(rewardInfo.roundNumber == _roundNumber);
		assert(!rewardInfo.isConfigured); //allow just not configured reward configuration

		rewardInfo.rewardInWei = _roundRewardInWei;
		if(_roundRewardInWei > 0){
			rewardInfo.rewardRate = safeDiv(_roundRewardInWei, issuedTokensInRound[_roundNumber]);
		}
		rewardInfo.isConfigured = true;
	}

	/* Change contract owner */
	function changeContractOwner(address _newContractOwner) public onlyContractOwner {
		isNewRound();
		if (_newContractOwner != contractOwner) {
			contractOwner = _newContractOwner;
		} else {
			revert();
		}
	}

	/* Change reward contract owner */
	function changeRewardManager(address _newRewardManager) public onlyContractOwner {
		isNewRound();
		if (_newRewardManager != rewardManager) {
			rewardManager = _newRewardManager;
		} else {
			revert();
		}
	}

	/* Change round contract owner */
	function changeRoundManager(address _newRoundManager) public onlyContractOwner {
		isNewRound();
		if (_newRoundManager != roundManager) {
			roundManager = _newRoundManager;
		} else {
			revert();
		}
	}

	/* Change issue contract owner */
	function changeIssueManager(address _newIssueManager) public onlyContractOwner {
		isNewRound();
		if (_newIssueManager != issueManager) {
			issueManager = _newIssueManager;
		} else {
			revert();
		}
	}

	function setBlocksPerRound(uint64 _newBlocksPerRound) public whenNotPaused onlyRoundManager {
		blocksPerRound = _newBlocksPerRound;
	}
	/**
   * @dev called by the owner to pause, triggers stopped state
   */
	function pause() onlyContractOwner whenNotPaused public {
		paused = true;
	}

	/**
	 * @dev called by the owner to resume, returns to normal state
	 */
	function resume() onlyContractOwner whenPaused public {
		paused = false;
	}
	/**
	 *
	 * permission checker
	 */
	modifier onlyContractOwner() {
		if(msg.sender != contractOwner){
			revert();
		}
		_;
	}
	/**
	* set reward for round (reward admin)
	*/
	modifier onlyRewardManager() {
		if(msg.sender != rewardManager && msg.sender != contractOwner){
			revert();
		}
		_;
	}
	/**
	* adjust round length (round admin)
	*/
	modifier onlyRoundManager() {
		if(msg.sender != roundManager && msg.sender != contractOwner){
			revert();
		}
		_;
	}
	/**
	* issue tokens to ETH addresses (issue admin)
	*/
	modifier onlyIssueManager() {
		if(msg.sender != issueManager && msg.sender != contractOwner){
			revert();
		}
		_;
	}

	modifier notSelf(address _to) {
		if(msg.sender == _to){
			revert();
		}
		_;
	}
	/**
   	* @dev Modifier to make a function callable only when the contract is not paused.
   	*/
	modifier whenNotPaused() {
		require(!paused);
		_;
	}

	/**
	 * @dev Modifier to make a function callable only when the contract is paused.
	 */
	modifier whenPaused() {
		require(paused);
		_;
	}
	/**
	 *
	 * Fix for the ERC20 short address attack
	 *
	 * http://vessenes.com/the-erc20-short-address-attack-explained/
	 */
	modifier onlyPayloadSize(uint _size) {
		assert(msg.data.length >= _size + 4);
		_;
	}

	function getRoundBalance(address _address, uint256 _round) public view returns (uint256) {
		return accountBalances[_address].roundBalanceMap[_round];
	}

	function isModifiedInRound(address _address, uint64 _round) public view returns (bool) {
		return accountBalances[_address].wasModifiedInRoundMap[_round];
	}

	function getBalanceModificationRounds(address _address) public view returns (uint64[]) {
		return accountBalances[_address].mapKeys;
	}

	//action for issue tokens
	function issueTokens(address _receiver, uint256 _tokenAmount) public whenNotPaused onlyIssueManager {
		isNewRound();
		issue(_receiver, _tokenAmount);
	}

	function withdrawEther() public onlyContractOwner {
		isNewRound();
		if(this.balance > 0) {
			contractOwner.transfer(this.balance);
		} else {
			revert();
		}
	}

	/* Send coins from owner to other address */
	/*Override*/
	function transfer(address _to, uint256 _value) public onlyPayloadSize(2 * 32) notSelf(_to) whenNotPaused returns (bool success){
		//added due to backwards compatibility reasons
		bytes memory empty;
		if(isContract(_to)) {
			return transferToContract(_to, _value, empty);
		}
		else {
			return transferToAddress(_to, _value, empty);
		}
	}

	/*Override*/
	function balanceOf(address _owner) public constant returns (uint256 balance) {
		return accountBalances[_owner].addressBalance;
	}

	/*Override*/
	function totalSupply() public constant returns (uint256){
		return totalTokens;
	}

	/*Override*/
	function transferFrom(address /*_from*/, address /*_to*/, uint256 /*_value*/) public whenNotPaused returns (bool success){
		return false;
	}

	/*Override*/
	function approve(address /*_spender*/, uint256 /*_value*/) public whenNotPaused returns (bool success){
		return false;
	}

	/*Override*/
	function allowance(address /*_owner*/, address /*_spender*/) public constant whenNotPaused returns (uint256){
		return 0;
	}

	// Function that is called when a user or another contract wants to transfer funds .
	/*Override*/
	function transfer(address _to, uint256 _value, bytes _data) public whenNotPaused notSelf(_to) returns (bool success){
		if(isContract(_to)) {
			return transferToContract(_to, _value, _data);
		}
		else {
			return transferToAddress(_to, _value, _data);
		}
	}

	// Function that is called when a user or another contract wants to transfer funds.
	/*Override*/
	function transfer(address _to, uint256 _value, bytes _data, string _custom_fallback) public whenNotPaused notSelf(_to) returns (bool success){
		if(isContract(_to)) {
			if(accountBalances[msg.sender].addressBalance < _value){		// Check if the sender has enough
				revert();
			}
			if(safeAdd(accountBalances[_to].addressBalance, _value) < accountBalances[_to].addressBalance){		// Check for overflows
				revert();
			}

			isNewRound();
			subFromAddressBalancesInfo(msg.sender, _value);	// Subtract from the sender
			addToAddressBalancesInfo(_to, _value);	// Add the same to the recipient

			assert(_to.call.value(0)(bytes4(keccak256(_custom_fallback)), msg.sender, _value, _data));
			Transfer(msg.sender, _to, _value, _data);
			return true;
		}
		else {
			return transferToAddress(_to, _value, _data);
		}
	}

	function claimReward() public whenNotPaused returns (uint256 rewardAmountInWei) {
		isNewRound();
		return claimRewardTillRound(currentRound);
	}

	function claimRewardTillRound(uint64 _claimTillRound) public whenNotPaused returns (uint256 rewardAmountInWei) {
		if(msg.sender == contractOwner){ //don't allow contract owner to claim reward
			revert();
		}

		isNewRound();
		rewardAmountInWei = calculateClaimableRewardTillRound(_claimTillRound);
		accountBalances[msg.sender].claimedRewardTillRound = _claimTillRound;

		if (rewardAmountInWei > 0){
			accountBalances[msg.sender].totalClaimedReward = safeAdd(accountBalances[msg.sender].totalClaimedReward, rewardAmountInWei);
			msg.sender.transfer(rewardAmountInWei);
		}

		return rewardAmountInWei;
	}

	function calculateClaimableReward() public constant returns (uint256 rewardAmountInWei) {
		if (currentRound < 1) { return rewardAmountInWei; }
		return calculateClaimableRewardTillRound(currentRound);
	}

	function calculateClaimableRewardTillRound(uint64 _claimTillRound) public constant returns (uint256) {
		uint256 rewardAmountInWei = 0;
		AddressBalanceInfoStructure storage accountBalanceInfo = accountBalances[msg.sender];
		if(accountBalanceInfo.mapKeys.length == 0){
			return rewardAmountInWei;
		}

		uint64 userLastClaimedRewardRound = accountBalanceInfo.claimedRewardTillRound;

		if (_claimTillRound > currentRound) { return rewardAmountInWei; }
		if (_claimTillRound < userLastClaimedRewardRound) { return rewardAmountInWei; }
		if (currentRound < 1) { return rewardAmountInWei; }

		for (uint64 workRound = userLastClaimedRewardRound; workRound < _claimTillRound; workRound++) {

			Reward storage rewardInfo = reward[workRound];
			assert(rewardInfo.isConfigured); //don't allow to withdraw reward if affected reward is not configured

			if(accountBalanceInfo.wasModifiedInRoundMap[workRound]){
				rewardAmountInWei = safeAdd(rewardAmountInWei, safeMul(accountBalanceInfo.roundBalanceMap[workRound], rewardInfo.rewardRate));
			} else {
				uint64 lastBalanceModifiedRound = 0;
				for (uint256 i = accountBalanceInfo.mapKeys.length; i > 0; i--) {
					uint64 modificationInRound = accountBalanceInfo.mapKeys[i-1];
					if (modificationInRound <= workRound) {
						lastBalanceModifiedRound = modificationInRound;
						break;
					}
				}
				rewardAmountInWei = safeAdd(rewardAmountInWei, safeMul(accountBalanceInfo.roundBalanceMap[lastBalanceModifiedRound], rewardInfo.rewardRate));
			}
		}
		return rewardAmountInWei;
	}

	function createRounds(uint256 maxRounds) public onlyRoundManager {
		uint blocksAfterLastRound = safeSub(block.number, lastBlockNumberInRound);	//current block number - last round block number = blocks after last round

		if(blocksAfterLastRound >= blocksPerRound){	// need to increase reward round if blocks after last round is greater or equal blocks per round

			uint256 roundsNeedToCreate = safeDiv(blocksAfterLastRound, blocksPerRound);	//calculate how many rounds need to create
			if(roundsNeedToCreate > maxRounds){
				roundsNeedToCreate = maxRounds;
			}
			lastBlockNumberInRound = safeAdd(lastBlockNumberInRound, safeMul(roundsNeedToCreate, blocksPerRound));
			for (uint256 i = 0; i < roundsNeedToCreate; i++) {
				updateRoundInformation();
			}
		}
	}

	// Private functions
	//assemble the given address bytecode. If bytecode exists then the _address is a contract.
	function isContract(address _address) private view returns (bool is_contract) {
		uint length;
		assembly {
		//retrieve the size of the code on target address, this needs assembly
			length := extcodesize(_address)
		}
		return (length > 0);
	}

	function isNewRound() private {
		uint blocksAfterLastRound = safeSub(block.number, lastBlockNumberInRound);	//current block number - last round block number = blocks after last round
		if(blocksAfterLastRound >= blocksPerRound){	// need to increase reward round if blocks after last round is greater or equal blocks per round
			updateRoundsInformation(blocksAfterLastRound);
		}
	}

	function updateRoundsInformation(uint256 _blocksAfterLastRound) private {
		uint256 roundsNeedToCreate = safeDiv(_blocksAfterLastRound, blocksPerRound);	//calculate how many rounds need to create
		lastBlockNumberInRound = safeAdd(lastBlockNumberInRound, safeMul(roundsNeedToCreate, blocksPerRound));	//calculate last round creation block number
		for (uint256 i = 0; i < roundsNeedToCreate; i++) {
			updateRoundInformation();
		}
	}

	function updateRoundInformation() private {
		issuedTokensInRound[currentRound] = issued;

		Reward storage rewardInfo = reward[currentRound];
		rewardInfo.roundNumber = currentRound;

		currentRound = currentRound + 1;
	}

	function issue(address _receiver, uint256 _tokenAmount) private {
		if(_tokenAmount == 0){
			revert();
		}
		uint256 newIssuedAmount = safeAdd(_tokenAmount, issued);
		if(newIssuedAmount > totalTokens){
			revert();
		}
		addToAddressBalancesInfo(_receiver, _tokenAmount);
		issued = newIssuedAmount;
		bytes memory empty;
		if(isContract(_receiver)) {
			ContractReceiver receiverContract = ContractReceiver(_receiver);
			receiverContract.tokenFallback(msg.sender, _tokenAmount, empty);
		}
		Transfer(msg.sender, _receiver, _tokenAmount, empty);
	}

	function addToAddressBalancesInfo(address _receiver, uint256 _tokenAmount) private {
		AddressBalanceInfoStructure storage accountBalance = accountBalances[_receiver];

		if(!accountBalance.wasModifiedInRoundMap[currentRound]){	//allow just push one time per round
			// If user first time get update balance set user claimed reward round to round before.
			if(accountBalance.mapKeys.length == 0 && currentRound > 0){
				accountBalance.claimedRewardTillRound = currentRound;
			}
			accountBalance.mapKeys.push(currentRound);
			accountBalance.wasModifiedInRoundMap[currentRound] = true;
		}
		accountBalance.addressBalance = safeAdd(accountBalance.addressBalance, _tokenAmount);
		accountBalance.roundBalanceMap[currentRound] = accountBalance.addressBalance;
	}

	function subFromAddressBalancesInfo(address _adr, uint256 _tokenAmount) private {
		AddressBalanceInfoStructure storage accountBalance = accountBalances[_adr];
		if(!accountBalance.wasModifiedInRoundMap[currentRound]){	//allow just push one time per round
			accountBalance.mapKeys.push(currentRound);
			accountBalance.wasModifiedInRoundMap[currentRound] = true;
		}
		accountBalance.addressBalance = safeSub(accountBalance.addressBalance, _tokenAmount);
		accountBalance.roundBalanceMap[currentRound] = accountBalance.addressBalance;
	}
	//function that is called when transaction target is an address
	function transferToAddress(address _to, uint256 _value, bytes _data) private returns (bool success) {
		if(accountBalances[msg.sender].addressBalance < _value){		// Check if the sender has enough
			revert();
		}
		if(safeAdd(accountBalances[_to].addressBalance, _value) < accountBalances[_to].addressBalance){		// Check for overflows
			revert();
		}

		isNewRound();
		subFromAddressBalancesInfo(msg.sender, _value);	// Subtract from the sender
		addToAddressBalancesInfo(_to, _value);	// Add the same to the recipient

		/* Notify anyone listening that this transfer took place */
		Transfer(msg.sender, _to, _value, _data);
		return true;
	}

	//function that is called when transaction target is a contract
	function transferToContract(address _to, uint256 _value, bytes _data) private returns (bool success) {
		if(accountBalances[msg.sender].addressBalance < _value){		// Check if the sender has enough
			revert();
		}
		if(safeAdd(accountBalances[_to].addressBalance, _value) < accountBalances[_to].addressBalance){		// Check for overflows
			revert();
		}

		isNewRound();
		subFromAddressBalancesInfo(msg.sender, _value);	// Subtract from the sender
		addToAddressBalancesInfo(_to, _value);	// Add the same to the recipient

		ContractReceiver receiver = ContractReceiver(_to);
		receiver.tokenFallback(msg.sender, _value, _data);
		Transfer(msg.sender, _to, _value, _data);
		return true;
	}
}