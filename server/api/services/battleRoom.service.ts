import sequelize from 'sequelize';
import models, { sequelize1 } from '../models/index';
import helper from '../../common/helper';

export class BattleRoomService{
    
    async lookInBattleRoom(req,player){
        var gameId=req.body.gameId;
        var battleId=req.body.battleId;
        var p2GenderChoice=req.body.gender;
        
        var genderWhaereCond="";
        if(p2GenderChoice && p2GenderChoice!=3){
            //select room from battle room where player choice
            console.log("Matchup Process start.");
            genderWhaereCond="AND u.gender="+p2GenderChoice+" AND r.p1GenderChoice="+player.gender;
        }
        
        try{
            let data=await models.sequelize.query(" select r.* from gmsBattleRoom r "+
            "inner Join gmsUsers u on u.id=r.fk_PlayerId1 "+genderWhaereCond+" "+
            "where r.fk_GameId="+gameId+" AND r.fk_battleId="+battleId+" AND r.status=100 "+
            "",{ type: sequelize.QueryTypes.SELECT});

            return data;
        }
        catch(error){
            console.log("Error (LookInBattleRoom) : ",error)
            return false;
        }
    }

    async createNewBattleRoom(req,userDetails){
        var insertbattleRoom:any={};
        insertbattleRoom.fkBattleId=req.body.battleId;
        insertbattleRoom.fkGameId=req.body.gameId;
        insertbattleRoom.fkPlayerId1=userDetails.id;
        insertbattleRoom.p1GenderChoice=req.body.gender;
        insertbattleRoom.status=100;
        try{
            var data=await models.gmsBattleRoom.build(insertbattleRoom).save();
            return data;
        }
        catch(error){
            console.log("Error (CreateNewBattleRoom) : ",error)
            return false;
        }
    }

    async createBattleRoom(br) {
        try{
            const insertbattleRoom = {
                fk_BattleId: br['battleId'],
                fk_GameId: br['gameId'],
                fk_PlayerId1: br['playerId1'],
                fk_PlayerId2: br['playerId2'],
                p1GenderChoice: br['p1gender'],
                status: 200,
                br_roomId: br['roomId'],
            };
            const data = await models.gmsBattleRoom.build(insertbattleRoom).save();
            return data;
        }
        catch(error){
            console.log("Error (createBattleRoom) : ",error)
            return false;
        }
    }

    async updateBattleRoom(battleRoom){
        try{
            let data = await models.gmsBattleRoom.update(battleRoom, {
                where: {
                    id: battleRoom.id
                }
            });
            return data;
        }
        catch(error){
            console.log("Error (UpdateBattleRoom) : ",error)
            return false;
        }
    }

    async deductToken(userId,numberOfToken){
        try{
            let userWallet=await models.gmsUserWallet.findAll({
                attributes: ['token'],
                where:{
                    fk_UserId:userId
                },
                raw:true
            });
            var currentToken=userWallet[0]['token'];
            userWallet[0]['token']=currentToken-numberOfToken;
            
            let userWalletUpdate=await models.gmsUserWallet.update(userWallet[0],{
                where:{
                    fk_UserId:userId
                }
            });
            return userWalletUpdate;
        }
        catch(error){
            console.log("Error (DeductToken) : ",error);
            return false;
        }
    }
    
