import sequelize from 'sequelize';
import models from '../models/index';
import Constant from '../../common/app.constant';
import helper from '../../common/helper';
import QueryManager from '../../common/neo4j/queryManager';
import UtilityService from '../../common/utility.service'
import utilityService from '../../common/utility.service';

export class Friends{
    /**
     *  Create a friend request
     * @param userId 
     * @param friendId 
     */
    async createFriendRequest(userId:number, friendId:number, status:number=null){
        try{
            let alreadyFriends = await helper.getAllColValue("gmsUserFriends", {"userId":userId, "friendId": friendId});
            if(alreadyFriends.length > 0){
                console.log("-----------Already Friends--------------");
                return "EXISTS";
            }else{
                let friendRequest:any = {};
                friendRequest.userId = userId;
                friendRequest.friendId = friendId;
                friendRequest.status = Constant.FriendRequestStatus.Requested;
                await models.gmsUserFriends.build(friendRequest).save();
                return "SUCCESS";
            }    
        }catch(error){
            console.log("Error - createFriendRequest: ", error);
            return "ERROR";
        }
    }
    
    async createFriendRequestV1(userId:number,friendId:number){
        try{
            //Check the existence.
            let existingData=await QueryManager.executeQuery(`match (user1:User {id:'${userId}'})-[:friendsWith]-(user2:User {id:'${friendId}'})
            return user1,user2;`);
            
            if(existingData.length>0){
                console.log(`User ${userId} and ${friendId} already has been sent request for friendsheep !!`);
                return "EXISTS";
            }
            else{
                //Generate a request .
                let userDetails=await helper.getColsValue("gmsUsers", ["firstName","lastName","mobile", "userName","image"], {"id": userId});
                let friendDetails=await helper.getColsValue("gmsUsers", ["firstName","lastName","mobile", "userName","image"], {"id": friendId});
                
                let currentDateTime=UtilityService.getDateTime().replace('T',' ');
                let createFriendQuery=`MERGE (user:User {id: '${userId}',userName:'${userDetails[0]['userName']}',
                mobile:'${userDetails[0]['mobile']}'})
                
                MERGE (friend:User {id: '${friendId}',userName:'${friendDetails[0]['userName']}',
                mobile:'${friendDetails[0]['mobile']}'})

                MERGE (user)-[:friendsWith {status:'${Constant.FriendRequestStatus.Requested}',senderId:'${userId}',createdAt:'${currentDateTime}',updatedAt:'${currentDateTime}'}]-(friend);`

                let createFriendData=await QueryManager.executeQuery(createFriendQuery);
                if(createFriendData){
                    console.log(`User ${userId} send friend request to user ${friendId} successfully.`);
                    return "SUCCESS";
                }
                else{
                    return "ERROR";
                }                
            }
        }
        catch(error){
            console.log("Error - createFriendRequestV1 ",error);
            return "ERROR";
        }   
    }


    /**
     * Update friend request
     * @param userId 
     * @param friendId 
     * @param status 
     */
    async updateFriendRequest(userId:number, friendId:number, status:number){
        try{
            let friendRequest:any = {};
            friendRequest.status = status;
            let data = await models.gmsUserFriends.update(friendRequest, {
                where: {
                    userId: friendId,
                    friendId: userId
                }
            });
            if (data[0] > 0){
                console.log("updateFriendRequest > ", data);
                if (status == Constant.FriendRequestStatus.Accepted){
                    let friendCreateRequest:any = {};
                    friendCreateRequest.userId = userId;
                    friendCreateRequest.friendId = friendId;
                    friendCreateRequest.status = Constant.FriendRequestStatus.Accepted;
                    await models.gmsUserFriends.build(friendCreateRequest).save();
                }
                return true;
            }
        }catch(error){
            console.log("Error - updateFriendRequest: ", error);
        }  
        return false; 
    }

    async updateFriendRequestv1(userId:number, friendId:number){
        try{
            let currentDateTime=UtilityService.getDateTime().replace('T',' ');
            let updateFriendsheepRelationQuery=`MATCH (user1:User{id:'${userId}'})-[fw:friendsWith {status:'${Constant.FriendRequestStatus.Requested}',senderId:'${friendId}'}]-(friend:User{id:'${friendId}'})
            set fw.status='${Constant.FriendRequestStatus.Accepted}',fw.updatedAt='${currentDateTime}' return fw;`
            console.log(updateFriendsheepRelationQuery);
            let updateFriendSheepData=await QueryManager.executeQuery(updateFriendsheepRelationQuery);
            console.log(updateFriendSheepData);
            if(updateFriendSheepData && updateFriendSheepData.length>0){
                console.log(`User ${userId} accepted the friend request with ${friendId}`);
                return "success";
            }
            else if(updateFriendSheepData && updateFriendSheepData.length==0){
                console.log(`User ${userId} can't accept the friend request with ${friendId}`);
                return "invalid";
            }
            else{
                return false;
            }
        }
        catch(error){
            console.log("Error - updateFriendRequestv1 ",error);
            return false;
        }
    }

