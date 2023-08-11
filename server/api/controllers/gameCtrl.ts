import { Request, Response } from 'express';
import Games from '../services/games.service';
import FavouriteGames from '../services/favouriteGame.service';
import Battle from '../services/battle.service';
import BattleRoom from '../services/battleRoom.service';
import TournamentService from '../services/turnament.service';
import MasterPayment from '../services/payment/master.service';
import EncDec from '../../common/encDec.service';
import helper from '../../common/helper';
import Constant from '../../common/app.constant';
import * as secretConfig from '../../common/secret.config.json';
var config: any = secretConfig;
import fs from 'fs';
import { StatsDClient } from '../../common/statsd.service';
import Notifications from '../notifications/notification.service';
import EC2Services, { EC2Service } from '../../common/services/ec2.services';
//import { CacheService } from '../cache/cache.service';
import userService from '../services/user.service';

export class GamesCtrl {
    async getGameDetails(req: Request, res: Response) {
        var gameId = req.params.gameId;
        var playerId = req.headers.data['id'];
        var gameDetails = await Games.get(gameId, playerId);
        if (gameDetails) {
            /*let turnamentId="";
            for(var i=0;i<gameDetails.keepPlaying.length;i++){
                turnamentId=gameDetails.keepPlaying[i].id;
                let data=await FavouriteGames.get({
                    fkGamesId:gameId,
                    fkTurnamentId:turnamentId,
                    fkUserId: playerId
                });
                gameDetails.keepPlaying[i].isFavouriteGame=(data && data.length>0 && data[0].isFavourite==1)?true:false;
            }
            for(var i=0;i<gameDetails.tournament.length;i++){
                turnamentId=gameDetails.tournament[i].id;
                let data=await FavouriteGames.get({
                    fkGamesId:gameId,
                    fkTurnamentId:turnamentId,
                    fkUserId: playerId
                });
                gameDetails.tournament[i].isFavouriteGame=(data && data.length>0 && data[0].isFavourite==1)?true:false;
            }*/
            helper.sendJSON(res, gameDetails, false, 200, "Game Details data Listed Successfully", 1);
        }
        else {
            helper.sendJSON(res, [], true, 502, "DB Error", 0);
        }
    }
    async getMatchupGameHome(req: Request, res: Response) {
        //This will list the matchup screen home page data.
        let data = await Games.getMatchupGame();
        if (data) {
            helper.sendJSON(res, data, false, 200, "Matchup Game Data Listed Successfully .", 0);
        }
        else {
            helper.sendJSON(res, [], true, 502, "DB Error .", 0);
        }

    }
    async getGameHome(req: Request, res: Response) {
        //This will list the home page data.
        // let data=await Games.getGameList();
        let data = await Games.getPopularGames();
        if (data) {
            // for(let i=0;i<data.length;i++){
            //     data[i]['onlineUser']=await Games.getOnlinePlayerInGame(data[i]['id']);
            // }
            //helper.sendJSON(res,data,false,200,"Game Home Data Listed Successfully .",0,true);
            helper.sendJSON(res, data, false, 200, "Popular game data listed successfully .", 0, true,);
        }
        else {
            helper.sendJSON(res, [], true, 502, "DB Error .", 0);
        }

    }

    async getUserGameHistory(req: Request, res: Response) {
        //This API is used to display the list of tournament and battle played by user in specific game.
        var query = req.query;
        var userDetails = req.headers.data;
        var gameId = +req.query.gameId;
        var historyType = +req.query.historyType;
        historyType = historyType == undefined ? 3 : historyType;

        var searchParams = req.query.searchParams;

        //History Type 1:Battle, 2:Tournament, 3:Both(Tournament/Battle)
        if (historyType == 1 || historyType == 3) {
            var battleHistory = await Battle.getBattleHistory(gameId, userDetails['id'], searchParams);
            if (!battleHistory)
                helper.sendJSON(res, [], true, 502, "DB Error .", 0);
            else {
                for (var i = 0; i < battleHistory.length; i++) {
                    var result;
                    var resultStatus;
                    if (battleHistory[i]['status'] == 300) {
                        let player1Id = battleHistory[i]['fk_PlayerId1'];
                        let player2Id = battleHistory[i]['fk_PlayerId2'];
                        let player1Score = +battleHistory[i]['playerScore1'];
                        let player2Score = +battleHistory[i]['playerScore2'];

                        let wonUser = player1Score > player2Score ? player1Id : player2Id;
                        result = userDetails['id'] == wonUser ? "YOU WON - ₹ " + battleHistory[i]['winningAmount'] : "BETTER LUCK, KEEP TRYING";
                        resultStatus = userDetails['id'] == wonUser ? Constant.Battle.BattleResultStatus.Winner : Constant.Battle.BattleResultStatus.Looser;

                    }
                    else if (battleHistory[i]['status'] == 350) {
                        result = "IT'S A TIE";
                        resultStatus = Constant.Battle.BattleResultStatus.Draw;
                    }
                    else if (battleHistory[i]['status'] == 400) {
                        result = "BATTLE HAS BEEN CANCELED";
                        resultStatus = Constant.Battle.BattleResultStatus.Cancled;
                    }
                    else {

                    }
                    delete battleHistory[i]['fk_PlayerId1'];
                    delete battleHistory[i]['fk_PlayerId2'];
                    delete battleHistory[i]['playerScore1'];
                    delete battleHistory[i]['playerScore2'];
                    battleHistory[i]['resultStatus'] = resultStatus;
                    battleHistory[i]['result'] = result;
                }
            }

        }

        if (historyType == 2 || historyType == 3) {
            var tournamentHistory = await TournamentService.getTournamentHistory(userDetails['id'], gameId)
            !tournamentHistory ? helper.sendJSON(res, [], true, 502, "DB Error .", 0) : '';
        }

        var gameHistory: any = {};
        gameHistory.battleHistory = battleHistory;
        gameHistory.tournamentHistory = tournamentHistory;

        helper.sendJSON(res, gameHistory, false, 200, "Game History Listed Successfully .", 1);
    }

    async createGameRoomRequest(req: Request, res: Response) {

        //Fetch User Details
        var userDetails = req.headers.data;
        var isTournament = +req.query.isTournament;

        if (isTournament == 1) {
            var tournamentId = req.query.tournamentId;
            //let data=await TournamentService.createTournamentPlayer(userDetails,tournamentId);
            let data = await TournamentService.createTournamentPlayer({});
            !data ? helper.sendJSON(res, [], true, 500, "DB Error ..", 0) : '';
            //if(data && data.length>0){
            if (data) {
                var responseHash = await EncDec.encrypt(JSON.stringify(data));
                helper.sendJSON(res, [JSON.stringify(responseHash)], false, 200, "Game Room Created Successfully ", 1);
            }
            else {
                helper.sendJSON(res, [], false, 200, "Unable To Create Game Room for Battle", 1);
            }
        }
        else if (isTournament == 0 || isTournament == 2) {
            var battleId = req.query.battleId;
            var gameId = await helper.getColValue("gmsBattle", "fk_GamesId", { "id": battleId });
            var videoRoomId = null;
            if (isTournament == 2)
                videoRoomId = await helper.generateVideoRoomNum();
            //look and allocate if any battle room available 
            var data = await BattleRoom.allocateBattleRoom(userDetails, battleId, gameId, videoRoomId);

            if (data && data.length > 0) {
                if (isTournament == 2) {
                    videoRoomId = await helper.getColValue("gmsBattleRoom", "videoRoomId", { "id": data[0]['roomId'] })
                }
                var responseHash = await EncDec.encrypt(JSON.stringify(data));
                console.log(responseHash);
                responseHash['videoRoomId'] = videoRoomId;
                responseHash['roomId'] = data[0]['roomId'];
                let isRoomIdUpdated = await MasterPayment.insertEngineKeyIdInLog(userDetails['id'], data[0]['roomId'], gameId, Constant.GameEngine.Battle, battleId);
                if (!isRoomIdUpdated)
                    console.log("Unable To update Room ID in Transaction Log");

                helper.sendJSON(res, responseHash, false, 200, "Game Room Allocated Successfully ", 1);
            }
            else {
                if (!data)
                    helper.sendJSON(res, [], true, 500, "Room Creation DB Error ..", 0);
                else
                    helper.sendJSON(res, [], false, 200, "Unable To Create Game Room", 1);
            }
        }

    }

