import sequelize from 'sequelize';
import models, { sequelize1 } from '../../models/index';
import Constant from '../../../common/app.constant';
import CommonHelper, { Helper } from '../../../common/helper';
import PaymentHelper from './helper';
import { TrxLogRecord } from './types';
import BonusAccountService from './bonusaccount.service';
import DepositAccountService from './depositaccount.service';
import WithdrawAccountService from './withdrawaccount.service';
import CoinsAccountService from './coinsaccount.service';
import PaymentFactory from './paymentfactory';
import * as secretConfig from '../../../common/secret.config.json';
import ReferralAccountService from './referralaccount.service';
import { any } from 'bluebird';
import helper from '../../../common/helper';

const config: any = secretConfig;


export class MasterService {
    async userGameFeePayment(senderId: any, receiverId: any, amount: any, gameId: any, gameEngine: any, engineId: any, pgRefNo: any, isAutoRefill: boolean): Promise<any> {
        const paymentInfo = await this.findPayStrategyCheckUserHasEnoughBalance(senderId, amount);

        let trxLog: any = {
            fkSenderId: senderId,
            fkReceiverId: receiverId,
            senderClosingBalance: 0,
            receiverClosingBalance: 0,
            fkGameId: gameId,
            gameEngine: gameEngine,
            engineId: engineId,
            pgRefNo: pgRefNo
        };

        console.log("Payment Startegy being used for this balance deduction: ", paymentInfo.paymentStrategy.name);
        const isTrxDone = await (new paymentInfo.paymentStrategy.service).deductBalance(trxLog, amount, paymentInfo.bonusAccBalance, paymentInfo.depositAccBalance, paymentInfo.withdrawAccBalance, pgRefNo, isAutoRefill);

        return {
            paymentStrategyName: paymentInfo.paymentStrategy.name,
            isTrxDone: isTrxDone
        };
    }

    async findPayStrategyCheckUserHasEnoughBalance(userId: any, amount: any): Promise<any> {
        // const bonusAccBalance = await PaymentHelper.getUserAccountBal(userId, Constant.Payment.AccType.Bonus);
        // const depositAccBalance = await PaymentHelper.getUserAccountBal(userId, Constant.Payment.AccType.Deposit);
        // const withdrawAccBalance = await PaymentHelper.getUserAccountBal(userId, Constant.Payment.AccType.Withdraw);
        
        /*const bonusAccBalance = await PaymentHelper.getUserAccountBalV1(userId, Constant.Payment.AccType.Bonus);
        const depositAccBalance = await PaymentHelper.getUserAccountBalV1(userId, Constant.Payment.AccType.Deposit);
        const withdrawAccBalance =await PaymentHelper.getUserAccountBalV1(userId, Constant.Payment.AccType.Withdraw);*/

        let accountBal= await PaymentHelper.getUserAccountTotalBal(userId);
        let bonusAccBalance=accountBal['bonusBal'];
        let withdrawAccBalance=accountBal['withdrawalBal'];
        let depositAccBalance= accountBal['depositBal'];

        console.log("Amount Required: ", amount);
        console.log("Bonus Amount : ", bonusAccBalance);
        console.log("Deposit Amount : ", depositAccBalance);
        console.log("Withdraw Amount : ", withdrawAccBalance);

        const paymentStrategy = await PaymentFactory.getPaymentStrategy(amount, bonusAccBalance, depositAccBalance, withdrawAccBalance);
        return {
            paymentStrategy: paymentStrategy,
            bonusAccBalance: bonusAccBalance,
            depositAccBalance: depositAccBalance,
            withdrawAccBalance: withdrawAccBalance
        };
    }

    async userAccountBalanceDeduction(userDetails: any, amount: any, gameId: any, gameEngine: any, engineId: any, pgRefNo: string = null) {
        if (pgRefNo) {
            const inwardStatus = await PaymentHelper.isDuplicateGamePlayPayment(userDetails['id'], pgRefNo, gameId, engineId);
            if (inwardStatus) {
                return 412;
            }
        }

        const { paymentStrategyName, isTrxDone } = await this.userGameFeePayment(
            userDetails['id'], config.financialUser.Settlement, amount, gameId, gameEngine, engineId, pgRefNo, false
        );

        let returnCode = 200;
        if (paymentStrategyName == Constant.PaymentStrategy.ZeroPayment) {
            returnCode = 502;
        } else {
            if (isTrxDone)
                if (gameEngine == 1 && pgRefNo)
                    returnCode = 412;
                else
                    returnCode = 200;
            else
                return false;
        }
        return returnCode;
    }

    async userAccountBalanceDeductionV2(userDetails: any, amount: any, gameId: any, gameEngine: any, engineId: any, pgRefNo: string, isAutoRefill: boolean) {
        const { paymentStrategyName, isTrxDone } = await this.userGameFeePayment(
            userDetails['id'], config.financialUser.Settlement, amount, gameId, gameEngine, engineId, pgRefNo, isAutoRefill
        );

        let returnCode = 200;
        if (paymentStrategyName == Constant.PaymentStrategy.ZeroPayment) {
            returnCode = 502;
        } else {
            if (isTrxDone)
                returnCode = 200;
            else
                return false;
        }
        return returnCode;
    }

    //This function is not in use.
    async addMoneyToCoinsWallet(userId: number, amount: number, tableGameId: number, sessionId: string, event: string, remarks: string, deductRake: boolean, masterSessionId: string, playerSession: string): Promise<any> {
        let trxInfo = {
            coinBalance: null,
            commisionCut: null,
            isSuccess: false,
            message: null
        };

        // checking if plauyer is already added into this tableGameId or not 
        const tableGamePlayer = await PaymentHelper.getTableGamePlayer(userId, tableGameId, Constant.TabularGames.PlayerStatus.Added);
        if (!tableGamePlayer) {
            return trxInfo;
        }
        const tableBalance = await PaymentHelper.getTableGameBalance(tableGameId);
        if (tableBalance < amount){
            trxInfo.message = "Total Balance is mismatched. Please check your input."
            return trxInfo;
        }
        const tableGameData = await CommonHelper.getColsValue("gmsTableGame", ["fkGameId", "fkTableTypeId",], { "id": tableGameId });
        const gameId = +tableGameData[0]["fkGameId"];
        const engineId = +tableGameData[0]["fkTableTypeId"];
        const paymentId = await CommonHelper.makeRandomString(6);
        const pgRefNo = tableGameId + ":" + sessionId + ":" + playerSession + "/" + paymentId;

        let commissionPercentage = config.tableGames.standard.commission / 100; //  9/100;
        if (gameId == 2){
            commissionPercentage = config.tableGames.rummy.commission / 100;
        }else if (gameId == 11){
            commissionPercentage = config.tableGames.ludo.commission / 100;
        }else if (gameId == 12){
            commissionPercentage = config.tableGames.guessANumber.commission / 100;
        }
        let commissionAmount = 0;
        const gameEngine = Constant.GameEngine.TableFormatGame;

        if (deductRake) {
            const rakeValue = await PaymentHelper.getUserCommissionForGame(userId, gameId);
            if (rakeValue != -1) {
                commissionPercentage = rakeValue / 100;
            }
            commissionAmount = amount * commissionPercentage;
        }
        const receiverAmount = amount - commissionAmount;

        // Credit commission amount into gamesapp commission account from settlement  
        const trxLog: TrxLogRecord = await PaymentHelper.getTrxLogObject(
            config.financialUser.Settlement,
            config.financialUser.Commission,
            commissionAmount,
            Constant.Payment.reqType.TLW.CommissionCharge,
            Constant.Payment.payStatus.TLW.Success,
            0,
            0,
            pgRefNo,
            gameId,
            gameEngine,
            engineId
        );

        let isCommissionTrxRecordCreated = true;
        if (deductRake) {
            console.log(`(addMoneyToUserGameWallet) commission trxLogObj: ${JSON.stringify(trxLog)}`);
            isCommissionTrxRecordCreated = await this.createTrxLogRecord(trxLog, Constant.Payment.AccType.Withdraw);
        }
        
        // Credit receiver amount into receiver's coins wallet  
        // trxLog.fkSenderId = config.financialUser.Settlement;
        
        trxLog.fkReceiverId = userId;    
        const isMoneyConversionTrxRecordCreated = await this.giveWinningAmountToUserForBattle(userId, trxLog, receiverAmount, null, null);
        if( !isMoneyConversionTrxRecordCreated){
            return trxInfo;
        }
        trxLog.amount = receiverAmount;
        trxLog.masterGameSession = masterSessionId;
        trxLog.requestType = Constant.Payment.reqType.TLC.InGameCredit;
        trxLog.payStatus = Constant.Payment.payStatus.TLC.Success;
        trxLog.event = event;
        trxLog.remarks = remarks;
        console.log(`(addMoneyToUserGameWallet) receiverAmount trxLogObj: ${JSON.stringify(trxLog)}`);
        const isWinningTrxRecordCreated = await this.createTrxLogRecord(trxLog, Constant.Payment.AccType.Coins);

        if (isCommissionTrxRecordCreated && isWinningTrxRecordCreated) {
            const updatedBalance = await PaymentHelper.updateUserTableGameBalance(userId, receiverAmount,
                Constant.Payment.trxType.Credit, tableGameId, sessionId);
            if (updatedBalance) {
                trxInfo.commisionCut = parseFloat(commissionAmount.toString()).toFixed(2);
                trxInfo.isSuccess = true;
                // trxInfo.coinBalance = await PaymentHelper.getUserAccountBal(userId, Constant.Payment.AccType.Coins);
                trxInfo.coinBalance = await PaymentHelper.getUserAccountBalV1(userId, Constant.Payment.AccType.Coins);
                trxInfo.coinBalance = parseFloat(trxInfo.coinBalance.toString()).toFixed(2);
            }
        }
        if (trxInfo.isSuccess == true){
            let tableAmount:number = 0 - +amount;
            await PaymentHelper.updateTableGameBalance(tableGameId, tableAmount);
        }

        return trxInfo;
    }

