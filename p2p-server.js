const WebSocket = require('ws');
const Block = require('./block');
const Transaction = require('./transaction');

const MessageType = {
  QUERY_LATEST: 0,
  QUERY_ALL: 1,
  RESPONSE_CHAIN: 2,
  BROADCAST_TRANSACTION: 3
};

let sockets = [];

const initP2PServer = (blockchain, p2pPort) => {
  const server = new WebSocket.Server({ port: p2pPort });

  server.on('connection', (ws) => {
    initConnection(ws, blockchain);
  });

  console.log(`P2P server running on port ${p2pPort}`);
};

const initP2PClient = (blockchain, peers) => {
  peers.forEach((peer) => {
    const ws = new WebSocket(peer);

    ws.on('open', () => {
      initConnection(ws, blockchain);
    });

    ws.on('error', () => {
      console.log('Hata: bağlantı kurulamadı', peer);
    });
  });
};

const initConnection = (ws, blockchain) => {
  sockets.push(ws);
  initMessageHandler(ws, blockchain);
  initErrorHandler(ws);
  write(ws, queryChainLengthMsg());
};

const initMessageHandler = (ws, blockchain) => {
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      switch (message.type) {
        case MessageType.QUERY_LATEST:
          write(ws, responseChainMsg(blockchain));
          break;

        case MessageType.QUERY_ALL:
          write(ws, responseChainMsg(blockchain, true));
          break;

        case MessageType.RESPONSE_CHAIN:
          handleBlockchainResponse(blockchain, message.data);
          break;

        case MessageType.BROADCAST_TRANSACTION:
          handleTransactionBroadcast(blockchain, message.data);
          break;

        default:
          console.log('Bilinmeyen mesaj tipi:', message.type);
          break;
      }
    } catch (err) {
      console.error('Mesaj işlenirken hata:', err);
    }
  });
};

const handleBlockchainResponse = (blockchain, data) => {
  const receivedBlocksRaw = JSON.parse(data);
  const receivedBlocks = receivedBlocksRaw.map((b) =>
    new Block(b.index, b.previousHash, b.timestamp, b.transactions, b.nonce, b.hash)
  );

  if (receivedBlocks.length === 0) {
    console.log('Alınan zincir boş.');
    return;
  }

  const latestReceivedBlock = receivedBlocks[receivedBlocks.length - 1];
  const latestHeldBlock = blockchain.getLatestBlock();

  if (latestReceivedBlock.index > latestHeldBlock.index) {
    if (latestHeldBlock.hash === latestReceivedBlock.previousHash) {
      console.log('Sadece bir blok ekleniyor.');
      blockchain.chain.push(latestReceivedBlock);
      broadcast(responseChainMsg(blockchain, true));
    } else if (receivedBlocks.length === 1) {
      console.log('Eksik zincir bloku var; tüm zincir isteniyor.');
      broadcast(queryAllMsg());
    } else {
      console.log('Uzun zincir bulundu, değiştirme deneniyor.');
      if (blockchain.replaceChain(receivedBlocks)) {
        console.log('Zincir güncellendi.');
        broadcast(responseChainMsg(blockchain, true));
      } else {
        console.log('Gelen zincir geçerli değil.');
      }
    }
  } else {
    console.log('Alınan zincir güncel değil.');
  }
};

const handleTransactionBroadcast = (blockchain, data) => {
  const txData = typeof data === 'string' ? JSON.parse(data) : data;
  const tx = new Transaction(txData.fromAddress, txData.toAddress, txData.amount);
  tx.timestamp = txData.timestamp;
  tx.signature = txData.signature;

  try {
    blockchain.createTransaction(1, { skipBalanceCheck: true });
    broadcast(buildMessage(MessageType.BROADCAST_TRANSACTION, JSON.stringify(txData)));
  } catch (err) {
    console.log('Broadcast tx kabul edilmedi:', err.message);
  }
};

const initErrorHandler = (ws) => {
  const closeConnection = () => {
    sockets = sockets.filter((s) => s !== ws);
  };

  ws.on('close', closeConnection);
  ws.on('error', closeConnection);
};

const queryChainLengthMsg = () => buildMessage(MessageType.QUERY_LATEST);
const queryAllMsg = () => buildMessage(MessageType.QUERY_ALL);
const responseChainMsg = (blockchain, full = false) =>
  buildMessage(MessageType.RESPONSE_CHAIN, JSON.stringify(full ? blockchain.chain : [blockchain.getLatestBlock()]));

const buildMessage = (type, data = null) => ({ type, data });

const write = (ws, message) => ws.send(JSON.stringify(message));

const broadcast = (message) => sockets.forEach((socket) => write(socket, message));

const broadcastTransaction = (transaction) =>
  broadcast(buildMessage(MessageType.BROADCAST_TRANSACTION, JSON.stringify(transaction)));

module.exports = {
  initP2PServer,
  initP2PClient,
  broadcastTransaction,
  broadcastLatest: (blockchain) => broadcast(responseChainMsg(blockchain)),
  queryAllMsg,
};
