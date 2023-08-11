import sequelize from 'sequelize';
import { Op } from 'sequelize';
import models, { sequelize1 } from '../../models/index';
import Constant from '../../../common/app.constant';
import { TrxLogRecord } from './types';
import * as secretConfig from '../../../common/secret.config.json';
import CommonUtils from '../../../common/helper';
import helper from '../../../common/helper';
import request from 'request-promise';
import utilityService from '../../../common/utility.service';

const config: any = secretConfig;

export class Helper {

    async getClosingBalanceDeposit(userId: any) {
        return 0;
    }

    async getClosingBalanceWithdraw(userId: any) {
        return 0;
    }

    async getUserAccount(userId: any, acType: any) {
        try {
            const [instance, wasCreated] = await models.gmsUserAccount.findOrCreate({
                where: { fkUserId: userId, acType: acType },
                defaults: { balance: 0 }
            });
            console.log(`(getUserAccountBal) Balance: ${instance.balance}, accType: ${acType}`);
            return instance;
        } catch (error) {
            console.log("Error (GetUserAccount) : ", error);
            return null;
        }
    }

    async getUserAccountV1(userId: number,acType: number) {
        try {
            /*const [instance, wasCreated] = await models.gmsUserAccounts.findOrCreate({
                where: { fkUserId: userId },
                defaults: { depositBal: 0,withdrawBal:0,tokenBal:0, bonusBal:0, coinBal:0, referralBal:0 }
            });
            console.log(`(getUserAccountV1) Balance: ${instance},`);
            return instance;*/

            let balField=Constant.Payment.BAL_KEY[acType];
            /*let account= await models.sequelize.query(
                `select id,${balField} as balance from gmsUserAccounts where fkUserId=${userId}`,
                { type: sequelize.QueryTypes.SELECT}
            );*/

            let account=await helper.gmsUserAccountGet(userId);
            let retData:any={};
            retData['balance']=account[balField];
            retData['id']=userId;

            //return account[0];
            return retData;

        } catch (error) {
            console.log("Error (getUserAccountV1) : ", error);
            return null;
        }
    }

    async getUserCommissionForGame(userId: any, gameId: any): Promise<number> {
        let commission: number = -1;
        try {
            /*const userCommission = await models.gmsUserCommission.findOne({
                where: { fkUserId: userId, fkGameId: gameId }
            });
            if (userCommission)
                commission = userCommission.commission;*/
        } catch (error) {
            console.log("Error (getUserCommissionForGame) : ", error);
        }
        return commission;
    }

    async getUserAccountBal(userId: any, acType: any) {
        try {
            const [instance, wasCreated] = await models.gmsUserAccount.findOrCreate({
                where: { fkUserId: userId, acType: acType },
                defaults: { balance: 0 }
            });
            console.log(`(getUserAccountBal) Balance: ${instance.balance}, accType: ${acType}`);
            return instance.balance;
        } catch (error) {
            console.log("Error (GetUserAccountBal) : ", error);
            return 0;
        }
    }

    async getUserAccountBalV1(userId: any, acType: any) {
        let balField=Constant.Payment.BAL_KEY[acType];
        try {
            /*const [instance, wasCreated] = await models.gmsUserAccounts.findOrCreate({
                where: { fkUserId: userId },
                defaults: { depositBal: 0,withdrawBal:0,tokenBal:0, bonusBal:0, coinBal:0, referralBal:0 }
            });
            let balance=instance[balField]==null?0:instance[balField];
            console.log(`(getUserAccountBalV1) Balance: ${balance}, accType: ${acType}`);
            return balance;*/

            let balanceData = await helper.gmsUserAccountGet(userId);
            let balance = balanceData[balField];
            return balance;
        } catch (error) {
            console.log("Error (getUserAccountBalV1) : ", error);
            return 0;
        }
    }

    async getUserAccountTotalBal(userId: any) {
        try {
            let balanceData = await helper.gmsUserAccountGet(userId);
            return balanceData;
        } catch (error) {
            console.log("Error (getUserAccountTotalBal) : ", error);
            return 0;
        }
    }

    async getUserTotalAccountBalance(userId: number) {
        try {
            // const bonusAmount = await this.getUserAccountBal(userId, Constant.Payment.AccType.Bonus);
            // const depositAmount = await this.getUserAccountBal(userId, Constant.Payment.AccType.Deposit);
            // const withdraAmount = await this.getUserAccountBal(userId, Constant.Payment.AccType.Withdraw);
            
            /*const bonusAmount = await this.getUserAccountBalV1(userId, Constant.Payment.AccType.Bonus);
            const depositAmount = await this.getUserAccountBalV1(userId, Constant.Payment.AccType.Deposit);
            const withdraAmount = await this.getUserAccountBalV1(userId, Constant.Payment.AccType.Withdraw);*/
            
            let accountBal= await this.getUserAccountTotalBal(userId);
            let bonusBal=accountBal['bonusBal'];
            let withdrawBal=accountBal['withdrawalBal'];
            let depositBal= accountBal['depositBal'];

            return  +bonusBal + +withdrawBal + +depositBal;

        } catch (error) {
            console.log("Error (getUserTotalAccountBalance) : ", error);
            return 0;
        }
    }

    async updateUserAccountBal(balance: any, condition: any) {
        try {
            const update = await models.gmsUserAccount.update({ "balance": balance }, {
                where: condition
            });
            return true;
        } catch (error) {
            console.log("Error (UpdateUserAccountBal) : ", error);
            return false;
        }
    }

    async updateUserAccountBalV1(balance: number,userId:number, acType: number) {
        let balField=Constant.Payment.BAL_KEY[acType];
        try {
            // const update = await models.gmsUserAccounts.update({ balField: balance }, {
            //     where: {fkUserId:userId}
            // });
            let update = await models.sequelize.query(
                `UPDATE gmsUserAccounts set ${balField}=${balance} where fkUserId=${userId} Limit 1`,
                { type: sequelize.QueryTypes.UPDATE }
            );

            return true;
        } catch (error) {
            console.log("Error (updateUserAccountBalV1) : ", error);
            return false;
        }
    }

