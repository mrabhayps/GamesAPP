import sequelize from 'sequelize';
import models from '../models/index';
import Constant from '../../common/app.constant';
const Op = models.Sequelize.Op;
export class MatchContest{
    /**
     * Get contest details by match id
     * @param matchId 
     */
    async getContestByMatchId(matchId:number){
        try{
            let data = await models.FantacyCricket.query(
                `SELECT 
                    cc.id,cc.fkMatchId,cc.fkContestConfigId,cc.title,cc.contestType,cc.prizePool,
                    cc.entryFee,cc.firstPrize,cc.prizeUnit,cc.maxUserTeam,cc.minUserTeam,cc.totalUserTeam,
                    cc.totalWinner,cc.isConfirmedLeague,cc.userTeamCount,cc.minWK,cc.maxWK,cc.minBowl,
                    cc.maxBowl,cc.minBat,cc.maxBat,cc.minALR,cc.maxALR,cc.status,cc.fkPDId 
                FROM
                    gmsFantacyCricketContest cc
                WHERE
                    cc.fkMatchId = :matchId
                ORDER BY prizePool DESC`,
                { replacements: { matchId: matchId }, type: sequelize.QueryTypes.SELECT });
            return data;
        }
        catch(error){
            console.log("Error (GetContestByMatchId) : ",error);
            return false;
        }
    }


    //Get user joined contest
    async getUserJoinedContest(userId, matchId){
        try{
            /*let data = await models.gmsFantacyCricketUserTeam.findAll({
                where: {
                    fkUserId: userId,
                    fkMatchId: matchId,
                    fkContestId: {
                        [Op.ne]: null,
                        [Op.ne]: ''
                    } 
                },
                attributes: ['fkContestId'],
                group: ['fkContestId'],
                raw : true
            }).map(el => el.fkContestId);*/
            let retData:any = {};
            let data = await models.sequelize.query(
                `SELECT ut.fkContestId, ut.teamCode, ut.title
                FROM
                    gmsFantacyCricketUserTeam ut
                WHERE
                    ut.fkMatchId = :matchId AND ut.fkUserId= :userId AND ut.fkContestId is not null AND  ut.fkContestId !=''
                GROUP BY ut.fkContestId,ut.teamCode ORDER BY ut.title`,
                { replacements: { matchId: matchId, userId: userId }, type: sequelize.QueryTypes.SELECT });

            const joinedContest = [...new Set(data.map(item => item.fkContestId))];
            retData['joinedContest'] = joinedContest
            retData['joinedContestTeam'] = data;
            return retData;
        }
        catch(error){
            console.log("Error (getUserJoinedContest) : ",error);
            return false;
        }
    }

    /**
     * Get Leader board for contest
     * @param contestId 
     */
    async getContestLeaderBoard(contestId:number, userId:number=null){

        try{ 
            let data = await models.sequelize.query(
                "SELECT "+
                    "users.id AS userId, "+
                    "users.image, "+
                    "ut.title as firstName, "+
                    "ut.teamCode, "+
                    "SUM(ut.point) AS fantacyPoint "+
                    
                "FROM "+
                    "gmsFantacyCricketUserTeam ut "+
                    "INNER JOIN gmsUsers users ON users.id = ut.fkUserId "+
                "WHERE "+
                    "ut.fkContestId = :contestId "+
                " GROUP BY teamCode ORDER BY userId=:userId DESC, fantacyPoint DESC LIMIT 100",
                { replacements: { contestId: contestId , userId: userId }, type: sequelize.QueryTypes.SELECT });
            
                for(let i=0;data && i < data.length; i++){
                    data[i]['rank']=i+1;
                }
            return data;
        }
        catch(error){
            console.log("Error (getContestLeaderBoard) : ", error);
            return false;
        }
    }

