
export interface IAccountService {
    
    insertTransactionLog(trxLog: any): Promise<any>;
    updateTransactionLog(trxLog: any, condition: any): Promise<boolean>;
    createTrxLogRecord(trxLog: any): Promise<boolean>;
    getTrxLogForRefund(userId: any, pgRefNo: any, gameId: any, gameEngine: any, engineId: any): Promise<Array<{}>>;
    refundPayment(userId: any, pgRefNo: any, gameId: any, gameEngine: any, engineId: any): Promise<boolean>;
    isRefunded(pgRefNo: any, playerId: any): Promise<boolean>;
    getUnassignedTrxLog(senderId: any, receiverId: any, gameId: any, gameEngine: any, engineId: any): Promise<Array<{}>>;
    assignRefNoToTrxLog(id: any, pgRefNo: any): Promise<boolean>;
}
