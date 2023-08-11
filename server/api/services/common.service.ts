import sequelize from 'sequelize';
import models from '../models/index';
import CricketMatch from './cricketMatch.service'
import Games from './games.service'
import helper from '../../common/helper';
import Constant from '../../common/app.constant';
//import { CacheService } from '../cache/cache.service';
import { use } from 'chai';
import request from 'request-promise';
import Utility from '../../common/utility.service';
import QueryManager from '../../common/neo4j/queryManager';
import Notifications from '../notifications/notification.service';
import GlobalData from '../../GlobalData';

import * as secretConfig  from '../../common/secret.config.json';
const config:any = secretConfig;
const Op = models.Sequelize.Op;

export class Common{
    async getHomeCards(page:number,goopl:any){
        try{
            /*let limit = 10;
            let offset = (page - 1) * limit;
            let home_cache_key = "HOME_PAGE:" + page;
            let cards = await CacheService.getCache(home_cache_key);*/

            let cards=global.HOME_PAGE_CARD;
            
            if(!cards || cards.length == 0 || !goopl){
                
                cards = await models.gmsHomeCards.findAll({
                    attributes: ["id", "title", "subTitle", "cardType", "position", "preloaded", "jsonRequest"],
                    where: { status: 1 }, 
                    order: [["position", "ASC"]],
                    offset: 0, 
                    limit: 10,
                    raw:true
                });
                if(cards.length > 0){
                    //CacheService.setCache(home_cache_key, cards);
                    global.HOME_PAGE_CARD=cards;
                }    
            }
            if(goopl){
                console.log("If block");
                let showCards=config['SHOW_HOME_CARD'];
                let hideCards=config['HIDE_HOME_CARD'];
            
                for(let x=0; x< showCards.length;x++){
                    let isAvailable=cards.findIndex(card=>card['cardType']==showCards[x]);
                    if(isAvailable < 0){
                        
                        let addCard = await models.gmsHomeCards.findAll({
                            attributes: ["id", "title", "subTitle", "cardType", "position", "preloaded", "jsonRequest"],
                            where: {
                                 cardType: showCards[x]
                                }, 
                            raw:true
                        });
                        addCard && addCard.length > 0 ? cards.push( addCard[0]): false;
                    }
                }
                
                for(let x=0; x< hideCards.length;x++){
                    let hideCardIndex=cards.findIndex(card=>card['cardType']==hideCards[x]);
                    if(hideCardIndex >= 0){
                        cards.splice(hideCardIndex,1);
                    }
                }  
                
                cards.sort((c1, c2) => 
                    (c1.position < c2.position) ? -1 : (c1.position > c2.position) ? 1 : 0); 
            }
            return cards;
        }catch(error){
            console.error("Error - getHomeCards: ", error);
            return false;
        }
    }

    async prepareHomeData(userId:number,goopl:any , page:number=1){
        let data:any = {};
        try{
            data.title = 'Play & Win';
            let cards = await this.getHomeCards(page,goopl);
            if(cards && cards.length > 0){
                for(let i = 0; i < cards.length; i++){
                    if(cards[i].preloaded == true){
                        if(cards[i].cardType == 'GAME'){
                            // Popular Gamaes
                            cards[i].details = await Games.getPopularGames();   
                        }else if(cards[i].cardType == 'FANTASY'){
                             // Fantasy Cricket 
                            cards[i].matches = await CricketMatch.getUpComingMatchesList(userId, Constant.FantacyCricket.MatchStatus.schedule);
                        }else if(cards[i].cardType == 'RP'){
                            // Recently Played Games
                            cards[i].details = await Games.getRecentlyPlayedGames(userId);
                        }else if(cards[i].cardType == 'STREAKS'){
                            cards[i].streaks = await this.getUserStreaksData(userId);
                        }else{
                            let cardItems = await helper.getColsValueByOrder(
                                "gmsHomeCardItems",
                                ["id", "title", "subTitle", "image", "video", "jsonRequest"],
                                {"cardId": cards[i].id, "status": 1},
                                [["displayOrder", "ASC"]]
                            );
                            if(cardItems && cardItems.length > 0){
                                cards[i].details = cardItems;
                            }
                        }
                    }
                } 
            }
            data.cards = cards;
        }catch(error){
            console.error("Error - prepareHomeData", error);
        }
        return data;
    }

