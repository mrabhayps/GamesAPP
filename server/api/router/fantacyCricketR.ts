import express from 'express';
import fantacyCricketCtrl from '../controllers/fantacyCricketCtrl';

export default express.Router()
    .get('/home', fantacyCricketCtrl.getHomePageData)
    .get('/contest', fantacyCricketCtrl.getMatchContest)
    .get('/contestinfo', fantacyCricketCtrl.getContestInfo)
    .get('/matchplayersquad', fantacyCricketCtrl.getMatchPlayerSquad)
    .post('/createusercontestteam', fantacyCricketCtrl.createUserContestTeam)
    .get('/matchstats', fantacyCricketCtrl.getMatchStats)
    .get('/userteamlist', fantacyCricketCtrl.getUserTeamList)
    .get('/userteampreview', fantacyCricketCtrl.getUserTeamPreview)
    .get('/playerhistoryandpoint', fantacyCricketCtrl.getPlayerHistoryandPoint)
    .get('/contestteamstats', fantacyCricketCtrl.getContestTeamStats)
    .get('/joincontest', fantacyCricketCtrl.joinContast)
    .get('/usercontestteampoint', fantacyCricketCtrl.userContestTeamFantacyPoint)
    .get('/usercontestteamleaderboard', fantacyCricketCtrl.userContestTeamFantacyLeaderBoard)
    .post('/matchReminder',fantacyCricketCtrl.createMatchReminder);
    
    
    