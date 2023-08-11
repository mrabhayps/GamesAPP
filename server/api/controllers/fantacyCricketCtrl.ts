import { Request, Response } from 'express';
import models from '../models/index';
import helper from '../../common/helper';
import CommonService from '../services/common.service';
import CricketMatch from '../services/cricketMatch.service';
import MatchContest from '../services/cricketMatchContest.service';
import Constant from '../../common/app.constant';
import MasterPayment from '../services/payment/master.service';
import PaymentUtils from '../services/payment/helper';
import EverybodyWinsService from '../services/everyBodyWins.service';
import * as secretConfig  from '../../common/secret.config.json';
import cricketMatchContestService from '../services/cricketMatchContest.service';
import commonService from '../services/common.service';
let config:any = secretConfig;

export class FantacyCricket{
    async getHomePageData(req:Request, res:Response){
        let userDetails = req.headers.data;
        
        let tab:number = +req.query.tkey;
        try{
            let homeData:any = {};
            if(tab == 1){
                let userJoinedMatches = await CricketMatch.getUserJoinedMatches(userDetails['id']);
                homeData = await CricketMatch.getAllMatchesList(userDetails['id'], Constant.FantacyCricket.MatchStatus.schedule, userJoinedMatches);
                homeData.gameName = "Cricket Fantacy";
                helper.sendJSON(res, homeData, false, 200, "All Matches Data Listed Successfully.", 1, true);
            }//End of All Matches matches.
            else if (tab == 2){
                let userJoinedMatches = await CricketMatch.getUserJoinedMatches(userDetails['id']);
                homeData.myMatchUpcomming = await CricketMatch.getMyMatchesList(userDetails['id'], [Constant.FantacyCricket.MatchStatus.schedule],userJoinedMatches);
                homeData.myMatchLive = await CricketMatch.getMyMatchesList(userDetails['id'], [Constant.FantacyCricket.MatchStatus.live],userJoinedMatches);
                homeData.myMatchFinished = await CricketMatch.getMyMatchesList(userDetails['id'], [Constant.FantacyCricket.MatchStatus.complete, Constant.FantacyCricket.MatchStatus.acnr],userJoinedMatches);
                homeData.gameName = "Cricket Fantacy";
                helper.sendJSON(res, homeData, false, 200, "My Matches Data Listed Successfully.", 1, true);
            }// End of My matches.
            else{
                helper.sendJSON(res, [], true, 200, "You must provide tab key.", 0);
            }  
        }
        catch(error){
            console.log("User Id : "+userDetails['id']+" Match Home API ERROR .");
            helper.sendJSON(res, [], true, 200, "Server Side Error !", 0);
        }
             
    }

    //Get list of match contest .
    async getMatchContest(req:Request, res:Response){
        var userDetail = req.headers.data;
        var matchId = +req.query.matchId;
        var isMyContest=req.query.isMyContest;

        try{
            let matchData = await helper.getColsValue("gmsFantacyCricketMatch", ["status","verified"], {"matchId":matchId});
            let matchStatus = matchData[0]['status'];
            let matchVerified = matchData[0]['verified'];
            let contestData = await MatchContest.getContestByMatchId(matchId);
            if(contestData){
                let joinedContestData= await MatchContest.getUserJoinedContest(userDetail['id'], matchId);
                let joinedContest = joinedContestData['joinedContest'];
                let joinedContestTeam = joinedContestData['joinedContestTeam'];

                /*console.log("Joined COntest ")
                console.log(joinedContest);

                console.log("Joined COntest team ")
                console.log(joinedContestTeam);*/


                //Set user team associated with the contest.

                for(let i=0; i<contestData.length; i++){
                    contestData[i]['joinedUserTeam']=[];
                    const teamList = joinedContestTeam.filter(contest => contest.fkContestId == contestData[i]['id']);
                    
                    /*console.log("teamList : ");
                    console.log(teamList)*/

                    if(teamList && teamList.length > 0){
                        contestData[i]['joinedUserTeam'] = [...new Set(teamList.map(team => team.title))]; 
                    }
                    
                }
                
                if(isMyContest || matchStatus!=Constant.FantacyCricket.MatchStatus.schedule){
                    //Get user Contest
                    let userContestData:Array<any> = []
                    for(let i=0;i<contestData.length;i++){
                        if(joinedContest.indexOf(contestData[i]['id'])!= -1){
                            /*contestData[i].rankDescription =  contestData[i]['rankDescription'].split("{{}}");
                            contestData[i].prizeDescription =  contestData[i]['prizeDescription'].split("{{}}");
                            contestData[i].prizeMoney = await CricketMatch.getTotalPrizeMoney(userDetail['id'], matchId, contestData[i]['id']);*/
                            userContestData.push(contestData[i]);
                            if (userContestData.length == joinedContest.length){
                                break;
                            }
                        }
                    }
                    helper.sendJSON(res, userContestData, false, 200, "User Contest Data Listed Successfully.", userContestData.length, true);
                }else{
                    //Get All Contest.
                    let allContestData:Array<any> = []
                    let availableEveryBodyWinsAmount=await EverybodyWinsService.getUserAvailableEverybodyWins(userDetail['id']);
                    for(let i=0;i<contestData.length;i++){
                        
                        if(joinedContest.indexOf(contestData[i]['id'])== -1 && contestData[i]['maxUserTeam']>contestData[i]['totalUserTeam']){
                            /*contestData[i].rankDescription =  contestData[i]['rankDescription'].split("{{}}");
                            contestData[i].prizeDescription =  contestData[i]['prizeDescription'].split("{{}}");
                            contestData[i].prizeMoney = await CricketMatch.getTotalPrizeMoney(userDetail['id'], matchId, contestData[i]['id']);*/
                            if(contestData[i]['contestType']==4){//Every Body Wins
                                availableEveryBodyWinsAmount<contestData[i]['entryFee']?allContestData.push(contestData[i]):false;
                            }
                            else{
                                allContestData.push(contestData[i]);
                            }
                        }
                    }
                    helper.sendJSON(res,allContestData, false, 200, "All Contest Data Listed Successfully.", contestData.length, true);
                }
            }
            else{
                console.log("Match Id : "+matchId+" No contest found of this match .");
                helper.sendJSON(res, [], false, 200, "No contest found of this match .", 0);
            }
        }//End of try block.
        catch(error){
            console.log("Match Id : "+matchId+" Contest API ERROR .");
            console.log(error);
            helper.sendJSON(res, [], true, 200, "Server Side Error !", 0);
        }//End of catch block.
        
    }
    
