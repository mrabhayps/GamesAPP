import sequelize from 'sequelize';
import models, { sequelize1 } from '../../models/index';
import CommonHelper from '../../../common/helper';
import Constant from '../../../common/app.constant';
import PaymentHelper from './helper';
import { TrxLogRecord } from './types';
import * as secretConfig from '../../../common/secret.config.json';
import { IAccountService } from './account.service';
import helper from './helper';
const config: any = secretConfig;


export class BonusAccountService implements IAccountService {

    async insertTransactionLog(trxLog: TrxLogRecord): Promise<any> {
        try {
            // const senderAccount = await helper.getUserAccount(trxLog.fkSenderId, Constant.Payment.AccType.Bonus);
            const senderAccount = await helper.getUserAccountV1(trxLog.fkSenderId, Constant.Payment.AccType.Bonus);
            trxLog.senderAcNum = senderAccount.id;
            
            // const receiverAccount = await helper.getUserAccount(trxLog.fkReceiverId, Constant.Payment.AccType.Bonus);
            const receiverAccount = await helper.getUserAccountV1(trxLog.fkReceiverId, Constant.Payment.AccType.Bonus);
            
            trxLog.receiverAcNum = receiverAccount.id;
            return await models.gmsPaymentTransactionLogBonus.build(trxLog).save();
        } catch (error) {
            console.log("Error (insertTransactionLog) : ", error);
            return false;
        }
    }

    async updateTransactionLog(trxLog: any, condition: any): Promise<boolean> {
        try {
            const data = await models.gmsPaymentTransactionLogBonus.update(trxLog, {
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
                `select id,amount from gmsPaymentTransactionLogBonus where fkSenderId=${senderId} and 
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
                `UPDATE gmsPaymentTransactionLogBonus set pgRefNo=${pgRefNo} 
                where id=${id} LIMIT 1`, { type: sequelize.QueryTypes.UPDATE });
        } catch (error) {
            console.log("Exception > Engine Key Id update failed for bonus log id: " + id + ", pgRefNo: " + pgRefNo);
        }
        return false;
    }

    async isRefunded(pgRefNo: any, playerId: any) {
        console.log("Bonus Battle payment Check--PG Ref Num--" + pgRefNo + ",  PlayerID : " + playerId);
        // var data=await models.sequelize.query("select count(*) as cnt from gmsPaymentTransactionLogBonus where fkReceiverId="+playerId+" and pgRefNo='"+pgRefNo+"' and requestType=40 ", { type: sequelize.QueryTypes.SELECT});
        // return data[0]['cnt'] >= 1 ? true : false;
        const data = await models.sequelize.query("SELECT requestType, SUM(amount) AS totalAmount FROM gmsPaymentTransactionLogBonus WHERE pgRefNo like '" + pgRefNo + "%' AND (fkSenderId=" + playerId + " OR fkReceiverId=" + playerId + " ) AND requestType IN (20, 40) GROUP BY `requestType` ORDER BY requestType", { type: sequelize.QueryTypes.SELECT });
        let feeAmount = 0;
        let refundAmount = 0;
        for (let i = 0; i < data.length; i++) {
            if (+data[i].requestType == Constant.Payment.reqType.TLB.GamePlay) {
                feeAmount += data[i].totalAmount
            } else if (+data[i].requestType == Constant.Payment.reqType.TLB.GameRefund) {
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
                console.log("Success! Created log record for bonus account, TrxLog: ", trxLog);
            else
                console.log("Failed! Creating log record for bonus account, TrxLog: ", trxLog);
        }
        return result;
    }

    async getTrxLogForRefund(userId: any, pgRefNo: any, gameId: any, gameEngine: any, engineId: any): Promise<Array<{}>> {
        return await models.sequelize1.query("select id, amount, pgRefNo from gmsPaymentTransactionLogBonus where fkSenderId=" + userId + " and fkReceiverId=" + config.financialUser.Settlement + " and pgRefNo like '" + pgRefNo + "%' and requestType=20 and fkGameId=" + gameId + " and gameEngine=" + gameEngine + " and engineId=" + engineId, { type: sequelize.QueryTypes.SELECT });
    }

    async refundPayment(userId: any, pgRefNo: any, gameId: any, gameEngine: any, engineId: any, masterSession: any = null): Promise<boolean> {
        let result = true;
        const trxLogList = await this.getTrxLogForRefund(userId, pgRefNo, gameId, gameEngine, engineId);
        if (trxLogList && trxLogList.length > 0 && !await this.isRefunded(pgRefNo, userId)) {
            let trxLog: TrxLogRecord = await PaymentHelper.getTrxLogObject(
                config.financialUser.Settlement,
                userId,
                trxLogList[0]['amount'],
                Constant.Payment.reqType.TLB.GameRefund,
                Constant.Payment.payStatus.TLB.Success,
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
        
        let trxLog: TrxLogRecord = await PaymentHelper.getTrxLogObject(
            config.financialUser.Settlement,
            userId,
            amount,
            Constant.Payment.reqType.TLB.TFGRefund,
            Constant.Payment.payStatus.TLB.Success,
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

}

export default new BonusAccountService();
