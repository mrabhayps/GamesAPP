import sequelize from 'sequelize';
import models from '../models/index';
import Constant from '../../common/app.constant';
import helper from '../../common/helper';
import PaymentUtils from '../services/payment/helper';
import MasterPayment from '../services/payment/master.service';
import BattleRoom from '../services/battleRoom.service';
import * as secretConfig  from '../../common/secret.config.json';
var config:any=secretConfig;

export class ScratchCard{

    private getScratchCardData(data: [], error: boolean, statusCode: number, message: string, recordTotal: number, isEncrypted=false) {
        return {
            data: data,
            error: error,
            statusCode: statusCode,
            message: message,
            recordTotal: recordTotal,
            isEncrypted: isEncrypted
        }
    }

    async generateRandomNumber(min:number, max:number){
        try{
            if(max <= 3) 
                return 1;
            return Math.floor(Math.random() * (max - min) + min);
        }catch(error){
            console.log("Error - generateRandomNumber: ", error);
            return 0;
        }
    }

    async generateScratchCard(amount:number){
        try{
            let scratchCards = await helper.getAllColValue("gmsScratchCard", {"amount":amount});
            if(scratchCards.length > 0){
                return scratchCards[0];
            }else{
                let scratchCard:any = {};
                scratchCard.amount = amount;
                scratchCard.status = Constant.ScratchCard.Status.Active;
                let data = await models.gmsScratchCard.build(scratchCard).save();
                return data;
            }  
        }catch(error){
            console.log("Error - generateScratchCard: ", error);
            throw new Error("Scratch card is not available right now. Please try again after some time.")
        }
    }

    async getWinAmountForScratchCard(userId:number, gameType:number, referenceId:string){
        try{
            if(gameType == Constant.GameEngine.Battle){
                let battleRoom = await helper.getAllColValue("gmsBattleRoom", {"br_roomId":referenceId});
                if(battleRoom && battleRoom.length>0 && (battleRoom[0].fk_PlayerId1 == userId || battleRoom[0].fk_PlayerId2 == userId)){
                    const battle = await helper.getAllColValue("gmsBattle", {"id":battleRoom[0].fk_BattleId});
                    const commission = (battle[0].paidAmount * 2) - battle[0].winningAmount;
                    const maxAmount = Math.floor(commission / 2);
                    if (maxAmount <= 0){
                        throw new Error("Scratch card is not applicable for this battle");
                    }
                    const winAmount = await this.generateRandomNumber(1, maxAmount);
                    return winAmount;
                }else{
                    throw new Error("Currently scratch card is not applicable for this user");
                }   
            }else {
                throw new Error("Currently scratch card is applicable for only Battle Games");
            }          
        }catch(error){
            console.log("Error - getWinAmountForScratchCard: ", error);
            throw error;
        }
    }

    async checkScratchCardIsAssigned(userId:number, referenceId:string){
        try{
            let data = await models.sequelize.query(
                `SELECT 
                    gusc.id, 
                    gusc.fkUserId, 
                    gusc.referenceId, 
                    gusc.cardState, 
                    gsc.title, 
                    gsc.amount, 
                    gusc.isAmountCredited, 
                    gusc.dateAvailable, 
                    gusc.expiryDate, 
                    gusc.createdAt, 
                    gusc.updatedAt 
                FROM 
                    gmsUserScratchCards gusc, 
                    gmsScratchCard gsc 
                WHERE 
                    gusc.fkScratchCardId=gsc.id
                    AND gusc.referenceId=:referenceId 
                    AND gusc.fkUserId=:userId`,
                { replacements: {referenceId: referenceId, userId: userId}, type: sequelize.QueryTypes.SELECT });
            if(data.length > 0){
                return data[0];
            }
        }catch(error){
            console.log("Error - checkScratchCardIsAssigned: ", error);
        }
        return false;
    }

