import Constant  from '../../../common/app.constant';
import DepositAccountService from './depositaccount.service';
import WithdrawAccountService from './withdrawaccount.service';
import BonusAccountService from './bonusaccount.service';


/*
 * This class is only supposed to be treated as a type and should not be used directly. 
 */ 
export class IPaymentStrategy {
    async deductBalance(trxLog: any, amount: any, bonusAccBalance: any, depositAccBalance: any, withdrawAccBalance: any, pgRefNo: any, isAutoRefill: boolean): Promise<boolean> {
        throw new Error("This class is only supposed to be treated as a type and should not be used directly.");
    }
}

/*
 * This is the Base Class for all Payment Strategies which implements common methods/functionalities  
 */
export class BasePaymentStrategy {

    async createTrxLogRecord(trxLog: any, amount: any, accType: any, isAutoRefill: boolean): Promise<boolean> {
        let trxLogInsert = false;
        trxLog.amount = amount;
        if (accType == Constant.Payment.AccType.Bonus) {
            trxLog.requestType = isAutoRefill ? Constant.Payment.reqType.TLB.AutoRefill : Constant.Payment.reqType.TLB.GamePlay;
            trxLog.payStatus = Constant.Payment.payStatus.TLB.Success;
            trxLogInsert = await BonusAccountService.createTrxLogRecord(trxLog);
        } else if (accType == Constant.Payment.AccType.Deposit) {
            trxLog.requestType = isAutoRefill ? Constant.Payment.reqType.TLD.AutoRefill : Constant.Payment.reqType.TLD.GamePlay;
            trxLog.payStatus = Constant.Payment.payStatus.TLD.Success;
            trxLogInsert = await DepositAccountService.createTrxLogRecord(trxLog);
        } else if (accType == Constant.Payment.AccType.Withdraw) {
            trxLog.requestType = isAutoRefill ? Constant.Payment.reqType.TLW.AutoRefill : Constant.Payment.reqType.TLW.GamePlay;
            trxLog.payStatus = Constant.Payment.payStatus.TLW.Success;
            trxLogInsert = await WithdrawAccountService.createTrxLogRecord(trxLog);
        } else {
            throw new Error("This Payment AccountType is not configured!: " + accType);
        }
        return trxLogInsert;
    }
}

/*
* Explanation of class implementing class 
* ----------------------------------------
* In Javascript, if two different objects, would have one similar method (e.g. render()) they can be passed to a function which expects it:
* 
* function(engine){
*   engine.render() // any type implementing render() can be passed
* }
* To not lose that - we can, in Typescript do the same - with more typed support. And that is where
* class implements class 
* 
* Ta-da! 
*
*/

export class BonusPaymentStrategy extends BasePaymentStrategy implements IPaymentStrategy {
    
    async deductBalance(trxLog: any, amount: any, bonusAccBalance: any, depositAccBalance: any, withdrawAccBalance: any, pgRefNo: any, isAutoRefill: boolean): Promise<boolean> {
        const isBonusTrxDone = await super.createTrxLogRecord(trxLog, amount, Constant.Payment.AccType.Bonus, isAutoRefill);
        return isBonusTrxDone;
    }
}


export class BonusDepositPaymentStrategy extends BasePaymentStrategy implements IPaymentStrategy {
    
    async deductBalance(trxLog: any, amount: any, bonusAccBalance: any, depositAccBalance: any, withdrawAccBalance: any, pgRefNo: any, isAutoRefill: boolean): Promise<boolean> {
        // First Deduct the amount form bonus account then remaining from deposit account
        const isBonusTrxDone = await super.createTrxLogRecord(trxLog, bonusAccBalance, Constant.Payment.AccType.Bonus, isAutoRefill);

        const dueAmount = +amount- +trxLog.amount;
        const isDepositTrxDone = await super.createTrxLogRecord(trxLog, dueAmount, Constant.Payment.AccType.Deposit, isAutoRefill);

        return isBonusTrxDone && isDepositTrxDone;
    }
}


export class BonusDepositWithdrawPaymentStrategy extends BasePaymentStrategy implements IPaymentStrategy {
    