    async addMoneyToCoinsWalletV1(userId: number, amount: number, tableGameId: number, sessionId: string, event: string, remarks: string, deductRake: boolean, masterSessionId: string, playerSession: string): Promise<any> {
        let trxInfo = {
            coinBalance: null,
            commisionCut: null,
            isSuccess: false,
            message: null
        };

        //Check tablebalance with amount.
        const tableBalance = await PaymentHelper.getTableGameBalance(tableGameId);
        if (tableBalance < amount) {
            trxInfo.message = "Total Balance is mismatched. Please check your input."
            return trxInfo;
        }


        const tableGameData = await CommonHelper.getColsValue("gmsTableGame", ["fkGameId", "fkTableTypeId",], { "id": tableGameId });
        const gameId = +tableGameData[0]["fkGameId"];
        const engineId = +tableGameData[0]["fkTableTypeId"];
        const paymentId = await CommonHelper.makeRandomString(6);
        const pgRefNo = tableGameId + ":" + sessionId + ":" + playerSession + "/" + paymentId;
        const gameEngine = Constant.GameEngine.TableFormatGame;

        let commissionPercentage = config.tableGames.default.commission / 100;
        let commissionAmount = 0;


        if (gameId == config.tableGames.rummy.id) {
            commissionPercentage = config.tableGames.rummy.commission / 100;
        } else if (gameId == config.tableGames.ludo.id) {
            commissionPercentage = config.tableGames.ludo.commission / 100;
        }
        
        if (deductRake) {
            /*const rakeValue = await PaymentHelper.getUserCommissionForGame(userId, gameId);
            if (rakeValue != -1) {
                commissionPercentage = rakeValue / 100;
            }*/
            
            commissionAmount = amount * commissionPercentage;
        }

        const receiverAmount = amount - commissionAmount;

        // Credit commission amount into gamesapp commission account from settlement  
        const trxLog: TrxLogRecord = await PaymentHelper.getTrxLogObject(
            config.financialUser.Settlement,
            config.financialUser.Commission,
            commissionAmount,
            Constant.Payment.reqType.TLW.CommissionCharge,
            Constant.Payment.payStatus.TLW.Success,
            0,
            0,
            pgRefNo,
            gameId,
            gameEngine,
            engineId
        );

        let isCommissionTrxRecordCreated = true;
        if (deductRake) {
            console.log(`(addMoneyToUserGameWallet) commission trxLogObj: ${JSON.stringify(trxLog)}`);
            isCommissionTrxRecordCreated = await this.createTrxLogRecord(trxLog, Constant.Payment.AccType.Withdraw);
        }

        // Credit receiver amount into receiver's coins wallet  
        trxLog.fkReceiverId = userId;
        const isMoneyConversionTrxRecordCreated = await this.giveWinningAmountToUserForBattle(userId, trxLog, receiverAmount, null, null);
        if (!isMoneyConversionTrxRecordCreated) {
            return trxInfo;
        }

        trxLog.amount = receiverAmount;
        trxLog.masterGameSession = masterSessionId;
        trxLog.requestType = Constant.Payment.reqType.TLC.InGameCredit;
        trxLog.payStatus = Constant.Payment.payStatus.TLC.Success;
        trxLog.event = event;
        trxLog.remarks = remarks;
        console.log(`(addMoneyToUserGameWallet) receiverAmount trxLogObj: ${JSON.stringify(trxLog)}`);
        const isWinningTrxRecordCreated = await this.createTrxLogRecord(trxLog, Constant.Payment.AccType.Coins);

        if (isCommissionTrxRecordCreated && isWinningTrxRecordCreated) {
            const updatedBalance = await PaymentHelper.updateUserTableGameBalance(userId, receiverAmount,
                Constant.Payment.trxType.Credit, tableGameId, sessionId);
            if (updatedBalance) {
                trxInfo.commisionCut = parseFloat(commissionAmount.toString()).toFixed(2);
                trxInfo.isSuccess = true;
                // trxInfo.coinBalance = await PaymentHelper.getUserAccountBal(userId, Constant.Payment.AccType.Coins);
                trxInfo.coinBalance = await PaymentHelper.getUserAccountBalV1(userId, Constant.Payment.AccType.Coins);
                trxInfo.coinBalance = parseFloat(trxInfo.coinBalance.toString()).toFixed(2);
            }
        }
        if (trxInfo.isSuccess == true) {
            let tableAmount: number = 0 - +amount;
            await PaymentHelper.updateTableGameBalance(tableGameId, tableAmount);
        }

        await this.creditAmountToReferralWallet(userId, commissionAmount, gameId, gameEngine, engineId, tableGameId);
        return trxInfo;
    }

    async addMoneyToCoinsWalletV2(userId: number, amount: number, tableGameId: number, event: string, remarks: string, deductRake: boolean): Promise<any> {
        let trxInfo = {
            coinBalance: null,
            commisionCut: null,
            isSuccess: false,
            message: null
        };

        //Check tablebalance with amount.
        /*const tableBalance = await PaymentHelper.getTableGameBalance(tableGameId);
        if (tableBalance < amount) {
            trxInfo.message = "Total Balance is mismatched. Please check your input."
            return trxInfo;
        }*/


        const tableGameData = await CommonHelper.getColsValue("gmsTableGame", ["fkGameId", "fkTableTypeId",], { "id": tableGameId });
        const gameId = +tableGameData[0]["fkGameId"];
        const engineId = +tableGameData[0]["fkTableTypeId"];
        const paymentId = await CommonHelper.makeRandomString(6);
        const pgRefNo = tableGameId + ":/" + paymentId;
        const gameEngine = Constant.GameEngine.TableFormatGame;

        let commissionPercentage = config.tableGames.default.commission / 100;
        let commissionAmount = 0;


        if (gameId == config.tableGames.rummy.id) {
            commissionPercentage = config.tableGames.rummy.commission / 100;
        } else if (gameId == config.tableGames.ludo.id) {
            commissionPercentage = config.tableGames.ludo.commission / 100;
        }
        
        if (deductRake) {
            /*const rakeValue = await PaymentHelper.getUserCommissionForGame(userId, gameId);
            if (rakeValue != -1) {
                commissionPercentage = rakeValue / 100;
            }*/
            
            commissionAmount = amount * commissionPercentage;
        }

        const receiverAmount = amount - commissionAmount;

        // Credit commission amount into gamesapp commission account from settlement  
        const trxLog: TrxLogRecord = await PaymentHelper.getTrxLogObject(
            config.financialUser.Settlement,
            config.financialUser.Commission,
            commissionAmount,
            Constant.Payment.reqType.TLW.CommissionCharge,
            Constant.Payment.payStatus.TLW.Success,
            0,
            0,
            pgRefNo,
            gameId,
            gameEngine,
            engineId
        );

        let isCommissionTrxRecordCreated = true;
        if (deductRake) {
            console.log(`(addMoneyToUserGameWallet) commission trxLogObj: ${JSON.stringify(trxLog)}`);
            isCommissionTrxRecordCreated = await this.createTrxLogRecord(trxLog, Constant.Payment.AccType.Withdraw);
        }

        // Credit receiver amount into receiver's coins wallet  
        trxLog.fkReceiverId = userId;
        const isMoneyConversionTrxRecordCreated = await this.giveWinningAmountToUserForBattle(userId, trxLog, receiverAmount, null, null);
        if (!isMoneyConversionTrxRecordCreated) {
            return trxInfo;
        }

        trxLog.amount = receiverAmount;
        trxLog.masterGameSession = "";
        trxLog.requestType = Constant.Payment.reqType.TLC.InGameCredit;
        trxLog.payStatus = Constant.Payment.payStatus.TLC.Success;
        trxLog.event = event;
        trxLog.remarks = remarks;
        console.log(`(addMoneyToUserGameWallet) receiverAmount trxLogObj: ${JSON.stringify(trxLog)}`);
        const isWinningTrxRecordCreated = await this.createTrxLogRecord(trxLog, Constant.Payment.AccType.Coins);

        if (isCommissionTrxRecordCreated && isWinningTrxRecordCreated) {
            const updatedBalance = await PaymentHelper.updateUserTableGameBalance(userId, receiverAmount,
                Constant.Payment.trxType.Credit, tableGameId, "");
            if (updatedBalance) {
                trxInfo.commisionCut = parseFloat(commissionAmount.toString()).toFixed(2);
                trxInfo.isSuccess = true;
                // trxInfo.coinBalance = await PaymentHelper.getUserAccountBal(userId, Constant.Payment.AccType.Coins);
                trxInfo.coinBalance = await PaymentHelper.getUserAccountBalV1(userId, Constant.Payment.AccType.Coins);
                trxInfo.coinBalance = parseFloat(trxInfo.coinBalance.toString()).toFixed(2);
            }
        }
        if (trxInfo.isSuccess == true) {
            let tableAmount: number = 0 - +amount;
            await PaymentHelper.updateTableGameBalance(tableGameId, tableAmount);
        }

        await this.creditAmountToReferralWallet(userId, commissionAmount, gameId, gameEngine, engineId, tableGameId);
        return trxInfo;
    }

