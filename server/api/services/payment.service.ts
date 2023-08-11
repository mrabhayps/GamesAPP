import sequelize from 'sequelize';
import models, { sequelize1 } from '../models/index';
import helper from '../../common/helper';
import { stat } from 'fs';
import Constant  from '../../common/app.constant';
import request from 'request';
import * as secretConfig  from '../../common/secret.config.json';

var config:any=secretConfig;

export class Payment{

    // taken to helper 
    async getClosingBalanceDeposit(userId){
        return 0;
    }
    // taken to helper 
    async getClosingBalanceWithdraw(userId){
        return 0;
    }

    // taken to deposit 
    async insertTransactionDepositLog(data){
        /*data.senderAcNum=await helper.getColValue("gmsUserAccount","id",{"fkUserId":data.fkSenderId,"acType":Constant.Payment.AccType.Deposit});
        data.receiverAcNum=await helper.getColValue("gmsUserAccount","id",{"fkUserId":data.fkReceiverId,"acType":Constant.Payment.AccType.Deposit});
        var senderId=data.fkSenderId;
        var receiverId=data.fkReceiverId;
        if(!data.senderAcNum || data.senderAcNum==''){
            let senderAcData=await models.sequelize1.query("select id from gmsUserAccount where fkUserId="+senderId+" and acType="+Constant.Payment.AccType.Deposit,{ type: sequelize.QueryTypes.SELECT});
            data.senderAcNum=senderAcData && senderAcData.length>0?senderAcData[0]['id']:0;
        }
        if(!data.receiverAcNum || data.receiverAcNum==''){
            let receiverAcData=await models.sequelize1.query("select id from gmsUserAccount where fkUserId="+receiverId+" and acType="+Constant.Payment.AccType.Deposit,{ type: sequelize.QueryTypes.SELECT});
            data.receiverAcNum=receiverAcData && receiverAcData.length>0?receiverAcData[0]['id']:0;

        }*/

        
        data.senderAcNum=await this.getUserAccountNum(data.fkSenderId);
        data.receiverAcNum=await this.getUserAccountNum(data.fkReceiverId);
        

        try{
            const insert=await models.gmsPaymentTransactionLogDeposit.build(data).save();
            return insert;
        }
        catch(error){
            console.log("Error (InsertTransactionDepositLog) : ",error);
            return false;
        }
    }

    async getUserAccountNum(userId:number) {
        try{
            /*let data=await models.gmsUserAccounts.findAll({
                attributes:["id"],
                where:{"fkUserId":userId},
                raw:true
            })*/
            /*let data=await models.sequelize1.query(`select id from gmsUserAccounts where fkUserId=${userId}`,{ type: sequelize.QueryTypes.SELECT});*/
            //return data && data.length>0?data[0]["id"]:null;
            return userId;
        }
        catch(error){
            console.log("Error (getUserAccountNum) : ",error);
            return null;
        }
    }
    // taken to deposit 
    async updateTransactionDepositLog(data, cond) {
        try{
            return await models.gmsPaymentTransactionLogDeposit.update(data, {
                where:cond
            });
        } catch(error) {
            console.log("Error (UpdateTransactionDepositLog) : ", error);
            return false;
        }
    }

    // taken to withdraw 
    async insertTransactionWithdrawLog(data){
        /*data.senderAcNum=await helper.getColValue("gmsUserAccount","id",{"fkUserId":data.fkSenderId,"acType":Constant.Payment.AccType.Withdraw});
        data.receiverAcNum=await helper.getColValue("gmsUserAccount","id",{"fkUserId":data.fkReceiverId,"acType":Constant.Payment.AccType.Withdraw});*/
        
        
        data.senderAcNum=await this.getUserAccountNum(data.fkSenderId);
        data.receiverAcNum=await this.getUserAccountNum(data.fkReceiverId);
        

        try{
            const insert=await models.gmsPaymentTransactionLogWithdraw.build(data).save();
            return insert;
        }
        catch(error){
            console.log("Error (InsertTransactionWithdrawLog) : ",error);
            return false;
        }
    }

    // taken to withdraw 
    async updateTransactionWithdrawLog(data,cond){
        try{
            const update=await models.gmsPaymentTransactionLogWithdraw.update(data,{
                where:cond
            });
            return update;
        }
        catch(error){
            console.log("Error (UpdateTransactionWithdrawLog) : ",error);
            return false;
        }
    }

    // taken to token 
    async insertTransactionTokenLog(data){
        /*data.senderAcNum=await helper.getColValue("gmsUserAccount","id",{"fkUserId":data.fkSenderId,"acType":Constant.Payment.AccType.Token});
        data.receiverAcNum=await helper.getColValue("gmsUserAccount","id",{"fkUserId":data.fkReceiverId,"acType":Constant.Payment.AccType.Token});
        var senderId=data.fkSenderId;
        var receiverId=data.fkReceiverId;
        if(!data.senderAcNum || data.senderAcNum==''){
            let senderAcData=await models.sequelize1.query("select id from gmsUserAccount where fkUserId="+senderId+" and acType="+Constant.Payment.AccType.Token,{ type: sequelize.QueryTypes.SELECT});
            data.senderAcNum=senderAcData && senderAcData.length>0?senderAcData[0]['id']:0;
        }
        
        if(!data.receiverAcNum || data.receiverAcNum==''){
            let receiverAcData=await models.sequelize1.query("select id from gmsUserAccount where fkUserId="+receiverId+" and acType="+Constant.Payment.AccType.Token,{ type: sequelize.QueryTypes.SELECT});
            data.receiverAcNum=receiverAcData && receiverAcData.length>0?receiverAcData[0]['id']:0;
        }*/

        
        data.senderAcNum=await this.getUserAccountNum(data.fkSenderId);
        data.receiverAcNum=await this.getUserAccountNum(data.fkReceiverId);
        

        try{
            const insert=await models.gmsPaymentTransactionLogToken.build(data).save();
            return insert;
        }
        catch(error){
            console.log("Error (InsertTransactionTokenLog) : ",error);
            return false;
        }
    }

    // taken to payment helper 
    async getUserAccountBal(userId,acType){
        try{
            
            /*let data=await models.sequelize1.query("select balance from gmsUserAccount where fkUserId="+userId+" and acType="+acType,{ type: sequelize.QueryTypes.SELECT});
            return +data[0]['balance'];*/
            let balField=Constant.Payment.BAL_KEY[acType];
            
            /*
            let data=await models.sequelize1.query(
                `select ${balField} as balance from gmsUserAccounts where fkUserId=${userId}`,
                { type: sequelize.QueryTypes.SELECT});
            
            return +data[0][balField];
            */

            let data = await helper.gmsUserAccountGet(userId);
            return +data[balField];
            
        }
        catch(error){
            console.log("Error (GetUserAccountBal) : ",error);
            return 0;
        }
    }

    // taken to payment helper 
    async getUserTotalAccountBalance(userId:number){
        try{
            let depositAmount = await this.getUserAccountBal(userId, Constant.Payment.AccType.Deposit);
            let withdraAmount = await this.getUserAccountBal(userId, Constant.Payment.AccType.Withdraw);
            return depositAmount + withdraAmount;     
        }
        catch(error){
            console.log("Error (getUserTotalAccountBalance) : ",error);
            return 0;
        }
    }

    // taken to payment helper 
    async updateUserAccountBal(balance,condition){
        try{
            let update=await models.gmsUserAccount.update({"balance":balance},{
                where:condition
            });
            return update;
        }
        catch(error){
            console.log("Error (UpdateUserAccountBal) : ",error);
            return false;
        }
    }

    //
    async updateUserAccountBalV1(balance,userId,accType){
        try{
            let balField=Constant.Payment.BAL_KEY[accType];
            // let update=await models.gmsUserAccounts.update({balField:balance},{
            //     where:{"fkUserId":userId}
            // });

            let update = await models.sequelize.query(
                `UPDATE gmsUserAccounts set ${balField}=${balance} where fkUserId=${userId} Limit 1`,
                { type: sequelize.QueryTypes.UPDATE }
            );

            return update;
        }
        catch(error){
            console.log("Error (updateUserAccountBalV1) : ",error);
            return false;
        }
    }
    // taken to payment helper 
    async trxUserAccountBal(userId,acType,amount,transactionType,from=null){
        try{
            let balField=Constant.Payment.BAL_KEY[acType];
            let trxType;
            /*var existingBalance=await this.getUserAccountBal(userId,acType);
            var currentBal=0;
            if(transactionType==Constant.Payment.trxType.Credit){
                currentBal=+existingBalance + +amount;
            }
            else if(transactionType==Constant.Payment.trxType.Debit){
                currentBal=+existingBalance - +amount;
            }*/
            //var updateBalance=await this.updateUserAccountBal(currentBal,{"fkUserId":""+userId,"acType":acType});
            //var updateBalance=await this.updateUserAccountBalV1(currentBal,userId,acType);

            if(transactionType==Constant.Payment.trxType.Credit){
                trxType=Constant.Payment.trxTypeNew.Credit;
            }
            else if(transactionType==Constant.Payment.trxType.Debit){
                trxType=Constant.Payment.trxTypeNew.Debit;
            }

            let amountData:any={};
            amountData[balField]=amount;

            let updateData:any={
                "playerId":userId,
                "amountData":amountData,
                "type": trxType,
                "from":from
            }

            var updateBalance=await helper.gmsUserAccountCreateOrUpdateWallet(updateData);
            if(updateBalance)
                console.log("User account balance updated successfully.");    
            else
                console.log("Unable to update user account balance.");
            return true;
        }
        catch(error){
            console.log("Error in making transaction in user account balance.");
            console.log("Error (TrxUserAccountBal) : ",error);
            return false
        }
        

    }

