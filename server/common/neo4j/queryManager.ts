import Neo4jDriver from './neo4jDriver';
import * as neo4jConfig from './neo4jConfig.json';

class QueryManager{
    constructor(){
        
    }
    public async executeQuery(query:any){
        try{
            const Driver = await Neo4jDriver.getDriver();
            let session=await Driver.session({database:neo4jConfig.DB});
            let result=await session.run(query);
            return result.records;
        }
        catch(error){
            console.log(`Error in Class ReadSchema : `)
            console.log(error);
        }
        finally{
            //Neo4jDriver.closeDriver();
        }
        return null;
    }
    public async updateNotificationCount(userId,notificationCount,lastNotification){
        console.log("Update Notification count");
        let query=`match (u:User) WHERE u.id='${userId}' 
        set u.notificationCount=${notificationCount}, u.lastNotification=LocalDateTime('${lastNotification}')
        return u;`
        let result=await this.executeQuery(query);
        return result;
        // try{
        //     const Driver = await Neo4jDriver.getDriver();
        //     let session=await Driver.session({database:"friends"});
        //     let result=await session.run(query);
        //     console.log(result.records);
        //     return result.records;
        // }
        // catch(error){
        //     console.log(`Error in Class ReadSchema UpdateNotificationCount: `)
        //     console.log(error);
        // }
        // finally{
        //     //Neo4jDriver.closeDriver();
        // }
        // return false;
    }
}

export default new QueryManager();