import { Request, Response } from 'express';
import helper from '../../common/helper';
import MasterPayment from '../services/payment/master.service';
import PaymentUtils from '../services/payment/helper';
import DepositAccountService from '../services/payment/depositaccount.service';
import WithdrawAccountService from '../services/payment/withdrawaccount.service';
import TokenAccountService from '../services/payment/tokenaccount.service';
import IndusIndBankService from '../services/payment/indusindbank.service';
import Tournament from '../services/turnament.service';
import request from 'request';
import * as secretConfig from '../../common/secret.config.json';
import e = require('express');
import Constant from '../../common/app.constant';
import { IPaymentGatewayService } from '../../paymentgateway';
import { PayTMService } from '../../paymentgateway';
import UserServive from '../services/user.service';
import { v4 as uuidv4 } from 'uuid';

import { URLSearchParams } from 'url';
import fetch from 'node-fetch'
import crypto from 'crypto';
import encDecService from '../../common/encDec.service';

/*
* import checksum generation utility
* You can get this utility from https://developer.paytm.com/docs/checksum/
*/

import paymentService from '../services/payment.service';
import utilityService from '../../common/utility.service';



const config: any = secretConfig;


export class PaymentCtrl {
    async userPaymentDepositInward(req: Request, res: Response) {

        var userDetails = req.headers.data;
        //var payUResponseEncryptData=req.body.payUResponse;
        //var payUResponseString=Buffer.from(payUResponseEncryptData.substr(10,(payUResponseEncryptData.length-20)), 'base64').toString('ascii');
        //var payUResponse=JSON.parse(payUResponseString);

        var payUResponse = JSON.parse(req.body.payUResponse);

        //Sender will be PayU in case of Deposit/Inward.
        //console.log(payUResponse.result.status);


        if (typeof payUResponse == "object") {
            var pgRefNum = payUResponse.result.txnid;
            var bankRefNum = payUResponse.result.bank_ref_num;

            //Check if duplicate or not(
            let isDuplicateInward = await DepositAccountService.isDuplicateInward(pgRefNum, bankRefNum);
            if (isDuplicateInward) {
                await helper.sendJSON(res, [], false, 200, "Hey your Trx has already completed.", 1);
            }
            else {
                //Check if trx is valid or not 
                //Validate the trx from payU
                var payUStatusEnqReq = {
                    "url": config.payUTrx.trxStatusEnq + "?merchantKey=" + config.payUTrx.merchantKey + "&merchantTransactionIds=" + pgRefNum,
                    "method": 'POST',
                    "headers": {
                        "content-type": "application/json",
                        "authorization": config.payUTrx.authKey
                    }
                }
                await new Promise((resolve, reject) => {
                    request(payUStatusEnqReq, async (err, resp, body) => {
                        if (err) {
                            console.log("Error in Pay trx status initelization");
                            console.log(err); reject(err);
                        }
                        else {
                            body = JSON.parse(body);
                            if (body.status == 0 && body.result && body.result[0].merchantTransactionId == pgRefNum) {
                                var senderId = config.financialUser['PayU'];
                                var receiverId = userDetails['id'];
                                var amount = body.result[0].amount;
                                var senderClosingBal = await PaymentUtils.getClosingBalanceDeposit(senderId);
                                var receiverClosingBal = await PaymentUtils.getClosingBalanceDeposit(receiverId);
                                var reqType = Constant.Payment.reqType.TLD.Inward;
                                var payStatus = payUResponse.result.status == 'success' ? Constant.Payment.payStatus.TLD.Success : Constant.Payment.payStatus.TLD.Failed;

                                var TransactionLogDeposit: any = {};
                                TransactionLogDeposit.fkSenderId = senderId;
                                TransactionLogDeposit.fkReceiverId = receiverId;
                                TransactionLogDeposit.amount = amount;
                                TransactionLogDeposit.senderClosingBalance = senderClosingBal;
                                TransactionLogDeposit.receiverClosingBalance = receiverClosingBal;
                                TransactionLogDeposit.requestType = reqType;
                                TransactionLogDeposit.payStatus = payStatus;
                                TransactionLogDeposit.pgRefNo = pgRefNum;
                                TransactionLogDeposit.bankRefNo = bankRefNum;
                                TransactionLogDeposit.apiMsg = JSON.stringify(payUResponse);
                                // TransactionLogDeposit.fkGameId=gameId;
                                // TransactionLogDeposit.gameEngine=gameEngine;
                                // TransactionLogDeposit.engineId=engineId;

                                let insert = await DepositAccountService.insertTransactionLog(TransactionLogDeposit);
                                !insert ? await helper.sendJSON(res, [], true, 502, "DB Error in Deposit Log Insert", 0) : '';

                                if (TransactionLogDeposit.payStatus == Constant.Payment.payStatus.TLD.Success) {
                                    const isTrxDone = await PaymentUtils.updateSenderReceiverAccountBalance(senderId, receiverId, Constant.Payment.AccType.Deposit, amount);
                                    if (!isTrxDone)
                                        await helper.sendJSON(res, [], true, 502, "DB Error In Updating Sender Balance .", 0);
                                    else
                                        await helper.sendJSON(res, [], false, 200, "Payment Completed Successfully", 1);
                                } else {
                                    await helper.sendJSON(res, [], false, 200, "Payment Failed !", 1);
                                }
                            }//End Of inward Trx.
                            else {
                                console.log("Inward fraud attempt by user id : " + userDetails['id']);
                                await helper.sendJSON(res, [], false, 200, "Payment Failed !!", 1);
                            }
                            resolve(true);
                        }
                    });//End of request 
                }); //End of promis 
            }//End Of duplicate else block
        }
        else {
            console.log("User Id : " + userDetails['id']);
            console.log("Data : ", payUResponse);
            console.log("Type Of payResponse : ", typeof payUResponse);
            await helper.sendJSON(res, [], true, 200, "Invalid requested data for deposit ", 1);
        }
    }

