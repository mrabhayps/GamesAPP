import crypto from 'crypto';
import BufferList from 'bl';
import * as secretConfig  from '../common/secret.config.json';
var config:any=secretConfig;

export class EncryptDecrypt{
    _maxKeySize = 32;
    _maxIVSize = 16;
    _algorithm = 'AES-256-CBC';
    _characterMatrixForRandomIVStringGeneration = [
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 
      'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 
      'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '_'
    ];

    async encrypt(text) {
        text=JSON.stringify(text);
        const iv = crypto.randomBytes(16);
        let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from("gmsapphdueyt5648jsder49892834893"), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return {iv: iv.toString('hex'),gr : encrypted.toString('hex')};
    }

    async decrypt(text) {
        let iv = Buffer.from(text.iv, 'hex');
        let encryptedText = Buffer.from(text.gr, 'hex');
        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from("gmsapphdueyt5648jsder49892834893"), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }

    async encryptDecrypt(text,isEncrypt) {
        text=JSON.stringify(text);
        var key=config.ed.k;
        var initVector=config.ed.iv;
        if (!text || !key) {
          console.log('cryptLib._encryptDecrypt: -> key and plain or encrypted text required');
          return false;
        }
    
        let ivBl = new BufferList(),
            keyBl = new BufferList(),
            keyCharArray = key.split(''),
            ivCharArray = [],
            encryptor, decryptor, clearText;
    
        if (initVector && initVector.length > 0) {
           ivCharArray = initVector.split('');
        }
        
        for (var i = 0; i < this._maxIVSize; i++) {
          ivBl.append(ivCharArray.shift() || [null]);
        }
    
        for (var i = 0; i < this._maxKeySize; i++) {
          keyBl.append(keyCharArray.shift() || [null]);
        }
    
        if (isEncrypt) {
          encryptor = crypto.createCipheriv(this._algorithm, keyBl.toString(), 
            ivBl.toString());
          encryptor.setEncoding('base64');
          encryptor.write(text);
          encryptor.end();
          return encryptor.read();
        }
        decryptor = crypto.createDecipheriv(this._algorithm, keyBl.toString(),
          ivBl.toString());
        var dec = decryptor.update(text, 'base64', 'utf8');
        dec += decryptor.final('utf8');
        return dec;
    }

    _isCorrectLength(length) {
        return length && /^\d+$/.test(length) && parseInt(length, 10) !== 0
    }

    generateRandomIV(length) {
        if (!this._isCorrectLength(length)) {
          throw 'cryptLib.generateRandomIV() -> needs length or in wrong format';
        }
    
        length = parseInt(length, 10);
        let _iv = [],
            randomBytes = crypto.randomBytes(length);
    
        for (let i = 0; i < length; i++) {
          let ptr = randomBytes[i] % 
            this._characterMatrixForRandomIVStringGeneration.length;
          _iv[i] = this._characterMatrixForRandomIVStringGeneration[ptr];
        }
        return _iv.join('');
    }

    getHashSha256(key, length) {
        if (!key) {
          throw 'cryptLib.getHashSha256() -> needs key';
        }
    
        if (!this._isCorrectLength(length)) {
          throw 'cryptLib.getHashSha256() -> needs length or in wrong format';
        }
    
        return crypto.createHash('sha256')
                     .update(key)
                     .digest('hex')
                     .substring(0, length);
    }
    
    encryptSabPaisa(authKey,authIV,data){
      let cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(authKey), authIV);
      let encrypted = cipher.update(data);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      return encrypted.toString("base64");
    }

    decryptSabPaisa(authKey,authIV,data){
      let decipher = crypto.createDecipheriv('aes-128-cbc',Buffer.from(authKey),authIV);
      let decrypted = decipher.update(Buffer.from(data, "base64"));
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    }

}
export default new EncryptDecrypt();