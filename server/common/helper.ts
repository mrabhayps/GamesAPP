import {Response} from 'express'
import sequelize from 'sequelize';
import models from '../api/models/index';
import encdec from '../common/encDec.service';
import request from 'request-promise';
//import KafkaProducer from '../kafka/producer';
import crypto from 'crypto';
//import {CacheService} from '../api/cache/cache.service';

import Constant from '../common/app.constant';
import * as secretConfig  from '../common/secret.config.json';
import utilityService from './utility.service';

var config:any=secretConfig;

export class Helper{
    async sendJSON(res:Response,data,error:Boolean,statusCode:number,message:String,recordTotal:Number,isEncrypted=false,errorCode=null){
        
        if(isEncrypted && config.APIWhiteListIP.indexOf(res["IP"])==-1)
            data=await encdec.encryptDecrypt(data,true);
        res.status(statusCode)
            .json({meta:{
                error:error,
                rcv:isEncrypted,
                status:Constant.RESP_MSG[statusCode],
                statusCode:statusCode,
                message:message,
                recordTotal:recordTotal,
                errorCode:errorCode
                },
                data:data
            });
    }

    async getColValue(model:string,cols:string,where:object){
        try{
            let data=await models[model].findAll({
                attributes:[cols],
                where:where,
                raw:true
            })
            return data && data.length>0?data[0][cols]:[];
        }
        catch(error){
            console.log("Error : "+error)
            return false;
        }
    }

    async getColsValue(model:string,cols:Array<string>,where:object){
        try{
            let data=await models[model].findAll({
                attributes:cols,
                where:where,
                raw:true
            })
            return data;
        }
        catch(error){
            console.log("Error : "+error)
            return false;
        }
    }
    async getColsValueByOrder(model:string,cols:Array<string>,where:object, order:Array<Array<string>>){
        try{
            let data=await models[model].findAll({
                attributes:cols,
                where:where,
                order: order,
                raw:true
            })
            return data;
        }
        catch(error){
            console.log("Error : "+error)
            return false;
        }
    }
    async getAllColValue(model:string,where:object){
        try{
            let data=await models[model].findAll({
                where:where,
                raw:true
            })
            return data;
        }
        catch(error){
            console.log("Error : "+error)
            return false;
        }
    }
    async getUserDetails(mobile){
        try{
            let data=await models.gmsUsers.findAll({
                where:{
                    mobile:mobile
                },
                raw:true
            })
            return data[0];
        }
        catch(error){
            console.log("Error : "+error)
            return false;
        }
    }

    async getPlayerId(mobile){
        try{
            let data=await models.gmsUsers.findAll({
                attributes: ["id"],
                where:{
                    mobile:mobile
                },
                raw:true
            })
            return data[0]["id"];
        }
        catch(error){
            console.log("Error : "+error)
            return false;
        }
    }

