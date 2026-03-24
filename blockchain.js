const Block = require('./block');
const Transaction = require('./transaction');

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.pendingTransactions = [];
        this.difficulty = 2; // Difficulty level (4 zeros in hash)
        this.miningReward = 50;
    }

    // Create the first block (Genesis Block)
    createGenesisBlock() {
        // Use deterministic genesis data so tüm node'lar aynı başlangıç bloğunu paylaşsın.
        const genesis = new Block(0, "0", 1626278400000, [], 0);
        genesis.hash = genesis.calculateHash();
        return genesis;
    }

    // Get the latest block in the chain
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    // Mine pending transactions and add the block to the chain
    minePendingTransactions(miningRewardAddress) {
        this.halveRewards();

        // Filter out transactions that would overdraft the sender
        const validTransactions = [];
        const spentInBlock = {}; // track cumulative spending per address in this block

        for (const tx of this.pendingTransactions) {
            if (tx.fromAddress === null) continue; // skip reward txs from previous rounds

            const sender = tx.fromAddress;
            const balance = this.getBalanceOfAddress(sender);
            const alreadySpent = spentInBlock[sender] || 0;

            if (balance - alreadySpent >= tx.amount) {
                validTransactions.push(tx);
                spentInBlock[sender] = alreadySpent + tx.amount;
            } else {
                console.log(`Transfer atlandı: ${sender.substring(0, 10)}... yetersiz bakiye.`);
            }
        }

        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
        validTransactions.push(rewardTx);

        let block = new Block(
            this.chain.length,
            this.getLatestBlock().hash,
            Date.now(),
            validTransactions
        );

        // Mine the block using PoW
        block.mineBlock(this.difficulty);

        if (!this.isChainValid()) {
            throw new Error('Blockchain geçersiz, madencilik yapılamaz!');
        }

        console.log("Blok başarıyla kazıldı!");

        // Add the mined block to the chain
        this.chain.push(block);

        // Reset pending transactions after mining
        this.pendingTransactions = [];
    }

    // Add a transaction to the blockchain
    createTransaction(transaction, { skipBalanceCheck = false } = {}) {
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error('Transfer, gönderilecek adres ve gönderici adresi içermelidir.');
        }

        if (!transaction.isValid()) {
            throw new Error('Geçersiz transfer, bloğa eklenemez!');
        }

        if (!skipBalanceCheck) {
            let balance = this.getBalanceOfAddress(transaction.fromAddress);

            // Pending transaction'ları da hesaba kat
            const pendingOut = this.pendingTransactions
                .filter((tx) => tx.fromAddress === transaction.fromAddress)
                .reduce((sum, tx) => sum + tx.amount, 0);

            if (balance - pendingOut < transaction.amount) {
                throw new Error('Hesapta yeterli Kryptocoin yok.');
            }
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
                console.log(`Geçersiz block hash tespit edildi. ${i}`);
                return false;
            }

            // Validate previous block hash
            if (currentBlock.previousHash !== previousBlock.hash) {
                console.log(`Önceki hash geçersiz. ${i}`);
                return false;
            }

            // Validate the hash of the current block
            if (!currentBlock.hasValidHash(this.difficulty)) {
                console.log(`Geçersiz iş ispatı hash'i tespit edildi. ${i}`);
                return false;
            }

            // Validate all transactions in the block
            for (const tx of currentBlock.transactions) {
                let transactionInstance;
                if (tx instanceof Transaction) {
                    transactionInstance = tx;
                } else {
                    transactionInstance = new Transaction(tx.fromAddress, tx.toAddress, tx.amount);
                    transactionInstance.timestamp = tx.timestamp;
                    transactionInstance.signature = tx.signature;
                }

                if (!transactionInstance.isValid()) {
                    console.log(`Geçersiz transfer imzası tespit edildi. ${i}`);
                    return false;
                }
            }
        }

        return true;
    }

    replaceChain(newChain) {
        if (newChain.length <= this.chain.length) {
            return false;
        }

        if (!Blockchain.isValidChain(newChain)) {
            return false;
        }

        this.chain = newChain;
        // Geçersiz olabilecek eski bekleyen transferleri temizle
        this.pendingTransactions = [];
        return true;
    }

    static isValidChain(chain) {
        const realGenesis = new Blockchain().createGenesisBlock();
        const genesis = chain[0];

        if (JSON.stringify(genesis) !== JSON.stringify(realGenesis)) {
            return false;
        }

        for (let i = 1; i < chain.length; i++) {
            const currentBlock = chain[i];
            const previousBlock = chain[i - 1];

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }

            const blockAsBlock = new Block(
                currentBlock.index,
                currentBlock.previousHash,
                currentBlock.timestamp,
                currentBlock.transactions,
                currentBlock.nonce,
                currentBlock.hash
            );

            if (blockAsBlock.hash !== blockAsBlock.calculateHash()) {
                return false;
            }

            if (!blockAsBlock.hasValidHash(new Blockchain().difficulty)) {
                return false;
            }

            for (const tx of blockAsBlock.transactions) {
                let transactionInstance;
                if (tx instanceof Transaction) {
                    transactionInstance = tx;
                } else {
                    transactionInstance = new Transaction(tx.fromAddress, tx.toAddress, tx.amount);
                    transactionInstance.timestamp = tx.timestamp;
                    transactionInstance.signature = tx.signature;
                }

                if (!transactionInstance.isValid()) {
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

    halveRewards() {
        const height = this.chain.length;
        if (height > 1 && (height - 1) % 210000 === 0) {
            this.miningReward = this.miningReward / 2;
            console.log(`Yarılama gerçekleşti! Yeni kazım ödülü: ${this.miningReward}`);
        }
    }
}

module.exports = Blockchain;