    async trxUserAccountBal(userId: any, accType: any, amount: any, transactionType: any,from=null) {
        try {
            let balField=Constant.Payment.BAL_KEY[accType];
            let trxType;

            if(transactionType==Constant.Payment.trxType.Credit){
                trxType=Constant.Payment.trxTypeNew.Credit;
            }
            else if(transactionType==Constant.Payment.trxType.Debit){
                trxType=Constant.Payment.trxTypeNew.Debit;
            }

            let amountData:any={};
            amountData[balField]=amount;
            let updateData={
                "playerId":userId,
                "amountData":amountData,
                "type": trxType,
                "from":from
            }

            var updateBalance=await helper.gmsUserAccountCreateOrUpdateWallet(updateData);
            
            if (updateBalance)
                console.log("User account balance updated successfully.");
            else
                console.log("Unable to update user account balance.");
            return updateBalance;
        } catch (error) {
            console.log("Error in making transaction in user account balance.");
            console.log("Error (TrxUserAccountBal) : ", error);
            return false
        }
    }

    async updateSenderReceiverAccountBalance(senderId: any, receiverId: any, accType: any, amount: any, from=null): Promise<boolean> {
        let result = false;

        const isCredited = await this.trxUserAccountBal(receiverId, accType, amount, Constant.Payment.trxType.Credit, from);
        if (isCredited) {
            const isDebited = await this.trxUserAccountBal(senderId, accType, amount, Constant.Payment.trxType.Debit, from);
            if (isDebited)
                result = true;
        }
        return result;
    }

    async getUserBankAccountDetails(userId: any) {
        try {
            const data = await models.gmsUserBankAccount.findAll({
                where: {
                    fkUserId: userId,
                    isActive: 1
                },
                raw: true
            });
            return data;
        } catch (error) {
            console.log("Error (GetUserBankAccountDetails) : ", error);
            return false;
        }
    }

    async isDuplicateGamePlayPayment(userId: any, pgRefNo: any, gameId: any, engineId: any) {
        let success = false;
        try {
            let bonusResult = false;
            let depositResult = false;
            let withdrawResult = false;
            pgRefNo = pgRefNo.toString();
            console.log("checkDuplicateGamePlayPayment pgRefNo : " + pgRefNo + " Player Id : " + userId);

            const userBonusLog = await models.sequelize1.query(
                `select id,amount from gmsPaymentTransactionLogBonus where fkSenderId=${userId} and fkReceiverId=${config.financialUser.Settlement} and 
                pgRefNo=${pgRefNo} and requestType=20 and payStatus=10 and fkGameId=${gameId} and engineId=${engineId} order by id desc`,
                { type: sequelize.QueryTypes.SELECT });
            bonusResult = userBonusLog && userBonusLog.length > 0 ? true : false;

            const userDepositLog = await models.sequelize1.query(
                `select id,amount from gmsPaymentTransactionLogDeposit where fkSenderId=${userId} and fkReceiverId=${config.financialUser.Settlement} and 
                pgRefNo=${pgRefNo} and requestType=20 and payStatus=10 and fkGameId=${gameId} and engineId=${engineId} order by id desc`,
                { type: sequelize.QueryTypes.SELECT });
            depositResult = userDepositLog && userDepositLog.length > 0 ? true : false;

            const userWithdrawLog = await models.sequelize1.query(
                `select id,amount from gmsPaymentTransactionLogWithdraw where fkSenderId=${userId} and fkReceiverId=${config.financialUser.Settlement} and 
                pgRefNo=${pgRefNo} and requestType=20 and payStatus=10 and fkGameId=${gameId} and engineId=${engineId} order by id desc`,
                { type: sequelize.QueryTypes.SELECT });
            withdrawResult = userWithdrawLog && userWithdrawLog.length > 0 ? true : false;

            if (bonusResult == false && depositResult == false && withdrawResult == false)
                success = false;
            else
                success = true;
        } catch (error) {
            console.log("Error (checkDuplicateGamePlayPayment) : ", error);
            success = false;
        }
        return success;
    }

    async getUserCurrentDateWithdraw(userId: any, amount: any) {
        try {
            var dt = new Date();
            var today = dt.getFullYear() + "-" + (dt.getMonth() + 1) + "-" + dt.getDate();
            var currentDateTotalTrx = await models.sequelize.query("select sum(a.amount) as amt from gmsPaymentTransactionLogWithdraw a where a.fkSenderId=" + userId + " and a.requestType=10 and createdAt>='" + today + "'", { type: sequelize.QueryTypes.SELECT });
            var amt = currentDateTotalTrx[0]['amt'] == 'NULL' || currentDateTotalTrx[0]['amt'] == null ? 0 : currentDateTotalTrx[0]['amt'];
            if (amt + amount >= 1000) {
                console.log("Trx Date : " + today + " , User Id : " + userId + " , Pre Amount : " + amt + " , Post Amount : " + amount);
                return amt;
            }
            else
                return amt
        }
        catch (error) {
            console.log("Error (GetUserCurrentDateWithdraw) : ", error);
            return false;
        }
    }

    async getUserCurrentDateVerificationCount(senderId , verificationUserId) {
        try {
            var today = utilityService.getDate(); 
            var currentDateTotalVerification = await models.sequelize.query(`select count(w.id) as cnt from gmsPaymentTransactionLogWithdraw w where w.fkSenderId=${senderId} 
            AND a.senderAcNum=${verificationUserId} and a.requestType=10 and createdAt like '%${today}%'`, { type: sequelize.QueryTypes.SELECT });
            
            var cnt = currentDateTotalVerification[0]['cnt'] == 'NULL' || currentDateTotalVerification[0]['cnt'] == null ? 0 : currentDateTotalVerification[0]['cnt'];
            return cnt;
        }
        catch (error) {
            console.log("Error (GetUserCurrentDateWithdraw) : ", error);
            return false;
        }
    }

    async getTrxLogObject(senderId: any, receiverId: any, amount: any, requestType: any, payStatus: any, senderClosingBalance: any, receiverClosingBalance: any, pgRefNo: any, gameId: any, gameEngine: any, engineId: any,description:any=null): Promise<TrxLogRecord> {
        const trxLog = {
            fkSenderId: senderId,
            fkReceiverId: receiverId,
            amount: amount,
            requestType: requestType,
            payStatus: payStatus,
            senderClosingBalance: senderClosingBalance,
            receiverClosingBalance: receiverClosingBalance,
            pgRefNo: pgRefNo,
            fkGameId: gameId,
            gameEngine: gameEngine,
            engineId: engineId,
            description:description
        }
        return trxLog;
    }

