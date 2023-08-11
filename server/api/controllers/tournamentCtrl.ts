import { Request, Response } from 'express';

import TournamentService from '../services/turnament.service';
import FavourateGame from '../services/favouriteGame.service';
import MasterPayment from '../services/payment/master.service'

import Constant from '../../common/app.constant';
import EncDec from '../../common/encDec.service';
import helper from '../../common/helper';
import EverybodyWinsService from '../services/everyBodyWins.service';
import * as secretConfig  from '../../common/secret.config.json';
var config:any=secretConfig;
export class TournamentCtrl{

    async getTournamentList(req:Request,res:Response){
        const gameId=req.params.gameId;
        const userDetails=req.headers.data;
        let tournament:any={};
        let userAvailableEverybodyWinsAmount=await EverybodyWinsService.getUserAvailableEverybodyWins(userDetails['id']);
        console.log(`User Id : ${userDetails['id']} , Available Every Body Wins Amount : ${userAvailableEverybodyWinsAmount}`);
        let liveTournament=await TournamentService.getTournamentByGameId(gameId,userAvailableEverybodyWinsAmount);
        let myTournament=await TournamentService.getMyTournament(userDetails['id'],gameId);

        let myTournamentIds=myTournament.map(function(tournament){
            return tournament.id;
        });
        
        if(!liveTournament || !myTournament){
            helper.sendJSON(res,[],true,500,"Unable to list Game Tournament !",0);
        }
        else{
            tournament.myTournament=myTournament;
            tournament.liveTournament=[];
            for(let i=0;i<liveTournament.length;i++){
                if(myTournamentIds.indexOf(liveTournament[i]['id'])<0){
                    tournament.liveTournament.push(liveTournament[i]);
                }
            }
            helper.sendJSON(res,tournament,false,200,"Game Tournament Listed Successfully",tournament.length);
        }
        
        
    }
    async getTournamentDetails(req:Request,res:Response){
        const tId=+req.params.tournamentId;
        const userDetails=req.headers.data;
        var tournamentDetails=await TournamentService.getTournamentDetails(tId);

        if(!tournamentDetails){
            helper.sendJSON(res,{},true,502,"DB Error !",0);
        }else{
            tournamentDetails.playingTime=await TournamentService.getPlayingTime(tId,userDetails['id']);
            // Check if user has play the tournament.
            tournamentDetails.amount=0;
            if(tournamentDetails.playingTime>0){
                let userLeaderboard=await TournamentService.getTournamentLeaderBoard(tId,userDetails['id']);
                if(userLeaderboard && userLeaderboard.length>0){                
                    let leaderBoard=await TournamentService.getTournamentLeaderBoard(tId);
                    let isUserTop10=false;
                    for(let i=0;i<leaderBoard.length;i++){
                        if(leaderBoard[i]['id']==userLeaderboard[0]['id'])
                        {
                            isUserTop10=true;
                            break;
                        }
                    }
                    if(!isUserTop10)
                        leaderBoard.push(userLeaderboard[0]);
                    tournamentDetails.leaderBoard=leaderBoard;
                }
                
                //Get user Winning amount
                for(let i=0;userLeaderboard && i<userLeaderboard.length;i++){
                    tournamentDetails.amount=tournamentDetails.amount + userLeaderboard[i].amount;
                }
            }
            
            
            

            //Get prizebreakup.
            tournamentDetails.prizeBreakup=await TournamentService.getTournamentPrizeBreakup(tournamentDetails['fkPDId']);
            delete tournamentDetails['fkConfigId'];
            helper.sendJSON(res,tournamentDetails,false,200,"Tournament Details data Listed Successfully .",1);
        }
        
    }
    async getTournamentHistory(req:Request,res:Response){
        const gameId=+req.params.gameId;
        const userDetails=req.headers.data;
        let tournamentHistory=await TournamentService.getTournamentHistory(userDetails['id'],gameId);
        if(tournamentHistory){
            helper.sendJSON(res,tournamentHistory,false,200,"User tournament history data Listed Successfully .",1);
        }
        else{
            helper.sendJSON(res,{},true,502,"DB Error !",0); 
        }
    }
    async initiateGamePlay(req:Request,res:Response){
        const tournamentId:number=+req.params.tournamentId;
        const userDetails=req.headers.data;
        const tournament=await TournamentService.getTournamentDetails(tournamentId);
        if(tournament){
            const gameId=tournament['fkGameId'];
            if(tournament['status']==20){
                const playingTime=await TournamentService.getPlayingTime(tournamentId,userDetails['id']);
                tournament['totalParticipant']=tournament['totalParticipant']==null?0:tournament['totalParticipant'];
                if(tournament['totalParticipant']+1 <= tournament['maxPlayer'] && playingTime < tournament['maxPlaying']){            
                    const gameplay = await MasterPayment.shouldGamePlayBegin(userDetails,gameId, Constant.GameEngine.Tournament, tournamentId);
                    console.log("Tournament shouldGamePlayBegin service response: ", gameplay);
                    if (gameplay['statusCode'] == 500 || gameplay['statusCode'] == 502) {
                        helper.sendJSON(res, gameplay['data'], gameplay['error'], gameplay['statusCode'], gameplay['message'], gameplay['recordTotal']);
                        return;
                    }
                    //Initiate tournament for player
                    let tournamentPlayerData:any={};
                    tournamentPlayerData.fkTournamentId=tournamentId;
                    tournamentPlayerData.fkGameId=gameId;
                    tournamentPlayerData.fkPlayerId=userDetails['id'];
                    tournamentPlayerData.status=10;
                    let initiatePlayer=await TournamentService.createTournamentPlayer(tournamentPlayerData);
                    if(initiatePlayer){
                        let roomData= [{"playerId":tournamentPlayerData.fkPlayerId,"roomId":initiatePlayer.dataValues['id'],"isTournament":1,"timeStamp":new Date()}];
                        const responseHash = await EncDec.encrypt(JSON.stringify(roomData));
                        await TournamentService.updateTournament({id:tournamentId,totalParticipant:tournament['totalParticipant']+1});
                        if (tournament['entryFee']) {
                            const finalPaymentCheckAndUpdate = await MasterPayment.insertEngineKeyIdInLog(userDetails['id'], roomData[0]['roomId'], gameId, Constant.GameEngine.Tournament, tournamentId);
                            if(!finalPaymentCheckAndUpdate){
                                console.log("Unable to update tournament player Room ID in transaction log");
                                helper.sendJSON(res, [], true, 202, "Payment couldn't be processed against this user and tournament room !", 1);
                                return;
                            }
                        }
                        helper.sendJSON(res,responseHash,false,200,"Player Initiated successfully .",0);
                    }
                    else{
                        helper.sendJSON(res,{},true,500,"Unable to initiate player !",0);
                    }

                }
                else{
                    console.log("Playing limit exceeds , User Id : "+userDetails['id']+", Totalparticipent : "+tournament['totalParticipant']+" , Playing Time : "+playingTime);
                    helper.sendJSON(res,{},true,202,"Playing not available !",0);
                }
            }
            else{
                helper.sendJSON(res,{},true,201,"Tournament has been closed !",0);
            }
        }
        else{
            helper.sendJSON(res,{},true,201,"Tournament is not available!",0);
        }
        
    }