    async deductBalance(trxLog: any, amount: any, bonusAccBalance: any, depositAccBalance: any, withdrawAccBalance: any, pgRefNo: any, isAutoRefill: boolean): Promise<boolean> {
        // First Deduct the amount form bonus account then from deposit account and then remaining from withdraw account 
        const isBonusTrxDone = await super.createTrxLogRecord(trxLog, bonusAccBalance, Constant.Payment.AccType.Bonus, isAutoRefill);
    
        const isDepositTrxDone = await super.createTrxLogRecord(trxLog, depositAccBalance, Constant.Payment.AccType.Deposit, isAutoRefill);

        const dueAmount = +amount- +bonusAccBalance- +depositAccBalance;
        const isWithdrawTrxDone = await super.createTrxLogRecord(trxLog, dueAmount, Constant.Payment.AccType.Withdraw, isAutoRefill);

        return isBonusTrxDone && isDepositTrxDone && isWithdrawTrxDone;
    }
}


export class BonusWithdrawPaymentStrategy extends BasePaymentStrategy implements IPaymentStrategy {
    
    async deductBalance(trxLog: any, amount: any, bonusAccBalance: any, depositAccBalance: any, withdrawAccBalance: any, pgRefNo: any, isAutoRefill: boolean): Promise<boolean> {
        // First Deduct the amount from bonus account then remaining from withdraw account 
        const isBonusTrxDone = await super.createTrxLogRecord(trxLog, bonusAccBalance, Constant.Payment.AccType.Bonus, isAutoRefill);

        const dueAmount = +amount- +trxLog.amount;
        const isWithdrawTrxDone = await super.createTrxLogRecord(trxLog, dueAmount, Constant.Payment.AccType.Withdraw, isAutoRefill);

        return isBonusTrxDone && isWithdrawTrxDone;
    }
}


export class DepositPaymentStrategy extends BasePaymentStrategy implements IPaymentStrategy {
    
    async deductBalance(trxLog: any, amount: any, bonusAccBalance: any, depositAccBalance: any, withdrawAccBalance: any, pgRefNo: any, isAutoRefill: boolean): Promise<boolean> {
        const isDepositTrxDone = await super.createTrxLogRecord(trxLog, amount, Constant.Payment.AccType.Deposit, isAutoRefill);
        return isDepositTrxDone;
    }
}


export class DepositWithdrawPaymentStrategy extends BasePaymentStrategy implements IPaymentStrategy {
    
    async deductBalance(trxLog: any, amount: any, bonusAccBalance: any, depositAccBalance: any, withdrawAccBalance: any, pgRefNo: any, isAutoRefill: boolean): Promise<boolean> {
        // First Deduct the amount form deposit account then remaining from withdraw account 
        const isDepositTrxDone = await super.createTrxLogRecord(trxLog, depositAccBalance, Constant.Payment.AccType.Deposit, isAutoRefill);

        const dueAmount = +amount- +trxLog.amount;
        const isWithdrawTrxDone = await super.createTrxLogRecord(trxLog, dueAmount, Constant.Payment.AccType.Withdraw, isAutoRefill);

        return isDepositTrxDone && isWithdrawTrxDone;
    }
}


export class WithdrawPaymentStrategy extends BasePaymentStrategy implements IPaymentStrategy {
    
    async deductBalance(trxLog: any, amount: any, bonusAccBalance: any, depositAccBalance: any, withdrawAccBalance: any, pgRefNo: any, isAutoRefill: boolean): Promise<boolean> {
        const isWithdrawTrxDone = await super.createTrxLogRecord(trxLog, amount, Constant.Payment.AccType.Withdraw, isAutoRefill);
        return isWithdrawTrxDone;
    }
}


export class ZeroPaymentStrategy extends BasePaymentStrategy implements IPaymentStrategy {
    
    async deductBalance(trxLog: any, amount: any, bonusAccBalance: any, depositAccBalance: any, withdrawAccBalance: any, pgRefNo: any, isAutoRefill: boolean): Promise<boolean> {
        throw new Error("Sufficient balance not available. trxLog: " + JSON.stringify(trxLog));
    }
}

