import { Request, Response } from 'express';
import Agora from '../services/agora.service';
import helper from '../../common/helper';
import * as secretConfig  from '../../common/secret.config.json';
var config:any=secretConfig;

export class AgoraCtrl{
    async generateToken(req:Request, res:Response){
        try{
            const userDetails:any = req.headers.data;
            console.log("Params : ", req.query);
            const channelName = req.query.channel as string;
            console.log("Channel Name : ", channelName);
            const token = await Agora.generateToken(userDetails['id'], channelName);
            if(token){
                const data = {
                    "token": token,
                    "isVideoChatEnabled": config.isAgoraEnabled
                }
                helper.sendJSON(res, data, false, 200, "Token generated Successfully.", 1);
            }else{
                helper.sendJSON(res, {}, true, 502, "We are not able to generate token. Please try again!", 0);
            }
        }catch(error){
            console.log("Error(generateToken): ", error);
            helper.sendJSON(res, {}, true, 502, "We are not able to generate token. Please try again!", 0);
        }
    }
}
export default new AgoraCtrl();