    //This function is not in use.
    async deductMoneyFromCoinsWallet(userId: number, amount: number, tableGameId: number, sessionId: string, event: string, remarks: string, masterSessionId: string, playerSession: string): Promise<any> {
        let trxInfo = {
            coinBalance: null,
            commisionCut: null,
            isSuccess: false,
            message: null
        };
        // let coinBalance = await PaymentHelper.getUserAccountBal(userId, Constant.Payment.AccType.Coins);
        let coinBalance = await PaymentHelper.getUserAccountBalV1(userId, Constant.Payment.AccType.Coins);
        if (coinBalance < amount){
            trxInfo.message = "You don't have sufficient balance"
            return trxInfo;
        }

        // find if user is already added into the tableGameId or not
        const tableGamePlayer = await PaymentHelper.getTableGamePlayer(userId, tableGameId, Constant.TabularGames.PlayerStatus.Added);
        if (!tableGamePlayer) {
            return trxInfo;
        }

        const gameEngine = Constant.GameEngine.TableFormatGame;
        const tableGameData = await CommonHelper.getColsValue("gmsTableGame", ["fkGameId", "fkTableTypeId",], { "id": tableGameId });
        const gameId = +tableGameData[0]["fkGameId"];
        const engineId = +tableGameData[0]["fkTableTypeId"];
        const paymentId = await CommonHelper.makeRandomString(6);
        const pgRefNo = tableGameId + ":" + sessionId + ":" + playerSession + "/" + paymentId;
        const userDetails:any = {"id": userId};
        const balanceDeduction = await this.userAccountBalanceDeductionV2(userDetails, amount, gameId, gameEngine, engineId, pgRefNo, false);
        // Debit amount from user's coins wallet
        if (balanceDeduction != 200) {
            return trxInfo;
        }
        const trxLog: TrxLogRecord = await PaymentHelper.getTrxLogObject(
            userId,
            config.financialUser.Settlement,
            amount,
            Constant.Payment.reqType.TLC.InGameDebit,
            Constant.Payment.payStatus.TLC.Success,
            0,
            0,
            pgRefNo,
            gameId,
            gameEngine,
            engineId,
        );

        trxLog.event = event;
        trxLog.remarks = remarks;
        trxLog.masterGameSession = masterSessionId;
        const isBettingTrxRecordCreated = await this.createTrxLogRecord(trxLog, Constant.Payment.AccType.Coins);

        if (isBettingTrxRecordCreated) {
            const updatedBalance = await PaymentHelper.updateUserTableGameBalance(userId, amount,
                Constant.Payment.trxType.Debit, tableGameId, sessionId);
            if (updatedBalance) {
                trxInfo.isSuccess = true;
                // trxInfo.coinBalance = await PaymentHelper.getUserAccountBal(userId, Constant.Payment.AccType.Coins);
                trxInfo.coinBalance = await PaymentHelper.getUserAccountBalV1(userId, Constant.Payment.AccType.Coins);
                trxInfo.coinBalance = parseFloat(trxInfo.coinBalance.toString()).toFixed(2);
            }
        }
        if (trxInfo.isSuccess == true){
            let tableAmount:number = +amount;
            await PaymentHelper.updateTableGameBalance(tableGameId, tableAmount);
        }

        return trxInfo;
    }

    // This function is not in use.
    async deductMoneyFromCoinsWalletV1(userId: number, amount: number, tableGameId: number, event: string, remarks: string): Promise<any> {
        let trxInfo = {
            coinBalance: null,
            commisionCut: null,
            isSuccess: false,
            message: null
        };
        // let coinBalance = await PaymentHelper.getUserAccountBal(userId, Constant.Payment.AccType.Coins);
        let coinBalance = await PaymentHelper.getUserAccountBalV1(userId, Constant.Payment.AccType.Coins);
        if (coinBalance < amount){
            trxInfo.message = "You don't have sufficient balance"
            return trxInfo;
        }

        // find if user is already added into the tableGameId or not
        const tableGamePlayer = await PaymentHelper.getTableGamePlayer(userId, tableGameId, Constant.TabularGames.PlayerStatus.Added);
        if (!tableGamePlayer) {
            return trxInfo;
        }

        const gameEngine = Constant.GameEngine.TableFormatGame;
        const tableGameData = await CommonHelper.getColsValue("gmsTableGame", ["fkGameId", "fkTableTypeId",], { "id": tableGameId });
        const gameId = +tableGameData[0]["fkGameId"];
        const engineId = +tableGameData[0]["fkTableTypeId"];
        const paymentId = await CommonHelper.makeRandomString(6);
        const pgRefNo = tableGameId + ":/" + paymentId;
        const userDetails:any = {"id": userId};
        const balanceDeduction = await this.userAccountBalanceDeductionV2(userDetails, amount, gameId, gameEngine, engineId, pgRefNo, false);
        // Debit amount from user's coins wallet
        if (balanceDeduction != 200) {
            return trxInfo;
        }
        const trxLog: TrxLogRecord = await PaymentHelper.getTrxLogObject(
            userId,
            config.financialUser.Settlement,
            amount,
            Constant.Payment.reqType.TLC.InGameDebit,
            Constant.Payment.payStatus.TLC.Success,
            0,
            0,
            pgRefNo,
            gameId,
            gameEngine,
            engineId,
        );

        trxLog.event = event;
        trxLog.remarks = remarks;
        trxLog.masterGameSession = "";
        const isBettingTrxRecordCreated = await this.createTrxLogRecord(trxLog, Constant.Payment.AccType.Coins);

        if (isBettingTrxRecordCreated) {
            const updatedBalance = await PaymentHelper.updateUserTableGameBalance(userId, amount,
                Constant.Payment.trxType.Debit, tableGameId, "");
            if (updatedBalance) {
                trxInfo.isSuccess = true;
                // trxInfo.coinBalance = await PaymentHelper.getUserAccountBal(userId, Constant.Payment.AccType.Coins);
                trxInfo.coinBalance = await PaymentHelper.getUserAccountBalV1(userId, Constant.Payment.AccType.Coins);
                trxInfo.coinBalance = parseFloat(trxInfo.coinBalance.toString()).toFixed(2);
            }
        }
        if (trxInfo.isSuccess == true){
            let tableAmount:number = +amount;
            await PaymentHelper.updateTableGameBalance(tableGameId, tableAmount);
        }

        return trxInfo;
    }

    async convertCoinsToMoney(userId: number, tableGameId: string, sessionId: string, firstSessionId: string, firstSessionStatus: number, playerSession: string, isGameFailed=false): Promise<boolean> {
        let result = false;
        const tableGameData = await CommonHelper.getColsValue("gmsTableGame", ["fkGameId", "fkTableTypeId",], { "id": tableGameId });
        const gameId = +tableGameData[0]["fkGameId"];
        const gameEngine = Constant.GameEngine.TableFormatGame;
        const engineId = +tableGameData[0]["fkTableTypeId"];
        // const amount = await PaymentHelper.getUserAccountBal(userId, Constant.Payment.AccType.Coins);
        const amount = await PaymentHelper.getUserAccountBalV1(userId, Constant.Payment.AccType.Coins);
        const pgRefNo = tableGameId + ":" + sessionId + ":" + playerSession;

        if (amount > 0) {
            // credit amount from user's coin wallet to settlement coin wallet 
            const trxLog: TrxLogRecord = await PaymentHelper.getTrxLogObject(
                userId,
                config.financialUser.Settlement,
                amount,
                Constant.Payment.reqType.TLC.Outward,
                Constant.Payment.payStatus.TLC.Success,
                0,
                0,
                pgRefNo,
                gameId,
                gameEngine,
                engineId
            );

            // create a outward trx in coins log table 
            trxLog.masterGameSession = firstSessionId;
            result = await this.createTrxLogRecord(trxLog, Constant.Payment.AccType.Coins);
            // if (isCoinConversionTrxRecordCreated) {
            //     // create deposit/withdraw inward transaction for available balance in coin wallet 
            //     trxLog.pgRefNo = tableGameId + ":" + firstSessionId + ":" + playerSession;
            //     let isMoneyConversionTrxRecordCreated = false;
            //     const isUserPlayedGame = await CoinsAccountService.checkUserPlayedGame(firstSessionId, userId);
            //     if (firstSessionStatus == Constant.TabularGames.GameSession.Created || !isUserPlayedGame || isGameFailed) {
            //         // refund the money 
            //         isMoneyConversionTrxRecordCreated = await this.refundPayment(userId, trxLog.pgRefNo, gameId, gameEngine, engineId);
            //     } else {
            //         // the game been played, deposit winning amount 
            //         delete trxLog['masterGameSession'];
            //         trxLog.fkSenderId = config.financialUser.Settlement;
            //         isMoneyConversionTrxRecordCreated = await this.giveWinningAmountToUserForBattle(userId, trxLog, amount, null, null);
            //     }
            //     result = isMoneyConversionTrxRecordCreated;
            //     // if (isMoneyConversionTrxRecordCreated) {
            //     //     result = await PaymentHelper.updateUserTableGameBalance(userId, amount,
            //     //         Constant.Payment.trxType.Debit, +tableGameId, sessionId);
            //     // }
            // }
        }
        return result;
    }

    async convertMoneyToCoins(userId: number, amount: number, gameId: number, gameEngine: number, engineId: number, pgRefNo: string): Promise<boolean> {
        let result = false;
        const userDetails = {
            id: userId
        };
        // pgRefNo = tableGameId:sessionId 
        const temp = pgRefNo.split(":");
        const tableGameId = temp[0];
        const sessionId = temp[1];
        // transfer into settlement account 
        // const balanceDeduction = await this.userAccountBalanceDeductionV2(userDetails, amount, gameId, gameEngine, engineId, pgRefNo, false);

        // take from settlement and put into user's coins wallet 
        // if (balanceDeduction == 200) {
            // Credit amount to user's coin wallet
            const trxLog: TrxLogRecord = await PaymentHelper.getTrxLogObject(
                config.financialUser.Settlement,
                userId,
                amount,
                Constant.Payment.reqType.TLC.Inward,
                Constant.Payment.payStatus.TLC.Success,
                0,
                0,
                pgRefNo,
                gameId,
                gameEngine,
                engineId,
            );

            trxLog.masterGameSession = sessionId;
            const isCoinConversionTrxRecordCreated = await this.createTrxLogRecord(trxLog, Constant.Payment.AccType.Coins);
            result = isCoinConversionTrxRecordCreated;
            // if (isCoinConversionTrxRecordCreated) {
            //     result = await PaymentHelper.updateUserTableGameBalance(userId, amount, Constant.Payment.trxType.Credit, +tableGameId, sessionId, true);
            // }
        // }
        return result;
    }