    async getMatchAndContestStats(matchId:number, contestId:number=null){
        // The stats is same for contest and match.
        // only difference is selected by in match and conntest.
        // This will result of all player and match live score. 
        
        try{
            let data:any={};
            //Find Score start here.
            try{
                data.score={};

                let score = await models.FantacyCricket.query(
                    `SELECT 
                        t.tid,
                        t.title,
                        t.abbr,
                        teamA,
                        teamAScore,
                        teamAOver,
                        teamB,
                        teamBScore,
                        teamBOver,
                        equation,
                        live,
                        result,
                        status
                    FROM
                        gmsFantacyCricketMatch m
                        LEFT JOIN gmsFantacyCricketTeams t ON t.tid=m.teamA OR t.tid=m.teamB
                    WHERE m.matchId=:matchId`,
                    {replacements: { matchId: matchId }, type: sequelize.QueryTypes.SELECT });
                
                for(let i=0;score && i<score.length;i++)
                {
                    data.score.equation=score[i]['equation'];
                    data.score.live=score[i]['live'];
                    data.score.result=score[i]['result'];
                    data.score.status=score[i]['status'];
                    if(score[i]['tid']==score[i]['teamA']){
                        data.score.teamA={
                            "teamId":score[i]['tid'],
                            "title":score[i]['title'],
                            "teamShortTitle":score[i]['abbr'],
                            "score":score[i]['teamAScore'],
                            "over":score[i]['teamAOver']
                        }
                    }
                    else if(score[i]['tid']==score[i]['teamB']){
                        data.score.teamB={
                            "teamId":score[i]['tid'],
                            "title":score[i]['title'],
                            "teamShortTitle":score[i]['abbr'],
                            "score":score[i]['teamBScore'],
                            "over":score[i]['teamBOver']
                        }
                    }
                }//End of for loop.
            }
            catch(error){
                console.log("Match Id : "+matchId+" Contest Id : "+contestId+" Unable to Find Score.");
            }
            //End of find score.
            //Player stats start here.
            data.players=[];
            try{
                let condData:any = {
                    matchId: matchId
                }
                let contestCond = "";
                if (contestId){
                    contestCond = " AND ut.fkContestId = :contestId ";
                    condData.contestId = contestId;
                }
                let teamCount = await models.sequelize.query(
                    `SELECT
                        count(DISTINCT ut.teamCode) AS teamCount
                    FROM 
                        gmsFantacyCricketUserTeam ut
                    WHERE 
                        ut.fkMatchId = :matchId` + contestCond,
                    { replacements: condData, type: sequelize.QueryTypes.SELECT });    
                condData.teamCount = teamCount[0]['teamCount']==0?1:teamCount[0]['teamCount'];

                var isPlayingCond=""
                if(data.score.status>1){
                    isPlayingCond=" and sc.isPlaying11=1";
                }



                let playerStats = await models.FantacyCricket.query(
                    `SELECT 
                        sc.fkTeamId AS teamId,
                        sc.fkPlayerId as playerId,
                        sc.playerName,
                        sc.role,
                        sc.credit,
                        sc.point,
                        sc.isPlaying11,
                        0 AS selectedBy,
                        IF(sc.point!=0 AND RANK() OVER (ORDER BY point DESC) <= 11, 1, 0) AS dreamTeam
                    FROM 
                        gmsfantacyCricketMatchScoreCard sc
                    WHERE 
                        sc.fkMatchId = :matchId ${isPlayingCond}
                    GROUP BY sc.fkPlayerId`,
                    { replacements: condData, type: sequelize.QueryTypes.SELECT });

                let playerIds= playerStats.map(stats=>stats.playerId);

                let playerSelection = await models.sequelize.query(
                    `SELECT
                        ut.fkPlayerId,
                        (count(ut.id)*100)/:teamCount AS selectedBy
                    FROM 
                        gmsFantacyCricketUserTeam ut 
                    WHERE 
                        ut.fkPlayerId IN (:playerIds) AND ut.fkMatchId=${matchId} ${contestCond} 
                    GROUP BY ut.fkPlayerId
                    ORDER BY FIELD(ut.fkPlayerId, :playerIds)`,
                    { replacements: {playerIds:playerIds, teamCount:condData.teamCount }, type: sequelize.QueryTypes.SELECT });
    

                for(let i=0;i<playerStats.length;i++)
                {   
                    let selectedStats=playerSelection.filter(
                        selecton=> selecton.fkPlayerId==playerStats[i]['playerId']
                    );
                    playerStats[i]['selectedBy'] = selectedStats && selectedStats.length>0?selectedStats[0]['selectedBy']:playerStats[i]['selectedBy'];

                    playerStats[i]['selectedBy']=parseFloat(playerStats[i]['selectedBy']).toFixed(2);
                    if(playerStats[i]['teamId']==data.score.teamA.teamId){
                        playerStats[i]['teamName']=data.score.teamA.title;
                        playerStats[i]['teamShortTitle']=data.score.teamA.teamShortTitle;
                    }
                    else if(playerStats[i]['teamId']==data.score.teamB.teamId){
                        playerStats[i]['teamName']=data.score.teamB.title;
                        playerStats[i]['teamShortTitle']=data.score.teamB.teamShortTitle;
                    }
                }

                data.players=playerStats?playerStats:[];
            }
            catch(error){
                console.log("Match Id : "+matchId+" Contest Id : "+contestId+" Unable to Find Player Stats.");
                console.log(error);
            }
            //Player stats End here.
            return data;
        }catch(error){
            console.log("Error (getMatchAndContestStats) : ", error);
            return false;
        }
    }