    async getUserStreaksData(userId:number){
        try{
            const cacheStreaksKey = "USER_STREAKS:" + userId;
            //let userStreaksList = await CacheService.getCache(cacheStreaksKey);
            let userStreaksList = null;
            if(!userStreaksList || Object.keys(userStreaksList).length === 0){
                const options = {
                    uri: config.streaks.APIs.STREAKS_LIST_API,
                    method: "POST",
                    body: {userId: userId},
                    json: true,
                    headers: {
                        'x-auth-key': process.env.STREAKS_AUTH_KEY,
                    },
                };
                const data = await request(options);
                let jsonData = null;
                if (typeof(data) == "object") {
                    jsonData = data;
                } else {
                    jsonData = JSON.parse(data);
                }
                if (jsonData && !jsonData.meta.error) {
                    userStreaksList =  jsonData.data;
                }
                if(userStreaksList){
                    //CacheService.setCache(cacheStreaksKey, userStreaksList);
                }
            }
            return userStreaksList;
        }catch(error){
            console.error("Error - getUserStreaksData: ", error);
            return null;
        }
    }

    async getAppHistory(){
        try{
            //let history = await CacheService.getCache("GAMES_APP_HISTORY");
            let history = global.GAMES_APP_HISTORY;
            if(!history || history.length == 0){
                history = await models.gmsAppHistory.findAll({
                    attributes: ["fk_GameId","name","version","isForceUpdate","url", "type"],
                    where: { 
                        type: {[Op.in]: [1 ,2]}, 
                        status: 1
                    }, 
                    order: [["type", "ASC"]],
                    raw:true
                });
                if(history.length > 0){
                    //CacheService.setCache("GAMES_APP_HISTORY", history);
                    global.GAMES_APP_HISTORY=history;
                }
            }
            return history;
        }catch(error){
            console.error("Error - getAppHistory: ", error);
            return null;
        }
    }

    /**
     * Sync contacts
     * @param contactList 
     */
    async contactSyncPost(contactList){
        try{
            const insert=await models.gmsUsrContactList.bulkCreate(contactList);
            return insert;
        }
        catch(error){
            console.log("Error (ContactSyncPost) : ",error);
            return false;
        }
    }

    /**
     * Get Already Synced contacts
     * @param mobileNumber 
     */
    async getSyncedContacts(mobileNumber) {
        let countSyncedContacts = 0;
        try {
            countSyncedContacts = await models.gmsUsrContactList.count({
                where: {userMobile: mobileNumber} 
            });
        } catch(error) {
            console.log("Error (getSyncedContacts) : ", error);
        }
        return countSyncedContacts;
    }

    /**
     * Register Device token to send notifications
     * @param  
     */
    async registerDeviceToken(userId:number, deviceToken:any){
        try{
            let condition = {
                fkUserId: userId
            }
            await models.gmsDeviceToken
            .findOne({ where: condition })
            .then(async function(obj) {
                if(obj)
                {
                    // update
                    obj.update(deviceToken);
                }
                else{
                    //insert
                    deviceToken.fkUserId = userId;
                    await models.gmsDeviceToken.create(deviceToken);
                }
            });
        }
        catch(error){
            console.log("Error - registerDeviceToken: ", error);
            throw new Error("We aren't able to register device token");
        }
    }

    /**
     * De Register Device token to send notifications
     * @param  
     */
    async deRegisterDeviceToken(userId:number){
        try{
            await models.gmsDeviceToken.destroy({
                where: {
                   fkUserId: userId 
                }
             });
        }
        catch(error){
            console.log("Error - deRegisterDeviceToken: ", error);
            throw new Error("We aren't able to de-register device token");
        }
    }


