import { Request, response, Response } from 'express';
import helper from '../../common/helper';
import TableGamesService from '../services/tableGames.service';
import Constant from '../../common/app.constant';
import MasterPayment from '../services/payment/master.service';
import * as secretConfig from '../../common/secret.config.json';
import UserService from '../services/user.service';
import { v4 as uuidv4 } from 'uuid';
import utilityService from '../../common/utility.service';
import commonService from '../services/common.service';
import request from 'request';


let config: any = secretConfig;


export class TableGamesCtrl {

    async getTableTypeList(req: Request, res: Response) {
        try {
            console.log("Params: ", req.query);
            let gameId: number = null;
            if (req.query.hasOwnProperty("gameId")) {
                gameId = +req.query.gameId;
            } else {
                await helper.sendJSON(res, [], true, 500, "GameId is mandatory for getting table types list! ", 0);
            }
            const data = await TableGamesService.getTableTypeList(gameId, Constant.TabularGames.TableStatus.ACTIVE);
            if (data.length > 0) {
                await helper.sendJSON(res, data, false, 200, "All ACTIVE TableTypes Listed Successfully.", 1);
            } else {
                await helper.sendJSON(res, [], true, 500, "GameId is invalid. Please check it once. ", 0);
            }

        } catch (e) {
            console.log("Error - getTableTypeList: ", e);
            await helper.sendJSON(res, [], true, 500, "Oops! Some error occurred. " + e.message, 0);
        }
    }

   
    /*
    *   Author: Abhay Pratap Singh.
    *   Purpose : This function basically used to deduct the amount from user wallet to play the Game.
    *   Date(YYYY-MM-DD): 2022-09-06
    *
    *   Modification History
    *   1: Abhay Pratap Singh (GA-1068)  10/March/2023
    */
   
