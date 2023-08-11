import { Express } from "express";

import sequelize from 'sequelize';
import models from './api/models/index';
import  Constant  from "./common/app.constant";

class GlobalData
{
    async setUsersDetails(){
        try{
            let data = await models.sequelize.query(
                `SELECT u.id, u.mobile, u.firstName, u.userName, u.image, u.defaultImage, u.status, u.createdAt, ua.sessionId 
                FROM gmsUsers u, gmsUserAuth ua
                WHERE u.status=1 AND u.id=ua.fk_userId and ua.status=1`,
                { type: sequelize.QueryTypes.SELECT });
            for(let i=0;i<data.length;i++){
                let key="UID_"+data[i]['id'];
                let preparedData={};
                
                preparedData['id']=data[i]['id'];
                preparedData['firstName']=data[i]['firstName'];
                preparedData['userName']=data[i]['userName'];
                preparedData['mobile']=data[i]['mobile'];
                preparedData['image']=data[i]['image'];
                preparedData['defaultImage']=data[i]['defaultImage'];
                preparedData['status']=data[i]['status'];
                preparedData['createdAt']=data[i]['createdAt'];
                preparedData['sessionId']=data[i]['sessionId'];
                
                global.USER_DETAILS[key]=preparedData;
            }
            return true;   
        }
        catch(error){
            console.log("Error in (setUsersName)");
            console.log(error);
            return false;
        }
    }//End of setUsersName()

    async setUpcommingMatches(){
        try{
            let data = await models.FantacyCricket.query(
                `SELECT mat.id, mat.matchId, mat.title as matchTitle, mat.shortTitle, mat.subtitle,
                        mat.preSquad, mat.isTeamAnounced, mat.teamA, mat.teamB, mat.dateStart, mat.status,
                        mat.verified, comp.cid, comp.title as seriesName 
                FROM 
                    gmsFantacyCricketMatch mat, 
                    gmsFantacyCricketCompetition comp
                WHERE 
                    mat.cid=comp.cid AND 
                    mat.status=${Constant.FantacyCricket.MatchStatus.schedule} AND
                    mat.verified = 0 AND 
                    mat.preSquad=1 AND
                    comp.isDisabled=0
                ORDER BY mat.dateStart ASC LIMIT 20`,
                { type: sequelize.QueryTypes.SELECT });
            if (data.length > 0) {
                data = await this.prepareTeamData(data);
            }
            global.UPCOMMING_MATCH=data;
            global.UPCOMMING_MATCH_UT=new Date().getTime();
            return true;   
        }
        catch(error){
            console.log("Error in (setUpcommingMatches)");
            console.log(error);
            return false;
        }
    }//End of setUpcommingMatches()

    async setLiveMatches(){
        try{
            let data = await models.FantacyCricket.query(
                `SELECT mat.id, mat.matchId, mat.title as matchTitle, mat.shortTitle, mat.subtitle,
                        mat.preSquad, mat.isTeamAnounced, mat.teamA, mat.teamB, mat.dateStart, mat.status,
                        mat.verified, comp.cid, comp.title as seriesName 
                FROM 
                    gmsFantacyCricketMatch mat, 
                    gmsFantacyCricketCompetition comp
                WHERE 
                    mat.cid=comp.cid AND 
                    mat.status in (${Constant.FantacyCricket.MatchStatus.live} , ${Constant.FantacyCricket.MatchStatus.complete}) AND
                    mat.verified = 0 AND 
                    mat.preSquad=1 AND
                    comp.isDisabled=0
                ORDER BY mat.dateStart ASC`,
                { type: sequelize.QueryTypes.SELECT });
            if (data.length > 0) {
                data = await this.prepareTeamData(data);
            }
            global.LIVE_MATCHES=data;
            return true;   
        }
        catch(error){
            console.log("Error in (setLiveMatches)");
            console.log(error);
            return false;
        }
    }//End of setUpcommingMatches()


    async prepareTeamData(matchesList) {
        try {
            let teamIds=[]
            for(let i=0;i<matchesList.length;i++){
                teamIds.push(matchesList[i].teamA);
                teamIds.push(matchesList[i].teamB);
            }
            let teamData=await this.getTeam(teamIds);
            for (let i = 0; i < matchesList.length; i++) {
                let teamA=teamData.filter(function(item){
                    return matchesList[i].teamA==item['id']
                })

                let teamB=teamData.filter(function(item){
                    return matchesList[i].teamB==item['id']
                })

                delete matchesList[i].teamA;
                matchesList[i]['teamA'] = teamA[0];
                
                delete matchesList[i].teamB;
                matchesList[i]['teamB'] = teamB[0];
            }
            return matchesList;
        } catch (error) {
            console.log("Error in (prepareTeamData) : ");
            console.log(error);
        }
        return matchesList;
    }
    
