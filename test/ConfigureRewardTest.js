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

contract('Configure reward tests', function (accounts) {

    beforeEach(function(done) {
        this.timeout(3000); // A very long environment setup.
        setTimeout(done, 2500);
    });

    var blocksPerRound = new BigNumber(45);
    var startingRoundNumber = BigNumber(0);

    it("14.1 " + "Configure reward round", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[2];
        var contributorAddress1sBNKAmount = 15478545;

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
                return contractInstance.issueTokens(contributorAddress1, contributorAddress1sBNKAmount, {from: contractOwnerAddress})
            }).then(function (tx) {
                assert.isOk(tx, "should be transaction");

                return contractHelper.mineNextBlock(17*60);
            }).then(function(tx) {
                assert.isOk(tx, "should be transaction");

                return Promise.all([
                    contractInstance.balanceOf.call(contractOwnerAddress) //contract owner BNK balance
                ])
            }).then(function(values) {
                assert.equal(values[0].toFixed(0), 0, "contract owner BNK balance should be zero");

                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1)));
            }).then(function(result) {
                return contractInstance.setReward(0, web3.toWei(1, "ether"))
            }).then(function(result) {
                return contractInstance.setReward(1, web3.toWei(1, "ether"))
            }).catch(function(tx) {
                assertJump(tx);
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");
                return contractInstance.setReward(10000, web3.toWei(1, "ether"))
            }).catch(function(tx) {
                assertJump(tx);
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");
                return contractInstance.setReward(0, web3.toWei(1, "ether"))
            }).catch(function(tx) {
                assertJump(tx);
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");
                return contractInstance.setReward(0, web3.toWei(0, "ether"))
            }).catch(function(tx) {
                assertJump(tx);
                return contractHelper.mineNewBlocks(blocksPerRound.plus(BigNumber(1)));
            }).then(function(result) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");
                return contractInstance.setReward(1, web3.toWei(1, "ether"), {from: contributorAddress1})
            }).catch(function(tx) {
                assertJump(tx);
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");
                return contractInstance.setReward(1, web3.toWei(1, "ether"))
            }).then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");
                assert.isOk(tx, "should be transaction");
            })
    });

    it("14.2 " + "Configure reward round (existence with min amount)", function () {
        var contractInstance;
        var contractOwnerAddress;
        var contractAddress;
        var contributorAddress1 = accounts[2];
        var contributorAddress1sBNKAmount = 15478545;

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
            .then(function (value) {
                assert.isOk(value, "should be transaction");

                return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));
            })
            .then(function(tx) {
                assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                return Promise.all([
                    contractInstance.setReward(0, 0),
                    contractInstance.setReward(1, 1),
                    contractInstance.setReward(2, 2),
                    contractInstance.setReward(3, 3),
                    contractInstance.setReward(4, 0)
                ])
            })
            .then(function(values) {
                return Promise.all([
                    contractInstance.reward(0),
                    contractInstance.reward(1),
                    contractInstance.reward(2),
                    contractInstance.reward(3),
                    contractInstance.reward(4)
                ]);
            })
            .then(function(values) {
                assert.equal(values[0][3], true, "round should be configured");
                assert.equal(values[1][3], true, "round should be configured");
                assert.equal(values[2][3], true, "round should be configured");
                assert.equal(values[3][3], true, "round should be configured");
                assert.equal(values[4][3], true, "round should be configured");
            })
    });

    it("14.3 " + "Configure reward round (existence with big amount)", function () {
          var contractInstance;
          var contractOwnerAddress;
          var contractAddress;
          var contributorAddress1 = accounts[2];
          var contributorAddress1sBNKAmount = 15478545;

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
              .then(function (value) {
                  assert.isOk(value, "should be transaction");

                  return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*4).plus(BigNumber(7)));//finish 0,1,2,3 - start 4
              })
              .then(function(tx) {
                  assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

                  return Promise.all([
                      contractInstance.setReward(0, web3.toWei(1, "ether")),
                      contractInstance.setReward(1, web3.toWei(web3.toWei(web3.toWei(1, "ether"), "ether"), "ether")),
                      contractInstance.setReward(2, web3.toWei(1, "ether")),
                      contractInstance.setReward(3, web3.toWei(web3.toWei(1, "ether"), "ether"))
                  ])
              })
              .then(function(values) {
                  return Promise.all([
                      contractInstance.reward(0),
                      contractInstance.reward(1),
                      contractInstance.reward(2),
                      contractInstance.reward(3)
                  ]);
              })
              .then(function(values) {
                  assert.equal(values[0][3], true, "round should be configured");
                  assert.equal(values[1][3], true, "round should be configured");
                  assert.equal(values[2][3], true, "round should be configured");
                  assert.equal(values[3][3], true, "round should be configured");
              })
      });

    it("14.4 " + "Configure reward round (existence, not consistently)", function () {
      var contractInstance;
      var contractOwnerAddress;
      var contractAddress;
      var contributorAddress1 = accounts[2];
      var contributorAddress1sBNKAmount = 15478545;

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
          .then(function (value) {
              assert.isOk(value, "should be transaction");
              return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
          })
          .then(function(tx) {
              assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

              return Promise.all([
                  contractInstance.setReward(4, 20),
                  contractInstance.setReward(1, web3.toWei(web3.toWei(web3.toWei(1, "ether"), "ether"), "ether")),
                  contractInstance.setReward(3, web3.toWei(1, "ether")),
                  contractInstance.setReward(2, web3.toWei(web3.toWei(1, "ether"), "ether")),
                  contractInstance.setReward(0, 0)
              ])
          })
          .then(function(values) {
              return Promise.all([
                  contractInstance.reward(0),
                  contractInstance.reward(1),
                  contractInstance.reward(2),
                  contractInstance.reward(3),
                  contractInstance.reward(4)
              ]);
          })
          .then(function(values) {
              assert.equal(values[0][3], true, "round should be configured");
              assert.equal(values[1][3], true, "round should be configured");
              assert.equal(values[2][3], true, "round should be configured");
              assert.equal(values[3][3], true, "round should be configured");
              assert.equal(values[4][3], true, "round should be configured");
          })
    });

    it("14.5 " + "Configure reward round (existence, consistently)", function () {
      var contractInstance;
      var contractOwnerAddress;
      var contractAddress;
      var contributorAddress1 = accounts[2];
      var contributorAddress1sBNKAmount = 15478545;

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
          .then(function (value) {
              assert.isOk(value, "should be transaction");

              return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
          })
          .then(function(tx) {
              assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

              return Promise.all([
                  contractInstance.setReward(4, 0),
                  contractInstance.setReward(3, web3.toWei(web3.toWei(web3.toWei(1, "ether"), "ether"), "ether")),
                  contractInstance.setReward(2, web3.toWei(1, "ether")),
                  contractInstance.setReward(1, web3.toWei(web3.toWei(1, "ether"), "ether")),
                  contractInstance.setReward(0, 252)
              ])
          })
          .then(function(values) {
              return Promise.all([
                  contractInstance.reward(0),
                  contractInstance.reward(1),
                  contractInstance.reward(2),
                  contractInstance.reward(3),
                  contractInstance.reward(4)
              ]);
          })
          .then(function(values) {
              assert.equal(values[0][3], true, "round should be configured");
              assert.equal(values[1][3], true, "round should be configured");
              assert.equal(values[2][3], true, "round should be configured");
              assert.equal(values[3][3], true, "round should be configured");
              assert.equal(values[4][3], true, "round should be configured");
          })
    });

    it("14.6 " + "Configure configured reward round (with min and big amounts)", function () {
      var contractInstance;
      var contractOwnerAddress;
      var contractAddress;
      var contributorAddress1 = accounts[2];
      var contributorAddress1sBNKAmount = 15478545;

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
          .then(function(tx) {
              assert.isOk(tx, "should be transaction");

              return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*5).plus(BigNumber(7)));// finish 0,1,2,3,4 - start 5
          })
          .then(function(tx) {
              assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

              return Promise.all([
                  contractInstance.setReward(4, 0),
                  contractInstance.setReward(3, web3.toWei(web3.toWei(web3.toWei(1, "ether"), "ether"), "ether")),
                  contractInstance.setReward(2, web3.toWei(1, "ether")),
                  contractInstance.setReward(1, web3.toWei(web3.toWei(1, "ether"), "ether")),
                  contractInstance.setReward(0, 252)
              ])
          })
          .then(function(values) {
              return Promise.all([
                  contractInstance.reward(0),
                  contractInstance.reward(1),
                  contractInstance.reward(2),
                  contractInstance.reward(3),
                  contractInstance.reward(4)
              ]);
          })
          .then(function(values) {
              assert.equal(values[0][3], true, "round should be configured");
              assert.equal(values[1][3], true, "round should be configured");
              assert.equal(values[2][3], true, "round should be configured");
              assert.equal(values[3][3], true, "round should be configured");
              assert.equal(values[4][3], true, "round should be configured");

              return contractInstance.setReward(2, 0)
          })
          .catch(function(tx) {
              assertJump(tx);
              assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");
              //configured round with big amount
              return contractInstance.setReward(2, web3.toWei(web3.toWei(web3.toWei(1, "ether"), "ether"), "ether"))
          })
          .catch(function(tx) {
              assertJump(tx);
          })
    });

    it("14.7 " + "Configure not existed reward round (with min and big amounts)", function () {
      var contractInstance;
      var contractOwnerAddress;
      var contractAddress;
      var contributorAddress1 = accounts[2];
      var contributorAddress1sBNKAmount = 15478545;

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
          .then(function(tx) {
              assert.isOk(tx, "should be transaction");

              return contractHelper.mineNewBlocks(BigNumber(blocksPerRound*3).plus(BigNumber(7)));//finish 0,1,2,3,4 - start 5
          })
          .then(function(tx) {
              assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");

              return contractInstance.setReward(40, 0)
          })
          .catch(function(tx) {
              assertJump(tx);
              assert.equal(BigNumber(web3.eth.getBalance(contractAddress).toString()).toFixed(0), 0, "Contract ETH Balance is wrong");
              //configured round with big amount
              return contractInstance.setReward(20, web3.toWei(web3.toWei(web3.toWei(9, "ether"), "ether"), "ether"))
          })
          .catch(function(tx) {
              assertJump(tx);
          })
    });

});