    async fetchPaymentStrategyForEntryFee(senderId: any, receiverId: any, pgRefNo: any, gameId: any, gameEngine: any, engineId: any): Promise<any> {
        let strategyDetails = {
            paidFromBonus: 0,
            paidFromDeposit: 0,
            paidFromWithdraw: 0,
            strategyName: ""
        };
        try {
            const bonusLog = await models.sequelize1.query("select id, amount from " +
                " gmsPaymentTransactionLogBonus where fkSenderId=" + senderId + " and fkReceiverId=" + receiverId + " and pgRefNo='" + pgRefNo + "' and requestType=20 and fkGameId=" + gameId + " and gameEngine=" + gameEngine + " and engineId=" + engineId, { type: sequelize.QueryTypes.SELECT });

            const depositLog = await models.sequelize1.query("select id, amount from " +
                " gmsPaymentTransactionLogDeposit where fkSenderId=" + senderId + " and fkReceiverId=" + receiverId + " and pgRefNo='" + pgRefNo + "' and requestType=20 and fkGameId=" + gameId + " and gameEngine=" + gameEngine + " and engineId=" + engineId, { type: sequelize.QueryTypes.SELECT });

            const withdrawLog = await models.sequelize1.query("select id, amount from " +
                " gmsPaymentTransactionLogWithdraw where fkSenderId=" + senderId + " and fkReceiverId=" + receiverId + " and pgRefNo='" + pgRefNo + "' and  requestType=20 and fkGameId=" + gameId + " and gameEngine=" + gameEngine + " and engineId=" + engineId, { type: sequelize.QueryTypes.SELECT });

            let strategy = "";
            if (bonusLog && bonusLog.length > 0) {
                strategy = strategy + "Bonus";
                strategyDetails.paidFromBonus = parseInt(bonusLog[0]["amount"]);
            }
            if (depositLog && depositLog.length > 0) {
                strategy = strategy + "Deposit";
                strategyDetails.paidFromDeposit = parseInt(depositLog[0]["amount"]);
            }
            if (withdrawLog && withdrawLog.length > 0) {
                strategy = strategy + "Withdraw";
                strategyDetails.paidFromWithdraw = parseInt(withdrawLog[0]["amount"]);
            }

            strategyDetails.strategyName = strategy;
        } catch (e) {
            console.log("Exception: ", e);
        }
        return strategyDetails;
    }

    async isDepositWithdraw(input: string): Promise<boolean> {
        return await this.isDeposit(input) && await this.isWithdrawOnly(input);
    }

    async isDeposit(input: string): Promise<boolean> {
        return input.includes("Bonus") || input.includes("Deposit");
    }

    async isWithdrawOnly(input: string): Promise<boolean> {
        return input.includes("Withdraw") && !input.includes("Bonus") && !input.includes("Deposit");
    }

    async isValidUserId(userId: any): Promise<boolean> {
        return (userId != '' && userId != undefined && userId != 'UNDEFINED' && userId);
    }

    async createTrxHistory(userId: any, data: Array<{}>): Promise<Array<{}>> {
        let result: any = [];
        let tableGameSessions = [];
        let index = 0;
        for (const value of data) {
            try {
                let d = value;

                let idPrefix = "GMSAPPB_";
                if (d["wallet"] == "deposit")
                    idPrefix = "GMSAPPD_";
                if (d["wallet"] == "withdraw")
                    idPrefix = "GMSAPPW_";
                d["id"] = idPrefix + d["id"];

                if (d["fkSenderId"] == userId)
                    d["trxType"] = "10";
                else if (d["fkReceiverId"] == userId)
                    d["trxType"] = "20";
                else
                    d["trxType"] = "----";
                const gameName: string = await this.getGameName(d["fkGameId"], d["gameEngine"], d["engineId"]);
                d["requestTypeMsg"] = await this.getRequestTypeMsg(d["wallet"], d["requestType"], d["gameEngine"], d["fkGameId"]);
                d["gameName"] = gameName
                d["payResult"] = await this.getPayResultMsg(d["payStatus"]);

                if (d["wallet"] == "bonus" || d["wallet"] == "deposit")
                    d["wallet"] = "Deposit";
                else
                    d["wallet"] = "Winning";
                // const temp = d["pgRefNo"].split(":");
                // const tableGameId = temp[0];
                // const sessionId = temp[1];

                delete d["fkSenderId"];
                delete d["fkReceiverId"];

                // const gamePlayRequestTypes = [];
                // gamePlayRequestTypes.push(Constant.Payment.reqType.TLB.GamePlay);
                // gamePlayRequestTypes.push(Constant.Payment.reqType.TLD.GamePlay);
                // gamePlayRequestTypes.push(Constant.Payment.reqType.TLW.GamePlay);
                // if (+d["gameEngine"] == Constant.GameEngine.TableFormatGame && gamePlayRequestTypes.includes(+d["requestType"])) {
                //     // find all coins transactions for this pgRefNo 
                //     const temp = d["pgRefNo"].split(":");
                //     const masterSessionId = temp[1];
                //     if (!tableGameSessions.includes(masterSessionId)) {
                //         const coinsTrx = await this.getCoinsWalletTransactions(userId, masterSessionId);
                //         d["coinsTrx"] = await this.formatCoinWalletTransactions(userId, coinsTrx);
                //         tableGameSessions.push(masterSessionId);
                //         result.push(d);
                //     } else {
                //         d["coinsTrx"] = [];
                //         result.push(d);
                //         // if (result.length > 0) {
                //         //     const prev = result[index - 1];
                //         //     const current = result[index];
                //         //     if (prev["pgRefNo"] == current["pgRefNo"]) {
                //         //         result[index - 1] = current; 
                //         //         result[index] = prev;
                //         //     }
                //         // }
                //     }
                // } else 
                //     result.push(d);
                result.push(d)

                index = index + 1;
            } catch (error) {
                console.error("createTrxHistory: ", error);
            }

        }
        return result;
    }

