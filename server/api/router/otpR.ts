import express from 'express';
import otp from '../controllers/otpCtrl';

export default express.Router()
    .post('/sendotp',otp.sendOTP)
    .post('/validateotp',otp.validateOTP);