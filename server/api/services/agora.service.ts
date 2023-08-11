import {RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole} from 'agora-access-token';

export class Agora{
    
    async generateToken(userId:number, channelName:string){
        try{
            const role = RtcRole.PUBLISHER;
            const expirationTimeInSeconds = 3600
            const currentTimestamp = Math.floor(Date.now() / 1000)
            const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

            const token = RtcTokenBuilder.buildTokenWithUid(process.env.AGORA_APP_ID, process.env.AGORA_APP_CERTIFICATE, channelName, userId, role, privilegeExpiredTs);
            console.log("Agora Token: " + token);
            return token
        }catch(error){
            console.log("Error(generateToken) : ", error);
            return false;
        }
    }
}

export default new Agora();