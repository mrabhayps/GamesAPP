import { Request, Response } from 'express';
import User from '../services/user.service';
import helper from '../../common/helper';
import * as secretConfig from '../../common/secret.config.json';
import friends from '../services/friends.service';
import s3 from '../../common/s3.service';
import Games from '../services/games.service';
import fs from 'fs';
import dateFormat from 'dateformat';
import Constant from '../../common/app.constant';
import PaymentUtils from '../services/payment/helper';
import referralService from '../services/referral.service';
import depositAccountService from '../services/payment/depositaccount.service';
import Notifications from '../notifications/notification.service';
import userService from '../services/user.service';
import withdrawaccountService from '../services/payment/withdrawaccount.service';
import gamesService from '../services/games.service';
import FriendsService from '../services/friends.service';
import utilityService from '../../common/utility.service';
var config: any = secretConfig;
import request from 'request';


export class userCtrl {
    async registerUser(req: Request, res: Response) {
        console.log(req.body);
        var isRegistrationFlow = req.body.isRegistrationFlow;
        var data = await User.updateUser(req.headers.data['id'], req.body, isRegistrationFlow);
        if (!data) {
            helper.sendJSON(res, {}, true, 502, "DB Error", 0);
        } else {
            helper.sendJSON(res, {}, false, 200, "User Updated Successfully ", 0);
        }
    }

    async loggedInUserDetails(req: Request, res: Response) {
        let data = await helper.getColsValue("gmsUsers",
            ['id', 'userName', 'firstName', 'lastName', 'email', 'mobile', 'dob', 'gender', 'image', 'city', 'state', 'country', 'continent', 'status', 'latitude', 'longitude', 'rank', 'referralCode'],
            { "id": req.headers.data['id'] });
        if (data && data.length > 0) {
            let profile = data[0];
            /*let userBlances = await helper.getColsValueByOrder("gmsUserAccount", ['acType', 'balance'], { "fkUserId": req.headers.data['id'] }, [["acType", "ASC"]]);
            let wallet: any = {
                "deposit": 0,
                "withdraw": 0,
                "token": 0,
                "bonus": 0,
                "referral": 0,
                "totalBalance": 0
            };
            userBlances.forEach(element => {
                if (element.acType == Constant.Payment.AccType.Deposit) {
                    wallet.deposit = element.balance;
                } else if (element.acType == Constant.Payment.AccType.Withdraw) {
                    wallet.withdraw = element.balance;
                } else if (element.acType == Constant.Payment.AccType.Token) {
                    wallet.token = element.balance;
                } else if (element.acType == Constant.Payment.AccType.Bonus) {
                    wallet.bonus = element.balance;
                } else if (element.acType == Constant.Payment.AccType.Referral) {
                    wallet.referral = element.balance;
                }
            });*/
            //let userBlances = await helper.getAllColValue("gmsUserAccounts", { "fkUserId": req.headers.data['id'] });
            let userBlances = await helper.gmsUserAccountGet(req.headers.data['id']);
            let wallet: any = {
                "deposit": 0,
                "withdraw": 0,
                "token": 0,
                "bonus": 0,
                "referral": 0,
                "totalBalance": 0
            };
            /*
            wallet.deposit = userBlances[0]['depositBal'];
            wallet.withdraw = userBlances[0]['withdrawBal'];
            wallet.token = userBlances[0]['tokenBal'];
            wallet.bonus = userBlances[0]['bonusBal'];
            wallet.referral = userBlances[0]['referralBal'];
            wallet.totalBalance = wallet.bonus + wallet.deposit + wallet.withdraw;
            */
            
            wallet.deposit = userBlances['depositBal'];
            wallet.withdraw = userBlances['withdrawBal'];
            wallet.bonus = userBlances['bonusBal'];
            wallet.totalBalance = wallet.bonus + wallet.deposit + wallet.withdraw;
            
            profile.wallet = wallet;
            helper.sendJSON(res, profile, false, 200, "User Profile fetched successfully", data.length, true);
        }
        else {
            helper.sendJSON(res, {}, true, 502, "We are not able to fetch user profile", 0);
        }
    }