    /**
     * Generate Player squad response
     * @param matchPlayerSquad 
     */
    async buildPlayerSquadResponse(matchPlayerSquad){
        let playerSquad:any = {};
        playerSquad.cid = matchPlayerSquad[0]['cid'];
        playerSquad.matchId = matchPlayerSquad[0]['matchId'];
        playerSquad.minWK = matchPlayerSquad[0]['minWK'];
        playerSquad.maxWK = matchPlayerSquad[0]['maxWK'];
        playerSquad.minBOWL = matchPlayerSquad[0]['minBOWL'];
        playerSquad.maxBOWL = matchPlayerSquad[0]['maxBOWL'];
        playerSquad.minBAT = matchPlayerSquad[0]['minBAT'];
        playerSquad.maxBAT = matchPlayerSquad[0]['maxBAT'];
        playerSquad.minALL = matchPlayerSquad[0]['minALL'];
        playerSquad.maxALL = matchPlayerSquad[0]['maxALL'];

        playerSquad.players = [];
        
        let playerId = matchPlayerSquad[0]['playerId'].split(',');
        let playerName = matchPlayerSquad[0]['playerName'].split(',');
        let point = matchPlayerSquad[0]['point'].split(',');
        let credit = matchPlayerSquad[0]['credit'].split(',');
        let role = matchPlayerSquad[0]['role'].split(',');
        let isPlaying11 = matchPlayerSquad[0]['isPlaying11'].split(',');
        let team = matchPlayerSquad[0]['team'].split(',');
        let teamId = matchPlayerSquad[0]['teamId'].split(',');
        let teamTitle = matchPlayerSquad[0]['teamTitle'].split(',');
        let playerStats = await CricketMatch.getPlayerStats(playerId,matchPlayerSquad[0]['cid'], matchPlayerSquad[0]['matchId']);
        let points = await CricketMatch.getPlayerPerformance(playerSquad.cid, playerId);
        for(let i = 0;i < playerId.length; i++){
            let player:any = {}
            player.playerId = playerId[i];
            player.playerName = playerName[i];
            player.points = points.length>0 && points[i].points!=null?points[i].points:0;
            player.selectedBy = playerStats.length>0?playerStats[i].selectedBy:0;
            player.credit = credit[i]==null?0:+credit[i];
            player.role = role[i];
            player.isPlaying11 = isPlaying11[i];
            player.team = team[i];
            player.teamId = teamId[i];
            player.teamTitle = teamTitle[i];
            player.teamTitle = teamTitle[i];
            // Recent matches for the Player
            // Now the API has been seperate for recent matches and player stats reason being performance issue.
            /*let rececentMatches:any = []
            let recentMatchesData = await CricketMatch.getRecentMatches(playerId[i], matchPlayerSquad[0]['matchId']);
            for (let k = 0; k < recentMatchesData.length; k++){
                let playerStats = await CricketMatch.getPlayerStats([playerId[i]], recentMatchesData[0]['cid'], recentMatchesData[k].fkMatchId);
                let matchesData:any = {};
                matchesData.matchId = recentMatchesData[k].fkMatchId;
                matchesData.shortTitle = recentMatchesData[k].shortTitle;
                matchesData.dateStart = recentMatchesData[k].dateStart;
                matchesData.credit = playerStats[0].credit;
                matchesData.points = playerStats[0].point;
                matchesData.selectedBy = playerStats[0].selectedBy;
                rececentMatches.push(matchesData);
            }
            player.rececentMatches = rececentMatches;*/
            playerSquad.players.push(player);
        }
        return playerSquad; 
    }

    /**
     *  Checking for Playing11 
     * @param matchId 
     */
    async isPlaying11Update(matchId){
        try{
            let data = await models.FantacyCricket.query(
                `SELECT
                    COUNT(*) AS matchCount
                FROM
                    gmsFantacyCricketMatch
                WHERE
                    matchId = :matchId AND
                    dateStart > NOW() AND
                    dateStart < NOW()+INTERVAL 50 MINUTE`,
                { replacements: { matchId: matchId }, type: sequelize.QueryTypes.SELECT });
            return data && data.length > 0 && data[0]['matchCount'] > 0?data[0]['matchCount']:0;
        }
        catch(error){
            console.log("Error (IsPlaying11Update) : " + error);
            return false;
        }
    }

    /**
     * Update data for Cricket Match Score Card
     * @param condition 
     * @param update 
     * @param insert 
     */
    async upsertMatchSquad(condition, update, insert){
        try{
            await models.gmsfantacyCricketMatchScoreCard
            .findOne({ where: condition })
            .then(async function(obj) {
                if(obj)
                {
                    // update
                    obj.update(update);
                }
                else{
                    //insert
                    models.gmsfantacyCricketMatchScoreCard.create(insert);
                }
            });
        }catch(error){
            console.log("Error (UpsertMatchSquad) : " + error);
            return false;
        }
    }