    async paytmTransactionStatusWebhook(req: Request, res: Response) {
        try {
            const response = req.body;
            console.log("PAYTM_WEBHOOK: request body params: ", response);

            const receiverId = response.CUSTID;
            const pgRefNo = response.ORDERID;
            const bankRefNo = response.BANKTXNID;
            const senderId = config.financialUser['PayTM'];
            const pgService = new PayTMService();

            if (pgRefNo) {
                //Check if duplicate or not 
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                console.log("PAYTM_WEBHOOK: Retrieved paymentTLD: ", paymentTLD);
                if (!paymentTLD) {
                    await helper.sendJSON(res, [], false, 200, "Hey, this transaction either doesn't exist or has been already processed.", 1);
                } else {
                    const amount = + parseFloat(await pgService.getTxnAmount(response)).toFixed(2);
                    const orderId = await pgService.getOrderId(response);
                    const isSuccess = await pgService.isTxnStatusSuccess(response);
                    if (isSuccess && amount == paymentTLD['amount'] && orderId == paymentTLD['pgRefNo']) {
                        // success 
                        if (await DepositAccountService.updateTransactionLogAndUserAccounts(senderId, receiverId, amount, pgRefNo, bankRefNo, paymentTLD, response)) {
                            console.log("PAYTM_WEBHOOK: Successfully updated paytm txn status via webhook.");
                            await helper.sendJSON(res, [], false, 200, "Payment Completed Successfully", 1);
                        }
                        else
                            await helper.sendJSON(res, [], true, 500, "Oops! Some error occurred while processing this txn.", 1);
                    } else {
                        // still pending or failed 
                        console.log("Paytm txn status pending/failure response/or all conditions didnt match: ", response);
                        if (await pgService.isTxnStatusFailed(response)) {
                            paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                            paymentTLD.apiMsg = JSON.stringify(response);

                            const update = await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                            !update ? await helper.sendJSON(res, [], true, 502, "DB Error in Deposit Log Update", 1) : '';
                            console.log("PAYTM_WEBHOOK: Updated paytm txn status via webhook to failed state.");
                            await helper.sendJSON(res, [], true, 200, "Transaction failed at PayTM, accordingly updated the same.", 1);
                        } else {
                            console.log("PAYTM_WEBHOOK: Invalid transaction status received.");
                            await helper.sendJSON(res, [], true, 200, "Invalid transaction status received.", 1);
                        }
                    }
                } // End Of duplicate else block
            } else {
                await helper.sendJSON(res, [], true, 200, "Invalid webhook response received from Paytm.", 1);
            } // End of else pgRefNo 
        } catch (e) {
            console.log("Error: ", e);
            await helper.sendJSON(res, [], true, 200, "Oops! Something went wrong.", 1);
        }
    }
    async userPaymentDepositPayU(req: Request, res: Response) {
        try {
            const userDetails = req.headers.data;
            const payUResponse = JSON.parse(req.body.payUResponse);
            
            console.log(`Deposit for User ID : ${userDetails['id']} Response Data : `);
            console.log(payUResponse);
    
            if (typeof payUResponse != "object") {
                console.log("Type Of PayUResponse : ", typeof payUResponse);
                await helper.sendJSON(res, [], true, 200, "Invalid request data for PayU deposit.", 1);
                return;
            }

            let pgRefNo: string = payUResponse['txnid'];
            let bankRefNo: string = payUResponse['bank_ref_num'];
            let senderId: number = config.financialUser['PayU'];
            
            
            if (payUResponse['status'] == "CANCELLED_BY_USER" || payUResponse['status'] == 'failure' || payUResponse['status'] == 'pending') {
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                paymentTLD.apiMsg =  JSON.stringify(payUResponse);

                await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                helper.sendJSON(res, { "trxStatus": "CANCELLED" }, true, 200, "Oops! Transaction was cancelled by you.", 1);
                return;
            }
            else if(payUResponse['status'] == "success" && pgRefNo)
            {
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                console.log("Retrieved PayU Txn Log Deposit : ", paymentTLD);
                if (!paymentTLD) {
                    const depositCount = await DepositAccountService.getDepoistsCount(userDetails['id']);
                    await helper.sendJSON(res, { "trxStatus": "SUCCESS", "totalDeposits": depositCount }, false, 200, "Hey, this transaction either doesn't exist or has been already processed.", 1);
                } else {
                    let txnInitiateTime = new Date(paymentTLD['createdAt']).getTime();
                    let currentTime=new Date().getTime() + 1000 * 60 * 325 ;


                    console.log("Current : ",new Date(currentTime));
                    console.log("txnInitiateTime : ",new Date(txnInitiateTime));

                    if ((paymentTLD['fkReceiverId'] != userDetails['id']) || (currentTime > txnInitiateTime) ) {
                        console.log("Invalid/Fraud attempt by using someone else's PayU transaction data for deposit. This action is not permitted.");
                        helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "This action is not permitted.", 1);
                        return;
                    }

                    //Check Txn Status by status enq API and compare it with existing deposit log..
                    let hashString=`${config['PayU']['KEY']}|verify_payment|${pgRefNo}|${config['PayU']['SALT']}`;
                    let hash = crypto.createHash('sha512').update(hashString).digest('hex');
                    //console.log("Hash : "+hash);
                    const encodedParams = new URLSearchParams();
                    encodedParams.append('key',config['PayU']['KEY']);
                    encodedParams.append('command','verify_payment');
                    encodedParams.append('var1',pgRefNo);
                    encodedParams.append('var2','');
                    encodedParams.append('var3','');
                    encodedParams.append('var4','');
                    encodedParams.append('var5','');
                    encodedParams.append('var6','');
                    encodedParams.append('var7','');
                    encodedParams.append('var8','');
                    encodedParams.append('var9','');
                    encodedParams.append('hash',hash);
                    const url = config['PayU']['STATUS_API'];
                    const options = {
                        method: 'POST',
                        headers: {
                            'accept': 'application/json',
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: encodedParams
                    };

                    let statusResponse=null;
                    await fetch(url, options)
                    .then(async res =>statusResponse = await res.json())
                    .catch(err => console.log('PayU Transaction Verification API Error : ' + err));
                    console.log("Txn Verification API Response : ",JSON.stringify(statusResponse));
                    
                    let txnStatus=statusResponse['status'];
                    if(txnStatus==1){
                        let txnDetails=statusResponse['transaction_details'][pgRefNo];
                        const amount = + parseFloat(txnDetails['amt']).toFixed(2);
                        const orderId = txnDetails['txnid'];
                        const isSuccess = txnDetails['status']=='success'?true:false; 
                        if (isSuccess && amount == paymentTLD['amount'] && orderId == paymentTLD['pgRefNo']) {
                            // success 
                            console.log(`Txn ${pgRefNo} exist in our system. We can process it.`);
                            if (await DepositAccountService.updateTransactionLogAndUserAccounts(senderId, userDetails['id'], amount, pgRefNo, bankRefNo, paymentTLD, payUResponse)) {
                                const depositCount = await DepositAccountService.getDepoistsCount(userDetails['id']);
                                await helper.sendJSON(res, { "trxStatus": "SUCCESS", "totalDeposits": depositCount }, false, 200, "Payment Completed Successfully", 1);
                            } else {
                                await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Oops! Some error occurred while processing your payment. Please drop us a mail and we'll be on it.", 1);
                            }
                        } else {
                            // failed 
                            console.log("PayU txn status pending/failure response/or all conditions didnt match: ", payUResponse);
                            paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                            paymentTLD.apiMsg = JSON.stringify(payUResponse)+"--->>"+JSON.stringify(statusResponse);
                            const update = await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });                                                    
                            if(!update){
                                helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 502, "DB Error in Deposit Log Update", 1);
                                return;
                            }
                            helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Oops! Transaction failed at PayU, please retry.", 1);
                        }
                    }
                    else{
                        await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Invalid Txn Id .", 1);    
                    }
                } // End Of duplicate else block
            } else {
                await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Invalid sdk response received.", 1);
            } // End of else pgRefNo 
        } catch (error) {
            console.log("Error: ", error);
            await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 500, "Oops! Something went wrong.", 1);
        }
    }

    async userPaymentDepositCashFree(req: Request, res: Response) {
        try {
            const userDetails = req.headers.data;
            const CashFreeResponse = JSON.parse(req.body.cashFree);
            
            console.log(`Deposit for User ID : ${userDetails['id']} Response Data : `);
            console.log(CashFreeResponse);
    
            if (typeof CashFreeResponse != "object") {
                console.log("Type Of CashFreeResponse : ", typeof CashFreeResponse);
                await helper.sendJSON(res, [], true, 200, "Invalid request data for CashFree deposit.", 1);
                return;
            }

            let pgRefNo: string = CashFreeResponse['gaOrderId'];
            let bankRefNo: string = CashFreeResponse['cfOrderId'];
            let senderId: number = config.financialUser['CASHFREE'];
            let cfErrorResponse = CashFreeResponse['cfErrorResponse'];
            
            if (cfErrorResponse && cfErrorResponse['code']=="action_cancelled") {
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                paymentTLD.apiMsg =  paymentTLD.apiMsg + " " + JSON.stringify(CashFreeResponse);

                await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                helper.sendJSON(res, { "trxStatus": "CANCELLED" }, true, 200, "Oops! Transaction was cancelled by you.", 1);
                return;
            }
            else if(cfErrorResponse && cfErrorResponse['code']=="payment_failed"){
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                paymentTLD.apiMsg =  paymentTLD.apiMsg + " " + JSON.stringify(CashFreeResponse);

                await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Transaction failed by merchent.", 1);
                return;
            }
            else if(cfErrorResponse && cfErrorResponse['code']=="payment_timeout"){
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                paymentTLD.apiMsg =  paymentTLD.apiMsg + " " + JSON.stringify(CashFreeResponse);

                await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                helper.sendJSON(res, { "trxStatus": "PENDING" }, true, 200, "Your payment is under processing.", 1);
                return;
            }
            else if(!cfErrorResponse && pgRefNo)
            {
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                console.log("Retrieved CashFree Txn Log : ", paymentTLD);
                if (!paymentTLD) {
                    const depositCount = await DepositAccountService.getDepoistsCount(userDetails['id']);
                    helper.sendJSON(res, { "trxStatus": "SUCCESS", "totalDeposits": depositCount }, false, 200, "Hey, this transaction either doesn't exist or has been already processed.", 1);
                    return;
                } else {
                    let txnInitiateTime = new Date(paymentTLD['createdAt']).getTime();
                    let currentTime=new Date().getTime() + 1000 * 60 * 325 ;


                    console.log("Current : ",new Date(currentTime));
                    console.log("txnInitiateTime : ",new Date(txnInitiateTime));

                    if ((paymentTLD['fkReceiverId'] != userDetails['id']) || (currentTime > txnInitiateTime) ) {
                        console.log("Invalid/Fraud attempt by using someone else's PayU transaction data for deposit. This action is not permitted.");
                        helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "This action is not permitted.", 1);
                        return;
                    }

                    //Check Txn Status by status enq API and compare it with existing deposit log..
                    var cashFreeStatus = {
                        "url": `${config.CASHFREE.STATUS_API}${pgRefNo}`,
                        "method": 'GET',
                        "headers": {
                            "content-type": "application/json",
                            "x-client-id": config.CASHFREE['x-client-id'],
                            "x-client-secret": config.CASHFREE['x-client-secret'],
                            "x-api-version": config.CASHFREE['x-api-version'],
                            "x-request-id":config.CASHFREE['x-request-id'],
                        }
                    }

                    let statusPromis=await new Promise((resolve, reject) => {
                        request(cashFreeStatus, async (err, resp, body) => {
                            if (err) {
                                console.log("Error in Cashfree trx Status Enquiry");
                                console.log(err); reject(err);
                            }
                            else {
                                body=JSON.parse(body);

                                if(body['cf_order_id']){
                                    let txnStatus=body['order_status'];
                                    if(txnStatus=='ACTIVE' || txnStatus=='PAID' || txnStatus=='EXPIRED'){
                                        const amount = + parseFloat(body['order_amount']).toFixed(2);
                                        const orderId = body['order_id'];

                                        if (txnStatus=='PAID' && amount == paymentTLD['amount'] && orderId == paymentTLD['pgRefNo']) {
                                            // success 
                                            console.log(`CashFree Txn ${pgRefNo} exist in our system. We can process it.`);
                                            if (await DepositAccountService.updateTransactionLogAndUserAccounts(senderId, userDetails['id'], amount, pgRefNo, bankRefNo, paymentTLD, CashFreeResponse)) {
                                                const depositCount = await DepositAccountService.getDepoistsCount(userDetails['id']);
                                                helper.sendJSON(res, { "trxStatus": "SUCCESS", "totalDeposits": depositCount }, false, 200, "Payment Completed Successfully", 1);
                                                return;
                                            } else {
                                                helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Oops! Some error occurred while processing your payment. Please drop us a mail and we'll be on it.", 1);
                                                return
                                            }
                                        } else if(txnStatus=='EXPIRED'){
                                            // failed 
                                            console.log("Cashfree txn has been expired ", body);
                                            paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                                            paymentTLD.apiMsg = JSON.stringify(CashFreeResponse)+"--->>"+JSON.stringify(body);
                                            const update = await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                                            if(!update){
                                                console.log("Cashfree Expired status unable to update in DB : ");
                                            }
                                            helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Oops! Transaction failed at Cashfree, please retry.", 1);
                                        }
                                        else if(txnStatus=='ACTIVE'){
                                            // failed 
                                            console.log("Cashfree txn Is Active Now ", body);
                                            paymentTLD.apiMsg = JSON.stringify(CashFreeResponse)+"--->>"+JSON.stringify(body);
                                            const update = await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                                            if(!update){
                                                console.log("Cashfree active status unable to update in DB : ");
                                            }
                                            helper.sendJSON(res, { "trxStatus": "PENDING" }, false, 200, "Transaction Pending at Cashfree, please retry.", 1);
                                        }
                                    }
                                    else{
                                        console.log("Cashfree Invalid txn status", body);
                                        paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                                        paymentTLD.apiMsg = JSON.stringify(CashFreeResponse)+"--->>"+JSON.stringify(body);
                                        const update = await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                                        if(!update){
                                            console.log("Cashfree invalid txn status unable to update DB ");
                                        }
                                        helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Invalid Txn Status .", 1);    
                                        return;
                                    }
                                }
                                else{
                                    console.log("Txn Verification API Failed Response : ",JSON.stringify(body));
                                    reject(false);
                                }
                            }
                        });//End of request 
                    }); //End of promis                   
                } // End Of duplicate else block
            } else {
                console.log("Cashfree status condition not matched");
                await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Invalid sdk response received.", 1);
            } // End of else pgRefNo 
        } catch (error) {
            console.log("Error: ", error);
            await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 500, "Oops! Something went wrong.", 1);
        }
    }

    async userPaymentDepositPhonePe(req: Request, res: Response) {
        try {
            const userDetails = req.headers.data;
            const PhonePeResponse = JSON.parse(req.body.phonePe);
            
            console.log(`Deposit (PhonePe) for User ID : ${userDetails['id']} Response Data : `);
            console.log(PhonePeResponse);
    
            if (typeof PhonePeResponse != "object") {
                console.log("Type Of CashFreeResponse : ", typeof PhonePeResponse);
                await helper.sendJSON(res, [], true, 200, "Invalid request data for PhonePe deposit.", 1);
                return;
            }

            let pgRefNo: string = PhonePeResponse['data'][config.PHONE_PE['MERCHENT_TXN_ID']];
            let bankRefNo: string = PhonePeResponse['data'][config.PHONE_PE['PHONE_PE_TXN_ID']];
            let phonePeResponseCode=PhonePeResponse['code'];
            let phonePeErrorResponse = PhonePeResponse['phonePeErrorResponse'];
            let senderId: number = config.financialUser['PHONEPE'];
            
            
            if (phonePeErrorResponse && phonePeErrorResponse['code']=="RESULT_CANCELLED") {
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                paymentTLD.apiMsg =  paymentTLD.apiMsg + " " + JSON.stringify(PhonePeResponse);

                await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                helper.sendJSON(res, { "trxStatus": "CANCELLED" }, true, 200, "Oops! Transaction was cancelled by you.", 1);
                return;
            }
            else if(phonePeErrorResponse && phonePeErrorResponse['code']=="PAYMENT_FAILED"){
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                paymentTLD.apiMsg =  paymentTLD.apiMsg + " " + JSON.stringify(PhonePeResponse);

                await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Transaction failed by merchent.", 1);
                return;
            }
            else if(phonePeErrorResponse && phonePeErrorResponse['code']=="PAYMENT_PENDING"){
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                paymentTLD.apiMsg =  paymentTLD.apiMsg + " " + JSON.stringify(PhonePeResponse);

                await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                helper.sendJSON(res, { "trxStatus": "PENDING" }, true, 200, "Your payment is under processing.", 1);
                return;
            }
            else if(!phonePeErrorResponse && pgRefNo)
            {
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                console.log("Retrieved PhonePe Txn Log : ", paymentTLD);
                if (!paymentTLD) {
                    const depositCount = await DepositAccountService.getDepoistsCount(userDetails['id']);
                    helper.sendJSON(res, { "trxStatus": "SUCCESS", "totalDeposits": depositCount }, false, 200, "Hey, this transaction either doesn't exist or has been already processed.", 1);
                    return;
                } else {
                    let txnInitiateTime = new Date(paymentTLD['createdAt']).getTime();
                    let currentTime=new Date().getTime() + 1000 * 60 * 325 ;


                    console.log("Current : ",new Date(currentTime));
                    console.log("txnInitiateTime : ",new Date(txnInitiateTime));

                    if ((paymentTLD['fkReceiverId'] != userDetails['id']) || (currentTime > txnInitiateTime) ) {
                        console.log("Invalid/Fraud attempt by using someone else's PhonePe transaction data for deposit. This action is not permitted.");
                        helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "This action is not permitted.", 1);
                        return;
                    }

                    //Check Txn Status by status enq API and compare it with existing deposit log..
                    let PhonePeStatusURL=config.PHONE_PE.STATUS_API;
                    let MID=config.PHONE_PE.MID;
                    let SaltKey=config.PHONE_PE.KEY;
                    let index=config.PHONE_PE.INDEX;

                    PhonePeStatusURL=PhonePeStatusURL.replace("{{merchantTransactionId}}",pgRefNo);
                    PhonePeStatusURL=PhonePeStatusURL.replace("{{merchantId}}",MID);

                    console.log("Status API URL : ",PhonePeStatusURL);

                    let checkSum=config.PHONE_PE.STATUS_CHECKSUM;
                    checkSum=checkSum.replace("{{merchantTransactionId}}",pgRefNo);
                    checkSum=checkSum.replace("{{merchantId}}",MID);
                    checkSum=checkSum.replace("{{saltKey}}",SaltKey);
            
                    let xVerify = crypto.createHash('sha256').update(checkSum).digest('hex')+"###"+index;

                    console.log(`PhonePe Checksum : ${checkSum}`);
                    console.log(`PhonePe X-Verify : ${xVerify}`);

                    
                    var phonePeStatusAPI = {
                        "url": PhonePeStatusURL,
                        "method": 'GET',
                        "headers": {
                            "accept": "application/json",
                            "Content-Type":"application/json",
                            "X-VERIFY": xVerify
                        }
                    }

                    let statusPromis=await new Promise((resolve, reject) => {
                        request(phonePeStatusAPI, async (err, resp, body) => {
                            if (err) {
                                console.log("Error in PhonePe trx Status Enquiry");
                                console.log(err); reject(err);
                            }
                            else {
                                
                                body=JSON.parse(body);

                                if(body['success']){
                                    let txnStatus=body['code'];
                                    if(txnStatus=='PAYMENT_SUCCESS' || txnStatus=='TIMED_OUT' || txnStatus=='PAYMENT_PENDING'){
                                        const amount = + parseFloat(body['data']['amount']).toFixed(2);
                                        const orderId = body['data'][config.PHONE_PE['MERCHENT_TXN_ID']];

                                        if (txnStatus=='PAYMENT_SUCCESS' && amount == paymentTLD['amount'] && orderId == paymentTLD['pgRefNo']) {
                                            // success 
                                            console.log(`PhonePe Txn ${pgRefNo} exist in our system. We can process it.`);
                                            if (await DepositAccountService.updateTransactionLogAndUserAccounts(senderId, userDetails['id'], amount, pgRefNo, bankRefNo, paymentTLD, PhonePeResponse)) {
                                                const depositCount = await DepositAccountService.getDepoistsCount(userDetails['id']);
                                                helper.sendJSON(res, { "trxStatus": "SUCCESS", "totalDeposits": depositCount }, false, 200, "Payment Completed Successfully", 1);
                                                return;
                                            } else {
                                                helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Oops! Some error occurred while processing your payment. Please drop us a mail and we'll be on it.", 1);
                                                return
                                            }
                                        } else if(txnStatus=='TIMED_OUT'){
                                            // failed 
                                            console.log("PhonePe txn has been expired ", body);
                                            paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                                            paymentTLD.apiMsg = JSON.stringify(PhonePeResponse)+"--->>"+JSON.stringify(body);
                                            const update = await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                                            if(!update){
                                                console.log("PhonePe Expired status unable to update in DB : ");
                                            }
                                            helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Oops! Transaction failed at PhonePe, please retry.", 1);
                                        }
                                        else if(txnStatus=='PAYMENT_PENDING'){
                                            // failed 
                                            console.log("PhonePe txn Is Active Now ", body);
                                            paymentTLD.apiMsg = JSON.stringify(PhonePeResponse)+"--->>"+JSON.stringify(body);
                                            const update = await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                                            if(!update){
                                                console.log("PhonePe active status unable to update in DB : ");
                                            }
                                            helper.sendJSON(res, { "trxStatus": "PENDING" }, false, 200, "Transaction Pending at PhonePe, please retry.", 1);
                                        }
                                    }
                                    else{
                                        console.log("Phone Pe Txn Failed Data ", body);
                                        paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                                        paymentTLD.apiMsg = JSON.stringify(PhonePeResponse)+"--->>"+JSON.stringify(body);
                                        const update = await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                                        if(!update){
                                            console.log("PhonePe invalid txn status unable to update DB ");
                                        }
                                        helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Invalid Txn Status .", 1);
                                        return;
                                    }
                                }
                                else{
                                    console.log("PhonePe Txn Verification API Failed Response : ",JSON.stringify(body));
                                    reject(false);
                                }
                            }
                        });//End of request 
                    }); //End of promis                   
                } // End Of duplicate else block
            } else {
                console.log("PhonePe status condition not matched");
                await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Invalid sdk response received.", 1);
            } // End of else pgRefNo 
        } catch (error) {
            console.log("Error: ", error);
            await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 500, "Oops! Something went wrong.", 1);
        }
    }

    async userPaymentPhonePeWebhook(req: Request, res: Response) {
        try {
            console.log("Webhook called from PhonePE :", JSON.stringify(req.body['response']));
            helper.sendJSON(res, [], true, Constant.RESP_CODE.Success, "Webhook called Success.", 1);
            return;
            const responseBody = req.body['response'];
            const xVerifyPhonePe = req.headers['x-verify'];

            let bufferObj = Buffer.from(responseBody, "base64");            
            let phonePayBody =JSON.parse(bufferObj.toString("utf8"));

            console.log(`PhonePe webhook deposit body : ${JSON.stringify(phonePayBody)}`);
            console.log(`PhonePe webhook deposit x-verify : ${xVerifyPhonePe}`);
            

            let checkSumBodyData:any={};
            checkSumBodyData.base64Body=responseBody;
            checkSumBodyData.salt=config.PHONE_PE.KEY;
            let xVerifyGamesApp = "MerchantSimulatorChecksum###1";
            if(config.PHONE_PE['IS_PROD']){
                let xVerifyGamesApp = crypto.createHash('sha256').update(checkSumBodyData.base64Body + checkSumBodyData.salt).digest('hex')+"###"+config.PHONE_PE.INDEX;
            }
            
            console.log(`PhonePe webhook GamesAPP generated x-verify : ${xVerifyGamesApp}`)


            if (typeof phonePayBody != "object") {
                console.log("PhonePe webhook Type Of PhonePe body : ", typeof phonePayBody);
                helper.sendJSON(res, [], true, Constant.RESP_CODE['Bad Request'], "Invalid request data for PhonePe webhook call.", 1);
                return;
            }
            else if(xVerifyGamesApp!=xVerifyPhonePe){
                console.log(`PhonePe webhook checksum not matched.`);
                helper.sendJSON(res, [], true, Constant.RESP_CODE['Validation Failed'], "Checksum not matched !", 1);
                return;
            }
            else{
                let pgRefNo: string = phonePayBody['data'][config.PHONE_PE['MERCHENT_TXN_ID']];
                let bankRefNo: string = phonePayBody['data'][config.PHONE_PE['PHONE_PE_TXN_ID']];
                let amount= + (phonePayBody['data']['amount']/100);
                let responseCode = phonePayBody['code'];
                let senderId: number = config.financialUser['PHONEPE'];
                let userId=null;

                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);

                if(!paymentTLD || paymentTLD.length == 0){
                    console.log(`PhonePe webhook Unable to find payment txn log in our system.`);
                    await helper.sendJSON(res, [], true, Constant.RESP_CODE['Bad Request'], "Invalid txn Id or txn already processed .", 1);
                    return;
                }
                else{
                    userId=paymentTLD['fkReceiverId'];
                    let txnInitiateTime = new Date(paymentTLD['createdAt']).getTime();
                    let currentTime=new Date().getTime() + 1000 * 60 * 325 ;

                    console.log("Current : ",new Date(currentTime));
                    console.log("txnInitiateTime : ",new Date(txnInitiateTime));

                    if (currentTime > txnInitiateTime){
                        console.log(`PhonePe webhook too late to get call pgRefNo : ${pgRefNo}`)
                        paymentTLD.apiMsg =  paymentTLD.apiMsg + " --> " + JSON.stringify({'WEBHOOK':'TIME_CROSS'});
                        await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo});
                        
                        await helper.sendJSON(res, [], true, Constant.RESP_CODE['Validation Failed'], "Too late to get call.", 1);
                        return;
                    }
                    else if(paymentTLD['amount'] != amount){
                        console.log(`PhonePe webhook amount not matched pgRefNo : ${pgRefNo}`)
                        await helper.sendJSON(res, [], true, Constant.RESP_CODE['Bad Request'], "PhonePe webhook callback amount not matched.", 1);
                        return;
                    }//End of amount block.
                    else{

                        if(responseCode =='PAYMENT_SUCCESS'){
                             // success 
                             console.log(`PhonePe Webhook all condition matched  pgRefNo :  ${pgRefNo} . We can process it for success.`);
                             if (await DepositAccountService.updateTransactionLogAndUserAccounts(senderId, userId, amount, pgRefNo, bankRefNo, paymentTLD, phonePayBody)) {
                                console.log(`PhonePe webhook payment success pgRefNo : ${pgRefNo}`);
                                 helper.sendJSON(res, [], false, Constant.RESP_CODE.Success, "PhonePe webhook payment success successfully.", 1);
                                 return;
                             } else {
                                console.log(`PhonePe webhook some error occoured while processing the payment pgrefNo : ${pgRefNo}`);
                                helper.sendJSON(res, [], true, Constant.RESP_CODE['Internal Server Error'], "Oops! Some error occurred while processing payment.", 1);
                                return
                             }
                        }//End of payment success block.
                        else if(responseCode == 'PAYMENT_FAILED'){
                            //Failed
                            console.log(`PhonePe webhook all condition matched  pgRefNo :  ${pgRefNo} . We can process it for failed.`);
                            paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                            paymentTLD.apiMsg =  paymentTLD.apiMsg + " --> " + JSON.stringify(phonePayBody);
                            await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                            helper.sendJSON(res, [], false, Constant.RESP_CODE.Success, "PhonePe webhook payment failed successfully.", 1);
                            return;
                        }//End of payment failed block.
                        else{
                            console.log(`Invalid response code from phone pe webhook ${responseCode} pgRefNo : ${pgRefNo}`);
                            await helper.sendJSON(res, [], true, Constant.RESP_CODE['Bad Request'], "PhonePe webhook callback response code not matched.", 1);
                        }//End of inner else block.
                    }

                }//End of tlid inner else block.
            }//End of outer else block.
        } catch (error) {
            console.log("Error: ", error);
            await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 500, "Oops! Something went wrong.", 1);
        }
    }

    async userPaymentPhonePeStatus(req: Request, res: Response) {
        try {            
            const pgRefNo = req.body['merchantTransactionId'];
            console.log(`PhonePe status merchent transaction id : ${pgRefNo}`);
            const paymentTLD = await helper.getAllColValue("gmsPaymentTransactionLogDeposit",{'pgRefNo':pgRefNo,'requestType':10});
            if(!paymentTLD || paymentTLD.length == 0){
                console.log(`PhonePe status Unable to find payment txn log in our system.`);
                helper.sendJSON(res, [], true, Constant.RESP_CODE['Bad Request'], "Invalid txn Id .", 1);
                return;
            }
            else{
                let respData:any={};
                respData.isCompleted=false;

                //Final status.
                if(paymentTLD[0]['payStatus']==10 || paymentTLD[0]['payStatus']==20){
                    //For final status this make sure that webhook call received after payment.
                    
                    respData.payStatus=paymentTLD[0]['payStatus'];
                    respData.isCompleted=true;
                    respData.webHookStatus=true; 
                    respData.msg="Payment has been processed successfully"
                }
                else{
                    //For pending status there may be case webhook call not received therefore txn is in pending.
                    //So to handle this we call the phone pe and check the payment status on phone pay side.

                    let PhonePeStatusURL=config.PHONE_PE.STATUS_API;
                    let MID=config.PHONE_PE.MID;
                    let SaltKey=config.PHONE_PE.KEY;
                    let index=config.PHONE_PE.INDEX;

                    PhonePeStatusURL=PhonePeStatusURL.replace("{{merchantTransactionId}}",pgRefNo);
                    PhonePeStatusURL=PhonePeStatusURL.replace("{{merchantId}}",MID);

                    console.log("Status API URL : ",PhonePeStatusURL);

                    let checkSum=config.PHONE_PE.STATUS_CHECKSUM;
                    checkSum=checkSum.replace("{{merchantTransactionId}}",pgRefNo);
                    checkSum=checkSum.replace("{{merchantId}}",MID);
                    checkSum=checkSum.replace("{{saltKey}}",SaltKey);
            
                    let xVerify = crypto.createHash('sha256').update(checkSum).digest('hex')+"###"+index;

                    console.log(`PhonePe Checksum : ${checkSum}`);
                    console.log(`PhonePe X-Verify : ${xVerify}`);

                    var phonePeStatusAPI = {
                        "url": PhonePeStatusURL,
                        "method": 'GET',
                        "headers": {
                            "accept": "application/json",
                            "Content-Type":"application/json",
                            "X-VERIFY": xVerify,
                            "X-MERCHANT-ID":MID
                        }
                    }
                    try{
                        let statusPromis=await new Promise((resolve, reject) => {
                            request(phonePeStatusAPI, async (err, resp, body) => {
                                console.log(body);
                                body=JSON.parse(body);
                                let pgRefNo: string = body['data'][config.PHONE_PE['MERCHENT_TXN_ID']];
                                let bankRefNo: string = body['data'][config.PHONE_PE['PHONE_PE_TXN_ID']];
                                let amount= + (body['data']['amount']/100);
                                
                                if(body['code']=="PAYMENT_SUCCESS" && amount == paymentTLD[0]['amount']){
                                    respData.payStatus=10;
                                    respData.isCompleted=true;
                                    respData.webHookStatus=false;
                                    
                                    console.log(`PhonePe txn  pgRefNo :  ${pgRefNo} . is Success We can process it for success.`);
                                    
                                    if (await DepositAccountService.updateTransactionLogAndUserAccounts(paymentTLD[0]['fkSenderId'], paymentTLD[0]['fkReceiverId'], amount, pgRefNo, bankRefNo, paymentTLD[0], body)) {
                                        console.log(`PhonePe status payment success pgRefNo : ${pgRefNo}`);
                                        respData.msg="Amount added to your wallet successfully."
                                    } else {
                                        respData.msg="It may take 5 mins to add amount to your wallet"
                                        console.log(`PhonePe webhook some error occoured while processing the payment pgrefNo : ${pgRefNo}`);
                                    }
                                }
                                else if(body['code']=="PAYMENT_PENDING"){
                                    respData.payStatus=paymentTLD[0]['payStatus'];
                                    respData.isCompleted=false;
                                    respData.webHookStatus=false;
                                    respData.msg="It may take 5 mins to process the amount"
                                }
                                else{
                                    await DepositAccountService.updateTransactionLog(
                                        {
                                            "payStatus":Constant.Payment.payStatus.TLD.Failed,
                                            'description' : await PaymentUtils.preparedDescription("DEPOSIT",Constant.Payment.payStatus.TLD.Failed,amount)
                                        },
                                        { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                                    respData.payStatus=20;
                                    respData.isCompleted=true;
                                    respData.webHookStatus=false;
                                    respData.msg="Transactions failed any money deducted will automatically be refunded within 24 hours.";
                                }
                                resolve(true);
                            })
                        });
                    }
                    catch(error){
                        console.log("Error in API phone pe check status")
                        console.log(error);
                    }
                    
                }
                helper.sendJSON(res, respData, false, Constant.RESP_CODE.Success, "Request completed successfully.", 1);
                return;
            }
        } catch (error) {
            console.log("Error: ", error);
            await helper.sendJSON(res, [], false, 500, "Oops! Something went wrong.", 1);
            return;
        }
    }


    async userPaymentDepositSabPaisa(req: Request, res: Response) {
        try {
            const userDetails = req.headers.data;
            let SabPaisaResponseData = JSON.parse(req.body.SABPAISA);
            
            console.log(`Deposit (SabPaisa) for User ID : ${userDetails['id']} Response Data : `);
            console.log(SabPaisaResponseData);
    
            if (typeof SabPaisaResponseData != "object") {
                console.log("Type Of SabPaisa Response : ", typeof SabPaisaResponseData);
                await helper.sendJSON(res, [], true, 200, "Invalid request data for SabPaisa deposit.", 1);
                return;
            }

            const SabPaisaResponse=SabPaisaResponseData['transactionResponse'];
            let pgRefNo: string = SabPaisaResponse['clientTxnId'];
            let bankRefNo: string = SabPaisaResponse['sabpaisaTxnId'];
            let sabPaisaStatusCode=SabPaisaResponse['statusCode'];
            let sabPaisaErrorResponse = SabPaisaResponseData['sabPaisaErrorResponse'];
            let senderId: number = config.financialUser['SABPAISA'];
            
            
            if (sabPaisaErrorResponse && sabPaisaErrorResponse['code']=="RESULT_CANCELLED") {
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                paymentTLD.apiMsg =  paymentTLD.apiMsg + " " + JSON.stringify(SabPaisaResponse);

                await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                helper.sendJSON(res, { "trxStatus": "CANCELLED" }, true, 200, "Oops! Transaction was cancelled by you.", 1);
                return;
            }
            else if(sabPaisaErrorResponse && sabPaisaErrorResponse['code']=="PAYMENT_FAILED"){
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                paymentTLD.apiMsg =  paymentTLD.apiMsg + " " + JSON.stringify(SabPaisaResponse);

                await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Transaction failed by merchent.", 1);
                return;
            }
            else if(sabPaisaErrorResponse && sabPaisaErrorResponse['code']=="PAYMENT_PENDING"){
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                paymentTLD.apiMsg =  paymentTLD.apiMsg + " " + JSON.stringify(SabPaisaResponse);

                await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                helper.sendJSON(res, { "trxStatus": "PENDING" }, true, 200, "Your payment is under processing.", 1);
                return;
            }
            else if(!sabPaisaErrorResponse && pgRefNo)
            {
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                console.log("Retrieved SabPaisa Txn Log : ", paymentTLD);
                if (!paymentTLD) {
                    const depositCount = await DepositAccountService.getDepoistsCount(userDetails['id']);
                    helper.sendJSON(res, { "trxStatus": "SUCCESS", "totalDeposits": depositCount }, false, 200, "Hey, this transaction either doesn't exist or has been already processed.", 1);
                    return;
                } else {
                    let txnInitiateTime = new Date(paymentTLD['createdAt']).getTime();
                    let currentTime=new Date().getTime() + 1000 * 60 * 325 ;


                    console.log("Current : ",new Date(currentTime));
                    console.log("txnInitiateTime : ",new Date(txnInitiateTime));

                    if ((paymentTLD['fkReceiverId'] != userDetails['id']) || (currentTime > txnInitiateTime) ) {
                        console.log("Invalid/Fraud attempt by using someone else's SabPaisa transaction data for deposit. This action is not permitted.");
                        helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "This action is not permitted.", 1);
                        return;
                    }

                    //Check Txn Status by status enq API and compare it with existing deposit log..
                    let SabPaisaStatusURL=config.SABPAISA.STATUS_API;
                    let cliendCode=config.SABPAISA.CLIEND_CODE;

                    console.log(`SabPaisa To encrypt : clientCode=${cliendCode}&clientTxnId=${pgRefNo}`);
                    let encReqData=await encDecService.encryptSabPaisa(config.SABPAISA.AUTH_KEY,config.SABPAISA.IV,`clientCode=${cliendCode}&clientTxnId=${pgRefNo}`);

                    let reqBodyData:any={};
                    reqBodyData.clientCode=cliendCode;
                    reqBodyData.statusTransEncData=encReqData;

                    var SabPaisaStatusAPI = {
                        "url": SabPaisaStatusURL,
                        "method": 'POST',
                        "headers": {
                            "accept": "application/json",
                            "Content-Type":"application/json"
                        },
                        "json":reqBodyData
                    }

                    let statusPromis=await new Promise((resolve, reject) => {
                        request(SabPaisaStatusAPI, async (err, resp, body) => {
                            if (err) {
                                console.log("Error in SabPaisa trx Status Enquiry");
                                console.log(err); reject(err);
                            }
                            else {
                                console.log("Status body data before decrypt");
                                console.log(body);
                                let decResData=await encDecService.decryptSabPaisa(config.SABPAISA.AUTH_KEY,config.SABPAISA.IV,body['statusResponseData']);
                                let bodyData=decResData.split("&");
                                let prepareData:any= {};
                                for(let i=0;bodyData && i<bodyData.length;i++){
                                    let indexData=bodyData[i].split("=");
                                    if(indexData && indexData.length==2)
                                        prepareData[indexData[0]]=indexData[1]
                                }
                                body=prepareData;
                                console.log("Status body data after decrypt");
                                console.log(body);

                                if(body['status']){
                                    let txnStatus=body['statusCode'];
                                    /*
                                    *   0000: Success
                                    *   0100: Initiated/Not Completed
                                    *   0200: Aborted
                                    *   0300: Failed
                                    */


                                    if(txnStatus=='0000' || txnStatus=='0100' || txnStatus=='0200' || txnStatus=='0300' || txnStatus=='0999'){
                                        const amount = + parseFloat(body['amount']).toFixed(2);
                                        const orderId = body['clientTxnId'];

                                        if (txnStatus=='0000' && amount == paymentTLD['amount'] && orderId == paymentTLD['pgRefNo']) {
                                            // success 
                                            console.log(`SabPaisa Txn ${pgRefNo} exist in our system. We can process it.`);
                                            if (await DepositAccountService.updateTransactionLogAndUserAccounts(senderId, userDetails['id'], amount, pgRefNo, bankRefNo, paymentTLD, SabPaisaResponse)) {
                                                const depositCount = await DepositAccountService.getDepoistsCount(userDetails['id']);
                                                helper.sendJSON(res, { "trxStatus": "SUCCESS", "totalDeposits": depositCount }, false, 200, "Payment Completed Successfully", 1);
                                                return;
                                            } else {
                                                helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Oops! Some error occurred while processing your payment. Please drop us a mail and we'll be on it.", 1);
                                                return
                                            }
                                        } else if(txnStatus=='0200' || txnStatus=='0300'){
                                            // failed 
                                            console.log("SabPaisa txn has been Failed or Aborted ", body);
                                            paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                                            paymentTLD.apiMsg = JSON.stringify(SabPaisaResponse)+"--->>"+JSON.stringify(body);
                                            const update = await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                                            if(!update){
                                                console.log("SabPaisa failed/Aborted status unable to update in DB : ");
                                            }
                                            helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Oops! Transaction failed at SabPaisa, please retry.", 1);
                                        }
                                        else if(txnStatus=='0100' || txnStatus=='0999'){
                                            // Unknown response./ Txn Initiated but not completed.
                                            console.log("PhonePe txn Is Active Now ", body);
                                            paymentTLD.apiMsg = JSON.stringify(SabPaisaResponse)+"--->>"+JSON.stringify(body);
                                            const update = await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                                            if(!update){
                                                console.log("SabPaisa Active status unable to update in DB : ");
                                            }
                                            helper.sendJSON(res, { "trxStatus": "PENDING" }, false, 200, "Transaction Pending at SabPaisa, please retry.", 1);
                                        }
                                        else{
                                            console.log("Inner Condition not matched");
                                        }
                                    }
                                    else{
                                        console.log("SabPaisa Txn Failed Data ", body);
                                        paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                                        paymentTLD.apiMsg = JSON.stringify(SabPaisaResponse)+"--->>"+JSON.stringify(body);
                                        const update = await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                                        if(!update){
                                            console.log("SabPaisa invalid txn status unable to update DB ");
                                        }
                                        helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Invalid Txn Status .", 1);
                                        return;
                                    }
                                }
                                else{
                                    console.log("SabPaisa Txn Verification API Failed Response : ",JSON.stringify(body));
                                    reject(false);
                                }
                            }
                        });//End of request 
                    }); //End of promis                   
                } // End Of duplicate else block
            } else {
                console.log("SabPaisa status condition not matched");
                await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Invalid sdk response received.", 1);
            } // End of else pgRefNo 
        } catch (error) {
            console.log("Error: ", error);
            await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 500, "Oops! Something went wrong.", 1);
        }
    }


    async userPaymentDepositInwardV2(req: Request, res: Response) {
        // changes to be pushed along with this
        // 1. .env file with paytm credentials
        // 2. payment gateway folder along with paytm folder 
        // 3. secret.config.json file with new financial user as paytm
        // 4. new user account with id as mentioned in secret.config.json 
        // 5. user account entry in userAuth table and userAccount table both 
        // 6. package.json with paytm signature generation 
        // 7. pending changes for refund ?? 
        // 8. make sure all responses are encrypted while pushing to master 
        try {
            const userDetails = req.headers.data;
            const pgSdkResponse = JSON.parse(req.body.pgResponse);
            const pgName = req.body.pgName;

            if (typeof pgSdkResponse != "object") {
                console.log("User Id : " + userDetails['id']);
                console.log("Data : ", pgSdkResponse);
                console.log("Type Of pgSdkResponse : ", typeof pgSdkResponse);
                await helper.sendJSON(res, [], true, 200, "Invalid request data for deposit.", 1);
                return;
            }

            let pgRefNo: string = null;
            let bankRefNo: string = null;
            let senderId: number = null;
            let response: any = null;
            let pgService: IPaymentGatewayService;
            if (pgName == "PAYTM") {
                console.log("SDK Response: ", pgSdkResponse);
                senderId = config.financialUser['PayTM'];
                pgService = new PayTMService();

                pgRefNo = pgSdkResponse.ORDERID;
                bankRefNo = pgSdkResponse.BANKTXNID;
            }

            if (pgSdkResponse.STATUS == "CANCELLED_BY_USER") {
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                paymentTLD.apiMsg = JSON.stringify(pgSdkResponse);

                await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                await helper.sendJSON(res, { "trxStatus": "CANCELLED" }, true, 200, "Oops! Transaction was cancelled by you.", 1);
                return;
            }

            if (pgRefNo) {
                //Check if duplicate or not 
                const paymentTLD = await DepositAccountService.getPaymentTransactionLog(pgRefNo, Constant.Payment.payStatus.TLD.Pending);
                console.log("Retrieved paymentTLD: ", paymentTLD);
                if (!paymentTLD) {
                    const depositCount = await DepositAccountService.getDepoistsCount(userDetails['id']);
                    await helper.sendJSON(res, { "trxStatus": "SUCCESS", "totalDeposits": depositCount }, false, 200, "Hey, this transaction either doesn't exist or has been already processed.", 1);
                } else {
                    if (paymentTLD['fkReceiverId'] != userDetails['id']) {
                        console.log("Invalid/Fraud attempt by using someone else's PayTM transaction data for deposit. This action is not permitted.");
                        await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "This action is not permitted.", 1);
                        return;
                    }

                    response = await pgService.checkTransactionStatus(pgRefNo);
                    const amount = + parseFloat(await pgService.getTxnAmount(response)).toFixed(2);
                    const orderId = await pgService.getOrderId(response);
                    const isSuccess = await pgService.isTxnStatusSuccess(response);
                    if (isSuccess && amount == paymentTLD['amount'] && orderId == paymentTLD['pgRefNo']) {
                        // success 
                        console.log("All conditions matched for txn.");
                        if (await DepositAccountService.updateTransactionLogAndUserAccounts(senderId, userDetails['id'], amount, pgRefNo, bankRefNo, paymentTLD, response)) {
                            const depositCount = await DepositAccountService.getDepoistsCount(userDetails['id']);
                            await helper.sendJSON(res, { "trxStatus": "SUCCESS", "totalDeposits": depositCount }, false, 200, "Payment Completed Successfully", 1);
                        } else {
                            await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Oops! Some error occurred while processing your payment. Please drop us a mail and we'll be on it.", 1);
                        }
                    } else {
                        // still pending or failed 
                        console.log("Paytm txn status pending/failure response/or all conditions didnt match: ", response);
                        if (await pgService.isTxnStatusFailed(response))
                            paymentTLD.payStatus = Constant.Payment.payStatus.TLD.Failed;
                        paymentTLD.apiMsg = JSON.stringify(response);

                        const update = await DepositAccountService.updateTransactionLog(paymentTLD, { pgRefNo: pgRefNo, payStatus: Constant.Payment.payStatus.TLD.Pending });
                        if(!update){
                            await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 502, "DB Error in Deposit Log Update", 1);
                            return;
                        }
                        // check if it was failed or it is pending, then return the appropriate response 
                        if (await pgService.isTxnStatusFailed(response))
                            await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Oops! Transaction failed at PayTM, please retry.", 1);
                        else
                            await helper.sendJSON(res, { "trxStatus": "PENDING" }, true, 200, "Your transaction is taking a bit longer to be processed, please be with us while we confirm the status with PayTM. You can also check the status in transaction history page.", 1);
                    }
                } // End Of duplicate else block
            } else {
                await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 200, "Invalid sdk response received.", 1);
            } // End of else pgRefNo 
        } catch (error) {
            console.log("Error: ", error);
            await helper.sendJSON(res, { "trxStatus": "FAILED" }, true, 500, "Oops! Something went wrong.", 1);
        }
    }

    async paymentDepositAirPaySuccess(req: Request, res: Response) {
        console.log("Success Response AIR Pay : ", req.body);
        helper.sendJSON(res, [], false, 200, "AIR PAY : Success Payment logged successfully.", 1);
    }

    async paymentDepositAirPayFailure(req: Request, res: Response) {
        console.log("Success Response AIR Pay : ", req.body);
        helper.sendJSON(res, [], false, 200, "AIR PAY : Failure Payment logged successfully.", 1);
    }

    async initiateTransaction(req: Request, res: Response) {
        let data: any = null;
        try {
            const userDetails = req.headers.data;
            const amount = req.body.amount;
            const pgName = req.body.pgName;
            if(amount < config['MIN_DEPOSIT_AMT'] ){
                await helper.sendJSON(res, data, true, 400, "Min 25 Rs. allow to complete the deposit !!", 0);
            }
            else{
                let pgService: IPaymentGatewayService = null;
                if (pgName == "PAYTM") {
                    pgService = new PayTMService();
                    const senderId = config.financialUser['PayTM']; 
                    const receiverId = userDetails['id'];
                    const orderId = await helper.generateOrderId();

                    const TransactionLogDeposit:any = {};
                    TransactionLogDeposit.fkSenderId = senderId;
                    TransactionLogDeposit.fkReceiverId = receiverId;
                    TransactionLogDeposit.amount = amount;
                    TransactionLogDeposit.senderClosingBalance = await PaymentUtils.getClosingBalanceDeposit(senderId);
                    TransactionLogDeposit.receiverClosingBalance = await PaymentUtils.getClosingBalanceDeposit(receiverId);
                    TransactionLogDeposit.requestType = Constant.Payment.reqType.TLD.Inward;
                    TransactionLogDeposit.payStatus = Constant.Payment.payStatus.TLD.Pending;
                    TransactionLogDeposit.pgRefNo = orderId;
                    TransactionLogDeposit.bankRefNo = null;
                    TransactionLogDeposit.apiMsg = null;

                    const insert = await DepositAccountService.insertTransactionLog(TransactionLogDeposit);
                    if (insert) {
                        const response = await pgService.initiateTransaction(orderId, amount, receiverId, userDetails['mobile']);
                        if (response) {
                            const txnToken = await pgService.getTxnToken(response);
                            data = {};
                            data.orderId = orderId;
                            data.txnToken = txnToken;
                            data.pgName = pgName;
                            await helper.sendJSON(res, data, false, 200, "Transaction Initiated.", 1);
                        } else 
                            await helper.sendJSON(res, data, true, 500, "PayTM Initiate Transaction call failed.", 1);
                    } else 
                        await helper.sendJSON(res, data, true, 502, "DB Error in Initiate Deposit Log Insert", 1);
                } 
                else if (pgName == "PAYU") {
                    const senderId = config.financialUser['PayU']; 
                    const receiverId = userDetails['id'];
                    const txnId = uuidv4();            
                    console.log(`User Id ${receiverId} -->> PayU Txn Id : ${txnId}`);
                    
                    data = {};
                    data.txnToken = txnId;
                    data.pgName = "PAYU";
                    
                    const TransactionLogDeposit:any = {};
                    TransactionLogDeposit.fkSenderId = senderId;
                    TransactionLogDeposit.fkReceiverId = receiverId;
                    TransactionLogDeposit.amount = amount;
                    TransactionLogDeposit.senderClosingBalance = await PaymentUtils.getClosingBalanceDeposit(senderId);
                    TransactionLogDeposit.receiverClosingBalance = await PaymentUtils.getClosingBalanceDeposit(receiverId);
                    TransactionLogDeposit.requestType = Constant.Payment.reqType.TLD.Inward;
                    TransactionLogDeposit.payStatus = Constant.Payment.payStatus.TLD.Pending;
                    TransactionLogDeposit.pgRefNo = txnId;
                    TransactionLogDeposit.bankRefNo = null;
                    TransactionLogDeposit.apiMsg = null

                    const insert = await DepositAccountService.insertTransactionLog(TransactionLogDeposit);
                    if (insert) {
                        helper.sendJSON(res, data, false, 200, "Transaction Initiated PAYU Successfully .", 1);    
                    } else {
                        helper.sendJSON(res, data, true, 502, "DB Error in Initiate Deposit Log Insert", 1);
                    }          
                }//End of PayU Txn Generation.
                else if (pgName == "CASHFREE") {
                    const senderId = config.financialUser['CASHFREE']; 
                    const receiverId = userDetails['id'];
                    const orderId = uuidv4();            
                    console.log(`Payment Txn Initiate Cashfree : User Id ${receiverId} -->> Txn Id : ${orderId}`);
                    
                    data = {};
                    data.paymentSessionId = null;
                    data.cfOrderId=null;
                    data.gaOrderId=null;
                    data.pgName = "CASHFREE";
                    
                    let reqBody:any = {};
                    reqBody.order_amount=amount;
                    reqBody.order_id=orderId;
                    reqBody.order_currency="INR";
                    reqBody.customer_details={
                        "customer_id": userDetails['userName'],
                        "customer_name": userDetails['userName'],
                        "customer_email": "",
                        "customer_phone": userDetails['mobile']
                    }
                    reqBody.order_meta={
                        "notify_url": "https://test.cashfree.com"
                    }
                    reqBody.order_note=`${userDetails['mobile']} initiated an order.`

                    var cashFreeOrder = {
                        "url": config.CASHFREE.ORDER_API,
                        "method": 'POST',
                        "headers": {
                            "content-type": "application/json",
                            "x-client-id": config.CASHFREE['x-client-id'],
                            "x-client-secret": config.CASHFREE['x-client-secret'],
                            "x-api-version": config.CASHFREE['x-api-version'],
                            "x-request-id":config.CASHFREE['x-request-id'],
                        },
                        "json":reqBody
                    }
                    try{
                        let statusPromis=await new Promise((resolve, reject) => {
                            request(cashFreeOrder, async (err, resp, body) => {
                                if (err) {
                                    console.log("Error in Cashfree trx initelization");
                                    console.log(err); reject(err);
                                }
                                else {
                                    if(body['cf_order_id']){
                                        const TransactionLogDeposit:any = {};
                                        TransactionLogDeposit.fkSenderId = senderId;
                                        TransactionLogDeposit.fkReceiverId = receiverId;
                                        TransactionLogDeposit.amount = amount;
                                        TransactionLogDeposit.senderClosingBalance = await PaymentUtils.getClosingBalanceDeposit(senderId);
                                        TransactionLogDeposit.receiverClosingBalance = await PaymentUtils.getClosingBalanceDeposit(receiverId);
                                        TransactionLogDeposit.requestType = Constant.Payment.reqType.TLD.Inward;
                                        TransactionLogDeposit.payStatus = Constant.Payment.payStatus.TLD.Pending;
                                        TransactionLogDeposit.pgRefNo = orderId;
                                        TransactionLogDeposit.bankRefNo = body['cf_order_id'];
                                        TransactionLogDeposit.apiMsg = JSON.stringify(body);
        
                                        const insert = await DepositAccountService.insertTransactionLog(TransactionLogDeposit);
                                        if (insert) {
                                            data.paymentSessionId=body['payment_session_id'];
                                            data.cfOrderId=body['cf_order_id'];
                                            data.gaOrderId=orderId;
                                            console.log(`Payment Txn Initiate Cashfree Completed UserId -> ${userDetails['id']} -->> Txn Id : ${orderId}`);
                                            helper.sendJSON(res, data, false, 200, "Transaction Initiated Cashfree Successfully .", 1);    
                                        } else {
                                            console.log(`Payment Txn Initiate Cashfree Failed DB Error UserId -> ${userDetails['id']} -->> Txn Id : ${orderId}`);
                                            helper.sendJSON(res, data, true, 502, "DB Error in Initiate Deposit Log Insert", 1);
                                        }    
                                        resolve(true);
                                    }
                                    else{
                                        //console.log(`Payment Txn Initiate Cashfree Failed UserId -> ${userDetails['id']} -->> Txn Id : ${orderId}`);
                                        console.log(body)
                                        reject(false);
                                    }
                                }
                            });//End of request 
                        }); //End of promis
                        console.log("Status Promis : ",statusPromis);
                    }
                    catch(error){
                        console.log(`Payment Txn Initiate Cashfree Failed Internal Server Error UserId -> ${userDetails['id']} -->> Txn Id : ${orderId}`);
                        helper.sendJSON(res, data, true, 500, "Internal Server error !!", 1);
                    }          
                }//End of CashFree Txn Generation.
                else if(pgName == "PHONEPE"){
                    const senderId = config.financialUser['PHONEPE'];
                    const receiverId = userDetails['id'];
                    const paymentInstrumentType = req.body.paymentInstrumentType;
                    const paymentInstrumentTargetApp = req.body.paymentInstrumentTargetApp;
                    let txnId = uuidv4();  
                    txnId=txnId.substring(0,30);


                    console.log(`[PhonePe deposit init] transaction for User Id ${receiverId} -->> Phone Pe Txn Id : ${txnId}`);
                    
                    let base64BodyData:any={};
                    base64BodyData.merchantId=config.PHONE_PE['MID'];
                    base64BodyData.merchantTransactionId=txnId;
                    base64BodyData.merchantUserId=userDetails['userName'];
                    base64BodyData.amount= +amount * 100;
                    base64BodyData.mobileNumber=userDetails['mobile'];
                    base64BodyData.callbackUrl=`${config.GamesAPP['API_HOST']}payment/phonepewebhook`;
                    base64BodyData.paymentInstrument={};
                    base64BodyData.paymentInstrument.type=paymentInstrumentType;
                    base64BodyData.paymentInstrument.targetApp=paymentInstrumentTargetApp;
                    base64BodyData.deviceContext={};
                    base64BodyData.deviceContext.deviceOS="ANDROID";

                    console.log(`[PhonePe deposit init] User Id ${receiverId} -->> Phone Pe Base64 body data  :`);
                    console.log(base64BodyData);

                    let buff = new Buffer(JSON.stringify(base64BodyData));  //Depricated need to change after first integration.
                    let base64Data = buff.toString('base64');
                    console.log(`[PhonePe deposit init] User Id ${receiverId} -->> Phone Pe base64 Data  : ${base64Data}`);
                    

                    let checkSumBodyData:any={};
                    checkSumBodyData.base64Body=base64Data;
                    checkSumBodyData.apiEndPoint=config.PHONE_PE.API_END_POINT;
                    checkSumBodyData.salt=config.PHONE_PE.KEY;
                    
                    let checkSumData = crypto.createHash('sha256').update(checkSumBodyData.base64Body+checkSumBodyData.apiEndPoint+checkSumBodyData.salt).digest('hex')+"###"+config.PHONE_PE.INDEX;
                    console.log(`[PhonePe deposit init] User Id ${receiverId} -->> Phone Pe Checksum Data  : ${checkSumData}`);


                    data = {};
                    data.merchantTransactionId = txnId;
                    data.pgName = "PHONEPE";
                    data.base64Body=base64Data
                    data.checksum=checkSumData;
                    data.apiEndPoint=config.PHONE_PE.API_END_POINT;

                    const TransactionLogDeposit:any = {};
                    TransactionLogDeposit.fkSenderId = senderId;
                    TransactionLogDeposit.fkReceiverId = receiverId;
                    TransactionLogDeposit.amount = amount;
                    TransactionLogDeposit.senderClosingBalance = await PaymentUtils.getClosingBalanceDeposit(senderId);
                    TransactionLogDeposit.receiverClosingBalance = await PaymentUtils.getClosingBalanceDeposit(receiverId);
                    TransactionLogDeposit.requestType = Constant.Payment.reqType.TLD.Inward;
                    TransactionLogDeposit.payStatus = Constant.Payment.payStatus.TLD.Pending;
                    TransactionLogDeposit.pgRefNo = txnId;
                    TransactionLogDeposit.bankRefNo = null;
                    TransactionLogDeposit.apiMsg = null
                    TransactionLogDeposit.description= await PaymentUtils.preparedDescription("DEPOSIT",Constant.Payment.payStatus.TLD.Pending,amount);
                    
                    const insert = await DepositAccountService.insertTransactionLog(TransactionLogDeposit);
                    if (insert) {
                        console.log(`[PhonePe deposit init Successfull. ${txnId}`);
                        helper.sendJSON(res, data, false, 200, "Transaction Initiated PhonePe Successfully .", 1);    
                    } else {
                        console.log(`[PhonePe deposit init Failed. ${txnId}`);
                        helper.sendJSON(res, data, true, 502, "DB Error in Initiate Deposit Log Insert PhonePe", 1);
                    }
                }
                else if (pgName == "SABPAISA") {
                    const senderId = config.financialUser['SABPAISA']; 
                    const receiverId = userDetails['id'];
                    const txnId = uuidv4();            
                    console.log(`User Id ${receiverId} -->> SABPAISA Txn Id : ${txnId}`);
                    
                    data = {};
                    data.txnToken = txnId;
                    data.pgName = "SABPAISA";
                    data.cred=config.SABPAISA;
                    
                    const TransactionLogDeposit:any = {};
                    TransactionLogDeposit.fkSenderId = senderId;
                    TransactionLogDeposit.fkReceiverId = receiverId;
                    TransactionLogDeposit.amount = amount;
                    TransactionLogDeposit.senderClosingBalance = await PaymentUtils.getClosingBalanceDeposit(senderId);
                    TransactionLogDeposit.receiverClosingBalance = await PaymentUtils.getClosingBalanceDeposit(receiverId);
                    TransactionLogDeposit.requestType = Constant.Payment.reqType.TLD.Inward;
                    TransactionLogDeposit.payStatus = Constant.Payment.payStatus.TLD.Pending;
                    TransactionLogDeposit.pgRefNo = txnId;
                    TransactionLogDeposit.bankRefNo = null;
                    TransactionLogDeposit.apiMsg = null

                    const insert = await DepositAccountService.insertTransactionLog(TransactionLogDeposit);
                    if (insert) {
                        helper.sendJSON(res, data, false, 200, "Transaction Initiated SABPAISA Successfully .", 1,true);    
                    } else {
                        helper.sendJSON(res, data, true, 502, "DB Error in Initiate Deposit Log Insert SABPAISA ", 1);
                    }          
                }
                else if(pgName == "AIRPAY"){
                    const senderId = config.financialUser['AIRPAY'];
                    const receiverId = userDetails['id'];
                    let data:any={};

                    let txnId = uuidv4();  
                    txnId=txnId.substring(0,30);


                    console.log(`[Airpay deposit init] transaction for User Id ${receiverId} -->> Airpay Txn Id : ${txnId}`);
                    
                    const TransactionLogDeposit:any = {};

                    TransactionLogDeposit.fkSenderId = senderId;
                    TransactionLogDeposit.fkReceiverId = receiverId;
                    TransactionLogDeposit.amount = amount;
                    TransactionLogDeposit.senderClosingBalance = await PaymentUtils.getClosingBalanceDeposit(senderId);
                    TransactionLogDeposit.receiverClosingBalance = await PaymentUtils.getClosingBalanceDeposit(receiverId);
                    TransactionLogDeposit.requestType = Constant.Payment.reqType.TLD.Inward;
                    TransactionLogDeposit.payStatus = Constant.Payment.payStatus.TLD.Pending;
                    TransactionLogDeposit.pgRefNo = txnId;
                    TransactionLogDeposit.bankRefNo = null;
                    TransactionLogDeposit.apiMsg = null
                    TransactionLogDeposit.description= await PaymentUtils.preparedDescription("DEPOSIT",Constant.Payment.payStatus.TLD.Pending,amount);
                    
                    const insert = await DepositAccountService.insertTransactionLog(TransactionLogDeposit);
                    if (insert) {
                        data['orderId']=txnId;
                        console.log(`[Airpay deposit init Successfull. ${txnId}`);
                        helper.sendJSON(res, data, false, 200, "Transaction Initiated Airpay Successfully .", 1);    
                    } else {
                        data['orderId']=null;
                        console.log(`[Airpay deposit init Failed. ${txnId}`);
                        helper.sendJSON(res, data, true, 502, "DB Error in Initiate Deposit Log Insert Airpay", 1);
                    }
                }
                else {
                    console.log(`Payment Gateway : ${pgName} not supported in our system.`);
                    await helper.sendJSON(res, data, true, 404, "This payment gateway is not supported.", 1);
                }
            }
        } catch (error) {
            console.log("Error: ", error);
            await helper.sendJSON(res, data, true, 500, "Oops! Something went wrong.", 1);
        }
    }

    async getUserDepositBalance(req: Request, res: Response) {
        const userDetails = req.headers.data;

        /*let existingBalance = await PaymentUtils.getUserAccountBal(userDetails['id'], Constant.Payment.AccType.Deposit);
        const bonusBalance = await PaymentUtils.getUserAccountBal(userDetails['id'], Constant.Payment.AccType.Bonus);*/

        /*let existingBalance = await PaymentUtils.getUserAccountBalV1(userDetails['id'], Constant.Payment.AccType.Deposit);
        const bonusBalance = await PaymentUtils.getUserAccountBalV1(userDetails['id'], Constant.Payment.AccType.Bonus);*/
        
        let accountBal= await PaymentUtils.getUserAccountTotalBal(userDetails['id']);
        let bonusBalance=accountBal['bonusBal'];
        let existingBalance= accountBal['depositBal'];

        existingBalance += bonusBalance;
        await helper.sendJSON(res, { "balance": existingBalance }, false, 200, "User Deposit Balance Listed Successfully", 1);

        
    }

    async getUserWithdrawBalance(req: Request, res: Response) {
        const userDetails = req.headers.data;
        /*const existingBalance = await PaymentUtils.getUserAccountBal(userDetails['id'], Constant.Payment.AccType.Withdraw);*/
        const existingBalance =await PaymentUtils.getUserAccountBalV1(userDetails['id'], Constant.Payment.AccType.Withdraw);
        await helper.sendJSON(res, { "balance": existingBalance }, false, 200, "User Withdraw Balance Listed Successfully", 1);
    }

    async getUserAccountBalance(req: Request, res: Response) {
        const userDetails = req.headers.data;
        console.log("User Acc Bala " + userDetails['id']);
        // const bonusBalance = await PaymentUtils.getUserAccountBal(userDetails['id'], Constant.Payment.AccType.Bonus);
        // const depositBalance = await PaymentUtils.getUserAccountBal(userDetails['id'], Constant.Payment.AccType.Deposit);
        // const withdrawBalance = await PaymentUtils.getUserAccountBal(userDetails['id'], Constant.Payment.AccType.Withdraw);
        // const tokenBalance = await PaymentUtils.getUserAccountBal(userDetails['id'],Constant.Payment.AccType.Token);
        // const gemsBalance = await PaymentUtils.getUserAccountBal(userDetails['id'], Constant.Payment.AccType.Referral);
        
        /*const bonusBalance = await PaymentUtils.getUserAccountBalV1(userDetails['id'], Constant.Payment.AccType.Bonus);
        const depositBalance = await PaymentUtils.getUserAccountBalV1(userDetails['id'], Constant.Payment.AccType.Deposit);
        const withdrawBalance = await PaymentUtils.getUserAccountBalV1(userDetails['id'], Constant.Payment.AccType.Withdraw);
        const gemsBalance = await PaymentUtils.getUserAccountBalV1(userDetails['id'], Constant.Payment.AccType.Referral);*/

        let accountBal= await PaymentUtils.getUserAccountTotalBal(userDetails['id']);
        let bonusBalance=accountBal['bonusBal'];
        let withdrawBalance=accountBal['withdrawalBal'];
        let depositBalance= accountBal['depositBal'];
        let gemsBalance= accountBal['referralBal'];


        let AcBal: any = {};
        // AcBal.bonus = bonusBalance;
        AcBal.deposit = depositBalance + bonusBalance;
        AcBal.withdraw = withdrawBalance;
        // AcBal.token = 0;
        AcBal.gems = gemsBalance;
        AcBal.totalBal = bonusBalance + depositBalance + withdrawBalance;
        helper.sendJSON(res, AcBal, false, 200, "User Balance Listed Successfully", 1, true);
    }

    async userGamePlay(req: Request, res: Response) {
        console.log(req.query);
        var userDetails = req.headers.data;
        var gameId = req.query.gameId;
        var gameEngine = +req.query.gameEngine;
        var engineId = req.query.engineId;

        if (gameEngine == Constant.GameEngine.Battle) {
            //Battle
            //Get Battle Fee
            var battle = await helper.getColsValue("gmsBattle", ["isPaid", "paidAmount"], { "id": engineId, "fk_GamesId": gameId });
            !battle ? helper.sendJSON(res, [], true, 502, "DB Error In Battle .", 0) : '';
            if (battle.length > 0) {
                var isPaid = battle[0]['isPaid'];
                var paidAmount = +battle[0]['paidAmount'];
                if (isPaid == 1) {
                    var isSuccessfull = await MasterPayment.userAccountBalanceDeduction(userDetails, paidAmount, gameId, gameEngine, engineId);
                    if (isSuccessfull == 200)
                        helper.sendJSON(res, [], false, 200, "Transaction Success ", 0);
                    else if (isSuccessfull == 502)
                        helper.sendJSON(res, [], true, 502, "Insufficient Balance !!", 0);
                    else
                        helper.sendJSON(res, [], true, 500, "Transaction Error !!", 0);

                }
                else
                    helper.sendJSON(res, [], true, 200, "You Can Play It without Paying any Amount, This Battle Is Free", 0);

            }
            else
                helper.sendJSON(res, [], true, 200, "No Battle Found .", 0);
        }
        else if (gameEngine == Constant.GameEngine.Tournament) {
            //Tournament
            //Get Tournament Fee
            var tournament = await helper.getColsValue("gmsTurnament", ["entryFee"], { "id": engineId, "fk_GamesId": gameId });
            !tournament ? helper.sendJSON(res, [], true, 502, "DB Error In Battle .", 0) : '';
            if (tournament.length > 0) {
                var paidAmount = +tournament[0]['entryFee'];
                if (paidAmount > 0) {
                    var isSuccessfull = await MasterPayment.userAccountBalanceDeduction(userDetails, paidAmount, gameId, gameEngine, engineId);
                    if (!isSuccessfull)
                        helper.sendJSON(res, [], true, 500, "Transaction Error ", 0);
                    else
                        helper.sendJSON(res, [], false, 200, "Transaction Success ", 0);
                }
                else
                    helper.sendJSON(res, [], true, 200, "Tournament is free", 0);

            }
            else
                helper.sendJSON(res, [], true, 200, "Tournament not found or the tournament fee is free.", 0);
        }
        else if (gameEngine == Constant.GameEngine.CricketFantacy) {
            //Cricket Fantacy
            //Get contest fee
            var contestData = await helper.getColsValue("gmsFantacyCricketContest", ["entryFee"], { "id": engineId, "fkMatchId": gameId });
            if (!contestData) {
                console.log("DB Error In cricket contest payment . Match Id : " + gameId + " Contest Id : " + engineId);
                helper.sendJSON(res, [], true, 502, "DB Error In cricket contest payment .", 0);
            }
            else if (contestData && contestData.length > 0) {
                var entryFee = +contestData[0]['entryFee'];
                if (entryFee > 0) {
                    var isSuccessfull = await MasterPayment.userAccountBalanceDeduction(userDetails, entryFee, gameId, gameEngine, engineId);
                    if (!isSuccessfull)
                        helper.sendJSON(res, [], true, 500, "Transaction Error !!", 0);
                    else if (isSuccessfull == 502)
                        helper.sendJSON(res, [], true, 502, "In sufficient balance .", 0);
                    else if (isSuccessfull == 200)
                        helper.sendJSON(res, [], false, 200, "Transaction Success . ", 0);
                }
                else
                    helper.sendJSON(res, [], false, 200, "Contest is free.", 0);
            }
            else
                helper.sendJSON(res, [], true, 200, "Contest not found.", 0);
        }
        else {
            helper.sendJSON(res, [], true, 200, "Invalid Game Engine", 1);
        }
    }

    async distributeTournamentPrize(req: Request, res: Response) {
        var tournamentId = req.headers.tournamentid;
        var gameId = await helper.getColValue("gmsTurnament", "fk_GamesId", { "id": tournamentId });
        var winnerUser = await helper.getColsValue("gmsTurnamentPlayers", ["id", "fk_PlayerId", "prizeMoney"], { "fk_TurnamentId": tournamentId, "status": "30" })
        if (winnerUser.length > 0) {
            var TransactionLogWithdraw: any = {};
            TransactionLogWithdraw.fkSenderId = config.financialUser.Settlement;//Settlement Withdraw Account
            TransactionLogWithdraw.fkGameId = gameId;
            TransactionLogWithdraw.gameEngine = Constant.GameEngine.Tournament;//Tournament
            TransactionLogWithdraw.engineId = tournamentId;

            for (var i = 0; i < winnerUser.length; i++) {
                let playerId = winnerUser[i]['fk_PlayerId'];
                let prize = +winnerUser[i]['prizeMoney'];
                let tpId = winnerUser[i]['id'];
                TransactionLogWithdraw.fkReceiverId = playerId;
                TransactionLogWithdraw.amount = prize;
                TransactionLogWithdraw.senderClosingBalance = 0;
                TransactionLogWithdraw.receiverClosingBalance = 0;
                TransactionLogWithdraw.requestType = Constant.Payment.reqType.TLW.WinningPrize;
                TransactionLogWithdraw.payStatus = Constant.Payment.payStatus.TLW.Success;
                console.log(TransactionLogWithdraw);

                const insert = await WithdrawAccountService.createTrxLogRecord(TransactionLogWithdraw);
                !insert ? await helper.sendJSON(res, [], true, 502, "DB Error In Updating Balance .", 0) : '';
                await Tournament.updateTournamentPlayers({ "status": 70, "id": tpId });
            }
            helper.sendJSON(res, [], false, 200, "Tournament Prize Distributed Successfully", 1);
        }
        else {
            helper.sendJSON(res, [], false, 200, "No Winner is there in Tournament", 1);
        }
    }
    async userPaymentWithdrawOutward(req: Request, res: Response) {
        var amount = req.body.amount;
        var logId = req.body.logId;
        var status = req.body.status;
        var userDetail = req.headers.data;

        if (logId && amount) {
            helper.sendJSON(res, [], true, 200, "Invalid request ", 1);
        }
        else if (logId && status) {
            const SECRET_KEY=req.headers['secret_key'];
            if (SECRET_KEY == config.WITHDRAW_APPROVAL_API_SECRET) { 
                //Make Trx. If approved trx.
                var withdrawLog = await helper.getAllColValue("gmsPaymentTransactionLogWithdraw", { "id": logId });
                if (withdrawLog && withdrawLog.length > 0 && withdrawLog[0]['requestType'] == Constant.Payment.reqType.TLW.Outward && withdrawLog[0]['payStatus'] == Constant.Payment.payStatus.TLW.PendingForApproval) {

                    if (status == Constant.Payment.payStatus.TLW.Failed) {
                        //If reject then refund to user virtual account
                        let update = await WithdrawAccountService.updateTransactionLog({ "payStatus": "20" }, { "id": logId });
                        var TransactionLogWithdraw: any = {};
                        //User ID
                        TransactionLogWithdraw.fkSenderId = config.financialUser.IndusInd;
                        //Indusind User
                        TransactionLogWithdraw.fkReceiverId = withdrawLog[0]['fkSenderId'];
                        TransactionLogWithdraw.amount = withdrawLog[0]['amount'];;
                        TransactionLogWithdraw.senderClosingBalance = 0;
                        TransactionLogWithdraw.receiverClosingBalance = 0;
                        TransactionLogWithdraw.pgRefNo = logId;
                        TransactionLogWithdraw.payStatus = Constant.Payment.payStatus.TLW.Success;
                        TransactionLogWithdraw.requestType = Constant.Payment.reqType.TLW.RejectOutward

                        const insertTL = await WithdrawAccountService.createTrxLogRecord(TransactionLogWithdraw);
                        if (insertTL)
                            await helper.sendJSON(res, [], false, 200, "Outward rejected successfully.", 1);
                        else
                            await helper.sendJSON(res, [], true, 500, "DB Error insert withdraw log reject outward.", 1);
                    }
                    else if (status == Constant.Payment.payStatus.TLW.Pending) {
                        //If approve then make transaction
                        let update = await WithdrawAccountService.updateTransactionLog({ "payStatus": "30" }, { "id": logId });
                        if (update) {
                            userDetail = await helper.getColsValue("gmsUsers", ["id", "mobile"], { "id": withdrawLog[0]['fkSenderId'] });
                            userDetail = userDetail[0];
                            var userBankDetails = await PaymentUtils.getUserBankAccountDetails(userDetail['id']);
                            let data = await IndusIndBankService.iblWithdraw(userDetail, userBankDetails, logId, withdrawLog[0]['amount']);
                            if (data == 500) {
                                helper.sendJSON(res, [], true, 200, "Unable to generate Outward", 1);
                            }
                            else if (data == 'R000') {
                                helper.sendJSON(res, { "trxStatus": data['StatusCode'] }, false, 200, "Outward completed successfully", 1);
                            }
                            else
                                helper.sendJSON(res, { "trxStatus": data['StatusCode'] }, false, 200, "Outward completed. Your amount will be credited to bank soon .", 1);
                        }
                        else {
                            helper.sendJSON(res, [], true, 200, "Unable to make transactions", 1);
                        }
                    }
                    else {
                        helper.sendJSON(res, [], true, 200, "Ivalid payment request", 1);
                    }
                }
                else {
                    helper.sendJSON(res, [], true, 200, "Can not Make Trx of this Log.", 1);
                }
            }
            else {
                helper.sendJSON(res, [], true, 200, "Access denied !!", 1);
            }


        }
        else if (amount) {
            // Initiate Trx.
            const MIN_TRX_AMT = 10;
            const MAX_TRX_AMT = 50000;

            // var userWalletBal = await PaymentUtils.getUserAccountBal(userDetail['id'], 20);
            var userWalletBal = await PaymentUtils.getUserAccountBalV1(userDetail['id'], 20);
            
            if (amount < MIN_TRX_AMT) {
                if (amount <= 0)
                    helper.sendJSON(res, [], true, 200, "We are unable to make your trx. Please enter valid amount.", 1);
                else
                    helper.sendJSON(res, [], true, 200, "We are unable to make your trx. Min. Amount should be 10 Rs.", 1);
            }
            else if (amount <= userWalletBal || userDetail['id'] == 400) {
                var userBankDetails = await PaymentUtils.getUserBankAccountDetails(userDetail['id']);
                if (userBankDetails && userBankDetails.length > 0) {
                    var isKYC = userBankDetails[0]['isKYC'];
                    if (isKYC == 0 || isKYC != 1) {
                        helper.sendJSON(res, [], true, 200, "We are unable to make your trx. Please complete your KYC !", 1);
                    }
                    else if (config.blockedState.indexOf(userBankDetails[0]['state']) > -1) {
                        helper.sendJSON(res, [], true, 200, "Transaction for this state has been blocked.", 1);
                    }
                    else {

                        var userId = userDetail['id'];
                        var todayTrxAmount = await PaymentUtils.getUserCurrentDateWithdraw(userId, amount);

                        var TransactionLogWithdraw: any = {};
                        //User ID
                        TransactionLogWithdraw.fkSenderId = userId;
                        //Indusind User
                        TransactionLogWithdraw.fkReceiverId = config.financialUser.IndusInd;
                        TransactionLogWithdraw.amount = amount;
                        TransactionLogWithdraw.senderClosingBalance = 0;
                        TransactionLogWithdraw.receiverClosingBalance = 0;
                        TransactionLogWithdraw.payStatus = TransactionLogWithdraw.amount > MAX_TRX_AMT || (+todayTrxAmount + +TransactionLogWithdraw.amount) >= MAX_TRX_AMT ? Constant.Payment.payStatus.TLW.PendingForApproval : Constant.Payment.payStatus.TLW.Pending;
                        TransactionLogWithdraw.requestType = Constant.Payment.reqType.TLW.Outward;
                        TransactionLogWithdraw.pg = Constant.Payment.PG.IndusInd;
                        TransactionLogWithdraw.pgRefNo = uuidv4();


                        //Deduct the user balance first , Then create the log.

                        let insertTL = await WithdrawAccountService.insertTransactionLog(TransactionLogWithdraw);
                        var transactionLogId = insertTL.dataValues['id'];
                        if (insertTL && transactionLogId) {
                            let from:any={};
                            from['reason']="USER_PAYMENT_WITHDRAW";
                            from['txnLogId']=transactionLogId;

                            let isCredited = await PaymentUtils.trxUserAccountBal(TransactionLogWithdraw.fkReceiverId, Constant.Payment.AccType.Withdraw, TransactionLogWithdraw.amount, Constant.Payment.trxType.Credit,from);
                            if (!isCredited)
                                console.log("Failed to update receiver balance");

                            let isDebited = await PaymentUtils.trxUserAccountBal(TransactionLogWithdraw.fkSenderId, Constant.Payment.AccType.Withdraw, TransactionLogWithdraw.amount, Constant.Payment.trxType.Debit, from);
                            if (!isDebited)
                                console.log("Failed to update sender balance");
                            
                            if (TransactionLogWithdraw.payStatus == Constant.Payment.payStatus.TLW.Pending) {
                                //Make Transaction through indusind IMPS
                                let data = await IndusIndBankService.iblWithdraw1(userDetail, userBankDetails, transactionLogId, TransactionLogWithdraw.amount);
                                
                                console.log(`IBL Response return data : for user ${userId}`);
                                console.log(data);

                                
                                if (data['statusCode'] == 500) {
                                    helper.sendJSON(res, data, true, 500, data['status'], 1);
                                }
                                else if (data['statusCode'] == 'R000') {
                                    helper.sendJSON(res, data, false, 200, data['status'] , 1);
                                }
                                else
                                    helper.sendJSON(res, data, false, 201, "Pending", 1);

                            }
                            else {
                                helper.sendJSON(res, { "statusCode": 1000,"status":"Pending for approval" }, false, 200, "Outward completed, waiting for approval", 1);
                            }//End of max outward check
                        }
                        else
                            helper.sendJSON(res, [], true, 502, "DB Error in Withdraw Log Insert", 0);
                    }
                }
                else {
                    helper.sendJSON(res, [], true, 200, "We are unable to make your trx. Please provide me your bank details", 1);
                }
            }
            else
                helper.sendJSON(res, [], true, 200, "Trx Amount is bigger then your winning amount", 1);
        }//End of initiate Trx.
        else
            helper.sendJSON(res, [], true, 200, "Ivalid param value.", 1);
    }

    async userPaymentWithdrawOutward1(req: Request, res: Response) {
        
        const {amount, tds, logId, status}=req.body;

        if ((logId && amount) || (!logId && !amount)) {
            helper.sendJSON(res, [], true, Constant.RESP_CODE['Bad Request'], "Invalid request !", 0);
        }
        else if (logId && status) {
            const SECRET_KEY=req.headers['secret_key'];
            if (SECRET_KEY == config.WITHDRAW_APPROVAL_API_SECRET) { 
                //Make Trx. If approved trx.
                var withdrawLog = await helper.getAllColValue("gmsPaymentTransactionLogWithdraw", { "id": logId });
                if (withdrawLog && withdrawLog.length > 0 
                    && withdrawLog[0]['requestType'] == Constant.Payment.reqType.TLW.Outward 
                    && withdrawLog[0]['payStatus'] == Constant.Payment.payStatus.TLW.PendingForApproval) 
                {
                    if (status == Constant.Payment.payStatus.TLW.Failed) {
                        //If reject then refund to user virtual account
                        let updateData:any={};
                        let userBankDetails = await PaymentUtils.getUserBankAccountDetails(withdrawLog[0]['fkSenderId']);
                        updateData["payStatus"] = Constant.Payment.payStatus.TLW.Failed,
                        updateData["description"] = await PaymentUtils.preparedDescription("WITHDRAW",Constant.Payment.payStatus.TLW.Failed,(withdrawLog[0]['amount'] + withdrawLog[0]['tds']),userBankDetails[0]);
                        let update = await WithdrawAccountService.updateTransactionLog( updateData, { "id": logId });
                        
                        var TransactionLogWithdraw: any = {};
                        TransactionLogWithdraw.fkSenderId = config.financialUser.IndusInd; //Indusind User
                        TransactionLogWithdraw.fkReceiverId = withdrawLog[0]['fkSenderId']; //Player ID
                        TransactionLogWithdraw.amount = withdrawLog[0]['amount'];
                        TransactionLogWithdraw.tds = withdrawLog[0]['tds'];
                        TransactionLogWithdraw.senderClosingBalance = 0;
                        TransactionLogWithdraw.receiverClosingBalance = 0;
                        TransactionLogWithdraw.pgRefNo = logId;
                        TransactionLogWithdraw.utrNo=withdrawLog[0]['pgRefNo'] + "/" + logId
                        TransactionLogWithdraw.payStatus = Constant.Payment.payStatus.TLW.Success;
                        TransactionLogWithdraw.requestType = Constant.Payment.reqType.TLW.RejectOutward;
                        TransactionLogWithdraw.description = await PaymentUtils.preparedDescription("WITHDRAW", "REFUND", (withdrawLog[0]['amount'] + withdrawLog[0]['tds']), {txnId:logId});

                        const insertTL = await WithdrawAccountService.createTrxLogRecord(TransactionLogWithdraw);
                        if (insertTL)
                            await helper.sendJSON(res, [], false, Constant.RESP_CODE.Success, "Outward rejected successfully.", 1);
                        else
                            await helper.sendJSON(res, [], true, Constant.RESP_CODE['DB Error'], "DB Error insert withdraw log reject outward.", 1);
                    }
                    else if (status == Constant.Payment.payStatus.TLW.Pending) {
                        //If approve then make transaction
                        let update = await WithdrawAccountService.updateTransactionLog({ "payStatus": "30" }, { "id": logId });
                        if (update) {
                            let userDetail = await helper.getColsValue("gmsUsers", ["id", "mobile"], { "id": withdrawLog[0]['fkSenderId'] });
                            userDetail = userDetail[0];

                            let userBankDetails = await PaymentUtils.getUserBankAccountDetails(userDetail['id']);
                            let data = await IndusIndBankService.iblWithdraw1(userDetail, userBankDetails, logId, withdrawLog[0]['amount']);
                            if (data['statusCode'] == 500) {
                                let from:any={};
                                from['txnLogId']=logId;
                                from['tds']= withdrawLog[0]['tds'];
                                from['reason']="USER_PAYMENT_WITHDRAW_REFUND_API_FAILED";
                                let isCredited = await PaymentUtils.trxUserAccountBal(withdrawLog[0]['fkSenderId'], Constant.Payment.AccType.Withdraw, withdrawLog[0]['amount'], Constant.Payment.trxType.Credit, from);
     
                                if (!isCredited)
                                    console.log(`Failed to update credit withdraw user balance at ${await utilityService.getDateTime()},
                                        userId : ${TransactionLogWithdraw.fkSenderId},
                                        amount : ${TransactionLogWithdraw.amount}`);
                                        
    
                                helper.sendJSON(res, data, true, Constant.RESP_CODE['Internal Server Error'], data['status'], 1);
                            }
                            else if (data['statusCode'] == 'R000') {
                                helper.sendJSON(res, { "trxStatus": data['StatusCode'] }, false, Constant.RESP_CODE.Success, "Outward completed successfully", 1);
                            }
                            else
                                helper.sendJSON(res, { "trxStatus": data['StatusCode'] }, false, Constant.RESP_CODE.Success, "Outward completed. Your amount will be credited to bank soon .", 1);
                        }
                        else {
                            helper.sendJSON(res, [], true, Constant.RESP_CODE.Success, "Unable to make transactions", 1);
                        }
                    }
                    else {
                        helper.sendJSON(res, [], true, Constant.RESP_CODE.Success, "Ivalid payment request", 1);
                    }
                }
                else {
                    helper.sendJSON(res, [], true, Constant.RESP_CODE['Validation Failed'], "Can not Make Trx of this Log.", 1);
                }
            }
            else {
                helper.sendJSON(res, [], true, Constant.RESP_CODE.Forbidden, "Access denied !!", 1);
                return;
            }
        }
        else if (amount) {
            let userDetail = req.headers.data;
            const userId = userDetail['id'];
            const SECRET_KEY=req.headers['secret_key'];
            if (!SECRET_KEY || SECRET_KEY != config.WITHDRAW_API_SECRET) { 
                helper.sendJSON(res, [], true, 200, "Access denied !!", 1);
                return;
            }
            // Initiate Trx.
            const MIN_TRX_AMT = 10;
            const MAX_TRX_AMT = config['MAX_TRX_AMT'];
            const MAX_TRX_DAILY_AMT = config['MAX_TRX_DAILY_AMT'];

            var userWalletBal = await PaymentUtils.getUserAccountBalV1(userDetail['id'], 20);
            var todayTrxAmount = await PaymentUtils.getUserCurrentDateWithdraw(userDetail['id'], amount);

            if (amount < MIN_TRX_AMT) {
                if (amount <= 0)
                    helper.sendJSON(res, [], true, 200, "We are unable to make your trx. Please enter valid amount.", 1);
                else
                    helper.sendJSON(res, [], true, 200, "We are unable to make your trx. Min. Amount should be 10 Rs.", 1);

                return;
            }
            else if(amount > MAX_TRX_AMT ){
                helper.sendJSON(res, [], true, 200, `We are unable to make your trx. You can only withdraw max amount Rs. ${MAX_TRX_AMT}.`, 1);
                return
            }
            else if((+todayTrxAmount + +amount) > MAX_TRX_DAILY_AMT){
                helper.sendJSON(res, [], true, 200, "We are unable to make your trx. You have reached your Max limit.", 1);
                return
            }
            else if (amount <= userWalletBal || userDetail['id'] == 400) {
                let userBankDetails = await PaymentUtils.getUserBankAccountDetails(userDetail['id']);
                let userBankDetailsDecription = await PaymentUtils.getUserBankAccountDetails(userDetail['id']);
                if (userBankDetails && userBankDetails.length > 0) {
                    
                    if (config.blockedState.indexOf(userBankDetails[0]['state']) > -1) {
                        helper.sendJSON(res, [], true, 200, "Transaction for this state has been blocked.", 1);
                    }
                    else {

                        let TransactionLogWithdraw: any = {};
                        TransactionLogWithdraw.fkSenderId = userId; //User ID
                        TransactionLogWithdraw.fkReceiverId = config.financialUser.IndusInd; //Indusind User
                        TransactionLogWithdraw.amount = amount;
                        TransactionLogWithdraw.tds = tds;
                        TransactionLogWithdraw.senderClosingBalance = 0;
                        TransactionLogWithdraw.receiverClosingBalance = 0;
                        //TransactionLogWithdraw.payStatus = TransactionLogWithdraw.amount > MAX_TRX_AMT || (+todayTrxAmount + +TransactionLogWithdraw.amount) > MAX_TRX_DAILY_AMT ? Constant.Payment.payStatus.TLW.PendingForApproval : Constant.Payment.payStatus.TLW.Pending;
                        TransactionLogWithdraw.payStatus = Constant.Payment.payStatus.TLW.Pending;
                        TransactionLogWithdraw.requestType = Constant.Payment.reqType.TLW.Outward;
                        TransactionLogWithdraw.pg = Constant.Payment.PG.IndusInd;
                        TransactionLogWithdraw.pgRefNo = uuidv4();
                        TransactionLogWithdraw.description = await PaymentUtils.preparedDescription("WITHDRAW",Constant.Payment.payStatus.TLW.Pending,(amount + tds),userBankDetailsDecription[0]);
                        let insertTL = await WithdrawAccountService.insertTransactionLog(TransactionLogWithdraw);
                        var transactionLogId = insertTL.dataValues['id'];
                        if (insertTL && transactionLogId) {
                            //Deduct the user balance first , Then create the log.
                            let from:any={};
                            from['reason']="USER_PAYMENT_WITHDRAW";
                            from['txnLogId']=transactionLogId;
                            from['tds']= tds;
                            let isDebited = await PaymentUtils.trxUserAccountBal(TransactionLogWithdraw.fkSenderId, Constant.Payment.AccType.Withdraw, TransactionLogWithdraw.amount, Constant.Payment.trxType.Debit, from);
 
                            if (!isDebited){
                                console.log(`Failed to debit withdraw user balance at ${await utilityService.getDateTime()},
                                 userId : ${TransactionLogWithdraw.fkSenderId},
                                 amount : ${TransactionLogWithdraw.amount},
                                 Txn Id : ${transactionLogId}`);

                                 let withdrawUpdateData:any={
                                    "description": await PaymentUtils.preparedDescription("WITHDRAW",Constant.Payment.payStatus.TLW.Failed,amount,userBankDetails[0]),
                                    "payStatus": 20
                                 }
                                 WithdrawAccountService.updateTransactionLog(withdrawUpdateData,{id:transactionLogId})
                                 helper.sendJSON(res, [], true, 200, "Unable to debit wallet balance.", 1);
                                 return;
                            }
                            else{
                                if (TransactionLogWithdraw.payStatus == Constant.Payment.payStatus.TLW.Pending) {
                                    //Make Transaction through indusind IMPS
                                    let data = await IndusIndBankService.iblWithdraw1(userDetail, userBankDetails, transactionLogId, TransactionLogWithdraw.amount, TransactionLogWithdraw);    
                                    console.log(`IBL Response return data : for user ${userId}`);
                                    console.log(data);
                                    
                                    
                                    if (data['statusCode'] == 500) {
                                        from['reason']="USER_PAYMENT_WITHDRAW_REFUND_API_FAILED";
                                        let isCredited = await PaymentUtils.trxUserAccountBal(TransactionLogWithdraw.fkSenderId, Constant.Payment.AccType.Withdraw, TransactionLogWithdraw.amount, Constant.Payment.trxType.Credit, from);
     
                                        if (!isCredited)
                                            console.log(`Failed to credit withdraw user balance on txn failed at ${await utilityService.getDateTime()},
                                             userId : ${TransactionLogWithdraw.fkSenderId},
                                             amount : ${TransactionLogWithdraw.amount},
                                             Txn Id : ${transactionLogId}`);
                                             
            
                                        helper.sendJSON(res, data, true, Constant.RESP_CODE['Internal Server Error'], data['status'], 1);
                                        return;
                                    }
                                    else if (data['statusCode'] == 'R000') {
                                        helper.sendJSON(res, data, false, Constant.RESP_CODE.Success, data['status'] , 1);
                                        return;
                                    }
                                    else{
                                        helper.sendJSON(res, data, false, 201, "Pending", 1);
                                        return;
                                    }
                                }
                                else {
                                    helper.sendJSON(res, { "statusCode": 1000,"status":"Pending for approval" }, false, Constant.RESP_CODE.Success, "Outward completed, waiting for approval", 1);
                                }
                            }
                        }
                        else
                            helper.sendJSON(res, [], true, Constant.RESP_CODE['DB Error'], "Unable to initiate the payment !", 0);
                    }
                }
                else {
                    helper.sendJSON(res, [], true, Constant.RESP_CODE.Success, "We are unable to make your trx. Please provide me your bank details", 1);
                }
            }
            else
                helper.sendJSON(res, [], true, Constant.RESP_CODE.Success, "Trx Amount is bigger then your winning amount", 1);
        }//End of initiate Trx.
        else
            helper.sendJSON(res, [], true, Constant.RESP_CODE['Bad Request'], "Ivalid param value !", 1);
    }

    async userPaymentWithdrawPayTm(req: Request, res: Response) {
        const amount = req.body.amount;
        const userDetails = req.headers.data;


        //Validate Amount
        if (!amount || amount == 0 || amount < 10) {
            helper.sendJSON(res, [], true, 400, "Invalid requested amount !", 0);
            return;
        }



        //Check User Account balance if available than proceed to withdraw.
        let userAccountBalance = await paymentService.getUserAccountBal(userDetails['id'], Constant.Payment.AccType.Withdraw);
        if (userAccountBalance < amount) {
            helper.sendJSON(res, [], true, 200, "Trx. Amount is bigger then your gamesapp account balance !", 0);
            return;
        }


        //KYC, State Validation and Trx. Prepration..
        var userBankDetails = await PaymentUtils.getUserBankAccountDetails(userDetails['id']);
        /*const isKYC=userBankDetails[0]['isKYC'];
        if(isKYC!=1){
            helper.sendJSON(res,[],true,200,"We are unable to make your trx. Please complete your KYC !",1);
            return
        }
        else */

        if (config.blockedState.indexOf(userBankDetails[0]['state']) > -1) {
            helper.sendJSON(res, [], true, 200, "Transaction for this state has been blocked !", 1);
            return;
        }
        else {
            // Prepaired Transaction Start Here .
            const payTmMobile = userBankDetails[0]['paytmMobile'];
            // payTmMobile="5555566666"; //This is the test mobile.
            // payTmMobile="7777777777"; //This is the test mobile.

            if (!payTmMobile) {
                helper.sendJSON(res, [], true, 400, "Please register you PayTM Mobile number !", 1);
                return;
            }
            var TransactionLogWithdraw: any = {};
            const orderId = await helper.generateOrderId();
            TransactionLogWithdraw.fkSenderId = userDetails['id'];
            TransactionLogWithdraw.fkReceiverId = config.financialUser.PayTM;
            TransactionLogWithdraw.amount = amount;
            TransactionLogWithdraw.senderClosingBalance = 0;
            TransactionLogWithdraw.receiverClosingBalance = 0;
            TransactionLogWithdraw.payStatus = Constant.Payment.payStatus.TLW.Pending;
            TransactionLogWithdraw.requestType = Constant.Payment.reqType.TLW.Outward;
            TransactionLogWithdraw.pg = Constant.Payment.PG.PayTM;
            TransactionLogWithdraw.customerRefNum = orderId;
            let insertTL = await WithdrawAccountService.insertTransactionLog(TransactionLogWithdraw);
            var transactionLogId = insertTL.dataValues['id'];
            if (insertTL && transactionLogId) {
                let from:any={};
                from['reason']="USER_PAYMENT_WITHDRAW_PAYTM";
                from['txnLogId']=transactionLogId;

                let isCredited = await PaymentUtils.trxUserAccountBal(TransactionLogWithdraw.fkReceiverId, Constant.Payment.AccType.Withdraw, TransactionLogWithdraw.amount, Constant.Payment.trxType.Credit, from);
                if (!isCredited)
                    console.log("Failed to update receiver balance for orderId : " + TransactionLogWithdraw.customerRefNum);

                let isDebited = await PaymentUtils.trxUserAccountBal(TransactionLogWithdraw.fkSenderId, Constant.Payment.AccType.Withdraw, TransactionLogWithdraw.amount, Constant.Payment.trxType.Debit,from);
                if (!isDebited)
                    console.log("Failed to update sender balance for orderId : " + TransactionLogWithdraw.customerRefNum);

                //Make Transaction through PayTM Wallet.
                let pgService: IPaymentGatewayService = null;
                pgService = new PayTMService();
                var PayTMResp = await pgService.initiateTransactionWithdraw(orderId, amount, userDetails['id'], payTmMobile);
                if (PayTMResp) {
                    //Update the Transaction log.
                    var updateTrxLogWithdraw: any = {};
                    updateTrxLogWithdraw.apiMsg = JSON.stringify(PayTMResp);
                    PayTMResp['statusCode'] == "DE_001" ? 10 : 30;
                    //Note we will not do the immediate refund here .
                    let updateTL = await WithdrawAccountService.updateTransactionLog(updateTrxLogWithdraw, { "id": transactionLogId });
                    if (!updateTL) {
                        console.log(`Unable to update Transaction Log For ID : ${transactionLogId} And Data ${updateTrxLogWithdraw}`);
                    }

                    helper.sendJSON(res, PayTMResp, false, 200, "Transaction Success .", 1);
                    return;
                }
                else {
                    helper.sendJSON(res, [], true, 500, "Unable to complete the transaction !!", 0);
                    return;
                }
            }
            else {
                helper.sendJSON(res, [], true, 502, "DB Error in Withdraw Log Insert", 0);
                return;
            }

        }
    }

    async userPaymentWithdrawStatus(req: Request, res: Response) {
        var PayTMResponse = req.body;

        if (PayTMResponse) {
            //Get PayTM Transaction by OrderId.
            const trx = await WithdrawAccountService.getTrxByOrderId(PayTMResponse.result.orderId);
            if (!trx || trx.length <= 0) {
                helper.sendJSON(res, [], true, 400, "Order does not exist !!", 1);
                return;
            }

            const tlid = trx[0]['id'];
            var TransactionLogWithdrawUpdate: any = {};

            TransactionLogWithdrawUpdate.pgRefNo = PayTMResponse.result.paytmOrderId;
            TransactionLogWithdrawUpdate.iblRefNo = PayTMResponse.result.rrn;
            TransactionLogWithdrawUpdate.apiMsg = trx[0]['apiMsg'] + JSON.stringify(PayTMResponse);

            const statusCode = PayTMResponse.statusCode;
            const status = PayTMResponse.status;

            // Note : Here we have six status (FAILURE, ACCEPTED, SUCCESS, CANCELLED, PENDING, and QUEUED)
            if (status == "SUCCESS")
                TransactionLogWithdrawUpdate.payStatus = 10;
            else if (status == "FAILURE")
                TransactionLogWithdrawUpdate.payStatus = 20;
            else //Pending
                TransactionLogWithdrawUpdate.payStatus = 30;

            try {
                const updateTrx = await WithdrawAccountService.updateTransactionLog(TransactionLogWithdrawUpdate, { id: tlid })

                //If Transaction Failed Make it return to wallet
                if (
                    updateTrx &&
                    TransactionLogWithdrawUpdate.payStatus == 20
                ) {
                    console.log('Refunding Outward : ' + tlid);
                    var insertTlData: any = {};
                    insertTlData.fkSenderId = config.financialUser.PayTM;
                    insertTlData.fkReceiverId = trx[0]['fkSenderId'];
                    insertTlData.amount = trx[0]['amount'];
                    insertTlData.senderClosingBalance = 0;
                    insertTlData.receiverClosingBalance = 0;
                    insertTlData.requestType = 60;
                    insertTlData.payStatus = 10;
                    insertTlData.pg = 2;
                    insertTlData.pgRefNo = TransactionLogWithdrawUpdate.pgRefNo
                    insertTlData.customerRefNum = tlid;
                    insertTlData.apiMsg = JSON.stringify(PayTMResponse);
                    try {
                        let insertTL = await WithdrawAccountService.insertTransactionLog(insertTlData);

                        //Update Withdraw Balance.
                        if (insertTL) {
                            console.log(`Transaction log inserted successfully for PayTM refund. Log ID : ${tlid}`);
                            let from:any={};
                            from['reason']="USER_PAYMENT_WITHDRAW_STATUS";
                            from['txnLogId']=insertTL['dataValues']['id'];
                            
                            let isCredited = await PaymentUtils.trxUserAccountBal(insertTlData.fkReceiverId, Constant.Payment.AccType.Withdraw, insertTlData.amount, Constant.Payment.trxType.Credit, from);
                            if (!isCredited)
                                console.log("Failed to update receiver balance for Trx Id : " + tlid);

                            let isDebited = await PaymentUtils.trxUserAccountBal(insertTlData.fkSenderId, Constant.Payment.AccType.Withdraw, insertTlData.amount, Constant.Payment.trxType.Debit, from);
                            if (!isDebited)
                                console.log("Failed to update sender balance for Trx Id : " + tlid);

                            if (isDebited && isCredited) {
                                console.log(`User ${trx[0]['fkSenderId']} PayTM Withdraw Balance Updated successfully.`);
                                //Send Push Notification
                                helper.sendJSON(res, [], false, 200, "Order status FAILED updated successfully.", 1);
                                return;
                            }
                            else {
                                helper.sendJSON(res, [], false, 502, "Db Error !!", 1);
                                return;
                            }
                        }
                    } catch (error) {
                        console.log('Unable to insert refund transaction log for Log Id : ' + tlid);
                        console.log(error);
                        helper.sendJSON(res, [], false, 500, "Unable to maintain trx refund !!", 1);
                        return;
                    }
                }
                else {
                    helper.sendJSON(res, [], false, 200, "Order status SUCCESS updated successfully.", 1);
                    return;
                }
            } catch (error) {
                console.log(error);
                helper.sendJSON(res, [], false, 500, "Unable to update final status !!", 1);
                return;
            }
        } else {
            console.log('Unable To get PayTM trx status request !!');
            helper.sendJSON(res, [], true, 400, "Unable To get PayTM trx status request !!", 1);
            return;
        }
    }

    async payTokenMatchup(req: Request, res: Response) {
        var gameId = req.body.gameId;
        var userDetail = req.headers.data;
        var playerId = userDetail['id'];
        var data = await helper.getColsValue("gmsGames", ["isMatchup", "tokenPrize"], { "id": gameId });
        !data ? helper.sendJSON(res, [], true, 502, "DB Error . !", 0) : "";
        if (data && data.length > 0) {
            var isMatchup = data[0]['isMatchup'];
            var tokenPrize = data[0]['tokenPrize'];
            if (isMatchup == "1") {
                if (tokenPrize > 0) {
                    // var userTokenBal = await PaymentUtils.getUserAccountBal(playerId, Constant.Payment.AccType.Token);
                    var userTokenBal = await PaymentUtils.getUserAccountBalV1(playerId, Constant.Payment.AccType.Token);
                    if (userTokenBal >= tokenPrize) {
                        //Start token payment
                        var tlTokenInsert: any = {};
                        tlTokenInsert.fkSenderId = playerId;
                        tlTokenInsert.fkReceiverId = config.financialUser['Settlement']; //Token Settlement Account
                        tlTokenInsert.token = tokenPrize;
                        tlTokenInsert.senderClosingTokenBal = 0;
                        tlTokenInsert.receiverClosingTokenBal = 0;
                        tlTokenInsert.requestType = Constant.Payment.reqType.TLT.GamePlay;
                        tlTokenInsert.payStatus = Constant.Payment.payStatus.TLT.Success;
                        tlTokenInsert.fkGameId = gameId;

                        var insertTl = await TokenAccountService.insertTransactionLog(tlTokenInsert);
                        if (insertTl) {
                            let isCredited = await PaymentUtils.trxUserAccountBal(tlTokenInsert.fkReceiverId, Constant.Payment.AccType.Token, tlTokenInsert.token, Constant.Payment.trxType.Credit);
                            if (!isCredited)
                                console.log("Failed to update receiver balance");
                        }
                        else
                            helper.sendJSON(res, [], true, 502, "Unable to insert token log ", 0);

                        let isDebited = await PaymentUtils.trxUserAccountBal(tlTokenInsert.fkSenderId, Constant.Payment.AccType.Token, tlTokenInsert.token, Constant.Payment.trxType.Debit);
                        if (!isDebited)
                            console.log("Failed to update sender balance");
                        else
                            helper.sendJSON(res, [], false, 200, "Token Debited Successfully ", 0);
                    }
                    else
                        helper.sendJSON(res, [], true, 200, "Insufficient Balance .", 1);
                }
                else {
                    helper.sendJSON(res, [], true, 200, "You can play this game without paying token .", 1);
                }
            }
            else {
                helper.sendJSON(res, [], true, 200, "This is not matchup Game . Please try for Matchup .", 1);
            }
        }
        else {
            helper.sendJSON(res, [], true, 200, "Please Enter correct Game Id !", 1);
        }

    }

    async purcheseToken(req: Request, res: Response) {
        var token = req.body.token;
        var userDetails = req.headers.data;
        var playerId = userDetails['id'];

        // var depositBal = await PaymentUtils.getUserAccountBal(playerId, Constant.Payment.AccType.Deposit);
        var depositBal = await PaymentUtils.getUserAccountBalV1(playerId, Constant.Payment.AccType.Deposit);
        if (+token > 0 && +token <= depositBal) {
            //update token balance 

            //Insert Transaction log
            var TransactionLogDeposit: any = {};
            TransactionLogDeposit.fkSenderId = playerId;
            TransactionLogDeposit.fkReceiverId = config.financialUser['Settlement']; //Settlement Account
            TransactionLogDeposit.amount = token;
            TransactionLogDeposit.senderClosingBalance = 0;
            TransactionLogDeposit.receiverClosingBalance = 0;
            TransactionLogDeposit.requestType = Constant.Payment.reqType.TLD.TokenPurchase;
            TransactionLogDeposit.payStatus = Constant.Payment.payStatus.TLD.Success;
            let insertTLD = await DepositAccountService.createTrxLogRecord(TransactionLogDeposit);
            if (!insertTLD)
                await helper.sendJSON(res, [], true, 502, "DB Error in Deposit Log Insert", 0);

            //insert token log
            var tlTokenInsert: any = {};
            tlTokenInsert.fkSenderId = config.financialUser['Settlement'];//Token Settlement Account
            tlTokenInsert.fkReceiverId = playerId;
            tlTokenInsert.token = token;
            tlTokenInsert.senderClosingTokenBal = 0;
            tlTokenInsert.receiverClosingTokenBal = 0;
            tlTokenInsert.requestType = Constant.Payment.reqType.TLT.TokenPurchase;
            tlTokenInsert.payStatus = Constant.Payment.payStatus.TLT.Success;
            let insertTLT = await TokenAccountService.insertTransactionLog(tlTokenInsert);
            if (insertTLT) {
                let isCredited = await PaymentUtils.trxUserAccountBal(tlTokenInsert.fkReceiverId, Constant.Payment.AccType.Token, tlTokenInsert.token, Constant.Payment.trxType.Credit);
                if (!isCredited)
                    console.log("Failed to update receiver balance");
                let isDebited = await PaymentUtils.trxUserAccountBal(tlTokenInsert.fkSenderId, Constant.Payment.AccType.Token, tlTokenInsert.token, Constant.Payment.trxType.Debit);
                if (!isDebited)
                    console.log("Failed to update sender balance");
            }
            else
                helper.sendJSON(res, [], true, 502, "DB Error in Token Log Insert", 0);

            helper.sendJSON(res, [], false, 200, "Token purchesed Successfully", 1);
        }
        else {
            if (+token <= 0)
                helper.sendJSON(res, [], true, 200, "Please enter correct token.", 1);
            else
                helper.sendJSON(res, [], true, 200, "Insufficient Balance.", 1);
        }

    }
    async getTransactionHistory(req: Request, res: Response) {
        const historyType = +req.query.type;
        const userDetails = req.headers.data;
        if (historyType == 1) {
            //Withdraw and Deposit
            const data = await MasterPayment.getDepositWithdrawHistory(userDetails['id']);
            if (data) {
                helper.sendJSON(res, data, false, 200, "Transaction Deposit/Withdraw log listed successfully .", 1, true);
            } else {
                helper.sendJSON(res, [], true, 200, "DB Error ! ", 1);
            }

        } else if (historyType == 2) {
            //Token
            const data: any[] = await TokenAccountService.getTokenHistory(userDetails['id']);
            if (data) {
                helper.sendJSON(res, data, false, 200, "Transaction token log listed successfully .", 1);
            } else {
                helper.sendJSON(res, [], true, 200, "DB Error ! ", 1);
            }

        } else {
            helper.sendJSON(res, [], true, 200, "Invalid Request type ", 1);
        }
    }
    async getTransactionHistoryV2(req: Request, res: Response) {
        const historyType = +req.query.type;
        const userDetails = req.headers.data;
        let page = +req.query.page || 0;
        let page_size = +req.query.page_size || 20;
        
        console.log("getTransactionHistory req.query.page: ", page);
        if (historyType == 1) {
            //Withdraw and Deposit
            const data = await MasterPayment.getDepositWithdrawHistory(userDetails['id'], true, page, page_size);
            if (data) {
                helper.sendJSON(res, data, false, 200, "Transaction Deposit/Withdraw log listed successfully .", 1, true);
            } else {
                helper.sendJSON(res, [], true, 200, "DB Error ! ", 1);
            }
        } else if (historyType == 2) {
            //Token
            const data: any[] = await TokenAccountService.getTokenHistory(userDetails['id'], true, page, page_size);
            if (data) {
                helper.sendJSON(res, data, false, 200, "Transaction token log listed successfully .", 1);
            } else {
                helper.sendJSON(res, [], true, 200, "DB Error ! ", 1);
            }
        } else {
            helper.sendJSON(res, [], true, 200, "Invalid Request type ", 1);
        }
    }

    async getTransactionHistoryV3(req: Request, res: Response) {
        try {
            const latest = req.query.latest;
            const userDetails = req.headers.data;
            const historyType = +req.query.type;
            let page = +req.query.page || 0;
            let page_size = +req.query.page_size || 20;
            
            console.log("getTransactionHistoryV3 > Page: ", page);

            if (historyType == 1) {
                //Withdraw and Deposit
                const txnData = await MasterPayment.getDepositWithdrawHistoryV2(userDetails['id'], true, page, page_size,latest);
                if (txnData) {
                    helper.sendJSON(res, txnData.data, false, 200, "Transaction Deposit/Withdraw log listed successfully .", txnData.count, false);
                } else {
                    helper.sendJSON(res, [], true, 200, "DB Error ! ", 0);
                }
            } else if (historyType == 2) {
                //Token
                const data: any[] = await TokenAccountService.getTokenHistory(userDetails['id'], true, page, page_size);
                if (data) {
                    helper.sendJSON(res, data, false, 200, "Transaction token log listed successfully .", 1);
                } else {
                    helper.sendJSON(res, [], true, 200, "DB Error ! ", 0);
                }
            } else {
                helper.sendJSON(res, [], true, 200, "Invalid Request type ", 0);
            }
        } catch (error) {
            helper.sendJSON(res, [], true, 200, "Transaction history is not available. Please try again after some time. ", 0);
        }

    }


    async getTransactionDetails(req: Request, res: Response) {
        const id = req.query.id;
        const type = +req.query.type;
        const userDetails = req.headers.data;
        let logTable;
        switch (type) {
            case 1:
                logTable = "gmsPaymentTransactionLogWithdraw";
                break;
            case 2:
                logTable = "gmsPaymentTransactionLogDeposit";
                break;
            case 3:
                logTable = "gmsPaymentTransactionLogToken";
                break;
            case 4:
                logTable = "gmsPaymentTransactionLogBonus";
                break;
            default:
                logTable = null;
                break;
        }//End of switch block;

        if (logTable) {
            let data = await PaymentUtils.getTransactionLogDetails(logTable, id);
            if (!data) {
                helper.sendJSON(res, [], true, 403, "Sorry, No data found !!", 0);
            }
            else {
                var prepairedData: any = {};
                // Transaction Id
                // Status : Success/Pending/Pending For Approval/ Failed.
                // Type : Debit, Credit
                // Date & Time
                // From & To
                // Amount
                // Description

                prepairedData.id = data['id'];

                let payStatus = { 10: "Success", 20: "Failed", 30: "Pending", 40: "ManualRefund", 50: "PendingForApproval" }
                prepairedData.statusCode = data['payStatus'];
                prepairedData.statusMsg = payStatus[prepairedData.statusCode];

                prepairedData.type = data['fkSenderId'] == userDetails['id'] ? "Debit" : "Credit";

                prepairedData.createdAt = data['createdAt'];
                prepairedData.updatedAt = data['updatedAt'];

                let fromUser = await UserServive.getUsernameForUserIds(data['fkSenderId']);
                let toUser = await UserServive.getUsernameForUserIds(data['fkReceiverId']);
                prepairedData.from = fromUser[0]['firstName'] + "(" + fromUser[0]['userName'] + ")";
                prepairedData.to = toUser[0]['firstName'] + "(" + toUser[0]['userName'] + ")";

                prepairedData.amount = data['amount'];

                /*let reqType={
                    "TLD": {
                        10: "Deposit",
                        20: "Entry-Fee",
                        30: "Rewards",
                        40: "Entry-Fee Refund",
                        50: "Token Purchase",
                        60: "Winning Prize",
                        100: "Auto Refill"
                    },
                    "TLW": {
                        10: "Withdraw",
                        20: "Entry-Fee",
                        30: "Winning Prize",
                        40: "Commission Charge",
                        50: "Refund",
                        60: "Refund-Withdraw",
                        70: "Reject-Withdraw",
                        100: "Auto Refill"
                    },
                    "TLT": {
                        10: "Rewards",
                        20: "Entry Fee",
                        30: "Token Purchase"
                    },
                    "TLB": {
                        10: "Deposit",
                        20: "Entry Fee",
                        30: "Rewards",
                        40: "Refund",
                        50: "Token Purchase",
                        60: "Winning Prize",
                        70: "Scratch Card",
                        100: "Auto Refill"
                    }
                };*/

                let logType = { 1: "TLW", 2: "TLD", 3: "TLT", 4: "TLB" };

                //prepairedData.description=reqType[logType[type]][data['requestType']];
                prepairedData.description = await helper.getKeybyValue(Constant.Payment.reqType[logType[type]], data['requestType'])

                return helper.sendJSON(res, prepairedData, false, 200, "Transaction details listed successfully . ", 1);
            }
        }
        else {
            return helper.sendJSON(res, [], true, 400, "Invalid requested data !! ", 0);
        }
    }
    /**
     * This method is only for internal purposes. Currently we are using for streaks
     */
    async creditAmountToUserBonusAccount(req: Request, res: Response) {
        try {
            const data: any = req.body;
            console.log("Request Data: ", data);
            const remoteAddreess: string = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] : await helper.getIP(req.connection.remoteAddress);
            console.log("creditAmountToUserBonusAccount - Remote IP Address: ", remoteAddreess);
            if (config.paymentWhiltelistedIPs.indexOf(remoteAddreess) <= -1) {
                helper.sendJSON(res, [], true, 403, "Access Denied !! ", 0);
                return;
            }
            const trxObj = await PaymentUtils.getTrxLogObject(
                config.financialUser.Settlement,
                data.userId,
                data.amount,
                Constant.Payment.reqType.TLB.Streaks,
                Constant.Payment.payStatus.TLB.Success,
                0,
                0,
                data.userStreakLogId,
                null,
                null,
                null
            );
            const isBonusTrxRecordCreated = await MasterPayment.createTrxLogRecord(trxObj, Constant.Payment.AccType.Bonus);
            if (isBonusTrxRecordCreated) {
                helper.sendJSON(res, [], false, 200, "User account balance updated successfully . ", 0);
                return;
            }
        } catch (error) {
            console.error("Error - processPayment: ", error);
        }
        return helper.sendJSON(res, [], true, 500, "Failed to update sender balance.", 0);
    }

    async cashbackOnDeposit(req: Request, res: Response) {
        try {
            const cashback: any = {
                "cashback": config.cashback
            }
            helper.sendJSON(res, cashback, false, 200, "Cashback fetched successfully", 1);
        } catch (error) {
            console.log("Error: ", error);
            helper.sendJSON(res, [], false, 500, "Cashback is not avaialble", 0);
        }
    }
    //all pending withdrawl
    async allPendingWithdrawTxn(req:Request, res:Response){
        try{  
               let allData= await paymentService.allPendingWithdrawTxn()
               if(allData && allData.length>0){
                   helper.sendJSON(res,allData,false,200,"all withdraw which is pending for approval",allData.length)
               }else{
                   helper.sendJSON(res, [], false,200, "No withdraw tx pending for approval", 0)
               }

        }catch(error){
            console.log("Error",error)
            helper.sendJSON(res, [], false, 500, "Internal server error", 0);
        }

    }

    async successStuckDepositTxn(req:Request, res:Response){
        try{  
            let txnId=req.query['txnId'];
            let depositLog = await helper.getAllColValue("gmsPaymentTransactionLogDeposit",{"requestType":10,"pgRefNo":txnId});
            let paymentTLD= depositLog[0];
            delete paymentTLD['createdAt'];
            

            paymentTLD.extra=JSON.stringify({ "trxStatus": "SUCCESS","prePayStatus":paymentTLD['payStatus'] });
            if (await DepositAccountService.updateTransactionLogAndUserAccounts(paymentTLD['fkSenderId'], paymentTLD['fkReceiverId'], paymentTLD['amount'], paymentTLD['pgRefNo'], paymentTLD['bankRefNo'], paymentTLD, {"Key":"Success By Cron Job","DateTime":new Date()})) {
                helper.sendJSON(res, { "Txn Id" : txnId,"trxStatus" : "SUCCESS" }, false, 200, "Payment Completed Successfully", 1);
            } else {
                helper.sendJSON(res, { "Txn Id" : txnId, "trxStatus" : "FAILED" }, true, 200, "Oops! Some error occurred while processing your payment. Please drop us a mail and we'll be on it.", 1);
                
            }
        }catch(error){
            console.log("Error in (successStuckDepositTxn) : ",error)
            helper.sendJSON(res, [], false, 500, "Internal server error", 0);
        }

    }
    async getDepositTrnxList(req:Request, res:Response){
        try {
            let page = +req.query.page || 0;
            let page_size = +req.query.page_size || 20
            let isAllPendingDepositTxn:any=req.query["isAllPendingDepositTxn"]
            console.log("isAllPendingDepositTxn :",isAllPendingDepositTxn)


            let condition:string
            let ispaginate:boolean=false

            if(isAllPendingDepositTxn==true){
                console.log("..all Pending Deposit TXN listing process initiated...")
                condition=`ptld.payStatus=${Constant["Payment"]["payStatus"]["TLD"]["Pending"]}`
                ispaginate=true
            }
            else{
                console.log("..last hour Deposit TXN listing process initiated...")
                condition=`ptld.createdAt > DATE_SUB(NOW(),INTERVAL 1 HOUR)`
            }
            let depositTrnxList= await paymentService.getDepositTrnxList(condition,page,page_size,ispaginate)

            if(depositTrnxList && depositTrnxList.length>0){
                console.log("...Sucessfully retrieved data of dposit Txn... ")
                helper.sendJSON(res, depositTrnxList, false, Constant.RESP_CODE.Success, "deposit txn data listed succesfully", 1);
            } else {
                console.log("...No Data Present in The DataBase...")
                helper.sendJSON(res,[],false,Constant.RESP_CODE.Success,"No trx data with this request",1)
            }
            
        } catch (error) {
            console.log("Error in (getDepositTrnxList) : ",error)
            helper.sendJSON(res, [], true, Constant.RESP_CODE['Internal Server Error'], "Internal server error", 0);
        }
    }
}
export default new PaymentCtrl();