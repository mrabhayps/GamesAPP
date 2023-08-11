import { Request, Response } from 'express';
import models from '../models/index';
import helper from '../../common/helper';
import Common from '../services/common.service'
import Constant from '../../common/app.constant';
import User from '../services/user.service';
import * as secretConfig  from '../../common/secret.config.json';
import cors from '../../common/services/cors.service';
import Notifications from '../notifications/notification.service';
import GlobalData from '../../GlobalData';
import commonService from '../services/common.service';
import s3 from '../../common/s3.service';
import fs from 'fs';
import request from 'request';


const Op = models.Sequelize.Op;
var config:any=secretConfig;


export class CommonCtrl{

    async getHomePage(req:Request, res:Response){
        try{
            let userId = req.headers.data['id'];
            let goopl=req.query['goopl']?req.query['goopl']:false;;
            let data = await Common.prepareHomeData(userId,goopl);
            if(!data)
                helper.sendJSON(res, [], true, 502, "We are not able to fetch home page data.", 0);
            else
                helper.sendJSON(res, data, false, 200, "Game Home page banners listed successfully.", data.length);
        }catch(error){
            console.log("Error - getHomePage: ", error);
            helper.sendJSON(res, {}, true, 500, error.message, 0);
        }
    }

    async postContactSync(req:Request,res:Response) {
        const userDetails = req.headers.data;
        try {
            const contactList = JSON.parse(req.body.contactList);
            const userMobile = req.headers.data['mobile'];

            for(var i = 0; i < contactList.length; i++) {
                contactList[i]['userMobile'] = userMobile;
            }
            const alreadySyncedContacts = await Common.getSyncedContacts(userMobile);
            const isSync = await Common.contactSyncPost(contactList);
            if (!isSync) {
                helper.sendJSON(res, contactList[i], true, 502, "DB Error .", 0);
            } else {
                if (alreadySyncedContacts > 0) {
                    console.log("Contacts synced but reward already given previously, so not giving it again this time.");
                    helper.sendJSON(res, [], false, 200, "Contact Synced Successfully, Reward was given earlier.", 0);
                } else {
                    let isRewarded = await User.creditUserRewards(userDetails['id'],"contactPermission");
                    helper.sendJSON(res, [], false, 200, "Contact Synced Successfully .", 0);
                }
            } 
        } catch(error) {
            console.log("Error : "+error);
            helper.sendJSON(res, {}, true, 500, ""+error, 0);
        }
        
    }
    async getAPPConfig(req:Request,res:Response){
        var userAgent=req.headers['user-agent'];
        var resolution="XXXHDPI";
        if(userAgent.includes("ANDROID")){
            var userAgents=userAgent.split(',');
            resolution=userAgents[userAgents.length]; //Resolution will always be at last index
        }
        let data=await helper.getColsValue("gmsGames",["id","name","topColorCode","bottomColorCode"],{"status":1});
        if(data){
            var appConfigData=[];
            var imgPath=Constant.Path.gameicon;
            for(let i=0;i<data.length;i++){
                let configData:any={};
                configData.id=data[i]['id'];
                configData.name=data[i]['name'];
                configData.smallIconImage=imgPath+"/"+data[i]['name']+"/"+data[i]['id']+"_smallicon_"+resolution+".png";
                configData.icon=imgPath+"/"+data[i]['name']+"/"+data[i]['id']+"_icon_"+resolution+".png";
                configData.banner=imgPath+"/"+data[i]['name']+"/"+data[i]['id']+"_banner_"+resolution+".png";
                configData.topColorCode=data[i]['topColorCode'];
                configData.bottomColorCode=data[i]['bottomColorCode'];
                appConfigData.push(configData);
            }
            helper.sendJSON(res,appConfigData,false,200,"Game app config data listed successfully .",0);
        }
        else{
            helper.sendJSON(res,[],true,502,"DB Error .",0);
        }
    }

