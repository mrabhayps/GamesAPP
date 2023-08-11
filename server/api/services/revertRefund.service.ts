import models from '../models/index';
import sequelize from 'sequelize';
import config from '../../common/secret.config.json';
import readline from 'readline';
import Constant  from '../../common/app.constant';
import helper from '../../common/helper';
import { any } from 'bluebird';

/*
 * This is a command line application/script.
 * Objective: To revert the extra refunds, happened because of a bug in cron.
 */


// Set service name and timestamp in console log 
const log = console.log;

console.log = function () {
    const first_parameter = arguments[0];
    const other_parameters = Array.prototype.slice.call(arguments, 1);

    function formatConsoleDate (date: Date) {
        return 'RevertRefund  | ' +
                Utils.getDateTime(date) +
                ': ';
    }

    log.apply(console, [formatConsoleDate(new Date()) + first_parameter].concat(other_parameters));
};


/*
 * Utility class for all helper methods 
 */
export class Utils {

    static integerInputs = ['start', 'limit'];

    /* 
     * verify command line arguments 
     */
    public static verifyArgs = (args: any) => {
        const helpString = `Available arguments:\n--start: <start_offset>\n--limit: <limit_value>\n--password: <lock_key>`;
        if (args.hasOwnProperty('help')) {
            console.info(helpString);
            throw new Error(`help!`);
        }
        if (!args.hasOwnProperty('start') || !args.hasOwnProperty('limit') || !args.hasOwnProperty('password')) {
            console.info(helpString);
            throw new Error(`Insufficient arguments passed!`);
        }
        if (args.hasOwnProperty('password') && args.password != '2090') {
            throw new Error(`UnAuthorized Access! Invalid password entered.`);
        }
    }

    /* 
     * get formatted command line arguments 
     */
    public static getArgs = () => {
        const args: any = {};
        process.argv
            .slice(2, process.argv.length)
            .forEach( arg => {
            // long arg
            if (arg.slice(0,2) === '--') {
                const longArg = arg.split('=');
                const longArgFlag = longArg[0].slice(2,longArg[0].length);
                const longArgValue = longArg.length > 1 ? longArg[1] : true;
                if (Utils.integerInputs.includes(longArgFlag)) 
                    args[longArgFlag] = parseInt(longArgValue===true?'':longArgValue);
                else
                    args[longArgFlag] = longArgValue;
            }
            // flags
            else if (arg[0] === '-') {
                const flags = arg.slice(1,arg.length).split('');
                flags.forEach(flag => {
                args[flag] = true;
                });
            }
        });
        Utils.verifyArgs(args);
        return args;
    }

    /*
     * get current date time formatted string 
     */
    public static getDateTime = (date: Date) => {
        const hour = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        const milliseconds = date.getMilliseconds();
        const d = date.getDate();
        const month = date.getMonth()+1;
        const year = date.getFullYear();

        return ((year < 10) ? '0' + year: year) +
                '-' +
                ((month < 10) ? '0' + month: month) +
                '-' +
                ((d < 10) ? '0' + d: d) +
                'T' + 
                ((hour < 10) ? '0' + hour: hour) +
                ':' +
                ((minutes < 10) ? '0' + minutes: minutes) +
                ':' +
                ((seconds < 10) ? '0' + seconds: seconds) +
                '.' +
                ('00' + milliseconds).slice(-3);
    }

    /* 
     * Function to prompt user for cross verifying the run config 
     */
    public static askQuestion = (query: string) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        return new Promise(resolve => rl.question(query, ans => {
            rl.close();
            resolve(ans);
        }));
    }
}


// Offset enum 
export class Offset {
    start = 0;
    limit = 1;

    constructor(start: number, limit: number) {
        this.start = start;
        this.limit = limit;
    }
}


// The actual revert refund code starts here 
export class RevertRefund {

    revertRequestType: number;
    successPayStatus: number;
    withdrawAccount: number;
    limit: number;
    start: number;