    async doUnFriend(userId:number, friendId:number){

        try{
            let query=`MATCH (u1:User)-[f:friendsWith]-(u2:User)
            WHERE u1.id='${userId}' AND u2.id='${friendId}'
            DELETE f;`;
            
            let result=await QueryManager.executeQuery(query);
            console.log(`User ${userId} & ${friendId} are now no more relationsheep of friend.`);
            return true;
        }
        catch(error){
            console.log("Error - doUnFriend ",error);
            return false;
        }
    }


    /**
     * Get Friends List
     * @param userId 
     * @param status 
     * @param limit 
     */
    //This Function is not in Used.
    async getFriendsList(userId:number, status:number, paginate=false, page=1, page_size=20){
        try{
            let condition:any = {
                userId: userId, 
                status: status
            }
            const start = page_size * (page - 1);
            let limit_query = "";
            if (paginate) {
                limit_query = " LIMIT "+start+", "+page_size+"";
            }
            // let data = await models.sequelize.query(
            //     `SELECT
            //         gu.id,
            //         gu.username,
            //         gu.firstName,
            //         gu.lastName,
            //         guf.status AS friendStatus,
            //         gu.image,
            //         ifnull(if(gb.status in (100,110,150,200), 1, 0), 0) AS inGame
            //     FROM
            //         gmsUsers gu,
            //         gmsUserFriends guf LEFT JOIN 
            //         gmsBattleRoom gb ON (guf.friendId = gb.fk_PlayerId1 OR guf.friendId = gb.fk_PlayerId2) AND gb.status in (100,110,150,200)
            //     WHERE
            //         gu.id = guf.friendId AND
            //         guf.userId = :userId AND
            //         guf.status = :status
            //     GROUP BY guf.friendId 
            //     ORDER BY guf.updatedAt ` + limit_query,
            //     { replacements: condition, type: sequelize.QueryTypes.SELECT });
            let data = await models.sequelize.query(
                `SELECT
                    gu.id,
                    gu.username,
                    gu.firstName,
                    gu.lastName,
                    guf.status AS friendStatus,
                    gu.image,
                    if (ifnull(if(gb.status in (100,110,150,200), 1, 0), 0) OR ifnull(if(gtp.status in (100,200), 1, 0), 0), 1, 0) as inGame 
                FROM
                    gmsUsers gu,
                    gmsUserFriends guf LEFT JOIN 
                    gmsBattleRoom gb ON (guf.friendId = gb.fk_PlayerId1 OR guf.friendId = gb.fk_PlayerId2) AND gb.status in (100,110,150,200) LEFT JOIN
                    gmsTableGamePlayers gtp ON gtp.fkPlayerId=guf.friendId and gtp.status in (100,200) 
                WHERE
                    gu.id = guf.friendId AND
                    guf.userId = :userId AND
                    guf.status = :status
                GROUP BY guf.friendId 
                ORDER BY guf.updatedAt ` + limit_query,
                { replacements: condition, type: sequelize.QueryTypes.SELECT });
            return data;
        }catch(error){
            console.log("Error - getFriendsList: ", error);
            return false;
        }
    }

    async sortFriendByOLStatus(friendList){
        let OnLF=[];
        let OffLF=[]
        for(let i=0;i<friendList.length;i++)
        {
            //let OLS=await CacheService.getCache(`ONLINE_STATUS_${friendList[i]['id']}`);
            let OLS=false;
            if(OLS){
                friendList[i]['ols']=true;
                OnLF.push(friendList[i]);
            }
            else{
                friendList[i]['ols']=false;
                OffLF.push(friendList[i]);
            }
        }
        return OnLF.concat(OffLF);
    }

