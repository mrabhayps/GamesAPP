var sequelize = require('sequelize');
var models = require('../models/index');

const accTypeField={
	"10":"depositBal",
	"20":"withdrawBal",
	"30":"tokenBal",
	"40":"bonusBal",
	"50":"coinBal",
	"60":"referralBal",
}
async function migrateGmsUserAccounts(){
    try{
        let data=await models.sequelize.query(`SELECT *
        from gmsUserAccount `,{ type: sequelize.QueryTypes.SELECT });
        let balField="";
        let preparedData={}
        let condition={};
        
        for(let i=0; i<data.length;i++){
            preparedData={};
            condition={};
            balField=accTypeField[data[i]['acType']];
            console.log("bal Field : ",balField);
            preparedData["fkUserId"]=data[i]['fkUserId'];
            preparedData[balField]=data[i]['balance'];
            preparedData['createdAt']=data[i]['createdAt'];
            preparedData['status']=data[i]['status'];
            condition={fkUserId:preparedData["fkUserId"]}

            await models.gmsUserAccounts
                .findOne({ where: condition })
                .then(async function (obj) {
                    if (obj) {
                        // update
                        await obj.update(preparedData);
                    } else {
                        await models.gmsUserAccounts.create(preparedData);
                    }
                });
        }
    }
    catch(error){
        console.log("Error : ",error);
    }
}

async function migrateGmsUserAccountsV1(){
    try{
        let data=await models.sequelize.query(`select id, fkUserId, GROUP_CONCAT(balance) as balance, GROUP_CONCAT(acType) as acType, createdAt, status 
        FROM gmsUserAccount 
        group by fkUserId `,{ type: sequelize.QueryTypes.SELECT });

        
        let balField="";
        let preparedData={}
        let condition={};
        
        for(let i=0; i<data.length;i++){
            
            preparedData={};
            condition={};
            balance=data[i]['balance'].split(",");
            acType=data[i]['acType'].split(",");

            console.log("Balance : ",balance);
            console.log("Account Type : ",acType);
        
            for(let j=0;j<acType.length;j++){
                balField=accTypeField[acType[j]];
                preparedData[balField]=balance[j];
            }
        
            
        
        
            preparedData["fkUserId"]=data[i]['fkUserId'];
            preparedData['createdAt']=data[i]['createdAt'];
            preparedData['status']=data[i]['status'];
            condition={fkUserId:preparedData["fkUserId"]}

            await models.gmsUserAccounts
                .findOne({ where: condition })
                .then(async function (obj) {
                    if (obj) {
                        // update
                        await obj.update(preparedData);
                    } else {
                        await models.gmsUserAccounts.create(preparedData);
                    }
                });
        }
    }
    catch(error){
        console.log("Error : ",error);
    }
}

migrateGmsUserAccountsV1();