    async getTeam(teamIds){
        try{
            let data = await models.FantacyCricket.query(
                `SELECT 
                    tid as id,
                    title,
                    abbr as shortTitle,
                    country,
                    logoURL,
                    thumbURL 
                FROM 
                    gmsFantacyCricketTeams 
                WHERE tid in(:tids) `,
                { replacements: { tids: teamIds }, type: sequelize.QueryTypes.SELECT }
            );
            return data;
        }
        catch(error){
            console.log("Error in (getTeam) : ");
            console.log(error);
        }
    }

    async setHomePageCard(){
        try{
            let cards = await models.gmsHomeCards.findAll({
                attributes: ["id", "title", "subTitle", "cardType", "position", "preloaded", "jsonRequest"],
                where: { status: 1 }, 
                order: [["position", "ASC"]],
                offset: 0, 
                limit: 10,
                raw:true
            });
            global.HOME_PAGE_CARD=cards;
            return true;
        }
        catch(error)
        {
            console.log("Error in (setHomePageCard)");
            console.log(error);
            return false;
        }
    }

    async setAppHistory(){
        try{
            let history = await models.gmsAppHistory.findAll({
                attributes: ["fk_GameId","name","version","isForceUpdate","url", "type"],
                where: { 
                    status: 1
                }, 
                order: [["type", "ASC"]],
                raw:true
            });
            global.GAMES_APP_HISTORY=history;
        }
        catch(error)
        {
            console.log("Error in (setAppHistory)");
            console.log(error);
            return false;
        }
    }

    async setGameData(){
        try{
            let data = await models.gmsGames.findAll({
                where: { 
                    status: 1
                }, 
                raw:true
            });
            for(let i=0;i<data.length;i++){
                let key="GID_"+data[i]['id'];
                global.GAMES_DETAILS[key]=data[i];
            }
            return true;
        }
        catch(error)
        {
            console.log("Error in (setGameData)");
            console.log(error);
            return false;
        }
    }


    async setGamePlayerCount(){
        try{
            let data = await models.sequelize.query(
                `SELECT id, gameType
                FROM
                    gmsGames g
                WHERE
                    g.status=1
                ORDER BY g.popularRank`,
                { type: sequelize.QueryTypes.SELECT });

            for (let i = 0; i < data.length; i++) {
                let playerCount=0;
                if (data[i]['gameType'] == Constant.GameEngine.TableFormatGame) {
                    /*let tData = await models.sequelize.query(
                        `SELECT 
                            count(DISTINCT fkPlayerId) as playerCount
                        FROM 
                            gmsTableGamePlayers gtgp, 
                            gmsTableGame gtg 
                        WHERE 
                            gtg.id=gtgp.fkTableGameId 
                            AND gtg.fkGameId=:gameId 
                            AND gtgp.status IN (200, 300)`,
                        { replacements: { gameId: data[i]['id'] }, type: sequelize.QueryTypes.SELECT });

                    playerCount=tData[0]['playerCount'];*/
                    playerCount=0;
                } else {
                    let bData = await models.sequelize.query(
                        `SELECT count(DISTINCT fk_PlayerId1) as playerCount
                        FROM gmsBattleRoom brCount 
                        WHERE brCount.fk_GameId=:gameId`,
                        { replacements: { gameId: data[i]['id'] }, type: sequelize.QueryTypes.SELECT });

                    playerCount=bData[0]['playerCount'];
                }



                let key="GID_"+data[i]['id'];
                global.GAME_PLAYER_COUNT[key]=playerCount;
            }
            
        }
        catch(error){
            console.log("Error in (setGamePlayerCount) : ")
            console.log(error);
            return false;
        }
        
    }


    async setPopularGame(){
        try{
            let data = await models.sequelize.query(
                `SELECT id, title, longIconImage AS image, orientation, screenmode, version, isTurnament, downloadLink,
                    gameType, CONCAT('{"actionUrl": "', appLaunchLink , '", "target": "GAME", "method": "GET"}') as jsonRequest
                FROM
                    gmsGames g
                WHERE
                    g.status=1
                ORDER BY g.popularRank`,
                { type: sequelize.QueryTypes.SELECT });

            for (let i = 0; i < data.length; i++) {
                let key="GID_"+data[i]['id'];
                data[i].subTitle = global.GAME_PLAYER_COUNT[key];
            }
            global.POPULAR_GAME=data;
        }
        catch(error){
            console.log("Error in (setPopularGame) : ")
            console.log(error);
            return false;
        }
        
    }

