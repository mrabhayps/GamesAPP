import sequelize from 'sequelize';
import models from '../models/index';
import Constant from '../../common/app.constant';
import PaymentUtils from '../services/payment/helper';
import MasterPayment from '../services/payment/master.service';
import * as secretConfig from '../../common/secret.config.json';
import helper from '../../common/helper';
import utilityService, { Utility } from '../../common/utility.service';

let config: any = secretConfig;

export class Referral {
    async getReferralDetails(userId: number) {
        try {
            const referral: any = await models.gmsUserReferral.findOne({ where: { refUserId: userId } });
            return referral
        } catch (error) {
            console.log("Error: ", error);
            throw new Error("Referral is not available");
        }
    }

    async generateTransactionId(userId: number, refUserId: number) {
        try {
            const trxId = "REF_" + userId + "_" + refUserId + "_" + Date.now();
            return trxId;
        } catch (error) {
            console.log("Error: ", error);
            return null;
        }
    }

    async deductAmountFromReferral(userId: number, refNo: any, amount: number) {
        try {
            const trxObj: any = await PaymentUtils.getTrxLogObject(
                userId,
                config.financialUser.Settlement,
                amount,
                Constant.Payment.reqType.TLR.WinningPrize,
                Constant.Payment.payStatus.TLR.Success,
                0,
                0,
                refNo,
                null,
                null,
                null,
            );
            const isDeductFromUser = await MasterPayment.createTrxLogRecord(trxObj, Constant.Payment.AccType.Referral);
            return isDeductFromUser;
        } catch (error) {
            console.log("Error: ", error);
            return false;
        }
    }

    /*
    *   Author: Bhaskar Ganji
    *   Date: 6 June 2022
    * 
    *   Source of calling this function
    *   1: User deposit 
    *   2: It happens for all type of Payment Gateways
    *   3: It called on Cron - 10040 functionality.
    * 
    *   Modification History
    *   1: Abhay Pratap Singh (GA-1086)  10/March/2023 
    * 
    */

    async creditAmountToReferrer(refUser: number, despositedAmount: number) {
        try {
            const referral: any = await this.getReferralDetails(refUser);
            if (despositedAmount > 0) {
                //check Whether User are Creator or normal user.
                let isCreators = await helper.getColValue("gmsUsers",'isCreatorStatus',{'id':referral.fkUserId})
                let amount=0;
                let reqType=null;
                let payStatus=null;
                let acType=null;
                let description=null;
                if(isCreators==2){
                    //Creators flow
                    //amount = Math.round((despositedAmount * config.referAndEarn.referrerPercentageCreators) / 100);
                    amount = + ((despositedAmount * config.referAndEarn.referrerPercentageCreators) / 100).toFixed(2);
                    reqType=Constant.Payment.reqType.TLW.ReferralDepositBonusCreators;
                    payStatus=Constant.Payment.payStatus.TLW.Success;
                    acType= Constant.Payment.AccType.Withdraw;
                    description= await PaymentUtils.preparedDescription("BONUS","DEPOSITBONUSCREATOR",amount);
                }
                else{
                    //Normal flow
                    //amount = Math.round((despositedAmount * config.referAndEarn.referrerPercentage) / 100);
                    amount = + ((despositedAmount * config.referAndEarn.referrerPercentage) / 100).toFixed(2);
                    reqType=Constant.Payment.reqType.TLB.ReferralDepositBonus;
                    payStatus=Constant.Payment.payStatus.TLB.Success;
                    acType=Constant.Payment.AccType.Bonus;
                    description= await PaymentUtils.preparedDescription("BONUS","DEPOSITBONUS",amount);
                }
                const trxId = await this.generateTransactionId(referral.fkUserId, referral.refUserId)
                const trxObj: any = await PaymentUtils.getTrxLogObject(
                    config.financialUser.Settlement,
                    referral.fkUserId,
                    amount,
                    reqType,
                    payStatus,
                    0,
                    0,
                    trxId,
                    null,
                    null,
                    null,
                    description
                );
                
                const isDepositedToUser = await MasterPayment.createTrxLogRecord(trxObj, acType);
                if (isDepositedToUser) {
                    let referralLog: any = {}
                    referralLog.fkUserId = referral.fkUserId;
                    referralLog.refUserId = referral.refUserId;
                    referralLog.fkUserReferralId = referral.id;
                    referralLog.source = Constant.ReferralSource.REFERRAL_BONUS;
                    referralLog.status = Constant.Referral.DEPOSITED;
                    referralLog.amount = amount;
                    await this.createReferralLog(referralLog);
                } else {
                    console.log("Deposit is failed to User");
                }
            }
        } catch (error) {
            console.log("Error: ", error.message);
        }
        return false;
    }