    /**
     * Generate stats for player to watch
     * @param playerToWatch 
     */
    async buildPlayerToWatchStats(playerToWatch){
        let cid = playerToWatch[0]['cid'];
        let matchId = playerToWatch[0]['matchId'];
        let playerId = playerToWatch[0]['playerId'].split(',');
        let playerName = playerToWatch[0]['playerName'].split(',');
        let point = playerToWatch[0]['point'].split(',');
        let credit = playerToWatch[0]['credit'].split(',');
        let role = playerToWatch[0]['role'].split(',');    
        let isPlaying11 = playerToWatch[0]['isPlaying11'].split(',');
        let team = playerToWatch[0]['team'].split(',');
        //var teamTitle=playerToWatch[0]['teamTitle'].split(',');

        let players = []
        for(let i = 0;i < playerId.length; i++){
            let player:any = {}
            player.playerId = playerId[i];
            player.playerName = playerName[i];
            player.point = await CricketMatch.getPlayerPerformance(cid, playerId[i]);
            player.credit = +credit[i];
            player.role = role[i];
            //player.isPlaying11=isPlaying11[i];
            player.team = team[i];
            //player.teamTitle=teamTitle[i];
            let history = await CricketMatch.getPlayerToWatchMatchHistory(playerId[i], matchId);
            player.history = history;
            players.push(player);
        }
        return players;
    }

    /**
     * Store disconnection logs
     * @param  logsData
     */
    async storeDisconnectionLogs(userId:number, logsData:any){
        try{
            logsData.fkUserId = userId;
            await models.gmsDisconnectionLog.build(logsData).save();
        }catch(error){
            console.log("Error - storeDisconnectionLogs: ", error);
            throw new Error("We aren't able to store logs");
        }
    }

    /**
     * Store User logs from different marketing sources
     * @param  logsData
    
     */
    async storeUserSourceLogs(logsData:any){
        try{
            await models.gmsUserSourceLog.build(logsData).save();
        }catch(error){
            console.log("Error - storeUserSourceLogs: ", error);
            throw new Error("We aren't able to store user source logs");
        }
    }

