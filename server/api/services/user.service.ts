import sequelize from 'sequelize';
import Moniker from 'moniker';
import models from '../models/index';
import helper from '../../common/helper';
import DepositAccountService from '../services/payment/depositaccount.service';
import BonusAccountService from '../services/payment/bonusaccount.service';
import TokenAccountService from '../services/payment/tokenaccount.service';
import PaymentUtils from '../services/payment/helper';
import Constant from '../../common/app.constant';
import * as secretConfig from '../../common/secret.config.json';
import { Session } from '../cache/session.service';
import s3 from '../../common/s3.service';
import fs from 'fs';
import dateFormat from 'dateformat';
import Notifications from '../notifications/notification.service';
const config: any = secretConfig;
import { v4 as uuidv4 } from 'uuid';
import withdrawaccountService from './payment/withdrawaccount.service';
import indusIndBankService  from './payment/indusindbank.service';

export class User {
    async getUserDetails(mobile) {
        try {
            let data = await models.gmsUsers.findAll({
                attributes: ["id", "mobile", "firstName", "lastName", "status", "email", "gender", "image","defaultImage","userName"],
                where: {
                    mobile: mobile + ""
                },
                raw: true
            });
            return data;
        }
        catch (error) {
            console.log("Error (GetUserDetails) : ", error)
            return false;
        }
    }
    async checkUser(condition: any, canUpdateUserName = false) {
        try {
            let data = await models.gmsUsers.findAll({
                where: condition,
                raw: true
            });
            if (data.length > 0 && canUpdateUserName) {
                return data[0].canUpdateUserName;
            } else if (data.length > 0) {
                return true;
            }
        } catch (error) {
            console.log("Check User Name Error: ", error)
        }
        return false;
    }

    async validateUserName(userId = null, userName) {
        try {
            let data = await models.gmsUsers.findAll({
                attributes: ["id", "userName", "canUpdateUserName"],
                where: { "id": userId },
                raw: true
            });
            if (data[0]['userName'] == userName) {
                console.log("User name is same for userId : " + userId);
                return true;
            }
            else {
                if (data[0]['canUpdateUserName']) {
                    console.log("User name is different . But now we can update the change user ID : " + userId);
                    return "update";
                }
                else {
                    console.log("User name is different . And now we can't update the change user Name : " + userName + " !!");
                    return false;
                }
            }
        } catch (error) {
            console.log("Check User Name Error: ", error)
        }
        return false;
    }

    async validateEmail(userId, email) {
        try {
            let data = await models.gmsUsers.findAll({
                attributes: ["id", "email"],
                where: { "email": email },
                raw: true
            });
            if (data && data.length > 0) {
                if (data.length > 1)
                    return true;
                else if (data.length == 1 && data[0]['id'] == userId)
                    return false;
                else
                    return true;
            }
            else
                return false;


        } catch (error) {
            console.log("Check User Email Error: ", error)
        }
        return false;
    }