    async getFriendsListV1(userId:number, status:number, paginate=false, page=1, page_size=20){

        let limitCheck=``;
        if(paginate){
            limitCheck=`SKIP ${page_size*(page-1)} LIMIT ${page_size}`;
        }
        try{
            let friendListQuery=`match (user:User)-[:friendsWith {status:'${status}'}]-(friend:User{id:'${userId}'})
                                return user ${limitCheck}`;
            
            console.log(friendListQuery);
            let friendsData=await QueryManager.executeQuery(friendListQuery);
            let friendListData=[];
            let friendIds=[];
            friendsData.forEach(async friend => {
                //console.log(friend.get(0));
                let fd=friend.get(0);
                let {id,username,firstName,lastName,friendStatus,image}=fd.properties;
                friendIds.push(id);
                friendListData.push({id,username,firstName,lastName,friendStatus,image});
            });
            if(friendIds.length>0){
                let data = await models.sequelize.query(
                `SELECT gu.id,gu.firstName,gu.lastname,gu.image,DATE(gu.createdAt) as joinedDate,gu.userName, 
                    if (ifnull(if(gb.status in (100,110,150,200), 1, 0), 0), 1, 0) as inGame 
                FROM
                    gmsUsers gu LEFT JOIN
                    gmsBattleRoom gb ON (gu.id = gb.fk_PlayerId1 OR gu.id = gb.fk_PlayerId2) AND gb.status in (100,110,150,200) 
                where gu.id in (:friendId)`,
                    { replacements: {friendId:friendIds}, type: sequelize.QueryTypes.SELECT });

                for(let i=0;i<data.length;i++){
                    let j=0;
                    while(j<friendListData.length){
                        if(friendListData[j]['id']==data[i]['id']){
                            friendListData[j]['inGame']=data[i]['inGame'];
                            friendListData[j]['firstName']=data[i]['firstName'];
                            friendListData[j]['lastName']=data[i]['lastname'];
                            friendListData[j]['image']=data[i]['image'];
                            friendListData[j]['joinedDate']=data[i]['joinedDate'];
                            friendListData[j]['userName']=data[i]['userName'];
                            break;
                        }
                        j++;
                    }
                }
            }
            return friendListData;
        }
        catch(error){
            console.log("Error - getFriendsListV1 ",error);
            return false;
        }

        /*
            1 - (Abhay Pratap Singh) : Function created for friend list while friend data fetched from Neo4J system.
            2 - (Abhay Pratap Singh) : Added Joined Date (createdAt) field to response back on front end.   
            3 - (Abhay Pratap Singh) : Added userName field to response back on front end.   
        */

    }

    /**
     * Get FriendRequests List
     * @param userId 
     * @param status 
     * @param limit 
     */
    async getFriendRequestsList(userId:number, status:number, limit:number=null){
        try{
            let condition:any = {
                userId: userId, 
                status: status
            }
            let limitCond = ""
            if(limit){
                limitCond = "LIMIT :limit";
                condition.limit = limit;
            }
            let data = await models.sequelize.query(
                `SELECT
                    gu.id,
                    gu.username,
                    gu.firstName,
                    gu.lastName,
                    guf.status AS friendStatus,
                    gu.image
                FROM
                    gmsUsers gu,
                    gmsUserFriends guf
                WHERE
                    gu.id = guf.userId AND
                    guf.friendId = :userId AND
                    guf.status = :status
                ORDER BY guf.updatedAt`,
                { replacements: condition, type: sequelize.QueryTypes.SELECT });
            return data;
        }catch(error){
            console.log("Error - getFriendRequestsList: ", error);
            return false;
        }
    }

