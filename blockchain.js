const Block = require('./block');
const Transaction = require('./transaction');

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.pendingTransactions = [];
        this.difficulty = 4; // Difficulty level (4 zeros in hash)
        this.miningReward = 50;
    }

    // Create the first block (Genesis Block)
    createGenesisBlock() {
        return new Block(0, "0", Date.now(), [], 0, "0");
    }

    // Get the latest block in the chain
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    // Mine pending transactions and add the block to the chain
    minePendingTransactions(miningRewardAddress) {
        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
        this.pendingTransactions.push(rewardTx);

        let block = new Block(
            this.chain.length,
            this.getLatestBlock().hash,
            Date.now(),
            this.pendingTransactions
        );

        // Mine the block using PoW
        block.mineBlock(this.difficulty);

        console.log("Block successfully mined!");

        // Add the mined block to the chain
        this.chain.push(block);

        // Reset pending transactions after mining
        this.pendingTransactions = [];
    }

    // Add a transaction to the blockchain
    createTransaction(transaction) {
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error('❌ Transaction must include from and to address.');
        }

        if (!transaction.isValid()) {
            throw new Error('❌ Cannot add invalid transaction to chain.');
        }

        const balance = this.getBalanceOfAddress(transaction.fromAddress);
        if (balance < transaction.amount) {
            throw new Error('❌ Not enough balance to perform this transaction.');
        }

        this.pendingTransactions.push(transaction);
    }

    // Validate the blockchain (check all blocks are valid)
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // Validate block hash
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                console.log(`❌ Invalid block hash at block ${i}`);
                return false;
            }

            // Validate previous block hash
            if (currentBlock.previousHash !== previousBlock.hash) {
                console.log(`❌ Invalid previous hash link at block ${i}`);
                return false;
            }

            // Validate the hash of the current block
            if (!currentBlock.hasValidHash(this.difficulty)) {
                console.log(`❌ Invalid block hash (PoW) at block ${i}`);
                return false;
            }

            // Validate all transactions in the block
            for (const tx of currentBlock.transactions) {
                if (!tx.isValid()) {
                    console.log(`❌ Invalid transaction signature at block ${i}`);
                    return false;
                }
            }
        }

        return true;
    }

    // Get the balance of a specific address
    getBalanceOfAddress(address) {
        let balance = 0;

        // Go through each block and all transactions
        for (const block of this.chain) {
            for (const transaction of block.transactions) {
                if (transaction.fromAddress === address) {
                    balance -= transaction.amount;
                }

                if (transaction.toAddress === address) {
                    balance += transaction.amount;
                }
            }
        }

        return balance;
    }
}

module.exports = Blockchain;