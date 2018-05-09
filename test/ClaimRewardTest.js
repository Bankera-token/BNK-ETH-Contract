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

contract('Claim reward tests', function (accounts) {

    beforeEach(function(done) {
        this.timeout(3000); // A very long environment setup.
        setTimeout(done, 2500);
    });

    var totalSupplyInsBNK = BigNumber('2500000000000000000');
    var blocksPerRound = 55;
    var startingRoundNumber = BigNumber(0);

    it("15.1 " + "Try claim reward in 0 round for empty accounts", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[2];


        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0], totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return contractInstance.claimReward({from: contributorAddress1})
            })
            .catch(function(error) {
                assertJump(error);
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");
                return contractHelper.mineNextBlock(17*60);
            })
            .then(function (tx) {
                assert.isOk(tx, "should be transaction");

                return contractInstance.claimReward({from: contributorAddress1})    // 0 round
            })
            .catch(function(error) {
                assertJump(error);
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return contractHelper.mineNextBlock(12*60);
            })
            .then(function (tx) {
                assert.isOk(tx, "should be transaction");

                return contractInstance.claimReward({from: contributorAddress1})    // 0 round
            })
            .then(function(values) {
                assert.isOk(false, 'Unexpected exception');
                console.log("Incorrect working flow");
            })
            .catch(function(error) {
                assertJump(error);
            })
    });

    it("15.2 " + "Try to claim reward in configured rounds", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress1sBNKAmount = BigNumber('541');
        var contributorAmountBeforeWithdraw;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0], totalSupplyInsBNK.toFixed(0), "totalSupply should be 0");

                return contractHelper.mineNextBlock(15*60);
            })
            .then(function (value) {
                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                return contractHelper.mineNextBlock(12*6);
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*3).plus(BigNumber(7)));// finish 0,1,2, - start 3
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, 0),
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(2, "ether")})
                ])
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(2, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");

                return contractInstance.balanceOf(contractOwnerAddress); //contract owner BNK balance
            })
            .then(function(value) {
                assert.equal(value.toString(), 0, "should be zero");

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.reward(0),
                    contractInstance.reward(1),
                    contractInstance.reward(2),
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: accounts[10]})
                ])
            }).then(function (values) {

                var reward = [values[0], values[1], values[2]];
                var issuedTokensInRound = [contributorAddress1sBNKAmount, contributorAddress1sBNKAmount, contributorAddress1sBNKAmount];

                var calculatedRewardAmount = contractHelper.calculateReward(reward, issuedTokensInRound);
                assert.equal(calculatedRewardAmount.toString(), BigNumber(values[3].toString()).toString(), "Calculated claimable reward should be same");

                return Promise.all([
                    Promise.resolve(calculatedRewardAmount),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function (values) {
                assert.equal(BigNumber(web3.toWei(2, "ether")).minus(BigNumber(values[0].toString())).toString(), web3.eth.getBalance(contractAddress).toString(), "Contract ETH Balance is wrong");

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");
            })
            .catch(function(tx) {
                console.log("tx sendTransaction7 ", tx);
                assert.isOk(false);
            })
    });

    it("15.3 " + "Try to claim reward for all not configured rounds", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[7];
        var contributorAddress1sBNKAmount = BigNumber('15545412541');
        var contributorAmountBeforeWithdraw;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "totalSupply should be 0");

                return contractHelper.mineNextBlock(2*60);
            })
            .then(function (value) {
                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                return contractHelper.mineNextBlock(18*60);
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*3).plus(BigNumber(7)));// finish 0,1,2, - start 3
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.sendTransaction({value: web3.toWei(2, "ether")}),
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })
            .catch(function(error) {
                console.log("error- ", error);
                assert.isOk(false);
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(2, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");
                assert.isOk(values[0], "should be transaction");
                assert.equal(values[1], 0, "Incorrect BNK balance");

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1}),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .catch(function(error) {
                assertJump(error);
            })
    });

    it("15.4 " + "Try to claim reward for all configured rounds", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress1sBNKAmount = BigNumber('532541');
        var contributorAmountBeforeWithdraw;
        var claimedReward;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return contractHelper.mineNextBlock(15);
            })
            .then(function (value) {
                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                return contractHelper.mineNextBlock(5*60);
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, 0),
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.setReward(3, 0),
                    contractInstance.setReward(4, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(3, "ether")})
                ])
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(3, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");

                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");
                assert.isOk(values[4], "should be transaction");
                assert.isOk(values[5], "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })
            .then(function(values) {
                assert.equal(values[0], 0, "Incorrect contract owner BNK balance");

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function(values) {
                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    Promise.resolve(values[0]),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function (values) {
                assert.equal(BigNumber(web3.toWei(3, "ether")).minus(BigNumber(values[0].toString())).toString(), BigNumber(web3.eth.getBalance(contractAddress).toString()).toString(), "Contract ETH Balance is wrong");

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                claimedReward = BigNumber(values[0].toString());
                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");

                return contractInstance.accountBalances(contributorAddress1)
            })
            .then(function (value) {
                assert.equal(value[2], claimedReward.toFixed(0), "user marked claimed reward should be same as claimed");
            })
            .catch(function(error) {
                console.log("error- ", error);
                assert.isOk(false);
            })
    });

    it("15.5 " + "Try to claim reward then second round is not configured", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress1sBNKAmount = BigNumber('532541');
        var contributorAmountBeforeWithdraw;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                return contractHelper.mineNextBlock(25*60);
            })
            .then(function (value) {

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, 0),
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.setReward(3, 0),
                    contractInstance.setReward(4, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(2, "ether")})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");
                assert.isOk(values[4], "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(2, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");
                assert.equal(values[0], 0, "Incorrect balance");

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1}),
                    contractInstance.claimReward({from: contributorAddress1}),
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function(values) {
                assert.isOk(false, 'Unexpected exception');
            })
            .catch(function(error) {
                assertJump(error);
            })
    });

    it("15.6 " + "Try to claim reward then middle round is not configured", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress1sBNKAmount = BigNumber('532541');
        var contributorAmountBeforeWithdraw;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return contractHelper.mineNextBlock(11*60);
            })
            .then(function (tx) {
                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, 0),
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.setReward(2, 0),
                    contractInstance.setReward(4, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(2, "ether")})
                ])
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(2, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");
                assert.isOk(values[4], "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })
            .then(function(values) {
                assert.equal(values[0], 0, "should be transaction");

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: accounts[11]}),
                    contractInstance.claimReward({from: contributorAddress1}),
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function(values) {
                assert.isOk(false, 'Unexpected exception');
            })
            .catch(function(error) {
                assertJump(error);
            })
    });

    it("15.7 " + "Try to claim reward then last round is not configured", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress1sBNKAmount = BigNumber('971532543');
        var contributorAmountBeforeWithdraw;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, 0),
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.setReward(2, 0),
                    contractInstance.setReward(3, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(2, "ether")})
                ])
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(2, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");
                assert.isOk(values[4], "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })
            .then(function(values) {
                assert.equal(values[0], 0, "should be transaction");

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1}),
                    contractInstance.claimReward({from: contributorAddress1}),
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function(values) {
                assert.isOk(false, 'Unexpected exception');
            })
            .catch(function(error) {
                assertJump(error);
            })
    });

    it("15.8 " + "Claim reward for all configured rounds and try again", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress1sBNKAmount = 532556148151541;
        var contributorAmountBeforeWithdraw;
        var claimedReward;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, 0),
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.setReward(3, 0),
                    contractInstance.setReward(4, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(3, "ether")})
                ])
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(3, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");
                assert.isOk(values[4], "should be transaction");
                assert.isOk(values[5], "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })
            .then(function(values) {
                assert.equal(values[0].toString(), 0, "should be transaction");

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function(values) {
                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    Promise.resolve(values[0]),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function (values) {
                assert.equal(BigNumber(web3.toWei(3, "ether").toString()).minus(BigNumber(values[0].toString())).toString(), BigNumber(web3.eth.getBalance(contractAddress).toString()).toString(), "Contract ETH Balance is wrong");

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");
                claimedReward = BigNumber(values[0].toString());

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());
                return contractInstance.accountBalances(contributorAddress1);
            })
            .then(function(value) {
                assert.equal(value[2].toString(), claimedReward.toString(), "user marked claimed reward should be same as claimed");

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function(values) {
                return Promise.all([
                    Promise.resolve(values[0]),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function(values) {
                assert.equal(0, values[0].toString(), "Reward amount should be zero");

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");
                return contractInstance.accountBalances(contributorAddress1);
            })
            .then(function(value) {
                assert.equal(value[2].toString(), claimedReward.toString(), "user marked claimed reward should be same as claimed");
            })
            .catch(function(error) {
                console.log(error);
                assert.isOk(false, 'Unexpected exception');
            })
    });

    it("15.9 " + "Claim reward for all configured rounds, wait few rounds and try again to claim", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress1sBNKAmount = BigNumber('532556148151541');
        var contributorAmountBeforeWithdraw;
        var claimedReward;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, 0),
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.setReward(3, 0),
                    contractInstance.setReward(4, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(3, "ether")})
                ])
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(3, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");
                assert.isOk(values[4], "should be transaction");
                assert.isOk(values[5], "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })
            .then(function(values) {

                assert.equal(values[0].toString(), 0,  "should be transaction");
                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function(values) {
                return Promise.all([
                    Promise.resolve(values[0]),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function (values) {
                assert.equal(BigNumber(web3.toWei(3, "ether")).minus(BigNumber(values[0].toString())).toString(), web3.eth.getBalance(contractAddress), "Contract ETH Balance is wrong");

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");
                claimedReward = BigNumber(values[0].toString());

                return Promise.all([
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function(values) {

                assert.equal(values[0][2].toString(), claimedReward.toString(), "user marked claimed reward should be same as claimed");
                return Promise.all([
                    contractHelper.mineNewBlocks(BigNumber(blocksPerRound*2).plus(BigNumber(2)))// finish 5,6 - start 7
                ])
            })
            .then(function(tx) {
                return Promise.all([
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function(tx) {
                assert.isOk(false, 'Unexpected exception');
            })
            .catch(function(error) {
                assertJump(error);
            })
    });

    it("15.10 " + "Claim reward for all configured rounds, sell all BNK tokens and try again to claim reward", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress2 = accounts[7];
        var contributorAddress1sBNKAmount = BigNumber('532556148151541');
        var contributorAmountBeforeWithdraw;
        var claimedReward;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return contractHelper.mineNextBlock(12*60);
            })
            .then(function (value) {
                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                return contractHelper.mineNextBlock(6*60);
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, 0),
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.setReward(3, 0),
                    contractInstance.setReward(4, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(3, "ether")})
                ])
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(3, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");
                assert.isOk(values[4], "should be transaction");
                assert.isOk(values[5], "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })
            .then(function(values) {
                assert.equal(values[0].toString(), 0, "should be transaction");
                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function(values) {
                return Promise.all([
                    Promise.resolve(values[0]),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function (values) {
                assert.equal(BigNumber(web3.toWei(3, "ether")).minus(BigNumber(values[0].toString())).toString(), web3.eth.getBalance(contractAddress).toString(), "Contract ETH Balance is wrong");

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");
                claimedReward = BigNumber(values[0].toString());

                return contractInstance.accountBalances(contributorAddress1);
            })
            .then(function(value) {
                assert.equal(value[2].toString(), claimedReward.toString(), "user marked claimed reward should be same as claimed");

                return Promise.all([
                    contractInstance.transfer(contributorAddress2, value[0].toString(), {from: contributorAddress1})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return contractInstance.accountBalances(contributorAddress1);
            })
            .then(function (value) {
                assert.equal(value[0].toString(), 0, "BNK balance after all BNK transfer should be 0");

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1}),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function(values) {
                assert.equal(0, values[0], "calculated reward after Rewards withdraw should 0");
                assert.isOk(values[1], "should be transaction");

                return contractInstance.balanceOf(contributorAddress1);
            })
            .then(function(values) {
                assert.equal(0, values.toString(), "BNK balance after all BNK transfer should be 0");
            })
    });

    it("15.11 " + "Claim reward for all configured rounds, sell all BNK tokens, wait few rounds and try again to claim reward", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress2 = accounts[7];
        var contributorAddress1sBNKAmount = BigNumber('1232556148151541');
        var contributorAmountBeforeWithdraw;
        var claimedReward;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, 0),
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.setReward(3, 0),
                    contractInstance.setReward(4, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(3, "ether")})
                ])
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(3, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");
                assert.isOk(values[4], "should be transaction");
                assert.isOk(values[5], "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })
            .then(function(values) {
                assert.equal(values[0].toString(), 0, "should be transaction");
                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function(values) {

                return Promise.all([
                    Promise.resolve(values[0]),
                    contractInstance.claimReward({from: contributorAddress1}),
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function (values) {
                assert.equal(BigNumber(web3.toWei(3, "ether")).minus(BigNumber(values[0].toString())).toString(), BigNumber(web3.eth.getBalance(contractAddress).toString()).toString(), "Contract ETH Balance is wrong");

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");
                assert.equal(values[2][2].toString(), values[0].toString(), "user marked claimed reward should be same as claimed");
                claimedReward = BigNumber(values[2][2].toString());

                return Promise.all([
                    contractInstance.transfer(contributorAddress2, values[2][0].toString(), {from: contributorAddress1})
                ])
            })
            .then(function (values){
                assert.isOk(values[0], "should be transaction");
                return Promise.all([
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function (values) {
                assert.equal(values[0][0].toString(), 0, "BNK balance after all BNK transfer should be 0");

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function (values) {
                assert.equal(0, values[0], "calculated reward after Rewards withdraw should 0");

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1}),
                    contractInstance.claimReward({from: contributorAddress1}),
                    contractInstance.balanceOf(contributorAddress1)
                ])
            })
            .then(function (values) {

                return Promise.all([
                    contractInstance.claimReward({from: contributorAddress1}),
                    contractInstance.balanceOf(contributorAddress1)
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.equal(0, values[1], "BNK balance after all BNK transfer should be 0");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*2).plus(BigNumber(1)));// finish 5,6 - start 7
            })
            .then(function(tx) {
                return Promise.all([
                    contractInstance.setReward(5, web3.toWei(1, "ether")),
                    contractInstance.setReward(6, web3.toWei(1, "ether"))
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function(values) {
                return Promise.all([
                    Promise.resolve(values[0]),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function(values) {
                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance should be the same");
                assert.equal(0, values[0].toString(), "claim reward should be 0");
            })
    });

    it("15.12 " + "Claim reward for all configured rounds, wait few rounds, buy new tokens and try again to claim reward", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress1sBNKAmount = 532558151541;
        var contributorAmountBeforeWithdraw;
        var claimedReward;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, 0),
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.setReward(3, 0),
                    contractInstance.setReward(4, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(3, "ether")})
                ])
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(3, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");
                assert.isOk(values[4], "should be transaction");
                assert.isOk(values[5], "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })
            .then(function(values) {
                assert.isOk(values[0].toString(), 0, "should be transaction");
                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function(values) {
                return Promise.all([
                    Promise.resolve(values[0]),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function (values) {
                assert.equal(BigNumber(web3.toWei(3, "ether").toString()).minus(BigNumber(values[0].toString())).toString(), BigNumber(web3.eth.getBalance(contractAddress).toString()).toString(), "Contract ETH Balance is wrong");

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");
                claimedReward = BigNumber(values[0].toString());
                return Promise.all([
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function (values) {
                assert.equal(values[0][2].toString(), claimedReward.toString(), "user marked claimed reward should be same as claimed");
                assert.equal(values[0][1].toString(), 5, "user last claimed reward till round should be 5");
                assert.equal(values[0][0].toString(), BigNumber(contributorAddress1sBNKAmount).toString(), "wrong user BNK tokens count");
                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*2).plus(BigNumber(7)));// finish 5,6 - start 7
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}),
                    contractInstance.setReward(5, web3.toWei(0.5, "ether")),
                    contractInstance.setReward(6, web3.toWei(0.5, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(1, "ether")})
                ])
            })
            .then(function (values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function (values) {
                return Promise.all([
                    Promise.resolve(values[0]),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function (values) {
                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                claimedReward = claimedReward.plus(BigNumber(values[0].toString()));
                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");
                return Promise.all([
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function (values) {
                assert.equal(values[0][2], claimedReward.toString(), "user marked claimed reward should be same as claimed");
            })
    });

    it("15.13 " + "Claim reward for all configured rounds, wait few rounds, buy new tokens, wait few rounds and try again to claim reward", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress1sBNKAmount = BigNumber('532558151540');
        var contributorAmountBeforeWithdraw;
        var claimedReward;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return contractHelper.mineNextBlock(25*60+1);
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, 0),
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.setReward(3, 0),
                    contractInstance.setReward(4, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(3, "ether")}),
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(3, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");
                assert.isOk(values[4], "should be transaction");
                assert.isOk(values[5], "should be transaction");
                assert.equal(values[6], 0, "should be transaction");

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function (values) {
                return Promise.all([
                    Promise.resolve(values[0]),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function (values) {
                assert.equal(BigNumber(web3.toWei(3, "ether")).minus(BigNumber(values[0].toString())).toString(), BigNumber(web3.eth.getBalance(contractAddress).toString()).toString(), "Contract ETH Balance is wrong");

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");
                claimedReward = BigNumber(values[0].toString());
                return contractInstance.accountBalances(contributorAddress1)
            })
            .then(function (value) {
                assert.equal(claimedReward.toString(), value[2].toString(), "user marked claimed reward should be same as claimed");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*2).plus(BigNumber(0)));// finish 5,6 - start 7
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");
                return contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");
                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*2).plus(BigNumber(0)));// finish 7,8 - start 9
            })
            .then(function (tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.setReward(5, web3.toWei(0.5, "ether")),
                    contractInstance.setReward(6, web3.toWei(0.5, "ether")),
                    contractInstance.setReward(7, web3.toWei(0.3, "ether")),
                    contractInstance.setReward(8, web3.toWei(0.3, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(8.6, "ether")})
                ])
            })
            .then(function (values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function (values) {
                return Promise.all([
                    Promise.resolve(values[0]),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function (values) {
                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                claimedReward = claimedReward.plus(BigNumber(values[0].toString()));
                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");

                return Promise.all([
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function (values) {
                assert.equal(values[0][2].toString(), claimedReward.toString(), "user marked claimed reward should be same as claimed");
                assert.equal(values[0][1].toString(), 9, "user last claimed reward till round should be 9");
                assert.equal(values[0][0].toString(), BigNumber(contributorAddress1sBNKAmount).mul(2).toString(), "wrong user BNK tokens count");
            })
    });

    it("15.14 " + "Buy tokens wait few rounds and try to claim reward", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress1sBNKAmount = BigNumber('5000000000001');
        var contributorAmountBeforeWithdraw;
        var claimedReward = BigNumber(0);

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.blocksPerRound()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
                assert.isOk(values[1].toFixed(0) > 0, "blocksPerRound should be greater when 0");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");
                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*4).plus(BigNumber(7)));// finish 0,1,2,3 - start 4
            })
            .then(function (value) {
                return Promise.all([
                    contractInstance.setReward(0, web3.toWei(0, "ether")),
                    contractInstance.setReward(1, web3.toWei(0.4, "ether")),
                    contractInstance.setReward(2, web3.toWei(0.3, "ether")),
                    contractInstance.setReward(3, web3.toWei(0.11, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(0.81, "ether")})
                ])
            })
            .then(function (values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function (values) {
                return Promise.all([
                    Promise.resolve(values[0]),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function (values) {
                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");
                claimedReward = claimedReward.plus(BigNumber(values[0].toString()));

                return Promise.all([
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function (values) {
                assert.equal(values[0][2].toString(), claimedReward.toString(), "user marked claimed reward should be same as claimed");
                assert.equal(values[0][1].toString(), 4, "user last claimed reward till round should be 4");
                assert.equal(values[0][0].toString(), BigNumber(contributorAddress1sBNKAmount).toString(), "wrong user BNK tokens count");
            })
    });

    it("15.15 " + "Buy tokens wait few rounds and try to claim reward", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress1sBNKAmount = BigNumber('5000008000001');
        var contributorAmountBeforeWithdraw;
        var claimedReward = BigNumber(0);

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.blocksPerRound()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
                assert.isOk(values[1].toFixed(0) > 0, "blocksPerRound should be greater when 0");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");
                return contractHelper.mineNextBlock(25*60);
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");
                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound.toString()).plus(BigNumber(1)));// finish 0 - start 1
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");
                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*2).plus(BigNumber(1)));// finish 1,2- start 3
            })
            .then(function(value) {
                return Promise.all([
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function (value) {
                assert.isOk(value, "should be transaction");
                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound.toString()).plus(BigNumber(1)));// finish 3- start 4
            })
            .then(function (value) {
                return Promise.all([
                    contractInstance.setReward(0, web3.toWei(0, "ether")),
                    contractInstance.setReward(1, web3.toWei(0.41, "ether")),
                    contractInstance.setReward(2, web3.toWei(0.301, "ether")),
                    contractInstance.setReward(3, web3.toWei(0.1101, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(0.8211, "ether")})
                ])
            })
            .then(function (values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());
                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function (values) {
                return Promise.all([
                    Promise.resolve(values[0]),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function (values) {
                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");
                claimedReward = claimedReward.plus(BigNumber(values[0].toString()));

                return Promise.all([
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function (values) {
                assert.equal(values[0][2].toString(), claimedReward.toString(), "user marked claimed reward should be same as claimed");
                assert.equal(values[0][1].toString(), 4, "user last claimed reward till round should be 4");
                assert.equal(values[0][0].toString(), BigNumber(contributorAddress1sBNKAmount).mul(3).toString(), "wrong user BNK tokens count");
            })
    });

    it("15.16 " + "Buy tokens wait few rounds and try to claim reward", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress2 = accounts[7];
        var contributorAddress1sBNKAmount = BigNumber('532541');
        var contributorAddress2sBNKAmount = BigNumber('9000532743');
        var contributorAmountBeforeWithdraw;
        var claimedReward;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.blocksPerRound()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
                assert.isOk(values[1].toFixed(0) > 0, "blocksPerRound should be greater when 0");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*3).plus(BigNumber(2)));//finish 0,1,2 - start 3
            })
            .then(function (value) {
                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function (value) {
                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*4).plus(BigNumber(2)));// finish 3,4,5,6 - start 7
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, 0),
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.setReward(3, 0),
                    contractInstance.setReward(4, web3.toWei(1, "ether")),
                    contractInstance.setReward(5, web3.toWei(1, "ether")),
                    contractInstance.setReward(6, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(3, "ether")})
                ])
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(3, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");
                assert.isOk(values[4], "should be transaction");
                assert.isOk(values[5], "should be transaction");
                assert.isOk(values[6], "should be transaction");
                assert.isOk(values[7], "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })
            .then(function(values) {
                assert.equal(values[0].toString(), 0, "should be transaction");
                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function(values) {
                return Promise.all([
                    Promise.resolve(values[0]),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function (values) {
                assert.equal(BigNumber(web3.toWei(3, "ether")).minus(BigNumber(values[0].toString())).toString(), BigNumber(web3.eth.getBalance(contractAddress).toString()).toString(), "Contract ETH Balance is wrong");

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                claimedReward = BigNumber(values[0].toString());
                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");

                return Promise.all([
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function (values) {
                assert.equal(values[0][2], claimedReward.toString(), "user marked claimed reward should be same as claimed");
            })
    });

    it("15.17 " + "Buy tokens wait few rounds and try to claim reward, wait 5 rounds and tray to claim again", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress2 = accounts[7];
        var contributorAddress1sBNKAmount = BigNumber('1532541');
        var contributorAddress2sBNKAmount = BigNumber('999999999999');
        var contributorAmountBeforeWithdraw;
        var claimedReward;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply(),
                    contractInstance.blocksPerRound()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");
                assert.isOk(values[1].toFixed(0) > 0, "blocksPerRound should be greater when 0");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*3).plus(BigNumber(2)));// finish 0,1,2 - start 3
            })
            .then(function (value) {
                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function (value) {
                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*4).plus(BigNumber(2)));// finish 3,4,5,6 - start 7
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, 0),
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.setReward(3, 0),
                    contractInstance.setReward(4, web3.toWei(1, "ether")),
                    contractInstance.setReward(5, web3.toWei(1, "ether")),
                    contractInstance.setReward(6, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(3, "ether")})
                ])
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(3, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");
                assert.isOk(values[4], "should be transaction");
                assert.isOk(values[5], "should be transaction");
                assert.isOk(values[6], "should be transaction");
                assert.isOk(values[7], "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })

            .then(function(values) {
                assert.equal(values[0].toString(), 0, "should be transaction");
                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1}),
                    contractInstance.claimReward({from: contributorAddress1})
                ])
            })
            .then(function (values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toString(), BigNumber(web3.toWei(3, "ether")).minus(BigNumber(values[0].toString())).toString(), "Contract ETH Balance is wrong");

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                claimedReward = BigNumber(values[0].toString());
                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");

                return Promise.all([
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function (values) {
                assert.equal(values[0][2], claimedReward.toString(), "user marked claimed reward should be same as claimed");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(1)));// finish 7,8,9,10,11 - start 12
            })
            .then(function(tx) {
                return Promise.all([
                    contractInstance.setReward(7, web3.toWei(1, "ether")),
                    contractInstance.setReward(8, web3.toWei(1, "ether")),
                    contractInstance.setReward(9, web3.toWei(1, "ether")),
                    contractInstance.setReward(10, web3.toWei(0.554, "ether")),
                    contractInstance.setReward(11, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(4.554, "ether")})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");
                assert.isOk(values[4], "should be transaction");
                assert.isOk(values[5], "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })
            .then(function(values) {
                assert.equal(values[0].toString(), 0, "should be transaction");
                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1})
                ])
            })
            .then(function(values) {
                return Promise.all([
                    Promise.resolve(values[0]),
                    contractInstance.claimReward({from: contributorAddress1}),
                    contractInstance.reward(7),
                    contractInstance.reward(10)
                ])
            })
            .then(function (values) {
                var expectedreward = BigNumber(4).mul(BigNumber(contributorAddress1sBNKAmount)).mul(BigNumber(values[2][2].toString()))
                    .plus( BigNumber(contributorAddress1sBNKAmount).mul(BigNumber(values[3][2].toString())) );

                assert.equal(expectedreward.toString(), values[0].toString(), "claimed reward should be as expecting");

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                claimedReward = claimedReward.add(BigNumber(values[0].toString()));
                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");

                return Promise.all([
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function (values) {
                assert.equal(values[0][2].toString(), claimedReward.toFixed(0), "user marked claimed reward should be same as claimed");
            })
    });

    it("15.18 " + "Try to claim reward then first round is configured", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress1sBNKAmount = BigNumber('532541');
        var contributorAmountBeforeWithdraw;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                return contractHelper.mineNextBlock(25*60);
            })
            .then(function (value) {

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, web3.toWei(1, "ether")),
                    contractInstance.setReward(1, web3.toWei(0, "ether")),
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.setReward(3, web3.toWei(0, "ether")),
                    contractInstance.setReward(4, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(3, "ether")})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                assert.isOk(values[2], "should be transaction");
                assert.isOk(values[3], "should be transaction");
                assert.isOk(values[4], "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(3, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");
                assert.equal(values[0], 0, "Incorrect balance");

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1}),
                    contractInstance.claimReward({from: contributorAddress1}),
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .catch(function(error) {
                console.log(error);
                assert.isOk(false, 'Unexpected exception');
            })
    });

    it("15.19 " + "Claim reward round by round", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress1sBNKAmount = BigNumber('532541');
        var contributorAmountBeforeWithdraw;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                return contractHelper.mineNextBlock(25*60);
            })
            .then(function (value) {

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound).plus(BigNumber(1)));// finish 0 - start 1
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(1, "ether")})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf(contractOwnerAddress) //contract owner BNK balance
                ])
            })
            .then(function(values) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(1, "ether").toString()).toFixed(0), "Contract ETH Balance is wrong");
                assert.equal(values[0], 0, "Incorrect balance");

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1}),
                    contractInstance.claimReward({from: contributorAddress1}),
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function (values) {
               // assert.equal(values[0].toFixed(0), web3.toWei(1, "ether").toString(), "Incorrect calculated reward amount");

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");

                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), BigNumber(web3.toWei(1, "ether").toString()).minus(BigNumber(values[0].toString())).toFixed(0), "Contract ETH Balance is wrong");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound).toFixed(0));// finish 1 - start 2
            })
            .then(function(tx) {

                return Promise.all([
                    contractInstance.setReward(1, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(1, "ether")})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1}),
                    contractInstance.claimReward({from: contributorAddress1}),
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function (values) {

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound));// finish 2 - start 3
            })
            .then(function(tx) {

                return Promise.all([
                    contractInstance.setReward(2, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(1, "ether")})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: contributorAddress1}),
                    contractInstance.claimReward({from: contributorAddress1}),
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function (values) {

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                assert.equal(expectationAmountInWei.toString(), amountAfterWithdraw.toString(), "balance after withdraw should be the same");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound));// finish 3 - start 4
            })
            .then(function(tx) {

                return Promise.all([
                    contractInstance.setReward(3, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(1, "ether")})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.calculateClaimableReward(contributorAddress1, {from: accounts[12]}),
                    contractInstance.claimReward({from: contributorAddress1}),
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function (values) {

                var transactionCostInWei = contractHelper.calculateTxPriceInWei(values[1]);
                var expectationAmountInWei = contributorAmountBeforeWithdraw.add(BigNumber(values[0].toString())).minus(BigNumber(transactionCostInWei.toString()));
                var amountAfterWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                assert.equal(expectationAmountInWei.toFixed(0), amountAfterWithdraw.toFixed(0), "balance after withdraw should be the same");
            })
            .catch(function(error) {
                console.log(error);
                assert.isOk(false, 'Unexpected exception');
            })
    });

    it("15.20.1 " + "Claim reward till round (claimTillRound > currentRound)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress2 = accounts[7];
        var contributorAddress1sBNKAmount = BigNumber('5000000');
        var contributorAddress2sBNKAmount = BigNumber('5000000');
        var customBlocksPerRound = 12;
        var customStartingRoundNumber = 10;

        return BankeraToken.new(customBlocksPerRound, customStartingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress}),
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                return contractHelper.mineNextBlock(25*60);
            })
            .then(function (value) {

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound).plus(BigNumber(1)));// finish 10 - start 11
            })
            .then(function (value) {

                return contractInstance.createRounds(2);
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(10, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(1, "ether")})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return Promise.all([
                    contractInstance.claimRewardTillRound(20, {from: contributorAddress1})
                ])
            })
            .then(function(values) {
                assert.isOk(false, 'Unexpected exception');
                console.log("Incorrect working flow");
            })
            .catch(function(error) {
                assertJump(error);
            })
    });

    it("15.20.2 " + "Claim reward till round (currentRound < 1)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress2 = accounts[7];
        var contributorAddress1sBNKAmount = BigNumber('5000000');
        var contributorAddress2sBNKAmount = BigNumber('5000000');
        var customBlocksPerRound = 12;

        return BankeraToken.new(customBlocksPerRound, startingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress}),
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                return contractHelper.mineNextBlock(25*60);
            })
            .then(function (value) {

                return contractInstance.createRounds(2);
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(10, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(1, "ether")})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return Promise.all([
                    contractInstance.claimRewardTillRound(20, {from: contributorAddress1})
                ])
            })
            .then(function(values) {
                assert.isOk(false, 'Unexpected exception');
                console.log("Incorrect working flow");
            })
            .catch(function(error) {
                assertJump(error);
            })
    });

    it("15.20.3 " + "Claim reward till round (user don't have balance)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress2 = accounts[7];
        var contributorAddress1sBNKAmount = BigNumber('5000000');
        var contributorAddress2sBNKAmount = BigNumber('5000000');
        var customBlocksPerRound = 12;
        var customStartingRoundNumber = 10;

        return BankeraToken.new(customBlocksPerRound, customStartingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress}),
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                return contractHelper.mineNextBlock(25*60);
            })
            .then(function (value) {

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound).plus(BigNumber(1)));// finish 10 - start 11
            })
            .then(function (value) {

                return contractInstance.createRounds(2);
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(10, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(1, "ether")})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return Promise.all([
                    contractInstance.claimRewardTillRound(20, {from: accounts[12]})
                ])
            })
            .then(function(values) {
                assert.isOk(false, 'Unexpected exception');
                console.log("Incorrect working flow");
            })
            .catch(function(error) {
                assertJump(error);
            })
    });

    it("15.20.4 " + "Claim reward till round (claimTillRound < userLastClaimedRewardRound)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[8];
        var contributorAddress2 = accounts[7];
        var contributorAddress1sBNKAmount = BigNumber('5000000');
        var contributorAddress2sBNKAmount = BigNumber('5000000');
        var contributorAmountBeforeWithdraw;
        var customBlocksPerRound = 12;
        var customStartingRoundNumber = 10;

        return BankeraToken.new(customBlocksPerRound, customStartingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount.toFixed(0), {from: contractOwnerAddress}),
                    contractInstance.issueTokens(contributorAddress2, contributorAddress2sBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");
                return contractHelper.mineNextBlock(25*60);
            })
            .then(function (value) {

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound).plus(BigNumber(1)));// finish 10 - start 11
            })
            .then(function (value) {

                return contractInstance.createRounds(2);
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(10, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(1, "ether")})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                contributorAmountBeforeWithdraw = BigNumber(web3.eth.getBalance(contributorAddress1).toString());

                return Promise.all([
                    contractInstance.claimRewardTillRound(11, {from: contributorAddress1}),
                    contractInstance.accountBalances(contributorAddress1)
                ])
            })
            .then(function(values) {
                assert.equal(11, values[1][1], "Incorrect user claimedRewardTillRound value");
            })
            .then(function(values) {

                return Promise.all([
                    contractInstance.claimRewardTillRound(8, {from: contributorAddress2})
                ])
            })
            .then(function(values) {
                assert.isOk(false, 'Unexpected exception');
                console.log("Incorrect working flow");
            })
            .catch(function(error) {
                assertJump(error);
            })
    });

    it("15.21.1 " + "Claim reward till round (contract owner)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddresssBNKAmount = BigNumber('5000000');
        var customBlocksPerRound = 12;
        var customStartingRoundNumber = 10;

        return BankeraToken.new(customBlocksPerRound, customStartingRoundNumber)
            .then(function (instance) {
                contractInstance = instance;
                contractOwnerAddress = accounts[0];
                contractAddress = instance.address;
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract Balance should be zero");
                return Promise.all([
                    contractInstance.totalSupply()
                ])
            })
            .then(function (values) {
                assert.equal(values[0].toFixed(0), totalSupplyInsBNK.toFixed(0), "Incorrect totalSupply");

                return Promise.all([
                    //buy tokens for user
                    contractInstance.issueTokens(contractOwnerAddress, contributorAddresssBNKAmount.toFixed(0), {from: contractOwnerAddress})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                return contractHelper.mineNextBlock(25*60);
            })
            .then(function (value) {

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound).plus(BigNumber(1)));// finish 10 - start 11
            })
            .then(function (value) {

                return contractInstance.createRounds(2);
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(10, web3.toWei(1, "ether")),
                    contractInstance.sendTransaction({value: web3.toWei(1, "ether")})
                ])
            })
            .then(function(values) {
                assert.isOk(values[0], "should be transaction");
                assert.isOk(values[1], "should be transaction");

                return Promise.all([
                    contractInstance.claimRewardTillRound(11, {from: contractOwnerAddress}),
                    contractInstance.accountBalances(contractOwnerAddress)
                ])
            })
            .then(function(values) {
                assert.equal(11, values[1][1], "Incorrect user claimedRewardTillRound value");
            })
            .catch(function(error) {
                console.log(error);
                assert.isOk(false, 'Unexpected exception');
            })
    });
});