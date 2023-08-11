import admin from './firebase.config';
import helper from '../../common/helper';


export class NotificationService{

    async getDeviceToken(userId:number){
        let deviceToken = null;
        try{
            let deviceData = await helper.getColsValue("gmsDeviceToken", ["token", "appType", "appVersion"], 
            {fkUserId: userId});
            if (deviceData && deviceData.length > 0){
                deviceToken = deviceData[0]; 
            }
        }catch(error){
            console.log("Error - getDeviceToken: ", error);
        }
        return deviceToken;
    }
    
    async sendPushNotification(userId:number, data:any, notification:any){
        try{
            const deviceToken = await this.getDeviceToken(userId);
            if(!deviceToken){
                console.log("Device token is not available!");
                return "NOT_REGISTERED";    
            }
            const notification_options = {
                priority: "high",
                timeToLive: 60 * 60 * 24
            };
            const message = {
                notification: notification,
                // android: {
                //     ttl: 3600 * 1000,
                //     // notification: {
                //     //   icon: 'stock_ticker_update',
                //     //   color: '#f45342',
                //     // },
                //     "direct_book_ok" : true
                // },
                data: data
            };
            const options =  notification_options;
            console.log("Message: ", message);
            console.log("Device Token: ", deviceToken.token);
            await admin.messaging().sendToDevice(deviceToken.token, message, options)
            .then( response => {
                console.log("Notification sent successfully");
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
} 
export default new NotificationService();