    async getContestInfo(req:Request, res:Response){
        var userDetail = req.headers.data;
        var contestId = +req.query.contestId;
        try{
            let contest = await helper.getColsValue("gmsFantacyCricketContest", ["fkContestConfigId",
            "fkMatchId","minUserTeam","totalUserTeam","rankDescription","prizeDescription","status","isPrizeDistributionDone","entryFee","contestType","totalUserTeam","fkPDId"], {"id":contestId});
            if(contest && contest.length>0){
                var contestStatus=contest[0]['status'];
                var prizeDistribution=contest[0]['isPrizeDistributionDone'];
                var entryFee=contest[0]['entryFee'];
                //var rankingStatus=[30,40,50,60,70];
                var statsStatus=[30,40,50,60,70];

                var contestInfo:any={};

                // Prize Breakup start here .
                var prizeBreakup:any = {};

                //Default Prize breakup.
                let defaultPrizeBreakup:any = {};
                defaultPrizeBreakup.rankDescription=contest[0]['rankDescription'].split("{{}}");
                defaultPrizeBreakup.prizeDescription=contest[0]['prizeDescription'].split("{{}}");
                prizeBreakup.default = defaultPrizeBreakup;

                //Manual Prize breakup.
                if(contest[0]['totalUserTeam']>=contest[0]['minUserTeam']){
                    try{
                        /*await new Promise((resolve,reject)=>{
                            request(config.fantacyContestConfig + '' + contest[0]['fkContestConfigId'] + '/'+contest[0]['totalUserTeam'], { json: true ,rejectUnauthorized:false}, async (err, resp, body) => {
                                if (err) { 
                                    console.log(err); 
                                    reject(err);
                                }else{
                                    let manualPrizeBreakup:any = {};
                                    manualPrizeBreakup.rankDescription=resp.body.data?resp.body.data.rankDescription.split("{{}}"):[];
                                    manualPrizeBreakup.prizeDescription=resp.body.data?resp.body.data.prizeDescription.split("{{}}"):[];
                                    prizeBreakup.manual=manualPrizeBreakup;
                                    resolve(true);
                                }
                                
                            });//End of request. 
                        });//End Of Promise.*/
                        
                        let priceBreakupData=await cricketMatchContestService.contestPrizeBreakupLive(contest[0]['entryFee'],contest[0]['contestType'],contest[0]['totalUserTeam'],contest[0]['fkPDId'])
                        //console.log(priceBreakupData);

                        let manualPrizeBreakup:any = {};
                        manualPrizeBreakup.rankDescription=priceBreakupData['rankDescription'].split("{{}}");
                        manualPrizeBreakup.prizeDescription=priceBreakupData['prizeDescription'].split("{{}}");
                        prizeBreakup.manual=manualPrizeBreakup;
                        
                    }
                    catch(error){
                        console.log("Prize breakup API error from Admin Panel.");
                        console.log(error);
                    }
                }

                contestInfo.prizeBreakup = prizeBreakup;
                //Prize breakup end here. 


                //Get leaderboard of contest.
                contestInfo.leaderBoard=[];
                /*if(rankingStatus.indexOf(contestStatus)>=0){
                    let lbdata = await MatchContest.getContestLeaderBoard(contestId, userDetail['id']);                    
                    contestInfo.leaderBoard=lbdata?lbdata:[];
                }*/

                let lbdata = await MatchContest.getContestLeaderBoard(contestId, userDetail['id']);                    
                contestInfo.leaderBoard=lbdata?lbdata:[];
                
                //Contest stats of user. 
                contestInfo.stats={};
                if(statsStatus.indexOf(contestStatus)>=0){
                    var stats=await MatchContest.getMatchAndContestStats(contest[0]['fkMatchId'], contestId);
                    contestInfo.stats=stats;
                }

                //List of team coresponding to  user which has been joined in contest.
                var joinedTeam=await MatchContest.getUserJoinedTeamInContest(userDetail['id'],contestId);
                contestInfo.joinedTeam=joinedTeam?joinedTeam:[];


                //Contest info status msg
                if(contestStatus==10 || contestStatus==20){
                    contestInfo.statusMsg="Upcoming";
                }
                else if(contestStatus==30){
                    contestInfo.statusMsg="Live";
                }
                else if(contestStatus==40 || contestStatus==50 || contestStatus==60){
                    let amount=await MatchContest.getPrizeDistributionAmount(3,userDetail['id'],contestId);
                    if(prizeDistribution==40){
                        contestInfo.statusMsg="Cancelled, Entry fee will refund Soon.";
                    }
                    else if(prizeDistribution==50 || prizeDistribution==70){
                        contestInfo.statusMsg="Cancelled, Entry fee Refunded.";
                    }
                    if(amount)
                        contestInfo.statusMsg=contestInfo.statusMsg+" Amount : "+amount
                }
                else if(contestStatus==70){
                    let amount=await MatchContest.getPrizeDistributionAmount(1,userDetail['id'],contestId);
                    if(prizeDistribution==20){
                        contestInfo.statusMsg="Finished, Winning amount will credit soon.";
                    }
                    else if(prizeDistribution==30 || prizeDistribution==60){
                        contestInfo.statusMsg="Finished, Winning amount credited.";
                    }
                    
                    if(amount)
                        contestInfo.statusMsg=contestInfo.statusMsg+" Amount : "+amount;
                }
                else{
                    contestInfo.statusMsg="Abandoned";
                }

                helper.sendJSON(res, contestInfo, false, 200, "Contest Info Listed Successfully .", 0,true);
            }
            else{
                console.log("Contest Id : "+contestId+" Not exist ! .");
                helper.sendJSON(res, {}, false, 200, "Contest Id not Exist.", 0);
            }
        }
        catch(error){
            console.log("Contest Id : "+contestId+" Contest info API ERROR .");
            console.log(error);
            helper.sendJSON(res, {}, true, 200, "Server Side Error !", 0);
        }
    }