    async createTrxHistoryV2(userId: any, data: Array<{}>): Promise<Array<{}>> {
        let result: any = [];
        for (let trxData of data) {
            try {
                trxData["id"] = "GAP_" + trxData["id"];

                if (trxData["fkSenderId"] == userId)
                    trxData["trxType"] = "10";
                else if (trxData["fkReceiverId"] == userId)
                    trxData["trxType"] = "20";
                else
                    trxData["trxType"] = "----";

                let gameName: string;
                let trxDetails:any;
                
                if(trxData["gameEngine"] == "tableGame"){

                    let reqData=JSON.parse(trxData["fkGameId"]);
                    
                    trxData["pgRefNo"]=trxData["pgRefNo"] + "/" + reqData['gameRoundIdGS'];

                    let amountData=trxData["amount"].split("_");
                    
                    trxData["gameEngine"]=Constant.GameEngine.TableFormatGame;


                    gameName = reqData['gameId']?await this.getGameName(reqData['gameId'], Constant.GameEngine.TableFormatGame, reqData['gameTypeId']):"Ludo";
                    trxData["fkGameId"]=reqData['gameId']?reqData['gameId']:11;

                    trxData["gameName"] = gameName
                   
                    trxData["requestTypeMsg"]=Constant.Payment.reqType.TABLE_GAME[trxData['requestType']];
                
                    
                    trxData["payStatus"]=trxData["payStatus"]==Constant.TABLE_TRX.END['TO-DO']?Constant.Payment.payStatus.TLW.Failed:Constant.Payment.payStatus.TLW.Success;
                    trxData["payResult"] = trxData["payStatus"]==10?"SUCCESS":"FAILED";

                    if(trxData['requestType']==50){
                        trxData["trxType"] = "10";
                        trxData['amount']=amountData[0];
                        trxData['trxDetails'] = [
                            {
                                "wallet": "DEPOSIT",
                                "amount": +amountData[1] + +amountData[3]
                            },
                            {
                                "wallet": "WINNINGS",
                                "amount": +amountData[2]
                            },
                        ]
                    }
                    else if(trxData['requestType'] == 60 ){
                        trxData["trxType"] = "10";
                        let distribution=JSON.parse(amountData[4]);

                        trxData['amount']=0; //+distribution['deposit'] + +distribution['bonus'] + +distribution['winning'];
                        trxData['trxDetails'] = [
                            {
                                "wallet": "DEPOSIT",
                                "amount": 0 //+distribution['deposit'] + +distribution['bonus']
                            },
                            {
                                "wallet": "WINNINGS",
                                "amount": 0 //+distribution['winning']
                            },
                        ]
                    }
                    else{
                        /*let distribution=JSON.parse(amountData[4])
                        trxData['trxDetails'] = [
                            {
                                "wallet": "DEPOSIT",
                                "amount": +distribution['deposit'] + +distribution['bonus']
                            },
                            {
                                "wallet": "WINNINGS",
                                "amount": +distribution['winning']
                            },
                        ]*/
                        trxData['amount']=amountData[2];
                        trxData["trxType"] = "20";
                        trxData['trxDetails'] = [
                            {
                                "wallet": "DEPOSIT",
                                "amount": 0
                            },
                            {
                                "wallet": "WINNINGS",
                                "amount": amountData[2]
                            },
                        ]
                    }
                    
                }
                else{
                    gameName = await this.getGameName(trxData["fkGameId"], trxData["gameEngine"], trxData["engineId"]);
                    trxData["gameName"] = gameName
                    trxData["requestTypeMsg"] = await this.getRequestTypeMsg(trxData["wallet"], trxData["requestType"], trxData["gameEngine"], gameName);
                    trxData["payResult"] = await this.getPayResultMsg(trxData["payStatus"]);
                    trxDetails = await this.getTransactionDetails(userId, trxData['pgRefNo'], parseInt(trxData['requestType']), trxData['wallet'], trxData['amount'], trxData['fkGameId']);
                    trxData['trxDetails'] = [
                        {
                            "wallet": "DEPOSIT",
                            "amount": trxDetails.deposit
                        },
                        {
                            "wallet": "WINNINGS",
                            "amount": trxDetails.withdraw
                        },
                    ]
                }
                
                delete trxData["fkSenderId"];
                delete trxData["fkReceiverId"];
                delete trxData["wallet"];

                result.push(trxData);
            } catch (error) {
                console.error("createTrxHistoryV2: ", error);
            }
        }
        return result;
    }