    // taken to master service 
    async userAccountBalanceDeduction(userDetails, paidAmount, gameId, gameEngine, engineId, pgRefNum=null){
        if (pgRefNum){
            const inwardStatus = await this.isDuplicateGamePlayPayment(userDetails['id'], pgRefNum, gameId, engineId);
            if (inwardStatus){
                return 412;
            }
        }
        var depositAmount = await this.getUserAccountBal(userDetails['id'],Constant.Payment.AccType.Deposit);
        var withdraAmount = await this.getUserAccountBal(userDetails['id'],Constant.Payment.AccType.Withdraw);
        
        var TransactionLog:any={};
        TransactionLog.fkSenderId=userDetails['id'];        
        TransactionLog.senderClosingBalance=0;
        TransactionLog.receiverClosingBalance=0;
        TransactionLog.fkGameId=gameId;
        TransactionLog.gameEngine=gameEngine;
        TransactionLog.engineId=engineId;
        let isPayemntMade:boolean = false;
        if(gameEngine==3 || gameEngine==1){
            TransactionLog.pgRefNo=pgRefNum;  
        }

        console.log("Paid Amount : ",paidAmount);
        console.log("Deposit Amount : ",depositAmount);
        console.log("Withdraw Amount : ",withdraAmount);

        let from:any={};
        from['reason']="USER_ACC_BAL_DEDUCTION";


        if(depositAmount>0 && paidAmount<=depositAmount){
            //Make a Transaction and deduct amount from deposit account then return true.
            //Settlement deposit Account.    
            TransactionLog.requestType=Constant.Payment.reqType.TLD.GamePlay;
            TransactionLog.payStatus=Constant.Payment.payStatus.TLD.Success;
            TransactionLog.fkReceiverId=config.financialUser.Settlement;
            TransactionLog.amount=paidAmount;
            let transactionLogInsert=await this.insertTransactionDepositLog(TransactionLog);
            if(!transactionLogInsert){
                console.log("Deposit Transaction log failed");
                return false;
            }

            from['txnLogId']=transactionLogInsert['dataValues']['id'];
            //Update sender balance.
            let isDebited=await this.trxUserAccountBal(TransactionLog.fkSenderId,Constant.Payment.AccType.Deposit,paidAmount,Constant.Payment.trxType.Debit, from);
            if(!isDebited)
                console.log("Failed to update sender balance");

            //Update receiver balance.
            let isCredited=await this.trxUserAccountBal(TransactionLog.fkReceiverId,Constant.Payment.AccType.Deposit,paidAmount,Constant.Payment.trxType.Credit, from);
            if(!isCredited)
                console.log("Failed to update receiver balance");
            
            if(isCredited && isDebited){
                if (gameEngine==1 && pgRefNum){
                    isPayemntMade = true;
                }
            }else    
                return false;
        }else if(depositAmount>0 && withdraAmount>0 && paidAmount<=(depositAmount + withdraAmount) ){
            //First Deduct the amount form deposit account then remining from withdraw account
            //Settlement deposit Account.    
            TransactionLog.fkReceiverId=config.financialUser.Settlement;
            TransactionLog.amount=depositAmount;
            TransactionLog.requestType=Constant.Payment.reqType.TLD.GamePlay;
            TransactionLog.payStatus=Constant.Payment.payStatus.TLD.Success;
            
            let transactionLogInsertDeposit=await this.insertTransactionDepositLog(TransactionLog);
            if(transactionLogInsertDeposit){
                from['txnLogId']=transactionLogInsertDeposit['dataValues']['id'];
                //Update receiver balance.
                let isCredited=await this.trxUserAccountBal(TransactionLog.fkReceiverId,Constant.Payment.AccType.Deposit,TransactionLog.amount,Constant.Payment.trxType.Credit, from);
                if(!isCredited)
                    console.log("Failed to update receiver balance into deposit");    
            }

            var duePaidAmount=+paidAmount- +TransactionLog.amount;
            //Settlement Withdraw Account.    
            TransactionLog.fkReceiverId=config.financialUser.Settlement;
            TransactionLog.amount=duePaidAmount;
            TransactionLog.requestType=Constant.Payment.reqType.TLW.GamePlay;
            TransactionLog.payStatus=Constant.Payment.payStatus.TLW.Success;
            
            let transactionLogInsertWithdraw=await this.insertTransactionWithdrawLog(TransactionLog);
            if(transactionLogInsertWithdraw){
                from['txnLogId']=transactionLogInsertWithdraw['dataValues']['id'];
                //Update receiver balance.
                let isCredited=await this.trxUserAccountBal(TransactionLog.fkReceiverId,Constant.Payment.AccType.Withdraw,paidAmount,Constant.Payment.trxType.Credit, from);
                if(!isCredited)
                    console.log("Failed to update receiver balance");

            }
            if(!transactionLogInsertDeposit || !transactionLogInsertWithdraw){
                console.log("Deposit Or Withdraw Transaction log failed");
                return false;
            }

            //Update Sender Balance.
            let updateDepositBalance=await this.trxUserAccountBal(TransactionLog.fkSenderId,Constant.Payment.AccType.Deposit,depositAmount,Constant.Payment.trxType.Debit, from);
            let updateWithdrawBalance=await this.trxUserAccountBal(TransactionLog.fkSenderId,Constant.Payment.AccType.Withdraw,duePaidAmount,Constant.Payment.trxType.Debit, from);
            
            if(!updateDepositBalance || !updateWithdrawBalance){
                console.log("Deposit or Withdraw Update Balance failed");
                return false;
            }
            if (gameEngine==1 && pgRefNum){
                isPayemntMade = true;
            }
            // return 200;
        }
        else if(withdraAmount>0 && paidAmount<=withdraAmount){
            //Deduuct amount From Withdraw account and return true 
            TransactionLog.fkReceiverId=config.financialUser.Settlement;//Settlement withdraw Account.    
            TransactionLog.amount=paidAmount;
            TransactionLog.requestType=Constant.Payment.reqType.TLW.GamePlay;
            TransactionLog.payStatus=Constant.Payment.payStatus.TLW.Success;
            
            let transactionLogInsert=await this.insertTransactionWithdrawLog(TransactionLog);
            if(transactionLogInsert){
                from['txnLogId']=transactionLogInsert['dataValues']['id'];
                //Update receiver balance.
                let isCredited=await this.trxUserAccountBal(TransactionLog.fkReceiverId,Constant.Payment.AccType.Withdraw,TransactionLog.amount,Constant.Payment.trxType.Credit, from);
                if(!isCredited)
                    console.log("Failed to update receiver balance");

            }
            else{
                console.log("Withdraw Transaction log failed");
                return false;
            }

            let updateBalance=await this.trxUserAccountBal(TransactionLog.fkSenderId,Constant.Payment.AccType.Withdraw,paidAmount,Constant.Payment.trxType.Debit, from);
            if(!updateBalance){
                console.log("Withdraw Update Balance failed");
                return false;
            }
            if (gameEngine==1 && pgRefNum){
                isPayemntMade = true;
            }
            // return 200;
        }
        else{
            //Insufficient balance return false.
            console.log("Insufficient Balance");
            return 502;
        }
        if (isPayemntMade){
            return 412;
        }else{
            return 200;
        }
        
    }

    // taken to master service 
    async userAccountBalanceDeductionV2(userDetails, paidAmount, gameId, gameEngine, engineId, pgRefNo){
        var depositAmount=await this.getUserAccountBal(userDetails['id'],Constant.Payment.AccType.Deposit);
        var withdraAmount=await this.getUserAccountBal(userDetails['id'],Constant.Payment.AccType.Withdraw);
        
        var TransactionLog:any={};
        TransactionLog.fkSenderId=userDetails['id'];        
        TransactionLog.senderClosingBalance=0;
        TransactionLog.receiverClosingBalance=0;
        TransactionLog.fkGameId=gameId;
        TransactionLog.gameEngine=gameEngine;
        TransactionLog.engineId=engineId;
        TransactionLog.pgRefNo=pgRefNo;
        

        let from:any={};
        from['reason']="USER_ACC_BAL_DEDUCTION_V2";

        if(depositAmount>0 && paidAmount<=depositAmount){
            //Make a Transaction and deduct amount from deposit account then return true.
            //Settlement deposit Account.    
            TransactionLog.requestType=Constant.Payment.reqType.TLD.GamePlay;
            TransactionLog.payStatus=Constant.Payment.payStatus.TLD.Success;
            TransactionLog.fkReceiverId=config.financialUser.Settlement;
            TransactionLog.amount=paidAmount;
            let transactionLogInsert=await this.insertTransactionDepositLog(TransactionLog);
            if(!transactionLogInsert){
                console.log("Deposit Transaction log failed");
                return false;
            }

            //Update sender balance.
            from['txnLogId']=transactionLogInsert['dataValues']['id'];
            let isDebited=await this.trxUserAccountBal(TransactionLog.fkSenderId,Constant.Payment.AccType.Deposit,paidAmount,Constant.Payment.trxType.Debit,from);
            if(!isDebited)
                console.log("Failed to update sender balance");

            //Update receiver balance.
            let isCredited=await this.trxUserAccountBal(TransactionLog.fkReceiverId,Constant.Payment.AccType.Deposit,paidAmount,Constant.Payment.trxType.Credit, from);
            if(!isCredited)
                console.log("Failed to update receiver balance");
            
            if(isCredited && isDebited)
                return 200;
            else    
                return false;
        }
        else if(depositAmount>0 && withdraAmount>0 && paidAmount<=(depositAmount + withdraAmount) ){
            //First Deduct the amount form deposit account then remining from withdraw account
            //Settlement deposit Account.    
            TransactionLog.fkReceiverId=config.financialUser.Settlement;
            TransactionLog.amount=depositAmount;
            TransactionLog.requestType=Constant.Payment.reqType.TLD.GamePlay;
            TransactionLog.payStatus=Constant.Payment.payStatus.TLD.Success;
            
            let transactionLogInsertDeposit=await this.insertTransactionDepositLog(TransactionLog);
            if(transactionLogInsertDeposit){
                from['txnLogId']=transactionLogInsertDeposit['dataValues']['id'];
                //Update receiver balance.
                let isCredited=await this.trxUserAccountBal(TransactionLog.fkReceiverId,Constant.Payment.AccType.Deposit,TransactionLog.amount,Constant.Payment.trxType.Credit, from);
                if(!isCredited)
                    console.log("Failed to update receiver balance into deposit");    
            }

            var duePaidAmount=+paidAmount- +TransactionLog.amount;
            //Settlement Withdraw Account.    
            TransactionLog.fkReceiverId=config.financialUser.Settlement;
            TransactionLog.amount=duePaidAmount;
            TransactionLog.requestType=Constant.Payment.reqType.TLW.GamePlay;
            TransactionLog.payStatus=Constant.Payment.payStatus.TLW.Success;
            
            let transactionLogInsertWithdraw=await this.insertTransactionWithdrawLog(TransactionLog);
            if(transactionLogInsertWithdraw){
                from['txnLogId']=transactionLogInsertWithdraw['dataValues']['id'];
                //Update receiver balance.
                let isCredited=await this.trxUserAccountBal(TransactionLog.fkReceiverId,Constant.Payment.AccType.Withdraw,paidAmount,Constant.Payment.trxType.Credit, from);
                if(!isCredited)
                    console.log("Failed to update receiver balance");

            }
            if(!transactionLogInsertDeposit || !transactionLogInsertWithdraw){
                console.log("Deposit Or Withdraw Transaction log failed");
                return false;
            }

            //Update Sender Balance.
            let updateDepositBalance=await this.trxUserAccountBal(TransactionLog.fkSenderId,Constant.Payment.AccType.Deposit,depositAmount,Constant.Payment.trxType.Debit,from);
            let updateWithdrawBalance=await this.trxUserAccountBal(TransactionLog.fkSenderId,Constant.Payment.AccType.Withdraw,duePaidAmount,Constant.Payment.trxType.Debit, from);
            
            if(!updateDepositBalance || !updateWithdrawBalance){
                console.log("Deposit or Withdraw Update Balance failed");
                return false;
            }
            return 200;
        }
        else if(withdraAmount>0 && paidAmount<=withdraAmount){
            //Deduuct amount From Withdraw account and return true 
            TransactionLog.fkReceiverId=config.financialUser.Settlement;//Settlement withdraw Account.    
            TransactionLog.amount=paidAmount;
            TransactionLog.requestType=Constant.Payment.reqType.TLW.GamePlay;
            TransactionLog.payStatus=Constant.Payment.payStatus.TLW.Success;
            
            let transactionLogInsert=await this.insertTransactionWithdrawLog(TransactionLog);
            if(transactionLogInsert){
                from['txnLogId']=transactionLogInsert['dataValues']['id'];
                //Update receiver balance.
                let isCredited=await this.trxUserAccountBal(TransactionLog.fkReceiverId,Constant.Payment.AccType.Withdraw,TransactionLog.amount,Constant.Payment.trxType.Credit, from);
                if(!isCredited)
                    console.log("Failed to update receiver balance");

            }
            else{
                console.log("Withdraw Transaction log failed");
                return false;
            }

            let updateBalance=await this.trxUserAccountBal(TransactionLog.fkSenderId,Constant.Payment.AccType.Withdraw,paidAmount,Constant.Payment.trxType.Debit, from);
            if(!updateBalance){
                console.log("Withdraw Update Balance failed");
                return false;
            }
            return 200;
        }
        else{
            //Insufficient balance return false.
            console.log("Insufficient Balance");
            return 502;
        }
        
    }

