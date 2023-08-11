const admin = require('./firebase.configV1');
const sequelize = require('sequelize');
const models = require('../models/index');


const getDeviceToken=async (userId)=>{
    let deviceToken = null;
    try{
        let deviceData = await models.sequelize.query(
			`select token,appType,appVersion from gmsDeviceToken where fkUserId=${userId}`,
			{ type: sequelize.QueryTypes.SELECT }
		);
        if (deviceData && deviceData.length > 0){
            deviceToken = deviceData[0]; 
        }
    }catch(error){
        console.log("Error - getDeviceToken: ", error);
    }
    return deviceToken;
}
    
const sendPushNotification=async (userId, data, notification)=>{
    try{
        const deviceToken = await getDeviceToken(userId);
        if(!deviceToken){
            console.log("Device token is not available!");
            return "NOT_REGISTERED";    
        }
        const options = {
            priority: "high",
            timeToLive: 60 * 60 * 24
        };
        const message = {
            notification: notification,
            data: data
        };

        // console.log("Message: ", message);
        // console.log("Device Token: ", deviceToken.token);

        await admin.messaging().sendToDevice(deviceToken.token, message, options)
        .then( response => {
            console.log(`Notification sent successfully User : ${userId} , `,message);
        })
        .catch( error => {
            console.log(error);
            return "FAILED";
        });
    }catch(error){
        console.log("Error - NotificationService: ", error);
        return "FAILED";
    }
    return "SUCCESS";
}

module.exports = {
    sendPushNotification
};