    async getTransactionDetails(userId: any, pgRefNo: string, requestType: number, wallet: string, amount: number, gameId: number) {
        let result: any = {
            deposit: 0,
            withdraw: 0
        };
        try {
            const selectColumns = `%s.id, %s.fkSenderId, %s.fkReceiverId, %s.amount, %s.payStatus, %s.requestType, %s.createdAt, %s.fkGameId, %s.gameEngine, %s.engineId, %s.pgRefNo`;
            const depostBonusColumns = `id, fkSenderId, fkReceiverId, amount, payStatus, requestType, createdAt, fkGameId, gameEngine, engineId, pgRefNo, wallet`;
            const tlbCols = selectColumns.replace(/%s/g, "tlb"),
                tldCols = selectColumns.replace(/%s/g, "tld"),
                tlwCols = selectColumns.replace(/%s/g, "tlw");
            let data: any = [];
            // requestType = parseInt(requestType);
            if ([Constant.Payment.reqType.TLB.WinningPrize, Constant.Payment.reqType.TLD.WinningPrize, Constant.Payment.reqType.TLW.WinningPrize].indexOf(requestType) >= 0) {
                data = await models.sequelize.query(`SELECT ${depostBonusColumns} FROM (
                    SELECT ${tlbCols}, 'bonus' AS wallet FROM gmsPaymentTransactionLogBonus tlb WHERE (tlb.fkSenderId=${userId} OR tlb.fkReceiverId=${userId}) AND tlb.pgRefNo='${pgRefNo}' AND tlb.requestType=${Constant.Payment.reqType.TLB.WinningPrize}
                    UNION ALL 
                    SELECT ${tldCols}, 'deposit' AS wallet FROM gmsPaymentTransactionLogDeposit tld WHERE (tld.fkSenderId=${userId} OR tld.fkReceiverId=${userId}) AND tld.pgRefNo='${pgRefNo}' AND tld.requestType=${Constant.Payment.reqType.TLD.WinningPrize}
                    UNION ALL 
                    SELECT ${tlwCols}, 'withdraw' AS wallet FROM gmsPaymentTransactionLogWithdraw tlw WHERE (tlw.fkSenderId=${userId} OR tlw.fkReceiverId=${userId}) AND tlw.pgRefNo='${pgRefNo}' AND tlw.requestType=${Constant.Payment.reqType.TLW.WinningPrize}
                    ) AS paymentLog ORDER BY createdAt DESC;`, { type: sequelize.QueryTypes.SELECT });

            } else if (requestType == Constant.Payment.reqType.TLD.GamePlay) {
                data = await models.sequelize.query(`SELECT ${depostBonusColumns} FROM (
                    SELECT ${tlbCols}, 'bonus' AS wallet FROM gmsPaymentTransactionLogBonus tlb WHERE (tlb.fkSenderId=${userId} OR tlb.fkReceiverId=${userId}) AND tlb.pgRefNo='${pgRefNo}' AND tlb.requestType=${Constant.Payment.reqType.TLB.GamePlay}
                    UNION ALL 
                    SELECT ${tldCols}, 'deposit' AS wallet FROM gmsPaymentTransactionLogDeposit tld WHERE (tld.fkSenderId=${userId} OR tld.fkReceiverId=${userId}) AND tld.pgRefNo='${pgRefNo}' AND tld.requestType=${Constant.Payment.reqType.TLD.GamePlay}
                    UNION ALL 
                    SELECT ${tlwCols}, 'withdraw' AS wallet FROM gmsPaymentTransactionLogWithdraw tlw WHERE (tlw.fkSenderId=${userId} OR tlw.fkReceiverId=${userId}) AND tlw.pgRefNo='${pgRefNo}' AND tlw.requestType=${Constant.Payment.reqType.TLW.GamePlay}
                    ) AS paymentLog ORDER BY createdAt DESC;`, { type: sequelize.QueryTypes.SELECT });

            } else if ([Constant.Payment.reqType.TLB.GameRefund, Constant.Payment.reqType.TLD.GameRefund, Constant.Payment.reqType.TLW.RefundToPlAc].indexOf(requestType) >= 0) {
                data = await models.sequelize.query(`SELECT ${depostBonusColumns} FROM (
                    SELECT ${tlbCols}, 'bonus' AS wallet FROM gmsPaymentTransactionLogBonus tlb WHERE (tlb.fkSenderId=${userId} OR tlb.fkReceiverId=${userId}) AND tlb.pgRefNo='${pgRefNo}' AND tlb.requestType=${Constant.Payment.reqType.TLB.GameRefund}
                    UNION ALL 
                    SELECT ${tldCols}, 'deposit' AS wallet FROM gmsPaymentTransactionLogDeposit tld WHERE (tld.fkSenderId=${userId} OR tld.fkReceiverId=${userId}) AND tld.pgRefNo='${pgRefNo}' AND tld.requestType=${Constant.Payment.reqType.TLD.GameRefund}
                    UNION ALL 
                    SELECT ${tlwCols}, 'withdraw' AS wallet FROM gmsPaymentTransactionLogWithdraw tlw WHERE (tlw.fkSenderId=${userId} OR tlw.fkReceiverId=${userId}) AND tlw.pgRefNo='${pgRefNo}' AND tlw.requestType=${Constant.Payment.reqType.TLW.RefundToPlAc}
                    ) AS paymentLog ORDER BY createdAt DESC;`, { type: sequelize.QueryTypes.SELECT });
            }

            if (data && data.length > 0) {
                for (const item of data) {
                    if (item['wallet'] == "deposit" || item['wallet'] == "bonus") {
                        result.deposit += item['amount'];
                    } else if (item['wallet'] == 'withdraw') {
                        result.withdraw += item['amount'];
                    }
                }
            } else {
                if (wallet == 'deposit' || wallet == 'bonus') {
                    result.deposit = amount;
                } else if (wallet == 'withdraw') {
                    result.withdraw = amount;
                }
            }
            return result;
        } catch (error) {
            console.log("Error - (getTransactionDetails): ", error);
            return result;
        }
    }

    async getCoinsWalletTransactions(userId: any, masterSessionId: string) {
        let result = [];
        try {
            const data = await models.gmsPaymentTransactionLogCoins.findAll({
                where: {
                    [Op.or]: [
                        { fkSenderId: userId },
                        { fkReceiverId: userId }
                    ],
                    masterGameSession: masterSessionId
                },
                order: [
                    ['id', 'DESC']
                ]
            });
            // serialize this data 
            result = data;
        } catch (error) {
            console.log("Error - (getCoinsWalletTransactions): ", error);
        }
        return result;
    }

    async formatCoinWalletTransactions(userId: any, data: any) {
        const result = [];
        const events = [];
        events.push(Constant.TabularGames.Events.PLAYER_BET);
        events.push(Constant.TabularGames.Events.PLAYER_WIN);
        for (const d of data) {
            if (events.includes(d["event"])) {
                const r: any = {};
                r.id = d.id;
                if (d["fkSenderId"] == userId) {
                    r["trxType"] = "10";
                    r["coinBalance"] = d["senderClosingBalance"];
                } else if (d["fkReceiverId"] == userId) {
                    r["trxType"] = "20";
                    r["coinBalance"] = d["receiverClosingBalance"];
                } else {
                    r["trxType"] = "----";
                }
                r["amount"] = d["amount"];
                r["event"] = d["event"]
                // r["coinBalance"] = 0; // update this value with current coin balance 
                result.push(r);
            }
        }
        return result;
    }

    async getPayResultMsg(payStatus: any): Promise<string> {
        let payResult: string = "";
        if (payStatus == 10)
            payResult = "SUCCESS";
        else if (payStatus == 20)
            payResult = "FAILED";
        else if (payStatus == 30)
            payResult = "PENDING";
        else if(payStatus == 50)
            payResult = "APPROVAL PENDING";
        else
            payResult = "";
        return payResult;
    }

