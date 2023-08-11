import cors from '../services/cors.service';
import {response} from 'express'
import * as secretConfig  from '../../common/secret.config.json';
var config:any=secretConfig;

export class MSG91{
    async sendOtp(mobile:Number,otp:String){
        //var params="invisible=0&otp="+otp+"&authkey="+config.authkeyMSG91+"&email=&mobile="+mobile+"&template_id="+config.otpTemplateIDMSG91;
        //var path="/api/v5/otp?"+""+params;
        let senderID=config.senderIdMSG91;
        let autoFillHasCode=config.autoFillOTPHasCode;
        var params=encodeURI("route=4&sender="+senderID+"&DLT_TE_ID="+config.msg91_DLT_TE_ID+"&message=<%23> Your Gamesapp login OTP is : "+otp+" (NEVER share your OTP with anyone.) "+autoFillHasCode+"&country=91&mobiles="+mobile+"&authkey="+config.authkeyMSG91);
        var path="/api/sendhttp.php?"+""+params;

        var method='GET';
        var host=config.hostMSG91;
        var port=null;
        var headers={};
        try{
            var data=await cors.getRequest(host,port,path,params,headers);
            //console.log("Data : "+data);
            if(data)
            {
                //console.log(data);
                return true;
            }
                    //Promise.resolve(true);
            else
                return false;   //Promise.reject(false);
        }
        catch(error){
            console.log("Errors : "+error);
            return false;    //Promise.reject(false);
        }

    }

    async sendSMS(mobile:Number, message:String){        
        let params = encodeURI("route=4&sender=GMEAPP&message="+message+"&country=91&mobiles="+mobile+"&authkey="+config.authkeyMSG91);
        let path = "/api/sendhttp.php?"+""+params;        
        
        let method = 'GET';
        let host = config.hostMSG91;
        let port = null;
        let headers = {};
        try{
            let data = await cors.getRequest(host,port,path,params,headers);
            //console.log("Data : "+data);
            if(data)
            {
                //console.log(data);
                return true;
            }else{
                return false; 
            }      
        }catch(error){
            console.log("Errors : " + error);
            return false; 
        }    
    }
}

export default new MSG91();