    async initTxn(req: Request, res: Response) {
        
        const reqBody=req.body;
        const user = req.headers.data;
        const { playerId, amt, max,autoRefill,gameId,maxReqAmt}=reqBody;
    
        let gameTxnId=null;


        console.log(`Table Game Init Request for Player Id: ${playerId} : `,utilityService.getDateTime());
        try {
            if(!helper.validateValue(playerId)){
                helper.sendJSON(res, [], true, Constant.RESP_CODE['Bad Request'], `Please send valid player .`, 0);
                return;
            }

            if(amt <= 0){
                helper.sendJSON(res, [], true, Constant.RESP_CODE['Bad Request'], `Please enter valid amount .`, 0);
                return;
            }

            let stuckTxn=await TableGamesService.getStuckTableGameInitTrx(playerId);
            if(stuckTxn['isStuck']){
                helper.sendJSON(res, {"gameId":stuckTxn['gameId']}, true, Constant.RESP_CODE['Validation Failed'], `User already initiated the Txn. Wait until it get processed.`, 0,false,"E002");
                return;
            }

            let balPS:any;

            if(autoRefill){
                balPS = await MasterPayment.findPayStrategyCheckUserHasEnoughBalanceGame(playerId,maxReqAmt,max,amt);
            }
            else{
                balPS = await MasterPayment.findPayStrategyCheckUserHasEnoughBalanceGame(playerId,amt,max);
            }
            
            if(!balPS['ps']){
                helper.sendJSON(res, [], true, Constant.RESP_CODE['Validation Failed'], `Please make deposit to play game .`, 0,false,"E003");
            }
            else{
                let insertData:any={};
                //insertData.gameTxnId=Date.now()+Math.floor(1000 + Math.random() * 900000);    gameTxnId=insertData.gameTxnId;
                insertData.gameTxnId=uuidv4(); 
                insertData.fkUserId=playerId;
                insertData.max=max?1:0;
                insertData.preBalance= +Number.parseFloat(balPS['totalBalance']).toFixed(2);
                insertData.amount=balPS['playedAmount'];
                insertData.status=Constant.TABLE_TRX.INIT['TO-DO'];
                insertData.reqLog=JSON.stringify(reqBody);
                insertData.createdAt=new Date();
                let insert=await TableGamesService.insertgmsTableGameInitTrx(insertData);
                if(!insert || insert==Constant.RESP_CODE.DB_Conn_Timeout_Error){
                    helper.sendJSON(res, [], true, !insert?Constant.RESP_CODE['DB Error']:Constant.RESP_CODE.DB_Conn_Timeout_Error, `Failed to initiate txn.`, 0);
                    return;
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

                    updateData.respLog=JSON.stringify({"data": respData, "error":true, "statusCode":Constant.RESP_CODE['Internal Server Error'], "msg":`Unable to deduct player balance.`});
                    await TableGamesService.updategmsTableGameInitTrx(updateData,condition);
                    helper.sendJSON(res, respData, true, Constant.RESP_CODE['Internal Server Error'], `Unable to deduct player balance.`, 0);
                }
                else{
                    updateData.status=Constant.TABLE_TRX.INIT.PROCESSED;
                    updateData.deposit=processedData['deposit'];
                    updateData.winning=processedData['winning'];
                    updateData.bonus=processedData['bonus'];
                    let updatetxn=await TableGamesService.updategmsTableGameInitTrx(updateData,condition);

                    if(!updatetxn || updatetxn==Constant.RESP_CODE.DB_Conn_Timeout_Error){
                        respData.respData.gameTxnId=insertData.gameTxnId;
                        respData.max=max;
                        respData.gameBalance=insertData.amount;
                        respData.preBalance=insertData.preBalance;
                        let respLog={"data": respData, "error":true, "statusCode":!updatetxn?Constant.RESP_CODE['DB Error']:Constant.RESP_CODE.DB_Conn_Timeout_Error, "msg":`Unable to update processed Txn .`};
                        await TableGamesService.updategmsTableGameInitTrx({"respLog":JSON.stringify(respLog)},condition);
                        helper.sendJSON(res, respData, true, !updatetxn?Constant.RESP_CODE['DB Error']:Constant.RESP_CODE.DB_Conn_Timeout_Error, `Unable to update processed Txn. `, 0);
                    }
                    else {
                        let from:any={};
                        from['reason']="TABLE_GAME_INIT";
                        let updateBalaData=await MasterPayment.updateUserAccountBalance(processedData,playerId,Constant.Payment.trxTypeNew.Debit,from)
                        if(!updateBalaData)
                            console.log("User Account balance not updated")

                        respData.gameTxnId=insertData.gameTxnId;
                        respData.max=max;
                        respData.gameBalance=insertData.amount;
                        respData.preBalance=insertData.preBalance;
                        let respLog={"data": respData, "error":false, "statusCode":Constant.RESP_CODE.Success, "msg":`Txn Initiated successfully.`};
                        await TableGamesService.updategmsTableGameInitTrx({"respLog":JSON.stringify(respLog)},condition);
                        console.log(`Table Game Init Response for Player Id: ${playerId} : `,utilityService.getDateTime());

                        //commonService.updateUserGamePlayMatrix(playerId,gameId,Constant.USER_GAMEPLAY_GRAPH.PLAY);
                        helper.sendJSON(res, respData, false, Constant.RESP_CODE.Success, `Txn Initiated successfully.`, 0);
                    }                    
                }
                
            }
            
        } catch (error) {
            console.log("Error: initTxn: ", error);
            let respLog={"data": [], "error":true, "statusCode":Constant.RESP_CODE['Internal Server Error'], "msg":`Unable to complete txn .`};
            await TableGamesService.updategmsTableGameInitTrx({"respLog":JSON.stringify(respLog)},{"fkUserId":playerId,"gameTxnId":gameTxnId});                
            helper.sendJSON(res, [], true, Constant.RESP_CODE['Internal Server Error'], `Unable to complete txn.`, 0);
        }
    }

    /*
    Author: Abhay Pratap Singh.
    Purpose : This function basically used to deduct the amount from user wallet to play the Game.
    Date(YYYY-MM-DD): 2022-09-07
    */
   
