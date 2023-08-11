import sequelize from 'sequelize';
import models from '../api/models/index';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

import helper from '../common/helper';
import encdec from '../common/encDec.service';
import CommonService from '../api/services/common.service';
import * as secretConfig  from '../common/secret.config.json';

var config:any=secretConfig;
export class Auth{

    async varifyToken(req:Request,res: Response,next){
        console.log(req.path);
        if(config.authExcludeAPIs.indexOf(req.path)>-1){
            return next();
        }
        var token =req.headers['x-auth-key'];
        if(token){ 
            jwt.verify(token, config.authSecretKey, async (err, xData) => {
                if (err) {
                    helper.sendJSON(res,{},true,500,"Invalid Auth access !",0);
                } else {
                    let userData=global.USER_DETAILS['UID_'+xData.id];
                    
                    if(!userData){
                        let data = await models.sequelize.query(
                            `SELECT u.id, u.mobile, u.userName, u.image, u.defaultImage, u.status, ua.sessionId 
                            FROM gmsUsers u, gmsUserAuth ua
                            WHERE u.id=${xData.id} AND u.status=1 AND u.id=ua.fk_userId and ua.status=1`,
                            { type: sequelize.QueryTypes.SELECT });

                        if(data && data.length>0){
                            global.USER_DETAILS['UID_'+xData.id]=data[0];
                            userData=data[0]
                        }
                        else{
                            helper.sendJSON(res,{},true,200,"Either user not exist or user is parmentaly blocked",0);
                            return;
                        }
                    }

                    console.log("Request for user : ",userData)
                    xData.userName = userData?userData.userName:null;
                    xData.image = userData?userData.image:null;
                    xData.defaultImage = userData?userData.defaultImage:null;
                    req.headers.data=xData;

                    if(xData.id && userData && (xData.sessionId==userData.sessionId && userData.status==1)){
                        
                        if(config.OnlineStatusManageAPI.indexOf(req.path)>=0){
                            CommonService.maintainUserOnlineStatus(req.headers.data);
                            CommonService.userLastSeenCommunication(req.headers.data);
                        }

                        let remoteAddreess=req.headers['x-forwarded-for']?req.headers['x-forwarded-for']:await helper.getIP(req.connection.remoteAddress);
                        req["IP"]=remoteAddreess;
                        res["IP"]=remoteAddreess;
                        console.log("Remote IP : ",req['IP']);
                       
                        //Log the API request consumed by admin panel .
                        if(config.APIRequestListFromAdminPanel.indexOf(req.path)>=0){
                            console.log("logging request from admin panel access for :",req.path)
                            let adminPanelLogDetails:any={}
                            adminPanelLogDetails["AdminPanelActivity"]=config.AdminPanelActivity[req.path]
                            adminPanelLogDetails["IPdetails"]=remoteAddreess

                            let saveData=  CommonService.adminPanelIpAddresslog(adminPanelLogDetails)
                            if(saveData){
                                console.log("Sucessfully Log Admin panel request.")
                            }
                            else{
                                console.log("Unable to log admin panel request.")
                            }
                        }

                        if((req.method=="POST" || req.method=="PUT" ) && config.APIWhiteListIP.indexOf(remoteAddreess)==-1 && config.APIWhiteListPath.indexOf(req.path)==-1){
                            req.body=await encdec.encryptDecrypt(req.body.eb,false);
                            try{
                                req.body=JSON.parse(req.body);
                                if(req.body && typeof(req.body)=="object"){
                                    next();
                                }
                                else{
                                    console.log("Authrization Check Error : ENC/DEC Remote Address : "+remoteAddreess+" User : "+JSON.stringify(xData));
                                    helper.sendJSON(res,{},true,440,"Invalid Request ..!!",0); 
                                }
                            }
                            catch(error){
                                console.log("Authrization Check Error Catch: ENC/DEC Remote Address : "+remoteAddreess+" User : "+JSON.stringify(xData));
                                helper.sendJSON(res,{},true,440,"Invalid Request ..!!",0); 
                            }  
                        }
                        else{
                            next();
                        }                        
                    }
                    else{
                        if(!xData.id)
                            console.log("Authrization Check Error : User ID false : "+JSON.stringify(xData));
                        else if(!userData)
                            console.log("Authrization Check Error : User details not exist "+JSON.stringify(xData));
                        else if(userData.status==0)
                            console.log("Authrization Check Error : User Blocked "+JSON.stringify(xData));
                        else if(xData.sessionId!=userData.sessionId)
                            console.log("Authrization Check Error : Session Id Expired "+JSON.stringify(xData));
                        helper.sendJSON(res,{},true,440,"Hey your session has been expired . . . !!",0); 
                    }   
                }
              });
        } 
        else{
            console.log("Authrization Check Error : Un-Authorize Accessed ! ");
            helper.sendJSON(res,{},true,500,"Un-Authorize Access !",0);
        }
    }

    /*static async setApmContext(req:Request) {
        apm.setUserContext({
            id: req.headers.data['id']?req.headers.data['id']:null,
            username: req.headers.data['userName']?req.headers.data['userName']:null,
        });
        apm.setCustomContext({
            mobile: req.headers.data['mobile']?req.headers.data['mobile']:null
        });
    }*/
}

export default new Auth();