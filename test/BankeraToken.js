const assertJump = require('./helpers/assertJump');
var contractHelper = require('./helpers/contractHelper');
var BankeraToken = artifacts.require("./BankeraToken.sol");
var BigNumber = require('decimal.js');
BigNumber.config({
    precision: 30,
    rounding: 3,
    toExpNeg: 0,
    toExpPos: 30
});

contract('BankeraToken mixed tests', function (accounts) {

    beforeEach(function(done) {
        this.timeout(3000); // A very long environment setup.
        setTimeout(done, 2500);
    });

    var totalSupplyInsBNK = BigNumber('2500000000000000000');
    var blocksPerRound = 15;
    var startingRoundNumber = BigNumber(0);

    it("1. " + "Correct total supply", function() {
        var bankeraTokenInstance;
        var contractOwner;

        return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
            bankeraTokenInstance = instance;
            contractOwner = accounts[0];
            return bankeraTokenInstance.balanceOf.call(contractOwner);
        }).then(function (balance) {
            assert.equal(balance.toFixed(0), 0, "Contract Owner balance should be zero");
            return bankeraTokenInstance.totalSupply()
        }).then(function (totalSupply) {
            assert.equal(totalSupply.toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
            return bankeraTokenInstance.currentRound.call()
        }).then(function (currentRound) {
            assert.equal(currentRound.toFixed(0), 0, "currentRound should be 0");
        })
    });

    it("2. " + "Issue tokens with IssueManager", function() {
        var bankeraTokenInstance;
        var contractOwner;

        var contributorAddress1 = accounts[3];
        var contributorAddress1sBNKAmount = BigNumber('1721541201');

        var issueManager = accounts[5];

        return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
            bankeraTokenInstance = instance;
            contractOwner = accounts[0];
            return bankeraTokenInstance.balanceOf.call(contractOwner);
        }).then(function (balance) {
            assert.equal(balance.toFixed(0), 0, "Contract Owner balance should be zero");
            return bankeraTokenInstance.totalSupply()
        }).then(function (totalSupply) {
            assert.equal(totalSupply.toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

            return bankeraTokenInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwner});
        }).catch(function(tx) {
            console.log("tx sendTransaction2 ", tx);
            assert.fail("Unexpected error");
        }).then(function (tx) {

            return bankeraTokenInstance.balanceOf.call(contributorAddress1);
        }).then(function (balance) {
            assert.equal(balance.toFixed(0), contributorAddress1sBNKAmount.toFixed(0), "Incorrect contributorAddress1 balance");

            return bankeraTokenInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: issueManager});
        }).then(function (tx) {
            console.log(tx);
            assert.fail("Unexpected error");
        }).catch(function(tx) {
            assertJump(tx);

            return bankeraTokenInstance.balanceOf.call(contributorAddress1);
        }).then(function (balance) {
            assert.equal(balance.toFixed(0), contributorAddress1sBNKAmount.toFixed(0), "Incorrect contributorAddress1 balance");

            return bankeraTokenInstance.changeIssueManager(issueManager, {from: contractOwner});
        }).then(function (tx) {

            return bankeraTokenInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: issueManager});
        }).then(function (tx) {

            return bankeraTokenInstance.balanceOf.call(contributorAddress1);
        }).then(function (balance) {
            assert.equal(balance.toFixed(0), contributorAddress1sBNKAmount.mul(2).toFixed(0), "Incorrect contributorAddress1 balance");
        })

    });

    it("3. " + "Big number of rounds creation", function() {
        var bankeraTokenInstance;
        var contractOwner;
        var bigNumberOfRounds = 280;

        var contributorAddress1 = accounts[3];
        var contributorAddress1sBNKAmount = BigNumber('1721541201');

        return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
            bankeraTokenInstance = instance;
            contractOwner = accounts[0];
            return bankeraTokenInstance.balanceOf.call(contractOwner);
        }).then(function (balance) {
            assert.equal(balance.toFixed(0), 0, "Contract Owner balance should be zero");
            return bankeraTokenInstance.totalSupply()
        }).then(function (totalSupply) {
            assert.equal(totalSupply.toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
            return Promise.all([
                bankeraTokenInstance.currentRound.call(),
                bankeraTokenInstance.blocksPerRound.call()
            ])
        }).then(function (values) {
            assert.equal(values[0].toFixed(0), 0, "currentRound should be 0");
            newBlocks = BigNumber(values[1].toFixed(0)).mul(bigNumberOfRounds);
            return contractHelper.mineNewBlocks(newBlocks.toFixed(0));
        }).then(function (tx) {

            return bankeraTokenInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwner});
        })
        .then(function (tx) {
            return bankeraTokenInstance.currentRound.call()
        })
        .then(function (currentRound) {
            assert.equal(currentRound.toFixed(0), bigNumberOfRounds, "currentRound should be " + bigNumberOfRounds);

            return bankeraTokenInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwner});
        })
        .catch(function(error) {
            console.log(error);
            assert.isOk(false, 'Unexpected exception');
        })
    });

    it("4. " + "Change Contract Owner validation", function () {
        var bankeraTokenInstance;
        var newContractOwnerAddress = accounts[3];
        var contractOwner;
        //for contract owner checking we use setBlocksPerRound function
        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance){
                bankeraTokenInstance = instance;
                contractOwner = accounts[0];
                return bankeraTokenInstance.setBlocksPerRound(123123)
            .then(function () {
                return bankeraTokenInstance.changeContractOwner(newContractOwnerAddress);
            }).catch(function(error) {
                assert.isOk(false, 'Unexpected exception');
            }).then(function(){
                return bankeraTokenInstance.setBlocksPerRound(3332222)
            }).then(function () {
                assert.isOk(false, 'Unexpected exception');
            }).catch(function(error) {
                assertJump(error);
                //need to change contract owner to old owner, for other tests
                return bankeraTokenInstance.changeContractOwner(contractOwner);
            }).then(function () {
                assert.isOk(false, 'Unexpected exception');
            }).catch(function(error) {
                assertJump(error);
                return bankeraTokenInstance.changeContractOwner(contractOwner, {from: newContractOwnerAddress});
            }).catch(function(error) {
                console.log(error);
                assert.isOk(false, 'Unexpected exception');
            })
        })
    });

    it("5. " + "Withdraw ETH from contract address", function () {
        var contractInstance;
        var contractAddress;
        var contributorAddress = accounts[5];
        var depositETHAMountInWei = BigNumber(web3.toWei(0.01, "ether").toString());

        var contractOwnerAddress = accounts[0];
        var tokenManagerBalanceBefore = BigNumber(web3.eth.getBalance(contractOwnerAddress).toString());

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractAddress = instance.address;
                tokenManagerBalanceBefore = BigNumber(web3.eth.getBalance(contractOwnerAddress).toString());
                //watchEventsInfo(instance);
                return contractHelper.setNextBlockCurrentTime(6*60)
            }).then(function() {
                return contractHelper.mineNewBlock()
            }).then(function() {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                assert.isOk(BigNumber(web3.eth.getBalance(contributorAddress).toString()).toFixed(0) >= depositETHAMountInWei.toFixed(0), "Contributor Balance should be greater or equal " + depositETHAMountInWei.toFixed(0));
                return contractInstance.sendTransaction({value: depositETHAMountInWei.toFixed(0), from: contributorAddress})
            }).then(function() {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), depositETHAMountInWei.toFixed(0), "Contract balance should be " + depositETHAMountInWei.toFixed(0));
                assert.equal(BigNumber(web3.eth.getBalance(contractOwnerAddress).toString()).toFixed(0), tokenManagerBalanceBefore.toFixed(0), "contract owner balance before withdraw should be " + tokenManagerBalanceBefore);
                return contractInstance.withdrawEther()
            })
            .catch(function (e) {
                console.log("tx: ", e);
                assert.false("Unexpected error");
            })
            .then(function (tx) {
                var transactionCostInWei = contractHelper.calculateTxPriceInWei(tx);
                var expectationAmountInWei = tokenManagerBalanceBefore.add(depositETHAMountInWei).sub(BigNumber(transactionCostInWei));
                assert.equal(BigNumber(web3.eth.getBalance(contractOwnerAddress).toString()).toFixed(0), expectationAmountInWei, "contract owner balance after withdraw should be " + expectationAmountInWei);
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract balance after ETH withdraw should be 0");
                //try to withdraw again
                return contractInstance.withdrawEther()
            }).then(function (e) {
                assert.false("Expected exception in withdrawEther method..");
            }).catch(function (e) {
                assertJump(e);
            });
    });

    it("6. " + "Send coins from owner to other address", function () {
        var contractInstance;
        var contractAddress;
        var contributorAddress = accounts[6];
        var receiverAddress = accounts[2];
        var contributorAddressAmount = BigNumber('125412542545499');
        var bnkTransferAmount;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractAddress = instance.address;
                //watchEventsInfo(instance);
                return contractHelper.setNextBlockCurrentTime(6*60)
            }).then(function() {
                return contractHelper.mineNewBlock()
            }).then(function() {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return contractInstance.issueTokens(contributorAddress, contributorAddressAmount.toFixed(0))
            }).then(function(tx) {
                return Promise.all([
                    contractInstance.balanceOf.call(contributorAddress),
                    contractInstance.balanceOf.call(receiverAddress)
                ])
            }).then(function(values) {
                bnkTransferAmount = BigNumber(values[0].toFixed(0));
                assert.equal(values[0].toFixed(0), bnkTransferAmount.toFixed(0), "Contributor Balance can't be zero");
                assert.equal(values[1].toFixed(0), 0, "receiverAddress BNK token balance should be zero");
                return Promise.all([
                    contractInstance.transfer(receiverAddress, bnkTransferAmount.toFixed(0), {from: contributorAddress})
                ])
            })
            .then(function() {
                return Promise.all([
                    contractInstance.balanceOf.call(contributorAddress),
                    contractInstance.balanceOf.call(receiverAddress)
                ])
            })
            .catch(function (e) {
                console.log(e);
                assert.isOk(false, "Unexpected exception");
            })
            .then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "Contributor BNK token balance should be zero");
                assert.equal(values[1].toFixed(0), bnkTransferAmount.toFixed(0), "receiverAddress BNK Balance should be " + bnkTransferAmount);
                //try so send from empty account

                return contractInstance.transfer(receiverAddress, bnkTransferAmount.toFixed(0), {from: contributorAddress})
            }).then(function(tx) {
                console.log(tx);
                assert.isOk(false, "Unexpected exception");
            }).catch(function (e) {
                assertJump(e);
            })
    });

    it("7. " + "Token Balance checking by address", function () {
        var contractInstance;
        var contractAddress;
        var contributorAddress1 = accounts[6];
        var contributorAddress2 = accounts[5];
        var contributorAddress3 = accounts[4];
        var contributorAddress4 = accounts[3];
        var contributorAddress5 = accounts[2];
        var contributorAddress6 = accounts[7];
        var contributorAddress1DepositAmount = BigNumber('10005');
        var contributorAddress2DepositAmount = BigNumber('1300005');
        var contributorAddress3DepositAmount = BigNumber('799090000');
        var contributorAddress4DepositAmount = BigNumber('874514648511815548');
        var contributorAddress5DepositAmount = BigNumber('5448454879999');
        var contributorAddress6BNKAmount = 0;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return contractHelper.mineNextBlock(7*60);
            }).then(function(tx) {
                assert.isOk(tx, "should be transaction");
                return contractInstance.issueTokens(contributorAddress1, contributorAddress1DepositAmount.toFixed(0));
            }).then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf.call(contributorAddress1),
                    contractInstance.balanceOf.call(contributorAddress2),
                    contractInstance.balanceOf.call(contributorAddress3),
                    contractInstance.balanceOf.call(contributorAddress4),
                    contractInstance.balanceOf.call(contributorAddress5),
                    contractInstance.balanceOf.call(contributorAddress6)
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), contributorAddress1DepositAmount.toFixed(0), "contributorAddress1 contract Balance is wrong");
                assert.equal(values[1].toFixed(0), 0, "contributorAddress2 contract Balance is wrong");
                assert.equal(values[2].toFixed(0), 0, "contributorAddress3 contract Balance is wrong");
                assert.equal(values[3].toFixed(0), 0, "contributorAddress4 contract Balance is wrong");
                assert.equal(values[4].toFixed(0), 0, "contributorAddress5 contract Balance is wrong");
                assert.equal(values[5].toFixed(0), 0, "contributorAddress6 contract Balance is wrong");

                return contractInstance.issueTokens(contributorAddress2, contributorAddress2DepositAmount.toFixed(0));
            })

            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf.call(contributorAddress1),
                    contractInstance.balanceOf.call(contributorAddress2),
                    contractInstance.balanceOf.call(contributorAddress3),
                    contractInstance.balanceOf.call(contributorAddress4),
                    contractInstance.balanceOf.call(contributorAddress5),
                    contractInstance.balanceOf.call(contributorAddress6)
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), contributorAddress1DepositAmount.toFixed(0), "contributorAddress1 contract Balance is wrong");
                assert.equal(values[1].toFixed(0), contributorAddress2DepositAmount.toFixed(0), "contributorAddress2 contract Balance is wrong");
                assert.equal(values[2].toFixed(0), 0, "contributorAddress3 contract Balance is wrong");
                assert.equal(values[3].toFixed(0), 0, "contributorAddress4 contract Balance is wrong");
                assert.equal(values[4].toFixed(0), 0, "contributorAddress5 contract Balance is wrong");
                assert.equal(values[5].toFixed(0), 0, "contributorAddress6 contract Balance is wrong");

                return contractInstance.issueTokens(contributorAddress3, contributorAddress3DepositAmount.toFixed(0));
            })

            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf.call(contributorAddress1),
                    contractInstance.balanceOf.call(contributorAddress2),
                    contractInstance.balanceOf.call(contributorAddress3),
                    contractInstance.balanceOf.call(contributorAddress4),
                    contractInstance.balanceOf.call(contributorAddress5),
                    contractInstance.balanceOf.call(contributorAddress6)
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), contributorAddress1DepositAmount.toFixed(0), "contributorAddress1 contract Balance is wrong");
                assert.equal(values[1].toFixed(0), contributorAddress2DepositAmount.toFixed(0), "contributorAddress2 contract Balance is wrong");
                assert.equal(values[2].toFixed(0), contributorAddress3DepositAmount.toFixed(0), "contributorAddress3 contract Balance is wrong");
                assert.equal(values[3].toFixed(0), 0, "contributorAddress4 contract Balance is wrong");
                assert.equal(values[4].toFixed(0), 0, "contributorAddress5 contract Balance is wrong");
                assert.equal(values[5].toFixed(0), 0, "contributorAddress6 contract Balance is wrong");

                return contractInstance.issueTokens(contributorAddress4, contributorAddress4DepositAmount.toFixed(0));
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf.call(contributorAddress1),
                    contractInstance.balanceOf.call(contributorAddress2),
                    contractInstance.balanceOf.call(contributorAddress3),
                    contractInstance.balanceOf.call(contributorAddress4),
                    contractInstance.balanceOf.call(contributorAddress5),
                    contractInstance.balanceOf.call(contributorAddress6)
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), contributorAddress1DepositAmount.toFixed(0), "contributorAddress1 contract Balance is wrong");
                assert.equal(values[1].toFixed(0), contributorAddress2DepositAmount.toFixed(0), "contributorAddress2 contract Balance is wrong");
                assert.equal(values[2].toFixed(0), contributorAddress3DepositAmount.toFixed(0), "contributorAddress3 contract Balance is wrong");
                assert.equal(values[3].toFixed(0), contributorAddress4DepositAmount.toFixed(0), "contributorAddress4 contract Balance is wrong");
                assert.equal(values[4].toFixed(0), 0, "contributorAddress5 contract Balance is wrong");
                assert.equal(values[5].toFixed(0), 0, "contributorAddress6 contract Balance is wrong");

                return contractHelper.mineNextBlock(9*60);
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf.call(contributorAddress1),
                    contractInstance.balanceOf.call(contributorAddress2),
                    contractInstance.balanceOf.call(contributorAddress3),
                    contractInstance.balanceOf.call(contributorAddress4),
                    contractInstance.balanceOf.call(contributorAddress5),
                    contractInstance.balanceOf.call(contributorAddress6)
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), contributorAddress1DepositAmount.toFixed(0), "contributorAddress1 contract Balance is wrong");
                assert.equal(values[1].toFixed(0), contributorAddress2DepositAmount.toFixed(0), "contributorAddress2 contract Balance is wrong");
                assert.equal(values[2].toFixed(0), contributorAddress3DepositAmount.toFixed(0), "contributorAddress3 contract Balance is wrong");
                assert.equal(values[3].toFixed(0), contributorAddress4DepositAmount.toFixed(0), "contributorAddress4 contract Balance is wrong");
                assert.equal(values[4].toFixed(0), 0, "contributorAddress5 contract Balance is wrong");
                assert.equal(values[5].toFixed(0), 0, "contributorAddress6 contract Balance is wrong");

                return contractHelper.mineNextBlock(5*60);
            })

            .then(function(tx) {
                assert.isOk(tx, "should be transaction");
                return contractInstance.issueTokens(contributorAddress5, contributorAddress5DepositAmount.toFixed(0));
            }).then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf.call(contributorAddress1),
                    contractInstance.balanceOf.call(contributorAddress2),
                    contractInstance.balanceOf.call(contributorAddress3),
                    contractInstance.balanceOf.call(contributorAddress4),
                    contractInstance.balanceOf.call(contributorAddress5),
                    contractInstance.balanceOf.call(contributorAddress6)
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), contributorAddress1DepositAmount.toFixed(0), "contributorAddress1 contract Balance is wrong");
                assert.equal(values[1].toFixed(0), contributorAddress2DepositAmount.toFixed(0), "contributorAddress2 contract Balance is wrong");
                assert.equal(values[2].toFixed(0), contributorAddress3DepositAmount.toFixed(0), "contributorAddress3 contract Balance is wrong");
                assert.equal(values[3].toFixed(0), contributorAddress4DepositAmount.toFixed(0), "contributorAddress4 contract Balance is wrong");
                assert.equal(values[4].toFixed(0), contributorAddress5DepositAmount.toFixed(0), "contributorAddress5 contract Balance is wrong");
                assert.equal(values[5].toFixed(0), 0, "contributorAddress6 contract Balance is wrong");

               return contractHelper.mineNextBlock(60);
            })

            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf.call(contributorAddress1),
                    contractInstance.balanceOf.call(contributorAddress2),
                    contractInstance.balanceOf.call(contributorAddress3),
                    contractInstance.balanceOf.call(contributorAddress4),
                    contractInstance.balanceOf.call(contributorAddress5),
                    contractInstance.balanceOf.call(contributorAddress6)
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), contributorAddress1DepositAmount.toFixed(0), "contributorAddress1 contract Balance is wrong");
                assert.equal(values[1].toFixed(0), contributorAddress2DepositAmount.toFixed(0), "contributorAddress2 contract Balance is wrong");
                assert.equal(values[2].toFixed(0), contributorAddress3DepositAmount.toFixed(0), "contributorAddress3 contract Balance is wrong");
                assert.equal(values[3].toFixed(0), contributorAddress4DepositAmount.toFixed(0), "contributorAddress4 contract Balance is wrong");
                assert.equal(values[4].toFixed(0), contributorAddress5DepositAmount.toFixed(0), "contributorAddress5 contract Balance is wrong");
                assert.equal(values[5].toFixed(0), 0, "contributorAddress6 contract Balance is wrong");

                //all BNK token go to contributorAddress6
                contributorAddress6BNKAmount = BigNumber(values[0].toString())
                    .add(BigNumber(values[1].toString()))
                    .add(BigNumber(values[2].toString()))
                    .add(BigNumber(values[3].toString()))
                    .add(BigNumber(values[4].toString()));

                return Promise.all([
                    contractInstance.transfer(contributorAddress6, values[0], {from: contributorAddress1}),
                    contractInstance.transfer(contributorAddress6, values[1], {from: contributorAddress2}),
                    contractInstance.transfer(contributorAddress6, values[2], {from: contributorAddress3}),
                    contractInstance.transfer(contributorAddress6, values[3], {from: contributorAddress4}),
                    contractInstance.transfer(contributorAddress6, values[4], {from: contributorAddress5})
                ])
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf.call(contributorAddress1),
                    contractInstance.balanceOf.call(contributorAddress2),
                    contractInstance.balanceOf.call(contributorAddress3),
                    contractInstance.balanceOf.call(contributorAddress4),
                    contractInstance.balanceOf.call(contributorAddress5),
                    contractInstance.balanceOf.call(contributorAddress6)
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "contributorAddress1 contract Balance is wrong");
                assert.equal(values[1].toFixed(0), 0, "contributorAddress2 contract Balance is wrong");
                assert.equal(values[2].toFixed(0), 0, "contributorAddress3 contract Balance is wrong");
                assert.equal(values[3].toFixed(0), 0, "contributorAddress4 contract Balance is wrong");
                assert.equal(values[4].toFixed(0), 0, "contributorAddress5 contract Balance is wrong");
                assert.equal(values[5].toFixed(0), contributorAddress6BNKAmount.toFixed(0), "contributorAddress6 contract Balance is wrong");

                return contractHelper.mineNextBlock(15*60);
            })

            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf.call(contributorAddress1),
                    contractInstance.balanceOf.call(contributorAddress2),
                    contractInstance.balanceOf.call(contributorAddress3),
                    contractInstance.balanceOf.call(contributorAddress4),
                    contractInstance.balanceOf.call(contributorAddress5),
                    contractInstance.balanceOf.call(contributorAddress6)
                ])
            }).then(function(values) {
                assert.equal(values[0], 0, "contributorAddress1 contract Balance is wrong");
                assert.equal(values[1], 0, "contributorAddress2 contract Balance is wrong");
                assert.equal(values[2], 0, "contributorAddress3 contract Balance is wrong");
                assert.equal(values[3], 0, "contributorAddress4 contract Balance is wrong");
                assert.equal(values[4], 0, "contributorAddress5 contract Balance is wrong");
                assert.equal(values[5], contributorAddress6BNKAmount.toFixed(0), "contributorAddress6 contract Balance is wrong");

                return Promise.all([
                    contractInstance.transfer(contributorAddress1, 500, {from: contributorAddress6}),
                    contractInstance.transfer(contributorAddress3, 999999, {from: contributorAddress6})
                ])
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf.call(contributorAddress1),
                    contractInstance.balanceOf.call(contributorAddress2),
                    contractInstance.balanceOf.call(contributorAddress3),
                    contractInstance.balanceOf.call(contributorAddress4),
                    contractInstance.balanceOf.call(contributorAddress5),
                    contractInstance.balanceOf.call(contributorAddress6)
                ])
            }).then(function(values) {
                assert.equal(values[0], 500, "contributorAddress1 contract Balance is wrong");
                assert.equal(values[1], 0, "contributorAddress2 contract Balance is wrong");
                assert.equal(values[2], 999999, "contributorAddress3 contract Balance is wrong");
                assert.equal(values[3], 0, "contributorAddress4 contract Balance is wrong");
                assert.equal(values[4], 0, "contributorAddress5 contract Balance is wrong");
                assert.equal(values[5], BigNumber(contributorAddress6BNKAmount).sub(BigNumber(500)).sub(BigNumber(999999)).toFixed(0), "contributorAddress6 contract Balance is wrong");
            })
    });

    it("8. " + "createRounds function accessibility for all users", function() {
        var bankeraTokenInstance;
        var contractOwner;
        var customBlocksPerRound = 1;

        return BankeraToken.new(customBlocksPerRound, startingRoundNumber).then(function (instance) {
            bankeraTokenInstance = instance;
            contractOwner = accounts[0];

            return Promise.all([
                bankeraTokenInstance.changeRewardManager(accounts[1], {from: contractOwner}),
                bankeraTokenInstance.changeIssueManager(accounts[2], {from: contractOwner}),
                bankeraTokenInstance.changeRoundManager(accounts[3], {from: contractOwner}),
                bankeraTokenInstance.createRounds(2, {from: accounts[6]})
            ]).then(function(values) {
                return Promise.all([
                    bankeraTokenInstance.createRounds(2, {from: contractOwner}),
                    bankeraTokenInstance.createRounds(2, {from: accounts[1]}),
                    bankeraTokenInstance.createRounds(2, {from: accounts[2]}),
                    bankeraTokenInstance.createRounds(2, {from: accounts[3]})
                ])
            }).catch(function(tx) {
                console.log("tx ", tx);
                assert.fail("Unexpected error");
            })
        })
    });

    it("9. " + "transferFrom function revert all transactions", function() {
        var bankeraTokenInstance;
        var contractOwner;

        return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
            bankeraTokenInstance = instance;
            contractOwner = accounts[0];

            return Promise.all([
                bankeraTokenInstance.issueTokens(accounts[1], BigNumber('321540001').toFixed(0), {from: contractOwner})
            ]).then(function(values) {
                return Promise.all([
                    bankeraTokenInstance.transferFrom(accounts[1], accounts[2], BigNumber('321540001').toFixed(0))
                ])
            }).then(function(values) {
                assert.fail("Transaction should be reverted");
            }).catch(function(tx) {
                assertJump(tx);
            })
        })
    });

});