    constructor(offset: Offset) {
        this.revertRequestType = 70;
        this.successPayStatus = 10;
        this.withdrawAccount = 20;
        this.shouldTheProcessStart(offset);
    }

    private shouldTheProcessStart(offset: Offset) {
        this.setRunModeSettings(offset).then(ans => {
            console.log(`Got your ans here:`, ans);
            if (ans && ans == 'yes') {
                console.log(`Awesome! Starting the process..`);
                this.init().then(d => { console.log(`Exiting from script now! See you!!`) });
            } else {
                console.log(`Okay then! Please correct them and restart. B'bye!`);
            }
        }).catch(err => {
            console.log("Top Level Error: ", err);
        });
    }

    private async setRunModeSettings(offset: Offset) {
        this.start = offset.start;
        this.limit = offset.limit;
        console.log(`Configured this offset: `, offset);
        console.log(`Revert Configuration: `, this);
        console.log(`With these settings it will process total: ${this.limit} cases starting from offset: ${this.start}.`);
        console.log(`Is 'duplicate' column created in gmsPaymentTransactionLogWithdraw table ?`);
        console.log(`Are you okay, this process marking duplicate refunds as true ?`);
        return await Utils.askQuestion(`Are these settings correct and all answers are affirmative ? yes/N: `);
    }

    async getUserAccount(userId: number, accountType: number) {
        return await models.sequelize.query(
            `select id,balance from gmsUserAccount where fkUserId=${userId} and acType=${accountType}`,
            { type: sequelize.QueryTypes.SELECT}
        );
    }

    async getUserAccountV1(userId: number, accountType: number ) {
        let balField=Constant.Payment.BAL_KEY[accountType];
        /*return await models.sequelize.query(
            `select id,${balField} as balance from gmsUserAccounts where fkUserId=${userId}`,
            { type: sequelize.QueryTypes.SELECT}
        );*/

        
        let data = await helper.gmsUserAccountGet(userId);
        return +data[balField];
    }

    async newTransactionLogWithdraw(senderId: number, receiverId: number, amount: number, pgRefNo: any, gameId: number, gameEngine: number, engineId: number, senderAccountNo: number, receiverAccountNo: number) {
        return {
            fkSenderId: senderId, 
            fkReceiverId: receiverId,
            amount: amount,
            senderClosingBalance: 0,
            receiverClosingBalance: 0,
            requestType: this.revertRequestType,
            payStatus: this.successPayStatus,
            pgRefNo: pgRefNo,
            fkGameId: gameId,
            gameEngine: gameEngine,
            engineId: engineId,
            senderAcNum: senderAccountNo,
            receiverAcNum: receiverAccountNo
        };
    }

    // @todo: incomplete and not using  
    async isRevertedRefundWithdraw(pgRefNo: any, userId: number){
        const receiverId = config.financialUser.Settlement;
        const data = await models.sequelize.query(
            `select count(*) as cnt from gmsPaymentTransactionLogWithdraw where 
            fkSenderId=${userId} and fkReceiverId=${receiverId} and pgRefNo=${pgRefNo} and 
            requestType in (${this.revertRequestType}) `, { type: sequelize.QueryTypes.SELECT});
        return data[0]['cnt'] >= 1 ? true : false;
    }
 
    async getDuplicateRefundDetails() {
        let duplicateRefunds = [];
        try {
            duplicateRefunds = await models.sequelize.query(
                `SELECT pgRefNo, fkReceiverId, requestType, sum(amount)-amount as extraRefundAmount, createdAt, count(*) AS cnt  
                FROM gmsPaymentTransactionLogWithdraw 
                WHERE pgRefNo!='' and requestType=50 GROUP BY pgRefNo, fkReceiverId HAVING cnt>1 ORDER BY cnt ASC 
                LIMIT ${this.start}, ${this.limit} `, { type: sequelize.QueryTypes.SELECT });
        } catch (error) {
            console.log("Exception: > ", error);
        }
        return duplicateRefunds;
    }

