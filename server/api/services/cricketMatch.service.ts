import sequelize from 'sequelize';
import models from '../models/index';
import Constant from '../../common/app.constant';
//import { CacheService } from '../cache/cache.service';
//import { config } from 'aws-sdk';
export class CricketMatch{
    /**
     * Prepare team data to match list
     * @param matchesList 
     */
    private async prepareTeamData(matchesList:any){
        try{
            for (let i = 0; i < matchesList.length; i++){
                let team = await this.getTeam(matchesList[i].teamA); 
                    delete matchesList[i].teamA;
                    matchesList[i]['teamA'] = team;
                    team = await this.getTeam(matchesList[i].teamB);
                    delete matchesList[i].teamB;
                    matchesList[i]['teamB']= team;
            }
        }catch(error){
            console.log("Error in (prepareTeamData) : ",error);
        }
        return matchesList;
    }

    private async prepareTeamDataV1(matchesList) {
        try {
            let teamIds=[]
            for(let i=0;i<matchesList.length;i++){
                teamIds.push(matchesList[i].teamA);
                teamIds.push(matchesList[i].teamB);
            }
            let teamData=await this.getTeamV1(teamIds);
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
    /**
     * Get Team data
     * @param teamId 
     */
    async getTeam(teamId:number){
        try{
            //let data = await CacheService.getCacheData('team:' + teamId);
            let data=false;
            if(!data){
                data = await models.FantacyCricket.query(
                    `SELECT 
                        id,
                        title,
                        abbr as shortTitle,
                        country,
                        logoURL,
                        thumbURL 
                    FROM 
                        gmsFantacyCricketTeams 
                    WHERE tid = :tid`, 
                { replacements: { tid: teamId }, type: sequelize.QueryTypes.SELECT });
                data = data[0]
                //CacheService.setCacheData('team:' + teamId, data);
            }          
            return data;
        }catch(error){
            console.log("Error (Team Details) : ", error);
            return false;
        }
    }

    private async getTeamV1(teamIds){
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

    async getUserJoinedMatches(userId:number){

        try{
            //Find cricket user team match data .
            let cutMatchData = await models.sequelize.query(
                `SELECT 
                    ut.fkMatchId
                FROM
                    gmsFantacyCricketUserTeam ut
                WHERE   
                    ut.fkUserId = :userId 
                GROUP BY ut.fkmatchId`, 
                { replacements: { userId: userId }, type: sequelize.QueryTypes.SELECT }).map(el => el.fkMatchId);
            return cutMatchData;
        }
        catch(error){
            console.log("Error in (getUserJoinedMatches) : ");
            console.log(error);
        }
    }


    /**
     * Get User match id list for all matches
     * @param userId 
     * @param status 
     */
    async getUserMatchesByStatus(joinedUserMatchList, status:Array<number>,tabKey=2){
        try{
            var verifiedCond="";
            if(tabKey==1)
                verifiedCond=" AND mat.verified=0"

            if(joinedUserMatchList && joinedUserMatchList.length>0){
                let data = await models.FantacyCricket.query(
                    `SELECT 
                        mat.matchId
                    FROM
                        gmsFantacyCricketMatch mat 
                    WHERE   
                        mat.matchId in (${joinedUserMatchList}) AND
                        mat.status IN (:status) `+verifiedCond+` 
                    ORDER BY mat.dateStart ASC`, 
                    { replacements: { status: status }, type: sequelize.QueryTypes.SELECT }).map(el => el.matchId);
                return data;
            }
            else{
               return [] 
            }
        }catch(error){
            console.log("Error (getUserMatches) : ", error);
            return false;
        }
    }

    /**
     * Get count of team and contests
     * @param userId 
     * @param matchId 
     */
    async getCountOfTeamAndContests(userId:number, matchId:number){
        let data = {
            'teamCount': 0,
            'contestCount': 0
        };
        try{
            //Contest count query
            let contestCount = await models.sequelize.query(
                `SELECT 
                    count(DISTINCT fkContestId) as contestCount
                FROM 
                    gmsFantacyCricketUserTeam ut
                WHERE 
                    ut.fkUserId = :userId AND 
                    ut.fkMatchId = :matchId AND 
                    (ut.fkContestId IS NOT NULL AND ut.fkContestId!='') 
                GROUP BY ut.fkMatchId`, 
            { replacements: { userId: userId, matchId: matchId }, type: sequelize.QueryTypes.SELECT });
            data.contestCount = contestCount.length > 0?contestCount[0].contestCount:0;

            //Team count query
            let teamCount = await models.sequelize.query(
                `SELECT 
                    count(DISTINCT ut.teamCode) as teamCount
                FROM 
                    gmsFantacyCricketUserTeam ut
                WHERE 
                    ut.fkUserId = :userId AND 
                    ut.fkMatchId = :matchId 
                GROUP BY ut.fkMatchId`, 
            { replacements: { userId: userId, matchId: matchId }, type: sequelize.QueryTypes.SELECT });
            data.teamCount = teamCount.length > 0?teamCount[0].teamCount:0;
        }catch(error){
            console.log("Error (Team Details) : ", error);
        }
        return data;
    }

    /**
     * Get Total Prize money for the match per user
     * @param userId 
     * @param matchId 
     */
    async getTotalPrizeMoney(userId:number, matchId:number, contestId:number=null){
        let prizeAmount = 0
        try{
            let condData:any = {
                userId: userId,
                matchId: matchId
            };
            let contestCond = "";
            if(contestId){
                contestCond = " AND fcc.id = :contestId ";
                condData.contestId = contestId;

            }
            let data = await models.sequelize.query(
                `SELECT 
                    sum(cpd.actualPrize) AS prizeAmount
                FROM
                    gmsContestPrizeDistribution cpd,
                    gmsFantacyCricketContest fcc
                WHERE
                    cpd.fk_contestId = fcc.id AND
                    cpd.fk_UserId = :userId AND
                    fcc.fkMatchId = :matchId` + 
                    contestCond + 
                `GROUP BY fcc.fkMatchId;`, 
                { replacements: condData, type: sequelize.QueryTypes.SELECT });
            prizeAmount = data.length > 0?parseInt(data[0].prizeAmount):0;
        }catch(error){
            console.log("Error (getTotalPrizeMoney) : ", error);
        }
        return prizeAmount;
    }
    async getUpComingMatchesList(userId:number, status:number){
        try{
            //let upcomingMatches = await CacheService.getCache('UPCOMING_MATCHES');
            let upcomingMatches = global.UPCOMMING_MATCH;
            let lastUpdatedTime = global.UPCOMMING_MATCH_UT;
            let currentTime=new Date().getTime() - 1000 * 60 ;

            if (!upcomingMatches || lastUpdatedTime < currentTime ){
                console.log("Upcomming Matches From DB Table.");
                upcomingMatches = await models.FantacyCricket.query(
                    `SELECT 
                        mat.id, 
                        mat.matchId, 
                        mat.title as matchTitle, 
                        mat.shortTitle, 
                        mat.subtitle,
                        mat.preSquad, 
                        mat.isTeamAnounced,
                        mat.teamA,
                        mat.teamB,
                        mat.dateStart, 
                        mat.status,
                        mat.verified,
                        comp.cid,
                        comp.title as seriesName 
                    FROM 
                        gmsFantacyCricketMatch mat, 
                        gmsFantacyCricketCompetition comp
                    WHERE 
                        mat.cid = comp.cid AND 
                        mat.status IN (:status) AND
                        mat.verified = 0 AND 
                        mat.preSquad=1 AND
                        comp.isDisabled=0
                    ORDER BY mat.dateStart ASC LIMIT 20`,
                    { replacements: { status: status }, type: sequelize.QueryTypes.SELECT }
                );
                if (upcomingMatches.length > 0){
                    //upcomingMatches = await this.prepareTeamData(upcomingMatches);
                    upcomingMatches = await this.prepareTeamDataV1(upcomingMatches);
                }
                global.UPCOMMING_MATCH=upcomingMatches;
                global.UPCOMMING_MATCH_UT=new Date().getTime();
            }//End of Upcomming Matches.
            return upcomingMatches;
        }catch(error){
            console.error("Error - getUpComingMatchesList: ", error);
            return [];
        }
    }

   /**
    * Get the list of matches which is in live and upcomming.
    * @param userId 
    * @param status 
    */
    async getAllMatchesList(userId:number, status:number,userJoinedMatches:any){
        try{
            let data: any = {} 

            //let upcomingMatches = await CacheService.getCache('UPCOMING_MATCHES');
            let upcomingMatches = global.UPCOMMING_MATCH;
            
            let lastUpdatedTime = global.UPCOMMING_MATCH_UT;
            let currentTime=new Date().getTime() - 1000 * 60 ;

            if (!upcomingMatches || lastUpdatedTime < currentTime){
                console.log("Upcomming Matches From DB Table.");
                upcomingMatches = await models.FantacyCricket.query(
                    `SELECT 
                        mat.id, 
                        mat.matchId, 
                        mat.title as matchTitle, 
                        mat.shortTitle, 
                        mat.subtitle,
                        mat.preSquad, 
                        mat.isTeamAnounced,
                        mat.teamA,
                        mat.teamB,
                        mat.dateStart, 
                        mat.status,
                        mat.verified,
                        comp.cid,
                        comp.title as seriesName 
                    FROM 
                        gmsFantacyCricketMatch mat, 
                        gmsFantacyCricketCompetition comp
                    WHERE 
                        mat.cid = comp.cid AND 
                        mat.status IN (:status) AND
                        mat.verified = 0 AND
                        mat.preSquad=1 AND
                        comp.isDisabled=0
                    ORDER BY mat.dateStart ASC LIMIT 20`,
                    { replacements: { status: status }, type: sequelize.QueryTypes.SELECT }
                );
                if (upcomingMatches.length > 0){
                    //upcomingMatches = await this.prepareTeamData(upcomingMatches);
                    upcomingMatches = await this.prepareTeamDataV1(upcomingMatches);
                }
                global.UPCOMMING_MATCH=upcomingMatches;
                global.UPCOMMING_MATCH_UT=new Date().getTime();

            }//End of Upcomming Matches.
            for (let i=0;i<upcomingMatches.length;i++){
                upcomingMatches[i].isReminderSet=await this.isReminderSet(upcomingMatches[i].matchId,userId);
            
            }
            data.upcomingMatches = upcomingMatches;
            let userMatches = await this.getUserMatchesByStatus(userJoinedMatches, [Constant.FantacyCricket.MatchStatus.schedule,Constant.FantacyCricket.MatchStatus.live,Constant.FantacyCricket.MatchStatus.complete],1);
            let keepPlayingMatches:any = [];
            for (let i = 0; i < userMatches.length; i++){
                for (let j = 0; j < upcomingMatches.length; j++){
                    if (userMatches[i] == upcomingMatches[j].matchId){
                        keepPlayingMatches.push(upcomingMatches[j]);
                        //upcomingMatches.splice(j, 1);
                        break;
                    }
                }
            } 
            data.keepPlayingMatches = keepPlayingMatches;
            return data;
        }catch(error){
            console.log("Error (getAllMatchesList) : ", error);
            return [];
        }
    }

    /**
     * List all matches(Live, Upcomming and Completed) which is participeted by user or whether user creted the team for match 
     * @param userId 
     * @param status 
     */
    async getMyMatchesList(userId:number, status:Array<number>,userJoinedMatches:any){
        try{
            //var cacheKey:string = null;
            let globalVar:string=null;
            let globalTimeVar:string=null;
            let upComingMathReminder=false
            if(status.includes(Constant.FantacyCricket.MatchStatus.schedule)){
                //cacheKey = 'UPCOMING_MATCHES';
                globalVar='UPCOMMING_MATCH'
                globalTimeVar='UPCOMMING_MATCH_UT'
                upComingMathReminder=true

            }else if(status.includes(Constant.FantacyCricket.MatchStatus.live)){
                //cacheKey = 'LIVE_MATCHES';
                globalVar='LIVE_MATCHES'
                globalTimeVar='LIVE_MATCHES_UT'
            }
            let myAllMatches:any = [];
            let myMatches:any = null;

            let lastUpdatedTime =null;
            let currentTime=new Date().getTime() - 1000 * 60 ;

            //Get the data from cache.
            if (globalVar){
                //myMatches = await CacheService.getCache(cacheKey);
                myMatches = global[globalVar];
                lastUpdatedTime=global[globalTimeVar];
            }
            
            //If no data in cache try to get from DB
            let userMatches = await this.getUserMatchesByStatus(userJoinedMatches, status);

            if((!myMatches || lastUpdatedTime < currentTime) && userMatches.length > 0){
                let odr=status.includes(1,3)?"ASC" : "DESC";
                myMatches = await models.FantacyCricket.query(
                    `SELECT 
                        mat.id, 
                        mat.matchId, 
                        mat.title as matchTitle, 
                        mat.shortTitle, 
                        mat.subtitle,
                        mat.preSquad, 
                        mat.isTeamAnounced,
                        mat.teamA,
                        mat.teamB, 
                        mat.dateStart,
                        mat.status,
                        mat.verified,
                        comp.cid,
                        comp.title as seriesName 
                    FROM
                        gmsFantacyCricketMatch mat 
                        INNER JOIN gmsFantacyCricketCompetition comp ON mat.cid = comp.cid AND comp.isDisabled=0
                    WHERE
                        mat.matchId in (:userMatches) AND mat.status IN (:status)
                    ORDER BY mat.dateStart `+odr, 
                    { replacements: { userMatches: userMatches, status: status }, type: sequelize.QueryTypes.SELECT });
                    //myMatches=await this.prepareTeamData(myMatches);
                    myMatches=await this.prepareTeamDataV1(myMatches);
            }

            
            
            for (let j = 0; myMatches && j < myMatches.length; j++){
                if (userMatches.indexOf(myMatches[j].matchId) != -1){
                    let countData = await this.getCountOfTeamAndContests(userId, myMatches[j].matchId);
                    if(upComingMathReminder){
                      myMatches[j]["isReminderSet"]=await this.isReminderSet (myMatches[j].matchId,userId);
                    }
                    myMatches[j]['contestCount'] = countData['contestCount'];
                    myMatches[j]['teamCount'] = countData['teamCount'];
                    myAllMatches.push(myMatches[j]);
                    if (userMatches.length == myAllMatches.length){
                        break;
                    }
                }
            }             
            return myAllMatches;
        }catch(error){
            console.log("Error (GetKeepPlayingMatches) : ", error);
            return [];
        }
    }

    async getSquadID(matchId){
        try{
            let data = await models.FantacyCricket.query(
                `SELECT
                    CONCAT(matchId, teamA, teamB) AS squadId
                FROM
                    gmsFantacyCricketMatch
                WHERE
                    matchId = :matchId`,
                { replacements: { matchId: matchId }, type: sequelize.QueryTypes.SELECT });        
            return data && data.length>0?data[0]['squadId']:false;
        }catch(error){
            console.log("Error (GetSquadID): ", error);
            return false;
        }
    }

    async getMatchPlayerSquad(competitionId, matchId){
        try{
            let data = await models.FantacyCricket.query(
                `SELECT
                    msc.fkCid AS cid,
                    msc.fkMatchId AS matchId,
                    GROUP_CONCAT(ifnull(msc.fkPlayerId,'NULL')) AS playerId,
                    GROUP_CONCAT(ifnull(msc.playerName,'NULL')) AS playerName,
                    GROUP_CONCAT(ifnull(msc.point,'NULL')) AS point,
                    GROUP_CONCAT(ifnull(msc.credit,'NULL')) AS credit,
                    GROUP_CONCAT(ifnull(msc.role,'NULL')) AS role,
                    GROUP_CONCAT(ifnull(msc.isPlaying11,'NULL')) AS isPlaying11,
                    GROUP_CONCAT(ifnull(ct.tid,'NULL')) AS teamId,
                    GROUP_CONCAT(ifnull(ct.country,'NULL')) AS team,
                    GROUP_CONCAT(ifnull(ct.title,'NULL')) AS teamTitle,
                    cm.minWK,
                    cm.maxWK,
                    cm.minBAT,
                    cm.maxBAT,
                    cm.minBOWL,
                    cm.maxBOWL,
                    cm.minALL,
                    cm.maxALL 
                FROM  
                    gmsfantacyCricketMatchScoreCard msc,
                    gmsFantacyCricketMatch cm,
                    gmsFantacyCricketTeams ct 
                WHERE
                    msc.fkCid = :competitionId  AND 
                    msc.fkMatchId = :matchId AND 
                    cm.matchId=msc.fkMatchId AND 
                    ct.tid=msc.fkTeamId 
                GROUP BY msc.fkCid, msc.fkMatchId`,
                { replacements: { competitionId: competitionId, matchId: matchId }, type: sequelize.QueryTypes.SELECT});           
            return data;
        }catch(error){
            console.log("Error (GetMatchPlayerSquad) : ", error);
            return false;
        }
    }
    /**
     * Get Player performance 
     * @param contestId 
     * @param playerId 
     */
    async getPlayerPerformance(competitionId:number, playerId:Array<number>){
        try{
            let data=await models.FantacyCricket.query(
                `SELECT 
                    msc.fkPlayerId,
                    SUM(msc.point) AS points 
                FROM 
                    gmsfantacyCricketMatchScoreCard msc
                WHERE 
                    msc.fkCid = :competitionId AND 
                    msc.fkPlayerId IN (:playerId)
                GROUP BY msc.fkPlayerId
                ORDER BY FIELD(msc.fkPlayerId, :playerId)`,
                { replacements: { competitionId: competitionId, playerId: playerId }, type: sequelize.QueryTypes.SELECT });
            return data
        }catch(error){
            console.log("Error (GetPlayerPerformance) : ", error);
            return false;
        }
    }

    /**
     * Get contest details by match id
     * @param matchId 
     */
    async getPlayerStats(playerId:Array<number>, competitionId:number=null, matchId:number=null, contestId=null){
        try{
            let condData:any = {}; 
            let competitionCond = "";
            let matchCond = "";
            let matchCondTC = "";
            let matchCondTCJ = "";
            let contestCond = "";
            if (competitionId){
                competitionCond = " AND cmsc.fkCid = :competitionId ";
                condData.competitionId = competitionId;
            }
            if (matchId){
                matchCond = " AND cmsc.fkMatchId = :matchId ";
                condData.matchId = matchId;
                matchCondTC = " ut.fkMatchId ="+matchId;
                matchCondTCJ = " AND ut.fkMatchId ="+matchId;
                
            }
            if (contestId){
                contestCond = " AND ut.fkContestId = :contestId ";
                condData.contestId = contestId;
            }
            let teamCount = await models.sequelize.query(
                `SELECT 
                    count(DISTINCT ut.teamcode) AS teamCount 
                FROM 
                    gmsFantacyCricketUserTeam ut
                WHERE ${matchCondTC} ${contestCond}` ,  
                { replacements: condData, type: sequelize.QueryTypes.SELECT });


            teamCount = teamCount[0]['teamCount']==0?1:teamCount[0]['teamCount'];
            condData.playerId = playerId;
            
            let playerStats = await models.FantacyCricket.query(
                `SELECT
                    cmsc.fkTeamId AS tid,
                    cmsc.fkPlayerId,
                    cmsc.playerName,
                    cmsc.role,
                    cmsc.credit,
                    cmsc.point,
                    cmsc.isPlaying11,
                    0 AS selectedBy
                FROM 
                    gmsfantacyCricketMatchScoreCard cmsc 
                     
                WHERE 
                    cmsc.fkPlayerId IN (:playerId) ${competitionCond} ${matchCond} 
                GROUP BY cmsc.fkPlayerId
                ORDER BY FIELD(cmsc.fkPlayerId, :playerId)`,
                { replacements: condData, type: sequelize.QueryTypes.SELECT });

            let playerSelection = await models.sequelize.query(
                `SELECT
                    ut.fkPlayerId,
                    (count(ut.id)*100)/:teamCount AS selectedBy
                FROM 
                    gmsFantacyCricketUserTeam ut 
                WHERE 
                    ut.fkPlayerId IN (:playerId) ${matchCondTCJ} ${contestCond} 
                GROUP BY ut.fkPlayerId
                ORDER BY FIELD(ut.fkPlayerId, :playerId)`,
                { replacements: {playerId:playerId, teamCount:teamCount}, type: sequelize.QueryTypes.SELECT });


            for(let i=0; playerStats && i < playerStats.length; i++){
                let selectedStats=playerSelection.filter(
                    selecton=> selecton.fkPlayerId==playerStats[i]['fkPlayerId']
                );
                playerStats[i]['selectedBy'] = selectedStats && selectedStats.length>0?selectedStats[0]['selectedBy']:playerStats[i]['selectedBy'];
            }

            return playerStats;
        }
        catch(error){
            console.log("Error (Player Stats) : ",error);
            return false;
        }
    }

    /**
     * Get contest details by match id
     * @param matchId 
     */
    async getRecentMatches(playerId:number, matchId:number){
        try{
            let data = await models.FantacyCricket.query(
                `SELECT 
                    fcms.fkCid, 
                    fcms.fkMatchId,
                    fcm.shortTitle,
                    fcm.dateStart    
                FROM 
                    gmsfantacyCricketMatchScoreCard fcms, 
                    gmsFantacyCricketMatch fcm  
                WHERE
                    fcms.fkMatchId = fcm.matchId AND 
                    fcms.fkPlayerId = :playerId AND
                    fcms.fkMatchId <> :matchId
                ORDER BY fcm.dateStart LIMIT 3`,
                { replacements: { playerId: playerId, matchId: matchId }, type: sequelize.QueryTypes.SELECT });
            return data;
        }
        catch(error){
            console.log("Error (GetContestByMatchId) : ",error);
            return false;
        }
    }
    /**
     * Squad Player details based on player id
     * @param playerId 
     */
    async getSquadPlayerDetails(playerId){
        try{
            let data=await models.FantacyCricket.query(
                `SELECT 
                    p.title,
                    p.shortName,
                    p.lastName,
                    p.middleName,
                    p.country,
                    p.thumbUrl,
                    p.logoUrl,
                    p.fantasyPlayerRating 
                FROM 
                    gmsFantacyCricketPlayer p 
                WHERE pid = :playerId`,
                { replacements: { playerId: playerId}, type: sequelize.QueryTypes.SELECT });        
            return data;
        }catch(error){
            console.log("Error (GetSquadPlayerDetails) : ",error);
            return false;
        }
    }

    /**
     * Generate Team name
     * @param userId 
     * @param matchId 
     * @param teamCode 
     */
    async generateTeamName(userId, matchId, teamCode){
        let title = "";
        try{
            if(teamCode){
                let data1 = await models.sequelize.query(
                    `SELECT
                        title 
                    FROM 
                        gmsFantacyCricketUserTeam
                    WHERE 
                        teamCode = :teamCode AND 
                        (title != '' AND title IS NOT NULL)  
                    GROUP BY teamCode`,
                { replacements: { teamCode: teamCode }, type: sequelize.QueryTypes.SELECT });        
                title = data1 && data1.length > 0?data1[0]['title']:0;
            }else{
                let data1 = await models.sequelize.query(
                    `SELECT 
                        COUNT(DISTINCT teamCode) as teamCounts
                    FROM
                        gmsFantacyCricketUserTeam
                    WHERE
                        fkUserId = :userId AND fkMatchId = :matchId
                                AND refTeamCode IS NULL`,
                    { replacements: { userId: userId, matchId: matchId }, type: sequelize.QueryTypes.SELECT });        
                let teamCount = data1 && data1.length>0?data1[0]['teamCounts']:0;
                let data2 = await models.sequelize.query(
                    `SELECT 
                        userName 
                    FROM 
                        gmsUsers 
                    WHERE id = :userId`,
                    {  replacements: { userId: userId }, type: sequelize.QueryTypes.SELECT});        
                let user = data2 && data2.length > 0 && data2[0]['userName'] != null ?data2[0]['userName']:"";
                title = user + " (T-" + (teamCount + 1)+")";
            }
            return title;
        }catch(error){
            console.log("Error (GenerateTeamName) : ", error);
            return "";
        }
    }

    /**
     * Match details
     * @param matchId 
     */
    async getMatchDetailsForStats(matchId){
        try{
            let data = await models.FantacyCricket.query(
                `SELECT 
                    concat(cm.subtitle,' , ',cm.title) As matchName,
                    concat(cmp.title,' , ',cmp.season) AS series,
                    cm.dateStart,
                    cm.venueName,
                    cm.live,
                    cm.result,
                    cm.teamA,
                    ctma.title AS teamAName,
                    cm.teamB,
                    ctmb.title AS teamBName,
                    cm.status,
                    cmp.cid,
                    cm.teamAScore,
                    cm.teamBOver,
                    cm.teamBScore,
                    cm.teamBOver
                FROM 
                    gmsFantacyCricketMatch cm 
                    LEFT JOIN gmsFantacyCricketCompetition cmp ON cmp.cid = cm.cid 
                    LEFT JOIN gmsFantacyCricketTeams ctma ON ctma.tid = cm.teamA 
                    LEFT JOIN gmsFantacyCricketTeams ctmb ON ctmb.tid = cm.teamB 
                WHERE 
                    cm.matchId = :matchId`,
                { replacements: { matchId: matchId }, type: sequelize.QueryTypes.SELECT });
            return data;
        }catch(error){
            console.log("Error (GetMatchDetailsForStats) : ", error);
            return false;
        }
    }

    /**
     * Team Squads for match
     * @param teamA 
     * @param teamB 
     * @param matchId 
     */
    async getMatchTeamSquads(teamA, teamB, matchId){
        let teams = [];
        try{
            let team1Squads = await models.FantacyCricket.query(
                `SELECT 
                    concat(ct.title,' , Squads') AS teamName,
                    group_concat(ifnull(cmsc.playerName,'NULL')) AS playerName
                FROM 
                    gmsfantacyCricketMatchScoreCard cmsc
                    LEFT JOIN gmsFantacyCricketTeams ct ON ct.tid=cmsc.fkTeamId
                WHERE
                    cmsc.fkMatchId = :matchId AND 
                    cmsc.fkTeamId = :teamId
                GROUP BY cmsc.fkMatchId,cmsc.fkTeamId`,
                { replacements: { matchId: matchId, teamId: teamA }, type: sequelize.QueryTypes.SELECT });
            teams.push(team1Squads[0]);
            
            let team2Squads = await models.FantacyCricket.query(
                `SELECT 
                    concat(ct.title,' , Squads') AS teamName,
                    group_concat(ifnull(cmsc.playerName,'NULL')) AS playerName
                FROM 
                    gmsfantacyCricketMatchScoreCard cmsc
                    LEFT JOIN gmsFantacyCricketTeams ct ON ct.tid=cmsc.fkTeamId
                WHERE
                    cmsc.fkMatchId = :matchId AND 
                    cmsc.fkTeamId = :teamId
                GROUP BY cmsc.fkMatchId,cmsc.fkTeamId`,
                { replacements: { matchId: matchId, teamId: teamB }, type: sequelize.QueryTypes.SELECT });
            teams.push(team2Squads[0]);
            return teams;
        }catch(error){
            console.log("Error (GetMatchTeamSquads) : ", error);
            return false;
        }
    }

    /**
     * Get All the player whose are playing or squad of the given match
     * @param matchId 
     */
    async getPlayerToWatch(matchId){
        try{
            let data=await models.FantacyCricket.query(
                `SELECT 
                    msc.fkCid AS cid,
                    msc.fkMatchId AS matchId,
                    GROUP_CONCAT(IFNULL(msc.fkPlayerId,'NULL')) AS playerId,
                    GROUP_CONCAT(IFNULL(msc.playerName,'NULL')) AS playerName,
                    GROUP_CONCAT(IFNULL(msc.point,'NULL')) AS point,
                    GROUP_CONCAT(IFNULL(msc.credit,'NULL')) AS credit,
                    GROUP_CONCAT(IFNULL(msc.role,'NULL')) AS role,
                    GROUP_CONCAT(IFNULL(msc.isPlaying11,'NULL')) AS isPlaying11,
                    GROUP_CONCAT(IFNULL(ct.title,'NULL')) AS team 
                FROM
                    gmsfantacyCricketMatchScoreCard msc,
                    gmsFantacyCricketMatch cm,
                    gmsFantacyCricketTeams ct 
                WHERE 
                    msc.fkMatchId=:matchId AND 
                    cm.matchId=msc.fkMatchId AND 
                    ct.tid=msc.fkTeamId 
                GROUP BY fkCid,fkMatchId`,
                { replacements: { matchId: matchId }, type: sequelize.QueryTypes.SELECT });            
            return data;
        }catch(error){
            console.log("Error (GetPlayerToWatch) : ", error);
            return false;
        }
    }

    /**
     * Match history to player to watch
     * @param playerId 
     * @param matchId 
     */
    async getPlayerToWatchMatchHistory(playerId, matchId){
        try{
            let data = await models.FantacyCricket.query(
                `SELECT
                    cmsc.fkMatchId,
                    cmsc.point,
                    cmsc.credit,
                    cm.shortTitle,
                    cm.dateStart 
                FROM 
                    gmsfantacyCricketMatchScoreCard cmsc 
                    left join gmsFantacyCricketMatch cm on cm.matchId=cmsc.fkMatchId 
                WHERE
                    fkPlayerId = :playerId AND
                    cmsc.fkMatchId != :matchId
                ORDER BY cm.dateStart DESC LIMIT 5`,
                { replacements: { matchId: matchId, playerId: playerId}, type: sequelize.QueryTypes.SELECT });            
            
            let playerHistory = data;
            if(data && data.length > 0){
                for(let i = 0;i < playerHistory.length; i++){
                    let matchId = playerHistory[i]['fkMatchId'];
                    delete playerHistory[i]['fkMatchId'];
                    
                    let playerCount = await models.sequelize.query(
                        `SELECT
                            count(*) AS playerPickCount 
                        FROM
                            gmsFantacyCricketUserTeam ctm 
                        WHERE 
                            ctm.fkMatchId = :matchId AND 
                            ctm.fkPlayerId = :playerId`,
                        { replacements: { matchId: matchId, playerId: playerId}, type: sequelize.QueryTypes.SELECT });
                    
                    let teamCount=await models.sequelize.query(
                        `SELECT
                            count(*) AS teamCount 
                        FROM 
                            (SELECT 
                                fkMatchId 
                            FROM 
                                gmsFantacyCricketUserTeam ctc 
                            GROUP BY ctc.teamCode
                            ) AS totalTeams
                        WHERE 
                            totalTeams.fkMatchId = :matchId`,
                        { replacements: { matchId: matchId }, type: sequelize.QueryTypes.SELECT});
                    
                    let playerPickCount = playerCount && playerCount.length > 0?playerCount[0]['playerPickCount']:0;
                    let totalTeam = teamCount && teamCount.length > 0?teamCount[0]['teamCount']:0;
                    
                    if(playerPickCount == 0 || totalTeam == 0){
                        playerHistory[i]['selectedBy'] = 0;
                    }else{
                        playerHistory[i]['selectedBy'] = ((playerPickCount*100)/totalTeam).toFixed(2);
                    }  
                }
                return playerHistory;
            }else{
                return playerHistory;
            }
        } catch(error){
            console.log("Error (GetPlayerToWatchMatchHistory) : ",error);
            return false;
        }
    }

    async getPlayerMathcHistory(playerId,matchId){
        try{
            var playerHistory = await models.FantacyCricket.query(
                `SELECT
                    cmsc.fkMatchId,
                    cmsc.point,
                    cmsc.credit,
                    cm.shortTitle,
                    cm.dateStart,
                    cm.teamA,
                    cm.teamB
                FROM 
                    gmsfantacyCricketMatchScoreCard cmsc 
                    left join gmsFantacyCricketMatch cm on cm.matchId=cmsc.fkMatchId and cm.status=`+Constant.FantacyCricket.MatchStatus.complete+`
                WHERE
                    cmsc.fkPlayerId = :playerId AND
                    cmsc.fkMatchId != :matchId
                ORDER BY cm.dateStart DESC LIMIT 5`,
                { replacements: { matchId: matchId, playerId: playerId}, type: sequelize.QueryTypes.SELECT });            
            
            if(playerHistory && playerHistory.length > 0){
                for(let i = 0;i < playerHistory.length; i++){
                    let matchId = playerHistory[i]['fkMatchId'];
                    delete playerHistory[i]['fkMatchId'];
                    try{

                        let teamDetails=await models.FantacyCricket.query(
                            `SELECT
                                tid,abbr,thumbUrl
                            FROM
                                gmsFantacyCricketTeams ct
                            WHERE 
                                ct.tid in (`+playerHistory[i]['teamA']+`,`+playerHistory[i]['teamB']+`)`,
                            { replacements: { matchId: matchId, playerId: playerId}, type: sequelize.QueryTypes.SELECT });

                        if(playerHistory[i]['teamA']==teamDetails[0]['tid']){
                            playerHistory[i]['teamAshortTitle']=teamDetails[0]['abbr'];
                            playerHistory[i]['teamAthumbUrl']=teamDetails[0]['thumbUrl'];

                            playerHistory[i]['teamBshortTitle']=teamDetails[1]['abbr'];
                            playerHistory[i]['teamBthumbUrl']=teamDetails[1]['thumbUrl'];
                        }
                        else{
                            playerHistory[i]['teamAshortTitle']=teamDetails[1]['abbr'];
                            playerHistory[i]['teamAthumbUrl']=teamDetails[1]['thumbUrl'];

                            playerHistory[i]['teamBshortTitle']=teamDetails[0]['abbr'];
                            playerHistory[i]['teamBthumbUrl']=teamDetails[0]['thumbUrl'];
                        }

                        let playerCount = await models.sequelize.query(
                            `SELECT
                                count(1) AS playerPickCount 
                            FROM
                                gmsFantacyCricketUserTeam ut 
                            WHERE 
                                ut.fkMatchId = :matchId AND 
                                ut.fkPlayerId = :playerId`,
                            { replacements: { matchId: matchId, playerId: playerId}, type: sequelize.QueryTypes.SELECT });
                        
                        let teamCount=await models.sequelize.query(
                            `SELECT
                                count(distinct ut.teamCode) AS teamCount 
                            FROM 
                                gmsFantacyCricketUserTeam ut
                            WHERE 
                                ut.fkMatchId = :matchId`,
                            { replacements: { matchId: matchId }, type: sequelize.QueryTypes.SELECT});
                        
                        let playerPickCount = playerCount && playerCount.length > 0?playerCount[0]['playerPickCount']:0;
                        let totalTeam = teamCount && teamCount.length > 0?teamCount[0]['teamCount']:0;
                        
                        if(playerPickCount == 0 || totalTeam == 0){
                            playerHistory[i]['selectedBy'] = 0.00;
                        }else{
                            playerHistory[i]['selectedBy'] = ((playerPickCount*100)/totalTeam).toFixed(2);
                        }  
                    }
                    catch(error){
                        console.log("Error (getPlayerMathcHistory) insie player and team Count ",error);
                        playerHistory[i]['selectedBy'] = 0.00
                    }
                    
                }//End of for loop.
                return playerHistory;
            }else{
                //If no history found then send back as empty array
                return playerHistory;
            }
        } catch(error){
            console.log("Error (getPlayerMathcHistory) : ",error);
            return [];
        }
    }

    async getPointBreakup(playerId,matchId,teamCode){
        try{
            let data = await models.FantacyCricket.query("select * from gmsfantacyCricketMatchScoreCard where fkPlayerId="+playerId+" and fkMatchId="+matchId,{type: sequelize.QueryTypes.SELECT});
            var pointData=data && data.length>0?data[0]:{};
            var multiply=1;
            if(teamCode){
                let checkCaptVC = await models.sequelize.query("select isCaption,isViceCaption from gmsFantacyCricketUserTeam where fkPlayerId="+playerId+" and teamCode="+teamCode,{type: sequelize.QueryTypes.SELECT});
                var isCaption=checkCaptVC[0]['isCaption'];
                var isViceCaption=checkCaptVC[0]['isViceCaption'];
                if(isCaption==1)
                    multiply=2;
                else if(isViceCaption==1)
                    multiply=1.5;
                else
                    multiply=1;
            }
            var PD=[];

            pointData.point=pointData.point!=null?pointData.point*multiply:0;
            
            pointData.starting11P=pointData.starting11P!=null?pointData.starting11P*multiply:0;
            pointData.isPlaying11=pointData.isPlaying11?"Yes":"No";


            pointData.runP=pointData.runP!=null?pointData.runP*multiply:0;
            pointData.fourP=pointData.fourP!=null?pointData.fourP*multiply:0;
            pointData.sixP=pointData.sixP!=null?pointData.sixP*multiply:0;
            pointData.srP=pointData.srP!=null?pointData.srP*multiply:0;
            pointData.fiftyP=pointData.fiftyP!=null?pointData.fiftyP*multiply:0;
            pointData.duckP=pointData.duckP!=null?pointData.duckP*multiply:0;
            pointData.wktsP=pointData.wktsP!=null?pointData.wktsP*multiply:0;
            pointData.maidenoverP=pointData.maidenoverP!=null?pointData.maidenoverP*multiply:0;
            pointData.erP=pointData.erP!=null?pointData.erP*multiply:0;
            pointData.catchP=pointData.catchP!=null?pointData.catchP*multiply:0;
            pointData.runoutStumpingP=pointData.runoutStumpingP!=null?pointData.runoutStumpingP*multiply:0;
            pointData.thirtyP=pointData.thirtyP!=null?pointData.thirtyP*multiply:0;
            pointData.bonusP=pointData.bonusP!=null?pointData.bonusP*multiply:0;


            var event=["Starting11","Runs","4's","6's","SR","50's","30's","Duck","Wickets","Maiden Over","E/R","Catch","Run Out/Stumping","Bonus","Total"]
            for(var i=0;i<event.length;i++){
                var pd:any={};
                if(event[i]=="Starting11"){
                    pd.event=event[i];
                    pd.actuals=pointData.isPlaying11;
                    pd.points=pointData.starting11P;
                }
                if(event[i]=="Runs"){
                    pd.event=event[i];
                    pd.actuals=+pointData.run;
                    pd.points=pointData.runP;
                }
                if(event[i]=="4's"){
                    pd.event=event[i];
                    pd.actuals=+pointData.four;
                    pd.points=pointData.fourP;
                }
                if(event[i]=="6's"){
                    pd.event=event[i];
                    pd.actuals=+pointData.six;
                    pd.points=pointData.sixP;
                }
                if(event[i]=="SR"){
                    pd.event=event[i];
                    pd.actuals=pointData.sr?pointData.sr:0;
                    pd.points=pointData.srP;
                }
                if(event[i]=="50's"){
                    pd.event=event[i];
                    pd.actuals=+pointData.fifty;
                    pd.points=pointData.fiftyP;
                }
                if(event[i]=="30's"){
                    pd.event=event[i];
                    pd.actuals=+pointData.thirty;
                    pd.points=pointData.thirtyP;
                }
                if(event[i]=="Duck"){
                    pd.event=event[i];
                    pd.actuals=pointData.duck==1?"Yes":"No";
                    pd.points=pointData.duckP;
                }
                if(event[i]=="Wickets"){
                    pd.event=event[i];
                    pd.actuals=+pointData.wkts;
                    pd.points=pointData.wktsP;
                }
                if(event[i]=="Maiden Over"){
                    pd.event=event[i];
                    pd.actuals=+pointData.maidenover;
                    pd.points=pointData.maidenoverP;
                }
                if(event[i]=="E/R"){
                    pd.event=event[i];
                    pd.actuals=pointData.er?pointData.er:0;
                    pd.points=pointData.erP;
                }
                if(event[i]=="Catch"){
                    pd.event=event[i];
                    pd.actuals=+pointData.catch;
                    pd.points=pointData.catchP;
                }
                if(event[i]=="Run Out/Stumping"){
                    pd.event=event[i];
                    pd.actuals=+pointData.runoutStumping;
                    pd.points=pointData.runoutStumpingP;
                }
                if(event[i]=="Bonus"){
                    pd.event=event[i];
                    pd.actuals="--";
                    pd.points=pointData.bonusP;
                }
                if(event[i]=="Total"){
                    pd.event=event[i];
                    pd.actuals="--";
                    pd.points=pointData.point;
                }
                PD.push(pd);
            }//End of event loop

            return PD;
        }
        catch(error){
            console.log("Error (getPointBreakup) : ",error);
            return [];
        }
        
    }
    async createMathReminder(insertData){
        try{
            let createReminderData=await models.gmsFantacyCricketMatchReminder.build(insertData).save();
            return true;
        }
        catch(error){
            console.log("Error (createMathReminder) : ",error);
            return false;
        }
    }



    async updateMatchReminder(updateData:any,condition:any){
        try {
            let updateReminder=await models.gmsFantacyCricketMatchReminder.update(updateData,
                {
                    where:condition
                });
            return true;
        } catch (error) {
            console.log("Error (updateMatchReminder) : ",error);
            return false 
        }
    }





    async   isReminderSet(matchId:any,userId:number){
        try {     
            let reminderData= await models.gmsFantacyCricketMatchReminder.findAll(
                {
                    attributes:["playerList"],
                    where:{fkMatchId:matchId},
                    raw:true
                });
            if(reminderData && reminderData.length>0) {
                if((reminderData[0]["playerList"] && JSON.parse(reminderData[0]["playerList"])).indexOf(userId)!=-1)
                    return true;
                else  
                    return  false;
            }
            else
                return false;
        }
        catch(error){
            console.log("Error (isReminderSet) : ",error);
            return false;;
        }
    }
}
export default new CricketMatch();