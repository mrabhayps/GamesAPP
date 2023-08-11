import * as strategy from './paymentstrategy';
import Constant from '../../../common/app.constant';


export interface StrategyObject {
    name: string;
    service: typeof strategy.IPaymentStrategy;
}

export class PaymentFactory {

    private strategies: StrategyObject[] = [
        {name: Constant.PaymentStrategy.Bonus, service: strategy.BonusPaymentStrategy},
        {name: Constant.PaymentStrategy.BonusDeposit, service: strategy.BonusDepositPaymentStrategy},
        {name: Constant.PaymentStrategy.BonusDepositWithdraw, service: strategy.BonusDepositWithdrawPaymentStrategy},
        {name: Constant.PaymentStrategy.BonusWithdraw, service: strategy.BonusWithdrawPaymentStrategy},
        {name: Constant.PaymentStrategy.Deposit, service: strategy.DepositPaymentStrategy},
        {name: Constant.PaymentStrategy.DepositWithdraw, service: strategy.DepositWithdrawPaymentStrategy},
        {name: Constant.PaymentStrategy.Withdraw, service: strategy.WithdrawPaymentStrategy},
        {name: Constant.PaymentStrategy.ZeroPayment, service: strategy.ZeroPaymentStrategy},
    ];

    
    private async getStrategy(strategyName: string): Promise<StrategyObject> {
        return this.strategies.find(o => o.name === strategyName);
    }

    public async getPaymentStrategy(amount: any, bonusAccBalance: any, depositAccBalance: any, withdrawAccBalance: any): Promise<StrategyObject> {
        let strategyName = null;
        if (bonusAccBalance > 0 && amount <= bonusAccBalance) {
            strategyName = Constant.PaymentStrategy.Bonus;
        } else if (bonusAccBalance > 0 && depositAccBalance > 0 && amount <= (bonusAccBalance + depositAccBalance)) {
            strategyName = Constant.PaymentStrategy.BonusDeposit;
        } else if (bonusAccBalance > 0 && depositAccBalance > 0 && withdrawAccBalance > 0 && amount <= (bonusAccBalance + depositAccBalance + withdrawAccBalance)) {
            strategyName = Constant.PaymentStrategy.BonusDepositWithdraw;
        } else if (bonusAccBalance > 0 && withdrawAccBalance > 0 && amount <= (bonusAccBalance + withdrawAccBalance)) {
            strategyName = Constant.PaymentStrategy.BonusWithdraw;
        } else if (depositAccBalance > 0 && amount <= depositAccBalance) {
            strategyName = Constant.PaymentStrategy.Deposit;
        } else if (depositAccBalance > 0 && withdrawAccBalance > 0 && amount <= (depositAccBalance + withdrawAccBalance)) {
            strategyName = Constant.PaymentStrategy.DepositWithdraw;
        } else if (withdrawAccBalance > 0 && amount <= withdrawAccBalance) {
            strategyName = Constant.PaymentStrategy.Withdraw;
        } else {
            strategyName = Constant.PaymentStrategy.ZeroPayment;
        }
        return await this.getStrategy(strategyName) as StrategyObject;
    }

    
    /*
    Author: Abhay Pratap Singh.
    Purpose : This function basically used for following thing
            1: To check whether sufficient balance available to play Game.
            2: Check how the payment will get deduct from user GamesAPP wallet.

    Date(YYYY-MM-DD): 2022-09-06
    */
    public async getGamePlayDeductionPaymentStrategy(amount: number, bonusAccBalance: number, depositAccBalance: number, withdrawAccBalance: number): Promise<any> {
        let strategyName = null;
        if (depositAccBalance > 0 && amount <= depositAccBalance) {
            strategyName = Constant.GameFeePaymentStrategy.Deposit;
        } else if (depositAccBalance > 0 && bonusAccBalance > 0 &&  amount <= (bonusAccBalance + depositAccBalance)) {
            strategyName = Constant.GameFeePaymentStrategy.DepositBonus;
        } else if (bonusAccBalance > 0 && depositAccBalance > 0 && withdrawAccBalance > 0 && amount <= (bonusAccBalance + depositAccBalance + withdrawAccBalance)) {
            strategyName = Constant.GameFeePaymentStrategy.DepositBonusWithdraw;
        } else if (depositAccBalance > 0 && withdrawAccBalance > 0 && amount <= (depositAccBalance + withdrawAccBalance)) {
            strategyName = Constant.GameFeePaymentStrategy.DepositWithdraw
        } else if (bonusAccBalance > 0 && amount <= bonusAccBalance) {
            strategyName = Constant.GameFeePaymentStrategy.Bonus;
        } else if (bonusAccBalance > 0 && withdrawAccBalance > 0 && amount <= (bonusAccBalance + withdrawAccBalance)) {
            strategyName = Constant.GameFeePaymentStrategy.BonusWithdraw;
        } else if (withdrawAccBalance > 0 && amount <= withdrawAccBalance) {
            strategyName = Constant.GameFeePaymentStrategy.Withdraw;
        } else {
            strategyName = null;
        }
        return strategyName;
    }
}

export default new PaymentFactory();