// crypto.js — PBKDF2 密钥派生 + AES-GCM 加解密 + 密码验证

const Crypto = {
  _encoder: new TextEncoder(),
  _decoder: new TextDecoder(),

  _randomBytes(n) {
    return crypto.getRandomValues(new Uint8Array(n));
  },

  _bufToBase64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  },

  _base64ToBuf(b64) {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  },

  async deriveKey(password, salt) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this._encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  async encrypt(key, data) {
    const iv = this._randomBytes(12);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      this._encoder.encode(JSON.stringify(data))
    );
    return {
      iv: this._bufToBase64(iv),
      ciphertext: this._bufToBase64(encrypted),
    };
  },

  async decrypt(key, encryptedObj) {
    const iv = new Uint8Array(this._base64ToBuf(encryptedObj.iv));
    const ciphertext = await this._base64ToBuf(encryptedObj.ciphertext);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return JSON.parse(this._decoder.decode(decrypted));
  },

  async createVerifyData(key) {
    const token = this._bufToBase64(this._randomBytes(32));
    const encrypted = await this.encrypt(key, { token });
    return encrypted;
  },

  async verifyKey(key, verifyData) {
    try {
      const result = await this.decrypt(key, verifyData);
      return result && result.token;
    } catch {
      return null;
    }
  },
};
