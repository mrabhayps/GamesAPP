import sequelize from 'sequelize';
import models from '../models/index';
var Op=sequelize.Op;
import EncDec from '../../common/encDec.service';
import Constant from '../../common/app.constant';
import MasterPayment from '../services/payment/master.service'
export class Turnament{
    
    async getTournamentByGameId(gameId,entryFee=0){
        try{
            let tournament=await models.gmsTournament.findAll({
                attributes:{
                    exclude:["fkConfigId","minPlayer","createdAt","updatedAt"]
                },
                where:{
                    fkGameId:gameId,
                    entryFee:{
                        [Op.gt]:entryFee
                    },
                    status:Constant.GAME_TOURNAMENT.TOURNAMENT.LIVE
                },
                order:[['endTime', 'ASC']]
            })
            return tournament;
        }
        catch(error){
            console.log("Error in getTournamentByGameId() : ",error);
            return false;
        }
    }
    async getMyTournament(userId,gameId){
        try{
            let myTournament=await models.sequelize.query(`SELECT t.id,t.type,t.fkGameId,
                    t.title,t.entryFee,t.prizePool,t.startTime,t.endTime,
                    t.maxPlayer,t.totalParticipant,t.rules,t.maxPlaying,
                    t.status
                FROM gmsTournamentPlayers tp, gmsTournament t 
                WHERE tp.fkPlayerId=:userId AND tp.fkGameId=:gameId AND
                    t.id=tp.fkTournamentId AND t.status in (:tstatus) AND tp.status in (:tpStatus) 
                GROUP BY tp.fkTournamentId`,
            {
                replacements: 
                {
                    userId:userId,gameId:gameId,
                    tstatus:[
                        Constant.GAME_TOURNAMENT.TOURNAMENT.LIVE,
                        Constant.GAME_TOURNAMENT.TOURNAMENT.COMPLETED,
                        Constant.GAME_TOURNAMENT.TOURNAMENT.CANCELLED,
                    ],
                    tpStatus:[
                        Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.PLAYING,
                        Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.COMPLETED,
                        Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.INTERUPTED
                    ]
                },
            type: sequelize.QueryTypes.SELECT});
            return myTournament;
        }
        catch(error){
            console.log("Error in getMyTournament() : ",error);
            return false;
        } 
    }
    async getTournamentDetails(tournamentId:number){
        try{
            let tournament=await models.gmsTournament.findOne({
                attributes:{
                    exclude:["minPlayer","createdAt","updatedAt"]
                },
                where:{
                    id:tournamentId
                },
                   raw:true
            })
            return tournament;
        }
        catch(error){
            console.log("Error in getTournamentDetails() : ",error);
            return false;
        }
    }

    //This function is not using anywhere.
    async getUserRankAndScore(tournamentId:number,userId:number){
        try{
            let userScoreAndRank=await models.gmsTournamentPlayers.findAll({
                attributes:["rank","score","amount"],
                where:{
                    fkTournamentId:tournamentId,
                    fkPlayerId:userId,
                    status:Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.COMPLETED
                },
                   raw:true
            });

            return userScoreAndRank;
        }
        catch(error){
            console.log("Error in getUserRankAndScore() : ",error);
            return false;
        }
    }
    async getTournamentLeaderBoard(tId:number,userId=null){
        let userCondition=userId?` AND u.id=${userId}`:``;
        try{
            let data=await models.sequelize.query(`SELECT u.id,u.userName as firstName,u.image,
                        u.defaultImage,u.gender,u.mobile,tp.rank,tp.score,tp.amount 
                    FROM gmsTournamentPlayers tp, gmsUsers u 
                    WHERE tp.fkTournamentId=:tId AND u.id=tp.fkPlayerId AND 
                        tp.status in (:tpStatus) AND tp.rank is not null ${userCondition} 
                    ORDER BY tp.rank ASC LIMIT 10`,
            {
                replacements: {
                    tId:tId,
                    tpStatus:[
                        Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.COMPLETED,
                        Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.PLAYING,
                    ]
                },
                type: sequelize.QueryTypes.SELECT
            });

            return data;
        }
        catch(error){
            console.log("Error in getTournamentLeaderBoard() : ",error);
            return false;
        }
    }
    async getTournamentPrizeBreakup(groupId:number){
        try{
            let tournamentPrizeBreakup=await models.gmsPrizeDistributionConfig.findAll({
                attributes:["rankFrom","rankTill","totalAmount","individualAmount"],
                where:{
                    groupId:groupId,
                    status:1
                },
                   raw:true
            })
            return tournamentPrizeBreakup;
        }
        catch(error){
            console.log("Error in getTournamentPrizeBreakup() : ",error);
            return false;
        }
    }
    async getTournamentHistory(userId:number,gameId:number){
        try{
            
            let userTournamentHistory=await models.sequelize.query(`SELECT t.id,t.title,t.type,
                t.entryFee,t.prizePool, 
                t.startTime,t.endTime,
                t.maxPlayer,t.totalParticipant,
                t.status,
                sum(tp.amount) as amount
            FROM gmsTournamentPlayers tp , gmsTournament t 
            WHERE tp.fkGameId=:gameId 
                AND tp.fkPlayerId=:userId 
                AND t.id=tp.fkTournamentId
                AND tp.status in (
                    ${Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.PLAYING},
                    ${Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.COMPLETED},
                    ${Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.INTERUPTED}) 
                AND t.status in (
                    ${Constant.GAME_TOURNAMENT.TOURNAMENT.PRIZE_DISTRIBUTED},
                    ${Constant.GAME_TOURNAMENT.TOURNAMENT.WIN_AMOUNT_CREDITED},
                    ${Constant.GAME_TOURNAMENT.TOURNAMENT.ENTRY_FEE_REFUND},
                    ${Constant.GAME_TOURNAMENT.TOURNAMENT.ENTRY_FEE_CREDITED}) 
            group by tp.fkTournamentId 
            ORDER BY t.endTime DESC`,
            {replacements: {gameId:gameId,userId:userId}, type: sequelize.QueryTypes.SELECT});
            return userTournamentHistory;
        }
        catch(error){
            console.log("Error in getTournamentHistory() : ",error);
            return false;
        }
    }
    async createTournamentPlayer(tournamentPlayerData:any){
        try{
            var dataRoomCreate=await models.gmsTournamentPlayers.build(tournamentPlayerData).save();
            return dataRoomCreate
        }
        catch(error){
            console.log("Error (CreateTournamentPlayer) : ",error);
            return false;
        }
    }

