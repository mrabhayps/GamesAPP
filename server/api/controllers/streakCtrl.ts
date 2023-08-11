import { Request, Response } from 'express';
import helper from '../../common/helper';
import request from 'request-promise';
import * as secretConfig  from '../../common/secret.config.json';
const config:any = secretConfig;


export class StreaksCtrl{
    async userStreaksList(req:Request, res:Response){
        let userDetail = req.headers.data;
        let userStreaksList:any = null;
        try {
            const options = {
                uri: config.streaks.APIs.STREAKS_LIST_API,
                method: "POST",
                body: {userId: userDetail['id']},
                json: true,
                headers: {
                    'x-auth-key': process.env.STREAKS_AUTH_KEY,
                },
            };
            const data = await request(options);
            let jsonData = null;
            if (typeof(data) == "object") {
                jsonData = data;
            } else {
                jsonData = JSON.parse(data);
            }
            if (jsonData && !jsonData.meta.error) {
                userStreaksList =  jsonData.data;
            }
        } catch (err) {
            console.error("Exception - userStreaksList: ", err);
        }
        if (userStreaksList) {
            await helper.sendJSON(res, userStreaksList, false, 200, "User's Streaks fetched successfully", 1);
        } else {
            await helper.sendJSON(res, [], true, 200, "You don't have any active Streaks.", 0);
        }    
    }

    async processSreaks(req:Request, res:Response){
        try{
            let userDetail = req.headers.data;
            await helper.pushToStreaks(userDetail['id'], req.body.taskName, req.body.gameId, req.body.gameEngine, req.body.engineId);
            await helper.sendJSON(res, [], false, 200, "User's Streaks updated successfully", 0);
        }catch(error){
            await helper.sendJSON(res, [], true, 200, "You don't have any active Streaks.", 0);
        }
    }
}
export default new StreaksCtrl();