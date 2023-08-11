import rsaPemToJwk from 'rsa-pem-to-jwk';
import { JWE, JWK, parse } from 'node-jose';
import crypto from 'crypto';
import fs  from 'fs';
import path from 'path';
 
export class EncryptDecryptIndusInd{
    async encryptKey(data) {
        const cert = fs.readFileSync(path.resolve(__dirname, './indusinduat-publickey.txt')).toString();
        const pubkey = crypto.createPublicKey(cert);
        const publicKey = await rsaPemToJwk(pubkey.export({ format: 'pem', type: 'pkcs1' }));
        const buffer = Buffer.from(data);
        const encrypted = await JWE.createEncrypt({ format: 'compact', contentAlg: "A256GCM", fields: { alg: "RSA-OAEP-256" } }, publicKey)
            .update(buffer).final();
        console.log({encryptedKey: encrypted})
        return encrypted;
    }
    
    async encryptData(key, jsonInput) {
        const jwkKey = await this.convertToJWK(key);
        const encryptedData = await JWE.createEncrypt({ format: 'compact', contentAlg: "A256GCM", keyAlg: 'A256KW' }, jwkKey)
            .update(JSON.stringify(jsonInput)).final();
        console.log({ aesEncryptedData: encryptedData });
        return encryptedData;
    }
    async convertToJWK(aesKey) {
        const jwk :any = {
            kty: 'oct',
            k: Buffer.from(aesKey, 'hex').toString('base64'),
            alg: 'A256KW',
            use: 'enc'
        };
        return jwk;
    }
    
    async decryptData(key, token) {
        const jwkKey = await this.convertToJWK(key);
        const keystore = await JWK.createKeyStore();
        keystore.add(jwkKey);
        const output = parse.compact(token);
        const response = await output.perform(keystore);
        return response.plaintext.toString();
    }
    
}


export default new EncryptDecryptIndusInd();