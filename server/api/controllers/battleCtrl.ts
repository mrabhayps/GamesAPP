import { Request, Response } from 'express';
import Battle from '../services/battle.service';
import helper from '../../common/helper';

export class BattleCtrl{
    async getBattleDetails(req:Request,res:Response){
        var battleDetails=await Battle.get(req.params.battleId);
        if(battleDetails){
            if(battleDetails.length>0 && battleDetails[0]['battleRules']!= null && battleDetails[0]['battleRules'] != undefined){
                battleDetails[0]['battleRules']=battleDetails[0]['battleRules'].split("{{}}");  
            }
            helper.sendJSON(res,battleDetails,false,200,"Battle Details data Listed Successfully",1);
        }
        else{
            helper.sendJSON(res,{},true,502,"DB Error",0);
        }
    }
}
export default new BattleCtrl();