    async createGameRoomRequestV2(req: Request, res: Response) {
        try {
            const startTime = new Date().getTime();
            StatsDClient.getInstance().getClient().counter("nodeapp.battleroom.create.count", 1);
            //Fetch User Details
            const userDetails = req.headers.data;
            const isTournament = +req.query.isTournament;

            if (isTournament == 1) {
                const tournamentId = req.query.tournamentId;
                //const data = await TournamentService.createTournamentPlayer(userDetails, tournamentId);
                const data = await TournamentService.createTournamentPlayer({});
                !data ? helper.sendJSON(res, [], true, 500, "DB Error ..", 0) : '';
                //if (data && data.length>0) {
                if (data) {
                    const responseHash = await EncDec.encrypt(JSON.stringify(data));
                    helper.sendJSON(res, [JSON.stringify(responseHash)], false, 200, "Game Room Created Successfully ", 1);
                }
                else {
                    helper.sendJSON(res, [], false, 200, "Unable To Create Game Room for Battle", 1);
                }
            }
            else if (isTournament == 0 || isTournament == 2) {
                const battleId = +req.query.battleId;
                const gmsBattle = await helper.getAllColValue("gmsBattle", { "id": battleId });
                const gameId = gmsBattle[0].fkGamesId;
                const isPaidGame = gmsBattle[0].isPaid;
                const paidAmount = gmsBattle[0].paidAmount;
                const gameTC = await helper.getColsValue("gmsGames", ["gameCategory", "gameType", "gameEndTime"], { "id": gameId });

                const gameCategory = gameTC[0]['gameCategory'];
                const gameType = gameTC[0]['gameType'];
                const gameEndTime = gameTC[0]['gameEndTime'];

                if (!gameCategory || !gameType) {
                    //Game category/Type must be specify.It shuld not be undefined or null.
                    helper.sendJSON(res, [], true, 200, "Error: Game Category/Type is not defined !!", 0);
                }
                else {
                    let videoRoomId = null;
                    //Video room id generation.
                    if (isTournament == 2)
                        videoRoomId = await helper.generateVideoRoomNum();

                    //look and allocate if any battle room available 
                    // var data=await BattleRoom.allocateBattleRoom(userDetails,battleId,gameId,videoRoomId);
                    var serverIP = await helper.allocateGameServer(gameType);//Get minimum active session game server.
                    const socketUrl = "ws://" + serverIP + "/ws/";//Socket URL
                    if (!serverIP) {
                        helper.sendJSON(res, [], true, 202, "Web Socket URL not found.", 1);
                    }
                    else {
                        await helper.pushToBattleRoomTopic(userDetails, battleId, socketUrl);

                        await helper.sleep(140);
                        let apiRespData = null;
                        //const battleRoomDetailsFromCache = await CacheService.getCache('BRP:' + userDetails['id']);
                        const battleRoomDetailsFromCache = null;
                        console.log("battleRoomDetailsFromCache: ", battleRoomDetailsFromCache);
                        if (!battleRoomDetailsFromCache) {
                            const url = process.env.BATTLE_ROOM_HOST + process.env.BR_PLAYER_API + userDetails['id'];
                            apiRespData = await helper.retryGet(url);
                        } else {
                            if (battleRoomDetailsFromCache && battleRoomDetailsFromCache['roomId']) {
                                apiRespData = {
                                    status: "success",
                                    message: "ok",
                                    data: battleRoomDetailsFromCache
                                }
                            }
                        }

                        console.log("apiRespData: ", apiRespData);
                        if (apiRespData && apiRespData['status'] && apiRespData['status'] == "success") {
                            const data = [
                                {
                                    "playerId": userDetails['id'],
                                    "roomId": apiRespData['data'].roomId,
                                    "gameID": gameId,
                                    "isTournament": 0,
                                    "timeStamp": new Date(),
                                    "gameCategory": gameCategory,
                                    "gameEndTime": gameEndTime
                                }
                            ]
                            const responseHash = await EncDec.encrypt(JSON.stringify(data));
                            console.log(responseHash);
                            responseHash['videoRoomId'] = videoRoomId;
                            responseHash['roomId'] = apiRespData['data'].roomId;

                            const finalPaymentCheckAndUpdate = await MasterPayment.insertEngineKeyIdInLog(userDetails['id'], apiRespData['data'].roomId, gameId, Constant.GameEngine.Battle, battleId);
                            console.log("finalPaymentCheckAndUpdate: ", finalPaymentCheckAndUpdate);
                            console.log("isPaidGame: ", isPaidGame);
                            console.log("paidAmount: ", paidAmount);
                            if (isPaidGame && !finalPaymentCheckAndUpdate) {
                                console.log("Unable To update Room ID in Transaction Log");
                                console.log("Retry payment..");
                                // deduct balance 
                                const isSuccessfull = await MasterPayment.userAccountBalanceDeductionV2(userDetails, paidAmount, gameId, Constant.GameEngine.Battle, battleId, apiRespData['data'].roomId, false);
                                if (isSuccessfull == 200)
                                    console.log("Proceed for BattleRoom Assignment in gmsBattleRoom Table.");
                                else if (isSuccessfull == 502) {
                                    helper.sendJSON(res, [], true, 502, "Insufficient Balance !!", 0);
                                    return;
                                }
                                else {
                                    helper.sendJSON(res, [], true, 500, "Couldn't process payment! Please try again in a while.", 0);
                                    return;
                                }
                            }

                            if (apiRespData['data']['status'] == "ACTIVE") {
                                responseHash['su'] = socketUrl;
                                //Create New Room in DB .
                                var insertbattleRoom: any = {};
                                insertbattleRoom.fk_BattleId = battleId;
                                insertbattleRoom.fk_GameId = gameId;
                                insertbattleRoom.fk_PlayerId1 = userDetails['id'];
                                insertbattleRoom.videoRoomId = videoRoomId;
                                insertbattleRoom.br_roomId = apiRespData['data'].roomId,
                                    insertbattleRoom.status = 100;
                                let create = await BattleRoom.createNewBattleRoomV2(insertbattleRoom);
                                if (create)
                                    console.log("Room created successfully . " + apiRespData['data'].roomId);
                                else
                                    console.log("Problem in creating room !! " + apiRespData['data'].roomId);
                            }
                            else if (apiRespData['data']['status'] == "LOCKED") {
                                responseHash['su'] = apiRespData['data']['socketUrl'];
                                await helper.releaseGameServer(serverIP);
                                var battleRoomUpdate: any = {};
                                battleRoomUpdate.fk_PlayerId2 = userDetails['id'];
                                battleRoomUpdate.status = 150;
                                let update = await BattleRoom.updateBattleRoomV2(battleRoomUpdate, apiRespData['data'].roomId);
                                if (update)
                                    console.log("Room updated successfully . " + apiRespData['data'].roomId);
                                else
                                    console.log("Problem in updateing room !! " + apiRespData['data'].roomId);
                            }
                            StatsDClient.getInstance().getClient().timing("nodeapp.battleroom.create.time", new Date().getTime() - startTime);
                            helper.sendJSON(res, responseHash, false, 200, "Game Room Allocated Successfully ", 1);
                        } else {
                            helper.sendJSON(res, [], false, 200, "Battle Room Server Error.", 1);
                        }
                    }//End of server IPs else block.
                }

            } else {
                helper.sendJSON(res, [], false, 200, "Error: Value for isTournament is not supported", 1);
            }
        } catch (err) {
            console.log(err);
            helper.sendJSON(res, [], false, 200, "Oops! Room creation request failed!", 1);
        }

    }