    async getRequestTypeMsg(wallet: string, requestType: any, gameEngine: number, gameId: string): Promise<string> {
        let type: string = "";
        if (wallet == "bonus") {
            if (requestType == Constant.Payment.reqType.TLB.Inward)
                type = "Cash Deposit";
            else if (requestType == Constant.Payment.reqType.TLB.GamePlay && gameId == config.tableGames.rummy.id)
                type = "Lost ";
            else if (requestType == Constant.Payment.reqType.TLB.GamePlay)
                type = "Entry Fee";
            else if (requestType == Constant.Payment.reqType.TLB.Rewards)
                type = "Reward";
            else if (requestType == Constant.Payment.reqType.TLB.GameRefund)
                type = "Refund";
            else if (requestType == Constant.Payment.reqType.TLB.TFGRefund)
                type = "Game Refund";
            else if (requestType == Constant.Payment.reqType.TLB.TokenPurchase)
                type = "Token Purchase";
            else if (requestType == Constant.Payment.reqType.TLB.ScratchCard)
                type = "Scratch Card Reward";
            else if (requestType == Constant.Payment.reqType.TLB.Streaks)
                type = "Streaks";
            else if (requestType == Constant.Payment.reqType.TLB.Referral)
                type = "Refer & Earn Bonus";
            else if (requestType == Constant.Payment.reqType.TLB.Cashback)
                type = "Cashback Credited";
            else
                type = "Invalid Request Type";
        } else if (wallet == "deposit") {
            if (requestType == Constant.Payment.reqType.TLD.Inward)
                type = "Cash Deposit";
            else if (requestType == Constant.Payment.reqType.TLB.GamePlay && gameId == config.tableGames.rummy.id)
                type = "Lost";
            else if (requestType == Constant.Payment.reqType.TLD.GamePlay)
                type = "Entry Fee";
            else if (requestType == Constant.Payment.reqType.TLD.Rewards)
                type = "Reward";
            else if (requestType == Constant.Payment.reqType.TLD.GameRefund)
                type = "Refund";
            else if (requestType == Constant.Payment.reqType.TLD.TFGRefund)
                type = "Game Refund";
            else if (requestType == Constant.Payment.reqType.TLD.TokenPurchase)
                type = "Token Purchase";
            else if (requestType == Constant.Payment.reqType.TLD.WinningPrize && gameId == config.tableGames.rummy.id)
                type = "Won";
            else if (requestType == Constant.Payment.reqType.TLD.WinningPrize)
                type = "Winning Amount";
            else
                type = "Invalid Request Type";
        } else if (wallet == "withdraw") {
            if (requestType == Constant.Payment.reqType.TLW.Outward)
                type = "Cash Withdraw";
            else if (requestType == Constant.Payment.reqType.TLB.GamePlay && gameId == config.tableGames.rummy.id)
                type = "Lost";
            else if (requestType == Constant.Payment.reqType.TLW.GamePlay)
                type = "Entry Fee";
            else if (requestType == Constant.Payment.reqType.TLW.WinningPrize && gameId == config.tableGames.rummy.id)
                type = "Won";
            else if (requestType == Constant.Payment.reqType.TLW.WinningPrize)
                type = "Winning Amount";
            else if (requestType == Constant.Payment.reqType.TLW.CommissionCharge)
                type = "Commission";
            else if (requestType == Constant.Payment.reqType.TLW.RefundToPlAc)
                type = "Refund";
            else if (requestType == Constant.Payment.reqType.TLW.TFGRefundToPlAc)
                type = "Game Refund";
            else if (requestType == Constant.Payment.reqType.TLW.RefundOutwardAfterFailed || requestType == Constant.Payment.reqType.TLW.RejectOutward)
                type = "Withdraw Refund";
            else if (requestType == Constant.Payment.reqType.TLW.Referral)
                type = "Refer & Earn Bonus";
            else
                type = "Invalid Request Type";
        }else if (wallet == "bdw") {
            if (requestType == Constant.Payment.reqType.TLW.GamePlay)
                type = "Entry Fee";
            else if (requestType == Constant.Payment.reqType.TLW.WinningPrize)
                type = "Won";
            else if (requestType == Constant.Payment.reqType.TLW.RefundToPlAc)
                type = "Refund";
            else if (requestType == Constant.Payment.reqType.TLW.RefundOutwardAfterFailed)
                type = "Withdraw Refund";
            else if (requestType == Constant.Payment.reqType.TLW.Referral)
                type = "Refer & Earn Bonus";
            else
                type = "Invalid Request Type";
        }
        return type;
    }

    async getGameName(gameId: any, gameEngine: any, engineId: any): Promise<string> {
        let gameName: string = "";
        if (gameEngine == Constant.GameEngine.Battle || gameEngine == Constant.GameEngine.Tournament) {
            let gameList = global.GAME_LIST;
            let battleList = global.BATTLE_LIST;

            let gameData = gameList.filter(game=>game['id']==gameId);
            let battleData = battleList.filter(battle=>battle['id']==engineId);

            const name = gameData[0]['name']; //await CommonUtils.getColValue("gmsGames", "name", { "id": gameId });
            const title = battleData[0]['title']; //await CommonUtils.getColValue("gmsBattle", "title", { "id": engineId });
            gameName = `${name} (${title})`;
        } else if (gameEngine == Constant.GameEngine.CricketFantacy) {
            const name = await CommonUtils.getColValue("gmsFantacyCricketMatch", "shortTitle", { "matchId": gameId });
            const title = await CommonUtils.getColValue("gmsFantacyCricketContest", "title", { "id": engineId });
            gameName = `${name} (${title})`;
        } else if (gameEngine == Constant.GameEngine.TableFormatGame) {

            let gameList = global.GAME_LIST;
            let gameData = gameList.filter(game=>game['id']==gameId);
            const name = gameData[0]['name']; //await CommonUtils.getColValue("gmsGames", "name", { "id": gameId });
            gameName = `${name}`;
        }
        return gameName;
    }

