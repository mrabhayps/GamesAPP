import sequelize from 'sequelize';
import models, { sequelize1 } from '../../models/index';
import CommonHelper from '../../../common/helper';
import Constant from '../../../common/app.constant';
import PaymentHelper from './helper';
import { TrxLogRecord } from './types';
import * as secretConfig from '../../../common/secret.config.json';
import { IAccountService } from './account.service';
const config: any = secretConfig;


export class WithdrawAccountService implements IAccountService {

    async insertTransactionLog(trxLog: TrxLogRecord): Promise<any> {
        try {
            /*trxLog.senderAcNum = await CommonHelper.getColValue("gmsUserAccount", "id", { "fkUserId": trxLog.fkSenderId, "acType": Constant.Payment.AccType.Withdraw });
            trxLog.receiverAcNum = await CommonHelper.getColValue("gmsUserAccount", "id", { "fkUserId": trxLog.fkReceiverId, "acType": Constant.Payment.AccType.Withdraw });*/

            //trxLog.senderAcNum = trxLog.fkSenderId; // await CommonHelper.getColValue("gmsUserAccounts", "id", { "fkUserId": trxLog.fkSenderId});
            //trxLog.receiverAcNum = trxLog.fkReceiverId; // await CommonHelper.getColValue("gmsUserAccounts", "id", { "fkUserId": trxLog.fkReceiverId});

            return await models.gmsPaymentTransactionLogWithdraw.build(trxLog).save();
        } catch (error) {
            console.log("Error (insertTransactionLog) : ", error);
            return false;
        }
    }

    async getTrxByOrderId(OrderId: string) {
        try {
            return await models.sequelize1.query(
                `SELECT * FROM gmsPaymentTransactionLogWithdraw WHERE customerRefNum="${OrderId}"`,
                { type: sequelize.QueryTypes.SELECT });
        } catch (error) {
            console.log("Error in getTrxByOrderId for order id : " + OrderId);
        }
        return [];
    }

    async updateTransactionLog(trxLog: any, condition: any): Promise<boolean> {
        try {
            const data = await models.gmsPaymentTransactionLogWithdraw.update(trxLog, {
                where: condition
            });
            if (data[0] > 0)
                return true;
        } catch (error) {
            console.log("Error (updateTransactionLog) : ", error);
        }
        return false;
    }

    async getUnassignedTrxLog(senderId: any, receiverId: any, gameId: any, gameEngine: any, engineId: any): Promise<Array<{}>> {
        try {
            return await models.sequelize1.query(
                `select id,amount from gmsPaymentTransactionLogWithdraw where fkSenderId=${senderId} and 
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
                `UPDATE gmsPaymentTransactionLogWithdraw set pgRefNo=${pgRefNo} 
                where id=${id} LIMIT 1`, { type: sequelize.QueryTypes.UPDATE });
        } catch (error) {
            console.log("Exception > Engine Key Id update failed for withdraw log id: " + id + ", pgRefNo: " + pgRefNo);
        }
        return false;
    }

    async isRefunded(pgRefNo: any, playerId: any): Promise<boolean> {
        console.log("Withdraw Battle payment Check--PG Ref Num--" + pgRefNo + ",  PlayerID : " + playerId);
        // var data=await models.sequelize.query("select count(*) as cnt from gmsPaymentTransactionLogWithdraw where fkReceiverId="+playerId+" and pgRefNo='"+pgRefNo+"' and requestType in (30,50) ",{ type: sequelize.QueryTypes.SELECT});
        // return data[0]['cnt']>=1?true:false;
        const data = await models.sequelize.query("SELECT requestType, SUM(amount) AS totalAmount FROM gmsPaymentTransactionLogWithdraw WHERE pgRefNo like '" + pgRefNo + "%' AND (fkSenderId=" + playerId + " OR fkReceiverId=" + playerId + " ) AND requestType IN (20, 50) GROUP BY `requestType` ORDER BY requestType", { type: sequelize.QueryTypes.SELECT });
        let feeAmount = 0;
        let refundAmount = 0;
        for (let i = 0; i < data.length; i++) {
            if (+data[i].requestType == Constant.Payment.reqType.TLW.GamePlay) {
                feeAmount += data[i].totalAmount
            } else if (+data[i].requestType == Constant.Payment.reqType.TLW.RefundToPlAc) {
                refundAmount += data[i].totalAmount
            }
        }
        if (refundAmount >= feeAmount) {
            return true;
        } else {
            return false;
        }
    }

    async createTrxLogRecord(trxLog: TrxLogRecord): Promise<boolean> {
        let result = false;
        trxLog.senderClosingBalance = 0;
        trxLog.receiverClosingBalance = 0;
        let isCreated = await this.insertTransactionLog(trxLog);

        if (isCreated) {
            let from:any = {};
            from['reason']="CREATE_TXN_LOG_WITHDRAW"
            from['txnLogId']=isCreated['dataValues']['id'];
            const isBalanceUpdated = await PaymentHelper.updateSenderReceiverAccountBalance(
                trxLog.fkSenderId,
                trxLog.fkReceiverId,
                Constant.Payment.AccType.Withdraw,
                trxLog.amount,
                from
            );
            result = result || isBalanceUpdated;

            if (result)
                console.log("Success! Created log record for withdraw account, TrxLog: ", trxLog);
            else
                console.log("Failed! Creating log record for withdraw account, TrxLog: ", trxLog);
        }
        return result;
    }

    async getTrxLogForRefund(userId: any, pgRefNo: any, gameId: any, gameEngine: any, engineId: any): Promise<Array<{}>> {
        return await models.sequelize1.query("select id, amount, pgRefNo from gmsPaymentTransactionLogWithdraw where" +
            "  fkSenderId=" + userId + " and fkReceiverId=" + config.financialUser.Settlement + " and pgRefNo like '" + pgRefNo + "%' and requestType=20 and fkGameId=" + gameId + " and gameEngine=" + gameEngine + " and engineId=" + engineId, { type: sequelize.QueryTypes.SELECT });
    }

    async refundPayment(userId: any, pgRefNo: any, gameId: any, gameEngine: any, engineId: any, masterSession: any = null): Promise<boolean> {
        let result = true;
        const trxLogList = await this.getTrxLogForRefund(userId, pgRefNo, gameId, gameEngine, engineId);
        if (trxLogList && trxLogList.length > 0 && !await this.isRefunded(pgRefNo, userId)) {
            const trxLog = await PaymentHelper.getTrxLogObject(
                config.financialUser.Settlement,
                userId,
                trxLogList[0]['amount'],
                Constant.Payment.reqType.TLW.RefundToPlAc,
                Constant.Payment.payStatus.TLW.Success,
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
        const trxLog = await PaymentHelper.getTrxLogObject(
            config.financialUser.Settlement,
            userId,
            amount,
            Constant.Payment.reqType.TLW.TFGRefundToPlAc,
            Constant.Payment.payStatus.TLW.Success,
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
    
    async getTotalWithdrawOfUsers(userId){
        try{
            let data=await models.sequelize.query(`SELECT sum(amount) totalWithdraw
                    from gmsPaymentTransactionLogWithdraw 
                    WHERE fkSenderId = (${userId}) AND requestType=10 AND payStatus=10 `,
                    { type: sequelize.QueryTypes.SELECT });
            return data[0]['totalWithdraw'];
        }
        catch(error){
            console.log("Error  in (getTotalWithdrawOfUsers) : ",error);
        }
    }
}

export default new WithdrawAccountService();
