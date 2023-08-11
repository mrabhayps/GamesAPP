import AWS from 'aws-sdk';
import sequelize from 'sequelize';
import models from '../../api/models/index';
import * as secretConfig  from '../secret.config.json';
import constant, { Constant } from '../app.constant';
let config:any=secretConfig;
//import {CacheService} from '../../api/cache/cache.service';
import EmailService from './email.service';

export  class EC2Service{
    async addInstance(GType){
        // This is use to Create, List and Run a new instance.
        // https://docs.aws.amazon.com/cli/latest/userguide/cli-services-ec2-instances.html -- AWS CLI
        // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html -- Service Details
        
        try{
            //Check if any server available as stop of the game type. than start it. other wise create new instance in AWS.
            //var GameServerInCache=await CacheService.getCache("GameServer");
            var GameServerInCache=null; //await CacheService.getCache("GameServer");
            var IsAvailable=false;
            var index;
            for(var i=0;GameServerInCache && i<GameServerInCache.length;i++){
                if(GameServerInCache[i]['GType']==GType && GameServerInCache[i]['status']==0){
                    //Check whether server is Dead/Stop.
                    let serv=await models.sequelize.query("select status from gmsGameServer where publicIP='"+GameServerInCache[i]['ip']+"' and isRemoved=0",{ type: sequelize.QueryTypes.SELECT});
                    if(serv && serv.length>0 && serv[0]['status']==constant.GServ.Status.Stop){
                        IsAvailable=true;
                        index=i;
                        break;
                    }
                    else{
                        console.log("The server is Dead so we can not make it live Details : ",GameServerInCache[i]);
                    }
                }   
            }//End of stoped server availability check for loop.

            if(!IsAvailable){
                var ec2=new AWS.EC2(config.awsEC2.auth);
                var serverConfigParams=await models.sequelize.query("select * from gmsGameServer where gType="+GType+" and isScaledServer=0 and status in ("+constant.GServ.Status.Ready+","+constant.GServ.Status.Running+") and isRemoved=0",{type: sequelize.QueryTypes.SELECT});
                if(serverConfigParams.length>0){
                    var serverConfig=serverConfigParams[0];
                    var params = {
                        ImageId: serverConfig['imageId'], 
                        InstanceType: serverConfig['instanceType'],
                        KeyName: serverConfig['KeyName'],
                        SubnetId: serverConfig['subNetID'],
                        MaxCount: 1, 
                        MinCount: 1, 
                        TagSpecifications: [{
                            ResourceType: "instance", 
                            Tags: [{
                                Key: "Purpose", 
                                Value: "test"
                            }]
                        }]
                    };

                    ec2.runInstances(params, async function(err, data) {
                        if (err){
                            console.log("Game Type : "+GType+" Scaling Instance create error.");
                            let subject="Scaled GameServer[ T-"+GType+" ] Error !!";
                            let body='<h3>Hi Geeks,</h3> <h5>We are unable to create new game server instance . The details is following.</h5>'+
                            '<h4>Request Param : </h4>'+
                            '<code>'+JSON.stringify(params)+'</code><br/><br/>'+
                            '<h4>Request Error : </h4>'+
                            '<code>'+err+'</code><br/><br/>'+
                            '<b>Thanks & Regards<b><br/>Team-Backend (GamesAPP)';
                            EmailService.SendEmailScaledGameServer(subject,body);
                            console.log(err, err.stack); // an error occurred
                            return false;
                        } 
                        else{
                            console.log(JSON.stringify(data));           // successful response
                            
                            //Manage it into server table.
                            var newInstance:any={};
                            newInstance.publicDNS=data.Instances[0].PublicDnsName;
                            newInstance.publicIP=data.Instances[0].PublicIpAddress;
                            
                            newInstance.privateDNS=data.Instances[0].PrivateDnsName;
                            newInstance.privateIP=data.Instances[0].PrivateIpAddress;
                            newInstance.imageId=data.Instances[0].ImageId;
                            newInstance.instanceType=data.Instances[0].InstanceType;
                            newInstance.KeyName=data.Instances[0].KeyName;
                            newInstance.vpcId=data.Instances[0].VpcId;
                            newInstance.subNetID=data.Instances[0].SubnetId;
                            newInstance.instanceId=data.Instances[0].InstanceId;
                            newInstance.isScaledServer=constant.GServ.IsScaledSerrver.Yes;
                            newInstance.classCat=constant.GServ.ClassCategory.GamesApp;
                            newInstance.gType=GType;
                            newInstance.respData=JSON.stringify(data);
                            newInstance.health=constant.GServ.Health.Good;
                            newInstance.healthCheckTime="Now()";
                            newInstance.createdAt="Now()";
                            newInstance.status=constant.GServ.Status.Running;
                            try{
                                console.log("Adding new instance ");
                                var instance=await models.gmsGameServer.build(newInstance).save();
                                //Maintan  the instance into cache to create/distribute the session for socket connection.
                                //PublicIP,GameType, Status and Active Session.
                                //var GameServerList=await CacheService.getCache("GameServer");
                                var GameServerList=null ;
                                if(GameServerList)
                                    GameServerList.push({"ip":newInstance.publicIP,"status":1,"GType":GType,"ActiveSession":0});
                                else{
                                    //I think This block will never execute but we keep this because if any reason cache deleted then it will work.
                                    GameServerList=[{"ip":newInstance.publicIP,"status":1,"GType":GType,"ActiveSession":0}];
                                }
                                //await CacheService.setCache("GameServer",JSON.stringify(GameServerList));

                                //Send Mail of created instance.
                                let subject="Scaled GameServer[ T-"+GType+","+newInstance.imageId+" , "+newInstance.instanceId+" ]";
                                let body='<h3>Hi Geeks,</h3> <h5>The new game server instance created successfully. The details is following.</h5>'+
                                '<code>'+JSON.stringify(data)+'</code><br/><br/>'+
                                '<b>Thanks & Regards<b><br/>Team-Backend (GamesAPP)';
                                EmailService.SendEmailScaledGameServer(subject,body);

                            }
                            catch(error){
                                console.log("DB error Add New Instance ");
                                console.log(error)
                            }

                            // Trigger the Email/SMS of created new instance.
                            return data.Instances[0].InstanceId;;
                        }//End of EC2 else block.   
                }); //End of ec2 run instance.
                }//End of if statement.
                else{
                    console.log("No any server available to scale here GameType : "+GType);
                    return false;
                }  
            }//End of isAvailable if block
            else{
                try{
                    //Make active in cache.
                    GameServerInCache[index]['status']=1;
                    //CacheService.setCache("GameServer",JSON.stringify(GameServerInCache));

                    //Update in DB as running.
                    let update=await models.sequelize.query("UPDATE gmsGameServer set status="+constant.GServ.Status.Running+" where publicIP='"+GameServerInCache[index]['ip']+"' Limit 1",{ type: sequelize.QueryTypes.UPDATE});
                    console.log("Existing stoped game server successfully activated as running.",GameServerInCache[index]);

                    return true;    
                }
                catch(error){
                    console.log("Error in available server block");
                    console.log(error);
                    return false;
                }
                
            }//End of available else block.
                     
        }//End of try block.
        catch(error){
            console.log("Error (createNewInstance) Gtype : "+GType);
            console.log(error);
            return false;
        }//End of catch block.
    }