    // clubbed gameplay and creategameroomrequest api 
    async createGameRoomRequestV3(req: Request, res: Response) {
        try {
            const startTime = new Date().getTime();
            StatsDClient.getInstance().getClient().counter("nodeapp.battleroom.create.count", 1);

            //Fetch User Details
            const userDetails = req.headers.data;
            const isTournament = +req.query.isTournament;
            const gameId = +req.query.gameId;
            const gameEngine = +req.query.gameEngine;
            const engineId = +req.query.engineId;

            // gameplay service
            const gameplay = await MasterPayment.shouldGamePlayBegin(userDetails, gameId, gameEngine, engineId);
            console.log("shouldGamePlayBegin service response: ", gameplay);
            if (gameplay['statusCode'] == 500 || gameplay['statusCode'] == 502) {
                helper.sendJSON(res, gameplay['data'], gameplay['error'], gameplay['statusCode'], gameplay['message'], gameplay['recordTotal']);
                return;
            }

            // create game room request api service 
            if (isTournament == 1) {
                const tournamentId = req.query.tournamentId;
                //const data = await TournamentService.createTournamentPlayer(userDetails, tournamentId);
                const data = await TournamentService.createTournamentPlayer({});
                !data ? helper.sendJSON(res, [], true, 500, "DB Error ..", 0) : '';
                //if (data && data.length>0) {
                if (data) {
                    const responseHash = await EncDec.encrypt(JSON.stringify(data));
                    helper.sendJSON(res, [JSON.stringify(responseHash)], false, 200, "Game Room Created Successfully ", 1);
                }
                else {
                    helper.sendJSON(res, [], false, 200, "Unable To Create Game Room for Battle", 1);
                }
            }
            else if (isTournament == 0 || isTournament == 2) {
                const battleId = +req.query.battleId;
                const gmsBattle = await helper.getAllColValue("gmsBattle", { "id": battleId });
                const gameId = gmsBattle[0].fkGamesId;
                const isPaidGame = gmsBattle[0].isPaid;
                const paidAmount = gmsBattle[0].paidAmount;
                const gameTC = await helper.getColsValue("gmsGames", ["gameCategory", "gameType", "gameEndTime"], { "id": gameId });

                const gameCategory = gameTC[0]['gameCategory'];
                const gameType = gameTC[0]['gameType'];
                const gameEndTime = gameTC[0]['gameEndTime'];

                if (!gameCategory || !gameType) {
                    //Game category/Type must be specify.It shuld not be undefined or null.
                    helper.sendJSON(res, [], true, 200, "Error: Game Category/Type is not defined !!", 0);
                }
                else {
                    let videoRoomId = null;
                    //Video room id generation.
                    if (isTournament == 2)
                        videoRoomId = await helper.generateVideoRoomNum();

                    //look and allocate if any battle room available 
                    // var data=await BattleRoom.allocateBattleRoom(userDetails,battleId,gameId,videoRoomId);
                    var serverIP = await helper.allocateGameServer(gameType);//Get minimum active session game server.
                    const socketUrl = "ws://" + serverIP + "/ws/";//Socket URL
                    if (!serverIP) {
                        helper.sendJSON(res, [], true, 202, "Web Socket URL not found.", 1);
                    }
                    else {
                        await helper.pushToBattleRoomTopic(userDetails, battleId, socketUrl);

                        await helper.sleep(140);
                        let apiRespData = null;
                        //const battleRoomDetailsFromCache = await CacheService.getCache('BRP:' + userDetails['id']);
                        const battleRoomDetailsFromCache = null; //await CacheService.getCache('BRP:' + userDetails['id']);
                        console.log("battleRoomDetailsFromCache: ", battleRoomDetailsFromCache);
                        if (!battleRoomDetailsFromCache) {
                            const url = process.env.BATTLE_ROOM_HOST + process.env.BR_PLAYER_API + userDetails['id'];
                            apiRespData = await helper.retryGet(url);
                        } else {
                            if (battleRoomDetailsFromCache && battleRoomDetailsFromCache['roomId']) {
                                apiRespData = {
                                    status: "success",
                                    message: "ok",
                                    data: battleRoomDetailsFromCache
                                }
                            }
                        }

                        console.log("apiRespData: ", apiRespData);
                        if (apiRespData && apiRespData['status'] && apiRespData['status'] == "success") {
                            const data = [
                                {
                                    "playerId": userDetails['id'],
                                    "roomId": apiRespData['data'].roomId,
                                    "gameID": gameId,
                                    "isTournament": 0,
                                    "timeStamp": new Date(),
                                    "gameCategory": gameCategory,
                                    "gameEndTime": gameEndTime
                                }
                            ]
                            const responseHash = await EncDec.encrypt(JSON.stringify(data));
                            console.log(responseHash);
                            responseHash['videoRoomId'] = videoRoomId;
                            responseHash['roomId'] = apiRespData['data'].roomId;

                            const finalPaymentCheckAndUpdate = await MasterPayment.insertEngineKeyIdInLog(userDetails['id'], apiRespData['data'].roomId, gameId, Constant.GameEngine.Battle, battleId);
                            if (isPaidGame && !finalPaymentCheckAndUpdate) {
                                console.log("Unable To update Room ID in Transaction Log");
                                helper.sendJSON(res, [], true, 202, "Payment couldn't be processed against this user and BattleRoom", 1);
                                return;
                            }

                            if (apiRespData['data']['status'] == "ACTIVE") {
                                responseHash['su'] = socketUrl;
                                //Create New Room in DB .
                                var insertbattleRoom: any = {};
                                insertbattleRoom.fk_BattleId = battleId;
                                insertbattleRoom.fk_GameId = gameId;
                                insertbattleRoom.fk_PlayerId1 = userDetails['id'];
                                insertbattleRoom.videoRoomId = videoRoomId;
                                insertbattleRoom.br_roomId = apiRespData['data'].roomId,
                                    insertbattleRoom.status = 100;
                                let create = await BattleRoom.createNewBattleRoomV2(insertbattleRoom);
                                if (create)
                                    console.log("Room created successfully . " + apiRespData['data'].roomId);
                                else
                                    console.log("Problem in creating room !! " + apiRespData['data'].roomId);
                            }
                            else if (apiRespData['data']['status'] == "LOCKED") {
                                responseHash['su'] = apiRespData['data']['socketUrl'];
                                await helper.releaseGameServer(serverIP);
                                var battleRoomUpdate: any = {};
                                battleRoomUpdate.fk_PlayerId2 = userDetails['id'];
                                battleRoomUpdate.status = 150;
                                let update = await BattleRoom.updateBattleRoomV2(battleRoomUpdate, apiRespData['data'].roomId);
                                if (update)
                                    console.log("Room updated successfully . " + apiRespData['data'].roomId);
                                else
                                    console.log("Problem in updateing room !! " + apiRespData['data'].roomId);
                            }
                            StatsDClient.getInstance().getClient().timing("nodeapp.battleroom.create.time", new Date().getTime() - startTime);
                            helper.sendJSON(res, responseHash, false, 200, "Game Room Allocated Successfully ", 1);
                        } else {
                            helper.sendJSON(res, [], false, 200, "Battle Room Server Error.", 1);
                        }
                    }//End of server IPs else block.
                }

            } else {
                helper.sendJSON(res, [], false, 200, "Error: Value for isTournament is not supported", 1);
            }
        } catch (err) {
            console.log(err);
            helper.sendJSON(res, [], false, 200, "Oops! Room creation request failed!", 1);
        }

    }

    async updateBattleGameResultRequest(req: Request, res: Response) {
        console.log("Update Battle Room Result " + JSON.stringify(req.body));
        var userDetails = req.headers.data;
        if (userDetails['id'] == config.UpdateBattleResultAPIUser) {
            var resultConclusive = req.body.resultConclusive;
            var player1Id = req.body.player1SessionId;
            var player2Id = req.body.player2SessionId;
            var player1Score = req.body.player1Score ? +req.body.player1Score : 0;
            var player2Score = req.body.player2Score ? +req.body.player2Score : 0;
            var roomId = req.body.roomId;
            var note = req.body.note ? req.body.note : null;
            var status = 300; //Match completed successfully 
            if (resultConclusive == true) {
                status = 400; //Match not completed successfully
            }
            else if (player1Score == player2Score) {
                status = 350; //Both player gained same score 
            }
            else {
                //status=500; //Error Status
            }

            var br = await BattleRoom.getBattleRoom(roomId);

            if (!br) {
                helper.sendJSON(res, [], true, 500, "DB Error !!", 0);
            } else if (br.length == 0) {
                console.log("Battle Room Not Exist : " + roomId);
                helper.sendJSON(res, [], true, 200, "Room Not exist !!", 0);
            }
            else {
                if (br[0]['status'] == 300 || br[0]['status'] == 350 || br[0]['status'] == 400 || br[0]['status'] == 450) {
                    console.log("Battle room has been closed." + roomId + ", Status : " + br[0]['status']);
                    helper.sendJSON(res, [], true, 200, "Room Id : " + roomId + "  has been closed !!", 0);

                }
                else {
                    if (br.length > 0) {
                        var gameId = br[0]['fk_GameId'];
                        var battleId = br[0]['fk_BattleId'];

                        var battleRoomUpdate: any = {};
                        battleRoomUpdate.playerScore1 = br[0]['fk_PlayerId1'] == player1Id ? player1Score : player2Score;
                        battleRoomUpdate.playerScore2 = br[0]['fk_PlayerId2'] == player2Id ? player2Score : player1Score;
                        battleRoomUpdate.status = status;
                        battleRoomUpdate.id = roomId;
                        battleRoomUpdate.note = note;
                        let data = await BattleRoom.updateBattleRoom(battleRoomUpdate);
                        if (!data) {
                            console.log("Unable to update battle room : " + roomId);
                            helper.sendJSON(res, [], true, 500, "DB Error ..", 0)
                        }
                        else {
                            var winnerPlayer;
                            winnerPlayer = +battleRoomUpdate.playerScore1 > +battleRoomUpdate.playerScore2 ? br[0]['fk_PlayerId1'] : br[0]['fk_PlayerId2'];
                            var isPaymentSucccessfull = await MasterPayment.makeBattlePayment(br[0]['fk_PlayerId1'], br[0]['fk_PlayerId2'], winnerPlayer, gameId, battleId, status, roomId);
                            var responseData;
                            if (isPaymentSucccessfull) {
                                console.log("Payment Successfull");
                                responseData = (status == 300 || status == 350) ? isPaymentSucccessfull : [];
                            }
                            else {
                                console.log("Something Went wrong in payment");
                                responseData = [];
                            }
                            helper.sendJSON(res, responseData, false, 200, "Battle Room Score Updated Successfully .", 1);
                        }
                    }
                    else {
                        helper.sendJSON(res, [], true, 200, "This Room not available .", 1);
                    }
                }
            }


        }
        else {
            console.log("Battle room update from Un-Authorize Token : " + JSON.stringify(userDetails));
            helper.sendJSON(res, [], false, 200, "Access Denied.", 1);
        }

    }

