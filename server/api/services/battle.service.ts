import sequelize from 'sequelize';
import models from '../models/index';
import Constant from '../../common/app.constant';

export class Battle{
    
    async get(battleId){
        try{
            let data=await models.gmsBattle.findAll({
                where:{
                    id:battleId,
                    status:10
                },
                   raw:true
            })
            return data;
        }
        catch(error){
            console.log("Error : ",error);
            return false;
        }
    }
    async getBattleHistory(gameId,playerId,searchParams){
        
        if(searchParams){
            var pageCount=searchParams.pageCount?searchParams.pageCount:1;
            var recordCount=searchParams.recordCount?searchParams.recordCount:10;
            var start=(pageCount-1)*recordCount + 1;
            var end=pageCount*recordCount;

        }
        try{
            let data=await models.sequelize.query("select b.fk_GamesId as gameId,b.title,b.paidAmount as entryFee,b.winningAmount,br.id as battleRoomId,"+
            "(select count(*) from gmsBattleRoom brCount where brCount.fk_BattleId=br.fk_BattleId and br.status in ("+Constant.Battle.BattleRoom.RoomCreated+","+Constant.Battle.BattleRoom.PrivateRoomCreated+","+Constant.Battle.BattleRoom.BothPlayerMatch+","+Constant.Battle.BattleRoom.RoomLock+")) as onlineUser,"+
            "br.status,br.fk_PlayerId1,br.fk_PlayerId2,br.playerScore1,br.playerScore2 "+
            "from gmsBattleRoom br,gmsBattle b "+
            "where br.fk_GameId="+gameId+" and (br.fk_PlayerId1="+playerId+" OR br.fk_PlayerId2="+playerId+") "+
            "and br.fk_BattleId=b.id and br.status in ("+Constant.Battle.BattleRoom.Interrupted+","+Constant.Battle.BattleRoom.GameFinished+","+Constant.Battle.BattleRoom.GameDraw+") "+
            "order by br.createdAt DESC ",
            { type: sequelize.QueryTypes.SELECT});
            return data;
        }
        catch(error){
            console.log("Error : ",error);
            return false;
        }
    }
}

export default new Battle();