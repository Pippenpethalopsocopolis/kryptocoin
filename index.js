const Blockchain = require('./blockchain');
const Transaction = require('./transaction');
const { key, publicKey } = require('./wallet');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let myCoin = new Blockchain();

console.log('===========================================================================');
console.log('                    Kryptocoin --- Created By Berk Öcal                    ');
console.log('===========================================================================\n\n');

function mineInitialReward() {
    console.log(`Açık Cüzdan ID'niz: ${publicKey}`);
    console.log(`Gizli Cüzdan ID'niz: ${key.getPrivate('hex')}\n`);

    console.log('Genesis blok oluşturuldu, ilk blok kazılıyor...');
    myCoin.minePendingTransactions(publicKey);

    console.log(`Cüzdan: ${myCoin.getBalanceOfAddress(publicKey)} Kryptocoin`);
    promptMining();
}

function promptMining() {
    rl.question('\nKryptocoin transferi yap ve sonraki bloğu kaz? (Evet(e)/Hayır(h)): ', (answer) => {
        if(answer.toLowerCase() === 'e') {
            const tx = new Transaction(publicKey, 'address' + Math.floor(Math.random() * 1000), Math.floor(Math.random() * 9) + 1);
            tx.signTransaction(key); // SIGN the transaction
            myCoin.createTransaction(tx);

            mineNextBlock();
        }
        else {
            console.log('\nMadencilik duruduruluyor...');
            console.log('En Sonuncu Blockchain:\n', JSON.stringify(myCoin, null, 2));
            rl.close();
        }
    });
}

function mineNextBlock() {
    console.log('\nBekleyen transferler kazılıyor...');
    myCoin.minePendingTransactions(publicKey);

    console.log(`Cüzdan: ${myCoin.getBalanceOfAddress(publicKey)} Kryptocoin`);
    promptMining();
}

// Start
mineInitialReward();