    async creditAmountTo(refUser: number) {
        try {
            const referral: any = await this.getReferralDetails(refUser);
            // const referralAmount = await PaymentUtils.getUserAccountBal(referral.fkUserId, Constant.Payment.AccType.Referral);
            const referralAmount = await PaymentUtils.getUserAccountBalV1(referral.fkUserId, Constant.Payment.AccType.Referral);
            if (referralAmount > 0) {
                const amount = referralAmount / 2;
                const trxId = await this.generateTransactionId(referral.fkUserId, referral.refUserId)
                let description= await PaymentUtils.preparedDescription("BONUS","GEMSREEDEM",referralAmount);

                const trxObj: any = await PaymentUtils.getTrxLogObject(
                    config.financialUser.Settlement,
                    referral.fkUserId,
                    referralAmount,
                    Constant.Payment.reqType.TLB.GemsReedems,
                    Constant.Payment.payStatus.TLB.Success,
                    0,
                    0,
                    trxId,
                    null,
                    null,
                    null,
                    description
                );
                const isDepositedToUser = await MasterPayment.createTrxLogRecord(trxObj, Constant.Payment.AccType.Bonus);
                if (isDepositedToUser) {
                    trxObj.fkReceiverId = refUser;
                    trxObj.requestType=Constant.Payment.reqType.TLB.GemsBonus;
                    trxObj.description=await PaymentUtils.preparedDescription("BONUS","GEMSBONUS",referralAmount);
                    const isDepositedToRefUser = await MasterPayment.createTrxLogRecord(trxObj, Constant.Payment.AccType.Bonus);
                    if (isDepositedToRefUser) {
                        await this.deductAmountFromReferral(referral.fkUserId, trxId, referralAmount);
                        let referralLog: any = {}
                        referralLog.fkUserId = referral.fkUserId;
                        referralLog.refUserId = referral.refUserId;
                        referralLog.fkUserReferralId = referral.id;
                        referralLog.source = Constant.ReferralSource.GEMS;
                        referralLog.status = Constant.Referral.DEPOSITED;
                        referralLog.amount = referralAmount;
                        await this.createReferralLog(referralLog);
                    }
                } else {
                    console.log("Deposit is failed to User");
                }
            }
            // else {
            //     console.log("Referral amount is 0");
            //     referral.isDeposited = 0;
            //     referral.status = Constant.Referral.DEPOSITED;
            //     referral.amount = 0;
            //     await referral.save();
            // }
        } catch (error) {
            console.log("Error: ", error.message);
        }
        return false;
    }

    async getUserReferralsList(userId: number, forGems: boolean = false) {
        try {
            let source: Array<number> = [Constant.ReferralSource.JOINED]
            if (forGems) {
                source.push(Constant.ReferralSource.GEMS)
            } else {
                source.push(Constant.ReferralSource.REFERRAL_BONUS)
            }
            const data = await models.sequelize.query(
                `SELECT 
                    gu.firstName, 
                    gu.lastName, 
                    gu.userName, 
                    gur.source, 
                    gur.status, 
                    gur.amount, 
                    gur.status, 
                    gur.createdAt, 
                    gur.updatedAt 
                FROM 
                    gmsUserReferralLog gur, 
                    gmsUsers gu 
                WHERE 
                    gur.refUserId=gu.id 
                    AND gur.source IN (:source) 
                    AND gur.fkUserId=:userId
                ORDER BY gur.createdAt DESC`,
                { replacements: { userId: userId, source: source }, type: sequelize.QueryTypes.SELECT });

            return data;
        } catch (error) {
            console.log("Error in getUserReferralsList: ", error);
            return [];
        }
    }