    async createScratchCard(userId:number, gameType:number, referenceId:string){
        let data:any = {}
        try{
            console.log("Reference Id: ", referenceId)
            const scratchCardData = await this.checkScratchCardIsAssigned(userId, referenceId)
            if(scratchCardData){
                return this.getScratchCardData(scratchCardData, false, 200, "Scratch card has been created already to this user .", 1, true);
            }else{
                let userScratchCard:any = {};
                const winAmount = await this.getWinAmountForScratchCard(userId, gameType, referenceId)
                const scratchCard = await this.generateScratchCard(winAmount);
                userScratchCard.fkUserId = userId;
                userScratchCard.fkScratchCardId = scratchCard.id;
                userScratchCard.referenceId = referenceId;
                userScratchCard.gameType = gameType;
                userScratchCard.cardState = Constant.ScratchCard.State.Created;
                userScratchCard.isAmountCredited = false;
                userScratchCard.status = Constant.ScratchCard.Status.Active;
                const userScratchCardObj = await models.gmsUserScratchCards.build(userScratchCard).save();
                data.id = userScratchCardObj.id;
                data.fkUserId = userId;
                data.referenceId = userScratchCardObj.referenceId;
                console.log("Title: ",  scratchCard.title);
                data.title = scratchCard.title;
                data.amount = winAmount;
                data.gameType = userScratchCardObj.gameType;
                data.cardState = userScratchCardObj.cardState;
                data.status = userScratchCardObj.status;
                data.isAmountCredited = userScratchCardObj.isAmountCredited?1:0;
                data.createdAt = userScratchCardObj.createdAt;
                data.updatedAt = userScratchCardObj.createdAt;
                return this.getScratchCardData(data, false, 200, "Scratch created successfully! ", 1);
            }
        }catch(error){
            console.log("Error - createScratchCard: ", error);
            return this.getScratchCardData([], true, 500, error.message, 0);
        }
    }

    async getScratchCardDetails(userId:number, userScratchCardId:number){
        try{
            let data = await models.sequelize.query(
                `SELECT 
                    gusc.id, 
                    gusc.fkUserId, 
                    gusc.referenceId, 
                    gusc.cardState, 
                    gusc.gameType,
                    gsc.title, 
                    gsc.amount, 
                    gusc.isAmountCredited, 
                    gusc.dateAvailable, 
                    gusc.expiryDate, 
                    gusc.createdAt, 
                    gusc.updatedAt 
                FROM 
                    gmsUserScratchCards gusc, 
                    gmsScratchCard gsc 
                WHERE 
                    gusc.fkScratchCardId=gsc.id
                    AND gusc.id=:userScratchCardId
                    AND gusc.fkUserId=:userId`,
                { replacements: {userScratchCardId: userScratchCardId, userId: userId}, type: sequelize.QueryTypes.SELECT });
            if(data.length > 0){
                return data[0];
            }
        }catch(error){
            console.log("Error - getScratchCardDetails: ", error);
        }
        return false;
    }

    async getUserScratchCard(userId:number, userScratchCardId:number){
        try{
            let userScratchCard = await helper.getAllColValue("gmsUserScratchCards", {"id": userScratchCardId, "fkUserId":userId});
            if(userScratchCard.length > 0){
                return userScratchCard[0];
            }
        }catch(error){
            console.log("Error - getUserScratchCard: ", error);
        }
        return false;
    }

    async scratchedScratchCard(userId,userScratchCardId){
        try{
            const userScratchCard = await this.getScratchCardDetails(userId, userScratchCardId);
            if(userScratchCard && userScratchCard.cardState==1){
                let update = await models.gmsUserScratchCards.update({cardState:3}, {
                    where: {
                        fkUserId: userId,
                        id: userScratchCardId
                    }
                });
                if(update[0] > 0)
                    return 200;
                else
                    return 500;
            }
            else{
                return 400; //Already scratched.
            }
        }
        catch(error)
        {
            console.log("Error in scratchedScratchCard() : ",error);
            return false;
        }
    }

