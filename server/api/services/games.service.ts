import sequelize from 'sequelize';
import models from '../models/index';
import constant from '../../common/app.constant';
//import { CacheService } from '../cache/cache.service';
import TableGamesService from '../services/tableGames.service';
import depositPaymentService from '../services/payment/depositaccount.service';
import * as secretConfig from '../../common/secret.config.json';
var config: any = secretConfig;
var Op = sequelize.Op;

export class Games {
    async isMatchup(gameId) {
        try {
            let data = await models.gmsGames.findAll({
                attributes: ['isMatchup'],
                where: {
                    id: gameId,
                    isMatchUp: 1
                },
                raw: true
            })
            return data;
        }
        catch (error) {
            console.log("Error (IsMatchup) : ", error)
            return false;
        }
    }
    async get(gameId, playerId) {
        var gameDetails: any = {};
        try {
            let data = await models.gmsGames.findAll({
                where: {
                    id: gameId,
                    status: 1
                },
                raw: true
            })
            gameDetails.games = data[0];
            if (data[0]['id'] == config.tableGames.rummy.id) {
                gameDetails.games['code'] = 'RUMMY'
            } 
            else if (data[0]['id'] == config.tableGames.ludo.id)
                gameDetails.games['code'] = 'LUDO'
            else if (data[0]['id'] == config.tableGames.poker.id)
                gameDetails.games['code'] = 'POKER'

            if (data[0].gameCategory == 4) {
                const tableTypes: any = await TableGamesService.getTableTypeList(gameId, constant.TabularGames.TableStatus.ACTIVE, playerId);
                gameDetails.tableTypes = tableTypes;
            } else {
                //Query To fetch Battle Details
                let condition = "";
                if (await depositPaymentService.getDepoistsCount(playerId) < 1) {
                    condition = " AND gb.paidAmount > 10 ";
                }
                data = await models.sequelize.query(
                    `SELECT gb.*,
                        (SELECT 
                            count(*) 
                        FROM 
                            gmsBattleRoom br 
                        WHERE 
                            br.fk_BattleId=gb.id 
                            AND br.status IN (100,150)
                        ) * 2 AS onlineUsers 
                    FROM 
                        gmsBattle gb 
                    WHERE 
                        gb.fk_GamesId=:gameId 
                        AND status IN (10,20)` +
                    condition +
                    ` ORDER BY gb.paidAmount ASC`,
                    { replacements: { gameId: gameId }, type: sequelize.QueryTypes.SELECT });
                for (var i = 0; i < data.length; i++) {
                    if (data[i]['paidAmount'] == null || data[i]['paidAmount'] == 0) {
                        var free = data[i];
                        free['paidAmount'] = "";
                        data.splice(i, 1);
                        data.push(free);
                        break;
                    }
                }
                gameDetails.battles = data;
            }
            /*
             //Query To fetch Keep Playing.
 
             data=await models.sequelize.query("SELECT t.*,"+
             "(select count(*) from gmsTurnamentPlayers tp where  tp.fk_TurnamentId=t.id) as currentJoiners "+
             "FROM vcoi.gmsTurnament t "+
             "where t.fk_GamesId="+gameId+" and t.status="+constant.Tournament.Live+" "+
             "and t.id in(select gmsTurnamentPlayers.fk_TurnamentId from gmsTurnamentPlayers where fk_PlayerId="+playerId+")"
             ,{ type: sequelize.QueryTypes.SELECT});
 
             gameDetails.keepPlaying=data;
 
             //Query To fetch Tournament Details
 
             data=await models.sequelize.query("SELECT t.*,"+
             "(select count(*) from gmsTurnamentPlayers tp where  tp.fk_TurnamentId=t.id) as currentJoiners "+
             "FROM vcoi.gmsTurnament t "+
             "where t.fk_GamesId="+gameId+" and t.status in("+constant.Tournament.Upcomming+","+constant.Tournament.Live+") "+
             "and t.id not in(sedatalect gmsTurnamentPlayers.fk_TurnamentId from gmsTurnamentPlayers where fk_PlayerId="+playerId+")"
             ,{ type: sequelize.QueryTypes.SELECT});
 
             gameDetails.tournament=data;
             */
            return gameDetails;
        }
        catch (error) {
            console.log("Error (Get game Service) : ", error);
            return false;
        }
    }

