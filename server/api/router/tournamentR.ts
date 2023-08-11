import express from 'express';
import tournamentCtrl from '../controllers/tournamentCtrl';

export default express.Router()
    .get('/list/:gameId',tournamentCtrl.getTournamentList)
    .get('/deatils/:tournamentId',tournamentCtrl.getTournamentDetails)
    .get('/history/:gameId',tournamentCtrl.getTournamentHistory)
    .get('/playnow/:tournamentId',tournamentCtrl.initiateGamePlay)
    .post('/updateScore',tournamentCtrl.updateScore);
    