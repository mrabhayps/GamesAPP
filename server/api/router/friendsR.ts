import express from 'express';
import friends from '../controllers/friendsCtrl';

export default express.Router()
    .post('/sendrequest', friends.sendFriendRequest)
    .post('/acceptrequest', friends.acceptFriendRequest)
    .post('/unfriend', friends.unfriend)
    .get('/friendslist', friends.userFriendsList)
    .get('/requestslist', friends.userFriendRequestsList)
    .get('/recentlyplayed', friends.recentlyPlayedUsersList)
    .post('/suggested', friends.suggestedFriendsList);