    async autoRefillCoins(userId: any, gameId: any, gameEngine: any, engineId: any, pgRefNo: any) {
        let trxInfo = {
            coinBalance: null,
            coinsAdded: null
        };

        const userDetails = {
            id: userId
        };
        // pgRefNo = tableGameId:sessionId 
        const temp = pgRefNo.split(":");
        const tableGameId = temp[0];
        const sessionId = temp[1];

        let amount = 0;
        // find max entry fee required for this game id
        const tableEntryFee = await CommonHelper.getColsValue("gmsTableType", ["isPaid", "minEntryFee", "maxEntryFee"], { "id": engineId, "fkGameId": gameId });
        if (tableEntryFee.length > 0) {
            amount = +tableEntryFee[0]['maxEntryFee'];
        }

        // find current coin balance 
        // const currentCoinBalance = await PaymentHelper.getUserAccountBal(userId, Constant.Payment.AccType.Coins);
        const currentCoinBalance = await PaymentHelper.getUserAccountBalV1(userId, Constant.Payment.AccType.Coins);
        // check if refill is actually required or not 
        if (currentCoinBalance >= amount) {
            // REFILL NOT REQUIRED 

            console.log(`AutoRefill user: ${userId} 1. CurrentCoinBalance: ${currentCoinBalance}, Refill amount: 0, REFILL NOT REQUIRED`);
            trxInfo.coinBalance = currentCoinBalance;
            trxInfo.coinsAdded = 0;
        } else {
            // REFILL IS REQUIRED 

            // if there is already some amount left in coin balance, refill with remaining amount which adds upto maxEntryFee, and shouldn't go beyond maxEntryFee 
            amount = amount - currentCoinBalance;
            console.log(`AutoRefill user: ${userId} 2. CurrentCoinBalance: ${currentCoinBalance}, Refill amount: ${amount}`);

            // if user doesn't have enough required balance (maxEntryFee), refill with amount available 
            const userAccountBalance = await PaymentHelper.getUserTotalAccountBalance(userId);
            if (amount > userAccountBalance)
                amount = userAccountBalance;

            console.log(`AutoRefill user: ${userId} 3. CurrentCoinBalance: ${currentCoinBalance}, Final Refill amount: ${amount}`);

            // transfer into settlement account 
            const balanceDeduction = await this.userAccountBalanceDeductionV2(userDetails, amount, gameId, gameEngine, engineId, pgRefNo, true);

            // take from settlement and put into user's coins wallet 
            if (balanceDeduction == 200) {
                // Credit amount to user's coin wallet
                const trxLog: TrxLogRecord = await PaymentHelper.getTrxLogObject(
                    config.financialUser.Settlement,
                    userId,
                    amount,
                    Constant.Payment.reqType.TLC.AutoRefill,
                    Constant.Payment.payStatus.TLC.Success,
                    0,
                    0,
                    pgRefNo,
                    gameId,
                    gameEngine,
                    engineId,
                );

                trxLog.masterGameSession = sessionId;
                const isCoinConversionTrxRecordCreated = await this.createTrxLogRecord(trxLog, Constant.Payment.AccType.Coins);

                if (isCoinConversionTrxRecordCreated) {
                    const updatedBalance = await PaymentHelper.updateUserTableGameBalance(userId, amount,
                        Constant.Payment.trxType.Credit, tableGameId, sessionId);
                    if (updatedBalance) {
                        // trxInfo.coinBalance = await PaymentHelper.getUserAccountBal(userId, Constant.Payment.AccType.Coins);
                        trxInfo.coinBalance = await PaymentHelper.getUserAccountBalV1(userId, Constant.Payment.AccType.Coins);
                        trxInfo.coinBalance = parseFloat(trxInfo.coinBalance.toString()).toFixed(2);
                        trxInfo.coinsAdded = amount;
                    }
                }
            }
        }
        console.log(`AutoRefill user: ${userId} Final return action: ${JSON.stringify(trxInfo)}`);
        return trxInfo;
    }

    async insertEngineKeyIdInLog(userId: any, engineKeyId: any, gameId: any, gameEngine: any, engineId: any): Promise<boolean> {
        let success = false;
        try {
            let bonusResult = false;
            let depositResult = false;
            let withdrawResult = false;
            console.log("To update engineKeyId as pgRefNo: " + engineKeyId + ", userId: " + userId + ", gameId: " + gameId + ", gameEngine: " + gameEngine + ", engineId: " + engineId);

            const userBonusLog = await BonusAccountService.getUnassignedTrxLog(userId, config.financialUser.Settlement, gameId, gameEngine, engineId);
            if (userBonusLog && userBonusLog.length > 0) {
                const id = userBonusLog[0]['id'];
                bonusResult = await BonusAccountService.assignRefNoToTrxLog(id, engineKeyId);
            }

            const userDepositLog = await DepositAccountService.getUnassignedTrxLog(userId, config.financialUser.Settlement, gameId, gameEngine, engineId);
            if (userDepositLog && userDepositLog.length > 0) {
                const id = userDepositLog[0]['id'];
                depositResult = await DepositAccountService.assignRefNoToTrxLog(id, engineKeyId);
            }

            const userWithdrawLog = await WithdrawAccountService.getUnassignedTrxLog(userId, config.financialUser.Settlement, gameId, gameEngine, engineId);
            if (userWithdrawLog && userWithdrawLog.length > 0) {
                const id = userWithdrawLog[0]['id'];
                withdrawResult = await WithdrawAccountService.assignRefNoToTrxLog(id, engineKeyId);
            }

            success = bonusResult || depositResult || withdrawResult;
        } catch (error) {
            console.log("Error (InsertEngineKeyIdInLog) : ", error);
            success = false;
        }
        return success;
    }

    async createTrxLogRecord(trxLog: TrxLogRecord, accType: any): Promise<boolean> {
        console.log(`MasterPaymentService createTrxLogRecord: ${JSON.stringify(trxLog)}, accType: ${accType}`);
        let isCreated = false;

        if (accType == Constant.Payment.AccType.Bonus)
            isCreated = await BonusAccountService.createTrxLogRecord(trxLog);
        else if (accType == Constant.Payment.AccType.Withdraw)
            isCreated = await WithdrawAccountService.createTrxLogRecord(trxLog);
        else if (accType == Constant.Payment.AccType.Deposit)
            isCreated = await DepositAccountService.createTrxLogRecord(trxLog);
        else if (accType == Constant.Payment.AccType.Coins)
            isCreated = await CoinsAccountService.createTrxLogRecord(trxLog);
        else if (accType == Constant.Payment.AccType.Referral)
            isCreated = await ReferralAccountService.createTrxLogRecord(trxLog);

        if (isCreated)
            console.log("Success! Created log record for accType: " + accType + " record: ", trxLog);
        else
            console.log("Failed! Creating log record for accType: " + accType + " record: ", trxLog);
        return isCreated;
    }

    async refundPayment(userId: any, pgRefNo: any, gameId: any, gameEngine: any, engineId: any): Promise<boolean> {
        console.log(`MasterPaymentService (refundPayment) userId: ${userId}, pgRefNo: ${pgRefNo}, gameId: ${gameId}, gameEngine: ${gameEngine}, engineId: ${engineId}`);
        const bonusAccRefunded = await BonusAccountService.refundPayment(userId, pgRefNo, gameId, gameEngine, engineId);
        const depositAccRefunded = await DepositAccountService.refundPayment(userId, pgRefNo, gameId, gameEngine, engineId);
        const withdrawAccRefunded = await WithdrawAccountService.refundPayment(userId, pgRefNo, gameId, gameEngine, engineId);
        let coinsAccRefunded = true;
        if (gameEngine == Constant.GameEngine.TableFormatGame) {
            coinsAccRefunded = await CoinsAccountService.refundPayment(userId, pgRefNo, gameId, gameEngine, engineId);
        }
        return bonusAccRefunded && depositAccRefunded && withdrawAccRefunded && coinsAccRefunded;
    }

    async giveWinningAmountToUserForBattle(userId: any, trxLog: TrxLogRecord, payableAmount: any, entryFee: any, commissionFee: any): Promise<boolean> {
        const entryFeePayStrategy = await PaymentHelper.fetchPaymentStrategyForEntryFee(userId, config.financialUser.Settlement,
            trxLog.pgRefNo, trxLog.fkGameId, trxLog.gameEngine, trxLog.engineId);
        console.log(`entryFeePayStrategy for pgRefNo: ${trxLog.pgRefNo} data: ${JSON.stringify(entryFeePayStrategy)}`);
        let isWinningTrxRecordCreated = false;
        trxLog.fkReceiverId = userId; // Battle Winner Player
        if (await PaymentHelper.isWithdrawOnly(entryFeePayStrategy.strategyName)) {
            // give winning amount in withdraw account only -- winner trx record object - withdraw account 
            isWinningTrxRecordCreated = await this.payIntoDepositAndWithdraw(trxLog, 0, payableAmount);
        } else {  // give winning amount in withdraw + deposit account both 
            // if (payableAmount > entryFee) {
            //     // give (entry fee - commision) into withdraw and remaining in despoit amount 
            //     const withdrawAmount = entryFee - commissionFee;
            //     isWinningTrxRecordCreated = await this.payIntoDepositAndWithdraw(trxLog, payableAmount - withdrawAmount, withdrawAmount);
            // } else {
            // give winning amount back into origin source 
            const combinedBonusDepositEntryFee = entryFeePayStrategy.paidFromBonus + entryFeePayStrategy.paidFromDeposit;
            const depositAmount = combinedBonusDepositEntryFee > payableAmount ? payableAmount : combinedBonusDepositEntryFee;
            const withdrawAmount = payableAmount - depositAmount;
            isWinningTrxRecordCreated = await this.payIntoDepositAndWithdraw(trxLog, depositAmount, withdrawAmount);
            // }
        }
        return isWinningTrxRecordCreated;
    }