    async getMatchPlayerSquad(req:Request, res:Response){
        let matchId = req.query.matchId;        
        let cid = req.query.cid
        
        // let isPlaying11Update = await CommonService.isPlaying11Update(matchId);
        
        let matchPlayerSquad = await CricketMatch.getMatchPlayerSquad(cid, matchId);        

        if(matchPlayerSquad && matchPlayerSquad.length > 0){
            let playerSquad = await CommonService.buildPlayerSquadResponse(matchPlayerSquad); 
            helper.sendJSON(res, playerSquad?playerSquad:[], false, 200, "Match player squad data listed successfully", 0);       
        }else{
            helper.sendJSON(res, [], true, 200, "Match squad is not existed! ", 0);
        }
    } 
    
    async createUserContestTeam(req:Request, res:Response){
        const userDetails = req.headers.data;
        let userId = userDetails['id'];
        let teamPlayers = req.body.player;
        let contestId = req.body.contestId;
        let matchId = +req.body.matchId;
        

        if(teamPlayers.length==11 && await MatchContest.getCaptainAndVCaptainFlag(teamPlayers)){
            var matchDetails=await helper.getColsValue("gmsFantacyCricketMatch",["status","preSquad"],{"matchId":matchId});
            if(!matchDetails || matchDetails.length==0 || matchDetails[0]['status']!=1 || matchDetails[0]['preSquad']!=1 ){
                console.log("You cann't create/edit team now . Entry has been Stop !! Match Id : "+matchId+", User Id : "+userId);
                helper.sendJSON(res, [], true, 502, "You cann't create team now . Entry has been stop !!", 0);    
                return;
            }
            
            
            let teamCode = req.body.teamCode=="" || !req.body.teamCode?Date.now():req.body.teamCode;
            let isPost = req.body.teamCode=="" || !req.body.teamCode?true:false;
            /*
            //Generate the team name.
            title = await CricketMatch.generateTeamName(userId, req.body.matchId, req.body.teamCode);
            */
            var title="";
            var TeamExistence=[];
            if(!isPost){
                TeamExistence=await helper.getColsValue("gmsFantacyCricketUserTeam",["teamCode","fkContestId","title"],{"teamCode":teamCode});
                if(TeamExistence.length>0){
                    console.log("Team Code : "+teamCode+" already exists."); 
                    title =TeamExistence['0']['title'];
                }
                else{
                    console.log("Team Code : "+teamCode+" not exist . Invalid Request !!");
                    helper.sendJSON(res, [], true, 502, "Team Code not exist . Invalid Request !!", 0);    
                    return;
                }
            }
            else{
                //Generate the team name.
                title = await CricketMatch.generateTeamName(userId, req.body.matchId, req.body.teamCode);
            }
            
            
            let flag = true;
            
            var teamCountInContest=0;
            var isNewTeamJoin=false;

            //Entry Fee deduction and contest Check handle start here.
            if(contestId != undefined  && contestId != "" && contestId != "string" && isPost){
                if(!await MatchContest.joinedContestByTeamCode(contestId,teamCode)){
                    console.log("Sorry, You can't join , already Joined team and contest !! TeamCode : "+teamCode+", Contest Id : "+contestId);
                    helper.sendJSON(res, [], true, 202, "Sorry, You can't join , already Joined team and contest !!", 1);
                    return;
                }
                else{
                    isNewTeamJoin=true;
                    var contestData=await helper.getColsValue("gmsFantacyCricketContest",["maxUserTeam","userTeamCount","totalUserTeam"],{"id":contestId});
                    //let currentParticipent = await MatchContest.getTotalParticipent(contestId);
                    
                    //This is total number of specific user team which has been joined in contest.
                    let userCurrentTeam = await MatchContest.getTotalParticipent(contestId, userId);
                    
                    if(contestData.length==0 || userCurrentTeam === false){
                        flag = false;
                        helper.sendJSON(res, [], true, 502, "DB Error !", 1);    
                    }
                    else{
                        //This is Total num. of team of all user.
                        let totalJoinedUserTeam=contestData[0]['totalUserTeam'];

                        let maxTeam = contestData[0]['maxUserTeam'];
                        let userTeamCount = contestData[0]['userTeamCount'];
                        if(totalJoinedUserTeam + 1 > +maxTeam){
                            flag = false;
                            helper.sendJSON(res, [], true, 200, "Sorry, Contest has been full.", 1);
                            return;
                        }
                        else if(userCurrentTeam + 1 > +userTeamCount){
                            flag = false;
                            helper.sendJSON(res, [], true, 200, "You have reached your max team limit.", 1);
                            return;
                        }
                    }

                    //Payment 
                    if(flag){
                        const gameplay = await MasterPayment.shouldGamePlayBegin(userDetails, matchId, Constant.GameEngine.CricketFantacy, contestId,teamCode);
                        console.log("shouldGamePlayBegin service response: ", gameplay);
                        if (gameplay['statusCode'] == 500 || gameplay['statusCode'] == 502) {
                            flag=false;
                            helper.sendJSON(res, gameplay['data'], gameplay['error'], gameplay['statusCode'], gameplay['message'], gameplay['recordTotal']);
                            return;
                        }
                    }
                }
            }
            if(flag){
                var refTeamCodeData =null;
                if(!isPost){
                    /*let userTeamData = await helper.getColsValue("gmsFantacyCricketUserTeam", ['fkContestId'], {"teamCode":teamCode});
                    contestId = userTeamData && userTeamData.length > 0 ? userTeamData[0]['fkContestId']:null;*/
                    contestId=TeamExistence[0]['fkContestId'];
                    
                    //Check If referance  team Available
                    refTeamCodeData = await MatchContest.getTeamCodeByRefTeamcode(teamCode);
                
                }

                        
                for(let i = 0; i < teamPlayers.length; i++){
                    
                    let teamPlayer:any = {};
                    teamPlayer.teamCode = teamCode;
                    teamPlayer.fkUserId = userId;
                    teamPlayer.fkMatchId = matchId;
                    teamPlayer.fkContestId = contestId==""?null:contestId;
                    teamPlayer.title = title;
                    teamPlayer.fkPlayerId = teamPlayers[i]['playerId'];
                    teamPlayer.role = teamPlayers[i]['designation'];
                    teamPlayer.isCaption = teamPlayers[i]['isCaption'];
                    teamPlayer.isViceCaption = teamPlayers[i]['isViceCaption'];
                    teamPlayer.fkTeamId = teamPlayers[i]['teamId'];
                    let condition={"teamCode":teamCode, "fkPlayerId":teamPlayers[i]['playerId']};
                    
                    try{
                        await models.gmsFantacyCricketUserTeam
                        .findOne({ where: condition })
                        .then(async function(obj) {
                            if(obj)
                            {
                                // update
                                await obj.update(teamPlayer);
                            }
                            else{
                                //insert
                                await models.gmsFantacyCricketUserTeam.create(teamPlayer);
                            }
                        });
                        
                        /*
                        //Check If referance  team Available
                        let teamCodeData = await MatchContest.getTeamCodeByRefTeamcode(teamCode);
                        */
                        
                        if(refTeamCodeData && refTeamCodeData.length > 0){
                            for(let j = 0; j < refTeamCodeData.length; j++){
                                console.log("Updating Player for Team Code : ", refTeamCodeData[j]['teamCode']);
                                let othersTeamCondition = {"teamCode":refTeamCodeData[j]['teamCode'],"fkPlayerId":teamPlayers[i]['playerId']};
                                teamPlayer.teamCode = refTeamCodeData[j]['teamCode'];
                                teamPlayer.refTeamCode = teamCode;
                                teamPlayer.fkContestId = refTeamCodeData[j]['fkContestId'];
                                await models.gmsFantacyCricketUserTeam
                                .findOne({ where: othersTeamCondition })
                                .then(async function(obj) {
                                    if(obj)
                                    {
                                        // update
                                        await obj.update(teamPlayer);
                                    }
                                    else{
                                        //insert
                                        await models.gmsFantacyCricketUserTeam.create(teamPlayer);
                                    }
                                });
                            }
                        }
                        else{
                            console.log("No Referance team available For team code " + teamCode);
                        }
                    }
                    catch(error){
                        console.log(error);

                        //Roleback Payment .
                        if(isNewTeamJoin){
                            let refund=await MasterPayment.refundContestEntryFee(userId,matchId,contestId,teamCode);
                            if(refund)
                                console.log("Refund Successfull.");
                            else    
                                console.log("Unable to make refund User Id : "+userId+", Match Id : "+matchId+", Contest Id : "+contestId+", teamCode : "+teamCode);
                        }

                        helper.sendJSON(res, [], true, 500, "Unable To Create Team For Contest, DB Error. . .!", 0);
                        return;
                    }
                }//End of for loop

                if(!isPost){
                    let data = await MatchContest.removePlayerFromTeam(teamCode, teamPlayers);
                }

                //Increment count in contest table.
                if(isNewTeamJoin){
                    teamCountInContest=contestData[0]['totalUserTeam']+1;
                    await MatchContest.updateConttesttotalUserTeam(contestId,teamCountInContest);

                }

                helper.sendJSON(res, [], false, 200, "Team For Contest Created Successfully", 1);
            }
        }//End of if block (request body check player count and C/VC count)
        else{
            console.log("Invalid request of players !! , User Id: "+userDetails['id']+", Team Player : ",teamPlayers)
            helper.sendJSON(res, [], true, 202, "Invalid request of players !!", 0);
        }//End of else block (request body check player count and C/VC count)
    }