    // taken to helper 
    async getUserBankAccountDetails(userId){
        try{
            let data=await models.gmsUserBankAccount.findAll({
                where:{
                    fkUserId:userId,
                    isActive:1
                },
                raw:true
            });
            return data;
        }
        catch(error){
            console.log("Error (GetUserBankAccountDetails) : ",error);
            return false;
        }
    }

    // taken to deposit 
    async isRefundedDeposit(pgRefNo,playerId){
        console.log("Deposit Battle payment Check--PG Ref Num--"+pgRefNo+",  PlayerID : "+playerId);
        var data=await models.sequelize.query("select count(*) as cnt from gmsPaymentTransactionLogDeposit where fkReceiverId="+playerId+" and pgRefNo='"+pgRefNo+"' and requestType=40 ",{ type: sequelize.QueryTypes.SELECT});
        return data[0]['cnt']>=1?true:false;
    }

    // taken to withdraw 
    async isRefundedWithdraw(pgRefNo,playerId){
        console.log("Withdraw Battle payment Check--PG Ref Num--"+pgRefNo+",  PlayerID : "+playerId);
        var data=await models.sequelize.query("select count(*) as cnt from gmsPaymentTransactionLogWithdraw where fkReceiverId="+playerId+" and pgRefNo='"+pgRefNo+"' and requestType in (30,50) ",{ type: sequelize.QueryTypes.SELECT});
        return data[0]['cnt']>=1?true:false;
    }

