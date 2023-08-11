
export enum Endpoints {
    INIT_TXN = "/theia/api/v1/initiateTransaction",
    TXN_STATUS = "/order/status",
    REFUND = "/refund/apply",
    REFUND_STATUS= "/v2/refund/status",
    CALLBACK_URL="/theia/paytmCallback?ORDER_ID=",
    INIT_TXN_WITHDRAW="/bpay/api/v1/disburse/order/wallet/gratification",
    CALLBACK_URL_WITHDRAW="/CallBackURL"
};

export enum TxnType {
    REFUND = "REFUND",
    PREAUTH = "PREAUTH",
    RELEASE = "RELEASE",
    CAPTURE = "CAPTURE",
    WITHDRAW = "WITHDRAW",
};

export enum ChannelId {
    WEB = "WEB",
    WAP = "WAP",
};

export enum RequestType {
    Payment = "Payment",
    UNI_PAY = "UNI_PAY",
};

export enum Version {
    V1 = "v1",
};

export enum ResultStatus {
    TXN_SUCCESS = "TXN_SUCCESS",
    TXN_FAILURE = "TXN_FAILURE",
    PENDING = "PENDING",    
};

export enum InitTxnResultStatus {
    TXN_SUCCESS = "S",
    TXN_FAILURE = "F",
    UNKNOWN = "U",    
};