    async getAppNotification(req:Request,res:Response){
        var userDetails=req.headers.data;
        try{
            var data=await helper.getColsValueByOrder("gmsNotification", ['title','subTitle','image','createdAt'],{"status":1}, [["createdAt","DESC"]]);
            if(!data)
                helper.sendJSON(res,[],true,502,"DB Error .",0);
            else
                helper.sendJSON(res,data,false,200,"Notification data listed successfully",data.length);
            
        }
        catch(error){
            console.log("Error : "+error);
            helper.sendJSON(res,{},true,500,""+error,0);
        }
        
    }
    async getServerStatus(req:Request,res:Response){
        //var userDetails=req.headers.data;
        try{
            var data=await helper.getColValue("gmsAppHistory",'url',{"status":1,"fk_GameId":1,"type":1});
            if(!data)
                helper.sendJSON(res,[],true,502,"DB Error .",0);
            else
                helper.sendJSON(res,data,false,200,"Main app url listed ",data.length);
            
        }
        catch(error){
            console.log("Error : "+error);
            helper.sendJSON(res,{},true,500,""+error,0);
        }
        
    }

    async getHomeBannerList(req:Request,res:Response){
        try{
            var type= +req.query.type;
            if(type==1){
                var data=await helper.getColsValue("gmsBanner",["title","image","ordering"],{"status":1,"type":type});
                if(!data)
                    helper.sendJSON(res,[],true,502,"DB Error .",0);
                else
                    helper.sendJSON(res,data,false,200,"Game Home page banner listed successfully ",data.length);
            }
            else if(type==2){
                var data=await helper.getColsValue("gmsBanner",["title","image","ordering"],{"status":1,"type":type});
                if(!data)
                    helper.sendJSON(res,[],true,502,"DB Error .",0);
                else
                    helper.sendJSON(res,data,false,200,"Cricket Fantacy banner listed successfully ",data.length);
            }
            else{
                helper.sendJSON(res,[],true,202,"Invalid banner type !! ",0);
            }
            
        }
        catch(error){
            console.log("Error : "+error);
            helper.sendJSON(res,{},true,500,""+error,0);
        }
        
    }


    async sendSMSIfServerNotWorking(req:Request,res:Response){
        var userDetails=req.headers.data;
        var mobileNums=req.body.mobile;
        var msg=req.body.msg;
        mobileNums=mobileNums.split(",");
        try{
            //for(var i=0;i<mobileNums.length;i++){
                console.log(mobileNums);
                var params=encodeURI("route=4&sender=GMSAPP&message="+msg+"&country=91&mobiles="+mobileNums+"&authkey="+config.authkeyMSG91);
                var path="/api/sendhttp.php?"+""+params;        
                var method='GET';
                var host=config.hostMSG91;
                var port=null;
                var headers={};
                try{
                    var data=await cors.getRequest(host,port,path,params,headers);
                    console.log(data);
                }
                catch(error){
                    console.log("Errors : "+error);
                    return false;    //Promise.reject(false);
                }
            //}

            helper.sendJSON(res,[],false,200,"SMS sent successfully .",1);
        }
        catch(error){
            console.log("Error : "+error);
            helper.sendJSON(res,{},true,500,""+error,0);
        }
        
    }
    async initializeApp(req:Request, res:Response){
        try{
            let userAgent=req.headers['user-agent'];
            let resolution="XXXHDPI";
            if(userAgent.includes("ANDROID")){
                let userAgents=userAgent.split(',');
                resolution=userAgents[userAgents.length]; //Resolution will always be at last index
            }
            let data:any = {};          
            //Get App Version Data
            let gamesAppVersions = await Common.getAppHistory();
            if(gamesAppVersions && gamesAppVersions.length > 0){
                let gamesList:Array<any> = [];
                for(let i = 0; i < gamesAppVersions.length;  i++){
                    if(gamesAppVersions[i].type == 1){
                        let appConfig:any = {};
                        appConfig.appVersion = gamesAppVersions[i]['version'];
                        appConfig.isForceUpdate = gamesAppVersions[i]['isForceUpdate'];
                        appConfig.url = gamesAppVersions[i]['url'];
                        appConfig.isUpgradeEnable = config.isUpgradeEnable;
                        data.appConfig = appConfig;
                    }else if(gamesAppVersions[i].type == 2){
                        let gamesConfig:any = {};
                        gamesConfig.id = gamesAppVersions[i]['fk_GameId'];
                        gamesConfig.name = gamesAppVersions[i]['name'];
                        gamesConfig.version = gamesAppVersions[i]['version'];           
                        gamesConfig.isForceUpdate = gamesAppVersions[i]['isForceUpdate']; 
                        gamesConfig.url = gamesAppVersions[i]['url'];     
                        gamesList.push(gamesConfig);
                    }     
                }
                data.gamesConfig = gamesList;
                data.popupData=global.HOME_PAGE_POPUP;
                data.blockedState=global.BLOCKED_STATE;
            }
            helper.sendJSON(res, data, false, 200, "Initialized the app successfully.", 1); 
        }catch(error){
            helper.sendJSON(res, [], true, 502, "Sorry! We are not able to initialize the app data.", 0);
        }  
    }

