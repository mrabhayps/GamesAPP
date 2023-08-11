import sequelize from 'sequelize';
import models, { sequelize1 } from '../../models/index';
import helper from '../../../common/helper';
import Constant  from '../../../common/app.constant';
import request from 'request';
import * as secretConfig  from '../../../common/secret.config.json';
var config:any=secretConfig;


export class TokenAccountService {

    async insertTransactionLog(data: any) {
        try {
            /*data.senderAcNum = await helper.getColValue("gmsUserAccount","id",{"fkUserId":data.fkSenderId,"acType":Constant.Payment.AccType.Token});
            data.receiverAcNum = await helper.getColValue("gmsUserAccount","id",{"fkUserId":data.fkReceiverId,"acType":Constant.Payment.AccType.Token});*/
            
            data.senderAcNum = await helper.getColValue("gmsUserAccounts","id",{"fkUserId":data.fkSenderId});
            data.receiverAcNum = await helper.getColValue("gmsUserAccounts","id",{"fkUserId":data.fkReceiverId});

            return await models.gmsPaymentTransactionLogToken.build(data).save();
        } catch(error) {
            console.log("Error (InsertTransactionTokenLog) : ",error);
            return false;
        }
    }

    async getTokenHistory(userId: any, paginate: boolean = false, page: number = 1, page_size: number = 20) {
        try {
            page = page - 1
            if (page < 0) {
                page = 0;
            }
            const start = page_size*page;
            let limit_query = "";
            if (paginate) {
                limit_query = " LIMIT "+start+", "+page_size+"";
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
        } catch(error){
            console.log("Error (GetTokenHistory) : ",error);
            return [] as any[];
        }
    }
    
}

export default new TokenAccountService();
