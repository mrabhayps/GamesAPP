export class Constant {

    readonly Battle = {
        "Inactive": 0,
        "Upcomming": 50,
        "Live": 100,
        "BattleRoom": {
            "RoomCreated": 100,
            "PrivateRoomCreated": 110,
            "BothPlayerMatch": 150,
            "RoomLock": 200,
            "Rejected": 250,
            "GameFinished": 300,
            "GameDraw": 350,
            "Interrupted": 400
        },
        "BattleResultStatus": {
            "Winner": 10,
            "Looser": 20,
            "Draw": 30,
            "Cancled": 40
        }

    };

    readonly GAME_TOURNAMENT = {
        "TOURNAMENT": {
            "UPCOMMING": 10,
            "LIVE": 20,
            "CANCELLED": 30,
            "COMPLETED": 40,
            "ENTRY_FEE_REFUND": 50,
            "PRIZE_DISTRIBUTED": 60,
            "ENTRY_FEE_CREDITED": 70,
            "WIN_AMOUNT_CREDITED": 80
        },
        "TOURNAMENT_PLAYER": {
            "STATUS": {
                "INITIATED": 10,
                "PLAYING": 15,
                "COMPLETED": 20,
                "INTERUPTED": 30
            },
            "PD_STATUS": {
                "WIN_AMOUNT": 10,
                "ENTRY_FEE": 20,
                "LOOSER": 30,
                "ENTRY_FEE_CR": 40,
                "WIN_AMOUNT_CR": 50
            }
        }
    };

    readonly FriendRequestStatus = {
        "Requested": 1,
        "Accepted": 2,
        "Rejected": 3
    };
    readonly TabularGames = {
        "GameStatus": {
            "Created": 100,
            "Full": 200,
            "Started": 300,
            "EndingSoon": 400,
            "Completed": 500,
            "Cancelled": 600,
            "Failed": 700
        },
        "PlayerStatus": {
            "Joined": 100,
            "Added": 200,
            "Left": 300,
            "Rejected": 400,
            "Failed": 500
        },
        "GameSession": {
            "Created": 100,
            "Full": 200,
            "Started": 300,
            "EndingSoon": 400,
            "Completed": 500,
            "Cancelled": 600,
            "Failed": 700
        },
        "TableStatus": {
            "ACTIVE": 1,
            "INACTIVE": 0
        },
        "gameTableType": {
            "PUBLIC": 100,
            "PRIVATE": 200
        },
        "inviteStatus": {
            "SENT": 100,
            "ACCEPTED": 200,
            "REJECTED": 300
        },
        "Events": {
            "PLAYER_WIN": "PLAYER_WIN",
            "PLAYER_BET": "PLAYER_BET",
            "AUTO_REFILL": "AUTO_REFILL"
        },
        "CoinsRefillThreshold": 5
    };
    readonly FantacyCricket = {
        "MatchStatus": {
            "schedule": 1,
            "complete": 2,
            "live": 3,
            "acnr": 4 //Abandoned, canceled, no result
        }
    };

    readonly Path = {
        "gameicon": "https://img.gamesapp.com/gameicon"
    };

    readonly imageResolution = ["HDPI", "MDPI", "XHDPI", "XXHDPI", "XXXHDPI"];

    readonly msgConfig = {
        "totalParticipentIsLessThenMin": "Minimum {{X}} teams need to be registered for prices to be distributed",
        "ContestCancledMsgList": "YOUR CONTEST HAS BEEN CANCELLED, MONEY HAS BEEN REFUNDED TO YOUR ACCOUNT",
        "ContestCancledMsgLB": "Your contest has been cancelled due to less number of registrations. You money has been refunded to your account."
    }

    readonly Payment = {
        "AccType": {
            "Deposit": 10,
            "Withdraw": 20,
            "Token": 30,
            "Bonus": 40,
            "Coins": 50,
            "Referral": 60
        },
        "BAL_KEY":{
            "10":"depositBal",
            "20":"withdrawalBal",
            "30":"tokenBal",
            "40":"bonusBal",
            "50":"coinBal",
            "60":"referralBal",
        },
        "trxType": {
            "Credit": 1,
            "Debit": 2
        },
        "trxTypeNew": {
            "Credit": "inc",
            "Debit": "dec"
        },
        "reqType": {
            "TLD": {
                "Inward": 10,
                "GamePlay": 20,
                "Rewards": 30,
                "GameRefund": 40,
                "TFGRefund": 42,
                "TokenPurchase": 50,
                "WinningPrize": 60,
                "AutoRefill": 100
            },
            "TLW": {
                "Outward": 10,
                "GamePlay": 20,
                "WinningPrize": 30,
                "CommissionCharge": 40,
                "TFGRefundToPlAc": 42,
                "RefundToPlAc": 50,
                "RefundOutwardAfterFailed": 60,
                "RejectOutward": 70,
                "AutoRefill": 100,
                "Referral": 120,
                "ReferralDepositBonusCreators" : 122
            },
            "TLT": {
                "Rewards": 10,
                "GamePlay": 20,
                "TokenPurchase": 30
            },
            "TLB": {
                "Inward": 10,
                "GamePlay": 20,
                "Rewards": 30,
                "GameRefund": 40,
                "TFGRefund": 42,
                "TokenPurchase": 50,
                "WinningPrize": 60,
                "ScratchCard": 70,
                "AutoRefill": 100,
                "Streaks": 110,
                "Referral": 120,
                "ReferralDepositBonus" : 123,
                "GemsReedems": 125,
                "GemsBonus": 126,
                "WeeklyTop10UserBonus": 127,
                "Cashback": 150
            },
            "TLC": {
                "Inward": 10,
                "Outward": 30,
                "GameRefund": 40,
                "CommissionCharge": 50,
                "WinningPrize": 60,
                "InGameCredit": 80,
                "InGameDebit": 90,
                "AutoRefill": 100
            },
            "TLR": {
                "Inward": 10,
                "Rewards": 30,
                "WinningPrize": 60
            },
            "TABLE_GAME": {
                20:"Entry Fee",
                30:"Won",
                40:"Refund",
                50:"Lost",
                60:"Refund Draw"
            }
        },
        "payStatus": {
            "TLD": {
                "Success": 10,
                "Failed": 20,
                "Pending": 30
            },
            "TLW": {
                "Success": 10,
                "Failed": 20,
                "Pending": 30,
                "ManualRefund": 40,
                "PendingForApproval": 50,
            },
            "TLT": {
                "Success": 10,
                "Failed": 20,
                "Pending": 30
            },
            "TLB": {
                "Success": 10,
                "Failed": 20,
                "Pending": 30
            },
            "TLC": {
                "Success": 10,
                "Failed": 20,
                "Pending": 30
            },
            "TLR": {
                "Success": 10,
                "Failed": 20,
                "Pending": 30
            }
        },
        "PG": {
            "IndusInd": 1,
            "PayTM": 2,
            "PayU": 3,
            "CASHFREE":4
        },
        "AccStatus": {
            "Active": 1,
            "Inactive": 0
        }
    }

    readonly PaymentStrategy = {
        "Bonus": "Bonus",
        "BonusDeposit": "BonusDeposit",
        "BonusDepositWithdraw": "BonusDepositWithdraw",
        "BonusWithdraw": "BonusWithdraw",
        "Deposit": "Deposit",
        "DepositWithdraw": "DepositWithdraw",
        "Withdraw": "Withdraw",
        "ZeroPayment": "ZeroPayment"
    };

    readonly GameFeePaymentStrategy = {
        "Deposit": "Deposit",
        "DepositBonus": "DepositBonus",
        "DepositBonusWithdraw": "DepositBonusWithdraw",
        "DepositWithdraw": "DepositWithdraw",
        "Bonus": "Bonus",
        "BonusWithdraw": "BonusWithdraw",
        "Withdraw": "Withdraw",
        "ZeroPayment": "ZeroPayment"
    };

    readonly GServ = {
        "Status": {
            "Ready": 10,
            "Running": 20,
            "Stop": 30,
            "Dead": 40,

        },
        "ClassCategory": {
            "GamesApp": 1,
            "External": 2
        },
        "IsScaledSerrver": {
            "No": 0,
            "Yes": 1
        },
        "GameType": {
            "ScoreBased": 1,
            "TurnedBased": 2
        },
        "Health": {
            "Bad": 0,
            "Good": 1
        }
    }
    readonly ScratchCard = {
        "State": {
            "Created": 1,
            "Unlocked": 2,
            "Scratched": 3
        },
        "Status": {
            "Active": 1,
            "Inactive": 0
        },
        "REFERRAL_STATUS": {
            "ONBOARDED": 10,
            "ACTIVE": 20,
            "CONSUMED": 30
        }
    };
    readonly GameEngine = {
        "Battle": 1,
        "Tournament": 2,
        "CricketFantacy": 3,
        "TableFormatGame": 4
    };
    readonly Referral = {
        "ONBOARDED": 10,
        "DEPOSITED": 20
    };
    readonly ReferralSource = {
        "JOINED": 10,
        "REFERRAL_BONUS": 20,
        "GEMS": 30
    };
    readonly RESP_MSG ={
        "200":"Success",
        "501":"Validation Failed",
        "400":"Bad Request",
        "401":"Unauthorized Request",
        "403":"Forbidden",
        "404":"Not Found",
        "424":"Failed Dependency",
        "500":"Internal Server Error.",
        "502":"DB Error",
        "503":"DB_Conn_Timeout_Error"
    };
    readonly RESP_CODE ={
        "Success":200,
        "Validation Failed":501,
        "Bad Request":400,
        "Unauthorized Request":401,
        "Forbidden":403,
        "Not Found":404,
        "Failed Dependency":424,
        "Internal Server Error":500,
        "DB Error":502,
        "DB_Conn_Timeout_Error":503
    };

    readonly TABLE_TRX ={
        "INIT":{
            "TO-DO":10,
            "PROCESSED":20,
            "FAILED":30
        },
        "END":{
            "TO-DO":10,
            "PROCESSED":20
        }
    };

    readonly IS_CREATOR_STATUS ={
        "NOT_APPLIED":0,
        "APPLIED":1,
        "APPROVED":2
    };

    readonly KYC={
        "DOC_TYPE" : {
            "Aadhar Card Front":1,
            "AadharCard Back":1,
            "PAN Card" : 2,
            "Voter Id":3,
            "Driving Licence":4,
            "Driving License":4,
        },
        "STATUS" : {
            "INCOMPLETE" : 0,
            "INPROGRESS" :1,
            "COMPLETE" : 2
        }
    };

    readonly USER_REPORT_TYPE={
        "USER_IMAGE":1,
        "USER_NAME":2,
        "CHEATER":3,
        "OTHER":4
    };

    readonly USER_REPORT_TYPE_DS={
        1:"Inappropriate User Image",
        2:"Inappropriate User Name",
        3:"Cheater User",
        4:"Some Reason"
    };

    readonly USER_GAMEPLAY_GRAPH={
        "PLAY":1,
        "WIN":2,
        "LOSE":3,
        "DRAW":4
    };
    readonly PUSH_NOTIFICATION_TYPE={
        "APP_NEW_VERSION":"APP_NEW_VERSION"
    };

    readonly DEPOSIT_WITHDRAW_DESCRIPTION={
        "WITHDRAW" : {
            "SUCCESS":"You have successfully withdrew ₹ <amount> to your Bank Account <bankname> - <acno> and ₹ <tds> has been deducted as TDS.",
            "FAILED":"Your withdrawal request of ₹ <amount> to your Bank Account  <bankname> - <acno> is failed. This will be refunded back in your Winnings wallet.",
            "PENDING":"Your withdrawal request of ₹ <amount> to your Bank Account <bankname> - <acno> is pending. This may take upto 24 hours.",
            "REFUND" : "You have received refund against your withdrawal request of ₹ <amount> with Transaction ID - <txnId>"
        },
        "DEPOSIT" : {
            "SUCCESS":"You have successfully deposited ₹ <amount> into your Deposits wallet.",
            "FAILED":"You deposit request of ₹ <amount> is failed. Any amount deducted from your account will be refunded in 24 to 48 hours.",
            "PENDING":"You deposit request of ₹ <amount> is pending. This may take upto 24 hours."
        },
        "BONUS":{
            "CASHBACK": "You have successfully received cashback of ₹ <amount> into your Deposits wallet.",
            "GEMSREEDEM": "You have successfully redeemed Gems balance of ₹ <amount> into your Deposits wallet.",
            "GEMSBONUS" : "You have successfully received bonus of ₹ <amount> into your Deposits wallet.",
            "DEPOSITBONUS" : "You have successfully received referral bonus of ₹ <amount> into your Deposits wallet.",
            "DEPOSITBONUSCREATOR": "You have successfully received referral bonus of ₹ <amount> into your Deposits wallet.",
            "REWARDS":"You have successfully received reward of ₹ <amount>"
        }
    }

    readonly USER_STATUS:{
        "INACTIVE": 0,
        "ACTIVE": 1,
    }
}

export default new Constant();