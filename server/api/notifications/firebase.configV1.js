const admin = require('firebase-admin');
const serviceAccount = require('./gamesapp-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://gamesapp-a6915.firebaseio.com"
});

module.exports = admin;