    async payIntoDepositAndWithdraw(trxLog: TrxLogRecord, depositAmount: any, withdrawAmount: any): Promise<boolean> {
        console.log(`(payIntoDepositAndWithdraw) Crediting amounts to user: ${trxLog.fkReceiverId} depositAmount: ${depositAmount} withdrawAmount: ${withdrawAmount}`);
        let isWinningTrxRecordCreated = false;
        if (depositAmount > 0) {
            // winner trx record object - deposit account 
            trxLog.requestType = Constant.Payment.reqType.TLD.WinningPrize;  // Constant.Payment.reqType.TLD.WinningPrize 
            trxLog.amount = depositAmount;
            isWinningTrxRecordCreated = await this.createTrxLogRecord(trxLog, Constant.Payment.AccType.Deposit);
        } else
            isWinningTrxRecordCreated = true;
        if (withdrawAmount > 0) {
            // winner trx record object - withdraw account 
            trxLog.requestType = Constant.Payment.reqType.TLW.WinningPrize;
            trxLog.amount = withdrawAmount;
            isWinningTrxRecordCreated = isWinningTrxRecordCreated && await this.createTrxLogRecord(trxLog, Constant.Payment.AccType.Withdraw);
        }
        return isWinningTrxRecordCreated;
    }

    async makeBattlePayment(player1Id: any, player2Id: any, winnerPlayer: any, gameId: any, battleId: any, status: any, roomId: any) {
        // console.log("Battle Room Payment --> "+roomId+" Player 1 : "+player1Id+" Player 2 : "+player2Id+" Winner Player : "+winnerPlayer+" Status : "+status);
        console.log(`(MakeBattlePayment) player1Id: ${player1Id}, player2Id: ${player2Id}, winnerPlayer: ${winnerPlayer}, gameId: ${gameId}, battleId: ${battleId}, status: ${status}, roomId: ${roomId}`);

        // take commission and give winning amount to user wallet, based on his entry fees payment strategy 
        const battle = await CommonHelper.getColsValue("gmsBattle", ["paidAmount", "winningAmount",], { "id": battleId });
        const entryFee = +battle[0]['paidAmount'];
        const winningAmount = +battle[0]['winningAmount'];
        const gameEngine = Constant.GameEngine.Battle;  // for battle games 
        if (status == 300) {
            const commissionFee = ((entryFee * 2) - winningAmount);
            const userPayableAmt = +winningAmount;

            // commission trx record object 
            const trxLog: TrxLogRecord = await PaymentHelper.getTrxLogObject(
                config.financialUser.Settlement,
                config.financialUser.Commission,
                commissionFee,
                Constant.Payment.reqType.TLW.CommissionCharge,
                Constant.Payment.payStatus.TLW.Success,
                0,
                0,
                roomId,
                gameId,
                gameEngine,
                battleId
            );

            console.log(`(MakeBattlePayment) status: 300, trxLogObj: ${JSON.stringify(trxLog)}`);
            const isCommissionTrxRecordCreated = await this.createTrxLogRecord(trxLog, Constant.Payment.AccType.Withdraw);
            const isWinningTrxRecordCreated = await this.giveWinningAmountToUserForBattle(winnerPlayer, trxLog, userPayableAmt, entryFee, commissionFee);

            if (!isCommissionTrxRecordCreated || !isWinningTrxRecordCreated)
                return false;
            else{
                await this.creditAmountToReferralWallet(winnerPlayer, winningAmount, gameId, gameEngine, battleId, roomId);
                return { "betAmt": entryFee, "winAmt": winningAmount, "playerId": winnerPlayer, "isDraw": false };
            }
                
        } else if (status == 350) {
            // take commission and give winning amount to both the user's accounts 
            let errors = false;
            const commissionFee = ((entryFee * 2) - winningAmount);
            const player1WinningAmt = winningAmount / 2;
            const player2WinningAmt = winningAmount / 2;

            // commission trx record object 
            const trxLog = await PaymentHelper.getTrxLogObject(
                config.financialUser.Settlement,
                config.financialUser.Commission,
                commissionFee,
                Constant.Payment.reqType.TLW.CommissionCharge,
                Constant.Payment.payStatus.TLW.Success,
                0,
                0,
                roomId,
                gameId,
                gameEngine,
                battleId
            );

            console.log(`(MakeBattlePayment) status: 350, trxLogObj: ${JSON.stringify(trxLog)}`);
            const isCommissionTrxRecordCreated = await this.createTrxLogRecord(trxLog, Constant.Payment.AccType.Withdraw);
            errors = !isCommissionTrxRecordCreated ? true : false;

            // Player-1 Log 
            const isWinningTrxRecordCreated1 = await this.giveWinningAmountToUserForBattle(player1Id, trxLog, player1WinningAmt, entryFee, commissionFee);
            errors = errors || (!isWinningTrxRecordCreated1 ? true : false);

            // Player-2 Log
            const isWinningTrxRecordCreated2 = await this.giveWinningAmountToUserForBattle(player2Id, trxLog, player2WinningAmt, entryFee, commissionFee);
            errors = errors || (!isWinningTrxRecordCreated2 ? true : false);

            if (errors)
                return false;
            else
                return { "betAmt": entryFee, "winAmt": player1WinningAmt, "isDraw": true };
        } else if (status == 400) {
            // Make refund to both player.
            try {
                let player1Refunded = false;
                let player2Refunded = false;
                console.log(`(MakeBattlePayment) status: 400::`);
                if (await PaymentHelper.isValidUserId(player1Id))
                    player1Refunded = await this.refundPayment(player1Id, roomId, gameId, gameEngine, battleId);

                if (await PaymentHelper.isValidUserId(player2Id))
                    player2Refunded = await this.refundPayment(player2Id, roomId, gameId, gameEngine, battleId);
                else
                    player2Refunded = true;

                return player1Refunded && player2Refunded;
            } catch (error) {
                console.log("Error (MakeBattlePayment) : ", error);
                return false;
            }
        }//End Of Player Score Match and Interrupt Payment.
    }//End Of Make Battle Payment.

    async makeTableGamePayment(senderId: string, receiverId: string, amount: number, gameId: string, tableTypeId: string, tableGameId: string): Promise<boolean> {
        let result = false;
        try {
            const commissionPercentage = 15 / 100;
            const commission = amount * commissionPercentage;
            const receiverAmount = amount - commission;
            // @todo: this needs to be changed - DONE. 
            const gameEngine = '' + Constant.GameEngine.TableFormatGame;

            /*
             * First transfer commission 
             */
            const { payStrategyName1, commissionTransfered } = await this.userGameFeePayment(senderId, config.financialUser.Settlement, commission, gameId, gameEngine, tableTypeId, tableGameId, false);
            if (commissionTransfered) {
                /*
                 * Then transfer receiver amount  
                 */
                const { payStrategyName2, receiverAmountTransfered } = await this.userGameFeePayment(senderId, receiverId, receiverAmount, gameId, gameEngine, tableTypeId, tableGameId, false);
                if (receiverAmountTransfered)
                    result = true;
                else
                    console.log("ROLLBACK REQUIRED!! Commission transfer succeeded but receiver amount transfer failed for tableGameId: ", tableGameId);
            } else {
                console.log("Commission transfer failed for tableGameId: ", tableGameId);
            }
        } catch (error) {
            console.log("Error (makeTableGamePayment): ", error);
        }
        return result;
    }

    async groupDepositWithdrawHistoryBattleRoomWise(history: any) {
        //console.log("History: ", history);
        let battleRoomHistory: any[] = [];
        for (let i = 0; i < history.length; i++) {
            let trx = history[i];
            let gamePlayId = trx.pgRefNo;
            if (gamePlayId == null) {
                gamePlayId = "Rewards"
            }
            const index = battleRoomHistory.findIndex(el => el.gamePlayId === gamePlayId);
            if (index === -1) {
                const thisTrx = {
                    gamePlayId: gamePlayId,
                    gamePlayTransactions: [trx]
                };
                battleRoomHistory.push(thisTrx);
            } else {
                let item = battleRoomHistory[index];
                item.gamePlayTransactions.push(trx);
                battleRoomHistory[index] = item;
            }
        }
        //console.log("battleRoomHistory: ", battleRoomHistory);
        return battleRoomHistory;
    }