    async updateBattleGameResultRequestV2(req: Request, res: Response) {
        try {
            const startTime = new Date().getTime();
            StatsDClient.getInstance().getClient().counter("nodeapp.battleroom.update.count", 1);
            console.log("Update Battle Room Result " + JSON.stringify(req.body));
            const userDetails = req.headers.data;
            if (userDetails['id'] == config.UpdateBattleResultAPIUser) {
                const resultConclusive = req.body.resultConclusive;
                const player1Id = req.body.player1SessionId;
                const player2Id = req.body.player2SessionId;
                const player1Score = req.body.player1Score ? +req.body.player1Score : 0;
                const player2Score = req.body.player2Score ? +req.body.player2Score : 0;
                const roomId = req.body.roomId;
                const note = req.body.note ? req.body.note : null;
                let status = 300; //Match completed successfully 
                if (resultConclusive == true) {
                    status = 400; //Match not completed successfully
                }
                else if (player1Score == player2Score) {
                    status = 350; //Both player gained same score 
                }
                else {
                    //status=500; //Error Status
                }

                let br = null;
                // try to get it from sql db
                br = await BattleRoom.getBattleRoomBr(roomId);

                if (br.length === 0) {
                    // if sql db doesn't have it, get it from battleRoom server 
                    br = await BattleRoom.fetchBattleRoomDetails(roomId);
                }

                if (!br) {
                    helper.sendJSON(res, [], true, 500, "DB Error !!", 0);
                } else if (br.length == 0) {
                    console.log("Battle Room Does Not Exist : " + roomId);
                    helper.sendJSON(res, [], true, 200, "Room Not exist !!", 0);
                }
                else {
                    if (br[0]['status'] == 300 || br[0]['status'] == 350 || br[0]['status'] == 400 || br[0]['status'] == 450) {
                        console.log("Battle room has been closed." + roomId + ", Status : " + br[0]['status']);
                        helper.sendJSON(res, [], true, 200, "Room Id : " + roomId + "  has been closed !!", 0);
                    }
                    else {
                        await helper.releaseGameServer(req["IP"]);
                        if (br.length > 0) {
                            const gameId = br[0]['fk_GameId'];
                            const battleId = br[0]['fk_BattleId'];
                            const cacheKey1 = await helper.generatePrivateBattleRoomCacheKey('BREMATCH', req.body.player1SessionId, req.body.player2SessionId);
                            const cacheKey2 = await helper.generatePrivateBattleRoomCacheKey('BREMATCH', req.body.player2SessionId, req.body.player1SessionId);
                            /*await CacheService.deleteCacheData(cacheKey1);
                            await CacheService.deleteCacheData(cacheKey2);*/
                            const battleRoomUpdate = {
                                playerScore1: br[0]['fk_PlayerId1'] == player1Id ? player1Score : player2Score,
                                playerScore2: br[0]['fk_PlayerId2'] == player2Id ? player2Score : player1Score,
                                status: status,
                                id: br[0]['id'],
                                note: note,
                            }
                            const data = await BattleRoom.updateBattleRoom(battleRoomUpdate);
                            if (!data) {
                                console.log("Unable to update battle room : " + roomId);
                                helper.sendJSON(res, [], true, 500, "DB Error ..", 0);
                            }
                            else {
                                // Updating total no.of players in the game
                                Games.updatePlayerCount(gameId);
                                let winnerPlayer = +battleRoomUpdate.playerScore1 > +battleRoomUpdate.playerScore2 ? br[0]['fk_PlayerId1'] : br[0]['fk_PlayerId2'];
                                // Updating No. of Wins for User
                                userService.updateUserTotalWins(winnerPlayer);
                                const isPaymentSucccessfull = await MasterPayment.makeBattlePayment(br[0]['fk_PlayerId1'], br[0]['fk_PlayerId2'], winnerPlayer, gameId, battleId, status, roomId);
                                let responseData;
                                if (isPaymentSucccessfull) {
                                    console.log("Payment Successfull");
                                    responseData = (status == 300 || status == 350) ? isPaymentSucccessfull : [];
                                }
                                else {
                                    console.log("Something Went wrong in payment");
                                    responseData = [];
                                }
                                StatsDClient.getInstance().getClient().timing("nodeapp.battleroom.update.time", new Date().getTime() - startTime);
                                helper.sendJSON(res, responseData, false, 200, "Battle Room Score Updated Successfully .", 1);
                            }
                        }
                        else {
                            helper.sendJSON(res, [], true, 200, "This Room not available .", 1);
                        }
                    }
                }
            }
            else {
                console.log("Battle room update from Un-Authorize Token : " + JSON.stringify(userDetails));
                helper.sendJSON(res, [], false, 200, "Access Denied.", 1);
            }
        } catch (err) {
            console.log(err);
            helper.sendJSON(res, [], false, 200, "Error: Update request for battle game result failed!", 1);
        }
    }

    async updateTournamentGameResultRequest(req: Request, res: Response) {
        var resultConclusive = req.body.resultConclusive;
        var playerScore = req.body.playerScore;
        var roomId = req.body.roomId;
        var status = 20;
        if (resultConclusive == 1) {
            status = 60;
        }

        var tournamentPlayerUpdate: any = {};
        tournamentPlayerUpdate.score = playerScore;
        tournamentPlayerUpdate.status = status;
        tournamentPlayerUpdate.id = roomId;
        let data = await TournamentService.updateTournamentPlayers(tournamentPlayerUpdate);
        !data ? helper.sendJSON(res, [], true, 500, "DB Error ..", 0) : '';
        helper.sendJSON(res, [], false, 200, "Tournament Player Score Updated Successfully .", 1);
    }

    async getGameResultRequest(req: Request, res: Response) {
        var gameRoomSession = (req.headers.gameroomsession.toString());
        var gameRoomSessionData = await EncDec.decrypt(JSON.parse(gameRoomSession));
        gameRoomSessionData = JSON.parse(JSON.parse(gameRoomSessionData));

        var playerId = gameRoomSessionData[0]['playerId'];
        var roomId = gameRoomSessionData[0]['roomId'];
        var isTournament = gameRoomSessionData[0]['isTournament'];

        if (isTournament == 1) {
            let data = await TournamentService.getPlayerScore(roomId);
            !data ? helper.sendJSON(res, [], true, 500, "DB Error ..", 0) : '';
            if (data && data.length > 0) {
                helper.sendJSON(res, data, false, 200, "Tournament Player Score Listed Successfully .", 1);
            }
            else {
                helper.sendJSON(res, data, false, 200, "No Player is in this room .", 1);
            }
        }
        else if (isTournament == 0) {

            let data = await BattleRoom.getPlayerScore(roomId);
            !data ? helper.sendJSON(res, [], true, 500, "DB Error ..", 0) : '';
            if (data && data.length > 0) {
                var player1 = data[0]['fk_PlayerId1'];
                var player2 = data[0]['fk_PlayerId2'];

                var playerScore1 = data[0]['playerScore1'];
                var playerScore2 = data[0]['playerScore2'];
                var wasWinner = false;
                if (playerId == player1) {
                    wasWinner = playerScore1 > playerScore2 ? true : false;
                }
                else if (playerId == player2) {
                    wasWinner = playerScore2 > playerScore1 ? true : false;
                }
                var battleRoomResult: any = {};
                battleRoomResult.wasWinner = wasWinner;
                battleRoomResult.playerScore1 = playerScore1;
                battleRoomResult.playerScore2 = playerScore2;
                battleRoomResult.isTournament = 0;

                helper.sendJSON(res, battleRoomResult, false, 200, "Battle Player Score Listed Successfully .", 1);
            }
            else {
                helper.sendJSON(res, data, false, 200, "No Player is in this room .", 1);
            }
        }
    }