    async myProfile(req: Request, res: Response) {
        
        let isRelease = req.query.isRelease ? 3 : 1;
        let data = await helper.getAllColValue("gmsUsers", { "id": req.headers.data['id'] })    
        if (data && data.length > 0) {
            let profile = data[0];
            profile['kycResponse']=profile['kycResponse'] && profile['kycResponse'] != "" ? JSON.parse(profile['kycResponse']) : profile['kycResponse'] ;
            let friendsData = await friends.getTotalFriendsAndStatusV1(req.headers.data['id'])
            profile.totalFriends = friendsData.totalFriends;
            profile.friendStatus = friendsData.friendStatus;
            // Get Friends list
            let friendsList = await friends.getFriendsListV1(req.headers.data['id'], Constant.FriendRequestStatus.Accepted, true);
            profile.friendsList = friendsList;
            // Get favourite games
            profile['favouriteGames'] = [] //await Games.getFavouriteGames(req.headers.data['id']);

            let depositCount=await depositAccountService.getDepoistsCount(req.headers.data['id']);
            let totalDepositDone= await depositAccountService.getTotalDepositOfUsers(req.headers.data['id']);
        
            profile['whatsappSupport'] =  depositCount >= 1 ? true : false;
            profile['depositCount']=depositCount;
            profile['totalDepositDone']=totalDepositDone;
            profile['totalWithdraw']= await withdrawaccountService.getTotalWithdrawOfUsers(req.headers.data['id']);

            profile['gameMatrix']=profile['gameMatrix']?JSON.parse(profile['gameMatrix']):[];
    
            if(!global.ACTIVE_GAME_LIST){
                global.ACTIVE_GAME_LIST = await gamesService.getAllGameList();
            }
            
            let winPercentage=0;
            let winPercentageCount=0;
            let totalGamePlayCount=0;
            for(let i=0;i<profile['gameMatrix'].length; i++){
                if(profile['gameMatrix'][i]['gameId']==0){
                    profile['gameMatrix'].splice(i,1)
                    i--
                    continue;

                    /*profile['gameMatrix'][i]['gameTitle']="Cricket Fantasy";
                    profile['gameMatrix'][i]['gameIcon'] = config['FANTACY_IMAGE_ICON'];
                    profile['gameMatrix'][i]['winPercentage']=Math.floor((profile['gameMatrix'][i]['win']/profile['gameMatrix'][i]['play'])*100) | 0;
                    winPercentage=winPercentage + profile['gameMatrix'][i]['winPercentage'];
                    winPercentageCount++;*/

                }
                else{
                    const gameDataIndex = global.ACTIVE_GAME_LIST.findIndex(object => {
                        return object.id == profile['gameMatrix'][i]['gameId'];
                    });
                    if(gameDataIndex>=0){
                        profile['gameMatrix'][i]['gameTitle']= global.ACTIVE_GAME_LIST[gameDataIndex]['title'];
                        profile['gameMatrix'][i]['gameIcon'] = global.ACTIVE_GAME_LIST[gameDataIndex]['smallIconImage'];
                        profile['gameMatrix'][i]['winPercentage']=Math.floor((profile['gameMatrix'][i]['win']/profile['gameMatrix'][i]['play'])*100) | 0;
                        winPercentage=winPercentage + profile['gameMatrix'][i]['winPercentage'];
                        winPercentageCount++;
                        totalGamePlayCount= totalGamePlayCount + profile['gameMatrix'][i]['play'];
                    }
                    else{
                        profile['gameMatrix'].splice(i,1)
                        i--
                    }

                }
            }
            profile['winPercentage']= + (winPercentage/winPercentageCount).toFixed(2);
            profile['totalGamePlayCount']=totalGamePlayCount;
            helper.sendJSON(res, profile, false, 200, "User Profile fetched successfully", data.length, true);
        }
        else {
            helper.sendJSON(res, {}, true, 502, "We are not able to fetch user profile", 0);
        }
    }

    async userProfile(req: Request, res: Response) {
        let userId: number = parseInt(req.params.userId);
        let data = await helper.getColsValue("gmsUsers",
            ["id", "userName", "firstName", "lastName","dob", "image", "defaultImage", "gender", "latitude", "longitude", "rank", "winPrize", "totalWins", "referralCode","totalWinningAmount","gameMatrix","createdAt"],
            { "id": userId });
        if (data && data.length > 0) {
            let profile = data[0];

            let friendsData = await friends.getTotalFriendsAndStatusV1(req.headers.data['id'], userId)
            profile.totalFriends = friendsData.totalFriends;
            profile.friendStatus = friendsData.friendStatus;
            profile.friendCreatedDate = friendsData.friendCreatedDate;
            profile.friendUpdatedDate = friendsData.friendUpdatedDate;
            profile.friendRequestSenderId=friendsData.friendRequestSenderId;

            let depositCount=await depositAccountService.getDepoistsCount(userId);
            let totalDepositDone= await depositAccountService.getTotalDepositOfUsers(userId);

            profile['depositCount']=depositCount;
            profile['totalDepositDone']=totalDepositDone;

            // Get user is online
            //profile['isOnline'] = await Games.isUserPlaying(req.headers.data['id']);
            profile['isOnline'] = false; 
            // Get Games History
            profile['gamesHistory'] = await Games.getGamesHistoryWithOtherUser(req.headers.data['id'], userId);
            // Get favourite games
            profile['favouriteGames'] =[] //await Games.getFavouriteGames(req.headers.data['id']);

            profile['gameMatrix']=profile['gameMatrix']?JSON.parse(profile['gameMatrix']):[];
            
            if(!global.ACTIVE_GAME_LIST){
                global.ACTIVE_GAME_LIST = await gamesService.getAllGameList();
            }
            
            let winPercentage=0;
            let winPercentageCount=0;
            let totalGamePlayCount=0;
            for(let i=0;i<profile['gameMatrix'].length; i++){
                if(profile['gameMatrix'][i]['gameId']==0){
                    profile['gameMatrix'].splice(i,1)
                    i--
                    continue;
                    
                    /*profile['gameMatrix'][i]['gameTitle']="Cricket Fantasy"
                    profile['gameMatrix'][i]['gameIcon'] = config['FANTACY_IMAGE_ICON'];
                    profile['gameMatrix'][i]['winPercentage']=Math.floor((profile['gameMatrix'][i]['win']/profile['gameMatrix'][i]['play'])*100) | 0;
                    winPercentage=winPercentage + profile['gameMatrix'][i]['winPercentage'];
                    winPercentageCount++;*/

                }
                else{
                    const gameDataIndex = global.ACTIVE_GAME_LIST.findIndex(object => {
                        return object.id == profile['gameMatrix'][i]['gameId'];
                    });
                    if(gameDataIndex>=0){
                        profile['gameMatrix'][i]['gameTitle']= global.ACTIVE_GAME_LIST[gameDataIndex]['title'];
                        profile['gameMatrix'][i]['gameIcon'] = global.ACTIVE_GAME_LIST[gameDataIndex]['smallIconImage'];
                        profile['gameMatrix'][i]['winPercentage']=Math.floor((profile['gameMatrix'][i]['win']/profile['gameMatrix'][i]['play'])*100) | 0;
                        winPercentage=winPercentage + profile['gameMatrix'][i]['winPercentage'];
                        winPercentageCount++;
                        totalGamePlayCount = totalGamePlayCount + profile['gameMatrix'][i]['play'];
                    }
                    else{
                        profile['gameMatrix'].splice(i,1)
                        i--
                    }
                }
            }
            profile['winPercentage']= + (winPercentage/winPercentageCount).toFixed(2);
            profile['totalGamePlayCount']=totalGamePlayCount;
            
            helper.sendJSON(res, profile, false, 200, "User Profile fetched successfully", data.length, true);
        } else {
            helper.sendJSON(res, {}, true, 502, "We are not able to fetch user profile !!", 0);
        }
    }

