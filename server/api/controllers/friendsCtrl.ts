import { Request, Response } from 'express';
import helper from '../../common/helper';
import friends from '../services/friends.service';
import Constant from '../../common/app.constant';
import Notifications from '../notifications/notification.service';

export class FriendsCtrl{
    async sendFriendRequest(req:Request, res:Response){
        try{
            let userDetail = req.headers.data;
            let friendId:number = null;
            if("friendUsername" in req.body &&  req.body.friendUsername != ""){
                if (userDetail['username'] == req.body.friendUsername){
                    await helper.sendJSON(res, {}, true, 502, "You can't make friend with yourself.", 1);
                    return;    
                }
                const userData = await helper.getColsValue("gmsUsers", ["id","mobile", "username"], {"username": req.body.friendUsername});
                friendId = userData[0]['id'];
            }else{
                friendId = req.body.friendId;
                if (userDetail['id'] == friendId){
                    await helper.sendJSON(res, {}, true, 502, "You can't make friend with yourself.", 1);
                    return;    
                }
            }
            //let result = await friends.createFriendRequest(userDetail['id'], friendId);
            let resultNeo = await friends.createFriendRequestV1(userDetail['id'], friendId);
            if (resultNeo == 'EXISTS'){
                await helper.sendJSON(res, {}, true, 502, "You have already sent friend request !!", 1);
            } else if (resultNeo == 'ERROR'){
                await helper.sendJSON(res, {}, true, 502, "Sorry! We are not able to send friend reqeust.", 1);   
            } else {
                const friendData = await helper.getColsValue("gmsUsers", ["username"], { id: friendId });
                const friendName = friendData[0].username;
                const notification = {
                    title: "Hey! You have a notification",
                    body: userDetail['userName'] + " wants to add you as Friend."
                };
                const notificationData:any = {
                    "notificationType": "FRIEND_REQUEST",
                    "message": userDetail['userName'] + " wants to add you as Friend. Open app to accept their request.",
                    "userId" : `${userDetail['id']}`
                }
                await Notifications.sendPushNotification(friendId, notificationData, notification);
                //await helper.sendJSON(res, {}, false, 200, "Friend request sent successfully.", 1); 
                await helper.sendJSON(res, {}, false, 200, `Your request to add ${friendName} as a friend is successfully sent.`, 1);
            }
        }catch(error){
            await helper.sendJSON(res, {}, true, 502, "Sorry! We are not able to send friend reqeust.", 1);  
        }
    }

    async acceptFriendRequest(req:Request, res:Response){
        try{
            let userDetail = req.headers.data;
            let friendId:number = req.body.friendId;
            //let data = await friends.updateFriendRequest(userDetail['id'], friendId, req.body.status);
            let dataNeo = await friends.updateFriendRequestv1(userDetail['id'], friendId);
            if (!dataNeo){
                helper.sendJSON(res, {}, true, 200, "Sorry! We are not able to accept friend reqeust. Can you please try again later !", 1);
            }
            else if(dataNeo=="invalid"){
                helper.sendJSON(res, {}, true, 200, "Sorry! We are not able to accept friend reqeust. Please try with right friend id !", 1);
            }
            else if(dataNeo=="success"){
                const friendData = await helper.getColsValue("gmsUsers", ["username"], { id: friendId });
                const friendName = friendData[0].username;
                const notification = {
                    title: "Hey! You have a notification",
                    body: userDetail['userName'] + " added you as a Friend. Open Gamesapp and start playing together."
                };
                const notificationData:any = {
                    "notificationType": "FRIEND_ACCEPT",
                    "message": userDetail['userName'] + " added you as a Friend. Open Gamesapp and start playing together.",
                    "userId" : `${userDetail['id']}`
                }
                await Notifications.sendPushNotification(friendId, notificationData, notification);
                //await helper.sendJSON(res, {}, false, 200, "You have accepted the friend request.", 1);   
                await helper.sendJSON(res, {}, false, 200, `You have added ${friendName} as a friend.`, 1);
            }
            else{
                console.log("Do nothing.");
            }
        }catch(error){
            await helper.sendJSON(res, {}, true, 200, "Sorry! We are not able to accept friend reqeust. Can you please try again later!", 1); 
        }
        
    }