    /*
     * Data array object 
     * old 
     * {
            "id": "GMSAPPD_580961",
            "amount": 6,
            "trxType": "10",
            "payStatus": "10",
            "payResult": "SUCCESS",
            "requestType": 20,
            "requestTypeMsg": "Entry Fee",
            "createdAt": "2021-01-22 18:51:58",
            "fkGameId": 1,
            "gameName": "Knife It (Learner)",
            "gameEngine": 1,
            "engineId": 10,
            "pgRefNo": "2007337",
            "bankRefNo": null,
            "customerRefNum": "-----"
        }
     * new
     * {
            "id": "GMSAPPD_832962",
            "fkSenderId": "500",
            "fkReceiverId": "100045",
            "amount": 110,
            "payStatus": "10",
            "requestType": "30",
            "createdAt": "2021-01-24 08:35:00",
            "fkGameId": "46682",
            "gameEngine": "3",
            "engineId": "11263",
            "pgRefNo": "1611428879016",
            "wallet": "withdraw",
            "trxType": "20",
            "requestTypeMsg": "Winning Amount",
            "gameName": "WB-W vs OS-W, Every Body Wins - 1",
            "payResult": "SUCCESS"
        }
     */
    async getDepositWithdrawHistory(userId: any, paginate: boolean = false, page: number = 1, page_size: number = 20) {
        let data: any = [];
        try {
            page = page - 1;
            page = page < 0 ? 0 : page;
            const start = page_size * page;
            const selectColumns = `%s.id, %s.fkSenderId, %s.fkReceiverId, %s.amount, %s.payStatus, %s.requestType, %s.createdAt, %s.fkGameId, %s.gameEngine, %s.engineId, %s.pgRefNo`;
            const depostBonusColumns = `id, fkSenderId, fkReceiverId, sum(amount) as amount, payStatus, requestType, createdAt, fkGameId, gameEngine, engineId, pgRefNo, wallet`;
            const tlbCols = selectColumns.replace(/%s/g, "tlb"),
                tldCols = selectColumns.replace(/%s/g, "tld"),
                tlwCols = selectColumns.replace(/%s/g, "tlw");
            const limitQuery = paginate ? `LIMIT ${start}, ${page_size}` : "";
            // data = await models.sequelize.query(`select * from (
            //     select ${tlbCols}, 'bonus' as wallet from gmsPaymentTransactionLogBonus tlb where tlb.fkSenderId=${userId} or tlb.fkReceiverId=${userId} 
            //     union all 
            //     select ${tldCols}, 'deposit' as wallet from gmsPaymentTransactionLogDeposit tld where tld.fkSenderId=${userId} or tld.fkReceiverId=${userId} 
            //     union all 
            //     select ${tlwCols}, 'withdraw' as wallet from gmsPaymentTransactionLogWithdraw tlw where tlw.fkSenderId=${userId} or tlw.fkReceiverId=${userId} 
            //     ) as CombinedTrxLog ORDER BY createdAt DESC ${limitQuery};`, { type: sequelize.QueryTypes.SELECT} );

            data = await models.sequelize.query(`select * from (
                select ${depostBonusColumns} from (
                select ${tlbCols}, 'bonus' as wallet from gmsPaymentTransactionLogBonus tlb where tlb.fkSenderId=${userId} or tlb.fkReceiverId=${userId} 
                union all 
                select ${tldCols}, 'deposit' as wallet from gmsPaymentTransactionLogDeposit tld where tld.fkSenderId=${userId} or tld.fkReceiverId=${userId}) as depositLog  GROUP BY pgRefNo, requestType 
                union all 
                select ${tlwCols}, 'withdraw' as wallet from gmsPaymentTransactionLogWithdraw tlw where tlw.fkSenderId=${userId} or tlw.fkReceiverId=${userId} 
                ) as CombinedTrxLog ORDER BY createdAt DESC ${limitQuery};`, { type: sequelize.QueryTypes.SELECT });

            data = await PaymentHelper.createTrxHistory(userId, data);
        } catch (error) {
            console.log("Error (GetDepositWithdrawHistory): ", error);
        }
        return data;
    }

    async getDepositWithdrawHistoryV2(userId: any, paginate: boolean = false, page: number = 1, page_size: number = 20,latest) {
        let retData:any={};
        let data: any = [];
        try {
            let dateCond="";
            //let tgiName="";
            let tgeName="";
            if(latest==true){
                dateCond=" >= DATE_SUB(NOW(),INTERVAL 2 DAY)";
                //tgiName="gmsTableGameInitTrx";
                tgeName="gmsTableGameEndTrx";
            }
            else{
                dateCond=" < DATE_SUB(NOW(),INTERVAL 2 DAY)"
                //tgiName="gmsTableGameInitTrxC";
                tgeName="gmsTableGameEndTrxC";
            }

            page = page - 1;
            page = page < 0 ? 0 : page;
            const start = page_size * page;
            const selectColumns = `%s.id, %s.fkSenderId, %s.fkReceiverId, %s.amount, %s.payStatus, %s.requestType, %s.createdAt, %s.fkGameId, %s.gameEngine, %s.engineId, %s.pgRefNo`;
            //const selectTableGameInitColumns=`%s.id,%s.fkUserId as fkSenderId,500 as fkReceiverId,CONCAT(%s.amount,"-",%s.deposit,"-",%s.winning,"-",%s.bonus) as amount, %s.status as payStatus, 20 as requestType, %s.createdAt, %s.reqLog as fkGameId, 'tableGame' as gameEngine, null as engineId, %s.gameTxnId as pgRefNo`;
            const selectTableGameEndColumns=`%s.id,500 as fkSenderId,%s.fkUserId as fkReceiverId, CONCAT(%s.delta,'_',%s.deposit,'_',%s.winning,'_',%s.bonus) as amount, %s.status as payStatus, (CASE WHEN %s.delta>0 THEN 30 WHEN %s.delta < 0 THEN 50 ELSE 60 END ) requestType, %s.createdAt, %s.reqLog as fkGameId, 'tableGame' as gameEngine, null as engineId, %s.gameTxnId as pgRefNo`;
            const depostBonusColumns = `id, fkSenderId, fkReceiverId,  (CASE WHEN wallet='bdw' THEN amount ELSE sum(amount) END )  as amount, payStatus, requestType, createdAt, fkGameId, gameEngine, engineId, pgRefNo, wallet`;
            const tlbCols = selectColumns.replace(/%s/g, "tlb"),
                tldCols = selectColumns.replace(/%s/g, "tld"),
                tlwCols = selectColumns.replace(/%s/g, "tlw"),
                //tableInitCols = selectTableGameInitColumns.replace(/%s/g, "tgiTxn"),
                tableEndCols = selectTableGameEndColumns.replace(/%s/g, "tgeTxn");
            const limitQuery = paginate ? `LIMIT ${start}, ${page_size}` : "";
    
            data = await models.sequelize.query(`select ${depostBonusColumns} from (
                select ${tlbCols}, 'bonus' as wallet from gmsPaymentTransactionLogBonus tlb where (tlb.fkSenderId=${userId} or tlb.fkReceiverId=${userId}) AND tlb.createdAt ${dateCond}
                union all 
                select ${tldCols}, 'deposit' as wallet from gmsPaymentTransactionLogDeposit tld where (tld.fkSenderId=${userId} or tld.fkReceiverId=${userId}) AND tld.createdAt ${dateCond}
                union all 
                select ${tlwCols}, 'withdraw' as wallet from gmsPaymentTransactionLogWithdraw tlw where (tlw.fkSenderId=${userId} or tlw.fkReceiverId=${userId}) AND tlw.createdAt ${dateCond}
                union all
                select ${tableEndCols}, 'bdw' as wallet from ${tgeName} tgeTxn where tgeTxn.fkUserId=${userId} AND (tgeTxn.delta!=0 OR tgeTxn.reqLog LIKE('%"result":"refund-draw"%'))
                ) as CombinedTrxLog GROUP BY pgRefNo, fkSenderId ORDER BY createdAt DESC ${limitQuery};`, { type: sequelize.QueryTypes.SELECT });

            let count=0;
            if(latest==true){
                let countData = await models.sequelize.query(`select count(id) as cnt from (
                    select ${tlbCols}, 'bonus' as wallet from gmsPaymentTransactionLogBonus tlb where (tlb.fkSenderId=${userId} or tlb.fkReceiverId=${userId}) AND tlb.createdAt ${dateCond}
                    union all 
                    select ${tldCols}, 'deposit' as wallet from gmsPaymentTransactionLogDeposit tld where (tld.fkSenderId=${userId} or tld.fkReceiverId=${userId}) AND tld.createdAt ${dateCond}
                    union all 
                    select ${tlwCols}, 'withdraw' as wallet from gmsPaymentTransactionLogWithdraw tlw where (tlw.fkSenderId=${userId} or tlw.fkReceiverId=${userId}) AND tlw.createdAt ${dateCond}
                    union all
                    select ${tableEndCols}, 'bdw' as wallet from ${tgeName} tgeTxn where tgeTxn.fkUserId=${userId} AND (tgeTxn.delta!=0 OR tgeTxn.reqLog LIKE('%"result":"refund-draw"%'))
                    ) as CombinedTrxLog GROUP BY pgRefNo, fkSenderId `, { type: sequelize.QueryTypes.SELECT });
                count=countData.length;
            }

            data = await PaymentHelper.createTrxHistoryV2(userId, data);
            retData.data=data;
            retData.count=count;
        } catch (error) {
            console.log("Error (GetDepositWithdrawHistoryV2): ", error);
            return false;
        }
        return retData;
    }
    private getGamePlayData(data: [], error: boolean, statusCode: number, message: string, recordTotal: number) {
        return {
            data: data,
            error: error,
            statusCode: statusCode,
            message: message,
            recordTotal: recordTotal
        }
    }

