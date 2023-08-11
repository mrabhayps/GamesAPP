import { Request, Response } from 'express';
import helper from '../../common/helper';
import scratchCard from '../services/scratchCard.service';
import Constant from '../../common/app.constant';

export class ScratchCardCtrl{

    async createScratchCard(req:Request, res:Response){
        try{
            const userDetail = req.headers.data;
            const gameType = req.body.gameType;
            const referenceId = req.body.referenceId;
            if(referenceId != ""){
                const flag = await scratchCard.isAvailableForScratchCard(userDetail['id'],gameType,referenceId);
                if(flag){
                    const scratchCardData = await scratchCard.createScratchCard(userDetail['id'], gameType, referenceId);
                    await helper.sendJSON(res, scratchCardData['data'], scratchCardData['error'], scratchCardData['statusCode'], scratchCardData['message'], scratchCardData['recordTotal'], scratchCard['isEncrypted'])
                    return;
                }
                else{
                    await helper.sendJSON(res, {}, true, 400, "Invalid requested data !!", 0);          
                }
                
            }else{
                await helper.sendJSON(res, {}, true, 400, "Please send reference id !!", 0);
                return;    
            }
        }catch(error){
            await helper.sendJSON(res, {}, true, 500, "Internal Error !!", 0);  
        }
    }

    async getScratchCardDetails(req:Request, res:Response){
        try{
            let userDetail = req.headers.data;
            let scratchCardId:number = parseInt(req.params.scratchCardId);
            let data = await scratchCard.getScratchCardDetails(userDetail['id'], scratchCardId);
            await helper.sendJSON(res, data, false, 200, "Scratch Card details fetched successfully.", 1);
        }catch(error){
            await helper.sendJSON(res, {}, true, 503, "Sorry! Scratch Card is not available.", 0); 
        }    
    }

    async scratchedScratchCard(req:Request, res:Response){
        try{
            let userDetail = req.headers.data;
            let userScratchCardId:number = req.body.scratchCardId;
            let cardState:number = req.body.cardState;
            // let data = await scratchCard.updateScrachCardDetails(userDetail['id'], userScratchCardId, cardState);
            // await helper.sendJSON(res, data['data'], data['error'], data['statusCode'], data['message'], data['recordTotal'], scratchCard['isEncrypted'])
            if(cardState==3){
                let data=await scratchCard.scratchedScratchCard(userDetail['id'],userScratchCardId);
                if(!data)
                    helper.sendJSON(res, {}, true, 502, "DB Error !!", 0);
                else if(data==200)
                    helper.sendJSON(res, {}, false, 200, "Scratched Successfully .", 0);
                else if(data==400)
                    helper.sendJSON(res, {}, true, 400, "Invalid Requested Data/Already Scratched !!", 0);
                else    
                    helper.sendJSON(res, {}, true, 500, "Sorry! We are facing some technical issue. Please try again.", 0); 
            }
            else{
                helper.sendJSON(res, {}, true, 400, "Invalid Requested Data !!", 0);     
            }

        }catch(error){
            //await helper.sendJSON(res, {}, true, 503, "Sorry! We are facing some technical issue. Please try again.", 0); 
            helper.sendJSON(res, {}, true, 500, "Sorry! We are facing some technical issue. Please try again.", 0); 
        }
        
    }

    async redeemsToDeposite(req:Request, res:Response){
        let userDetail = req.headers.data;
        try{
            const availableTickets=await scratchCard.getAvailableTickets(userDetail['id']);
            if(availableTickets['cnt']<=0){
                helper.sendJSON(res, {}, true, 201, "Sorry! Please share the referral code to redeems the unlock amount.", 0); 
            }
            else{
                const unlockAmount=await scratchCard.getUnlockedAmount(userDetail['id']);
                if(unlockAmount<=0){
                    helper.sendJSON(res, {}, true, 202, "Sorry! You don't have any amount to redeems.", 0); 
                }
                else{
                    let data=await scratchCard.redeemsToDeposite(userDetail['id'],unlockAmount,availableTickets['onboardedUserId']);
                    if(data==200)
                        helper.sendJSON(res, {}, false, 200, "Redeems success.", 0);
                    else if(data==500)
                        helper.sendJSON(res, {}, true, 500, "Internal Error !!", 0);
                }
            }
        }
        catch(error){
            helper.sendJSON(res, {}, true, 500, "Internal Error !!", 0);
        }
    }

    async getScratchCardsList(req:Request, res:Response){
        try{
            let userDetail = req.headers.data;
            let scratchCardsList:any = {}
            let page:number = +req.query.page || 1;
            let page_size:number = +req.query.page_size || 20;
            
            console.log("getScratchCardsList page: ", page);
            if(page > 1) {
                scratchCardsList = await scratchCard.getScratchCardsList(userDetail['id'], true, page, page_size);
            } else {
                scratchCardsList = await scratchCard.getScratchCardsList(userDetail['id']);
            }
            if(scratchCardsList && scratchCardsList.length > 0){
                //const totalRewards = await scratchCard.getTotalRewards(userDetail['id'])
                const unlockedAmount=await scratchCard.getUnlockedAmount(userDetail['id']);
                const availableTickets=await scratchCard.getAvailableTickets(userDetail['id']);
                let data:any = {
                    "unlockedAmount": unlockedAmount,
                    "availableTickets":availableTickets['cnt'],
                    "data": scratchCardsList
                }
                helper.sendJSON(res, data, false, 200, "User's Scratch Cards list fetched successfully", scratchCardsList.length, true);
            }else{
                helper.sendJSON(res, {}, false, 200, "You don't have any any scratch cards", 0);
            }
        }catch(error){
            helper.sendJSON(res, {}, true, 500, "Internal error !!", 0);
        }
    }

    async userReferralTicket(req:Request, res:Response){
        const userDetail = req.headers.data;
        try{
            let data=await scratchCard.getReferralTicketList(userDetail['id']);
            if(!data){
                helper.sendJSON(res, [], true, 502, "DB Error !!", 0);    
            }
            else{
                helper.sendJSON(res, data, false, 200, "Referral Ticket Listed Successfully.", data.length);    
            }
        }
        catch(error){
            console.log("Error in userReferralTicket() : ",error);
            helper.sendJSON(res, [], true, 500, "Internal Error !!", 0);
        }
    }
}
export default new ScratchCardCtrl();