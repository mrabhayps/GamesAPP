import express from 'express';
import streaksCtrl from '../controllers/streakCtrl';

export default express.Router()
    .post('/', streaksCtrl.processSreaks)
    .get('/list', streaksCtrl.userStreaksList);
    