    async getAllDuplicateRecords(pgRefNo: number, receiverId: number) {
        let records = [];
        try {
            records = await models.sequelize.query(
                `SELECT * FROM gmsPaymentTransactionLogWithdraw 
                WHERE pgRefNo=${pgRefNo} and fkReceiverId=${receiverId} and requestType=50 
                ORDER BY id ASC LIMIT 1, 5000`, { type: sequelize.QueryTypes.SELECT });
        } catch (error) {
            console.log("Exception: > ", error);
        }
        return records;
    }

    // this is tested and working for negative amount as well 
    // if passed negative amount, it does deduct the balance 
    async addBalanceToUserAccount(userId: number, accountType: number, amount: number) {
        return await models.sequelize.query(
            `update gmsUserAccount set balance=balance+${amount} where fkUserId=${userId} and 
            acType=${accountType} limit 1`, { type: sequelize.QueryTypes.UPDATE });
    }
    async addBalanceToUserAccountV1(userId: number, accountType: number, amount: number,from=null) {
        let balField=Constant.Payment.BAL_KEY[accountType];
       
        /*return await models.sequelize.query(
            `update gmsUserAccounts set ${balField}=${balField}+${amount} where fkUserId=${userId} limit 1`, { type: sequelize.QueryTypes.UPDATE });*/
        
        let amountData:any={};
        amountData[balField]=amount;

        let updateBalData:any={
            "playerId":userId,
            "amountData" : amountData,
            "type": "inc"
        }
        return await helper.gmsUserAccountCreateOrUpdateWallet(updateBalData)
    }

    async insertTransactionLogWithdraw(object: any) {
        return await models.gmsPaymentTransactionLogWithdraw.build(object).save();
    }

    // @todo: create this duplicate column in database with default value of false 
    async markItDuplicate(id: number) {
        return await models.sequelize.query(
            `update gmsPaymentTransactionLogWithdraw set duplicate=true where id=${id}`, 
            { type: sequelize.QueryTypes.UPDATE });
    }

