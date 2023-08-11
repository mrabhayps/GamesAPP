import { Request, Response } from 'express';
import models from '../models/index';
import helper from '../../common/helper';
import * as secretConfig  from '../../common/secret.config.json';
import PreloginService from '../services/prelogin.service';

const Op = models.Sequelize.Op;
var config:any=secretConfig;


export class PreloginCtrl{ 
    async getPreLoginLB(req: Request, res: Response) 
    {
        //let lb = await PreloginService.getPreLoginLeaderboard();
        let lb=global.LEADERBORD_ALL
        if (lb && lb.length > 0)
            helper.sendJSON(res, lb, false, 200, "Leaderboard listed successfully ", 1);
        else
            helper.sendJSON(res, [], false, 200, "Sorry, Leaderboard not available .", 0);
    }

}
export default new PreloginCtrl();