    async registerDevice(req:Request, res:Response){
        try{
            let userDetails:any = req.headers.data;
            let deviceTokenData:any = req.body;
            await Common.registerDeviceToken(userDetails.id, deviceTokenData);
            helper.sendJSON(res, [], false, 200, "Device has been registred successfully.", 0);            
        }catch(error){
            console.log("Error : "+error);
            helper.sendJSON(res, {}, true, 502, error.message, 0);
        }  
    }

    async deRegisterDevice(req:Request, res:Response){
        try{
            let userDetails:any = req.headers.data;
            await Common.deRegisterDeviceToken(userDetails.id);
            helper.sendJSON(res, [], false, 200, "Device Token has been deleted successfully.", 0);            
        }catch(error){
            console.log("Error : "+error);
            helper.sendJSON(res, {}, true, 502, error.message, 0);
        }  
    }

    async sendNotification(req:Request, res:Response){
        try{
            let userDetails:any = req.headers.data;
            
            const notification = {
                title: "Hey! You have a new notification",
                body: "Test message from backend"
            };
            const notificationData:any = {
                "notificationType": "GAMESAPP_NOTIFICATION",
                "message": `Test notification`
            }
            await Notifications.sendPushNotification(userDetails.id, notificationData, notification);
            helper.sendJSON(res, [], false, 200, "Notification sent successfully.", 0);            
        }catch(error){
            console.log("Error : "+error);
            helper.sendJSON(res, {}, true, 502, error.message, 0);
        }  
    }

    async sendDisconnectionLogs(req:Request, res:Response){
        try{
            console.log("Request : " + req.body)
            let userDetails:any = req.headers.data;
            let logsData:any = req.body;
            await Common.storeDisconnectionLogs(userDetails.id, logsData);
            helper.sendJSON(res, [], false, 200, "Store logs successfully!", 0);            
        }catch(error){
            console.log("Error : "+error);
            helper.sendJSON(res, {}, true, 502, error.message, 0);
        }  
    }

    async saveUserSource(req:Request, res:Response){
        try{
            console.log("Request : " + req.body)
            let logsData:any = req.body;
            await Common.storeUserSourceLogs(logsData);
            helper.sendJSON(res, [], false, 200, "Store logs successfully!", 0);            
        }catch(error){
            console.log("Error : "+error);
            helper.sendJSON(res, {}, true, 502, error.message, 0);
        }  
    }