    // @todo: incomplete 
    async init() {
        try {
            const settlementAccountId = config.financialUser.Settlement;
            
            const duplicateRefunds = await this.getDuplicateRefundDetails();
            for (let i = 0; duplicateRefunds && i < duplicateRefunds.length; i++) {
                try {
                    // 0. Gather required information 
                    const thisRef = duplicateRefunds[i];
                    const userId = thisRef.fkReceiverId;
                    // let userWithdrawAccount = await this.getUserAccount(userId, this.withdrawAccount);
                    // let settlementWithdrawAccount = await this.getUserAccount(settlementAccountId, this.withdrawAccount);
                    
                    let userWithdrawAccount = await this.getUserAccountV1(userId, this.withdrawAccount);
                    let settlementWithdrawAccount = await this.getUserAccountV1(settlementAccountId, this.withdrawAccount);

                    console.log(`#Before# User Id: ${userId} Balance: ${userWithdrawAccount[0]['balance']}`);
                    console.log(`#Before# Settlement Id: ${settlementAccountId} Balance: ${settlementWithdrawAccount[0]['balance']}`);

                    console.log(`-------------------------------------------------`);
                    console.log(`#${i+1}# ##pgRefNo:fkRceiverId::${thisRef.pgRefNo}:${userId}## Count: ${thisRef.cnt-1} # ExtraRefundAmount: ${thisRef.extraRefundAmount} ## Processing Grouped.`);
                    
                    const dupRecords = await this.getAllDuplicateRecords(thisRef.pgRefNo, userId);
                    for (let r = 0; dupRecords && r < dupRecords.length; r++) {
                        try {
                            const thisRecord = dupRecords[r];
                            console.log(`.....................................`);
                            console.log(`#${thisRecord.id}# Processing #${r+1}/${thisRef.cnt-1}.. thisRecord, id: ${thisRecord.id} pgRefNo: ${thisRecord.pgRefNo} fkReceiverId: ${thisRecord.fkReceiverId} Amount: ${thisRecord.amount} CreatedAt: ${thisRecord.createdAt} RequestType: ${thisRecord.requestType}`);
                            
                            // 0. check if already processed 
                            if (thisRecord.duplicate && thisRecord.duplicate == 1) {
                                console.log(`#${thisRecord.id}# It's already processed, so skipping it. #${r+1}/${thisRef.cnt-1}`);
                                console.log(`.....................................`);
                                continue;
                            }
                            
                            // 1. for each refund, create a revert refund record 
                            const newRevertRecord = await this.newTransactionLogWithdraw(
                                thisRecord.fkReceiverId, settlementAccountId, thisRecord.amount, 
                                thisRecord.pgRefNo, thisRecord.fkGameId, thisRecord.gameEngine, 
                                thisRecord.engineId, userWithdrawAccount[0]['id'], 
                                settlementWithdrawAccount[0]['id']
                            );
                            
                            // 2. insert into transaction log withdraw 
                            const isInserted = await this.insertTransactionLogWithdraw(newRevertRecord);
                            
                            // 3. update user withdraw account balance 
                            // 4. update settlement withdraw account balance 
                            if (isInserted) {
                                console.log(`#${thisRecord.id}# Inserted revert record for id: ${thisRecord.id}`);
                                console.log(`#${thisRecord.id}# New Revert record: `, JSON.stringify(newRevertRecord));
                                
                                const negAmount = 0 - newRevertRecord.amount;

                                let from:any={};
                                from['reason']="REVERT_BALANCE";
                                from['txnLogId']=isInserted['dataValues']['id'];
                                // await this.addBalanceToUserAccount(userId, this.withdrawAccount, negAmount);
                                await this.addBalanceToUserAccountV1(userId, this.withdrawAccount, negAmount,from);
                                console.log(`#${thisRecord.id}# Deducted balance: ${newRevertRecord.amount} from user's (${userId}) withdraw account.`);

                                //await this.addBalanceToUserAccount(settlementAccountId, this.withdrawAccount, newRevertRecord.amount);
                                await this.addBalanceToUserAccountV1(settlementAccountId, this.withdrawAccount, newRevertRecord.amount,from);
                                console.log(`#${thisRecord.id}# Added balance: ${newRevertRecord.amount} to GA settlement (${settlementAccountId}) withdraw account.`);

                                await this.markItDuplicate(thisRecord.id);
                                console.log(`#${thisRecord.id}# Marked it duplicate.`);

                                console.log(`#${thisRecord.id}# Finished Processing! #${r+1}/${thisRef.cnt-1}`);
                                console.log(`.....................................`);
                            } else {
                                throw new Error(`ERROR: Revert record was not inserted: ${newRevertRecord}`);
                            }
                        } catch (e1) {
                            console.log("Exception1: > ", e1);
                        }
                    }
                    console.log(`#${i+1}# ##pgRefNo:fkRceiverId::${thisRef.pgRefNo}:${userId}## Finished Processing Group.`);
                    console.log(`-------------------------------------------------`);

                    // userWithdrawAccount = await this.getUserAccount(userId, this.withdrawAccount);
                    // settlementWithdrawAccount = await this.getUserAccount(settlementAccountId, this.withdrawAccount);
                    
                    userWithdrawAccount = await this.getUserAccountV1(userId, this.withdrawAccount);
                    settlementWithdrawAccount = await this.getUserAccountV1(settlementAccountId, this.withdrawAccount);

                    console.log(`#After# User Id: ${userId} Balance: ${userWithdrawAccount[0]['balance']}`);
                    console.log(`#After# Settlement Id: ${settlementAccountId} Balance: ${settlementWithdrawAccount[0]['balance']}`);
                } catch (e2) {
                    console.log("Exception2: > ", e2);
                }
            }
        } catch (e3) {
            console.log("Exception3: > ", e3);
        }
    }
}

const args = Utils.getArgs();
if (args) {
    const offset = new Offset(args.start, args.limit);
    const revertRefund = new RevertRefund(offset);
}