    async getKeepPlayingGame(req: Request, res: Response) {
        var userDetails = req.headers.data;
        let data = await helper.getColsValue("gmsGames", ["id", "name", "title", "smallIconImage"], { "isTurnament": 1, "status": 1 });
        if (!data) {
            helper.sendJSON(res, data, true, 200, "DB Error .!", 1);
        }
        else {
            helper.sendJSON(res, data, false, 200, "Keep Playing API Listed Successfully", 1);
        }
    }

    async getWhoIsWinning(req: Request, res: Response) {
        await fs.readFile("/home/vcoi/nodeapps/gamesapp/whoiswining.txt", function (err, data) {
            if (err) {
                console.error(err);
            }
            //console.log("Asynchronous read : " + data.toString());
            helper.sendJSON(res, JSON.parse(data.toString()), false, 200, "Who is winning data listed successfully", 10, true);
        });
    }

    async manageGameServerBasedOnHealth(req: Request, res: Response) {

        //var publicIP=req['IP'];
        var publicIP = '103:104:73:30';

        console.log("Manage Game Server Request IP :" + publicIP + " Body : ", req.body);

        var gType = req.body.gType;
        var health = req.body.health == true ? 1 : 0;
        var cpuLoad = req.body.cpuLoad;
        var remarks = req.body.remarks;



        var flag = true;

        //Server health update start here.
        var updateServerHealth = await EC2Services.updateServerHealth(publicIP, health, cpuLoad);
        if (updateServerHealth)
            console.log("Server health updated successfully PublicIP : " + publicIP + " Health : " + health);
        else {
            flag = false;
            console.log("Unable to Update Server health PublicIP : " + publicIP + " Health : " + health);
        }


        //Server Scaling and De-Scaling start here.     
        if (cpuLoad > config.awsEC2.MaxCpuHealth) {
            //Scale the game server.
            //Before scaling set and lock to scale another of the same Game Type Server in cache.
            var GateKey = "GameServerScaling-" + gType;
            //var GateValue = await CacheService.getCache(GateKey);
            var GateValue = "false"; //await CacheService.getCache(GateKey);
            console.log(GateKey + " : " + GateValue);
            if (GateValue == "true" || GateValue == null) {
                //var GameServerScaling = await CacheService.setCache(GateKey, "false");
                console.log("Request To scale game server , Game Type : " + gType);
                var instanceId = await EC2Services.addInstance(gType);
                if (instanceId) {
                    console.log("Instance added successfully. Game Type : " + gType + " PublicIP : " + publicIP + " New InstanceId : " + instanceId);
                }
                else {
                    flag = false;
                    console.log("Unable to Add Instance. Game Type : " + gType + " PublicIP : " + publicIP);
                }
                //var GameServerScaling = await CacheService.setCache(GateKey, "true");
            }
            else {
                console.log("We can't scaled now. The Scaling Gate : " + GateKey + " is closed. Public IP : " + publicIP);
            }
        }//Scaling block end here.
        else if (cpuLoad < config.awsEC2.MinCpuHealth) {
            //In Active this game server from cache.
            //Check whether it is Scaled game server or not.
            //Before In-Active set and lock to In-Active another server of the same Game Type in cache.
            var isScaledGS = await EC2Services.isScaledGameServer(publicIP);

            if (isScaledGS == "NO") {
                console.log("Min Descaling Game Server reached Game Type : " + gType + " PublicIP : " + publicIP);
            }
            else if (isScaledGS == "YES") {
                var GateKey = "GameServerDeScaling-" + gType;
                //var GateValue = await CacheService.getCache(GateKey);
                var GateValue = "false"; //await CacheService.getCache(GateKey);
                console.log(GateKey + " : " + GateValue);
                if (GateValue == "true" || GateValue == null) {
                    //var GameServerDeScaling = await CacheService.setCache(GateKey, "false");
                    console.log("Request To Inactive game server , Game Type : " + gType + " Public IP : " + publicIP);

                    var inactiveInstance = await EC2Services.inactiveInstanceInCache(publicIP);
                    if (inactiveInstance)
                        console.log("Instance In-Active successfully. Game Type : " + gType + " PublicIP : " + publicIP);
                    else {
                        flag = false;
                        console.log("Unable to In-Active Instance. Game Type : " + gType + " PublicIP : " + publicIP);
                    }
                }
                else {
                    console.log("We can't request De-Scaled now. The De-Scaling Gate : " + GateKey + " is closed. Public IP : " + publicIP);
                }
            }
            else {
                flag = false;
                console.log("De-Scaling (InActive) Game Server is not working poperly. ");
            }
        }//De-Scaling block end here.
        else {
            console.log("Game server is balanced , Game Type : " + gType + " PublicIP : " + publicIP);
        }

        if (flag)
            helper.sendJSON(res, [], false, 200, "Request completed successfully .", 10);
        else
            helper.sendJSON(res, [], false, 200, "Unable to complete request !!.", 10);
    }


    async makeFavouriteGame(req: Request, res: Response) {
        try {
            let userDetail = req.headers.data;
            let gameId: number = req.body.gameId;
            let isFavourite: number = req.body.isFavourite;
            let favouriteGames = await FavouriteGames.get({
                fkGamesId: gameId,
                fkUserId: userDetail['id']
            });
            if (favouriteGames) {
                let favouriteGame = favouriteGames[0];
                favouriteGame.isFavourite = isFavourite;
                favouriteGame.save();
            } else {
                let data = await FavouriteGames.post({
                    fkGamesId: gameId,
                    fkUserId: userDetail['id'],
                    isFavourite: isFavourite
                });
            }
            helper.sendJSON(res, {}, false, 200, "You have mark it as favourite!", 1);
        } catch (error) {
            helper.sendJSON(res, {}, true, 200, "Sorry! We are not able to make it as favourite. Can you please try again later!", 1);
        }
    }

    async getRecentlyPlayedGames(req: Request, res: Response) {
        try {
            let userDetail = req.headers.data;
            let data = await Games.getRecentlyPlayedGames(userDetail['id']);
            helper.sendJSON(res, data, false, 200, "Recently played games listed successfully.", 1);
        } catch (error) {
            helper.sendJSON(res, {}, true, 200, "Sorry! You haven't played any games.", 1);
        }
    }

