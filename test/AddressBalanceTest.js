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

contract('Address Balance tests', function (accounts) {

    beforeEach(function(done) {
        this.timeout(3000); // A very long environment setup.
        setTimeout(done, 2500);
    });

    var blocksPerRound = new BigNumber(1);
    var startingRoundNumber = BigNumber(0);

    it("16.1 " + "Get Balance Modification Rounds after 520 rounds", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[2];
        var contributorAddress1sBNKAmount = 100;
        var weeksPerYear = 52;
        var fullYears = 10;

        return BankeraToken.new(blocksPerRound, startingRoundNumber)
          .then(function (instance) {
              contractInstance = instance;
              contractOwnerAddress = accounts[0];
              contractAddress = instance.address;
              assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

              return contractHelper.mineNextBlock(5*60);
          }).then(function (tx) {
              assert.isOk(tx, "should be transaction");

              //buy tokens for user
              return Promise.all([
                  contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress})
              ])
          })
          .then(function (values) {
              assert.isOk(values[0], "should be transaction");

              return contractHelper.mineNextBlock(17*60);
          })
          .then(function (tx) {
              assert.isOk(tx, "should be transaction");

              //buy tokens for user
              return Promise.all([
                  contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress})
              ])
          })
          .then(function(tx) {
              assert.isOk(tx, "should be transaction");

              var arr = [];
              for(var i = 0; i < weeksPerYear*fullYears; i++){
                  arr.push(contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress}));
              }
              return Promise.all(arr);
          })
          .then(function(tx) {
              //assert.isOk(tx, "should be transaction");
              return contractInstance.getBalanceModificationRounds(contributorAddress1)
          })
          .then(function(tx) {
              //console.log("length: ", tx.length);
              assert.equal(weeksPerYear*fullYears+2, tx.length, "Expected array length is incorrect");
          })
          .catch(function(tx) {
              console.log(tx);
          })
    });

});