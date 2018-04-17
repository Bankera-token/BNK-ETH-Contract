module.exports = function(error) {
    //  console.log(error.message);
    var invalidOpcode = error.message.search('invalid opcode') >= 0;
    //       of an 'invalid jump', we get an 'out of gas' error. How do
    //       we distinguish this from an actual out of gas event? (The
    //       testrpc log actually show an 'invalid jump' event.)
    var outOfGas = error.message.search('out of gas') >= 0;
    var revert = error.message.search('revert') >= 0;
    assert.isAbove(
        invalidOpcode || outOfGas || revert,
        0,
        'Expected throw, got \'' + error + '\' instead'
    );
};