    /**
     * Check user is joined in the contest or not?
     * @param userId 
     * @param contestId 
     */
    async isJoinedContest(userId:number, contestId:number){
        try{ 
            let data = await models.sequelize.query(
                `SELECT
                    count(*) cnt
                FROM
                    gmsFantacyCricketUserTeam ut
                WHERE
                    ut.fkUserId = :userId AND
                    ut.fkContestId = :contestId`,
                { replacements: { userId: userId, contestId: contestId }, type: sequelize.QueryTypes.SELECT });
            if(data[0]['cnt']>0)
                return true;
            return false;
        }
        catch(error){
            console.log("Error (IsJoinedContest) : ",error);
            return false;
        }
    }

    /**
     * Contest winning result for user
     * @param userId 
     * @param contestId 
     */
    async getUserContestWinningResult(userId:number, contestId:number){
        try{
            let data = await models.sequelize.query(
                `SELECT
                    sum(actualPrize)
                FROM
                    gmsContestPrizeDistribution 
                WHERE
                    fk_UserId = :userId AND 
                    fk_contestId = :contestId 
                GROUP BY fk_contestId`,
                { replacements: { userId: userId, contestId: contestId }, type: sequelize.QueryTypes.SELECT });
            if(data && data.length > 0){
                return data[0]['prize'] > 0?"AMOUNT WON " + data[0]['prize'] + " Rs.":"BETTER LUCK, TRY AGAIN";
            }else{
                return "BETTER LUCK, TRY AGAIN."
            }
        }   
        catch(error){
            console.log("Error (GetUserContestWinningResult) : ", error)
            return false;
        }
    }

    /**
     * Team list for user matches
     * @param userId 
     * @param matchId 
     */
    async getUserMatchTeamList(userId:number, matchId:number){
        try{
            /*let data = await models.sequelize.query(
                `SELECT 
                    cut.teamCode,
                    cut.title,
                    cut.fkMatchId,
                    cut.fkContestId,
                    cut.status AS teamStatus,
                    cm.status AS matchStatus,
                    sum(point) AS point,
                    cm.teamA,
                    cm.teamB,
                    GROUP_CONCAT(IFNULL(fkPlayerId,'NULL')) AS playerId,
                    GROUP_CONCAT(pl.title) AS playerName,
                    GROUP_CONCAT(IFNULL(cut.role,'NULL')) AS role,
                    GROUP_CONCAT(IFNULL(cut.isCaption,'NULL')) AS isCaption,
                    GROUP_CONCAT(IFNULL(cut.isViceCaption,'NULL')) AS isViceCaption,
                    GROUP_CONCAT(IFNULL(cut.fkTeamId,'NULL')) AS teamId,
                    GROUP_CONCAT(IFNULL(crta.title,'NULL')) AS teamName,
                    GROUP_CONCAT(IFNULL(crta.abbr,'NULL')) AS teamShortName,
                    GROUP_CONCAT(IFNULL(crta.country,'NULL')) AS teamCountry 
                FROM 
                    gmsFantacyCricketUserTeam cut, 
                    gmsFantacyCricketMatch cm,
                    gmsFantacyCricketTeams crta,
                    gmsFantacyCricketPlayer pl 
                WHERE 
                    cut.fkUserId = :userId AND 
                    cut.fkMatchId = :matchId AND 
                    cm.matchId = cut.fkMatchId AND 
                    crta.tid = cut.fkTeamId AND 
                    pl.pid = cut.fkPlayerId AND 
                    cut.refTeamCode IS NULL 
                GROUP BY cut.teamCode`,
                { replacements: { userId: userId, matchId: matchId }, type: sequelize.QueryTypes.SELECT});*/

            let data = await models.sequelize.query(
                `SELECT 
                    cut.teamCode,
                    cut.title,
                    cut.fkMatchId,
                    cut.fkContestId,
                    cut.status AS teamStatus,
                    sum(cut.point) AS point,
                    GROUP_CONCAT(IFNULL(cut.fkPlayerId,'NULL')) AS playerId,
                    GROUP_CONCAT(IFNULL(cut.role,'NULL')) AS role,
                    GROUP_CONCAT(IFNULL(cut.isCaption,'NULL')) AS isCaption,
                    GROUP_CONCAT(IFNULL(cut.isViceCaption,'NULL')) AS isViceCaption,
                    GROUP_CONCAT(IFNULL(cut.fkTeamId,'NULL')) AS teamId
                FROM 
                    gmsFantacyCricketUserTeam cut
                WHERE 
                    cut.fkUserId = :userId AND 
                    cut.fkMatchId = :matchId AND 
                    cut.refTeamCode IS NULL 
                GROUP BY cut.teamCode`,
                { replacements: { userId: userId, matchId: matchId }, type: sequelize.QueryTypes.SELECT});

            return data;
        }catch(error){
            console.log("Error (GetUserMatchTeamList) : ", error);
            return false;
        }
    }