    async getMatchStats(req:Request, res:Response){
        let userdetails = req.headers.data;
        let matchId = +req.query.matchId;
        try{
            var stats=await MatchContest.getMatchAndContestStats(matchId);
            helper.sendJSON(res, stats, false, 200, "Match stats data listed successfully.", 0);
        }
        catch(error){
            console.log("Match Id : "+matchId+" Match Stats API ERROR .");
            helper.sendJSON(res, {}, true, 200, "Server Side Error !", 0);
        }
    }

    async getUserTeamList(req:Request, res:Response){
        let matchId = +req.query.matchId;
        let userDeatils = req.headers.data;
        let respData = [];
        let data = await MatchContest.getUserMatchTeamList(userDeatils['id'],matchId);
        if(data && data.length > 0){

            for(let i = 0; i < data.length; i++){

                let matchData= await MatchContest.getMatchData(data[i]['fkMatchId']);

                let myTeam:any = {};
                myTeam.teamCode = data[i]['teamCode'];
                myTeam.title = data[i]['title'];
                myTeam.fkMatchId = data[i]['fkMatchId'];
                myTeam.fkContestId = data[i]['fkContestId'];
                myTeam.matchStatus = matchData[0]['status'];
                myTeam.teamStatus = data[i]['teamStatus'];
                myTeam.point = data[i]['point'];

                myTeam.players = [];

                myTeam.team1PlayerCount = 0;
                myTeam.team2PlayerCount = 0;
                myTeam.wkCount = 0;
                myTeam.batsmanCount = 0;
                myTeam.bowlerCount = 0;
                myTeam.allRounder = 0

                let playerId = data[i]['playerId'].split(",");
                //let playerName = data[i]['playerName'].split(",");
                let role = data[i]['role'].split(",");
                let isCaption = data[i]['isCaption'].split(",");
                let isViceCaption = data[i]['isViceCaption'].split(",");
                let teamId = data[i]['teamId'].split(",");
                // let teamName = data[i]['teamName'].split(",");
                // let teamShortName = data[i]['teamShortName'].split(",");
                // let teamCountry = data[i]['teamCountry'].split(",");
                
                //Filter Teaam Id,Name and Country
                //Team Ids
                // let teamIds = teamId.filter(function(elem, index, self) {
                //     return index === self.indexOf(elem);
                // })

                let teamData=await MatchContest.getTeamData(teamId);
                let playerData=await MatchContest.getPlayerData(playerId);

                let team1Id = null;
                let team2Id = null;

                let team1Name = null;
                let team2Name = null;

                let team1ShortName = null;
                let team2ShortName = null;

                let team1Country = null;
                let team2Country = null;

                

                if(teamData.length == 2){
                    team1Id = teamData[0]['tid'];
                    team1Name = teamData[0]['teamName'];
                    team1ShortName = teamData[0]['teamShortName'];
                    team1Country = teamData[0]['country'];
                    

                    team2Id = teamData[1]['tid'];
                    team2Name =  teamData[1]['teamName'];
                    team2ShortName = teamData[1]['teamShortName'];
                    team2Country = teamData[1]['country'];
                }else{
                    team1Id = teamData[0]['tid'];
                    team1Name = teamData[0]['teamName'];
                    team1ShortName = teamData[0]['teamShortName'];
                    team1Country = teamData[0]['country'];
                }

                myTeam.team1Id = team1Id;
                myTeam.team2Id = team2Id;
                myTeam.team1Name = team1Name;
                myTeam.team2Name = team2Name;
                myTeam.team1ShortName = team1ShortName;
                myTeam.team2ShortName = team2ShortName;
                myTeam.team1Country = team1Country;
                myTeam.team2Country = team2Country;

                for(let j = 0; j < playerId.length; j++){
                    let playerDetails:any = {};
                    if(teamId[j] == myTeam.team1Id){
                        myTeam.team1PlayerCount++;
                    }else if(teamId[j] == myTeam.team2Id){
                        myTeam.team2PlayerCount++;
                    }
                    let designationCheck = role[j].toLowerCase();

                    if(designationCheck == 'bowl'){
                        myTeam.bowlerCount++;
                    }else if(designationCheck == 'bat'){
                        myTeam.batsmanCount++;
                    }else if(designationCheck == 'all'){
                        myTeam.allRounder++;
                    }else if(designationCheck == 'wk' || designationCheck == 'wkbat'){
                        myTeam.wkCount++;
                    }
                    playerDetails.playerId = playerId[j];

                    let player = playerData.filter(player=>player.pid==playerId[j])
                    let team = teamData.filter(team=>team.tid==teamId[j])


                    playerDetails.playerName = player && player.length > 0 ? player[0]['playerName']:"";                    
                    playerDetails.role = role[j];
                    playerDetails.isCaption = isCaption[j];
                    playerDetails.isViceCaption = isViceCaption[j];
                    playerDetails.teamId = teamId[j];

                    playerDetails.teamName = team && team.length > 0 ? team[0]['teamShortName']:"";

                    myTeam.players.push(playerDetails);
                    playerDetails = null;
                }
                respData.push(myTeam);
                myTeam = null;
            }

            helper.sendJSON(res, respData, false, 200, "My Team Data listed successfully", 1);
        }else{
            helper.sendJSON(res, [], false, 200, "No team available right now . Please create the team to participate in the contest .", 0);
        }
    }