    async updateScore(req:Request,res:Response){
        /*console.log("---------------------------------------");
        console.log(req.body);
        console.log("---------------------------------------");*/
        
        const userDetails=req.headers.data;
        const resultConclusive=req.body.resultConclusive;
        const isCompleted=req.body.isCompleted;
        const playerScore=req.body.playerScore;
        const playerNote=req.body.note;
        const roomId=req.body.roomId;
        const tournamentPlayerRequest=JSON.parse(JSON.parse(await EncDec.decrypt(roomId)));
        console.log("Update Tournament Playing : "+isCompleted+" , Score for : ",tournamentPlayerRequest);
        const tournamentPlayerDetails=await TournamentService.getTournamentPlayer(tournamentPlayerRequest[0]['roomId']);

        if(tournamentPlayerDetails){
            //Check whether initiated/In-Playing/Completed.
            if(tournamentPlayerDetails['status']==Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.INITIATED || tournamentPlayerDetails['status']==Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.PLAYING){
                //Update Score
                let GameTimeDetails=await TournamentService.getGameTimeInterval(tournamentPlayerDetails['fkTournamentId']);
                console.log(GameTimeDetails);
                if(GameTimeDetails['gameCategory']==1){
                    //Time Based Game
                    let timeDifference=Math.round((new Date().getTime()-new Date(tournamentPlayerDetails['createdAt']).getTime())/1000);
                    console.log("Time Difference  : ",timeDifference);
                    console.log("game End Tiime  : ",GameTimeDetails['gameEndTime']+config.tournamentGameTimeDifference);
                    if(timeDifference<=GameTimeDetails['gameEndTime']+config.tournamentGameTimeDifference){
                        tournamentPlayerDetails.score=playerScore;
                        tournamentPlayerDetails.note=playerNote;
                        tournamentPlayerDetails.status=isCompleted?Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.COMPLETED:Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.PLAYING;
                        tournamentPlayerDetails.status=resultConclusive?Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.INTERUPTED:tournamentPlayerDetails.status; //Interupted/Completed   
                    }
                    else{
                        tournamentPlayerDetails.score=playerScore;
                        tournamentPlayerDetails.note="Player play more time as defiened Time Diff "+timeDifference;
                        tournamentPlayerDetails.status=30;    //Interupted
                    }
                }
                else{
                    //Score Based game.
                    tournamentPlayerDetails.score=playerScore;
                    tournamentPlayerDetails.note=playerNote;
                    tournamentPlayerDetails.status=isCompleted?20:15;
                    tournamentPlayerDetails.status=resultConclusive?30:tournamentPlayerDetails.status; //Interupted/Completed
                }
                console.log(tournamentPlayerDetails);

                //ToDo : Get player rank and winning amount.

                let updateTP=await TournamentService.updateTournamentPlayers(tournamentPlayerDetails);
                if(updateTP)
                    helper.sendJSON(res,{},false,200,"Score updated successfully .",1);
                else
                    helper.sendJSON(res,{},false,500,"Unable to update score .",1);
            }
            else{
                helper.sendJSON(res,{},true,200,"Room has been closed !",1);
            }


            /*if(isCompleted)
            {
                //Player has completed there playing update final score.
                
            }
            else {
                // Update player playing score.
                if(tournamentPlayerDetails['status']==Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.INITIATED || tournamentPlayerDetails['status']==Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.PLAYING){
                    tournamentPlayerDetails.score=playerScore;
                    tournamentPlayerDetails.status=Constant.GAME_TOURNAMENT.TOURNAMENT_PLAYER.STATUS.PLAYING;
                    await TournamentService.updateTournamentPlayers(tournamentPlayerDetails) 
                    helper.sendJSON(res,{},false,200,"Player score updated successfully.",1);
                }
                else{
                    helper.sendJSON(res,{},true,200,"Player Final score already has been updated!",1);
                }
            }*/
            
        }
        else{
            console.log("User Id  : "+userDetails['id']+" Access denied tournament player !");
            helper.sendJSON(res,{},true,200,"Access Denied !",0);
        }
    }
    async makeFavourateTurnament(req:Request, res:Response){
        var gameId=req.body.gameId;
        var turnamentId=req.body.turnamentId;
        var playerId=req.headers.data['id'];
        //Check if exist/favourite
        var FavouriteGameData=await FavourateGame.get({
            fkGamesId:gameId,
            fkTurnamentId:turnamentId,
            fkUserId: playerId
        });
        if(FavouriteGameData){
            if(FavouriteGameData.length>0){
                var favouriteUpdateData:any={};
                favouriteUpdateData.id=FavouriteGameData[0]['id'];
                favouriteUpdateData.isFavourite=FavouriteGameData[0]['isFavourite']==1?0:1;
                let data=FavourateGame.put(favouriteUpdateData);
                if(data){
                    helper.sendJSON(res,{},false,200,"Favourite Games Updated Successfully",1);
                }
                else{
                    helper.sendJSON(res,{},true,502,"DB Error",0);        
                }
            }
            else{
                //Not Exist and make it favourite
                var favouriteGameInsertData:any={};
                favouriteGameInsertData.fkGamesId=gameId;
                favouriteGameInsertData.fkTurnamentId=turnamentId;
                favouriteGameInsertData.fkUserId=playerId;
                favouriteGameInsertData.isFavourite=1;
                let data=await FavourateGame.post(favouriteGameInsertData);
                if(data){
                    helper.sendJSON(res,{},false,200,"Favourite Games Inserted Successfully",1);
                }
                else{
                    helper.sendJSON(res,{},true,502,"DB Error",0);        
                }
            }
        }
        else{
            helper.sendJSON(res,{},true,502,"DB Error",0);
        }
        
        
    }
}
export default new TournamentCtrl();