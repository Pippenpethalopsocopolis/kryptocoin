const Blockchain = require('./blockchain');
const Transaction = require('./transaction');
const { key, publicKey } = require('./wallet');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let myCoin = new Blockchain();

function mineInitialReward() {
    console.log('\n🚀 Mining initial reward block...');
    myCoin.minePendingTransactions(publicKey);

    console.log(`💰 Balance after initial mining: ${myCoin.getBalanceOfAddress(publicKey)} coins`);
    promptMining();
}

function promptMining() {
    rl.question('\n⚡️ Create a transaction and mine next block? (y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
            const tx = new Transaction(publicKey, 'address' + Math.floor(Math.random() * 1000), Math.floor(Math.random() * 10));
            tx.signTransaction(key); // SIGN the transaction
            myCoin.createTransaction(tx);

            mineNextBlock();
        } else {
            console.log('\n🛑 Stopping miner...');
            console.log('✅ Final Blockchain:', JSON.stringify(myCoin, null, 2));
            rl.close();
        }
    });
}

function mineNextBlock() {
    console.log('\n🚀 Mining pending transactions...');
    myCoin.minePendingTransactions(publicKey);

    console.log(`💰 Balance of your wallet: ${myCoin.getBalanceOfAddress(publicKey)} coins`);
    promptMining();
}

// Start
mineInitialReward();