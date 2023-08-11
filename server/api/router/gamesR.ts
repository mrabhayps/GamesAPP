import express from 'express';
import gamesCtrl from '../controllers/gameCtrl';

export default express.Router()
    .get('/gamedetail/:gameId',gamesCtrl.getGameDetails) //Response back the game details
    .get('/matchup',gamesCtrl.getMatchupGameHome) //Respond back the list of matchup game.
    .get('/home',gamesCtrl.getGameHome)//Respons back the list of all game .
    .get('/history',gamesCtrl.getUserGameHistory)
    .get('/keepplaying',gamesCtrl.getKeepPlayingGame)
    .get('/CreateGameRoomRequest',gamesCtrl.createGameRoomRequestV2) 
    .get('/CreateGameRoomRequestV2',gamesCtrl.createGameRoomRequestV3) 
    .post('/updateBattleGameResultRequest',gamesCtrl.updateBattleGameResultRequestV2)
    .post('/updateTournamentGameResultRequest',gamesCtrl.updateTournamentGameResultRequest)
    .get('/fetchGameResultRequest',gamesCtrl.getGameResultRequest)
    .post('/gServHealthCheck',gamesCtrl.manageGameServerBasedOnHealth)
    .get('/whoiswinning',gamesCtrl.getWhoIsWinning)
    .post('/favourite', gamesCtrl.makeFavouriteGame)
    .get('/recentlyplayed', gamesCtrl.getRecentlyPlayedGames)
    .post('/playgame', gamesCtrl.playGame)
    .post('/rematch', gamesCtrl.rematch)
    .post('/rejectRequest', gamesCtrl.rejectRequest);

    
    