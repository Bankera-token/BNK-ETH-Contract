var BigNumber = require('decimal.js');
var self = module.exports = {
//helper functions

    mineNewBlocks: function(newBlocks, debug){
        if(debug){
            console.log("Promise to mine :" + newBlocks);
        }
        if (newBlocks <= 0) {
            return new Promise(function(resolve, reject) {
                if(debug) {
                    console.log("After increase block number: " + web3.eth.blockNumber);
                }
                return resolve("Promise " + newBlocks + " resolved");
            });
        }

        return new Promise(function(resolve, reject) {
            var work = self.mineNewBlock();
            work.then(function() {
                var p = self.mineNewBlocks(newBlocks - 1, debug);
                p.then(function (result) {
                    if(debug){
                        console.log(result);
                    }
                    return resolve("Promise " + newBlocks + " resolved");
                });
            });
        })
    },

    mineNextBlock: function(time){
        return self.setNextBlockCurrentTime(Number(time.toString()))
            .then(function() {
                return self.mineNewBlock();
            }).then(function(tx) {
                return tx;
            });
    },

    mineNewBlock: function() {

        return new Promise(function(resolve, reject) {
            web3.currentProvider.sendAsync({
                jsonrpc: "2.0",
                method: "evm_mine",
                id: new Date().getTime()
            }, function(err, result) {
                // this is your callback
                if(err){
                    return reject(err)
                }
                return resolve(result)
            });
        })
    },

    setNextBlockCurrentTime: function(time) {
        return new Promise(function (resolve, reject){
            web3.currentProvider.sendAsync({
                jsonrpc: "2.0",
                method: "evm_increaseTime",
                params: [time], // 86400 is num seconds in day
                id: new Date().getTime()
            }, function (err, result) {
                if(err){
                    return reject(err)
                }
                return resolve(result)
            });
        })
    },

    calculateTxPriceInWei: function(tx, debug){
        var tx2 = web3.eth.getTransaction(tx.receipt.transactionHash);
        var transactionCostInWei = Number(tx.receipt.gasUsed) * tx2.gasPrice.toNumber();
        if(debug){
            console.log("\t" + tx.receipt.transactionHash + " transaction cost : " + web3.fromWei(transactionCostInWei, "ether") + " ETH");
        }
        return transactionCostInWei;
    },

    watchEventsInfo: function(instance) {
        var event = instance.allEvents();
        event.watch(function (err, response) {
            console.log("\t" + response.event + " Event info:");
            if(response.event === "LogInfo"){
                console.log("\t\t" + "info: " + response.args.info);
            } else if(response.event === "LogInfo3"){
                console.log("\t\t" + "info: " + response.args.info + " adr: " + response.args.adr);
            } else if(response.event === "LogInfo2"){
                console.log("\t\t" + "info: " + response.args.info + " amount: " + response.args.amount);
            } else {
                console.log(response)
            }
        });
    },

    calculateReward: function (reward, issuedTokensInRound) {
        var resultInWei = BigNumber(0);

        if(reward.length === issuedTokensInRound.length){
            for (var i = 0; i < reward.length; i++) {
                resultInWei = resultInWei.plus( BigNumber(issuedTokensInRound[i]).mul(BigNumber(reward[i][2].toString())) );
            }
        } else {
            console.log("arrays length is not the same");
        }
        return resultInWei;
    },

    promiseAll: function(arrayOfFunctions, index, result, debug){
        result = (result !== undefined) ? result : [];
        if (index >= arrayOfFunctions.length) {
            return new Promise(function(resolve, reject) {
                return resolve(result);
            });
        }

        return new Promise(function(resolve, reject) {
            index = (index !== undefined) ? index : 0;

            return Promise.resolve(arrayOfFunctions[index])
                .then(function(r) {
                    result.push(r);
                    var p = self.promiseAll(arrayOfFunctions, index + 1, result, debug);
                    p.then(function (res) {
                        if(debug){
                            console.log(index + " - ", result[index]);
                        }
                        return resolve(result);
                    });
            });
        })
    }

};