    async resetGlobalData(req:Request, res:Response){
        let gdName=req.body['gdname'];
        try{
            if(gdName=="HOME_PAGE_CARD"){
                await GlobalData.setHomePageCard();
            }
            else if(gdName=="GAMES_APP_HISTORY"){
                await GlobalData.setAppHistory();
            }
            else if(gdName=="GAMES_DETAILS"){
                await GlobalData.setGameData();
            }
            else if(gdName=="GAME_PLAYER_COUNT"){
                await GlobalData.setGamePlayerCount();
            }
            else if(gdName=="POPULAR_GAME"){
                await GlobalData.setPopularGame();
            }
            else if(gdName=="USER_DETAILS"){
                await GlobalData.setUsersDetails();
            }
            else if(gdName=="CREATOR_STATUS_UPDATE_IP"){
                global.CREATOR_STATUS_UPDATE_IP=req['IP'];
            }
            else if(gdName=="HOME_PAGE_POPUP"){
                await GlobalData.setHomePagePopupData();
            }
            else if(gdName=="GAME_LIST"){
                await GlobalData.setGameList();
            }
            else if(gdName=="BATTLE_LIST"){
                await GlobalData.setBattleList();
            }
            else if(gdName=="BLOCKED_STATE"){
                let state=req.body['state'];
                let isPush=req.body['isPush'];
                await GlobalData.setBlockState(state,isPush);
            }
            else if(gdName=="ALL_DATA"){
                console.log("Global field Reset start . . .");
                global.USER_DETAILS={};
                global.UPCOMMING_MATCH=[];
                global.UPCOMMING_MATCH_UT=[]; //Last updated time of data save here (upcomming matches)
                global.LIVE_MATCHES=[];
                global.LIVE_MATCHES_UT=[];//Last updated time of data save here (live matches)
                global.HOME_PAGE_CARD=[]
                global.GAMES_APP_HISTORY=[]
                global.GAMES_DETAILS={}
                global.GAME_PLAYER_COUNT={}
                global.POPULAR_GAME=[]
                global.TABLEFORMATGAME_STATUS=false;
                global.TABLE_HISTORY_TTI={}
                global.TFG_AUTOREFILL={};
                global.TFGP={};
                global.GAME_SERVER_IP=[];
                global.CREATOR_STATUS_UPDATE_IP='NAN';
                global.HOME_PAGE_POPUP=[];
                console.log("Global field Reset complete . . .");
                console.log("Global field Initilization start . . .");
                this.setGlobalVeriable();
                console.log("Global Field Initilization complete ....");
            }
            else{
                console.log("Invalid global data name ",gdName);
                helper.sendJSON(res, [], true, 200, "Invalid Global data name !", 0);
                return;
            }
            helper.sendJSON(res, [], false, 200, "Global data reset Successfully.", 0);
        }catch(error){
            console.log("Error : "+error);
            helper.sendJSON(res, {}, true, 502, error.message, 0);
        }  
    }

    async setGlobalVeriable(){
        console.log("User details Start . . .");
        await GlobalData.setUsersDetails()
        console.log("User details End . . .");
    
        console.log("Upcomming matches Start . . .");
        await GlobalData.setUpcommingMatches();
        console.log("Upcomming matches End . . .");
        
        console.log("Live matches Start . . .");
        await GlobalData.setLiveMatches();
        console.log("Live matches End . . .");
        
        console.log("Table formate game status start. . .");
        global.TABLEFORMATGAME_STATUS=true;
        console.log("Table formate game status End. . .");
    
        console.log("Home page start. . .");
        await GlobalData.setHomePageCard();
        console.log("Home page End. . .");
    
        console.log("App history start. . .");
        await GlobalData.setAppHistory()
        console.log("App history End. . .");
    
        console.log("Game data start. . .");
        await GlobalData.setGameData()
        console.log("Game data End. . .");
    
        console.log("Game player count start. . .");
        await GlobalData.setGamePlayerCount();
        console.log("Game player count  End. . .");
    
    
        console.log("Popular Game start. . .");
        await GlobalData.setPopularGame();
        console.log("Popular Game End. . .");

        console.log("Home page popup data start. . .");
        await GlobalData.setHomePagePopupData();
        console.log("Home page popup end. . .");

        console.log("Game list data start.");
        await GlobalData.setGameList();
        console.log("Game list data end. . .");
    
        console.log("Battle list data start . . .");
        await GlobalData.setBattleList();
        console.log("Battle list data end . . .");
    
        
    }

    async getKYCAPIKey(req:Request, res:Response){
        helper.sendJSON(res, config.KYC_API_KEY, false, 200, "Authc key listed successfully .", 0);
    }

    /*async updateLBInMemory(req:Request, res:Response){
        let userId= req.query.userId;
        let winAmt= req.query.winAmt;
        console.log(`Leaderbord Update API Request for user Id : ${userId} & Win Amt : ${winAmt}`);
        let isUpdated=await commonService.updateLeaderBordData(userId,winAmt);
        if(isUpdated)
            helper.sendJSON(res, {}, false, 200, "Leaderboard updated in memory.", 0);
        else
            helper.sendJSON(res, {}, true, 500, "Unable to update leaderboard in memory.", 0);
    }*/

