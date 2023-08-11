import express from 'express';
import PreloginCtrl from '../controllers/preloginCtrl';

export default express.Router()
    .get('/leaderboard',PreloginCtrl.getPreLoginLB);