    async tableGameFeePayment(userDetails: any, gameId: number, gameEngine: number, engineId: number, pgRefNum = null, entryFee?: number): Promise<object> {
        let data = {
            data: [],
            error: false,
            statusCode: 0,
            message: '',
            recordTotal: 0
        }
        try {
            if (gameEngine == Constant.GameEngine.TableFormatGame) {
                // pgRefNo is combination of tableGameId:session ID, sending it from outside of this function 
                const tableEntryFee = await CommonHelper.getColsValue("gmsTableType", ["isPaid", "minEntryFee", "maxEntryFee"], { "id": engineId, "fkGameId": gameId });
                if (tableEntryFee.length < 0) {
                    return this.getGamePlayData([], true, 502, "No Table Game found.", 0);
                } else {
                    const isPaid = tableEntryFee[0]['isPaid'];
                    const minEntryFee = +tableEntryFee[0]['minEntryFee'];
                    const maxEntryFee = +tableEntryFee[0]['maxEntryFee'];
                    if (isPaid == 1) {
                        if (config.tableFormatGamesAutoBet.includes(gameId)){  
                            let balance = await PaymentHelper.getUserTotalAccountBalance(userDetails['id']);
                            if (balance >= entryFee){
                                entryFee = balance;
                            }else{
                                return this.getGamePlayData([], true, 502, "You don't have sufficient balance to play game.", 0);
                            }   
                        }else{
                            if (entryFee >= minEntryFee && entryFee <= maxEntryFee) {

                            }else {
                                return this.getGamePlayData([], true, 502, "Entry Fee is not valid!", 0);
                            }
                        }
                        // Before starting the game, we are making coin balance is zero
                        // await PaymentHelper.updateUserAccountBal(0, {"fkUserId": +userDetails['id'], "acType": Constant.Payment.AccType.Coins})
                        await PaymentHelper.updateUserAccountBalV1(0, userDetails['id'], Constant.Payment.AccType.Coins)
                        const isSuccessfull = await this.convertMoneyToCoins(userDetails['id'], entryFee, gameId, gameEngine, engineId, pgRefNum);
                        if (isSuccessfull)
                            return this.getGamePlayData([], false, 200, "Payment is successful.", 0);
                        else
                            return this.getGamePlayData([], true, 500, "Payment is failed. Please try again.", 0);
                    }else{
                        return this.getGamePlayData([], true, 200, "You can play the game without paying any amount.", 0);
                    }   
                }    
            } else {
                return this.getGamePlayData([], true, 502, "Invalid Game Engine", 1);
            }
        } catch (error) {
            console.log("Error (shouldGamePlayBegin): ", error);
            return this.getGamePlayData([], true, 502, "Oops! Some error occured. Please retry in sometime.", 0);
        }
    }

    async shouldGamePlayBegin(userDetails: any, gameId: number, gameEngine: number, engineId: number, pgRefNum = null, entryFee?: number): Promise<object> {
        let data = {
            data: [],
            error: false,
            statusCode: 0,
            message: '',
            recordTotal: 0
        }
        try {
            if (gameEngine == Constant.GameEngine.Battle) {
                // Battle 
                const battle = await CommonHelper.getColsValue("gmsBattle", ["isPaid", "paidAmount"], { "id": engineId, "fk_GamesId": gameId });
                if (!battle) {
                    data = this.getGamePlayData([], true, 502, "DB Error In Battle .", 0);
                } else {
                    if (battle.length > 0) {
                        const isPaid = battle[0]['isPaid'];
                        const paidAmount = +battle[0]['paidAmount'];
                        if (isPaid == 1) {
                            const isSuccessfull = await this.userAccountBalanceDeduction(userDetails, paidAmount, gameId, gameEngine, engineId, pgRefNum);
                            if (isSuccessfull == 200)
                                data = this.getGamePlayData([], false, 200, "Transaction Success ", 0);
                            else if (isSuccessfull == 502)
                                data = this.getGamePlayData([], true, 502, "Insufficient Balance !!", 0);
                            else if (isSuccessfull == 412)
                                data = this.getGamePlayData([], true, 412, "Payment made already !!", 0);
                            else
                                data = this.getGamePlayData([], true, 500, "Transaction Error !!", 0);
                        } else
                            data = this.getGamePlayData([], true, 200, "You Can Play It without Paying any Amount, This Battle Is Free", 0);
                    } else
                        data = this.getGamePlayData([], true, 200, "No Battle Found .", 0);
                }
            } else if (gameEngine == Constant.GameEngine.Tournament) {
                // Tournament 
                const tournament = await CommonHelper.getColsValue("gmsTournament", ["entryFee"], { "id": engineId, "fkGameId": gameId });
                if (!tournament) {
                    data = this.getGamePlayData([], true, 502, "DB Error In Tournament .", 0);
                } else {
                    if (tournament.length > 0) {
                        const paidAmount = +tournament[0]['entryFee'];
                        if (paidAmount > 0) {
                            const isSuccessfull = await this.userAccountBalanceDeduction(userDetails, paidAmount, gameId, gameEngine, engineId, pgRefNum);
                            if (!isSuccessfull)
                                data = this.getGamePlayData([], true, 500, "Transaction Error ", 0);
                            else
                                data = this.getGamePlayData([], false, 200, "Transaction Success ", 0);
                        } else
                            data = this.getGamePlayData([], true, 200, "Tournament is free", 0);

                    } else
                        data = this.getGamePlayData([], true, 200, "Tournament not found or the tournament fee is free.", 0);
                }
            } else if (gameEngine == Constant.GameEngine.CricketFantacy) {
                // Cricket Fantacy 
                const entryFee = await CommonHelper.getColsValue("gmsFantacyCricketContest", ["entryFee"], { "id": engineId, "fkMatchId": gameId });
                if (!entryFee) {
                    data = this.getGamePlayData([], true, 500, "DB Error In cricket contest .", 0);
                } else {
                    if (entryFee && entryFee.length > 0) {
                        const paidAmount = +entryFee[0]['entryFee'];
                        if (paidAmount > 0) {
                            const isSuccessfull = await this.userAccountBalanceDeduction(userDetails, paidAmount, gameId, gameEngine, engineId, pgRefNum);
                            if (isSuccessfull == 200)
                                data = this.getGamePlayData([], false, 200, "Transaction Success .", 0);
                            else if (isSuccessfull == 502)
                                data = this.getGamePlayData([], true, 502, "Insufficient Balance !!", 0);
                            else
                                data = this.getGamePlayData([], true, 500, "Transaction Error !!", 0);
                        } else
                            data = this.getGamePlayData([], false, 200, "Contest is free.", 0);
                    } else
                        data = this.getGamePlayData([], true, 500, "Contest not found !!", 0);
                }
            } else if (gameEngine == Constant.GameEngine.TableFormatGame) {
                // Table format games 
                // IMP ---------------------------------------------
                // pgRefNo is combination of tableGameId:session ID, sending it from outside of this function 
                const tableEntryFee = await CommonHelper.getColsValue("gmsTableType", ["isPaid", "minEntryFee", "maxEntryFee"], { "id": engineId, "fkGameId": gameId });
                if (!tableEntryFee) {
                    data = this.getGamePlayData([], true, 502, "DB Error in Table.", 0);
                } else {
                    if (tableEntryFee.length > 0) {
                        const isPaid = tableEntryFee[0]['isPaid'];
                        const minEntryFee = +tableEntryFee[0]['minEntryFee'];
                        const maxEntryFee = +tableEntryFee[0]['maxEntryFee'];
                        console.log("minEntryFee: %s", minEntryFee);
                        console.log("maxEntryFee: %s", maxEntryFee);
                        console.log("entryFee: %s", entryFee);
                        if (isPaid == 1) {
                            if (entryFee >= minEntryFee && entryFee <= maxEntryFee) {
                                const isSuccessfull = await this.convertMoneyToCoins(userDetails['id'], entryFee, gameId, gameEngine, engineId, pgRefNum);
                                if (isSuccessfull)
                                    data = this.getGamePlayData([], false, 200, "Transaction Success .", 0);
                                else
                                    data = this.getGamePlayData([], true, 500, "Transaction Error !!", 0);
                            } else {
                                data = this.getGamePlayData([], true, 502, "Entry Fee is not valid!", 0);
                            }
                        } else
                            data = this.getGamePlayData([], true, 200, "You Can Play It without Paying any Amount.", 0);
                    } else
                        data = this.getGamePlayData([], true, 502, "No Table Game Found .", 0);
                }
            } else {
                data = this.getGamePlayData([], true, 502, "Invalid Game Engine", 1);
            }
        } catch (error) {
            console.log("Error (shouldGamePlayBegin): ", error);
            data = this.getGamePlayData([], true, 502, "Oops! Some error occured. Please retry in sometime.", 0);
        }
        return data;
    }

    async refundContestEntryFee(userId: any, matchId: any, contestId: any, teamCode: any): Promise<boolean> {
        console.log("Refund Contest entry fee payment --> " + teamCode + " userId : " + userId + " Match Id : " + matchId + " Contest Id : " + contestId);
        // Make refund of userEntry fee.
        try {
            const gameEngine = Constant.GameEngine.CricketFantacy  // for contest 
            return await this.refundPayment(userId, teamCode, matchId, gameEngine, contestId);
        } catch (error) {
            console.log("Error (refundContestEntryFee) : ", error);
            return false;
        }
    }

    /**
     * Refund Game entry fee to the User
     * @param userId 
     * @param roomId 
     * @param gameId 
     * @param battleId 
     */
    async refundEntryFeeToUser(userId: number, roomId: string, gameId: number, battleId: number): Promise<boolean> {
        try {
            const gameEngine = Constant.GameEngine.Battle;  // for battle  
            return await this.refundPayment(userId, roomId, gameId, gameEngine, battleId);
        } catch (error) {
            console.log("Error (refundEntryFeeToUser) : ", error);
            return false;
        }

    }
    async checkUserBalanceForTableGames(userId: number, gameId: number, tableTypeId: number, entryFee: number): Promise<any> {
        let data = {
            data: [],
            error: false,
            statusCode: 0,
            message: '',
            recordTotal: 0
        }
        try {
            const tableEntryFee = await CommonHelper.getColsValue("gmsTableType", ["isPaid", "minEntryFee", "maxEntryFee"], { "id": tableTypeId, "fkGameId": gameId });
            if (!tableEntryFee) {
                data = this.getGamePlayData([], true, 502, "DB Error in Table.", 0);
            } else {
                if (tableEntryFee.length > 0) {
                    const isPaid = tableEntryFee[0]['isPaid'];
                    const minEntryFee = +tableEntryFee[0]['minEntryFee'];
                    const maxEntryFee = +tableEntryFee[0]['maxEntryFee'];
                    console.log("minEntryFee: %s", minEntryFee);
                    console.log("maxEntryFee: %s", maxEntryFee);
                    console.log("entryFee: %s", entryFee);
                    if (isPaid == 1) {
                        if (entryFee >= minEntryFee && entryFee <= maxEntryFee) {
                            data = this.getGamePlayData([], false, 200, "User is eligibe to play...", 0);
                        } else {
                            data = this.getGamePlayData([], true, 502, "Entry Fee is not valid!", 0);
                        }
                    } else
                        data = this.getGamePlayData([], true, 200, "You Can Play It without Paying any Amount.", 0);
                } else
                    data = this.getGamePlayData([], true, 204, "No Table Game Found .", 0);
            }
        } catch (error) {
            console.log("Error (checkUserBalanceForTableGames) : ", error);
            data = this.getGamePlayData([], true, 502, error.message, 0);
        }
        return data;
    }