    async sendPushNotification(req:Request, res:Response){
        let notificationType=req.query.notificationType;
        
        if(notificationType==Constant.PUSH_NOTIFICATION_TYPE.APP_NEW_VERSION){
            let url=req.query.url;
            let msg=req.query.msg;
            let ver:String = (req.query.version).toString();
            let version = ver.replace(/\s/g,"").split(",");
            let sent=0;
            let unsent=0;
            for(let i=0;i<version.length;i++){
                let isSent=await commonService.sendNewAppVersionNotificationToAllUser(url,version[i],msg);
                if(!isSent){
                    unsent++;
                    console.log(`Unable to sent notification for version ${version[i]}`);
                }
                else{
                    sent++;
                    console.log(`Notification sent successfully for version ${version[i]}`);
                }
            }
            
            if(unsent==0)
                helper.sendJSON(res, {}, false, Constant.RESP_CODE['Success'], "Notification sent successfully.", 0);
            else
                helper.sendJSON(res, {}, false, Constant.RESP_CODE['DB Error'], `Notification not sent properly Sent : ${sent}, Unsent : ${unsent}.`, 0);            
        }
        else{
            helper.sendJSON(res, {}, false, Constant.RESP_CODE['Bad Request'], "Invalid Notification Type.", 0);
        }
    }

    async uploadGameAndAPKFile(req,res){
        try {
            const {uploadType,uploadTitle,gameId,version} = req.query;

            const s3Client = s3.s3Client;
            const params = s3.uploadParams;
            
            let fileContent = null
            if (req.uploadFile) {
                fileContent = req.uploadFile.buffer;
            } else {
                fileContent = fs.readFileSync(req.files.uploadFile.path);
            }

            let fileName;
            if(uploadType=="APK FILE"){
                //APK
                fileName = config['APKBucket'] + uploadTitle + "." + req.files.uploadFile.extension;
            }
            else if(uploadType=="GAME FILE"){
                //Game File
                fileName = config['GameBucket'] + uploadTitle + "." + req.files.uploadFile.extension;
            }

            params.Key = fileName;
            params.Body = fileContent;

            await s3Client.upload(params, async (err, data) => {
                if (err) {
                    console.log(err);
                    helper.sendJSON(res, {}, true, 502, "Error", 0);
                } else {
                    console.log(data.Location);
                    if(uploadType=="APK FILE"){
                        //APK
                        let updateData:any={}
                        updateData['version']=version;
                        updateData['downloadLink']=data.Location;

                        let condition:any={}
                        condition['id']=gameId;
                        let isUpdated=await commonService.updateNewAPK(version,data.Location);
                        if(isUpdated){
                            await GlobalData.setAppHistory();
                            helper.sendJSON(res, [], false, 200, "File uploaded And APK updated in system.", 0);                            
                        }
                        else{
                            helper.sendJSON(res, [], false, 200, "File uploaded but APK not updated in system.", 0);
                        }
                    }
                    else if(uploadType=="GAME FILE"){
                        //Game File
                        let updateData:any={}
                        updateData['version']=version;
                        updateData['downloadLink']=data.Location;

                        let condition:any={}
                        condition['id']=+gameId;
                        let isUpdated=await commonService.updateNewGame(updateData,condition);
                        if(isUpdated){
                            await GlobalData.setGameData();
                            await GlobalData.setPopularGame();
                            helper.sendJSON(res, [], false, 200, "File uploaded And game updated in system.", 0);
                        }
                        else{
                            helper.sendJSON(res, [], false, 200, "File uploaded but game not updated in system.", 0);
                        }
                    }
                }
            });
        } catch (error) {
            console.log(error);
            helper.sendJSON(res, {}, true, 502, "Sorry! We are unable to upload file!!", 0);
        }
    }