    async allocateBattleRoom(userDetails,battleId,gameId,videoRoomId){
        try{
            //Check if any room available for battle.
            var cond=videoRoomId==null?"":" and (r.videoRoomId is not null and r.videoRoomId!='')";
            let dataBattleRoom=await models.sequelize1.query(" select r.* from gmsBattleRoom r "+
            "where r.fk_GameId="+gameId+" and r.fk_battleId="+battleId+" and fk_PlayerId1!="+userDetails.id+" AND r.status=100 "+cond
            ,{ type: sequelize.QueryTypes.SELECT});
            if(dataBattleRoom && dataBattleRoom.length>0){
                //Allocate room
                var battleRoomUpdate:any={};
                battleRoomUpdate.fk_PlayerId2=userDetails.id;
                battleRoomUpdate.status=150;
                try{
                    let dataRoomUpdate = await models.gmsBattleRoom.update(battleRoomUpdate, {
                        where: {
                            id: dataBattleRoom[0]['id']
                        }
                    });
                    console.log("Allocate Battle Room -->> "+dataBattleRoom[0]['id']+"Player1 : "+dataBattleRoom[0]['fk_PlayerId1']+"  Player2 : "+userDetails.id+" Game Id : "+gameId+" Battle Id : "+battleId);
                    return dataRoomUpdate&&dataRoomUpdate.length>0?[{"playerId":userDetails.id,"roomId":dataBattleRoom[0]['id'],"isTournament":0,"timeStamp":new Date()}]:[];
                }
                catch(error){
                    console.log("Battle Room Update Error : ",error)
                    return false;
                }
            }
            else{
                //Create New Room .
                var insertbattleRoom:any={};
                insertbattleRoom.fk_BattleId=battleId;
                insertbattleRoom.fk_GameId=gameId;
                insertbattleRoom.fk_PlayerId1=userDetails.id;
                insertbattleRoom.videoRoomId=videoRoomId;
                insertbattleRoom.status=100;
                try{
                    var dataRoomCreate=await models.gmsBattleRoom.build(insertbattleRoom).save();
                    console.log("New Battle Room -->>"+dataRoomCreate.dataValues['id']+" Player ID : "+userDetails['id']+" Game Id : "+gameId+" Battle Id : "+battleId);
                    return dataRoomCreate?[{"playerId":userDetails.id,"roomId":dataRoomCreate.dataValues['id'],"isTournament":0,"timeStamp":new Date()}]:[];
                }
                catch(error){
                    console.log("Battle Room Cretate Error : ",error)
                    return false;
                }
            }
        }
        catch(error){
            console.log("Error (AllocateBattleRoom) : ",error);
            return false;
        }
    }

    async allocateBattleRoomV2(userId, battleId, gameId, roomId, videoRoomId) {
        try {
            const battleRoom = await models.sequelize1.query("select r.* from gmsBattleRoom r where r.br_roomId = '" + roomId + "'", {
                type: sequelize.QueryTypes.SELECT
            });
            if(battleRoom && battleRoom.length>0){
                //Allocate room
                const battleRoomUpdate = {
                    fk_PlayerId2: userId,
                    status: 150
                };
                try{
                    const updateResult = await models.gmsBattleRoom.update(battleRoomUpdate, {
                        where: {
                            id: battleRoom[0]['id']
                        }
                    });
                    console.log("Allocate Battle Room V2-->> "+battleRoom[0]['id']+"Player1 : "+battleRoom[0]['fk_PlayerId1']+"  Player2 : "+userId+" Game Id : "+gameId+" Battle Id : "+battleId);
                    return updateResult&&updateResult.length>0?[{"playerId":userId,"roomId":battleRoom[0]['id'],"isTournament":0,"timeStamp":new Date()}]:[];
                }
                catch(error){
                    console.log("Battle Room Update V2 Error: ", error)
                    return false;
                }
            }
            else {
                const insertbattleRoom = {
                    br_roomId: roomId,
                    fk_GameId: gameId,
                    fk_BattleId: battleId,
                    fk_PlayerId1: userId,
                    videoRoomId: videoRoomId,
                    status: 100,
                };
                const dataRoomCreate = await models.gmsBattleRoom.build(insertbattleRoom).save();
                console.log("New Battle Room -->>"+dataRoomCreate.dataValues['br_roomId']+" Player ID : "+userId+" Game Id : "+gameId+" Battle Id : "+battleId);
                return dataRoomCreate?[{"playerId":userId,"roomId":dataRoomCreate.dataValues['br_roomId'],"isTournament":0,"timeStamp":new Date()}]:[];
            }
        } catch(error) {
            console.log("Error (allocateBattleRoomV2) : ",error);
            return false;
        }
    }
    
