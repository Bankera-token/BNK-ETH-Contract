pragma solidity ^0.4.18;

import "./ERC20.sol";

contract ERC20Demo is StandardToken {
	string public name        = "ERC20Demo";
	string public symbol      = "ERC20Demo";
	uint256   public decimals    = 2;
	uint256   public totalSupply = 1000000000000000;

	function ERC20Demo(address owner) public {
		totalSupply     = totalSupply;
		balances[owner] = totalSupply;
	}

}