    async generateCustomerRefNum(){
        let size=14;    
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < size; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    async generateVideoRoomNum(){
        let size=6;    
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < size; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    async getIP(IP){
        IP=IP.split(":").join("");
        IP=IP.replace("ffff","");
        return IP;
    }

    async getIpAddress(req){
        try{
            var ip = (req.headers['x-forwarded-for'] || '').split(',').pop().trim() || 
            req.socket.remoteAddress
            return ip;
        }catch(error){
            return null;
        }
    }

    sleep = (milliseconds) => {
        return new Promise(resolve => setTimeout(resolve, milliseconds))
    }

    public async retryGet(url: string, retries = 4, backOff = 150, options?: object): Promise<any> {
        try {
            console.log("retryGet: retry no: " + retries);
            const options = {
                url: url,
                method: "GET",
                headers: {
                    'x-auth-key': process.env.BR_AUTH_KEY,
                },
            };
            const data = await request(options);
            const jsonData = JSON.parse(data);
            if (jsonData && jsonData.status && jsonData.status == "success") {
                return jsonData;
            } else {
                throw new Error("retryGet should try again");
            }
        } catch (err) {
            console.log("Error: " + err);
            if (retries > 0) {
                await this.sleep(backOff);
                return await this.retryGet(url, retries - 1, backOff * 2);
            } else {
                return null;
            }
        }
    }

    public async postRequest(url: string, payload: object): Promise<boolean> {
        try {
            const options = {
                url: url,
                method: "POST",
                body: payload,
                json: true,
                headers: {
                    'x-auth-key': process.env.BR_AUTH_KEY,
                },
            };
            const data = await request(options);
            let jsonData = null;
            if (typeof(data) == "object") {
                jsonData = data;
            } else {
                jsonData = JSON.parse(data);
            }
            if (jsonData && jsonData.status && jsonData.status == "success") {
                return jsonData;
            }
        } catch (err) {
            console.log("Error: " + err);
        }
        return null;
    }

    public async pushToBattleRoomTopic(userDetails, battleId,socketUrl) {
        const battleRoomRequest = {
            battleId: battleId,
            playerId: userDetails.id,
            socketUrl:socketUrl
        }
        console.log("Push to battle room Object : ", battleRoomRequest);
        //await KafkaProducer.publish(process.env.KAFKA_TOPIC_BR, JSON.stringify(battleRoomRequest));
    }

    public async pushToPrivateBattleRoomTopic(userDetails, battleId, roomId, socketUrl) {
        const battleRoomRequest = {
            battleId: battleId,
            playerId: userDetails.id,
            roomdId: roomId,
            socketUrl:socketUrl
        }
        console.log("Push to private battle room Object : ", battleRoomRequest);
        //await KafkaProducer.publish(process.env.KAFKA_TOPIC_PBR, JSON.stringify(battleRoomRequest));
    }

    public async pushToUserLastSeen(userDetails) {
        console.log("Push to user last seen : ",userDetails['id']);
        //KafkaProducer.publish(process.env.KAFKA_TOPIC_ULS, JSON.stringify(userDetails));
    }
    public async pushToUserOnlineStatus(userDetails){
        //const ONLINE_STATUS=await CacheService.getCache(`ONLINE_STATUS_${userDetails['id']}`);
        const ONLINE_STATUS=true;
        
        if(!ONLINE_STATUS || ONLINE_STATUS!==true){
            setTimeout(() => {
                console.log(`User : ${userDetails['id']} Waiting in Queue to maintain first online status.`);
            }, 400);
        }
        console.log(`Managing online status for user : ${userDetails['id']}`);
        //KafkaProducer.publish(process.env.KAFKA_TOPIC_OLS, JSON.stringify(userDetails));
    }

    public async pushToStreaks(userId:number, taskName:string, gameId:number, gameEngine:number, engineId:number) {
        const kafkaMsg = {
            taskName: taskName,
            userId: userId,
            gameId: gameId,
            gameEngine: gameEngine,
            engineId: engineId
        }
        //await KafkaProducer.publish(process.env.KAFKA_TOPIC_STREAK_BLOCK, JSON.stringify(kafkaMsg));
    }

    async allocateGameServer(GameType){
        //These will called at the time of game play.
        try{
            //var GameServer=await JSON.parse(await CacheService.getCache("GameServer"));
            var GameServer=global.GAME_SERVER_IP;


            var IP=null,MinActiveSession=0,index=null;
            if(GameServer && GameServer.length>0){
                console.log("Game Server : ",GameServer);
                console.log("Game Server Length : ",GameServer.length);
                for(var i=0;i<GameServer.length;i++){
                    if(GameServer[i]['GType']==GameType && GameServer[i]['status']==1){
                        if(index==null){
                            IP=GameServer[i]['ip'];
                            MinActiveSession=GameServer[i]['ActiveSession'];
                            index=i;
                        } 
                        else if(GameServer[i]['ActiveSession'] < MinActiveSession){
                            IP=GameServer[i]['ip'];
                            MinActiveSession=GameServer[i]['ActiveSession'];
                            index=i;
                        }
                    }
                }

                //Maintain ActiveSession in Cache.
                if(index!=null){
                    GameServer[index]['ActiveSession']=MinActiveSession+1;
                    //await CacheService.setCache("GameServer",JSON.stringify(GameServer));
                    return IP;
                }
                else{
                    console.log("Unable to find socket URL. Index : "+index);
                    return  false;
                }
            }   
            else{
                console.log("No Game Server Found in Cache !!");
                return false;
            } 
        }
        catch(error){
            console.log("Error in allocateGameSession() ");
            console.log(error);
            return false;
        }
    }

    async releaseGameServer(IP){
        try{
            //var GameServer=await JSON.parse(await CacheService.getCache("GameServer"));
            var GameServer=global.GAME_SERVER_IP;
            for(var i=0;i<GameServer;i++){
                if(GameServer[i]['ip']==IP){
                    //Maintain ActiveSession in Cache.
                    GameServer[i]['ActiveSession']=GameServer[i]['ActiveSession']-1;

                    //await CacheService.setCache("GameServer",JSON.stringify(GameServer));
                    
                    console.log("Game Server : "+IP+ " Release Session , Total : "+GameServer[i]['ActiveSession'])
                    break;
                }
            }
            return true;
        }
        catch(error){
            console.log("Error releaseGameSession() ");
            console.log(error);
            return false;
        }
    }

    async isEmptyVals(val){
        if(val==null || val=="" || !val)
            return true;
        else
            return false;
    }

    async generateOrderId(): Promise<string> {
        return 'GA_' + crypto.randomBytes(3*4).toString('base64').replace(/\//g,'').replace(/=/g,'').replace(/\+/g,'');
    }

    async generatePrivateBattleRoomCacheKey(requestType, userId, friendId, gameId=null, battleId=null): Promise<string> {
        let cacheKey = requestType + ":" + userId + ":" + friendId;
        if (gameId){
            cacheKey +=  ":" + gameId;
        }
        if (battleId){
            cacheKey +=  ":" + battleId;
        }
        return cacheKey;
    }

    getKeybyValue(data,value){
        // console.log("Data : ",data);
        // console.log("Value : ",value);
        return Object.keys(data).find(key=>data[key]==value);
    }
    /**
     * Make Random String
     * @param length 
     */
    async makeRandomString(length: number) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    /*
    Author: Abhay Pratap Singh.
    Purpose : This function basically used verify if value undefiened/null/0.
    Date(YYYY-MM-DD): 2022-09-06
    */

    async validateValue(val:any){
        if(val==0 || val==null || val == undefined)
            return false;
        else
            return true;
    }

     
    changeToDateMonthYear(date:any){
        const year = date.getFullYear();
        const month = ("0"+(date.getMonth()+1)).slice(-2);
        const day = ("0"+date.getDate()).slice(-2);

        const newDate = +([year, month, day].join(''))

        return newDate
    }
    
    allowAlphaNumeric(str:string){
        let strnew=(str.replace(/[^a-z0-9 ]/gi, '')).replace(/  +/g, ' ')
        return strnew
    }

    async gmsUserAccountGet(playerId:number){
        let URL = config.USER_ACCOUNTS['GET_API'];
        let reqBodyData : any = {"playerId":playerId};

        let headers:any={
            "accept": "application/json",
            "Content-Type":"application/json"
        };
        if(config.USER_ACCOUNTS['GET_API_KEY']){
            headers['api-key'] = config.USER_ACCOUNTS['GET_API_KEY']
        }

        let AccountBalance={};
        var UserAccountBalanceGETAPI = {
            "url": URL,
            "method": 'POST',
            "headers": headers,
            "json":reqBodyData
        }
        console.log("GMS User account balance GET AP Request :");
        console.log(UserAccountBalanceGETAPI);
        try{
            let AccountBalanceGETAPIStatus=await new Promise((resolve, reject) => {
                request(UserAccountBalanceGETAPI, async (err, resp, body) => {
                    
                    if(err){
                        console.log(`Error in account balance GET API : `);
                        //console.log(err);
                        reject(false);
                    }
                    else{
                        //body=JSON.parse(body);
                        //body['withdrawBal']=body['withdrawalBal'];
                        console.log(`GMS user account balance GET API Response ${playerId} : `);
                        console.log(body);
                        AccountBalance=body;
                        resolve(true);
                    }
                })
            }); //End of Promise
            return AccountBalance;
        }
        catch(error){
            console.log("Error in API user account balance get API.")
            // console.log(error);
            return AccountBalance;
        }
    }
    async gmsUserAccountCreateOrUpdateWallet(data:any)
    {
        let FinencialUserIds=config['FinencialUserIds'];
        if(FinencialUserIds.indexOf(data['playerId'])>=0){
            console.log("Finencial user can not be loged : ", data);
            return true;
        }

        let URL = config.USER_ACCOUNTS['CREATE_OR_UPDATE_WALLET'];
        let reqBodyData : any = data;
        reqBodyData['addEntry'] =  false;

        if(reqBodyData['from']){
            reqBodyData['from']['source']="NODE_APP_BACKEND_API";
        }
        

        let headers:any={
            "accept": "application/json",
            "Content-Type":"application/json"
        };

        
        const UserAccountBalanceExecuteUpdateAPI = {
            "url": URL,
            "method": 'POST',
            "headers": headers,
            "json":reqBodyData
        }

        let savedata=await this.saveExternalAPICallRequestLog(reqBodyData['playerId'],"CREATE_OR_UPDATE_WALLET",URL,UserAccountBalanceExecuteUpdateAPI);

        if(config.USER_ACCOUNTS['CREATE_OR_UPDATE_WALLET_API_KEY']){
            UserAccountBalanceExecuteUpdateAPI['headers']['api-key'] = config.USER_ACCOUNTS['CREATE_OR_UPDATE_WALLET_API_KEY']
        }

        if(!savedata)
            return false;

        try{
            let AccountBalanceExecuteUpdateAPIStatus=await new Promise((resolve, reject) => {
                request(UserAccountBalanceExecuteUpdateAPI, async (err, resp, body) => {
                    if(err){
                        console.log(`Error in account balance Execute Update API : `);
                        console.log(err);
                        await this.updateExternalAPICallResponseLog(savedata['id'],body,resp.statusCode);
                        reject(false);
                    }
                    else{
                        console.log("User Account Create or update API response : ")
                        console.log(body);
                        await this.updateExternalAPICallResponseLog(savedata['id'],body,resp.statusCode);
                        resolve(true);
                    }
                })
            }); //End of Promise
            return AccountBalanceExecuteUpdateAPIStatus;
        }
        catch(error){
            console.log("Error in API user account balance get API.")
            console.log(error);
            await this.updateExternalAPICallResponseLog(savedata['id'],{"errored":error},Constant.RESP_CODE['Internal Server Error']);
            return false;

        }
    }
    async saveExternalAPICallRequestLog(userId,title:string, api:string, request:any)
    {
        try{
            let preparedSaveData:any={};
            preparedSaveData['fkUserId']=userId;
            preparedSaveData['title']=title;
            preparedSaveData['api']=api;
            preparedSaveData['request']=request;
            preparedSaveData['requestTime']=utilityService.getDateTime();
            let saveData = await models.gmsExternalAPICallLogs.build(preparedSaveData).save();
            
            console.log("External API request log Saved successfully.") ;
            console.log(`Saved data with id : ${saveData.id}`)
            
            return saveData;
        }
        catch(error){
            console.log("Error in saveExternalAPICallRequestLog : ");
            console.log(error);
            return false;
        }
        
    }

    async updateExternalAPICallResponseLog(id:number,responseData:any,httpStatusCode:number)
    {
        try{
            let preparedUpdateData:any={};
            preparedUpdateData['response']=responseData;
            preparedUpdateData['httpStatusCode']=httpStatusCode;
            preparedUpdateData['responseTime']=utilityService.getDateTime();
            const updateData = await models.gmsExternalAPICallLogs.update(preparedUpdateData, {
                where: {
                    id:id
                }
            });
            console.log("Response log updated successfully .");
            return true;

        }
        catch(error){
            console.log("Error in updateExternalAPICallResponseLog : ");
            console.log(error);
            return false;
        }
    }
}

export default new Helper();