    async creditAmountToReferralWallet(userId:number, amount: number, gameId: number, GameEngine: number, engineId:number, roomId:any){
        try{
            const winningAmount = await this.getReferralWinningAmount(userId, GameEngine, roomId);
            const trxObj = await PaymentHelper.getTrxLogObject(
                config.financialUser.Settlement,
                userId,
                winningAmount,
                Constant.Payment.reqType.TLR.Rewards,
                Constant.Payment.payStatus.TLR.Success,
                0,
                0,
                roomId,
                gameId,
                GameEngine, 
                engineId,
            );
            const isReferralTrxRecordCreated = await this.createTrxLogRecord(trxObj, Constant.Payment.AccType.Referral);
            if(isReferralTrxRecordCreated)
                return true;
        }catch(error){
            console.log("Error: ", error);
        }
        return false; 
    }

    async getReferralWinningAmount(userId:number, gameType:number, referenceId:string){
        try{
            if(gameType == Constant.GameEngine.Battle){
                let battleRoom = await CommonHelper.getAllColValue("gmsBattleRoom", {"br_roomId":referenceId});
                if(battleRoom && battleRoom.length>0 && (battleRoom[0].fk_PlayerId1 == userId || battleRoom[0].fk_PlayerId2 == userId)){
                    const battle = await CommonHelper.getAllColValue("gmsBattle", {"id":battleRoom[0].fk_BattleId});
                    const commission = (battle[0].paidAmount * 2) - battle[0].winningAmount;
                    const maxAmount = Math.floor(commission / 2);
                    if (maxAmount <= 0){
                        throw new Error("Not applicable for this battle");
                    }
                    const winAmount = await this.generateRandomNumber(1, maxAmount);
                    return winAmount;
                }else{
                    throw new Error("Not applicable for this user");
                }   
            }else {
                throw new Error("Applicable for only Battle Games");
            }          
        }catch(error){
            console.log("Error - getWinningAmount: ", error);
            throw error;
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

    /*
    Author: Abhay Pratap Singh.
    Purpose : This function basically used for following thing
            1: To check whether sufficient balance available to play Game.
            2: Check how the payment will get deduct from user GamesAPP wallet.

    Date(YYYY-MM-DD): 2022-09-06
    */
    async findPayStrategyCheckUserHasEnoughBalanceGame(userId: number, amount: number,max:boolean=false,minReqAmt:number=null): Promise<any> {
        let retData={};
        let balance=await this.getUserAccountBalanceForGamePlay(userId);

        const bonusBalance = balance['bonusBal'];
        const depositBalance = balance['depositBal'];
        const withdrawBalance = balance['withdrawBal'];
        let totalBalance=bonusBalance+depositBalance+withdrawBalance;

        retData['bonusBalance']=bonusBalance;
        retData['depositBalance']=depositBalance;
        retData['withdrawBalance']=withdrawBalance;
        retData['totalBalance']=totalBalance;

        console.log(`User : ${userId}
                    Amount Required: ${amount}
                    max : ${max}
                    Bonus Amount : ${bonusBalance}
                    Deposit Amount : ${depositBalance}
                    Withdraw Amount : ${withdrawBalance}
                    Minimum Amount : ${minReqAmt}`);

        
        let playedAmount;

        if(amount <= totalBalance ){
            playedAmount=max?totalBalance:amount;
        }
        else if(minReqAmt && minReqAmt <= totalBalance ){
            playedAmount=minReqAmt;
        }
        else{
            retData['ps']=false;
            return retData;
        }

        console.log(`User : ${userId}
                    Amount Played :  ${playedAmount}`);

        retData['playedAmount']=+Number.parseFloat(playedAmount).toFixed(2);

        /*if(totalBalance<amount){
            retData['ps']=false;
            return retData;
        }*/
        
        const paymentStrategy = await PaymentFactory.getGamePlayDeductionPaymentStrategy(playedAmount, bonusBalance, depositBalance, withdrawBalance);
        retData['ps']=paymentStrategy;
        return retData;
    }

    /*
    Author: Abhay Pratap Singh.
    Purpose : This function basically used for deduction of balance from user current wallet balance according to payment strategy.
    Date(YYYY-MM-DD): 2022-09-06
    */
    async deductBalanceforGamePlay(userId:number, amount:number, balPS:string){
        let retData:any={}
        retData.isDeducted=false;
        retData.deposit=0;
        retData.winning=0;
        retData.bonus=0;
        //retData.userUpdatedACBalance={};
        try{
            if(balPS['ps']==Constant.GameFeePaymentStrategy.Deposit){
                retData.deposit=amount;
                //etData.userUpdatedACBalance['depositBal']=balPS['depositBalance']-retData.deposit;                
                retData.isDeducted=true;
                return retData;                
            }
            else if(balPS['ps']==Constant.GameFeePaymentStrategy.DepositBonus){
                retData.deposit=balPS['depositBalance'];
                //retData.userUpdatedACBalance['depositBal']=balPS['depositBalance']-retData.deposit;
                
                retData.bonus=amount-retData.deposit;
                //retData.userUpdatedACBalance['bonusBal']=balPS['bonusBalance']-retData.bonus;
                retData.isDeducted=true;
                return retData;                
            }
            else if(balPS['ps']==Constant.GameFeePaymentStrategy.DepositBonusWithdraw){
                retData.deposit=balPS['depositBalance'];
                //retData.userUpdatedACBalance['depositBal']=balPS['depositBalance']-retData.deposit;
            
                
                retData.bonus=balPS['bonusBalance'];
                //retData.userUpdatedACBalance['bonusBal']=balPS['bonusBalance']-retData.bonus;
                
                retData.winning=amount - (retData.deposit + retData.bonus);
                //retData.userUpdatedACBalance['withdrawBal']=balPS['withdrawBalance']-retData.winning;

                retData.isDeducted=true;
                return retData;                
            }
            else if(balPS['ps']==Constant.GameFeePaymentStrategy.DepositWithdraw){
                retData.deposit=balPS['depositBalance'];
                //retData.userUpdatedACBalance['depositBal']=balPS['depositBalance']-retData.deposit;
                
                retData.winning=amount-retData.deposit;
                //retData.userUpdatedACBalance['withdrawBal']=balPS['withdrawBalance']-retData.winning;

                retData.isDeducted=true;
                return retData;                
            }
            else if(balPS['ps']==Constant.GameFeePaymentStrategy.Bonus){
                retData.bonus=amount;
                //retData.userUpdatedACBalance['bonusBal']=balPS['bonusBalance']-retData.bonus;
                
                retData.isDeducted=true;
                return retData; 
            }
            else if(balPS['ps']==Constant.GameFeePaymentStrategy.BonusWithdraw){
                retData.bonus=balPS['bonusBalance'];
                //retData.userUpdatedACBalance['bonusBal']=balPS['bonusBalance']-retData.bonus;
                
                retData.winning=amount-retData.bonus;
                //retData.userUpdatedACBalance['withdrawBal']=balPS['withdrawBalance']-retData.winning;

                retData.isDeducted=true;
                return retData;                
            }
            else if(balPS['ps']==Constant.GameFeePaymentStrategy.Withdraw){
                retData.winning=amount
                //retData.userUpdatedACBalance['withdrawBal']=balPS['withdrawBalance']-retData.winning;

                retData.isDeducted=true;
                return retData; 
            }
            else {
                //retData.userUpdatedACBalance['depositBal']=balPS['depositBalance']
                //retData.userUpdatedACBalance['bonusBal']=balPS['bonusBalance']
                //retData.userUpdatedACBalance['withdrawBal']=balPS['withdrawBalance']
                console.log(`${userId} : Amount ${amount} has Payment strategies ${balPS['ps']}`);
                
                retData.isDeducted=true;
                return retData;
            }
        }
        catch(error){
            console.log("Error : (deductBalanceforGamePlay) ",error);
            return retData;
        }
        
    }

    /*
    Author : Abhay Pratap Singh
    Purpose : This function find all types of balance from user GamesAPP accounts. 
    Date(YYYY-MM-DD) : 2022-09-06
    */
    
    async getUserAccountBalanceForGamePlay(userId: number) {
        try {
            /*const balaData = await models.gmsUserAccounts.findAll({ 
                attributes: ['depositBal','withdrawBal','bonusBal','referralBal'],
                where: {
                    fkUserId:userId
                }
            });
            return balaData && balaData.length>0? balaData[0]['dataValues']:false;*/

            let balData = await helper.gmsUserAccountGet(userId);
            return balData;

        } catch (error) {
            console.log("Error (getUserAccountBalanceForGamePlay) : ", error);
            return false;
        }
    }
    async updateUserAccountBalance(data,playerId,trxType,from=null){
        console.log("User account balance to update : ",data);

        try{
            /*let updateData = await models.gmsUserAccounts.update(data, {
                where: condition
            });*/

            let updateBalData={
                "playerId":playerId,
                "amountData":{"depositBal":data['deposit'],"withdrawalBal":data['winning'],"bonusBal":data['bonus']},
                "type":trxType,
                "from":from
            }
            let updateData = await helper.gmsUserAccountCreateOrUpdateWallet(updateBalData);
            return updateData
        }
        catch(error){
            console.log("Error (updateUserAccountBalance) : ",error)
            return false;
        }
    }
}

export default new MasterService();