    async endTxn(req: Request, res: Response) {
        const reqBody=req.body;
        const user = req.headers.data;
        const { gameTxnId, playerId, result, amt, restart,deductRake,winAmt,gameId,updatedBalance,minReqAmt,autoRefill,maxReqAmt}=reqBody;

        console.log(`Table Game End Request for Txn Id : ${gameTxnId} : `,utilityService.getDateTime());

        try {
            let initGameData=await TableGamesService.getgmsTableGameInitTrx(playerId,gameTxnId);
            if(!initGameData){
                helper.sendJSON(res, [], true, Constant.RESP_CODE['Bad Request'], `Invalid  request data .`, 0);
                return;
            }

            let insertData:any={};
            insertData.gameTxnId=initGameData['gameTxnId'];
            insertData.fkUserId=initGameData['fkUserId'];
            insertData.prevAmount=initGameData['amount'];

            let refundStatus=["refund-nomatch","refund-error","refund-forceclosed","refund-playerleft","refund-waiting","refund-switch","refund-draw"];

            if(result== 'win')
                insertData.delta= amt;
            else if(result== 'lose')
                insertData.delta= -amt;
            else if(refundStatus.indexOf(result)>=0)
                insertData.delta= 0;
            else{
                helper.sendJSON(res, [], true, Constant.RESP_CODE['Bad Request'], `Invalid  result states .`, 0);
                return;
            }

            insertData.newAmount=insertData.prevAmount + insertData.delta;
            insertData.status=Constant.TABLE_TRX.END['TO-DO'];
            insertData.reqLog=JSON.stringify(reqBody);
            insertData.createdAt=new Date();

            let inserted=await TableGamesService.insertgmsTableGameEndTrx(insertData);
            if(!inserted || inserted==Constant.RESP_CODE.DB_Conn_Timeout_Error || inserted == 'ER_DUP_ENTRY'){
                let statusCode=502;
                statusCode=inserted==Constant.RESP_CODE.DB_Conn_Timeout_Error?Constant.RESP_CODE.DB_Conn_Timeout_Error:statusCode;
                helper.sendJSON(res, [], true, statusCode, `Unable to initiate end txn .`, 0,false,inserted=='ER_DUP_ENTRY'?"E001":null);
                return;
            }

            
            let updateData:any={};
            let condition:any={};
            
            let respData:any={};
            respData['oldGameTxnId']=gameTxnId;
            respData['rake']=0;
            respData['win']=0;    

            
            condition.fkUserId=playerId;
            condition.gameTxnId=gameTxnId;

            if(insertData.delta>0){
                //Winning distribution.
                let commissionAmt;

                if(deductRake){
                    if(gameId==config.tableGames.ludo.id)
                        commissionAmt=(config.tableGames.ludo.commission * winAmt)/100;
                    else if (gameId==config.tableGames.rummy.id)
                        commissionAmt=(config.tableGames.rummy.commission * winAmt)/100;
                    else
                        commissionAmt=0;
                }
                else if(deductRake==undefined)
                    commissionAmt=(config.tableGames.default.commission * winAmt)/100;
                else
                    commissionAmt=0;

                commissionAmt= + Number.parseFloat(commissionAmt).toFixed(2);

                updateData.winning=insertData['delta']- commissionAmt;
                
                updateData.winning = + Number.parseFloat(updateData.winning).toFixed(2);
                updateData.deposit=0;
                updateData.bonus=0;
                updateData.distribution={
                                            "deposit":initGameData['deposit'],
                                            "bonus":initGameData['bonus'],
                                            "winning": +Number.parseFloat(initGameData['winning']+updateData.winning).toFixed(2),
                                            "rake":commissionAmt
                                        };
                respData['rake']=commissionAmt
                respData['win']=updateData.winning;

                //global.WIN_PLAYER_LB.push({userId:playerId,amount:updateData.winning});

                let options = {
                    url: `${config.LB_UPDATE_API}?userId=${playerId}&winAmt=${updateData.winning}`,
                    method: "GET",
                    json: true,
                    timeout: 5000
                };
                request(options,
                    async (err, resp, body) => {
                        if (err) {
                            console.log(err);
                        }
                        else{
                            console.log(`TFG LB Updated for user ${playerId}`);
                        }
                    });

                    
                //commonService.updateLeaderBordData(playerId,updateData.winning);
                await commonService.updateUserGamePlayMatrix(playerId,gameId,Constant.USER_GAMEPLAY_GRAPH.PLAY);
                commonService.updateUserGamePlayMatrix(playerId,gameId,Constant.USER_GAMEPLAY_GRAPH.WIN,updateData.winning);
            }
            else if(insertData.delta<0){
                //Looser deduction.
                let deductAmt=amt;
                updateData.distribution={};
                //For Deposit
                if(initGameData['deposit']<=deductAmt){
                    updateData.deposit=-initGameData['deposit']
                    updateData.distribution['deposit']=0;

                    deductAmt=deductAmt-initGameData['deposit'];
                }
                else{
                    updateData.deposit= -deductAmt;
                    updateData.distribution['deposit']= +(initGameData['deposit']-Number(deductAmt)).toFixed(2);

                deductAmt=0;
                }

                //For bonus
                if(initGameData['bonus']<=deductAmt){
                    updateData.bonus=-initGameData['bonus']
                    updateData.distribution['bonus']=0;

                    deductAmt=deductAmt-initGameData['bonus'];
                }
                else{
                    updateData.bonus=-deductAmt
                    updateData.distribution['bonus']= +(initGameData['bonus']-Number(deductAmt)).toFixed(2);

                    deductAmt=0;
                }


                //For winnings
                if(initGameData['winning']<=deductAmt){
                    updateData.winning=-initGameData['winning']
                    updateData.distribution['winning']=0;

                    deductAmt=deductAmt-initGameData['winning'];
                }
                else{
                    updateData.winning=-deductAmt
                    updateData.distribution['winning']= +(initGameData['winning']-Number(deductAmt)).toFixed(2);

                    deductAmt=0;
                }
                await commonService.updateUserGamePlayMatrix(playerId,gameId,Constant.USER_GAMEPLAY_GRAPH.PLAY);
                commonService.updateUserGamePlayMatrix(playerId,gameId,Constant.USER_GAMEPLAY_GRAPH.LOSE);
            }//End of looser block
            else if (insertData.delta==0){
                //Refund
                updateData.winning=0;
                updateData.deposit=0;
                updateData.bonus=0;
                updateData.distribution={
                                            "deposit":initGameData['deposit'],
                                            "bonus":initGameData['bonus'],
                                            "winning":initGameData['winning']
                                        };

                //commonService.updateUserGamePlayMatrix(playerId,gameId,Constant.USER_GAMEPLAY_GRAPH.DRAW);
            }
            let distributedAmt=updateData.distribution;
            updateData.distribution=JSON.stringify(updateData.distribution);
            updateData.finalBalance=  + Number.parseFloat(initGameData['preBalance'] + (updateData.deposit + updateData.bonus + updateData.winning)).toFixed(2);
            updateData.status=Constant.TABLE_TRX.END.PROCESSED;
            console.log("Distribution  : ",updateData);

            respData['finalBalance']=updateData.finalBalance;
            let updated=await TableGamesService.updategmsTableGameEndTrx(updateData,condition);
            if(!updated || updated==Constant.RESP_CODE.DB_Conn_Timeout_Error){
                let respLog={"data": respData, "error":true, "statusCode":!updated?Constant.RESP_CODE['DB Error']:Constant.RESP_CODE.DB_Conn_Timeout_Error, "msg":`Unable to process end txn .`};
                await TableGamesService.updategmsTableGameEndTrx({"respLog":JSON.stringify(respLog)},condition);
                helper.sendJSON(res, respData, true, !updated?Constant.RESP_CODE['DB Error']:Constant.RESP_CODE.DB_Conn_Timeout_Error, `Unable to process end txn .`, 0);    
            }
            else{
                //Update user Account balance
                
                let userGemsAmt=await TableGamesService.getGemsAmt(respData.rake); //User Gems Balance

                /*let userAcBal=await MasterPayment.getUserAccountBalanceForGamePlay(playerId);
                userAcBal['depositBal']=userAcBal['depositBal'] + distributedAmt['deposit'];
                userAcBal['withdrawBal']=userAcBal['withdrawBal'] + distributedAmt['winning'];
                userAcBal['bonusBal']=userAcBal['bonusBal'] + distributedAmt['bonus'];
                userAcBal['referralBal']=userAcBal['referralBal'] + userGemsAmt;*/
                let from:any={};
                from['reason']="TABLE_GAME_END";

                let updateBalaData=await MasterPayment.updateUserAccountBalance(distributedAmt,playerId,Constant.Payment.trxTypeNew.Credit,from);                
                if(!updateBalaData)
                    console.log("User Account balance not updated in Table Game End")
                                
                //Game reinitilize functionality start here.
                if(restart){
                    let restartInitTxnData:any={};
                    
                    restartInitTxnData.playerId=initGameData['fkUserId']
                    let previousReqLog=JSON.parse(initGameData['reqLog']);
                    if(updatedBalance){
                        restartInitTxnData.amt=insertData.delta>0?initGameData['amount'] + updateData.winning : initGameData['amount'] + insertData.delta;
                    }
                    else
                        restartInitTxnData.amt=previousReqLog['amt'];

                    restartInitTxnData.max=initGameData['max']==1?true:false;
                    restartInitTxnData.gameId=previousReqLog['gameId'];
                    restartInitTxnData.gameTypeId=previousReqLog['gameTypeId'];
                    restartInitTxnData.updatedBalance=updatedBalance;
                    restartInitTxnData.minReqAmt=minReqAmt;
                    restartInitTxnData.autoRefill=autoRefill;
                    restartInitTxnData.maxReqAmt=maxReqAmt;
                    restartInitTxnData.endGameReq=reqBody;

                    //let restartData=await this.restartInitTxn(restartInitTxnData);
                    //let restartData={"error":true,"msg":"Unable to call function"};
                    let restartData= await TableGamesService.restartInitTxn(restartInitTxnData);

                    if(!restartData.error){
                        respData['isRestarted']=true;
                        respData['gameTxnId']=restartData['data']['gameTxnId'];
                        respData['gameBalance']=restartData['data']['gameBalance'];
                        respData['max']=restartData['data']['max'];
                        respData['restartMsg']=restartData['msg'];
                        respData['preBalance']=restartData['preBalance'];

                        let respLog={"data": respData, "error":false, "statusCode":Constant.RESP_CODE.Success, "msg":`Processed successfully the game end txn .`};
                        await TableGamesService.updategmsTableGameEndTrx({"respLog":JSON.stringify(respLog)},condition);
                        console.log(`Table Game End Response restart for Txn Id : ${gameTxnId} : `,utilityService.getDateTime());
                        helper.sendJSON(res, respData, false, Constant.RESP_CODE.Success, `Processed successfully the game end txn and restarted the Game.`, 0);    
                    }
                    else{
                        respData['isRestarted']=false;
                        respData['restartMsg']=restartData['msg'];
                        let respLog={"data": respData, "error":false, "statusCode":Constant.RESP_CODE.Success, "msg":`Processed successfully but failed to restart game.`,"errorCode":restartData['errorCode']};
                        await TableGamesService.updategmsTableGameEndTrx({"respLog":JSON.stringify(respLog)},condition);
                        helper.sendJSON(res, respData, false, Constant.RESP_CODE.Success, `Processed successfully but failed to restart game.`, 0,false,restartData['errorCode']?restartData['errorCode']:null);
                    }
                    
                }
                else{
                    let respLog={"data": respData, "error":false, "statusCode":Constant.RESP_CODE.Success, "msg":`Processed successfully the game end txn .`};
                    await TableGamesService.updategmsTableGameEndTrx({"respLog":JSON.stringify(respLog)},condition);
                    console.log(`Table Game End Response for Txn Id : ${gameTxnId} : `,utilityService.getDateTime());
                    helper.sendJSON(res, respData, false, Constant.RESP_CODE.Success, `Processed successfully the game end txn .`, 0);    
                }
                
            }
        } catch (error) {
            console.log("Error: endTxn: ", error);
            let respLog={"data": [], "error":true, "statusCode":Constant.RESP_CODE['Internal Server Error'], "msg":`Unable to complete game end txn .`};
            await TableGamesService.updategmsTableGameEndTrx({"respLog":JSON.stringify(respLog)},{"fkUserId":playerId,"gameTxnId":gameTxnId});                
            helper.sendJSON(res, [], true, Constant.RESP_CODE['Internal Server Error'], `Unable to complete game end txn .`, 0);
        }
    }

