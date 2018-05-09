pragma solidity ^0.4.18;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/BankeraToken.sol";

contract TestBankeraToken {

  function testInitialBalanceUsingDeployedContract() public {
	  BankeraToken meta = BankeraToken(DeployedAddresses.BankeraToken());

	  uint256 expected = 0;
	  uint256 totalSupply = 2500000000000000000;

	  Assert.equal(meta.balanceOf(tx.origin), expected, "Owner should have 0 BankeraToken initially");
	  Assert.equal(meta.totalSupply(), totalSupply, "Incorrect totalSupply");
  }


}