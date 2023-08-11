import request from 'request';
import crypto from 'crypto';

import CommonHelper from '../../../common/helper';
import Constant  from '../../../common/app.constant';
import WithdrawAccountService from './withdrawaccount.service';
import helper from './helper';
import EncryptDecryptIndusInd  from '../../../common/encDECInducind';
import * as secretConfig  from '../../../common/secret.config.json';

const config: any = secretConfig;

// This should be implemented with an Interface, whenever we integrate some other bank/payout partner, let's plan and put an Interface here. 
export class IndusIndBankService {

    async iblWithdraw(userDetail: any, userBankDetails: any, tlId: any, amount: any) {
        var trx:any={};
        trx.Customerid=config.iblTrx.customerId;
        trx.TransactionType="IMPS"
        trx.CustomerRefNumber=await CommonHelper.generateCustomerRefNum()//need to generate on every trx.
        trx.DebitAccountNo=config.iblTrx.debitedAcNum;
        trx.BeneficiaryName=userBankDetails[0]['nameInBank'];
        trx.CreditAccountNumber=userBankDetails[0]['accountNumber'];
        trx.BeneficiaryBankIFSCCode=userBankDetails[0]['ifsc'];
        trx.TransactionAmount=amount;
        trx.BeneficiaryMobileNumber=userDetail['mobile'];
        trx.EmailID="abhay@gamesapp.com";//User Email-ID
        trx.Reserve1=userDetail['verificationUserId'];
        trx.Reserve2="";
        trx.Reserve3="";

        var iblTrxReq={
            "url": config.iblTrx.processTrx,
            "method": 'POST',
            "headers":{
                "content-type":"application/json",
                "x-ibm-client-id":config.iblTrx.iblClientId,
                "x-ibm-client-secret":config.iblTrx.iblClientSecret
            },
            "json":trx
        }
        //console.log(iblTrxReq);
        let retData:any={};
        return await new Promise((resolve,reject)=>{
            request(iblTrxReq, async (err, resp, body) => {
                if(err){
                    console.log(err);
                    retData.statusCode=500;
                    retData.status="Unable to generate Outward";
                    reject(retData);
                }
                else{
                    console.log(resp);
                    var iblResp=resp.body;
                    var TransactionLogWithdrawUpdate:any={};
                    TransactionLogWithdrawUpdate.customerRefNum=trx.CustomerRefNumber;
                    TransactionLogWithdrawUpdate.iblRefNo=iblResp.IBLRefNo;
                    TransactionLogWithdrawUpdate.bankRefNo=iblResp.UTRNo;
                    TransactionLogWithdrawUpdate.apiMsg=JSON.stringify(iblResp);
                    
                    
                    

                    retData.pgRefNo=TransactionLogWithdrawUpdate.pgRefNo;
                    retData.type="DEBIT";
                    retData.updatedAt=new Date();
                    retData.from="WITHDRAW";
                    retData.to="Withdraw to bank"
                    retData.description="Transaction to bank account."
                    retData.statusCode=iblResp.StatusCode;
                    retData.status=iblResp['StatusDesc'];
                    retData.amount=amount;

                    if(iblResp.StatusCode=='R000' && iblResp.UTRNo != ''){
                        TransactionLogWithdrawUpdate.payStatus=Constant.Payment.payStatus.TLW.Success;    
                    }
                    let updateTL=await WithdrawAccountService.updateTransactionLog(TransactionLogWithdrawUpdate,{"id":tlId});
                    if(!updateTL)
                        console.log("Unable to update transaction log ");
                    resolve(retData);
                }
            });
        }) 
    }

