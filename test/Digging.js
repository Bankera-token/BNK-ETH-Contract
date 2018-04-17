const assertJump = require('./helpers/assertJump');
var contractHelper = require('./helpers/contractHelper.js');

var BankeraToken = artifacts.require("./BankeraToken.sol");
var ERC20DemoToken = artifacts.require("./helpers/ERC20Demo.sol");
var ERC20_tokenFallback_DemoToken = artifacts.require("./helpers/ERC20DemoCallBack.sol");

var BigNumber = require('decimal.js');
BigNumber.config({
    precision: 100,
    rounding: 4,
    toExpNeg: 0,
    toExpPos: 40
});

contract('Digging ERC223', function (accounts) {

    var blocksPerRound = 15;
    var startingRoundNumber = BigNumber(0);

    var bankeraInstance;
    var ERC20DemoInstance;
    var ERC20Demo_tokenFallback_Instance;

    it("ERC20Demo deployed", function () {
        return ERC20DemoToken.deployed().then(function (instance) {
            ERC20DemoInstance = instance;
        }).catch(function (error) {
            console.log(error);
            assert.fail('Unexpected fail');
        })
    });

    it("ERC20Demo + tokenFallback function deployed", function () {
        return ERC20_tokenFallback_DemoToken.deployed().then(function (instance) {
            ERC20Demo_tokenFallback_Instance = instance;
        }).catch(function (error) {
            console.log(error);
            assert.fail('Unexpected fail');
        })
    });

    it("ERC223 transfer to ERC20", function () {
        var contractOwnerAddress;
        var contributorAddress1 = accounts[2];
        var contributorAddress1sBNKAmount = new BigNumber("15478545");

        return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
            bankeraInstance = instance;
            contractOwnerAddress = accounts[0];
            return bankeraInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
        }).catch(function (error) {
            console.log(error);
            assert.fail('Unexpected fail');
        })
        .then(function (tx) {
            assert.isOk(tx, "should be transaction");

            //transfer tokens to ERC20 contract
            return bankeraInstance.transfer(ERC20DemoInstance.address, contributorAddress1sBNKAmount.toFixed(0), {from: contributorAddress1})
        })
        .then(function (tx) {
            console.log("tx", tx);
            assert.fail('Expected exception');
        })
        .catch(function (error) {
            assertJump(error);
        })
    });

    it("ERC223 transfer to contract with tokenFallback function", function () {
        var contractOwnerAddress;
        var contributorAddress1 = accounts[2];
        var contributorAddress1sBNKAmount = new BigNumber("15478545");

        return BankeraToken.deployed().then(function (instance) {
            bankeraInstance = instance;
            contractOwnerAddress = accounts[0];
            return bankeraInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
        }).catch(function (error) {
            console.log(error);
            assert.fail('Unexpected fail');
        })
            .then(function (tx) {
                assert.isOk(tx, "should be transaction");

                //transfer tokens to ERC20 contract
                return bankeraInstance.transfer(ERC20Demo_tokenFallback_Instance.address, contributorAddress1sBNKAmount.toFixed(0), {from: contributorAddress1})
            })
            .then(function (tx) {
                assert.isOk(tx, "should be transaction");
            })
            .catch(function (error) {
                console.log("tx", tx);
                assert.fail('Unexpected exception');
            })
    });

});