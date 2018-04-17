const assertJump = require('./helpers/assertJump');
var SafeMath = artifacts.require("./SafeMath.sol");

var BigNumber = require('decimal.js');
BigNumber.config({
    precision: 100,
    rounding: 4,
    toExpNeg: 0,
    toExpPos: 40
});

contract('Safe Math tests', function (accounts) {

    var safeMathInstance;
    var maxUnit256 = Math.pow(2,256)-1;

    it("multiplies correctly", function() {
        return SafeMath.deployed().then(function (instance) {
            safeMathInstance = instance;
            return safeMathInstance.safeMul.call(5678, 1234)
        }).then(function(result) {
            assert.equal(result, 7006652);
            return safeMathInstance.safeMul.call(maxUnit256, 2);
        }).then(function(result) {
            assert.fail('Expected exception');
        }).catch(function(error) {
            assertJump(error);
            return safeMathInstance.safeMul.call(2, -2);
        }).then(function(result) {
            assert.fail('Expected exception');
        }).catch(function(error) {
            assertJump(error);
            return safeMathInstance.safeMul.call(-2, 2);
        }).then(function(result) {
            assert.fail('Expected exception');
        }).catch(function(error) {
            assertJump(error);
            return safeMathInstance.safeMul.call(-2, -2);
        }).then(function(result) {
            assert.fail('Expected exception');
        }).catch(function(error) {
            assertJump(error);
        })
    });

    it("safeAdds correctly", function() {
        var a = 5678;
        var b = 1234;

        var contributorAddress1sBNKAmount = 15478545;
        var contributorAddress2sBNKAmount = BigNumber('1');
        var contributorAddress3sBNKAmount = BigNumber('156895845826264');
        var contributorAddress4sBNKAmount = BigNumber('91258465416894658');
        var sum = BigNumber('0');

        return safeMathInstance.safeAdd.call(a, b)
            .then(function(result) {
                assert.equal(result, '6912');

                return safeMathInstance.safeAdd.call(contributorAddress3sBNKAmount.toFixed(0), contributorAddress4sBNKAmount.toFixed(0))
            }).then(function(result) {
                assert.equal(result, '91415361262720922');
                sum = result;

                return safeMathInstance.safeAdd.call(sum.toFixed(0), contributorAddress2sBNKAmount.toFixed(0))
            }).then(function(result) {
                assert.equal(result, '91415361262720923');
                sum = result;

                return safeMathInstance.safeAdd.call(sum.toFixed(0), contributorAddress1sBNKAmount.toFixed(0))
            }).then(function(result) {
                assert.equal(result, '91415361278199468');
                sum = result;
            })
    });

    it("safeSubs correctly", function() {
        var a = 5678;
        var b = 1234;
        safeMathInstance.safeSub.call(a, b)
            .then(function(result) {
                assert.equal(result, 4444);
        })
    });

    it("should throw an error if safeSubion result would be negative", function() {

        var a = 1234;
        var b = 5678;

        return safeMathInstance.safeSub.call(a, b)
            .then(function (result) {
                assert.fail('Expected exception');
            }).catch(function (error) {
                assertJump(error);
                return safeMathInstance.safeSub.call(0, 1);
            }).then(function (result) {
                assert.fail('Expected exception');
            }).catch(function (error) {
                assertJump(error);
                return safeMathInstance.safeSub.call(1, -11)
            }).then(function (result) {
                assert.fail('Expected exception');
            }).catch(function (error) {
                assertJump(error);
            })
    });

    it("should throw an error on safeAddition overflow", function() {
        var a = 115792089237316195423570985008687907853269984665640564039457584007913129639935;
        var b = 1;
        safeMathInstance.safeAdd.call(a, b)
            .then(function(result) {
                assert.fail('Expected exception');
            }).catch(function(error) {
                assertJump(error);
            })
    });

    it("should throw an error on multiplication overflow", function() {
        var a = 115792089237316195423570985008687907853269984665640564039457584007913129639933;
        var b = 2;
        return safeMathInstance.safeMul.call(a, b)
            .then(function(result) {
                assert.fail('Expected exception');
            }).catch(function(error) {
                assertJump(error);
                return safeMathInstance.safeMul.call(b, 0)
            }).then(function(result) {
                assert.equal(result, 0);
                return safeMathInstance.safeMul.call(b, -2)
            }) .then(function(result) {
                assert.fail('Expected exception');
            }).catch(function(error) {
                assertJump(error);
                return safeMathInstance.safeMul.call(-2, b)
            }).then(function(result) {
                assert.fail('Expected exception');
            }).catch(function(error) {
                assertJump(error);
                return safeMathInstance.safeMul.call(-2, a)
            }).then(function(result) {
                assert.fail('Expected exception');
            }).catch(function(error) {
                assertJump(error);
            });
    });

});