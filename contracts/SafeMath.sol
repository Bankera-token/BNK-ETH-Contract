pragma solidity ^0.4.18;
/**
 * Math operations with safety checks that throw on error
 */
contract SafeMath {

	function safeMul(uint256 a, uint256 b) public pure returns (uint256) {
		uint256 c = a * b;
		assert(a == 0 || c / a == b);
		return c;
	}

	function safeDiv(uint256 a, uint256 b) public pure returns (uint256) {
		//assert(a > 0);// Solidity automatically throws when dividing by 0
		//assert(b > 0);// Solidity automatically throws when dividing by 0
		// uint256 c = a / b;
		// assert(a == b * c + a % b); // There is no case in which this doesn't hold
		return  a / b;
	}

	function safeSub(uint256 a, uint256 b) public pure returns (uint256) {
		assert(b <= a);
		return a - b;
	}

	function safeAdd(uint256 a, uint256 b) public pure returns (uint256) {
		uint256 c = a + b;
		assert(c>=a && c>=b);
		return c;
	}

}