    /**
     * Team list for user contest
     * @param userId 
     * @param matchId 
     * @param contestId 
     */
    async getUserContestTeamList(userId:number, matchId:number, contestId:number){
        try{
            let data = await models.sequelize.query(
                `SELECT
                    ct.teamCode,
                    ct.title,
                    ct.fkMatchId,
                    ct.fkContestId,
                    ct.status as teamStatus,
                    cm.status as matchStatus,
                    sum(point) as point,
                    cm.teamA,
                    cm.teamB,
                    group_concat(ifnull(fkPlayerId,'NULL')) as playerId,
                    group_concat(pl.title) as playerName,
                    group_concat(ifnull(ct.role,'NULL')) as designations,
                    group_concat(ifnull(ct.isCaption,'NULL')) as isCaption,
                    group_concat(ifnull(ct.isViceCaption,'NULL')) as isViceCaption,
                    group_concat(ifnull(ct.fkTeamId,'NULL')) as teamId,
                    group_concat(ifnull(crta.title,'NULL')) as teamName,
                    group_concat(ifnull(crta.country,'NULL')) as teamCountry 
                FROM 
                    gmsFantacyCricketUserTeam ct ,
                    gmsFantacyCricketMatch cm,
                    gmsFantacyCricketTeams crta,
                    gmsFantacyCricketPlayer pl 
                WHERE 
                    ct.fkUserId = 12 AND 
                    ct.fkMatchId = 123 AND 
                    ct.fkContestId = 132 AND 
                    cm.matchId=ct.fkMatchId AND 
                    crta.tid=ct.fkTeamId AND 
                    pl.pid=ct.fkPlayerId 
                GROUP BY ct.teamCode`,
                { replacements: { userId: userId, matchId: matchId, contestId: contestId }, type: sequelize.QueryTypes.SELECT });
            return data;
        }catch(error){
            console.log("Error (GetUserContestTeamList) : ", error);
            return false;
        }
    }

    /**
     * Team preview for user match contest
     * @param userId 
     * @param teamCode 
     */
    async getUserMatchContestTeamPreview(teamCode:string,matchId:number){
        try{

            var totalTeam= await models.sequelize.query(
                `SELECT count(distinct teamcode) as cnt  
                FROM
                    gmsFantacyCricketUserTeam ut
                WHERE
                    ut.fkMatchId = :matchId
                GROUP BY ut.fkMatchId`,
                { replacements: { matchId: matchId }, type: sequelize.QueryTypes.SELECT });
            
            totalTeam=totalTeam?totalTeam[0]['cnt']:1;

            /*let data = await models.sequelize.query(
                `SELECT 
                ut.fkPlayerId, 
                cmsc.playerName,
                LOWER(ut.role) as role,
                ut.point,
                cmsc.credit,
                ut.isCaption,
                ut.isViceCaption,
                team.title AS teamName,
                team.abbr AS teamShortName,
                (select count(fkPlayerId)*100/`+totalTeam+` from gmsFantacyCricketUserTeam ut1 where ut1.fkPlayerId=ut.fkPlayerId and ut1.fkMatchId=`+matchId+`) as selectedBy
            FROM
                gmsFantacyCricketUserTeam ut
                LEFT JOIN gmsfantacyCricketMatchScoreCard cmsc ON cmsc.fkMatchId = ut.fkMatchId and cmsc.fkPlayerId=ut.fkplayerId 
                LEFT JOIN gmsFantacyCricketTeams team ON team.tid = ut.fkTeamId
            WHERE
                ut.teamCode = :teamCode
            GROUP BY ut.fkPlayerId`,
            { replacements: { teamCode: teamCode }, type: sequelize.QueryTypes.SELECT });*/

            let data = await models.sequelize.query(
                `SELECT 
                ut.fkPlayerId, 
                LOWER(ut.role) as role,
                ut.point,
                ut.isCaption,
                ut.isViceCaption,
                (select count(fkPlayerId)*100/${totalTeam} 
                    from gmsFantacyCricketUserTeam ut1 
                    where ut1.fkPlayerId=ut.fkPlayerId and ut1.fkMatchId=${matchId}) as selectedBy,
                ut.fkTeamId
            FROM
                gmsFantacyCricketUserTeam ut
            WHERE
                ut.teamCode = :teamCode
            GROUP BY ut.fkPlayerId`,
            { replacements: { teamCode: teamCode }, type: sequelize.QueryTypes.SELECT });

            let playerIds=data.map(player=>player.fkPlayerId);
            let teamIDs=data.map(player=>player.fkTeamId);

            let playerData = await models.FantacyCricket.query(
                `SELECT 
                cmsc.fkPlayerId,
                cmsc.playerName,
                cmsc.credit
            FROM
                gmsfantacyCricketMatchScoreCard cmsc 
            WHERE
                cmsc.fkMatchId = ${matchId} and cmsc.fkPlayerId in (${playerIds})
            GROUP BY cmsc.fkPlayerId`,
            { type: sequelize.QueryTypes.SELECT });

            let teamData = await models.FantacyCricket.query(
                `SELECT
                team.tid ,
                team.title AS teamName,
                team.abbr AS teamShortName
            FROM
                gmsFantacyCricketTeams team 
            WHERE
                team.tid in (${teamIDs})`,
            { type: sequelize.QueryTypes.SELECT });

            for(let i=0; data && i < data.length ; i++){
                let selectedPlayer=playerData.filter(
                    player=> player.fkPlayerId==data[i]['fkPlayerId']
                );
                let selectedTeam=teamData.filter(
                    team=> team.tid==data[i]['fkTeamId']
                );

                data[i]['playerName'] = selectedPlayer && selectedPlayer.length>0?selectedPlayer[0]['playerName']:"--";
                data[i]['credit'] = selectedPlayer && selectedPlayer.length>0?selectedPlayer[0]['credit']:0;

                data[i]['teamName'] = selectedTeam && selectedTeam.length>0?selectedTeam[0]['teamName']:"--";
                data[i]['teamShortName'] = selectedTeam && selectedTeam.length>0?selectedTeam[0]['teamShortName']:"--";
                
            }
            

            return data;
        }catch(error){
            console.log("Error (GetUserMatchContestTeamPreview) : ", error);
            return false;
        }
    }

