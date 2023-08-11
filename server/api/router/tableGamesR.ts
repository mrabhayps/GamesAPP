import express from 'express';
import tableGames from '../controllers/tableGamesCtrl';

export default express.Router()
    .get('/list', tableGames.getTableTypeList)
    .post('/initTxn', tableGames.initTxn)
    .post('/endTxn', tableGames.endTxn)
    .get('/ingame', tableGames.inGame)
    .post('/refundTxn', tableGames.refundTxn)
    .get('/getStuckTrxnList',tableGames.getTfgStuckTrxnList);