    async getUserDetailsGameV2(req:Request, res:Response){
        try{
            let userId: number = parseInt(req.params.userId);
            let data = await helper.getColsValue("gmsUsers",
            ["firstName", "userName", "image", "defaultImage"],
            { "id": userId });
            if (data && data.length > 0) {
                let profile = data[0];
                helper.sendJSON(res, profile, false, 200, "User details listed successfully !!", 0);
            }
            else{
                helper.sendJSON(res, {}, true, 400, "We are not able to fetch user details !!", 0);
            }
        }
        catch(error){
            helper.sendJSON(res, {}, true, 500, "We are not able to fetch user details !!", 0);
        }
    }

    async uploadProfilePic(req, res) {
        try {
            console.log(req.body);
            const s3Client = s3.s3Client;
            const params = s3.uploadParams;
            let filePath: string = dateFormat(new Date(), "yyyy/mm/");
            let fileContent = null
            if (req.profile) {
                fileContent = req.profile.buffer;
            } else {
                fileContent = fs.readFileSync(req.files.profile.path);
            }
            let fileName = req.headers.data['id'] + "_" + new Date().getTime() + "." + req.files.profile.extension;
            filePath = 'gamesapp/media/images/profile/' + filePath + fileName;
            params.Key = filePath;
            params.Body = fileContent;

            await s3Client.upload(params, async (err, data) => {
                if (err) {
                    console.log(err);
                    helper.sendJSON(res, {}, true, 502, "Error", 0);
                } else {
                    console.log(data.Location);
                    let fileData = {
                        "filename": data.Location
                    }
                    helper.sendJSON(res, fileData, false, 200, "Profile Pic Updated Successfully .", 0);
                }
            });
        } catch (error) {
            helper.sendJSON(res, {}, true, 502, "Sorry! We are unable to upload !!", 0);
        }
    }

    async saveBankDetails(req: Request, res: Response) {

        /*
            Note - 1 : We do not  verify bank details on update.
            2: We do verification only on new bank addition.
            3: The KYC field is not in Use here fro gmsUserBankAccount.
            4: No need to send notification at the time of bank Account verification,
                Because notification will not show to user due to APP open.
        */

        var userDetail = req.headers.data;

        const userId = userDetail['id'];
        const {nameInBank, accountNumber, upiId, state, ifsc} = req.body;

        let userBankDetails: any = {};
        userBankDetails.fkUserId = userId;
        userBankDetails.nameInBank = nameInBank;
        userBankDetails.accountNumber = accountNumber
        userBankDetails.upiId = upiId;
        userBankDetails.state = state;
        if (ifsc && (ifsc != "" && req.body.ifsc != null)) {
            userBankDetails.ifsc = ifsc.toUpperCase();
            let bankName = await helper.getColValue("gmsBankDetails", "bank", { "ifsc": userBankDetails.ifsc })
            userBankDetails.bankName = bankName;
        } else {
            helper.sendJSON(res, {}, true, Constant.RESP_CODE['Validation Failed'], "Please Entr IFSC Code.", 0);
            return;
        }

        //Check if bank details exists or not.
        let userExistingBankDetails = await User.getBankDetails(userId);
        let isBankDetailsExist = false;
        if ((userExistingBankDetails && userExistingBankDetails.length > 0) 
            && (userExistingBankDetails[0]['isAccountVerified']==20 || userExistingBankDetails[0]['isAccountVerified']==null)) {
            isBankDetailsExist = true;
        }

        //Check if user trying to save existing account.
        if (isBankDetailsExist 
            && userExistingBankDetails[0]['accountNumber'] == userBankDetails['accountNumber']
            && userExistingBankDetails[0]['ifsc'] == userBankDetails['ifsc'])
         {
            helper.sendJSON(res, {}, true, 200, "This Bank details is already saved. Please try again with different details.", 0);
            return;
         }

         /****************************
         ******Update Start here *****
         *****************************/
        //Update if isBankDetailsExist

        if (isBankDetailsExist) {
            //Update existing as inactive and save with new one.
            let update = await User.updateBankDetails(userId, { "isActive": 0 });
            if (update) {
                userBankDetails.paytmMobile = userExistingBankDetails[0]['paytmMobile'];
                let insert = await User.saveBankDetails(userBankDetails);
                if (insert) {
                    helper.sendJSON(res, {}, false, Constant.RESP_CODE.Success, "User bank details updated successfully.", 1);
                    return;
                }
                else {
                    helper.sendJSON(res, {}, true, Constant.RESP_CODE['DB Error'], "Sorry, We are unable to update user bank details !", 0);
                    return;
                }
            }
            else {
                helper.sendJSON(res, {}, true, Constant.RESP_CODE['DB Error'], "Sorry, We are unable to update user bank details !", 0);
                return;
            }
            
        }
        
        else {
            /****************************
            Add new bank account start here 
            *****************************/
            //insert if isBankDetailsExist false
            
            //Update inactive if any account there 
            await User.updateBankDetails(userId, { "isActive": 0 });
            userBankDetails['isAccountVerified']=10;
            let data = await User.saveBankDetails(userBankDetails);
            if (data){
                //Verify Bank details for first time.
                userBankDetails=[userBankDetails];
                let verification = await userService.verifyBankDetails(userDetail, userBankDetails);
                let updateBankDetailsData:any={};
                updateBankDetailsData['isAccountVerified'];
                if(verification['success']){
                    if(verification['status'] == "VERIFIED"){
                        console.log(`Bank details verified for user : ${userId}`);
                        updateBankDetailsData['isAccountVerified']=20;
                        
                        /*const notification = {
                            title: "Hey! You have a notification",
                            body: "Bank Verification Status"
                        };
                        const notificationData:any = {
                            "notificationType": "VERIFICATION_STATUS",
                            "message":  "Your bank has been successfully verified. You can withdraw your winnings now.",
                            "userId" : `${userDetail['id']}`
                        }
                        await Notifications.sendPushNotification(userDetail['id'], notificationData, notification);
                        */
                    }
                    else if(verification['status'] == "FAILED"){
                        console.log(`Bank details verification is Failed for user : ${userId}`);
                        updateBankDetailsData['isAccountVerified']=30;
                        updateBankDetailsData['isActive']=0;
                    }
                    else{
                        console.log("Bank details verification is in progress");
                        updateBankDetailsData['isAccountVerified']=10;
                    }
                }
                else if (verification['status']=="LIMITEXHAUSTED"){
                    updateBankDetailsData['isAccountVerified']=30;
                    updateBankDetailsData['isActive']=0;
                }
                else{
                    console.log(`Bank account verification failed for user id : ${userId}.`);
                    updateBankDetailsData['isAccountVerified']=30;
                }
                //Update final verification status.
                await userService.updateBankDetails(userId,updateBankDetailsData);
                if(verification['status']=="LIMITEXHAUSTED"){
                    helper.sendJSON(res, {"status":"LIMITEXHAUSTED"}, true, 200, "You have exahusted limit of 3 attempts, Please come back tomorrow.", 0);
                    return;
                }
                else{
                    userBankDetails[0]['isAccountVerified']=updateBankDetailsData['isAccountVerified'];
                    helper.sendJSON(res, userBankDetails[0], false, 200, "User bank details saved successfully.", 1);
                    return;
                }
                
            }
            else{
                helper.sendJSON(res, {}, true, Constant.RESP_CODE['DB Error'], "Sorry, We are unable to save user bank details !", 0);
            }
        }
    }

