
export interface IPaymentGatewayService {

	/**
	 * Initiate transaction  
	 * @param orderId 
	 * @param amount 
	 * @param userId 
	 * @param mobile 
	 */
	initiateTransaction(orderId: string, amount: string, userId: string, mobile: string): Promise<Object>;

	/**
	 * Get transaction token  
	 * @param reponse  
	 */
	getTxnToken(reponse: object): Promise<string>;

    /**
	 * Check transaction status 
	 * @param orderId 
	 */
	checkTransactionStatus(orderId: string): Promise<Object>;

	/**
	 * Check transaction status 
	 * @param reponse  
	 */
	isTxnStatusSuccess(response: object): Promise<boolean>;

	/**
	 * Check transaction status 
	 * @param reponse  
	 */
	isTxnStatusFailed(response: object): Promise<boolean>;

	/**
	 * Get transaction amount 
	 * @param reponse  
	 */
	getTxnAmount(response: object): Promise<string>;

	/**
	 * Get order id  
	 * @param reponse  
	 */
	getOrderId(response: object): Promise<string>;

	/**
	 * initiate refund  
	 * @param orderId 
	 * @param txnId 
	 * @param refId 
	 * @param refundAmount  
	 */
	initRefund(orderId: string, txnId: string, refId: string, refundAmount: string): Promise<Object>;

	/**
	 * Initiate transaction withdraw
	 * @param orderId 
	 * @param amount 
	 * @param userId 
	 * @param mobile 
	 */
	 initiateTransactionWithdraw(orderId: string, amount: string, userId: string, mobile: string): Promise<Object>;
}