    async iblWithdraw1(userDetail: any, userBankDetails: any, tlId: any, amount: any, txnDetails=null) {
        
        const randomAesKey = crypto.randomBytes(32).toString('hex');
        console.log({randomAesKey});

        var trx:any={};
        trx.Customerid=config.iblTrx.customerId;
        trx.TransactionType="IMPS"
        trx.CustomerRefNumber=await CommonHelper.generateCustomerRefNum()//need to generate on every trx.
        trx.DebitAccountNo=config.iblTrx.debitedAcNum;
        trx.BeneficiaryName=userBankDetails[0]['nameInBank'];
        trx.CreditAccountNumber=userBankDetails[0]['accountNumber'];
        trx.BeneficiaryBankIFSCCode=userBankDetails[0]['ifsc'];
        trx.TransactionAmount=amount;
        trx.BeneficiaryMobileNumber=userDetail['mobile'];
        trx.EmailID=userDetail['email'];
        trx.Reserve1=userDetail['verificationUserId'];
        trx.Reserve2="";
        trx.Reserve3="";

        let requestObject:any = {};
        requestObject['data'] = await EncryptDecryptIndusInd.encryptData(randomAesKey,trx);
        requestObject['key'] = await EncryptDecryptIndusInd.encryptKey(randomAesKey);
        requestObject['bit'] = 0;

        let SaveExternalAPICall;
        if(amount > 1) // Ignore to log Bank verification APi Call log.
            SaveExternalAPICall = await CommonHelper.saveExternalAPICallRequestLog(userDetail['id'], "INDUSIND_WITHDRAW_TXN", config.iblTrx.processTrx, trx);

        var iblTrxReq={
            "url": config.iblTrx.processTrx,
            "method": 'POST',
            "headers":{
                "content-type":"application/json",
                "IBL-Client-Id":config.iblTrx.iblClientId,
                "IBL-Client-Secret": config.iblTrx.iblClientSecret
            },
            "json":requestObject
        }
        console.log("Request for txn id : "+tlId+ " is ", iblTrxReq);

        let retData:any={};
        try{
            retData = await new Promise((resolve,reject)=>{
                let TransactionLogWithdrawUpdate:any={};
                request(iblTrxReq, async (err, resp, body) => {
                    if(err){
                        console.log(err);
                        retData.statusCode=500;
                        retData.status="Unable to generate Outward";
                        if(amount>1)
                            await CommonHelper.updateExternalAPICallResponseLog(SaveExternalAPICall['id'],body,resp.statusCode);

                        TransactionLogWithdrawUpdate.description= await helper.preparedDescription("WITHDRAW",Constant.Payment.payStatus.TLW.Failed,(amount + (txnDetails['tds'] ? txnDetails['tds'] : 0)), userBankDetails[0]);
                        TransactionLogWithdrawUpdate.apiMsg=JSON.stringify(retData);
                        TransactionLogWithdrawUpdate.payStatus=Constant.Payment.payStatus.TLW.Failed;
                        TransactionLogWithdrawUpdate.customerRefNum=trx.CustomerRefNumber;
                        let updateTL=await WithdrawAccountService.updateTransactionLog(TransactionLogWithdrawUpdate,{"id":tlId});

                        if(!updateTL){
                            console.log("Unable to update withdraw txn log .")
                        }
                        reject("Unable to generate Outward, PG API call failed.");
                    }
                    else{

                        let decryptedData = await EncryptDecryptIndusInd.decryptData(randomAesKey,resp.body.data);
                        let iblResp=JSON.parse(decryptedData);

                        if(amount>1)
                            await CommonHelper.updateExternalAPICallResponseLog(SaveExternalAPICall['id'],iblResp,resp.statusCode);

                        TransactionLogWithdrawUpdate.customerRefNum=trx.CustomerRefNumber;
                        TransactionLogWithdrawUpdate.iblRefNo=iblResp.IBLRefNo;
                        TransactionLogWithdrawUpdate.bankRefNo=iblResp.UTRNo;
                        TransactionLogWithdrawUpdate.utrNo=iblResp.UTRNo;
                        TransactionLogWithdrawUpdate.apiMsg=JSON.stringify(iblResp);
                        
    
                        retData.pgRefNo=TransactionLogWithdrawUpdate.pgRefNo;
                        retData.type="DEBIT";
                        retData.updatedAt=new Date();
                        retData.from="WITHDRAW";
                        retData.to="Withdraw to bank"
                        retData.description="Transaction to bank account."
                        retData.statusCode=iblResp.StatusCode;
                        retData.status=iblResp['StatusDesc'];
                        retData.amount=amount;
                        
			            // iblResp.StatusCode="R000";
		       	        // iblResp.UTRNo = "tlId";

                        if(iblResp.StatusCode=='R000' && iblResp.UTRNo != ''){
                            retData.statusCode='R000';
                            TransactionLogWithdrawUpdate.description= await helper.preparedDescription("WITHDRAW",Constant.Payment.payStatus.TLW.Success,amount,userBankDetails[0],txnDetails['tds']? txnDetails['tds'] : 0 );
                            TransactionLogWithdrawUpdate.payStatus=Constant.Payment.payStatus.TLW.Success;    
                        }
                        let updateTL=await WithdrawAccountService.updateTransactionLog(TransactionLogWithdrawUpdate,{"id":tlId});
                        if(!updateTL)
                            console.log("Unable to update transaction log ");
                        resolve(retData);
                    }
                });//End of request
            }); //End of Promise
            return retData;
        }//End of Try
        catch(error){
            console.log("Error in iblWithdraw1 ", error);
            return retData;
        }//End of Catch
    }
}

export default new IndusIndBankService();
