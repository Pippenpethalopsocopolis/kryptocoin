const SHA256 = require('crypto-js/sha256');

class Block {
    constructor(index, previousHash, timestamp, transactions, nonce = 0, hash = '') {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.nonce = nonce;  // Random number to change
        this.hash = hash;
    }

    // This is the hashing function for the block
    calculateHash() {
        return SHA256(this.index + this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce).toString();
    }

    // This function is used to mine a block (PoW)
    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++; // Increment the nonce
            this.hash = this.calculateHash(); // Recalculate the hash with the new nonce
        }
        console.log("Block mined: " + this.hash);
    }

    // Validating the block hash
    hasValidHash(difficulty) {
        return this.hash.substring(0, difficulty) === Array(difficulty + 1).join("0");
    }
}

module.exports = Block;