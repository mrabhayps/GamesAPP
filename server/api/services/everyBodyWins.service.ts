import sequelize from 'sequelize';
import models, { sequelize1 } from '../models/index';
import Constant  from '../../common/app.constant';
import * as secretConfig  from '../../common/secret.config.json';
var config:any=secretConfig;

export class everyBodyWins{
    async getUserAvailableEverybodyWins(userId:number){
        const playedEveryBodyWinsGameTournament=await this.getPlayedEveryBodyWinsForGameTournament(userId);
        const playedEveryBodyWinsCricketFantacy=await this.getPlayedEveryBodyWinsForCricketFantacy(userId);
    
        let playedEveryBodyWinsContest=await this.mergePlayedEveryBodyWinsContest(playedEveryBodyWinsGameTournament,playedEveryBodyWinsCricketFantacy);
        console.log("Played Every Body Wins Contest : ",playedEveryBodyWinsContest);
        let availableEverybodyWinsEntryFee=0;
        for(let i=0;playedEveryBodyWinsContest && i<playedEveryBodyWinsContest.length;i++){
            if(playedEveryBodyWinsContest[i]['cnt'] >= config['everyBodywinsMaxPlaying'] 
                && availableEverybodyWinsEntryFee < playedEveryBodyWinsContest[i]['entryFee']){
                availableEverybodyWinsEntryFee=playedEveryBodyWinsContest[i]['entryFee'];
            }
        }
        //console.log("Every body wins Entry fee : ",availableEverybodyWinsEntryFee);
        return availableEverybodyWinsEntryFee;
    }
    private async getPlayedEveryBodyWinsForGameTournament(userId:number){
        let playedEveryBodyWins=await models.sequelize.query(`SELECT count(tp.id) as cnt,
                    t.fkPDId,t.entryFee 
                FROM gmsTournamentPlayers tp, gmsTournament t 
                WHERE tp.fkPlayerId=:userId AND t.id=tp.fkTournamentId AND t.type=1 
                    AND t.status in (:tstatus) AND tp.status in (:tpStatus) 
                GROUP BY t.fkPDId`,
            {
                replacements: 
                {
                    userId:userId,
                    tstatus:[
                        Constant.GAME_TOURNAMENT.TOURNAMENT.LIVE,
                        Constant.GAME_TOURNAMENT.TOURNAMENT.COMPLETED,
                        Constant.GAME_TOURNAMENT.TOURNAMENT.PRIZE_DISTRIBUTED,
                        Constant.GAME_TOURNAMENT.TOURNAMENT.WIN_AMOUNT_CREDITED,
                    ],
                    tpStatus:[
                        Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.PLAYING,
                        Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.COMPLETED,
                    ]
                },
            type: sequelize.QueryTypes.SELECT});
            // console.log("-----------Played Every body Wins Fantacy  ------")
            // console.log(playedEveryBodyWins)
            return playedEveryBodyWins;
    }

    private async getPlayedEveryBodyWinsForCricketFantacy(userId:number){

        let playedUserContest=await models.sequelize.query(`SELECT group_concat(DISTINCT fkContestId) as contestId
        FROM gmsFantacyCricketUserTeam cut
        WHERE cut.fkUserId=${userId} AND fkContestId is not null`,
        {type: sequelize.QueryTypes.SELECT});

        //console.log("Played User Contest");
        //console.log(playedUserContest);

        let playedEveryBodyWins=await models.FantacyCricket.query(`SELECT count(cc.id) as cnt ,cc.fkPDId,cc.entryFee 
        FROM gmsFantacyCricketContest cc 
        WHERE cc.id in(${playedUserContest[0]['contestId']}) AND cc.contestType=4 AND
            cc.status in (:status) and (cc.fkPDId is not null AND cc.fkPDId!=0) 
        GROUP BY cc.fkPDId`,
        { replacements: { status:[10,20,30,70] }, type: sequelize.QueryTypes.SELECT });

        // console.log("-----------Played Every body Wins Fantacy  ------")
        // console.log(playedEveryBodyWins)
        return playedEveryBodyWins;
    }
    private async mergePlayedEveryBodyWinsContest(playedEveryBodyWinsGameTournament:any,playedEveryBodyWinsCricketFantacy:any){
        let gameTournamentPDIds=playedEveryBodyWinsGameTournament.map(function(tournament){
            return tournament.fkPDId;
        });
        //console.log("Game Tournament Every body Wns : ",gameTournamentPDIds);

        let cricketFantacyPDIds=playedEveryBodyWinsCricketFantacy.map(function(contest){
            return contest.fkPDId;
        });
        //console.log("Cricket Fantacy Every body Wns : ",cricketFantacyPDIds);

        let playedEveryBodyWinsPDIds=[... new Set(gameTournamentPDIds.concat(cricketFantacyPDIds))];
        //console.log("Played All Every body Wns : ",playedEveryBodyWinsPDIds);
        
        let playedEveryBodyWins=[];

        for(let i=0;i<playedEveryBodyWinsPDIds.length;i++){
            
            let tournament=await playedEveryBodyWinsGameTournament.filter(obj => {
                return obj.fkPDId == playedEveryBodyWinsPDIds[i];
            });

            let fantacy = await playedEveryBodyWinsCricketFantacy.filter(obj => {
                return obj.fkPDId == playedEveryBodyWinsPDIds[i];
            });
            //console.log("The Tournament is : ",tournament);
            //console.log("The Fantacy is : ",fantacy);
            
            if(tournament && fantacy && tournament.length>0 && fantacy.length>0){
                let tournamentFantacy:any={};
                tournamentFantacy.cnt=tournament[0]['cnt']+fantacy[0]['cnt'];
                tournamentFantacy.entryFee=tournament[0]['entryFee'];
                tournamentFantacy.fkPDId=tournament[0]['fkPDId'];
                playedEveryBodyWins.push(tournamentFantacy);
            }
            else if (tournament && tournament.length>0){
                playedEveryBodyWins.push(tournament[0]);
            }
            else if (fantacy && fantacy.length>0){
                playedEveryBodyWins.push(fantacy[0]);
            }
            else{
                console.log("No Element in Iteration something went wrong.");
            }
        }
        return playedEveryBodyWins;
    }
}
export default new everyBodyWins();