    async inactiveInstanceInCache(publicIP){
        //It can not remove any instance directoly.
        //It will stop in DB server table.
        //It will set as Inactive in Cache. Therefore no any session will dstribute here.
        //It will remove from the cron. When total active session get zero.

        try{
            //DB Process
            let update=await models.sequelize.query("UPDATE gmsGameServer set status="+constant.GServ.Status.Stop+" where publicIP='"+publicIP+"' LIMIT 1",{ type: sequelize.QueryTypes.UPDATE});

            //In active in Cache .
            //var GameServerList=await CacheService.getCache("GameServer");
            var GameServerList=null;
            for(var i=0;GameServerList && i<GameServerList.length;i++){
                if(GameServerList[i]['ip']==publicIP)
                {
                    GameServerList[i]['status']=0;
                    break;
                }
            }
            //await CacheService.setCache("GameServer",JSON.stringify(GameServerList));
            return true;
        }
        catch(error){
            console.log("Error (removeInstanceFromCache) ",error);
            return false;
        }        
    }
    async describeInstance(){
        try{
            var ec2=new AWS.EC2(config.awsEC2.auth);
            ec2.describeInstances({
                InstanceIds: [
                   "i-08a3f9a1fa62abfd4"
                ]
               }, function(err, data) {
                if (err){
                    console.log(err, err.stack); // an error occurred
                }
                else{
                    console.log(JSON.stringify(data)); // successful response
                }     
            });
        }
        catch(error){
            console.log("Error (describeInstance) Gtype");
            console.log(error);
        }
        

    }

    async updateServerHealth(publicIP,health,cpuLoad){
        try{
            var status=health==constant.GServ.Health.Good?constant.GServ.Status.Running:constant.GServ.Status.Dead;
            
            //Maintain it in Data Base. 
            console.log("Updating server health Public IP : "+publicIP+" Health : "+health+" CPU Load : "+cpuLoad+"  Status : "+status);
            let update=await models.sequelize.query("UPDATE gmsGameServer set health="+health+", cpuLoad='"+cpuLoad+"', status="+status+", healthCheckTime=NOW() where publicIP='"+publicIP+"' LIMIT 1",{ type: sequelize.QueryTypes.UPDATE});

            //Maintain Status in Cache for public IP.
            status=status==constant.GServ.Status.Running?1:0;
            //var GameServerList=await CacheService.getCache("GameServer");
            var GameServerList=null;
            for(var i=0;GameServerList && i<GameServerList.length;i++){
                if(GameServerList[i]['ip']==publicIP)
                {
                    GameServerList[i]['status']=status;
                    //await CacheService.setCache("GameServer",JSON.stringify(GameServerList));
                    break;
                }
            }
            return true;
        }
        catch(error){
            console.log("Error updateServerHealth() Public IP : "+publicIP+" Health : "+health);
            console.log(error);
            return false;
        }
    }

    async getInstanceId(publicIP){
        try{
            let data=await models.sequelize.query("select instanceId from gmsGameServer  where publicIP='"+publicIP+"' ",{ type: sequelize.QueryTypes.SELECT});
            return data.length>0?data[0]['instanceId']:false;
        }
        catch(error){
            console.log("Error getInstanceId() Public IP : "+publicIP);
            return false;
        }
    }
    async isScaledGameServer(publicIP){
        try{
            let data=await models.sequelize.query("select isScaledServer from gmsGameServer  where publicIP='"+publicIP+"' ",{ type: sequelize.QueryTypes.SELECT});
            return data && data.length>0 && data[0]['isScaledServer']==1?"YES":"NO";
        }
        catch(error){
            console.log("Error isScaledGameServer() Public IP : "+publicIP);
            return false;
        }
    }
}

export default new EC2Service();