    async getFriendRequestsListV1(userId:number, status:number, limit:number=null){
        let limitCheck=``;
        if(limit){
            limitCheck=`LIMIT ${limit}`;
        }
        try{
            let friendRequestListQuery=`match (user:User)-[fw:friendsWith {status:'${status}'}]-(friend:User{id:'${userId}'})
                                return user,fw ${limitCheck}`;
            console.log("Friend Request List ");
            console.log(friendRequestListQuery);

            let friendsRequestData=await QueryManager.executeQuery(friendRequestListQuery);
            let friendRequestListData=[];
            let friendIds=[];
            friendsRequestData.forEach(async friend => {
                let fd=friend.get(0);
                let fr=friend.get(1)
                // console.log(fd);
                // console.log(fr);
                let {id,username,firstName,lastName,friendStatus,image}=fd.properties;
                let {senderId,status}=fr.properties;
                if(senderId!=userId){
                    friendIds.push(id);
                    friendRequestListData.push({id,username,firstName,lastName,friendStatus,image});
                }
                
            });
            if(friendIds.length>0){
                let data = await models.sequelize.query(
                `SELECT gu.id,gu.firstName,gu.lastname,gu.image,DATE(gu.createdAt) as joinedDate,gu.userName
                FROM
                    gmsUsers gu 
                where gu.id in (:friendId)`,
                { replacements: {friendId:friendIds}, type: sequelize.QueryTypes.SELECT });

                for(let i=0;i<data.length;i++){
                    let j=0;
                    while(j<friendRequestListData.length){
                        if(friendRequestListData[j]['id']==data[i]['id']){
                            friendRequestListData[j]['firstName']=data[i]['firstName'];
                            friendRequestListData[j]['lastName']=data[i]['lastname'];
                            friendRequestListData[j]['image']=data[i]['image'];
                            friendRequestListData[j]['joinedDate']=data[i]['joinedDate'];
                            friendRequestListData[j]['userName']=data[i]['userName'];
                            break;
                        }
                        j++;
                    }
                }
            }
            return friendRequestListData;
        }
        catch(error){
            console.log("Error - getFriendRequestsListV1 ",error);
            return [];
        }

        /*
            1 - (Abhay Pratap Singh) : Function created for friend request list while friend data fetched from Neo4J system.
            2 - (Abhay Pratap Singh) : Added Joined Date (createdAt) field to response back on front end.   
        */
    }
    /**
     * Get Total friends
     * @param userId 
     */
    async getTotalFriends(userId:number){
        let totalFriends = await models.gmsUserFriends.count({
            where: {
                userId: userId,
                status: Constant.FriendRequestStatus.Accepted
            }
        });
        return totalFriends;
    }

    async getTotalFriendsV1(userId:number){
        let friendListQuery=`match (user:User)-[:friendsWith {status:'${Constant.FriendRequestStatus.Accepted}'}]-(friend:User{id:'${userId}'})
        return user`;
        console.log(friendListQuery);
        let friendsData=await QueryManager.executeQuery(friendListQuery);
        return friendsData.length;
    }

    /**
     * Get total friends and status
     * @param loggedInUserId 
     * @param userId 
     */
    async getTotalFriendsAndStatus(loggedInUserId:number, userId:number=null){
        let data:any = {
            'totalFriends': 0,
            'friendStatus': false
        }
        try{
            if(userId){
                data.totalFriends = await this.getTotalFriends(userId);
                let userStatus = await models.gmsUserFriends.findAll({
                    where: {
                        userId: userId,  
                        friendId: loggedInUserId,
                        status: [Constant.FriendRequestStatus.Accepted]
                    },
                    order:[['updatedAt', 'DESC']]
                });
                if(userStatus.length > 0){
                    data.friendStatus = true;
                }
            }else{
                data.totalFriends = await this.getTotalFriends(loggedInUserId);
            }
        }catch(error){
            console.log("Error - getTotalFriendsAndStatus: ", error);
        }
        return data;
    }

    async getTotalFriendsAndStatusV1(loggedInUserId:number, userId:number=null){
        let data:any = {
            'totalFriends': 0,
            'friendStatus': null,
            'friendCreatedDate':null,
            'friendUpdatedDate':null,
            'friendRequestSenderId':null
        }
        try{
            if(userId){
                data.totalFriends = await this.getTotalFriendsV1(userId);
                let friendsQuery=`match (user:User {id:'${loggedInUserId}'})-[fw:friendsWith]-(friend:User{id:'${userId}'})
                return user,fw`;
        
                let friendsData=await QueryManager.executeQuery(friendsQuery);
                if(friendsData && friendsData.length>0){
                    let {status,createdAt,updatedAt,senderId}=friendsData[0].get(1).properties;
                    data.friendStatus = status;
                    data.friendCreatedDate=createdAt;
                    data.friendUpdatedDate=updatedAt;
                    data.friendRequestSenderId=senderId;
                }
            }else{
                data.totalFriends = await this.getTotalFriendsV1(loggedInUserId);
            }
        }catch(error){
            console.log("Error - getTotalFriendsAndStatusV1: ", error);
        }
        return data;
    }