    async unfriend(req:Request, res:Response){
        try{
            let userDetails = req.headers.data;
            let friendId:number = req.body.friendId;
            let status=await friends.doUnFriend(userDetails['id'],friendId);
            if(status){
                //helper.sendJSON(res, {}, false, 200, "Successfully unfriend.", 1);
                const friendData = await helper.getColsValue("gmsUsers", ["username"], { id: friendId });
                const friendName = friendData[0].username;
                helper.sendJSON(res, {}, false, 200, `You have removed ${friendName} from your friends.`, 1); 
            }
            else{
                helper.sendJSON(res, {}, true, 200, "Unable to unfriend both users !!", 1); 
            }            
        }catch(error){
            helper.sendJSON(res, {}, true, 200, "Unable to unfriend both users !!", 1); 
        }
        
    }

    async userFriendsList(req:Request, res:Response){
        try{
            let userDetail = req.headers.data;
            let data:any = {}
            let requestsList:any = {}
            let page = +req.query.page || 1;
            let page_size = +req.query.page_size || 20;
            
            if(page > 1) {
                //let friendsList = await friends.getFriendsList(userDetail['id'], Constant.FriendRequestStatus.Accepted, true, page, page_size);
                let friendsList =await friends.getFriendsListV1(userDetail['id'],Constant.FriendRequestStatus.Accepted,true,page,page_size);
                data.friendsList = await friends.sortFriendByOLStatus(friendsList);
                await helper.sendJSON(res, data, false, 200, "User's friends list fetched successfully", 1);
            } else {
                //let friendsList = await friends.getFriendsList(userDetail['id'], Constant.FriendRequestStatus.Accepted);
                let friendsList =await friends.getFriendsListV1(userDetail['id'],Constant.FriendRequestStatus.Accepted);
                if(friendsList && friendsList.length > 0){
                    data.friendsList = await friends.sortFriendByOLStatus(friendsList);
                    let friendRequestsList = await friends.getFriendRequestsListV1(userDetail['id'], Constant.FriendRequestStatus.Requested);
                    
                    requestsList.totalRequests =friendRequestsList.length;
                    requestsList.data = friendRequestsList;
                    data.requestsList = requestsList; 
                    await helper.sendJSON(res, data, false, 200, "User's friends list fetched successfully", 1);
                }else{
                    await helper.sendJSON(res, [], true, 200, "You don't have any friends list", 0);
                }    
            }
            
        }catch(error){
            await helper.sendJSON(res, [], true, 200, "You don't have any friends list", 0);
        }
    }
    
    async userFriendRequestsList(req:Request, res:Response){
        let userDetail = req.headers.data;
        let data:any = {}
        let requestsList:any = {}
        //let friendRequestsList = await friends.getFriendRequestsList(userDetail['id'], Constant.FriendRequestStatus.Requested);
        let friendRequestsListNeo = await friends.getFriendRequestsListV1(userDetail['id'],Constant.FriendRequestStatus.Requested);
        if(friendRequestsListNeo && friendRequestsListNeo.length > 0){
            requestsList.totalRequests = friendRequestsListNeo.length;
            requestsList.data = friendRequestsListNeo;
            data.requestsList = requestsList; 
            await helper.sendJSON(res, data, false, 200, "User's friend requests fetched successfully", 1);
        }else{
            await helper.sendJSON(res, [], true, 200, "You don't have any friend requests", 0);
        }    
    }

    async recentlyPlayedUsersList(req:Request, res:Response){
        let page = +req.query.page || 1;
        let page_size = +req.query.page_size || 50;

        console.log("RecentlyPlayedUsersList page: ", page);
        let userDetail = req.headers.data;
        let data = await friends.getRecentlyPlayedUsersV1(userDetail['id'], page, page_size);
        if(data && data.length > 0){
            await helper.sendJSON(res, data, false, 200, "User's friend requests fetched successfully", 1);
        }else{
            await helper.sendJSON(res, [], true, 200, "You don't have any recent players", 0);
        }  
    }

    async suggestedFriendsList(req:Request, res:Response){
        try{
            let userDetail = req.headers.data;
            let friendsList = req.body.friendsList;
            console.log(friendsList);
            let syncType = req.body.syncType;
            if (friendsList.length > 0){
                let data = await friends.getSuggestedFriendsV1(userDetail, syncType, friendsList);
                if (data && data.length > 0){
                    await helper.sendJSON(res, data, false, 200, "Suggested friends fetched successfully.", 1);
                }else{
                    await helper.sendJSON(res, [], true, 200, "Sorry! We are not able to get suggested friends.", 0);
                }
            }else{
                await helper.sendJSON(res, [], true, 200, "Sorry! We are not able to get suggested friends.", 0);
            }
        }catch(error){
            console.log("Error - suggestedFriendsList: ", error);
            await helper.sendJSON(res, [], true, 200, "Sorry! We are not able to get suggested friends.", 0);
        }
    }   
}
export default new FriendsCtrl();