    async playGame(req: Request, res: Response) {
        try {
            const startTime = new Date().getTime();
            StatsDClient.getInstance().getClient().counter("nodeapp.privatebattleroom.create.count", 1);
            console.log("Reqeust Data: ", req.body)
            const userDetails: any = req.headers.data;
            const battleId = req.body.battleId;
            const gameId = req.body.gameId;
            const friendId = req.body.friendId;
            const gameEngine = req.body.gameEngine;
            const engineId = req.body.engineId;
            const isTournament = +req.query.isTournament;
            const requestType = "requestType" in req.body ? req.body.requestType : null;
            let roomId = 'roomId' in req.body && req.body.roomId != "" ? req.body.roomId : null;
            let isPaymentDone: boolean = false;
            if (requestType == "ACCEPT" && (!roomId || roomId === undefined)) {
                await helper.sendJSON(res, [], true, 202, "Battle Room not exists! Please send request again.", 1);
                return;
            }
            const gmsBattle = await helper.getAllColValue("gmsBattle", { "id": battleId });
            // const gameId = gmsBattle[0].fkGamesId;
            const isPaidGame = gmsBattle[0].isPaid;
            const winningAmount = gmsBattle[0].winningAmount;
            const paidAmount = gmsBattle[0].paidAmount;
            const gameData = await Games.getGameDetails(gameId);
            // Prepare Notification Payload
            let notificationData: any = {
                "battleId": battleId.toString(),
                "gameId": gameId.toString(),
                "gameTitle": gameData['title'],
                "gameImage": gameData['smallIconImage'],
                "gameDownloadLink": gameData['downloadLink'],
                "gameOrientation": gameData['orientation'].toString(),
                "gameScreenMode": gameData['screenmode'].toString(),
                "gameVersion": gameData['version'].toString(),
                "engineId": engineId.toString(),
                "gameEngine": req.body.gameEngine,
                "winningAmount": winningAmount.toString(),
                "paidAmount": paidAmount ? paidAmount.toString() : "0",
                "isTournament": req.body.isTournament.toString(),
                "oppPlayerId": userDetails['id'].toString(),
                "oppPlayerUserName": userDetails['userName']
            }
            if (userDetails["image"] === undefined) {
                notificationData["oppPlayerImage"] = "";
            } else {
                notificationData["oppPlayerImage"] = userDetails['image'] != '' ? userDetails['image'] : userDetails['defaultImage'];
            }
            const requestCacheKey = "BRP";
            if (!gameData['gameCategory'] || !gameData['gameType']) {
                //Game category/Type must be specify.It shuld not be undefined or null.
                await helper.sendJSON(res, [], true, 200, "Error: Game Category/Type is not defined !!", 0);
            } else {
                let battleRoomDetails = null;
                const cacheKey1 = await helper.generatePrivateBattleRoomCacheKey(requestCacheKey, userDetails['id'], friendId, gameId, battleId);
                const cacheKey2 = await helper.generatePrivateBattleRoomCacheKey(requestCacheKey, friendId, userDetails['id'], gameId, battleId);
                if (requestType == "ACCEPT") {
                    //const battleRoomDetailsFromCache = await CacheService.getCache(cacheKey1);
                    const battleRoomDetailsFromCache = null; 
                    console.log("battleRoomDetailsFromCache: ", battleRoomDetailsFromCache);
                    if (battleRoomDetailsFromCache && battleRoomDetailsFromCache['battleRoomId']) {
                        battleRoomDetails = battleRoomDetailsFromCache;
                        const data = [
                            {
                                "playerId": userDetails['id'],
                                "roomId": battleRoomDetails.battleRoomId,
                                "gameID": gameId,
                                "isTournament": 0,
                                "timeStamp": new Date(),
                                "gameCategory": gameData["gameCategory"],
                                "gameEndTime": gameData["gameEndTime"]
                            }
                        ]
                        // check payment for Game
                        const gameplay = await MasterPayment.shouldGamePlayBegin(userDetails, gameId, gameEngine, engineId, battleRoomDetails.battleRoomId);
                        console.log("shouldGamePlayBegin service response: ", gameplay);
                        if (gameplay['statusCode'] == 500 || gameplay['statusCode'] == 502) {
                            await helper.sendJSON(res, gameplay['data'], gameplay['error'], gameplay['statusCode'], gameplay['message'], gameplay['recordTotal']);
                            return;
                        } else if (gameplay['statusCode'] == 412) {
                            isPaymentDone = true;
                        }
                        let videoRoomId = null;
                        //Video room id generation.
                        if (isTournament == 2)
                            videoRoomId = battleRoomDetails.battleRoomId;
                        const responseHash = await EncDec.encrypt(JSON.stringify(data));
                        console.log(responseHash);
                        responseHash['videoRoomId'] = videoRoomId;
                        responseHash['roomId'] = battleRoomDetails.battleRoomId
                        if (!isPaymentDone) {
                            const finalPaymentCheckAndUpdate = await MasterPayment.insertEngineKeyIdInLog(userDetails['id'], battleRoomDetails.battleRoomId, gameId, Constant.GameEngine.Battle, battleId);
                            if (isPaidGame && !finalPaymentCheckAndUpdate) {
                                console.log("Unable To update Room ID in Transaction Log");
                                await helper.sendJSON(res, [], true, 202, "Payment couldn't be processed against this user and BattleRoom", 1);
                                return;
                            }
                        }
                        responseHash['su'] = battleRoomDetails['socketUrl'];
                        if (battleRoomDetails['serverIP']) {
                            await helper.releaseGameServer(battleRoomDetails['serverIP']);
                        }
                        let battleRoomUpdate: any = {};
                        // battleRoomUpdate.fk_PlayerId2=userDetails['id'];
                        battleRoomUpdate.status = 150;
                        let update = await BattleRoom.updateBattleRoomV2(battleRoomUpdate, roomId);
                        if (update) {
                            const oppPlayerdata = [
                                {
                                    "playerId": friendId,
                                    "roomId": battleRoomDetails.battleRoomId,
                                    "gameID": gameId,
                                    "isTournament": 0,
                                    "timeStamp": new Date(),
                                    "gameCategory": gameData["gameCategory"],
                                    "gameEndTime": gameData["gameEndTime"]
                                }
                            ]
                            const oppPlayerResponseHash = await EncDec.encrypt(JSON.stringify(oppPlayerdata));
                            const notification = {
                                title: "Hey! You have a notification",
                                body: userDetails['userName'] + " has accepted your request."
                            };
                            notificationData["notificationType"] = "GAME_ACCEPTED";
                            notificationData["roomId"] = roomId.toString();
                            notificationData["message"] = userDetails['userName'] + " has accepted your request.";
                            notificationData["iv"] = oppPlayerResponseHash['iv'];
                            notificationData["gr"] = oppPlayerResponseHash['gr'];
                            notificationData["videoRoomId"] = videoRoomId ? videoRoomId : "";
                            notificationData["su"] = battleRoomDetails['socketUrl'];
                            await Notifications.sendPushNotification(friendId, notificationData, notification);
                            console.log("Game Request accepted! " + roomId);
                        } else {
                            console.log("Problem in updating room !! " + roomId);
                        }
                        await helper.sendJSON(res, responseHash, false, 200, "Game Request accepted successfully. ", 1);
                    } else {
                        await helper.sendJSON(res, [], true, 202, "Oops! Game request has been timed out.", 1);
                        return;
                    }
                } else {
                    //const battleRoomDetailsFromCache = await CacheService.getCache(cacheKey1);
                    const battleRoomDetailsFromCache = null; 
                    console.log("battleRoomDetailsFromCache: ", battleRoomDetailsFromCache);
                    if (battleRoomDetailsFromCache && battleRoomDetailsFromCache['battleRoomId']) {
                        battleRoomDetails = battleRoomDetailsFromCache;
                    } else {
                        const serverIP = await helper.allocateGameServer(gameData['gameType']);  //Get minimum active session game server.
                        const socketUrl = "ws://" + serverIP + "/ws/";  //Socket URL
                        const url = process.env.BATTLE_ROOM_HOST + process.env.BR_GET_NEW_ROOM_API;
                        const apiRespData = await helper.retryGet(url);
                        console.log("apiRespData: ", apiRespData);
                        if (apiRespData && apiRespData['status'] && apiRespData['status'] == "success") {
                            battleRoomDetails = apiRespData['data'];
                            battleRoomDetails['socketUrl'] = socketUrl;
                            battleRoomDetails['serverIP'] = serverIP;
                        } else {
                            await helper.sendJSON(res, [], true, 200, "Battle Room Server Error.", 1);
                            return;
                        }
                    }
                    /*await CacheService.setCache(cacheKey1, battleRoomDetails, 60);
                    await CacheService.setCache(cacheKey2, battleRoomDetails, 60);*/
                    roomId = battleRoomDetails.battleRoomId;
                    console.log("battleRoomDetails: ", battleRoomDetails);
                    const data = [
                        {
                            "playerId": userDetails['id'],
                            "roomId": battleRoomDetails.battleRoomId,
                            "gameID": gameId,
                            "isTournament": 0,
                            "timeStamp": new Date(),
                            "gameCategory": gameData["gameCategory"],
                            "gameEndTime": gameData["gameEndTime"]
                        }
                    ]
                    // check payment for Game
                    const gameplay = await MasterPayment.shouldGamePlayBegin(userDetails, gameId, gameEngine, engineId, battleRoomDetails.battleRoomId);
                    console.log("shouldGamePlayBegin service response: ", gameplay);
                    if (gameplay['statusCode'] == 500 || gameplay['statusCode'] == 502) {
                        await helper.sendJSON(res, gameplay['data'], gameplay['error'], gameplay['statusCode'], gameplay['message'], gameplay['recordTotal']);
                        return;
                    } else if (gameplay['statusCode'] == 412) {
                        isPaymentDone = true;
                    }
                    let videoRoomId = null;
                    //Video room id generation.
                    if (isTournament == 2)
                        videoRoomId = battleRoomDetails.battleRoomId;
                    const responseHash = await EncDec.encrypt(JSON.stringify(data));
                    console.log(responseHash);
                    responseHash['videoRoomId'] = videoRoomId;
                    responseHash['roomId'] = battleRoomDetails.battleRoomId
                    if (!isPaymentDone) {
                        const finalPaymentCheckAndUpdate = await MasterPayment.insertEngineKeyIdInLog(userDetails['id'], battleRoomDetails.battleRoomId, gameId, Constant.GameEngine.Battle, battleId);
                        if (isPaidGame && !finalPaymentCheckAndUpdate) {
                            console.log("Unable To update Room ID in Transaction Log");
                            await helper.sendJSON(res, [], true, 202, "Payment couldn't be processed against this user and BattleRoom", 1);
                            return;
                        }
                    }

                    responseHash['su'] = battleRoomDetails['socketUrl'];
                    //Create New Room in DB .
                    let insertbattleRoom: any = {};
                    insertbattleRoom.fk_BattleId = battleId;
                    insertbattleRoom.fk_GameId = gameId;
                    insertbattleRoom.fk_PlayerId1 = userDetails['id'];
                    insertbattleRoom.fk_PlayerId2 = friendId;
                    insertbattleRoom.videoRoomId = videoRoomId;
                    insertbattleRoom.br_roomId = battleRoomDetails.battleRoomId;
                    insertbattleRoom.status = 110;
                    let create = await BattleRoom.createNewBattleRoomV2(insertbattleRoom);
                    if (create) {
                        const notification = {
                            title: "Hey! Your are invited to play game",
                            body: userDetails['userName'] + " invited you to play a game of " + gameData['name'] + "!"
                        };
                        notificationData["notificationType"] = "GAME_REQUEST";
                        notificationData["roomId"] = battleRoomDetails.battleRoomId.toString();
                        notificationData["message"] = userDetails['userName'] + " invited you to play a game of " + gameData['name'] + "!";
                        const pushStatus = await Notifications.sendPushNotification(friendId, notificationData, notification);
                        // if (pushStatus == 'NOT_REGISTERED'){
                        //     const sms = "Hey, I've challenged you in "+ gameName +" on Gamesapp. Download and let's play - <link>"
                        //     const isSend = await msg91.sendSMS(userDetails['mobile'], sms);
                        //     if(isSend){
                        //         console.log("Message sent successfully.", userDetails['mobile']);                   
                        //     }
                        //     else{
                        //         console.log("Message sending is failed !", userDetails['mobile']);
                        //     }
                        // }
                        console.log("Room created successfully . " + battleRoomDetails.battleRoomId);
                    } else {
                        console.log("Problem in creating room !! " + battleRoomDetails.battleRoomId);
                    }
                    StatsDClient.getInstance().getClient().timing("nodeapp.privatebattleroom.create.time", new Date().getTime() - startTime);
                    await helper.sendJSON(res, responseHash, false, 200, "Game Room Allocated Successfully ", 1);
                }
            }
        } catch (err) {
            console.log(err);
            await helper.sendJSON(res, [], true, 200, "Oops! Room creation request failed!", 1);
        }
    }