    async maintainUserOnlineStatus(userDetails:any){
        console.log("------------------Online Status Topic Execution---------------");
        //Maintaining online status of user code starts here .
        
        const USER_ID=userDetails['id'];
        const USER_NAME=userDetails['userName'];
        const MOBILE=userDetails['mobile'];
        const CURR_DATE_TIME=Utility.getDateTime();
        
        //const ONLINE_STATUS=await CacheService.getCache(`ONLINE_STATUS_${USER_ID}`);
        const ONLINE_STATUS=true;

        //It will set user online status true for next 5 min.
        //These will execute every time it is without conditional.
        
        //await CacheService.setCache(`ONLINE_STATUS_${USER_ID}`,true,300);
        
        if(!ONLINE_STATUS || ONLINE_STATUS!==true){
            console.log("User was offline ..")
            let friendList=await QueryManager.executeQuery(`match (user1:User)-[:friendsWith {status: '2'}]-(user2:User {id:'${USER_ID}'}) return user1;`);
            //await friendList.forEach(async friend => 
            console.log("Friend List Length : ",friendList.length);
            for(let k=0;k<friendList.length;k++){
                
                let f_data=friendList[k].get(0);
                //console.log(f_data.properties);
                let userId=f_data.properties.id;
                let userName=f_data.properties.userName;
                let mobile=f_data.properties.mobile;
                let lastNotification;
                let notificationCount;
                
                if(f_data.properties.lastNotification==undefined){
                    lastNotification=CURR_DATE_TIME;
                    notificationCount=0;
                }
                else{
                    let neo4jDT=f_data.properties.lastNotification;
                    const {low}=f_data.properties.notificationCount
                    lastNotification=Utility.convertNeo4jToNodeDateTime(neo4jDT);
                    notificationCount=low|0;
                }
                
                
                let timeDiff=Math.floor((new Date(CURR_DATE_TIME).getTime() - new Date(lastNotification).getTime()) / 60000);                            
                console.log(`**********Notification Check for user : ${userId}**********`);
                //console.log("Notification count : ",notificationCount);
                
                if(new Date(CURR_DATE_TIME).getDate()!=new Date(lastNotification).getDate()){
                    console.log(`Reset Notification for user : ${userId}`);
                    notificationCount=0;
                    //await QueryManager.updateNotificationCount(userId,notificationCount,CURR_DATE_TIME);
                }
            
                if(notificationCount==0){
                    console.log(`Sending First Notification`);
                    //Send First Notification
                    let notification = {
                        title: "Hey! You have a notification",
                        body: USER_NAME + " is online."
                    };
                    let notificationData:any = {
                        "notificationType": "ONLINE_FRIENDS_NOTIFICATION",
                        "message": USER_NAME+ " is online.",
                    }
                    await Notifications.sendPushNotification(userId, notificationData, notification);
                    notificationCount++;
                    await QueryManager.updateNotificationCount(userId,notificationCount,CURR_DATE_TIME);
                }
                else if(notificationCount>=1 && notificationCount<config.MAX_ONLINE_FRIEND_NOTIFICATION && timeDiff > config.ONLINE_FRIENDS_NOTIFICATION_DELAY){

                    console.log("Time Diff : ",timeDiff);
                    console.log("Delay : ",config.ONLINE_FRIENDS_NOTIFICATION_DELAY);
                    let fofList=await QueryManager.executeQuery(`match (user1:User)-[:friendsWith {status: '2'}]-(user2:User {id:'${userId}'}) return user1;`);
                    let totalOnlineFriends=0;
                    let onlineFriendsUserNames:Array<string>=[];
                    for(let l=0;l<fofList.length;l++) {
                        let fof_data=fofList[l].get(0);
                        let fofUserId=fof_data.properties.id;
                        
                        //let fofUserOnlineStatus=await CacheService.getCache(`ONLINE_STATUS_${fofUserId}`);
                        let fofUserOnlineStatus=false;

                        if(fofUserOnlineStatus && fofUserOnlineStatus==true){
                            totalOnlineFriends++;
                            onlineFriendsUserNames.push(fof_data.properties.userName);
                        }
                    }
                    console.log("Total Online Friends",totalOnlineFriends);
                    if(totalOnlineFriends>=2 && onlineFriendsUserNames.length>=2){
                        //Prepare notification data.
                        let totalUserSelection=totalOnlineFriends>config.MAX_ONLINE_FRIEND_SELECTION?config.MAX_ONLINE_FRIEND_SELECTION:totalOnlineFriends;
                        let userSelection:Array<string>=[];
                        let msgData="";
                        while(userSelection.length<totalUserSelection){
                            let un=onlineFriendsUserNames[Math.floor(Math.random()*onlineFriendsUserNames.length)];
                            if(userSelection.indexOf(un)<0){
                                userSelection.push(un);
                                msgData=msgData+ " " +un;
                            }
                        }
                        msgData=totalUserSelection<totalOnlineFriends? `${msgData} and ${totalOnlineFriends-totalUserSelection} others friends are online please connect them.`:`${msgData} are online please connect them .`;
                        
                        //Send notification here.
                        let notification = {
                            title: "Hey! You have a notification",
                            body: msgData
                        };
                        let notificationData:any = {
                            "notificationType": "ONLINE_FRIENDS_NOTIFICATION",
                            "message": msgData
                        }
                        await Notifications.sendPushNotification(userId, notificationData, notification);
                        notificationCount++;
                        await QueryManager.updateNotificationCount(userId,notificationCount,CURR_DATE_TIME);
                    }
                    else{
                        console.log(`No need to send notification here for less than 2 friends for user : ${userId}`);
                    }
                }
                else{
                    console.log(`There are no friends online notification available for user ${userId} (${userName})`);
                    console.log(`Last Notification : ${lastNotification}`);
                    console.log(`Notification Count : ${notificationCount}`);
                }
                console.log(`********End Of Notification Check for user : ${userId}********`);
            }
            //);
        }//End of if block of sending notification
        else{
            console.log("User was already Online .");
        }
        console.log("------------------End Of Topic Online Status Execution---------------");
    }

