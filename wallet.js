const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// Generate key pair
const key = ec.genKeyPair();
const publicKey = key.getPublic('hex');

module.exports = { key, publicKey };