const assertJump = require('./helpers/assertJump');
var BankeraToken = artifacts.require("./BankeraToken.sol");
var BigNumber = require('decimal.js');
BigNumber.config({
    precision: 30,
    rounding: 3,
    toExpNeg: 0,
    toExpPos: 30
});

contract('Approve BankeraToken tests', function (accounts) {

    var blocksPerRound = 15;
    var startingRoundNumber = BigNumber(0);
    var recipient = accounts[13];
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    describe('approve', function () {

        describe('when the spender is not the zero address', function () {
            const spender = recipient;
            var bankeraTokenInstance;
            var contractOwner;

            describe('when the sender has enough balance', function () {
                const amount = 100;

                it('emits an approval event', function () {

                    return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                        bankeraTokenInstance = instance;
                        contractOwner = accounts[0];
                        return Promise.all([
                            bankeraTokenInstance.approve(spender, amount, { from: contractOwner })
                        ]).then(function(tx) {
                            var logs = tx[0].logs;

                            assert.equal(logs.length, 1);
                            assert.equal(logs[0].event, 'Approval');
                            assert.equal(logs[0].args._owner, contractOwner);
                            assert.equal(logs[0].args._spender, spender);
                            assert(logs[0].args._value.eq(amount));
                        })
                    });
                });

                describe('when there was no approved amount before', function () {
                    it('approves the requested amount', function () {

                        return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                            bankeraTokenInstance = instance;
                            contractOwner = accounts[0];
                            return Promise.all([
                                bankeraTokenInstance.approve(spender, amount, { from: contractOwner })
                            ]).then(function(values) {
                                return Promise.all([
                                    bankeraTokenInstance.allowance(contractOwner, spender)
                                ])
                            }).then(function(allowance) {
                                assert.equal(allowance, amount);
                            })
                        })
                    });
                });

                describe('when the spender had an approved amount', function () {
                    beforeEach(function () {
                        return Promise.all([bankeraTokenInstance.approve(spender, 1, { from: contractOwner })]);
                    });

                    it('approves the requested amount and replaces the previous one', function () {
                        return Promise.all([
                            bankeraTokenInstance.approve(spender, amount, { from: contractOwner })
                        ]).then(function(values) {
                            return Promise.all([
                                bankeraTokenInstance.allowance(contractOwner, spender)
                            ])
                        }).then(function(allowance) {
                            assert.equal(allowance, amount);
                        })
                    });
                });
            });

            describe('when the sender does not have enough balance', function () {
                const amount = 101;

                it('emits an approval event', function () {

                    return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                        bankeraTokenInstance = instance;
                        contractOwner = accounts[0];
                        return Promise.all([
                            bankeraTokenInstance.approve(spender, amount, { from: contractOwner })
                        ]).then(function(tx) {
                            var logs = tx[0].logs;

                            assert.equal(logs.length, 1);
                            assert.equal(logs[0].event, 'Approval');
                            assert.equal(logs[0].args._owner, contractOwner);
                            assert.equal(logs[0].args._spender, spender);
                            assert(logs[0].args._value.eq(amount));
                        })
                    });
                });

                describe('when there was no approved amount before', function () {
                    it('approves the requested amount', function () {

                        return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                            bankeraTokenInstance = instance;
                            contractOwner = accounts[0];
                            return Promise.all([
                                bankeraTokenInstance.approve(spender, amount, { from: contractOwner })
                            ]).then(function(values) {
                                return Promise.all([
                                    bankeraTokenInstance.allowance(contractOwner, spender)
                                ])
                            }).then(function(allowance) {
                                assert.equal(allowance, amount);
                            })
                        })
                    });
                });

                describe('when the spender had an approved amount', function () {
                    beforeEach(function () {
                        return Promise.all([bankeraTokenInstance.approve(spender, 1, { from: contractOwner })]);
                    });

                    it('approves the requested amount and replaces the previous one', function () {

                        return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                            bankeraTokenInstance = instance;
                            contractOwner = accounts[0];
                            return Promise.all([
                                bankeraTokenInstance.approve(spender, amount, { from: contractOwner })
                            ]).then(function(values) {
                                return Promise.all([
                                    bankeraTokenInstance.allowance(contractOwner, spender)
                                ])
                            }).then(function(allowance) {
                                assert.equal(allowance, amount);
                            })
                        })
                    });
                });
            });
        });

        describe('when the spender is the zero address', function () {
            const amount = 100;
            const spender = ZERO_ADDRESS;

            it('approves the requested amount', function () {

                return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                    bankeraTokenInstance = instance;
                    contractOwner = accounts[0];
                    return Promise.all([
                        bankeraTokenInstance.approve(spender, amount, { from: contractOwner })
                    ]).then(function(values) {
                        return Promise.all([
                            bankeraTokenInstance.allowance(contractOwner, spender)
                        ])
                    }).then(function(allowance) {
                        assert.equal(allowance, amount);
                    })
                })
            });

            it('emits an approval event', function () {

                return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                    bankeraTokenInstance = instance;
                    contractOwner = accounts[0];
                    return Promise.all([
                        bankeraTokenInstance.approve(spender, amount, { from: contractOwner })
                    ]).then(function(tx) {
                        var logs = tx[0].logs;

                        assert.equal(logs.length, 1);
                        assert.equal(logs[0].event, 'Approval');
                        assert.equal(logs[0].args._owner, contractOwner);
                        assert.equal(logs[0].args._spender, spender);
                        assert(logs[0].args._value.eq(amount));
                    })
                });
            });
        });
    });

    describe('Increase approval function', function () {

        var bankeraTokenInstance;
        var contractOwner;
        var anotherAccount = accounts[12];
        const amount = 100;

        describe('when the spender is not the zero address', function () {
            const spender = anotherAccount;

            describe('when the sender has enough balance', function () {

                it('emits an approval event', function () {
                    return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                        bankeraTokenInstance = instance;
                        contractOwner = accounts[0];
                        return Promise.all([
                            bankeraTokenInstance.increaseApproval(spender, amount, { from: contractOwner })
                        ]).then(function(tx) {
                            var logs = tx[0].logs;

                            assert.equal(logs.length, 1);
                            assert.equal(logs[0].event, 'Approval');
                            assert.equal(logs[0].args._owner, contractOwner);
                            assert.equal(logs[0].args._spender, spender);
                            assert(logs[0].args._value.eq(amount));
                        })
                    });
                });

                describe('when there was no approved amount before', function () {

                    it('approves the requested amount', function () {
                        return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                            bankeraTokenInstance = instance;
                            contractOwner = accounts[0];
                            return Promise.all([
                                bankeraTokenInstance.increaseApproval(spender, amount, { from: contractOwner })
                            ]).then(function(values) {
                                return Promise.all([
                                    bankeraTokenInstance.allowance(contractOwner, spender)
                                ])
                            }).then(function(allowance) {
                                assert.equal(allowance, amount);
                            })
                        })
                    });
                });

                describe('when the spender had an approved amount', function () {
                    beforeEach(function () {
                        return Promise.all([bankeraTokenInstance.approve(spender, 1, { from: contractOwner })]);
                    });

                    it('increases the spender allowance adding the requested amount', function () {
                        return Promise.all([
                            bankeraTokenInstance.increaseApproval(spender, amount, { from: contractOwner })
                        ]).then(function(values) {
                            return Promise.all([
                                bankeraTokenInstance.allowance(contractOwner, spender)
                            ])
                        }).then(function(allowance) {
                            assert.equal(allowance, amount + 1);
                        })
                    });
                });
            });

            describe('when the sender does not have enough balance', function () {
                const amount = 101;

                it('emits an approval event', function () {
                    return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                        bankeraTokenInstance = instance;
                        contractOwner = accounts[0];
                        return Promise.all([
                            bankeraTokenInstance.increaseApproval(spender, amount, { from: contractOwner })
                        ]).then(function(tx) {
                            var logs = tx[0].logs;

                            assert.equal(logs.length, 1);
                            assert.equal(logs[0].event, 'Approval');
                            assert.equal(logs[0].args._owner, contractOwner);
                            assert.equal(logs[0].args._spender, spender);
                            assert(logs[0].args._value.eq(amount));
                        })
                    });
                });

                describe('when there was no approved amount before', function () {
                    it('approves the requested amount', function () {
                        return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                            bankeraTokenInstance = instance;
                            contractOwner = accounts[0];
                            return Promise.all([
                                bankeraTokenInstance.increaseApproval(spender, amount, { from: contractOwner })
                            ]).then(function(values) {
                                return Promise.all([
                                    bankeraTokenInstance.allowance(contractOwner, spender)
                                ])
                            }).then(function(allowance) {
                                assert.equal(allowance, amount);
                            })
                        })
                    });
                });

                describe('when the spender had an approved amount', function () {
                    beforeEach( function () {
                        bankeraTokenInstance.approve(spender, 1, { from: contractOwner });
                    });

                    it('increases the spender allowance adding the requested amount', function () {
                        return Promise.all([
                            bankeraTokenInstance.increaseApproval(spender, amount, { from: contractOwner })
                        ]).then(function(tx) {
                            return Promise.all([
                                bankeraTokenInstance.allowance(contractOwner, spender)
                            ])
                        }).then(function(allowance) {
                            assert.equal(allowance, amount + 1);
                        })
                    });
                });
            });
        });

        describe('when the spender is the zero address', function () {
            const spender = ZERO_ADDRESS;

            it('approves the requested amount', function () {
                return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                    bankeraTokenInstance = instance;
                    contractOwner = accounts[0];
                    return Promise.all([
                        bankeraTokenInstance.increaseApproval(spender, amount, { from: contractOwner })
                    ]).then(function(values) {
                        return Promise.all([
                            bankeraTokenInstance.allowance(contractOwner, spender)
                        ])
                    }).then(function(allowance) {
                        assert.equal(allowance, amount);
                    })
                })
            });

            it('emits an approval event', function () {
                return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                    bankeraTokenInstance = instance;
                    contractOwner = accounts[0];
                    return Promise.all([
                        bankeraTokenInstance.increaseApproval(spender, amount, { from: contractOwner })
                    ]).then(function(tx) {
                        var logs = tx[0].logs;

                        assert.equal(logs.length, 1);
                        assert.equal(logs[0].event, 'Approval');
                        assert.equal(logs[0].args._owner, contractOwner);
                        assert.equal(logs[0].args._spender, spender);
                        assert(logs[0].args._value.eq(amount));
                    })
                });
            });

        });
    });

    describe('Decrease approval function', function () {

        var recipient = accounts[13];
        var bankeraTokenInstance;
        var contractOwner;

        describe('when the spender is not the zero address', function () {
            const spender = recipient;

            describe('when the sender has enough balance', function () {
                const amount = 100;

                it('emits an approval event', function () {
                    return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                        bankeraTokenInstance = instance;
                        contractOwner = accounts[0];
                        return Promise.all([
                            bankeraTokenInstance.decreaseApproval(spender, amount, { from: contractOwner })
                        ]).then(function(tx) {
                            var logs = tx[0].logs;

                            assert.equal(logs.length, 1);
                            assert.equal(logs[0].event, 'Approval');
                            assert.equal(logs[0].args._owner, contractOwner);
                            assert.equal(logs[0].args._spender, spender);
                            assert(logs[0].args._value.eq(0));
                        })
                    });
                });

                describe('when there was no approved amount before', function () {

                    it('keeps the allowance to zero', function () {
                        return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                            bankeraTokenInstance = instance;
                            contractOwner = accounts[0];
                            return Promise.all([
                                bankeraTokenInstance.decreaseApproval(spender, amount, { from: contractOwner })
                            ]).then(function(values) {
                                return Promise.all([
                                    bankeraTokenInstance.allowance(contractOwner, spender)
                                ])
                            }).then(function(allowance) {
                                assert.equal(allowance, 0);
                            })
                        })
                    });
                });

                describe('when the spender had an approved amount', function () {

                    beforeEach(function () {
                        return Promise.all([bankeraTokenInstance.approve(spender, amount + 1, { from: contractOwner })]);
                    });

                    it('decreases the spender allowance subtracting the requested amount', function () {
                        return Promise.all([
                            bankeraTokenInstance.decreaseApproval(spender, amount, { from: contractOwner })
                        ]).then(function(values) {
                            return Promise.all([
                                bankeraTokenInstance.allowance(contractOwner, spender)
                            ])
                        }).then(function(allowance) {
                            assert.equal(allowance, 1);
                        })
                    });
                });
            });

            describe('when the sender does not have enough balance', function () {
                const amount = 101;

                it('emits an approval event', function () {
                    return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                        bankeraTokenInstance = instance;
                        contractOwner = accounts[0];
                        return Promise.all([
                            bankeraTokenInstance.decreaseApproval(spender, amount, { from: contractOwner })
                        ]).then(function(tx) {
                            var logs = tx[0].logs;

                            assert.equal(logs.length, 1);
                            assert.equal(logs[0].event, 'Approval');
                            assert.equal(logs[0].args._owner, contractOwner);
                            assert.equal(logs[0].args._spender, spender);
                            assert(logs[0].args._value.eq(0));
                        })
                    });
                });

                describe('when there was no approved amount before', function () {
                    it('keeps the allowance to zero', function () {
                        return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                            bankeraTokenInstance = instance;
                            contractOwner = accounts[0];
                            return Promise.all([
                                bankeraTokenInstance.decreaseApproval(spender, amount, { from: contractOwner })
                            ]).then(function(values) {
                                return Promise.all([
                                    bankeraTokenInstance.allowance(contractOwner, spender)
                                ])
                            }).then(function(allowance) {
                                assert.equal(allowance, 0);
                            })
                        })
                    });
                });

                describe('when the spender had an approved amount', function () {
                    beforeEach(function () {
                        return Promise.all([bankeraTokenInstance.approve(spender, amount + 1, { from: contractOwner })]);
                    });

                    it('decreases the spender allowance subtracting the requested amount', function () {
                        return Promise.all([
                            bankeraTokenInstance.decreaseApproval(spender, amount, { from: contractOwner })
                        ]).then(function(values) {
                            return Promise.all([
                                bankeraTokenInstance.allowance(contractOwner, spender)
                            ])
                        }).then(function(allowance) {
                            assert.equal(allowance, 1);
                        })
                    });
                });
            });
        });

        describe('when the spender is the zero address', function () {
            const amount = 100;
            const spender = ZERO_ADDRESS;

            it('decreases the requested amount', function () {
                return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                    bankeraTokenInstance = instance;
                    contractOwner = accounts[0];
                    return Promise.all([
                        bankeraTokenInstance.decreaseApproval(spender, amount, { from: contractOwner })
                    ]).then(function(values) {
                        return Promise.all([
                            bankeraTokenInstance.allowance(contractOwner, spender)
                        ])
                    }).then(function(allowance) {
                        assert.equal(allowance, 0);
                    })
                })
            });

            it('emits an approval event', function () {
                return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                    bankeraTokenInstance = instance;
                    contractOwner = accounts[0];
                    return Promise.all([
                        bankeraTokenInstance.decreaseApproval(spender, amount, { from: contractOwner })
                    ]).then(function(tx) {
                        var logs = tx[0].logs;

                        assert.equal(logs.length, 1);
                        assert.equal(logs[0].event, 'Approval');
                        assert.equal(logs[0].args._owner, contractOwner);
                        assert.equal(logs[0].args._spender, spender);
                        assert(logs[0].args._value.eq(0));
                    })
                });
            });
        });
    });

    describe('transfer from function', function () {
        const spender = recipient;
        const owner = accounts[11];
        var bankeraTokenInstance;
        var contractOwner;

        beforeEach(function () {
            return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                bankeraTokenInstance = instance;
                contractOwner = accounts[0];
            });
        });

        describe('when the recipient is not the zero address', function () {
            const to = accounts[15];

            describe('when the spender has enough approved balance', function () {
                beforeEach(function () {
                    return Promise.all([
                        bankeraTokenInstance.approve(spender, 100, { from: owner }),
                        bankeraTokenInstance.issueTokens(owner, 100, {from: contractOwner})
                    ]);
                });

                describe('when the owner has enough balance', function () {
                    const amount = 100;

                    it('transfers the requested amount', function () {
                        return Promise.all([
                            bankeraTokenInstance.transferFrom(owner, to, amount, { from: spender })
                        ]).then(function(tx) {
                            return Promise.all([
                                bankeraTokenInstance.balanceOf(owner),
                                bankeraTokenInstance.balanceOf(to)
                            ])
                        }).then(function(values) {
                            assert.equal(values[0], 0);
                            assert.equal(values[1], amount);
                        });
                    });

                    it('decreases the spender allowance', function () {

                        return Promise.all([
                            bankeraTokenInstance.transferFrom(owner, to, amount, { from: spender })
                        ]).then(function(values) {
                            return Promise.all([
                                bankeraTokenInstance.allowance(owner, spender)
                            ])
                        }).then(function(allowance) {
                            assert.equal(allowance, 0);
                        })
                    });

                    it('emits a transfer event', function () {
                        return Promise.all([
                            bankeraTokenInstance.transferFrom(owner, to, amount, { from: spender })
                        ]).then(function(tx) {
                            var logs = tx[0].logs;

                            assert.equal(logs.length, 2);
                            //ERC223 event
                            assert.equal(logs[0].event, 'Transfer');
                            assert.equal(logs[0].args._from, owner);
                            assert.equal(logs[0].args._to, to);
                            assert.equal(logs[0].args._data, '0x');
                            assert(logs[0].args._value.eq(amount));

                            //ERC20 event
                            assert.equal(logs[1].event, 'Transfer');
                            assert.equal(logs[1].args._from, owner);
                            assert.equal(logs[1].args._to, to);
                            assert(logs[1].args._value.eq(amount));
                        })
                    });
                });

                describe('when the owner does not have enough balance', function () {
                    const amount = 101;

                    it('reverts', function () {
                        return bankeraTokenInstance.transferFrom(owner, to, amount, { from: spender })
                            .then(function (tx) {
                                console.log(tx);
                                assert.fail("Unexpected error");
                            }).catch(function(tx) {
                                assertJump(tx);
                            })
                    });
                });
            });

            describe('when the spender does not have enough approved balance', function () {
                beforeEach(function () {
                    return Promise.all([
                        bankeraTokenInstance.approve(spender, 99, { from: owner }),
                        bankeraTokenInstance.issueTokens(owner, 100, {from: contractOwner})
                    ]);
                });

                describe('when the owner has enough balance', function () {
                    const amount = 100;

                    it('reverts', function () {
                        return bankeraTokenInstance.transferFrom(owner, to, amount, { from: spender })
                            .then(function (tx) {
                                console.log(tx);
                                assert.fail("Unexpected error");
                            }).catch(function(tx) {
                                assertJump(tx);
                            })
                    });
                });

                describe('when the owner does not have enough balance', function () {
                    const amount = 101;

                    it('reverts', function () {
                        return bankeraTokenInstance.transferFrom(owner, to, amount, { from: spender })
                            .then(function (tx) {
                                console.log(tx);
                                assert.fail("Unexpected error");
                            }).catch(function(tx) {
                                assertJump(tx);
                            })
                    });
                });
            });
        });

        describe('when the recipient is the zero address', function () {
            const amount = 100;
            const to = ZERO_ADDRESS;

            beforeEach(function () {
                bankeraTokenInstance.approve(spender, amount, { from: owner });
            });

            it('reverts', function () {
                return bankeraTokenInstance.transferFrom(owner, to, amount, { from: spender })
                    .then(function (tx) {
                        console.log(tx);
                        assert.fail("Unexpected error");
                    }).catch(function(tx) {
                        assertJump(tx);
                    })
            });
        });
    });

    describe('transfer function', function () {
        var bankeraTokenInstance;
        var contractOwner;

        beforeEach(function () {
            return BankeraToken.new(blocksPerRound, startingRoundNumber).then(function (instance) {
                bankeraTokenInstance = instance;
                contractOwner = accounts[0];
            });
        });

        describe('when the recipient is not the zero address', function () {
            const to = recipient;
            const owner = accounts[5];

            beforeEach(function () {
                return Promise.all([
                    bankeraTokenInstance.approve(owner, 100, { from: owner }),
                    bankeraTokenInstance.issueTokens(owner, 100, {from: contractOwner})
                ]);
            });

            describe('when the sender does not have enough balance', function () {
                const amount = 101;

                it('reverts', function () {
                    return bankeraTokenInstance.transfer(to, amount, { from: owner })
                        .then(function (tx) {
                            console.log(tx);
                            assert.fail("Unexpected error");
                        }).catch(function(tx) {
                            assertJump(tx);
                        })
                });
            });

            describe('when the sender has enough balance', function () {
                const amount = 100;

                it('transfers the requested amount', function () {

                    return Promise.all([
                        bankeraTokenInstance.transfer(to, amount, { from: owner })
                    ]).then(function(tx) {
                        return Promise.all([
                            bankeraTokenInstance.balanceOf(owner),
                            bankeraTokenInstance.balanceOf(to)
                        ])
                    }).then(function(values) {
                        assert.equal(values[0], 0);
                        assert.equal(values[1], amount);
                    });
                });

                it('emits a transfer event', function () {

                    return Promise.all([
                        bankeraTokenInstance.transfer(to, amount, { from: owner })
                    ]).then(function(tx) {
                        var logs = tx[0].logs;

                        assert.equal(logs.length, 2);
                        //ERC223 event
                        assert.equal(logs[0].event, 'Transfer');
                        assert.equal(logs[0].args._from, owner);
                        assert.equal(logs[0].args._to, to);
                        assert.equal(logs[0].args._data, '0x');
                        assert(logs[0].args._value.eq(amount));

                        //ERC20 event
                        assert.equal(logs[1].event, 'Transfer');
                        assert.equal(logs[1].args._from, owner);
                        assert.equal(logs[1].args._to, to);
                        assert(logs[1].args._value.eq(amount));
                    })
                });
            });
        });

        describe('when the recipient is the zero address', function () {
            const to = ZERO_ADDRESS;
            const owner = accounts[11];

            it('reverts', function () {
                return bankeraTokenInstance.transfer(to, 100, { from: owner })
                    .then(function (tx) {
                        console.log(tx);
                        assert.fail("Unexpected error");
                    }).catch(function(tx) {
                        assertJump(tx);
                    })
            });
        });
    });

});