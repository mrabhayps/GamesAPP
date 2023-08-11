import express from 'express';
import commonCtrl from '../controllers/commonCtrl';
import upload from '../../common/muter.config';

export default express.Router()
    .get('/initialize',commonCtrl.initializeApp)
    .post('/contactsync',commonCtrl.postContactSync)
    .get('/appConfig',commonCtrl.getAPPConfig)
    .get('/alerts',commonCtrl.getAppNotification)
    .get('/serverstatus',commonCtrl.getServerStatus)
    .post('/serveralertsms',commonCtrl.sendSMSIfServerNotWorking)
    .get('/home',commonCtrl.getHomePage)
    .get('/homebanner',commonCtrl.getHomeBannerList)
    .post('/registerdevice',commonCtrl.registerDevice)
    .get('/deregisterdevice',commonCtrl.deRegisterDevice)
    .get('/sendnotification',commonCtrl.sendNotification)
    .post('/postlogs',commonCtrl.sendDisconnectionLogs)
    .post('/usersource',commonCtrl.saveUserSource)
    .post('/resetglobaldata',commonCtrl.resetGlobalData)
    .get('/getkycapikey',commonCtrl.getKYCAPIKey)
    //.get('/updateleaderbord',commonCtrl.updateLBInMemory)
    .get('/sendpushnotification',commonCtrl.sendPushNotification)
    .post('/uploadgameandapk', upload.single('uploadFile'), commonCtrl.uploadGameAndAPKFile)
    .post('/uploadapk', upload.single('uploadFile'), commonCtrl.uploadAPKFile)
    .post('/updateuseragents',commonCtrl.updateUserAgent)
    .get('/serverHelthStatus',commonCtrl.getServerHealthStatus);