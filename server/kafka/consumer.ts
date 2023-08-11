import {
    KafkaClient as Client,
    Consumer,
    Message,
    Offset,
    OffsetFetchRequest,
    ConsumerOptions } from 'kafka-node';

import sequelize from 'sequelize';
import models from '../api/models/index';
    
import Utility from '../common/utility.service';
//import {CacheService} from '../api/cache/cache.service';
import QueryManager from '../common/neo4j/queryManager';
import Notifications from '../api/notifications/notification.service';
import * as secretConfig from '../common/secret.config.json';
import { Constant } from '../common/app.constant';
const config:any=secretConfig;
const kafkaHost = '13.235.138.186:9092';
const TopicName=["userlastseen","onlinestatus"];


export function kafkaSubscribe(topic: string[]): void {
    const client = new Client({ kafkaHost });
    const topics: OffsetFetchRequest[] = [];
    topic.forEach(t=>{
        topics.push({ topic: t, partition: 0 });
    });
    const options: ConsumerOptions = {
        autoCommit: true,
        fetchMaxWaitMs: 1000,
        fetchMaxBytes: 1024 * 1024  //1 MB
    };

    const consumer = new Consumer(client, topics, options);

    consumer.on('error', function(err: Error): void {
        console.log('error', err);
    });

    client.refreshMetadata(
        topic,
        (err: Error): void => {
            const offset = new Offset(client);

            if (err) {
                throw err;
            }

            consumer.on('message', async function(message: Message) {
                if(message.topic=="userlastseen"){
                    message=JSON.parse(message.value.toString());
                    //console.log(message);
                    const userId=message['id'];
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
                }
                else if(message.topic=="onlinestatus"){
                    console.log("------------------Online Status Topic Execution---------------");
                    //Maintaining online status of user code starts here .
                    message=JSON.parse(message.value.toString());
                    console.log("Data : ",message);
                    const USER_ID=message['id'];
                    const USER_NAME=message['userName'];
                    const MOBILE=message['mobile'];
                    const CURR_DATE_TIME=Utility.getDateTime();
                    
                    const ONLINE_STATUS= false; //await CacheService.getCache(`ONLINE_STATUS_${USER_ID}`);

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
                else{
                    console.log("No Action for topic : ",message.topic);
                }
            });

            /*
             * If consumer get `offsetOutOfRange` event, fetch data from the smallest(oldest) offset
             */
            consumer.on(
                'offsetOutOfRange',
                (topic: OffsetFetchRequest): void => {
                    offset.fetch([topic], function(err, offsets): void {
                        if (err) {
                            return console.error(err);
                        }
                        const min = Math.min.apply(null, offsets[topic.topic][topic.partition]);
                        consumer.setOffset(topic.topic, topic.partition, min);
                    });
                }
            );
        }
    );
}

kafkaSubscribe(TopicName);