    /**
     * Create User Game Wallet Transaction 
     * @param userId 
     * @param amount 
     * @param trxType 
     * @param tableGameId 
     */
    async updateUserTableGameBalance(userId: number, amount: number, trxType: number, tableGameId: number,
        sessionId: string, isEntryFee: boolean = false): Promise<boolean> {
        let result = false;
        try {
            /***  IMP: Source of truth being used for coins balance is getUserAccountBal from coins wallet  ***/
            //--------------------------------------------------------------------------------------------------

            // check if total in amount and total out amount to/from table game are balanced so far 
            // if (!await this.areTableGameTrxBalanced(tableGameId)) {
            //     return false;
            // }

            // @todo: if user game wallet balance is less than certain amount, do an autofill, if autfill is turned on for the user.
            // let userGameWalletBalance: number = await this.getUserGameWalletBalance(userId, tableGameId, playerStatus);
            // let userGameWalletBalance: number = await this.getUserAccountBal(userId, Constant.Payment.AccType.Coins);
            let userGameWalletBalance: number = await this.getUserAccountBalV1(userId, Constant.Payment.AccType.Coins);
            // let tableGameBalance: number = await this.getTableGameBalance(tableGameId);
            // if (trxType == Constant.Payment.trxType.Credit) {
            //     //userGameWalletBalance = +userGameWalletBalance + +amount;
            //     if (isEntryFee) {
            //         tableGameBalance = +tableGameBalance + +amount;
            //     } else {
            //         tableGameBalance = +tableGameBalance - +amount;
            //     }
            // } else if (trxType == Constant.Payment.trxType.Debit) {
            //     //userGameWalletBalance = +userGameWalletBalance - +amount;
            //     tableGameBalance = +tableGameBalance + +amount;
            // }

            const isUserGameWalletUpdated = await this.updatePlayerSessionBalance(userId, sessionId, userGameWalletBalance);
            result = isUserGameWalletUpdated;
            // if (isUserGameWalletUpdated) {
            //     const isTableGameBalanceUpdated = await this.updateTableGameBalance(tableGameId, tableGameBalance);
            //     result = isTableGameBalanceUpdated;
            // }
        } catch (error) {
            console.log("Exception > ", error);
        }
        return result;
    }

    //This Function is not in Use
    async getTableGamePlayer(userId: number, tableGameId: number, status: number): Promise<any> {
        return await models.gmsTableGamePlayers.findOne({
            where: {
                fkTableGameId: tableGameId,
                fkPlayerId: userId,
                status: status
            }
        });
    }

    /**
     * Get User Game Wallet Balance 
     * @param userId 
     * @param tableGameId 
     */

    //This function is not in use
    async getUserGameWalletBalance(userId: number, tableGameId: number, status: number): Promise<number> {
        let balance: number = 0;
        try {
            const tableGamePlayers = await models.gmsTableGamePlayers.findOne({
                where: {
                    fkPlayerId: userId,
                    fkTableGameId: tableGameId,
                    status: status
                }
            });
            balance = tableGamePlayers.playerCurrentBalance ? tableGamePlayers.playerCurrentBalance : 0;

        } catch (error) {
            console.log("Error(getUserGameWalletBalance): ", error);
        }
        return balance;
    }

    /**
     * Update User Game Wallet Balance  
     * @param userId 
     * @param amount 
     * @param tableGameId 
     */
    //This function is not in use.
    async updateUserGameWalletBalance(userId: number, amount: number, tableGameId: number, playerStatus: number): Promise<boolean> {
        const data = await models.gmsTableGamePlayers.update({
            playerCurrentBalance: amount
        }, {
            where: {
                fkPlayerId: userId,
                fkTableGameId: tableGameId,
                status: playerStatus
            }
        });
        if (data[0] > 0)
            return true;
        else
            return false;
    }

    /**
     * Update player session balance 
     * @param userId 
     * @param sessionId  
     * @param amount 
     */
    async updatePlayerSessionBalance(userId: number, sessionId: string, amount: number) {
        console.log("updatePlayerSessionBalance > playerId: " + userId + ", amount: " + amount + ", SessionId: " + sessionId);
        const data = await models.gmsTableGameSessionPlayer.update({
            playerCurrentBalance: amount
        }, {
            where: {
                fkPlayerId: userId,
                fkSessionId: sessionId
            }
        });
        if (data[0] > 0)
            return true;
        else
            return false;
    }

    /**
     * Get Table Game Current Balance 
     * @param tableGameId 
     */
    async getTableGameBalance(tableGameId: number): Promise<number> {
        let tableGameBalance: number = 0;
        const tableGame = await models.gmsTableGame.findOne({
            where: {
                id: tableGameId
            }
        });
        tableGameBalance = tableGame.tableCurrentBalance;
        return tableGameBalance;
    }

    /**
     * Update Table Game Current Balance 
     * @param tableGameId 
     * @param amount 
     */
    async updateTableGameBalance(tableGameId: number, amount: number): Promise<boolean> {
        // await models.gmsTableGame
        //     .findOne({ where: { id: tableGameId } })
        //     .then(async function (tableGame) {
        //         if (tableGame) {
        //             //Update
        //             let total: number = +tableGame.tableCurrentBalance + +amount;
        //             console.log("tableCurrentBalance: ", total);
        //             await tableGame.update({
        //                 tableCurrentBalance: total
        //             });
        //         }
        //     });
        await models.gmsTableGame.increment({ tableCurrentBalance: +amount }, { where: { id: tableGameId } })

        return true
    }

    /**
     * Are Table Game All Transactions are balanced so far?  
     * @param tableGameId 
     */
    async areTableGameTrxBalanced(tableGameId: number): Promise<boolean> {
        const creditAmout = await this.getLatestTableGameTrxTypeAmountSum(tableGameId, Constant.Payment.trxType.Credit);
        const debitAmount = await this.getLatestTableGameTrxTypeAmountSum(tableGameId, Constant.Payment.trxType.Debit);
        return (creditAmout - debitAmount) == 0;
    }

    /**
     * Get Latest Table Game Trx Type Total Amount 
     * @param tableGameId   
     * @param trxType 
     */
    async getLatestTableGameTrxTypeAmountSum(tableGameId: number, trxType: number): Promise<number> {
        let totalAmount = 0;
        const trx: string = trxType == Constant.Payment.trxType.Credit ? "CREDIT" : "DEBIT";
        const data = await models.gmsTableVirtualTransaction.findAll({
            where: {
                fkTableGameId: tableGameId,
                trxType: trx
            },
            attributes: [
                'fkTableGameId', 'trxType',
                [sequelize.fn('sum', sequelize.col('amount')), 'totalAmount'],
            ],
            group: ['fkTableGameId', 'trxType'],
        });
        totalAmount = data[0]['totalAmount'];
        return totalAmount;
    }

