import sequelize from 'sequelize';
import models, { sequelize1 } from '../../models/index';
import CommonHelper, { Helper } from '../../../common/helper';
import Constant from '../../../common/app.constant';
import PaymentHelper from './helper';
import { TrxLogRecord } from './types';
import * as secretConfig from '../../../common/secret.config.json';
import { IAccountService } from './account.service';
import referralService from '../referral.service';
const config: any = secretConfig;


export class DepositAccountService implements IAccountService {

    async insertTransactionLog(trxLog: TrxLogRecord): Promise<any> {
        try {
            /*trxLog.senderAcNum = await CommonHelper.getColValue("gmsUserAccount", "id", { "fkUserId": trxLog.fkSenderId, "acType": Constant.Payment.AccType.Deposit });
            trxLog.receiverAcNum = await CommonHelper.getColValue("gmsUserAccount", "id", { "fkUserId": trxLog.fkReceiverId, "acType": Constant.Payment.AccType.Deposit });*/
            
            
            trxLog.senderAcNum = trxLog.fkSenderId; // await CommonHelper.getColValue("gmsUserAccounts", "id", { "fkUserId": trxLog.fkSenderId });
            trxLog.receiverAcNum = trxLog.fkReceiverId; //await CommonHelper.getColValue("gmsUserAccounts", "id", { "fkUserId": trxLog.fkReceiverId });
            
            
            return await models.gmsPaymentTransactionLogDeposit.build(trxLog).save();
        } catch (error) {
            console.log("Error (insertTransactionLog) : ", error);
            return false;
        }
    }

    async updateTransactionLog(trxLog: any, condition: any): Promise<boolean> {
        try {
            delete trxLog['createdAt'];
            const data = await models.gmsPaymentTransactionLogDeposit.update(trxLog, {
                where: condition
            });
            return true;
        } catch (error) {
            console.log("Error (updateTransactionLog) : ", error);
            return false;
        }
        
    }

    async isRefunded(pgRefNo: any, playerId: any): Promise<boolean> {
        console.log("Deposit Battle payment Check--PG Ref Num--" + pgRefNo + ",  PlayerID : " + playerId);
        // var data=await models.sequelize.query("select count(*) as cnt from gmsPaymentTransactionLogDeposit where fkReceiverId="+playerId+" and pgRefNo='"+pgRefNo+"' and requestType=40 ",{ type: sequelize.QueryTypes.SELECT});
        // return data[0]['cnt']>=1?true:false;
        const data = await models.sequelize.query("SELECT requestType, SUM(amount) AS totalAmount FROM gmsPaymentTransactionLogDeposit WHERE pgRefNo like '" + pgRefNo + "%' AND (fkSenderId=" + playerId + " OR fkReceiverId=" + playerId + " ) AND requestType IN (20, 40) GROUP BY `requestType` ORDER BY requestType", { type: sequelize.QueryTypes.SELECT });
        let feeAmount = 0;
        let refundAmount = 0;
        for (let i = 0; i < data.length; i++) {
            if (+data[i].requestType == Constant.Payment.reqType.TLD.GamePlay) {
                feeAmount += data[i].totalAmount
            } else if (+data[i].requestType == Constant.Payment.reqType.TLD.GameRefund) {
                refundAmount += data[i].totalAmount
            }
        }
        if (refundAmount >= feeAmount) {
            return true;
        } else {
            return false;
        }
    }

    async isDuplicateInward(pgRefNo: any, bankRefNo: any) {
        try {
            var data = await models.sequelize.query("select * from gmsPaymentTransactionLogDeposit where pgRefNo='" + pgRefNo + "' OR bankRefNo='" + bankRefNo + "'", { type: sequelize.QueryTypes.SELECT });
            if (data && data.length > 0)
                return true;
            else
                false;
        }
        catch (error) {
            console.log("Duplicate Inward Check Error ")
            console.log("Error (IsDuplicateInward) : ", error);
        }
    }

