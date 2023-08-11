
/*
 * Parent levels responses  
 */
interface IPayTMResponseBodyDTO {
    resultInfo?: IResultInfoDTO,
}


/*
 * API specific responses  
 */
export interface ITxnStatusResponseBodyDTO extends IPayTMResponseBodyDTO {
    MID: string,
    TXNID: string,
    ORDERID: string,
    BANKTXNID: string,
    TXNAMOUNT: string,
    STATUS: string,
    RESPCODE: string,
    RESPMSG: string,
    TXNDATE: string,
    GATEWAYNAME: string,
    BANKNAME: string,
    PAYMENTMODE: string,
    TXNTYPE: string
    REFUNDAMT: string,
    SUBS_ID: string,
    PAYABLE_AMOUNT: string,
    PAYMENT_PROMO_CHECKOUT_DATA: string,
}

export interface ITxnStatusV1ResponseBodyDTO extends IPayTMResponseBodyDTO {
    txnId: string,
    bankTxnId: string,
    orderId: string,
    txnAmount: string,
    txnType: string,
    gatewayName: string,
    bankName: string,
    mid: string,
    paymentMode: string,
    refundAmount: string,
    txnDate: string,
    subsId: string,
    payableAmount: string
    paymentPromoCheckoutData: string,
}

export interface IRefundResponseBodyDTO extends IPayTMResponseBodyDTO {
    mid: string,
    orderId: string,
    refId: string,
    refundAmount: string,
    refundId: string,
    txnId: string,
    txnTimestamp: string,
}

export interface IInitTxnResponseBodyDTO extends IPayTMResponseBodyDTO {
    txnToken: string,
    isPromoCodeValid: boolean,
    extraParamsMap: object,
    authenticated: boolean,
}


/*
 * API response's childs  
 */
interface IResultInfoDTO {
    resultCode: string,
    resultStatus: string,
    resultMsg: string,
    isRedirect: boolean,
    bankRetry: boolean,
    retry: boolean,
}