    async uploadAPKFile(req,res){
        try {
            const {version} = req.query;

            const s3Client = s3.s3Client;
            const params = s3.uploadParams;
            
            let fileContent = null
            if (req.uploadFile) {
                fileContent = req.uploadFile.buffer;
            } else {
                fileContent = fs.readFileSync(req.files.uploadFile.path);
            }

            let extension= req.files.uploadFile.extension
            let uploadTitleRename=`gamesapp_${version}.${extension}`;
            let uploadTitle=`gamesapp.${extension}`;
            let fileName = config['APKBucket'] + uploadTitle;
            


            // Copy old gamesapp.apk & gamesapp.zip 
            // Delete old 
            // Upload new

            console.log("File copy starting . . .")
            let ret=await s3Client.copyObject({
                Bucket: `gamesapp-spaces/${config['APKBucket']}OldApks`, 
                CopySource: `gamesapp-spaces/${config['APKBucket']}${uploadTitle}`, 
                Key: `${uploadTitleRename}`
               })
                .promise()
                .then(async () => {
                    console.log(`File copied to OldApks successfully with name ${uploadTitleRename}`);
                    // Delete the old object
                        await s3Client.deleteObject({
                        Bucket: `gamesapp-spaces/${config['APKBucket']}`,
                        Key: `${uploadTitle}`
                    }).promise()
                        .then(()=>{
                            console.log("Old File deleted successfully");
                        });
                })
                // Error handling is left up to reader
                .catch((e) => {
                    console.error(e)
                    helper.sendJSON(res, {}, true, 502, "Sorry! We are unable to upload file!!", 0);
                    return false;
                });

            console.log("File upload starting . . .");
            params.Key = fileName;
            params.Body = fileContent;
            console.log(`Upload file ${fileName}`);
            await s3Client.upload(params, async (err, data) => {
                if (err) {
                    console.log(err);
                    helper.sendJSON(res, {}, true, 502, "Error", 0);
                } else {
                    console.log(data.Location);
                    //APK
                    if(extension=="zip"){
                        let isUpdated=await commonService.updateNewAPK(version,data.Location);
                        if(isUpdated){
                            await GlobalData.setAppHistory();
                            //Update version in cloud flare.
                            var versionUpdateReq={
                                "url": config.ANDROID_VERSION_UPDATE_API_CF,
                                "method": 'PUT',
                                "headers":{
                                    "content-type":"application/json",
                                },
                                "json":{"appVersion":version}
                            }

                            await new Promise((resolve,reject)=>{
                                let TransactionLogWithdrawUpdate:any={};
                                request(versionUpdateReq, async (err, resp, body) => {
                                    if(err){
                                        console.log("Error in version update : ",err);
                                    }
                                    else{
                                        console.log(`Version updated successfully : ${version}`)
                                    }
                                })
                            })
                            helper.sendJSON(res, [], false, 200, "File uploaded And APK updated in system.", 0);                            
                        }
                        else{
                            helper.sendJSON(res, [], false, 200, "File uploaded but APK not updated in system.", 0);
                        }
                    }
                    else{
                        helper.sendJSON(res, [], false, 200, "APK File uploaded successfully.", 0);
                    }
                    
                }
            });
        } catch (error) {
            console.log(error);
            helper.sendJSON(res, {}, true, 502, "Sorry! We are unable to upload file!!", 0);
        }
    }

    async updateUserAgent(req,res){
        try {
            let userDetails:any = req.headers.data;
            let userAgent=req.headers['user-agent'];
            let existingUserAuthData=await helper.getAllColValue("gmsUserAuth",{"fk_userId":userDetails['id'],"status":1});
            existingUserAuthData=existingUserAuthData[0];
            existingUserAuthData['userAgent']=userAgent;
            delete existingUserAuthData['id'];
            delete existingUserAuthData['createdAt'];

            let data=await User.createUserAuthData(existingUserAuthData,true);
            if(data)
                helper.sendJSON(res, {}, false, 200, "User agents updated Successfully.", 0);
            else
                helper.sendJSON(res, {}, true, 502, "Sorry! We are unable to update userAgents !!", 0);
        } catch (error) {
            console.log("Error in updateUserAgent : ",error);
            helper.sendJSON(res, {}, true, 500, "Sorry! We are unable to update userAgents !!", 0);
        }
    }
    
    async getServerHealthStatus(req,res){
        helper.sendJSON(res,{"serverStatus":config['ServerHealthStatus']},false,200,"Server status get successfully.",0);            
    }


}
export default new CommonCtrl();