    /**
     * For Rematch with same Player and send notification to Opponent
     * @param req 
     * @param res 
     */
    async rematch(req: Request, res: Response) {
        try {
            console.log("Request Data: ", req.body);
            const userDetails: any = req.headers.data;
            const isTournament = req.body.isTournament;
            const gameId = req.body.gameId;
            const gameEngine = req.body.gameEngine;
            const engineId = req.body.engineId;
            const battleId = req.body.battleId;
            const oppPlayerUserName = req.body.oppPlayerUserName;
            const requestType = "requestType" in req.body ? req.body.requestType : null;
            const roomId = 'roomId' in req.body && req.body.roomId != "" ? req.body.roomId : null;
            let isPaymentDone: boolean = false;
            if (requestType == "ACCEPT") {
                if (!roomId || roomId === undefined) {
                    await helper.sendJSON(res, [], true, 202, "Battle Room not exists! Please send request again.", 1);
                    return;
                }
                const battleRoomSatus = await BattleRoom.getBattleRoomStatus(roomId);
                if (battleRoomSatus == Constant.Battle.BattleRoom.Rejected) {
                    await helper.sendJSON(res, [], true, 202, "You have already rejected request! Please send a new request.", 1);
                    return;
                }
            }
            const gmsBattle = await helper.getAllColValue("gmsBattle", { "id": battleId });
            const winningAmount = gmsBattle[0].winningAmount;
            const paidAmount = gmsBattle[0].paidAmount;
            const isPaidGame = gmsBattle[0].isPaid;

            const gameData = await Games.getGameDetails(gameId);
            // Prepare Notification Payload
            let notificationData: any = {
                "battleId": battleId.toString(),
                "gameId": gameId.toString(),
                "gameTitle": gameData['title'],
                "gameImage": gameData['smallIconImage'],
                "gameDownloadLink": gameData['downloadLink'],
                "gameOrientation": gameData['orientation'].toString(),
                "gameScreenMode": gameData['screenmode'].toString(),
                "gameVersion": gameData['version'].toString(),
                "engineId": engineId.toString(),
                "gameEngine": req.body.gameEngine,
                "winningAmount": winningAmount.toString(),
                "paidAmount": paidAmount ? paidAmount.toString() : "0",
                "isTournament": req.body.isTournament.toString(),
                "oppPlayerId": userDetails['id'].toString(),
                "oppPlayerUserName": userDetails['userName']
            }
            if (userDetails["image"] === undefined) {
                notificationData["oppPlayerImage"] = "";
            } else {
                notificationData["oppPlayerImage"] = userDetails['image'] != '' ? userDetails['image'] : userDetails['defaultImage'];
            }
            const requestCacheKey = "BREMATCH";
            if (!gameData['gameCategory'] || !gameData['gameType']) {
                //Game category/Type must be specify.It shuld not be undefined or null.
                await helper.sendJSON(res, [], true, 200, "Error: Game Category/Type is not defined !!", 0);
            } else {
                const userData = await helper.getColsValue("gmsUsers", ["id", "mobile", "username"], { "username": oppPlayerUserName });
                const oppPlayerId = userData[0]['id']
                let battleRoomDetails = null;
                const cacheKey1 = await helper.generatePrivateBattleRoomCacheKey(requestCacheKey, userDetails['id'], oppPlayerId);
                const cacheKey2 = await helper.generatePrivateBattleRoomCacheKey(requestCacheKey, oppPlayerId, userDetails['id']);
                if (requestType == "ACCEPT") {
                    //const battleRoomDetailsFromCache = await CacheService.getCache(cacheKey1);
                    const battleRoomDetailsFromCache = null; 
                    console.log("battleRoomDetailsFromCache: ", battleRoomDetailsFromCache);
                    if (battleRoomDetailsFromCache && battleRoomDetailsFromCache['battleRoomId']) {
                        battleRoomDetails = battleRoomDetailsFromCache;
                        const data = [
                            {
                                "playerId": userDetails['id'],
                                "roomId": roomId,
                                "gameID": gameId,
                                "isTournament": 0,
                                "timeStamp": new Date(),
                                "gameCategory": gameData["gameCategory"],
                                "gameEndTime": gameData["gameEndTime"]
                            }
                        ]
                        const gameplay = await MasterPayment.shouldGamePlayBegin(userDetails, gameId, gameEngine, engineId, roomId);
                        console.log("shouldGamePlayBegin service response: ", gameplay);
                        if (gameplay['statusCode'] == 500 || gameplay['statusCode'] == 502) {
                            await helper.sendJSON(res, gameplay['data'], gameplay['error'], gameplay['statusCode'], gameplay['message'], gameplay['recordTotal']);
                            return;
                        } else if (gameplay['statusCode'] == 412) {
                            isPaymentDone = true;
                        }
                        let videoRoomId = null;
                        //Video room id generation.
                        if (isTournament == 2)
                            videoRoomId = battleRoomDetails.battleRoomId;
                        const responseHash = await EncDec.encrypt(JSON.stringify(data));
                        console.log(responseHash);
                        responseHash['videoRoomId'] = videoRoomId;
                        responseHash['roomId'] = roomId
                        if (!isPaymentDone) {
                            const finalPaymentCheckAndUpdate = await MasterPayment.insertEngineKeyIdInLog(userDetails['id'], roomId, gameId, Constant.GameEngine.Battle, battleId);
                            if (isPaidGame && !finalPaymentCheckAndUpdate) {
                                console.log("Unable To update Room ID in Transaction Log");
                                await helper.sendJSON(res, [], true, 202, "Payment couldn't be processed against this user and BattleRoom", 1);
                                return;
                            }
                        }
                        responseHash['su'] = battleRoomDetails['socketUrl'];
                        if (battleRoomDetails['serverIP']) {
                            await helper.releaseGameServer(battleRoomDetails['serverIP']);
                        }
                        let battleRoomUpdate: any = {};
                        // battleRoomUpdate.fk_PlayerId2=userDetails['id'];
                        battleRoomUpdate.status = 150;
                        let update = await BattleRoom.updateBattleRoomV2(battleRoomUpdate, roomId);
                        if (update) {
                            const oppPlayerdata = [
                                {
                                    "playerId": oppPlayerId,
                                    "roomId": roomId.toString(),
                                    "gameID": gameId,
                                    "isTournament": 0,
                                    "timeStamp": new Date(),
                                    "gameCategory": gameData["gameCategory"],
                                    "gameEndTime": gameData["gameEndTime"]
                                }
                            ]
                            const oppPlayerResponseHash = await EncDec.encrypt(JSON.stringify(oppPlayerdata));
                            const notification = {
                                title: "Hey! You have a notification",
                                body: userDetails['userName'] + " has accepted your request."
                            };
                            notificationData["notificationType"] = "GAME_REMATCH_ACCEPTED";
                            notificationData["roomId"] = roomId.toString();
                            notificationData["message"] = userDetails['userName'] + " has accepted your request.";
                            notificationData["iv"] = oppPlayerResponseHash['iv'];
                            notificationData["gr"] = oppPlayerResponseHash['gr'];
                            notificationData["videoRoomId"] = videoRoomId ? videoRoomId : "";
                            notificationData["su"] = battleRoomDetails['socketUrl'];
                            await Notifications.sendPushNotification(oppPlayerId, notificationData, notification);
                            console.log("Game Request accepted! " + roomId);
                        } else {
                            console.log("Problem in updateing room !! " + roomId);
                        }
                        await helper.sendJSON(res, responseHash, false, 200, "Game Rematch reqeust has been accepted!", 1);
                    } else {
                        await helper.sendJSON(res, [], true, 202, "Oops! Game request has been timed out.", 1);
                        return;
                    }
                } else {
                    //const battleRoomDetailsFromCache = await CacheService.getCache(cacheKey1);
                    const battleRoomDetailsFromCache = null; 

                    console.log("battleRoomDetailsFromCache: ", battleRoomDetailsFromCache);
                    if (battleRoomDetailsFromCache && battleRoomDetailsFromCache['battleRoomId']) {
                        battleRoomDetails = battleRoomDetailsFromCache;
                    } else {
                        const serverIP = await helper.allocateGameServer(gameData["gameType"]);  //Get minimum active session game server.
                        const socketUrl = "ws://" + serverIP + "/ws/";  //Socket URL
                        const url = process.env.BATTLE_ROOM_HOST + process.env.BR_GET_NEW_ROOM_API;
                        const apiRespData = await helper.retryGet(url);
                        console.log("apiRespData: ", apiRespData);
                        if (apiRespData && apiRespData['status'] && apiRespData['status'] == "success") {
                            battleRoomDetails = apiRespData['data'];
                            battleRoomDetails['socketUrl'] = socketUrl;
                            battleRoomDetails['serverIP'] = serverIP;
                        } else {
                            await helper.sendJSON(res, [], true, 200, "Battle Room Server Error.", 1);
                            return;
                        }
                    }
                    /*await CacheService.setCache(cacheKey1, battleRoomDetails, 60);
                    await CacheService.setCache(cacheKey2, battleRoomDetails, 60);*/
                    console.log("battleRoomDetails: ", battleRoomDetails);
                    const data = [
                        {
                            "playerId": userDetails['id'],
                            "roomId": battleRoomDetails.battleRoomId,
                            "gameID": gameId,
                            "isTournament": 0,
                            "timeStamp": new Date(),
                            "gameCategory": gameData["gameCategory"],
                            "gameEndTime": gameData["gameEndTime"]
                        }
                    ]
                    const gameplay = await MasterPayment.shouldGamePlayBegin(userDetails, gameId, gameEngine, engineId, battleRoomDetails.battleRoomId);
                    console.log("shouldGamePlayBegin service response: ", gameplay);
                    if (gameplay['statusCode'] == 500 || gameplay['statusCode'] == 502) {
                        await helper.sendJSON(res, gameplay['data'], gameplay['error'], gameplay['statusCode'], gameplay['message'], gameplay['recordTotal']);
                        return;
                    } else if (gameplay['statusCode'] == 412) {
                        isPaymentDone = true;
                    }
                    let videoRoomId = null;
                    //Video room id generation.
                    if (isTournament == 2)
                        videoRoomId = battleRoomDetails.battleRoomId;
                    const responseHash = await EncDec.encrypt(JSON.stringify(data));
                    console.log(responseHash);
                    responseHash['videoRoomId'] = videoRoomId;
                    responseHash['roomId'] = battleRoomDetails.battleRoomId
                    if (!isPaymentDone) {
                        const finalPaymentCheckAndUpdate = await MasterPayment.insertEngineKeyIdInLog(userDetails['id'], battleRoomDetails.battleRoomId, gameId, Constant.GameEngine.Battle, battleId);
                        if (isPaidGame && !finalPaymentCheckAndUpdate) {
                            console.log("Unable To update Room ID in Transaction Log");
                            await helper.sendJSON(res, [], true, 202, "Payment couldn't be processed against this user and BattleRoom", 1);
                            return;
                        }
                    }
                    responseHash['su'] = battleRoomDetails['socketUrl'];
                    //Create New Room in DB .
                    let insertbattleRoom: any = {};
                    insertbattleRoom.fk_BattleId = battleId;
                    insertbattleRoom.fk_GameId = gameId;
                    insertbattleRoom.fk_PlayerId1 = userDetails['id'];
                    insertbattleRoom.fk_PlayerId2 = oppPlayerId;
                    insertbattleRoom.videoRoomId = videoRoomId;
                    insertbattleRoom.br_roomId = battleRoomDetails.battleRoomId;
                    insertbattleRoom.status = 110;
                    let create = await BattleRoom.createNewBattleRoomV2(insertbattleRoom);
                    if (create) {
                        const notification = {
                            title: "Hey! Your are invited to play game",
                            body: userDetails['userName'] + " challenged you for a rematch! accept now!"
                        };
                        notificationData["notificationType"] = "GAME_REMATCH_REQUEST";
                        notificationData["roomId"] = battleRoomDetails.battleRoomId.toString();
                        notificationData["message"] = userDetails['userName'] + " challenged you for a rematch! accept now!";
                        const pushStatus = await Notifications.sendPushNotification(oppPlayerId, notificationData, notification);
                        console.log("Room created successfully . " + battleRoomDetails.battleRoomId);
                    } else {
                        console.log("Problem in creating room !! " + battleRoomDetails.battleRoomId);
                    }
                    // StatsDClient.getInstance().getClient().timing("nodeapp.privatebattleroom.create.time", new Date().getTime() - startTime);
                    await helper.sendJSON(res, responseHash, false, 200, "Game Rematch reqeust sent!", 1);
                }
            }
        } catch (error) {
            console.log(error);
            await helper.sendJSON(res, [], true, 200, "Oops! Game request failed!", 1);
        }
    }

