export interface TrxLogRecord {
    fkSenderId: any,
    fkReceiverId: any,
    amount: any,
    requestType: any,
    payStatus: any,
    senderClosingBalance: any,
    receiverClosingBalance: any,
    pgRefNo: any,
    fkGameId: any,
    gameEngine: any,
    engineId: any,
    senderAcNum?: any,
    receiverAcNum?: any,
    bankRefNo?: any,
    apiMsg?: any,
    event?: any,
    remarks? :any,
    description?:any,
    masterGameSession?: any,
}