    async getRecentlyPlayedUsers(userId:number, page=1, page_size=50){
        try{
            const start = page_size * (page - 1);
            const end = start + page_size;
            let data = await models.sequelize.query(
                `SELECT 
                    u.id AS userId,
                    u.firstName,
                    u.lastName,
                    u.username,
                    u.image,
                    g.id AS gameId,
                    g.name AS gameName,
                    uf.status AS friendStatus,
                    max(players.lastPlayedDate) AS lastPlayedDate
                FROM 
                    (SELECT
                        br.fk_PlayerId2 AS userId,
                        br.fk_GameId AS gameId,
                        max(br.updatedAt) AS lastPlayedDate
                    FROM
                        gmsBattleRoom br
                    WHERE
                        br.fk_PlayerId1=:userId
                        AND br.fk_PlayerId2 IS NOT NULL 
                        AND br.status IN (:status)
                        GROUP BY userId 
                    UNION DISTINCT 
                    SELECT
                        br.fk_PlayerId1 AS userId, 
                        br.fk_GameId AS gameId,
                        max(br.updatedAt) AS lastPlayedDate
                    FROM
                        gmsBattleRoom br
                    WHERE
                        br.fk_PlayerId2=:userId
                        AND br.fk_PlayerId2 IS NOT NULL 
                        AND br.status IN (:status)
                        GROUP BY userId ORDER BY lastPlayedDate DESC
                    ) AS players,
                    gmsGames g,
                    gmsUsers u
                    LEFT JOIN gmsUserFriends uf ON u.id=uf.friendId AND uf.userId=:userId 
                WHERE
                    players.gameId=g.id
                    AND u.id=players.userId
                    AND (uf.status IS NULL OR uf.status = 3)
                    GROUP BY u.id HAVING u.id !=:userId
                    ORDER BY players.lastPlayedDate DESC LIMIT :start, :end`,
                { replacements: {userId: userId, status: [
                    Constant.Battle.BattleRoom.Interrupted, 
                    Constant.Battle.BattleRoom.GameFinished,
                    Constant.Battle.BattleRoom.GameDraw    
                    ],
                    start: start,
                    end: end
                } , type: sequelize.QueryTypes.SELECT });



            return data;
        }catch(error){
            console.log("Error - getRecentlyPlayedUsers: ", error);
            return false;
        }
    }

    async getRecentlyPlayedUsersV1(userId:number, page=1, page_size=50){
        try{
            const start = page_size * (page - 1);
            const end = start + page_size;
            let query=`SELECT 
                            u.id AS userId,
                            u.firstName,
                            u.lastName,
                            u.image,
                            u.userName,
                            DATE(u.createdAt) as joinedDate,
                            g.id AS gameId,
                            g.name AS gameName,
                            null friendStatus,
                            max(players.lastPlayedDate) AS lastPlayedDate
                        FROM 
                            (SELECT
                                (CASE 
                                    WHEN br.fk_PlayerId1=:userId
                                        THEN br.fk_PlayerId2
                                    WHEN br.fk_PlayerId2=:userId
                                        THEN br.fk_PlayerId1
                                    ELSE
                                        ''
                                END) as userId,
                                br.fk_GameId AS gameId,
                                max(br.updatedAt) AS lastPlayedDate
                            FROM
                                gmsBattleRoom br
                            WHERE
                                (br.fk_PlayerId1=:userId OR br.fk_PlayerId2=:userId)
                                AND br.fk_PlayerId1 IS NOT NULL AND br.fk_PlayerId2 IS NOT NULL 
                                AND br.status IN (:status)
                                GROUP BY userId 
                            ) AS players,
                            gmsGames g,
                            gmsUsers u
                        WHERE
                            u.id=players.userId AND
                            g.id=players.gameId 
                            GROUP BY u.id HAVING u.id !=:userId
                            ORDER BY players.lastPlayedDate DESC LIMIT :start, :end`
            let data = await models.sequelize.query(query,
                { replacements: {userId: userId, status: [
                    Constant.Battle.BattleRoom.Interrupted, 
                    Constant.Battle.BattleRoom.GameFinished,
                    Constant.Battle.BattleRoom.GameDraw    
                    ],
                    start: start,
                    end: end
                } , type: sequelize.QueryTypes.SELECT });

            if(data.length>0){
                let friendDataQuery=`match (user:User)-[fw:friendsWith]-(friend:User{id:'${userId}'})
                                return user,fw`;
            
                //console.log(friendDataQuery);
                
                let friendsData=await QueryManager.executeQuery(friendDataQuery);
                friendsData.forEach(async friend => {
                    //console.log(friend.get(0));
                    let fd=friend.get(0);
                    let fw=friend.get(1);

                    let {id}=fd.properties;
                    let{status}=fw.properties;
                    let i=0;
                    while(i<data.length){
                        if(data[i]['userId']==id){
                            if(status==Constant.FriendRequestStatus.Accepted)
                                data.splice(i,1);
                            else
                                data[i]['friendStatus']=status;

                            break;
                        }
                        i++
                    }
                });
            }            
            return data;
        }catch(error){
            console.log("Error - getRecentlyPlayedUsersV1: ", error);
            return false;
        }
    }

