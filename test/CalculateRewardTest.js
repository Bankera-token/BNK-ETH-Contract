const assertJump = require('./helpers/assertJump');
var contractHelper = require('./helpers/contractHelper');
var BankeraToken = artifacts.require("./BankeraToken.sol");
var BigNumber = require('decimal.js');
BigNumber.config({
    precision: 100,
    rounding: 4,
    toExpNeg: 0,
    toExpPos: 40
});

contract('Calculate reward tests', function (accounts) {

    beforeEach(function(done) {
        this.timeout(3000); // A very long environment setup.
        setTimeout(done, 2500);
    });

    var totalSupplyInsBNK = BigNumber('2500000000000000000');
    var blocksPerRound = BigNumber(50);
    var startingRoundNumber = BigNumber(0);
    var customStartingRoundNumber = BigNumber(30);

    it("13.1.0 " + "Reward calculation for empty account", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[2];
        var contributorAddress2 = accounts[3];
        var contributorAddress3 = accounts[4];

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");

                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");
                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contractOwnerAddress}),
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.calculateClaimableReward({from: contributorAddress3}),
                    contractInstance.calculateClaimableReward()
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[1].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[2].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[3].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[4].toFixed(0), 0, "claimable reward should be zero");
            })
    });

    it("13.1.1 " + "Reward calculation for empty account (custom starting round number)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[2];
        var contributorAddress2 = accounts[3];
        var contributorAddress3 = accounts[4];

        return BankeraToken.new(blocksPerRound, customStartingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");

                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");
                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contractOwnerAddress}),
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.calculateClaimableReward({from: contributorAddress3}),
                    contractInstance.calculateClaimableReward()
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[1].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[2].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[3].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[4].toFixed(0), 0, "claimable reward should be zero");
            })
    });

    it("13.2.0 " + "Reward calculation for configured rounds", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[19];
        var contributorAddress2 = accounts[18];
        var receiverAddress = accounts[17];

        var contributorAddress1sBNKAmount = 200;
        var contributorAddress2sBNKAmount = 300;

        var rewardIn1Round_ETH = 0.5;
        var rewardIn2Round_ETH = 0.5;

        var address1Reward1;
        var address2Reward1;

        var address1Reward2;
        var address2Reward2;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");

                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");

                return contractHelper.mineNextBlock(8*60);
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})
                ])
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return contractHelper.mineNextBlock(17*60);
            }).then(function(tx) {
                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1)));
            }).then(function(tx) {
                return contractInstance.setReward(0, 1)
            }).then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2})
                ]);
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "incorrect contributorAddress1 calculated reward");
                assert.equal(values[1].toFixed(0), 0, "incorrect contributorAddress2 calculated reward");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),    //1 round
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})     //1 round
                ])
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2})
                ]);
            })
            .then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "contract owner BNK balance should be zero");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");

                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1)))
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return contractInstance.setReward(1, web3.toWei(rewardIn1Round_ETH, "ether"))
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(1),
                    contractInstance.issuedTokensInRound(1),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2)
                ]);
            })
            .then(function(values) {
                address1Reward1 = BigNumber(values[4].toString()).mul(values[2][2].toString());
                address2Reward1 = BigNumber(values[5].toString()).mul(values[2][2].toString());

                assert.equal(values[0].toFixed(0), address1Reward1.toFixed(0), "reward should be as expected");
                assert.equal(values[1].toFixed(0), address2Reward1.toFixed(0), "reward should be as expected");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),    //2 round
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})     //2 round
                ])
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1))) //finish 2 - start 3
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return contractInstance.setReward(2, web3.toWei(rewardIn2Round_ETH, "ether"))
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(2),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2)
                ]);
            })
            .then(function(values) {
                address1Reward2 = BigNumber(values[3].toString()).mul(values[2][2].toString());
                address2Reward2 = BigNumber(values[4].toString()).mul(values[2][2].toString());

                assert.equal(values[0].toFixed(0), address1Reward2.plus(address1Reward1).toFixed(0), "reward should be as expected");
                assert.equal(values[1].toFixed(0), address2Reward2.plus(address2Reward1).toFixed(0), "reward should be as expected");
                return Promise.all([
                    contractInstance.sendTransaction({value: web3.toWei(1, "ether"), from: contractOwnerAddress}),
                    Promise.resolve(values[3]),
                    Promise.resolve(values[4])
                ])
            })
            .then(function(values){
                assert.isOk(values[0], "should be transaction");

                return Promise.all([
                    contractInstance.claimReward({from: contributorAddress1}),    //2 round
                    contractInstance.claimReward({from: contributorAddress2}),     //2 round
                    Promise.resolve(values[1]),
                    Promise.resolve(values[2])
                ])
            })
            .then(function(values){
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return Promise.all([
                    contractInstance.transfer(receiverAddress, values[2], {from: contributorAddress1}),
                    contractInstance.transfer(receiverAddress, values[3], {from: contributorAddress2})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1))) //finish 3 - start 4
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return contractInstance.setReward(3, web3.toWei(rewardIn1Round_ETH, "ether"))
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.calculateClaimableReward({from: receiverAddress}),
                    contractInstance.reward(3),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2),
                    contractInstance.balanceOf(receiverAddress)
                ]);
            })
            .then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "reward should be as expected");
                assert.equal(values[1].toFixed(0), 0, "reward should be as expected");
                assert.equal(values[2].toFixed(0), BigNumber(values[6].toFixed(0)).mul(values[3][2].toFixed(0)).toFixed(0), "reward should be as expected");
            })
            .catch(function (error) {
                console.log("err: ", error);
                assert.false();
            })
    });

    it("13.2.1 " + "Reward calculation for configured rounds (custom starting round number)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[19];
        var contributorAddress2 = accounts[18];
        var receiverAddress = accounts[17];

        var contributorAddress1sBNKAmount = 200;
        var contributorAddress2sBNKAmount = 300;

        var rewardIn1Round_ETH = 0.5;
        var rewardIn2Round_ETH = 0.5;

        var address1Reward1;
        var address2Reward1;

        var address1Reward2;
        var address2Reward2;

        return BankeraToken.new(blocksPerRound, customStartingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");

                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");

                return contractHelper.mineNextBlock(8*60);
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})
                ])
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return contractHelper.mineNextBlock(17*60);
            }).then(function(tx) {
                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1)));
            }).then(function(tx) {
                return contractInstance.setReward(customStartingRoundNumber.toFixed(0), 1)
            }).then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2})
                ]);
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "incorrect contributorAddress1 calculated reward");
                assert.equal(values[1].toFixed(0), 0, "incorrect contributorAddress2 calculated reward");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),    //1 round
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})     //1 round
                ])
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2})
                ]);
            })
            .then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "contract owner BNK balance should be zero");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");

                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1)))
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return contractInstance.setReward(customStartingRoundNumber.plus(BigNumber(1)).toFixed(0), web3.toWei(rewardIn1Round_ETH, "ether"))
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(1)).toFixed(0)),
                    contractInstance.issuedTokensInRound(1),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2)
                ]);
            })
            .then(function(values) {
                address1Reward1 = BigNumber(values[4].toString()).mul(values[2][2].toString());
                address2Reward1 = BigNumber(values[5].toString()).mul(values[2][2].toString());

                assert.equal(values[0].toFixed(0), address1Reward1.toFixed(0), "reward should be as expected");
                assert.equal(values[1].toFixed(0), address2Reward1.toFixed(0), "reward should be as expected");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),    //2 round
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})     //2 round
                ])
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1))) //finish 2 - start 3
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return contractInstance.setReward(customStartingRoundNumber.plus(BigNumber(2)).toFixed(0), web3.toWei(rewardIn2Round_ETH, "ether"))
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(2)).toFixed(0)),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2)
                ]);
            })
            .then(function(values) {
                address1Reward2 = BigNumber(values[3].toString()).mul(values[2][2].toString());
                address2Reward2 = BigNumber(values[4].toString()).mul(values[2][2].toString());

                assert.equal(values[0].toFixed(0), address1Reward2.plus(address1Reward1).toFixed(0), "reward should be as expected");
                assert.equal(values[1].toFixed(0), address2Reward2.plus(address2Reward1).toFixed(0), "reward should be as expected");
                return Promise.all([
                    contractInstance.sendTransaction({value: web3.toWei(1, "ether"), from: contractOwnerAddress}),
                    Promise.resolve(values[3]),
                    Promise.resolve(values[4])
                ])
            })
            .then(function(values){
                assert.isOk(values[0], "should be transaction");

                return Promise.all([
                    contractInstance.claimReward({from: contributorAddress1}),    //2 round
                    contractInstance.claimReward({from: contributorAddress2}),     //2 round
                    Promise.resolve(values[1]),
                    Promise.resolve(values[2])
                ])
            })
            .then(function(values){
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return Promise.all([
                    contractInstance.transfer(receiverAddress, values[2], {from: contributorAddress1}),
                    contractInstance.transfer(receiverAddress, values[3], {from: contributorAddress2})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1))) //finish 3 - start 4
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return contractInstance.setReward(customStartingRoundNumber.plus(BigNumber(3)).toFixed(0), web3.toWei(rewardIn1Round_ETH, "ether"))
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.calculateClaimableReward({from: receiverAddress}),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(3)).toFixed(0)),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2),
                    contractInstance.balanceOf(receiverAddress)
                ]);
            })
            .then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "reward should be as expected");
                assert.equal(values[1].toFixed(0), 0, "reward should be as expected");
                assert.equal(values[2].toFixed(0), BigNumber(values[6].toFixed(0)).mul(values[3][2].toFixed(0)).toFixed(0), "reward should be as expected");
            })
            .catch(function (error) {
                console.log("err: ", error);
                assert.false();
            })
    });

    it("13.2.2 " + "Reward calculation for configured rounds", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[19];
        var contributorAddress2 = accounts[18];
        var receiverAddress = accounts[17];

        var contributorAddress1sBNKAmount = 200;
        var contributorAddress2sBNKAmount = 300;

        var rewardIn1Round_ETH = 0.5;
        var rewardIn2Round_ETH = 0.5;

        var address1Reward1;
        var address2Reward1;

        var address1Reward2;
        var address2Reward2;

        return BankeraToken.new(blocksPerRound, customStartingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");

                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");

                return contractHelper.mineNextBlock(8*60);
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})
                ])
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return contractHelper.mineNextBlock(17*60);
            }).then(function(tx) {
                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1)));
            }).then(function(tx) {
                return contractInstance.setReward(customStartingRoundNumber.toFixed(0), 1)
            }).then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2})
                ]);
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "incorrect contributorAddress1 calculated reward");
                assert.equal(values[1].toFixed(0), 0, "incorrect contributorAddress2 calculated reward");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),    //1 round
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})     //1 round
                ])
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2})
                ]);
            })
            .then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "contract owner BNK balance should be zero");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");

                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1)))
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return contractInstance.setReward(customStartingRoundNumber.plus(BigNumber(1)).toFixed(0), web3.toWei(rewardIn1Round_ETH, "ether"))
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(1)).toFixed(0)),
                    contractInstance.issuedTokensInRound(1),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2)
                ]);
            })
            .then(function(values) {
                address1Reward1 = BigNumber(values[4].toString()).mul(values[2][2].toString());
                address2Reward1 = BigNumber(values[5].toString()).mul(values[2][2].toString());

                assert.equal(values[0].toFixed(0), address1Reward1.toFixed(0), "reward should be as expected");
                assert.equal(values[1].toFixed(0), address2Reward1.toFixed(0), "reward should be as expected");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),    //2 round
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})     //2 round
                ])
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1))) //finish 2 - start 3
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return contractInstance.setReward(customStartingRoundNumber.plus(BigNumber(2)).toFixed(0), web3.toWei(rewardIn2Round_ETH, "ether"))
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(2)).toFixed(0)),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2)
                ]);
            })
            .then(function(values) {
                address1Reward2 = BigNumber(values[3].toString()).mul(values[2][2].toString());
                address2Reward2 = BigNumber(values[4].toString()).mul(values[2][2].toString());

                assert.equal(values[0].toFixed(0), address1Reward2.plus(address1Reward1).toFixed(0), "reward should be as expected");
                assert.equal(values[1].toFixed(0), address2Reward2.plus(address2Reward1).toFixed(0), "reward should be as expected");
                return Promise.all([
                    contractInstance.sendTransaction({value: web3.toWei(1, "ether"), from: contractOwnerAddress}),
                    Promise.resolve(values[3]),
                    Promise.resolve(values[4])
                ])
            })
            .then(function(values){
                assert.isOk(values[0], "should be transaction");

                return Promise.all([
                    contractInstance.claimReward({from: contributorAddress1}),    //3 round
                    contractInstance.claimReward({from: contributorAddress2}),     //3 round
                    Promise.resolve(values[1]),
                    Promise.resolve(values[2])
                ])
            })
            .then(function(values){
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return Promise.all([
                    contractInstance.transfer(receiverAddress, values[2], {from: contributorAddress1}),
                    contractInstance.transfer(receiverAddress, values[3], {from: contributorAddress2})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1))) //finish 3 - start 4
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return contractInstance.setReward(customStartingRoundNumber.plus(BigNumber(3)).toFixed(0), web3.toWei(rewardIn1Round_ETH, "ether"))
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.calculateClaimableReward({from: receiverAddress}),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(3)).toFixed(0)),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2),
                    contractInstance.balanceOf(receiverAddress),
                    contractInstance.calculateClaimableRewardTillRound(customStartingRoundNumber.plus(BigNumber(4)).toFixed(0), {from: receiverAddress}),
                    contractInstance.calculateClaimableRewardTillRound(customStartingRoundNumber.plus(BigNumber(3)).toFixed(0), {from: receiverAddress}),
                    contractInstance.getBalanceModificationRounds(receiverAddress),
                    contractInstance.accountBalances(receiverAddress),
                    contractInstance.getRoundBalance(receiverAddress, customStartingRoundNumber.plus(BigNumber(3)).toFixed(0)),
                    contractInstance.currentRound()
                ]);
            })
            .then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "reward should be as expected");
                assert.equal(values[1].toFixed(0), 0, "reward should be as expected");
                assert.equal(values[2].toFixed(0), BigNumber(values[6].toFixed(0)).mul(values[3][2].toFixed(0)).toFixed(0), "reward should be as expected");

                assert.equal(values[7].toFixed(0), BigNumber(values[6].toFixed(0)).mul(values[3][2].toFixed(0)).toFixed(0), "reward should be as expected");
                assert.equal(values[8].toFixed(0), BigNumber(0).toFixed(0), "reward should be as expected");
            })
            .catch(function (error) {
                console.log("err: ", error);
                assert.fail();
            })
    });

    it("13.3.0 " + "Reward calculation for configured rounds (increase two rounds)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[19];
        var contributorAddress2 = accounts[18];

        var contributorAddress1sBNKAmount = 200;
        var contributorAddress2sBNKAmount = 300;

        var rewardIn0Round_ETH = 0.9;
        var rewardIn1Round_ETH = 0.9;
        var rewardIn2Round_ETH = 0.300003;

        var address1Reward0;
        var address2Reward0;

        var address1Reward1;
        var address2Reward1;

        var address1Reward2;
        var address2Reward2;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");

                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");

                return contractHelper.mineNextBlock(8*60);
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})
                ])
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return contractHelper.mineNextBlock(17*60);
            }).then(function(tx) {
                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1))); //finish 0 - start 1
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2})
                ]);
            })
            .then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "contributorAddress1 BNK balance should be zero");
                assert.equal(values[1].toFixed(0), 0, "contributorAddress2 BNK balance should be zero");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2})
                ]);
            })
            .catch(function (error) {
                assertJump(error);
            })
            .then(function(values) {
                return contractHelper.mineNewBlocks(blocksPerRound.mul(2).plus(BigNumber(1))) //finish 2 - start 3
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");
                return Promise.all([
                    contractInstance.setReward(0, web3.toWei(rewardIn0Round_ETH, "ether")),
                    contractInstance.setReward(1, web3.toWei(rewardIn1Round_ETH, "ether")),
                    contractInstance.setReward(2, web3.toWei(rewardIn2Round_ETH, "ether"))
                ])
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(0),
                    contractInstance.reward(1),
                    contractInstance.reward(2),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2)
                ]);
            })
            .then(function(values) {
                address1Reward0 = BigNumber(contributorAddress1sBNKAmount.toFixed(0)).mul(values[2][2].toFixed(0));
                address2Reward0 = BigNumber(contributorAddress2sBNKAmount.toFixed(0)).mul(values[2][2].toFixed(0));

                address1Reward1 = BigNumber(values[5].toFixed(0)).mul(values[3][2].toFixed(0));
                address2Reward1 = BigNumber(values[6].toFixed(0)).mul(values[3][2].toFixed(0));

                address1Reward2 = BigNumber(values[5].toFixed(0)).mul(values[4][2].toFixed(0));
                address2Reward2 = BigNumber(values[6].toFixed(0)).mul(values[4][2].toFixed(0));

                assert.equal(values[0].toFixed(0), address1Reward2.plus(address1Reward1).plus(address1Reward0).toFixed(0), "reward should be as expected");
                assert.equal(values[1].toFixed(0), address2Reward2.plus(address2Reward1).plus(address2Reward0).toFixed(0), "reward should be as expected");
            })
    });

    it("13.3.1 " + "Reward calculation for configured rounds (increase two rounds) (custom starting round number)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[19];
        var contributorAddress2 = accounts[18];

        var contributorAddress1sBNKAmount = 200;
        var contributorAddress2sBNKAmount = 300;

        var rewardIn0Round_ETH = 0.9;
        var rewardIn1Round_ETH = 0.9;
        var rewardIn2Round_ETH = 0.300003;

        var address1Reward0;
        var address2Reward0;

        var address1Reward1;
        var address2Reward1;

        var address1Reward2;
        var address2Reward2;

        return BankeraToken.new(blocksPerRound, customStartingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");

                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");

                return contractHelper.mineNextBlock(8*60);
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})
                ])
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return contractHelper.mineNextBlock(17*60);
            }).then(function(tx) {
                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1))); //finish 0 - start 1
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2})
                ]);
            })
            .then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "contributorAddress1 BNK balance should be zero");
                assert.equal(values[1].toFixed(0), 0, "contributorAddress2 BNK balance should be zero");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2})
                ]);
            })
            .catch(function (error) {
                assertJump(error);
            })
            .then(function(values) {
                return contractHelper.mineNewBlocks(blocksPerRound.mul(2).plus(BigNumber(1))) //finish 2 - start 3
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");
                return Promise.all([
                    contractInstance.setReward(customStartingRoundNumber.toFixed(0), web3.toWei(rewardIn0Round_ETH, "ether")),
                    contractInstance.setReward(customStartingRoundNumber.plus(BigNumber(1)).toFixed(0), web3.toWei(rewardIn1Round_ETH, "ether")),
                    contractInstance.setReward(customStartingRoundNumber.plus(BigNumber(2)).toFixed(0), web3.toWei(rewardIn2Round_ETH, "ether"))
                ])
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(customStartingRoundNumber.toFixed(0)),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(1)).toFixed(0)),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(2)).toFixed(0)),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2)
                ]);
            })
            .then(function(values) {
                address1Reward0 = BigNumber(contributorAddress1sBNKAmount.toFixed(0)).mul(values[2][2].toFixed(0));
                address2Reward0 = BigNumber(contributorAddress2sBNKAmount.toFixed(0)).mul(values[2][2].toFixed(0));

                address1Reward1 = BigNumber(values[5].toFixed(0)).mul(values[3][2].toFixed(0));
                address2Reward1 = BigNumber(values[6].toFixed(0)).mul(values[3][2].toFixed(0));

                address1Reward2 = BigNumber(values[5].toFixed(0)).mul(values[4][2].toFixed(0));
                address2Reward2 = BigNumber(values[6].toFixed(0)).mul(values[4][2].toFixed(0));

                assert.equal(values[0].toFixed(0), address1Reward2.plus(address1Reward1).plus(address1Reward0).toFixed(0), "reward should be as expected");
                assert.equal(values[1].toFixed(0), address2Reward2.plus(address2Reward1).plus(address2Reward0).toFixed(0), "reward should be as expected");
            })
    });

    it("13.3.2 " + "Reward calculation for configured rounds (increase two rounds)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[19];
        var contributorAddress2 = accounts[18];

        var contributorAddress1sBNKAmount = 200;
        var contributorAddress2sBNKAmount = 300;

        var rewardIn0Round_ETH = 0.9;
        var rewardIn1Round_ETH = 0.9;
        var rewardIn2Round_ETH = 0.300003;

        var address1Reward0;
        var address2Reward0;

        var address1Reward1;
        var address2Reward1;

        var address1Reward2;
        var address2Reward2;

        return BankeraToken.new(blocksPerRound, customStartingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");

                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");

                return contractHelper.mineNextBlock(8*60);
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})
                ])
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return contractHelper.mineNextBlock(17*60);
            }).then(function(tx) {
                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1))); //finish 0 - start 1
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2})
                ]);
            })
            .then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "contributorAddress1 BNK balance should be zero");
                assert.equal(values[1].toFixed(0), 0, "contributorAddress2 BNK balance should be zero");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2})
                ]);
            })
            .catch(function (error) {
                assertJump(error);
            })
            .then(function(values) {
                return contractHelper.mineNewBlocks(blocksPerRound.mul(2).plus(BigNumber(1))) //finish 2 - start 3
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");
                return Promise.all([
                    contractInstance.setReward(customStartingRoundNumber.toFixed(0), web3.toWei(rewardIn0Round_ETH, "ether")),
                    contractInstance.setReward(customStartingRoundNumber.plus(BigNumber(1)).toFixed(0), web3.toWei(rewardIn1Round_ETH, "ether")),
                    contractInstance.setReward(customStartingRoundNumber.plus(BigNumber(2)).toFixed(0), web3.toWei(rewardIn2Round_ETH, "ether"))
                ])
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(customStartingRoundNumber.toFixed(0)),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(1)).toFixed(0)),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(2)).toFixed(0)),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2),
                    contractInstance.calculateClaimableRewardTillRound(customStartingRoundNumber.toFixed(0), {from: contributorAddress1}),
                    contractInstance.calculateClaimableRewardTillRound(customStartingRoundNumber.toFixed(0), {from: contributorAddress2}),
                    contractInstance.calculateClaimableRewardTillRound(customStartingRoundNumber.plus(BigNumber(1)).toFixed(0), {from: contributorAddress1}),
                    contractInstance.calculateClaimableRewardTillRound(customStartingRoundNumber.plus(BigNumber(1)).toFixed(0), {from: contributorAddress2}),
                    contractInstance.calculateClaimableRewardTillRound(customStartingRoundNumber.plus(BigNumber(2)).toFixed(0), {from: contributorAddress1}),
                    contractInstance.calculateClaimableRewardTillRound(customStartingRoundNumber.plus(BigNumber(2)).toFixed(0), {from: contributorAddress2})
                ]);
            })
            .then(function(values) {

                assert.equal(values[7].toFixed(0), 0, "reward should be as expected");
                assert.equal(values[8].toFixed(0), 0, "reward should be as expected");

                address1Reward0 = BigNumber(contributorAddress1sBNKAmount.toFixed(0)).mul(values[2][2].toFixed(0));
                address2Reward0 = BigNumber(contributorAddress2sBNKAmount.toFixed(0)).mul(values[2][2].toFixed(0));

                assert.equal(values[9].toFixed(0), address1Reward0.toFixed(0), "reward should be as expected");
                assert.equal(values[10].toFixed(0), address2Reward0.toFixed(0), "reward should be as expected");

                address1Reward1 = BigNumber(values[5].toFixed(0)).mul(values[3][2].toFixed(0));
                address2Reward1 = BigNumber(values[6].toFixed(0)).mul(values[3][2].toFixed(0));

                assert.equal(values[11].toFixed(0), address1Reward1.plus(address1Reward0).toFixed(0), "reward should be as expected");
                assert.equal(values[12].toFixed(0), address2Reward1.plus(address2Reward0).toFixed(0), "reward should be as expected");

                address1Reward2 = BigNumber(values[5].toFixed(0)).mul(values[4][2].toFixed(0));
                address2Reward2 = BigNumber(values[6].toFixed(0)).mul(values[4][2].toFixed(0));

                assert.equal(values[0].toFixed(0), address1Reward2.plus(address1Reward1).plus(address1Reward0).toFixed(0), "reward should be as expected");
                assert.equal(values[1].toFixed(0), address2Reward2.plus(address2Reward1).plus(address2Reward0).toFixed(0), "reward should be as expected");
            })
    });

    it("13.4 " + "Reward calculation for configured rounds (empty balances in few rounds)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[19];
        var contributorAddress2 = accounts[18];
        var contributorAddress3 = accounts[17];

        var contributorAddress1sBNKAmount = 2000;

        var rewardIn0Round_ETH = 0.4;
        var rewardIn1Round_ETH = 0.9;
        var rewardIn2Round_ETH = 0.300003;
        var rewardIn3Round_ETH = 0.000003;

        var address1LastReward;
        var address2LastReward;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");

                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "totalSupply should be zero");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");

                return contractHelper.mineNextBlock(8*60);
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");
                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress})
                ])
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return contractHelper.mineNextBlock(17*60);
            }).then(function(tx) {
                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound.toString()).plus(BigNumber(1)));//finish 0 - start 1
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                //round not increased in contract (need action in contract to increase round)
                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2})
                ]);
            })
            .then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "contract owner BNK balance should be zero");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),    // round 1
                    contractInstance.setReward(0, web3.toWei(rewardIn0Round_ETH, "ether"))
                ])
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2})
                ]);
            })
            .then(function(values) {
                assert.isTrue(values[0].toFixed(0) > 0, "incorrect contract contributorAddress2 calculated reward");
                assert.equal(values[1].toFixed(0), 0, "contract contributorAddress2 calculated reward should be zero");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound.toString()).plus(BigNumber(1))) // finish 1 - start 2
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");
                return Promise.all([
                    contractInstance.setReward(1, web3.toWei(rewardIn1Round_ETH, "ether"))
                ])
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(0),
                    contractInstance.reward(1),
                    contractInstance.reward(2),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2)
                ]);
            })
            .then(function(values) {
                //first round calculation
                address1LastReward = BigNumber(contributorAddress1sBNKAmount).mul(values[2][2].toFixed(0)).toFixed(0);

                //second round calculation
                address1LastReward = BigNumber(values[5].toFixed(0)).mul(values[3][2].toFixed(0)).plus(address1LastReward).toFixed(0);
                address2LastReward = BigNumber(values[6].toFixed(0)).mul(values[3][2].toFixed(0)).toFixed(0);

                assert.equal(values[0].toFixed(0), address1LastReward, "reward should be as expected");
                assert.equal(values[1].toFixed(0), address2LastReward, "reward should be as expected");
                assert.equal(values[4][3], false, "reward should be not configured");
                assert.equal(values[5].toFixed(0), BigNumber(contributorAddress1sBNKAmount).mul(2).toFixed(0), "BNK amount should be equal");
                assert.equal(values[6].toFixed(0), 0, "BNK amount should be zero");

                return Promise.all([
                    contractHelper.mineNewBlocks(BigNumber(blocksPerRound.toString()).plus(BigNumber(1)))//finish 2 - start 3
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return Promise.all([
                    contractInstance.setReward(2, web3.toWei(rewardIn2Round_ETH, "ether"))
                ]);
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(2),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2)
                ]);
            })
            .then(function(values) {
                address1LastReward = BigNumber(values[3].toFixed(0)).mul(values[2][2].toFixed(0)).plus(BigNumber(address1LastReward));
                address2LastReward = BigNumber(values[4].toFixed(0)).mul(values[2][2].toFixed(0)).plus(BigNumber(address2LastReward));

                assert.equal(values[0].toFixed(0), address1LastReward.toFixed(0), "reward should be as expected");
                assert.equal(values[1].toFixed(0), address2LastReward.toFixed(0), "reward should be as expected");
                assert.equal(values[3].toFixed(0), BigNumber(contributorAddress1sBNKAmount).mul(2).toFixed(0), "BNK amount should be equal");
                assert.equal(values[4].toFixed(0), 0, "BNK amount should be zero");
                return Promise.all([
                    contractInstance.transfer(contributorAddress3, BigNumber(values[3].toFixed(0)).sub(BigNumber(133)).toFixed(0), {from: contributorAddress1})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return Promise.all([
                    contractHelper.mineNewBlocks(BigNumber(blocksPerRound.toString()).plus(BigNumber(1))) //finish 3 - start 4
                ]);
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return Promise.all([
                    contractInstance.setReward(3, web3.toWei(rewardIn3Round_ETH, "ether"))
                ]);
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(3),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2)
                ]);
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                address1LastReward = BigNumber(values[3].toFixed(0)).mul(values[2][2].toFixed(0)).plus(BigNumber(address1LastReward));
                address2LastReward = BigNumber(values[4].toFixed(0)).mul(values[2][2].toFixed(0)).plus(BigNumber(address2LastReward));

                assert.equal(values[0].toFixed(0), address1LastReward.toFixed(0), "reward should be as expected");
                assert.equal(values[1].toFixed(0), address2LastReward.toFixed(0), "reward should be as expected");
                assert.equal(values[3].toFixed(0), 133, "BNK amount should be equal");
                assert.equal(values[4].toFixed(0), 0, "BNK amount should be zero");
                return Promise.all([
                    contractHelper.mineNewBlocks(BigNumber(blocksPerRound.toString()).plus(BigNumber(1))) // finish 4 - start 5
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return Promise.all([
                    contractInstance.setReward(4, web3.toWei(rewardIn3Round_ETH, "ether"))
                ]);
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(4),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2)
                ]);
            })

            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                address1LastReward = BigNumber(values[3].toFixed(0)).mul(values[2][2].toFixed(0)).plus(BigNumber(address1LastReward));
                address2LastReward = BigNumber(values[4].toFixed(0)).mul(values[2][2].toFixed(0)).plus(BigNumber(address2LastReward));

                assert.equal(values[0].toFixed(0), address1LastReward.toFixed(0), "reward should be as expected");
                assert.equal(values[1].toFixed(0), address2LastReward.toFixed(0), "reward should be as expected");
                assert.equal(values[3].toFixed(0), 133, "BNK amount should be equal");
                assert.equal(values[4].toFixed(0), 0, "BNK amount should be zero");
                return Promise.all([
                    contractInstance.transfer(contributorAddress3, values[3], {from: contributorAddress1}) // modification in 5 round

                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                return Promise.all([
                    contractHelper.mineNewBlocks(BigNumber(blocksPerRound.toString()).mul(3).plus(BigNumber(1))) //finish 5,6,7 - start 8
                ]);
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                return Promise.all([
                    contractInstance.setReward(5, web3.toWei(rewardIn2Round_ETH, "ether")),
                    contractInstance.setReward(6, web3.toWei(rewardIn2Round_ETH, "ether")),
                    contractInstance.setReward(7, web3.toWei(rewardIn2Round_ETH, "ether"))
                ]);
            })

            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2)
                ]);
            })
            .then(function(values) {
                assert.equal(values[0].toFixed(0), address1LastReward.toFixed(0), "reward should be as expected");
                assert.equal(values[1].toFixed(0), address2LastReward.toFixed(0), "reward should be as expected");
                assert.equal(values[2].toFixed(0), 0, "BNK Balance should be zero");
                assert.equal(values[3].toFixed(0), 0, "BNK Balance should be zero");
                return Promise.all([
                    contractInstance.transfer(contributorAddress1, contributorAddress1sBNKAmount, {from: contributorAddress3}) // modification in 8 round
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                return Promise.all([
                    contractHelper.mineNewBlocks(BigNumber(blocksPerRound.toString()).plus(BigNumber(1))) // finish 8 - start 9
                ]);
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                return Promise.all([
                    contractInstance.setReward(8, web3.toWei(rewardIn2Round_ETH, "ether"))
                ]);
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(8),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2)
                ]);
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                address1LastReward = BigNumber(values[3].toFixed(0)).mul(values[2][2].toFixed(0)).plus(BigNumber(address1LastReward));
                address2LastReward = BigNumber(values[4].toFixed(0)).mul(values[2][2].toFixed(0)).plus(BigNumber(address2LastReward));

                assert.equal(values[0].toFixed(0), address1LastReward.toFixed(0), "reward should be as expected");
                assert.equal(values[1].toFixed(0), address2LastReward.toFixed(0), "reward should be as expected");
                assert.equal(values[3].toFixed(0), contributorAddress1sBNKAmount, "BNK amount should be equal");
                assert.equal(values[4].toFixed(0), 0, "BNK amount should be zero");
            })
    });

    it("13.5 " + "Reward calculation (buy in 0 round and few rounds no balance modification)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[2];
        var contributorAddress2 = accounts[3];
        var contributorAddress3 = accounts[4];
        var contributorAddress1sBNKAmount = 1721541201;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");

                return contractHelper.mineNextBlock(8*60)
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.balanceOf(contractOwnerAddress)
                ])
            })
            .then(function(values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "totalSupply should be zero");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contractOwnerAddress}),
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.calculateClaimableReward({from: contributorAddress3}),
                    contractInstance.calculateClaimableReward()
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[1].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[2].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[3].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[4].toFixed(0), 0, "claimable reward should be zero");

                return contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress})
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");
                return contractHelper.mineNextBlock(17*60);
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return contractHelper.mineNewBlocks(blocksPerRound.mul(5).plus(BigNumber(7)));//finish 0,1,2,3,4 - start 5
            })
            .then(function(tx) {
                return contractInstance.calculateClaimableReward({from: contributorAddress1})
            })
            .then(function(tx) {
                assert.equal(tx.toFixed(0), 0, "claimable reward should be zero");
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, web3.toWei(1, "ether")),
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.setReward(3, web3.toWei(1, "ether")),
                    contractInstance.setReward(4, web3.toWei(1, "ether"))
                ])
            })
            .then(function(values) {

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.reward(4),
                    contractInstance.balanceOf(contributorAddress1),
                    contractInstance.balanceOf(contributorAddress2),
                    contractInstance.currentRound()
                ]);
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                var address1LastReward = BigNumber(values[2].toFixed(0)).mul(values[1][2].toFixed(0)).mul(BigNumber(5));

                assert.equal(values[2].toFixed(0), contributorAddress1sBNKAmount, "contributorAddress1 BNK amount should be equal");
                assert.equal(values[0].toFixed(0), address1LastReward.toFixed(0), "reward should be as expected");
                assert.equal(values[1][3], true, "round should be configured");
                assert.equal(values[3].toFixed(0), 0, "contributorAddress2 BNK amount should be zero");
            })
    });

    it("13.6 " + "Reward calculation (buy in 5 round and few rounds no balance modification)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[2];
        var contributorAddress2 = accounts[3];
        var contributorAddress3 = accounts[4];
        var contributorAddress1sBNKAmount = 1721541201;
        var contributorAddress2sBNKAmount = 1026571239;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");

                return contractHelper.mineNextBlock(8*60)
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.balanceOf(contractOwnerAddress)
                ])
            })
            .then(function(values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contractOwnerAddress}),
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.calculateClaimableReward({from: contributorAddress3}),
                    contractInstance.calculateClaimableReward()
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[1].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[2].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[3].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[4].toFixed(0), 0, "claimable reward should be zero");

                return contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress})
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");
                return contractHelper.mineNextBlock(17*60);
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
            })
            .then(function(tx) {
                return contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount, {from: contractOwnerAddress})
            })
            .then(function(tx) {
                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*3).plus(BigNumber(2)));// finish 5,6,7 - start 8
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, web3.toWei(1, "ether")),
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.setReward(3, web3.toWei(1, "ether")),
                    contractInstance.setReward(4, web3.toWei(1, "ether")),
                    contractInstance.setReward(5, web3.toWei(1, "ether")),
                    contractInstance.setReward(6, web3.toWei(1, "ether")),
                    contractInstance.setReward(7, web3.toWei(1, "ether"))
                ])
            })
            .then(function(values) {
                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(7),
                    contractInstance.balanceOf(contributorAddress2),
                    contractInstance.currentRound()
                ]);
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                var address2LastReward = BigNumber(values[2].toFixed(0)).mul(values[1][2].toFixed(0)).mul(BigNumber(3));

                assert.equal(values[0].toFixed(0), address2LastReward.toFixed(0), "reward should be as expected");
                assert.equal(values[1][3], true, "round should be configured");
                assert.equal(values[2].toFixed(0), contributorAddress2sBNKAmount, "BNK amount should be equal");
                assert.equal(values[3].toFixed(0), 8, "Incorrect current round");
            })
    });

    it("13.7 " + "Reward calculation (buy in 5 round and few rounds no balance modification, transfer some fund in 9 round)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[2];
        var contributorAddress2 = accounts[3];
        var contributorAddress3 = accounts[4];
        var contributorAddress1sBNKAmount = 2000;//1000+250
        var contributorAddress2sBNKAmount;
        var address2LastReward;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");

                return contractHelper.mineNextBlock(8*60)
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.balanceOf(contractOwnerAddress)
                ])
            })
            .then(function(values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
                assert.equal(values[1].toFixed(0), 0, "contract owner BNK balance should be zero");

                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contractOwnerAddress}),
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.calculateClaimableReward({from: contributorAddress3}),
                    contractInstance.calculateClaimableReward()
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[1].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[2].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[3].toFixed(0), 0, "claimable reward should be zero");
                assert.equal(values[4].toFixed(0), 0, "claimable reward should be zero");

                return contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress})
            })
            .then(function(tx) {
                assert.isOk(tx, "should be transaction");
                return contractHelper.mineNextBlock(17*60);
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
            })
            .then(function(tx) {
                contributorAddress2sBNKAmount = contributorAddress1sBNKAmount/2;
                return contractInstance.transfer(contributorAddress2, contributorAddress1sBNKAmount/2, {from: contributorAddress1})//5 round
            })
            .then(function(tx) {
                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*3).plus(BigNumber(2)));// finish 5,6,7 - start 8
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, web3.toWei(1, "ether")),
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.setReward(3, web3.toWei(1, "ether")),
                    contractInstance.setReward(4, web3.toWei(1, "ether")),
                    contractInstance.setReward(5, web3.toWei(1, "ether")),
                    contractInstance.setReward(6, web3.toWei(1, "ether")),
                    contractInstance.setReward(7, web3.toWei(1, "ether"))
                ])
            })
            .then(function(values) {
                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(7),
                    contractInstance.balanceOf(contributorAddress2),
                    contractInstance.currentRound()
                ]);
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                address2LastReward = BigNumber(values[2].toFixed(0)).mul(values[1][2].toFixed(0)).mul(BigNumber(3));

                assert.equal(values[0].toFixed(0), address2LastReward.toFixed(0), "reward should be as expected");
                assert.equal(values[1][3], true, "round should be configured");
                assert.equal(values[2].toFixed(0), contributorAddress2sBNKAmount, "BNK amount should be equal");
                assert.equal(values[3].toFixed(0), 8, "Incorrect current round");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound).plus(BigNumber(1)));// finish 8 - start 9
            })
            .then(function(tx) {
                contributorAddress2sBNKAmount = contributorAddress2sBNKAmount + contributorAddress1sBNKAmount/8;
                return contractInstance.transfer(contributorAddress2, contributorAddress1sBNKAmount/8, {from: contributorAddress1})//9 round
            })
            .then(function(tx) {

                return Promise.all([
                    contractInstance.setReward(8, web3.toWei(1, "ether"))
                ])
            })
            .then(function(values) {
                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(8),
                    contractInstance.balanceOf(contributorAddress2),
                    contractInstance.currentRound()
                ]);
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");

                address2LastReward = BigNumber(address2LastReward).plus(BigNumber(1000).mul(values[1][2].toFixed(0)).mul(BigNumber(1)));

                assert.equal(values[0].toFixed(0), address2LastReward.toFixed(0), "reward should be as expected");
                assert.equal(values[1][3], true, "round should be configured");
                assert.equal(values[2].toFixed(0), contributorAddress2sBNKAmount, "BNK amount should be equal");
                assert.equal(values[3].toFixed(0), 9, "Incorrect current round");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound.mul(2)).plus(BigNumber(1)));// finish 9, 10 - start 11
            }).then(function(tx) {
                return Promise.all([
                    contractInstance.setReward(9, web3.toWei(1, "ether")),
                    contractInstance.setReward(10, web3.toWei(1, "ether"))
                ])
            })
            .then(function(values) {
                return Promise.all([
                    contractInstance.calculateClaimableReward({from: contributorAddress2}),
                    contractInstance.reward(10),
                    contractInstance.balanceOf(contributorAddress2),
                    contractInstance.currentRound()
                ]);
            }).then(function(values) {
                assert.isOk(values[0], "should be transaction");

                address2LastReward = BigNumber(address2LastReward).plus(BigNumber(contributorAddress2sBNKAmount).mul(values[1][2].toFixed(0)).mul(BigNumber(2)));

                assert.equal(values[0].toFixed(0), address2LastReward.toFixed(0), "reward should be as expected");
                assert.equal(values[1][3], true, "round should be configured");
                assert.equal(values[2].toFixed(0), contributorAddress2sBNKAmount, "BNK amount should be equal");
                assert.equal(values[3].toFixed(0), 11, "Incorrect current round");
            })
    });

    it("13.8 " + "Reward calculation in first round", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[2];
        var contributorAddress1sBNKAmount = BigNumber('100');

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");

                return contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return contractHelper.mineNewBlocks(blocksPerRound)
            }).then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.setReward(0, web3.toWei(1, "ether")),
                    contractInstance.currentRound.call()
                ])
            }).then(function (values) {
                assert.isOk(values[0], "should be transaction");
                assert.equal(values[1].toFixed(0), 1, "current round is not 1");

                return contractInstance.calculateClaimableReward({from: contributorAddress1})
            })
            .catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
            .then(function (value) {
                var expectedReward = BigNumber(web3.toWei(1, "ether").toString());
                assert.equal(expectedReward.toFixed(0), value.toFixed(0), "incorrect calculated reward");
            })
    });

    it("13.9.0 " + "Calculate Reward till round", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[2];
        var contributorAddress1sBNKAmount = BigNumber('100');

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})   //0 round
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractHelper.mineNewBlocks(blocksPerRound)    //finished 0 - started 1
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})   //round 1
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractHelper.mineNewBlocks(blocksPerRound)    //finished 1 - started 2
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})      //2 round
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractHelper.mineNewBlocks(blocksPerRound)    //finished 2 - started 3
                ])
            }).then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})   //3 round
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractHelper.mineNewBlocks(blocksPerRound)    //finished 3 - started 4
                ])
            }).then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})   //4 round
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractHelper.mineNewBlocks(blocksPerRound)    //finished 4 - started 5
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.setReward(startingRoundNumber.plus(0).toFixed(0), web3.toWei(1, "ether")),
                    contractInstance.setReward(startingRoundNumber.plus(1).toFixed(0), web3.toWei(1, "ether")),
                    contractInstance.setReward(startingRoundNumber.plus(2).toFixed(0), web3.toWei(1, "ether")),
                    contractInstance.setReward(startingRoundNumber.plus(3).toFixed(0), web3.toWei(1, "ether")),
                    contractInstance.setReward(startingRoundNumber.plus(4).toFixed(0), web3.toWei(1, "ether")),
                    contractInstance.currentRound()
                ])
            })
            .then(function (values) {
                assert.equal(startingRoundNumber.plus(5).toFixed(0), values[5].toFixed(0), "incorrect current round");

                return Promise.all([
                    contractInstance.calculateClaimableRewardTillRound(startingRoundNumber.plus(0).toFixed(0), {from: contributorAddress1}),
                    contractInstance.calculateClaimableRewardTillRound(startingRoundNumber.plus(1).toFixed(0), {from: contributorAddress1}),
                    contractInstance.calculateClaimableRewardTillRound(startingRoundNumber.plus(2).toFixed(0), {from: contributorAddress1}),
                    contractInstance.calculateClaimableRewardTillRound(startingRoundNumber.plus(3).toFixed(0), {from: contributorAddress1}),
                    contractInstance.calculateClaimableRewardTillRound(startingRoundNumber.plus(4).toFixed(0), {from: contributorAddress1}),
                    contractInstance.calculateClaimableRewardTillRound(startingRoundNumber.plus(5).toFixed(0), {from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.reward(startingRoundNumber.plus(BigNumber(0)).toFixed(0)),
                    contractInstance.reward(startingRoundNumber.plus(BigNumber(1)).toFixed(0)),
                    contractInstance.reward(startingRoundNumber.plus(BigNumber(2)).toFixed(0)),
                    contractInstance.reward(startingRoundNumber.plus(BigNumber(3)).toFixed(0)),
                    contractInstance.reward(startingRoundNumber.plus(BigNumber(4)).toFixed(0)),
                    contractInstance.reward(startingRoundNumber.plus(BigNumber(5)).toFixed(0))
                ])
            })
            .then(function (values) {

                var reward = [values[7]];
                var issuedTokensInRound = [contributorAddress1sBNKAmount];

                assert.equal(0, values[0].toFixed(0), "incorrect claimable reward");
                assert.equal(contractHelper.calculateReward(reward, issuedTokensInRound).toFixed(0), values[1].toFixed(0), "incorrect claimable reward");

                reward.push(values[8]);
                issuedTokensInRound.push(contributorAddress1sBNKAmount.mul(2));
                assert.equal(contractHelper.calculateReward(reward, issuedTokensInRound).toFixed(0), values[2].toFixed(0), "incorrect claimable reward");

                reward.push(values[9]);
                issuedTokensInRound.push(contributorAddress1sBNKAmount.mul(3));
                assert.equal(contractHelper.calculateReward(reward, issuedTokensInRound).toFixed(0), values[3].toFixed(0), "incorrect claimable reward");

                reward.push(values[10]);
                issuedTokensInRound.push(contributorAddress1sBNKAmount.mul(4));
                assert.equal(contractHelper.calculateReward(reward, issuedTokensInRound).toFixed(0), values[4].toFixed(0), "incorrect claimable reward");

                reward.push(values[11]);
                issuedTokensInRound.push(contributorAddress1sBNKAmount.mul(5));
                assert.equal(contractHelper.calculateReward(reward, issuedTokensInRound).toFixed(0), values[5].toFixed(0), "incorrect claimable reward");

                assert.equal(values[5].toFixed(0), values[6].toFixed(0), "incorrect calculated claimable reward");
            })
            .catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
    });

    it("13.9.1 " + "Calculate Reward till round (custom starting round number)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[2];
        var contributorAddress1sBNKAmount = BigNumber('100');

        return BankeraToken.new(blocksPerRound, customStartingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})   //0 round
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractHelper.mineNewBlocks(blocksPerRound)    //finished 0 - started 1
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})   //round 1
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractHelper.mineNewBlocks(blocksPerRound)    //finished 1 - started 2
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})      //2 round
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractHelper.mineNewBlocks(blocksPerRound)    //finished 2 - started 3
                ])
            }).then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})   //3 round
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractHelper.mineNewBlocks(blocksPerRound)    //finished 3 - started 4
                ])
            }).then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})   //4 round
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractHelper.mineNewBlocks(blocksPerRound)    //finished 4 - started 5
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.setReward(customStartingRoundNumber.plus(0).toFixed(0), web3.toWei(1, "ether")),
                    contractInstance.setReward(customStartingRoundNumber.plus(1).toFixed(0), web3.toWei(1, "ether")),
                    contractInstance.setReward(customStartingRoundNumber.plus(2).toFixed(0), web3.toWei(1, "ether")),
                    contractInstance.setReward(customStartingRoundNumber.plus(3).toFixed(0), web3.toWei(1, "ether")),
                    contractInstance.setReward(customStartingRoundNumber.plus(4).toFixed(0), web3.toWei(1, "ether")),
                    contractInstance.currentRound()
                ])
            })
            .then(function (values) {
                assert.equal(customStartingRoundNumber.plus(5).toFixed(0), values[5].toFixed(0), "incorrect current round");

                return Promise.all([
                    contractInstance.calculateClaimableRewardTillRound(customStartingRoundNumber.plus(0).toFixed(0), {from: contributorAddress1}),
                    contractInstance.calculateClaimableRewardTillRound(customStartingRoundNumber.plus(1).toFixed(0), {from: contributorAddress1}),
                    contractInstance.calculateClaimableRewardTillRound(customStartingRoundNumber.plus(2).toFixed(0), {from: contributorAddress1}),
                    contractInstance.calculateClaimableRewardTillRound(customStartingRoundNumber.plus(3).toFixed(0), {from: contributorAddress1}),
                    contractInstance.calculateClaimableRewardTillRound(customStartingRoundNumber.plus(4).toFixed(0), {from: contributorAddress1}),
                    contractInstance.calculateClaimableRewardTillRound(customStartingRoundNumber.plus(5).toFixed(0), {from: contributorAddress1}),
                    contractInstance.calculateClaimableReward({from: contributorAddress1}),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(0)).toFixed(0)),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(1)).toFixed(0)),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(2)).toFixed(0)),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(3)).toFixed(0)),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(4)).toFixed(0)),
                    contractInstance.reward(customStartingRoundNumber.plus(BigNumber(5)).toFixed(0))
                ])
            })
            .then(function (values) {

                var reward = [values[7]];
                var issuedTokensInRound = [contributorAddress1sBNKAmount];

                assert.equal(0, values[0].toFixed(0), "incorrect claimable reward");
                assert.equal(contractHelper.calculateReward(reward, issuedTokensInRound).toFixed(0), values[1].toFixed(0), "incorrect claimable reward");

                reward.push(values[8]);
                issuedTokensInRound.push(contributorAddress1sBNKAmount.mul(2));
                assert.equal(contractHelper.calculateReward(reward, issuedTokensInRound).toFixed(0), values[2].toFixed(0), "incorrect claimable reward");

                reward.push(values[9]);
                issuedTokensInRound.push(contributorAddress1sBNKAmount.mul(3));
                assert.equal(contractHelper.calculateReward(reward, issuedTokensInRound).toFixed(0), values[3].toFixed(0), "incorrect claimable reward");

                reward.push(values[10]);
                issuedTokensInRound.push(contributorAddress1sBNKAmount.mul(4));
                assert.equal(contractHelper.calculateReward(reward, issuedTokensInRound).toFixed(0), values[4].toFixed(0), "incorrect claimable reward");

                reward.push(values[11]);
                issuedTokensInRound.push(contributorAddress1sBNKAmount.mul(5));
                assert.equal(contractHelper.calculateReward(reward, issuedTokensInRound).toFixed(0), values[5].toFixed(0), "incorrect claimable reward");

                assert.equal(values[5].toFixed(0), values[6].toFixed(0), "incorrect calculated claimable reward");
            })
            .catch(function (error) {
                console.log(error);
                assert.fail('Unexpected fail');
            })
    });
});