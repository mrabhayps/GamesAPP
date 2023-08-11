import { Request, Response } from 'express';
import msg91 from '../../common/services/msg91.service'
import otps from '../services/otp.service';
import helper from '../../common/helper';
import jwt from 'jsonwebtoken';
import User from './../services/user.service';
import friends from './../services/friends.service';
import * as secretConfig  from '../../common/secret.config.json';
import Constant from '../../common/app.constant';
import encdec from '../../common/encDec.service'
import request from 'request';
var config:any=secretConfig;

export class OTPCtrl{
    async sendOTP(req:Request, res:Response){
        /*
            Purpose : Sending The OTP to user mobile no.
            Process :
                1- Generate The 4-digit OTP
                2- Store the OTP with mobile No 
                3- Send the OTP to User mobile
        */
        var remoteAddreess=req["IP"]
        var er=req.headers["user-agent"];

        //This check secure the API from Anonymous call. (Main: IP & Encryption)
        if(config.APIWhiteListIP.indexOf(remoteAddreess)==-1){
            er=await encdec.encryptDecrypt(req.headers.er,false);
            if(!er){
                helper.sendJSON(res,{},false,200,"Invalid Send OTP Request Data ..!!",1);
                return;
            }
        }
        
        var userDetails=req.headers.data;
        var userAgent=req.headers["user-agent"];
        
        //We secure this API by calling with specific User token.
        if(userDetails['id']==config.OtpUser && er==userAgent){
            var mobile:Number=req.body.mobile;
            var userData=await helper.getColsValue("gmsUsers",["status"],{"mobile":mobile});
            if(userData && userData.length>0 && userData[0]['status']==0){
                //User blocking check. If user are block then can't send otp.
                helper.sendJSON(res,{},true,201,"User has been blocked !!",1);
            }
            else{
                //Here for some specfic mobile num. we dont send OTP user can login by input any thing.
                if(config.OTP_BYPASS_MOBILE.indexOf(mobile)>=0){
                    helper.sendJSON(res,{},false,200,"By Pass mobile number. OTP send success.",1);
                    return;
                }

                //Main Process start here.
                var otp:String=otps.generateOTP();
                let data =await otps.getOTP(mobile,true);

                //This check is any OTP already sent by user within specific interval of time.
                if(data && data.length>0){
                    helper.sendJSON(res,{},false,200,"OTP already has been sent successfully.",1);
                    return;
                }
                else{
                    if(!data){
                        helper.sendJSON(res,{},true,502,"DB Error !",0);
                        return;
                    }
                    else{
                        var isStored=await otps.storeOTP(mobile,otp);
                        if(isStored){
                            var isSend=await msg91.sendOtp(mobile,otp);
                            if(isSend){
                                console.log("OTP Stored and send successfully.", mobile);
                                helper.sendJSON(res,{},false,200,"OTP Send Successfully",1);
                            }
                            else{
                                console.log("OTP stored but unable to send successfully !!",mobile);
                                helper.sendJSON(res,{},true,500,"Unable to send OTP !!",1);
                            }
                        }
                        else{
                            helper.sendJSON(res,{},true,502,"Unable to store OTP !!",0);
                        } 
                    }
                }
            }
        }
        else{
            if(er!=userAgent)
                console.log("User Agent not matched in send otp");
            else    
                console.log("OTP Authorize token authentication are invalid !! ");

            helper.sendJSON(res,{},true,200,"Access Denied !!",1); 
        }
    }//End of send OTP

    
    async validateOTP(req:Request, res:Response){
        /*
            Purpose : Validating The OTP to user mobile no.
            Process :
                1- Get the OTP Stored In DB
                2- Match Stored OTP with Incomming OTP  
                3- IF matched
                   a- IF new user then register and goto Home
                   b- IF existing user then goto home
        */

        var remoteAddreess=req["IP"];
        var er=req.headers["user-agent"];
        if(config.APIWhiteListIP.indexOf(remoteAddreess)==-1){
            er=await encdec.encryptDecrypt(req.headers.er,false);
            if(!er){
                helper.sendJSON(res,{},false,200,"Invalid Validate OTP Request Data ..!!",1);
            }
        }
        
        var userDetails=req.headers.data;
        var userAgent=req.headers["user-agent"];
 
        if(userDetails['id']==config.OtpUser && er==userAgent){
            try{
                let otp:String=req.body.otp;
                let mobile:Number=req.body.mobile;
                let whatsAppId:string = req.body.whatsAppId;
                let firstName=null;
                let middleName=null;
                let lastName=null;
                
                let authOTP;
                if(!whatsAppId){
                    authOTP=await otps.getOTP(mobile);
                }
                else if (whatsAppId){
                    //Make WhatsAPP API Call
                    let postBody:any={};
                    postBody.waId=whatsAppId;
                    
                    let whatsAPPRequest={
                        "url": config.WHATSAPP.API,
                        "method": 'POST',
                        "headers":{
                            "content-type":"application/json",
                            "clientId":config.WHATSAPP.clientId,
                            "clientSecret":config.WHATSAPP.clientSecret
                        },
                        "json":postBody
                    }

                    let APIStatus = await new Promise((resolve,reject)=>{
                        request(whatsAPPRequest, async (err, resp, body) => {
                            if(err){
                                console.log(err);
                                helper.sendJSON(res,{},true,Constant.RESP_CODE['Failed Dependency'],"Unable to get WA user details.",1);
                                reject (false);
                            }
                            else{
                                console.log(body);
                                if(body['ok']==true){
                                    mobile=body['user']['waNumber'].substring(2);
                                    let Name=body['user']['waName'];
                                    console.log("name comming from whatsapp :",Name)
                                    let newName=(helper.allowAlphaNumeric(Name)).split(/ (.*)/)
                                    console.log("name will save in database : ",newName)

                                    if(newName.length>=2){
                                        firstName=newName[0].trim()
                                        lastName=newName[1].trim()
                                    }
                                    else{
                                        firstName=newName[0].trim()
                                    }
                                    resolve(true)
                                }
                                else{
                                    helper.sendJSON(res,{},true,Constant.RESP_CODE['Failed Dependency'],"WA ID Expired.",1);
                                    reject(false);
                                }
                            }
                        });
                    }) 
                    if(!APIStatus || !mobile){
                        helper.sendJSON(res,{},true,Constant.RESP_CODE['Failed Dependency'],"WA ID Or mobile number not valid.",1);
                        return;
                    }
                }//End of WA API else block
                else{
                    helper.sendJSON(res,{},true,Constant.RESP_CODE['Bad Request'],"Enter valid details.",0);
                    return;
                }
                
                if((authOTP && authOTP.length>0 && authOTP[0]['otp']==otp) || (config.OTP_BYPASS_MOBILE.indexOf(mobile) >= 0) || whatsAppId){
                    var UUID = req.headers['uuid'];

                    let mobileNo = await otps.getMobileListByDeviceId(UUID);
                    if(!mobileNo || (mobileNo.length >= 3 && mobileNo.indexOf(mobile) < 0)){
                        helper.sendJSON(res,{},true,Constant.RESP_CODE['Validation Failed'],"You have reached to your limit of using three different number in this device",0);
                        return;
                    }

                    await otps.saveMobileDevice(mobile,UUID)
                    //Save/Update sessionID,APPIP and uuid
                    let sessionId=await otps.makeSessionId(10);
                    var APPIP = await helper.getIpAddress(req);
    
                    //Check Is Number Registered or Not
                    let userData=await User.getUserDetails(mobile);
                    let isRegistered=true;
                    if(!userData || userData.length==0){
                        //Register the mobile Number.
                        userData=await User.onBoardUser({"mobile":mobile,"firstName":firstName});
                        isRegistered=false;
                    }
                    else if(whatsAppId){
                        await User.updateUser(userData[0]['id'],{"firstName":firstName,"middleName":middleName,"lastName":lastName});
                    }
                    //console.log("Validate User details : ",userData);
                    if(isRegistered)
                        userData=userData[0];
                    else
                        userData=userData['dataValues'];

                    /*if(await helper.isEmptyVals(userData['firstName']) || await helper.isEmptyVals(userData['email']) 
                    || await helper.isEmptyVals(userData['gender']) || await helper.isEmptyVals(userData['image'])){
                        isRegistered=false;
                    }
                    else
                        isRegistered=true;*/

                    if (!userData.status || userData.status==0){
                        helper.sendJSON(res,{},true,200,"User has been blocked !!",1); 
                    }else{
                        // var playerId=await helper.getPlayerId(mobile);
                        let xAuthKey = jwt.sign({id:userData.id,mobile:mobile,sessionId:sessionId}, config.authSecretKey);  
                        var userAgent=req.headers['user-agent'];
                        let data=await User.createUserAuthData({
                            "fkUserId": userData.id,
                            "token":xAuthKey,
                            "userAgent":userAgent,
                            "sessionId":sessionId,
                            "appUuid":UUID,
                            "appIp":APPIP,
                            "status":1,
                            "whatsAppId":whatsAppId
                        });
                        
                        let preparedData={};
                
                        
                        preparedData['id']=userData.id;
                        preparedData['userName']=userData.userName;
                        preparedData['mobile']=userData.mobile;
                        preparedData['image']=userData.image;
                        preparedData['defaultImage']=userData.defaultImage;
                        preparedData['status']=userData.status;
                        preparedData['sessionId']=sessionId;
                        preparedData['whatsAppId']=whatsAppId;

                        global.USER_DETAILS['UID_'+userData.id]=preparedData;

                        if('friendId' in req.body && req.body.friendId !=null && req.body.friendId != ''){
                            friends.createFriendRequest(req.body.friendId, userData.id, Constant.FriendRequestStatus.Accepted)
                        }
                        if (!data){
                            helper.sendJSON(res,{}, true, 502, "Session Storage Error . .!",1)
                        }else{
                            helper.sendJSON(res,{"x-auth-key":xAuthKey, "isRegistered":isRegistered}, false, 200, "Authentication Success .", 1);     
                        } 
                    }                   
                }
                else{
                    helper.sendJSON(res,{},true,200,"You have entered invalid OTP, Authentication Failed !!",0);
                }  
            }
            catch(error){
                console.log("Error : "+error);
            }
        }
        else{
            if(er!=userAgent)
                console.log("User Agent not matched in send otp");
            else    
                console.log("OTP Authorize token authentication are invalid !! ");

            helper.sendJSON(res,{},true,200,"Access Denied !!",1); 
        }     
    }//End of validate OTP
}

export default new OTPCtrl();