    /**
     * User joins contest
     * @param userId 
     * @param contestId 
     * @param teamCode 
     */
    async joinContest(userId:number, contestId:number, teamCode:string){

        try{
            let data = await models.sequelize.query(
                `UPDATE
                gmsFantacyCricketUserTeam 
                SET fkContestId = :contestId
                WHERE 
                    teamCode = :teamCode AND
                    fkUserId = :userId `,
                { replacements: { contestId: contestId, teamCode: teamCode, userId:userId }, type:sequelize.QueryTypes.UPDATE });
            return data;
        }catch(error){
            console.log("Error (JoinContest) : ", error);
            return false;
        }
        
    }

    /**
     * User joins in multiple contests
     * @param userId 
     * @param contestId 
     * @param teamCode 
     */
    async joinMultipleContest(userId:number, contestId:number, teamCode:string,refTeamCode:string){
        try{
            let team=await models.sequelize.query(
                `SELECT 
                    * 
                FROM 
                    gmsFantacyCricketUserTeam
                WHERE 
                    teamCode = :teamCode`,
                { replacements: { teamCode: refTeamCode }, type:sequelize.QueryTypes.SELECT });
            for(let i = 0; i < team.length; i++){
                delete team[i]['id'];
                team[i]['teamCode'] = teamCode;
                team[i]['refTeamCode'] = refTeamCode;
                team[i]['fkContestId'] = contestId; 
            }
            const insert = await models.gmsFantacyCricketUserTeam.bulkCreate(team);
            return true;
        }catch(error){
            console.log("Error (JoinMultipleContest) : ", error);
            return false;
        }
        
    }

    /**
     * Get player selected by User
     * @param playerId 
     * @param matchId 
     * @param contestId 
     */
    async getPlayerSelectedByUser(playerId:number, matchId:number, contestId:number){
        try{ 
            let condition1 = "";
            let condition2 = "";
            let condData:any = {
                "playerId": playerId
            }
            if(matchId != null){
                condition1 = "ctm.fkMatchId = :matchId"
                condition2 = "totalTeams.fkMatchId = :matchId";
                condData.matchId = matchId;
            }
            if(contestId != null){
                condition1 = "ctm.fkContestId = :contestId";
                condition2 = "totalTeams.fkContestId = :contestId";
                condData.contestId = contestId;
            }
            let playerCountInMatchContestTeam = await models.sequelize.query(
                `SELECT 
                    count(*) AS playerCountInMatchContestTeam 
                FROM 
                    gmsFantacyCricketUserTeam ctm 
                WHERE 
                    ctm.fkPlayerId = :playerId AND 
                    ctm.fkMatchId = 44055`,
                { replacements: condData, type: sequelize.QueryTypes.SELECT });
            
            let usersTeamCountInMatch = await models.sequelize.query(
                `SELECT 
                    count(*) AS usersTeamCountInMatch 
                FROM 
                    (SELECT 
                        fkMatchId, fkContestId 
                    FROM 
                        gmsFantacyCricketUserTeam ctu
                    GROUP BY ctu.teamCode) AS totalTeams 
                    WHERE ` + condition2,
                { replacements: condData, type: sequelize.QueryTypes.SELECT });

            let totalPlayerSelection = playerCountInMatchContestTeam && playerCountInMatchContestTeam.length > 0?playerCountInMatchContestTeam[0]['playerCountInMatchContestTeam']:0;
            let totalTeamCreation = usersTeamCountInMatch && usersTeamCountInMatch.length > 0?usersTeamCountInMatch[0]['usersTeamCountInMatch']:0;

            if(totalPlayerSelection == 0 || totalTeamCreation == 0){
                return 0;
            }else{
                return ((totalPlayerSelection*100)/totalTeamCreation).toFixed(2);
            }  
        }catch(error){
            console.log("Error (GetPlayerSelectedByUser) : ", error);
            return false;
        }
    }

