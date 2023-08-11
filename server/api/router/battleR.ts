import express from 'express';
import battleRoomctrl from '../controllers/battleRoomCtrl';
import battleCtrl from '../controllers/battleCtrl';

export default express.Router()
    .post('/allocateroom',battleRoomctrl.allocateRoom)
    .get('/battledetails/:battleId',battleCtrl.getBattleDetails);
    