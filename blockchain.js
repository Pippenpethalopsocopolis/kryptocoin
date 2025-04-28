const Block = require('./block');
const Transaction = require('./transaction');
const { publicKey } = require('./wallet'); // Import your wallet public key

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2;
        this.pendingTransactions = [];
        this.miningReward = 50;
    }

    createGenesisBlock() {
        const genesisTransaction = new Transaction(null, publicKey, 400000); // Give 400,000 coins at genesis
        return new Block(Date.now().toString(), [genesisTransaction], "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    minePendingTransactions(miningRewardAddress) {
        if (this.pendingTransactions.length === 0) {
            console.log('⛔ No transactions to mine.');
            return;
        }

        const block = new Block(Date.now().toString(), this.pendingTransactions, this.getLatestBlock().hash);
        block.mineBlock(this.difficulty);

        console.log('💎 Block successfully mined!');
        this.chain.push(block);

        // After mining, reset pending transactions
        this.pendingTransactions = [
            new Transaction(null, miningRewardAddress, this.miningReward)
        ];
    }

    createTransaction(transaction) {
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error('❌ Transaction must include from and to address.');
        }

        if (!transaction.isValid()) {
            throw new Error('❌ Cannot add invalid transaction to chain.');
        }

        if (transaction.amount <= 0) {
            throw new Error('❌ Transaction amount should be greater than 0.');
        }

        const balance = this.getBalanceOfAddress(transaction.fromAddress);
        if (balance < transaction.amount) {
            throw new Error('❌ Not enough balance to perform this transaction.');
        }

        this.pendingTransactions.push(transaction);
        console.log('✅ Transaction added.');
    }

    getBalanceOfAddress(address) {
        let balance = 0;

        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.fromAddress === address) {
                    balance -= trans.amount;
                }
                if (trans.toAddress === address) {
                    balance += trans.amount;
                }
            }
        }

        return balance;
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                console.log(`❌ Invalid block hash at block ${i}`);
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                console.log(`❌ Invalid previous hash link at block ${i}`);
                return false;
            }

            for (const tx of currentBlock.transactions) {
                if (!tx.isValid()) {
                    console.log(`❌ Invalid transaction signature at block ${i}`);
                    return false;
                }
            }
        }

        return true;
    }
}

module.exports = Blockchain;