    async CheckCorrectEmail(email) {
        return true;
        try {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);

        } catch (error) {
            console.log("Check User Email Format Error: ", error)
        }
        return false;
    }


    async generateUserName(limit: number = 0) {
        let userName: string = null;
        try {
            let names = await Moniker.generator([Moniker.adjective, Moniker.noun]);
            let name = names.choose();
            userName = name.replace("-", "") + "_" + Math.floor((Math.random() * 100) + 1);
            let status = await this.checkUser({ userName: userName });
            if (status && limit < 5) {
                userName = await this.generateUserName(limit = +1);
            }
        } catch (error) {
            console.log("Error - generateUserName:", error);
        }
        return userName;
    }

    async onBoardUser(UserDetails) {
        try {
            let userName = await this.generateUserName();
            let selectedImage = Math.floor(Math.random() * (config.profileDefaultImages.length));

            let referralCode = await this.generateReferralCode();
            const user = await models.gmsUsers.create({
                mobile: UserDetails.mobile,
                firstName:UserDetails.firstName,
                userName: userName,
                referralCode: referralCode,
                defaultImage: config.profileDefaultImages[selectedImage],
                status: 1
            });
            const userId = user.id;
            // let data=await this.createUserAuth(userId, UserDetails);
            
            //Create User Account.
            // let isUserAccountCreated = await this.createUserAccount(userId);
            
            /*let isUserAccountCreated = await this.createUserAccountV1(userId);
            if (!isUserAccountCreated)
                console.log("Unable to create user account of this user.");
            else
                console.log("User account created successfully.");

            if (isUserAccountCreated) {
                var mobileRewards = await this.creditUserRewards(userId, "newLogin");
            }*/

            var mobileRewards = await this.creditUserRewards(userId, "newLogin");

            return user;
        }
        catch (error) {
            console.log("Error (OnBoardUser) : ", error)
            return false;
        }
    }//Onboarding of new User after varifying OTP if mobile umber not registered.

    async updateUser(userId, UserDetails, isRegistrationFlow = null) {

        try {
             // Check Email Format validations
             if ('email' in UserDetails && !await this.CheckCorrectEmail(UserDetails['email'])) {
                throw new Error('You have entered wrong email');
            }

            //Check for reward if registration flow is not null.
            if (isRegistrationFlow != null) {
                // var userId=await helper.getColValue("gmsUsers","id",{"id":userId});    
                var RewardedField = ["firstName", "gender", "email", "image"];

                for (var key in UserDetails) {
                    if (RewardedField.indexOf(key) > -1) {
                        //Check It if available for rewards
                        if (isRegistrationFlow == true) {
                            if (UserDetails[key] != '' && UserDetails[key] != undefined && UserDetails[key] != null)
                                var reward = await this.creditUserRewards(userId, key);
                        }
                        else if (isRegistrationFlow == false) {
                            var existingVal = await helper.getColValue("gmsUsers", key, { "id": userId });
                            if (existingVal == null)
                                var rewards = await this.creditUserRewards(userId, key);
                        }
                    }
                }

                //Generate Referral Code.

                /*if(isRegistrationFlow==true){
                    let referralCode=await this.generateReferralCode();
                    UserDetails.referralCode=referralCode;
                }*/
            }

            let data = await models.gmsUsers.update(UserDetails, {
                where: {
                    id: userId
                }
            });
            if (data[0] > 0)
                return true;
            else
                return false;
        }
        catch (error) {
            console.log("Error (UpdateUser) : ", error)
            return false;
        }
    }//Update Users basic details

    async generateReferralCode() {
        const length = 6;
        const alphaNumeric = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        let referralCode = "";
        for (let i = length; i > 0; i--) {
            let randomChar = alphaNumeric[Math.floor(Math.random() * alphaNumeric.length)];
            if (referralCode.length == 0 && randomChar == "0") {
                i++;
                continue;
            }
            referralCode += randomChar;
            if (i == 1) {
                //Validate referral Code;
                try {
                    var data = await models.sequelize.query(`select  count(id) as cnt
                        from gmsUsers where referralCode='${referralCode}'`
                        , { type: sequelize.QueryTypes.SELECT });
                    if (data && data[0]['cnt'] > 0) {
                        i = length + 1;
                        referralCode = "";
                    }
                }
                catch (error) {
                    console.log("Error in generateReferralCode() : ", error);
                }
            }
            console.log("Referral Code : ", referralCode);
        }
        return referralCode;
    }

    async deleteUser(id) {

    }

    // Create User Authentication data
    async createUserAuthData(userAuthDetails, isForceUpdate=false) {
        try {
            const oldUserAuthData = await this.updateUserAuthDataAndSession({ fkUserId: userAuthDetails.fkUserId, status: 1 });
            if (oldUserAuthData && oldUserAuthData.length > 0 && !isForceUpdate)
                await this.sendNotificationToOldDeviceForLogout(oldUserAuthData[0].fkUserId, userAuthDetails.appUuid, oldUserAuthData[0].appUuid);
            let data = await models.gmsUserAuth.build(userAuthDetails).save();
            return data;

        } catch (error) {
            console.log("Error (Create UserAuth) : ", error)
            return false;
        }
    }

    // Destroy Session data and update UserAuth data
    async updateUserAuthDataAndSession(condition) {
        try {
            let user_data = await models.gmsUserAuth.findAll({ where: condition });
            user_data.forEach(async userAuth => {
                //await Session.destroySession(userAuth.sessionId)
                return await userAuth.update({ status: 0 });
            });

            // let data = await models.gmsUserAuth
            //     .findOne({ where: condition })
            //     .then(async obj => {
            //         if(obj){
            //             await Session.destroySession(obj.sessionId)
            //             return await obj.update({status: 0});
            //         }  
            //     })
            console.log("User Data: %s", user_data);
            return user_data;
        } catch (error) {
            console.log("Error (UpdateUserAuthentication) : ", error)
            return false
        }
    }

    // Update User Authentication Details
    async updateUserAuthData(userId, UserAuthDetails) {
        try {
            let data = await models.gmsUserAuth.update(UserAuthDetails, {
                where: {
                    fkUserId: userId,
                    status: 1
                }
            })
            if (data[0] > 0)
                return true;
        } catch (error) {
            console.log("Error (UpdateUserAuthentication) : ", error)
        }
        return false;
    }

    async createUserAccount(userId) {
        var userAcInsert: any = {};
        try {
            userAcInsert.fkUserId = userId;
            userAcInsert.acType = 10;
            userAcInsert.balance = 0;
            userAcInsert.status = 0;
            let data = await models.gmsUserAccount.build(userAcInsert).save();
            userAcInsert.acType = 20;
            data = await models.gmsUserAccount.build(userAcInsert).save();
            userAcInsert.acType = 30;
            data = await models.gmsUserAccount.build(userAcInsert).save();
            userAcInsert.acType = 40;
            data = await models.gmsUserAccount.build(userAcInsert).save();
            return data;
        }
        catch (error) {
            console.log("Error (CreateUserAccount) : ", error)
            return false;
        }
    }

    async createUserAccountV1(userId) {
        var userAcInsert: any = {};
        try {
            /*userAcInsert.fkUserId = userId;
            userAcInsert.depositBal = 0;
            userAcInsert.withdrawBal = 0;
            userAcInsert.tokenBal = 0;
            userAcInsert.bonusBal = 0;
            userAcInsert.coinBal = 0;
            userAcInsert.referralBal = 0;
            userAcInsert.status = 1;

            let data = await models.gmsUserAccounts.build(userAcInsert).save();*/

            let userAccCreateData={
                "playerId":userId,
                "amountData":{"depositBal":0, "withdrawBal":0, "bonusBal":0},
                "type":"inc",
                "from":{"purpose":"CREATE_ACCOUNT"}
            }
            
            let data= await helper.gmsUserAccountCreateOrUpdateWallet(userAccCreateData);
            return data;
        }
        catch (error) {
            console.log("Error (createUserAccountV1) : ", error)
            return false;
        }
    }



    async saveBankDetails(bankDetails) {
        try {
            let data = await models.gmsUserBankAccount.build(bankDetails).save();
            return data;
        }
        catch (error) {
            console.log("Error (SaveBankDetails) : ", error);
            return false;
        }
    }

    async updateBankDetails(userId, bankDetails) {
        try {
            let data = await models.gmsUserBankAccount.update(bankDetails, {
                where: {
                    fkUserId: userId,
                    isActive: 1
                }
            });
            return data;
        }
        catch (error) {
            console.log("Error (UpdateBankDetails) : ", error);
            return false;
        }
    }

    async getBankDetails(userId) {
        try {
            let data = await models.gmsUserBankAccount.findAll({
                where: {
                    fkUserId: userId,
                    isActive: 1
                },
                raw: true
            });
            return data;
        }
        catch (error) {
            console.log("Error (GetBankDetails) : ", error);
            return false;
        }
    }

    async getUserLeaderboard(userId, type) {
        try {
            let rank = type == 1 ? "u.rankT" : "u.rank";
            let winPrize = type == 1 ? "winPrizeT" : "winPrize";
            var data = await models.sequelize.query("select id,userName as firstName,image,defaultImage,gender,mobile,"+ winPrize +" as winPrize, "+ rank +" as `rank` "+ 
                            "from gmsUsers u where "+ rank +" is not null and "+ rank +" !=''  ORDER BY `rank` ASC LIMIT 10",
                             { type: sequelize.QueryTypes.SELECT });

            var isUserTop10 = false;
            for (var i = 0; i < data.length; i++) {
                if (data[i]['id'] == userId)
                    isUserTop10 = true;
            }
            if (!isUserTop10) {
                let user = await models.sequelize.query(`select id,userName as firstName,image,defaultImage,gender,mobile, ${winPrize} as winPrize, ${rank} as 'rank' from gmsUsers u where id=${userId} and ${rank} is not null and ${rank!}='' `,
                    { type: sequelize.QueryTypes.SELECT });
                if (user[0])
                    data.push(user[0]);
            }
            /*for(let i=0;i<data.length;i++){
                if(data[i]['image']=="" || !data[i]['image']){
                    data[i]['image']=data[i]['defaultImage'];
                }
            }*/
            return data;
        }
        catch (error) {
            console.log("Error (GetUserLeaderboard) : ", error);
            return false;
        }
    }
    async creditUserRewards(userId, rewardFieldName) {
        //Credit reward point to user Account.
        const token = config.userRegReward[rewardFieldName]['token'];
        const cash = config.userRegReward[rewardFieldName]['cash'];
        if (token > 0) {
            //Credit token rewards.
            const AcType = Constant.Payment.AccType.Token;
            //var tokenVal = await PaymentUtils.getUserAccountBal(userId, AcType);
            var tokenVal= await PaymentUtils.getUserAccountBalV1(userId, AcType);
            var tlti: any = {};
            tlti.fkSenderId = config.financialUser.GamesApp; //GamesApp Token
            tlti.fkReceiverId = userId;
            tlti.token = token;
            tlti.senderClosingTokenBal = 0;
            tlti.receiverClosingTokenBal = 0;
            tlti.requestType = Constant.Payment.reqType.TLT.Rewards;
            tlti.payStatus = 10;

            let itlt = await TokenAccountService.insertTransactionLog(tlti);
            if (itlt) {
                console.log(" Token rewards credited for : " + rewardFieldName);
                let isCredited = await PaymentUtils.trxUserAccountBal(tlti.fkReceiverId, Constant.Payment.AccType.Token, tlti.token, Constant.Payment.trxType.Credit);
                if (!isCredited)
                    console.log("Failed to update receiver balance");
                let isDebited = await PaymentUtils.trxUserAccountBal(tlti.fkSenderId, Constant.Payment.AccType.Token, tlti.token, Constant.Payment.trxType.Debit);
                if (!isDebited)
                    console.log("Failed to update receiver balance");
            }
            else
                console.log(" Unable to credit token rewards for : " + rewardFieldName);

        }//End of Token Rewards

        if (cash > 0) {
            //Credit cash rewards
            const acType = Constant.Payment.AccType.Bonus
            // var depositVal = await PaymentUtils.getUserAccountBal(userId, acType);
            //var depositVal = await PaymentUtils.getUserAccountBalV1(userId, acType);
            var tldi: any = {};
            tldi.fkSenderId = config.financialUser.GamesApp; //GamesApp Deposit
            tldi.fkReceiverId = userId;
            tldi.amount = cash;
            tldi.senderClosingBalance = 0;
            tldi.receiverClosingBalance = 0;
            tldi.requestType = Constant.Payment.reqType.TLB.Rewards;
            tldi.payStatus = Constant.Payment.payStatus.TLB.Success;
            tldi.apiMsg = rewardFieldName;
            tldi.description= await PaymentUtils.preparedDescription("BONUS","REWARDS",cash);

            let itld = await BonusAccountService.insertTransactionLog(tldi);

            if (itld) {
                let from:any={};
                from['reason']="JOINING_BONUS_REWARDS";
                from['txnLogId']=itld['dataValues']['id'];

                console.log(" Cash rewards deposited for : " + rewardFieldName);
                let isCredited = await PaymentUtils.trxUserAccountBal(tldi.fkReceiverId, acType, tldi.amount, Constant.Payment.trxType.Credit,from);
                if (!isCredited)
                    console.log("Failed to update receiver balance");
                let isDebited = await PaymentUtils.trxUserAccountBal(tldi.fkSenderId, acType, tldi.amount, Constant.Payment.trxType.Debit,from);
                if (!isDebited)
                    console.log("Failed to update sender balance");
            }
            else
                console.log(" Unable to deposit cash rewards for : " + rewardFieldName);

        }//End of cash rewards.
    }// End of credit User Rewards function.

    // Updating location in user table
    async updateLocation(userId, location, condition) {
        try {
            await models.gmsUsers
                .findOne({ where: condition })
                .then(async function (obj) {
                    if (!obj) {
                        //Update
                        await models.gmsUsers.update(location, {
                            where: {
                                id: userId
                            }
                        });
                    }
                });
            return true
        }
        catch (error) {
            console.log("Error (Update Location) : ", error);
            return false;
        }
    }

    /*async uploadProfilePic(userId: number, profilePic) {
        try {
            let imageUrl: string = null;
            const s3Client = s3.s3Client;
            const params = s3.uploadParams;
            let filePath: string = dateFormat(new Date(), "yyyy/mm/");
            let fileContent = fs.readFileSync(profilePic.path);
            let fileName = userId + "_" + new Date().getTime() + "." + profilePic.extension;
            filePath = 'media/images/profile/' + filePath + fileName;
            params.Key = filePath;
            params.Body = fileContent;
            await s3Client.upload(params, async (err, data) => {
                if (err) {
                    console.log(err);
                    throw err;
                } else {
                    console.log(data.Location);
                    imageUrl = config.mediaUrl + data.path;
                }
            });
            return config.mediaUrl + filePath;
        } catch (error) {
            throw new Error("We are not able to upload profile pic");
        }
    }*/

    async updateUserProfile(userId, userDetails) {
        try {
            // Check User Name validations
            let userNameValidation = await this.validateUserName(userId, userDetails['userName']);
            if ('userName' in userDetails && !userNameValidation) {
                throw new Error('User Name can change only once .');
            } else if (userNameValidation == "update") {
                userDetails.canUpdateUserName = 0;
            }
            else {
                //userDetails.canUpdateUserName = true;
            }

             // Check Email Format validations
             if ('email' in userDetails && !await this.CheckCorrectEmail(userDetails['email'])) {
                throw new Error('You have entered wrong email');
            }

            // Check Email validations
            if ('email' in userDetails && await this.validateEmail(userId, userDetails['email'])) {
                throw new Error('Email is already exists');
            }

            await this.updateUser(userId, userDetails, false);

        } catch (error) {
            console.log("Error - updateUserProfile : ", error);
            throw error;
        }
    }

    async sendNotificationToOldDeviceForLogout(userId, newAppUuid, oldAppUuid) {
        try {
            if (newAppUuid != oldAppUuid) {
                const notification = {
                    title: "Hey! You have logged in from another device",
                    body: "You have been logged out of this device because you logged in from another device."
                };
                const notificationData: any = {
                    "notificationType": "USER_LOG_OUT",
                    "message": "You have been logged out of this device because you logged in from another device."
                }
                const pushStatus = await Notifications.sendPushNotification(userId, notificationData, notification);
            }
            return true;
        } catch (error) {
            console.log("Error - checkMultipleLogins: ", error);
            return false
        }
    }

    async isRedeemReferralCodeAvailable(onbordedUserId, mobileNum: number) {
        try {
            var tktData = await models.sequelize.query(`select count(id) as cnt 
            from gmsUserReferralTickets 
            where onboardedUserMobile=${mobileNum}`
                , { type: sequelize.QueryTypes.SELECT });

            // 10: Not Available , 20: Available, 30:Not new user(Referral Code redeems not allow for existing user)

            if (tktData[0]['cnt'] <= 0) {
                /*var userReferralData=await models.sequelize.query(`select referralCode 
                from gmsUsers 
                where id=${onbordedUserId}`
                ,{ type: sequelize.QueryTypes.SELECT});*/

                let authData = await models.sequelize.query(`select count(id) as cnt 
                from gmsUserAuth 
                where fk_userId=${onbordedUserId}`
                    , { type: sequelize.QueryTypes.SELECT });

                /*return userReferralData && userReferralData.length>0 && 
                        userReferralData[0]['referralCode']?"30":"20";*/

                return authData && authData[0]['cnt'] > 1 ? "30" : "20";
            } else {
                return "10";
            }
        } catch (error) {
            console.log("Error in isRedeemReferralCodeAvailable() : ", error);
            return false;
        }
    }

    async getUserIdByReferralCode(referralCode: string) {
        try {
            var data = await models.sequelize.query(`select id 
            from gmsUsers
            where referralCode='${referralCode}' `
                , { type: sequelize.QueryTypes.SELECT });
            return data && data.length > 0 ? data[0]['id'] : "INCORRECT";
        } catch (error) {
            console.log("Error in getUserIdByRefferalCode() : ", error);
            return false;
        }
    }

    async generateUserReferralTickets(data: any) {
        try {
            const isSaved = await models.gmsUserReferralTickets.build(data).save();
            return isSaved;
        } catch (error) {
            console.log("Error in generateUserReferralTickets() : ", error);
            return false;
        }
    }

    async isReferralAvailable(refUserId: number) {
        try {
            let tktData = await models.sequelize.query(
                `SELECT 
                    count(id) AS cnt 
                FROM 
                    gmsUserReferral 
                WHERE 
                    refUserId=${refUserId}`,
                { type: sequelize.QueryTypes.SELECT });

            // 10: Not Available , 20: Available, 30:Not new user(Referral Code redeems not allow for existing user)
            if (tktData[0]['cnt'] <= 0) {
                let authData = await models.sequelize.query(
                    `SELECT 
                        count(id) AS cnt 
                    FROM 
                        gmsUserAuth 
                    WHERE 
                        fk_userId=${refUserId}`,
                    { type: sequelize.QueryTypes.SELECT });
                return authData && authData[0]['cnt'] > 1 ? "30" : "20";
            } else {
                return "10";
            }
        } catch (error) {
            console.log("Error in isReferralAvailable: ", error.message);
            return false;
        }
    }

    async createUserReferral(data: any) {
        try {
            const userReferral = await models.gmsUserReferral.build(data).save();
            return userReferral;
        } catch (error) {
            console.log("Error in createUserReferral: ", error.message);
            return false;
        }
    }

    async getUsernameForUserIds(userIds: []) {
        try {
            const userNames = await models.gmsUsers.findAll({
                where: {
                    id: userIds
                },
                attributes: ['id', 'firstName', 'userName']
            });
            return userNames;
        } catch (error) {
            console.log("Error in getUsernameForUserIds: ", error);
            return [];
        }
    }

    async updateUserTotalWins(userId: number) {
        try {
            await models.gmsUsers.increment('totalWins', { where: { id: userId } });
            // const user: any = await models.gmsUsers.findOne({ where: { id: userId } });
            // user.totalWins = user.totalWins + 1;
            // user.save()
        } catch (error) {
            console.log("Error in updateUserTotalWins() ", error.message);
        }
    }

    async saveRestoreId(restoreId:string,userId:number){
        try{
            let data = await models.gmsUsers.update({restoreId}, {
                where: {
                    id: userId
                }
            });
            //console.log("data : ",data);
            return data;

        }catch(error){
            console.log("Error in saveRestoreId : ", error.message);
            return false;
        }
    }

    async saveKYCDetails(saveData:any,userId:number){
        try{
            let data = await models.gmsUsers.update(saveData, {
                where: {
                    id: userId
                }
            });
            //console.log("data : ",data);
            return data;

        }catch(error){
            console.log("Error in saveKYCDetails : ", error.message);
            return false;
        }
    }

    async logUserKYCDoc(saveData){
        try{
            let data = await models.gmsUsersKYCDoc.build(saveData).save();
            return data;

        }catch(error){
            console.log("Error in logUserKYCDoc : ");
            console.log(error);
            return false;
        }
    }

    async updateCreatorStatus(updateData:any,userId:number){
        try{
            let data = await models.gmsUsers.update(updateData, {
                where: {
                    id: userId
                }
            });
            return true;

        }catch(error){
            console.log("Error in updateCreatorStatus : ", error.message);
            return false;
        }
    }

    async applyUserAsCreator(insertData:any,updateData:any,userId:number){
        let flag=false;
        try{
            //Update Previous social handles as inactive.
            await models.gmsUserCreators.update({status:0}, {
                where: {
                    fkUserId: userId
                }
            });
            

            let data = await models.gmsUserCreators.build(insertData).save();
            
            if(data){
                await models.gmsUsers.update(updateData, {
                    where: {
                        id: userId
                    }
                });
                flag=true;
            }

            return flag;

        }catch(error){
            console.log("Error in (applyUserAsCreator) : ", error);
            return false;
        }
    }

    async validateUserKYCDoc(docType, docId){
        try{
            let data = await models.sequelize.query(`select  count(id) as cnt
                    from gmsUsersKYCDoc where docType=${docType} AND docId='${docId}'`,
                    { type: sequelize.QueryTypes.SELECT });

            let existCheck = data[0]['cnt'] > 0?"EXIST" : "NOT_EXIST";
            return existCheck;
        }catch(error){
            console.log("Error in (validateUserKYCDoc) : ");
            console.log(error);
            return false;
        }
    }

    async updateUserReportCount(userId: number) {
        try {
            await models.gmsUsers.increment('reportedCount', { where: { id: userId } });
            return true;
        } catch (error) {
            console.log("Error in updateUserReportCount() ");
            console.log(error);
            return false;
        }
    }

    async insertUserReportedData (insertData : any) {
        try {
            const {reportedUserId,fkUserId} = insertData;
            let reportedUserData = await models.sequelize.query(`select reportType from gmsReportedUser where fkUserId=${fkUserId} AND reportedUserId=${reportedUserId}`,
                    { type: sequelize.QueryTypes.SELECT });
            
            if(reportedUserData.length > 0){
                return reportedUserData[0]['reportType'];
            }
            else{
                let data = await models.gmsReportedUser.build(insertData).save();
                return true;
            }
        } catch (error) {
            console.log("Error in insertUserReportedData() ");
            console.log(error);
            return false;
        }
    }

    async verifyBankDetails(userdetail, BankDetails){
        /*
            Note - 1 : In bank verification we does not credit or debit from gamesApp Wallet 
                        Because Credit happens in Indusin and debit happens fro GamesAPP Wallet
                        and both are our interbal Finencials user.
                2 : We just made the txn log and process it .
        */
        const userId=userdetail['id'];
        let retData:any={};
        
        retData['success']=false;
        retData['status']="PENDING";
        
        try{
            console.log(`Bank account verification start here for user id : ${userId}`);
            console.log(BankDetails);

            let GamesAPPUserDetails:any={};
            let verificationCount= await PaymentUtils.getUserCurrentDateVerificationCount(config.financialUser['GamesApp'],userId);
            if(verificationCount >= 3){
                retData['success']=false;
                retData['status']="LIMITEXHAUSTED";
                return retData;
            }
            GamesAPPUserDetails['id']=config.financialUser['GamesApp'];
            GamesAPPUserDetails['mobile']=userdetail['mobile'];
            GamesAPPUserDetails['email']= userdetail['email'];
            GamesAPPUserDetails['verificationUserId']=userId;

            var TransactionLogWithdraw: any = {};
            TransactionLogWithdraw.fkSenderId = config.financialUser['GamesApp']; //GamesAPP User
            TransactionLogWithdraw.fkReceiverId = config.financialUser.IndusInd; //IndusInd User
            TransactionLogWithdraw.senderAcNum = userId; // We save userId to senderAcNum for bank account verification.
            TransactionLogWithdraw.amount = 1;
            TransactionLogWithdraw.senderClosingBalance = 0;
            TransactionLogWithdraw.receiverClosingBalance = 0;
            TransactionLogWithdraw.payStatus = Constant.Payment.payStatus.TLW.Pending;
            TransactionLogWithdraw.requestType = Constant.Payment.reqType.TLW.Outward;
            TransactionLogWithdraw.pg = Constant.Payment.PG.IndusInd;
            TransactionLogWithdraw.pgRefNo = uuidv4();

            
            let insertTL = await withdrawaccountService.insertTransactionLog(TransactionLogWithdraw);
            var transactionLogId = insertTL.dataValues['id'];
            if (insertTL && transactionLogId) {
                //Make one rupee transaction through indusind IMPS
                let data = await indusIndBankService.iblWithdraw1(GamesAPPUserDetails, BankDetails, transactionLogId, TransactionLogWithdraw.amount);
                console.log(`IBL Response return data : for user ${GamesAPPUserDetails['id']} & Bank account verification user : ${userId}`);
                console.log(data);
                retData['success']=true;
                if(data['statusCode'] == 'R000'){
                    retData['status']="VERIFIED";
                }
                else if(data['statusCode'] == '500'){
                    retData['status']="FAILED";
                }
                else{
                    retData['status']="PENDING";    
                }

                return retData;
            }
            else{
                retData['success']=false;
                retData['status']="FAILED";
                return retData;
            }
        }
        catch(error){
            console.log(`Error in verifyBankDetails for user : ${userId}`);
            console.log(error)
            retData['success']=false;
            retData['status']="FAILED";
            return retData;
        }
    }

}
export default new User();