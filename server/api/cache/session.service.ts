import cache from './cache.client';
import helper from '../../common/helper';
import models from '../models/index';
import sequelize from 'sequelize';

//We now export a new Session, which makes use of the cache
export class Session {
    //First, check if the session exists in the cache
    static async getSession(sessionId:string) {
        let user = await cache.hgetallAsync("USER_SESSION:" + sessionId);
        console.log('Cached Data By Session : ',user);
        if (!user){
            user = await this.setSession(sessionId);
            console.log('Cached data after setting session : ', user);
        }
        // return Promise.resolve(user);
        return user;       
    }

    // Set the session in the cache
    static async setSession(sessionId:string) {
        try{
            // let userData = await helper.getColsValue("gmsUserAuth", ["fkUserId", "sessionId"], 
            // {sessionId: sessionId, status:1});
            let userData = await models.sequelize1.query("select fk_userId, sessionId from gmsUserAuth where sessionId='"+sessionId+"' and status=1", 
            {type: sequelize.QueryTypes.SELECT});
            if (userData && userData.length > 0){
                userData = userData[0]; 
                let userStatus = await models.sequelize1.query("select status, mobile, userName, image, defaultImage from gmsUsers where id="+userData['fk_userId'], 
                {type: sequelize.QueryTypes.SELECT});
                userData['status'] = userStatus[0]['status'];
                userData['mobile'] = userStatus[0]['mobile'];
                userData['userName'] = userStatus[0]['userName']?userStatus[0]['userName']:"";
                userData['image'] = userStatus[0]['image']?userStatus[0]['image']: "";
                userData['defaultImage'] = userStatus[0]['defaultImage']?userStatus[0]['defaultImage']:"";
                await Promise.all([
                    cache.hmsetAsync("USER_SESSION:" + sessionId, userData)]);
                return Promise.resolve(userData);
            }
        }catch(error){
            console.log("set Session: ", error);
        }
        return false
    }
    
    // Set the session in the cache
    static async destroySession(sessionId:string) {
        try{
            let delResult = await cache.delAsync("USER_SESSION:" + sessionId);
        }
        catch(error){
            console.log("Destroy Session: ", error);
        } 
    }
}