    async getTransactionLogDetails(logTable, id) {
        try {
            let data = await models.sequelize.query(`select * from ${logTable} where id=${id}`,
                { type: sequelize.QueryTypes.SELECT });
            return data && data.length > 0 ? data[0] : false;
        }
        catch (error) {
            return false;
        }
    }

    async gmsUserAccountFirstDepositLog(data:any)
    {
        let URL = config.USER_ACCOUNTS['FIRST_DEPOSIT_LOG'];
        let reqBodyData : any = data;
        var FirstDepositLogAPI = {
            "url": URL,
            "method": 'POST',
            "headers": {
                "accept": "application/json",
                "Content-Type":"application/json"
            },
            "json":reqBodyData
        }
        try{
            let FirstTimeDepositLogAPIStatus=await new Promise((resolve, reject) => {
                request(FirstDepositLogAPI, async (err, resp, body) => {
                    console.log(body);
                    if(err){
                        console.log(`Error in first time deposit log API : `);
                        console.log(err);
                        reject(false);
                    }
                    else{
                        //body=JSON.parse(body);
                        resolve(true);
                    }
                })
            }); //End of Promise
            return true;
        }
        catch(error){
            console.log("Error in API first time deposit log.")
            console.log(error);
            return false;
        }
    }

    async preparedDescription(wallet,status,amount,othersDetails=null,tds=null){
        let description="";
        if(wallet=="WITHDRAW"){
            if(status==Constant.Payment.payStatus.TLW.Success ||
                status==Constant.Payment.payStatus.TLW.Failed ||
                status==Constant.Payment.payStatus.TLW.Pending)
            {

                othersDetails['accountNumber']= "xxx"+othersDetails['accountNumber'].substring(othersDetails['accountNumber'].length-5,othersDetails['accountNumber'].length);
            }
            
            if(status==Constant.Payment.payStatus.TLW.Success){
                let preparedDec= Constant.DEPOSIT_WITHDRAW_DESCRIPTION.WITHDRAW.SUCCESS;
                preparedDec=preparedDec.replace("<amount>", amount);
                preparedDec=preparedDec.replace("<bankname>", othersDetails['bankName']);
                preparedDec=preparedDec.replace("<acno>", othersDetails['accountNumber']);
                preparedDec=preparedDec.replace("<tds>", tds);
                
                description=preparedDec;
            }
            else if(status==Constant.Payment.payStatus.TLW.Failed){
                let preparedDec= Constant.DEPOSIT_WITHDRAW_DESCRIPTION.WITHDRAW.FAILED;
                preparedDec=preparedDec.replace("<amount>", amount);
                preparedDec=preparedDec.replace("<bankname>", othersDetails['bankName']);
                preparedDec=preparedDec.replace("<acno>", othersDetails['accountNumber']);
                description=preparedDec;
            }
            else if(status==Constant.Payment.payStatus.TLW.Pending){
                let preparedDec= Constant.DEPOSIT_WITHDRAW_DESCRIPTION.WITHDRAW.PENDING;
                preparedDec=preparedDec.replace("<amount>", amount);
                preparedDec=preparedDec.replace("<bankname>", othersDetails['bankName']);
                preparedDec=preparedDec.replace("<acno>", othersDetails['accountNumber']);
                description=preparedDec;
            }
            else if(status=="REFUND"){
                let preparedDec= Constant.DEPOSIT_WITHDRAW_DESCRIPTION.WITHDRAW.REFUND;
                preparedDec=preparedDec.replace("<amount>", amount);
                preparedDec=preparedDec.replace("<txnId>", othersDetails['txnId']);
                description=preparedDec;
            }
            else{
                description="No details Found";
            }
        }
        if(wallet=="DEPOSIT"){
            if(status==Constant.Payment.payStatus.TLD.Success){
                let preparedDec= Constant.DEPOSIT_WITHDRAW_DESCRIPTION.DEPOSIT.SUCCESS;
                preparedDec=preparedDec.replace("<amount>", amount);
                description=preparedDec;
            }
            else if(status==Constant.Payment.payStatus.TLD.Failed){
                let preparedDec= Constant.DEPOSIT_WITHDRAW_DESCRIPTION.DEPOSIT.FAILED;
                preparedDec=preparedDec.replace("<amount>", amount);
                description=preparedDec;
            }
            else if(status==Constant.Payment.payStatus.TLD.Pending){
                let preparedDec= Constant.DEPOSIT_WITHDRAW_DESCRIPTION.DEPOSIT.PENDING;
                preparedDec=preparedDec.replace("<amount>", amount);
                description=preparedDec;
            }
            else{
                description="No details Found.";
            }
        }
        if(wallet=="BONUS"){
            if(status=="CASHBACK"){
                let preparedDec= Constant.DEPOSIT_WITHDRAW_DESCRIPTION.BONUS.CASHBACK;
                preparedDec=preparedDec.replace("<amount>", amount);
                description=preparedDec;
            }
            else if(status=="DEPOSITBONUSCREATOR"){
                let preparedDec= Constant.DEPOSIT_WITHDRAW_DESCRIPTION.BONUS.DEPOSITBONUSCREATOR;
                preparedDec=preparedDec.replace("<amount>", amount);
                description=preparedDec;
            }
            else if(status=="DEPOSITBONUS"){
                let preparedDec= Constant.DEPOSIT_WITHDRAW_DESCRIPTION.BONUS.DEPOSITBONUS;
                preparedDec=preparedDec.replace("<amount>", amount);
                description=preparedDec;
            }
            else if(status=="GEMSBONUS"){
                let preparedDec= Constant.DEPOSIT_WITHDRAW_DESCRIPTION.BONUS.GEMSBONUS;
                preparedDec=preparedDec.replace("<amount>", amount);
                description=preparedDec;
            }
            else if(status=="GEMSREEDEM"){
                let preparedDec= Constant.DEPOSIT_WITHDRAW_DESCRIPTION.BONUS.GEMSREEDEM;
                preparedDec=preparedDec.replace("<amount>", amount);
                description=preparedDec;
            }
            else if(status=="REWARDS"){
                let preparedDec= Constant.DEPOSIT_WITHDRAW_DESCRIPTION.BONUS.REWARDS;
                preparedDec=preparedDec.replace("<amount>", amount);
                description=preparedDec;
            }
        }
        return description;
    }

}

export default new Helper();
