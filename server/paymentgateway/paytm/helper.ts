import { Endpoints, RequestType, TxnType } from "./constants";
import { IInitTxnRequestBodyDTO, IRefundRequestBodyDTO, ITxnStatusRequestBodyDTO, IUserInfoDTO, ITxnAmountDTO, IInitTxnRequestWithdrawBodyDTO } from "./dtos";
import PaytmChecksum from "paytmchecksum";

export class PaytmHelper {

    public static async initTransactionRequestBuilder(orderId: string, amount: string, userId: string, mobile: string): Promise<IInitTxnRequestBodyDTO> {
        const userInfo: IUserInfoDTO = {
            custId: userId, 
            mobile: mobile
        };
        const txnAmount: ITxnAmountDTO = {
            value: amount,
            currency: "INR"
        };
        return <IInitTxnRequestBodyDTO> {
            requestType: RequestType.Payment,
            mid: process.env.PAYTM_MERCHANT_ID,
            orderId: orderId,
            websiteName: process.env.PAYTM_WEBSITE,
            userInfo: userInfo,
            txnAmount: txnAmount,
            callbackUrl: process.env.PAYTM_HOST + Endpoints.CALLBACK_URL + orderId
        };
    }

    public static async txnStatusRequestBuilder(orderId: string, checksumHash?: string): Promise<ITxnStatusRequestBodyDTO> {
        if (checksumHash)
            return <ITxnStatusRequestBodyDTO> {
                MID: process.env.PAYTM_MERCHANT_ID,
                ORDERID: orderId,
                CHECKSUMHASH: checksumHash
            };
        else 
            return <ITxnStatusRequestBodyDTO> {
                MID: process.env.PAYTM_MERCHANT_ID,
                ORDERID: orderId
            };
    }

    public static async initRefundRequestBuilder(orderId: string, txnId: string, refId: string, refundAmount: string): Promise<IRefundRequestBodyDTO> {
        return <IRefundRequestBodyDTO> {
            refId: refId,
            txnId: txnId,
            refundAmount: refundAmount,
            txnType: TxnType.REFUND,
            comments: "Refund request from Gamesapp on behalf of user"
        }
    }

    public static async verifySignature(response: object): Promise<boolean> {
        return PaytmChecksum.verifySignature(JSON.stringify(response['body']), process.env.PAYTM_MERCHANT_KEY, response['head']['signature']);
    }
    
    public static async initTransactionWithdrawRequestBuilder(orderId: string, amount: string, userId: string, mobile: string): Promise<IInitTxnRequestWithdrawBodyDTO> {
        return <IInitTxnRequestWithdrawBodyDTO> {
            subwalletGuid:process.env.PAYTM_SUB_WALLET_GUID_W,
            mid: process.env.PAYTM_MERCHANT_ID_W,
            orderId:orderId,
            amount:amount,
            beneficiaryPhoneNo:mobile,
            callbackUrl: process.env.PAYTM_TRX_STATUS
        };
    }
}