    async userLastSeenCommunication(userDetails){
        console.log("-------------------------user Last Seen-------------------------------------")
        const userId=userDetails['id'];
        //let userLastSeenUpdatedTime=await CacheService.getCache("UserLastSeen:"+userId);
        let userLastSeenUpdatedTime=true;
        if(!userLastSeenUpdatedTime){
            const lastSeen=Utility.getDateTime();
            //console.log("Last Seen : ",lastSeen);
            try{
                let data = await models.gmsUsers.update({"lastSeen":lastSeen}, {
                    where: {
                        id: userId
                    }
                });
                let communicationTime=Utility.UserActivityTimeFrame(new Date(lastSeen));
                console.log("Communication Time : ",communicationTime);
                let upsert=await models.gmsUsersCommunicationTimeActivity
                        .findOne({ where: {fkUserId:userId,communicationTime:communicationTime,status:1} })
                        .then(async function(obj) {
                            if(obj)
                            {
                                //Update
                                obj.update({timeLog:obj.dataValues.timeLog+" | "+lastSeen});
                            }
                            else
                            {
                                //Insert
                                let insert:any={};
                                insert.fkUserId=userId;
                                insert.timeLog=lastSeen;
                                insert.communicationTime=communicationTime;
                                insert.status=1;
                                insert.createdAt=lastSeen;
                                models.gmsUsersCommunicationTimeActivity.create(insert);
                            }
                        });

                        //await CacheService.setCache("UserLastSeen:"+userId,lastSeen,300)
            }
            catch(error){
                console.log("Error (Consumer suscribe) : ",error);
            }
        }
        else{
            console.log("Last time User Update which is less than 5 Min : ",userLastSeenUpdatedTime);
        }
        console.log("-------------------------user Last Seen Done-------------------------------------")
    }

    /*async updateLeaderBordData(userId, winPrice){
        
        let lbAll = global.LEADERBORD_ALL;
        let lbToday = global.LEADERBORD_TODAY;
        let lbUD = global.LEADERBOARD_UPDATED_DATE;
        let todayDate = helper.changeToDateMonthYear(new Date());
        try{
            console.log("LB UD : ",lbUD);
            console.log("Today Date : ",todayDate);

            if(lbUD < todayDate){
                await GlobalData.setLeaderbordAllData();
                await GlobalData.setLeaderbordTodayData();
                global.LEADERBOARD_UPDATED_DATE =helper.changeToDateMonthYear(new Date());
                console.log("Leaderboard reset in memory on new date.");
                return;
            }

            //Leaderbord all 
            const lbAllUserIndex = lbAll.findIndex(object => {
                return object.id == userId;
            });

            if(lbAllUserIndex>=0){
                lbAll[lbAllUserIndex]['winPrize']=lbAll[lbAllUserIndex]['winPrize'] + winPrice;
                lbAll?.sort((a, b) => (a.winPrize > b.winPrize ? -1 : 1))
                for(let i=0;i<lbAll.length;i++){
                    lbAll[i]['rank']=i+1;
                }
                global.LEADERBORD_ALL=lbAll;
            }
            
            //Leaderbord Today
            const lbTodayUserIndex = lbToday.findIndex(object => {
                return object.id == userId;
            });
            console.log("User Index : ",lbTodayUserIndex);
            if(lbTodayUserIndex>=0){
                lbToday[lbTodayUserIndex]['winPrize']=lbToday[lbTodayUserIndex]['winPrize'] + winPrice;
                
                lbToday?.sort((a, b) => (a.winPrize > b.winPrize ? -1 : 1))
                for(let i=0;i<lbToday.length;i++){
                    lbToday[i]['rank']=i+1;
                }
                
                global.LEADERBORD_TODAY=lbToday;
                console.log(`LB Today Updated in memory ${userId} <--> ${winPrice}`);
            }
            else {
                //Get total Winnings from DB
                if(lbToday.length > 0){
                    let currentUserWinning= await this.getTotalWinnings(userId);
                    if((currentUserWinning['winPrize'] && lbToday[lbToday.length-1]['winPrize'] < currentUserWinning['winPrize']) || (currentUserWinning['winPrize'] && lbToday.length < 10)){
                        lbToday.push(currentUserWinning);
                        lbToday?.sort((a, b) => (a.winPrize > b.winPrize ? -1 : 1))
                        for(let i=0;i<lbToday.length;i++){
                            lbToday[i]['rank']=i+1;
                        }
                        
                        if(lbToday.length > 10) lbToday.pop();

                        global.LEADERBORD_TODAY=lbToday;
                        console.log(`LB Today Updated in memory ${userId} <--->  ${currentUserWinning}`);
                    }
                }
                else{
                    await GlobalData.setLeaderbordTodayData();
                    console.log(`LB Today Globaly Updated in memory`);
                }
                
            }


            let currentTime=new Date().getTime() - 1000 * 60 * 15;
            if(global.LEADERBORD_UT < currentTime){
                //Update LB in DB
                try{
                    //await models.gmsTracking.build(logsData).save();
                    let trackData:any={};
                    trackData.type=1;
                    trackData.data=JSON.stringify(lbAll);
                    trackData.createdAt=new Date();
                    trackData.updatedAt=new Date();

                    await models.gmsTrackingsetLeaderbordTodayData
                        .findOne({ where: {type:trackData.type} })
                        .then(async function (obj) {
                            if (obj) {
                                // update
                                obj.update(trackData);
                            } else {
                                //insert
                                models.gmsTracking.create(trackData);
                            }
                        });

                        
                    trackData.type=2;
                    trackData.data=JSON.stringify(lbToday);
                    trackData.createdAt=new Date();
                    trackData.updatedAt=new Date();

                    await models.gmsTracking
                        .findOne({ where: {type:trackData.type} })
                        .then(async function (obj) {
                            if (obj) {
                                // update
                                obj.update(trackData);
                            } else {
                                //insert
                                models.gmsTracking.create(trackData);
                            }
                        });
                    return true;
                }
                catch(error){
                    console.log("Error in (updateLeaderBordData) : ");
                    console.log(error);
                    return false;
                }
            }//End of LB tracking Update in DB
            return true;
        }//End of try.
        catch(error){
            console.log("Error in (updateLeaderBordData ): ");
            console.log(error);
            return false;
        }
    }*/