    async getUserTeamPreview(req:Request, res:Response){
        let userDetails = req.headers.data;
        let teamCode = req.query.teamCode as string;
        var TeamPreviewData:any={};
        try{
            let teamDetails=await helper.getColsValue("gmsFantacyCricketUserTeam",["fkMatchId","fkContestId"],{teamCode:teamCode});
            var matchId=teamDetails[0]['fkMatchId'];
            var contestId=teamDetails[0]['fkContestId'];
            let data = await MatchContest.getUserMatchContestTeamPreview( teamCode,matchId);
            if(data && data.length > 0){
                var totalPoints=0;
                for(var i=0;i<data.length;i++){
                    totalPoints=totalPoints+data[i]['point'];
                }
                TeamPreviewData.totalPoints=totalPoints;
                TeamPreviewData.players=data;
                helper.sendJSON(res, TeamPreviewData, false, 200, "User team preview listed successfully. ", data.length,true);
            }
            else{
                if(!data)
                    helper.sendJSON(res, {}, false, 500, "DB Error . ", 0);
                else
                    helper.sendJSON(res, {}, false, 200, "No User Found on this team entr correct teamcode to preview players details ", 0);
            }
        }
        catch(error){
            console.log("Team Code : "+teamCode+" User team preview API ERROR .");
            helper.sendJSON(res, {}, true, 200, "Server Side Error !", 0);
        }
        
        
    }

    async getContestTeamStats(req:Request, res:Response){
        
        let userDetails = req.headers.data;
        let contestId = req.query.contestId;
        console.log(userDetails);
        console.log("Contest Id : " + contestId);
        helper.sendJSON(res, [], false, 200, "Contest Team Stats listed successfully", 1);
    }

