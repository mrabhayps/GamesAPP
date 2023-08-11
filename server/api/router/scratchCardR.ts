import express from 'express';
import scratchCard from '../controllers/scratchCardCtrl';

export default express.Router()
    .get('/list', scratchCard.getScratchCardsList)
    .post('/', scratchCard.createScratchCard)
    //.post('/updateCard', scratchCard.updateScratchCardDetails)
    .post('/scratched', scratchCard.scratchedScratchCard)
    .get('/details/:scratchCardId', scratchCard.getScratchCardDetails)
    .get('/redeemstodeposit', scratchCard.redeemsToDeposite)
    .get('/referalTcket', scratchCard.userReferralTicket);
    