    async redeemsToDeposite(userId,amount,onboardedUserId){
        try{
            
            //Credit Amount to Bonus Account.
            const trxObj = await PaymentUtils.getTrxLogObject(
                config.financialUser.Settlement,
                userId,
                amount,
                Constant.Payment.reqType.TLB.ScratchCard,
                Constant.Payment.payStatus.TLB.Success,
                0,
                0,
                onboardedUserId,
                null,
                null, 
                null,
            );
            const isBonusTrxRecordCreated=await MasterPayment.createTrxLogRecord(trxObj, Constant.Payment.AccType.Bonus);
            if(isBonusTrxRecordCreated){
                //Unloack Amount of gmsUserScratchCard.
                let userScratchCardUpdateData:any={};
                userScratchCardUpdateData.cardState=Constant.ScratchCard.State.Unlocked;
                userScratchCardUpdateData.isAmountCredited=1;
                let updateUserScratchCard = await models.gmsUserScratchCards.update(userScratchCardUpdateData, {
                    where: {
                        fkUserId: userId,
                        cardState: Constant.ScratchCard.State.Scratched,
                        isAmountCredited:0
                    }
                });

                //Make Last Ticket Inactive.
                let userReferralTicketData:any={};
                userReferralTicketData.isDeposited=1;
                userReferralTicketData.status=Constant.ScratchCard.REFERRAL_STATUS.CONSUMED;

                let updateUserReferralTickets=await models.gmsUserReferralTickets.update(userReferralTicketData, {
                    where: {
                        fkUserId: userId,
                        onboardedUserId:onboardedUserId,
                        status: Constant.ScratchCard.REFERRAL_STATUS.ACTIVE
                    }
                });

               return 200;
            }
            else{
                return 500;
            }  
        }
        catch(error){
            console.log("Error in redeemsToDeposite : ",error);
            return 500;
        }
    }
    async updateScrachCardDetails(userId:number, userScratchCardId:number, cardState:number){
        try{

            let userScratchCardData:any = {};
            userScratchCardData.cardState = cardState;
            if (cardState == Constant.ScratchCard.State.Scratched){
                const userScratchCard = await this.getScratchCardDetails(userId, userScratchCardId);
                if(userScratchCard){
                    if(userScratchCard.cardState == Constant.ScratchCard.State.Scratched){
                        return this.getScratchCardData([], true, 406, "We have processed this scratch card already.", 0);
                    }
                    // if(userScratchCard.cardState != Constant.ScratchCard.State.Unlocked){
                    //     return this.getScratchCardData([], true, 412, "You must share the scratch card to unlock it.", 0);
                    // }
                    const battleRoom = await BattleRoom.getBattleRoomBr(userScratchCard.referenceId)
                    const trxObj = await PaymentUtils.getTrxLogObject(
                        config.financialUser.Settlement,
                        userId,
                        userScratchCard.amount,
                        Constant.Payment.reqType.TLB.ScratchCard,
                        Constant.Payment.payStatus.TLB.Success,
                        0,
                        0,
                        userScratchCard.referenceId,
                        battleRoom[0].fk_GameId,
                        Constant.GameEngine.Battle, 
                        battleRoom[0].fk_BattleId,
                    );
                    const isBonusTrxRecordCreated=await MasterPayment.createTrxLogRecord(trxObj, Constant.Payment.AccType.Bonus);
                    if(isBonusTrxRecordCreated)
                        userScratchCardData.isAmountCredited = true;
                }else{
                    return this.getScratchCardData([], true, 503, "Scratch card is not available!", 0);
                }
            } 
            let data = await models.gmsUserScratchCards.update(userScratchCardData, {
                where: {
                    fkUserId: userId,
                    id: userScratchCardId
                }
            });
            if(data[0] > 0){
                return this.getScratchCardData([], false, 200, "Scratch card has been updated successfully.", 0);
            }else{
                return this.getScratchCardData([], true, 503, "Sorry! We are facing some technical issue. Please try again.", 0);
            }
        }catch(error){
            console.log("Error - updateScrachCardDetails: ", error);
            return this.getScratchCardData([], true, 502, "Scratch card is not available!", 0);
        }   
    }

    async getScratchCardsList(userId:number, paginate=false, page=1, page_size=20){
        try{
            let condition:any = {
                userId: userId
            }
            const start = page_size * (page - 1);
            let limit_query = "";
            if (paginate) {
                limit_query = " LIMIT "+start+", "+page_size+"";
            }
            let data = await models.sequelize.query(
                `SELECT 
                    gusc.id, 
                    gusc.fkUserId, 
                    gusc.referenceId, 
                    gusc.cardState, 
                    gusc.gameType,
                    gsc.title, 
                    gsc.amount, 
                    gusc.isAmountCredited, 
                    gusc.dateAvailable, 
                    gusc.expiryDate, 
                    gusc.createdAt, 
                    gusc.updatedAt 
                FROM 
                    gmsUserScratchCards gusc, 
                    gmsScratchCard gsc 
                WHERE 
                    gusc.fkScratchCardId=gsc.id 
                    AND gusc.fkUserId=:userId 
                    ORDER BY gusc.cardState=1 DESC, gusc.createdAt DESC` + limit_query,
                { replacements: condition, type: sequelize.QueryTypes.SELECT });
            return data;
        }catch(error){
            console.log("Error - getScratchCardsList: ", error);
            return false;
        }
    }
    async getTotalRewards(userId:number){
        try{
            let condition:any = {
                cardState: Constant.ScratchCard.State.Scratched,
                userId: userId
            }
            let data = await models.sequelize.query(
                `SELECT 
                    sum(gsc.amount) as totalRewards
                FROM 
                    gmsUserScratchCards gusc, 
                    gmsScratchCard gsc 
                WHERE 
                    gusc.fkScratchCardId=gsc.id 
                    AND gusc.cardState=:cardState 
                    AND gusc.fkUserId=:userId`,
                { replacements: condition, type: sequelize.QueryTypes.SELECT }); 
            return data[0]['totalRewards']?data[0]['totalRewards']:0;
        }catch(error){
            console.log("Error - getTotalRewards: ", error);
            return 0;
        }
    }

