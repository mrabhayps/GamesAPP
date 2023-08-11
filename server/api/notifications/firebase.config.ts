import admin from 'firebase-admin';
import * as serviceAccount  from './gamesapp-firebase-adminsdk.json';
let serviceAccountConfig:any=serviceAccount;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountConfig),
  databaseURL: "https://gamesapp-a6915.firebaseio.com"
});

// module.exports = admin
export default admin;