    /**
     * Get user contest team Fantasy point
     * @param userId 
     * @param contestId 
     */
     async getPlayerData(playerIDs){
        try{
            let playerData = await models.FantacyCricket.query(
                `SELECT 
                    pid,
                    title as playerName
                FROM 
                    gmsFantacyCricketPlayer cp 
                WHERE 
                    cp.pid in (${playerIDs})`,
                { type: sequelize.QueryTypes.SELECT });

            return playerData;
        }
        catch(error){
            console.log("Error in (getPlayerData) : ");
            console.log(error);
        }
     }

     async getTeamData(teamIDs){
        try{
            let teamData = await models.FantacyCricket.query(
                `SELECT 
                    tid,
                    title as teamName,
                    abbr as teamShortName,
                    country
                FROM 
                gmsFantacyCricketTeams team 
                WHERE 
                    team.tid in (${teamIDs})
                GROUP BY tid`,
                { type: sequelize.QueryTypes.SELECT });

            return teamData;
        }
        catch(error){
            console.log("Error in (getTeamData) : ");
            console.log(error);
        }
     }

    async getMatchData(matchIDs){
        try{
            let matchData = await models.FantacyCricket.query(
                `SELECT 
                    m.*
                FROM 
                    gmsFantacyCricketMatch m 
                WHERE 
                    m.matchId in (${matchIDs})
                GROUP BY matchId`,
                { type: sequelize.QueryTypes.SELECT });

            return matchData;
        }
        catch(error){
            console.log("Error in (getTeamData) : ");
            console.log(error);
        }
     }


    async getUserContestTeamFantacyPoint(userId:number, contestId:number){
        try{
            /*let data = await models.sequelize.query(
                `SELECT 
                    ct.title,
                    ct.teamCode,
                    ct.fkMatchId,
                    sum(ct.point) AS totalPoint,
                    group_concat(ifnull(ct.fkPlayerId,'NULL')) AS playerId,
                    group_concat(ifnull(cp.title,'NULL')) AS playerName,
                    group_concat(ifnull(ct.isCaption,'NULL')) AS isCaption,
                    group_concat(ifnull(ct.isViceCaption,'NULL')) AS isViceCaption,
                    group_concat(ifnull(ctm.title,'NULL')) AS teamName,
                    group_concat(ifnull(ctm.abbr,'NULL')) AS teamShortName,
                    group_concat(ifnull(ct.role,'NULL')) AS designation,
                    group_concat(ifnull(ct.point,'NULL')) AS fantacyPoint 
                FROM 
                    gmsFantacyCricketUserTeam ct 
                    LEFT JOIN gmsFantacyCricketTeams ctm ON ctm.tid = ct.fkTeamId 
                    LEFT JOIN gmsFantacyCricketPlayer cp ON cp.pid = ct.fkPlayerId 
                WHERE 
                    fkContestId = :contestId AND 
                    fkUserId = :userId
                GROUP BY teamCode ORDER BY totalPoint DESC`,
                { replacements: { contestId: contestId, userId: userId }, type: sequelize.QueryTypes.SELECT });*/

            let data = await models.sequelize.query(
                `SELECT 
                    ct.title,
                    ct.teamCode,
                    ct.fkMatchId,
                    sum(ct.point) AS totalPoint,
                    group_concat(ifnull(ct.fkPlayerId,'NULL')) AS playerId,
                    group_concat(ifnull(ct.isCaption,'NULL')) AS isCaption,
                    group_concat(ifnull(ct.isViceCaption,'NULL')) AS isViceCaption,
                    group_concat(ifnull(ct.role,'NULL')) AS designation,
                    group_concat(ifnull(ct.point,'NULL')) AS fantacyPoint ,
                    group_concat(ifnull(ct.fkTeamId,'NULL')) AS fkTeamId 
                FROM 
                    gmsFantacyCricketUserTeam ct 
                WHERE 
                    ct.fkContestId = :contestId AND 
                    ct.fkUserId = :userId
                GROUP BY teamCode ORDER BY totalPoint DESC`,
                { replacements: { contestId: contestId, userId: userId }, type: sequelize.QueryTypes.SELECT });

            return data;
        }catch(error){
            console.log("Error (GetUserContestTeamFantacyPoint) : ", error);
            return false;
        }
    }