    /*async setLeaderbordAllData(){
        try{
            let data = await models.sequelize.query(
            "SELECT  u.userName as firstName,u.image,u.defaultImage,u.gender,u.mobile,ROW_NUMBER() OVER(ORDER BY sum(T1.amount) DESC ) AS `rank` , T1.fkUserId as id, sum(T1.amount) as winPrize FROM "+
			"( "+
			"select ROW_NUMBER() OVER(ORDER BY sum(w.amount) DESC ) AS `rank`, w.fkReceiverId as fkUserId,SUM(w.amount) as amount  "+
			"from gmsPaymentTransactionLogWithdraw w  "+
			"where w.requestType=30 and w.payStatus=10 and w.amount!=0 and w.fkReceiverId is not null "+
			"GROUP BY w.fkReceiverId  "+
			"UNION  "+
			"select ROW_NUMBER() OVER(ORDER BY sum(e.delta) DESC ) AS `rank`, e.fkUserId,SUM(e.delta) as amount  "+
			"from gmsTableGameEndTrx e  "+
			"where e.status=20 AND e.delta > 0   "+
			"GROUP BY e.fkUserId  "+
			"UNION "+
			"select ROW_NUMBER() OVER(ORDER BY sum(e.delta) DESC ) AS `rank`, e.fkUserId,SUM(e.delta) as amount  "+
			"from gmsTableGameEndTrxC e  "+
			"where e.status=20 AND e.delta > 0  "+
			"GROUP BY e.fkUserId  "+
			") T1 , gmsUsers u "+
            "WHERE u.id=T1.fkUserId GROUP BY T1.fkUserId "+ 
            "LIMIT 10",
            { type: sequelize.QueryTypes.SELECT });

            global.LEADERBORD_ALL=data;
            //console.log(global.LEADERBORD_ALL);
            return true;
        }
        catch(error){
            console.log("Error in (setLeaderbordAllData) : ")
            console.log(error);
            return false;
        }
        
    }*/

    /*async setLeaderbordTodayData(){
        try{
            let data = await models.sequelize.query(
            "SELECT  u.userName as firstName,u.image,u.defaultImage,u.gender,u.mobile,ROW_NUMBER() OVER(ORDER BY sum(T1.amount) DESC ) AS `rank` , T1.fkUserId as id, sum(T1.amount) as winPrize FROM "+
            "( "+
            "select ROW_NUMBER() OVER(ORDER BY sum(w.amount) DESC ) AS `rank`, w.fkReceiverId as fkUserId,SUM(w.amount) as amount  "+
            "from gmsPaymentTransactionLogWithdraw w  "+
            "where w.requestType=30 and w.payStatus=10 and w.amount!=0 and w.fkReceiverId is not null and w.createdAt >= CURDATE()  "+
            "GROUP BY w.fkReceiverId  "+
            "UNION  "+
            "select ROW_NUMBER() OVER(ORDER BY sum(e.delta) DESC ) AS `rank`, e.fkUserId,SUM(e.delta) as amount  "+
            "from gmsTableGameEndTrx e  "+
            "where e.status=20 AND e.delta > 0  AND e.createdAt >= CURDATE()  "+
            "GROUP BY e.fkUserId  "+
            ") T1, gmsUsers u "+
            "WHERE u.id=T1.fkUserId "+
            "GROUP BY T1.fkUserId "+
            "LIMIT 10",
            { type: sequelize.QueryTypes.SELECT });

            global.LEADERBORD_TODAY=data;
            //console.log(global.LEADERBORD_TODAY);
            return true;
        }
        catch(error){
            console.log("Error in (setLeaderbordTodayData) : ")
            console.log(error);
            return false;
        }
        
    }*/


    async setHomePagePopupData(){
        try{
            let data = await models.sequelize.query(
            `SELECT  type,title, msg, version,url,isCancellable,buttonText, timer, icon  FROM gmsHomePagePopupMessage WHERE status=1`,
            { type: sequelize.QueryTypes.SELECT });
            if(data && data.length > 0){
                data[0]['version']=data[0]['version']?JSON.parse(data[0]['version']):data[0]['version'];
                data[0]['isCancellable']=data[0]['isCancellable']==1?true:false;
                delete data[0]['id'];
            }
            global.HOME_PAGE_POPUP=data;
            return true;
        }
        catch(error){
            console.log("Error in (setHomePagePopupData) : ")
            console.log(error);
            return false;
        }
    }

    async setGameList(){
        try{
            let data = await models.sequelize.query(`SELECT  id, name FROM gmsGames`,{ type: sequelize.QueryTypes.SELECT });
            global.GAME_LIST=data;
            return true;
        }
        catch(error){
            console.log("Error in (setGameList) : ")
            console.log(error);
            return false;
        }
    }

    async setBattleList(){
        try{
            let data = await models.sequelize.query(`SELECT  id, title FROM gmsBattle`,{ type: sequelize.QueryTypes.SELECT });
            global.BATTLE_LIST=data;
            return true;
        }
        catch(error){
            console.log("Error in (setBattleList) : ")
            console.log(error);
            return false;
        }
    }

    async setBlockState(state,isPush){
        let currentStateData=global.BLOCKED_STATE;
        console.log(currentStateData);
        let index=currentStateData.indexOf(state);
        if(isPush && index >=0){
            console.log("State alredy in list");
        }
        else if(isPush && index < 0){
            currentStateData.push(state);
            console.log("State listed.");
        }
        else if(!isPush && index >= 0){
            currentStateData.splice(index, 1);
            console.log("State removed.");
        }
        else{
            console.log("Blocked State data condition not matched.");
        }
        global.BLOCKED_STATE=currentStateData;
    }
}


export default new GlobalData();