    async savePaytmMobileNum(req: Request, res: Response) {
        const userDetail = req.headers.data;
        let BankDetails = await User.getBankDetails(userDetail['id']);
        const paytmMobile = req.body.paytmMobile;

        //Check if bank details exist or not.
        var isBankDetailsExist = false;
        if (BankDetails && BankDetails.length > 0) {
            isBankDetailsExist = true;
        }

        var userBankDetails: any = {};
        userBankDetails.fkUserId = userDetail['id'];
        userBankDetails.paytmMobile = paytmMobile;

        if (isBankDetailsExist) {
            //Update
            if (!BankDetails[0]['paytmMobile'] || BankDetails[0]['paytmMobile'] == "" || BankDetails[0]['paytmMobile'] == paytmMobile) {
                let data = await User.updateBankDetails(userDetail['id'], userBankDetails);
                if (data)
                    return helper.sendJSON(res, {}, false, 200, "User PayTM number successfully updated.", 1);
                else
                    return helper.sendJSON(res, {}, true, 502, "Sorry, We are unable to update user PayTM number details !", 0);
            }
            else {
                //Update old record as inactive and than create new one.
                let update = await User.updateBankDetails(userDetail['id'], { "isActive": 0 });
                if (update) {
                    delete BankDetails[0]['id'];
                    BankDetails[0]['paytmMobile'] = paytmMobile;
                    let insert = await User.saveBankDetails(BankDetails[0]);;
                    if (insert) {
                        return helper.sendJSON(res, {}, false, 200, "User PayTM number successfully updated.", 1);
                    }
                    else {
                        return helper.sendJSON(res, {}, true, 502, "Sorry, We are unable to update user PayTM number details !", 0);
                    }

                }
                else {
                    return helper.sendJSON(res, {}, true, 502, "Sorry, We are unable to update user PayTM number details !", 0);
                }
            }

        }
        else {
            //Insert
            let data = await User.saveBankDetails(userBankDetails);
            if (data) {
                helper.sendJSON(res, {}, false, 200, "User PayTM mobile number saved successfully.", 1);
                return;
            }

            else {
                helper.sendJSON(res, {}, true, 502, "Sorry, We are unable to save user PayTM mobile details !", 0);
                return;
            }

        }
    }
    async getBankDetails(req: Request, res: Response) {
        try {
            var userDetail = req.headers.data;
            let userBankDetails = await User.getBankDetails(userDetail['id']);
            if (userBankDetails.length > 0
                && (userBankDetails[0]['isAccountVerified']==20 || userBankDetails[0]['isAccountVerified']==null))
                helper.sendJSON(res, userBankDetails[0], false, 200, "Bank details listed successfully ", 1);
            else
                helper.sendJSON(res, {}, false, 200, "Sorry, User bank details not available .", 0);
        } catch (error) {
            helper.sendJSON(res, {}, true, 502, "Sorry, We are unable to fetch user bank details !", 0);
        }
    }

    async getBankDetailsV2(req: Request, res: Response) {
        try {
            let userId: number = parseInt(req.params.userId);
            let userBankDetails = await User.getBankDetails(userId);
            if (userBankDetails.length > 0
                && (userBankDetails[0]['isAccountVerified']==20 || userBankDetails[0]['isAccountVerified']==null))
                helper.sendJSON(res, userBankDetails[0], false, 200, "Bank details listed successfully ", 1);
            else
                helper.sendJSON(res, {}, false, 200, "Sorry, User bank details not available .", 0);
        } catch (error) {
            helper.sendJSON(res, {}, true, 502, "Sorry, We are unable to fetch user bank details !", 0);
        }
    }

    async deleteBankDetails(req: Request, res: Response) {
        const userDetail = req.headers.data;
        let BankDetails = await User.getBankDetails(userDetail['id']);
        if (!BankDetails || BankDetails.length <= 0) {
            helper.sendJSON(res, {}, true, 200, "Sorry, User bank details not available !", 0);
            return;
        }
        else {
            //Update previous bank details as InActive.
            let update = await User.updateBankDetails(userDetail['id'], { "isActive": 0 });
            if (!update) {
                helper.sendJSON(res, {}, true, 200, "Sorry, Unable to remove the bank details !", 0);
                return;
            }
            else {
                //If Paytm Number exit then create new record for that.
                if (!BankDetails[0]['paytmMobile'] || BankDetails[0]['paytmMobile'] == "") {
                    helper.sendJSON(res, {}, false, 200, "Bank Details remove successfully.", 0);
                    return
                }
                else {
                    delete BankDetails[0]['id'];
                    BankDetails[0]['nameInBank'] = null;
                    BankDetails[0]['accountNumber'] = null;
                    BankDetails[0]['bankName'] = null;
                    BankDetails[0]['ifsc'] = null;
                    BankDetails[0]['isKYC'] = null;
                    BankDetails[0]['upiId'] = null;
                    BankDetails[0]['state'] = null;
                    let data = await User.saveBankDetails(BankDetails[0]);
                    if (data) {
                        helper.sendJSON(res, {}, false, 200, "Bank Details remove successfully.", 0);
                        return
                    }
                    else {
                        helper.sendJSON(res, {}, false, 200, "Bank details removed with paytm number also successfully .", 0);
                        return;
                    }

                }

            }
        }

    }

