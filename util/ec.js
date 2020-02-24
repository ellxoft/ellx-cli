const EC = require('elliptic').ec;
const b64url = require('b64url-buffer');

const DEFAULT_CURVE = 'secp256k1';

const bn2Buffer = bn => (bn.red ? bn.fromRed() : bn).toBuffer();

const objectHash = (() => {
  let oh = require('object-hash');
  let options = { encoding: 'buffer', algorithm: 'sha1' };
  return obj => oh(obj, options);
})();

class Elliptic {
  constructor(key) {
    this.key = key;
  }

  privateKey() {
    return b64url.encode(this.key.getPrivate().toBuffer());
  }

  publicKey() {
    let { x, y } = this.key.getPublic();
    return b64url.encode(Buffer.concat([x, y].map(bn2Buffer)));
  }

  sign(obj) {
    let digest = objectHash(obj);
    let { r, s, recoveryParam } = this.key.sign(digest);
    return b64url.encode(Buffer.from([recoveryParam, ...bn2Buffer(r), ...bn2Buffer(s)])).substr(1);   // Strip away the leading 'A'
  }

  verify(obj, signature) {
    try {
      let buf = b64url.decode('A' + signature), nBytes = (buf.length - 1) >> 1;
      let r = buf.slice(1, 1 + nBytes), s = buf.slice(1 + nBytes);

      let digest = objectHash(obj);
      return this.key.verify(digest, {r, s});
    }
    catch (_) {
      return false;
    }
  }
}

exports.keyFromPublic = (pubKey, curve = DEFAULT_CURVE) => {
  let buf = b64url.decode(pubKey), nBytes = buf.length >> 1;
  let x = buf.slice(0, nBytes), y = buf.slice(nBytes);

  let ec = new EC(curve);
  return new Elliptic(ec.keyFromPublic({ x, y }));
}

exports.keyFromSignature = (obj, signature, curve = DEFAULT_CURVE) => {
  let buf = b64url.decode('A' + signature), nBytes = (buf.length - 1) >> 1;
  let recoveryParam = buf[0], r = buf.slice(1, 1 + nBytes), s = buf.slice(1 + nBytes);

  let ec = new EC(curve);
  let digest = objectHash(obj);
  let pubKey = ec.recoverPubKey(digest, { r, s }, recoveryParam);
  return new Elliptic(ec.keyFromPublic(pubKey));
}

exports.keyFromPrivate = (key, curve = DEFAULT_CURVE) => {
  let ec = new EC(curve);
  return new Elliptic(ec.keyFromPrivate(b64url.decode(key)));
}

exports.generate = (curve = DEFAULT_CURVE) => {
  let ec = new EC(curve);
  return new Elliptic(ec.genKeyPair());
}