    async getTotalWinnings(userId){
        try{
            let data = await models.sequelize.query(
                "SELECT  u.userName as firstName,u.image,u.defaultImage,u.gender,u.mobile,T1.fkUserId as id, sum(T1.amount) as winPrize FROM "+
                "( "+
                "select w.fkReceiverId as fkUserId,SUM(w.amount) as amount  "+
                "from gmsPaymentTransactionLogWithdraw w  "+
                "where w.fkReceiverId="+userId+" AND w.requestType=30 and w.payStatus=10 and w.amount!=0 and w.fkReceiverId is not null and w.createdAt >= CURDATE()  "+
                "UNION  "+
                "select e.fkUserId,SUM(e.delta) as amount  "+
                "from gmsTableGameEndTrx e  "+
                "where e.fkUserId="+userId+" AND e.status=20 AND e.delta > 0  AND e.createdAt >= CURDATE()  "+
                ") T1, gmsUsers u "+
                "WHERE u.id=T1.fkUserId ",
                { type: sequelize.QueryTypes.SELECT });
            return data.length>0 ? data['0']:null;
        }
        catch(error){

        }
    }

    async updateUserGamePlayMatrix(userId:number,gameId:number,result:number,amount:number=0){

        let userExistingMatrix=await models.gmsUsers.findAll({
            attributes: ["totalWins", "totalWinningAmount", "gameMatrix"],
            where: { id: userId }
        });

        if(userExistingMatrix && userExistingMatrix.length > 0){
            
            let {totalWins,totalWinningAmount, gameMatrix} = userExistingMatrix[0];
            gameMatrix= !gameMatrix ? [] : JSON.parse(gameMatrix);
            gameMatrix= await this.resetExistingUserPlayMetrix(gameMatrix, gameId,result)

            if(result==Constant.USER_GAMEPLAY_GRAPH.WIN){
                totalWins=totalWins + 1;
                totalWinningAmount = totalWinningAmount + amount;
            }

            let updatedData:any = {};
            updatedData['totalWins'] = totalWins;
            updatedData['totalWinningAmount'] = totalWinningAmount;
            updatedData['gameMatrix'] = JSON.stringify(gameMatrix);
            try{
                let updateData = await models.gmsUsers.update(updatedData, {
                    where: {id:userId}
                });
            }
            catch(error){
                console.log("DB Error in (updateUserGamePlayMatrix)")
                console.log(error);
                return false;
            }
            return true;
        }
        else{
            console.log(` User details Not available : ${userId} `);
            return false;
        }
    }

