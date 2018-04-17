var SafeMath = artifacts.require('./SafeMath.sol');
var BankeraToken = artifacts.require('./BankeraToken.sol');

var ERC20DemoToken = artifacts.require('./helpers/ERC20Demo');
var ERC20DemoCallBackToken = artifacts.require('./helpers/ERC20DemoCallBack');

module.exports = function (deployer) {
    deployer.deploy(SafeMath);
    deployer.deploy(BankeraToken, 15, 0);

    //for test contracts
    deployer.deploy(ERC20DemoToken, "0x8578a218d88f873b64db911a61844477b82f74f06b99b32e4d2187638db0a663");
    deployer.deploy(ERC20DemoCallBackToken, "0x877c7588191e4ebe62a61a8417636f2ce02fa3c2709891ece42829928c79da69");
};