    // taken to master service 
    async makeBattlePayment(player1Id,player2Id,winnerPlayer,gameId,battleId,status,roomId){
        console.log("Battle Room Payment --> "+roomId+" Player 1 : "+player1Id+" Player 2 : "+player2Id+" Winner Player : "+winnerPlayer+" Status : "+status);    
        
        if(status==300){
            //take commisiion and 
            //send winning amount to user withdraw account
            var battle=await helper.getColsValue("gmsBattle",["paidAmount","winningAmount",],{"id":battleId});
            var paidAmount= +battle[0]['paidAmount'];
            var winningAmount= +battle[0]['winningAmount'];

            var commissionCharge=((paidAmount*2)-winningAmount);
            var userPaybleAmt=+winningAmount; 

            var TransactionLogWithdraw:any={};
            TransactionLogWithdraw.fkSenderId=config.financialUser.Settlement; //Withdraw Settlement        
            TransactionLogWithdraw.payStatus=Constant.Payment.payStatus.TLW.Success;
            TransactionLogWithdraw.senderClosingBalance=0;
            TransactionLogWithdraw.receiverClosingBalance=0;
            TransactionLogWithdraw.pgRefNo=roomId;
            TransactionLogWithdraw.fkGameId=gameId;
            TransactionLogWithdraw.gameEngine=1;
            TransactionLogWithdraw.engineId=battleId;
            

            //Commission Log
            TransactionLogWithdraw.requestType=Constant.Payment.reqType.TLW.CommissionCharge;
            TransactionLogWithdraw.fkReceiverId=config.financialUser.Commission; //gmsApp Commission Account
            TransactionLogWithdraw.amount=commissionCharge;

            var isCommissionCredited=await this.insertTransactionWithdrawLog(TransactionLogWithdraw);
            if(isCommissionCredited){
                console.log("Commission credited Successfully for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ winnerPlayer);
                let isCredited=await this.trxUserAccountBal(TransactionLogWithdraw.fkReceiverId,Constant.Payment.AccType.Withdraw,TransactionLogWithdraw.amount,Constant.Payment.trxType.Credit);
                if(!isCredited)
                    console.log("Failed to update receiver balance");
                let isDebited=await this.trxUserAccountBal(TransactionLogWithdraw.fkSenderId,Constant.Payment.AccType.Withdraw,TransactionLogWithdraw.amount,Constant.Payment.trxType.Debit);
                if(!isDebited)
                    console.log("Failed to update sender balance");
            }
            else{
                console.log("Unable To credit Commission for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ winnerPlayer);
            }

            //Winner Player Log
            TransactionLogWithdraw.requestType=Constant.Payment.reqType.TLW.WinningPrize;
            TransactionLogWithdraw.fkReceiverId=winnerPlayer; //Battle Winner Player
            TransactionLogWithdraw.amount=userPaybleAmt;

            var isWinningPrizeCredited=await this.insertTransactionWithdrawLog(TransactionLogWithdraw);
            if(isWinningPrizeCredited){
                console.log("Winning prize credited Successfully for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ winnerPlayer);
                let isCredited=await this.trxUserAccountBal(TransactionLogWithdraw.fkReceiverId,Constant.Payment.AccType.Withdraw,TransactionLogWithdraw.amount,Constant.Payment.trxType.Credit);
                if(!isCredited)
                    console.log("Failed to update receiver balance");
                let isDebited=await this.trxUserAccountBal(TransactionLogWithdraw.fkSenderId,Constant.Payment.AccType.Withdraw,TransactionLogWithdraw.amount,Constant.Payment.trxType.Debit);
                if(!isDebited)
                    console.log("Failed to update sender balance");                
            }
            else{
                console.log("Unable To credit Winning Prize for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ winnerPlayer);
            }
            if(!isWinningPrizeCredited || !isCommissionCredited)
                return false;
            else
                return {"betAmt":paidAmount,"winAmt":winningAmount,"playerId":winnerPlayer,"isDraw":false};
        }
        else if(status==350){
            //take commisiion and 
            //send winning amount to both the user withdraw account
            var battle=await helper.getColsValue("gmsBattle",["paidAmount","winningAmount",],{"id":battleId});
            var paidAmount= +battle[0]['paidAmount'];
            var winningAmount= +battle[0]['winningAmount'];

            var errors=false;
            var commissionCharge=((paidAmount*2)-winningAmount);
            var player1WinningAmt= winningAmount/2;
            var player2WinningAmt= winningAmount/2;


            var TransactionLogWithdraw:any={};
            TransactionLogWithdraw.fkSenderId=config.financialUser.Settlement; //Withdraw Settlement        
            TransactionLogWithdraw.payStatus=Constant.Payment.payStatus.TLW.Success;
            TransactionLogWithdraw.senderClosingBalance=0;
            TransactionLogWithdraw.receiverClosingBalance=0;
            TransactionLogWithdraw.pgRefNo=roomId;
            TransactionLogWithdraw.fkGameId=gameId;
            TransactionLogWithdraw.gameEngine=1;
            TransactionLogWithdraw.engineId=battleId;
            

            //Commission Log
            TransactionLogWithdraw.requestType=Constant.Payment.reqType.TLW.CommissionCharge;
            TransactionLogWithdraw.fkReceiverId=config.financialUser.Commission //gmsApp Commission Account
            TransactionLogWithdraw.amount=commissionCharge;

            var isCommissionCredited=await this.insertTransactionWithdrawLog(TransactionLogWithdraw);
            if(isCommissionCredited){
                console.log("Commission credited Successfully for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ winnerPlayer);
                let isCredited=await this.trxUserAccountBal(TransactionLogWithdraw.fkReceiverId,Constant.Payment.AccType.Withdraw,TransactionLogWithdraw.amount,Constant.Payment.trxType.Credit);
                if(!isCredited)
                    console.log("Failed to update receiver balance");
                let isDebited=await this.trxUserAccountBal(TransactionLogWithdraw.fkSenderId,Constant.Payment.AccType.Withdraw,TransactionLogWithdraw.amount,Constant.Payment.trxType.Debit);
                if(!isDebited)
                    console.log("Failed to update sender balance");
                
            }
            else{
                errors=true;
                console.log("Unable To credit Commission for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ winnerPlayer);
            }

            //Player-1 Log
            TransactionLogWithdraw.requestType=Constant.Payment.reqType.TLW.WinningPrize;
            TransactionLogWithdraw.fkReceiverId=player1Id; //Battle Player-1 ID
            TransactionLogWithdraw.amount=player1WinningAmt;

            var isPl1PrizeCredited=await this.insertTransactionWithdrawLog(TransactionLogWithdraw);
            if(isPl1PrizeCredited){
                console.log("PL1 Winning prize credited Successfully for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ winnerPlayer);
                let isCredited=await this.trxUserAccountBal(TransactionLogWithdraw.fkReceiverId,Constant.Payment.AccType.Withdraw,TransactionLogWithdraw.amount,Constant.Payment.trxType.Credit);
                if(!isCredited)
                    console.log("Failed to update receiver balance");
                let isDebited=await this.trxUserAccountBal(TransactionLogWithdraw.fkSenderId,Constant.Payment.AccType.Withdraw,TransactionLogWithdraw.amount,Constant.Payment.trxType.Debit);
                if(!isDebited)
                    console.log("Failed to update sender balance");
            }
            else{
                errors=true;
                console.log("Unable To credit PL1 Winning Prize for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ winnerPlayer);                
            }

            //Player-2 Log
            TransactionLogWithdraw.requestType=Constant.Payment.reqType.TLW.WinningPrize;
            TransactionLogWithdraw.fkReceiverId=player2Id; //Battle Player-2 ID
            TransactionLogWithdraw.amount=player2WinningAmt;

            var isPl2PrizeCredited=await this.insertTransactionWithdrawLog(TransactionLogWithdraw);
            if(isPl2PrizeCredited){
                console.log("PL2 Winning prize credited Successfully for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ winnerPlayer);
                let isCredited=await this.trxUserAccountBal(TransactionLogWithdraw.fkReceiverId,Constant.Payment.AccType.Withdraw,TransactionLogWithdraw.amount,Constant.Payment.trxType.Credit);
                if(!isCredited)
                    console.log("Failed to update receiver balance");
                let isDebited=await this.trxUserAccountBal(TransactionLogWithdraw.fkSenderId,Constant.Payment.AccType.Withdraw,TransactionLogWithdraw.amount,Constant.Payment.trxType.Debit);
                if(!isDebited)
                    console.log("Failed to update sender balance");
            }
            else{
                errors=true;
                console.log("Unable To credit PL2 Winning Prize for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ winnerPlayer);                
            }

            if(errors)
                return false;
            else
                return {"betAmt":paidAmount,"winAmt":player1WinningAmt,"isDraw":true};
        }
        else if(status==400){
            // Make refund to both player.
            var errors=false;
            var settlementUser=config.financialUser.Settlement;
            try{
                if(player1Id!='' && player1Id!=undefined  &&  player1Id!='UNDEFINED' && player1Id){
                    var player1DepositLog=await models.sequelize1.query("select id,amount from "+ 
                    " gmsPaymentTransactionLogDeposit where fkSenderId="+player1Id+" and fkReceiverId="+settlementUser+" and pgRefNo='"+roomId+"' and requestType=20 and fkGameId="+gameId+" and gameEngine=1 and engineId="+battleId,{ type: sequelize.QueryTypes.SELECT});

                    var player1WithdrawLog=await models.sequelize1.query("select id,amount from "+ 
                    " gmsPaymentTransactionLogWithdraw where fkSenderId="+player1Id+" and fkReceiverId="+settlementUser+" and pgRefNo='"+roomId+"' and  requestType=20 and fkGameId="+gameId+" and gameEngine=1 and engineId="+battleId,{ type: sequelize.QueryTypes.SELECT});
                }
    
                if(player2Id!='' && player2Id!=undefined  &&  player2Id!='UNDEFINED' && player2Id){
                    var player2DepositLog=await models.sequelize1.query("select id,amount from "+ 
                    " gmsPaymentTransactionLogDeposit where fkSenderId="+player2Id+" and fkReceiverId="+settlementUser+" and pgRefNo='"+roomId+"' and requestType=20 and fkGameId="+gameId+" and gameEngine=1 and engineId="+battleId,{ type: sequelize.QueryTypes.SELECT});
    
                    var player2WithdrawLog=await models.sequelize1.query("select id,amount from "+ 
                    " gmsPaymentTransactionLogWithdraw where fkSenderId="+player2Id+" and fkReceiverId="+settlementUser+" and pgRefNo='"+roomId+"' and  requestType=20 and fkGameId="+gameId+" and gameEngine=1 and engineId="+battleId,{ type: sequelize.QueryTypes.SELECT});    
                }
                
                if(player1DepositLog && player1DepositLog.length>0 && ! await this.isRefundedDeposit(roomId,player1Id)){

                    console.log("Battle Room Refund -->>"+roomId+" Player 1 : "+player1Id);
                    var amount=player1DepositLog[0]['amount'];

                    var TransactionLogDepositInsert:any={};
                    TransactionLogDepositInsert.fkSenderId=config.financialUser.Settlement; //Settlement Deposit Account
                    TransactionLogDepositInsert.fkReceiverId=player1Id;
                    TransactionLogDepositInsert.amount=amount;
                    TransactionLogDepositInsert.senderClosingBalance=0;
                    TransactionLogDepositInsert.receiverClosingBalance=0;
                    TransactionLogDepositInsert.requestType=Constant.Payment.reqType.TLD.GameRefund;
                    TransactionLogDepositInsert.payStatus=Constant.Payment.payStatus.TLD.Success;
                    TransactionLogDepositInsert.pgRefNo=roomId;
                    TransactionLogDepositInsert.fkGameId=gameId;
                    TransactionLogDepositInsert.gameEngine=1;
                    TransactionLogDepositInsert.engineId=battleId;
                    var pl1TldI=await this.insertTransactionDepositLog(TransactionLogDepositInsert);
                    if(pl1TldI){
                        let isCredited=await this.trxUserAccountBal(TransactionLogDepositInsert.fkReceiverId,Constant.Payment.AccType.Deposit,TransactionLogDepositInsert.amount,Constant.Payment.trxType.Credit);
                        if(!isCredited)
                            console.log("Failed to update receiver balance");
                        let isDebited=await this.trxUserAccountBal(TransactionLogDepositInsert.fkSenderId,Constant.Payment.AccType.Deposit,TransactionLogDepositInsert.amount,Constant.Payment.trxType.Debit);
                        if(!isDebited)
                            console.log("Failed to update sender balance"); 
                    }
                    else{
                        errors=true;
                        console.log("Unable to Insert PL1 Trx Log Deposit for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ player1Id);                             
                    }
                    
                }//End Of Player-1 Deposit log refund

                if(player2DepositLog && player2DepositLog.length>0 && ! await this.isRefundedDeposit(roomId,player2Id)){
                    console.log("Battle Room Refund -->>"+roomId+" Player 2 : "+player2Id);
                    var amount=player2DepositLog[0]['amount'];

                    var TransactionLogDepositInsert:any={};
                    TransactionLogDepositInsert.fkSenderId=config.financialUser.Settlement; //Settlement Deposit Account
                    TransactionLogDepositInsert.fkReceiverId=player2Id;
                    TransactionLogDepositInsert.amount=amount;
                    TransactionLogDepositInsert.senderClosingBalance=0;
                    TransactionLogDepositInsert.receiverClosingBalance=0;
                    TransactionLogDepositInsert.requestType=Constant.Payment.reqType.TLD.GameRefund;
                    TransactionLogDepositInsert.payStatus=Constant.Payment.payStatus.TLD.Success;
                    TransactionLogDepositInsert.pgRefNo=roomId;
                    TransactionLogDepositInsert.fkGameId=gameId;
                    TransactionLogDepositInsert.gameEngine=1;
                    TransactionLogDepositInsert.engineId=battleId;
                    var pl2TldI=await this.insertTransactionDepositLog(TransactionLogDepositInsert);
                    if(pl2TldI){
                        let isCredited=await this.trxUserAccountBal(TransactionLogDepositInsert.fkReceiverId,Constant.Payment.AccType.Deposit,TransactionLogDepositInsert.amount,Constant.Payment.trxType.Credit);
                        if(!isCredited)
                            console.log("Failed to update receiver balance");
                        let isDebited=await this.trxUserAccountBal(TransactionLogDepositInsert.fkSenderId,Constant.Payment.AccType.Deposit,TransactionLogDepositInsert.amount,Constant.Payment.trxType.Debit);
                        if(!isDebited)
                            console.log("Failed to update sender balance");
                    }  
                    else{
                        errors=true;
                        console.log("Unable to Insert PL2 Trx Log Deposit for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ player1Id);   
                    }
                    
                }//End of Player-2 deposit log refund

                if(player1WithdrawLog && player1WithdrawLog.length>0 && ! await this.isRefundedWithdraw(roomId,player1Id)){
                    console.log("Battle Room Refund -->>"+roomId+" Player 1 : "+player1Id);
                    var amount=player1WithdrawLog[0]['amount'];
                    
                    var TransactionLogWithdrawInsert:any={};
                    TransactionLogWithdrawInsert.fkSenderId=config.financialUser.Settlement; //Settlement Withdraw Account
                    TransactionLogWithdrawInsert.fkReceiverId=player1Id;
                    TransactionLogWithdrawInsert.amount=amount;
                    TransactionLogWithdrawInsert.senderClosingBalance=0;
                    TransactionLogWithdrawInsert.receiverClosingBalance=0;
                    TransactionLogWithdrawInsert.requestType=Constant.Payment.reqType.TLW.RefundToPlAc;
                    TransactionLogWithdrawInsert.payStatus=Constant.Payment.payStatus.TLW.Success;
                    TransactionLogWithdrawInsert.pgRefNo=roomId;
                    TransactionLogWithdrawInsert.fkGameId=gameId;
                    TransactionLogWithdrawInsert.gameEngine=1;
                    TransactionLogWithdrawInsert.engineId=battleId;
                    var pl1TlWI=await this.insertTransactionWithdrawLog(TransactionLogWithdrawInsert);
                    if(pl1TlWI){
                        let isCredited=await this.trxUserAccountBal(TransactionLogWithdrawInsert.fkReceiverId,Constant.Payment.AccType.Withdraw,TransactionLogWithdrawInsert.amount,Constant.Payment.trxType.Credit);
                        if(!isCredited)
                            console.log("Failed to update receiver balance");
                        let isDebited=await this.trxUserAccountBal(TransactionLogWithdrawInsert.fkSenderId,Constant.Payment.AccType.Withdraw,TransactionLogWithdrawInsert.amount,Constant.Payment.trxType.Debit);
                        if(!isDebited)
                            console.log("Failed to update sender balance");
                    }
                    else{
                        errors=true;
                        console.log("Unable to Insert PL1 Trx Log Withdraw for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ player1Id);    
                    }
                    
                }//End of Player-1 Withdraw log refund

                if(player2WithdrawLog && player2WithdrawLog.length>0 && ! await this.isRefundedWithdraw(roomId,player2Id)){
                    console.log("Battle Room Refund -->>"+roomId+" Player 2 : "+player2Id);
                    var amount=player2WithdrawLog[0]['amount'];
                        
                    var TransactionLogWithdrawInsert:any={};
                    TransactionLogWithdrawInsert.fkSenderId=config.financialUser.Settlement; //Settlement Withdraw Account
                    TransactionLogWithdrawInsert.fkReceiverId=player2Id;
                    TransactionLogWithdrawInsert.amount=amount;
                    TransactionLogWithdrawInsert.senderClosingBalance=0;
                    TransactionLogWithdrawInsert.receiverClosingBalance=0;
                    TransactionLogWithdrawInsert.requestType=Constant.Payment.reqType.TLW.RefundToPlAc;
                    TransactionLogWithdrawInsert.payStatus=Constant.Payment.payStatus.TLW.Success;
                    TransactionLogWithdrawInsert.pgRefNo=roomId;
                    TransactionLogWithdrawInsert.fkGameId=gameId;
                    TransactionLogWithdrawInsert.gameEngine=1;
                    TransactionLogWithdrawInsert.engineId=battleId;
                    var pl2TlWI=await this.insertTransactionWithdrawLog(TransactionLogWithdrawInsert);
                    if(pl2TlWI){
                        let isCredited=await this.trxUserAccountBal(TransactionLogWithdrawInsert.fkReceiverId,Constant.Payment.AccType.Withdraw,TransactionLogWithdrawInsert.amount,Constant.Payment.trxType.Credit);
                        if(!isCredited)
                            console.log("Failed to update receiver balance");
                        let isDebited=await this.trxUserAccountBal(TransactionLogWithdrawInsert.fkSenderId,Constant.Payment.AccType.Withdraw,TransactionLogWithdrawInsert.amount,Constant.Payment.trxType.Debit);
                        if(!isDebited)
                            console.log("Failed to update sender balance");
                    }                        
                    else{
                        errors=true;
                        console.log("Unable to Insert PL2 Trx Log Withdraw for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ player1Id);
                    }
                    
                }//End of Player-2 Withdraw log refund

                if(errors)
                    return false;
                else
                    return true;
            }
            catch(error){
                console.log("Error (MakeBattlePayment) : ",error);
                return false;
            }
        }//End Of Player Score Match and Interrupt Payment.
    }//End Of Make Battle Payment.

    // taken to helper 
    async createTrxLogAndUpdateSenderReceiverBalance(trxLog: any, accType: number, receiverId: string, amount: number) {
        trxLog.fkReceiverId = receiverId;
        trxLog.amount = amount;
        let fromTxnLogId=null;
        if (accType == Constant.Payment.AccType.Deposit) {
            trxLog.requestType = Constant.Payment.reqType.TLD.GamePlay;
            trxLog.payStatus = Constant.Payment.payStatus.TLD.Success;
            const transactionLogInsert = await this.insertTransactionDepositLog(trxLog);
            if (!transactionLogInsert) {
                console.log("Deposit Transaction log failed");
                return false;
            }
            fromTxnLogId=transactionLogInsert['dataValues']['id'];
        } else if(accType == Constant.Payment.AccType.Withdraw) {
            trxLog.requestType = Constant.Payment.reqType.TLW.GamePlay;
            trxLog.payStatus = Constant.Payment.payStatus.TLW.Success;
            const transactionLogInsert = await this.insertTransactionWithdrawLog(trxLog);
            if (!transactionLogInsert) {
                console.log("Deposit Transaction log failed");
                return false;
            }
            fromTxnLogId=transactionLogInsert['dataValues']['id'];
        }

        if (receiverId == config.financialUser.Settlement) {
            trxLog.requestType = Constant.Payment.reqType.TLW.CommissionCharge;
        }

        let from:any={};
        from['reason']="CREATE_TXN_AND_UPDATE_RCVR_BALANCE";
        from['txnLogId']=fromTxnLogId;

        // Update sender balance 
        const isDebited = await this.trxUserAccountBal(trxLog.fkSenderId, accType, amount, Constant.Payment.trxType.Debit, from);
        if (!isDebited)
            console.log("Failed to update sender balance");

        // Update receiver balance 
        const isCredited = await this.trxUserAccountBal(trxLog.fkReceiverId, Constant.Payment.AccType.Withdraw, amount, Constant.Payment.trxType.Credit, from);
        if (!isCredited)
            console.log("Failed to update receiver balance");
        
        if (isCredited && isDebited)
            return true;
        else    
            return false;
    }

    // taken to master service 
    async userAccountBalanceTransferForTableGames(senderId: string, receiverId: string, amount: number, gameId: string, gameEngine: string, engineId: string, pgRefNo: string){
        const depositAccountBalance = await this.getUserAccountBal(senderId, Constant.Payment.AccType.Deposit);
        const withdrawAccountBalance = await this.getUserAccountBal(senderId, Constant.Payment.AccType.Withdraw);
        
        const trxLog: any = {};
        trxLog.fkSenderId = senderId;        
        trxLog.senderClosingBalance = 0;
        trxLog.receiverClosingBalance = 0;
        trxLog.fkGameId = gameId;
        trxLog.gameEngine = gameEngine;
        trxLog.engineId = engineId;
        trxLog.pgRefNo = pgRefNo;
        
        if (depositAccountBalance > 0 && amount <= depositAccountBalance) {
            /*
             * transfer amount from sender's deposit account to receiver's account 
             */
            const trxDone = await this.createTrxLogAndUpdateSenderReceiverBalance(trxLog, Constant.Payment.AccType.Deposit, receiverId, amount);
            if (trxDone) 
                return true;

            return false;
        } else if (depositAccountBalance > 0 && withdrawAccountBalance > 0 && amount <= (depositAccountBalance + withdrawAccountBalance)) {
            /*
             * transfer available deposit account balance from sender to receiver's account 
             */
            const depositTrxDone = await this.createTrxLogAndUpdateSenderReceiverBalance(trxLog, Constant.Payment.AccType.Deposit, receiverId, depositAccountBalance);
            if (depositTrxDone) {
                /*
                 * transfer remaining balance from sender's withdraw account to receiver's account 
                 */
                const remainingAmount = +amount- +depositAccountBalance;
                const withdrawTrxDone = await this.createTrxLogAndUpdateSenderReceiverBalance(trxLog, Constant.Payment.AccType.Withdraw, receiverId, remainingAmount);
                if(withdrawTrxDone) 
                    return true;
            }
            
            return false;
        } else if (withdrawAccountBalance > 0 && amount <= withdrawAccountBalance) {
            /*
             * transfer amount from sender's withdraw account to receiver's account  
             */
            const trxDone = await this.createTrxLogAndUpdateSenderReceiverBalance(trxLog, Constant.Payment.AccType.Withdraw, receiverId, amount);
            if (trxDone) 
                return true;

            return false;
        } else {
            //Insufficient balance return false.
            console.log("Insufficient Balance");
            return false;
        }
    }

    // taken to master service 
    async makeTableGamePayment(gameId: string, tableTypeId: string, tableGameId: string, senderId: string, receiverId: string, amount: number): Promise<boolean> {
        let result = false;
        try {
            const commisionPercentage = 15/100;
            const commision = amount * commisionPercentage;
            const receiverAmount = amount - commision;
            
            /*
             * First transfer commision 
             */
            const commisionTransfered = await this.userAccountBalanceTransferForTableGames(senderId, config.financialUser.Settlement, commision, gameId, '1', tableTypeId, tableGameId);
            if (commisionTransfered) {
                /*
                 * Then transfer receiver amount  
                 */
                const receiverAmountTransfered = await this.userAccountBalanceTransferForTableGames(senderId, receiverId, receiverAmount, gameId, '1', tableTypeId, tableGameId);
                if (receiverAmountTransfered) 
                    result = true;
                else 
                    console.log("ROLLBACK REQUIRED!! Commision transfer succeeded but receiver amount transfer failed for tableGameId: ", tableGameId);
            } else {
                console.log("Commision transfer failed for tableGameId: ", tableGameId);
            }
        } catch (error) {
            console.log("Error (makeTableGamePayment): ", error);
        }
        return result;
    }

    // taken to token 
    async getTokenHistory(userId, paginate=false, page=1, page_size=20){
        try{
            page = page - 1
            if (page < 0) {
                page = 0;
            }
            const start = page_size*page;
            const end = start + page_size;
            let limit_query = "";
            if (paginate) {
                limit_query = " LIMIT "+start+", "+end+"";
            }

            let data=await models.sequelize.query("select concat('GMSAPP_',tl.id) as id,tl.token as amount,"+
            "CASE WHEN fkSenderId="+userId+" Then '10' WHEN fkReceiverId="+userId+" Then '20' ELSE '----' END as trxType,tl.payStatus,"+
            "CASE WHEN payStatus=10 Then 'SUCCESS' WHEN payStatus=20 THEN 'FAILED' WHEN payStatus=30 THEN 'PENDING' ELSE '----' END as payResult,tl.requestType,"+
            "CASE when tl.requestType=10 then 'Reward Bonus' when tl.requestType=20 then 'Game Play' "+
            "when tl.requestType=30 then 'Token Purchase' ELSE 'Invalid Request Type ' END as requestTypeMsg,"+
            "tl.createdAt,'Wallet' as gameName "+
            "from gmsPaymentTransactionLogToken tl "+
            "left join gmsGames gm on gm.id=tl.fkGameId "+
            "where tl.fkSenderId="+userId+" OR tl.fkReceiverId="+userId+" ORDER BY tl.createdAt DESC "+limit_query,{ type: sequelize.QueryTypes.SELECT});
            return data as any[];      
        }
        catch(error){
            console.log("Error (GetTokenHistory) : ",error);
            return [] as any[];
        }
    }

    // taken to master 
    async groupDepositWithdrawHistoryBattleRoomWise(history) {
        //console.log("History: ", history);
        let battleRoomHistory: any[] = [];
        for (let i = 0; i < history.length; i++) {
            let trx = history[i];
            let gamePlayId = trx.pgRefNo;
            if (gamePlayId == null) {
                gamePlayId = "Rewards"
            }
            const index = battleRoomHistory.findIndex(el => el.gamePlayId === gamePlayId);
            if(index === -1) {
                const thisTrx = {
                    gamePlayId: gamePlayId,
                    gamePlayTransactions: [trx]
                };
                battleRoomHistory.push(thisTrx);
            } else {
                let item = battleRoomHistory[index];
                item.gamePlayTransactions.push(trx);
                battleRoomHistory[index] = item;
            }

        }
        //console.log("battleRoomHistory: ", battleRoomHistory);
        return battleRoomHistory;
    }

    // taken to master 
    async getDepositWithdrawHistory(userId, paginate=false, page=1, page_size=20){
        try{
            page = page - 1
            if (page < 0) {
                page = 0;
            }
            const start = page_size*page;
            const end = start + page_size;
            let limit_query = "";
            if (paginate) {
                limit_query = " LIMIT "+start+", "+end+"";
            }

            let data=await models.sequelize.query("select * from (select concat('GMSAPPD_',tld.id) as id,tld.amount,"+
            "(CASE WHEN tld.fkSenderId="+userId+" Then '10' WHEN tld.fkReceiverId="+userId+" Then '20' ELSE '----' END) as trxType,"+
            "tld.payStatus,"+
            "(CASE WHEN tld.payStatus=10 Then 'SUCCESS' WHEN tld.payStatus=20 THEN 'FAILED' when tld.payStatus=30 then 'Pending' ELSE '----' END) as payResult,"+
            "tld.requestType,"+
            "(CASE when tld.requestType=10 then 'Deposit' when tld.requestType=20 then 'Entry Fee' "+
            "when tld.requestType=30 then 'Reward' when tld.requestType=40 then 'Refund' when tld.requestType=50 then 'Token Purchase' ELSE 'Invalid Request Type ' END) as requestTypeMsg,"+
            "tld.createdAt,tld.fkGameId,"+
            "(CASE when tld.gameEngine=1 || tld.gameEngine=2 then concat(gm.name,' (',gmb.title,')') when tld.gameEngine=3 then concat(cm.shortTitle,' (',cc.title,')') else 'Wallet' END) as gameName,"+
            "tld.gameEngine,tld.engineId,tld.pgRefNo,tld.bankRefNo,'-----' as customerRefNum "+
            "from gmsPaymentTransactionLogDeposit tld "+
            "left join gmsGames gm on gm.id=tld.fkGameId "+
            "left join gmsBattle gmb on gmb.id=tld.engineId "+
            "left join gmsFantacyCricketMatch cm on cm.matchId=tld.fkGameId "+
            "left join gmsFantacyCricketContest cc on cc.id=tld.engineId "+
            "where tld.fkSenderId="+userId+" OR tld.fkReceiverId="+userId+" "+
            "union all "+
            "select concat('GMSAPPW_',tlw.id) as id,tlw.amount,"+
            "(CASE WHEN tlw.fkSenderId="+userId+" Then '10' WHEN tlw.fkReceiverId="+userId+" Then '20' ELSE '----' END) as trxType,"+
            "tlw.payStatus,"+
            "(CASE WHEN tlw.payStatus=10 Then 'SUCCESS' WHEN tlw.payStatus=20 THEN 'FAILED' when tlw.payStatus=30 then 'Pending' ELSE '----' END) as payResult,"+
            "tlw.requestType,"+
            "(CASE when tlw.requestType=10 then 'Withdraw' when tlw.requestType=20 then 'Entry Fee' "+
            "when tlw.requestType=30 then 'Winning Amount' when tlw.requestType=40 then 'Commission' when tlw.requestType=50 then 'Refund' when tlw.requestType=60 then 'Outward Refund'  ELSE 'Invalid Request Type ' END) as requestTypeMsg,"+
            "tlw.createdAt,tlw.fkGameId,"+
            "(CASE when tlw.gameEngine=1 || tlw.gameEngine=2 then concat(gm.name,' (',gmb.title,')') when tlw.gameEngine=3 then concat(cm.shortTitle,' (',cc.title,')') else 'Bank Trfs.' END) as gameName,"+
            "tlw.gameEngine,tlw.engineId,tlw.pgRefNo,tlw.bankRefNo,tlw.customerRefNum "+
            "from gmsPaymentTransactionLogWithdraw tlw "+
            "left join gmsGames gm on gm.id=tlw.fkGameId "+
            "left join gmsBattle gmb on gmb.id=tlw.engineId "+
            "left join gmsFantacyCricketMatch cm on cm.matchId=tlw.fkGameId "+
            "left join gmsFantacyCricketContest cc on cc.id=tlw.engineId "+
            "where tlw.fkSenderId="+userId+" OR tlw.fkReceiverId="+userId+" ) as DepositWithdrawLog ORDER BY createdAt DESC "+limit_query,{ type: sequelize.QueryTypes.SELECT});
            
            // if (paginate)
            //     return await this.groupDepositWithdrawHistoryBattleRoomWise(data);
            // else
            return data;
        }
        catch(error){
            console.log("Error (GetDepositWithdrawHistory) : ",error);
        }
    }
    
    // taken to helper 
    async insertEngineKeyIdInLog(userId, engineKeyId, gameId, gameEngine, engineId){
        let success = false;
        let depositResult = false;
        let withdrawResult = false;
        try{
            console.log("Update Battle Room Id as pgRefNo : "+engineKeyId+" Player Id : "+userId+" Game Id : "+gameId+" Battle Id : "+engineId);
            
            const userDepositLog = await models.sequelize1.query(
                `select id,amount from gmsPaymentTransactionLogDeposit where fkSenderId=${userId} and 
                fkReceiverId=${config.financialUser.Settlement} and pgRefNo is null and requestType=20 and 
                fkGameId=${gameId} and gameEngine=${gameEngine} and engineId=${engineId} order by id desc`,
                { type: sequelize.QueryTypes.SELECT });

            if(userDepositLog && userDepositLog.length > 0) {
                const id = userDepositLog[0]['id'];
                const update = await models.sequelize.query(
                    `UPDATE gmsPaymentTransactionLogDeposit set pgRefNo=${engineKeyId} 
                    where id=${id} LIMIT 1`, { type: sequelize.QueryTypes.UPDATE });
                
                // if userDepositLog null entry is there, then it must be successfully updated for true result.
                if(update) {
                    console.log("Engine Key Id inserted in Deposit log Id : "+id+" pgRefNo "+engineKeyId);
                    depositResult = true;
                }
            }

            const userWithdrawLog = await models.sequelize1.query(
                `select id,amount from gmsPaymentTransactionLogWithdraw where fkSenderId=${userId} and 
                fkReceiverId=${config.financialUser.Settlement} and pgRefNo is null and requestType=20 and 
                fkGameId=${gameId} and gameEngine=${gameEngine} and engineId=${engineId} order by id desc`, 
                { type: sequelize.QueryTypes.SELECT });
            
            if(userWithdrawLog && userWithdrawLog.length > 0) {
                const id = userWithdrawLog[0]['id'];
                const update = await models.sequelize.query(
                    `UPDATE gmsPaymentTransactionLogWithdraw set pgRefNo=${engineKeyId}
                    where id=${id} LIMIT 1`, { type: sequelize.QueryTypes.UPDATE });
                
                if(update) {
                    console.log("Engine Key Id inserted in Withdraw log Id : "+id+" pgRefNo : "+engineKeyId);
                    withdrawResult = true;
                }
            }

            if(depositResult == false && withdrawResult == false) {
                success = false;
            } else {
                success = true;
            }
        } catch(error) {
            console.log("Error (InsertEngineKeyIdInLog) : ",error);
            success = false;
        }
        return success;
    }

    // taken to helper 
    async isDuplicateGamePlayPayment(userId, pgRefNo, gameId, engineId){
        let success = false;
        let depositResult = false;
        let withdrawResult = false;
        try{
            console.log("checkDuplicateGamePlayPayment pgRefNo : "+pgRefNo+" Player Id : "+userId);
            
            const userDepositLog = await models.sequelize1.query(
                `select id,amount from gmsPaymentTransactionLogDeposit where fkSenderId=${userId} and 
                fkReceiverId=${config.financialUser.Settlement} and pgRefNo=${pgRefNo} and requestType=20 and payStatus=10 and fkGameId=${gameId} and engineId=${engineId} order by id desc`,
                { type: sequelize.QueryTypes.SELECT });

            if(userDepositLog && userDepositLog.length > 0) {
                depositResult = true;
            }

            const userWithdrawLog = await models.sequelize1.query(
                `select id,amount from gmsPaymentTransactionLogWithdraw where fkSenderId=${userId} and 
                fkReceiverId=${config.financialUser.Settlement} and pgRefNo=${pgRefNo} and requestType=20 and payStatus=10 and fkGameId=${gameId} and engineId=${engineId} order by id desc`, 
                { type: sequelize.QueryTypes.SELECT });
            
            if(userWithdrawLog && userWithdrawLog.length > 0) {
                withdrawResult = true;
            }
            if(depositResult == false && withdrawResult == false) {
                success = false;
            } else {
                success = true;
            }
        } catch(error) {
            console.log("Error (checkDuplicateGamePlayPayment) : ", error);
            success = false;
        }
        return success;
    }

    // taken to deposit 
    async isDuplicateInward(pgRefNo,bankRefNo){
        try{
            var data=await models.sequelize.query("select * from gmsPaymentTransactionLogDeposit where pgRefNo='"+pgRefNo+"' OR bankRefNo='"+bankRefNo+"'",{ type: sequelize.QueryTypes.SELECT});
            if(data && data.length>0)
                return true;
            else 
                false;
        }
        catch(error){
            console.log("Duplicate Inward Check Error ")
            console.log("Error (IsDuplicateInward) : ",error);
        }
    }

    // taken to deposit 
    async isDuplicateInwardV2(pgRefNo: string) {
        try {
            const data = await models.sequelize.query(`select * from gmsPaymentTransactionLogDeposit where payStatus=10 and pgRefNo='${pgRefNo}'`, { type: sequelize.QueryTypes.SELECT});
            if(data && data.length > 0)
                return true;
        } catch(error) {
            console.log("Duplicate Inward V2 Check Error ");
            console.log("Error (IsDuplicateInwardV2) : ", error);
        }
        return false;
    }

    // taken to deposit 
    async getPaymentTransactionLogDeposit(pgRefNo: string, payStatus: number) {
        let data: any = null;
        try {
            data = await models.sequelize.query(`select * from gmsPaymentTransactionLogDeposit where payStatus=${payStatus} and pgRefNo='${pgRefNo}'`, { type: sequelize.QueryTypes.SELECT});
            if (data) {
                if (data.length > 0)
                    data = data[0];
                else
                    data = null;
            }
        } catch (error) {
            console.log("Error: ", error);
        }
        return data;
    }

    // taken to deposit 
    async updateTransactionDepositLogAndUserAccounts(senderId: number, receiverId: number, amount: number, pgRefNo: string, bankRefNo: string, existingTLD: any, response: any): Promise<boolean> {
        let result = false;
        try {
            existingTLD.senderClosingBalance = await this.getClosingBalanceDeposit(senderId);
            existingTLD.receiverClosingBalance = await this.getClosingBalanceDeposit(receiverId);
            existingTLD.payStatus = Constant.Payment.payStatus.TLD.Success;
            existingTLD.bankRefNo = bankRefNo;
            existingTLD.apiMsg = JSON.stringify(response);

            const update = await this.updateTransactionDepositLog(existingTLD, {pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending});
            if (!update) {
                console.log("Paytm payment: DB Error while updating transaction deposit log.");
            } else {
                let from:any={};
                from['reason']="UPDATE_TXN_LOG_AND_USER_ACCOUNT";
                from['txnLogId']=existingTLD['id'];

                //Update sender balance.
                const isDebited = await this.trxUserAccountBal(senderId, Constant.Payment.AccType.Deposit, amount, Constant.Payment.trxType.Debit,from);
                if (!isDebited)
                    console.log("Paytm payment: DB Error while updating sender account balance.");

                //Update receiver balance.
                const isCredited = await this.trxUserAccountBal(receiverId, Constant.Payment.AccType.Deposit, amount, Constant.Payment.trxType.Credit,from);
                if (!isCredited)
                    console.log("Paytm payment: DB Error while updating receiver account balance.");
                
                if (isCredited && isDebited) 
                    result = true;
            }
        } catch (e) {
            console.log("Error: ", e);
        }
        return result;
    }

    // taken to ibl service 
    async iblWithdraw(userDetail,userBankDetails,tlId,amount){
        var trx:any={};
        trx.Customerid=config.iblTrx.customerId;
        trx.TransactionType="IMPS"
        trx.CustomerRefNumber=await helper.generateCustomerRefNum()//need to generate on every trx.
        trx.DebitAccountNo=config.iblTrx.debitedAcNum;
        trx.BeneficiaryName=userBankDetails[0]['nameInBank'];
        trx.CreditAccountNumber=userBankDetails[0]['accountNumber'];
        trx.BeneficiaryBankIFSCCode=userBankDetails[0]['ifsc'];
        trx.TransactionAmount=amount;
        trx.BeneficiaryMobileNumber=userDetail['mobile'];
        trx.EmailID="abhay@gamesapp.com";//User Email-ID
        trx.Reserve1=userDetail['id'];
        trx.Reserve2="";
        trx.Reserve3="";

        var iblTrxReq={
            "url": config.iblTrx.processTrx,
            "method": 'POST',
            "headers":{
                "content-type":"application/json",
                "x-ibm-client-id":config.iblTrx.iblClientId,
                "x-ibm-client-secret":config.iblTrx.iblClientSecret
            },
            "json":trx
        }
        //console.log(iblTrxReq);
        return new Promise((resolve,reject)=>{
            request(iblTrxReq, async (err, resp, body) => {
                if(err){
                    console.log(err);
                    reject(500);
                }
                else{
                    var iblResp=resp.body;
                    var TransactionLogWithdrawUpdate:any={};
                    TransactionLogWithdrawUpdate.customerRefNum=trx.CustomerRefNumber;
                    TransactionLogWithdrawUpdate.iblRefNo=iblResp.IBLRefNo;
                    TransactionLogWithdrawUpdate.pgRefNo=iblResp.UTRNo;
                    TransactionLogWithdrawUpdate.apiMsg=JSON.stringify(iblResp);
                    if(iblResp.StatusCode=='R000' && iblResp.UTRNo != ''){
                        TransactionLogWithdrawUpdate.payStatus=Constant.Payment.payStatus.TLW.Success;    
                    }
                    let updateTL=await this.updateTransactionWithdrawLog(TransactionLogWithdrawUpdate,{"id":tlId});
                    if(!updateTL)
                        console.log("Unable to update transaction log ");
                    resolve(iblResp.StatusCode);
                }
            });
        }) 
    }

    // taken to helper 
    async getUserCurrentDateWithdraw(userId,amount){
        try{
            var dt=new Date();
            var today=dt.getFullYear()+"-"+(dt.getMonth()+1)+"-"+dt.getDate();
            var currentDateTotalTrx=await models.sequelize.query("select sum(a.amount) as amt from gmsPaymentTransactionLogWithdraw a where a.fkSenderId="+userId+" and a.requestType=10 and createdAt>='"+today+"'",{ type: sequelize.QueryTypes.SELECT});
            var amt=currentDateTotalTrx[0]['amt']=='NULL' || currentDateTotalTrx[0]['amt']==null?0:currentDateTotalTrx[0]['amt'];
            if(amt+amount>=1000){
                console.log("Trx Date : "+today+" , User Id : "+userId+" , Pre Amount : "+amt+" , Post Amount : "+amount);
                return amt;
            }
            else
                return amt
        }
        catch(error){
            console.log("Error (GetUserCurrentDateWithdraw) : ",error);
            return false;
        }
    }

    // taken to master 
    private getGamePlayData(data: [], error: boolean, statusCode: number, message: string, recordTotal: number) {
        return {
            data: data,
            error: error,
            statusCode: statusCode,
            message: message,
            recordTotal: recordTotal
        }
    }

    // taken to master 
    async shouldGamePlayBegin(userDetails: any, gameId: number, gameEngine: number, engineId: number,pgRefNum=null): Promise<object> {
        let data = {
            data: [],
            error: false,
            statusCode: 0,
            message: '',
            recordTotal: 0
        }
        try {
            if(gameEngine==1){
                //Battle
                //Get Battle Fee
                const battle=await helper.getColsValue("gmsBattle",["isPaid","paidAmount"],{"id":engineId,"fk_GamesId":gameId});
                if (!battle) {
                    data = this.getGamePlayData([], true, 502, "DB Error In Battle .", 0);
                } else {
                    if(battle.length>0){
                        const isPaid = battle[0]['isPaid'];
                        const paidAmount = +battle[0]['paidAmount'];
                        if(isPaid==1){
                            const isSuccessfull = await this.userAccountBalanceDeduction(userDetails,paidAmount,gameId,gameEngine,engineId, pgRefNum);
                            if(isSuccessfull==200)
                                data = this.getGamePlayData([], false, 200, "Transaction Success ", 0);
                            else if(isSuccessfull==502)
                                data = this.getGamePlayData([], true, 502, "Insufficient Balance !!", 0);
                            else if(isSuccessfull==412)
                                data = this.getGamePlayData([], true, 412, "Payment made already !!", 0);
                            else
                                data = this.getGamePlayData([], true, 500, "Transaction Error !!", 0);
                        } else 
                            data = this.getGamePlayData([], true, 200, "You Can Play It without Paying any Amount, This Battle Is Free", 0);
                    } else
                        data = this.getGamePlayData([], true, 200, "No Battle Found .", 0);
                }
            } else if(gameEngine==2) {
                //Tournament
                //Get Tournament Fee
                const tournament = await helper.getColsValue("gmsTurnament",["entryFee"],{"id":engineId,"fk_GamesId":gameId});
                if (!tournament) {
                    data = this.getGamePlayData([], true, 502, "DB Error In Tournament .", 0);
                } else {
                    if(tournament.length>0){
                        const paidAmount = +tournament[0]['entryFee'];
                        if(paidAmount>0){
                            const isSuccessfull = await this.userAccountBalanceDeduction(userDetails,paidAmount,gameId,gameEngine,engineId, pgRefNum);
                            if(!isSuccessfull)
                                data = this.getGamePlayData([], true, 500, "Transaction Error ", 0);
                            else
                                data = this.getGamePlayData([], false, 200, "Transaction Success ", 0);       
                        } else
                            data = this.getGamePlayData([], true, 200, "Tournament is free", 0);
                        
                    } else
                        data = this.getGamePlayData([], true, 200, "Tournament not found or the tournament fee is free.", 0);
                }
            } else if(gameEngine==3) {
                //Cricket Fantacy
                //Get contest fee
                const entryFee = await helper.getColsValue("gmsFantacyCricketContest",["entryFee"],{"id":engineId,"fkMatchId":gameId});
                if (!entryFee) {
                    data = this.getGamePlayData([], true, 500, "DB Error In cricket contest .", 0);
                } else {
                    if(entryFee && entryFee.length>0){
                        const paidAmount = +entryFee[0]['entryFee'];
                        if(paidAmount>0){
                            const isSuccessfull = await this.userAccountBalanceDeduction(userDetails,paidAmount,gameId,gameEngine,engineId,pgRefNum);
                            if(isSuccessfull==200)
                                data = this.getGamePlayData([], false, 200, "Transaction Success .", 0);
                            else if(isSuccessfull==502)
                                data = this.getGamePlayData([], true, 502, "Insufficient Balance !!", 0);
                            else
                                data = this.getGamePlayData([], true, 500, "Transaction Error !!", 0);
                        } else
                            data = this.getGamePlayData([], false, 200, "Contest is free.", 0);       
                    } else
                        data = this.getGamePlayData([], true, 500, "Contest not found !!", 0);
                }
            } else if(gameEngine==4) {
                //Cricket Fantacy
                //Get contest fee
                const tableEntryFee = await helper.getColsValue("gmsTableType", ["isPaid", "minEntryFee"], {"id":engineId, "fkGameId":gameId});
                if (!tableEntryFee) {
                    data = this.getGamePlayData([], true, 502, "DB Error in Table.", 0);
                } else {
                    if(tableEntryFee.length > 0 ){
                        const isPaid = tableEntryFee[0]['isPaid'];
                        const entryFee =+ tableEntryFee[0]['entryFee'];
                        if(isPaid == 1){
                            const totalBalance = await this.getUserTotalAccountBalance(userDetails['id']);
                            if (totalBalance < entryFee){
                                data = this.getGamePlayData([], true, 502, "Insufficient Balance !!", 0);
                            } else {
                                data = this.getGamePlayData([], false, 200, "Transaction Success ", 0);
                            }
                        } else 
                            data = this.getGamePlayData([], true, 200, "You Can Play It without Paying any Amount.", 0);
                    } else
                        data = this.getGamePlayData([], true, 204, "No Table Game Found .", 0);
                }
            }else {
                data = this.getGamePlayData([], true, 204, "Invalid Game Engine", 1);
            }
        } catch (error) {
            console.log("Error (shouldGamePlayBegin): ", error);
            data = this.getGamePlayData([], true, 204, "Oops! Some error occured. Please retry in sometime.", 0);
        }
        return data;
    }

    // taken to master 
    async refundContestEntryFee(userId,matchId,contestId,teamCode){
        console.log("Refund Contest entry fee payment --> "+teamCode+" userId : "+userId+" Match Id : "+matchId+" Contest Id : "+contestId);    
        
        // Make refund to of userEntry fee.
        var errors=false;
        var settlementUser=config.financialUser.Settlement;
        try{
            var userDepositLog=await models.sequelize1.query("select id,amount from "+ 
            " gmsPaymentTransactionLogDeposit where fkSenderId="+userId+" and fkReceiverId="+settlementUser+" and pgRefNo='"+teamCode+"' and requestType=20 and fkGameId="+matchId+" and gameEngine=3 and engineId="+contestId,{ type: sequelize.QueryTypes.SELECT});

            var userWithdrawLog=await models.sequelize1.query("select id,amount from "+ 
            " gmsPaymentTransactionLogWithdraw where fkSenderId="+userId+" and fkReceiverId="+settlementUser+" and pgRefNo='"+teamCode+"' and  requestType=20 and fkGameId="+matchId+" and gameEngine=3 and engineId="+contestId,{ type: sequelize.QueryTypes.SELECT});
        
            if(userDepositLog && userDepositLog.length>0 && ! await this.isRefundedDeposit(teamCode,userId)){
                console.log("Contest entry fee deposit refund -->> "+teamCode+" User : "+userId);
                var amount=userDepositLog[0]['amount'];

                var TransactionLogDepositInsert:any={};
                TransactionLogDepositInsert.fkSenderId=config.financialUser.Settlement; //Settlement Deposit Account
                TransactionLogDepositInsert.fkReceiverId=userId;
                TransactionLogDepositInsert.amount=amount;
                TransactionLogDepositInsert.senderClosingBalance=0;
                TransactionLogDepositInsert.receiverClosingBalance=0;
                TransactionLogDepositInsert.requestType=Constant.Payment.reqType.TLD.GameRefund;
                TransactionLogDepositInsert.payStatus=Constant.Payment.payStatus.TLD.Success;
                TransactionLogDepositInsert.pgRefNo=teamCode;
                TransactionLogDepositInsert.fkGameId=matchId;
                TransactionLogDepositInsert.gameEngine=3;
                TransactionLogDepositInsert.engineId=contestId;
                var usrTldI=await this.insertTransactionDepositLog(TransactionLogDepositInsert);
                if(usrTldI){
                    let from:any={};
                    from['reason']="REFUND_CONTEST_ENTRY_FEE";
                    from['txnLogId']=usrTldI['dataValues']['id'];

                    let isCredited=await this.trxUserAccountBal(TransactionLogDepositInsert.fkReceiverId,Constant.Payment.AccType.Deposit,TransactionLogDepositInsert.amount,Constant.Payment.trxType.Credit, from);
                    if(!isCredited)
                        console.log("Failed to update receiver balance");
                    let isDebited=await this.trxUserAccountBal(TransactionLogDepositInsert.fkSenderId,Constant.Payment.AccType.Deposit,TransactionLogDepositInsert.amount,Constant.Payment.trxType.Debit,from);
                    if(!isDebited)
                        console.log("Failed to update sender balance"); 
                }
                else{
                    errors=true;
                    console.log("Unable to Insert User Trx Log Deposit for Match Id : "+matchId+", Contest Id : "+contestId+" , User Id : "+ userId+ " PgRef Num : " +teamCode);    
                }
                
            }//End Of User Deposit log refund

            
            if(userWithdrawLog && userWithdrawLog.length>0 && ! await this.isRefundedWithdraw(teamCode,userId)){
                console.log("Contest entry fee withdraw refund -->> "+teamCode+" User : "+userId);
                
                var amount=userWithdrawLog[0]['amount'];
                
                var TransactionLogWithdrawInsert:any={};
                TransactionLogWithdrawInsert.fkSenderId=config.financialUser.Settlement; //Settlement Withdraw Account
                TransactionLogWithdrawInsert.fkReceiverId=userId;
                TransactionLogWithdrawInsert.amount=amount;
                TransactionLogWithdrawInsert.senderClosingBalance=0;
                TransactionLogWithdrawInsert.receiverClosingBalance=0;
                TransactionLogWithdrawInsert.requestType=Constant.Payment.reqType.TLW.RefundToPlAc;
                TransactionLogWithdrawInsert.payStatus=Constant.Payment.payStatus.TLW.Success;
                TransactionLogWithdrawInsert.pgRefNo=teamCode;
                TransactionLogWithdrawInsert.fkGameId=matchId;
                TransactionLogWithdrawInsert.gameEngine=3;
                TransactionLogWithdrawInsert.engineId=contestId;
                var usrTlWI=await this.insertTransactionWithdrawLog(TransactionLogWithdrawInsert);
                if(usrTlWI){
                    let isCredited=await this.trxUserAccountBal(TransactionLogWithdrawInsert.fkReceiverId,Constant.Payment.AccType.Withdraw,TransactionLogWithdrawInsert.amount,Constant.Payment.trxType.Credit);
                    if(!isCredited)
                        console.log("Failed to update receiver balance");
                    let isDebited=await this.trxUserAccountBal(TransactionLogWithdrawInsert.fkSenderId,Constant.Payment.AccType.Withdraw,TransactionLogWithdrawInsert.amount,Constant.Payment.trxType.Debit);
                    if(!isDebited)
                        console.log("Failed to update sender balance");
                }
                else{
                    errors=true;
                    console.log("Unable to Insert User Trx Log Withdraw for Match Id : "+matchId+", Contest Id : "+contestId+" , User Id : "+ userId+ " PgRef Num : " +teamCode);    
                }
                
            }//End of Player-1 Withdraw log refund

            if(errors)
                return false;
            else
                return true;
        }
        catch(error){
            console.log("Error (refundContestEntryFee) : ",error);
            return false;
        }
        
    }

    // taken to master 
    /**
     * Refund Game entry fee to the User
     * @param userId 
     * @param roomId 
     * @param gameId 
     * @param battleId 
     */
    async refundEntryFeeToUser(userId:number, roomId:string, gameId:number, battleId:number){
        try{
            let errors = false;
            const settlementUser = config.financialUser.Settlement;
            let player1DepositLog = await models.sequelize1.query("select id,amount from "+ 
            " gmsPaymentTransactionLogDeposit where fkSenderId="+userId+" and fkReceiverId="+settlementUser+" and pgRefNo='"+roomId+"' and requestType=20 and fkGameId="+gameId+" and gameEngine=1 and engineId="+battleId,{ type: sequelize.QueryTypes.SELECT});

            let player1WithdrawLog = await models.sequelize1.query("select id,amount from "+ 
            " gmsPaymentTransactionLogWithdraw where fkSenderId="+userId+" and fkReceiverId="+settlementUser+" and pgRefNo='"+roomId+"' and  requestType=20 and fkGameId="+gameId+" and gameEngine=1 and engineId="+battleId,{ type: sequelize.QueryTypes.SELECT});

            let from:any={};
            from['reason']="REFUND_ENTRY_FEE_TO_USER";

            
            if(player1DepositLog && player1DepositLog.length>0 && ! await this.isRefundedDeposit(roomId, userId)){
                console.log("Battle Room Refund -->>"+roomId+" Player 1 : "+userId);
                let amount = player1DepositLog[0]['amount'];

                let TransactionLogDepositInsert:any={};
                TransactionLogDepositInsert.fkSenderId=config.financialUser.Settlement; //Settlement Deposit Account
                TransactionLogDepositInsert.fkReceiverId=userId;
                TransactionLogDepositInsert.amount=amount;
                TransactionLogDepositInsert.senderClosingBalance=0;
                TransactionLogDepositInsert.receiverClosingBalance=0;
                TransactionLogDepositInsert.requestType=Constant.Payment.reqType.TLD.GameRefund;
                TransactionLogDepositInsert.payStatus=Constant.Payment.payStatus.TLD.Success;
                TransactionLogDepositInsert.pgRefNo=roomId;
                TransactionLogDepositInsert.fkGameId=gameId;
                TransactionLogDepositInsert.gameEngine=1;
                TransactionLogDepositInsert.engineId=battleId;
                let pl1TldI = await this.insertTransactionDepositLog(TransactionLogDepositInsert);
                if(pl1TldI){
                    from['txnLogId']= pl1TldI['dataValues']['id'];
                    let isCredited = await this.trxUserAccountBal(TransactionLogDepositInsert.fkReceiverId,Constant.Payment.AccType.Deposit,TransactionLogDepositInsert.amount,Constant.Payment.trxType.Credit,from);
                    if(!isCredited)
                        console.log("Failed to update receiver balance");
                    let isDebited = await this.trxUserAccountBal(TransactionLogDepositInsert.fkSenderId,Constant.Payment.AccType.Deposit,TransactionLogDepositInsert.amount,Constant.Payment.trxType.Debit, from);
                    if(!isDebited)
                        console.log("Failed to update sender balance"); 
                }else{
                    errors=true;
                    console.log("Unable to Insert PL1 Trx Log Deposit for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ userId);                             
                }   
            }//End Of User Deposit log refund
            if(player1WithdrawLog && player1WithdrawLog.length>0 && ! await this.isRefundedWithdraw(roomId,userId)){
                console.log("Battle Room Refund -->>"+roomId+" Player 1 : "+userId);
                let amount = player1WithdrawLog[0]['amount'];
                
                let TransactionLogWithdrawInsert:any={};
                TransactionLogWithdrawInsert.fkSenderId=config.financialUser.Settlement; //Settlement Withdraw Account
                TransactionLogWithdrawInsert.fkReceiverId=userId;
                TransactionLogWithdrawInsert.amount=amount;
                TransactionLogWithdrawInsert.senderClosingBalance=0;
                TransactionLogWithdrawInsert.receiverClosingBalance=0;
                TransactionLogWithdrawInsert.requestType=Constant.Payment.reqType.TLW.RefundToPlAc;
                TransactionLogWithdrawInsert.payStatus=Constant.Payment.payStatus.TLW.Success;
                TransactionLogWithdrawInsert.pgRefNo=roomId;
                TransactionLogWithdrawInsert.fkGameId=gameId;
                TransactionLogWithdrawInsert.gameEngine=1;
                TransactionLogWithdrawInsert.engineId=battleId;
                let pl1TlWI = await this.insertTransactionWithdrawLog(TransactionLogWithdrawInsert);
                if(pl1TlWI){
                    from['txnLogId']= pl1TlWI['dataValues']['id'];

                    let isCredited = await this.trxUserAccountBal(TransactionLogWithdrawInsert.fkReceiverId,Constant.Payment.AccType.Withdraw,TransactionLogWithdrawInsert.amount,Constant.Payment.trxType.Credit, from);
                    if(!isCredited)
                        console.log("Failed to update receiver balance");
                    let isDebited = await this.trxUserAccountBal(TransactionLogWithdrawInsert.fkSenderId,Constant.Payment.AccType.Withdraw,TransactionLogWithdrawInsert.amount,Constant.Payment.trxType.Debit, from);
                    if(!isDebited)
                        console.log("Failed to update sender balance");
                }else{
                    errors=true;
                    console.log("Unable to Insert PL1 Trx Log Withdraw for Game Id : "+gameId+", Battle Id : "+battleId+" , User Id : "+ userId);    
                }
            }//End of User Withdraw log refund
            if(errors)
                return false;
            else
                return true;
        }catch(error){
            console.log("Error (refundEntryFeeToUser) : ",error);
            return false;
        }    
    }
    async allPendingWithdrawTxn(){
        try{
              let withDrawData:any= await models.sequelize.query(
                   `SELECT 
                        ptlw.id as logId, concat(IFNULL(us.userName,''), ' ',IFNULL(us.firstName,'')) as username,
                        ptlw.amount,us.mobile,ptlw.createdAt 
                    FROM 
                        gmsPaymentTransactionLogWithdraw as ptlw , 
                        gmsUsers us
                    WHERE 
                        ptlw.fkSenderId=us.id AND ptlw.payStatus=50 and ptlw.requestType=10 `,
                     {type: sequelize.QueryTypes.SELECT}
                )
               if(withDrawData&&withDrawData.length>0){   
                    return withDrawData
                }else{
                    return []
                }
    
            }
            catch(error){
             console.log(error);
                return [];
            }
        }
    async getDepositTrnxList(condition:string,page:number,page_size:number,paginate:boolean=false){
        try {   
            
            
            if (page < 0) {
                page = 0;
            }
            const start = page_size*page;
            let limit_query = "";
            if (paginate) {
                limit_query = " LIMIT "+start+" , "+page_size;
            }

               let allTxnList =models.sequelize.query(
               `SELECT 
                    ptld.id as logId ,ptld.amount,
                    concat(IFNULL(us.userName,''), '  ',IFNULL(us.firstName,'')) as username,
                    ptld.createdAt,ptld.updatedAt,
                    ptld.payStatus
                FROM 
                    gmsPaymentTransactionLogDeposit as ptld 
                INNER JOIN 
                    gmsUsers as us on us.id=ptld.fkReceiverId 
                WHERE  
                    ptld.requestType=${Constant.Payment.reqType.TLD.Inward}  AND `+condition+
                    ` ORDER BY logId DESC `    
                    +limit_query ,
                    { type: sequelize.QueryTypes.SELECT })
                if(allTxnList){
                  return allTxnList
                }else{
                    console.log("...failed to retrieve data from gmsPaymentTransactionLogDeposit from getDepositTrnxList...")
                    return[] 
                }

        } catch (error) {
               console.log("Err in (getDepositTrnxList_depositservic): ",error)
               return []
        }
    }

}
export default new Payment();