    async deletePaytmMobileNum(req: Request, res: Response) {
        const userDetail = req.headers.data;
        let BankDetails = await User.getBankDetails(userDetail['id']);
        if (!BankDetails || BankDetails.length <= 0) {
            helper.sendJSON(res, {}, true, 200, "Sorry, User bank details not available !", 0);
            return;
        }
        else {
            //Update previous bank details as InActive.
            let update = await User.updateBankDetails(userDetail['id'], { "isActive": 0 });
            if (!update) {
                helper.sendJSON(res, {}, true, 200, "Sorry, Unable to unlink PayTM mobile !", 0);
                return;
            }
            else {
                //If Paytm Number exit then create new record for that.
                if (!BankDetails[0]['isKYC'] || BankDetails[0]['isKYC'] == 0) {
                    helper.sendJSON(res, {}, false, 200, "PayTM mobile unlink successfully.", 0);
                    return
                }
                else {
                    delete BankDetails[0]['id'];
                    BankDetails[0]['paytmMobile'] = null;
                    let data = await User.saveBankDetails(BankDetails[0]);
                    if (data) {
                        helper.sendJSON(res, {}, false, 200, "PayTM mobile unlink successfully.", 0);
                        return
                    }
                    else {
                        helper.sendJSON(res, {}, false, 200, "PaytM mobile unlink with bank details also successfully .", 0);
                        return;
                    }

                }

            }
        }
    }

    
    /*async getUserLeaderBoards(req: Request, res: Response) {
        //let userDetail = req.headers.data;
        let type = req.query.type;
        let lb=[];
        if (type == "1" ) {
            lb=global.LEADERBORD_TODAY
        }
        else if(type == "2"){
            lb=global.LEADERBORD_ALL
        }
        else {
            helper.sendJSON(res, [], true, 200, "Sorry, please pass valid leaderboard type !!", 0);
        }

        if (lb && lb.length > 0)
            helper.sendJSON(res, lb, false, 200, "Leaderboard listed successfully ", lb.length);
        else
            helper.sendJSON(res, [], false, 200, "Sorry, Leaderboard not available .", 0);
    

    }*/

    async blockUnblockUser(req: Request, res: Response) {

        let userId = req.body.id;
        let status = req.body.status;

        if (req.headers.data['id'] == config.UpdateBattleResultAPIUser) {
            var data = await User.updateUser(userId, { "status": status});
            if (!data) {
                console.log(`Unable to maintain status of user ${userId}`);
                helper.sendJSON(res, {}, true, 502, "DB Error..!", 0);
            } else {
                if(status == Constant.USER_STATUS.INACTIVE){
                    delete global.USER_DETAILS['UID_'+userId];
                }
                
                helper.sendJSON(res, {}, false, 200, "User status updated successfully ", 0);
            }
        }
        else {
            helper.sendJSON(res, {}, false, 200, "Access denied !!", 0);
        }
    }

    // Get location
    async getLocation(req: Request, res: Response) {
        let data = await helper.getColsValue("gmsUsers", ["latitude", "longitude"], { "id": req.headers.data['id'] });
        if (data.length > 0) {
            helper.sendJSON(res, data[0], false, 200, "User location fetched successfully", 1);
        } else {
            helper.sendJSON(res, [], true, 200, "Sorry, User location is not available.", 0);
        }
    }

    // Update location
    async updateLocation(req: Request, res: Response) {
        let userId = req.headers.data['id'];
        let location = {
            "latitude": req.body.latitude,
            "longitude": req.body.longitude,
        };
        let condition = location;
        condition["id"] = userId;
        let data = User.updateLocation(userId, location, condition)
        if (data) {
            helper.sendJSON(res, {}, false, 200, "User location updated successfully", 1);
        } else {
            helper.sendJSON(res, {}, true, 502, "Sorry, We are unable to update location", 0);
        }
    }

    async updateUserProfile(req, res) {
        try {
            let userId = req.headers.data['id'];
            let userDetails: any = req.body;
            
            if ("email" in userDetails && (userDetails.email == null || userDetails.email == '')) {
                throw new Error("Email shouldn't be empty!");
            }

            if (!userDetails['userName'] || userDetails['userName'] == "") {
                console.log("User Name is empty");
                let data = await helper.getColsValue("gmsUsers", ['userName'], { "id": userId });
                userDetails['userName'] = data[0]['userName'];
                if (userDetails['userName'] == "" || userDetails['userName'] == null) {
                    userDetails['userName'] = await User.generateUserName();
                }
            }

            if ("userName" in userDetails && (userDetails.userName == null || userDetails.userName == '')) {
                throw new Error("Username shouldn't be empty!");
            }
            /*if("facebookId" in userDetails && (userDetails.facebookId == null || userDetails.facebookId == '')){
                throw new Error("Facebook ID shouldn't be empty!");
            }*/
            if ("gender" in userDetails && (userDetails.gender == null || userDetails.gender == '')) {
                throw new Error("You must specify the gender");
            }
            await User.updateUserProfile(userId, userDetails)

            //Update Image of Leaderbord.
            /*if("image" in userDetails || "userName" in userDetails ){
                let lbAll = global.LEADERBORD_ALL;
                let lbToday = global.LEADERBORD_TODAY;

                const lbAllUserIndex = lbAll.findIndex(object => {
                    return object.id == userId;
                });
                if(lbAllUserIndex>=0){
                    lbAll[lbAllUserIndex]['image']=userDetails['image'];
                    lbAll[lbAllUserIndex]['firstName']=userDetails['userName'];
                    global.LEADERBORD_ALL=lbAll;
                }


                const lbTodayUserIndex = lbToday.findIndex(object => {
                    return object.id == userId;
                });
                if(lbTodayUserIndex>=0){
                    lbToday[lbTodayUserIndex]['image']=userDetails['image'];
                    lbToday[lbTodayUserIndex]['firstName']=userDetails['userName'];
                    global.LEADERBORD_TODAY=lbToday;
                }
            }*/
            helper.sendJSON(res, {}, false, 200, "User Profile updated successfully", 1);
        } catch (error) {
            console.log("Post profile error : ", error);
            helper.sendJSON(res, {}, true, 502, error.message, 0);
        }
    }