    async getMatchupGame() {
        try {
            let data = await models.gmsGames.findAll({
                attributes: [['id', 'gameId'], 'name', ['smallIconImage', 'gameIcon'], 'bgImage', 'isMatchup', [sequelize.col('gmsBattle.id'), 'battleId'], 'gmsBattle.title'],
                where: {
                    isMatchUp: 1
                },
                include: [
                    {
                        model: models.gmsBattle,
                        attributes: [],
                        required: true,
                        where: {
                            isDefaultMatchupBattle: 1
                        }
                    }
                ],
                raw: true
            })
            return data;
        }
        catch (error) {
            console.log("Error (GetMatchupGame) : ", error)
            return false;
        }
    }
    async getGameList() {
        try {
            let data = await models.gmsGames.findAll({
                where: {
                    status: 1
                },
                raw: true
            })
            return data;
        }
        catch (error) {
            console.log("Error : " + error)
            return false;
        }
    }
    async getAllGameList() {
        try {
            let data = await models.gmsGames.findAll({
                where: {
                    status: 1
                },
                raw: true
            })
            return data;
        }
        catch (error) {
            console.log("Error : " + error)
            return false;
        }
    }
    /**
     * Get Game details from cache if not exists in cache it will fetch it from database
     * @param gameId 
     */
    async getGameDetails(gameId: string) {
        try {
            //const key = "GAME_ID:" + gameId;
            const key = "GID_" + gameId;

            //let gameData = await CacheService.getCache(key);
            let gameData = global.GAMES_DETAILS[key];
            
            if (!gameData) {
                let data = await models.gmsGames.findAll({
                    where: {
                        id: gameId
                    },
                    raw: true
                });
                if (data && data.length > 0) {
                    gameData = data[0];
                    //await CacheService.setCache(key, gameData, 2592000);
                    global.GAMES_DETAILS[key]=gameData;
                }
            }
            return gameData;
        } catch (error) {
            console.log("Error : " + error)
            return false;
        }
    }
    async getOnlinePlayerInGame(gameId) {
        try {
            //Query To get online Player in tournament.
            let data = await models.sequelize.query("select count(gtp.id) as onlineUser from gmsTurnamentPlayers gtp where " +
                "fk_TurnamentId in (select id from gmsTurnament gt where gt.fk_GamesId=" + gameId + ")", { type: sequelize.QueryTypes.SELECT });
            let onlineTournament = data.length > 0 ? data[0]['onlineUser'] : 0;

            //Query to get online player in battle.
            data = await models.sequelize.query("select count(1) as onlineUser from  gmsBattleRoom where fk_GameId=" + gameId, { type: sequelize.QueryTypes.SELECT });
            let onnlineBattle = data.length > 0 ? data[0]['onlineUser'] : 0;

            var onlineUser = onlineTournament + onnlineBattle;
            return onlineUser
        }
        catch (error) {
            console.log("Error (GetOnlinePlayerInGame) : ", error);
            return onlineUser > 0 ? onlineUser : false;
        }
    }

