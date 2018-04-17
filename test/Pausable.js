const assertJump = require('./helpers/assertJump');
var contractHelper = require('./helpers/contractHelper.js');

var BankeraToken = artifacts.require("./BankeraToken.sol");
var BigNumber = require('decimal.js');
BigNumber.config({
    precision: 100,
    rounding: 4,
    toExpNeg: 0,
    toExpPos: 40
});

contract('Paused contract functionality', function (accounts) {

    var blocksPerRound = new BigNumber(55);
    var startingRoundNumber = BigNumber(0);
    var contractInstance;
    var contractOwnerAddress;
    var contractAddress;

    var contributorAddress1 = accounts[12];
    var contributorAddress1sBNKAmount = new BigNumber('15478545');
    var totalSupplyInsBNK = BigNumber('2500000000000000000');

    it("10.0 " + "Deploy Bankera contract", function () {

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress}),
                    contractInstance.sendTransaction({value: web3.toWei(1, "Ether"), from: accounts[9]})
                ])
            })
            .then(function(result) {
                assert.isOk(result[0]);
                assert.isOk(result[1]);

                return contractHelper.mineNewBlocks(blocksPerRound.mul(3).plus(1));
            })
            .then(function(result) {
                assert.isOk(result);

                return Promise.all([
                    contractInstance.setReward(0, web3.toWei(1, "ether"), {from: contractOwnerAddress}),
                    contractInstance.setReward(1, web3.toWei(1, "ether"), {from: contractOwnerAddress}),
                    contractInstance.setReward(2, web3.toWei(1, "ether"), {from: contractOwnerAddress})
                ])
            }).then(function(result) {
                assert.isOk(result[0]);
                assert.isOk(result[1]);
                assert.isOk(result[2]);
            }).catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
    });

    it("10.1 " + "Resume with contract owner", function () {
        return contractInstance.resume({from: contractOwnerAddress})
            .then(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .catch(function (error) {
                assertJump(error);
            })
    });

    it("10.2 " + "Pause not contract owner", function () {
        return contractInstance.pause({from: accounts[5]})
            .catch(function (error) {
                assertJump(error);

                return contractInstance.paused.call();
            })
            .then(function (result) {
                assert.equal(result, false, "Contract is paused");
            })
            .catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
    });

    it("10.3 " + "Pause contract owner", function () {
        return contractInstance.pause({from: contractOwnerAddress})
            .then(function (result) {
                return contractInstance.paused.call();
            })
            .then(function (result) {
                assert.equal(result, true, "Contract is not paused");
            })
            .catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
    });

    it("10.4 " + "Paused - send ETH", function () {
        return contractInstance.sendTransaction({value: web3.toWei(2, "ether"), from: accounts[2]})
            .then(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .catch(function (error) {
                assertJump(error);
            })
    });

    it("10.5 " + "Paused - tokenFallback", function () {
        return contractInstance.tokenFallback(accounts[7], 147, "0xb12")
            .then(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .catch(function (error) {
                assertJump(error);
            })
    });

    it("10.6 " + "Paused - setReward", function () {
        return contractInstance.setReward(0, 115, {from: contractOwnerAddress})
            .then(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .catch(function (error) {
                assertJump(error);
            })
    });

    it("10.7 " + "Paused - changeContractOwner", function () {
        return contractInstance.changeContractOwner(accounts[2], {from: contractOwnerAddress})
            .then(function (result) {
                assert.isOk(result);
                contractOwnerAddress = accounts[2];
            })
            .catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
    });

    it("10.8 " + "Paused - changeRewardManager", function () {
        return contractInstance.changeRewardManager(accounts[3], {from: contractOwnerAddress})
            .then(function (result) {
                assert.isOk(result);
            })
            .catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
    });

    it("10.9 " + "Paused - changeRoundManager", function () {
        return contractInstance.changeRoundManager(accounts[4], {from: contractOwnerAddress})
            .then(function (result) {
                assert.isOk(result);
            })
            .catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
    });

    it("10.10 " + "Paused - changeIssueManager", function () {
        return contractInstance.changeIssueManager(accounts[5], {from: contractOwnerAddress})
            .then(function (result) {
                assert.isOk(result);
            })
            .catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
    });

    it("10.11 " + "Paused - setBlocksPerRound", function () {
        return contractInstance.setBlocksPerRound(1215, {from: contractOwnerAddress})
            .then(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .catch(function (error) {
                assertJump(error);
            })
    });

    it("10.12 " + "Paused - issueTokens", function () {
        return contractInstance.issueTokens(accounts[9], 1215001, {from: contractOwnerAddress})
            .then(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .catch(function (error) {
                assertJump(error);
            })
    });

    it("10.13 " + "Paused - withdrawEther", function () {
        return contractInstance.withdrawEther({from: contractOwnerAddress})
            .then(function (result) {
                assert.isOk(result);
            })
            .catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
    });

    it("10.14 " + "Paused - transfer(address _to, uint256 _value)", function () {
        return contractInstance.transfer(accounts[8], 1215001, {from: accounts[9]})
            .then(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .catch(function (error) {
                assertJump(error);
            })
    });

    it("10.15 " + "Paused - transferFrom(address _from, address _to, uint256 _value)", function () {
        return contractInstance.transferFrom(accounts[9], accounts[8], 1215001)
            .then(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .catch(function (error) {
                assertJump(error);
            })
    });

    it("10.16 " + "Paused - transfer(address _to, uint256 _value, bytes _data)", function () {
        return contractInstance.transfer(accounts[8], 1215001, {_data: "0x0"}, {from: contributorAddress1})
            .then(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .catch(function (error) {
                assertJump(error);
            })
    });

    it("10.17 " + "Paused - transfer(address _to, uint256 _value, bytes _data, string _custom_fallback)", function () {
        return contractInstance.transfer(accounts[8], 1215001, {_data: "0x0"}, {_custom_fallback: "average(String)"}, {from: contributorAddress1})
            .then(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .catch(function (error) {
                assertJump(error);
            })
    });

    it("10.18 " + "Paused - balanceOf", function () {
        return contractInstance.balanceOf(contributorAddress1)
            .then(function (result) {
                assert.isOk(result);
                assert.equal(result.toFixed(0), contributorAddress1sBNKAmount.toFixed(0), "Incorrect contractOwnerAddress BNK balance");
            })
            .catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
    });

    it("10.19 " + "Paused - totalSupply", function () {
        return contractInstance.totalSupply()
            .then(function (result) {
                assert.isOk(result);
                assert.equal(result.toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
            })
            .catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
    });

    it("10.20 " + "Paused - approve", function () {
        return contractInstance.approve(accounts[8], 1215001)
            .then(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .catch(function (error) {
                assertJump(error);
            })
    });

    it("10.21 " + "Paused - allowance", function () {
        return contractInstance.allowance(accounts[8], accounts[9])
            .then(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .catch(function (error) {
                assertJump(error);
            })
    });

    it("10.22 " + "Paused - claimReward", function () {
        return contractInstance.claimReward({from: contributorAddress1})
            .then(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .catch(function (error) {
                assertJump(error);
            })
    });

    it("10.23 " + "Paused - claimRewardTillRound", function () {
        return contractInstance.claimRewardTillRound(0, {from: contributorAddress1})
            .then(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .catch(function (error) {
                assertJump(error);
            })
    });

    it("10.24 " + "Paused - calculateClaimableReward", function () {
        return contractInstance.calculateClaimableReward({from: contributorAddress1})
            .then(function (result) {
                assert.isOk(result);
            })
            .catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
    });

    it("10.25 " + "Paused - calculateClaimableRewardTillRound", function () {
        return contractInstance.calculateClaimableRewardTillRound(2, {from: contributorAddress1})
            .then(function (result) {
                assert.isOk(result);
            })
            .catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
    });

    it("10.26 " + "Paused - resume not contract owner", function () {
        return contractInstance.resume({from: contributorAddress1})
            .then(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .catch(function (error) {
                assertJump(error);
            })
    });

    it("10.27 " + "Paused - resume contract owner", function () {
        return contractInstance.resume({from: contractOwnerAddress})
            .then(function (result) {
                assert.isOk(result);
            })
            .catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
    });

});