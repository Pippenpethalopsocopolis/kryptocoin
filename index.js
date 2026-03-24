const Blockchain = require('./blockchain');
const Transaction = require('./transaction');
const { key, publicKey } = require('./wallet');
const P2P = require('./p2p-server');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let myCoin = new Blockchain();

const p2pPort = process.env.P2P_PORT || 6001;
const peers = process.env.PEERS ? process.env.PEERS.split(',') : [];

P2P.initP2PServer(myCoin, p2pPort);
P2P.initP2PClient(myCoin, peers);

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
            const tx = new Transaction(publicKey, 'address' + Math.floor(Math.random() * 1000), 1);
            tx.signTransaction(key); // SIGN the transaction
            try {
                myCoin.createTransaction(1);
                P2P.broadcastTransaction(1);
            } catch (err) {
                console.log(`Transfer başarısız: ${err.message}`);
                console.log('Ödül bloğu kazılıyor...');
            }

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
    P2P.broadcastLatest(myCoin);

    console.log(`Cüzdan: ${myCoin.getBalanceOfAddress(publicKey)} Kryptocoin`);
    console.log('Blok Zinciri:', JSON.stringify(myCoin.chain, null, 2));
    promptMining();
}

// Start
mineInitialReward();