    async getSuggestedFriends(user:any, syncType:string, friendsList:Array<string>){
        try{
            let conditionData:string = null;
            if (syncType == 'FB'){
                conditionData = " AND gu.facebookId IN (:friendsList) ";
            }else{
                conditionData = " AND gu.mobile IN (:friendsList) AND gu.mobile != " + user['mobile'];
            }
            let data = await models.sequelize.query(
                `SELECT
                    gu.id,
                    gu.username,
                    gu.firstName,
                    gu.lastName,
                    gu.image,
                    ifnull(guf.status, 0) as status,
                    :syncType AS source
                FROM
                    gmsUsers gu LEFT JOIN 
                    gmsUserFriends guf ON gu.id = guf.friendId AND guf.userId = :userId
                WHERE 
                    (guf.status IS NULL OR guf.status = 1)` + conditionData +
                ` ORDER BY gu.updatedAt`,
                { replacements: {syncType:syncType, userId: user['id'], friendsList: friendsList} , type: sequelize.QueryTypes.SELECT });
            return data;
        }catch(error){
            console.log("Error - getSuggestedFriends: ", error);
            return false;
        }
    }

    async getSuggestedFriendsV1(user:any, syncType:string, friendsList:Array<string>){
        try{
            let conditionData:string = null;
            if (syncType == 'FB'){
                conditionData = "  gu.facebookId IN (:friendsList) ";
            }else{
                conditionData = "  gu.mobile IN (:friendsList) AND gu.mobile != " + user['mobile'];
            }
            let data = await models.sequelize.query(
                `SELECT
                    gu.id,
                    gu.userName,
                    gu.firstName,
                    gu.lastName,
                    gu.image,
                    DATE(gu.createdAt) as joinedDate,
                    null as friendStatus,
                    :syncType AS source
                FROM
                    gmsUsers gu
                WHERE 
                    ${conditionData}
                 ORDER BY gu.updatedAt`,
                { replacements: {syncType:syncType, userId: user['id'], friendsList: friendsList} , type: sequelize.QueryTypes.SELECT });

            if(data.length>0){
                let friendDataQuery=`match (user:User)-[fw:friendsWith ]-(friend:User{id:'${user['id']}'})
                                return user,fw`;
            
                //console.log(friendDataQuery);
                
                let friendsData=await QueryManager.executeQuery(friendDataQuery);
                friendsData.forEach(async friend => {
                    //console.log(friend.get(0));
                    let fd=friend.get(0);
                    let fw=friend.get(1);
                    let {id}=fd.properties;
                    let {status}=fw.properties;
                    
                    let i=0;
                    while(i<data.length){
                        if(data[i]['id']==id){
                            if(status==2){
                                data.splice(i,1);
                            }
                            else{
                                data[i]['friendStatus']=1
                            }
                            break;
                        }
                        i++
                    }
                });
            } 

            return data;
        }catch(error){
            console.log("Error - getSuggestedFriends: ", error);
            return false;
        }

    
        /*
            1 - (Abhay Pratap Singh) : Function created for friend suggestion while friend data fetch from Neo4J system     
            2 - (Abhay Pratap Singh) : Added Joined Date (createdAt) field to response back on front end.   
        */
    }
        

    async searchFriendsData(userId:number){

        try{
            let friendListQuery=`match (user:User)-[fw:friendsWith]-(friend:User{id:'${userId}'})
                                return user, fw `;
            
            console.log(friendListQuery);
            let friendsData=await QueryManager.executeQuery(friendListQuery);
            let friendListData=[];
            friendsData.forEach(async friend => {
                //console.log(friend.get(0));
                let fd=friend.get(0);
                let fw=friend.get(1);

                let {id,userName} = fd.properties;
                let {senderId, status,createdAt, updatedAt} = fw.properties;
                friendListData.push({id,userName, senderId,status, createdAt, updatedAt});
            });
            return friendListData;
        }
        catch(error){
            console.log("Error - searchFriendsData ",error);
            return false;
        }
    }
}

export default new Friends();