    async redeemReferral(req: Request, res: Response) {
        console.log("Redeems Referral Data : ", req.body);
        const userDetails = req.headers.data;
        const referralCode = req.body.referralCode;
        const referralUser = await User.getUserIdByReferralCode(referralCode);
        if (!referralUser) {
            console.log("Redeems Referral error 502 DB Error !!");
            helper.sendJSON(res, {}, true, 502, "DB Error !!", 0);
        }
        else if (referralUser == "INCORRECT") {
            console.log("Redeems Referral error 201 Sorry, Incorrect referral code !!");
            helper.sendJSON(res, {}, true, 201, "Sorry, Incorrect referral code !!", 0);
        }
        else if (referralUser == userDetails['id']) {
            console.log("Redeems Referral error 201 Sorry, Please use shared referral code by gamesapp user !!");
            helper.sendJSON(res, {}, true, 201, "Sorry, Please use shared referral code by gamesapp user !!", 0);
        }
        else {
            const referralUserId = referralUser;
            const flag = await User.isReferralAvailable(userDetails['id']);
            console.log("Redeems Referral flag : ", flag);
            if (!flag) {
                //Db Error.
                helper.sendJSON(res, {}, true, 502, "DB Error !!", 0);
            }
            else if (flag == "10") {
                //Can't consume referral code any more 
                helper.sendJSON(res, {}, true, 202, "Sorry, You already used referral code for this Number.", 0);
            }
            else if (flag == "30") {
                //Can't consume referral code for existing user. 
                helper.sendJSON(res, {}, true, 202, "Sorry, Referral code is not allow for existing users.This is only for new users !!", 0);
            }
            else if (flag == "20") {
                //Generate Ticket corresponding to referal user.
                let userReferral: any = {};
                userReferral.fkUserId = referralUserId;
                userReferral.refUserId = userDetails['id'];
                userReferral.status = 1;
                const userReferralObj = await User.createUserReferral(userReferral);
                if (userReferralObj) {
                    userReferral.status = Constant.Referral.ONBOARDED;
                    userReferral.fkUserReferralId = userReferralObj.id
                    userReferral.source = Constant.ReferralSource.JOINED
                    let isCreated = await referralService.createReferralLog(userReferral);
                    // await User.creditUserRewards(userDetails['id'],"referralCode");
                    console.log("Redeems Success for user : ", userDetails['id']);
                    helper.sendJSON(res, {}, false, 200, "Redeem successfully.", 0);
                }
                else {
                    helper.sendJSON(res, {}, true, 502, "Unable to redeem your referral Code.", 0);
                }
            }
            else {
                helper.sendJSON(res, {}, true, 500, "Data mismatched !!", 0);
            }
        }
    }

    async listUsernamesForUserIds(req: Request, res: Response) {
        try {
            const userIds = req.body.userIds;
            console.log("userids: ", userIds);
            const usernameData = await User.getUsernameForUserIds(userIds);
            await helper.sendJSON(res, usernameData, false, 200, "Usernames successfully listed.", usernameData.length);
        } catch (error) {
            console.log("Error in listUsernamesForUserIds - ", error);
            await helper.sendJSON(res, {}, true, 500, "Some error occurred - " + error.message, 0);
        }
    }

    async userReferralsList(req: Request, res: Response) {
        try {
            let data: any = {};
            let userId = req.headers.data['id'];
            let forGemsVal: number = req.query.forGems ? +req.query.forGems : 0;
            // data.referralAmount = await PaymentUtils.getUserAccountBal(userId, Constant.Payment.AccType.Referral);
            data.referralAmount = await PaymentUtils.getUserAccountBalV1(userId, Constant.Payment.AccType.Referral);
            data.referAndEarnAmount=config.referAndEarnAmount;
            data.videoId = config.referAndEarn.youtubeId;
            let forGems: boolean = false;
            if (forGemsVal == 1) {
                forGems = true;
            }
            data.referralList = await referralService.getUserReferralsList(userId, forGems = forGems);
            await helper.sendJSON(res, data, false, 200, "Data Listed Successfully!", 1);
        } catch (error) {
            console.log("Error in userReferralsList - ", error);
            await helper.sendJSON(res, {}, true, 500, "You don't have any log " + error.message, 0);
        }
    }

    async saveUserRestoreId(req: Request, res: Response){
        let restoreId=req.body['restoreId'];
        let userId = req.headers.data['id'];
        let isSaved=await User.saveRestoreId(restoreId,userId);
        if(!isSaved){
            helper.sendJSON(res, [], true, 500, "Unable to save Restore id !", 1);
        }
        else{
            helper.sendJSON(res, [], false, 200, "Restore Id Saved Successfully.", 1);
        }
    }

