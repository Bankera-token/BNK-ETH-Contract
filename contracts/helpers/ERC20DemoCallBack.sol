pragma solidity ^0.4.18;

import "./ERC20.sol";

contract ERC20DemoCallBack is StandardToken {
	string public name        = "ERC20Callback";
	string public symbol      = "ERC20Callback";
	uint256   public decimals    = 4;
	uint256   public totalSupply = 2000000000000;

	function ERC20DemoCallBack(address owner) public {
		totalSupply     = totalSupply;
		balances[owner] = totalSupply;
	}

	function tokenFallback(address /*_from*/, uint256 /*_value*/, bytes /*_data*/) public {

	}
}