    async createNewBattleRoomV2(battleRoomData){
        try{
            var brRoomIdExistCheck=await helper.getAllColValue("gmsBattleRoom",{"br_roomId":battleRoomData.br_roomId});
            if(brRoomIdExistCheck.length>0){
                console.log("-----------------------------------------");
                console.log("Battle Room Already exist : ",battleRoomData);
                console.log("-----------------------------------------");
                return true;
            }else{
                var data=await models.gmsBattleRoom.build(battleRoomData).save();
                return data;
            }
            
        }
        catch(error){
            console.log("Error (createNewBattleRoomV2) : ",error)
            return false;
        }
    }

    async updateBattleRoomV2(battleRoomData,br_roomId){
        try{
            let dataRoomUpdate = await models.gmsBattleRoom.update(battleRoomData, {
                where: {
                    br_roomId:br_roomId
                }
            });
            return true;
        }
        catch(error){
            console.log("Error (updateBattleRoomV2) : ",error)
            return false;
        }
    }
    async  getPlayerScore(roomId){
        try{
            let data=await models.gmsBattleRoom.findAll({
                where:{
                    id:roomId
                },
                raw:true
            });
            return data;
        }
        catch(error){
            console.log("Error (GetPlayerScore) : ",error);
            return false;
        }
    }

    async getBattleRoom(roomId){
        try{
            let data=await models.sequelize1.query(" select r.* from gmsBattleRoom r  where r.id="+roomId
            ,{ type: sequelize.QueryTypes.SELECT});
            return data;
        }
        catch(error){
            console.log("Error (GetBattleRoom) : ",error);
            return false;
        }
    }

    async getBattleRoomBr(brRoomId) {
        try{
            const data = await models.sequelize1.query(" select r.* from gmsBattleRoom r  where r.br_roomId=" + brRoomId
            ,{ type: sequelize.QueryTypes.SELECT});
            return data;
        }
        catch(error){
            console.log("Error (getBattleRoomBr) : ",error);
            return [];
        }
    }
    async getBattleRoomStatus(brRoomId) {
        try{
            const data = await models.sequelize1.query(" select status from gmsBattleRoom r  where r.br_roomId=" + brRoomId
            ,{ type: sequelize.QueryTypes.SELECT});
            return data[0].status;
        }
        catch(error){
            console.log("Error (getBattleRoomBr) : ",error);
            return false;
        }
    }

    async fetchBattleRoomDetails(brRoomId) {
        let br = null;
        try {
            const brDetailsApi = process.env.BATTLE_ROOM_HOST + process.env.BR_DETAILS_API + brRoomId;
            const brRoomDetails = await helper.retryGet(brDetailsApi);

            if (brRoomDetails && brRoomDetails['status'] == "success" && brRoomDetails['data']) {
                const brDetails = brRoomDetails['data'];
                const gameId = await helper.getColValue("gmsBattle", "fk_GamesId", {"id": brDetails.battleId});
                
                let playerId1 = null;
                if (brDetails.players.length > 0) {
                    playerId1 = brDetails.players[0]
                }

                let playerId2 = null;
                if (brDetails.players.length > 1) {
                    playerId2 = brDetails.players[1];
                }
                
                const newBattleRoom = {
                    battleId: brDetails.battleId,
                    gameId: gameId,
                    playerId1: playerId1,
                    playerId2: playerId2,
                    p1gender: null,
                    roomId: brDetails.roomId,
                };
                const brCreateResult = await this.createBattleRoom(newBattleRoom);
                if (brCreateResult) {
                    br = await this.getBattleRoomBr(brDetails.roomId);
                    const reconcileBrApi = process.env.BATTLE_ROOM_HOST + process.env.BR_RECONCILE_API;
                    const reconcileBrReq = {
                        roomId: brDetails.roomId,
                    };
                    helper.postRequest(reconcileBrApi, reconcileBrReq);
                } else {
                    console.error("FAILED! BattleRoom creation failed on battleroom server!");
                }
            } else {
                // helper.sendJSON(res, [], true, 200, "Couldn't find this battle room, please retry!", 0);
                console.error("Couldn't find this battle room, please retry!");
            }
        } catch (error) {
            console.error("Error (getBattleRoomBr) : ",error);
        }
        return br;
    }
}

export default new BattleRoomService();