    /**
     * Get total Participent
     * @param contestId 
     * @param userId 
     */
    async getTotalParticipent(contestId:number, userId:number=null){
        try{
            let cond = userId?" AND fkUserId=" + userId:"";
            let condData:any = {
                'contestId': contestId
            }
            if (userId){
                condData.userId = userId;
            }
            let data = await models.sequelize.query(
                `SELECT
                    count(DISTINCT teamCode) AS cnt 
                FROM 
                    gmsFantacyCricketUserTeam 
                WHERE 
                    fkContestId = :contestId` +  cond,
                { replacements: condData, type: sequelize.QueryTypes.SELECT});
            // let data = await models.sequelize.query("select count(distinct teamCode) as cnt from gmsFantacyCricketUserTeam where fk_contestId="+contestId+cond
            // ,{ type: sequelize.QueryTypes.SELECT});
            return data[0]['cnt'];           
        }
        catch(error){
            console.log("Error (GetTotalParticipent) : ",error);
            return false;
        }
    }

    /**
     * Remove player from team
     * @param teamCode 
     * @param CurrentPlayer 
     */
    async removePlayerFromTeam(teamCode:string, CurrentPlayer){
        try{
            let existingPlayer=await models.sequelize.query(
                `SELECT
                    fkPlayerId 
                FROM 
                    gmsFantacyCricketUserTeam
                WHERE 
                    teamCode = :teamCode`,
                { replacements: { teamCode: teamCode }, type: sequelize.QueryTypes.SELECT });
            for(let i = 0; i < existingPlayer.length; i++){
                //check if existing player is in current player
                //if not delete the player from the team.
                let playerId = existingPlayer[i]['fkPlayerId'];
                let found = CurrentPlayer.some(el => el.playerId == playerId);
                if(!found){
                    await models.sequelize.query(
                        `DELETE FROM 
                        gmsFantacyCricketUserTeam
                        WHERE 
                            (teamCode = :teamCode OR refTeamCode = :teamCode) AND 
                            fkPlayerId = :playerId`,
                        { replacements: { teamCode: teamCode, playerId: playerId }, type: sequelize.QueryTypes.DELETE }); 
                }
            }    
        }
        catch(error){
            console.log("Error (RemovePlayerFromTeam) : ", error);
            return false;
        }
    }

    async updateConttesttotalUserTeam(contestId,count){
        let teamcode = await models.FantacyCricket.query(
            `UPDATE 
                gmsFantacyCricketContest
                set totalUserTeam=:totalUserTeam
            WHERE 
                id =:contestId
            limit 1`,
            { replacements: { totalUserTeam: count, contestId:contestId}, type: sequelize.QueryTypes.UPDATE });
        
    }

    /**
     * Get Team code by reference team code
     * @param teamCode 
     */
    async getTeamCodeByRefTeamcode(teamCode:string){
        try{
            let teamcode = await models.sequelize.query(
                `SELECT
                    teamCode,
                    fkContestId 
                FROM 
                    gmsFantacyCricketUserTeam
                WHERE 
                    refTeamCode = :teamCode
                GROUP BY teamCode`,
                { replacements: { teamCode: teamCode }, type: sequelize.QueryTypes.SELECT });
            return teamcode;
        }   
        catch(error){
            console.log("Error (GetTeamCodeByRefTeamcode) : ", error)
            return false;
        }
    }

    /**
     * Get Joined team list in contest
     * @param contestId 
     */
    async getUserJoinedTeamInContest(userId:string,contestId:number){
        try{
            /*let data = await models.gmsFantacyCricketUserTeam.findAll({
                where: {
                    fkContestId: contestId,
                    fkUserId:userId,
                    refTeamCode:{
                        [Op.or]:[null,'']
                    }
                },
                attributes: ['teamCode'],
                group: ['teamCode'],
                raw : true
            }).map(el => el.teamCode);*/

            let data = await models.sequelize.query(
                `SELECT
                    DISTINCT (CASE WHEN refTeamCode is null OR refTeamCode='' then teamCode else refTeamCode END ) as teamCode
                FROM 
                gmsFantacyCricketUserTeam
                WHERE 
                    fkContestId = `+contestId+` AND 
                    fkUserId = `+userId 
                , {type: sequelize.QueryTypes.SELECT});
            
            data=await data.map(el => el.teamCode);
            return data;
        }
        catch(error){
            console.log("Error (getJoinedTeamInContest) : ",error);
            return false;
        }
    }

    async getPrizeDistributionAmount(type,userId,contestId){
        try{
            let data = await models.sequelize.query(
                `SELECT
                    sum(actualPrize) AS amt 
                FROM 
                    gmsContestPrizeDistribution
                WHERE 
                    fk_UserId = `+userId+` AND 
                    fk_contestId = `+contestId+` AND 
                    status=`+type
                , {type: sequelize.QueryTypes.SELECT});
                
            if(type==1){
                let amount=data && data.length>0 && data[0]['amt']?data[0]['amt']:false;
                return amount;
            }
            else if(type==3){
                let amount=data && data.length>0 && data[0]['amt']?data[0]['amt']:false;
                return amount;
            }
            else{
                return "";
            }   
        }
        catch(error){
            console.log("Error (getPrizeDistributionAmount) : ",error);
            return false;
        }
    }