    async saveKYCDetails(req: Request, res: Response){
        const userDetails=req.headers['data'];
        let kycExistingResponse = await helper.getColValue("gmsUsers","kycResponse",{id:userDetails['id']});
        kycExistingResponse = kycExistingResponse? JSON.parse(kycExistingResponse):null;

        let todayDate= utilityService.getDate();

        if((kycExistingResponse && kycExistingResponse['maxAttemptDate']) && kycExistingResponse['maxAttemptDate'] == todayDate){
            helper.sendJSON(res, [], true, 200, "You have exahusted limit of 3 attempts, Please come back tomorrow.", 0);
            return;
        }
        let kycResponse=JSON.stringify(req.body);
        
        let kycRquest=req.body.request;
        let requestDob=req.body.request['dob'] ? req.body.request['dob'] : null;
        let dob=null;
        if(requestDob){
            requestDob = requestDob.replaceAll("/","-");
            requestDob = requestDob.split("-");
            console.log("Split Data ", requestDob);
            dob= requestDob[2] + "-" + requestDob[1] + "-" + requestDob[0];
        }
        
        let status=req.body.status;
        let saveData:any = {};
        saveData.kycResponse=kycResponse;
        saveData.kycStatus=status;
        console.log("Date : ", dob);
        saveData.dob=dob
        let isSaved=await User.saveKYCDetails(saveData,userDetails['id']);
        if(!isSaved){
            helper.sendJSON(res, [], true, 500, "Unable to save KYC details !", 0);
        }
        else{
            if(status==Constant.KYC.STATUS.COMPLETE){
                let logKYCDocData : any ={};
                logKYCDocData.fkUserId=userDetails['id'];
                logKYCDocData.docType= Constant.KYC.DOC_TYPE[kycRquest['docType']];
                logKYCDocData.docId=kycRquest['docId'];
                logKYCDocData.createdAt=new Date();
                
                await User.logUserKYCDoc(logKYCDocData);
                /*const notification = {
                    title: "Hey! You have a notification",
                    body: "KYC Status"
                };
                const notificationData:any = {
                    "notificationType": "USER_KYC",
                    "message":  "Your PAN has been successfully verified.",
                    "userId" : `${userDetails['id']}`
                }
                await Notifications.sendPushNotification(userDetails['id'], notificationData, notification);*/
            }
            helper.sendJSON(res, [], false, 200, "KYC details save successfully.", 1);
        }
    }

    async getKYCDetails(req: Request, res: Response){
        const userDetails = req.headers.data;
        let KYCDetails= await helper.getColsValue("gmsUsers",["kycStatus","kycResponse"],{"id":userDetails['id']});

        let respData:any = {};
        respData['kycStatus']=KYCDetails[0]['kycStatus'];

        let kycExistingResponse = KYCDetails[0]['kycResponse'];
        kycExistingResponse = kycExistingResponse && kycExistingResponse!==""? JSON.parse(kycExistingResponse):null;
        let todayDate= utilityService.getDate();

        if((kycExistingResponse && kycExistingResponse['maxAttemptDate']) && kycExistingResponse['maxAttemptDate'] == todayDate){
            respData['limitExhausted']=true;
            respData['msg']="You have exahusted limit of 3 attempts, Please come back tomorrow.";
        }
        else{
            respData['limitExhausted']=false;
            respData['msg']="Limit not exhausted.";
        }
        helper.sendJSON(res, respData, true, 200, "KYC details get successfully.", 0);
            
    }
    
    async acceptUserAsCreatorAgencies(req: Request, res: Response){
        const userDetails = req.headers.data;
        let socialMediaLink=req.body['socialMediaLink'];
        let name=req.body['name'].split(' ');
        
        let firstName=name[0];
        let lastName=name.length>=2?name[name.length-1]:null;
        let middleName=null

        if(name.length>2){
            name.splice(0,1);
            name.splice(name.length-1,1);
            middleName=name.join(" ");
        }
        
        let isCreatorStatus = await helper.getColValue("gmsUsers",'isCreatorStatus',{"id":userDetails['id']});
        
        if(isCreatorStatus==Constant.IS_CREATOR_STATUS.NOT_APPLIED){

            let insertData:any={};
            insertData.fkUserId=userDetails['id'];
            insertData.socialMediaLink=socialMediaLink;
            insertData.status=1
            insertData.createdAt=new Date();
            insertData.updatedAt=new Date();


            let updateData:any = {}
            updateData.isCreatorStatus = Constant.IS_CREATOR_STATUS.APPLIED;
            updateData.firstName = firstName;
            updateData.middleName = middleName;
            updateData.lastName = lastName;

            let isUpdated=await User.applyUserAsCreator(insertData,updateData,userDetails['id']);
            if(!isUpdated){
                helper.sendJSON(res, [], true, 502, "Unable to apply user as creator !", 1);
            }
            else{
                helper.sendJSON(res, [], false, 200, "User applied successfully for creators.", 1);
            }
        }
        else{
            helper.sendJSON(res, [], true, 400, "User already has been applied as creators !", 1);
        }
        
    }

    async getCreatorsUserDashboard(req: Request, res: Response){
        const userDetails = req.headers.data;

        let responseData:any = {};

        //Get referral Data.
        let referralUserData= await referralService.getTotalReferralUser(userDetails['id']);
        if(!referralUserData || referralUserData['userIds'].length==0){
            responseData.totalUsers=0;
            responseData.totaldeposits=0;
            responseData.revenue={};
            responseData.revenue.today=0;
            responseData.revenue.yesterday=0
            responseData.revenue.lastSevenDays=0;
            responseData.revenue.thisMonth=0;
            responseData.revenue.total=0;
            responseData.lastSevenDays=[];
        }
        else{
            responseData.totalUsers=referralUserData.totalUser;
            responseData.totalDeposits=await depositAccountService.getTotalDepositOfUsers(referralUserData['userIds']);
            responseData.lastSevenDays= await referralService.getLast7DayEarningbyDepositBonus(userDetails['id']);
            if(responseData.lastSevenDays && responseData.lastSevenDays.length>0){
                responseData.revenue={};
                responseData.revenue.today=0;
                responseData.revenue.yesterday=0
                responseData.revenue.lastSevenDays=0;

                for(let i=0;i<responseData['lastSevenDays'].length;i++){
                    responseData.revenue.today=i==0?+responseData['lastSevenDays'][i]['earning']:+responseData.revenue.today;
                    responseData.revenue.yesterday=i==1?+responseData['lastSevenDays'][i]['earning']:+responseData.revenue.yesterday;
                    responseData.revenue.lastSevenDays=+responseData.revenue.lastSevenDays + +responseData['lastSevenDays'][i]['earning'];
                }

                responseData.revenue.thisMonth=await referralService.getEarningbyDepositBonus(userDetails['id'],true);
                responseData.revenue.total=await referralService.getEarningbyDepositBonus(userDetails['id'],false);
            }
        }
        responseData.weeklyTopEarners=await referralService.getWikelyTopEarnerbyRefferal();
        helper.sendJSON(res, responseData, false, 200, "Dashbord data listed successfully.", 1);
    }