    async getUnlockedAmount(userId:number){
        try{
            let data = await models.sequelize.query(
                `SELECT 
                    sum(gsc.amount) as unlockedAmount
                FROM 
                    gmsUserScratchCards gusc, 
                    gmsScratchCard gsc 
                WHERE 
                    gusc.fkScratchCardId=gsc.id 
                    AND gusc.cardState=:cardState 
                    AND gusc.isAmountCredited=:isAmountCredited
                    AND gusc.fkUserId=:userId`,
                { 
                    replacements: {
                        cardState: Constant.ScratchCard.State.Scratched,
                        isAmountCredited:0,
                        userId:userId
                    },
                    type: sequelize.QueryTypes.SELECT }
                ); 
            return data[0]['unlockedAmount'];
        }catch(error){
            console.log("Error in getUnlockedAmount : ", error);
            return 0;
        }
    }

    async getAvailableTickets(userId:number){
        try{
            let data = await models.sequelize.query(
                `SELECT 
                    count(id) as cnt,onboardedUserId
                FROM 
                    gmsUserReferralTickets gurt 
                WHERE 
                    gurt.fkUserId=:userId 
                    AND gurt.status=:status`,
                { 
                    replacements: {
                        userId:userId,
                        status: Constant.ScratchCard.REFERRAL_STATUS.ACTIVE,
                    },
                    type: sequelize.QueryTypes.SELECT }
                ); 
            return {cnt:data[0]['cnt'],onboardedUserId:data[0]['onboardedUserId']};
        }
        catch(error){
            console.log("Error in getAvailableTickets() : ",error);
            return 0;
        }
    }

    async isAvailableForScratchCard(userId,gameEngine,referanceId){
        try{

            let userScratchData= await models.sequelize.query(
                `SELECT 
                    count(id) as cnt
                FROM 
                    gmsUserScratchCards  
                WHERE 
                    fkUserId=:userId 
                    AND gameType=:gameEngine
                    AND referenceId=:referanceId`,
                { 
                    replacements: {
                        userId:userId,
                        gameEngine: gameEngine,
                        referanceId:referanceId
                    },
                    type: sequelize.QueryTypes.SELECT }
                ); 

            if(userScratchData && userScratchData[0]['cnt']>0){
                return false;
            }
            else{
                return true;
                /*let trxData = await models.sequelize.query(
                    `SELECT 
                        count(id) as cnt
                    FROM 
                        gmsPaymentTransactionLogWithdraw  
                    WHERE 
                        fkReceiverId=:userId 
                        AND gameEngine=:gameEngine
                        AND pgRefNo=:referanceId
                        AND requestType=30
                        AND payStatus=10`,
                    { 
                        replacements: {
                            userId:userId,
                            gameEngine: gameEngine,
                            referanceId:referanceId
                        },
                        type: sequelize.QueryTypes.SELECT }
                    );
                    return trxData && trxData[0]['cnt']>0 ? true:false;*/
            }
        }
        catch(error){
            console.log("Error in isAvailableForScratchCard() : ",error);
            return false;
        }
    }

    async getReferralTicketList(userId){
        try{
            let data=await models.sequelize.query(
                `SELECT 
                    u.mobile,u.userName,u.image,u.defaultImage,gurt.isDeposited,gurt.status
                FROM 
                    gmsUserReferralTickets gurt,
                    gmsUsers u
                WHERE 
                    gurt.fkUserId=:userId 
                    AND u.id=gurt.onboardedUserId`,
                { 
                    replacements: {
                        userId:userId
                    },
                    type: sequelize.QueryTypes.SELECT }
                ); 
            return data;
        }
        catch(error){
            console.log("Error in getReferralTicketList() : ",error);
            return false;
        }
    }
}
export default new ScratchCard();