    async inGame(req: Request, res: Response) {
        const userDetails = req.headers.data;
        let isInGameData=await TableGamesService.isInGame(userDetails['id']);
        if(isInGameData){
            helper.sendJSON(res, isInGameData, false, 200, `Request completed successfully.`, 0);
        }
        else{
            helper.sendJSON(res, {}, true, Constant.RESP_CODE['Internal Server Error'], `Unable to complete Request.`, 0);
        }
    }

    async refundTxn(req: Request, res: Response) {
        console.log(`TFG Refund req data : ${JSON.stringify(req.body)}`);
        const {gameTxnId, secretKey} = req.body;

        try{
            if(secretKey != config.TFG_REFUND_API_SECRET){
                console.log("TFG Refund API Secret did not matched !!");
                helper.sendJSON(res, {}, true, Constant.RESP_CODE['Unauthorized Request'], `Access Denied !!`, 0);
                return;
            }

            let initGameData=await TableGamesService.getTableGameInitTrxLog(gameTxnId);
            if(!initGameData){
                console.log(`No record found in our system for txn Id : ${gameTxnId} `);
                helper.sendJSON(res, {}, true, Constant.RESP_CODE['Bad Request'], `Invalid request parameter !!`, 0);
                return;
            }
            else{
                let deposit=initGameData['deposit'];
                let winning=initGameData['winning'];
                let bonus=initGameData['bonus'];
                let fkUserId=initGameData['fkUserId'];
                let reqLog=JSON.parse(initGameData['reqLog']);

                let gameData:any={}
                gameData['gameId']=reqLog['gameId'];
                gameData['gameEngine']=Constant.GameEngine.TableFormatGame;
                gameData['gameRoundIdGS']=reqLog['gameRoundIdGS']?reqLog['gameRoundIdGS'] : reqLog['endGameReq']['gameRoundIdGS'];
                gameData['engineId']=reqLog['gameTypeId'];

                let insertData:any={};
                insertData.gameTxnId=gameTxnId;
                insertData.fkUserId=fkUserId;
                insertData.prevAmount=0;
                insertData.delta=0;
                insertData.newAmount=0;
                insertData.finalBalance=0;
                insertData.deposit=0;
                insertData.winning=0;
                insertData.bonus=0;
                insertData.distribution=JSON.stringify({"deposit":deposit,"bonus":bonus,"winning":winning});
                insertData.status=10;
                
                insertData.reqLog=JSON.stringify(initGameData['reqLog']);
                
                let isInserted=await TableGamesService.insertgmsTableGameEndTrx(insertData);
                if(!isInserted || isInserted==Constant.RESP_CODE.DB_Conn_Timeout_Error){
                    console.log(`Unable to initiate TFG END data : ${JSON.stringify(insertData)}`);
                    helper.sendJSON(res, {}, true, Constant.RESP_CODE['DB Error'], `Unable to process the request !!`, 0);
                    return;
                }
                else if(isInserted=="ER_DUP_ENTRY"){
                    console.log(`Trying for duplicate refund : ${JSON.stringify(insertData)}`);
                    helper.sendJSON(res, {}, false, Constant.RESP_CODE['Success'], `Txn was already completed.`, 0);
                    return;
                }
                else{
                    //Make Payment
                    let isRefunded = await TableGamesService.refundAmount(insertData,gameData);
                    if(isRefunded){
                        let updateData:any={};
                        updateData.status=20;
                        updateData.respLog=JSON.stringify({"code":"REFUND","message":"Refund TFG BY APIOF STUCK TXN"});
                        await TableGamesService.updategmsTableGameEndTrx(updateData,{"gameTxnId":gameTxnId});
                        helper.sendJSON(res, {}, false, Constant.RESP_CODE['Success'], `Txn refunded successfully .`, 0);
                        
                    }
                    else{
                        let updateData:any={};
                        updateData.respLog=JSON.stringify({"code":"REFUND_FAILED","message":"Unable to refund TFG BY APIOF STUCK TXN"});
                        console.log(`TFG Refund API failed : ${gameTxnId}`);
                        await TableGamesService.updategmsTableGameEndTrx(updateData,{"gameTxnId":gameTxnId});
                        helper.sendJSON(res, {}, true, Constant.RESP_CODE['Success'], `Txn refunded Failed !!`, 0);
                    }
                        
                }
            }
        }
        catch(error){
            console.log("Error in (refundTxn) : ");
            console.log(error);
        }
        
    }
    
    async getTfgStuckTrxnList(req: Request, res: Response){
        try {
            let allStuckTxnList=await TableGamesService.getAllStuckTrxn()
            if(allStuckTxnList && allStuckTxnList.length>0){
             helper.sendJSON(res,allStuckTxnList,false,Constant.RESP_CODE["Success"],"Stuck txn listed successfully .",allStuckTxnList.length)
            }
            else{
             helper.sendJSON(res,[],false,Constant.RESP_CODE["Success"],"No stuck Transaction found for TFG",0)
            }
         
        } 
        catch (error) {
             console.log("Error",error)
             helper.sendJSON(res, [], true,Constant.RESP_CODE["Internal Server Error"] ,"Unable to get stuck Txn list !!", 0);
        }   
    }
}
export default new TableGamesCtrl();