    async joinContast(req:Request, res:Response){
        let userDetails = req.headers.data;
        let contestId = +req.query.contestId;
        let teamCode = req.query.teamCode as string;
        console.log(req.query);
        console.log("Contest ID : " + contestId);
        console.log("Team Code : " + teamCode);
        let userCurrentTeam = await MatchContest.getTotalParticipent(contestId, userDetails['id']);
        
        if(userCurrentTeam === false){
            console.log("User Current Team : " + userCurrentTeam);
            helper.sendJSON(res, [], true, 502, "DB Error !", 1);    
        }else{
            let contestData = await helper.getColsValue("gmsFantacyCricketContest", ["fkMatchId","totalUserTeam","maxUserTeam","userTeamCount"], {"id":contestId});
            let maxUserTeam = contestData[0]['maxUserTeam'];
            let userTeamCount = contestData[0]['userTeamCount'];
            var totalUserTeam=contestData[0]['totalUserTeam']?contestData[0]['totalUserTeam']:0;
            var matchId=contestData[0]['fkMatchId'];
            var matchDetails=await helper.getColsValue("gmsFantacyCricketMatch",["status","preSquad"],{"matchId":matchId});
            if(!matchDetails || matchDetails.length==0 || matchDetails[0]['status']!=1 || matchDetails[0]['preSquad']!=1 ){
                console.log("You cann't Join contest now . Entry has been Stop !! Match Id : "+matchId+", User Id : "+userDetails['id']);
                helper.sendJSON(res, [], true, 502, "You cann't join contest now . Entry has been stop !!", 0);    
                return;
            }
            else if(totalUserTeam + 1 > +maxUserTeam)
                helper.sendJSON(res, [], true, 200, "Sorry, Contest has been full.", 1);
            else if(userCurrentTeam + 1 > +userTeamCount)
                helper.sendJSON(res, [],  true, 200, "You have reached your max team limit.", 1);
            else{
                try{
                    let entryFee = await helper.getColValue("gmsFantacyCricketContest","entryFee",{"id":contestId});
                    
                    /*let bonusBal = await PaymentUtils.getUserAccountBal(userDetails['id'], Constant.Payment.AccType.Bonus);
                    let withdrawBal = await PaymentUtils.getUserAccountBal(userDetails['id'], Constant.Payment.AccType.Withdraw);
                    let depositBal = await PaymentUtils.getUserAccountBal(userDetails['id'], Constant.Payment.AccType.Deposit);*/
                    
                    /*let bonusBal = await PaymentUtils.getUserAccountBalV1(userDetails['id'], Constant.Payment.AccType.Bonus);
                    let withdrawBal = await PaymentUtils.getUserAccountBalV1(userDetails['id'], Constant.Payment.AccType.Withdraw);
                    let depositBal =await PaymentUtils.getUserAccountBalV1(userDetails['id'], Constant.Payment.AccType.Deposit);*/

                    let accountBal= await PaymentUtils.getUserAccountTotalBal(userDetails['id']);
                    let bonusBal=accountBal['bonusBal'];
                    let withdrawBal=accountBal['withdrawalBal'];
                    let depositBal= accountBal['depositBal'];

                    let totalBal = +bonusBal + +withdrawBal + +depositBal;
                    
                    var actualTeamCode;
                    if(entryFee <= totalBal){
                        let joinedContestData = await helper.getColsValue("gmsFantacyCricketUserTeam", ["fkMatchId","fkContestId"], {"teamCode":teamCode});
                        if(joinedContestData && joinedContestData.length && await MatchContest.joinedContestByTeamCode(contestId,teamCode)){
                            let joinedContest=joinedContestData[0]['fkContestId'];
                            let data = false;
                            //Check if team is of that match which is of contest.
                            if(joinedContestData[0]['fkMatchId']!=matchId){
                                console.log("Contest And Team belongs to different Match , Contest Id : "+contestId+ ", Team Code : "+teamCode+" , Match ID1 : "+matchId+" , Match Id2 : "+joinedContest);
                                helper.sendJSON(res, [], true, 202, "Team and Contest belongs to different matches .", 1);
                                return
                            }
                            //If contest id is same as in SQL DB for requested team
                            else if(joinedContest == contestId){
                                console.log("Already joined Contest Id : "+contestId+" , TeamCode : "+teamCode)
                                helper.sendJSON(res, [], true, 202, "Unable to join contest. Team for this contest is already joined !!", 1);    
                                return ;
                            }
                            //If no contest for request team 
                            else if(joinedContest == "" || joinedContest==null || !joinedContest){
                                actualTeamCode=teamCode;
                                const gameplay = await MasterPayment.shouldGamePlayBegin(userDetails, matchId, Constant.GameEngine.CricketFantacy, contestId,teamCode);
                                console.log("shouldGamePlayBegin service response: ", gameplay);
                                if (gameplay['statusCode'] == 500 || gameplay['statusCode'] == 502) {
                                    helper.sendJSON(res, gameplay['data'], gameplay['error'], gameplay['statusCode'], gameplay['message'], gameplay['recordTotal']);
                                    return;
                                }
                                data = await MatchContest.joinContest(req.headers.data['id'], contestId, teamCode);
                            }else{
                                //if requested team already have contest the create replica for the team and joined that contest
                                var refTeamCode=Date.now().toString();
                                actualTeamCode=refTeamCode;
                                const gameplay = await MasterPayment.shouldGamePlayBegin(userDetails, matchId, Constant.GameEngine.CricketFantacy, contestId,refTeamCode);
                                console.log("shouldGamePlayBegin service response: ", gameplay);
                                if (gameplay['statusCode'] == 500 || gameplay['statusCode'] == 502) {
                                    helper.sendJSON(res, gameplay['data'], gameplay['error'], gameplay['statusCode'], gameplay['message'], gameplay['recordTotal']);
                                    return;
                                }
                                data = await MatchContest.joinMultipleContest(userDetails['id'], contestId, refTeamCode ,teamCode);
                            }      
                            
                            
                            if(!data){
                                let refund=await MasterPayment.refundContestEntryFee(userDetails['id'],matchId,contestId,actualTeamCode);
                                if(refund)
                                    console.log("Refund Successfull.");
                                else    
                                    console.log("Unable to make refund User Id : "+userDetails['id']+", Match Id : "+matchId+", Contest Id : "+contestId+", teamCode : "+actualTeamCode);

                                helper.sendJSON(res, [], true, 500, "Unable to join contest", 1);    
                            }else{
                                await MatchContest.updateConttesttotalUserTeam(contestId,+totalUserTeam + 1);
                                commonService.updateUserGamePlayMatrix(userDetails['id'],0,Constant.USER_GAMEPLAY_GRAPH.PLAY);
                                helper.sendJSON(res, [], false, 200, "Contest Joined Successfull", 1);
                            }
                        }
                        else{
                            console.log("Invalid team Code : "+teamCode);
                            helper.sendJSON(res, [],  true, 202, "Team not created . enter valid team !! ", 1);
                        }
                    }
                    else{
                        console.log("Insufficient Balance : User Id : "+userDetails['id']+", Contest ID : "+contestId+" , Total Bal : "+totalBal+", Entry Fee : "+entryFee);
                        helper.sendJSON(res, [], true, 502, "Insufficient balance !!", 0);    
                    }
                }//End of try block
                catch(error){
                    console.log("Joined Contest Error : Contest Id : "+contestId+", User Id : "+userDetails['id']+", Team Code : "+teamCode);
                    helper.sendJSON(res, [], true, 500, "Contest Joined error !", 0);    
                }//End of catch block.
            }//End else block.
        }
    }

