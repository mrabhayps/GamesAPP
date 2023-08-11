import sequelize from 'sequelize';
import models, { sequelize1 } from '../../models/index';
import Constant from '../../../common/app.constant';
import PaymentHelper from './helper';
import { TrxLogRecord } from './types';
import * as secretConfig from '../../../common/secret.config.json';
import { IAccountService } from './account.service';
import helper from './helper';
const config: any = secretConfig;


export class CoinsAccountService implements IAccountService {

    async insertTransactionLog(trxLog: TrxLogRecord): Promise<any> {
        try {
            // const senderAccount = await helper.getUserAccount(trxLog.fkSenderId, Constant.Payment.AccType.Coins);
            const senderAccount = await helper.getUserAccountV1(trxLog.fkSenderId, Constant.Payment.AccType.Coins);
            trxLog.senderAcNum = senderAccount.id;

            // const receiverAccount = await helper.getUserAccount(trxLog.fkReceiverId, Constant.Payment.AccType.Coins);
            const receiverAccount = await helper.getUserAccountV1(trxLog.fkReceiverId, Constant.Payment.AccType.Coins);
            trxLog.receiverAcNum = receiverAccount.id;

            return await models.gmsPaymentTransactionLogCoins.build(trxLog).save();
        } catch (error) {
            console.log("Error (insertTransactionLog) : ", error);
            return false;
        }
    }

    async updateTransactionLog(trxLog: any, condition: any): Promise<boolean> {
        try {
            const data = await models.gmsPaymentTransactionLogCoins.update(trxLog, {
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
                `select id,amount from gmsPaymentTransactionLogCoins where fkSenderId=${senderId} and 
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
                `UPDATE gmsPaymentTransactionLogCoins set pgRefNo=${pgRefNo} 
                where id=${id} LIMIT 1`, { type: sequelize.QueryTypes.UPDATE });
        } catch (error) {
            console.log("Exception > Engine Key Id update failed for coins log id: " + id + ", pgRefNo: " + pgRefNo);
        }
        return false;
    }

    async isRefunded(pgRefNo: any, playerId: any) {
        console.log("Coins Battle payment Check--PG Ref Num--" + pgRefNo + ",  PlayerID : " + playerId);
        var data = await models.sequelize.query("select count(*) as cnt from gmsPaymentTransactionLogCoins where fkReceiverId=" + playerId + " and pgRefNo like '" + pgRefNo + "%' and requestType=40 ", { type: sequelize.QueryTypes.SELECT });
        return data[0]['cnt'] >= 1 ? true : false;
    }

    async createTrxLogRecord(trxLog: TrxLogRecord): Promise<boolean> {
        let result = false;
        // const receiverBalance = await PaymentHelper.getUserAccountBal(trxLog.fkReceiverId, Constant.Payment.AccType.Coins);
        const receiverBalance = await PaymentHelper.getUserAccountBalV1(trxLog.fkReceiverId, Constant.Payment.AccType.Coins);
        trxLog.receiverClosingBalance = +receiverBalance + +trxLog.amount

        // const senderBalance = await PaymentHelper.getUserAccountBal(trxLog.fkSenderId, Constant.Payment.AccType.Coins);
        const senderBalance = await PaymentHelper.getUserAccountBalV1(trxLog.fkSenderId, Constant.Payment.AccType.Coins);
        trxLog.senderClosingBalance = +senderBalance - +trxLog.amount
        
        let isCreated = await this.insertTransactionLog(trxLog);

        if (isCreated) {
            let from:any = {};
            from['reason']="CREATE_TXN_LOG_COINS"
            from['txnLogId']= isCreated['dataValues']['id'];

            const isBalanceUpdated = await PaymentHelper.updateSenderReceiverAccountBalance(
                trxLog.fkSenderId,
                trxLog.fkReceiverId,
                Constant.Payment.AccType.Coins,
                trxLog.amount,
                from
            );
            result = result || isBalanceUpdated;

            if (result)
                console.log("Success! Created log record for coins account, TrxLog: ", trxLog);
            else
                console.log("Failed! Creating log record for coins account, TrxLog: ", trxLog);
        }
        return result;
    }

    async getTrxLogForRefund(userId: any, pgRefNo: any, gameId: any, gameEngine: any, engineId: any): Promise<Array<{}>> {
        return await models.sequelize1.query("select id, amount, pgRefNo from gmsPaymentTransactionLogCoins where fkSenderId=" + userId + " and fkReceiverId=" + config.financialUser.Settlement + " and pgRefNo like '" + pgRefNo + "%' and requestType=90 and payStatus=10 and fkGameId=" + gameId + " and gameEngine=" + gameEngine + " and engineId=" + engineId, { type: sequelize.QueryTypes.SELECT });
    }

    async refundPayment(userId: any, pgRefNo: any, gameId: any, gameEngine: any, engineId: any, masterSession: any = null): Promise<boolean> {
        let result = true;
        const trxLogList = await this.getTrxLogForRefund(userId, pgRefNo, gameId, gameEngine, engineId);
        if (trxLogList && trxLogList.length > 0 && !await this.isRefunded(pgRefNo, userId)) {
            const trxLog: TrxLogRecord = await PaymentHelper.getTrxLogObject(
                config.financialUser.Settlement,
                userId,
                trxLogList[0]['amount'],
                Constant.Payment.reqType.TLC.GameRefund,
                Constant.Payment.payStatus.TLC.Success,
                0,
                0,
                pgRefNo,
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

    async checkUserPlayedGame(masterGameSession: any, playerId: any) {
        const data = await models.sequelize.query("SELECT count(*) as cnt FROM gmsPaymentTransactionLogCoins WHERE (fkSenderId=" + playerId + " OR fkReceiverId=" + playerId + ") AND masterGameSession= '" + masterGameSession + "'  AND event IN ('PLAYER_BET', 'PLAYER_WIN');", { type: sequelize.QueryTypes.SELECT });
        return data[0]['cnt'] >= 1 ? true : false;
    }
}

export default new CoinsAccountService();
