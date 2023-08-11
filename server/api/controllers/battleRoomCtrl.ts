import { Request, Response } from 'express';
import helper from '../../common/helper';
import BattleRoomService from './../services/battleRoom.service';



export class RoomAllocate{
    async allocateRoom(req:Request, res:Response){
        /*
        1-First if Matchup then complete the matchUp task.
        2-Either allocate in the new room or assign with existing empty room.
       
        Case : 
        1-User should be online and is on same game. 
        2-User must have looking for playing the same battle.
        3-Lock the user if match found until user plays with another user and in that games.
        4-After Playing the Game make user Unlock. now user can play with another games. 
        */
        //Fetch User Details
        var userDetails=await helper.getUserDetails(req.headers.data['mobile']);
        var battleRoom;
        var roomId=req.body.roomId;
        //Pending : GameId, BattleId and room id existence Check in DB .
        if(roomId){
            //check if room is allocated by both Players.
            battleRoom=await helper.getAllColValue("gmsBattleRoom",{"id":roomId});
            battleRoom=battleRoom[0];
            if(battleRoom.status==150){
                //Lock The room 
                let data = await BattleRoomService.updateBattleRoom({"id":roomId,"status":200});
                battleRoom.status=200;
                //Deduct the token prize from user end.
                var isDeducted=await BattleRoomService.deductToken(userDetails.id,20);
                if(!isDeducted)
                {
                    helper.sendJSON(res,{},false,502,"Unable To Deduct  Token",1);    
                }
                else{
                    helper.sendJSON(res,battleRoom,false,200,"Player Matched and room Locked",1);    
                }
                
            }
            else{
                helper.sendJSON(res,battleRoom,false,200,"Player Not Matched",1);    
            }
            
        }
        else{
            //look and allocate if any battle room available 
            let data=await BattleRoomService.lookInBattleRoom(req,userDetails);
            if(data && data.length>0){
                var battleRoomUpdate:any={};
                battleRoomUpdate=data[0];
                battleRoomUpdate.fk_PlayerId2=userDetails.id;
                battleRoomUpdate.p2GenderChoice=req.body.gender;
                battleRoomUpdate.status=150;
                data=await BattleRoomService.updateBattleRoom(battleRoomUpdate);
                if(data && data.length>0){
                    isDeducted=await BattleRoomService.deductToken(userDetails.id,20);
                    if(!isDeducted)
                    {
                        helper.sendJSON(res,{},false,502,"Unable To Deduct  Token",1);    
                    }
                    else{
                        helper.sendJSON(res,battleRoomUpdate,false,200,"Battle Room Allocated Successfully ",1);    
                    }
                }    
                else{
                    helper.sendJSON(res,{},true,502,"DB Error",0);
                }
                
            }else if(data && data.length==0){
                //create New BattleRoom
                let battleRoom=await BattleRoomService.createNewBattleRoom(req,userDetails);
                if(data){
                    helper.sendJSON(res,battleRoom.dataValues,false,200,"Battle Room Created",1);    
                }
                else{
                    helper.sendJSON(res,{},true,502,"DB Error",0);
                }
            }
            else{
                helper.sendJSON(res,{},true,502,"DB Error",0);
            }
        }
    }
}

export default new RoomAllocate();