    /**
     * Reject the Rematch/Game request
     * @param req 
     * @param res 
    */
    async rejectRequest(req: Request, res: Response) {
        try {
            console.log("Request Data: ", req.body);
            const userDetails = req.headers.data;
            const battleId = req.body.battleId;
            const gameId = req.body.gameId;
            const oppPlayerId = req.body.friendId;
            const gameEngine = req.body.gameEngine;
            const engineId = req.body.engineId;
            const isTournament = req.query.isTournament;
            const roomId = req.body.roomId;
            let battleRoomUpdate: any = {};
            battleRoomUpdate.status = 250;
            const requestCacheKey = "BRP";
            const cacheKey1 = await helper.generatePrivateBattleRoomCacheKey(requestCacheKey, userDetails['id'], oppPlayerId, gameId, battleId);
            const cacheKey2 = await helper.generatePrivateBattleRoomCacheKey(requestCacheKey, oppPlayerId, userDetails['id'], gameId, battleId);
            let update = await BattleRoom.updateBattleRoomV2(battleRoomUpdate, roomId);
            if (update)
                console.log("Room updated successfully . " + roomId);
            else
                console.log("Problem in updateing room !! " + roomId);
            const isRefundDone = await MasterPayment.refundEntryFeeToUser(oppPlayerId, roomId, gameId, battleId);
            if (isRefundDone) {
                console.log("Payment Successfull");
            } else {
                console.log("Something Went wrong in payment");
            }
            /*CacheService.deleteCacheData(cacheKey1);
            CacheService.deleteCacheData(cacheKey2);*/

            const gameData = await Games.getGameDetails(gameId);

            const notificationData: any = {
                "notificationType": "GAME_REJECTED",
                "message": userDetails['userName'] + " has rejected your request.",
                "battleId": battleId.toString(),
                "roomId": roomId.toString(),
                "gameId": gameId.toString(),
                "gameTitle": gameData['title'],
                "gameDownloadLink": gameData['downloadLink'],
                "gameOrientation": gameData['orientation'].toString(),
                "gameScreenMode": gameData['screenmode'].toString(),
                "gameVersion": gameData['version'].toString(),
                "engineId": engineId.toString(),
                "gameEngine": req.body.gameEngine,
                "isTournament": req.body.isTournament.toString(),
            }
            const notification = {
                title: "Hey! You have a notification",
                body: userDetails['userName'] + " has rejected your request."
            };
            await Notifications.sendPushNotification(oppPlayerId, notificationData, notification);
            await helper.sendJSON(res, [], false, 200, "Request has been rejected...", 1);
        } catch (error) {
            console.log(error);
            await helper.sendJSON(res, [], true, 200, "Oops! We are not able to reject game's request.", 1);
        }
    }
}

export default new GamesCtrl();