    async resetExistingUserPlayMetrix(gameMatrix:any,gameId:number,result:number){

        const gameDataIndex = gameMatrix.findIndex(object => {
            return object.gameId == gameId;
        });

        //Case - 1 : If user already play the game
        if(gameDataIndex >=0){
            if(result==Constant.USER_GAMEPLAY_GRAPH.PLAY){
                gameMatrix[gameDataIndex]['play'] = gameMatrix[gameDataIndex]['play'] +1;
            }
            else if(result==Constant.USER_GAMEPLAY_GRAPH.WIN){
                gameMatrix[gameDataIndex]['win'] = gameMatrix[gameDataIndex]['win'] +1;
            }
            else if(result==Constant.USER_GAMEPLAY_GRAPH.LOSE){
                gameMatrix[gameDataIndex]['lose'] = gameMatrix[gameDataIndex]['lose'] +1;
            }
            else if(result==Constant.USER_GAMEPLAY_GRAPH.DRAW){
                gameMatrix[gameDataIndex]['draw'] = gameMatrix[gameDataIndex]['draw'] +1;
            }
            return gameMatrix;
        }
        //Case - 2 : If user play the game for first time
        else{
            let preparedData:any={};
            preparedData.gameId=gameId;
            if(result==Constant.USER_GAMEPLAY_GRAPH.PLAY){
                preparedData['play'] = 1;
                preparedData.win=0;
                preparedData.lose=0;
                preparedData.draw=0;
            }
            else if(result==Constant.USER_GAMEPLAY_GRAPH.WIN){
                preparedData.play = 0
                preparedData.win=1;
                preparedData.lose=0;
                preparedData.draw=0;
            }
            else if(result==Constant.USER_GAMEPLAY_GRAPH.LOSE){
                preparedData.play = 0
                preparedData.win=0;
                preparedData.lose=1;
                preparedData.draw=0;
            }
            else if(result==Constant.USER_GAMEPLAY_GRAPH.DRAW){
                preparedData.play = 0
                preparedData.win=0;
                preparedData.lose=0;
                preparedData.draw=1;
            }
            gameMatrix.push(preparedData);
            return gameMatrix;
        }//End of Case 2 Else block
    
    }

    async sendNewAppVersionNotificationToAllUser(url,version,msg){
        try{
            let versionCond=version=='ALL' || !version ? '' : `AND ua.userAgent like '%Gamesapp/${version}%'`;
            let data = await models.sequelize.query(
                `SELECT  u.id,u.userName from gmsUsers u,gmsUserAuth ua WHERE u.id=ua.fk_userId AND u.status=1 AND ua.status=1 ${versionCond}`,
                { type: sequelize.QueryTypes.SELECT });

            for(let i=0; i<data.length; i++){
                if(url){
                    const notification = {
                        title: `Gamesapp Update`,
                        body: `Hi ${data[i]['userName']} ${msg} ${url}`
                    };

                    const notificationData:any = {
                        "notificationType": "GAMESAPP_UPDATE",
                        "message": `${msg}`,
                        "click_action":url
                    }
                    await Notifications.sendPushNotification(data[i]['id'], notificationData, notification);
                }
                else{
                    const notification = {
                        title: `Gamesapp General Update`,
                        body: `Hi ${data[i]['userName']} ${msg}`
                    };
                    
                    const notificationData:any = {
                        "notificationType": "GAMESAPP_GENERAL_UPDATE",
                        "message": `${msg}`
                    }
                    await Notifications.sendPushNotification(data[i]['id'], notificationData, notification);
                }
            }
            return true;
        }
        catch(error){
            console.log("Error in (sendNewAppVersionNotificationToAllUser) : ",error);
            return false;
        }
    }
    
    async updateNewGame(updateData,condition){
        try{
            let data = await models.gmsGames.update(updateData, {
                where: condition
            });
            return true;
        }
        catch(error){
            console.log("Error in (updateNewGame) : ",error);
            return false;
        }
    }

    async updateNewAPK(version,newUrl){
        try{
            let mainAPPData=await helper.getAllColValue("gmsAppHistory",{fk_GameId:1,status:1});
            let data = await models.gmsAppHistory.update({status:0}, {
                where: {
                    id:mainAPPData[0]['id']
                }
            });

            mainAPPData[0]['version']=version;
            mainAPPData[0]['url']=newUrl;
            delete mainAPPData[0]['id'];
            await models.gmsAppHistory.build(mainAPPData[0]).save();

            return true
        }
        catch(error){
            console.log("Error in (updateNewAPK) : ",error);
            return false;
        }
    }
    
    async adminPanelIpAddresslog(adminPanelLogDetails:any){
        try {
         let data=await models.gmsAdminPanelReqIpAddressLog.build(adminPanelLogDetails).save()
         if(data && data.length>0){
             return true
         }
         else {
             return false
         }
        } catch (error) {
         console.log("Error in (adminPanelLogDetails) :",error)
         return false
        }
     }
   
}
export default new Common();