    async getWhoIsWinning() {
        try {
            //Query To get latest winner from transaction withdraw log.
            let data = await models.sequelize.query("select t.fkReceiverId,u.mobile,u.firstName,u.image,t.amount " +
                "from gmsPaymentTransactionLogWithdraw t,gmsUsers u " +
                "where t.fkReceiverId=u.id and t.fkReceiverId is not null and t.fkReceiverId!='' and t.fkReceiverId > 100000 GROUP BY t.fkReceiverId ORDER BY t.createdAt DESC limit 10"
                , { type: sequelize.QueryTypes.SELECT });

            return data;
        }
        catch (error) {
            console.log("Error (GetWhoIsWinning) : ", error);
            return false;
        }
    }
    /**
     * User is online or not?
     * @param userId 
     */
    //Now this function is not in Use.
    async isUserPlaying(userId: number) {
        try {
            let data = await models.sequelize.query(
                `SELECT 
                    count(*) AS isOnline 
                FROM 
                    gmsBattleRoom br
                WHERE 
                    (br.fk_PlayerId1=:userId OR br.fk_PlayerId2=:userId) 
                    AND br.status IN (:battleStatus)    
                UNION ALL
                SELECT 
                    count(*) AS isOnline
                FROM 
                    gmsTableGamePlayers 
                WHERE fkPlayerId=:userId 
                    AND status IN (:tableStatus)`,
                {
                    replacements: {
                        userId: userId,
                        battleStatus: [
                            constant.Battle.BattleRoom.RoomCreated,
                            constant.Battle.BattleRoom.PrivateRoomCreated,
                            constant.Battle.BattleRoom.BothPlayerMatch,
                            constant.Battle.BattleRoom.RoomLock],
                        tableStatus: [
                            constant.TabularGames.PlayerStatus.Joined,
                            constant.TabularGames.PlayerStatus.Added]
                    }, type: sequelize.QueryTypes.SELECT
                });
            // let data = await models.sequelize.query(
            //     `SELECT 
            //         count(*) as isOnline
            //     FROM 
            //         gmsBattleRoom br
            //     WHERE 
            //         (br.fk_PlayerId1=:userId OR br.fk_PlayerId2=:userId) 
            //         AND br.status IN (:status)`,
            //     {
            //         replacements: {
            //             userId: userId, status: [
            //                 constant.Battle.BattleRoom.RoomCreated,
            //                 constant.Battle.BattleRoom.PrivateRoomCreated,
            //                 constant.Battle.BattleRoom.BothPlayerMatch,
            //                 constant.Battle.BattleRoom.RoomLock]
            //         }, type: sequelize.QueryTypes.SELECT
            //     });
            if (data.length > 0) {
                return data[0].isOnline > 0 || data[1].isOnline > 0 ? true : false;
            }
        } catch (error) {
            console.log("Error - isUserOnilne: ", error);
        }
        return false;
    }
    /**
     * Favourite Games
     * @param userId 
     */
    async getFavouriteGames(userId: number) {
        try {
            let data = await models.sequelize.query(
                `SELECT 
                    g.id,
                    g.title,
                    g.description,
                    g.smallIconImage,
                    g.appLaunchLink,
                    g.gameType
                FROM
                    gmsGames g,
                    gmsFavouriteGames fg
                WHERE
                    g.id = fg.fk_GamesId 
                    AND fg.fk_UserId = :userId`,
                { replacements: { userId: userId }, type: sequelize.QueryTypes.SELECT });
            if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    data[i].playersCount = await this.getPlayerCount(data[i].id, data[i].gameType);
                }
            }
            return data;
        } catch (error) {
            console.log("Error - getFavouriteGames: ", error);
            return false;
        }
    }
    /**
     * Get Games history with other User
     * @param userId 
     * @param oPlayerId 
     */
    async getGamesHistoryWithOtherUser(userId: number, oPlayerId: number) {
        try {
            let data = await models.sequelize.query(
                `SELECT 
                    g.id,
                    g.title,
                    g.name,
                    g.description,
                    g.smallIconImage,
                    br.status,
                    g.appLaunchLink
                FROM 
                    gmsBattleRoom br, 
                    gmsGames g
                WHERE 
                    br.fk_GameId=g.id
                    AND (br.fk_PlayerId1=:userId OR br.fk_PlayerId2=:userId) 
                    AND (br.fk_PlayerId1=:oPlayerId OR br.fk_PlayerId2=:oPlayerId) 
                    AND br.status IN (:status) 
                    GROUP BY g.id
                    ORDER BY br.createdAt DESC`,
                {
                    replacements: {
                        userId: userId, oPlayerId: oPlayerId, status: [
                            constant.Battle.BattleRoom.Interrupted,
                            constant.Battle.BattleRoom.GameFinished,
                            constant.Battle.BattleRoom.GameDraw
                        ]
                    }, type: sequelize.QueryTypes.SELECT
                });
            if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    data[i].playersCount = await this.getPlayerCount(data[i].id);
                }
            }
            return data;
        } catch (error) {
            console.log("Error - getGamesHistoryWithOtherUser: ", error);
            return [];
        }
    }

    async getPopularGames() {
        try {
            //let popularGames = await CacheService.getCache('popular_games');
            let popularGames = global.POPULAR_GAME;

            if (!popularGames) {
                popularGames = await models.sequelize.query(
                    `SELECT
                    id,
                    title,
                    longIconImage AS image,
                    orientation,
                    screenmode,
                    version,
                    isTurnament,
                    downloadLink,
                    gameType,
                    CONCAT('{"actionUrl": "', appLaunchLink , '", "target": "GAME", "method": "GET"}') as jsonRequest
                FROM
                    gmsGames g
                WHERE
                    g.status=1
                ORDER BY g.popularRank`,
                    { type: sequelize.QueryTypes.SELECT });
                if (popularGames.length > 0) {
                    for (let i = 0; i < popularGames.length; i++) {
                        popularGames[i].subTitle = await this.getPlayerCount(popularGames[i].id, popularGames[i].gameType) + ' Players';
                    }
                    //await CacheService.setCache('popular_games', popularGames, 43200);
                    global.POPULAR_GAME=popularGames
                }
            }
            return popularGames;
        } catch (error) {
            console.log("Error - getPopularGames: ", error);
            return [];
        }
    }

    async getRecentlyPlayedTableGames(userId: number) {
        try {
            /*let data = await models.sequelize.query(
                `SELECT 
                    gg.id,
                    gg.title,
                    gg.longIconImage as image,
                    CONCAT('{"actionUrl": "', appLaunchLink , '", "target": "GAME", "method": "GET"}') as jsonRequest,
                    max(gtgp.updatedAt) as lastUpdated
                FROM 
                    gmsTableGamePlayers gtgp, 
                    gmsTableGame gtg,
                    gmsGames gg 
                WHERE 
                    gtg.id=gtgp.fkTableGameId
                    AND gg.id=gtg.fkGameId
                    AND gtgp.fkPlayerId=:userId
                    AND gtgp.status IN (:status)
                GROUP BY gg.id 
                ORDER BY lastUpdated DESC`,
                {
                    replacements: {
                        userId: userId, status: [
                            constant.TabularGames.PlayerStatus.Joined,
                            constant.TabularGames.PlayerStatus.Left
                        ]
                    }, type: sequelize.QueryTypes.SELECT
                });
            if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    data[i].subTitle = await this.getPlayerCount(data[i].id) + ' Players';
                }
            }
            return data;
            */
            return [];
        } catch (error) {
            console.log("Error - getRecentlyPlayedTableGames: ", error);
            return [];
        }
    }
    

    async getRecentlyPlayedBattleGames(userId: number) {
        try {
            // let data = await models.sequelize.query(
            //     `SELECT 
            //         g.id,
            //         g.title,
            //         g.longIconImage as image,
            //         CONCAT(CAST((SELECT count(DISTINCT fk_PlayerId1) 
            //             FROM gmsBattleRoom brCount 
            //             WHERE brCount.fk_GameId=br.fk_GameId) AS CHAR
            //         ), ' Players') AS subTitle,
            //         CONCAT('{"actionUrl": "', appLaunchLink , '", "target": "GAME", "method": "GET"}') as jsonRequest
            //     FROM 
            //         gmsBattleRoom br, 
            //         gmsGames g
            //     WHERE 
            //         br.fk_GameId=g.id
            //         AND (br.fk_PlayerId1=:userId OR br.fk_PlayerId2=:userId) 
            //         AND br.status IN (:status) 
            //         GROUP BY g.id
            //         ORDER BY br.updatedAt DESC`,
            //     { replacements: {userId: userId, status: [
            //         constant.Battle.BattleRoom.Interrupted, 
            //         constant.Battle.BattleRoom.GameFinished,
            //         constant.Battle.BattleRoom.GameDraw
            //     ]}, type: sequelize.QueryTypes.SELECT });
            let data = await models.sequelize.query(
                `SELECT 
                    g.id,
                    g.title,
                    g.longIconImage as image,
                    CONCAT('{"actionUrl": "', appLaunchLink , '", "target": "GAME", "method": "GET"}') as jsonRequest,
                    max(br.updatedAt) as lastUpdated
                FROM 
                    gmsBattleRoom br, 
                    gmsGames g
                WHERE 
                    br.fk_GameId=g.id
                    AND (br.fk_PlayerId1=:userId OR br.fk_PlayerId2=:userId) 
                    AND br.status IN (:status) 
                    AND g.status=1
                    GROUP BY g.id
                    ORDER BY lastUpdated DESC`,
                {
                    replacements: {
                        userId: userId, status: [
                            constant.Battle.BattleRoom.Interrupted,
                            constant.Battle.BattleRoom.GameFinished,
                            constant.Battle.BattleRoom.GameDraw
                        ]
                    }, type: sequelize.QueryTypes.SELECT
                });
            if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    data[i].subTitle = await this.getPlayerCount(data[i].id) + ' Players';
                }
            }
            return data;
        } catch (error) {
            console.log("Error - getRecentlyPlayedBattleGames: ", error);
            return [];
        }
    }

    compareObjects(object1, object2, key) {
        const obj1 = object1[key]
        const obj2 = object2[key]
        if (obj1 < obj2) {
            return -1
        }
        if (obj1 > obj2) {
            return 1
        }
        return 0
    }

    async getRecentlyPlayedGames(userId: number) {
        try {
            let batlleGames: any = await this.getRecentlyPlayedBattleGames(userId);
            let tableGames: any = await this.getRecentlyPlayedTableGames(userId);
            let data = batlleGames.concat(tableGames);
            data.sort((a, b) => {
                const obj1 = a['lastUpdated']
                const obj2 = b['lastUpdated']
                if (obj1 < obj2) {
                    return 1
                }
                if (obj1 > obj2) {
                    return -1
                }
                return 0
            });
            return data;
        } catch (error) {
            console.log("Error - getRecentlyPlayedGames: ", error);
            return [];
        }
    }
    async getPlayerCount(gameId: number, gameEngine: number = 1) {
        try {
            //const key = "GAME_PLAYER_COUNT:" + gameId;
            const key = "GID_" + gameId;

            //let playerCount = await CacheService.getCache(key);
            let playerCount = global.GAME_PLAYER_COUNT[key];

            let data = null;
            if (!playerCount) {
                if (gameEngine == constant.GameEngine.TableFormatGame) {
                    /*data = await models.sequelize.query(
                        `SELECT 
                            count(DISTINCT fkPlayerId) as playerCount
                        FROM 
                            gmsTableGamePlayers gtgp, 
                            gmsTableGame gtg 
                        WHERE 
                            gtg.id=gtgp.fkTableGameId 
                            AND gtg.fkGameId=:gameId 
                            AND gtgp.status IN (200, 300)`,
                        { replacements: { gameId: gameId }, type: sequelize.QueryTypes.SELECT });*/
                        data=[];
                } else {
                    data = await models.sequelize.query(
                        `SELECT count(DISTINCT fk_PlayerId1) as playerCount
                        FROM gmsBattleRoom brCount 
                        WHERE brCount.fk_GameId=:gameId`,
                        { replacements: { gameId: gameId }, type: sequelize.QueryTypes.SELECT });
                }
                if (data.length > 0) {
                    playerCount = data[0].playerCount;
                    //await CacheService.setCache(key, playerCount, 14400);
                    global.GAME_PLAYER_COUNT[key]=playerCount;
                }
            }
            return playerCount;
        } catch (error) {
            console.error("getPlayerCount: ", error);
            return 0;
        }
    }
    async updatePlayerCount(gameId: number) {
        try {
            //const key = "GAME_PLAYER_COUNT:" + gameId;
            const key = "GID_" + gameId;

            const playerCount = await this.getPlayerCount(gameId);
            //await CacheService.setCache(key, parseInt(playerCount) + 1, 14400);
            global.GAME_PLAYER_COUNT[key]=playerCount;
        } catch (error) {
            console.error("Error in (updatePlayerCount) : ", error);
        }
    }
}

export default new Games();