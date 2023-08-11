import express from 'express';
import UserCtrl from '../controllers/userCtrl';
import upload from '../../common/muter.config';
import userCtrl from '../controllers/userCtrl';
export default express.Router()
    .get('/', UserCtrl.loggedInUserDetails)    
    .post('/registration', UserCtrl.registerUser)
    .get('/profile', UserCtrl.myProfile)
    .post('/profile', UserCtrl.updateUserProfile)
    .get('/profile/:userId', UserCtrl.userProfile)
    .get('/userdetailsv2/:userId', UserCtrl.getUserDetailsGameV2)
    .post('/profilepic', upload.single('profile'), UserCtrl.uploadProfilePic)
    .post('/bankdetails',UserCtrl.saveBankDetails)
    .get('/bankdetails',UserCtrl.getBankDetails)
    .get('/bankdetailsv2/:userId',UserCtrl.getBankDetailsV2)
    .delete('/bankdetails',UserCtrl.deleteBankDetails) //This is not in use
    .post('/paytmnumber',UserCtrl.savePaytmMobileNum)
    .delete('/paytmnumber',UserCtrl.deletePaytmMobileNum)
    //.get('/leaderboard',UserCtrl.getUserLeaderBoards)
    .post('/blockUnblockUser',UserCtrl.blockUnblockUser)
    .post('/location',UserCtrl.updateLocation)
    .get('/location',UserCtrl.getLocation)
    .post('/usernames/list',UserCtrl.listUsernamesForUserIds)
    .post('/redeemreferral',UserCtrl.redeemReferral)
    .get('/referral/list',UserCtrl.userReferralsList)
    .post('/restoreid',UserCtrl.saveUserRestoreId)
    .post('/kyc',UserCtrl.saveKYCDetails)
    .get('/kyc',UserCtrl.getKYCDetails)
    .post('/creatorsdetails',UserCtrl.acceptUserAsCreatorAgencies)
    .get('/creatorsdashboard',UserCtrl.getCreatorsUserDashboard)
    .get('/updatecreatorstatus',UserCtrl.updateCreatorStatus)
    .get('/velidateuserkyc',UserCtrl.validateUserKYC)
    .post('/reportuser',UserCtrl.reportUser)
    .get('/searchUser',userCtrl.searchUser);
    