    async userContestTeamFantacyPoint(req:Request, res:Response){
        let contestId = +req.query.contestId;
        let userDetails = req.headers.data;
        let data = await MatchContest.getUserContestTeamFantacyPoint(userDetails['id'], contestId);
        !data?helper.sendJSON(res, [], false, 500, "DB Error . ", 0):'';
        let userContestTeamFP:any = {};
        if(data && data.length > 0){
            userContestTeamFP.teamCode = data[0]['teamCode'];
            userContestTeamFP.title = data[0]['title'];
            userContestTeamFP.fkMatchId = data[0]['fkMatchId'];
            userContestTeamFP.totalPoint = data[0]['totalPoint'];
            
            
            let matchDetails = await CricketMatch.getMatchDetailsForStats(userContestTeamFP.fkMatchId);
            delete matchDetails[0].matchName;
            delete matchDetails[0].series;
            delete matchDetails[0].dateStart;
            delete matchDetails[0].venueName;

            userContestTeamFP.teamAScore = matchDetails[0].teamAScore;
            userContestTeamFP.teamAOver = matchDetails[0].teamBOver;
            userContestTeamFP.teamAName = matchDetails[0].teamAName;
            
            userContestTeamFP.teamBScore = matchDetails[0].teamAScore;
            userContestTeamFP.teamBOver = matchDetails[0].teamBOver;
            userContestTeamFP.teamBName = matchDetails[0].teamBName

            userContestTeamFP.players = [];
            let playerId = data[0]['playerId'].split(',');
            //let playerName = data[0]['playerName'].split(',');
            //let teamName = data[0]['teamName'].split(',');
            let designation = data[0]['designation'].split(',');
            let fantacyPoint = data[0]['fantacyPoint'].split(',');
            //let teamShortName = data[0]['teamShortName'].split(',');
            let teamIds=data[0]['fkTeamId'].split(',');

            let playerData=await MatchContest.getPlayerData(playerId);
            let teamData= await MatchContest.getTeamData(teamIds)
            
            for(let i = 0; i < playerId.length; i++){
                let player:any = {};
                let selectedPlayer=playerData.filter(
                    player=> player.pid==playerId[i]
                );
                
                let selectedTeam=teamData.filter(
                    team=> team.tid==teamIds[i]
                );

                player.playerName = selectedPlayer && selectedPlayer.length > 0 ? selectedPlayer[0]['playerName']:"";
                player.teamName = selectedTeam && selectedTeam.length > 0 ? selectedTeam[0]['teamName'] : "";
                player.designation = designation[i];
                player.point =+ fantacyPoint[i];
                player.role = designation[i];
                player.teamShortName = selectedTeam && selectedTeam.length > 0 ? selectedTeam[0]['teamShortName'] : "";
                player.selectedBy = await MatchContest.getPlayerSelectedByUser(playerId[i], null, contestId);
                userContestTeamFP.players.push(player);
            }

            //Contest Team List Code start here .
            userContestTeamFP.teams = [];
            for(let j = 0; j < data.length; j++){
                let team:any = {};
                team.teamCode = data[j]['teamCode'];
                team.title = data[j]['title'];
                team.team1Count = 0;
                team.team2Count = 0;
                team.captain = "";
                team.viceCaptain = "";

                //let playerName = data[j]['playerName'].split(',');
                //let teamName = data[j]['teamShortName'].split(',');
                let designation = data[j]['designation'].split(',');
                let fantacyPoint = data[j]['fantacyPoint'].split(',');
                let isViceCaption = data[j]['isViceCaption'].split(',');
                let isCaption = data[j]['isCaption'].split(',');
                //Team Names
                // let teamNames = teamName.filter(function(elem, index, self) {
                //     return index === self.indexOf(elem);
                // })

                if(teamData.length == 2){
                    team.team1Name = teamData[0]['teamName'];
                    team.tid1 = teamData[0]['tid'];

                    team.team2Name = teamData[1]['teamShortName'];
                    team.tid2 = teamData[1]['tid'];

                }else{
                    team.team1Name = teamData[0]['teamShortName'];
                    team.tid1 = teamData[0]['tid'];
                }

                for(let k = 0; k < playerId.length; k++){
                    if(teamIds[k] == team.tid1){
                        team.team1Count++;
                    }else if(teamIds[k] == team.tid2){
                        team.team2Count++;
                    }
                    if(isViceCaption[k] == 1){
                        let selectedPlayer=playerData.filter(
                            player=> player.pid==playerId[k]
                        );
                        team.viceCaptain = selectedPlayer && selectedPlayer.length>0? selectedPlayer[0]['playerName']: "";
                    }
                    if(isCaption[k] == 1){
                        let selectedPlayer=playerData.filter(
                            player=> player.pid==playerId[k]
                        );
                        team.captain = selectedPlayer && selectedPlayer.length>0? selectedPlayer[0]['playerName']: "";
                    }
                }
                userContestTeamFP.teams.push(team);
            }//End of Contest Team Loop
            helper.sendJSON(res, userContestTeamFP, false, 200, "User team Fantacy Point Listed Successfully .", 1);
        }
        else{
            helper.sendJSON(res, [], false, 200, "User team Fantacy Point Listed Successfully .", 1);
        }
    }

