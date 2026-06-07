// store.js — IndexedDB 封装（多账本管理、加密 CRUD）

const Store = {
  DB_NAME: 'snapledger',
  _db: null,
  _currentKey: null,
  _currentLedgerId: null,

  _open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => {
        this._db = e.target.result;
        resolve(this._db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async listLedgers() {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('meta', 'readonly');
      const store = tx.objectStore('meta');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async createLedger(name, password, hint) {
    const id = crypto.randomUUID();
    const salt = Crypto._randomBytes(16);
    const saltB64 = Crypto._bufToBase64(salt);
    const key = await Crypto.deriveKey(password, salt);
    const verify = await Crypto.createVerifyData(key);

    const db = await this._open();
    // Create object store for this ledger
    await new Promise((resolve, reject) => {
      // Need to close and reopen with higher version to add store
      db.close();
      this._db = null;
      const version = db.version + 1;
      const req = indexedDB.open(this.DB_NAME, version);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('meta')) {
          d.createObjectStore('meta', { keyPath: 'id' });
        }
        d.createObjectStore(`ledger_${id}`, { keyPath: 'id' });
        // Create index on record_date
        const store = e.target.transaction.objectStore(`ledger_${id}`);
        store.createIndex('record_date', 'record_date', { unique: true });
      };
      req.onsuccess = (e) => {
        this._db = e.target.result;
        resolve();
      };
      req.onerror = (e) => reject(e.target.error);
    });

    // Save meta
    await new Promise((resolve, reject) => {
      const tx = this._db.transaction('meta', 'readwrite');
      const store = tx.objectStore('meta');
      store.put({
        id,
        name,
        hint: hint || '',
        salt: saltB64,
        verify: verify,
        created_at: new Date().toISOString(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });

    // Already have the derived key, set it directly
    this._currentKey = key;
    this._currentLedgerId = id;

    return id;
  },

  async unlockLedger(ledgerId, password) {
    const db = await this._open();
    const meta = await new Promise((resolve, reject) => {
      const tx = db.transaction('meta', 'readonly');
      const store = tx.objectStore('meta');
      const req = store.get(ledgerId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!meta) throw new Error('Ledger not found');

    const salt = new Uint8Array(atob(meta.salt).split('').map(c => c.charCodeAt(0)));
    const key = await Crypto.deriveKey(password, salt);
    const valid = await Crypto.verifyKey(key, meta.verify);
    if (!valid) throw new Error('Invalid password');

    this._currentKey = key;
    this._currentLedgerId = ledgerId;
    return true;
  },

  lock() {
    this._currentKey = null;
    this._currentLedgerId = null;
  },

  get isUnlocked() {
    return !!this._currentKey;
  },

  get currentLedgerId() {
    return this._currentLedgerId;
  },

  async _ensureStore() {
    if (!this.isUnlocked) throw new Error('Ledger is locked');
    const db = await this._open();
    const storeName = `ledger_${this._currentLedgerId}`;
    if (!db.objectStoreNames.contains(storeName)) {
      throw new Error(`Store ${storeName} not found`);
    }
    return storeName;
  },

  async getAllSnapshots() {
    const storeName = await this._ensureStore();
    const db = await this._open();
    const encrypted = await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const snapshots = [];
    for (const record of encrypted) {
      const decrypted = await Crypto.decrypt(this._currentKey, record.data);
      decrypted.id = record.id;
      snapshots.push(decrypted);
    }
    return Calc.enrichAll(snapshots);
  },

  async addSnapshot(snapshot) {
    const storeName = await this._ensureStore();
    const enriched = Calc.enrichAll([...await this.getAllSnapshots(), snapshot]);
    const toStore = enriched.find(s => s.id === snapshot.id) || snapshot;
    const encrypted = await Crypto.encrypt(this._currentKey, toStore);

    const db = await this._open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put({ id: toStore.id, record_date: toStore.record_date, data: encrypted });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });

    return toStore;
  },

  async updateSnapshot(snapshot) {
    return this.addSnapshot(snapshot);
  },

  async deleteSnapshot(id) {
    const storeName = await this._ensureStore();
    const db = await this._open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async deleteLedger(ledgerId) {
    const db = await this._open();
    const storeName = `ledger_${ledgerId}`;

    // Delete meta entry
    await new Promise((resolve, reject) => {
      const tx = db.transaction('meta', 'readwrite');
      tx.objectStore('meta').delete(ledgerId);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });

    // Delete object store by reopening with upgraded version
    db.close();
    this._db = null;
    await new Promise((resolve, reject) => {
      const version = db.version + 1;
      const req = indexedDB.open(this.DB_NAME, version);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (d.objectStoreNames.contains(storeName)) {
          d.deleteObjectStore(storeName);
        }
      };
      req.onsuccess = (e) => {
        this._db = e.target.result;
        resolve();
      };
      req.onerror = (e) => reject(e.target.error);
    });

    if (this._currentLedgerId === ledgerId) {
      this.lock();
    }
  },

  async importSnapshots(snapshots, mode) {
    const storeName = await this._ensureStore();
    const db = await this._open();

    if (mode === 'overwrite') {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
      });
    }

    if (mode === 'merge') {
      // Load existing to find duplicates by date
      const existing = await this.getAllSnapshots();
      const dateMap = new Map(existing.map(s => [s.record_date, s.id]));
      for (const s of snapshots) {
        if (dateMap.has(s.record_date)) {
          s.id = dateMap.get(s.record_date);
        }
      }
    }

    const enriched = Calc.enrichAll(snapshots);
    for (const s of enriched) {
      const encrypted = await Crypto.encrypt(this._currentKey, s);
      await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put({ id: s.id, record_date: s.record_date, data: encrypted });
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
      });
    }

    return enriched;
  },
};