    async getCaptainAndVCaptainFlag(players){
        var captain=0,vCaptain=0,flag=true;
        for(var i=0;players && i<players.length;i++){
            if(players[i]['isCaption']==1)
                captain++;
            
            if(players[i]['isViceCaption']==1)
                vCaptain++;

            if(captain>1 || vCaptain>1)
            {
                flag=false;
                break;
            }
        }//End of loop.
        return flag;
    }
    async joinedContestByTeamCode(contestId,teamCode){
        try{
            let data = await models.sequelize.query(
                `SELECT
                    count(id) as cnt
                FROM 
                    gmsFantacyCricketUserTeam
                WHERE 
                    fkContestId = `+contestId+` AND 
                    (teamCode = '`+teamCode+`' OR 
                    refTeamCode='`+teamCode+`')`
                , {type: sequelize.QueryTypes.SELECT});

            return data && data[0]['cnt']>0?false:true;
        }
        catch(error){
            console.log("Error - (isJoinedContestByTeamCode) : ",error);
            return false;
        }
    }

    async contestPrizeBreakupLive(entryFee:number,contestType:number,joinedUser:number,PDId:number){
        try{
            let PDData = await models.sequelize.query(`SELECT * FROM gmsPrizeDistributionConfig
                                WHERE groupId=${PDId}`,
                                {type: sequelize.QueryTypes.SELECT});

            let preparedData:any=[];
            let retData={
                "rankDescription" : null,
                "prizeDescription" : null
            }

            if(PDData && PDData.length>0){
                let totalAmount=entryFee * joinedUser;
                let randomPriceData : any =[];
                for(let i=0; i<PDData.length; i++){
                    let rankFrom=0;
                    let rankTill=0;
                    let prizeDescription=0;
                    
                    if(contestType==4){
                        //Every body wins calculation.
                        if(PDData[i]['rankTill']<=joinedUser){
                            rankFrom=PDData[i]['rankFrom'];
                            rankTill=PDData[i]['rankTill'];
                        }
                        else{
                            if(PDData[i]['rankFrom'] < joinedUser){
                                rankFrom=PDData[i]['rankFrom'];
                                rankTill=joinedUser;
                            }
                            else{
                                continue;
                            }
                        }
                        prizeDescription=PDData[i]['individualAmount'];
                    }
                    else{
                        if(PDData[i]['classInterval']  == 1){
                            rankFrom = 1;
                        }else{
                            rankFrom = randomPriceData[randomPriceData.length-1]['rankTill'] + 1;
                        }

                        if(PDData[i]['totalWinnerPercentage'] < 0){
                            rankTill = rankFrom;
                        }else{
                            rankTill = Math.floor((joinedUser * PDData[i]['totalWinnerPercentage'] / 100) + rankFrom - 1);
                        }



                        let totalNumberOfWinner = rankTill - rankFrom + 1;
                        let totalPriceAmount = totalAmount * PDData[i]['totalAmountPercentage']/100;
                        
                        
                        randomPriceData.push ({

                            'rankFrom' : rankFrom,
                            'rankTill' : rankTill,
                        });

                        //  prizeDescription must be greater then 0.
                        prizeDescription = Math.round(totalPriceAmount/ (rankTill - rankFrom + 1));
                    }

                    preparedData.push({
                        "rankDescription":{
                            "startRank":rankFrom,
                            "endRank":rankTill
                        },
                        "prizeDescription":prizeDescription
                    })
                }//end of for loop prepared Data.

                let rankData="";
                let prizeData=""
                for(let i=0;i<preparedData.length;i++){
                    

                    if(preparedData[i]['rankDescription']['startRank']==preparedData[i]['rankDescription']['endRank']){
                        rankData=rankData + "Rank " + preparedData[i]['rankDescription']['startRank'] + "{{}}"
                    }
                    else{
                        rankData=rankData + "Rank " + preparedData[i]['rankDescription']['startRank'] + " To " + preparedData[i]['rankDescription']['endRank'] + "{{}}"
                    }
                    prizeData = prizeData + " ₹ " + preparedData[i]['prizeDescription'] + "{{}}";
                }

                retData={
                    "rankDescription" : rankData.substring(0,rankData.length-4),
                    "prizeDescription" : prizeData.substring(0,prizeData.length-4)
                }

                return retData;

            }
            else{
                console.log("Invalid Prize distribution id");
                return false;
            }
        }
        catch(error){
            console.log("Error - (contestPrizeBreakupLive) : ",error);
            return false;
        }
    }
}
export default new MatchContest();