    async updateCreatorStatus(req: Request, res: Response){
        if(req['IP']!=global.CREATOR_STATUS_UPDATE_IP){
            helper.sendJSON(res, [], false, 200, "Access denied !", 1);
            return;
        }

        const userDetails=req.headers['data'];
        
        let updateData:any = {};
        updateData.isCreatorStatus=2;
        let isSaved=await User.updateCreatorStatus(updateData, userDetails['id']);
        if(isSaved){
            const notification = {
                title: "Hey! You have a notification",
                body: "You are approved as Creator. You can start sharing link and earn 30% of all the referrals."
            };
            const notificationData:any = {
                "notificationType": "USER_CREATORS",
                "message": "You are approved as Creator. You can start sharing link and earn 30% of all the referrals."
            }
            await Notifications.sendPushNotification(userDetails['id'], notificationData, notification);
            helper.sendJSON(res, [], false, 200, "User updated as creator successfully.", 0);
        }
        else{
            helper.sendJSON(res, [], true, 500, "Unable to update user as creators !!", 1);
        }
    }

    async validateUserKYC(req: Request, res: Response){
        var userDetail = req.headers.data;
        let docType:any = req.query['docType'];
        let docId = req.query['docId'];
        
        let exist = await userService.validateUserKYCDoc(Constant.KYC.DOC_TYPE[docType],docId);
        if(!exist){
            //DB Error.
            helper.sendJSON(res, [], true, 500, "Db Error !! ", 1);
        }
        else{
            let isValid=exist=="EXIST"?false:true;
            if(exist=="EXIST")
                helper.sendJSON(res, {"isValid":isValid}, true, 200, "Document already existing !!", 1);
            else
            helper.sendJSON(res, {"isValid":isValid}, false, 200, "Valid document.", 1);
            const notification = {
                title: "Hey! You have a notification",
                body: "KYC Verification Status"
            };
            const notificationData:any = {
                "notificationType": "VERIFICATION_STATUS",
                "message":  "Your KYC has been successfully verified.",
                "userId" : `${userDetail['id']}`
            }
            await Notifications.sendPushNotification(userDetail['id'], notificationData, notification);   
        }
    }

    async reportUser(req: Request, res: Response){
        try{
            const userDetails = req.headers['data'];
            const {reportedUserId, reportType} = req.body;

            let insertData={};
            insertData['fkUserId']=userDetails['id'];
            insertData['reportedUserId']=reportedUserId;
            insertData['reportType']=Constant.USER_REPORT_TYPE[reportType];
            insertData['createdAt']= new Date();
            insertData['status']=1;
            
            let isinserted = await User.insertUserReportedData(insertData);
            if(!isinserted){
                helper.sendJSON(res, {}, true, 200, "We are unable to report user !!", 1);
            }
            else if (isinserted === true){
                await User.updateUserReportCount(reportedUserId);
                helper.sendJSON(res, {}, false, 200, "User Reported successfully.", 1);
            }
            else{
                helper.sendJSON(res, {}, true, 200, `You have already reported to this user for ${Constant.USER_REPORT_TYPE_DS[isinserted]}`, 1);
            }
        }
        catch(error){
            console.log("Error in (reportUser) : ");
            console.log(error);
            helper.sendJSON(res, {}, true, 500, "We are unable to report user !!", 1);
        }
    }

    async searchUser(req,res){
        try {
            let userDetails:any = req.headers.data;
            let searchQuery=req.query['userName'];
            let page=req.query['page']? req.query['page'] : 1;
            let pageSize= req.query['pageSize']? req.query['pageSize'] : 10;

            console.log(`Search Data for user pattern : ${searchQuery}, Page: ${page}, Page Size: ${pageSize}`);
            
            var usersData = Object.values(global.USER_DETAILS);
            let searchedData = usersData.filter(user => {
                let un=user['userName'] ? user['userName'].toLowerCase(): user['userName'];
                let fn=user['firstName'] ? user['firstName'].toLowerCase() : user['firstName'];
                return String(un).startsWith(searchQuery.toLowerCase()) || String(fn).startsWith(searchQuery.toLowerCase())
            });
            let retData = searchedData.slice((page-1) * pageSize , pageSize * page);
            retData=retData.map(user => ({ 
                id: user['id'],
                userName: user['userName'],
                name:user['firstName'],
                joiningDate: user['createdAt'],
                image: user['image'],
                defaultImage: user['defaultImage'],
                friendStatus:null,
            }));

            let friendListData=await FriendsService.searchFriendsData(userDetails['id']);
            //console.log(friendListData);
            if(friendListData){
                for(let i=0; i < retData.length; i++ ){
                    let friendData = friendListData.filter(friend=>friend.id==retData[i]['id']);
                    //console.log(friendData);
                    if(friendData && friendData.length > 0)
                        retData[i]['friendStatus']=friendData[0]['status'];
                }
    
            }
            helper.sendJSON(res, retData, false, Constant.RESP_CODE.Success, "User search listed successfully. ", searchedData.length);            
        } catch (error) {
            console.log("Error in searchUser : ",error);
            helper.sendJSON(res, {}, true, 500, "Sorry! We are unable to search users !!", 0);
        }
    }
}
export default new userCtrl();