
/*
 * Parent levels requests 
 */
export interface IPayTMHeaderDTO {
    version?: string,
    channelId?: string,
    requestTimestamp?: string,
    clientId?: string,
    signature: string,
}

interface IPayTMRequestBodyDTO { 
    mid: string,
    orderId: string,
}


/*
 * API specific requests 
 */
export interface ITxnStatusRequestBodyDTO {
    MID: string,
    ORDERID: string,
    CHECKSUMHASH?: string,
    TXNTYPE?: string,
}

export interface ITxnStatusV1RequestBodyDTO extends IPayTMRequestBodyDTO {
    txnType?: string,
}

export interface IRefundRequestBodyDTO extends IPayTMRequestBodyDTO {
    refId: string,
    txnId: string,
    refundAmount: string,
    txnType: string,
    comments?: string,
    preferredDestination?: string
}

export interface IInitTxnRequestBodyDTO extends IPayTMRequestBodyDTO {
    requestType: string,
    websiteName: string,
    txnAmount: ITxnAmountDTO,
    userInfo: IUserInfoDTO,
    promoCode?: string,
    callbackUrl?: string
}


/*
 * API request's childs  
 */
export interface ITxnAmountDTO {
    value: string,
    currency: string,
}

export interface IUserInfoDTO {
    custId: string,
    mobile?: string,
    email?: string,
    firstName?: string,
    lastName?: string,
}


export interface IInitTxnRequestWithdrawBodyDTO {
    subwalletGuid: string,
    mid: string,
    orderId: string,
    amount: string,
    beneficiaryPhoneNo: string,
    callbackUrl?: string
}