    async isDuplicateInwardV2(pgRefNo: string) {
        try {
            const data = await models.sequelize.query(`select * from gmsPaymentTransactionLogDeposit where payStatus=10 and pgRefNo='${pgRefNo}'`, { type: sequelize.QueryTypes.SELECT });
            if (data && data.length > 0)
                return true;
        } catch (error) {
            console.log("Duplicate Inward V2 Check Error ");
            console.log("Error (IsDuplicateInwardV2) : ", error);
        }
        return false;
    }

    async getPaymentTransactionLog(pgRefNo: string, payStatus: number) {
        let data: any = null;
        try {
            data = await models.sequelize.query(`select * from gmsPaymentTransactionLogDeposit where payStatus=${payStatus} and pgRefNo='${pgRefNo}'`, { type: sequelize.QueryTypes.SELECT });
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

    async getUnassignedTrxLog(senderId: any, receiverId: any, gameId: any, gameEngine: any, engineId: any): Promise<Array<{}>> {
        try {
            return await models.sequelize1.query(
                `select id,amount from gmsPaymentTransactionLogDeposit where fkSenderId=${senderId} and 
                fkReceiverId=${receiverId} and pgRefNo is null and requestType=20 and 
                fkGameId=${gameId} and gameEngine=${gameEngine} and engineId=${engineId} order by id desc`,
                { type: sequelize.QueryTypes.SELECT });
        } catch (error) {
            console.log("Exception > Failed finding unassigned trx log for senderId: " + senderId + ", receiverId: " + receiverId);
        }
        return [];
    }

    async assignRefNoToTrxLog(id: any, pgRefNo: any): Promise<boolean> {
        try {
            return await models.sequelize.query(
                `UPDATE gmsPaymentTransactionLogDeposit set pgRefNo=${pgRefNo} 
                where id=${id} LIMIT 1`, { type: sequelize.QueryTypes.UPDATE });
        } catch (error) {
            console.log("Exception > Engine Key Id update failed for deposit log id: " + id + ", pgRefNo: " + pgRefNo);
        }
        return false;
    }

    async updateTransactionLogAndUserAccounts(senderId: number, receiverId: number, amount: number, pgRefNo: string, bankRefNo: string, existingTLD: TrxLogRecord, response: any): Promise<boolean> {
        let result = false;
        try {
            let prePayStatus=existingTLD.payStatus;
            existingTLD.senderClosingBalance = await PaymentHelper.getClosingBalanceDeposit(senderId);
            existingTLD.receiverClosingBalance = await PaymentHelper.getClosingBalanceDeposit(receiverId);
            existingTLD.payStatus = Constant.Payment.payStatus.TLD.Success;
            existingTLD.bankRefNo = bankRefNo;
            existingTLD.apiMsg = existingTLD['apiMsg']+"--->>"+JSON.stringify(response);
            existingTLD['utrNo']=bankRefNo;
            existingTLD['description'] = await PaymentHelper.preparedDescription("DEPOSIT",Constant.Payment.payStatus.TLD.Success,amount);
            

            delete existingTLD['createdAt'];
            
            const update = await this.updateTransactionLog(existingTLD, { pgRefNo: pgRefNo, payStatus: prePayStatus });
            if (!update) {
                console.log("Deposit payment: DB Error while updating transaction deposit log.");
            } else {
                let from:any = {};
                from['reason']="UPDATE_TXN_LOG_AND_USER_ACCOUNT";
                from['txnLogId']= existingTLD['id'];

                // Update sender and receiver balance.
                const isBalanceUpdated = await PaymentHelper.updateSenderReceiverAccountBalance(
                    existingTLD.fkSenderId,
                    existingTLD.fkReceiverId,
                    Constant.Payment.AccType.Deposit,
                    existingTLD.amount,
                    from
                );
                result = result || isBalanceUpdated;
                await this.creditCashback(amount, existingTLD);
                await referralService.creditAmountToReferrer(receiverId, amount); //5% --> Normal User (Bonus) & 30%  --> Creators (Withdraw)
                // Transfer Referral Balance to User Bonus account
                if (await this.isFirstTimeDeposit(receiverId)) {
                    console.log("Transfer Referral Balance to User's Bonus accounts");
                    await referralService.creditAmountTo(receiverId);
                    let regdate = await CommonHelper.getColValue("gmsUsers","createdAt",{id:receiverId});
                    let firstTimeDepositLogData:any={
                        "type" :"firstdeposit",
                        "playerId":receiverId,
                        "amount":amount,
                        "regdate": regdate
                    }
                    await PaymentHelper.gmsUserAccountFirstDepositLog(firstTimeDepositLogData);
                }
            }
        } catch (e) {
            console.log("Error: ", e);
        }
        return result;
    }

    async isFirstTimeDeposit(userId: number) {
        try {
            let depositCount = await this.getDepoistsCount(userId);
            if (depositCount <= 1) {
                return true;
            }
        } catch (error) {
            console.log("Error: ", error);
        }
        return false;
    }

    async getDepoistsCount(userId: number) {
        try {
            let depositCount = await models.sequelize.query(
                `SELECT 
                    count(id) AS dCount ,sum(amount) as totalDeposit
                FROM 
                    gmsPaymentTransactionLogDeposit 
                WHERE 
                    requestType=10 AND 
                    payStatus=10 AND 
                    fkReceiverId=:userId`,
                { replacements: { userId: userId }, type: sequelize.QueryTypes.SELECT });
            return depositCount[0]['dCount']
        } catch (error) {
            console.log("Error: ", error);
            return 0
        }
    }

    async createTrxLogRecord(trxLog: TrxLogRecord): Promise<boolean> {
        let result = false;
        trxLog.senderClosingBalance = 0;
        trxLog.receiverClosingBalance = 0;
        let isCreated = await this.insertTransactionLog(trxLog);

        if (isCreated) {
            let from:any = {};
            from['reason']="CREATE_TXN_LOG_DEPOSIT"
            from['txnLogId']=isCreated['dataValues']['id'];

            const isBalanceUpdated = await PaymentHelper.updateSenderReceiverAccountBalance(
                trxLog.fkSenderId,
                trxLog.fkReceiverId,
                Constant.Payment.AccType.Deposit,
                trxLog.amount,
                from
            );
            result = result || isBalanceUpdated;

            if (result)
                console.log("Success! Created log record for deposit account, TrxLog: ", trxLog);
            else
                console.log("Failed! Creating log record for deposit account, TrxLog: ", trxLog);
        }
        return result;
    }

    async getTrxLogForRefund(userId: any, pgRefNo: any, gameId: any, gameEngine: any, engineId: any): Promise<Array<{}>> {
        return await models.sequelize1.query("select id, amount, pgRefNo from gmsPaymentTransactionLogDeposit where" +
            " fkSenderId=" + userId + " and fkReceiverId=" + config.financialUser.Settlement + " and pgRefNo like '" + pgRefNo + "%' and requestType=20 and fkGameId=" + gameId + " and gameEngine=" + gameEngine + " and engineId=" + engineId, { type: sequelize.QueryTypes.SELECT });
    }

    async refundPayment(userId: any, pgRefNo: any, gameId: any, gameEngine: any, engineId: any, masterSession: any = null): Promise<boolean> {
        let result = true;
        const trxLogList = await this.getTrxLogForRefund(userId, pgRefNo, gameId, gameEngine, engineId);
        if (trxLogList && trxLogList.length > 0 && !await this.isRefunded(pgRefNo, userId)) {
            const trxLog: TrxLogRecord = await PaymentHelper.getTrxLogObject(
                config.financialUser.Settlement,
                userId,
                trxLogList[0]['amount'],
                Constant.Payment.reqType.TLD.GameRefund,
                Constant.Payment.payStatus.TLD.Success,
                0,
                0,
                trxLogList[0]['pgRefNo'],
                gameId,
                gameEngine,
                engineId
            );
            if (masterSession) {
                trxLog.masterGameSession = masterSession;
            }
            result = await this.createTrxLogRecord(trxLog);
        }
        return result;
    }

    async refundPaymentTFG(userId: any, pgRefNo: any,amount:number, gameId: any, gameEngine: any, engineId: any): Promise<boolean> {
        const trxLog: TrxLogRecord = await PaymentHelper.getTrxLogObject(
            config.financialUser.Settlement,
            userId,
            amount,
            Constant.Payment.reqType.TLD.TFGRefund,
            Constant.Payment.payStatus.TLD.Success,
            0,
            0,
            pgRefNo,
            gameId,
            gameEngine,
            engineId
        );
        let result = await this.createTrxLogRecord(trxLog);
        return result;
    
    }


    // Added for Cashback implementation
    async creditCashback(amount: number, trxLog: TrxLogRecord) {
        try {
            const cashbackDict: any = secretConfig.cashback;
            let cashback: number = 0;
            for (let i = 0; i < cashbackDict.length; i++) {
                if (+cashbackDict[i].amount == +amount) {
                    cashback = cashbackDict[i].cashback;
                    break;
                }
            }
            if (cashback > 0) {
                delete trxLog.apiMsg;
                delete trxLog['id'];
                trxLog.requestType = Constant.Payment.reqType.TLB.Cashback;
                trxLog.payStatus = Constant.Payment.payStatus.TLB.Success;
                trxLog.amount = cashback;
                trxLog.pgRefNo = trxLog.pgRefNo + '/cb'
                trxLog.description= await PaymentHelper.preparedDescription("BONUS","CASHBACK",cashback);
                
                await this.createBonusTrxLogRecord(trxLog);
            }
        } catch (error) {
            console.log("Error: creditCashback: ", error);
        }
    }

    async createBonusTrxLogRecord(trxLog: TrxLogRecord): Promise<boolean> {
        let result = false;
        trxLog.senderClosingBalance = 0;
        trxLog.receiverClosingBalance = 0;
        let isCreated = await this.createBonusTransactionLog(trxLog);

        if (isCreated) {
            let from:any = {};
            from['reason']="CREATE_TXN_LOG_BONUS"
            from['txnLogId']= isCreated['dataValues']['id'];
            const isBalanceUpdated = await PaymentHelper.updateSenderReceiverAccountBalance(
                trxLog.fkSenderId,
                trxLog.fkReceiverId,
                Constant.Payment.AccType.Bonus,
                trxLog.amount,
                from
            );
            result = result || isBalanceUpdated;

            if (result)
                console.log("Success! Created log record for Bonus account, TrxLog: ", trxLog);
            else
                console.log("Failed! Creating log record for Bonus account, TrxLog: ", trxLog);
        }
        return result;
    }

    async createBonusTransactionLog(trxLog: TrxLogRecord): Promise<any> {
        try {
            // const senderAcc = await PaymentHelper.getUserAccount(trxLog.fkSenderId, Constant.Payment.AccType.Bonus)
            const senderAcc = await PaymentHelper.getUserAccountV1(trxLog.fkSenderId, Constant.Payment.AccType.Bonus)
            trxLog.senderAcNum = senderAcc.id

            // const receiverAcc = await PaymentHelper.getUserAccount(trxLog.fkReceiverId, Constant.Payment.AccType.Bonus)
            const receiverAcc = await PaymentHelper.getUserAccountV1(trxLog.fkReceiverId, Constant.Payment.AccType.Bonus)
            trxLog.receiverAcNum = receiverAcc.id

            return await models.gmsPaymentTransactionLogBonus.build(trxLog).save();
        } catch (error) {
            console.log("Error (createBonusTransactionLog) : ", error);
            return false;
        }
    }

    async getTotalDepositOfUsers(userIds){
        try{
            let data=await models.sequelize.query(`SELECT sum(amount) totalDeposit
                    from gmsPaymentTransactionLogDeposit 
                    WHERE fkReceiverId in (${userIds}) AND requestType=10 AND payStatus=10 `,
                    { type: sequelize.QueryTypes.SELECT });
            return data[0]['totalDeposit'];
        }
        catch(error){
            console.log("Error  in (getTotalDepositOfusers) : ",error);
        }
    }

    
}

export default new DepositAccountService();
