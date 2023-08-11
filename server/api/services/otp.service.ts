import sequelize from 'sequelize';
import models from '../models/index';

export class OTP {
    generateOTP(){
        var digits = '123456789'; 
        let OTP = ''; 
        for (let i = 1; i < 5; i++ ) { 
            OTP += digits[Math.floor(Math.random() * 9)]; 
        } 
        return OTP; 
    }// End Of Generate OTP

    makeSessionId(length) {
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
           result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
     }

    async storeOTP(mobile,otp){
        try{
            var add_otp:any={};//={"mobile":"","otp":"","status":0};
            add_otp.mobile=mobile;
            add_otp.otp=otp;
            add_otp.status=1;
            const update=await models.gmsOtp.update({"status":0},{
                where:{
                    mobile:mobile+""
                }
            });
            const insert=await models.gmsOtp.build(add_otp).save();
            return true;
        }catch(error){
            console.log("Error (StoreOTP) : ",error);
            return false;
        }
    }

    async getOTP(mobile,isSend=false){
        try{
            let dateCond=isSend?" and createdAt >= date_sub(Now() ,interval 30 SECOND)":"";
            let data=await models.sequelize1.query("select otp from gmsOtp where mobile="+mobile+" and status=1"+dateCond,
                { type: sequelize.QueryTypes.SELECT});
                
            return data;
        }
        catch(error){
            console.log("Error (GetOTP) : ",error);
            return false;
        }
        
    }

    async getMobileListByDeviceId(deviceId){
        try{
            let data=await models.sequelize1.query("select mobile from gmsUserDevice where deviceId='"+deviceId+"'",
            { type: sequelize.QueryTypes.SELECT});

            let mobileNo= data && data.length > 0 ? data.map((mobilesData)=>mobilesData['mobile']):[];
            return mobileNo;
        }
        catch(error){
            console.log("Error in (getMobileListByDeviceId)",error);
            return false;
        }
    }

    async saveMobileDevice(mobile,deviceId){
        try{
            await models.gmsUserDevice
            .findOne({ where: {deviceId: deviceId, mobile:mobile} })
            .then(async function(obj) {
                if(obj)
                {
                    // update
                    obj.update({mobile:mobile});
                }
                else{
                    //insert
                    models.gmsUserDevice.create({deviceId: deviceId, mobile:mobile});
                }
            });
            return true;
        }
        catch(error){
            console.log("Error in (saveMobileDevice)",error);
            return false;
        }
    }

}

export default new OTP();