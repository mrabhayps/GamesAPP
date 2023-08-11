import express from 'express';
import Payment from '../controllers/paymentCtrl';

export default express.Router()
    .post('/deposit',Payment.userPaymentDepositCashFree)
    .post('/depositPhonePe',Payment.userPaymentDepositPhonePe)
    .post('/phonepewebhook',Payment.userPaymentPhonePeWebhook)
    .post('/phonepestatus',Payment.userPaymentPhonePeStatus)
    .post('/depositSabPaisa',Payment.userPaymentDepositSabPaisa)
    .post('/depositV2',Payment.userPaymentDepositInwardV2)
    .post('/depositairpaysuccess',Payment.paymentDepositAirPaySuccess)
    .post('/depositairpayfailure',Payment.paymentDepositAirPayFailure)
    .get('/cashback',Payment.cashbackOnDeposit)
    .post('/paytm-txn-status', Payment.paytmTransactionStatusWebhook)
    .post('/initiate', Payment.initiateTransaction)
    .get('/getDepositBalance',Payment.getUserDepositBalance)
    .get('/getWithdrawBalance',Payment.getUserWithdrawBalance)
    .get('/gameplay',Payment.userGamePlay)
    .get('/getUserAccountBalance',Payment.getUserAccountBalance)
    .post('/tournamentPrizeDistribution',Payment.distributeTournamentPrize)
    .post('/withdraw',Payment.userPaymentWithdrawOutward1)
    .post('/withdrawPayTm',Payment.userPaymentWithdrawPayTm)
    .post('/withdraw-txn-status-paytm',Payment.userPaymentWithdrawStatus)
    .post('/paytokenmatchup',Payment.payTokenMatchup)
    .post('/purchesetoken',Payment.purcheseToken)
    .get('/transactionHistory',Payment.getTransactionHistory)
    .get('/transactionHistoryV2',Payment.getTransactionHistoryV2)
    .get('/transactionHistoryV3',Payment.getTransactionHistoryV3)
    .get('/transactiondetails',Payment.getTransactionDetails)
    .post('/creditAmountToUser',Payment.creditAmountToUserBonusAccount)// Internal Purpose only
    .get('/allPendingForApprovalWithdrawTxn',Payment.allPendingWithdrawTxn)
    .get('/successStuckDepositTxn',Payment.successStuckDepositTxn)
    .get('/getDepositTrnxList',Payment.getDepositTrnxList);
    
    