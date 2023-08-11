import express from 'express';
import agoraCtrl from '../controllers/agoraCtrl';


export default express.Router()
    .get('/generate/token',agoraCtrl.generateToken)
;