    async userContestTeamFantacyLeaderBoard(req:Request, res:Response){
        let contestId= +req.query.contestId;
        let userDetails=req.headers.data;
        let maxUserLeaderBoard=500;
        let data = await MatchContest.getContestLeaderBoard(contestId);
        
        let ranking:any = {};
        let prizeBreakupData = await helper.getColsValue("gmsFantacyCricketContest", ["rankDescription", "prizeDescription", "status"], {"id":contestId})
        ranking.rankDescription=prizeBreakupData[0]['rankDescription'].split("{{}}");
        ranking.prizeDescription=prizeBreakupData[0]['prizeDescription'].split("{{}}");
        let contestStatus=prizeBreakupData[0]['status'];
        ranking.leaderBoard=[]
        
        !data?helper.sendJSON(res, [], false, 500, "DB Error . ", 0):'';
        if(data && data.length){
            let isUserTop10 = false;
            let i = 0;

            // data = data.reduce((arr, item) => {
            //     let exists = !!arr.find(x => x.fk_userId === item.fk_userId);
            //     if(!exists){
            //         arr.push(item);
            //     }
            //     return arr;
            // }, []);
            
            while(i < data.length && i < maxUserLeaderBoard){
                let lbuser:any = {};
                lbuser.rank = i+1;
                lbuser.teamCode = data[i]['teamCode'];
                lbuser.name = data[i]['firstName'];
                lbuser.point = data[i]['fantacyPoint'];
                if(data[i]['fkUserId'] == userDetails['id']){
                    isUserTop10 = true;
                    lbuser.name = "You";
                }
                ranking.leaderBoard.push(lbuser);
                i++;
            }
            if(!isUserTop10){
                let index = data.findIndex(function(lb) {
                    return lb.fk_userId == userDetails['id'];
                });
                ranking.leaderBoard.push({"rank":index+1, "name":"You", "point":data[i]['fantacyPoint']});
            }
            if(contestStatus == 0){
                ranking['contestCancledLbMsg'] = Constant.msgConfig.ContestCancledMsgLB;
            }
            helper.sendJSON(res, ranking, false, 200, "Leader Board Listed Successfully .",1 );
        }else{
            helper.sendJSON(res, [], false, 200, "Leader Board Listed Successfully .", 1);
        }
    }

    async getPlayerHistoryandPoint(req:Request, res:Response){
        var userDetails=req.headers.data;
        var playerId=req.query.playerId;
        var isPoint=req.query.isPoint;
        var matchId=req.query.matchId;
        var teamCode=req.query.teamCode;
        
        if(isPoint){
            //Response Point Breakup of the Player.
            let data=await CricketMatch.getPointBreakup(playerId,matchId,teamCode);
            helper.sendJSON(res, data, false, 200, "Player point breakup listed successfully .", data.length,true);
        }
        else{
            //Player Last max five match history.
            let data=await CricketMatch.getPlayerMathcHistory(playerId,matchId);
            helper.sendJSON(res, data, false, 200, "Player match history listed successfully .", data.length,true);
        }
    }


    
    //match reminder notification 

    async createMatchReminder(req:Request,res:Response){
        try
        { 
            const {matchId}=req.body
            const userId=req.headers.data["id"]
            let matchDetails=await helper.getColsValue("gmsFantacyCricketMatch",["title","status"],{matchId:matchId})
           
            if(matchDetails && matchDetails.length > 0){
                if(matchDetails['0']['status'] != Constant.FantacyCricket.MatchStatus.schedule){
                    helper.sendJSON(res,[],true,Constant.RESP_CODE['Validation Failed'],"Match is not in upcomming states !!",0);
                }
                else{
                    let reminderData=await helper.getColsValue("gmsFantacyCricketMatchReminder",["playerList","id","title"],{fkMatchid:matchId});
                    if(reminderData && reminderData.length > 0){
                        let playerList=JSON.parse(reminderData[0].playerList);
                        if(playerList.indexOf(userId)!=-1){
                           helper.sendJSON(res,[],false,Constant.RESP_CODE.Success,"Reminder already set for you !!",0)
                        }
                        else
                        {
                            playerList.push(userId)
                            playerList=JSON.stringify(playerList)
                            let updateData:any={};
                            updateData.playerList=playerList;
                            let condition={id:reminderData[0]['id']};

                            let updateReminder=await CricketMatch.updateMatchReminder(updateData,condition);
                            if(updateReminder){
                                helper.sendJSON(res,[],false,Constant.RESP_CODE.Success,"Reminder created sucessfully.",1)
                            }
                            else{
                                helper.sendJSON(res,[],true,Constant.RESP_CODE['DB Error'],"Unable to create reminder !!",1);
                            }
                        }
                    }
                    else{
                        //Create a fresh match reminder with initial User.
                        let playerList=JSON.stringify([userId])
                        let insertData:any={};
                        insertData.fkMatchId=matchId;
                        insertData.playerList=playerList;
                        insertData.title=matchDetails['0']['title'];
                        insertData.status=0;
                        let createReminder = await CricketMatch.createMathReminder(insertData);
                        if(createReminder)
                            helper.sendJSON(res,[],false,Constant.RESP_CODE.Success,"Reminder created sucessfully.",1)
                        else
                            helper.sendJSON(res,[],true,Constant.RESP_CODE['DB Error'],"Unable to create reminder !!",1);
      
                    }
                }
            }
            else
            {
                helper.sendJSON(res, [], true, Constant.RESP_CODE['Bad Request'], "Match details not exists !!", 0)
            }
        }
        catch(error){
            helper.sendJSON(res, [], true, Constant.RESP_CODE['Internal Server Error'], "Unable to create reminder !!", 0)
       }
    }
}

export default new FantacyCricket();