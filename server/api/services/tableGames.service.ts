import { Op, Sequelize, QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import models from '../models/index';
import Constant from '../../common/app.constant';
import helper from '../../common/helper';
import MasterPayment from '../services/payment/master.service';
import depositPaymentService from '../services/payment/depositaccount.service';
import emailService from '../../common/services/email.service';
import bonusaccountService from './payment/bonusaccount.service';
import depositaccountService from '../services/payment/depositaccount.service';
import withdrawaccountService from './payment/withdrawaccount.service';

import * as secretConfig from '../../common/secret.config.json';
var config: any = secretConfig;


export class TableGames {
    
    async getTableTypeList(gameId: number, status: number = Constant.TabularGames.TableStatus.ACTIVE, playerId: number=null): Promise<any> {
        let whereCond: any = {
            fkGameId: gameId,
            status: status
        }
        if (playerId && await depositPaymentService.getDepoistsCount(playerId) < 1) {
            whereCond.minEntryFee = {
                [Op.gt]: 10
            }
        }
        try {
            let data: any = await models.gmsTableType.findAll({
                attributes: ['id', 'fkGameId', 'title', 'minEntryFee', 'maxEntryFee', 'minPlayers', 'maxPlayers', 'onePointValue', 'data', 'winningAmount',['totalActivePlayer', 'onlineUsers']],
                where: whereCond
            });
            data = data && data.length > 0 ? data : [];
            return data;
        } catch (error) {
            console.log("Exception > ", error);
            return [];
        }

    }

    
    async getTableGame(tableGameId: number): Promise<any> {
        try {
            const tableGame = await models.gmsTableGame.findOne({
                where: {
                    id: tableGameId,
                    status: Constant.TabularGames.GameStatus.Started
                }
            });
            return tableGame;
        } catch (error) {
            return null;
        }
    }

    
    /*
    Author: Abhay Pratap Singh.
    Purpose : This function basically used to initiate tableGameTrx in todo the first record created.
    Date(YYYY-MM-DD): 2022-09-06
    */
    async insertgmsTableGameInitTrx(data:any) {
        try {
            var insertData=await models.gmsTableGameInitTrx.build(data).save();
            return insertData
        } catch (error) {
            console.log("Error (insertgmsTableGameInitTrx): ", error);
            if(error.message=="Operation timeout" || error.message=="connect ETIMEDOUT")
                return Constant.RESP_CODE.DB_Conn_Timeout_Error;
            else 
                return false;
        }
    }

    /*
    Author: Abhay Pratap Singh.
    Purpose : This function basically used to update tableGameTrx .
    Date(YYYY-MM-DD): 2022-09-06
    */
    async updategmsTableGameInitTrx(data:any,condition:any) {
        try {
            /*let updateData = await models.gmsTableGameInitTrx.update(data, {
                where: condition
            });*/

            //return updateData
        } catch (error) {
            console.log("Error (updategmsTableGameInitTrx): ", error);
            if(error.message=="Operation timeout" || error.message=="connect ETIMEDOUT")
                return Constant.RESP_CODE.DB_Conn_Timeout_Error;
            else 
                return false;;
        }
    }

    /*
    Author: Abhay Pratap Singh.
    Purpose : This function basically used to get tableGameTrx data.
    Date(YYYY-MM-DD): 2022-09-07
    */
    async getgmsTableGameInitTrx(playerId:number, gameTxnId:string) {
        try {
            let data = await models.gmsTableGameInitTrx.findAll({
                where: {
                    fkUserId:playerId,
                    gameTxnId:gameTxnId
                }
            });
            return data && data.length > 0?data[0]['dataValues']:false;
        } catch (error) {
            console.log("Error (getgmsTableGameInitTrx): ", error);
            return false;
        }
    }

    async getTableGameInitTrx(gameTxnId:string) {
        try {
            let data = await models.gmsTableGameInitTrx.findAll({
                where: {
                    gameTxnId:gameTxnId
                }
            });
            return data && data.length > 0?data[0]['dataValues']:false;
        } catch (error) {
            console.log("Error (getTableGameInitTrx): ", error);
            return false;
        }
    }

    async getTableGameInitTrxLog(gameTxnId:string) {
        try {
            let data = await models.gmsTableGameInitTrx.findAll({
                where: {
                    gameTxnId:gameTxnId
                }
            });
            if(data && data.length > 0){
                return data[0]['dataValues'];
            }
            else{
                let data1 = await models.gmsTableGameInitTrxC.findAll({
                    where: {
                        gameTxnId:gameTxnId
                    }
                });
                return data1 && data1.length > 0?data1[0]['dataValues']:false;
            }
            
        } catch (error) {
            console.log("Error (getTableGameInitTrxLog): ", error);
            return false;
        }
    }

    /*
    *   Author: Abhay Pratap Singh
    *   Date: September/2022
    * 
    *   Source of calling this function
    *   1: Init Txn API
    * 
    *   Modification History
    *   1: Abhay Pratap Singh (GA-1068)  10/March/2023
    * 
    */

    async getStuckTableGameInitTrx(playerId:number) {
        try {
            let data=await models.sequelize.query(`SELECT reqLog from gmsTableGameInitTrx
            WHERE fkUserId=${playerId} AND status=${Constant.TABLE_TRX.INIT['TO-DO']}`,
            { type: QueryTypes.SELECT });

            if(data && data.length > 0){
                let reqLog=JSON.parse(data[0]['reqLog']);
                console.log(`User ${playerId} stuck in init txn with todo status in gameId ${reqLog['gameId']}.`);
                return {"isStuck":true,"gameId":reqLog['gameId']};
            }
            else{
                let data=await models.sequelize.query(`SELECT reqLog 
                from gmsTableGameInitTrx i
                WHERE i.gameTxnId NOT IN
                (SELECT e.gameTxnId FROM gmsTableGameEndTrx e WHERE e.fkUserId=${playerId})
                AND i.fkUserId=${playerId} AND i.status=${Constant.TABLE_TRX.INIT.PROCESSED}`,
                { type: QueryTypes.SELECT });
                
                if(data && data.length>0){
                    let reqLog=JSON.parse(data[0]['reqLog']);
                    return {"isStuck":true,"gameId":reqLog['gameId']};
                }
                else{
                    return {"isStuck":false};
                }
            }
            
        } catch (error) {
            if(error.message=="Operation timeout"){
                let data=await models.sequelize.query(`show status where variable_name = 'Threads_connected';`);
                await emailService.SendServerAlertEmail(" Connection Acquire Time Out ",JSON.stringify(data))
            }
            console.log("Error (getStuckTableGameInitTrx): ", error);
            return {"isStuck":true};
        }
    }

    /*
    Author: Abhay Pratap Singh.
    Purpose : This function basically used to initiate tableGameEndTrx in todo the first record created.
    Date(YYYY-MM-DD): 2022-09-07
    */
    async insertgmsTableGameEndTrx(data:any) {
        try {
            var insertData=await models.gmsTableGameEndTrx.build(data).save();
            return insertData
        } catch (error) {
            console.log("Error (insertgmsTableGameEndTrx): ", error);
            if(error.message=="Operation timeout" || error.message=="connect ETIMEDOUT")
                return Constant.RESP_CODE.DB_Conn_Timeout_Error;
            else if(error.parent.code=='ER_DUP_ENTRY')
                return "ER_DUP_ENTRY"
            else 
                return false;
        }
    }

    /*
    Author: Abhay Pratap Singh.
    Purpose : This function basically used to update tableGameEndTrx .
    Date(YYYY-MM-DD): 2022-09-07
    */
    async updategmsTableGameEndTrx(data:any,condition:any) {
        try {
            let updateData = await models.gmsTableGameEndTrx.update(data, {
                where: condition
            });
            return updateData
        } catch (error) {
            console.log("Error (updategmsTableGameEndTrx): ", error);
            if(error.message=="Operation timeout" || error.message=="connect ETIMEDOUT")
                return Constant.RESP_CODE.DB_Conn_Timeout_Error;
            else 
                return false;
        }
    }

    /*
    Author: Abhay Pratap Singh.
    Purpose : This function basically used to get tableGameEndTrx data.
    Date(YYYY-MM-DD): 2022-09-07
    */
    async getgmsTableGameEndTrx(playerId:number, gameTxnId:string) {
        try {
            let data = await models.gmsTableGameEndTrx.findAll({
                where: {
                    playerId:playerId,
                    gameTxnId:gameTxnId
                }
            });
            return data && data.length > 0?data[0]['dataValues']:false;
        } catch (error) {
            console.log("Error (getgmsTableGameEndTrx): ", error);
            return false;
        }
    }

    async restartInitTxn(reqData:any) {
        const { playerId, amt, max,updatedBalance,minReqAmt,autoRefill,maxReqAmt,gameId}=reqData;
        let gameTxnId=null;
        let retData:any={};
        try {
            
            let balPS;

            if(amt <= 0 || (updatedBalance && amt < minReqAmt)){

                if(autoRefill){
                    balPS= await MasterPayment.findPayStrategyCheckUserHasEnoughBalanceGame(playerId,maxReqAmt,max,minReqAmt)        
                }
                else{
                    retData={
                        "data":{},
                        "error":true,
                        "msg":"Insufficient Balance"
                    }
                    return retData
                }
            }
            else{
                balPS= await MasterPayment.findPayStrategyCheckUserHasEnoughBalanceGame(playerId,amt,max)
            }

            if(!balPS['ps']){
                retData={
                    "data":{},
                    "error":true,
                    "msg":"Insufficient Balance",
                    "errorCode":"E003"
                }
                return retData
            }
            else{
                let insertData:any={};
                //insertData.gameTxnId=Date.now();    gameTxnId=insertData.gameTxnId;
                insertData.gameTxnId=uuidv4();
                insertData.fkUserId=playerId;
                insertData.max=max?1:0;
                insertData.preBalance=balPS['totalBalance'];
                insertData.amount=balPS['playedAmount'];
                insertData.status=Constant.TABLE_TRX.INIT['TO-DO'];
                insertData.reqLog=JSON.stringify(reqData);
                insertData.createdAt=new Date();
                let insert=await this.insertgmsTableGameInitTrx(insertData);
                if(!insert || insert==Constant.RESP_CODE.DB_Conn_Timeout_Error){
                    retData={
                        "data":{},
                        "error":true,
                        "msg":!insert?"Failed to initiate txn in restart.":"Connection timeout error ."
                    }
                    return retData
                }

                //Process Txn start here 
                let respData:any={}
                let updateData:any={};
                let condition:any={};

                condition.fkUserId=playerId;
                condition.gameTxnId=insertData.gameTxnId;

                let processedData=await MasterPayment.deductBalanceforGamePlay(playerId,insertData.amount,balPS)
                console.log(`Processed Data for user ${playerId} :`);
                console.log(processedData);

                if(!processedData['isDeducted']){
                    updateData.status=Constant.TABLE_TRX.INIT.FAILED;
                    updateData.deposit=processedData['deposit'];
                    updateData.winning=processedData['winning'];
                    updateData.bonus=processedData['bonus'];

                    respData.gameTxnId=insertData.gameTxnId;
                    respData.max=max;
                    respData.gameBalance=insertData.amount;

                    updateData.respLog={"data": respData, "error":true, "statusCode":Constant.RESP_CODE['Internal Server Error'], "msg":`Unable to deduct player balance in game init restart.`};
                    await this.updategmsTableGameInitTrx(updateData,condition);
                    retData={
                        "data":{},
                        "error":true,
                        "msg":"Unable to deduct player balance in game init restart."
                    }
                    return retData;
                }
                else{
                    updateData.status=Constant.TABLE_TRX.INIT.PROCESSED;
                    updateData.deposit=processedData['deposit'];
                    updateData.winning=processedData['winning'];
                    updateData.bonus=processedData['bonus'];
                    let updatetxn=await this.updategmsTableGameInitTrx(updateData,condition);

                    if(!updatetxn || updatetxn==Constant.RESP_CODE.DB_Conn_Timeout_Error){
                        respData.gameTxnId=insertData.gameTxnId;
                        respData.max=max;
                        respData.gameBalance=insertData.amount;
                        let respLog={"data": JSON.stringify(respData), "error":false, "statusCode":!updatetxn?Constant.RESP_CODE['DB Error']:Constant.RESP_CODE.DB_Conn_Timeout_Error, "msg":`Unable to update processed Txn restart.`};
                        await this.updategmsTableGameInitTrx({"respLog":JSON.stringify(respLog)},condition);
                        retData={
                            "data":respData,
                            "error":true,
                            "msg":!updatetxn?"Unable to update processed Txn restart.":"Connection timeout error ."
                        }   
                        return retData;
                    }
                    else{
                        let from:any={};
                        from['purpose']="TABLE_GAME_RESTART";
                        
                        let updateBalaData=await MasterPayment.updateUserAccountBalance(processedData,playerId, Constant.Payment.trxTypeNew.Debit,from);
                        if(!updateBalaData)
                            console.log("User Account balance not updated")

                        respData.gameTxnId=insertData.gameTxnId;
                        respData.max=max;
                        respData.gameBalance=insertData.amount;
                        respData.preBalance=insertData.preBalance;
                        let respLog={"data": respData, "error":false, "statusCode":Constant.RESP_CODE.Success, "msg":`Txn restart Initiated successfully.`};
                        await this.updategmsTableGameInitTrx({"respLog":JSON.stringify(respLog)},condition);
                        retData={
                            "data":respData,
                            "error":false,
                            "msg":"Txn restart Initiated successfully."
                        }  
                        //commonService.updateUserGamePlayMatrix(playerId,gameId,Constant.USER_GAMEPLAY_GRAPH.PLAY);
                        return retData;
                    }
                }
            }
            
        } catch (error) {
            console.log("Error: initTxn: ", error);
            let respLog={"data": [], "error":true, "statusCode":Constant.RESP_CODE['Internal Server Error'], "msg":`Unable to complete txn .`};
            await this.updategmsTableGameInitTrx({"respLog":JSON.stringify(respLog)},{"fkUserId":playerId,"gameTxnId":gameTxnId});                
            retData={
                "data":[],
                "error":true,
                "msg":"Unable to complete txn ."
            }   
            return retData;
        }
    }

    async getGemsAmt(amount: number) {
        try {
            const maxAmount = Math.floor(amount / 2);
            if (maxAmount <= 0) {
                return 0;
            }
            const winAmount = await this.generateRandomNumber(1, maxAmount);
            return winAmount;
        } catch (error) {
            console.log("Error (getGemsAmt) :  ", error);
            return 0;
        }
    }

    async generateRandomNumber(min: number, max: number) {
            try {
                if (max <= 3)
                    return 1;
                return Math.floor(Math.random() * (max - min) + min);
            } catch (error) {
                console.log("Error (generateRandomNumber) : ", error);
                return 0;
            }
    }
    async isInGame(playerId) {
        try{
            let data : any = await models.sequelize.query(`SELECT gameTxnId,reqLog from gmsTableGameInitTrx t1 WHERE 
            t1.gameTxnId not in (SELECT t2.gameTxnId from gmsTableGameEndTrx t2 
            WHERE  
            t2.fkUserId = ${playerId}) AND t1.fkUserId=${playerId}`,
            { type: QueryTypes.SELECT });

            let retData:any={}

            if(data && data.length > 0){
                let reqLog = JSON.parse(data[0]['reqLog']);
                retData["inGame"]=true;
                retData["gameTypeId"]=reqLog['gameTypeId'];
                if(reqLog['gameId']==config.tableGames['poker']['id']){
                    retData["amount"] = await helper.getColValue("gmsTableType","maxEntryFee",{id:reqLog['gameTypeId']});
                }
                else{
                    retData["amount"]=reqLog['amt'];
                }
                retData["dispMsg"]="You are already in a game in "+Object.keys(config.tableGames).find(key=>config.tableGames[key]['id']==reqLog['gameId'])
                
            }
            else{
                retData["inGame"]=false;
                retData["gameTypeId"]=null;
                retData["amount"]=null;
                retData["dispMsg"]=null;
            }

            return retData;

        }
        catch(error){
            console.log("Error in (isInGame) : ",error);
            return false;
        }
    }

    async refundAmount(endTxnData:any,gameDetailsData:any){
        console.log(gameDetailsData);
        try{
            let prizeDistribution=JSON.parse(endTxnData['distribution']);
            let bunusRefund=true;
            let depositRefund=true;
            let withdrawRefund=true;
            let pgRefNo=endTxnData['gameTxnId']+"/"+gameDetailsData['gameRoundIdGS'];

            if(prizeDistribution['bonus'] > 0){
                bunusRefund= await bonusaccountService.refundPaymentTFG(endTxnData['fkUserId'],pgRefNo,prizeDistribution['bonus'],gameDetailsData['gameId'],gameDetailsData['gameEngine'],gameDetailsData['engineId']);
            }

            if(prizeDistribution['deposit'] > 0){
                depositRefund= await depositaccountService.refundPaymentTFG(endTxnData['fkUserId'],pgRefNo,prizeDistribution['deposit'],gameDetailsData['gameId'],gameDetailsData['gameEngine'],gameDetailsData['engineId']);
            }

            if(prizeDistribution['winning'] > 0){
                withdrawRefund= await withdrawaccountService.refundPaymentTFG(endTxnData['fkUserId'],pgRefNo,prizeDistribution['winning'],gameDetailsData['gameId'],gameDetailsData['gameEngine'],gameDetailsData['engineId']);
            }
            return bunusRefund && depositRefund && withdrawRefund;
        }
        catch(error){
            console.log(`Unable to process refund : ${endTxnData['gameTxnId']}, ${endTxnData['distribution']}`)
            return false;
        }
    }
    async getAllStuckTrxn(){
        try {
            let allStuckTxnList:any= await models.sequelize.query(`
              
                SELECT 
                    t1.gameTxnId,concat(IFNULL(us.userName,''), ' ',IFNULL(us.firstName,'')) as username,
                    t1.amount,t1.createdAt
                FROM 
                    gmsTableGameInitTrx t1
                INNER JOIN     
                    gmsUsers us On t1.fkUserId=us.id  
                WHERE 
                   t1.gameTxnId not in (SELECT t2.gameTxnId from gmsTableGameEndTrx t2)`
                   ,{ type: QueryTypes.SELECT }
            )
            if(allStuckTxnList && allStuckTxnList.length>0){
                return allStuckTxnList
            }
            else{
                return []
            }
            
        } catch (error) {
            console.log("Error in getAllStuckTrxn(TFG): ",error)
            return []
        }
    }
}

export default new TableGames();