    async createReferralLog(referralData: any) {
        try {
            let data = await models.gmsUserReferralLog.build(referralData).save();
            return data;
        }
        catch (error) {
            console.log("Error (createReferralLog) : ", error)
            return false;
        }

    }

    async getTotalReferralUser(userId:number){
        try {
            let data=await models.sequelize.query(`SELECT refUserId
                    from gmsUserReferral WHERE fkUserId=${userId}`,
                    { type: sequelize.QueryTypes.SELECT });

            let retData:any={};
            retData.totalUser=data.length;
            retData.userIds=[];

            for(let i=0; i<data.length;i++){
                retData.userIds.push(data[i]['refUserId']);
            }

            return retData;
        }
        catch (error) {
            console.log("Error (getTotalReferralUser) : ", error)
            return false;
        }
    }

    async getLast7DayEarningbyDepositBonus(userId:number){
        try {
            let data=await models.sequelize.query(`SELECT CAST(createdAt AS DATE) date, SUM(amount) as earning
                    FROM gmsUserReferralLog
                    WHERE fkUserId=${userId} AND source=${Constant.ReferralSource.REFERRAL_BONUS}
                    AND DATE_SUB(NOW() ,INTERVAL 7 DAY) <= createdAt 
                    GROUP BY date
                    ORDER BY date DESC`,
                    { type: sequelize.QueryTypes.SELECT });

            let currentDate=new Date(utilityService.getDate());
            let retData=[];
            for(let i=0;i<7;i++){
                if(i>0)
                    currentDate.setDate(currentDate.getDate()- 1);
                let date=utilityService.getDateFromDateTime(currentDate);
                let earning=0;

                const found = data.find(element => element.date==date);
                if(found){
                    earning=found['earning'];
                }
                retData.push({earning,date});
            }
            //console.log(retData);
            return retData;
        }
        catch (error) {
            console.log("Error (getLast7DayEarningbyDepositBonus) : ", error)
            return false;
        }
    }

    async getEarningbyDepositBonus(userId:number, oneMonth=false){
        let last30DaysCond=oneMonth?"AND createdAt >= DATE_SUB(NOW() ,INTERVAL 30 DAY)":"";
        try {
            let data=await models.sequelize.query(`SELECT SUM(amount) as earning
                    FROM gmsUserReferralLog
                    WHERE fkUserId=${userId} 
                        AND source=${Constant.ReferralSource.REFERRAL_BONUS}
                        ${last30DaysCond}`,
                    { type: sequelize.QueryTypes.SELECT });

            return +data[0]['earning'];
        }
        catch (error) {
            console.log("Error (getEarningbyDepositBonus) : ", error)
            return false;
        }
    }

    async getWikelyTopEarnerbyRefferal(){
        try {
            let data=await models.sequelize.query(`SELECT u.userName,SUM(l.amount) as earning
                    FROM gmsUserReferralLog l
                    INNER JOIN gmsUsers u on u.id=l.fkUserId AND u.isCreatorStatus=2
                    WHERE DATE_SUB(NOW() ,INTERVAL 7 DAY) <= l.createdAt
                        AND source=${Constant.ReferralSource.REFERRAL_BONUS}
                    GROUP BY l.fkUserId 
                    ORDER BY earning DESC`,
                    { type: sequelize.QueryTypes.SELECT });

            return data;
        }
        catch (error) {
            console.log("Error (getEarningbyDepositBonus) : ", error)
            return false;
        }
    }

}
export default new Referral();