    async updateTournament(tournamentData:any){
        try{
            let data = await models.gmsTournament.update(tournamentData, {
                where: {
                    id: tournamentData.id
                }
            });
            return data;
        }
        catch(error){
            console.log("Error (UpdateTournamentPlayers) : ",error)
            return false;
        }
    }

    async updateTournamentPlayers(tournamentPlayers:any){
        try{
            let data = await models.gmsTournamentPlayers.update(tournamentPlayers, {
                where: {
                    id: tournamentPlayers.id
                }
            });
            return data;
        }
        catch(error){
            console.log("Error (UpdateTournamentPlayers) : ",error)
            return false;
        }
    }

    async getPlayerScore(roomId:number){
        try{
            let data=await models.gmsTurnamentPlayers.findAll({
                attributes:["score","rank"],
                where:{
                    id:roomId
                },
                   raw:true
            })
            return data;
        }
        catch(error){
            console.log("Error (GetPlayerScore) : ",error);
            return false;
        }
    }

    async deductEntryFee(userDetails:any,entryFee:number,gameId:number,tournamentId:number,tournamentRoomId:string){
        try{
            //Entry fee deduction start here 
            // 200 : Entry fee deducted successfully
            // 202 : Insufficient balance

            if(entryFee && entryFee > 0){
                console.log("Tournament : "+tournamentId+" , Free Entry Fee : "+entryFee);
                // deduct balance 
                const isSuccessfull = await MasterPayment.userAccountBalanceDeductionV2(userDetails, entryFee, gameId, Constant.GameEngine.Tournament, tournamentId,tournamentRoomId, false);
                if(isSuccessfull==200){
                    console.log("Proceed to play tournament.");
                }
                else if(isSuccessfull==502) {
                    return 202;
                }
                else {
                    return false;
                }
            }//End of entry fee deduction.
            else{
                //No entry fee. 
                return 200;
            } 
        }
        catch(error){
            console.log("Error in deductEntryFee() : ",error)
            return false;
        }
    }

    async getCurrentParticipent(tId){
        try{
            let data=await models.sequelize.query("SELECT count(id) as cnt "+
            " FROM gmsTournamentPlayers tp "+
            " WHERE tp.fkTournamentId=:tId"+
            " AND tp.status in (10,15,20)"
            ,{replacements: {tId:tId}, type: sequelize.QueryTypes.SELECT});
            return data[0]['cnt'];
        }
        catch(error){
            console.log("Error in deductEntryFee() : ",error)
            return false;
        }
    }

    async getPlayingTime(tId,userId){
        try{
            let data=await models.sequelize.query("SELECT count(id) as cnt "+
            " FROM gmsTournamentPlayers tp "+
            " WHERE tp.fkTournamentId=:tId"+
            " AND tp.fkPlayerId=:userId"+
            " AND tp.status in (15,20)"
            ,{replacements: {tId:tId,userId:userId}, type: sequelize.QueryTypes.SELECT});

            return data[0]['cnt'];
        }
        catch(error){
            console.log("Error in getPlayingTime() : ",error)
            return false;
        }
    }

    async getTournamentPlayer(roomId){
        try{
            let data=await models.gmsTournamentPlayers.findOne({
                where:{
                    id:roomId
                },
                   raw:true
            });
            return data;
        }
        catch(error){
            console.log("Error in (getTournamentPlayer) : ",error);
            return false;
        }
    }

    async getGameTimeInterval(tournamentId){
        try{
            let data=await models.sequelize.query("SELECT g.gameCategory,g.gameEndTime "+
            " FROM gmsTournament tp, "+
            " gmsGames g "+
            " WHERE g.id=tp.fkGameId AND tp.id=:tournamentId"
            ,{replacements: {tournamentId:tournamentId}, type: sequelize.QueryTypes.SELECT});
            return data[0];
        }
        catch(error){
            console.log("Error in getGameTimeInterval() : ",error);
            return false;
        }
    }
}

export default new Turnament();