import { IPaymentGatewayService } from "../service";
import PaytmChecksum from "paytmchecksum";
import request from "request-promise";
import { Endpoints, ResultStatus } from "./constants";
import { PaytmHelper } from "./helper";
import { ITxnStatusRequestBodyDTO, IInitTxnRequestBodyDTO, IInitTxnRequestWithdrawBodyDTO } from "./dtos";

export class PayTMService implements IPaymentGatewayService {

    private async makeRequest(url: string, method: string, body: any, headers: object): Promise<any> {
        const postData = JSON.stringify(body);
        const options = {
            url: url,
            method: method,
            body: postData,
            headers:headers
        };
        console.log("PayTM Request: ", options);
        const response = await request(options);
        const jsonResponse = JSON.parse(response);
        console.log("PayTM Response: ", jsonResponse);
        return jsonResponse;
    }

    public async initiateTransaction(orderId: string, amount: string, userId: string, mobile: string): Promise<Object> {
        let data: Object = null;
        try {
            let requestBody: IInitTxnRequestBodyDTO = await PaytmHelper.initTransactionRequestBuilder(orderId, amount, userId, mobile);
            const checksum: string = await PaytmChecksum.generateSignature(JSON.stringify(requestBody), process.env.PAYTM_MERCHANT_KEY);
            const paytmParams = {
                body: requestBody,
                head: {
                    signature: checksum
                }
            };
            const headers= {
                'Content-Type': 'application/json',
                'Content-Length': JSON.stringify(paytmParams).length
            }

            const url: string = process.env.PAYTM_HOST + Endpoints.INIT_TXN + `?mid=${requestBody.mid}&orderId=${requestBody.orderId}`;
            data = await this.makeRequest(url, "POST", paytmParams, headers);
            if (!await PaytmHelper.verifySignature(data)) {
                return new Error("PayTM signature verification failed!");
            }
            console.log("PayTM Signature successfully verified.");
        } catch (error) {
            console.log("Error: ", error);
        }
        return data;
    }

    public async checkTransactionStatus(orderId: string): Promise<Object> {
        let data: Object = null;
        try {
            let paytmParams: ITxnStatusRequestBodyDTO = await PaytmHelper.txnStatusRequestBuilder(orderId);
            const checksum: string = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams), process.env.PAYTM_MERCHANT_KEY);
            paytmParams = await PaytmHelper.txnStatusRequestBuilder(orderId, checksum);
            const url: string = process.env.PAYTM_HOST + Endpoints.TXN_STATUS;
            data = await this.makeRequest(url, "POST", paytmParams, null);
        } catch (error) {
            console.log("Error: ", error);
        }
        return data;
    }

    public async initRefund(orderId: string, txnId: string, refId: string, refundAmount: string): Promise<Object> {
        let data: Object = null;
        try {
            const paytmParams = {
                body: null,
                head: null,
            };
            paytmParams.body = await PaytmHelper.initRefundRequestBuilder(orderId, txnId, refId, refundAmount);
            const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), process.env.PAYTM_MERCHANT_KEY);
            paytmParams.head = {
                "signature": checksum
            };
            const url = process.env.PAYTM_HOST + Endpoints.REFUND;
            data = await this.makeRequest(url, "POST", paytmParams, null);
        } catch (error) {
            console.log("Error: ", error);
        }
        return data;
    }

    public async isTxnStatusSuccess(response: object): Promise<boolean> {
        return response && response["STATUS"] == ResultStatus.TXN_SUCCESS;
    }

    public async isTxnStatusFailed(response: object): Promise<boolean> {
        return response && response["STATUS"] == ResultStatus.TXN_FAILURE;
    }

    public async getTxnAmount(response: object): Promise<string> {
        return response["TXNAMOUNT"];
    }

    public async getOrderId(response: object): Promise<string> {
        return response["ORDERID"];
    }

    public async getTxnToken(response: object): Promise<string> {
        return response['body']['txnToken'];
    }

    public async initiateTransactionWithdraw(orderId: string, amount: string, userId: string, mobile: string): Promise<Object> {
        let data: Object = null;
        try {
            const requestBody: IInitTxnRequestWithdrawBodyDTO = await PaytmHelper.initTransactionWithdrawRequestBuilder(orderId, amount, userId, mobile);
            const checksum: string = await PaytmChecksum.generateSignature(JSON.stringify(requestBody), process.env.PAYTM_MERCHANT_KEY_W);
            
            const headers={
                'x-checksum': checksum,
                'x-mid':requestBody['mid'],
                'Content-Type': 'application/json',
                'Content-Length': JSON.stringify(requestBody).length
            };

            const url: string = process.env.PAYTM_HOST_W + Endpoints.INIT_TXN_WITHDRAW ;

            data = await this.makeRequest(url, "POST", requestBody, headers);
            
        } catch (error) {
            console.log("PayTM Withdraw Error: ", error);
        }
        return data;
    }

}

