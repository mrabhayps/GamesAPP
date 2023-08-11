const express = require('express');
const app = new express();
const cron = require('node-cron');
const sequelize = require('sequelize');
const crypto =require('crypto');
const rsaPemToJwk = require("rsa-pem-to-jwk");
const { JWE, JWK, parse } = require('node-jose');
const request = require('request');
const Cron = require('cron-converter');
const xlsx = require('xlsx');
const fs = require('fs');
const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const PaytmChecksum = require('paytmchecksum');
const path = require('path');

const models = require('../api/models/index');
const config = require('../common/secret.config.json');
const NotificationService = require('../api/notifications/notification.serviceV1');


const accTypeField={
	"10":"depositBal",
	"20":"withdrawalBal",
	"30":"tokenBal",
	"40":"bonusBal",
	"50":"coinBal",
	"60":"referralBal",
}

let DEPOSIT_WITHDRAW_DESCRIPTION={
	"WITHDRAW" : {
		"SUCCESS":"You have successfully withdrew ₹ <amount> to your Bank Account <bankname> - <acno> and ₹ <tds> has been deducted as TDS.",
		"FAILED":"Your withdrawal request of ₹ <amount> to your Bank Account  <bankname> - <acno> is failed. This will be refunded back in your Winnings wallet.",
		"PENDING":"Your withdrawal request of ₹ <amount> to your Bank Account <bankname> - <acno> is pending. This may take upto 24 hours.",
		"REFUND" : "You have received refund against your withdrawal request of ₹ <amount> with Transaction ID - <txnId>"
	},
	"DEPOSIT" : {
		"SUCCESS":"You have successfully deposited ₹ <amount> into your Deposits wallet.",
		"FAILED":"You deposit request of ₹ <amount> is failed. Any amount deducted from your account will be refunded in 24 to 48 hours.",
		"PENDING":"You deposit request of ₹ <amount> is pending. This may take upto 24 hours."
	}
}

//Season Cron. (10001)
//Purpose : This will update all the season from entity sport to gamesapp
//This Cron execute at 12:00 AM  on 1 January of each year.
//Schidule Time : 0 0 1 1 *
//Test Time (each minute): */1 * * * *

cron.schedule('0 0 1 1 *', async function () {
	var cronId = 10001;
	try {
		var cron = await getCronByID(cronId);
		if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
			console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
			return true;
		} else {
			await lockUnlock(cronId, 0); //Lock by setting status:0
		}
		console.log('Cron : ' + cronId + ' is Executing !');
		request(
			config.entitySport.URL.seasson + '?token=' + config.entitySport.token,
			{ json: true },
			async (err, resp, body) => {
				if (err) {
					console.log(err);
					await lockUnlock(cronId, 1); //Un-Lock this cron by setting status:1
				} else {
					for (var i = 0; i < resp.body.response.items.length; i++) {
						var value = resp.body.response.items[i];
						var condition = { sid: resp.body.response.items[i]['sid'] };
						try {
							await models.gmsFantacyCricketSeason
								.findOne({ where: condition })
								.then(async function (obj) {
									if (obj) {
										// update
										obj.update(value);
									} else {
										//insert
										models.gmsFantacyCricketSeason.create(value);
									}
								});
						} catch (error) {
							console.log('Error Cron Id : ' + cronId + ' SQL UPSERT ');
							console.log(error);
						}
					}
					console.log(
						'Cron Id : ' + cronId + ' Successfully complete there  Job'
					);
					await lockUnlock(cronId, 1); //Un-Lock this cron by setting status:1
				}
			}
		); //End of request.
	} catch (error) {
		console.log('Error  Cron Id : 10001 ', error);
		await lockUnlock(cronId, 1); //Un-Lock this cron by setting status:1
	}
});

//Competition Cron (10002)
//Purpose : This will update all the Cricket series from entity sport to Gamesapp
//This cron will execute on each day at 12:00 AM .
//Schidule Time : 0 0 * * *
//Test Time (each minute): */1 * * * *

cron.schedule('0 0 * * *', async function () {
	var cronId = 10002;
	try {
		var cron = await getCronByID(cronId);
		if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
			console.log('Cron : ' + cronId + ' is InActive/Closed, Status : ' + cron[0]['status']);
			return true;
		} else {
			await lockUnlock(cronId, 0); //Lock by setting status:0
		}
		console.log('Cron : ' + cronId + ' is Executing !');
		var options = {
			url: `${config.entitySport.URL.competition}?per_page=100&token=${config.entitySport.token}`,
			method: "GET",
			json: true
		};
		request(
			options,
			async (err, res, body) => {
				if (err) {
					console.log(`Outer API Call Error in cron id : ${cronId}`);
					console.log(err);
					await lockUnlock(cronId, 1); //Un-Lock this cron by setting status:1
				} else {
					var totalPage = res.body ? res.body.response.total_pages : 0;
					console.log("Total Paged competition Data : ",totalPage);
					for (var n = 0; n < totalPage; n++) {
						try {
							await new Promise((resolve, reject) => {
								options.url=`${config.entitySport.URL.competition}?&per_page=100&paged=${(n + 1)}&token=${config.entitySport.token}`;
								request(
									options,
									async (err, resp, body) => {
										if (err) {
											console.log(`inner API Call error in CronId : ${cronId} `)
											console.log(err);
											reject(false);
											//await lockUnlock(cronId, 1); //Un-Lock this cron by setting status:1
										} 
										else 
										{

											if(!resp.body || !resp.body.status){
												console.log(`No Data return from entity sport for cron Id : ${cronId} !! `);
												reject(false);
											}


											for (var i = 0; i < resp.body.response.items.length; i++) {
												//gameFormat, totalMatches, totalRounds, totalTeams
												var value = resp.body.response.items[i];
			
												value['gameFormat'] = value['game_format'];
												value['totalMatches'] = value['total_matches'];
												value['totalRounds'] = value['total_rounds'];
												value['totalTeams'] = value['total_teams'];
			
												/*delete value['game_format'];
														  delete value['total_matches'];
														  delete value['total_rounds'];
														  delete value['total_teams'];*/
			
												var condition = { cid: value['cid'] };
												try {
													await models.gmsFantacyCricketCompetition
														.findOne({ where: condition })
														.then(async function (obj) {
															if (obj) {
																// update
																await obj.update(value);
															} else {
																//insert
																await models.gmsFantacyCricketCompetition.create(
																	value
																);
															}
														});
												} catch (error) {
													console.log('Error Cron Id : ' + cronId + ' SQL UPSERT ');
													console.log(error);
												}
											} //End of for loop.
											resolve(true);
										}
									}
								); // End of inner request.
							});//End of promise
						}
						catch(error){
							console.log(`Inner API Call Error in Cron Job : ${cronId} !!`)
							console.log(error);
						}
					}//End of outer for loop.
					console.log(`Cron Id : ${cronId} Successfully complete there  Job.`);
					await lockUnlock(cronId, 1); //Un-Lock this cron by setting status:1
				}
			}
		); //End of outer request.
	} catch (error) {
		console.log(`Error  In Cron Id : ${cronId}`);
		console.log(error);
		await lockUnlock(cronId, 1); //Un-Lock this cron by setting status:1
	}
});

//Team Cron (10003)
//Purpose : This will update all the Cricket team from entity sport to gamesapp.
//This cron will execute on each day at 12:00 AM .
//Schidule Time : 0 0 * * *
//Test Time (each minute): */1 * * * *

cron.schedule('0 0 * * *', async function () {
	var cronId = 10003;
	try {
		var cron = await getCronByID(cronId);
		if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
			console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
			return true;
		} else {
			await lockUnlock(cronId, 0); //Lock by setting status:0
		}
		console.log('Cron : ' + cronId + ' is Executing !');
		var options = {
			url: `${config.entitySport.URL.team}?per_page=100&token=${config.entitySport.token}`,
			method: "GET",
			json: true
		};
		request(
			options,
			async (err, res, body) => {
				if (err) {
					console.log(`Outer API Call Error in cron id : ${cronId}`);
					console.log(err);
					await lockUnlock(cronId, 1); //Un-Lock this cron by setting status:1
				} else {
					var totalPage = res.body ? res.body.response.total_pages : 0;
					console.log("Total Paged Team Data : ",totalPage);
					for (var n = 0; n < totalPage; n++) {
						try {
							await new Promise((resolve, reject) => {
								options.url=`${config.entitySport.URL.team}?&per_page=100&paged=${(n + 1)}&token=${config.entitySport.token}`;
								request(
									options,
									async (err, resp, body) => {
										if (err) {
											console.log(`inner API Call error in CronId : ${cronId} `)
											console.log(err);
											reject(false);
										} else {

											if(!resp.body || !resp.body.status){
												console.log(`No Data return from entity sport for cron Id : ${cronId} !! `);
												reject(false);
											}

											for (var i = 0; i < resp.body.response.items.length; i++) {
												var value = resp.body.response.items[i];
			
												value['altName'] = value['alt_name'];
												value['thumbUrl'] = value['thumb_url'];
												value['logoUrl'] = value['logo_url'];
			
												var condition = { tid: value['tid'] };
												try {
													await models.gmsFantacyCricketTeams
														.findOne({ where: condition })
														.then(async function (obj) {
															if (obj) {
																// update
																await obj.update(value);
															} else {
																//insert
																await models.gmsFantacyCricketTeams.create(value);
															}
														});
												} catch (error) {
													console.log('Error Cron Id : ' + cronId + ' SQL UPSERT ');
													console.log(error);
												}
											} //End of Inner for loop.
											resolve(true);
										}
									}
								); //End of inner request.
							});//End of Promise
						}
						catch(error){
							console.log(`Inner API Call Error in cron Id : ${cronId}`);
							console.log(error);
						}
					}//End of outer for loop.
					console.log(`Cron Id : ${cronId} Successfully complete there  Job`);
					await lockUnlock(cronId, 1); //Un-Lock this cron by setting status:1
				}
			}
		); //End of outer request.
	} catch (error) {
		console.log(`Error in Cron Id : ${cronId} `);
		console.log(error);
		await lockUnlock(cronId, 1); //Un-Lock this cron by setting status:1
	}
});

//Player Cron (10004)
//Purpose : This will update all the Cricket Player from entity sport to gamesapp.
//This cron will execute on each day at 12:00 AM .
//Schidule Time : 0 0 * * *
//Test Time (each minute): */1 * * * *

cron.schedule('0 0 * * *', async function () {
	let cronId = 10004;
	try {
		let cron = await getCronByID(cronId);
		if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
			console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
			return true;
		} else {
			await lockUnlock(cronId, 0); //Lock by setting status:0
		}
		console.log('Cron : ' + cronId + ' is Executing !');
		let options = {
			url: `${config.entitySport.URL.player}?per_page=100&token=${config.entitySport.token}`,
			method: "GET",
			json: true
		};
		request(
			options,
			async (err, res, body) => {
				if (err) {
					console.log(`Outer API Call Error in cron id : ${cronId}`);
					console.log(err);
					await lockUnlock(cronId, 1); //Un-Lock this cron by setting status:1
				} else {
					let totalPage = res.body && res.body.response ? res.body.response.total_pages : 0;
					console.log("Total Paged Player Data : ",totalPage);
					for (let n = 0; n < totalPage; n++) {
						try {
							await new Promise((resolve, reject) => {
								options.url=`${config.entitySport.URL.player}?&per_page=100&paged=${(n + 1)}&token=${config.entitySport.token}`;
								request(
									options,
									async (err, resp, body) => {
										if (err) {
											console.log(`inner API Call error in CronId : ${cronId} `)
											console.log(err);
											reject(false);
										} else {

											if(!resp.body || !resp.body.status){
												console.log(`No Data return from entity sport for cron Id : ${cronId} !! `);
												reject(false);
											}

											for (var i = 0; i < resp.body.response.items.length; i++) {
												var value = resp.body.response.items[i];
												value['primaryTeam'] = JSON.stringify(value['primary_team']);
												value['shortName'] = value['short_name'];
												value['lastName'] = value['last_name'];
												value['middleName'] = value['middle_name'];
												value['thumbUrl'] = value['thumb_url'];
												value['logoUrl'] = value['logo_url'];
												value['playingRole'] = value['playing_role'];
												value['battingStyle'] = value['batting_style'];
												value['bowlingStyle'] = value['bowling_style'];
												value['fieldingPosition'] = value['fielding_position'];
												value['recentMatch'] = value['recent_match'];
												value['recentAppearance'] = value['recent_appearance'];
												value['fantasyPlayerRating'] = value['fantasy_player_rating'];
			
												var condition = { pid: value['pid'] };
												try {
													await models.gmsFantacyCricketPlayer
														.findOne({ where: condition })
														.then(async function (obj) {
															if (obj) {
																// update
																await obj.update(value);
															} else {
																//insert
																await models.gmsFantacyCricketPlayer.create(value);
															}
														});
												} catch (error) {
													console.log('Error Cron Id : ' + cronId + ' SQL UPSERT ');
													console.log(error);
												}
											} //End of for loop.
											resolve(true);
										}
									}
								); //End of inner request.
							});
						}
						catch(error){
							console.log(`Inner API Call Error in cron Id : ${cronId}`);
							console.log(error);
						}
					}//End of outer for loop.
					console.log(`Cron Id : ${cronId} Successfully complete there  Job.`);
					await lockUnlock(cronId, 1); //Un-Lock this cron by setting status:1
				}
			}
		); //End of outer request.
	} catch (error) {
		console.log(`Error  Cron Id : ${cronId} `);
		console.log(error);
		await lockUnlock(cronId, 1); //Un-Lock this cron by setting status:1
	}
});

//Match Cron (10005)
//Purpose : This will update all the Cricket Match from entity sport to gamesapp.
//This cron will execute on the interval of 1 minute.
//Schidule Time : */1 * * * *
//Test Time (each 20 th second): 0/20 * * * * *

cron.schedule('*/1 * * * *', async function () {
	let cronId = 10005;
	try {
		let cron = await getCronByID(cronId);
		if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
			console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
			return true;
		} else {
			await lockUnlock(cronId, 0); //Lock by setting status:0
		}
		console.log('Cron : ' + cronId + ' is Executing !');
		let date = await formatDate();
		console.log(`Match between Date : ${date}`);
		
		let options = {
			url: `${config.entitySport.URL.match}?date=${date}&per_page=50&token=${config.entitySport.token}`,
			method: "GET",
			json: true,
			timeout: 5000
		};
		request(options,
			async (err, resp, body) => {
				if (err) {
					console.log(err);
					await lockUnlock(cronId, 1); //Un-Lock by setting status:1
				} else {
					let totalPage = resp.body && resp.body.response ? resp.body.response.total_pages : 0;
					console.log(`Total Paged Match Data : ${totalPage}`);
					
					let contestConfig=await models.FantacyCricket.query("SELECT * from gmsContestConfigMain where status=1",{ type: sequelize.QueryTypes.SELECT});
    				let pdData=await getPrizeDistributionData();

					for (let n = 0; n < totalPage; n++) {
						try {
							await new Promise((resolve, reject) => {
								options.url=`${config.entitySport.URL.match}?date=${date}&per_page=50&paged=${(n + 1)}&token=${config.entitySport.token}`;
								request(options,
									async (err, resp, body) => {
										if (err) {
											console.log(err);
											reject(false);
											//await lockUnlock(cronId,1);//Un-Lock by setting status:1
										} else {

											if(!resp.body || !resp.body.status){
												console.log("*******Response Body  : *******",resp.body);
												reject(`No Data return from entity sport !!`);
											}


											let matchUpdated = 0;
											let matchInsert = 0;
											let matchFailed = [];
											let format = config.cricketMatchFormat;
											let matchList=[];
											for (let i = 0;resp.body && i < resp.body.response.items.length;i++) {
												let value = resp.body.response.items[i];

												if (format.indexOf(value['format']) == -1) {
													console.log(`Not allow to maintain [Format] this match in Games App !! , Match ID : ${value['match_id']}, Format : ${value['format']}`);
													continue;
												}
												else if(value['pre_squad'] == 'false'){
													console.log(`Not allow to maintain [PreSquad] this match in Games App !! , Match ID : ${value['match_id'] }, Pre Squad : ${value['pre_squad']}`);
													continue;
												}

												//var condition = { matchId: value['match_id'] };

												value['matchId'] = value['match_id'];
												value['shortTitle'] = value['short_title'];
												value['preSquad'] = value['pre_squad'] == 'true' ? 1 : 0;
												value['verified'] = value['verified'] == 'true' ? 1 : 0;
												
												//This is exceptional condition.
												if (value['verified'] == 0 && value['status'] == 2 && value['preSquad'] == 0) {
													value['verified'] = 1;
												}


												value['oddsAvailable'] = value['odds_available'];
												value['gameState'] = value['game_state'];
												value['dateStart'] = value['date_start'];
												value['dateEnd'] = value['date_end'];

												value['venueName'] = value['venue']['name'];
												value['venueLocation'] = value['venue']['location'];
												value['venueTimezone'] = value['venue']['timezone'];

												value['resultType'] = value['result_type'];
												value['winMargin'] = value['win_margin'];
												value['winningTeamId'] = value['winning_team_id'];
												value['latestInningNumber'] = value['latest_inning_number'];

												value['tossWinner'] = value['toss']['winner'];
												value['tossDecision'] = value['toss']['decision'];

												value['cid'] = value['competition']['cid'];

												value['teamA'] = value['teama']['team_id'];
												value['teamAScore'] = value['teama']['scores'];
												value['teamAOver'] = value['teama']['overs'];

												value['teamB'] = value['teamb']['team_id'];
												value['teamBScore'] = value['teamb']['scores'];
												value['teamBOver'] = value['teamb']['overs'];

												console.log('Match Details.');
												console.log(`Match Id : ${value['matchId']} Status : ${value['status']} Pre Squad : ${value['preSquad']} Verified : ${value['verified']}`);

												var dtStart = new Date(value['dateStart'] + ' UTC');
												value['dateStart'] = await dtStart.toString();

												var dtEnd = new Date(value['dateEnd'] + ' UTC');
												value['dateEnd'] = await dtEnd.toString();


												//This is condition to manage match in upcomming if current time is less than Date Start.
												//Entity sport make mathch live before match date start
												if (value['status'] == 3) {
													let date = new Date();
													let yyyy = date.getFullYear();
													let mm = date.getMonth() + 1;
													let dd = date.getDate();
													let hh = date.getHours();
													let min = date.getMinutes();
													let sec = date.getSeconds();
													let CurrentDate =yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + min + ':' + sec;

													if (new Date(value['dateStart']) < new Date(CurrentDate))
														value['status'] = 3;
													else 
														value['status'] = 1;
												}

												// Contest Status change
												// If match status is cancled then all contest will declined.
												// If  match status is in live then if total participent < min user then contest will declined
												// 10: Contest Created, 20: Ready to start(Min user team reached),
												// 30: Contest cancled(Match Cancled), 40: Contest cancled (Min user not reached),
												// 50: Contest Cancled by user, 60: Contest completed Successfully.
												if (value['preSquad'] == 1) {
													let contestData = await models.FantacyCricket.query(`SELECT id,fkContestConfigId, minUserTeam,status, isCommisionDone, isPrizeDistributionDone from gmsFantacyCricketContest where fkMatchId=${value['matchId']}`,
																	{ type: sequelize.QueryTypes.SELECT });

													if(contestData.length>0){
														let contestIds = contestData.map(contst => contst.id);
														let contestTeamCount = await getTeamCountV1( value['matchId'], contestIds);
														let updateContestDataList=[];

														for (let i = 0;contestData && i < contestData.length;i++) {
															//let contest = contestData[i];
															//contestTeamCount.find(({ fkContestId }) => fkContestId === contestData[i]['id']);
															let tcData=contestTeamCount.find(({fkContestId})=>fkContestId==contestData[i]['id']);
															let teamCount=tcData && tcData['teamCount']?tcData['teamCount']:0;
															let contestStatus=contestData[i]['status'];
															let contestIsCommisionDone=contestData[i]['isCommisionDone'];
															let contestIsPrizeDistributionDone=contestData[i]['isPrizeDistributionDone'];

															if (value['status'] == 1) {
																// Upcomming match
																//let teamCount = await getTeamCount( value['matchId'], contest['id']);
																if (contestData[i]['minUserTeam'] <= teamCount) {
																	//await updateContest({ status: 20 },{ id: contest['id'] });
																	contestStatus=20;
																	console.log(`Contest : ${contestData[i]['id']}  Started (Min user reached)`);
																}
															}
															else if (value['status'] == 2 && value['verified'] == 1) {
																// Finished match
																if (contestData[i]['status'] == 30) {

																	/*await updateContest(
																		{
																			status: 70,
																			isCommisionDone: 20,
																			isPrizeDistributionDone: 20,
																		},
																		{ id: contest['id'] }
																	);*/
																	contestStatus=70;
																	contestIsCommisionDone=20;
																	contestIsPrizeDistributionDone=20;
																	console.log(`Contest : ${contestData[i]['id']} completed Successfully. `);
																}
															}
															else if (value['status'] == 3) {
																// Live match
																if (teamCount < contestData[i]['minUserTeam']) {
																	/*await updateContest(
																		{
																			status: 50,
																			isCommisionDone: 40,
																			isPrizeDistributionDone: 40,
																		},
																		{ id: contest['id'] }
																	);*/
																	
																	contestStatus=50;
																	contestIsCommisionDone=40;
																	contestIsPrizeDistributionDone=40;
																	
																	console.log(`Contest : ${contestData[i]['id']} cancled (Min user not reached)`);
																} else if (teamCount >= contestData[i]['minUserTeam']) {
																	/*await updateContest(
																		{ status: 30 },
																		{ id: contest['id'] }
																	);*/
																	contestStatus=30;
																	console.log(`Contest : ${contestData[i]['id']} Started Successfully.`);
																}
															} 
															else if (value['status'] == 4 && value['verified'] == 1) {
																// Cancled match
																//check if status is not 40 then do it
																if (contestData[i]['status'] != 40) {
																	/*await updateContest(
																		{
																			status: 40,
																			isCommisionDone: 40,
																			isPrizeDistributionDone: 40,
																		},
																		{ id: contest['id'] }
																	);*/
																	
																	contestStatus=40;
																	contestIsCommisionDone=40;
																	contestIsPrizeDistributionDone=40;
																	
																	console.log(`Contest : ${contestData[i]['id']} cancled (Match Cancled) .`);
																} else {
																	console.log(`Match Id  : ${value['matchId']} , Contest Id : ${contestData[i]['id']}  , Status : ${contestData[i]['status']} Already cancled `);
																}
															}
															contestData[i]['status']=contestStatus;
															contestData[i]['isCommisionDone']=contestIsCommisionDone;
															contestData[i]['isPrizeDistributionDone']=contestIsPrizeDistributionDone;

															updateContestDataList.push(contestData[i]);
														}//End of contest loop
														let isUpdated=await updateContestStatus(updateContestDataList);
														if(!isUpdated){
															console.log(`Unable to update contest status Match Id : ${value['matchId']}`);
															console.log(updateContestDataList);
														}
													}
												}//End of contest status update process 


												//Match contest creation process
												if (value['preSquad'] == 1 && value['status'] == 1) {
													let contestCount = await models.FantacyCricket.query(`SELECT COUNT(1) as cnt from gmsFantacyCricketContest where fkMatchId=${value['matchId']}`,
														{ type: sequelize.QueryTypes.SELECT }
													);

													if (contestCount[0]['cnt'] == 0) {
														let isCreated=await createContest(value['matchId'],contestConfig,pdData);
														if(isCreated)
															console.log(`MatchId : ${value['matchId']} Contest created successfully.`);
														else
															console.log(`MatchId : ${value['matchId']} Contest creation failed !`);
													} else {
														console.log(`MatchId : ${value['matchId']} Contest already has been  created .`);
													}
												} 
												/*try {
													await models.gmsFantacyCricketMatch
														.findOne({ where: condition })
														.then(async function (obj) {
															if (obj) {
																// update
																await obj.update(value);
																matchUpdated++;
															} else {
																//insert
																await models.gmsFantacyCricketMatch.create(
																	value
																);
																matchInsert++;
															}
														});
												} catch (error) {
													matchFailed.push(value['matchId']);
													console.log(
														'Error Cron Id : ' + cronId + ' SQL UPSERT '
													);
													console.log(error);
												}*/
												matchList.push(value);
											} //End of for loop
											
											console.log('Total match listed : ' + matchList.length);
											try{
												let updateField=[`verified`,`preSquad`,`oddsAvailable`,`gameState`,`domestic`,`cid`,`teamA`,`teamAScore`,`teamAOver`,`teamB`,`teamBScore`,`teamBOver`,`dateStart`,`dateEnd`,`venueName`,`venueLocation`,`venueTimezone`,`umpires`,`referee`,`equation`,`live`,`result`,`resultType`,`winMargin`,`winningTeamId`,`commentary`,`latestInningNumber`,`tossWinner`,`tossDecision`,`updatedAt`,`status`];
												await models.gmsFantacyCricketMatch.bulkCreate(matchList, { updateOnDuplicate: updateField });
											}
											catch(error){
												console.log("Bulk Updte match data query error : ",error);
											}
											resolve(true);
										}
									}
								); //End of request.
							}); //End of promise.
						} catch (error) {
							//End of try block.
							console.log('Error Cron Id : 10005 Inner API Request !!', error);
						} //End of catch block.
					} //End of Loop.
					await lockUnlock(cronId, 1); //Un-Lock by setting status:1
				} //End of else block.
			}
		); //End of Outer request.
	} catch (error) {
		console.log('Error  Cron Id :  ' + cronId, error);
		await lockUnlock(cronId, 1); //Un-Lock by setting status:1
	}
});

async function createContest(matchId,contestConfig,pdData){
	let contestList=[];
	for(let i=0;contestConfig && i<contestConfig.length;i++){
		var contestConfigData=contestConfig[i];
		
		var contestPrepareData={};

		let key=`PDID_${contestConfigData['fkPDId']}`;

		contestPrepareData.fkMatchId=matchId;
		contestPrepareData.fkContestConfigId=contestConfigData['id'];
		contestPrepareData.contestCreater=0;
		
		contestPrepareData.title=contestConfigData['contestName'];
		contestPrepareData.contestType=contestConfigData['type'];
		contestPrepareData.prizePool=contestConfigData['totalWinningAmount'];
		contestPrepareData.entryFee=contestConfigData['entryAmount'];
		contestPrepareData.firstPrize=pdData[key]['firstPrize'];
		contestPrepareData.prizeUnit='₹';
		contestPrepareData.maxUserTeam=contestConfigData['maxPlayer'];
		contestPrepareData.minUserTeam=contestConfigData['minNumberOfPlayer'];
		contestPrepareData.totalWinner=contestConfigData['winnerPercentage'];
		contestPrepareData.isConfirmedLeague=0; 
		contestPrepareData.userTeamCount=contestConfigData['isMultipleTeamForUser'];

		contestPrepareData.contestRules="Cicket Fantasy Rules {{}} Make a team of 11 players{{}}Use upto 100 credits to choose 1-4 wicket keepers, 3-6 batsmens, 1-4 all rounders and 3-6 bowlers{{}}Select a cptain and vice captain{{}}Maximum of 7 players from one team{{}}Get points for batting,bowling and feilding performances of your PLAYING 11{{}}Tax of 31.2% will deducted on winning of Rs.10,000 & above";
		contestPrepareData.rankDescription=pdData[key]['rankDescription'];;
		contestPrepareData.prizeDescription=pdData[key]['prizeDescription'];;

		contestPrepareData.isCommisionDone=10;
		contestPrepareData.isPrizeDistributionDone=10;
		contestPrepareData.status=10;
		contestPrepareData.fkPDId=contestConfigData['fkPDId'];

		contestList.push(contestPrepareData);
		console.log(`Contest data prepared for match Id : ${matchId} config : ${contestPrepareData.fkContestConfigId}`);
	}//End of loop.

	try{
		await models.gmsFantacyCricketContest.bulkCreate(contestList);
		console.log(`Contest created for Match ID :  ${matchId}`);
	}
	catch(error){
		console.log(`Unable to create Contest for Match ID :  ${matchId}`);
		console.log(error);
		return false;
	}
	return true;
}

async function getPrizeDistributionData(){
	let data = await models.sequelize.query(
		`SELECT groupId,GROUP_CONCAT(rankFrom ORDER BY rankFrom ASC) as rankFrom,GROUP_CONCAT(rankTill ORDER BY rankTill ASC) as rankTill, GROUP_CONCAT(individualAmount ORDER BY individualAmount DESC) as individualAmount 
		FROM gmsPrizeDistributionConfig 
		WHERE status=1
		GROUP BY groupId`,
		{ type: sequelize.QueryTypes.SELECT }
	);

	let retData={}
	for(let i=0;data && i<data.length;i++){
		let prepareData={};
		let groupId=data[i]['groupId'];
		let rankFrom=data[i]['rankFrom'].split(',');
		let rankTill=data[i]['rankTill'].split(',');
		let individualAmount=data[i]['individualAmount'].split(',');

		let rankDescription="";
		let priceDescription="";
		let firstPrize=individualAmount[0];
		for(let j=0;j<rankFrom.length;j++){

			if(rankFrom[j]==rankTill[j])
				rankDescription=rankDescription + `Rank: ${rankFrom[j]} {{}} `;
			else
				rankDescription=rankDescription+ `Rank: ${rankFrom[j]} to ${rankTill[j]} {{}}`;

				priceDescription=priceDescription + `₹ ${individualAmount[j]} {{}}`
		}
		let key=`PDID_${groupId}`
		retData[key]={
			"rankDescription":rankDescription.substring(0,rankDescription.length-5),
			"prizeDescription":priceDescription.substring(0,priceDescription.length-5),
			"firstPrize":firstPrize
		}

	}

	return retData;
}

async function getTeamCount(matchId, contestId) {
	try {
		let teamCount = await models.sequelize.query(
			'SELECT count(DISTINCT teamCode) as cnt from gmsFantacyCricketUserTeam where fkMatchId=' +
			matchId +
			' and fkContestId=' +
			contestId,
			{ type: sequelize.QueryTypes.SELECT }
		);
		return teamCount[0]['cnt'];
	} catch (error) {
		console.log('Error (getTeamCount) : ', error);
		return false;
	}
}

async function getTeamCountV1(matchId, contestIds) {
	try {
		let teamCount = await models.sequelize.query(
			`SELECT count(DISTINCT teamCode) as teamCount,fkContestId from gmsFantacyCricketUserTeam 
			where fkMatchId=${matchId} and fkContestId IN (${contestIds})
			GROUP BY fkContestId`,
			{ type: sequelize.QueryTypes.SELECT }
		);
		return teamCount;
	} catch (error) {
		console.log('Error (getTeamCountV1) : ', error);
		return false;
	}
}

async function updateContest(contest, where) {
	try {
		let data = await models.gmsFantacyCricketContest.update(contest, {
			where: where,
		});
		return data;
	} catch (error) {
		console.log('Error (updateContest) : ', error);
		return false;
	}
}

async function updateContestStatus(contestList) {
	try {
		updateField=["status","isCommisionDone","isPrizeDistributionDone"];
		await models.gmsFantacyCricketContest.bulkCreate(contestList, { updateOnDuplicate: updateField });
		return true;
	} catch (error) {
		console.log('Error (updateContestStatus) : ', error);
		return false;
	}
}

//New Fantacy Point Cron . (10006)
//Purpose : Update Point if match is in live,completed and verified=false from entity sport to gamesapp
//This cron will execute on the interval of 3 minute.
//Schidule Time : */3 * * * *
//Test Time (each minute): */1 * * * *

cron.schedule('*/1 * * * *', async function () {
	 var cronId = 10006;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	console.log('Point Migration Started.');
	try {
		//Select all the matches where status is in live,completed and varified=false
		let data = await models.FantacyCricket.query(
			'select matchId,cid,teamA,teamB from gmsFantacyCricketMatch where status in (2,3) and verified=0',
			{ type: sequelize.QueryTypes.SELECT }
		);
		let matchList=[];
		if (data && data.length > 0) {
			console.log(`Total Match : ${data.length}`);
			let i;
			for (i = 0; i < data.length; i++) {
				let matchId = data[i]['matchId'];
				let cid = data[i]['cid'];
				let teamA = data[i]['teamA'];
				let teamB = data[i]['teamB'];
				let playerList=[];
				try {
					await new Promise((resolve, reject) => {
						request(
							'https://rest.entitysport.com/v2/matches/' +
							matchId +
							'/newpoint2?token=' +
							config.entitySport.token,
							{ json: true },
							async (err, resp, body) => {
								if (err) {
									console.log('Cron Id : ' + cronId + ' API request ', err);
									reject(err);
								} else {
									try {
										if (resp.body.status == 'ok') {
											var value = resp.body.response;
											var isMatchVarified = value.varified;

											//Team-A Update
											var teamA = value.teama.team_id;
											var teamAScore = value.teama.scores;
											var teamAOver = value.teama.overs;

											//Team-B Update

											var teamB = value.teamb.team_id;
											var teamBScore = value.teamb.scores;
											var teamBOver = value.teamb.overs;

											//Team Playing 11 Point.
											var teamAPlaying11Point = value.points.teama.playing11;
											var teamBPlaying11Point = value.points.teamb.playing11;

											//Team Playing 11 Substitute.
											var teamASubstitutePoint = value.points.teama.substitute;
											var teamBSubstitutePoint = value.points.teamb.substitute;

											//var matchCondition = { matchId: matchId };
											
											let matchUpdate = {
												matchId: matchId,
												teamAScore: teamAScore,
												teamAOver: teamAOver,
												teamBScore: teamBScore,
												teamBOver: teamBOver,
											};
											
											matchList.push(matchUpdate);
											
											/*await models.gmsFantacyCricketMatch
												.findOne({ where: matchCondition })
												.then(async function (obj) {
													if (obj) {
														// update
														await obj.update(matchUpdate);
													} else {
														console.log(
															'Match Id : ' +
															matchId +
															' Not exist to update Score.'
														);
													}
												});*/

											//Update Point of Team-A Playing-11.
											for (let j = 0; teamAPlaying11Point && j < teamAPlaying11Point.length; j++) {
												/*var conditionTeamA = {
													fkMatchId: matchId,
													fkTeamId: teamA,
													fkPlayerId: teamAPlaying11Point[j]['pid'],
												};*/

												let teamAPlayerUpdate = {};

												teamAPlayerUpdate.fkMatchId=matchId;
												teamAPlayerUpdate.fkCid=cid;
												teamAPlayerUpdate.fkTeamId=teamA;
												teamAPlayerUpdate.fkPlayerId=teamAPlaying11Point[j]['pid'];

												teamAPlayerUpdate.point =
													teamAPlaying11Point[j]['point'];
												teamAPlayerUpdate.starting11P =
													teamAPlaying11Point[j]['starting11'];
												teamAPlayerUpdate.runP = teamAPlaying11Point[j]['run'];
												teamAPlayerUpdate.fourP =
													teamAPlaying11Point[j]['four'];
												teamAPlayerUpdate.sixP = teamAPlaying11Point[j]['six'];
												teamAPlayerUpdate.srP = teamAPlaying11Point[j]['sr'];
												teamAPlayerUpdate.fiftyP =
													teamAPlaying11Point[j]['fifty'];
												teamAPlayerUpdate.duckP =
													teamAPlaying11Point[j]['duck'];
												teamAPlayerUpdate.wktsP =
													teamAPlaying11Point[j]['wkts'];
												teamAPlayerUpdate.erP = teamAPlaying11Point[j]['er'];
												teamAPlayerUpdate.catchP =
													teamAPlaying11Point[j]['catch'];

												teamAPlayerUpdate.maidenoverP =
													teamAPlaying11Point[j]['maidenover'];

												teamAPlayerUpdate.thirtyP =
													teamAPlaying11Point[j]['thirty'];
												teamAPlayerUpdate.bonusP =
													teamAPlaying11Point[j]['bonus'];

												teamAPlayerUpdate.runoutStumpingP =
													+teamAPlaying11Point[j]['runoutstumping'] +
													+teamAPlaying11Point[j]['runoutthrower'] +
													+teamAPlaying11Point[j]['runoutcatcher'] +
													+teamAPlaying11Point[j]['directrunout'] +
													+teamAPlaying11Point[j]['stumping'];

												teamAPlayerUpdate.catchBonusP = teamAPlaying11Point[j]['bonuscatch']
												teamAPlayerUpdate.bowedlbwP = teamAPlaying11Point[j]['bonusbowedlbw']

												if(+teamAPlayerUpdate.fkPlayerId > 0){
													playerList.push(teamAPlayerUpdate);
												}
												

												/*try {
													await models.gmsfantacyCricketMatchScoreCard
														.findOne({ where: conditionTeamA })
														.then(async function (obj) {
															if (obj) {
																// update
																await obj.update(teamAPlayerUpdate);
															} else {
																console.log(
																	'This player is not in mathch team-A squad : ',
																	conditionTeamA
																);
															}
														});
												} catch (error) {
													console.log(
														'TeamAPlaying11Point Upsert Error : ',
														error
													);
												}*/
											} // End of TeamAPlaying11 Point for loop.

											//Update Point of Team-B Playing-11
											for (let j = 0; teamBPlaying11Point && j < teamBPlaying11Point.length; j++) {
												/*var conditionTeamB = {
													fkMatchId: matchId,
													fkTeamId: teamB,
													fkPlayerId: teamBPlaying11Point[j]['pid'],
												};*/

												

												let teamBPlayerUpdate = {};

												teamBPlayerUpdate.fkMatchId=matchId;
												teamBPlayerUpdate.fkCid=cid;
												teamBPlayerUpdate.fkTeamId=teamA;
												teamBPlayerUpdate.fkPlayerId=teamBPlaying11Point[j]['pid'];


												teamBPlayerUpdate.point =
													teamBPlaying11Point[j]['point'];
												teamBPlayerUpdate.starting11P =
													teamBPlaying11Point[j]['starting11'];
												teamBPlayerUpdate.runP = teamBPlaying11Point[j]['run'];
												teamBPlayerUpdate.fourP =
													teamBPlaying11Point[j]['four'];
												teamBPlayerUpdate.sixP = teamBPlaying11Point[j]['six'];
												teamBPlayerUpdate.srP = teamBPlaying11Point[j]['sr'];
												teamBPlayerUpdate.fiftyP =
													teamBPlaying11Point[j]['fifty'];
												teamBPlayerUpdate.duckP =
													teamBPlaying11Point[j]['duck'];
												teamBPlayerUpdate.wktsP =
													teamBPlaying11Point[j]['wkts'];
												teamBPlayerUpdate.erP = teamBPlaying11Point[j]['er'];
												teamBPlayerUpdate.catchP =
													teamBPlaying11Point[j]['catch'];

												teamBPlayerUpdate.maidenoverP =
													teamBPlaying11Point[j]['maidenover'];

												teamBPlayerUpdate.thirtyP =
													teamBPlaying11Point[j]['thirty'];
												teamBPlayerUpdate.bonusP =
													teamBPlaying11Point[j]['bonus'];

												teamBPlayerUpdate.runoutStumpingP =
													+teamBPlaying11Point[j]['runoutstumping'] +
													+teamBPlaying11Point[j]['runoutthrower'] +
													+teamBPlaying11Point[j]['runoutcatcher'] +
													+teamBPlaying11Point[j]['directrunout'] +
													+teamBPlaying11Point[j]['stumping'];

												teamBPlayerUpdate.catchBonusP = teamBPlaying11Point[j]['bonuscatch']
												teamBPlayerUpdate.bowedlbwP = teamBPlaying11Point[j]['bonusbowedlbw']

												if(+teamBPlayerUpdate.fkPlayerId > 0){
													playerList.push(teamBPlayerUpdate);
												}
													

												/*try {
													await models.gmsfantacyCricketMatchScoreCard
														.findOne({ where: conditionTeamB })
														.then(async function (obj) {
															if (obj) {
																// update
																await obj.update(teamBPlayerUpdate);
															} else {
																console.log(
																	'This player is not is in mathch team-b squad',
																	conditionTeamB
																);
															}
														});
												} catch (error) {
													console.log(
														'TeamBPlaying11Point Upsert Error : ',
														error
													);
												}*/
											} // End of TeamBPlaying11 Point for loop.

											let updateField=[ `updatedAt`,`point`, `starting11P`, `runP`, `fourP`, `sixP`, `srP`, `fiftyP`, `thirtyP` , `duckP`, `wktsP`, `maidenoverP`, `erP` ,`catchP`, `runoutStumpingP`, `bonusP`];
											await models.gmsfantacyCricketMatchScoreCard.bulkCreate(playerList, { updateOnDuplicate: updateField });

										} else if (resp.body.status == 'forbidden') {
											console.log(`Cron Id : ${cronId} Get API forbidden status from entity sport. Match Id : ${matchId}`);
										} else {
											console.log(`Cron Id : ${cronId}  Get Unsupported status from entity sport. Match Id : ${matchId}`);
										}
									} catch (error) {
										console.log(`Cron Id : ${cronId} API response error. Match Id  : ${matchId}`);
										console.log(error);
									}
									resolve(true);
								} //End Of else block.
							}
						); //End of request.
					}); //End Of Promise.
				} catch (error) {
					//End of promise try block.
					console.log('Promis Error Cron ID : ' + cronId);
					console.log(error);
				} //End of promise catch block .
			}

			if(matchList.length>0){
				try{
					let updateField=[`teamAScore`,`teamAOver`,`teamBScore`,`teamBOver`];
					await models.gmsFantacyCricketMatch.bulkCreate(matchList, { updateOnDuplicate: updateField });
				}
				catch(error){
					console.log("Bulk Updte match data query error : ",error);
				}
			}
			console.log('Total Updated Match : ', i);
		} else {
			console.log('No match found to Update fantacy point of player.');
		}
	} catch (error) {
		console.log('DB Error Cron Id : ' + cronId + '  , Error : ', error);
	}

	console.log("Point breakup of player migration End .")
	console.log("Starting Score breakup of player migration.")

	try {
		let liveMatch = await models.FantacyCricket.query(
			'select matchId,cid,teamA,teamB,dateStart from gmsFantacyCricketMatch where status in (2,3) and verified=0 AND preSquad=1',
			{ type: sequelize.QueryTypes.SELECT }
		);

		for (let i = 0; liveMatch && i < liveMatch.length; i++) {
			let matchId = liveMatch[i]['matchId'];
			let cid = liveMatch[i]['cid'];
			//Get and update player score card.
			try {
				await new Promise((resolve, reject) => {
					try {
						request(
							'https://rest.entitysport.com/v2/matches/' +
							matchId +
							'/scorecard?token=' +
							config.entitySport.token,
							{ json: true },
							async (err, resp, body) => {
								if (err) {
									console.log(err);
									reject(false);
								} else {
									var status = resp.body ? resp.body.status : false;
									if (status == 'ok') {
										var innings = resp.body.response.innings;
										//let playerList=[];
										let batsManPlayers=[]
										let bowlersPlayers=[];
										let filderPlayers=[];

										for (var k = 0; innings && k < innings.length; k++) {
											var batsMen = innings[k]['batsmen'];
											var bowlers = innings[k]['bowlers'];
											var fielder = innings[k]['fielder'];


											//Batsmen ScoreCard.
											for (var j = 0; j < batsMen.length; j++) {
												let ScoreCardUpdate = {};
												let playerId = batsMen[j]['batsman_id'];
												ScoreCardUpdate.run = +batsMen[j]['runs'];
												ScoreCardUpdate.four = +batsMen[j]['fours'];
												ScoreCardUpdate.six = +batsMen[j]['sixes'];

												ScoreCardUpdate.sr = batsMen[j]['strike_rate'].split('.').length>2?batsMen[j]['strike_rate'].substring(0,batsMen[j]['strike_rate'].lastIndexOf('.')):batsMen[j]['strike_rate'];
												ScoreCardUpdate.sr=ScoreCardUpdate.sr==''? 0:ScoreCardUpdate.sr;

												

												ScoreCardUpdate.fifty = ScoreCardUpdate.run / 50;
												ScoreCardUpdate.thirty = ScoreCardUpdate.run / 30;
												ScoreCardUpdate.createdAt=new Date();
												//Check duck.
												if (
													batsMen[j]['role'] == 'bat' ||
													batsMen[j]['role'] == 'all'
												) {
													ScoreCardUpdate.duck =
														batsMen[j]['runs'] == 0 ? 1 : 0;
												} else {
													ScoreCardUpdate.duck = 0;
												}

												/*var conditionBatMen = {
													fkPlayerId: playerId,
													fkMatchId: matchId,
												};*/

												ScoreCardUpdate.fkCid=cid
												ScoreCardUpdate.fkMatchId=matchId
												ScoreCardUpdate.fkPlayerId=playerId

												/*try {
													await models.gmsfantacyCricketMatchScoreCard
														.findOne({ where: conditionBatMen })
														.then(async function (obj) {
															if (obj) {
																// update
																await obj.update(ScoreCardUpdate);
															} else {
																console.log(
																	'This player is not in mathch scorecard batsmen : ',
																	conditionBatMen
																);
															}
														});
												} catch (error) {
													console.log(
														'Innings : ' +
														innings[k]['iid'] +
														' Batsman Upsert Error : ',
														conditionBatMen
													);
													console.log(error);
												}*/

												//playerList.push(ScoreCardUpdate);
												batsManPlayers.push(ScoreCardUpdate);
											}//End of Batsmsan

											//Bowlers ScoreCards.
											for (var j = 0; j < bowlers.length; j++) {
												let ScoreCardUpdate = {};
												let playerId = bowlers[j]['bowler_id'];
												ScoreCardUpdate.wkts = +bowlers[j]['wickets'];
												ScoreCardUpdate.maidenover = +bowlers[j]['maidens'];
												ScoreCardUpdate.er = bowlers[j]['econ'];

												ScoreCardUpdate.fkCid=cid
												ScoreCardUpdate.fkMatchId=matchId
												ScoreCardUpdate.fkPlayerId=playerId
												ScoreCardUpdate.createdAt=new Date();
												/*var conditionBowler = {
													fkPlayerId: playerId,
													fkMatchId: matchId,
												};*/

												/*try {
													await models.gmsfantacyCricketMatchScoreCard
														.findOne({ where: conditionBowler })
														.then(async function (obj) {
															if (obj) {
																// update
																await obj.update(ScoreCardUpdate);
															} else {
																console.log(
																	'This player is not in mathch scorecard Bowlers : ',
																	conditionBowler
																);
															}
														});
												} catch (error) {
													console.log(
														'Innings : ' +
														innings[k]['iid'] +
														' Bowlers Upsert Error : ',
														conditionBowler
													);
													console.log(error);
												}*/
												//playerList.push(ScoreCardUpdate);
												bowlersPlayers.push(ScoreCardUpdate);
											}

											//Fielder Scorecard.
											for (var j = 0; j < fielder.length; j++) {
												let ScoreCardUpdate = {};
												let playerId = fielder[j]['fielder_id'];
												ScoreCardUpdate.catch = fielder[j]['catches'];
												ScoreCardUpdate.runoutStumping =
													fielder[j]['runout_thrower'] +
													fielder[j]['runout_catcher'] +
													fielder[j]['runout_direct_hit'] +
													fielder[j]['stumping'];

												/*var conditionFielder = {
													fkPlayerId: playerId,
													fkMatchId: matchId,
												};*/

												ScoreCardUpdate.fkCid=cid
												ScoreCardUpdate.fkMatchId=matchId
												ScoreCardUpdate.fkPlayerId=playerId
												ScoreCardUpdate.createdAt=new Date();
												/*try {
													await models.gmsfantacyCricketMatchScoreCard
														.findOne({ where: conditionFielder })
														.then(async function (obj) {
															if (obj) {
																// update
																await obj.update(ScoreCardUpdate);
															} else {
																console.log(
																	'This player is not in mathch scorecard Fielder : ',
																	conditionFielder
																);
															}
														});
												} catch (error) {
													console.log(
														'Innings : ' +
														innings[k]['iid'] +
														' Fielders Upsert Error : ',
														conditionFielder
													);
													console.log(error);
												}*/
												//playerList.push(ScoreCardUpdate);
												filderPlayers.push(ScoreCardUpdate);
											}
										} //End of innings Loop.

										
										let batsManPlayerUpdateFied=[`updatedAt` , `run` ,`four` , `six` ,`sr` ,`fifty` ,`thirty`, `duck`];
										await models.gmsfantacyCricketMatchScoreCard.bulkCreate(batsManPlayers, { updateOnDuplicate: batsManPlayerUpdateFied });


										let bowlersPlayerUpdateFied=[`wkts` , `maidenover` , `er` ];
										await models.gmsfantacyCricketMatchScoreCard.bulkCreate(bowlersPlayers, { updateOnDuplicate: bowlersPlayerUpdateFied });

										let fieldersPlayerUpdateFied=[ `catch` , `runoutStumping` ];
										await models.gmsfantacyCricketMatchScoreCard.bulkCreate(filderPlayers, { updateOnDuplicate: fieldersPlayerUpdateFied });
										
										
									} else {
										console.log(`Match ID : ${matchId} No ScoreCard Found .`);
									}
								}
								resolve(true);
							}
						); //End of request.
					} catch (error) {
						console.log(`Error API Call in Cron Id : ${cronId}  Match Id : ${matchId}`);
						console.log(error);
						reject(false);
					}
				}); //End of promise.
			} catch (error) {
				//End of promise try block.
				console.log('Promis Error Cron ID : ' + cronId);
				console.log(error);
			} //End of promise catch block .
		} //End Of Match Id loop.
	} catch (error) {
		console.log('Unable to update Players Score Card');
		console.log(error);
	}

	console.log("Score breakup of player migration End .")
	console.log("Starting playing-11 of player migration.");

	try {
		let upcommingMatch = await models.FantacyCricket.query(
			'select matchId,cid,teamA,teamB,dateStart from gmsFantacyCricketMatch where status=1 and preSquad=1 and dateStart < date_add(Now() ,interval 540 Minute)',
			{ type: sequelize.QueryTypes.SELECT }
		);

		for (let i = 0; upcommingMatch && i < upcommingMatch.length; i++) {
			let matchId = upcommingMatch[i]['matchId'];
			let cid = upcommingMatch[i]['cid'];
			let isPlayingListed=false;
			//Check and update isPlaying11 of player.

			try {
				await new Promise((resolve, reject) => {
					try {
						let playerList=[];
						request(
							'https://rest.entitysport.com/v2/matches/' +
							matchId +
							'/squads?token=' +
							config.entitySport.token,
							{ json: true },
							async (err, resp, body) => {
								if (err) {
									console.log(err);
									reject(false);
								} else {
									let status = resp.body ? resp.body.status : false;
									if (status == 'ok') {
										let matchSquad = {};
										let value = resp.body.response;
										matchSquad.teamA = value.teama.team_id;
										matchSquad.teamAPlayers = value.teama.squads;

										matchSquad.teamB = value.teamb.team_id;
										matchSquad.teamBPlayers = value.teamb.squads;
										for (let j = 0; j < matchSquad.teamAPlayers.length || j < matchSquad.teamBPlayers.length; j++) {
											//Team-A Match squad update.
											if (j < matchSquad.teamAPlayers.length) {
												/*let condition = {
													fkMatchId: matchId,
													fkTeamId: matchSquad.teamA,
													fkPlayerId: matchSquad.teamAPlayers[j]['player_id'],
												};*/

												let player={}
												/*let update = {};
												let insert = {};*/

												/*update.isPlaying11 =matchSquad.teamAPlayers[j]['playing11'] == 'true' ? 1 : 0;*/

												player.fkCid = cid;
												player.fkMatchId = matchId;
												player.fkTeamId = matchSquad.teamA;
												player.fkPlayerId =
													matchSquad.teamAPlayers[j]['player_id'];
												player.playerName = matchSquad.teamAPlayers[j]['name'];
												player.role = matchSquad.teamAPlayers[j]['role'];
												player.createdAt=new Date();
												player.isPlaying11 = matchSquad.teamAPlayers[j]['playing11'] == 'true' ? 1 : 0;
												playerList.push(player);

												isPlayingListed=player.isPlaying11==1?true:isPlayingListed;

												/*await upsertMatchSquad(condition, update, insert);*/
											}

											//Team-B Match squad update.
											if (j < matchSquad.teamBPlayers.length) {
												/*let condition = {
													fkMatchId: matchId,
													fkTeamId: matchSquad.teamB,
													fkPlayerId: matchSquad.teamBPlayers[j]['player_id'],
												};*/

												/*let update = {};
												let insert = {};*/

												/*update.isPlaying11 =
													matchSquad.teamBPlayers[j]['playing11'] == 'true'
														? 1
														: 0;*/

												let player = {};

												player.fkCid = cid;
												player.fkMatchId = matchId;
												player.fkTeamId = matchSquad.teamB;
												player.fkPlayerId =
													matchSquad.teamBPlayers[j]['player_id'];
												player.playerName = matchSquad.teamBPlayers[j]['name'];
												player.role = matchSquad.teamBPlayers[j]['role'];
												player.isPlaying11 = matchSquad.teamBPlayers[j]['playing11'] == 'true' ? 1 : 0;

												playerList.push(player);

												isPlayingListed=player.isPlaying11==1?true:isPlayingListed;

												/*await upsertMatchSquad(condition, update, insert);*/
											}
										} //End of matchSquad.teamPlayers for loop.
									} else {
										console.log(`Match ID : ${matchId} No match squad found of this match from entity sport .`);
									}

									let updateField=[`isPlaying11`];
									await models.gmsfantacyCricketMatchScoreCard.bulkCreate(playerList, { updateOnDuplicate: updateField });
									resolve(true);
								}
							}
						); //End of request.
					} catch (error) {
						console.log(
							'Error API Call Cron Id : ' + cronId + ' Match Id : ' + matchId
						);
						console.log(error);
						reject(false);
					}
				}); //End of promise.
			} catch (error) {
				//End of Promiss Try block
				console.log('Promis Error Cron ID : ' + cronId);
				console.log(error);
			} //End of promiss catch block .

			//Check and update isTeamAnounced.
			/*var totalPlaying11 = await models.sequelize.query(
				'select count(1) as cnt from gmsfantacyCricketMatchScoreCard where fkMatchId=' +
				matchId +
				' and isPlaying11=1',
				{ type: sequelize.QueryTypes.SELECT }
			);*/
			/*if (totalPlaying11 && totalPlaying11[0]['cnt'] > 0)*/

			if (isPlayingListed){
				var matchdataUpdate = await models.FantacyCricket.query(`update gmsFantacyCricketMatch set isTeamAnounced=1 where matchId=${matchId}  limit 1;`,
					{ type: sequelize.QueryTypes.UPDATE }
				);
				let isSent=await sendUserMatchReminderNotification(matchId);
				if(isSent){
					console.log(`Match reminder sent successfully for match Id : ${matchId}`);				}	
				else{
					console.log(`Unable to sent match reminder for match Id : ${matchId}`);
				}
			}		
			else
			{
				console.log(`Match Id : ${matchId}  No palying 11 Found . There for final team is not anounced.`);
			}
				
		} //End of for loop .
	} catch (error) {
		//End of try Block
		console.log(
			'Unable to update isTeam Anounced , CronId : ' +
			cronId +
			' , Match Id : ' +
			matchId
		);
		console.log(error);
	} //End of catch block
	
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

function formatDate() {
	var currentDate = new Date(),
		month = '' + (currentDate.getMonth() + 1),
		day = '' + currentDate.getDate(),
		year = currentDate.getFullYear();

	if (month.length < 2) month = '0' + month;
	if (day.length < 2) day = '0' + day;
	if (day < 10) {
		month = month - 1;
		day = 30 - (10 - day);
	} else {
		day = day - 10;
	}
	currentDate = [year, month, day].join('-');

	var newDate = new Date();
	newDate.setDate(newDate.getDate() + 30);
	(month = '' + (newDate.getMonth() + 1)),
		(day = '' + newDate.getDate()),
		(year = newDate.getFullYear());

	if (month.length < 2) month = '0' + month;
	if (day.length < 2) day = '0' + day;

	newDate = [year, month, day].join('-');

	//console.log(currentDate);
	//console.log(newDate);

	return currentDate + '_' + newDate;
}
async function sendUserMatchReminderNotification(matchId){
	 try{
		let reminderInfo=await models.gmsFantacyCricketMatchReminder.findAll(
			{
				attributes:["playerList","title"],
				where:{fkMatchId:matchId,status: 0}
			});
		if(reminderInfo && reminderInfo.length>0){
			let  playersIDs=reminderInfo[0]["playerList"].slice(1,reminderInfo[0]["playerList"].length-1)
			let playerDetails=await models.sequelize.query(`SELECT id,userName  from gmsUsers where id in (${playersIDs}) and status=1`,
			{ type: sequelize.QueryTypes.SELECT })
				
			if(playerDetails.length>0){
				playerDetails.forEach(async(user)=> 
				await sendPushNotificationMatchReminder(user.id,reminderInfo[0].title,'SEND_REMINDER_MATCH',user.userName))      
			}
			await models.gmsFantacyCricketMatchReminder.update({status:1},{where:{fkMatchId:matchId}});
			return true;
		}
		else{
			console.log(`Match reminder is not available for match id : ${matchId}`);
			return true;
		}
	 }
	 catch(error){
		console.log("Error in (sendUserMatchReminderNotification)");
		console.log(error);
		return false;
	 }
	
}
async function sendPushNotificationMatchReminder(userId,title,notificationType,userName){
	const notification={
		title:"Hey! You have a notification",
		body:`Hi ${userName} ,${title}  match about to start  `
	}
	const notificationData={
        "notificationType":notificationType,
		"message":`Hi ${userName} ,${title}  match about to start  `
	}
	await NotificationService.sendPushNotification(userId,notificationData,notification)
}

//Is Team Anounced Cron (10007)
//Purpose : To check if team has been anounced or Not of match. if not then check from entity sport.
//This Cron execute in interval of 1 min.
//Schidule Time : */1 * * * *
//Test Time every 4th sec. : */4 * * * * *

cron.schedule('*/1 * * * *', async function () {
	var cronId = 10007;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	// try {
	// 	let upcommingMatch = await models.sequelize.query(
	// 		'select matchId,cid,teamA,teamB,dateStart from gmsFantacyCricketMatch where status=1 and preSquad=1 and dateStart < date_add(Now() ,interval 540 Minute)',
	// 		{ type: sequelize.QueryTypes.SELECT }
	// 	);
		
	// 	for (let i = 0; upcommingMatch && i < upcommingMatch.length; i++) {
	// 		let matchId = upcommingMatch[i]['matchId'];
	// 		let cid = upcommingMatch[i]['cid'];
	// 		let isPlayingListed=false;
	// 		//Check and update isPlaying11 of player.

	// 		try {
	// 			await new Promise((resolve, reject) => {
	// 				try {
	// 					let playerList=[];
	// 					request(
	// 						'https://rest.entitysport.com/v2/matches/' +
	// 						matchId +
	// 						'/squads?token=' +
	// 						config.entitySport.token,
	// 						{ json: true },
	// 						async (err, resp, body) => {
	// 							if (err) {
	// 								console.log(err);
	// 								reject(false);
	// 							} else {
	// 								let status = resp.body ? resp.body.status : false;
	// 								if (status == 'ok') {
	// 									let matchSquad = {};
	// 									let value = resp.body.response;
	// 									matchSquad.teamA = value.teama.team_id;
	// 									matchSquad.teamAPlayers = value.teama.squads;

	// 									matchSquad.teamB = value.teamb.team_id;
	// 									matchSquad.teamBPlayers = value.teamb.squads;
	// 									for (let j = 0; j < matchSquad.teamAPlayers.length || j < matchSquad.teamBPlayers.length; j++) {
	// 										//Team-A Match squad update.
	// 										if (j < matchSquad.teamAPlayers.length) {
	// 											/*let condition = {
	// 												fkMatchId: matchId,
	// 												fkTeamId: matchSquad.teamA,
	// 												fkPlayerId: matchSquad.teamAPlayers[j]['player_id'],
	// 											};*/

	// 											let player={}
	// 											/*let update = {};
	// 											let insert = {};*/

	// 											/*update.isPlaying11 =matchSquad.teamAPlayers[j]['playing11'] == 'true' ? 1 : 0;*/

	// 											player.fkCid = cid;
	// 											player.fkMatchId = matchId;
	// 											player.fkTeamId = matchSquad.teamA;
	// 											player.fkPlayerId =
	// 												matchSquad.teamAPlayers[j]['player_id'];
	// 											player.playerName = matchSquad.teamAPlayers[j]['name'];
	// 											player.role = matchSquad.teamAPlayers[j]['role'];
	// 											player.createdAt=new Date();
	// 											player.isPlaying11 = matchSquad.teamAPlayers[j]['playing11'] == 'true' ? 1 : 0;
	// 											playerList.push(player);

	// 											isPlayingListed=player.isPlaying11==1?true:isPlayingListed;

	// 											/*await upsertMatchSquad(condition, update, insert);*/
	// 										}

	// 										//Team-B Match squad update.
	// 										if (j < matchSquad.teamBPlayers.length) {
	// 											/*let condition = {
	// 												fkMatchId: matchId,
	// 												fkTeamId: matchSquad.teamB,
	// 												fkPlayerId: matchSquad.teamBPlayers[j]['player_id'],
	// 											};*/

	// 											/*let update = {};
	// 											let insert = {};*/

	// 											/*update.isPlaying11 =
	// 												matchSquad.teamBPlayers[j]['playing11'] == 'true'
	// 													? 1
	// 													: 0;*/

	// 											let player = {};

	// 											player.fkCid = cid;
	// 											player.fkMatchId = matchId;
	// 											player.fkTeamId = matchSquad.teamB;
	// 											player.fkPlayerId =
	// 												matchSquad.teamBPlayers[j]['player_id'];
	// 											player.playerName = matchSquad.teamBPlayers[j]['name'];
	// 											player.role = matchSquad.teamBPlayers[j]['role'];
	// 											player.isPlaying11 = matchSquad.teamBPlayers[j]['playing11'] == 'true' ? 1 : 0;

	// 											playerList.push(player);

	// 											isPlayingListed=player.isPlaying11==1?true:isPlayingListed;

	// 											/*await upsertMatchSquad(condition, update, insert);*/
	// 										}
	// 									} //End of matchSquad.teamPlayers for loop.
	// 								} else {
	// 									console.log(`Match ID : ${matchId} No match squad found of this match from entity sport .`);
	// 								}

	// 								let updateField=[`isPlaying11`];
	// 								await models.gmsfantacyCricketMatchScoreCard.bulkCreate(playerList, { updateOnDuplicate: updateField });
	// 								resolve(true);
	// 							}
	// 						}
	// 					); //End of request.
	// 				} catch (error) {
	// 					console.log(
	// 						'Error API Call Cron Id : ' + cronId + ' Match Id : ' + matchId
	// 					);
	// 					console.log(error);
	// 					reject(false);
	// 				}
	// 			}); //End of promise.
	// 		} catch (error) {
	// 			//End of Promiss Try block
	// 			console.log('Promis Error Cron ID : ' + cronId);
	// 			console.log(error);
	// 		} //End of promiss catch block .

	// 		//Check and update isTeamAnounced.
	// 		/*var totalPlaying11 = await models.sequelize.query(
	// 			'select count(1) as cnt from gmsfantacyCricketMatchScoreCard where fkMatchId=' +
	// 			matchId +
	// 			' and isPlaying11=1',
	// 			{ type: sequelize.QueryTypes.SELECT }
	// 		);*/
	// 		/*if (totalPlaying11 && totalPlaying11[0]['cnt'] > 0)*/

	// 		if (isPlayingListed){
	// 			var matchdataUpdate = await models.sequelize.query(`update gmsFantacyCricketMatch set isTeamAnounced=1 where matchId=${matchId}  limit 1;`,
	// 				{ type: sequelize.QueryTypes.UPDATE }
	// 			);
	// 		}
	// 		else
	// 		{
	// 			console.log(`Match Id : ${matchId}  No palying 11 Found . There for final team is not anounced.`);
	// 		}
				
	// 	} //End of for loop .
	// } catch (error) {
	// 	//End of try Block
	// 	console.log(
	// 		'Unable to update isTeam Anounced , CronId : ' +
	// 		cronId +
	// 		' , Match Id : ' +
	// 		matchId
	// 	);
	// 	console.log(error);
	// } //End of catch block
	// await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

/*async function upsertMatchSquad(condition, update, insert) {
	try {
		await models.gmsfantacyCricketMatchScoreCard
			.findOne({ where: condition })
			.then(async function (obj) {
				if (obj) {
					// update
					obj.update(update);
				} else {
					//insert
					models.gmsfantacyCricketMatchScoreCard.create(insert);
				}
			});
	} catch (error) {
		console.log('Error (UpsertMatchSquad) : ' + error);
		return false;
	}
}*/

//Fantcy point update cron (10008)
//Purpose : Update User Team  Player Fantacy Point. if match is in live,completed and verifie='false'
//This Cron execute in interval of 1 min.
//Schidule Time : */1 * * * *
//Test Time every 20th sec. : */20 * * * * *

cron.schedule('*/1 * * * *', async function () {
	var cronId = 10008;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		let matchData = await models.FantacyCricket.query(
			'select matchId from gmsFantacyCricketMatch where status in (2,3) and verified=0',
			{ type: sequelize.QueryTypes.SELECT }
		);
		if (matchData && matchData.length > 0) {
			for (var i = 0; i < matchData.length; i++) {
				let userTeamPlayer = await models.sequelize.query(
					'select id,fkPlayerId,isCaption,isViceCaption from gmsFantacyCricketUserTeam  where fkMatchId=' +
					matchData[i]['matchId'],
					{ type: sequelize.QueryTypes.SELECT }
				);
				let matchTeamPlayer = await models.FantacyCricket.query(
					'select fkPlayerId,point from gmsfantacyCricketMatchScoreCard where fkMatchId=' +
					matchData[i]['matchId'],
					{ type: sequelize.QueryTypes.SELECT }
				);
				if (userTeamPlayer && userTeamPlayer.length > 0) {
					for (var j = 0; j < userTeamPlayer.length; j++) {
						let userPlayerDetails = userTeamPlayer[j];
						let matchPlayerDetails = await matchTeamPlayer.filter(obj => {
							return obj.fkPlayerId == userPlayerDetails['fkPlayerId'];
						});

						let point = 0;
						if (userPlayerDetails['isCaption'] == 1) {
							point =
								matchPlayerDetails[0]['point'] == null
									? 0
									: matchPlayerDetails[0]['point'] * 2;
						} else if (userPlayerDetails['isViceCaption'] == 1) {
							point =
								matchPlayerDetails[0]['point'] == null
									? 0
									: matchPlayerDetails[0]['point'] * 1.5;
						} else {
							point =
								matchPlayerDetails[0]['point'] == null
									? 0
									: matchPlayerDetails[0]['point'];
						}
						console.log(
							'User Team ID : ' +
							userPlayerDetails['id'] +
							', Global Point : ' +
							matchPlayerDetails[0]['point'] +
							' User Team Point : ' +
							point
						);
						let fantacyPointUpdate = await models.sequelize.query(
							'update gmsFantacyCricketUserTeam set point=' +
							point +
							' where id=' +
							userPlayerDetails['id'] +
							' limit 1',
							{ type: sequelize.QueryTypes.UPDATE }
						);
					}
				} else {
					console.log(
						'Match Id : ' +
						matchData[i]['matchId'] +
						', No User team player found .'
					);
				}
			}
		} else {
			console.log('No Match Data Found To Update User Team Fantacy Point.');
		}
	} catch (error) {
		console.log('DB Error Cron ID : ' + cronId + ' , ', error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

//Panding Trx Status Enquiry Cron . (10009)
//Purpose : It will Check the current status of pending trx. if it success then update the log as success other wise Roleback the trx
//This cron will execute at Interval of every 3 hour
//Schidule Time : 0 */3 * * *
//Test Time (each minute): */1 * * * *

cron.schedule('*/20 * * * *', async function () {
	var cronId = 10009;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		// Select all the Withdraw trx where pay status is in pending
		var data = await models.sequelize.query(
			"select id,fkSenderId,senderAcNum,customerRefNum, pgRefNo, amount, tds, apiMsg, createdAt from gmsPaymentTransactionLogWithdraw where pg=1 AND requestType=10 AND payStatus=30",
			{ type: sequelize.QueryTypes.SELECT }
		);

		if (data && data.length > 0) {
			for (var i = 0; i < data.length; i++) {
				var tlId = data[i]['id'].toString();
				var txnId = data[i]['pgRefNo'];
				var RefundedCheck = await models.sequelize.query(
					"select count(*) as cnt from gmsPaymentTransactionLogWithdraw where requestType=60 and customerRefNum='" + tlId + "'",
					{ type: sequelize.QueryTypes.SELECT }
				);
				if (RefundedCheck && RefundedCheck[0]['cnt'] >= 1) {
					console.log(`Refund has been already done : ${tlId} , Making the txn failed now.`);
					const update = await models.gmsPaymentTransactionLogWithdraw.update(
						{"payStatus":20},
						{
							where: {
								id: tlId,
							},
						}
					);
				} else {
					console.log('Checking Outward : ' + tlId);

					let custRefNum = data[i]['customerRefNum'];
					let userId = data[i]['fkSenderId'];
					let bankAccountVerificationUserId = data[i]['senderAcNum'];
					let amount = data[i]['amount'];
					let trxAPIMsg = data[i]['apiMsg'];
					let txnTime = new Date(data[i]['createdAt']).getTime();
					let tds = data[i]['tds'] ? +data[i]['tds'] : 0;

					var statusEnqData = {};
					statusEnqData.Customerid = config.iblTrx.customerId;
					statusEnqData.CustomerRefNumber = custRefNum;

					const randomAesKey = crypto.randomBytes(32).toString('hex');
        			console.log({randomAesKey});

					let requestObject = {};
					requestObject['data'] = await encryptData(randomAesKey,statusEnqData);
					requestObject['key'] = await encryptKey(randomAesKey);
					requestObject['bit'] = 0;

					
					var iblStatusEnqReq = {
						url: config.iblTrx.statusEnq,
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'IBL-Client-Id': config.iblTrx.iblClientId,
							'IBL-Client-Secret': config.iblTrx.iblClientSecret,
						},
						json: requestObject,
					};

					console.log(iblStatusEnqReq);


					await new Promise((resolve, reject) => {
						request(iblStatusEnqReq, async (err, resp, body) => {
							if (err) {
								console.log(err);
								reject(err);
							} else {
								let decryptedData = await decryptData(randomAesKey,resp.body.data);
								let iblResp=JSON.parse(decryptedData);
								console.log(iblResp)									;
								if (iblResp) {									
									var TransactionLogWithdrawUpdate = {};
									TransactionLogWithdrawUpdate.customerRefNum = custRefNum;
									TransactionLogWithdrawUpdate.iblRefNo = iblResp.IBLRefNo;
									TransactionLogWithdrawUpdate.bankRefNo = iblResp.UTR;
									TransactionLogWithdrawUpdate.utrNo = iblResp.UTR;
									TransactionLogWithdrawUpdate.description=iblResp['StatusDesc'];

									TransactionLogWithdrawUpdate.apiMsg =
										trxAPIMsg + JSON.stringify(iblResp);

									var statusCode = iblResp.StatusCode;
									let accountVerification;

									if (statusCode == 'S') {
										accountVerification=20;
										TransactionLogWithdrawUpdate.payStatus = 10; //Success
										TransactionLogWithdrawUpdate.description=await preparedDescription("WITHDRAW", 10,amount,{userId: userId }, tds ? +tds : 0);
									} else if (statusCode == 'R') {
										accountVerification=30;
										TransactionLogWithdrawUpdate.payStatus = 40; //Return To Bank Manuel Entry
										TransactionLogWithdrawUpdate.description=await preparedDescription("WITHDRAW", 20,(amount + tds),{userId: userId });
									} else if (statusCode == 'J' || statusCode == 'R009' || statusCode == 'R019') {
										//R009 is Input request validation Error 
										//R019 is Record not found error.
										accountVerification=30;
										TransactionLogWithdrawUpdate.payStatus = 20; //Failed
										TransactionLogWithdrawUpdate.description=await preparedDescription("WITHDRAW", 20,(amount + tds),{userId: userId });
									} else {
										accountVerification=10;
										TransactionLogWithdrawUpdate.payStatus = 30; //Pending
									}

									
									try {
										if(userId==700){ //GamesAPP
											//Time check here , If user deposit more than 1 Hr then autometically consider it Failed.
											let currentTime=new Date().getTime() + 1000 * 60 * 330;
											let timeDiff=(currentTime - txnTime)/(1000*60);
	
											console.log("Current Time : ",new Date(currentTime));
											console.log("Txn Time : ",new Date(txnTime));
											console.log("Time Diff",timeDiff);

											accountVerification = timeDiff >= 60 && accountVerification !=20  ? 30 : accountVerification;
											let isActive=accountVerification==20?1:0;
											try {
												let data = await models.gmsUserBankAccount.update({"isAccountVerified" : accountVerification,"isActive":isActive}, {
													where: {
														fkUserId: bankAccountVerificationUserId,
														isActive: 1
													}
												});

												if(accountVerification==20){
													const notification = {
														title: "Hey! You have a notification",
														body: `Hi Your bank has been successfully verified. #GamesappForWin.`
													};
													const notificationData = {
														"notificationType": "BANK_ACCOUNT_VERIFICATION",
														"message": `Your bank has been successfully verified. You can withdraw your winnings now. #GamesappForWin.`,
													}
													await NotificationService.sendPushNotification(bankAccountVerificationUserId, notificationData, notification);
												}
												
												TransactionLogWithdrawUpdate.payStatus= accountVerification==30? 20: TransactionLogWithdrawUpdate.payStatus;
											}
											catch (error) {
												console.log(`Unable to update bank verification details for user id : ${bankAccountVerificationUserId}`);
												console.log(error);
											}
										}

										const update = await models.gmsPaymentTransactionLogWithdraw.update(
											TransactionLogWithdrawUpdate,
											{
												where: {
													id: tlId,
												},
											}
										);

										//Make refund if txn get failed.
										//Ignore to refund account verification process.
										if (
											update 
											&& TransactionLogWithdrawUpdate.payStatus == 20 
											&& userId != 700
										) {
											console.log('Refunding Outward : ' + tlId);
											var insertTlData = {};
											insertTlData.fkSenderId = '900';
											insertTlData.fkReceiverId = userId;
											insertTlData.amount = amount;
											insertTlData.tds = tds;
											insertTlData.senderClosingBalance = 0;
											insertTlData.receiverClosingBalance = 0;
											insertTlData.requestType = 60;
											insertTlData.payStatus = 10;
											insertTlData.pg = 1;
											insertTlData.pgRefNo = tlId;
											insertTlData.customerRefNum = tlId;
											insertTlData.apiMsg = JSON.stringify(iblResp);
											insertTlData.description= await preparedDescription("WITHDRAW","REFUND",(amount + tds),{txnId:txnId})
											//insertTlData.description= await preparedDescription("WITHDRAW","REFUND",amount,{"txnId":data[i]['pgRefNo']})

											try {
												insertTlData.senderAcNum = insertTlData.fkSenderId;;
												insertTlData.receiverAcNum = insertTlData.fkReceiverId;

												insertTL = await models.gmsPaymentTransactionLogWithdraw
													.build(insertTlData)
													.save();
												//Update Withdraw Balance.
												if (insertTL) {
													console.log(
														'Insert refund transaction log successfully '
													);

													let from={};
													from['reason']="WITHDRAW_STATUS_ENQUIRY";
													from['txnLogId']=insertTL['dataValues']['id'];
													from['tds'] = tds;
													
													let updateUserWithdraw =  await updateUserAccountBalanceV2(
														insertTlData.fkReceiverId,
														20,
														+insertTlData.amount,
														"inc",
														from
													);

													if (updateUserWithdraw) {
														console.log('User Withdraw Balance Updated');
														//Send Push Notification
														let userName=await getUserNameById(userId);
														await outwardRefundNotification(userId,userName,amount,"WITHDRAW_REFUND")
													}
													else
														console.log(`Unable to update User withdraw balance `);
												}
											} catch (error) {
												console.log('Unable to insert refund transaction log');
												console.log(error);
											}
										}
									} catch (error) {
										console.log(error);
									}
								} else {
									console.log('Unable To get Status Enquiry Response');
								}
							}
							resolve(true);
						}); //End of request.
					}); //End Of Promise.
				}
			} //End of for loop
		} else {
			console.log('No Pending Trx found in Transaction withdraw Log');
		}
	} catch (error) {
		console.log('DB Error Cron Id : ' + cronId + ' , ', error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

//Winning Amount and Rank Update of GMS User (10010)
//Purpose : Update User winning amount and Rank(Based on winning amount)
//This Cron execute in interval of 30 min.
//Schidule Time : */30 * * * *
//Test Time every 10th sec. : */10 * * * * *

cron.schedule('*/30 * * * *', async function () {
	let cronId = 10010;
	let cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	console.log("Start Time : ",new Date().getSeconds());
	try {

		await models.sequelize.query(`CALL updateUserRankAndWinAmt()`);

		/*let rank = await models.sequelize.query(
			"SELECT  ROW_NUMBER() OVER(ORDER BY sum(T1.amount) DESC ) AS `rank` , T1.fkUserId as id, sum(T1.amount) as winPrize FROM "+
			"( "+
			"select ROW_NUMBER() OVER(ORDER BY sum(w.amount) DESC ) AS `rank`, w.fkReceiverId as fkUserId,SUM(w.amount) as amount  "+
			"from gmsPaymentTransactionLogWithdraw w  "+
			"where w.requestType=30 and w.payStatus=10 and w.amount!=0 and w.fkReceiverId is not null "+
			"GROUP BY w.fkReceiverId  "+
			"UNION  "+
			"select ROW_NUMBER() OVER(ORDER BY sum(e.delta) DESC ) AS `rank`, e.fkUserId,SUM(e.delta) as amount  "+
			"from gmsTableGameEndTrx e  "+
			"where e.status=20 AND e.delta > 0   "+
			"GROUP BY e.fkUserId  "+
			"UNION "+
			"select ROW_NUMBER() OVER(ORDER BY sum(e.delta) DESC ) AS `rank`, e.fkUserId,SUM(e.delta) as amount  "+
			"from gmsTableGameEndTrxC e  "+
			"where e.status=20 AND e.delta > 0  "+
			"GROUP BY e.fkUserId  "+
			") T1 GROUP BY T1.fkUserId ",
			{ type: sequelize.QueryTypes.SELECT }
		);*/

		//console.log("SELECT END Time : ",new Date().getSeconds());

		/*let updateField=[`rank`,`winPrize`];
		await models.gmsUsers.bulkCreate(rank, { updateOnDuplicate: updateField });*/

		/*var user = await models.sequelize.query(
			"update gmsUsers u, (SELECT  ROW_NUMBER() OVER(ORDER BY sum(T1.amount) DESC ) AS `rank` , T1.fkUserId, sum(T1.amount) as amount FROM "+
			"( "+
			"select ROW_NUMBER() OVER(ORDER BY sum(w.amount) DESC ) AS `rank`, w.fkReceiverId as fkUserId,SUM(w.amount) as amount  "+
			"from gmsPaymentTransactionLogWithdraw w  "+
			"where w.requestType=30 and w.payStatus=10 and w.amount!=0 and w.fkReceiverId is not null "+
			"GROUP BY w.fkReceiverId  "+
			"UNION  "+
			"select ROW_NUMBER() OVER(ORDER BY sum(e.delta) DESC ) AS `rank`, e.fkUserId,SUM(e.delta) as amount  "+
			"from gmsTableGameEndTrx e  "+
			"where e.status=20 AND e.delta > 0   "+
			"GROUP BY e.fkUserId  "+
			"UNION "+
			"select ROW_NUMBER() OVER(ORDER BY sum(e.delta) DESC ) AS `rank`, e.fkUserId,SUM(e.delta) as amount  "+
			"from gmsTableGameEndTrxC e  "+
			"where e.status=20 AND e.delta > 0  "+
			"GROUP BY e.fkUserId  "+
			") T1 GROUP BY T1.fkUserId) T2 "+
			"set u.winPrize=T2.amount,u.rank=T2.rank where u.id=T2.fkUserId  ",
			{ type: sequelize.QueryTypes.UPDATE }
		);*/

		console.log("End Time : ",new Date().getSeconds());

		/*if (user && user.length > 0) {
			try {
				for (var i = 0; i < user.length; i++) {
					let userWinAmtAndRankUpdate = await models.sequelize.query(
						'update gmsUsers set rank=' +
						(i + 1) +
						',winPrize=' +
						user[i]['amt'] +
						' where id=' +
						user[i]['fkReceiverId'] +
						' LIMIT 1',
						{ type: sequelize.QueryTypes.UPDATE }
					);
					if (userWinAmtAndRankUpdate)
						console.log(
							'User ID : ' +
							user[i]['fkReceiverId'] +
							' winning amount and rank updated successfully'
						);
					else
						console.log(
							'Unable to update winning amount and rank of the User ID : ' +
							user[i]['fkReceiverId']
						);
				}
			} catch (error) {
				console.log('DB Error : ' + error);
			}
		} else {
			console.log('No User Found');
		}*/
		console.log("User Leaderboard generated successfully.");
	} catch (error) {
		console.log('DB Error Cron Id : ' + cronId + ' , ', error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

async function isRefundedBonus(pgRefNo, playerId) {
	var data = await models.sequelize.query(
		'select count(*) as cnt from gmsPaymentTransactionLogBonus where fkReceiverId=' +
		playerId +
		" and pgRefNo='" +
		pgRefNo +
		"' and requestType=40 ",
		{ type: sequelize.QueryTypes.SELECT }
	);
	return data[0]['cnt'] >= 1 ? true : false;
}
async function isRefundedDeposit(pgRefNo, playerId) {
	var data = await models.sequelize.query(
		'select count(*) as cnt from gmsPaymentTransactionLogDeposit where fkReceiverId=' +
		playerId +
		" and pgRefNo='" +
		pgRefNo +
		"' and requestType=40 ",
		{ type: sequelize.QueryTypes.SELECT }
	);
	return data[0]['cnt'] >= 1 ? true : false;
}
async function isRefundedWithdraw(pgRefNo, playerId) {
	var data = await models.sequelize.query(
		'select count(*) as cnt from gmsPaymentTransactionLogWithdraw where fkReceiverId=' +
		playerId +
		" and pgRefNo='" +
		pgRefNo +
		"' and requestType in (30,50) ",
		{ type: sequelize.QueryTypes.SELECT }
	);
	return data[0]['cnt'] >= 1 ? true : false;
}

//Refund user entry fee in case user not successfully end the battle in Game (10011)
//Purpose : Update Battle room status 450 which is in (100,150).
//This Cron execute in interval of 30 min.
//Schidule Time : */30 * * * *
//Test Time every 10th sec. : */10 * * * * *

cron.schedule("*/30 * * * *", async function () {
	var cronId = 10011;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log("Cron : " + cronId + " is InActive/Closed , Status : " + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0);//Lock by setting status:0
	}
	console.log("Cron : " + cronId + " is Executing !");
	try {
		var battleRoom = await models.sequelize.query("select * from gmsBattleRoom where status in (100,150,200) AND createdAt < date_sub(Now() ,interval 30 Minute)", { type: sequelize.QueryTypes.SELECT });
		if (battleRoom && battleRoom.length > 0) {
			for (var j = 0; j < battleRoom.length; j++) {
				let pgRefNum = battleRoom[j]['br_roomId'].toString();
				var tlb = await models.sequelize.query("select * from gmsPaymentTransactionLogBonus " +
					"where pgRefNo='" + pgRefNum + "' and requestType=20", { type: sequelize.QueryTypes.SELECT });

				var tld = await models.sequelize.query("select * from gmsPaymentTransactionLogDeposit " +
					"where pgRefNo='" + pgRefNum + "' and requestType=20", { type: sequelize.QueryTypes.SELECT });

				var tlw = await models.sequelize.query("select * from gmsPaymentTransactionLogWithdraw " +
					"where pgRefNo='" + pgRefNum + "' and requestType=20", { type: sequelize.QueryTypes.SELECT });

				const isRefunded = true;
				//Refund from bonus
				for (var i = 0; tlb && i < tlb.length; i++) {
					if (! await isRefundedBonus(pgRefNum, tlb[i]['fkSenderId'])) {
						var trxLogBonus = {};
						trxLogBonus.fkSenderId = config.financialUser.Settlement; //Settlement Withdraw Account
						trxLogBonus.fkReceiverId = tlb[i]['fkSenderId'];
						trxLogBonus.amount = tlb[i]['amount'];
						trxLogBonus.senderClosingBalance = 0;
						trxLogBonus.receiverClosingBalance = 0;
						trxLogBonus.requestType = 40;
						trxLogBonus.payStatus = 10;
						trxLogBonus.pgRefNo = pgRefNum;
						trxLogBonus.fkGameId = tlb[i]['fkGameId'];
						trxLogBonus.gameEngine = tlb[i]['gameEngine'];
						trxLogBonus.engineId = tlb[i]['engineId'];

						/*var settlementBonusAc = await getUserAccount(trxLogBonus.fkSenderId, 40);
						var userBonusAc = await getUserAccount(trxLogBonus.fkReceiverId, 40);*/

						var settlementBonusAc = await getUserAccountV1(trxLogBonus.fkSenderId, 40);
						var userBonusAc = await getUserAccountV1(trxLogBonus.fkReceiverId, 40);

						trxLogBonus.senderAcNum = settlementBonusAc[0]['id'];
						trxLogBonus.receiverAcNum = userBonusAc[0]['id'];
						try {
							let insert = await models.gmsPaymentTransactionLogBonus.build(trxLogBonus).save();
							if (insert) {
								console.log("Bonus Log Created for User : " + trxLogBonus.fkReceiverId);
								//var currentBalSettlementBonus = +settlementBonusAc[0]['balance'] - +trxLogBonus.amount;
								// let updateSettlement = await updateUserAccountBalance(trxLogBonus.fkSenderId, 40, currentBalSettlementBonus);
								//let updateSettlement =  await updateUserAccountBalanceV1(trxLogBonus.fkSenderId, 40, currentBalSettlementBonus);
								let updateSettlement =  await updateUserAccountBalanceV2(trxLogBonus.fkSenderId, 40, +trxLogBonus.amount,"dec");

								if (updateSettlement)
									console.log("Settlement Bonus Account balance Updated Successfully ");
								else
									console.log("Unable to update settlement bonus account balance");

								// var currentBalUserBonus = +userBonusAc[0]['balance'] + +trxLogBonus.amount;
								// let updateUser = await updateUserAccountBalance(trxLogBonus.fkReceiverId, 40, currentBalUserBonus);
								// let updateUser = await updateUserAccountBalanceV1(trxLogBonus.fkReceiverId, 40, currentBalUserBonus);

								let updateUser = await updateUserAccountBalanceV2(trxLogBonus.fkReceiverId, 40, +trxLogBonus.amount, "inc");
								if (updateUser)
									console.log("User bonus account balance updated successfully ");
								else
									console.log("Unable to update user bonus account balance  ");
							}
						} catch (error) {
							isRefunded = false;
							console.log("Error", error);
						}
					} else {
						console.log("Already Refunded Deposit");
						console.log("PgRefNum : " + pgRefNum);
						console.log("User Id : " + tlb[i]['fkSenderId']);
					}
				} // End of trx log bonus loop 

				//Refund from deposit
				for (var i = 0; tld && i < tld.length; i++) {
					if (! await isRefundedDeposit(pgRefNum, tld[i]['fkSenderId'])) {
						var TransactionLogDepositInsert = {};
						TransactionLogDepositInsert.fkSenderId = config.financialUser.Settlement; //Settlement Withdraw Account
						TransactionLogDepositInsert.fkReceiverId = tld[i]['fkSenderId'];
						TransactionLogDepositInsert.amount = tld[i]['amount'];
						TransactionLogDepositInsert.senderClosingBalance = 0;
						TransactionLogDepositInsert.receiverClosingBalance = 0;
						TransactionLogDepositInsert.requestType = 40;
						TransactionLogDepositInsert.payStatus = 10;
						TransactionLogDepositInsert.pgRefNo = pgRefNum;
						TransactionLogDepositInsert.fkGameId = tld[i]['fkGameId'];
						TransactionLogDepositInsert.gameEngine = tld[i]['gameEngine'];
						TransactionLogDepositInsert.engineId = tld[i]['engineId'];

						/*var settlementDepositAc = await getUserAccount(TransactionLogDepositInsert.fkSenderId, 10);
						var userDepositAc = await getUserAccount(TransactionLogDepositInsert.fkReceiverId, 10);*/

						var settlementDepositAc = await getUserAccountV1(TransactionLogDepositInsert.fkSenderId, 10);
						var userDepositAc = await getUserAccountV1(TransactionLogDepositInsert.fkReceiverId, 10);

						TransactionLogDepositInsert.senderAcNum = settlementDepositAc[0]['id'];
						TransactionLogDepositInsert.receiverAcNum = userDepositAc[0]['id'];
						try {
							let insert = await models.gmsPaymentTransactionLogDeposit.build(TransactionLogDepositInsert).save();
							if (insert) {
								console.log("Deposit Log Created for User : " + TransactionLogDepositInsert.fkReceiverId);
								//var currentBalSettlementDeposit = +settlementDepositAc[0]['balance'] - +TransactionLogDepositInsert.amount;
								// let updateSettlement = await updateUserAccountBalance(TransactionLogDepositInsert.fkSenderId, 10, currentBalSettlementDeposit);
								// let updateSettlement = await updateUserAccountBalanceV1(TransactionLogDepositInsert.fkSenderId, 10, currentBalSettlementDeposit);
								let updateSettlement = await updateUserAccountBalanceV2(TransactionLogDepositInsert.fkSenderId, 10, +TransactionLogDepositInsert.amount, "dec");
								if (updateSettlement)
									console.log("Settlement Deposit Account balance Updated Successfully ");
								else
									console.log("Unable to update settlement deposit account balance  ");
								// var currentBalUserDeposit = +userDepositAc[0]['balance'] + +TransactionLogDepositInsert.amount;
								// let updateUser = await updateUserAccountBalance(TransactionLogDepositInsert.fkReceiverId, 10, currentBalUserDeposit);
								// let updateUser = await updateUserAccountBalanceV1(TransactionLogDepositInsert.fkReceiverId, 10, currentBalUserDeposit);
								let updateUser = await updateUserAccountBalanceV2(TransactionLogDepositInsert.fkReceiverId, 10, +TransactionLogDepositInsert.amount, "inc");
								if (updateUser)
									console.log("User deposit account balance updated successfully ");
								else
									console.log("Unable to update user deposit account balance  ");
							}
						} catch (error) {
							isRefunded = false;
							console.log("Error", error);
						}
					} else {
						console.log("Already Refunded Deposit");
						console.log("PgRefNum : " + pgRefNum);
						console.log("User Id : " + tld[i]['fkSenderId']);
					}
				}//End of Trx log Deposit loop.

				//Refund from withdraw
				for (var i = 0; tlw && i < tlw.length; i++) {
					if (! await isRefundedWithdraw(pgRefNum, tlw[i]['fkSenderId'])) {
						var TransactionLogWithdrawInsert = {};
						TransactionLogWithdrawInsert.fkSenderId = config.financialUser.Settlement; //Settlement Withdraw Account
						TransactionLogWithdrawInsert.fkReceiverId = tlw[i]['fkSenderId'];
						TransactionLogWithdrawInsert.amount = tlw[i]['amount'];
						TransactionLogWithdrawInsert.senderClosingBalance = 0;
						TransactionLogWithdrawInsert.receiverClosingBalance = 0;
						TransactionLogWithdrawInsert.requestType = 50;
						TransactionLogWithdrawInsert.payStatus = 10;
						TransactionLogWithdrawInsert.pgRefNo = pgRefNum;
						TransactionLogWithdrawInsert.fkGameId = tlw[i]['fkGameId'];
						TransactionLogWithdrawInsert.gameEngine = tlw[i]['gameEngine'];
						TransactionLogWithdrawInsert.engineId = tlw[i]['engineId'];

						/*var settlementWithdrawAc = await getUserAccount(TransactionLogWithdrawInsert.fkSenderId, 20);
						var userWithdrawAc = await getUserAccount(TransactionLogWithdrawInsert.fkReceiverId, 20);*/

						var settlementWithdrawAc = await getUserAccountV1(TransactionLogWithdrawInsert.fkSenderId, 20);
						var userWithdrawAc = await getUserAccountV1(TransactionLogWithdrawInsert.fkReceiverId, 20);

						TransactionLogWithdrawInsert.senderAcNum = settlementWithdrawAc[0]['id'];
						TransactionLogWithdrawInsert.receiverAcNum = userWithdrawAc[0]['id'];
						try {
							const insert = await models.gmsPaymentTransactionLogWithdraw.build(TransactionLogWithdrawInsert).save();
							if (insert) {
								console.log("Withdraw Log Created for User : " + TransactionLogWithdrawInsert.fkReceiverId);
								// var currentBalSettlementWithdrawt = +settlementWithdrawAc[0]['balance'] - +TransactionLogWithdrawInsert.amount;
								// let updateSettlement = await updateUserAccountBalance(TransactionLogWithdrawInsert.fkSenderId, 20, currentBalSettlementWithdrawt);
								// let updateSettlement = await updateUserAccountBalanceV1(TransactionLogWithdrawInsert.fkSenderId, 20, currentBalSettlementWithdrawt);
								
								let updateSettlement = await updateUserAccountBalanceV2(TransactionLogWithdrawInsert.fkSenderId, 20, +TransactionLogWithdrawInsert.amount, "dec");
								if (updateSettlement)
									console.log("Settlement withdraw account balance updated successfully ");
								else
									console.log("Unable to update settlement withdraw account balance  ");
								// var currentBalUserWithdraw = +userWithdrawAc[0]['balance'] + +TransactionLogWithdrawInsert.amount;
								// let updateUser = await updateUserAccountBalance(TransactionLogWithdrawInsert.fkReceiverId, 20, currentBalUserWithdraw);
								// let updateUser = await updateUserAccountBalanceV1(TransactionLogWithdrawInsert.fkReceiverId, 20, currentBalUserWithdraw);
								
								let updateUser = await updateUserAccountBalanceV2(TransactionLogWithdrawInsert.fkReceiverId, 20, +TransactionLogWithdrawInsert.amount, "inc");
								if (updateUser)
									console.log("User withdraw account balance updated successfully ");
								else
									console.log("Unable to update user withdraw account balance  ");
							}
						} catch (error) {
							isRefunded = false;
							console.log("Error", error);
						}
					} else {
						console.log("Already Refunded Withdraw");
						console.log("PgRefNum : " + pgRefNum);
						console.log("User Id : " + tlw[i]['fkSenderId']);
					}
				}//End of Trx log Withdraw loop
				try {
					let battleUpdate = await models.sequelize.query("update gmsBattleRoom set status=450 where br_roomId=" + pgRefNum + " ", { type: sequelize.QueryTypes.UPDATE });
					console.log("Battle room status updated successfully");
					if (isRefunded) {
						const fkPlayerId1 = battleRoom[j]['fk_PlayerId1'];
						const fkPlayerId2 = battleRoom[j]['fk_PlayerId2'];
						const fkBattleId = battleRoom[j]['fk_BattleId'];
						const gameDetails = await getGameDetailsByBattleId(fkBattleId);
						if (gameDetails && gameDetails[0]['amount']) {
							console.log(`Sending Push Notification Engine: Battle Refund (10011), Battle Room Id : ${pgRefNum}`)
							//Fetch both user data.
							if (fkPlayerId1) {
								//Send Push notification for first player.
								const userName = await getUserNameById(fkPlayerId1)
								await entryFeeRefundNotification(fkPlayerId1, userName, gameDetails[0]['amount'], gameDetails[0]['gameTitle'], "BATTLE_REFUND");
							}
							if (fkPlayerId2) {
								//Send Push notification for first player.
								const userName = await getUserNameById(fkPlayerId2)
								await entryFeeRefundNotification(fkPlayerId2, userName, gameDetails[0]['amount'], gameDetails[0]['gameTitle'], "BATTLE_REFUND");
							}

						}
						else {
							console.log("We are unable to send push notification (Game details not available) for Engine Game Battle Room Id : " + pgRefNum);
						}
					}
				}
				catch (error) {
					console.log("Unable to update battle room status ");
					console.log("Error : ", error);
				}
			} //End of Outer For loop (Battle room refund )
		} else {
			console.log('Currently No Refund is Available in Battle .');
		}
	} catch (error) {
		console.log('DB Error Cron Id : ' + cronId + ' , ', error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

async function getGameDetailsByBattleId(battleId) {
	try {
		let gameDetails = await models.sequelize.query(
			`select b.paidAmount as amount,CONCAT(g.title,' ( ',b.title,' )') as gameTitle
			from gmsBattle b
			LEFT JOIN gmsGames g on g.id=b.fk_GamesId
			where b.id=${battleId}`,
			{ type: sequelize.QueryTypes.SELECT }
		);

		return gameDetails && gameDetails.length > 0 ? gameDetails : false;
	}
	catch (error) {
		console.log("Error in getGameDetailsByBattleId() : ", error);
		return false;
	}
}

async function getUserNameById(userId) {
	try {
		let userName = await models.sequelize.query(
			`select userName from gmsUsers where id=${userId}`,
			{ type: sequelize.QueryTypes.SELECT }
		);
		return userName && userName.length > 0 ? userName[0]['userName'] : false;
	}
	catch (error) {
		console.log("Error in getUserNameById() : ", error);
		return false;
	}
}

async function getUserAccount(userId, acType) {
	try {
		let acNum = await models.sequelize1.query(
			'select id,balance from gmsUserAccount where fkUserId=' +
			userId +
			' and acType=' +
			acType,
			{ type: sequelize.QueryTypes.SELECT }
		);

		return acNum;
	} catch (error) {
		console.log('Error : ', error);
		return false;
	}
}

async function getUserAccountV1(userId, acType) {
	let balField=accTypeField[acType];
	try {
		/*let acNum = await models.sequelize1.query(
			`select id,${balField} as balance from gmsUserAccounts where fkUserId=${userId} `,
			{ type: sequelize.QueryTypes.SELECT }
		);
		return acNum;*/

		let accountBalDetails=await gmsUserAccountGet(userId);
		let retData=[];
		let data={"id":userId, "balance":accountBalDetails[balField]};
		retData.push(data);
		return retData;

	} catch (error) {
		console.log('Error (getUserAccountV1): ', error);
		return false;
	}
}

async function updateUserAccountBalance(userId, acType, amount) {
	try {
		let update = await models.sequelize.query(
			'update gmsUserAccount set balance=' +
			amount +
			' where fkUserId=' +
			userId +
			' and acType=' +
			acType +
			' limit 1',
			{ type: sequelize.QueryTypes.UPDATE }
		);
		return update;
	} catch (error) {
		console.log('Error : ', error);
		return false;
	}
}

async function updateUserAccountBalanceV1(userId, acType, amount) {
	let balField=accTypeField[acType];
	try {
		let update = await models.sequelize.query(
			`update gmsUserAccounts set ${balField}=${amount} where fkUserId=${userId}  limit 1`,
			{ type: sequelize.QueryTypes.UPDATE }
		);
		return update;
	} catch (error) {
		console.log('Error (updateUserAccountBalanceV1 ) : ', error);
		return false;
	}
}

async function updateUserAccountBalanceV2(userId, acType, amount,trxType,from=null) {
	let balField=accTypeField[acType];
	try {
		let amountData={};
		amountData[balField]=amount;

		let updateBalanceData={
			"playerId" : userId,
			"amountData" : amountData,
			"type":trxType,
			"from":{"purpose":"UPDATE_BALANCE_CRONJOB"}
		}

		let update=await gmsUserAccountCreateOrUpdateWallet(updateBalanceData);
		return update;
	} catch (error) {
		console.log('Error (updateUserAccountBalanceV2 ) : ', error);
		return false;
	}
}



//Prize Distribution Generation Of cricket fantacy (10012)
//Purpose : Generate prize distributed amount of user in cricket fantacy after match completed and verified
//This Cron execute in interval of 10 min.
//Schidule Time : */10 * * * *
//Test Time every 10th sec. : */10 * * * * *

cron.schedule('*/30 * * * *', async function () {

	var cronId = 10012;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		var match =await models.FantacyCricket.query(
			'SELECT matchId FROM gmsFantacyCricketMatch cm,gmsFantacyCricketContest cc  where cm.matchId=cc.fkMatchId and cm.status in (2,4) AND cm.verified=1 and cc.isPrizeDistributionDone in (20,40) group by cm.matchId',
			{ type: sequelize.QueryTypes.SELECT }
		);
		if (match && match.length > 0) {
			for (var i = 0; i < match.length; i++) {
				/*await new Promise((resolve, reject) => {
					try {
						request(
							config.matchDistributionPrizeAPI + '' + match[i]['matchId'],
							{ json: true, rejectUnauthorized: false },
							async (err, resp, body) => {
								if (err) {
									console.log(
										'Prize Distribution Failed for match id : ' +
										match[i]['matchId'] +
										' something went wrong.'
									);
									console.log(err);
									reject(err);
								} else {
									console.log(
										'Prize Distribution for match id : ' +
										match[i]['matchId'] +
										' has successfully distributed'
									);
									//var update=await models.sequelize.query("UPDATE gmsFantacyCricketContest set isPrizeDistributionDone=(CASE WHEN isPrizeDistributionDone=20 then 30 WHEN isPrizeDistributionDone=40 then 50 END)  where fkMatchId="+match[i]['matchId']+" and isPrizeDistributionDone in (20,40)",{ type: sequelize.QueryTypes.UPDATE});
									resolve(true);
								}
							}
						);
					} catch (error) {
						console.log(
							'Croin Id : ' +
							cronId +
							' error API Call , Match Id : ' +
							match[i]['matchId']
						);
						console.log(error);
						resolve(true);
					}
				}); //End of Promise.*/

				
				await cricketFantacyPrizeDistribution(match[i]['matchId']);
				await distributeEveryBodyWinContestPrize(match[i]['matchId']);
			}
		} else {
			console.log('Currently No Match is available to distribute the prize .');
		}
	} catch (error) {
		console.log('DB Error Cron Id : ' + cronId + ' , ', error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

async function updateUserGamePlayMatrix(userId,gameId,result,amount){

	let userExistingMatrix=await models.gmsUsers.findAll({
		attributes: ["totalWins", "totalWinningAmount", "gameMatrix"],
		where: { id: userId }
	});

	if(userExistingMatrix && userExistingMatrix.length > 0){
		
		let {totalWins,totalWinningAmount, gameMatrix} = userExistingMatrix[0];
		gameMatrix= !gameMatrix ? [] : JSON.parse(gameMatrix);
		gameMatrix= await resetExistingUserPlayMetrix(gameMatrix, gameId,result)

		if(result==2){
			totalWins=totalWins + 1;
			totalWinningAmount = totalWinningAmount + amount;
		}

		let updatedData = {};
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

async function resetExistingUserPlayMetrix(gameMatrix,gameId,result){

	const gameDataIndex = gameMatrix.findIndex(object => {
		return object.gameId == gameId;
	});

	//Case - 1 : If user already play the game
	if(gameDataIndex >=0){
		if(result==1){
			gameMatrix[gameDataIndex]['play'] = gameMatrix[gameDataIndex]['play'] +1;
		}
		else if(result==2){
			gameMatrix[gameDataIndex]['win'] = gameMatrix[gameDataIndex]['win'] +1;
		}
		else if(result==3){
			gameMatrix[gameDataIndex]['lose'] = gameMatrix[gameDataIndex]['lose'] +1;
		}
		else if(result==4){
			gameMatrix[gameDataIndex]['draw'] = gameMatrix[gameDataIndex]['draw'] +1;
		}
		return gameMatrix;
	}
	//Case - 2 : If user play the game for first time
	else{
		let preparedData={};
		preparedData.gameId=gameId;
		if(result==1){
			preparedData['play'] = 1;
			preparedData.win=0;
			preparedData.lose=0;
			preparedData.draw=0;

		}
		else if(result==2){
			preparedData.play = 0
			preparedData.win=1;
			preparedData.lose=0;
			preparedData.draw=0;
		}
		else if(result==3){
			preparedData.play = 0
			preparedData.win=0;
			preparedData.lose=1;
			preparedData.draw=0;
		}
		else if(result==4){
			preparedData.play = 0
			preparedData.win=0;
			preparedData.lose=0;
			preparedData.draw=1;
		}
		gameMatrix.push(preparedData);
		return gameMatrix;
	}//End of Case 2 Else block

}

 async function cricketFantacyPrizeDistribution(matchId){
	try{
		let contestData= await models.FantacyCricket.query(
			`SELECT * FROM gmsFantacyCricketContest
			WHERE isPrizeDistributionDone in (20,40)
				AND fkMatchId=${matchId} AND contestType in (1,2,3)`,
			{ type: sequelize.QueryTypes.SELECT }
		);

		for(let i=0; i<contestData.length;i++){
			if (!(await isPrizeDistributedByContestId(contestData[i]['id']))) {

				let PDData=await getContestPrizeBreakup(contestData[i]['entryFee'],contestData[i]['totalUserTeam'],contestData[i]['fkPDId'])
				console.log(PDData);

				console.log(`Contest prize distibution starting for Contest ID : ${contestData[i]['id']} Match ID : ${matchId}`);
				let teamData = await models.sequelize.query(
					'select t.teamCode,t.title as teamTitle, ' +
					' t.fkUserId as fkUserId,' +
					" CONCAT(u.firstName,' ',u.lastName) as userName," +
					' sum(t.point) as score ,' +
					' t.fkContestId as fkContestId' +
					' from gmsFantacyCricketUserTeam t' +
					' INNER JOIN gmsUsers u on u.id=t.fkUserId' +
					' where fkContestId=' +
					contestData[i]['id'] +
					' GROUP BY teamCode ORDER BY score DESC',
					{ type: sequelize.QueryTypes.SELECT }
				);

				//If contest status is refund
				if(contestData[i]['isPrizeDistributionDone'] == 40) {
					for (var j = 0; teamData && j < teamData.length; j++) {
						teamData[j]['indexPrize'] = 0;
						teamData[j]['rank'] = 0;
						teamData[j]['indexRank'] = 0;
						teamData[j]['actualPrize'] = contestData[i]['entryFee'];
						teamData[j]['status'] = 3;
						await updateUserGamePlayMatrix(teamData[j]['fkUserId'],0,4)
					}
				}
				else{
					//Distribute Winning amount
					
					let Rank = 0;
					let IndexRank=0;
					let flag=false;
					let sameRankCount=1;
					for (var k = 0; teamData && k < teamData.length; k++) {
						if (k == 0){
							Rank = 1;
						} 
						else {
							if (teamData[k]['score'] < teamData[k - 1]['score']) {
								Rank = Rank + 1;
								flag=true;
							}
							else{
								sameRankCount++;
								
							}
						}
						IndexRank ++;

						teamData[k]['rank']=Rank;
						teamData[k]['indexRank']=IndexRank;
						teamData[k]['indexPrize']	= 0;
						teamData[k]['actualPrize']	= 0;
						teamData[k]['status']	= 2;

						for (let s=0;s<PDData.length;s++){
							if(Rank <= PDData[s]['rank']['endRank'] && Rank >= PDData[s]['rank']['startRank']){
								teamData[k]['indexPrize']	= PDData[s]['prize'];
								teamData[k]['status']	= 1;
								if(flag){
									let z=1;
									while(z<=sameRankCount){
										teamData[k-z]['actualPrize'] = Math.round(teamData[k-z]['indexPrize']/sameRankCount);		
										z++;
									}
									sameRankCount=1
									flag=false;
								}
								break;
							}
							else{
								await updateUserGamePlayMatrix(teamData[k]['fkUserId'],0,3);
							}
						}//End of Index prize loop.
						if(flag && teamData[k-sameRankCount]['status']==1){
							let gameMatrixActualPrize=0;
							let z=1;
							while(z<=sameRankCount){
								teamData[k-z]['actualPrize'] = Math.round(teamData[k-z]['indexPrize']/sameRankCount);
								gameMatrixActualPrize =teamData[k-z]['actualPrize'];
								z++;
							}
							sameRankCount=1
							flag=false;
							await updateUserGamePlayMatrix(teamData[k]['fkUserId'],0,2,gameMatrixActualPrize);
						}
					
					} //End of team data loop
				} 
				
				const insert = await models.gmsContestPrizeDistribution.bulkCreate(
					teamData
				);
				if (insert) {
					console.log(`Prize distributed successfully for contest ID : ${contestData[i]['id']}`);

					var finalStatus = contestData[i]['isPrizeDistributionDone'] == 20 ? 30 : 50;
					var UpdateContest = await models.FantacyCricket.query(
						`UPDATE gmsFantacyCricketContest set  isPrizeDistributionDone= ${finalStatus}  
						where id=${contestData[i]['id']}`,
						{ type: sequelize.QueryTypes.UPDATE }
					);
					if (UpdateContest) {
						console.log(`Contest Updated successfully : ContestID : ${contestData[i]['id']}  isPD : ${finalStatus}`);
					}
				}

			}
			else{
				console.log(
					`Prize already distributed Contest ID : ${contestData[i]['id']}  Match ID : ${contestData[i]['fkMatchId']}`
				);
			}
		}//End of contest Loop loop.
	}
	catch(error){
		console.log("Error in (cricketFantacyPrizeDistribution ) : ",error);
		return false;
	}
}

async function getContestPrizeBreakup(entryFee,joinedUser,PDId){
	try{
		let PDData = await models.sequelize.query(`SELECT * FROM gmsPrizeDistributionConfig
							WHERE groupId=${PDId}`,
							{type: sequelize.QueryTypes.SELECT});

		let retData=[];
		

		if(PDData && PDData.length>0){
			let totalAmount=entryFee * joinedUser;
			let randomPriceData =[];
			for(let i=0; i<PDData.length; i++){
				let rankFrom=0;
				let rankTill=0;
				let prizeDescription=0;
				
				
				if(PDData[i]['classInterval']  == 1){
					rankFrom = 1;
				}else{
					rankFrom = randomPriceData[randomPriceData.length-1]['rankTill'] + 1;
				}

				if(PDData[i]['totalWinnerPercentage'] < 0){
					rankTill = rankFrom;
				}else{
					rankTill = Math.floor((joinedUser * PDData[i]['totalWinnerPercentage'] / 100) + rankFrom - 1);
				}



				let totalNumberOfWinner = rankTill - rankFrom + 1;
				let totalPriceAmount = totalAmount * PDData[i]['totalAmountPercentage']/100;
				
				
				randomPriceData.push ({

					'rankFrom' : rankFrom,
					'rankTill' : rankTill,
				});

				//  prizeDescription must be greater then 0.
				prizeDescription = Math.round(totalPriceAmount/ (rankTill - rankFrom + 1));
			
				retData.push({
					"rank":{
						"startRank":rankFrom,
						"endRank":rankTill
					},
					"prize":prizeDescription
				})
			}//end of for loop prepared Data.

			return retData;

		}
		else{
			console.log("Invalid Prize distribution id");
			return false;
		}
	}
	catch(error){
		console.log("Error - (contestPrizeBreakupLive) : ",error);
		return false;
	}
}

//Refund Money if not refunded in Battle from Transaction Log (10013)
//Purpose : If Game room created and transaction log pgRef Num Not Update then refund Money to user Wallet
//This Cron execute in interval of 30 min.
//Schidule Time : */30 * * * *
//Test Time every 20th sec. : */20 * * * * *
//Cron-ID - 10013  
cron.schedule("*/30 * * * *", async function () {
	var cronId = 10013;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log("Cron : " + cronId + " is InActive/Closed , Status : " + cron[0]['status']);
		return true;
	}
	else {
		await lockUnlock(cronId, 0);//Lock by setting status:0
	}
	console.log("Cron : " + cronId + " is Executing !");
	try {
		var tlb = await models.sequelize.query("select * from gmsPaymentTransactionLogBonus " +
			"where pgRefNo is null and apiMsg is null and requestType=20 and gameEngine=1 and payStatus=10", { type: sequelize.QueryTypes.SELECT });

		var tld = await models.sequelize.query("select * from gmsPaymentTransactionLogDeposit " +
			"where pgRefNo is null and apiMsg is null and requestType=20 and gameEngine=1 and payStatus=10", { type: sequelize.QueryTypes.SELECT });

		var tlw = await models.sequelize.query("select * from gmsPaymentTransactionLogWithdraw " +
			"where pgRefNo is null and apiMsg is null and requestType=20 and gameEngine=1 and payStatus=10", { type: sequelize.QueryTypes.SELECT });

		if (tlb && tlb.length > 0) {
			for (var i = 0; i < tlb.length; i++) {
				var trxLogBonus = {};
				var refundId = await getRandomUniqueNum(6);
				var receiver = tlb[i]['fkSenderId'];
				var sender = tlb[i]['fkReceiverId'];
				trxLogBonus.fkSenderId = sender;
				trxLogBonus.fkReceiverId = receiver;
				trxLogBonus.amount = tlb[i]['amount'];
				trxLogBonus.senderClosingBalance = 0;
				trxLogBonus.receiverClosingBalance = 0;
				trxLogBonus.requestType = 40;
				trxLogBonus.payStatus = 10;
				trxLogBonus.pgRefNo = refundId;
				trxLogBonus.apiMsg = "{'msg':'Refund By Cron','tlb-id':'" + tlb[i]['id'] + "'}";
				trxLogBonus.fkGameId = tlb[i]['fkGameId'];
				trxLogBonus.gameEngine = tlb[i]['gameEngine'];
				trxLogBonus.engineId = tlb[i]['engineId'];

				/*var settlementBonusAc = await getUserAccount(trxLogBonus.fkSenderId, 40);
				var userBonustAc = await getUserAccount(trxLogBonus.fkReceiverId, 40);*/

				var settlementBonusAc = await getUserAccountV1(trxLogBonus.fkSenderId, 40);
				var userBonustAc = await getUserAccountV1(trxLogBonus.fkReceiverId, 40);

				trxLogBonus.senderAcNum = settlementBonusAc[0]['id'];
				trxLogBonus.receiverAcNum = userBonustAc[0]['id'];
				try {
					let insert = await models.gmsPaymentTransactionLogBonus.build(trxLogBonus).save();
					if (insert) {
						console.log("Bonus Log Created");
						console.log("Refund Log Id : " + tlb[i]['id']);
						console.log("Created Log Id : " + insert['dataValues']['id']);
						console.log("Sender  : " + trxLogBonus.fkSenderId);
						console.log("Receiver  : " + trxLogBonus.fkReceiverId);

						// Update Account balance of sender and receiver 
						// var currentBalSettlementBonus = +settlementBonusAc[0]['balance'] - +trxLogBonus.amount;
						// let updateSettlement = await updateUserAccountBalance(trxLogBonus.fkSenderId, 40, currentBalSettlementBonus);
						// let updateSettlement = await updateUserAccountBalanceV1(trxLogBonus.fkSenderId, 40, currentBalSettlementBonus);
						let updateSettlement = await updateUserAccountBalanceV2(trxLogBonus.fkSenderId, 40, +trxLogBonus.amount, "dec");
						if (updateSettlement)
							console.log("Settlement Bonus Account balance Updated Successfully ");
						else
							console.log("Unable to update settlement Bonus account balance  ");


						// var currentBalUserBonus = +userBonustAc[0]['balance'] + +trxLogBonus.amount;
						// let updateUser = await updateUserAccountBalance(trxLogBonus.fkReceiverId, 40, currentBalUserBonus);
						// let updateUser = await updateUserAccountBalanceV1(trxLogBonus.fkReceiverId, 40, currentBalUserBonus);
						let updateUser = await updateUserAccountBalanceV2(trxLogBonus.fkReceiverId, 40, +trxLogBonus.amount, "inc");
						if (updateUser)
							console.log("User bonus account balance updated successfully ");
						else
							console.log("Unable to update user bonus account balance  ");

						//Update Log , Make it refund has been done.
						let apiMsg = { 'msg': 'Refund By Cron', 'tld-id': insert['dataValues']['id'] };
						apiMsg = JSON.stringify(apiMsg);
						let update = await models.sequelize.query("update gmsPaymentTransactionLogBonus set pgRefNo='" + refundId + "',apiMsg='" + apiMsg + "' where id=" + tlb[i]['id'] + " limit 1", { type: sequelize.QueryTypes.UPDATE });
					}
				}
				catch (error) {
					console.log("Error in TLB Processing ");
					console.log(error);
				}
			}//End of Trx log Bonus for loop.
		}
		else
			console.log("No record found in TLB for refund.")

		if (tld && tld.length > 0) {
			for (var i = 0; i < tld.length; i++) {
				var TransactionLogDepositInsert = {};
				var refundId = await getRandomUniqueNum(6);
				var receiver = tld[i]['fkSenderId'];
				var sender = tld[i]['fkReceiverId'];
				TransactionLogDepositInsert.fkSenderId = sender;
				TransactionLogDepositInsert.fkReceiverId = receiver;
				TransactionLogDepositInsert.amount = tld[i]['amount'];
				TransactionLogDepositInsert.senderClosingBalance = 0;
				TransactionLogDepositInsert.receiverClosingBalance = 0;
				TransactionLogDepositInsert.requestType = 40;
				TransactionLogDepositInsert.payStatus = 10;
				TransactionLogDepositInsert.pgRefNo = refundId;
				TransactionLogDepositInsert.apiMsg = "{'msg':'Refund By Cron','tld-id':'" + tld[i]['id'] + "'}";
				TransactionLogDepositInsert.fkGameId = tld[i]['fkGameId'];
				TransactionLogDepositInsert.gameEngine = tld[i]['gameEngine'];
				TransactionLogDepositInsert.engineId = tld[i]['engineId'];

				/*var settlementDepositAc = await getUserAccount(TransactionLogDepositInsert.fkSenderId, 10);
				var userDepositAc = await getUserAccount(TransactionLogDepositInsert.fkReceiverId, 10);*/

				var settlementDepositAc = await getUserAccountV1(TransactionLogDepositInsert.fkSenderId, 10);
				var userDepositAc = await getUserAccountV1(TransactionLogDepositInsert.fkReceiverId, 10);

				TransactionLogDepositInsert.senderAcNum = settlementDepositAc[0]['id'];
				TransactionLogDepositInsert.receiverAcNum = userDepositAc[0]['id'];
				try {
					let insert = await models.gmsPaymentTransactionLogDeposit.build(TransactionLogDepositInsert).save();
					if (insert) {
						console.log("Deposit Log Created");
						console.log("Refund Log Id : " + tld[i]['id'])
						console.log("Created Log Id : " + insert['dataValues']['id']);
						console.log("Sender  : " + TransactionLogDepositInsert.fkSenderId);
						console.log("Receiver  : " + TransactionLogDepositInsert.fkReceiverId);

						// Update Account balance of sender and receiver 
						// var currentBalSettlementDeposit = +settlementDepositAc[0]['balance'] - +TransactionLogDepositInsert.amount;
						// let updateSettlement = await updateUserAccountBalance(TransactionLogDepositInsert.fkSenderId, 10, currentBalSettlementDeposit);
						// let updateSettlement = await updateUserAccountBalanceV1(TransactionLogDepositInsert.fkSenderId, 10, currentBalSettlementDeposit);
						let updateSettlement = await updateUserAccountBalanceV2(TransactionLogDepositInsert.fkSenderId, 10, +TransactionLogDepositInsert.amount, "dec");
						if (updateSettlement)
							console.log("Settlement Deposit Account balance Updated Successfully ");
						else
							console.log("Unable to update settlement deposit account balance  ");


						// var currentBalUserDeposit = +userDepositAc[0]['balance'] + +TransactionLogDepositInsert.amount;
						// let updateUser = await updateUserAccountBalance(TransactionLogDepositInsert.fkReceiverId, 10, currentBalUserDeposit);
						// let updateUser = await updateUserAccountBalanceV1(TransactionLogDepositInsert.fkReceiverId, 10, currentBalUserDeposit);
						
						let updateUser = await updateUserAccountBalanceV2(TransactionLogDepositInsert.fkReceiverId, 10, +TransactionLogDepositInsert.amount, "inc");
						
						if (updateUser)
							console.log("User deposit account balance updated successfully ");
						else
							console.log("Unable to update user deposit account balance  ");

						//Update Log , Make it refund has been done.
						let apiMsg = { 'msg': 'Refund By Cron', 'tld-id': insert['dataValues']['id'] };
						apiMsg = JSON.stringify(apiMsg);
						let update = await models.sequelize.query("update gmsPaymentTransactionLogDeposit set pgRefNo='" + refundId + "',apiMsg='" + apiMsg + "' where id=" + tld[i]['id'] + " limit 1", { type: sequelize.QueryTypes.UPDATE });
					}
				}
				catch (error) {
					console.log("Error in TLD Processing ");
					console.log(error);
				}

			}//End of Trx log Deposit for loop.
		}
		else
			console.log("No record found in TLD for refund.")

		if (tlw && tlw.length > 0) {
			for (var i = 0; i < tlw.length; i++) {
				var TransactionLogWithdrawInsert = {};
				var receiver = tlw[i]['fkSenderId'];
				var sender = tlw[i]['fkReceiverId'];
				var refundId = await getRandomUniqueNum(6);
				TransactionLogWithdrawInsert.fkSenderId = sender; //Settlement Withdraw Account
				TransactionLogWithdrawInsert.fkReceiverId = receiver;
				TransactionLogWithdrawInsert.amount = tlw[i]['amount'];
				TransactionLogWithdrawInsert.senderClosingBalance = 0;
				TransactionLogWithdrawInsert.receiverClosingBalance = 0;
				TransactionLogWithdrawInsert.requestType = 50;
				TransactionLogWithdrawInsert.payStatus = 10;
				TransactionLogWithdrawInsert.pgRefNo = refundId;
				TransactionLogWithdrawInsert.apiMsg = "{'msg':'Refund By Cron','tlw-id':'" + tlw[i]['id'] + "'}";;
				TransactionLogWithdrawInsert.fkGameId = tlw[i]['fkGameId'];
				TransactionLogWithdrawInsert.gameEngine = tlw[i]['gameEngine'];
				TransactionLogWithdrawInsert.engineId = tlw[i]['engineId'];

				/*var settlementWithdrawAc = await getUserAccount(TransactionLogWithdrawInsert.fkSenderId, 20);
				var userWithdrawAc = await getUserAccount(TransactionLogWithdrawInsert.fkReceiverId, 20);*/

				var settlementWithdrawAc = await getUserAccountV1(TransactionLogWithdrawInsert.fkSenderId, 20);
				var userWithdrawAc = await getUserAccountV1(TransactionLogWithdrawInsert.fkReceiverId, 20);

				TransactionLogWithdrawInsert.senderAcNum = settlementWithdrawAc[0]['id'];
				TransactionLogWithdrawInsert.receiverAcNum = userWithdrawAc[0]['id'];
				try {
					const insert = await models.gmsPaymentTransactionLogWithdraw.build(TransactionLogWithdrawInsert).save();
					if (insert) {
						console.log("Withdraw Log Created");
						console.log("Refund Log Id : " + tlw[i]['id'])
						console.log("Created Log Id : " + insert['dataValues']['id']);
						console.log("Sender  : " + TransactionLogWithdrawInsert.fkSenderId);
						console.log("Receiver  : " + TransactionLogWithdrawInsert.fkReceiverId);

						//Update Account balance of sender and receiver 
						// var currentBalSettlementWithdrawt = +settlementWithdrawAc[0]['balance'] - +TransactionLogWithdrawInsert.amount;
						// let updateSettlement = await updateUserAccountBalance(TransactionLogWithdrawInsert.fkSenderId, 20, currentBalSettlementWithdrawt);
						// await updateUserAccountBalanceV1(TransactionLogWithdrawInsert.fkSenderId, 20, currentBalSettlementWithdrawt);
						
						let updateSettlement = await updateUserAccountBalanceV2(TransactionLogWithdrawInsert.fkSenderId, 20, +TransactionLogWithdrawInsert.amount, "dec");
						if (updateSettlement)
							console.log("Settlement withdraw account balance updated successfully ");
						else
							console.log("Unable to update settlement withdraw account balance  ");

						// var currentBalUserWithdraw = +userWithdrawAc[0]['balance'] + +TransactionLogWithdrawInsert.amount;
						// let updateUser = await updateUserAccountBalance(TransactionLogWithdrawInsert.fkReceiverId, 20, currentBalUserWithdraw);
						// let updateUser = await updateUserAccountBalanceV1(TransactionLogWithdrawInsert.fkReceiverId, 20, currentBalUserWithdraw);
						
						let updateUser = await updateUserAccountBalanceV2(TransactionLogWithdrawInsert.fkReceiverId, 20, +TransactionLogWithdrawInsert.amount, "inc");
						if (updateUser)
							console.log("User withdraw account balance updated successfully ");
						else
							console.log("Unable to update user withdraw account balance  ");

						//Update Log , Make it refund has been done.
						let apiMsg = { 'msg': 'Refund By Cron', 'tlw-id': insert['dataValues']['id'] };
						apiMsg = JSON.stringify(apiMsg);
						let update = await models.sequelize.query("update gmsPaymentTransactionLogWithdraw set pgRefNo='" + refundId + "',apiMsg='" + apiMsg + "' where id=" + tlw[i]['id'] + " limit 1", { type: sequelize.QueryTypes.UPDATE });
					}
				}
				catch (error) {
					console.log("Error in TLW Processing ");
					console.log(error);
				}
			}//End of Trx log Withdraw Loop.
		} else
			console.log('No record found in TLW for refund.');
	} catch (error) {
		console.log(
			'* * * * * * * * * * * * * * *  Error In Cron Id : 10010 * * * * * * * * * * * * * * *'
		);
		console.log(error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

function getRandomUniqueNum(length) {
	let size = length;
	var result = '';
	var characters =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;
	for (var i = 0; i < size; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

//Who is winning cron (10014)
//Purpose : Get letest user who has won the battle from gmsPaymentTransactionlogWithdraw
//This Cron execute in interval of 10 min.
//Schidule Time : */10 * * * *
//Test Time every 20th sec. : */10 * * * * *
//Cron-ID - 10014
cron.schedule('*/10 * * * *', async function () {
	var cronId = 10014;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		let data = await models.sequelize.query(
			'select t.fkReceiverId,u.mobile,u.firstName,u.image,t.amount ' +
			'from gmsPaymentTransactionLogWithdraw t,gmsUsers u ' +
			"where t.amount>0 and t.fkReceiverId=u.id and t.fkReceiverId is not null and t.fkReceiverId!='' and t.fkReceiverId > 100000 GROUP BY t.fkReceiverId ORDER BY t.createdAt DESC limit 10",
			{ type: sequelize.QueryTypes.SELECT }
		);

		fs.writeFile(
			'/home/vcoi/nodeapps/gamesapp/whoiswining.txt',
			JSON.stringify(data),
			function (err) {
				if (err) {
					console.log(err);
				} else {
					console.log('The file was saved!');
				}
			}
		);
	} catch (error) {
		console.log('DB Error Cron Id : ' + cronId + ' , ', error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

//Update Bank Details From Excel(10015)
//Purpose : Reading data from excel and update User Bank Details
//This Cron execute in interval of 10 min.
//Schidule Time : */10 * * * *
//Test Time every 20th sec. : */10 * * * * *
//Cron-ID - 10015
cron.schedule('0 0 * * *', async function () {
	var cronId = 10015;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		var FailedBankData = [];
		var BankDetails = await getSheetObjectFromExcel(
			config.bankDataFile,
			'Sheet1,Sheet2'
		);
		if (BankDetails) {
			//console.log("Bank details at zero index : ",BankDetails[0]);
			for (var i = 0; i < BankDetails.length; i++) {
				try {
					let bankData = {
						bank: BankDetails[i]['BANK'].replace(/[^\x20-\x7E]/g, ''),
						ifsc: BankDetails[i]['IFSC'],
						branch: BankDetails[i]['BRANCH'].replace(/[^\x20-\x7E]/g, ''),
						address: BankDetails[i]['ADDRESS'].replace(/[^\x20-\x7E]/g, ''),
						city: BankDetails[i]['CITY1'].replace(/[^\x20-\x7E]/g, ''),
						district: BankDetails[i]['CITY2'].replace(/[^\x20-\x7E]/g, ''),
						state: BankDetails[i]['STATE'].replace(/[^\x20-\x7E]/g, ''),
					};
					let isSuccess = await updateBankData(bankData, {
						ifsc: bankData.ifsc,
					});
					if (!isSuccess) {
						FailedBankData.push(bankData);
					}
				} catch (error) {
					console.log('Bank details manipulation error : ', error);
					console.log(BankDetails[i]);
				}
			}
			console.log('Total Bank Data Updated : ' + i);
			console.log('Failed : ' + FailedBankData.length);
			console.log('Failed Bank Data : ', FailedBankData);
		} else {
			console.log(
				'Something went wrong. We are unable to process the file/There is no data in given sheet.'
			);
		}
	} catch (error) {
		console.log('Cron-ID - 10015 : ', error);
	}
	await lockUnlock(cronId, 1); //UnLock by setting status:1
});

async function updateBankData(bankDetails, condition) {
	try {
		await models.gmsBankDetails.findOne({ where: condition }).then(obj => {
			// update Bank data
			if (obj) return obj.update(bankDetails);
			// insert Bank data
			return models.gmsBankDetails.create(bankDetails);
		});
		return true;
	} catch (error) {
		console.log('updateBankData() : ', error);
		return false;
	}
}

async function getSheetObjectFromExcel(path, sheetName) {
	//sheetName would be single sheet or comma seperated multiple sheet
	try {
		allSheetsData = [];
		sheetName = sheetName.split(',');
		//console.log("Sheet Name Params : ",sheetName);
		var workBook = await xlsx.readFile(path);
		var sheetNameList = await workBook.SheetNames;
		//console.log("Sheet Name List : ",sheetNameList);
		for (var i = 0; i < sheetName.length; i++) {
			if (sheetNameList.indexOf(sheetName[i]) < 0) {
				console.log('No sheet available with name : ' + sheetName[i]);
			} else {
				//return the excel data in JSON object formate;
				//Note : It will skip the header(title) data.
				var sheets = await xlsx.utils.sheet_to_json(
					workBook.Sheets[sheetName[i]]
				);
				allSheetsData = allSheetsData.concat(sheets);
			}
		}
		return allSheetsData.length > 0 ? allSheetsData : false;
	} catch (error) {
		console.log('getSheetObjectFromExcel() : ', error);
		return false;
	}

	console.log(Sheets);
}

async function getCronByID(id) {
	try {
		var cron = await models.sequelize.query(
			'select * from gmsCronJob where id=' + id,
			{ type: sequelize.QueryTypes.SELECT }
		);
		return cron;
	} catch (error) {
		console.log('DB Error : ', error);
		return false;
	}
}

async function lockUnlock(id, status) {
	var statusDescription = status == 0 ? 'Locked' : 'Unlocked';
	console.log('Cron Id : ' + id + ' is getting ' + statusDescription + ' ....');
	try {
		var cron = await models.sequelize.query(
			'update gmsCronJob set status=' + status + ', updatedAt=NOW() where id=' + id,
			{ type: sequelize.QueryTypes.UPDATE }
		);
		console.log(
			'Cron Id: ' + id + ' ,Successfully has been ' + statusDescription + '.'
		);
		return cron;
	} catch (error) {
		console.log('Unable to ' + statusDescription + ' , Cron ID : ' + id);
		console.log('lockUnlock(id,status)', error);
		return false;
	}
}

//Insert/Update Player of match squad(10016)
//Purpose : Maintain Data of match squad
//This Cron execute in interval of 4 min.
//Schidule Time : */4 * * * *
//Test Time every 20th sec. : */20 * * * * *
//Cron-ID - 10016

cron.schedule('*/4 * * * *', async function () {
	let cronId = 10016;
	let cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		var MatchList = await models.FantacyCricket.query(
			'select cid,matchId,teamA,teamB,dateStart,status from gmsFantacyCricketMatch where status=1  and preSquad=1',
			{ type: sequelize.QueryTypes.SELECT }
		);

		let matchIds = MatchList.map(match => match.matchId);
		let preSquadMatchList=await preSquadCheckMatchList(matchIds);
														
		let currentDateTime=new Date();
		currentDateTime.setHours(currentDateTime.getHours()+12);
		let currentDate=Date.parse(currentDateTime);

		let totalMatchSquadMaintain=0;
		for (var k = 0; MatchList && k < MatchList.length; k++) {
			let matchId = MatchList[k]['matchId'];
			let cid = MatchList[k]['cid'];
			let status = MatchList[k]['status'];
			
			let dateStart = Date.parse(new Date(MatchList[k]['dateStart']));

			let matchSquadData=preSquadMatchList.find(({fkMatchId})=>fkMatchId==matchId);
			let squadCount=matchSquadData && matchSquadData['squadCount']?matchSquadData['squadCount']:0;
			
			if(squadCount > 0 && status == 1 ){
				console.log(`No need no maintain match squad already maintain here ${matchId}.`);
				continue;
			}
			totalMatchSquadMaintain++;
			try {
				await new Promise((resolve, reject) => {
					try {
						request(
							'https://rest.entitysport.com/v2/competitions/' +
							cid +
							'/squads/' +
							matchId +
							'?token=' +
							config.entitySport.token,
							{ json: true },
							async (err, resp, body) => {
								if (err) {
									console.log(err);
									reject(false);
								} else if (resp.body && resp.body.status == 'ok') {
									let playerList=[];
									var squads = resp.body.response.squads;
									for (var i = 0; i < squads.length; i++) {
										var teamId = squads[i]['team_id'];
										var players = squads[i]['players'];
										for (var j = 0; j < players.length; j++) {
											let condition = {
												fkCid: cid,
												fkMatchId: matchId,
												fkTeamId: teamId,
												fkPlayerId: players[j]['pid'],
											};
											let player = {};
											player.fkCid = cid;
											player.fkMatchId = matchId;
											player.fkTeamId = teamId;
											player.fkPlayerId = players[j]['pid'];
											player.playerName = players[j]['short_name'];
											player.credit = +players[j]['fantasy_player_rating'] > 0 ? players[j]['fantasy_player_rating'] : 0;
											player.role = players[j]['playing_role'];
											player.createdAt= new Date();
											/*try {
												await models.gmsfantacyCricketMatchScoreCard
													.findOne({ where: condition })
													.then(async function (obj) {
														if (obj) {
															// update
															await obj.update(player);
														} else {
															//insert
															await models.gmsfantacyCricketMatchScoreCard.create(
																player
															);
														}
													});
											} catch (error) {
												console.log(
													'Cron Id : ' + cronId + ' Erro in upsert match squad.'
												);
											}*/
											playerList.push(player);
										}//End of inner player for loop.
									} //End of outer squad team for loop.
									let updateField=[`fkCid`,`fkMatchId`,`fkTeamId`,`fkPlayerId`,`playerName`,`credit`,`role`];
									await models.gmsfantacyCricketMatchScoreCard.bulkCreate(playerList, { updateOnDuplicate: updateField });
								} //End of else if block.
								else {
									console.log(`Cron Id : ${cronId} , Match ID : ${matchId} No match squad found of this match from entity sport .`);
								}
								resolve(true);
							}
						); //End of request.
					} catch (error) {
						console.log(`Error in API Call Cron Id ${cronId} Match Id : ${matchId}`);
						console.log(error);
						reject(false);
					}
				}); //End of promise.
				console.log("Total match Squad maintain : ",totalMatchSquadMaintain);
			} catch (error) {
				//End of promise try block.
				console.log('Promis Error Cron ID : ' + cronId);
				console.log(error);
			} //End of promise catch block .
		} //End of Outer For loop.
	} catch (error) {
		console.log('Cron Id : ' + cronId + ' Unable to update Match Squad');
		console.log(error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});


async function preSquadCheckMatchList(matchIds){
	let preSquad = await models.FantacyCricket.query(
		`select fkMatchId, count(id) as squadCount from gmsfantacyCricketMatchScoreCard
		 WHERE fkMatchId in (${matchIds})
		 GROUP BY fkMatchId`,
		{ type: sequelize.QueryTypes.SELECT }
	);
	return preSquad;
}


// Create Live and Upcoming matches in Cache(10017)
//Purpose : Create Live and Upcoming matches in Cache
//This Cron execute in interval of 1 min 10 Sec.
//Schidule Time : */30 */1 * * * *
//Test Time every 20th sec. : */3 * * * * *
//Cron-ID - 10017

cron.schedule('*/1 * * * *', async function () {
	var cronId = 10017;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		let result = await setUpcomingMatchesInCache(1);
		if (result) {
			console.log(
				'Cron Id : ' +
				cronId +
				' Created Upcoming matches in cache successfully!'
			);
		} else {
			console.log(
				'Cron Id : ' + cronId + ' Unable to create Upcoming matches in cache'
			);
		}
		result = await setLiveMatchesInCache([2, 3]);
		if (result) {
			console.log(
				'Cron Id : ' + cronId + ' Created Live matches in cache successfully!'
			);
		} else {
			console.log(
				'Cron Id : ' + cronId + ' Unable to create Live matches in cache'
			);
		}
	} catch (error) {
		console.log('Cron Id : ' + cronId + ' Unable to update Cache');
		console.log(error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

async function setUpcomingMatchesInCache(status) {
	try {
		let matchesList = await getMatchesList(status);
		if (matchesList && matchesList.length > 0) {
			console.log('JOSN String Data : ', matchesList);
			//await CacheService.setCache('UPCOMING_MATCHES', matchesList, 200);
		}
		return true;
	} catch (error) {
		console.log('set Matches: ', error);
	}
	return false;
}

async function setLiveMatchesInCache(status) {
	try {
		let matchesList = await getMatchesList(status);
		if (matchesList && matchesList.length > 0) {
			console.log('JOSN String Data : ', matchesList);
			//await CacheService.setCache('LIVE_MATCHES', matchesList, 200);
		}
		return true;
	} catch (error) {
		console.log('set Matches: ', error);
	}
	return false;
}

async function getMatchesList(status) {
	try {
		let data = await models.FantacyCricket.query(
			`SELECT 
                mat.id, 
                mat.matchId, 
                mat.title as matchTitle, 
                mat.shortTitle, 
                mat.subtitle,
                mat.preSquad, 
                mat.isTeamAnounced,
                mat.teamA,
                mat.teamB,
                mat.dateStart, 
                mat.status,
                mat.verified,
                comp.cid,
                comp.title as seriesName 
            FROM 
                gmsFantacyCricketMatch mat, 
                gmsFantacyCricketCompetition comp
            WHERE 
                mat.cid=comp.cid AND 
                mat.status IN (:status) AND
                mat.verified = 0 AND 
				mat.preSquad=1 AND
                comp.isDisabled=0
            ORDER BY mat.dateStart ASC LIMIT 20`,
			{ replacements: { status: status }, type: sequelize.QueryTypes.SELECT }
		);
		if (data.length > 0) {
			data = await prepareTeamData(data);
		}
		return data;
	} catch (error) {
		console.log('Error (getUpcomingMatches) : ', error);
		return false;
	}
}

async function getTeam(teamId) {
	try {
		let data = await models.FantacyCricket.query(
			`SELECT 
                tid as id,
                title,
                abbr as shortTitle,
                country,
                logoURL,
                thumbURL 
            FROM 
                gmsFantacyCricketTeams 
            WHERE tid = :tid`,
			{ replacements: { tid: teamId }, type: sequelize.QueryTypes.SELECT }
		);
		return data[0];
	} catch (error) {
		console.log('Error (Team Details) : ', error);
		return false;
	}
}

async function prepareTeamData(matchesList) {
	try {
		for (let i = 0; i < matchesList.length; i++) {
			let team = await getTeam(matchesList[i].teamA);
			delete matchesList[i].teamA;
			matchesList[i]['teamA'] = team;
			team = await getTeam(matchesList[i].teamB);
			delete matchesList[i].teamB;
			matchesList[i]['teamB'] = team;
		}
		// return matchesList;
	} catch (error) {
		console.log(error);
	}
	return matchesList;
}

//Update player score in gmsFantacyCricketScorecard table (10018)
//Purpose : to get updated score breakup of player
//This Cron execute in interval of 1 min.
//Schidule Time : */1 * * * *
//Test Time every 20th sec. : */10 * * * * *
//Cron-ID - 10018

cron.schedule('*/1 * * * *', async function () {
	let cronId = 10018;
	let cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	// try {
	// 	let liveMatch = await models.sequelize.query(
	// 		'select matchId,cid,teamA,teamB,dateStart from gmsFantacyCricketMatch where status in (2,3) and verified=0 AND preSquad=1',
	// 		{ type: sequelize.QueryTypes.SELECT }
	// 	);

	// 	for (let i = 0; liveMatch && i < liveMatch.length; i++) {
	// 		let matchId = liveMatch[i]['matchId'];
	// 		let cid = liveMatch[i]['cid'];
	// 		//Get and update player score card.
	// 		try {
	// 			await new Promise((resolve, reject) => {
	// 				try {
	// 					request(
	// 						'https://rest.entitysport.com/v2/matches/' +
	// 						matchId +
	// 						'/scorecard?token=' +
	// 						config.entitySport.token,
	// 						{ json: true },
	// 						async (err, resp, body) => {
	// 							if (err) {
	// 								console.log(err);
	// 								reject(false);
	// 							} else {
	// 								var status = resp.body ? resp.body.status : false;
	// 								if (status == 'ok') {
	// 									var innings = resp.body.response.innings;
	// 									//let playerList=[];
	// 									let batsManPlayers=[]
	// 									let bowlersPlayers=[];
	// 									let filderPlayers=[];

	// 									for (var k = 0; innings && k < innings.length; k++) {
	// 										var batsMen = innings[k]['batsmen'];
	// 										var bowlers = innings[k]['bowlers'];
	// 										var fielder = innings[k]['fielder'];


	// 										//Batsmen ScoreCard.
	// 										for (var j = 0; j < batsMen.length; j++) {
	// 											let ScoreCardUpdate = {};
	// 											let playerId = batsMen[j]['batsman_id'];
	// 											ScoreCardUpdate.run = batsMen[j]['runs'];
	// 											ScoreCardUpdate.four = batsMen[j]['fours'];
	// 											ScoreCardUpdate.six = batsMen[j]['sixes'];
	// 											ScoreCardUpdate.sr = batsMen[j]['strike_rate'];
	// 											ScoreCardUpdate.fifty = ScoreCardUpdate.run / 50;
	// 											ScoreCardUpdate.thirty = ScoreCardUpdate.run / 30;
	// 											ScoreCardUpdate.createdAt=new Date();
	// 											//Check duck.
	// 											if (
	// 												batsMen[j]['role'] == 'bat' ||
	// 												batsMen[j]['role'] == 'all'
	// 											) {
	// 												ScoreCardUpdate.duck =
	// 													batsMen[j]['runs'] == 0 ? 1 : 0;
	// 											} else {
	// 												ScoreCardUpdate.duck = 0;
	// 											}

	// 											/*var conditionBatMen = {
	// 												fkPlayerId: playerId,
	// 												fkMatchId: matchId,
	// 											};*/

	// 											ScoreCardUpdate.fkCid=cid
	// 											ScoreCardUpdate.fkMatchId=matchId
	// 											ScoreCardUpdate.fkPlayerId=playerId

	// 											/*try {
	// 												await models.gmsfantacyCricketMatchScoreCard
	// 													.findOne({ where: conditionBatMen })
	// 													.then(async function (obj) {
	// 														if (obj) {
	// 															// update
	// 															await obj.update(ScoreCardUpdate);
	// 														} else {
	// 															console.log(
	// 																'This player is not in mathch scorecard batsmen : ',
	// 																conditionBatMen
	// 															);
	// 														}
	// 													});
	// 											} catch (error) {
	// 												console.log(
	// 													'Innings : ' +
	// 													innings[k]['iid'] +
	// 													' Batsman Upsert Error : ',
	// 													conditionBatMen
	// 												);
	// 												console.log(error);
	// 											}*/

	// 											//playerList.push(ScoreCardUpdate);
	// 											batsManPlayers.push(ScoreCardUpdate);
	// 										}//End of Batsmsan

	// 										//Bowlers ScoreCards.
	// 										for (var j = 0; j < bowlers.length; j++) {
	// 											let ScoreCardUpdate = {};
	// 											let playerId = bowlers[j]['bowler_id'];
	// 											ScoreCardUpdate.wkts = bowlers[j]['wickets'];
	// 											ScoreCardUpdate.maidenover = bowlers[j]['maidens'];
	// 											ScoreCardUpdate.er = bowlers[j]['econ'];

	// 											ScoreCardUpdate.fkCid=cid
	// 											ScoreCardUpdate.fkMatchId=matchId
	// 											ScoreCardUpdate.fkPlayerId=playerId
	// 											ScoreCardUpdate.createdAt=new Date();
	// 											/*var conditionBowler = {
	// 												fkPlayerId: playerId,
	// 												fkMatchId: matchId,
	// 											};*/

	// 											/*try {
	// 												await models.gmsfantacyCricketMatchScoreCard
	// 													.findOne({ where: conditionBowler })
	// 													.then(async function (obj) {
	// 														if (obj) {
	// 															// update
	// 															await obj.update(ScoreCardUpdate);
	// 														} else {
	// 															console.log(
	// 																'This player is not in mathch scorecard Bowlers : ',
	// 																conditionBowler
	// 															);
	// 														}
	// 													});
	// 											} catch (error) {
	// 												console.log(
	// 													'Innings : ' +
	// 													innings[k]['iid'] +
	// 													' Bowlers Upsert Error : ',
	// 													conditionBowler
	// 												);
	// 												console.log(error);
	// 											}*/
	// 											//playerList.push(ScoreCardUpdate);
	// 											bowlersPlayers.push(ScoreCardUpdate);
	// 										}

	// 										//Fielder Scorecard.
	// 										for (var j = 0; j < fielder.length; j++) {
	// 											let ScoreCardUpdate = {};
	// 											let playerId = fielder[j]['fielder_id'];
	// 											ScoreCardUpdate.catch = fielder[j]['catches'];
	// 											ScoreCardUpdate.runoutStumping =
	// 												fielder[j]['runout_thrower'] +
	// 												fielder[j]['runout_catcher'] +
	// 												fielder[j]['runout_direct_hit'] +
	// 												fielder[j]['stumping'];

	// 											/*var conditionFielder = {
	// 												fkPlayerId: playerId,
	// 												fkMatchId: matchId,
	// 											};*/

	// 											ScoreCardUpdate.fkCid=cid
	// 											ScoreCardUpdate.fkMatchId=matchId
	// 											ScoreCardUpdate.fkPlayerId=playerId
	// 											ScoreCardUpdate.createdAt=new Date();
	// 											/*try {
	// 												await models.gmsfantacyCricketMatchScoreCard
	// 													.findOne({ where: conditionFielder })
	// 													.then(async function (obj) {
	// 														if (obj) {
	// 															// update
	// 															await obj.update(ScoreCardUpdate);
	// 														} else {
	// 															console.log(
	// 																'This player is not in mathch scorecard Fielder : ',
	// 																conditionFielder
	// 															);
	// 														}
	// 													});
	// 											} catch (error) {
	// 												console.log(
	// 													'Innings : ' +
	// 													innings[k]['iid'] +
	// 													' Fielders Upsert Error : ',
	// 													conditionFielder
	// 												);
	// 												console.log(error);
	// 											}*/
	// 											//playerList.push(ScoreCardUpdate);
	// 											filderPlayers.push(ScoreCardUpdate);
	// 										}
	// 									} //End of innings Loop.

										
	// 									let batsManPlayerUpdateFied=[`updatedAt` , `run` ,`four` , `six` ,`sr` ,`fifty` ,`thirty`, `duck`];
	// 									await models.gmsfantacyCricketMatchScoreCard.bulkCreate(batsManPlayers, { updateOnDuplicate: batsManPlayerUpdateFied });


	// 									let bowlersPlayerUpdateFied=[`wkts` , `maidenover` , `er` ];
	// 									await models.gmsfantacyCricketMatchScoreCard.bulkCreate(bowlersPlayers, { updateOnDuplicate: bowlersPlayerUpdateFied });

	// 									let fieldersPlayerUpdateFied=[ `catch` , `runoutStumping` ];
	// 									await models.gmsfantacyCricketMatchScoreCard.bulkCreate(filderPlayers, { updateOnDuplicate: fieldersPlayerUpdateFied });
										
										
	// 								} else {
	// 									console.log(`Match ID : ${matchId} No ScoreCard Found .`);
	// 								}
	// 							}
	// 							resolve(true);
	// 						}
	// 					); //End of request.
	// 				} catch (error) {
	// 					console.log(`Error API Call in Cron Id : ${cronId}  Match Id : ${matchId}`);
	// 					console.log(error);
	// 					reject(false);
	// 				}
	// 			}); //End of promise.
	// 		} catch (error) {
	// 			//End of promise try block.
	// 			console.log('Promis Error Cron ID : ' + cronId);
	// 			console.log(error);
	// 		} //End of promise catch block .
	// 	} //End Of Match Id loop.
	// } catch (error) {
	// 	console.log('Unable to update Players Score Card');
	// 	console.log(error);
	// }
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

//Manage Game Server (10019)
//Purpose : Add/Remove Server from cache . Only server will be here who has active session running on it.
//This Cron execute in interval of 2 min.
//Schidule Time : */2 * * * *
//Test Time every 20th sec. : */20 * * * * *
//Cron-ID - 10019

cron.schedule('*/2 * * * *', async function () {
	var cronId = 10019;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		//Process-1
		//Maintain the server and keep in sync with Cache and DB . If any issue send a reported mail to backend team.
		var GameServerDB = await models.sequelize.query(
			'select publicIP,gType from gmsGameServer where status in (10,20) and isRemoved=0',
			{ type: sequelize.QueryTypes.SELECT }
		);
		var gameServerInCache = await JSON.parse(
			//await JSON.parse(await CacheService.getCache('GameServer'))
		);
		gameServerInCache = gameServerInCache == null ? [] : gameServerInCache;
		var activeServerInCache = 0;
		var activeServerInDB = 0;
		if (GameServerDB && GameServerDB.length > 0) {
			activeServerInDB = GameServerDB.length; //This is total count of active server in DB.
			for (var i = 0; i < GameServerDB.length; i++) {
				let isLive = false;
				for (var j = 0; j < gameServerInCache.length; j++) {
					if (GameServerDB[i]['publicIP'] == gameServerInCache[j]['ip']) {
						isLive = true;
						gameServerInCache[j]['status'] == 1 ? activeServerInCache++ : '';
						break;
					}
				} // End of inner for loop.

				if (!isLive) {
					gameServerInCache.push({
						ip: GameServerDB[i]['publicIP'],
						status: 1,
						GType: GameServerDB[i]['gType'],
						ActiveSession: 0,
					});
					activeServerInCache++;
					console.log(
						'IP : ' + GameServerDB[i]['publicIP'] + ' Listed in cache.'
					);
				}
			} //End of for loop.

			console.log('Active server in DB : ' + activeServerInDB);
			console.log('Active server in Cache : ' + activeServerInCache);

			if (activeServerInDB == activeServerInCache) {
				console.log(
					'Game server is sync in cache . Everything is running fine .'
				);
			} else {
				//Send mail to backend team.
				console.log(
					'!! Game server is not sync in cache. something went wrong !!'
				);
			}

			//await CacheService.setCache('GameServer',JSON.stringify(gameServerInCache));

		} else {
			console.log('No Ready/Running Game Server in DB .');
		}

		if (config.AutoScalingDescaling) {
			//Process-2
			//Remove Instance/Unlist De-Scaled game server from Cache/DB which is stop and no active session.
			if (gameServerInCache.length > 0) {
				for (var i = 0; i < gameServerInCache.length; i++) {
					if (gameServerInCache[i]['status'] == 0) {
						var GameServerDB = await models.sequelize.query(
							"select status,instanceId from gmsGameServer where publicIP='" +
							gameServerInCache[i]['ip'] +
							"'",
							{ type: sequelize.QueryTypes.SELECT }
						);
						if (GameServerDB && GameServerDB[0]['status'] == 30) {
							console.log(
								'Server IP : ' +
								gameServerInCache[i]['ip'] +
								' is Inactive(Stop), ActiveSession : ' +
								gameServerInCache[i]['ActiveSession']
							);
							if (gameServerInCache[i]['ActiveSession'] == 0) {
								//Remove Server Instance from AWS.
								var ec2 = new AWS.EC2(config.awsEC2.auth);
								var params = {
									InstanceIds: [GameServerDB[0]['instanceId']],
								};
								ec2.terminateInstances(params, async function (err, data) {
									if (err) {
										console.log(
											'Unable  to terminate instance.' +
											GameServerDB[0]['instanceId']
										);
										console.log(err);
										let subject =
											'De-Scaled GameServer[ T-' +
											gameServerInCache[i]['GType'] +
											' ] Error !!';
										let body =
											'<h3>Hi Geeks,</h3> <h5>We are unable to terminate game server instance . The details is following.</h5>' +
											'<h4>Request Param : </h4>' +
											'<code>' +
											JSON.stringify(params) +
											'</code><br/><br/>' +
											'<h4>Request Error : </h4>' +
											'<code>' +
											err +
											'</code><br/><br/>' +
											'<b>Thanks & Regards<b><br/>Team-Backend (GamesAPP)';
										//await sendMail("gserv@gamesapp.com","serveradmin@gamesapp.com",subject,body,true);
										await sendMail(
											'abhay@gamesapp.com',
											subject,
											body,
											true
										);
									} else {
										console.log(
											'Instance terminated successfully : ' +
											GameServerDB[0]['instanceId']
										);
										console.log(data);
										//Remove from DB.
										let update = await models.sequelize.query(
											"UPDATE gmsGameServer set isRemoved=1,removedTime=NOW() where publicIP='" +
											gameServerInCache[i]['ip'] +
											"' Limit 1",
											{ type: sequelize.QueryTypes.UPDATE }
										);

										//Remove Server from Cache.
										gameServerInCache.splice(i, 1);

										//Make Descaling gate of this game type as open.
										// await CacheService.setCache('GameServerDeScaling-' + gameServerInCache[i]['GType'],'true');

										//Send communication mail.
										var subject =
											'Game Server Instance ID (' +
											GameServerDB[0]['instanceId'] +
											') Terminated.';
										var body =
											'<h3>Hi Geeks,</h3> <h5>The game server instance <b><u>' +
											GameServerDB[0]['instanceId'] +
											'</u></b> terminated successfully. The details is following.</h5>' +
											'<code>' +
											JSON.stringify(data) +
											'</code><br/><br/>' +
											'<b>Thanks & Regards<b><br/>Team-Backend (GamesApp)';
										//await sendMail("gserv@gamesapp.com","serveradmin@gamesapp.com",subject,body,true);
										await sendMail(
											'abhay@gamesapp.com',
											subject,
											body,
											true
										);
									}
								});
							} else {
								console.log(
									"Now, We can't descale the server. Because server has some active session. Server IP : " +
									gameServerInCache[i]['ip'] +
									' is Inactive(Stop), ActiveSession : ' +
									gameServerInCache[i]['ActiveSession']
								);
							}
						} else if (GameServerDB && GameServerDB[0]['status'] == 40) {
							console.log(
								'Server IP : ' +
								gameServerInCache[i]['ip'] +
								' is Inactive(Dead), ActiveSession : ' +
								gameServerInCache[i]['ActiveSession']
							);
						} else {
							console.log(
								'Something went wrong : ' + JSON.stringify(gameServerInCache[i])
							);
						}
					} else {
						console.log(
							'Server IP : ' + gameServerInCache[i]['ip'] + ' is running.'
						);
					}
				} //End of for loop.
				//await CacheService.setCache('GameServer',JSON.stringify(gameServerInCache));
			} else {
				console.log('!! No game server in cache !!');
			}

			//Process-3
			//Make the server health bad if last health update time is >= 2 min.
			var UnHealthyGameServer = await models.sequelize.query(
				'select publicIP from gmsGameServer where status=20 and health=1 and isRemoved=0 and healthCheckTime < NOW()- INTERVAL 3 MINUTE',
				{ type: sequelize.QueryTypes.SELECT }
			);
			if (UnHealthyGameServer && UnHealthyGameServer.length > 0) {
				for (var i = 0; i < UnHealthyGameServer.length; i++) {
					console.log(
						'Found Un-Healthy  Running Server : ' +
						UnHealthyGameServer[i]['publicIP']
					);
					let update = await models.sequelize.query(
						"UPDATE gmsGameServer set health=0,status=40 where publicIP='" +
						UnHealthyGameServer[i]['publicIP'] +
						"' Limit 1",
						{ type: sequelize.QueryTypes.UPDATE }
					);
					if (update) {
						for (var j = 0; j < gameServerInCache.length; j++) {
							if (
								gameServerInCache[j]['ip'] == UnHealthyGameServer[i]['publicIP']
							) {
								gameServerInCache[j]['status'] = 0;
								break;
							}
						}
					}
				} //End of for loop.
				//await CacheService.setCache('GameServer',JSON.stringify(gameServerInCache));
			} else {
				console.log('No Any Un-Healthy Running Server Detected');
			}
		} //End of auto scaling and descaling if condition check.
		else {
			console.log('Auto scaling/de-scaling is off now !');
		} //End of else
	} catch (error) {
		console.log('Unable to manage game server !!');
		console.log(error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

async function sendMail(to, subject, body, isHTML) {
	var transport = await nodemailer.createTransport(config['GmailTransport']);
	const message = {
		from: config.mailFrom, // Sender address
		to: to, // List of recipients
		subject: "["+config.ServerAlias+"]"+subject, // Subject line
		html: body,
	};

	await transport.sendMail(message, function (err, info) {
		if (err) {
			console.log('Unable to send Email .');
			console.log(err);
		} else {
			console.log('Email Send Successfully.');
			console.log(info);
		}
	});
}
//Winning Amount and Rank Update of GMS User (10020)
//Purpose : Update Today (daily basic ),  User winning amount and Rank(Based on winning amount)
//This Cron execute in interval of 10 min.
//Schidule Time : */10 * * * *
//Test Time every 10th sec. : */10 * * * * *

cron.schedule('*/10 * * * *', async function () {
	var cronId = 10020;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {

		//Update Today rank and prize null and set again.
		let userWinAmtTodayAndRankUpdateToaysetZero = await models.sequelize.query(
			'update gmsUsers set rankT=NULL,winPrizeT=NULL',
			{ type: sequelize.QueryTypes.UPDATE }
		);
		
		var user = await models.sequelize.query(
			"update gmsUsers u,(SELECT  ROW_NUMBER() OVER(ORDER BY sum(T1.amount) DESC ) AS `rank` , T1.fkUserId, sum(T1.amount) as amount FROM "+
			"( "+
			"select ROW_NUMBER() OVER(ORDER BY sum(w.amount) DESC ) AS `rank`, w.fkReceiverId as fkUserId,SUM(w.amount) as amount  "+
			"from gmsPaymentTransactionLogWithdraw w  "+
			"where w.requestType=30 and w.payStatus=10 and w.amount!=0 and w.fkReceiverId is not null and w.createdAt >= CURDATE()  "+
			"GROUP BY w.fkReceiverId  "+
			"UNION  "+
			"select ROW_NUMBER() OVER(ORDER BY sum(e.delta) DESC ) AS `rank`, e.fkUserId,SUM(e.delta) as amount  "+
			"from gmsTableGameEndTrx e  "+
			"where e.status=20 AND e.delta > 0  AND e.createdAt >= CURDATE()  "+
			"GROUP BY e.fkUserId  "+
			") T1 GROUP BY fkUserId ) T2 "+
			"set u.winPrizeT=T2.amount,u.rankT=T2.rank where u.id=T2.fkUserId  ",
			{ type: sequelize.QueryTypes.UPDATE }
		);

		
		/*if (user && user.length > 0) {
			try {
				for (var i = 0; i < user.length; i++) {
					let userWinAmtAndRankUpdate = await models.sequelize.query(
						'update gmsUsers set rankT=' +
						(i + 1) +
						',winPrizeT=' +
						user[i]['amt'] +
						' where id=' +
						user[i]['fkReceiverId'] +
						' LIMIT 1',
						{ type: sequelize.QueryTypes.UPDATE }
					);
					if (userWinAmtAndRankUpdate)
						console.log(
							'User ID : ' +
							user[i]['fkReceiverId'] +
							' winning amount and rank updated successfully For Today'
						);
					else
						console.log(
							'Unable to update winning amount and rank of the User ID : ' +
							user[i]['fkReceiverId'] +
							' for today.'
						);
				}
			} catch (error) {
				console.log('DB Error : ' + error);
			}
		} else {
			console.log('No User Found');
		}*/

		console.log("Today leaderboard generated successfully.");
	} catch (error) {
		console.log('DB Error : ' + error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

//Credit winning Amount/Entry Fee to user wallet  (10021)
//Purpose : Credit winning amount or refund entry fee if prize distribution done
//This Cron execute in interval of 5 min.
//Schidule Time : */5 * * * *
//Test Time every 1 Minute. : */1  * * * *

cron.schedule('*/5 * * * *', async function () {
	var cronId = 10021;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		var contestList = await models.FantacyCricket.query(
			`select cc.id,cc.fkMatchId,cc.isPrizeDistributionDone,cc.entryFee ,cm.shortTitle
				from gmsFantacyCricketContest cc
				LEFT JOIN gmsFantacyCricketMatch cm on cm.matchId=cc.fkMatchId
			where isPrizeDistributionDone in (30,50)`,
			{ type: sequelize.QueryTypes.SELECT }
		);
		for (var i = 0; contestList && i < contestList.length; i++) {
			var contestId = contestList[i]['id'];
			var matchId = contestList[i]['fkMatchId'];
			var isPrizeDistributionDone = contestList[i]['isPrizeDistributionDone'];

			var prizeDistributionList = await models.sequelize.query(
				'select * from gmsContestPrizeDistribution where fk_contestId=' +
				contestId +
				' and status in (1,3) and isPayment=0',
				{ type: sequelize.QueryTypes.SELECT }
			);
			if (prizeDistributionList && prizeDistributionList.length > 0) {
				console.log(
					'Payment start for Match Id : ' +
					matchId +
					', ContestId : ' +
					contestId
				);
				console.log('Total Payment : ' + prizeDistributionList.length);
				for (var j = 0; j < prizeDistributionList.length; j++) {
					teamData = prizeDistributionList[j];
					if (teamData['status'] == 1) {
						//Winner User
						let isSuccess = await creditWinningAmountv2(
							matchId,
							3,
							contestId,
							teamData['teamCode'],
							teamData['actualPrize'],
							contestList[i]['entryFee'],
							teamData['fk_UserId']
						);
						if (isSuccess) {
							console.log(
								'Winning amount credited for teamCode : ' + teamData['teamCode']
							);
							await updatePaymentDone(teamData['teamCode']);

							let options = {
								url: `${config.LB_UPDATE_API}?userId=${teamData['fk_UserId']}&winAmt=${teamData['actualPrize']}`,
								method: "GET",
								json: true,
								timeout: 5000
							};
							request(options,
								async (err, resp, body) => {
									if (err) {
										console.log(err);
									}
									else{
										console.log(`LB Updated for user ${teamData['fk_UserId']}`);
									}
								});


							let userName = await getUserNameById(teamData['fk_UserId']);
							await prizeWonNotification(teamData['fk_UserId'], userName, teamData['actualPrize'], (contestList[i]['shortTitle'] + " ( " + teamData['teamTitle'] + " ) "), "FANTACY_CRICKET_WINNING");
							

						} else
							console.log(
								'Unable to credit winning amount for teamCode : ' +
								teamData['teamCode']
							);
					} else if (teamData['status'] == 3) {
						//Refund Entry Fee
						let isSuccess = await refundFantacyEntryFee(teamData['teamCode']);
						if (isSuccess) {
							console.log(
								'Entry fee refunded for teamCode : ' + teamData['teamCode']
							);
							await updatePaymentDone(teamData['teamCode']);
							let userName = await getUserNameById(teamData['fk_UserId']);
							await entryFeeRefundNotification(teamData['fk_UserId'], userName, teamData['actualPrize'], (contestList[i]['shortTitle'] + " ( " + teamData['teamTitle'] + " ) "), "FANTACY_CRICKET_REFUND");

						} else
							console.log(
								'Unable to refund entry fee for teamCode : ' +
								teamData['teamCode']
							);
					}
				} //End of inner for loop "J"

				//Update contest status .
				let updateStatus = isPrizeDistributionDone == 30 ? 60 : 70;
				let contestUpdate = await models.FantacyCricket.query(
					'UPDATE gmsFantacyCricketContest set isPrizeDistributionDone=' +
					updateStatus +
					' where id=' +
					contestId,
					{ type: sequelize.QueryTypes.UPDATE }
				);
			} else {
				console.log(
					'Payment already done OR Payment not exist for Match Id : ' +
					matchId +
					' , ContestID : ' +
					contestId
				);
				let updateStatus = isPrizeDistributionDone == 30 ? 60 : 70;
				let contestUpdate = await models.FantacyCricket.query(
					'UPDATE gmsFantacyCricketContest set isPrizeDistributionDone=' +
					updateStatus +
					' where id=' +
					contestId,
					{ type: sequelize.QueryTypes.UPDATE }
				);
			}
		} //End of outer for loop "I"
	} catch (error) {
		//End of try block.
		console.log('DB Error : ' + error);
	} //End of catch block.
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

async function updatePaymentDone(teamCode) {
	try {
		let userWinAmtAndRankUpdate = await models.sequelize.query(
			'UPDATE gmsContestPrizeDistribution set isPayment=1 where teamCode=' +
			teamCode,
			{ type: sequelize.QueryTypes.UPDATE }
		);
		return true;
	} catch (error) {
		console.log('Error : (updatePaymentDone) ', error);
		return false;
	}
}

async function getContestEntryFee(contestId, matchId) {
	const data = await models.gmsFantacyCricketContest.findOne({
		where: { id: contestId, fkMatchId: matchId }
	});
	return data.entryFee;
}

async function createTrxLogRecord(trxLog, accType) {
	let isCreated = false;

	/*const senderAccount = await getUserAccount(trxLog.fkSenderId, accType);
	const receiverAccount = await getUserAccount(trxLog.fkReceiverId, accType);*/

	const senderAccount = await getUserAccountV1(trxLog.fkSenderId, accType);
	const receiverAccount = await getUserAccountV1(trxLog.fkReceiverId, accType);


	trxLog.senderAcNum = senderAccount[0]['id'];
	trxLog.receiverAcNum = receiverAccount[0]['id'];

	if (accType == 40) {
		isCreated = await models.gmsPaymentTransactionLogBonus.build(trxLog).save();
	} else if (accType == 20) {
		isCreated = await models.gmsPaymentTransactionLogWithdraw.build(trxLog).save();
	} else if (accType == 10) {
		isCreated = await models.gmsPaymentTransactionLogDeposit.build(trxLog).save();
	}

	if (isCreated) {
		console.log(`Success! Created log record for accType: ${accType} record: `, trxLog);
		const isBalanceUpdated = await updateSenderReceiverAccountBalance(trxLog.fkSenderId, trxLog.fkReceiverId, accType, trxLog.amount, isCreated['dataValues']['id']);
		if (isBalanceUpdated)
			console.log(`Success! Created log record for account: ${accType}, TrxLog: `, trxLog);
		else
			console.log(`Failed! Creating log record for account: ${accType}, TrxLog: `, trxLog);
	} else
		console.log("Failed! Creating log record for accType: " + accType + " record: ", trxLog);
	return isCreated;
}

async function isWithdrawOnly(input) {
	return input.includes("Withdraw") && !input.includes("Bonus") && !input.includes("Deposit");
}

async function fetchPaymentStrategyForEntryFee(senderId, receiverId, pgRefNo, gameId, gameEngine, engineId) {
	let strategyDetails = {
		paidFromBonus: 0,
		paidFromDeposit: 0,
		paidFromWithdraw: 0,
		strategyName: ""
	};
	try {
		const bonusLog = await models.sequelize1.query("select id, amount from " +
			" gmsPaymentTransactionLogBonus where fkSenderId=" + senderId + " and fkReceiverId=" + receiverId + " and pgRefNo='" + pgRefNo + "' and requestType=20 and fkGameId=" + gameId + " and gameEngine=" + gameEngine + " and engineId=" + engineId, { type: sequelize.QueryTypes.SELECT });

		const depositLog = await models.sequelize1.query("select id, amount from " +
			" gmsPaymentTransactionLogDeposit where fkSenderId=" + senderId + " and fkReceiverId=" + receiverId + " and pgRefNo='" + pgRefNo + "' and requestType=20 and fkGameId=" + gameId + " and gameEngine=" + gameEngine + " and engineId=" + engineId, { type: sequelize.QueryTypes.SELECT });

		const withdrawLog = await models.sequelize1.query("select id, amount from " +
			" gmsPaymentTransactionLogWithdraw where fkSenderId=" + senderId + " and fkReceiverId=" + receiverId + " and pgRefNo='" + pgRefNo + "' and  requestType=20 and fkGameId=" + gameId + " and gameEngine=" + gameEngine + " and engineId=" + engineId, { type: sequelize.QueryTypes.SELECT });

		let strategy = "";
		if (bonusLog && bonusLog.length > 0) {
			strategy = strategy + "Bonus";
			strategyDetails.paidFromBonus = bonusLog[0]["amount"];
		}
		if (depositLog && depositLog.length > 0) {
			strategy = strategy + "Deposit";
			strategyDetails.paidFromDeposit = depositLog[0]["amount"];
		}
		if (withdrawLog && withdrawLog.length > 0) {
			strategy = strategy + "Withdraw";
			strategyDetails.paidFromWithdraw = withdrawLog[0]["amount"];
		}

		strategyDetails.strategyName = strategy;
	} catch (e) {
		console.log("Exception: ", e);
	}
	return strategyDetails;
}

async function giveWinningAmountToUserForContest(userId, trxLog, payableAmount, entryFee) {
	const entryFeePayStrategy = await fetchPaymentStrategyForEntryFee(userId, trxLog.fkSenderId,
		trxLog.pgRefNo, trxLog.fkGameId, trxLog.gameEngine, trxLog.engineId);
	let isWinningTrxRecordCreated = false;
	trxLog.fkReceiverId = userId; // Contest Winner Player
	if (await isWithdrawOnly(entryFeePayStrategy.strategyName)) {
		// give winning amount in withdraw account only -- winner trx record object - withdraw account 
		isWinningTrxRecordCreated = await payIntoDepositAndWithdraw(trxLog, 0, payableAmount);
	} else {  // give winning amount in withdraw + deposit account both 
		// if (payableAmount > entryFee) {
		// 	// give entry fee into deposit and remaining in winning amount 
		// 	isWinningTrxRecordCreated = await payIntoDepositAndWithdraw(trxLog, entryFee, payableAmount - entryFee);
		// } else {
		// give winning amount back into origin source 
		const combinedBonusDepositEntryFee = entryFeePayStrategy.paidFromBonus + entryFeePayStrategy.paidFromDeposit;
		const depositAmount = combinedBonusDepositEntryFee > payableAmount ? payableAmount : combinedBonusDepositEntryFee;
		const withdrawAmount = payableAmount - depositAmount;
		isWinningTrxRecordCreated = await payIntoDepositAndWithdraw(trxLog, depositAmount, withdrawAmount);
		// }
	}
	return isWinningTrxRecordCreated;
}

async function payIntoDepositAndWithdraw(trxLog, depositAmount, withdrawAmount) {
	let isWinningTrxRecordCreated = false;
	if (depositAmount > 0) {
		// winner trx record object - deposit account 
		trxLog.requestType = 60;  // Constant.Payment.reqType.TLD.WinningPrize 
		trxLog.amount = depositAmount;
		isWinningTrxRecordCreated = await createTrxLogRecord(trxLog, 10);
	} else
		isWinningTrxRecordCreated = true;
	if (withdrawAmount > 0) {
		// winner trx record object - withdraw account 
		trxLog.requestType = 30;  // Constant.Payment.reqType.TLW.WinningPrize;
		trxLog.amount = withdrawAmount;
		isWinningTrxRecordCreated = isWinningTrxRecordCreated && await createTrxLogRecord(trxLog, 20);
	}
	return isWinningTrxRecordCreated;
}

async function updateSenderReceiverAccountBalance(senderId, receiverId, accType, amount, txnLogId=null) {
	let result = false;
	const isCredited = await trxUserAccountBal(receiverId, accType, amount, 1, txnLogId);  // credit 
	if (isCredited) {
		const isDebited = await trxUserAccountBal(senderId, accType, amount, 2, txnLogId);  // debit 
		if (isDebited)
			result = true;
	}
	return result;
}

async function creditWinningAmount(matchId, contestId, teamCode, amount, userId) {
	// Credit winning amount to user deposit and/or withdraw account
	try {
		let trxLog = {};
		trxLog.fkSenderId = config.financialUser.Settlement; //Withdraw Settlement
		trxLog.fkReceiverId = userId; //Fantacy Winner Player
		trxLog.payStatus = 10;
		trxLog.senderClosingBalance = 0;
		trxLog.receiverClosingBalance = 0;
		trxLog.pgRefNo = teamCode;
		trxLog.fkGameId = matchId;
		trxLog.gameEngine = 3;
		trxLog.engineId = contestId;

		const entryFee = await getContestEntryFee(contestId, matchId);
		const isWinningPrizeCredited = await giveWinningAmountToUserForContest(userId, trxLog, amount, entryFee);
		if (isWinningPrizeCredited) {
			console.log('Winning prize credited Successfully for Team Code : ' + teamCode);
			return true;
		} else {
			console.log('Unable To credit Winning Prize forTeam Code : ' + teamCode);
			return false;
		}
	} catch (error) {
		console.log('Error (creditWinningAmount) : ', error);
		return false;
	}
}

async function refundFantacyEntryFee(teamCode) {
	try {
		var tlb = await models.sequelize.query("select * from gmsPaymentTransactionLogBonus " +
			"where pgRefNo='" + teamCode + "' and requestType=20 and gameEngine=3 and payStatus=10", { type: sequelize.QueryTypes.SELECT });

		var tld = await models.sequelize.query("select * from gmsPaymentTransactionLogDeposit " +
			"where pgRefNo='" + teamCode + "' and requestType=20 and gameEngine=3 and payStatus=10", { type: sequelize.QueryTypes.SELECT });

		var tlw = await models.sequelize.query("select * from gmsPaymentTransactionLogWithdraw " +
			"where pgRefNo='" + teamCode + "' and requestType=20 and gameEngine=3 and payStatus=10", { type: sequelize.QueryTypes.SELECT });

		if (tlb && tlb.length > 0) {
			var trxLogBonus = {};
			var receiver = tlb[0]['fkSenderId'];
			var sender = tlb[0]['fkReceiverId'];
			trxLogBonus.fkSenderId = sender;
			trxLogBonus.fkReceiverId = receiver;
			trxLogBonus.amount = tlb[0]['amount'];
			trxLogBonus.senderClosingBalance = 0;
			trxLogBonus.receiverClosingBalance = 0;
			trxLogBonus.requestType = 40;
			trxLogBonus.payStatus = 10;
			trxLogBonus.pgRefNo = teamCode;
			trxLogBonus.apiMsg = "{'msg':'Refund entry fee of fantacy By Cron','tlb-id':'" + tlb[0]['id'] + "'}";
			trxLogBonus.fkGameId = tlb[0]['fkGameId'];
			trxLogBonus.gameEngine = tlb[0]['gameEngine'];
			trxLogBonus.engineId = tlb[0]['engineId'];

			/*var settlementBonusAc = await getUserAccount(trxLogBonus.fkSenderId, 40);
			var userBonusAc = await getUserAccount(trxLogBonus.fkReceiverId, 40);*/

			var settlementBonusAc = await getUserAccountV1(trxLogBonus.fkSenderId, 40);
			var userBonusAc = await getUserAccountV1(trxLogBonus.fkReceiverId, 40);

			trxLogBonus.senderAcNum = settlementBonusAc[0]['id'];
			trxLogBonus.receiverAcNum = userBonusAc[0]['id'];
			try {
				let insert = await models.gmsPaymentTransactionLogBonus.build(trxLogBonus).save();
				if (insert) {
					console.log("Fantacy Refund Bonus Log Created");
					console.log("Refund Log Id : " + tlb[0]['id']);
					console.log("Created Log Id : " + insert['dataValues']['id']);
					console.log("Sender  : " + trxLogBonus.fkSenderId);
					console.log("Receiver  : " + trxLogBonus.fkReceiverId);

					// Update Account balance of sender and receiver 
					// var currentBalSettlementBonus = +settlementBonusAc[0]['balance'] - +trxLogBonus.amount;
					// let updateSettlement = await updateUserAccountBalance(trxLogBonus.fkSenderId, 40, currentBalSettlementBonus);
					// await updateUserAccountBalanceV1(trxLogBonus.fkSenderId, 40, currentBalSettlementBonus);
					
					let updateSettlement = await updateUserAccountBalanceV2(trxLogBonus.fkSenderId, 40, +trxLogBonus.amount, "dec");

					if (updateSettlement)
						console.log("Settlement Bonus Account balance Updated Successfully ");
					else
						console.log("Unable to update settlement bonus account balance  ");


					var currentBalUserBonus = +userBonusAc[0]['balance'] + +trxLogBonus.amount;
					console.log("User Opening Balance Refund Bonus : " + userBonusAc[0]['balance'] + " , User Closing Balance refund Bonus : " + currentBalUserBonus);
					// let updateUser = await updateUserAccountBalance(trxLogBonus.fkReceiverId, 40, currentBalUserBonus);
					// let updateUser = await updateUserAccountBalanceV1(trxLogBonus.fkReceiverId, 40, currentBalUserBonus);
					let updateUser = await updateUserAccountBalanceV2(trxLogBonus.fkReceiverId, 40, +trxLogBonus.amount, "inc");
					if (updateUser)
						console.log("User bonus account balance updated successfully , User ID : " + trxLogBonus.fkReceiverId + ", Previous Bal : " + userBonusAc[0]['balance'] + ", Current Balance : " + currentBalUserBonus);
					else
						console.log("Unable to update user bonus account balance , User ID : " + trxLogBonus.fkReceiverId + ", Previous Bal : " + userBonusAc[0]['balance'] + ", Current Balance : " + currentBalUserBonus);
				}
			}
			catch (error) {
				console.log("Error in TLB Processing for fantacy cricket");
				console.log(error);
			}
		}
		else
			console.log("No record found in TLB for fantacy entry fee refund. TeamCode : " + teamCode);


		if (tld && tld.length > 0) {
			var TransactionLogDepositInsert = {};
			var receiver = tld[0]['fkSenderId'];
			var sender = tld[0]['fkReceiverId'];
			TransactionLogDepositInsert.fkSenderId = sender;
			TransactionLogDepositInsert.fkReceiverId = receiver;
			TransactionLogDepositInsert.amount = tld[0]['amount'];
			TransactionLogDepositInsert.senderClosingBalance = 0;
			TransactionLogDepositInsert.receiverClosingBalance = 0;
			TransactionLogDepositInsert.requestType = 40;
			TransactionLogDepositInsert.payStatus = 10;
			TransactionLogDepositInsert.pgRefNo = teamCode;
			TransactionLogDepositInsert.apiMsg = "{'msg':'Refund entry fee of fantacy By Cron','tld-id':'" + tld[0]['id'] + "'}";
			TransactionLogDepositInsert.fkGameId = tld[0]['fkGameId'];
			TransactionLogDepositInsert.gameEngine = tld[0]['gameEngine'];
			TransactionLogDepositInsert.engineId = tld[0]['engineId'];

			/*var settlementDepositAc = await getUserAccount(TransactionLogDepositInsert.fkSenderId, 10);
			var userDepositAc = await getUserAccount(TransactionLogDepositInsert.fkReceiverId, 10);*/

			var settlementDepositAc = await getUserAccountV1(TransactionLogDepositInsert.fkSenderId, 10);
			var userDepositAc = await getUserAccountV1(TransactionLogDepositInsert.fkReceiverId, 10);

			TransactionLogDepositInsert.senderAcNum = settlementDepositAc[0]['id'];
			TransactionLogDepositInsert.receiverAcNum = userDepositAc[0]['id'];
			try {
				let insert = await models.gmsPaymentTransactionLogDeposit.build(TransactionLogDepositInsert).save();
				if (insert) {
					console.log("Fantacy Refund Deposit Log Created");
					console.log("Refund Log Id : " + tld[0]['id'])
					console.log("Created Log Id : " + insert['dataValues']['id']);
					console.log("Sender  : " + TransactionLogDepositInsert.fkSenderId);
					console.log("Receiver  : " + TransactionLogDepositInsert.fkReceiverId);

					//Update Account balance of sender and receiver 
					//var currentBalSettlementDeposit = +settlementDepositAc[0]['balance'] - +TransactionLogDepositInsert.amount;
					//let updateSettlement = await updateUserAccountBalance(TransactionLogDepositInsert.fkSenderId, 10, currentBalSettlementDeposit);
					//await updateUserAccountBalanceV1(TransactionLogDepositInsert.fkSenderId, 10, currentBalSettlementDeposit);
					
					let updateSettlement = await updateUserAccountBalanceV2(TransactionLogDepositInsert.fkSenderId, 10, +TransactionLogDepositInsert.amount, "dec");
					
					if (updateSettlement)
						console.log("Settlement Deposit Account balance Updated Successfully ");
					else
						console.log("Unable to update settlement deposit account balance  ");


					//var currentBalUserDeposit = +userDepositAc[0]['balance'] + +TransactionLogDepositInsert.amount;
					//console.log("User Opening Balance Refund Deposit : " + userDepositAc[0]['balance'] + " , User Closing Balance refund Deposit : " + currentBalUserDeposit);
					// let updateUser = await updateUserAccountBalance(TransactionLogDepositInsert.fkReceiverId, 10, currentBalUserDeposit);
					// let updateUser = await updateUserAccountBalanceV1(TransactionLogDepositInsert.fkReceiverId, 10, currentBalUserDeposit);
					
					let updateUser = await updateUserAccountBalanceV2(TransactionLogDepositInsert.fkReceiverId, 10, +TransactionLogDepositInsert.amount, "inc");
					
					if (updateUser)
						console.log("User deposit account balance updated successfully , User ID : " + TransactionLogDepositInsert.fkReceiverId + ", Previous Bal : " + userDepositAc[0]['balance'] + ", Current Balance : " + currentBalUserDeposit);
					else
						console.log("Unable to update user deposit account balance , User ID : " + TransactionLogDepositInsert.fkReceiverId + ", Previous Bal : " + userDepositAc[0]['balance'] + ", Current Balance : " + currentBalUserDeposit);
				}
			}
			catch (error) {
				console.log("Error in TLD Processing for fantacy cricket");
				console.log(error);
			}
		} else {
			console.log(
				'No record found in TLD for fantacy entry fee refund. TeamCode : ' +
				teamCode
			);
		}

		if (tlw && tlw.length > 0) {
			var TransactionLogWithdrawInsert = {};
			var receiver = tlw[0]['fkSenderId'];
			var sender = tlw[0]['fkReceiverId'];
			TransactionLogWithdrawInsert.fkSenderId = sender; //Settlement Withdraw Account
			TransactionLogWithdrawInsert.fkReceiverId = receiver;
			TransactionLogWithdrawInsert.amount = tlw[0]['amount'];
			TransactionLogWithdrawInsert.senderClosingBalance = 0;
			TransactionLogWithdrawInsert.receiverClosingBalance = 0;
			TransactionLogWithdrawInsert.requestType = 50;
			TransactionLogWithdrawInsert.payStatus = 10;
			TransactionLogWithdrawInsert.pgRefNo = teamCode;
			TransactionLogWithdrawInsert.apiMsg =
				"{'msg':'Refund entry fee of fantacy By Cron','tlw-id':'" +
				tlw[0]['id'] +
				"'}";
			TransactionLogWithdrawInsert.fkGameId = tlw[0]['fkGameId'];
			TransactionLogWithdrawInsert.gameEngine = tlw[0]['gameEngine'];
			TransactionLogWithdrawInsert.engineId = tlw[0]['engineId'];

			/*var settlementWithdrawAc = await getUserAccount(
				TransactionLogWithdrawInsert.fkSenderId,
				20
			);
			var userWithdrawAc = await getUserAccount(
				TransactionLogWithdrawInsert.fkReceiverId,
				20
			);*/

			var settlementWithdrawAc = await getUserAccountV1(
				TransactionLogWithdrawInsert.fkSenderId,
				20
			);
			var userWithdrawAc = await getUserAccountV1(
				TransactionLogWithdrawInsert.fkReceiverId,
				20
			);

			TransactionLogWithdrawInsert.senderAcNum = settlementWithdrawAc[0]['id'];
			TransactionLogWithdrawInsert.receiverAcNum = userWithdrawAc[0]['id'];
			try {
				const insert = await models.gmsPaymentTransactionLogWithdraw
					.build(TransactionLogWithdrawInsert)
					.save();
				if (insert) {
					console.log('Withdraw Log Created');
					console.log('Refund Log Id : ' + tlw[0]['id']);
					console.log('Created Log Id : ' + insert['dataValues']['id']);
					console.log('Sender  : ' + TransactionLogWithdrawInsert.fkSenderId);
					console.log(
						'Receiver  : ' + TransactionLogWithdrawInsert.fkReceiverId
					);

					//Update Account balance of sender and receiver
					var currentBalSettlementWithdrawt =
						+settlementWithdrawAc[0]['balance'] -
						+TransactionLogWithdrawInsert.amount;
					// let updateSettlement = await updateUserAccountBalance(
					// 	TransactionLogWithdrawInsert.fkSenderId,
					// 	20,
					// 	currentBalSettlementWithdrawt
					// );

					/*let updateSettlement = await updateUserAccountBalanceV1(
						TransactionLogWithdrawInsert.fkSenderId,
						20,
						+TransactionLogWithdrawInsert.amount
					);*/

					let updateSettlement = await updateUserAccountBalanceV2(
						TransactionLogWithdrawInsert.fkSenderId,
						20,
						+TransactionLogWithdrawInsert.amount,
						"dec"
					);

					if (updateSettlement)
						console.log(
							'Settlement withdraw account balance updated successfully '
						);
					else
						console.log(
							'Unable to update settlement withdraw account balance  '
						);

					var currentBalUserWithdraw =
						+userWithdrawAc[0]['balance'] +
						+TransactionLogWithdrawInsert.amount;
					
					console.log(
						'User Opening Balance Refund Withdraw : ' +
						userWithdrawAc[0]['balance'] +
						' , User Closing Balance refund Withdraw : ' +
						currentBalUserWithdraw
					);
					
					// let updateUser = await updateUserAccountBalance(
					// 	TransactionLogWithdrawInsert.fkReceiverId,
					// 	20,
					// 	currentBalUserWithdraw
					// );
					
					/*let updateUser = await updateUserAccountBalanceV1(
						TransactionLogWithdrawInsert.fkReceiverId,
						20,
						currentBalUserWithdraw
					);*/

					let updateUser = await updateUserAccountBalanceV2(
						TransactionLogWithdrawInsert.fkReceiverId,
						20,
						+TransactionLogWithdrawInsert.amount,
						"inc"
					);

					if (updateUser)
						console.log(
							'User withdraw account balance updated successfully , User ID : ' +
							TransactionLogWithdrawInsert.fkReceiverId +
							', Previous Bal : ' +
							userWithdrawAc[0]['balance'] +
							', Current Balance : ' +
							currentBalUserWithdraw
						);
					else
						console.log(
							'Unable to update user withdraw account balance ., User ID : ' +
							TransactionLogWithdrawInsert.fkReceiverId +
							', Previous Bal : ' +
							userWithdrawAc[0]['balance'] +
							', Current Balance : ' +
							currentBalUserWithdraw
						);
				}
			} catch (error) {
				console.log('Error in TLW Processing for fantacy cricket');
				console.log(error);
			}
		} else
			console.log('No record found in TLW for refund.');
		return true;
	} catch (error) {
		console.log('Error (refundFantacyEntryFee) ', error);
		return false;
	}
}

//Repeat the contest which has been filled and in upcomming (10022)
//Purpose : Make available that contest again for user once the contest got filled.
//This Cron execute in interval of 1 min.
//Schidule Time : */1 * * * *
//Test Time every 10 second. : */10 * * * * *

cron.schedule('*/1 * * * *', async function () {
	var cronId = 10022;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		//Select the contest which is in upcomming state.
		var contestList = await models.FantacyCricket.query(
			'select * from gmsFantacyCricketContest where status=20 ',
			{ type: sequelize.QueryTypes.SELECT }
		);
		for (var i = 0; contestList && i < contestList.length; i++) {
			var matchId = contestList[i]['fkMatchId'];
			var contestId = contestList[i]['id'];
			var contestConfigId = contestList[i]['fkContestConfigId'];
			let teamCount = await totalUserTeam(matchId, contestId);

			//Check if contest has been filled (reached to max user team)
			if (
				contestList[i]['maxUserTeam'] <= contestList[i]['totalUserTeam'] ||
				contestList[i]['maxUserTeam'] <= teamCount
			) {
				//Check if clone is already avaiable to filled .
				let maxUserTeam = contestList[i]['maxUserTeam'];
				let totalUserTeam = contestList[i]['totalUserTeam'];
				var cloneContest = await models.FantacyCricket.query(
					'SELECT COUNT(id) as cnt from gmsFantacyCricketContest ' +
					' where fkMatchId=' +
					matchId +
					' AND  fkContestConfigId=' +
					contestConfigId +
					' AND (maxUserTeam > totalUserTeam OR totalUserTeam is null) AND status in (10,20)',
					{ type: sequelize.QueryTypes.SELECT }
				);

				if (cloneContest[0]['cnt'] > 0) {
					console.log(
						'Clone contest alredy available. Match Id : ' +
						matchId +
						' , ContestId : ' +
						contestId +
						' , Config ID : ' +
						contestConfigId
					);
				} else {
					console.log(
						'Clone the contest for ,  Contest Id : ' +
						contestId +
						' Match ID : ' +
						matchId +
						' , Config ID : ' +
						contestConfigId
					);
					delete contestList[i]['id'];
					contestList[i]['totalUserTeam'] = null;
					contestList[i]['status'] = 10;
					contestList[i]['isCommisionDone'] = 10;
					contestList[i]['isPrizeDistributionDone'] = 10;
					try {
						let insert = await models.gmsFantacyCricketContest
							.build(contestList[i])
							.save();
						if (insert) {
							console.log(
								'Clone created successfully for : Match ID : ' +
								matchId +
								' , Contest Config ID : ' +
								contestConfigId
							);
						} else {
							console.log(
								'Unable to create clone for : Match ID : ' +
								matchId +
								' , Contest Config ID : ' +
								contestConfigId
							);
						}
					} catch (error) {
						console.log('Error : ', error);
					}
				}
			} else {
				console.log(
					'Spot is now available for contest ID : ' +
					contestId +
					', Match ID : ' +
					matchId
				);
			}
		} //End of for loop.
	} catch (error) {
		//End of try block.
		console.log('DB Error : ' + error);
	} //End of catch block.

	async function totalUserTeam(matchId, contestId) {
		try {
			var teamCount = await models.sequelize.query(
				'SELECT COUNT(DISTINCT teamCode) as cnt from gmsFantacyCricketUserTeam where fkMatchId=' +
				matchId +
				' AND fkContestId=' +
				contestId,
				{ type: sequelize.QueryTypes.SELECT }
			);

			return teamCount[0]['cnt'];
		} catch (error) {
			console.log('Error : totalUserTeam() ', error);
			return false;
		}
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

async function distributeEveryBodyWinContestPrize(matchId) {
	try {
		var contestList = await models.FantacyCricket.query(
			'select * from gmsFantacyCricketContest where isPrizeDistributionDone in (20,40) AND fkMatchId =' +
			matchId +
			' AND contestType in (4) ',
			{ type: sequelize.QueryTypes.SELECT }
		);
		for (var i = 0; i < contestList.length; i++) {
			//Check if already prize distributed.
			let contestID = contestList[i]['id'];
			if (!(await isPrizeDistributedByContestId(contestID))) {
				console.log(
					'Everybody winn contest prize distibution starting for Contest ID : ' +
					contestID +
					' , Match ID : ' +
					matchId
				);
				let teamData = await models.sequelize.query(
					'select t.teamCode,t.title as teamTitle, ' +
					' t.fkUserId as fkUserId,' +
					" CONCAT(u.firstName,' ',u.lastName) as userName," +
					' sum(t.point) as score ,' +
					' t.fkContestId as fkContestId' +
					' from gmsFantacyCricketUserTeam t' +
					' INNER JOIN gmsUsers u on u.id=t.fkUserId' +
					' where fkContestId=' +
					contestID +
					' GROUP BY teamCode ORDER BY score DESC',
					{ type: sequelize.QueryTypes.SELECT }
				);

				if (contestList[i]['isPrizeDistributionDone'] == 40) {
					//Refund Entry Fee
					for (var j = 0; teamData && j < teamData.length; j++) {
						teamData[j]['indexPrize'] = 0;
						teamData[j]['rank'] = 0;
						teamData[j]['indexRank'] = 0;
						teamData[j]['actualPrize'] = contestList[i]['entryFee'];
						teamData[j]['status'] = 3;
					}
				} else if (contestList[i]['isPrizeDistributionDone'] == 20) {
					//Distribute Winning amount
					var mainDistributionClass = await models.sequelize.query(
						`select * from gmsPrizeDistributionConfig 
						 where groupId=${contestList[i]['fkPDId']}`,
						{ type: sequelize.QueryTypes.SELECT }
					);

					var Rank = 0;

					for (var k = 0; teamData && k < teamData.length; k++) {
						if (k == 0) Rank = 1;
						else {
							if (teamData[k]['score'] < teamData[Rank - 1]['score']) {
								Rank = k + 1;
							}
						}

						for (var l = 0; l < mainDistributionClass.length; l++) {
							if (
								mainDistributionClass[l]['rankFrom'] <= Rank &&
								mainDistributionClass[l]['rankTill'] >= Rank
							) {
								teamData[k]['rank'] = Rank;
								teamData[k]['indexRank'] = k + 1;
								teamData[k]['indexPrize'] =
									mainDistributionClass[l]['individualAmount'];
								teamData[k]['actualPrize'] =
									mainDistributionClass[l]['individualAmount'];
								teamData[k]['status'] = 1;
								break;
							}
						} //End of inner forr loop.
					} //End of Outer for loop.
				} else {
					console.log(
						'We are unable to distribute for contest ID : ' +
						contestID +
						' , Is PrizeDistributionDone  : ' +
						contestList[i]['isPrizeDistributionDone']
					);
				}
				try {
					//Create prize Distribution of team Data
					console.log('Team Data  : ', teamData);
					const insert = await models.gmsContestPrizeDistribution.bulkCreate(
						teamData
					);
					if (insert) {
						console.log(
							'Prize distributed successfully for contest ID : ' + contestID
						);
						var finalStatus =
							contestList[i]['isPrizeDistributionDone'] == 20 ? 30 : 50;
						var UpdateContest = await models.FantacyCricket.query(
							'UPDATE gmsFantacyCricketContest set  ' +
							' isPrizeDistributionDone=' +
							finalStatus +
							' where id=' +
							contestList[i]['id'],
							{ type: sequelize.QueryTypes.UPDATE }
						);
						if (UpdateContest) {
							console.log(
								'Contest Updated successfully : ContestID : ' +
								contestID +
								' , isPD : ' +
								finalStatus
							);
						}
					}
				} catch (error) {
					console.log(
						'Unable to create Pize Distribution : Contest ID : ' + contestID
					);
					console.log('Error : ', error);
				}
			}
		}
	} catch (error) {
		console.log('Error : ', error);
	}
}

async function isPrizeDistributedByContestId(contestId) {
	try {
		var contestList = await models.sequelize.query(
			'select count(id) as cnt from gmsContestPrizeDistribution where fk_contestId=' +
			contestId,
			{ type: sequelize.QueryTypes.SELECT }
		);
		return contestList[0]['cnt'] > 0 ? true : false;
	} catch (error) {
		console.log('Error isPrizeDistributedByContestId() : ', error);
		return true;
	}
}

//Change Battle state from 110 to 450 and process the refund (10023)
//Purpose : If Game room created and user din't get opponent and didn't play the game then refund Money to user Wallet and change battle status to 450
//This Cron execute in interval of 1 min.
//Schidule Time : */1 * * * *
//Test Time every 20th sec. : */20 * * * * *
//Cron-ID - 10023  

cron.schedule("*/1 * * * *", async function () {
	var cronId = 10023;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log("Cron : " + cronId + " is InActive/Closed , Status : " + cron[0]['status']);
		return true;
	}
	else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log("Cron : " + cronId + " is Executing !");
	try {
		var battleRoom = await models.sequelize.query("select * from gmsBattleRoom where status in (110) AND createdAt < date_sub(Now() ,interval 1 Minute)", { type: sequelize.QueryTypes.SELECT });
		if (battleRoom && battleRoom.length > 0) {
			for (var j = 0; j < battleRoom.length; j++) {
				let pgRefNum = battleRoom[j]['br_roomId'].toString();

				var tlb = await models.sequelize.query("select * from gmsPaymentTransactionLogBonus " +
					"where pgRefNo='" + pgRefNum + "' and requestType=20", { type: sequelize.QueryTypes.SELECT });

				var tld = await models.sequelize.query("select * from gmsPaymentTransactionLogDeposit " +
					"where pgRefNo='" + pgRefNum + "' and requestType=20", { type: sequelize.QueryTypes.SELECT });

				var tlw = await models.sequelize.query("select * from gmsPaymentTransactionLogWithdraw " +
					"where pgRefNo='" + pgRefNum + "' and requestType=20", { type: sequelize.QueryTypes.SELECT });

				const isRefunded = true;
				//Refund to Bonus Account
				for (var i = 0; tlb && i < tlb.length; i++) {
					if (! await isRefundedBonus(pgRefNum, tlb[i]['fkSenderId'])) {
						var trxLogBonus = {};
						trxLogBonus.fkSenderId = tlb[i]['fkReceiverId'];
						trxLogBonus.fkReceiverId = tlb[i]['fkSenderId'];
						trxLogBonus.amount = tlb[i]['amount'];
						trxLogBonus.senderClosingBalance = 0;
						trxLogBonus.receiverClosingBalance = 0;
						trxLogBonus.requestType = 40;
						trxLogBonus.payStatus = 10;
						trxLogBonus.pgRefNo = pgRefNum;
						trxLogBonus.apiMsg = "{'msg':'Refund By Cron','tlb-id':'" + tlb[i]['id'] + "'}";
						trxLogBonus.fkGameId = tlb[i]['fkGameId'];
						trxLogBonus.gameEngine = tlb[i]['gameEngine'];
						trxLogBonus.engineId = tlb[i]['engineId'];

						/*var currentBalSettlementBonus = await getUserAccount(trxLogBonus.fkSenderId, 40);
						var userBonusAc = await getUserAccount(trxLogBonus.fkReceiverId, 40);*/

						var currentBalSettlementBonus = await getUserAccountV1(trxLogBonus.fkSenderId, 40);
						var userBonusAc = await getUserAccountV1(trxLogBonus.fkReceiverId, 40);

						trxLogBonus.senderAcNum = currentBalSettlementBonus[0]['id'];
						trxLogBonus.receiverAcNum = userBonusAc[0]['id'];
						try {
							let insert = await models.gmsPaymentTransactionLogBonus.build(trxLogBonus).save();
							if (insert) {
								console.log("Bonus Log Created for User : " + trxLogBonus.fkReceiverId);
								var currentBalSettlementBonus = +currentBalSettlementBonus[0]['balance'] - +trxLogBonus.amount;
								// let updateSettlement = await updateUserAccountBalance(trxLogBonus.fkSenderId, 40, currentBalSettlementBonus);
								// let updateSettlement = await updateUserAccountBalanceV1(trxLogBonus.fkSenderId, 40, currentBalSettlementBonus);

								let updateSettlement = await updateUserAccountBalanceV2(trxLogBonus.fkSenderId, 40, +trxLogBonus.amount, "dec");

								if (updateSettlement)
									console.log("Settlement Deposit Account balance Updated Successfully ");
								else
									console.log("Unable to update settlement deposit account balance  ");
								
								// var currentBalUserBonus = +userBonusAc[0]['balance'] + +trxLogBonus.amount;
								// let updateUser = await updateUserAccountBalance(trxLogBonus.fkReceiverId, 40, currentBalUserBonus);
								// let updateUser = await updateUserAccountBalanceV1(trxLogBonus.fkReceiverId, 40, currentBalUserBonus);
								
								let updateUser = await updateUserAccountBalanceV2(trxLogBonus.fkReceiverId, 40, +trxLogBonus.amount, "inc");

								if (updateUser)
									console.log("User bonus account balance updated successfully ");
								else
									console.log("Unable to update user bonus account balance  ");
							}
						} catch (error) {
							isRefunded = false;
							console.log("Error: ", error);
						}
					} else {
						console.log("Refund has processed Bonus already - PgRefNum: " + pgRefNum + ", User Id: " + tlb[i]['fkSenderId']);
					}
				}//End of Trx log Bonus loop.

				//Refund to Deposit Account
				for (var i = 0; tld && i < tld.length; i++) {
					if (! await isRefundedDeposit(pgRefNum, tld[i]['fkSenderId'])) {
						var TransactionLogDepositInsert = {};
						TransactionLogDepositInsert.fkSenderId = tld[i]['fkReceiverId'];
						TransactionLogDepositInsert.fkReceiverId = tld[i]['fkSenderId'];
						TransactionLogDepositInsert.amount = tld[i]['amount'];
						TransactionLogDepositInsert.senderClosingBalance = 0;
						TransactionLogDepositInsert.receiverClosingBalance = 0;
						TransactionLogDepositInsert.requestType = 40;
						TransactionLogDepositInsert.payStatus = 10;
						TransactionLogDepositInsert.pgRefNo = pgRefNum;
						TransactionLogDepositInsert.fkGameId = tld[i]['fkGameId'];
						TransactionLogDepositInsert.gameEngine = tld[i]['gameEngine'];
						TransactionLogDepositInsert.engineId = tld[i]['engineId'];

						/*var settlementDepositAc = await getUserAccount(TransactionLogDepositInsert.fkSenderId, 10);
						var userDepositAc = await getUserAccount(TransactionLogDepositInsert.fkReceiverId, 10);*/

						var settlementDepositAc = await getUserAccountV1(TransactionLogDepositInsert.fkSenderId, 10);
						var userDepositAc = await getUserAccountV1(TransactionLogDepositInsert.fkReceiverId, 10);

						TransactionLogDepositInsert.senderAcNum = settlementDepositAc[0]['id'];
						TransactionLogDepositInsert.receiverAcNum = userDepositAc[0]['id'];
						try {
							let insert = await models.gmsPaymentTransactionLogDeposit.build(TransactionLogDepositInsert).save();
							if (insert) {
								console.log("Deposit Log Created for User : " + TransactionLogDepositInsert.fkReceiverId);
								// var currentBalSettlementDeposit = +settlementDepositAc[0]['balance'] - +TransactionLogDepositInsert.amount;
								// let updateSettlement = await updateUserAccountBalance(TransactionLogDepositInsert.fkSenderId, 10, currentBalSettlementDeposit);
								// let updateSettlement = await updateUserAccountBalanceV1(TransactionLogDepositInsert.fkSenderId, 10, currentBalSettlementDeposit);

								let updateSettlement = await updateUserAccountBalanceV2(TransactionLogDepositInsert.fkSenderId, 10, +TransactionLogDepositInsert.amount, "dec");

								if (updateSettlement)
									console.log("Settlement Deposit Account balance Updated Successfully ");
								else
									console.log("Unable to update settlement deposit account balance  ");
								// var currentBalUserDeposit = +userDepositAc[0]['balance'] + +TransactionLogDepositInsert.amount;
								// let updateUser = await updateUserAccountBalance(TransactionLogDepositInsert.fkReceiverId, 10, currentBalUserDeposit);
								// let updateUser = await updateUserAccountBalanceV1(TransactionLogDepositInsert.fkReceiverId, 10, currentBalUserDeposit);

								let updateUser = await updateUserAccountBalanceV2(TransactionLogDepositInsert.fkReceiverId, 10, +TransactionLogDepositInsert.amount, "inc");

								if (updateUser)
									console.log("User deposit account balance updated successfully ");
								else
									console.log("Unable to update user deposit account balance  ");
							}
						} catch (error) {
							isRefunded = false;
							console.log("Error: ", error);
						}
					} else {
						console.log("Refund has processed Deposit already - PgRefNum: " + pgRefNum + ", User Id: " + tld[i]['fkSenderId']);
					}
				}//End of Trx log Deposit loop.

				//Refund to Withdraw Account
				for (var i = 0; tlw && i < tlw.length; i++) {
					if (! await isRefundedWithdraw(pgRefNum, tlw[i]['fkSenderId'])) {
						var TransactionLogWithdrawInsert = {};
						TransactionLogWithdrawInsert.fkSenderId = tlw[i]['fkReceiverId'];; //Settlement Withdraw Account
						TransactionLogWithdrawInsert.fkReceiverId = tlw[i]['fkSenderId'];
						TransactionLogWithdrawInsert.amount = tlw[i]['amount'];
						TransactionLogWithdrawInsert.senderClosingBalance = 0;
						TransactionLogWithdrawInsert.receiverClosingBalance = 0;
						TransactionLogWithdrawInsert.requestType = 50;
						TransactionLogWithdrawInsert.payStatus = 10;
						TransactionLogWithdrawInsert.pgRefNo = pgRefNum;
						TransactionLogWithdrawInsert.fkGameId = tlw[i]['fkGameId'];
						TransactionLogWithdrawInsert.gameEngine = tlw[i]['gameEngine'];
						TransactionLogWithdrawInsert.engineId = tlw[i]['engineId'];

						/*var settlementWithdrawAc = await getUserAccount(TransactionLogWithdrawInsert.fkSenderId, 20);
						var userWithdrawAc = await getUserAccount(TransactionLogWithdrawInsert.fkReceiverId, 20);*/

						var settlementWithdrawAc = await getUserAccountV1(TransactionLogWithdrawInsert.fkSenderId, 20);
						var userWithdrawAc = await getUserAccountV1(TransactionLogWithdrawInsert.fkReceiverId, 20);

						TransactionLogWithdrawInsert.senderAcNum = settlementWithdrawAc[0]['id'];
						TransactionLogWithdrawInsert.receiverAcNum = userWithdrawAc[0]['id'];
						try {
							const insert = await models.gmsPaymentTransactionLogWithdraw.build(TransactionLogWithdrawInsert).save();
							if (insert) {
								console.log("Withdraw Log Created for User : " + TransactionLogWithdrawInsert.fkReceiverId);
								// var currentBalSettlementWithdrawt = +settlementWithdrawAc[0]['balance'] - +TransactionLogWithdrawInsert.amount;
								// let updateSettlement = await updateUserAccountBalance(TransactionLogWithdrawInsert.fkSenderId, 20, currentBalSettlementWithdrawt);
								// let updateSettlement = await updateUserAccountBalanceV1(TransactionLogWithdrawInsert.fkSenderId, 20, currentBalSettlementWithdrawt);

								let updateSettlement = await updateUserAccountBalanceV2(TransactionLogWithdrawInsert.fkSenderId, 20, +TransactionLogWithdrawInsert.amount, "dec");

								if (updateSettlement)
									console.log("Settlement withdraw account balance updated successfully ");
								else
									console.log("Unable to update settlement withdraw account balance  ");
								// var currentBalUserWithdraw = +userWithdrawAc[0]['balance'] + +TransactionLogWithdrawInsert.amount;
								// let updateUser = await updateUserAccountBalance(TransactionLogWithdrawInsert.fkReceiverId, 20, currentBalUserWithdraw);
								// let updateUser = await updateUserAccountBalanceV1(TransactionLogWithdrawInsert.fkReceiverId, 20, currentBalUserWithdraw);
								
								let updateUser = await updateUserAccountBalanceV2(TransactionLogWithdrawInsert.fkReceiverId, 20, +TransactionLogWithdrawInsert.amount, "inc");
								
								if (updateUser)
									console.log("User withdraw account balance updated successfully ");
								else
									console.log("Unable to update user withdraw account balance  ");
							}
						} catch (error) {
							isRefunded = false;
							console.log("Error: ", error);
						}
					} else {
						console.log("Refund has processed Withdraw already - PgRefNum: " + pgRefNum + ", User Id: " + tlw[i]['fkSenderId']);
					}
				}//End of Trx log Withdraw loop

				//Updating the BattleRoom Status to 450
				try {
					let battleUpdate = await models.sequelize.query("update gmsBattleRoom set status=450 where br_roomId=" + pgRefNum + " ", { type: sequelize.QueryTypes.UPDATE });
					console.log("Battle room status updated successfully");
					if (isRefunded) {
						const fkPlayerId1 = battleRoom[j]['fk_PlayerId1'];
						const fkPlayerId2 = battleRoom[j]['fk_PlayerId2'];
						const fkBattleId = battleRoom[j]['fk_BattleId'];
						const gameDetails = await getGameDetailsByBattleId(fkBattleId);
						if (gameDetails && gameDetails[0]['amount']) {
							console.log(`Sending Push Notification Engine: Battle Refund (10011), Battle Room Id : ${pgRefNum}`)
							//Fetch both user data.
							if (fkPlayerId1) {
								//Send Push notification for first player.
								const userName = await getUserNameById(fkPlayerId1)
								await entryFeeRefundNotification(fkPlayerId1, userName, gameDetails[0]['amount'], gameDetails[0]['gameTitle'], "BATTLE_REFUND");
							}
							if (fkPlayerId2) {
								//Send Push notification for first player.
								const userName = await getUserNameById(fkPlayerId2)
								await entryFeeRefundNotification(fkPlayerId2, userName, gameDetails[0]['amount'], gameDetails[0]['gameTitle'], "BATTLE_REFUND");
							}
						} else {
							console.log("We are unable to send push notification (Game details not available) for Engine Game Battle Room Id : " + pgRefNum);
						}
					}
				} catch (error) {
					console.log("We are unalbe to upadte batlle room status in Cron(10023) : ", error);
				}
			} //End of Outer For loop (Battle room refund )
		} else {
			console.log('Currently No Refund is Available in Battle .');
		}
	} catch (error) {
		console.log('DB Error Cron Id : ' + cronId + ' , ', error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

// Update payment status from Paytm (10024) for updating last 20 minutes pending transactions
//Purpose : Updating Payment status from Paytm for updating last 20 minutes pending transactions
//This Cron execute in interval of 15 min.
//Schidule Time : */15 * * * *
//Test Time every 20th sec. : */20 * * * * *
//Cron-ID - 10024

cron.schedule('*/15 * * * *', async function () {
	var cronId = 10024;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	await updateStatusFromPaytm(20);
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

// Update payment status from Paytm (10025) for updating all pending transactions
//Purpose : Updating Payment status from Paytm for updating all pending transactions
//This cron will execute on each day at 12:00 AM .
//Schidule Time : 0 0 * * *
//Test Time (each minute): */1 * * * *
//Cron-ID - 10025

cron.schedule('0 0 * * *', async function () {
	var cronId = 10025;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	await updateStatusFromPaytm(0);
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

async function updateStatusFromPaytm(interval) {
	try {
		let query = `select * from gmsPaymentTransactionLogDeposit where payStatus=30 and fkSenderId=400 and pgRefNo is not null`;
		if (interval != 0) {
			query =
				`select * from gmsPaymentTransactionLogDeposit where payStatus=30 and fkSenderId=400 and pgRefNo is not null and createdAt >= date_sub(Now(), interval ` +
				interval +
				` Minute)`;
		}

		let data = await models.sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT,
		});
		if (data && data.length > 0) {
			let count = 0
			for (let i = 0; i < data.length; i++) {
				await checkAndUpdateStatusFromPaytm(data[i]);
				count += 1;
				if (count >= 50) {
					await sleep(5000);
					count = 0;
				}
			}
			console.log('Processed all pending transactions successfully!');
		} else {
			console.log('No pending transactions.');
		}
	} catch (e) {
		console.log('Error: ', e);
	}
}
sleep = (milliseconds) => {
	return new Promise(resolve => setTimeout(resolve, milliseconds))
}
async function checkAndUpdateStatusFromPaytm(paymentTLD) {
	try {
		const senderId = config.financialUser.PayTM;
		// let paymentTLD = data[i];
		const receiverId = paymentTLD.fkReceiverId;
		const pgRefNo = paymentTLD.pgRefNo;
		const bankRefNo = paymentTLD.bankRefNo;
		const response = await checkTransactionStatus(pgRefNo);
		const amount = +parseFloat(response['TXNAMOUNT']).toFixed(2);
		const orderId = response['ORDERID'];
		const isSuccess = response['STATUS'] == 'TXN_SUCCESS';
		if (
			isSuccess &&
			amount == paymentTLD['amount'] &&
			orderId == paymentTLD['pgRefNo']
		) {
			// success
			console.log('All conditions matched for txn.');
			if (
				await updateTransactionDepositLogAndUserAccounts(
					senderId,
					receiverId,
					amount,
					pgRefNo,
					bankRefNo,
					paymentTLD,
					response
				)
			)
				console.log('Payment Completed Successfully: ', pgRefNo);
			else
				console.error(
					'Oops! Some error occurred while processing payment ',
					pgRefNo
				);
		} else {
			// still pending or failed
			console.log(
				'Paytm txn status pending/failure response/or all conditions didnt match: ',
				response
			);
			if (response['STATUS'] == 'TXN_FAILURE') {
				paymentTLD.payStatus = 20;
				console.warn(
					'Oops! Transaction failed at PayTM, please retry: ',
					pgRefNo
				);
			} else {
				console.log(
					'Transaction is taking a bit longer to be processed ',
					pgRefNo
				);
			}
			paymentTLD.apiMsg = JSON.stringify(response);

			const update = await updateTransactionDepositLog(paymentTLD, {
				pgRefNo: pgRefNo,
				payStatus: 30,
			});
			// !update?await helper.sendJSON(res, [], true, 502, "DB Error in Deposit Log Update", 1):'';
			// check if it was failed or it is pending, then return the appropriate response
			if (!update) {
				console.warn('Oops! DB Error in Deposit Log Update ', pgRefNo);
			}
		}
	} catch (error) {
		console.log('Error: ', error);
	}
}

async function checkTransactionStatus(orderId) {
	let data = null;
	try {
		let paytmParams = await txnStatusRequestBuilder(orderId);
		const checksum = await PaytmChecksum.generateSignature(
			JSON.stringify(paytmParams),
			config.paytm_details.PAYTM_MERCHANT_KEY
		);
		paytmParams = await txnStatusRequestBuilder(
			orderId,
			checksum
		);
		const url = config.paytm_details.PAYTM_HOST + '/order/status';
		data = await makeRequest(url, 'POST', paytmParams, null);
	} catch (error) {
		console.log('Error: ', error);
	}
	return data;
}

async function txnStatusRequestBuilder(orderId, checksumHash = null) {
	if (checksumHash)
		return {
			MID: config.paytm_details.PAYTM_MERCHANT_ID,
			ORDERID: orderId,
			CHECKSUMHASH: checksumHash,
		};
	else
		return {
			MID: config.paytm_details.PAYTM_MERCHANT_ID,
			ORDERID: orderId,
		};
}
async function makeRequest(url, method, body, headers) {
	let pRequest = require('request-promise');
	const options = {
		url: url,
		method: method,
		body: body,
		json: true,
		headers: {},
		resolveWithFullResponse: true
	};
	console.log('PayTM Request: ', options);
	const resp = await pRequest(options);
	const jsonResponse = resp.body;
	console.log('PayTM Response: ', jsonResponse);
	return jsonResponse;
}
async function updateTransactionDepositLogAndUserAccounts(
	senderId,
	receiverId,
	amount,
	pgRefNo,
	bankRefNo,
	existingTLD,
	response
) {
	let result = false;
	try {
		// existingTLD.senderClosingBalance = await this.getClosingBalanceDeposit(senderId);
		// existingTLD.receiverClosingBalance = await this.getClosingBalanceDeposit(receiverId);
		existingTLD.payStatus = 10;
		existingTLD.bankRefNo = bankRefNo;
		existingTLD.apiMsg = JSON.stringify(response);

		const update = await updateTransactionDepositLog(existingTLD, {
			pgRefNo: pgRefNo,
			payStatus: 30,
		});
		if (!update) {
			console.log(
				'Paytm payment: DB Error while updating transaction deposit log.'
			);
		} else {
			//Update sender balance.
			const isDebited = await trxUserAccountBal(senderId, 10, amount, 2, existingTLD['id']);
			if (!isDebited)
				console.log(
					'Paytm payment: DB Error while updating sender account balance.'
				);

			//Update receiver balance.
			const isCredited = await trxUserAccountBal(receiverId, 10, amount, 1, existingTLD['id']);
			if (!isCredited)
				console.log(
					'Paytm payment: DB Error while updating receiver account balance.'
				);

			if (isCredited && isDebited) result = true;
		}
	} catch (e) {
		console.log('Error: ', e);
	}
	return result;
}
async function trxUserAccountBal(userId, acType, amount, transactionType,txnLogId=null) {
	try {
		let balField=accTypeField[acType];
		let trxType;

		//var existingBalance = await getUserAccountBal(userId, acType);
		/*var existingBalance = await getUserAccountBalV1(userId, acType);
		var currentBal = 0;
		if (transactionType == 1) {
			currentBal = +existingBalance + +amount;
		} else if (transactionType == 2) {
			currentBal = +existingBalance - +amount;
		}*/
 
		// var updateBalance = await updateUserAccountBal(currentBal, {
		// 	fkUserId: '' + userId,
		// 	acType: acType,
		// });


		// var updateBalance = await updateUserAccountBalV1(currentBal, userId, acType);

		if(transactionType==1){
			trxType="inc";
		}
		else if(transactionType==2){
			trxType="dec";
		}

		let amountData={};
		amountData[balField]=amount;

		let updateData={
			"playerId":userId,
			"amountData": amountData,
			"type": trxType,
			"from":{
					"purpose":"BALANCE_UPDATE_CRONJOB",
					"txnLogId": txnLogId
				}
		}

		var updateBalance=await gmsUserAccountCreateOrUpdateWallet(updateData);
		if (updateBalance)
			console.log('User account balance updated successfully.');
		else 
			console.log('Unable to update user account balance.');

		return true;
	} catch (error) {
		console.log('Error in making transaction in user account balance.');
		console.log('Error (TrxUserAccountBal) : ', error);
		return false;
	}
}
async function getUserAccountBal(userId, acType) {
	try {
		const [instance, wasCreated] = await models.gmsUserAccount.findOrCreate({
			where: { fkUserId: userId, acType: acType },
			defaults: { balance: 0 }
		});
		return +instance.balance;
	} catch (error) {
		console.log('Error (GetUserAccountBal) : ', error);
		return 0;
	}
}

async function getUserAccountBalV1(userId, acType) {
	let balField=accTypeField[acType];
	try {
		/*const [instance, wasCreated] = await models.gmsUserAccounts.findOrCreate({
			where: { fkUserId: userId },
			defaults: { depositBal: 0,withdrawBal:0,tokenBal:0, bonusBal:0, coinBal:0, referralBal:0 }
		});
		return +instance[balField]==null?0:+instance[balField];*/

		let balData=gmsUserAccountGet(userId);
		return balData[balField];

	} catch (error) {
		console.log('Error (getUserAccountBalV1) : ', error);
		return 0;
	}
}


async function updateUserAccountBal(balance, condition) {
	try {
		let update = await models.gmsUserAccount.update(
			{ balance: balance },
			{
				where: condition,
			}
		);
		return update;
	} catch (error) {
		console.log('Error (UpdateUserAccountBal) : ', error);
		return false;
	}
}

async function updateUserAccountBalV1(balance,userId,accType) {
	let balField=accTypeField[accType];
	try {
		// let update = await models.gmsUserAccounts.update(
		// 	{ balField : balance },
		// 	{
		// 		where: {fkUserId : userId},
		// 	}
		// );
		
		let update = await models.sequelize.query(
			`UPDATE gmsUserAccounts set ${balField}=${balance} where fkUserId=${userId} Limit 1`,
			{ type: sequelize.QueryTypes.UPDATE }
		);

		return update;
	} catch (error) {
		console.log('Error (updateUserAccountBalV1) : ', error);
		return false;
	}
}


async function updateTransactionDepositLog(data, cond) {
	try {
		return await models.gmsPaymentTransactionLogDeposit.update(data, {
			where: cond,
		});
	} catch (error) {
		console.log('Error (UpdateTransactionDepositLog) : ', error);
		return false;
	}
}

async function updateTransactionWithdrawLog(data, cond) {
	try {
		return await models.gmsPaymentTransactionLogWithdraw.update(data, {
			where: cond,
		});
	} catch (error) {
		console.log('Error (updateTransactionWithdrawLog) : ', error);
		return false;
	}
}

//Create and make live Tournament for Game (10026)
//Purpose : If Tournament has been End then create one more also.
//This Cron execute in interval of 1 Hr.
//Schidule Time : * */1 * * *
//Test Time every 20th sec. : */5 * * * * *
//Cron-ID - 10026

cron.schedule('*/1 * * * *', async function () {
	var cronId = 10026;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		// Get all configurable tournament which are active.
		let tournamentConfig = await models.sequelize.query(
			'select * from gmsTournamentConfig where status=1',
			{ type: sequelize.QueryTypes.SELECT }
		);

		for (let i = 0; tournamentConfig && i < tournamentConfig.length; i++) {
			// Get Last Tournament which has been created for this configuration
			let tournamentData = {};
			let tournament = await models.sequelize.query(
				'select * from gmsTournament where fkConfigId=:configId' +
				' ORDER BY id DESC',
				{
					replacements: { configId: tournamentConfig[i]['id'] },
					type: sequelize.QueryTypes.SELECT,
				}
			);

			let initialStartTime = tournamentConfig[i]['initialStartTime'];
			let interval = tournamentConfig[i]['interval'];
			let tournamentTime = tournamentConfig[i]['tournamentTime'];
			let currentTime = await getCurrentTime();
			let currentDate = await getCurrentDate();
			let tournamentStartTime = '';
			let tournamentEndTime = '';
			let currentStartTime = '';
			if (tournament.length == 0) {
				//Create first tournament of this configuration.
				console.log('Current Date : ' + currentDate);
				console.log('Current Time : ' + currentTime);

				initialStartTime = currentDate + ' ' + initialStartTime;
				currentStartTime = currentDate + ' ' + currentTime;

				console.log('Initial Start Time : ' + initialStartTime);
				console.log('Current Start Time : ' + currentStartTime);


				if (Date.parse(initialStartTime) < Date.parse(currentStartTime)) {
					console.log('Time Expire');
					let timeDiff = new Date(currentStartTime).getTime() / (60 * 1000) - new Date(initialStartTime).getTime() / (60 * 1000);
					console.log("time Diff : ", timeDiff);
					let timeExt = timeDiff % interval;
					console.log("Time Ext", timeExt);
					let timeToAdd = timeExt < interval - timeExt ? interval - timeExt : timeExt;
					console.log("Time To Add : ", timeToAdd);
					tournamentStartTime = await addMinute(
						currentStartTime,
						timeToAdd,
						true
					);
				} else {
					console.log('Time Available');
					tournamentStartTime = initialStartTime;
				}
				tournamentEndTime = await addMinute(
					tournamentStartTime,
					tournamentTime
				);
			} else if (
				tournament.length > 0 &&
				tournament[0]['status'] != 10 &&
				tournament[0]['status'] != 20
			) {
				//Create a tournament of this configuration if there is no upcomming/running tournament.
				if (
					tournamentConfig[i]['tournamentTime'] <=
					tournamentConfig[i]['interval']
				) {
					tournamentStartTime = await addMinute(
						tournament[0]['startTime'],
						tournamentConfig[i]['interval'],
						true
					);
				} else {
					tournamentStartTime = await addMinute(
						tournament[0]['endTime'],
						tournamentConfig[i]['interval'] / 2,
						true
					);
				}
				tournamentEndTime = await addMinute(
					tournamentStartTime,
					tournamentTime,
					false
				);
			} else {
				// There is already a upcomming/running tournament.
				console.log(
					'There is already a tournament : ' +
					tournament[0]['id'] +
					' running for config id : ' +
					tournamentConfig[i]['id']
				);
				continue;
			}
			tournamentData.startTime = tournamentStartTime;
			tournamentData.endTime = tournamentEndTime;

			console.log('Tournament Start Time : ' + tournamentStartTime);
			console.log('Tournament End Time : ' + tournamentEndTime);

			tournamentData.type = tournamentConfig[i]['type'];
			tournamentData.fkConfigId = tournamentConfig[i]['id'];
			tournamentData.fkGameId = tournamentConfig[i]['fkGameId'];
			tournamentData.title = tournamentConfig[i]['title'];
			tournamentData.entryFee = tournamentConfig[i]['entryFee'];
			tournamentData.prizePool = tournamentConfig[i]['prizePool'];
			tournamentData.minPlayer = tournamentConfig[i]['minPlayer'];
			tournamentData.maxPlayer = tournamentConfig[i]['maxPlayer'];
			tournamentData.rules = tournamentConfig[i]['rules'];
			tournamentData.maxPlaying = tournamentConfig[i]['maxPlaying'];
			tournamentData.createdAt = currentStartTime;
			tournamentData.updatedAt = currentStartTime;
			tournamentData.status = 10;
			tournamentData.fkPDId = tournamentConfig[i]['fkPDId'];

			let isTournamentCreated = await createNewTournament(tournamentData);
			console.log(
				'New Tournament created for config id : ' + tournamentConfig[i]['id']
			);
		}

		// Make tournament live/complete or cancelled.
		let tournament = await models.sequelize.query(
			`select t.*,g.gameCategory from gmsTournament t
			LEFT JOIN gmsGames g on g.id=t.fkGameId	
			where t.status in (10,20)`,
			{ type: sequelize.QueryTypes.SELECT }
		);
		let currDate = await getCurrentDate();
		let currTime = await getCurrentTime();
		for (let i = 0; tournament && i < tournament.length; i++) {
			let flag = false;
			if (tournament[i]['status'] == 10) {
				//Upcomming
				tournament[i]['status'] =
					Date.parse(tournament[i]['startTime']) <=
						Date.parse(currDate + ' ' + currTime)
						? 20
						: 10;
				flag = true;
			} else if (
				tournament[i]['status'] == 20 &&
				Date.parse(tournament[i]['endTime']) <=
				Date.parse(currDate + ' ' + currTime)
			) {
				if (tournament[i]['gameCategory'] == 1) {
					//For time based game.
					tournament[i]['status'] =
						tournament[i]['totalParticipant'] >= tournament[i]['minPlayer']
							? 40
							: 30;
				}
				else if (tournament[i]['gameCategory'] == 2) {
					//For Life Based Game

					//Check if any player is playing.
					let PlayingPlayerCount = await models.sequelize.query(
						`select count(id) as cnt 
						from gmsTournamentPlayers tp
						where tp.fkTournamentId=${tournament[i]['id']} AND tp.status=15 
							AND date_sub(Now(),interval 2 Minute)<=tp.updatedAt > `,
						{ type: sequelize.QueryTypes.SELECT }
					);
					if (PlayingPlayerCount[0]['cnt'] == 0)
						tournament[i]['totalParticipant'] >= tournament[i]['minPlayer'] ? 40 : 30;//Completed/cancelled
					else
						tournament[i]['status'] = 20;//Live

				}
				else {

				}
				flag = true;
			}
			if (flag) await updateTournament(tournament[i]);
		}
	} catch (error) {
		console.log('Error Cron Id : ' + cronId + ' , ', error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

async function getCurrentTime() {
	var today = new Date();
	var h = today.getHours() + ':';
	var m = today.getMinutes() + ':';
	var s = today.getSeconds();
	return h + m + s;
}

async function getCurrentDate() {
	var today = new Date();
	var y = today.getFullYear() + '-';
	var m = today.getMonth() + 1 + '-';
	var d = today.getDate();
	return y + m + d;
}

async function addMinute(dateTime, minute, isStart = false) {
	let ms = 60 * minute * 1000;
	var newTime = new Date(dateTime).getTime() + ms;
	newTime = new Date(newTime);

	if (isStart) {
		var time = 1000 * 60 * 5;
		newTime = new Date(Math.round(newTime.getTime() / time) * time);
	}

	let finalTime =
		newTime.getFullYear() +
		'-' +
		(newTime.getMonth() +
			1) +
		'-' +
		newTime.getDate() +
		' ' +
		newTime.getHours() +
		':' +
		newTime.getMinutes() +
		':' +
		newTime.getSeconds();
	console.log('Final Time : ' + finalTime);
	return finalTime;
}
async function createNewTournament(tournamentData) {
	try {
		let insert = await models.gmsTournament.build(tournamentData).save();
		return true;
	} catch (error) {
		console.log('Error cron Id : 10026 createNewTournament() : ', error);
		return false;
	}
}
async function updateTournament(tournamentData) {
	try {
		let data = await models.gmsTournament.update(tournamentData, {
			where: {
				id: tournamentData.id,
			},
		});
		return true;
	} catch (error) {
		console.log('Error cron Id : 10026 updateTournament() : ', error);
		return false;
	}
}

//Generate live tournament player rank and amount in game tournament(10027)
//Purpose : If Tournament is live then update player rank and current winning amount on every 5 Min..
//This Cron execute in interval of 5 Min.
//Schidule Time : */1 * * * *
//Test Time every 20th sec. : */20 * * * * *
//Cron-ID - 10027
cron.schedule('*/1 * * * *', async function () {
	var cronId = 10027;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		// Get all Tournament which is live OR (Finish Time is > current time - 10 MIN and Status is cancelled/completed).
		let tournament = await models.sequelize.query(
			'select id,fkConfigId,fkPDId from gmsTournament where status=20 ' +
			' OR (status in (30,40) AND date_sub(Now(),interval 10 Minute)<=endTime)',
			{ type: sequelize.QueryTypes.SELECT }
		);
		for (let i = 0; i < tournament.length; i++) {
			console.log(
				'Starting rank and amount generation for tournament : ' +
				tournament[i]['id']
			);
			//Select all player from gmsTournamentPlayers order by score DESC and status in 15,20
			let tournamentPlayer = await models.sequelize.query(
				'select * from gmsTournamentPlayers where status in (15,20) ' +
				' AND fkTournamentId=:tournamentId' +
				' ORDER BY score DESC ',
				{
					replacements: { tournamentId: tournament[i]['id'] },
					type: sequelize.QueryTypes.SELECT,
				}
			);

			let tPDConfig = await models.sequelize.query(
				`select * from gmsPrizeDistributionConfig where groupId=:fkPDId 
				 AND status=1 `,
				{
					replacements: { fkPDId: tournament[i]['fkPDId'] },
					type: sequelize.QueryTypes.SELECT,
				}
			);
			for (let j = 0; j < tournamentPlayer.length; j++) {
				tournamentPlayer[j]['rank'] = j + 1;
				for (let k = 0; k < tPDConfig.length; k++) {
					if (
						tPDConfig[k]['rankFrom'] <= tournamentPlayer[j]['rank'] &&
						tPDConfig[k]['rankTill'] >= tournamentPlayer[j]['rank']
					) {
						tournamentPlayer[j]['amount'] = tPDConfig[k]['individualAmount'];
						let isUpdatedRankAndAmount = await updateTournamentPlayer(
							tournamentPlayer[j]
						);
						if (isUpdatedRankAndAmount) {
							console.log(
								'Successfully updated rank and amount for player : ' +
								tournamentPlayer[j]['fkPlayerId'] +
								' -> (' +
								tournamentPlayer[j]['rank'] +
								' , ' +
								tournamentPlayer[j]['amount'] +
								')'
							);
						} else {
							console.log(
								'Unable to update rank and amount for player : ' +
								tournamentPlayer[j]['fkPlayerId'] +
								' -> (' +
								tournamentPlayer[j]['rank'] +
								' , ' +
								tournamentPlayer[j]['amount'] +
								')'
							);
						}
						break;
					} //End of rank match condition.
				} //End of tPDConfig for loop.
			} //End of tournament player for loop
			console.log(
				'End of rank and amount generation of tournament : ' +
				tournament[i]['id']
			);
		}
	} catch (error) {
		console.log('Error Cron Id : ' + cronId + ' , ', error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

async function updateTournamentPlayer(tournamentPlayerData) {
	try {
		let data = await models.gmsTournamentPlayers.update(tournamentPlayerData, {
			where: {
				id: tournamentPlayerData.id,
			},
		});
		return true;
	} catch (error) {
		console.log('Error cron Id : 10027 updateTournamentPlayer() : ', error);
		return false;
	}
}

//Generate final rank and amount once tournament get finished  in game tournament(10028)
//Purpose : If Tournament has been finished then update final player rank and amount (winning/entryfee) on every 30 Min..
//This Cron execute in interval of 30 Min.
//Schidule Time : */30 * * * *
//Test Time every 20th sec. : */20 * * * * *
//Cron-ID - 10028
cron.schedule('*/30 * * * *', async function () {
	var cronId = 10028;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		// Get all Tournament which has been finished and finished time is more then 30 min.
		let tournament = await models.sequelize.query(
			'select id,fkConfigId,fkPDId,entryFee,status from gmsTournament where ' +
			'status in (:status) AND endTime <= date_sub(Now(),interval 30 Minute)',
			{ replacements: { status: [30, 40] }, type: sequelize.QueryTypes.SELECT }
			//Status : 30:Cancelled / 40:Successfully completed
		);

		for (let i = 0; i < tournament.length; i++) {
			console.log(
				'Starting of final rank and amount generation for tournament : ' +
				tournament[i]['id']
			);

			//Select all player from gmsTournamentPlayers order by score DESC
			let tournamentPlayer = await models.sequelize.query(
				'select * from gmsTournamentPlayers where ' +
				' fkTournamentId=:tournamentId' +
				' ORDER BY score DESC ',
				{
					replacements: { tournamentId: tournament[i]['id'] },
					type: sequelize.QueryTypes.SELECT,
				}
			);

			//Get Prize distribution configuration if tournament successfully ended.
			if (tournament[i]['status'] == 40) {
				var tPDConfig = await models.sequelize.query(
					'select * from gmsPrizeDistributionConfig where groupId=:fkPDId ' +
					' AND status=1 ',
					{
						replacements: { fkPDId: tournament[i]['fkPDId'] },
						type: sequelize.QueryTypes.SELECT,
					}
				);
			}

			let inturemptedRank = 0;
			for (let j = 0; j < tournamentPlayer.length; j++) {
				if (tournament[i]['status'] == 30) {
					//Refund entry fee .
					tournamentPlayer[j]['rank'] = j + 1;
					tournamentPlayer[j]['amount'] = tournament[i]['entryFee'];
					tournamentPlayer[j]['pdStatus'] = 20;
				} else if (tournament[i]['status'] == 40) {
					if (
						tournamentPlayer[j]['status'] == 10 ||
						tournamentPlayer[j]['status'] == 30
					) {
						//Status : 10(initiated) / 30(Interupted)
						//Refund entry fee .
						inturemptedRank++;
						tournamentPlayer[j]['rank'] = null;
						tournamentPlayer[j]['amount'] = tournamentPlayer[j]['status'] == 10 ? tournament[i]['entryFee'] : 0;
						tournamentPlayer[j]['pdStatus'] = tournamentPlayer[j]['status'] == 10 ? 20 : 30;
					} else if (tournamentPlayer[j]['status'] == 15 || tournamentPlayer[j]['status'] == 20) {
						// 15(Playing) / 20 : Completed
						//Credit winning amount .
						tournamentPlayer[j]['rank'] = j + 1 - inturemptedRank;
						tournamentPlayer[j]['pdStatus'] = 10;

						for (let k = 0; k < tPDConfig.length; k++) {
							if (
								tPDConfig[k]['rankFrom'] <= tournamentPlayer[j]['rank'] &&
								tPDConfig[k]['rankTill'] >= tournamentPlayer[j]['rank']
							) {
								tournamentPlayer[j]['amount'] =
									tPDConfig[k]['individualAmount'];
								break;
							} //End of rank match condition.
						} //End of tPDConfig for loop.
					}
				}
				let isUpdatedRankAndAmount = await updateTournamentPlayer(
					tournamentPlayer[j]
				);
				if (isUpdatedRankAndAmount) {
					console.log(
						'Successfully updated rank and amount for player : ' +
						tournamentPlayer[j]['fkPlayerId'] +
						' -> (' +
						tournamentPlayer[j]['rank'] +
						' , ' +
						tournamentPlayer[j]['amount'] +
						')'
					);
				} else {
					console.log(
						'Unable to update rank and amount for player : ' +
						tournamentPlayer[j]['fkPlayerId'] +
						' -> (' +
						tournamentPlayer[j]['rank'] +
						' , ' +
						tournamentPlayer[j]['amount'] +
						')'
					);
				}
			} //End of tournamentPlayer for loop .
			if (tournament[i]['status'] == 30) tournament[i]['status'] = 50;
			else if (tournament[i]['status'] == 40) tournament[i]['status'] = 60;
			isTournamentUpdated = await updateTournament(tournament[i]);
			if (isTournamentUpdated)
				console.log('Tournament Updated Sucessfully : ' + tournament[i]['id']);
			else console.log('Unable to update tournament : ' + tournament[i]['id']);
		} //End of tournament for loop .
	} catch (error) {
		console.log('Error Cron Id : ' + cronId + ' , ', error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

//Credit tournament winning amount Or refund entry fee if prize distribution done .(10029)
//Purpose : credit winnning/refund amount once Tournament prize distribution done .
//This Cron execute in interval of 30 Min.
//Schidule Time : */30 * * * *
//Test Time every 20th sec. : */20 * * * * *
//Cron-ID - 10029

cron.schedule('*/30 * * * *', async function () {
	var cronId = 10029;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		//Get all tournament which prize distribution and entry fee has been generated.
		let tournament = await models.sequelize.query(`select t.id, t.fkConfigId, t.fkPDId, t.fkGameId,
					t.entryFee, t.status, g.title as gameTitle
				from gmsTournament t
				LEFT JOIN gmsGames g on g.id=t.fkGameId
				WHERE t.status in (:status) `,
			{ replacements: { status: [50, 60] }, type: sequelize.QueryTypes.SELECT }
		);

		for (let i = 0; i < tournament.length; i++) {
			console.log(`Starting of Winning amount / Entry Fee distribution for tournament : ${tournament[i]['id']}`);
			//Select all player from gmsTournamentPlayers.
			let tournamentPlayer = await models.sequelize.query(
				`select tp.*,u.userName from gmsTournamentPlayers tp
					LEFT JOIN gmsUsers u on u.id=tp.fkPlayerId
					WHERE tp.fkTournamentId=:tournamentId `,
				{
					replacements: { tournamentId: tournament[i]['id'] },
					type: sequelize.QueryTypes.SELECT,
				}
			);
			let isAmountCreditSuccessfull = true;
			for (let j = 0; j < tournamentPlayer.length; j++) {
				if (tournament[i]['status'] == 50) {
					//Credit entry fee .
					if (tournamentPlayer[j]['pdStatus'] == 20) {//20:refund entry fee
						let isRefunded = await refundEntryFee(tournament[i]['fkGameId'], tournamentPlayer[j]['id'], 2, tournament[i]['id']);
						if (isRefunded) {
							//Send Push Notification
							await entryFeeRefundNotification(tournamentPlayer[j]['fkPlayerId'], tournamentPlayer[j]['userName'], tournamentPlayer[j]['amount'], tournamentPlayer[j]['gameTitle'], "TOURNAMENT_REFUND")
							console.log(`Entry fee Refundede successfully for TP-ID : ${tournamentPlayer[j]['id']}`);
							tournamentPlayer[j]['pdStatus'] = 40;
						}
						else {
							isAmountCreditSuccessfull = false;
							console.log(`Unable to process entry fee refund for TP-ID : ${tournamentPlayer[j]['id']}`);
						}
					}
					else {
						console.log(`Can't distribute entry fee refund for TP-ID : ${tournamentPlayer[j]['id']}`);
					}
				} else if (tournament[i]['status'] == 60) {
					if (tournamentPlayer[j]['pdStatus'] == 20) {
						//Credit entry fee .
						let isRefunded = await refundEntryFee(tournament[i]['fkGameId'], tournamentPlayer[j]['id'], 2, tournament[i]['id']);
						if (isRefunded) {
							//Send Push Notification
							await entryFeeRefundNotification(tournamentPlayer[j]['fkPlayerId'], tournamentPlayer[j]['userName'], tournamentPlayer[j]['amount'], tournamentPlayer[j]['gameTitle'], "TOURNAMENT_REFUND")
							console.log(`Entry fee Refundede successfully for TP-ID : ${tournamentPlayer[j]['id']}`);
							tournamentPlayer[j]['pdStatus'] = 40;
						}
						else {
							isAmountCreditSuccessfull = false;
							console.log(`Unable to process entry fee refund for TP-ID : ${tournamentPlayer[j]['id']}`)
						}
					} else if (tournamentPlayer[j]['pdStatus'] == 10) {
						//Credit winning amount .
						let isCredited = await creditWinningAmountv2(tournament[i]['fkGameId'], 2, tournament[i]['id'], tournamentPlayer[j]['id'], tournamentPlayer[j]['amount'], tournament[i]['entryFee'], tournamentPlayer[j]['fkPlayerId']);
						if (isCredited) {

							await prizeWonNotification(tournamentPlayer[j]['fkPlayerId'], tournamentPlayer[j]['userName'], tournamentPlayer[j]['amount'], tournament[i]['gameTitle'], "TOURNAMENT_WINNER");
							/*const notification = {
								title: "Hey! You have a notification",
								body:  `Hi ${tournamentPlayer[j]['userName']}, You have won ₹  ${tournamentPlayer[j]['amount']} in ${tournament[i]['gameTitle']}. Keep Winning.`
							};
							const notificationData = {
								"notificationType": "TOURNAMENT_WINNER",
								"message": `Hi ${tournamentPlayer[j]['userName']}, You have won ₹  ${tournamentPlayer[j]['amount']} in ${tournament[i]['gameTitle']}. Keep Winning.`,
							}
							await NotificationService.sendPushNotification(tournamentPlayer[j]['fkPlayerId'], notificationData, notification);*/
							console.log(`Winning amount credited successfully for TP-ID : ${tournamentPlayer[j]['id']}`);
							tournamentPlayer[j]['pdStatus'] = 50;
						}
						else {
							isAmountCreditSuccessfull = false;
							console.log(`Unable to process winning amount for TP-ID : ${tournamentPlayer[j]['id']}`)
						}

					}
					else if (tournamentPlayer[j]['status'] == 30) {
						console.log(`Tournament player id : ${tournamentPlayer[j]['fkPlayerId']} , status ${tournamentPlayer[j]['status']} and PD Status : ${tournamentPlayer[j]['pdStatus']} Looser .`);
					}
					else {
						console.log(`Tournament player id : ${tournamentPlayer[j]['fkPlayerId']} , status ${tournamentPlayer[j]['status']} and PD Status : ${tournamentPlayer[j]['pdStatus']} can't credit amount to user wallet`);
						continue;
					}
				}
				else {
					console.log(`Unable to credit wining/entry fee amount to user for tournament id : ${tournament[i]['id']} , status ${tournament[i]['status']} `);
					break;
				}

				let isUpdatedTP = await updateTournamentPlayer(
					tournamentPlayer[j]
				);
				if (isUpdatedTP) {
					console.log(`Successfully Updated the Tournament player data : `, tournamentPlayer[j]);
				} else {
					isAmountCreditSuccessfull = false;
					console.log(`Unable to update tournament player data : `, tournamentPlayer[j]);
				}
			} //End of tournamentPlayer for loop .

			if (isAmountCreditSuccessfull && (tournament[i]['status'] == 50 || tournament[i]['status'] == 60)) {
				tournament[i]['status'] = tournament[i]['status'] == 50 ? 70 : 80;
				isTournamentUpdated = await updateTournament(tournament[i]);
				if (isTournamentUpdated)
					console.log(`Successfully credited amount for tournament ${tournament[i]['id']}`);
				else
					console.log(`Unable to credit amount for tournament : ${tournament[i]['id']}`);
			}
		} //End of tournament for loop .
	} catch (error) {
		console.log('Error Cron Id : ' + cronId + ' , ', error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

const refundEntryFee = async (gameId, pgRefNum, gameEngine, engineId) => {
	console.log("Game Id : ", gameId);
	try {
		//check if entry fee deducted from bonus account
		var tlb = await models.sequelize.query("select * from gmsPaymentTransactionLogBonus " +
			"where fkGameId=:gameId and pgRefNo=:pgRefNum and requestType=20 and gameEngine=:gameEngine " +
			"and engineId=:engineId and payStatus=10",
			{
				replacements: {
					gameId: gameId,
					pgRefNum: pgRefNum.toString(),
					gameEngine: gameEngine,
					engineId: engineId
				},
				type: sequelize.QueryTypes.SELECT
			});

		//check if entry fee deducted from deposit account.
		var tld = await models.sequelize.query("select * from gmsPaymentTransactionLogDeposit " +
			"where fkGameId=:gameId and pgRefNo=:pgRefNum and requestType=20 and gameEngine=:gameEngine " +
			"and engineId=:engineId and payStatus=10",
			{
				replacements: {
					gameId: gameId,
					pgRefNum: pgRefNum.toString(),
					gameEngine: gameEngine,
					engineId: engineId
				},
				type: sequelize.QueryTypes.SELECT
			});

		//check if entry fee deducted from bonus account.
		var tlw = await models.sequelize.query("select * from gmsPaymentTransactionLogWithdraw " +
			"where fkGameId=:gameId and pgRefNo=:pgRefNum and requestType=20 and gameEngine=:gameEngine " +
			"and engineId=:engineId and payStatus=10",
			{
				replacements: {
					gameId: gameId,
					pgRefNum: pgRefNum.toString(),
					gameEngine: gameEngine,
					engineId: engineId
				},
				type: sequelize.QueryTypes.SELECT
			});

		//Bonus entry fee refund start here.
		if (tlb && tlb.length > 0) {
			var trxLogBonus = {};
			var receiver = tlb[0]['fkSenderId'];
			var sender = tlb[0]['fkReceiverId'];
			trxLogBonus.fkSenderId = sender;
			trxLogBonus.fkReceiverId = receiver;
			trxLogBonus.amount = tlb[0]['amount'];
			trxLogBonus.senderClosingBalance = 0;
			trxLogBonus.receiverClosingBalance = 0;
			trxLogBonus.requestType = 40;
			trxLogBonus.payStatus = 10;
			trxLogBonus.pgRefNo = pgRefNum;
			trxLogBonus.apiMsg = "{'msg':'Refund entry fee By Cron','tlb-id':'" + tlb[0]['id'] + "'}";
			trxLogBonus.fkGameId = tlb[0]['fkGameId'];
			trxLogBonus.gameEngine = tlb[0]['gameEngine'];
			trxLogBonus.engineId = tlb[0]['engineId'];

			/*var settlementBonusAc = await getUserAccount(trxLogBonus.fkSenderId, 40);
			var userBonusAc = await getUserAccount(trxLogBonus.fkReceiverId, 40);*/

			var settlementBonusAc = await getUserAccountV1(trxLogBonus.fkSenderId, 40);
			var userBonusAc = await getUserAccountV1(trxLogBonus.fkReceiverId, 40);

			trxLogBonus.senderAcNum = settlementBonusAc[0]['id'];
			trxLogBonus.receiverAcNum = userBonusAc[0]['id'];
			try {
				let insert = await models.gmsPaymentTransactionLogBonus.build(trxLogBonus).save();
				if (insert) {
					console.log(`Entry fee Refund for Bonus account log created.
								Game Engine : ${gameEngine} , Engine id : ${engineId} , 
								pgRefNum : ${pgRefNum} , GameId : ${gameId}
								Log Id : ${tlb[0]['id']}
								Created Log Id : ${insert['dataValues']['id']}
					`);

					//Update Account balance of sender and receiver 
					// var currentBalSettlementBonus = +settlementBonusAc[0]['balance'] - +trxLogBonus.amount;
					// let updateSettlement = await updateUserAccountBalance(trxLogBonus.fkSenderId, 40, currentBalSettlementBonus);
					// let updateSettlement =await updateUserAccountBalanceV1(trxLogBonus.fkSenderId, 40, currentBalSettlementBonus);
					
					let updateSettlement =await updateUserAccountBalanceV2(trxLogBonus.fkSenderId, 40, +trxLogBonus.amount, "dec");
					
					if (updateSettlement)
						console.log("Settlement Bonus Account balance Updated Successfully ");
					else
						console.log("Unable to update settlement bonus account balance  ");


					var currentBalUserBonus = +userBonusAc[0]['balance'] + +trxLogBonus.amount;
					console.log(`User Opening Balance Refund Bonus : ${userBonusAc[0]['balance']} , User Closing Balance refund Bonus :  ${currentBalUserBonus}`);

					// let updateUser = await updateUserAccountBalance(trxLogBonus.fkReceiverId, 40, currentBalUserBonus);
					// let updateUser = await updateUserAccountBalanceV1(trxLogBonus.fkReceiverId, 40, currentBalUserBonus);

					let updateUser = await updateUserAccountBalanceV2(trxLogBonus.fkReceiverId, 40, +trxLogBonus.amount, "inc");

					if (updateUser)
						console.log("User bonus account balance updated successfully , User ID : " + trxLogBonus.fkReceiverId + ", Previous Bal : " + userBonusAc[0]['balance'] + ", Current Balance : " + currentBalUserBonus);
					else
						console.log("Unable to update user bonus account balance , User ID : " + trxLogBonus.fkReceiverId + ", Previous Bal : " + userBonusAc[0]['balance'] + ", Current Balance : " + currentBalUserBonus);
				}
			}
			catch (error) {
				console.log(`Error in TLB processing entry fee for 
								Game Engine : ${gameEngine} , Engine id : ${engineId} , 
								pgRefNum : ${pgRefNum} , GameId : ${gameId}
								Log Id : ${tlb[0]['id']}`);
				console.log(error);
			}
		}
		else
			console.log(`No record found in TLB for  entry fee refund. 
				Game Engine : ${gameEngine} , Engine id : ${engineId} , 
				pgRefNum : ${pgRefNum} , GameId : ${gameId}`);

		//Deposit entry fee refund start here.
		if (tld && tld.length > 0) {
			var TransactionLogDepositInsert = {};
			var receiver = tld[0]['fkSenderId'];
			var sender = tld[0]['fkReceiverId'];
			TransactionLogDepositInsert.fkSenderId = sender;
			TransactionLogDepositInsert.fkReceiverId = receiver;
			TransactionLogDepositInsert.amount = tld[0]['amount'];
			TransactionLogDepositInsert.senderClosingBalance = 0;
			TransactionLogDepositInsert.receiverClosingBalance = 0;
			TransactionLogDepositInsert.requestType = 40;
			TransactionLogDepositInsert.payStatus = 10;
			TransactionLogDepositInsert.pgRefNo = pgRefNum;
			TransactionLogDepositInsert.apiMsg = "{'msg':'Refund entry fee By Cron','tld-id':'" + tld[0]['id'] + "'}";
			TransactionLogDepositInsert.fkGameId = tld[0]['fkGameId'];
			TransactionLogDepositInsert.gameEngine = tld[0]['gameEngine'];
			TransactionLogDepositInsert.engineId = tld[0]['engineId'];

			/*var settlementDepositAc = await getUserAccount(TransactionLogDepositInsert.fkSenderId, 10);
			var userDepositAc = await getUserAccount(TransactionLogDepositInsert.fkReceiverId, 10);*/

			var settlementDepositAc = await getUserAccountV1(TransactionLogDepositInsert.fkSenderId, 10);
			var userDepositAc = await getUserAccountV1(TransactionLogDepositInsert.fkReceiverId, 10);

			TransactionLogDepositInsert.senderAcNum = settlementDepositAc[0]['id'];
			TransactionLogDepositInsert.receiverAcNum = userDepositAc[0]['id'];
			try {
				let insert = await models.gmsPaymentTransactionLogDeposit.build(TransactionLogDepositInsert).save();
				if (insert) {
					console.log(`Entry fee Refund for Deposit account log created.
								Game Engine : ${gameEngine} , Engine id : ${engineId} , 
								pgRefNum : ${pgRefNum} , GameId : ${gameId}
								Log Id : ${tld[0]['id']}
								Created Log Id : ${insert['dataValues']['id']}
					`);


					//Update Account balance of sender and receiver 
					// var currentBalSettlementDeposit = +settlementDepositAc[0]['balance'] - +TransactionLogDepositInsert.amount;
					// let updateSettlement = await updateUserAccountBalance(TransactionLogDepositInsert.fkSenderId, 10, currentBalSettlementDeposit);
					// let updateSettlement = await updateUserAccountBalanceV1(TransactionLogDepositInsert.fkSenderId, 10, currentBalSettlementDeposit);
					
					let updateSettlement = await updateUserAccountBalanceV2(TransactionLogDepositInsert.fkSenderId, 10, +TransactionLogDepositInsert.amount,"dec");
					if (updateSettlement)
						console.log("Settlement Deposit Account balance Updated Successfully ");
					else
						console.log("Unable to update settlement deposit account balance  ");


					var currentBalUserDeposit = +userDepositAc[0]['balance'] + +TransactionLogDepositInsert.amount;
					console.log(`User Opening Balance Refund Deposite : ${userDepositAc[0]['balance']} , User Closing Balance refund Deposit :  ${currentBalUserDeposit}`);
					// let updateUser = await updateUserAccountBalance(TransactionLogDepositInsert.fkReceiverId, 10, currentBalUserDeposit);
					// let updateUser = await updateUserAccountBalanceV1(TransactionLogDepositInsert.fkReceiverId, 10, currentBalUserDeposit);

					let updateUser = await updateUserAccountBalanceV2(TransactionLogDepositInsert.fkReceiverId, 10, +TransactionLogDepositInsert.amount, "inc");

					if (updateUser)
						console.log("User deposit account balance updated successfully , User ID : " + TransactionLogDepositInsert.fkReceiverId + ", Previous Bal : " + userDepositAc[0]['balance'] + ", Current Balance : " + currentBalUserDeposit);
					else
						console.log("Unable to update user deposit account balance , User ID : " + TransactionLogDepositInsert.fkReceiverId + ", Previous Bal : " + userDepositAc[0]['balance'] + ", Current Balance : " + currentBalUserDeposit);
				}
			}
			catch (error) {
				console.log(`Error in TLD processing entry fee for 
								Game Engine : ${gameEngine} , Engine id : ${engineId} , 
								pgRefNum : ${pgRefNum} , GameId : ${gameId}
								Log Id : ${tld[0]['id']}`);
				console.log(error);
			}
		} else {
			console.log(`No record found in TLD for entry fee refund  
				Game Engine : ${gameEngine} , Engine id : ${engineId} , 
				pgRefNum : ${pgRefNum} , GameId : ${gameId}
			`);
		}

		//Withdraw entry fee refund start here.
		if (tlw && tlw.length > 0) {
			var TransactionLogWithdrawInsert = {};
			var receiver = tlw[0]['fkSenderId'];
			var sender = tlw[0]['fkReceiverId'];
			TransactionLogWithdrawInsert.fkSenderId = sender; //Settlement Withdraw Account
			TransactionLogWithdrawInsert.fkReceiverId = receiver;
			TransactionLogWithdrawInsert.amount = tlw[0]['amount'];
			TransactionLogWithdrawInsert.senderClosingBalance = 0;
			TransactionLogWithdrawInsert.receiverClosingBalance = 0;
			TransactionLogWithdrawInsert.requestType = 50;
			TransactionLogWithdrawInsert.payStatus = 10;
			TransactionLogWithdrawInsert.pgRefNo = pgRefNum;
			TransactionLogWithdrawInsert.apiMsg = "{'msg':'Refund entry fee By Cron','tlw-id':'" + tlw[0]['id'] + "'}";
			TransactionLogWithdrawInsert.fkGameId = tlw[0]['fkGameId'];
			TransactionLogWithdrawInsert.gameEngine = tlw[0]['gameEngine'];
			TransactionLogWithdrawInsert.engineId = tlw[0]['engineId'];

			/*var settlementWithdrawAc = await getUserAccount(TransactionLogWithdrawInsert.fkSenderId, 20);
			var userWithdrawAc = await getUserAccount(TransactionLogWithdrawInsert.fkReceiverId, 20);*/

			var settlementWithdrawAc = await getUserAccountV1(TransactionLogWithdrawInsert.fkSenderId, 20);
			var userWithdrawAc = await getUserAccountV1(TransactionLogWithdrawInsert.fkReceiverId, 20);

			TransactionLogWithdrawInsert.senderAcNum = settlementWithdrawAc[0]['id'];
			TransactionLogWithdrawInsert.receiverAcNum = userWithdrawAc[0]['id'];
			try {
				const insert = await models.gmsPaymentTransactionLogWithdraw
					.build(TransactionLogWithdrawInsert)
					.save();
				if (insert) {
					console.log(`Entry fee Refund for wITHDRAW account log created.
								Game Engine : ${gameEngine} , Engine id : ${engineId} , 
								pgRefNum : ${pgRefNum} , GameId : ${gameId}
								Log Id : ${tlw[0]['id']}
								Created Log Id : ${insert['dataValues']['id']}
					`);
					//Update Account balance of sender and receiver
					/*var currentBalSettlementWithdrawt =
						+settlementWithdrawAc[0]['balance'] -
						+TransactionLogWithdrawInsert.amount;*/

					// let updateSettlement = await updateUserAccountBalance(
					// 	TransactionLogWithdrawInsert.fkSenderId,
					// 	20,
					// 	currentBalSettlementWithdrawt
					// );

					/* let updateSettlement = await updateUserAccountBalanceV1(
						TransactionLogWithdrawInsert.fkSenderId,
						20,
						currentBalSettlementWithdrawt
					); */

					let updateSettlement = await updateUserAccountBalanceV2(
						TransactionLogWithdrawInsert.fkSenderId,
						20,
						+TransactionLogWithdrawInsert.amount,
						"dec"
					);

					if (updateSettlement)
						console.log('Settlement withdraw account balance updated successfully ');
					else
						console.log('Unable to update settlement withdraw account balance  ');

					var currentBalUserWithdraw = +userWithdrawAc[0]['balance'] + +TransactionLogWithdrawInsert.amount;
					console.log(`User Opening Balance Refund Deposite : ${userWithdrawAc[0]['balance']} , User Closing Balance refund Deposit :  ${currentBalUserWithdraw}`);

					// let updateUser = await updateUserAccountBalance(TransactionLogWithdrawInsert.fkReceiverId, 20, currentBalUserWithdraw);
					// let updateUser = await updateUserAccountBalanceV1(TransactionLogWithdrawInsert.fkReceiverId, 20, currentBalUserWithdraw);

					let updateUser = await updateUserAccountBalanceV2(TransactionLogWithdrawInsert.fkReceiverId, 20, +TransactionLogWithdrawInsert.amount, "inc");

					if (updateUser)
						console.log('User withdraw account balance updated successfully , User ID : ' + TransactionLogWithdrawInsert.fkReceiverId + ', Previous Bal : ' + userWithdrawAc[0]['balance'] + ', Current Balance : ' + currentBalUserWithdraw);
					else
						console.log('Unable to update user withdraw account balance ., User ID : ' + TransactionLogWithdrawInsert.fkReceiverId + ', Previous Bal : ' + userWithdrawAc[0]['balance'] + ', Current Balance : ' + currentBalUserWithdraw);
				}
			} catch (error) {
				console.log(`Error in TLW processing entry fee for 
							Game Engine : ${gameEngine} , Engine id : ${engineId} , 
							pgRefNum : ${pgRefNum} , GameId : ${gameId}
							Log Id : ${tlw[0]['id']}`);
				console.log(error);
			}
		} else
			console.log(`No record found in TLW for entry fee refund  
				Game Engine : ${gameEngine} , Engine id : ${engineId} , 
				pgRefNum : ${pgRefNum} , GameId : ${gameId}
			`);

		return true;
	} catch (error) {
		console.log('Error (refundFantacyEntryFee) ', error);
		return false;
	}
}//End of refund Entry fee.


const creditWinningAmountv2 = async (gameId, gameEngine, engineId, pgRefNum, amount, entryFee, userId) => {
	// Credit winning amount to user deposit and/or withdraw account
	try {
		let trxLog = {};
		trxLog.fkSenderId = config.financialUser.Settlement; //Withdraw Settlement
		trxLog.fkReceiverId = userId; //Fantacy Winner Player
		trxLog.payStatus = 10;
		trxLog.senderClosingBalance = 0;
		trxLog.receiverClosingBalance = 0;
		trxLog.pgRefNo = pgRefNum;
		trxLog.fkGameId = gameId;
		trxLog.gameEngine = gameEngine;
		trxLog.engineId = engineId;

		const isWinningPrizeCredited = await giveWinningAmountToUserForContest(userId, trxLog, amount, entryFee);
		if (isWinningPrizeCredited) {
			console.log(`Winning amount credited Successfully for 
						gameId : ${gameId} , gameEngine : ${gameEngine}
						EngineId : ${engineId} , PgRefNum : ${pgRefNum}
						Entry Fee : ${entryFee} , Amount : ${amount}`);
			return true;
		} else {
			console.log(`Unable to credit winning amount for 
						gameId : ${gameId} , gameEngine : ${gameEngine}
						EngineId : ${engineId} , PgRefNum : ${pgRefNum}
						Entry Fee : ${entryFee} , Amount : ${amount}`);
			return false;
		}
	} catch (error) {
		console.log(`Error in  to creditWinningAmountv2() for 
						gameId : ${gameId} , gameEngine : ${gameEngine}
						EngineId : ${engineId} , PgRefNum : ${pgRefNum}
						Entry Fee : ${entryFee} , Amount : ${amount}`);

		console.log(error);
		return false;
	}
}//End of credit winning amount V2

//Chccking Cron job Health status
//Purpose : This will check cron job status every 1hr and send mail alert to the backend team
//This Cron executes every 1 hr.
//Schidule Time : * */1 * * *
//Test Time (each minute): */1 * * * *
// We didn't add this cron in database. We should run this cron with out any dependencies with database

cron.schedule('*/5 * * * *', async function () {
	try {
		const cronsList = await models.sequelize.query(
			'SELECT * FROM gmsCronJob WHERE status in (0,1)',
			{ type: sequelize.QueryTypes.SELECT }
		);
		//console.log("Cron Data: ", cronsList);
		failedCronsList = [];
		for (let i = 0; i < cronsList.length; i++) {
			try {
				let cronInstance = new Cron();
				cronInstance.fromString(cronsList[i].scheduleTime);
				let schedule = cronInstance.schedule();
				let scheduleTime = new Date(schedule.prev().format());
				console.log("Schedule Time: ", scheduleTime);
				
				var lastRun = new Date(cronsList[i].updatedAt);
				lastRun.setMinutes(lastRun.getMinutes()-329);
				console.log("Last Run: ", lastRun);
				
				
				// console.log("Get Time last run : ",lastRun.getTime());
				// console.log("Get Time Schedule Time : ",scheduleTime.getTime());

				if (lastRun >= scheduleTime) {
					console.log(" Cron: %s is running", cronsList[i].id);
				} else {
					console.log("Cron: %s is failed", cronsList[i].id);
					let failedCron = {
						"cronId": cronsList[i].id,
						"title": cronsList[i].title,
						"description": cronsList[i].purpose,
						"lastRunAt": cronsList[i].updatedAt
					};
					failedCronsList.push(failedCron);
				}
			} catch (error) {
				console.log("Error: ", error);
			}
		}
		console.log('Failed Crons List: ', failedCronsList);
		
		for(let i=0;i<failedCronsList.length;i++){
			await lockUnlock(failedCronsList[i]['cronId'],1);
		}

		if (failedCronsList.length > 0) {
			await sendMailAlert(failedCronsList);
		} else {
			console.log("All Crons are running good...");
		}

	} catch (error) {
		console.log('Error  Health Cron ', error);
	}
});

async function sendMailAlert(cronsList) {
	let data = [];
	try {
		console.log("Sending Mail...");
		let subject = "Gamesapp Cronjob is Failed !!";
		let body =
			"<p>Hi Geeks,</p>" +
			"<p>Following Crons are failing. Please look into that, </p>"
		for (let i = 0; i < cronsList.length; i++) {
			let cronDetails = i + 1 + ". " +
				"<i>Cron Id:</i> " + cronsList[i].cronId + "<br />" +
				"&nbsp;&nbsp;&nbsp;&nbsp;<i>Title:</i> " + cronsList[i].title + "<br />" +
				"&nbsp;&nbsp;&nbsp;&nbsp;<i>Description:</i> " + cronsList[i].description + "<br />" +
				"&nbsp;&nbsp;&nbsp;&nbsp;<i>Last Run At:</i> " + cronsList[i].lastRunAt + "<br /><br /><br />"
			body += cronDetails;
		}
		body += '<b>Thanks & Regards</b><br/>Team Backend (GamesApp)';
		await sendMail(
			config.serverMailAlerts,
			subject,
			body,
			true
		);
	} catch (error) {
		console.log("Exception > ", error);
	}
	return data;
}

// Remove user from table game after 30 seconds (10030)
//Purpose :  Remove user from table game after 30 seconds if user stills in joined state
//This cron will execute on every 30 Seconds .
//Schidule Time : */30 * * * * *
//Test Time (each minute): */30 * * * * *
//Cron-ID - 10030
//This cron Job is not in Use
cron.schedule('*/30 * * * * *', async function () {
	var cronId = 10030;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {

		const query = `SELECT * FROM gmsTableGamePlayers WHERE status=100 AND createdAt <= date_sub(NOW(), INTERVAL 30 SECOND)`;
		let data = await models.sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT,
		});
		if (data && data.length > 0) {
			for (let i = 0; i < data.length; i++) {
				try {
					let updatePlayer = {};
					updatePlayer.status = 500;
					const tableGamePlayers = await models.gmsTableGamePlayers.update(updatePlayer, {
						where: {
							id: data[i].id
						}
					});
					await updateActivePlayersCount(data[i].fkTableGameId);
				} catch (error) {
					console.log('Error: ', error);
				}
			}
		}
	} catch (error) {
		console.log('Cron(10030) Error: ', error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

async function updateActivePlayersCount(tableGameId) {
	try {
		const tableGame = await models.gmsTableGame.findOne({ where: { id: tableGameId, status: 100 } })
		if (tableGame.activePlayersCount > 0){
			await tableGame.decrement('activePlayersCount');
		}	
		if (tableGame.status == 200) {
			tableGame.status = 100;
			tableGame.save()
		}
		return true;
	} catch (error) {
		console.log("Error - updateActivePlayersCount: ", error);
		return false;
	}
}

//Check the deposite and make referral ticket active if deposite completed (10031)
//Purpose :  If onborded user made his first deposite the make the reffer ticket active ,
//			so that referrar can creit there scratched amount to bonus account.
//This cron will execute on every 5 minutes .
//Schidule Time : */5 * * * *
//Test Time (each 30 sec): */30 * * * * *
//Cron-ID - 10031

cron.schedule('*/5 * * * *', async function () {
	var cronId = 10031;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		const query = `SELECT * FROM gmsUserReferralTickets WHERE status=10 AND isDeposited=0`;
		let data = await models.sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT,
		});

		for (let i = 0; data && i < data.length; i++) {
			//Check if Deposite has ben done for the redeems user.
			if (await isDepositeCompleted(data[i]['onboardedUserId'])) {
				data[i]['isDeposited'] = 1;
				data[i]['status'] = 20;
				try {
					await models.gmsUserReferralTickets.update(data[i], {
						where: { id: data[i]['id'] },
					});
					console.log(`Referral ticket code has been active for user : ${data[i]['fkUserId']} And Referral User : ${data[i]['onboardedUserId']} `);
				}
				catch (error) {
					console.log("Error in gmsUserReferralTickets Update : ", error);
				}
			}
		}
	}
	catch (error) {
		console.log("Error in cron ID : 10031 ", error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

async function isDepositeCompleted(userId) {
	try {
		const query = `SELECT count(id) as cnt FROM gmsPaymentTransactionLogDeposit 
					WHERE fkReceiverId=${userId} AND requestType=10 AND payStatus=10 AND amount>0`;
		let data = await models.sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT,
		});
		return data && data[0]['cnt'] > 0 ? true : false;
	}
	catch (error) {
		console.log("Error in isDepositeCompleted() : ", error);
		return false;
	}
}

async function entryFeeRefundNotification(userId, userName, amount, gameTitle, notificationType) {
	//Send Push Notification
	const notification = {
		title: "Hey! You have a notification",
		body: `Hi ${userName},You have got the refund of ₹  ${amount} in ${gameTitle}. #GamesappForWin.`
	};
	const notificationData = {
		"notificationType": notificationType,
		"message": `Hi ${userName},You have got the refund of ₹  ${amount} in ${gameTitle}. #GamesappForWin.`,
	}
	console.log("Entry Fee Refund push notification : ", notificationData);
	await NotificationService.sendPushNotification(userId, notificationData, notification);
}

async function prizeWonNotification(userId, userName, amount, gameTitle, notificationType) {
	//Send Push Notification
	const notification = {
		title: "Hey! You have a notification",
		body: `Hi ${userName},You have won amount ₹  ${amount} in ${gameTitle}. #GamesappForWin.`
	};
	const notificationData = {
		"notificationType": notificationType,
		"message": `Hi ${userName},You have won amount ₹  ${amount} in ${gameTitle}. #GamesappForWin.`,
	}
	console.log("Prize Won Push Notification ", notificationData);
	await NotificationService.sendPushNotification(userId, notificationData, notification);
}

async function outwardRefundNotification(userId, userName, amount, notificationType) {
	//Send Push Notification
	const notification = {
		title: "Hey! You have a notification",
		body: `Hi ${userName},You have got the withdraw refund of ₹ ${amount} .`
	};
	const notificationData = {
		"notificationType": notificationType,
		"message": `Hi ${userName},You have got the withdraw refund of ₹ ${amount} .`
	}
	console.log("Withdraw Refund Push Notification ", notificationData);
	await NotificationService.sendPushNotification(userId, notificationData, notification);
}


//Notification to user for scratched the card (10032)
//Purpose : It will Check the coupan card which is not scratched in last 24 hr and send notification to user for scratch the card.
//This cron will execute at Interval of 12 hour
//Schidule Time : 0 */12 * * *
//Test Time (each minute): */1 * * * *

cron.schedule('0 */12 * * *', async function () {
	var cronId = 10032;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		//Get all the scratchcard card which is not scratch by user in last 24  hr.
		//gmsUserScratchCards
		const query = `SELECT fkUserId,u.userName 
						FROM gmsUserScratchCards usc
						LEFT JOIN gmsUsers u on u.id=usc.fkUserId
						WHERE usc.cardState=1 AND usc.createdAt < date_sub(Now() ,interval 24 HOUR)
						GROUP BY usc.fkUserId`;
		let data = await models.sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT,
		});
		for (let i = 0; data && i < data.length; i++) {
			const notification = {
				title: "Hey! You have a notification",
				body: `Hi ${data[i]['userName']},Only you can help. You have a Scratch Card scratching it's head how much money it has.`
			};
			const notificationData = {
				"notificationType": "SCRATCH_CARD_UNSCRATCHED",
				"message": `Hi ${data[i]['userName']},Only you can help. You have a Scratch Card scratching it's head how much money it has.`
			}
			//console.log("Scratch card Notification : ",notificationData);
			await NotificationService.sendPushNotification(data[i]['fkUserId'], notificationData, notification);
		}
	}
	catch (error) {
		console.log('DB Error Cron Id : ' + cronId + ' , ', error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});


//Random notification to user based on the user activity (10033)
//Purpose : It will check the user communication activity time and send the random notification to user.
//This cron will execute at Interval of 1 hr
//Schidule Time : 0 */1 * * *
//Test Time (each minute): */1 * * * *

cron.schedule('0 */1 * * *', async function () {
	var cronId = 10033;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : '+cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		//Get all the communication user active since last 24 Hr
		var date = new Date();
		const hour = date.getHours();
		const minutes = 0;
		const seconds = 0;
		const d = date.getDate();
		const month = date.getMonth()+1;
		const year = date.getFullYear();

		const communicationDate=((year < 10) ? '0' + year: year) +
							'-' +
							((month < 10) ? '0' + month: month) +
							'-' +
							((d < 10) ? '0' + d: d) +
							'T' + 
							((hour < 10) ? '0' + hour: hour) +
							':' +
							((minutes < 10) ? '0' + minutes: minutes) +
							':' +
							((seconds < 10) ? '0' + seconds: seconds);
							
		console.log("Selecting communication for Date : " , communicationDate);

		const query = `SELECT ucta.fkUserId,ucta.communicationTime,u.userName  
						FROM gmsUsersCommunicationTimeActivity ucta
						LEFT JOIN gmsUsers u on u.id=ucta.fkUserId
						WHERE ucta.status=1 AND communicationTime=date_sub('${communicationDate}' ,interval 24 HOUR)`;
		let data = await models.sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT,
		});

		let allUsers=data.map(items=>items.fkUserId);
		console.log("All Users : ",allUsers);

		var communicationTemplet=[{
			id:1,
			templet:`Hey <username>, Thought I should tell you that Yesterday you won ₹ <amount> 😁. #GamesappForWin.`
		},{
			id:2,
			templet:`Hey <username>, I'm here to tell you that people have won over ₹ <amount> till date 😱. #GamesappForWin`
		},{
			id:3,
			templet:`Hey <username>, Do you know that you have won ₹ <amount> till date 🤩. #GamesappForWin.`
		},{
			id:4,
			templet:`Hey <username>, #Fact - Gamesapp users withdraw in less than 5.6 seconds. Withdraw your winnings for Free.`
		},{
			id:5,
			templet:`Hey <username>, You have won ₹ <amount> in last 7 days 😀. #GamesappForWin.`
		}]

		if(allUsers && allUsers.length>0){
			const allUserTotalWinningAmtQuery = `SELECT SUM(amount) as totalWinningAmount
										FROM gmsPaymentTransactionLogWithdraw
										WHERE requestType=30 and payStatus=10`;
			const allUserTotalWinningAmt = await models.sequelize.query(allUserTotalWinningAmtQuery, {
				type: sequelize.QueryTypes.SELECT,
			});



			let winningAmount_Last_24_Hr=await getWinningAmount(allUsers,communicationDate,"Y");
			let winningAmount_Last_7_Day=await getWinningAmount(allUsers,communicationDate,"W");
			let winningAmount_Total=await getWinningAmount(allUsers);
			for(let i=0;data && i<data.length;i++)
			{
				let userName=data[i]['userName'];
				let userId=data[i]['fkUserId'];

				let yesterdayWinningAmt=winningAmount_Last_24_Hr.filter(function(el){
					return el.userId==userId;
				});
				console.log("Yesterday Winning Amount : ",yesterdayWinningAmt);

				let last_7Day_WinningAmt=winningAmount_Last_7_Day.filter(function(el){
					return el.userId==userId;
				});
				console.log("Last Seven Days Winning Amount : ",last_7Day_WinningAmt);

				let totalWinningAmt=winningAmount_Total.filter(function(el){
					return el.userId==userId;
				});
				console.log("total Winning Amount : ",totalWinningAmt);

				let availableCommunication=[2,4];
				if(yesterdayWinningAmt && yesterdayWinningAmt.length>0 && yesterdayWinningAmt[0]['winningAmount']>=10)
					availableCommunication.push(1);
				
				if(last_7Day_WinningAmt && last_7Day_WinningAmt.length>0 && last_7Day_WinningAmt[0]['winningAmount']>=50)
					availableCommunication.push(5);
			
				if(totalWinningAmt && totalWinningAmt.length>0 && totalWinningAmt[0]['winningAmount']>=100)
					availableCommunication.push(3);

				console.log("available Communication : ",availableCommunication);
				
				let randomSelectedCommunication=availableCommunication[Math.floor(Math.random() * availableCommunication.length)];

				let selectedCommunicationTemplet=communicationTemplet.filter(function(el){
					return el.id==randomSelectedCommunication;
				});

				console.log("Selected Communication Templet : ",selectedCommunicationTemplet);
				
				let amount;
				if(randomSelectedCommunication==1)
					amount=yesterdayWinningAmt[0]['winningAmount'];
				else if(randomSelectedCommunication==2)
					amount= +allUserTotalWinningAmt[0]['totalWinningAmount'];
				else if(randomSelectedCommunication==3)
					amount=totalWinningAmt[0]['winningAmount'];
				else if(randomSelectedCommunication==5)
					amount=last_7Day_WinningAmt[0]['winningAmount'];

				let body=selectedCommunicationTemplet[0]['templet'].replace("<username>",userName).replace("<amount>",amount);

				let notification = {
					title: "Hey! You have a notification",
					body:  body
				};
				let notificationData = {
					"notificationType": "USER_RAND_NOTI",
					"message": body
				}
				console.log("User Random Notification : ",notificationData);
				await NotificationService.sendPushNotification(userId, notificationData, notification);
				let sqlUpdate=`UPDATE gmsUsersCommunicationTimeActivity set status=0 where fkUserId=${userId} AND communicationTime=date_sub('${communicationDate}' ,interval 24 HOUR) `;
				let isUpdateSuccess = await models.sequelize.query(sqlUpdate, {
					type: sequelize.QueryTypes.UPDATE,
				});
			}
		}
		else{
			console.log("No user to send communication.");
		}
	} 
	catch (error) {
		console.log('DB Error Cron Id : ' + cronId + ' , ', error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

async function getWinningAmount(users,communicationDate=null,type=null)
{
	/*	Type ->	
			Y: Yesterday Winning amount ,
			W: Last Seven days Winning amount. ,
			null: Winning amount till now (All)
	*/
	let dateCond=``;
	if(type=="Y"){
		dateCond=` AND (createdAt>=date_sub('${communicationDate}' ,interval 24 HOUR) AND createdAt<'${communicationDate}')`
	}else if(type=="W"){
		//Calculate last seven days
		dateCond=` AND (createdAt>=date_sub('${communicationDate}' ,interval 7 DAY) AND createdAt<='${communicationDate}')`
	}
	else{
		dateCond=``;
	}

	const query=`SELECT fkReceiverId as userId, sum(amount) as winningAmount 
				FROM gmsPaymentTransactionLogWithdraw 
				where requestType=30 AND payStatus=10 AND fkReceiverId in (${users})
				${dateCond}
				GROUP BY fkReceiverId`;
	try{
		let data = await models.sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT,
		});
		return data;
	}
	catch(error){
		return false;
	}
}


//PayTM Disbursal Status Enquiry check for pending transaction (10034)
//Purpose : It will Check the transaction which is in pending status until it not get there final status either Failed Or Success.
//This cron will execute at Interval of 5 Min
//Schidule Time : */30 * * * *
//Test Time (10 Sec): */10 * * * * *

cron.schedule('*/30 * * * *', async function () {
	var cronId = 10034;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');
	try {
		//Get all withdraw pending transaction of PayTM
		
		const query = `SELECT *
						FROM gmsPaymentTransactionLogWithdraw w
						WHERE w.pg=2 AND w.requestType=10 AND w.payStatus=30`;
		let data = await models.sequelize.query(query, {
			type: sequelize.QueryTypes.SELECT,
		});
		if(!data || data.length<=0){
			console.log(`No PayTM withdraw pending transaction found . All transaction has been in there final status.`);
		}
		else{
			for (let i = 0; data && i < data.length; i++) {
				const tlId = data[i]['id'].toString();
				var RefundedCheck = await models.sequelize.query(
					"select count(*) as cnt from gmsPaymentTransactionLogWithdraw where requestType=60 and customerRefNum='" + tlId + "'",
					{ type: sequelize.QueryTypes.SELECT }
				);
				if (RefundedCheck && RefundedCheck[0]['cnt'] >= 1) {
					console.log(`Refund has been already done for PayTM Transaction Log ID  ` + tlId);
				} else {
					console.log('Checking Outward : ' + tlId);
					const orderId = data[i]['customerRefNum'];
					
					const userId = data[i]['fkSenderId'];
					const amount = data[i]['amount'];
					
					var paytmParams={};
					paytmParams['orderId']=orderId;
					var postData=JSON.stringify(paytmParams);
	
					const checkSum=await PaytmChecksum.generateSignature(postData, config.PAYTM_WITHDRAW.PAYTM_MERCHENT_KEY);
					const url=config.PAYTM_WITHDRAW.PAYTM_HOST+""+config.PAYTM_WITHDRAW.STATUS_PATH;
	
					var PayTMStatusEnqReq = {
						url: url,
						method: 'POST',
						headers: {
							'x-mid': config.PAYTM_WITHDRAW.PAYTM_MERCHENT_ID,
							'x-checksum': checkSum,
							'Content-Type': 'application/json',
							'Content-Length': postData.length
						},
						json: paytmParams,
					};
	
					await new Promise((resolve, reject) => {
						request(PayTMStatusEnqReq, async (err, resp, body) => {
							if (err) {
								console.log(err);
								reject(err);
							} else {
								var PayTMResponse = resp.body;
								if (PayTMResponse) {
									var TransactionLogWithdrawUpdate = {};
									
									if(PayTMResponse.result){
										TransactionLogWithdrawUpdate.pgRefNo = PayTMResponse.result.paytmOrderId;
										TransactionLogWithdrawUpdate.iblRefNo = PayTMResponse.result.rrn;
										TransactionLogWithdrawUpdate.apiMsg = data[i]['apiMsg'] + JSON.stringify(PayTMResponse);
									}
									
									const statusCode=PayTMResponse.statusCode;
									const status=PayTMResponse.status;
									
									// Note : Here we have six status (FAILURE, ACCEPTED, SUCCESS, CANCELLED, PENDING, and QUEUED)
									if(status=="SUCCESS")
										TransactionLogWithdrawUpdate.payStatus=10;
									else if(status=="FAILURE")
										TransactionLogWithdrawUpdate.payStatus=20;
									else //Pending
										TransactionLogWithdrawUpdate.payStatus=30;

									try {
										const update = await models.gmsPaymentTransactionLogWithdraw.update(
											TransactionLogWithdrawUpdate,
											{
												where: {
													id: tlId,
												},
											}
										);

										//If Transaction Failed Make it return to wallet
										if (
											update &&
											TransactionLogWithdrawUpdate.payStatus == 20
										) {
											console.log('Refunding Outward : ' + tlId);
											var insertTlData = {};
											insertTlData.fkSenderId = config.financialUser.PayTM;
											insertTlData.fkReceiverId = userId;
											insertTlData.amount = amount;
											insertTlData.senderClosingBalance = 0;
											insertTlData.receiverClosingBalance = 0;
											insertTlData.requestType = 60;
											insertTlData.payStatus = 10;
											insertTlData.pg = 2;
											insertTlData.pgRefNo = TransactionLogWithdrawUpdate.pgRefNo;
											insertTlData.customerRefNum = tlId;
											insertTlData.apiMsg = JSON.stringify(PayTMResponse);
											try {
												/*var PayTMWithdrawAc = await getUserAccount(
													insertTlData.fkSenderId,
													20
												);
												var userWithdrawAc = await getUserAccount(
													insertTlData.fkReceiverId,
													20
												);*/

												var PayTMWithdrawAc = await getUserAccountV1(
													insertTlData.fkSenderId,
													20
												);
												var userWithdrawAc = await getUserAccountV1(
													insertTlData.fkReceiverId,
													20
												);
	
												insertTlData.senderAcNum = PayTMWithdrawAc[0]['id'];
												insertTlData.receiverAcNum = userWithdrawAc[0]['id'];
	
												insertTL = await models.gmsPaymentTransactionLogWithdraw
													.build(insertTlData)
													.save();

												//Update Withdraw Balance.
												if (insertTL) {
													console.log(`Transaction log inserted successfully for PayTM refund. Log ID : ${tlId}`);
	
													const currentBalPayTMWithdraw =
														+PayTMWithdrawAc[0]['balance'] - +insertTlData.amount;

													// let updatePayTMWithdraw = await updateUserAccountBalance(
													// 	insertTlData.fkSenderId,
													// 	20,
													// 	currentBalPayTMWithdraw
													// );

													/*let updatePayTMWithdraw = await updateUserAccountBalanceV1(
														insertTlData.fkSenderId,
														20,
														currentBalPayTMWithdraw
													);*/

													let updatePayTMWithdraw = await updateUserAccountBalanceV2(
														insertTlData.fkSenderId,
														20,
														+insertTlData.amount,
														"dec"
													);
	
													if (updatePayTMWithdraw)
														console.log('PayTM Withdraw Balance Updated.');
													else
														console.log(
															'Unable to update PayTM withdraw balance !'
														);
	
													var currentBalUserWithdraw =
														+userWithdrawAc[0]['balance'] +
														+insertTlData.amount;
													// let updateUserWithdraw = await updateUserAccountBalance(
													// 	insertTlData.fkReceiverId,
													// 	20,
													// 	currentBalUserWithdraw
													// );
	
													/*let updateUserWithdraw = await updateUserAccountBalanceV1(
														insertTlData.fkReceiverId,
														20,
														currentBalUserWithdraw
													);*/

													let updateUserWithdraw = await updateUserAccountBalanceV2(
														insertTlData.fkReceiverId,
														20,
														+insertTlData.amount,
														"inc"
													);

													if (updateUserWithdraw) {
														console.log(`User ${userId} PayTM Withdraw Balance Updated successfully.`);
														//Send Push Notification
														let userName=await getUserNameById(userId);
														await outwardRefundNotification(userId,userName,amount,"WITHDRAW_REFUND")
													}
													else
														console.log(`Unable to update User ${userId} PayTM withdraw balance !!`);
												}
											} catch (error) {
												console.log('Unable to insert refund transaction log');
												console.log(error);
											}
										}
									} catch (error) {
										console.log(error);
									}
								} else {
									console.log('Unable To get PayTM disbursal status enquiry response');
								}
							}
							resolve(true);
						}); //End of request.
					}); //End Of Promise.
				}
			}
		}
		
	}
	catch (error) {
		console.log('DB Error Cron Id : ' + cronId + ' , ', error);
	}
	await lockUnlock(cronId, 1); //Un-Lock by setting status:1
});

//PayTM Auto addition of funds.(10035)
//Purpose : It will Check the balance and make payment from indusInd if minimum thrashhold riches.
//This cron will execute at Interval of 1 Hr
//Schidule Time : 0 */1 * * *
//Test Time (10 Sec): */10 * * * * *

cron.schedule('0 */1 * * *', async function () {
	var cronId = 10035;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	console.log('Cron : ' + cronId + ' is Executing !');

	var paytmParams={}; // No Parameter need to pass here.
	var postData=JSON.stringify(paytmParams);

	const checkSum=await PaytmChecksum.generateSignature(postData, config.PAYTM_WITHDRAW.PAYTM_MERCHENT_KEY);
	const url=config.PAYTM_WITHDRAW.PAYTM_HOST+""+config.PAYTM_WITHDRAW.ACC_LIST_PATH;

	var PayTMWalletListReq = {
		url: url,
		method: 'POST',
		headers: {
			'x-mid': config.PAYTM_WITHDRAW.PAYTM_MERCHENT_ID,
			'x-checksum': checkSum,
			'Content-Type': 'application/json',
			'Content-Length': postData.length
		},
		json: paytmParams,
	};
	try{
		await new Promise((resolve, reject) => {
			request(PayTMWalletListReq, async (err, resp, body) => {
				if (err) {
					console.log(err);
					reject(err);
				} 
				else {
					if(body && body.status=="SUCCESS"){
						var result=body.result;
						console.log("Result body : ",result);
						// Filter Main Wallet details (PAYOUT ACCOUNT).
						var payoutAc=result.filter(wallet=>{
							return wallet.subWalletGuid==config.PAYTM_WITHDRAW.PAYOUT_WALLET_GUID
						})
						console.log("PayOUT Account : ",payoutAc);
						if(payoutAc && payoutAc.length>0){
							var balance = payoutAc[0]['walletBalance'];
							const thrashHold=config.PAYTM_WITHDRAW.MIN_BAL_AMT;

							console.log(`Main wallet balance : ${balance}`);
							if(balance>thrashHold){
								//No Need to add fund.
								console.log(`No no need to add fund in main wallet , Min Thrashhold are : ${thrashHold} AND balance : ${balance}`);
							}
							else{
								// Check if already any transaction is in pending status.
								var PendingTrxData = await models.sequelize1.query(
									"select count(*) as cnt from gmsPaymentTransactionLogWithdraw where fkSenderId=400 AND requestType=10 and payStatus=30",
									{ type: sequelize.QueryTypes.SELECT });
								if(PendingTrxData && PendingTrxData[0]['cnt']>0){
									console.log("We can't initiate PayTM Fund because here is already a transaction which is in pending status ");
								}
								else{
									
									try{
										console.log(`Fund addition starting . , Min Thrashhold are : ${thrashHold} AND  Main wallet balance : ${balance}.`)
										await new Promise((resolve, reject) => {
											var PaymentWithdrawReq = {
												url: config.GamesAPP.API_HOST+config.GamesAPP.PAYMENT_WITHDRAW_PATH,
												method: 'POST',
												headers: {
													'Content-Type': 'application/json',
													'x-auth-key': config.GamesAPP.PAYTM_TOKEN,
												},
												json: {
													'amount':config.PAYTM_WITHDRAW.MIN_PAYOUT_AMT
												},
											};
											request(PaymentWithdrawReq, async (err, resp, body) => {
												if(err){
													console.log(err);
													reject(`Error in API Call cron id : ${cronId}`);
												}
												else{
													console.log(body);
													if(resp.body && resp.body.meta.error===false){
														console.log("Payment Successfull.");
														console.log("We recharged our PayTM main wallet.");
													}
													else{
														console.log("Payment Failed !!");
														console.log("We are unable to recharged our PayTM main wallet !!");
													}
													resolve(true);
												}
											});//End of payment request.
										});//End of inner promise.
										console.log("End of fund Addition.");	
									}//End of Inner Try Block .
									catch(error){
										console.log(`Error in cron id : ${cronId}`);
										console.log(error);
									}
								}
							}
						}
						else{
							console.log(`No Payout account available here .`);
						}

					}
					else{
						console.log(`Something went wrong in cron job : ${cronId}`);
						console.log("Body API Response ",body);
					}
					resolve(true);
				}
			});//End of request.
		});//End of Promise.
		await lockUnlock(cronId, 1); //UnLock by setting status:1
	}//End of try block.
	catch(error)
	{
		console.log(`Error in Cron Job : ${cronId}, Error : `,error);
		await lockUnlock(cronId, 1); //UnLock by setting status:1
	}
});

//Call Procedure to take old data backup (10036)
//Purpose : It wiil backup old data of some tables.
//This cron will execute daily in night 00:00
//Schidule Time : 0 0 */1 * *
//Test Time (10 Sec): */10 * * * * *

cron.schedule('0 0 */1 * *', async function () {
	var cronId = 10036;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	
	try{
		await models.sequelize.query(`CALL gmsTableGameInitTxnCopy()`);
		await models.sequelize.query(`CALL gmsTableGameEndTxnCopy()`);
		await models.sequelize.query(`CALL gmsOtpCopy()`);
		await lockUnlock(cronId, 1); //UnLock by setting status:1
	}//End of try block.
	catch(error)
	{
		console.log(`Error in Cron Job : ${cronId}, Error : `,error);
		await lockUnlock(cronId, 1); //UnLock by setting status:1
	}
});


//Update live player count for Table format game.
//Purpose : Display how many player playing the game live
//This cron will execute interval of 1 min
//Schidule Time : */1 * * * *
//Test Time (10 Sec): */10 * * * * *

cron.schedule('*/1 * * * *', async function () {
	var cronId = 10037;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	
	try{
		
		let update = await models.sequelize.query(
			'update gmsTableType set totalActivePlayer=0 ',
			{ type: sequelize.QueryTypes.UPDATE }
		);
		
		let tableTypeList=await models.sequelize.query(
			'SELECT * from gmsTableType ',
			{ type: sequelize.QueryTypes.SELECT }
		);

		let activeTableTxn = await models.sequelize.query(
			'SELECT * from gmsTableGameInitTrx t1 WHERE t1.gameTxnId not in (SELECT t2.gameTxnId from gmsTableGameEndTrx t2 )',
			{ type: sequelize.QueryTypes.SELECT }
		);

		

		for(let i=0;i<activeTableTxn.length;i++){

			let reqLog=JSON.parse(activeTableTxn[i]['reqLog']);
			let index=-1;
			let data=tableTypeList.filter(function(el,col){
				 if(reqLog['gameTypeId']==el.id){
					index=col;
					return;
				 }
			});
			if(index>=0){
				tableTypeList[index]['totalActivePlayer']=tableTypeList[index]['totalActivePlayer']+1;
			}
		}

		update = await models.sequelize.query(
			'update gmsTableType set totalActivePlayer=0 ',
			{ type: sequelize.QueryTypes.UPDATE }
		);


		for(let i=0;i<tableTypeList.length;i++){
			if(tableTypeList[i]['totalActivePlayer']>0){
				let update = await models.sequelize.query(
					`update gmsTableType set totalActivePlayer=${tableTypeList[i]['totalActivePlayer']} WHERE id=${tableTypeList[i]['id']}`,
					{ type: sequelize.QueryTypes.UPDATE }
				);		
			}
		}
		
		await lockUnlock(cronId, 1); //UnLock by setting status:1
	}//End of try block.
	catch(error)
	{
		console.log(`Error in Cron Job ${cronId}: , Error : `,error);
		await lockUnlock(cronId, 1); //UnLock by setting status:1
	}
});


//Check if any player stuck in Table format game.
//Purpose : Send mail if any player stuck in table game init txn.
//This cron will execute daily at 8 AM
//Schidule Time : 3 1 * * *
//Test Time (10 Sec): */10 * * * * *

cron.schedule('3 1 * * *', async function () {
	var cronId = 10038;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	
	try{	
		let stuckTableTxn = await models.sequelize.query(`SELECT * from gmsTableGameInitTrx t1 WHERE 
			t1.gameTxnId not in (SELECT t2.gameTxnId from gmsTableGameEndTrx t2 ) AND t1.createdAt < date_sub(Now() ,interval 30 Minute)`,
			{ type: sequelize.QueryTypes.SELECT }
		);

		if(stuckTableTxn && stuckTableTxn.length > 0){
			let playerId=[];
			for(let i=0;i<stuckTableTxn.length;i++){
				playerId.push(stuckTableTxn[i]['fkUserId']);
			}	

			let subject= "Stuck Table Game ";
			let body="<p>Hi Geeks,</p>" + "<p>Following users are stuck in table game !! </p>" +
			"<i>Player Ids:</i> <b>" + playerId + "</b><br /><br />" +
			'<b>Thanks & Regards</b><br/>Team Backend (GamesApp)';

			await sendMail(
				config.serverMailAlerts,
				subject,
				body,
				true
			);
		}
		else{
			console.log("No player are stuck .")
		}
		await lockUnlock(cronId, 1); //UnLock by setting status:1
	}//End of try block.
	catch(error)
	{
		console.log(`Error in Cron Job ${cronId}: , Error : `,error);
		await lockUnlock(cronId, 1); //UnLock by setting status:1
	}
});

//For special purpose Script
//Purpose : This Cron Used to acomplished multiple purpose To run on time Script 
//This cron will execute Only Once when any new one time task need
//Schidule Time :
//Test Time (10 Sec): */10 * * * * *

cron.schedule('*/20 * * * *', async function () {
	var cronId = 10039;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	try{	
		let depositLog = await models.sequelize.query(
			`SELECT id,payStatus,description,amount
			FROM gmsPaymentTransactionLogDeposit d
			WHERE d.requestType=10 AND d.createdAt < Now() AND description is null`,
			{ type: sequelize.QueryTypes.SELECT }
		);
			
		for(let i=0;depositLog && i < depositLog.length ; i++){
			let updateDepositLogDescriptionData={};
			updateDepositLogDescriptionData['description']= await preparedDescription("DEPOSIT",depositLog[i]['payStatus'],depositLog[i]['amount']);
			updateDepositLogDescriptionData['apiMsg']=depositLog[i]['apiMsg'] + "{'type':'descriptionLogAdded'}";
			await updateTransactionDepositLog(updateDepositLogDescriptionData,{id:depositLog[i]['id']});
		}

		let withdrawLog = await models.sequelize.query(
			`SELECT id,payStatus,description,amount,fkSenderId,apiMsg
			FROM gmsPaymentTransactionLogWithdraw 
			WHERE requestType=10 AND createdAt < Now() AND description is null`,
			{ type: sequelize.QueryTypes.SELECT }
		);

		for(let i=0;withdrawLog && i < withdrawLog.length ; i++){
			let updateWithdrawLogDescriptionData={};
			updateWithdrawLogDescriptionData['description']= await preparedDescription("WITHDRAW",withdrawLog[i]['payStatus'],withdrawLog[i]['amount'],{userId:withdrawLog[i]['fkSenderId']});
			updateWithdrawLogDescriptionData['apiMsg']=withdrawLog[i]['apiMsg'] + "{'type':'descriptionLogAdded'}";

			if(updateWithdrawLogDescriptionData['description']){
				await updateTransactionWithdrawLog(updateWithdrawLogDescriptionData, { id:withdrawLog[i]['id'] })
			}	
			else{
				console.log("We are unable to log description for id : ", withdrawLog[i]['id']);
			}
		}

		
	}//End of try block.
	catch(error)
	{
		console.log(`Error in Cron Job ${cronId}: , Error : `,error);
		//await lockUnlock(cronId, 1); //UnLock by setting status:1
	}
});
async function updateUserGamePlayMatrix1(userId,gameId,result,count){

	let userExistingMatrix=await models.gmsUsers.findAll({
		attributes: ["gameMatrix"],
		where: { id: userId }
	});

	if(userExistingMatrix && userExistingMatrix.length > 0){
		
		let {gameMatrix,totalWins} = userExistingMatrix[0];
		gameMatrix= !gameMatrix ? [] : JSON.parse(gameMatrix);
		
		const gameDataIndex = gameMatrix.findIndex(object => {
			return object.gameId == gameId;
		});
	
		//Case - 1 : If user already play the game
		if(gameDataIndex >=0){
			if(result==1){
				gameMatrix[gameDataIndex]['play'] = gameMatrix[gameDataIndex]['play'] + count;
			}
			else if(result==2){
				gameMatrix[gameDataIndex]['win'] = gameMatrix[gameDataIndex]['win'] + count;
			}
			else if(result==3){
				gameMatrix[gameDataIndex]['lose'] = gameMatrix[gameDataIndex]['lose'] + count;
			}
			else if(result==4){
				gameMatrix[gameDataIndex]['draw'] = gameMatrix[gameDataIndex]['draw'] + count;
			}
		}
		//Case - 2 : If user play the game for first time
		else{
			let preparedData={};
			preparedData.gameId=gameId;
			if(result==1){
				preparedData['play'] = count;
				preparedData.win=0;
				preparedData.lose=0;
				preparedData.draw=0;
	
			}
			else if(result==2){
				preparedData.play = 0
				preparedData.win=count;
				preparedData.lose=0;
				preparedData.draw=0;
			}
			else if(result==3){
				preparedData.play = 0
				preparedData.win=0;
				preparedData.lose=count;
				preparedData.draw=0;
			}
			else if(result==4){
				preparedData.play = 0
				preparedData.win=0;
				preparedData.lose=0;
				preparedData.draw=count;
			}
			gameMatrix.push(preparedData);
		}//End of Case 2 Else block

		
		let updatedData = {};
		updatedData['gameMatrix'] = JSON.stringify(gameMatrix);
		try{
			let updateData = await models.gmsUsers.update(updatedData, {
				where: {id:userId}
			});
		}
		catch(error){
			console.log("DB Error in (updateUserGamePlayMatrix)1")
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

//Cash free deposit check if any disputes there then settlement.
//Purpose : If any txn processed success but in our end if this is either faioled or pending then process it as success.
//This cron will execute interval of 5 min.
//Schidule Time : */5 * * * *
//Test Time (10 Sec): */20 * * * * *



cron.schedule('*/2 * * * *', async function () {
	var cronId = 10040;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	
	try{	
		let depositLog = await models.sequelize.query(`SELECT id, fkSenderId, pgRefNo, bankRefNo, amount, payStatus,apiMsg, extra,createdAt,description, utrNo from gmsPaymentTransactionLogDeposit d WHERE 
			d.requestType=10 and d.payStatus in (20,30) AND date_sub(Now() ,interval 8 Minute) < d.createdAt AND createdAt < date_sub(Now() ,interval 2 Minute)`,
			{ type: sequelize.QueryTypes.SELECT }
		);

		

		// let depositLog = await models.sequelize.query(`SELECT id, fkSenderId, pgRefNo, amount, payStatus,apiMsg, extra,createdAt from gmsPaymentTransactionLogDeposit d WHERE 
		// 	d.requestType=10 and d.payStatus in (30) AND d.fkSenderId=802 AND fkreceiverId=100043  limit 1`,
		// 	{ type: sequelize.QueryTypes.SELECT }
		// );
		// console.log(depositLog);

		for(let i=0; i<depositLog.length; i++){
			let pgRefNo = depositLog[i]['pgRefNo'];
			let tlId=depositLog[i]['id'];
			let paymentTLD=depositLog[i];
			let txnTime=new Date(paymentTLD['createdAt']).getTime();
			delete paymentTLD['createdAt'];
			
			if(paymentTLD['fkSenderId']==config.financialUser.CASHFREE){
				let cashFreeStatus = {
					"url": `${config.CASHFREE.STATUS_API}${pgRefNo}`,
					"method": 'GET',
					"headers": {
						"content-type": "application/json",
						"x-client-id": config.CASHFREE['x-client-id'],
						"x-client-secret": config.CASHFREE['x-client-secret'],
						"x-api-version": config.CASHFREE['x-api-version'],
						"x-request-id":config.CASHFREE['x-request-id'],
					}
				}
				try{
					let statusPromis=await new Promise((resolve, reject) => {
						request(cashFreeStatus, async (err, resp, body) => {
							if (err) {
								console.log("Error in Cashfree trx Status Enquiry");
								console.log(err); reject(err);
							}
							else {
								
								body=JSON.parse(body);
		
								if(body['cf_order_id']){
									let txnStatus=body['order_status'];
									if(txnStatus=='ACTIVE' || txnStatus=='PAID' || txnStatus=='EXPIRED'){
										const amount = + parseFloat(body['order_amount']).toFixed(2);
										const orderId = body['order_id'];
		
										if (txnStatus=='PAID' && amount == paymentTLD['amount'] && orderId == paymentTLD['pgRefNo']) {
											// success 
											console.log(`CashFree Txn ${pgRefNo} exist in our system. We can process it.`);
											
											let options = {
												url: `${config.DEPOSIT_TXN_UPDATE_API}?txnId=${orderId}`,
												method: "GET",
												headers:{
													"x-auth-key":config.DEPOSIT_TXN_UPDATE_API_TOKEN
												},
												json: true,
												timeout: 5000
											};
	
											await new Promise((resolve, reject) => {
												request(options,
													async (err, resp, body) => {
														if (err) {
															console.log(err);
														}
														else{
															if(body['meta']['error']){
																console.log(`Txn was unable to process : ${pgRefNo}`);
															}
															else{
																console.log(`Txn process successfully : ${pgRefNo}`);
															}
															console.log(JSON.stringify(body));
														}
													});
													resolve(true);
											});
										} else if(txnStatus=='EXPIRED'){
											// failed 
											console.log("Cashfree txn has been expired ", body);
											paymentTLD.payStatus = 20;
											paymentTLD.apiMsg = paymentTLD['apiMsg'] + "--->>"+JSON.stringify(body);
											const update = await updateTransactionDepositLog(paymentTLD, { id:tlId });
											if(!update){
												console.log("Cashfree Expired status unable to update in DB : ");
											}
										}
										else if(txnStatus=='ACTIVE'){
											// failed 
											let currentTime=new Date().getTime() + 1000 * 60 * 330;
											let timeDiff=(currentTime - txnTime)/(1000*60);
	
											console.log("Current Time : ",new Date(currentTime));
											console.log("Txn Time : ",new Date(txnTime));
											console.log("Time Diff",timeDiff);
											paymentTLD.payStatus = timeDiff < 15 ? 30:20;
											console.log("Cashfree txn Is Active Now ", body);
											paymentTLD.apiMsg = JSON.stringify(paymentTLD['apiMsg'])+"--->>"+JSON.stringify(body);
											const update = await updateTransactionDepositLog(paymentTLD, { id:tlId });
											if(!update){
												console.log("Cashfree active status unable to update in DB : ");
											}
										}
									}
									else{
										console.log("Cashfree Invalid txn status", body);
										paymentTLD.payStatus = 20; 	//Failed
										paymentTLD.apiMsg = JSON.stringify(paymentTLD['apiMsg'])+"--->>"+JSON.stringify(body);
										
										const update = await updateTransactionDepositLog(paymentTLD, { id:tldId});
										if(!update){
											console.log("Cashfree invalid txn status unable to update DB ");
										}
									}
								}
								else{
									console.log("Txn Verification API Failed Response : ",JSON.stringify(body));
								}
								resolve(true);
							}
						});//End of request 
					}); //End of promis  
				}
				catch(error){
					console.log("Error Txn Status ");
					console.log(error);
				}
			}
			if(paymentTLD['fkSenderId']==config.financialUser.PHONEPE){
				let PhonePeStatusURL=config.PHONE_PE.STATUS_API;
				let MID=config.PHONE_PE.MID;
				let SaltKey=config.PHONE_PE.KEY;
				let index=config.PHONE_PE.INDEX;

				PhonePeStatusURL=PhonePeStatusURL.replace("{{merchantTransactionId}}",pgRefNo);
				PhonePeStatusURL=PhonePeStatusURL.replace("{{merchantId}}",MID);

				console.log("Status API URL : ",PhonePeStatusURL);

				let checkSum=config.PHONE_PE.STATUS_CHECKSUM;
				checkSum=checkSum.replace("{{merchantTransactionId}}",pgRefNo);
				checkSum=checkSum.replace("{{merchantId}}",MID);
				checkSum=checkSum.replace("{{saltKey}}",SaltKey);
		
				let xVerify = crypto.createHash('sha256').update(checkSum).digest('hex')+"###"+index;

				console.log(`PhonePe Checksum : ${checkSum}`);
				console.log(`PhonePe X-Verify : ${xVerify}`);

				var phonePeStatusAPI = {
					"url": PhonePeStatusURL,
					"method": 'GET',
					"headers": {
						"accept": "application/json",
						"Content-Type":"application/json",
						"X-VERIFY": xVerify,
						"X-MERCHANT-ID":MID
					}
				}
				try{
					let statusPromis=await new Promise((resolve, reject) => {
						request(phonePeStatusAPI, async (err, resp, body) => {
							if (err) {
								console.log("Error in PhonePe trx Status Enquiry");
								console.log(err); reject(err);
							}
							else {
								body=JSON.parse(body);
								console.log(body);
								if(body['success']){
									let txnStatus=body['code'];
									if(txnStatus=='PAYMENT_SUCCESS' || txnStatus=='PAYMENT_PENDING'){
										const amount = + parseFloat(body['data']['amount']/100).toFixed(2);
										const orderId = body['data'][config.PHONE_PE['MERCHENT_TXN_ID']];
										const bankRefNo=body['data'][config.PHONE_PE['PHONE_PE_TXN_ID']];
										if (txnStatus=='PAYMENT_SUCCESS' && amount == paymentTLD['amount'] && orderId == paymentTLD['pgRefNo']) {
											// success 
											console.log(`PhonePe Txn ${pgRefNo} exist in our system. We can process it.`);

											paymentTLD.bankRefNo=bankRefNo;
											paymentTLD.apiMsg = paymentTLD['apiMsg'] + "--->>" + JSON.stringify(body);
											paymentTLD.utrNo=bankRefNo;
											paymentTLD.description= await preparedDescription("DEPOSIT",10,amount);    
											const update = await updateTransactionDepositLog(paymentTLD, { id:tlId });


											let options = {
												url: `${config.DEPOSIT_TXN_UPDATE_API}?txnId=${orderId}`,
												method: "GET",
												headers:{
													"x-auth-key":config.DEPOSIT_TXN_UPDATE_API_TOKEN
												},
												json: true,
												timeout: 5000
											};
	
											await new Promise((resolve, reject) => {
												request(options,
													async (err, resp, body) => {
														if (err) {
															console.log(err);
														}
														else{
															if(body['meta']['error']){
																console.log(`Txn was unable to process : ${pgRefNo}`);
															}
															else{

																console.log(`Txn process successfully : ${pgRefNo}`);
															}
															console.log(JSON.stringify(body));
														}
													});
													resolve(true);
											});
										} 
										else if(txnStatus=='PAYMENT_PENDING'){
											// Pending
											let currentTime=new Date().getTime() + 1000 * 60 * 330;
											let timeDiff=(currentTime - txnTime)/(1000*60);
	
											console.log("Current Time : ",new Date(currentTime));
											console.log("Txn Time : ",new Date(txnTime));
											console.log("Time Diff",timeDiff);

											paymentTLD.payStatus = timeDiff < 5 ? 30:20;

											if(paymentTLD.payStatus==20){
												paymentTLD.description = await preparedDescription("DEPOSIT",20,amount)
											}
											console.log("PhonePe txn Is Active Now ", body);
											paymentTLD.apiMsg = paymentTLD['apiMsg'] + "--->>" + JSON.stringify(body);
											const update = await updateTransactionDepositLog(paymentTLD, { id:tlId });
											if(!update){
												console.log("PhonePe active status unable to update in DB : ");
											}
										}
									}
									else{
										console.log(`PhonePe txn ${pgRefNo} has been failed now`);
										paymentTLD.payStatus = 20; 	//Failed
										paymentTLD.apiMsg = paymentTLD['apiMsg'] + "--->>" + JSON.stringify(body);
										paymentTLD.description = await preparedDescription("DEPOSIT",20,amount)
										const update = await updateTransactionDepositLog(paymentTLD, { id:tlId});
										if(!update){
											console.log(`PhonePe failed txn ${pgRefNo} status unable to update DB `);
										}
									}
								}
								else{
									console.log("PhonePe Txn Verification API Failed Response : ",JSON.stringify(body));
									paymentTLD.payStatus = 20; 	//Failed
									paymentTLD.apiMsg = paymentTLD['apiMsg'] + "--->>" + JSON.stringify(body);
									paymentTLD.description = await preparedDescription("DEPOSIT",20,paymentTLD['amount'])
									const update = await updateTransactionDepositLog(paymentTLD, { id:tlId});
									if(!update){
										console.log(`PhonePe failed txn ${pgRefNo} status unable to update DB `);
									}
								}
								resolve(true);
							}
						});//End of request 
					}); //End of promis  
				}
				catch(error){
					console.log("Error Txn Status ");
					console.log(error);
				}
			}
			if(paymentTLD['fkSenderId']==config.financialUser.SABPAISA){

				console.log("Sab Paisa Block ");
				let SabPaisaStatusURL=config.SABPAISA.STATUS_API;
				let cliendCode=config.SABPAISA.CLIEND_CODE;

				console.log(`SabPaisa To encrypt : clientCode=${cliendCode}&clientTxnId=${pgRefNo}`);
				let encReqData=await encryptSabPaisa(config.SABPAISA.AUTH_KEY,config.SABPAISA.IV,`clientCode=${cliendCode}&clientTxnId=${pgRefNo}`);

				let reqBodyData={};
				reqBodyData.clientCode=cliendCode;
				reqBodyData.statusTransEncData=encReqData;

				var SabPaisaStatusAPI = {
					"url": SabPaisaStatusURL,
					"method": 'POST',
					"headers": {
						"accept": "application/json",
						"Content-Type":"application/json"
					},
					"json":reqBodyData
				}

				try{
					let statusPromis=await new Promise((resolve, reject) => {
						request(SabPaisaStatusAPI, async (err, resp, body) => {
							if (err) {
								console.log("Error in SabPaisa trx Status Enquiry");
								console.log(err);
								reject(err);
							}
							else {
								console.log("Status body data before decrypt");
                                console.log(body);
                                let decResData=await decryptSabPaisa(config.SABPAISA.AUTH_KEY,config.SABPAISA.IV,body['statusResponseData']);
                                let bodyData=decResData.split("&");
                                let prepareData = {};
                                for(let i=0;bodyData && i<bodyData.length;i++){
                                    let indexData=bodyData[i].split("=");
                                    if(indexData && indexData.length==2)
                                        prepareData[indexData[0]]=indexData[1]
                                }
                                body=prepareData;
                                console.log("Status body data after decrypt");
                                console.log(body);
								

								if(body['status']){
									let txnStatus=body['statusCode'];
									if(txnStatus=='0000' || txnStatus=='0100' || txnStatus=='0200' || txnStatus=='0300' || txnStatus=='0999'){
										const amount = + parseFloat(body['amount']).toFixed(2);
										const orderId = body['clientTxnId'];
		
										if (txnStatus=='0000' && amount == paymentTLD['amount'] && orderId == paymentTLD['pgRefNo']) {
											// success 
											console.log(`SabPaisa Txn ${pgRefNo} exist in our system. We can process it.`);
											let options = {
												url: `${config.DEPOSIT_TXN_UPDATE_API}?txnId=${orderId}`,
												method: "GET",
												headers:{
													"x-auth-key":config.DEPOSIT_TXN_UPDATE_API_TOKEN
												},
												json: true,
												timeout: 5000
											};
	
											await new Promise((resolve, reject) => {
												request(options,
													async (err, resp, body) => {
														if (err) {
															console.log(err);
														}
														else{
															if(body['meta']['error']){
																console.log(`Txn was unable to process : ${pgRefNo}`);
															}
															else{
																console.log(`Txn process successfully : ${pgRefNo}`);
															}
															console.log(JSON.stringify(body));
														}
													});
													resolve(true);
											});
										} else if(txnStatus=='0200' || txnStatus=='0300'){
											// failed 
											console.log("SabPaisa Txn has been failed");
											console.log(body);

											paymentTLD.payStatus = 20;
											paymentTLD.apiMsg = JSON.stringify(paymentTLD['apiMsg'])+"--->>"+JSON.stringify(body);
											const update = await updateTransactionDepositLog(paymentTLD, { id:tlId });
											if(!update){
												console.log("Sabpaisa txn failed status unable to update in DB : ");
											}
										}
										else if(txnStatus=='0100'){
											// failed 
											let currentTime=new Date().getTime() + 1000 * 60 * 330;
											let timeDiff=(currentTime - txnTime)/(1000*60);
	
											console.log("Current Time : ",new Date(currentTime));
											console.log("Txn Time : ",new Date(txnTime));
											console.log("Time Diff",timeDiff);
											paymentTLD.payStatus = timeDiff < 15 ? 30:20;
											console.log("SabPaisa txn Is Active Now ", body);
											paymentTLD.apiMsg = JSON.stringify(paymentTLD['apiMsg'])+"--->>"+JSON.stringify(body);
											const update = await updateTransactionDepositLog(paymentTLD, { id:tlId });
											if(!update){
												console.log("SabPaisa active status unable to update in DB : ");
											}
										}
									}
									else{
										console.log("SabPaisa Invalid txn status : ", body);
										paymentTLD.payStatus = 20; 	//Failed
										paymentTLD.apiMsg = JSON.stringify(paymentTLD['apiMsg'])+"--->>"+JSON.stringify(body);
										
										const update = await updateTransactionDepositLog(paymentTLD, { id:tldId});
										if(!update){
											console.log("SabPaisa invalid txn status unable to update DB ");
										}
									}
								}
								else{
									console.log("SabPaisa Txn Verification API Failed Response : ",JSON.stringify(body));
								}
								resolve(true);
							}
						});//End of request 
					}); //End of promis  
				}
				catch(error){
					console.log("Error Txn Status ");
					console.log(error);
				}
			}
		}//End of for loop.
		await lockUnlock(cronId, 1); //UnLock by setting status:1
	}//End of try block.
	catch(error)
	{
		console.log(`Error in Cron Job ${cronId}: , Error : `,error);
		await lockUnlock(cronId, 1); //UnLock by setting status:1
	}
});

cron.schedule('*/30 * * * *', async function () {
	var cronId = 10041;
	var cron = await getCronByID(cronId);
	if (!cron || cron.length == 0 || cron[0]['status'] == 0 || cron[0]['status'] == 2) {
		console.log('Cron : ' + cronId + ' is InActive/Closed , Status : ' + cron[0]['status']);
		return true;
	} else {
		await lockUnlock(cronId, 0); //Lock by setting status:0
	}
	
	try{	
		let depositLog = await models.sequelize.query(`SELECT id, fkSenderId, pgRefNo, bankRefNo, amount, payStatus,apiMsg, extra,createdAt,description, utrNo from gmsPaymentTransactionLogDeposit d WHERE 
			d.requestType=10 and d.payStatus in (20,30) AND date_sub(Now() ,interval 8 Minute) < d.createdAt AND createdAt < date_sub(Now() ,interval 2 Minute)`,
			{ type: sequelize.QueryTypes.SELECT }
		);

		

		// let depositLog = await models.sequelize.query(`SELECT id, fkSenderId, pgRefNo, amount, payStatus,apiMsg, extra,createdAt from gmsPaymentTransactionLogDeposit d WHERE 
		// 	d.requestType=10 and d.payStatus in (30) AND d.fkSenderId=802 AND fkreceiverId=100043  limit 1`,
		// 	{ type: sequelize.QueryTypes.SELECT }
		// );
		// console.log(depositLog);

		for(let i=0; i<depositLog.length; i++){
			let pgRefNo = depositLog[i]['pgRefNo'];
			let tlId=depositLog[i]['id'];
			let paymentTLD=depositLog[i];
			let txnTime=new Date(paymentTLD['createdAt']).getTime();
			delete paymentTLD['createdAt'];
			
			if(paymentTLD['fkSenderId']==config.financialUser.CASHFREE){
				let cashFreeStatus = {
					"url": `${config.CASHFREE.STATUS_API}${pgRefNo}`,
					"method": 'GET',
					"headers": {
						"content-type": "application/json",
						"x-client-id": config.CASHFREE['x-client-id'],
						"x-client-secret": config.CASHFREE['x-client-secret'],
						"x-api-version": config.CASHFREE['x-api-version'],
						"x-request-id":config.CASHFREE['x-request-id'],
					}
				}
				try{
					let statusPromis=await new Promise((resolve, reject) => {
						request(cashFreeStatus, async (err, resp, body) => {
							if (err) {
								console.log("Error in Cashfree trx Status Enquiry");
								console.log(err); reject(err);
							}
							else {
								
								body=JSON.parse(body);
		
								if(body['cf_order_id']){
									let txnStatus=body['order_status'];
									if(txnStatus=='ACTIVE' || txnStatus=='PAID' || txnStatus=='EXPIRED'){
										const amount = + parseFloat(body['order_amount']).toFixed(2);
										const orderId = body['order_id'];
		
										if (txnStatus=='PAID' && amount == paymentTLD['amount'] && orderId == paymentTLD['pgRefNo']) {
											// success 
											console.log(`CashFree Txn ${pgRefNo} exist in our system. We can process it.`);
											
											let options = {
												url: `${config.DEPOSIT_TXN_UPDATE_API}?txnId=${orderId}`,
												method: "GET",
												headers:{
													"x-auth-key":config.DEPOSIT_TXN_UPDATE_API_TOKEN
												},
												json: true,
												timeout: 5000
											};
	
											await new Promise((resolve, reject) => {
												request(options,
													async (err, resp, body) => {
														if (err) {
															console.log(err);
														}
														else{
															if(body['meta']['error']){
																console.log(`Txn was unable to process : ${pgRefNo}`);
															}
															else{
																console.log(`Txn process successfully : ${pgRefNo}`);
															}
															console.log(JSON.stringify(body));
														}
													});
													resolve(true);
											});
										} else if(txnStatus=='EXPIRED'){
											// failed 
											console.log("Cashfree txn has been expired ", body);
											paymentTLD.payStatus = 20;
											paymentTLD.apiMsg = paymentTLD['apiMsg'] + "--->>"+JSON.stringify(body);
											const update = await updateTransactionDepositLog(paymentTLD, { id:tlId });
											if(!update){
												console.log("Cashfree Expired status unable to update in DB : ");
											}
										}
										else if(txnStatus=='ACTIVE'){
											// failed 
											let currentTime=new Date().getTime() + 1000 * 60 * 330;
											let timeDiff=(currentTime - txnTime)/(1000*60);
	
											console.log("Current Time : ",new Date(currentTime));
											console.log("Txn Time : ",new Date(txnTime));
											console.log("Time Diff",timeDiff);
											paymentTLD.payStatus = timeDiff < 15 ? 30:20;
											console.log("Cashfree txn Is Active Now ", body);
											paymentTLD.apiMsg = JSON.stringify(paymentTLD['apiMsg'])+"--->>"+JSON.stringify(body);
											const update = await updateTransactionDepositLog(paymentTLD, { id:tlId });
											if(!update){
												console.log("Cashfree active status unable to update in DB : ");
											}
										}
									}
									else{
										console.log("Cashfree Invalid txn status", body);
										paymentTLD.payStatus = 20; 	//Failed
										paymentTLD.apiMsg = JSON.stringify(paymentTLD['apiMsg'])+"--->>"+JSON.stringify(body);
										
										const update = await updateTransactionDepositLog(paymentTLD, { id:tldId});
										if(!update){
											console.log("Cashfree invalid txn status unable to update DB ");
										}
									}
								}
								else{
									console.log("Txn Verification API Failed Response : ",JSON.stringify(body));
								}
								resolve(true);
							}
						});//End of request 
					}); //End of promis  
				}
				catch(error){
					console.log("Error Txn Status ");
					console.log(error);
				}
			}
			if(paymentTLD['fkSenderId']==config.financialUser.PHONEPE){
				let PhonePeStatusURL=config.PHONE_PE.STATUS_API;
				let MID=config.PHONE_PE.MID;
				let SaltKey=config.PHONE_PE.KEY;
				let index=config.PHONE_PE.INDEX;

				PhonePeStatusURL=PhonePeStatusURL.replace("{{merchantTransactionId}}",pgRefNo);
				PhonePeStatusURL=PhonePeStatusURL.replace("{{merchantId}}",MID);

				console.log("Status API URL : ",PhonePeStatusURL);

				let checkSum=config.PHONE_PE.STATUS_CHECKSUM;
				checkSum=checkSum.replace("{{merchantTransactionId}}",pgRefNo);
				checkSum=checkSum.replace("{{merchantId}}",MID);
				checkSum=checkSum.replace("{{saltKey}}",SaltKey);
		
				let xVerify = crypto.createHash('sha256').update(checkSum).digest('hex')+"###"+index;

				console.log(`PhonePe Checksum : ${checkSum}`);
				console.log(`PhonePe X-Verify : ${xVerify}`);

				var phonePeStatusAPI = {
					"url": PhonePeStatusURL,
					"method": 'GET',
					"headers": {
						"accept": "application/json",
						"Content-Type":"application/json",
						"X-VERIFY": xVerify,
						"X-MERCHANT-ID":MID
					}
				}
				try{
					let statusPromis=await new Promise((resolve, reject) => {
						request(phonePeStatusAPI, async (err, resp, body) => {
							if (err) {
								console.log("Error in PhonePe trx Status Enquiry");
								console.log(err); reject(err);
							}
							else {
								body=JSON.parse(body);
								console.log(body);
								if(body['success']){
									let txnStatus=body['code'];
									if(txnStatus=='PAYMENT_SUCCESS' || txnStatus=='PAYMENT_PENDING'){
										const amount = + parseFloat(body['data']['amount']/100).toFixed(2);
										const orderId = body['data'][config.PHONE_PE['MERCHENT_TXN_ID']];
										const bankRefNo=body['data'][config.PHONE_PE['PHONE_PE_TXN_ID']];
										if (txnStatus=='PAYMENT_SUCCESS' && amount == paymentTLD['amount'] && orderId == paymentTLD['pgRefNo']) {
											// success 
											console.log(`PhonePe Txn ${pgRefNo} exist in our system. We can process it.`);

											paymentTLD.bankRefNo=bankRefNo;
											paymentTLD.apiMsg = paymentTLD['apiMsg'] + "--->>" + JSON.stringify(body);
											paymentTLD.utrNo=bankRefNo;
											paymentTLD.description= await preparedDescription("DEPOSIT",10,amount);    
											const update = await updateTransactionDepositLog(paymentTLD, { id:tlId });


											let options = {
												url: `${config.DEPOSIT_TXN_UPDATE_API}?txnId=${orderId}`,
												method: "GET",
												headers:{
													"x-auth-key":config.DEPOSIT_TXN_UPDATE_API_TOKEN
												},
												json: true,
												timeout: 5000
											};
	
											await new Promise((resolve, reject) => {
												request(options,
													async (err, resp, body) => {
														if (err) {
															console.log(err);
														}
														else{
															if(body['meta']['error']){
																console.log(`Txn was unable to process : ${pgRefNo}`);
															}
															else{

																console.log(`Txn process successfully : ${pgRefNo}`);
															}
															console.log(JSON.stringify(body));
														}
													});
													resolve(true);
											});
										} 
										else if(txnStatus=='PAYMENT_PENDING'){
											// Pending
											let currentTime=new Date().getTime() + 1000 * 60 * 330;
											let timeDiff=(currentTime - txnTime)/(1000*60);
	
											console.log("Current Time : ",new Date(currentTime));
											console.log("Txn Time : ",new Date(txnTime));
											console.log("Time Diff",timeDiff);

											paymentTLD.payStatus = timeDiff < 5 ? 30:20;

											if(paymentTLD.payStatus==20){
												paymentTLD.description = await preparedDescription("DEPOSIT",20,amount)
											}
											console.log("PhonePe txn Is Active Now ", body);
											paymentTLD.apiMsg = paymentTLD['apiMsg'] + "--->>" + JSON.stringify(body);
											const update = await updateTransactionDepositLog(paymentTLD, { id:tlId });
											if(!update){
												console.log("PhonePe active status unable to update in DB : ");
											}
										}
									}
									else{
										console.log(`PhonePe txn ${pgRefNo} has been failed now`);
										paymentTLD.payStatus = 20; 	//Failed
										paymentTLD.apiMsg = paymentTLD['apiMsg'] + "--->>" + JSON.stringify(body);
										paymentTLD.description = await preparedDescription("DEPOSIT",20,amount)
										const update = await updateTransactionDepositLog(paymentTLD, { id:tlId});
										if(!update){
											console.log(`PhonePe failed txn ${pgRefNo} status unable to update DB `);
										}
									}
								}
								else{
									console.log("PhonePe Txn Verification API Failed Response : ",JSON.stringify(body));
									paymentTLD.payStatus = 20; 	//Failed
									paymentTLD.apiMsg = paymentTLD['apiMsg'] + "--->>" + JSON.stringify(body);
									paymentTLD.description = await preparedDescription("DEPOSIT",20,paymentTLD['amount'])
									const update = await updateTransactionDepositLog(paymentTLD, { id:tlId});
									if(!update){
										console.log(`PhonePe failed txn ${pgRefNo} status unable to update DB `);
									}
								}
								resolve(true);
							}
						});//End of request 
					}); //End of promis  
				}
				catch(error){
					console.log("Error Txn Status ");
					console.log(error);
				}
			}
			if(paymentTLD['fkSenderId']==config.financialUser.SABPAISA){

				console.log("Sab Paisa Block ");
				let SabPaisaStatusURL=config.SABPAISA.STATUS_API;
				let cliendCode=config.SABPAISA.CLIEND_CODE;

				console.log(`SabPaisa To encrypt : clientCode=${cliendCode}&clientTxnId=${pgRefNo}`);
				let encReqData=await encryptSabPaisa(config.SABPAISA.AUTH_KEY,config.SABPAISA.IV,`clientCode=${cliendCode}&clientTxnId=${pgRefNo}`);

				let reqBodyData={};
				reqBodyData.clientCode=cliendCode;
				reqBodyData.statusTransEncData=encReqData;

				var SabPaisaStatusAPI = {
					"url": SabPaisaStatusURL,
					"method": 'POST',
					"headers": {
						"accept": "application/json",
						"Content-Type":"application/json"
					},
					"json":reqBodyData
				}

				try{
					let statusPromis=await new Promise((resolve, reject) => {
						request(SabPaisaStatusAPI, async (err, resp, body) => {
							if (err) {
								console.log("Error in SabPaisa trx Status Enquiry");
								console.log(err);
								reject(err);
							}
							else {
								console.log("Status body data before decrypt");
                                console.log(body);
                                let decResData=await decryptSabPaisa(config.SABPAISA.AUTH_KEY,config.SABPAISA.IV,body['statusResponseData']);
                                let bodyData=decResData.split("&");
                                let prepareData = {};
                                for(let i=0;bodyData && i<bodyData.length;i++){
                                    let indexData=bodyData[i].split("=");
                                    if(indexData && indexData.length==2)
                                        prepareData[indexData[0]]=indexData[1]
                                }
                                body=prepareData;
                                console.log("Status body data after decrypt");
                                console.log(body);
								

								if(body['status']){
									let txnStatus=body['statusCode'];
									if(txnStatus=='0000' || txnStatus=='0100' || txnStatus=='0200' || txnStatus=='0300' || txnStatus=='0999'){
										const amount = + parseFloat(body['amount']).toFixed(2);
										const orderId = body['clientTxnId'];
		
										if (txnStatus=='0000' && amount == paymentTLD['amount'] && orderId == paymentTLD['pgRefNo']) {
											// success 
											console.log(`SabPaisa Txn ${pgRefNo} exist in our system. We can process it.`);
											let options = {
												url: `${config.DEPOSIT_TXN_UPDATE_API}?txnId=${orderId}`,
												method: "GET",
												headers:{
													"x-auth-key":config.DEPOSIT_TXN_UPDATE_API_TOKEN
												},
												json: true,
												timeout: 5000
											};
	
											await new Promise((resolve, reject) => {
												request(options,
													async (err, resp, body) => {
														if (err) {
															console.log(err);
														}
														else{
															if(body['meta']['error']){
																console.log(`Txn was unable to process : ${pgRefNo}`);
															}
															else{
																console.log(`Txn process successfully : ${pgRefNo}`);
															}
															console.log(JSON.stringify(body));
														}
													});
													resolve(true);
											});
										} else if(txnStatus=='0200' || txnStatus=='0300'){
											// failed 
											console.log("SabPaisa Txn has been failed");
											console.log(body);

											paymentTLD.payStatus = 20;
											paymentTLD.apiMsg = JSON.stringify(paymentTLD['apiMsg'])+"--->>"+JSON.stringify(body);
											const update = await updateTransactionDepositLog(paymentTLD, { id:tlId });
											if(!update){
												console.log("Sabpaisa txn failed status unable to update in DB : ");
											}
										}
										else if(txnStatus=='0100'){
											// failed 
											let currentTime=new Date().getTime() + 1000 * 60 * 330;
											let timeDiff=(currentTime - txnTime)/(1000*60);
	
											console.log("Current Time : ",new Date(currentTime));
											console.log("Txn Time : ",new Date(txnTime));
											console.log("Time Diff",timeDiff);
											paymentTLD.payStatus = timeDiff < 15 ? 30:20;
											console.log("SabPaisa txn Is Active Now ", body);
											paymentTLD.apiMsg = JSON.stringify(paymentTLD['apiMsg'])+"--->>"+JSON.stringify(body);
											const update = await updateTransactionDepositLog(paymentTLD, { id:tlId });
											if(!update){
												console.log("SabPaisa active status unable to update in DB : ");
											}
										}
									}
									else{
										console.log("SabPaisa Invalid txn status : ", body);
										paymentTLD.payStatus = 20; 	//Failed
										paymentTLD.apiMsg = JSON.stringify(paymentTLD['apiMsg'])+"--->>"+JSON.stringify(body);
										
										const update = await updateTransactionDepositLog(paymentTLD, { id:tldId});
										if(!update){
											console.log("SabPaisa invalid txn status unable to update DB ");
										}
									}
								}
								else{
									console.log("SabPaisa Txn Verification API Failed Response : ",JSON.stringify(body));
								}
								resolve(true);
							}
						});//End of request 
					}); //End of promis  
				}
				catch(error){
					console.log("Error Txn Status ");
					console.log(error);
				}
			}
		}//End of for loop.
		await lockUnlock(cronId, 1); //UnLock by setting status:1
	}//End of try block.
	catch(error)
	{
		console.log(`Error in Cron Job ${cronId}: , Error : `,error);
		await lockUnlock(cronId, 1); //UnLock by setting status:1
	}
});

async function encryptSabPaisa(authKey,authIV,data){
	let cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(authKey), authIV);
	let encrypted = cipher.update(data);
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	return encrypted.toString("base64");
}

async function decryptSabPaisa(authKey,authIV,data){
	let decipher = crypto.createDecipheriv('aes-128-cbc',Buffer.from(authKey),authIV);
	let decrypted = decipher.update(Buffer.from(data, "base64"));
	decrypted = Buffer.concat([decrypted, decipher.final()]);
	return decrypted.toString();
}

async function gmsUserAccountGet(playerId){
	let URL = config.USER_ACCOUNTS['GET_API'];
	let reqBodyData = {"playerId":playerId};
	let headers={
		"accept": "application/json",
		"Content-Type":"application/json"
	};
	if(config.USER_ACCOUNTS['GET_API_KEY']){
		headers['api-key'] = config.USER_ACCOUNTS['GET_API_KEY']
	}

	let AccountBalance={};
	var UserAccountBalanceGETAPI = {
		"url": URL,
		"method": 'POST',
		"headers": headers,
		"json":reqBodyData
	}
	

	try{
		let AccountBalanceGETAPIStatus=await new Promise((resolve, reject) => {
			request(UserAccountBalanceGETAPI, async (err, resp, body) => {
				console.log(body);
				if(err){
					console.log(`Error in account balance GET API : `);
					console.log(err);
					reject(false);
				}
				else{
					//body=JSON.parse(body);
					AccountBalance=body;
					resolve(true);
				}
			})
		}); //End of Promise
		return AccountBalance;
	}
	catch(error){
		console.log("Error in API user account balance get API.")
		console.log(error);
		return AccountBalance;
	}
}
async function gmsUserAccountCreateOrUpdateWallet(data)
{
	let FinencialUserIds=config['FinencialUserIds'];
	if(FinencialUserIds.indexOf(data['playerId'])>=0){
		console.log("Finencial user can not be loged : ", data);
		return true;
	}

	let URL = config.USER_ACCOUNTS['CREATE_OR_UPDATE_WALLET'];
	let reqBodyData = data;
	reqBodyData['addEntry'] =  false;
	reqBodyData['from']['source']="NODE_APP_BACKEND_CRON";

	let headers ={
		"accept": "application/json",
		"Content-Type":"application/json"
	};
	
	//Here we are ignoring to save log with API key.
	// let saveLogData= UserAccountBalanceExecuteUpdateAPI;
	// saveLogData['headers']['api-key']="";


	var UserAccountBalanceExecuteUpdateAPI = {
		"url": URL,
		"method": 'POST',
		"headers": headers,
		"json":reqBodyData
	}

	let savedata=await saveExternalAPICallRequestLog(reqBodyData['playerId'],"CREATE_OR_UPDATE_WALLET",URL,UserAccountBalanceExecuteUpdateAPI);

	if(config.USER_ACCOUNTS['CREATE_OR_UPDATE_WALLET_API_KEY']){
		UserAccountBalanceExecuteUpdateAPI['headers']['api-key'] = config.USER_ACCOUNTS['CREATE_OR_UPDATE_WALLET_API_KEY']
	}

	if(!savedata)
	{
		return false;
	}
		
	try{
		let AccountBalanceExecuteUpdateAPIStatus=await new Promise((resolve, reject) => {
			request(UserAccountBalanceExecuteUpdateAPI, async (err, resp, body) => {
				console.log(body);
				if(err){
					console.log(`Error in account balance Execute Update API : `);
					console.log(err);
					await updateExternalAPICallResponseLog(savedata['id'],body,resp.statusCode);
					reject(false);
				}
				else{
					//body=JSON.parse(body);
					await updateExternalAPICallResponseLog(savedata['id'],body,resp.statusCode);
					resolve(true);
				}
			})
		}); //End of Promise
		return true;
	}
	catch(error){
		console.log("Error in API user account balance CreateOrUpdateWallet API.")
		console.log(error);
		await updateExternalAPICallResponseLog(savedata['id'],{"errored":error},Constant.RESP_CODE['Internal Server Error']);
		return false;
	}
}


async function saveExternalAPICallRequestLog(userId,title, api, request)
{
	try{
		let preparedSaveData={};
		preparedSaveData['fkUserId']=userId;
		preparedSaveData['title']=title;
		preparedSaveData['api']=api;
		preparedSaveData['request']=request;
		preparedSaveData['requestTime']=await getDateTime();
		//console.log(preparedSaveData);
		let saveData = await models.gmsExternalAPICallLogs.build(preparedSaveData).save();
		console.log("External API request log Saved successfully.") ;
		console.log(`Saved data with id : ${saveData.id}`)
		
		return saveData;
	}
	catch(error){
		console.log("Error in saveExternalAPICallRequestLog : ");
		console.log(error);
		return false;
	}
	
}

async function updateExternalAPICallResponseLog(id,responseData,httpStatusCode)
{
	try{
		let preparedUpdateData={};
		preparedUpdateData['response']=responseData;
		preparedUpdateData['httpStatusCode']=httpStatusCode;
		preparedUpdateData['responseTime']=await getDateTime();
		const updateData = await models.gmsExternalAPICallLogs.update(preparedUpdateData, {
			where: {
				id:id
			}
		});
		console.log("Response log saved successfully.");
		console.log(updateData);
		return true;

	}
	catch(error){
		console.log("Error in updateExternalAPICallResponseLog : ");
		console.log(error);
		return false;
	}
} 

async function getDateTime(){
	const date=new Date();
	const hour = date.getHours();
	const minutes = date.getMinutes();
	const seconds = date.getSeconds();
	const milliseconds = date.getMilliseconds();
	const d = date.getDate();
	const month = date.getMonth()+1;
	const year = date.getFullYear();

	return ((year < 10) ? '0' + year: year) +
			'-' +
			((month < 10) ? '0' + month: month) +
			'-' +
			((d < 10) ? '0' + d: d) +
			'T' + 
			((hour < 10) ? '0' + hour: hour) +
			':' +
			((minutes < 10) ? '0' + minutes: minutes) +
			':' +
			((seconds < 10) ? '0' + seconds: seconds) +
			'.' +
			('00' + milliseconds).slice(-3);
}

async function preparedDescription(wallet,status,amount,othersDetails=null, tds=null){
	let description="";
	
	if(wallet=="WITHDRAW"){
		console.log(othersDetails);
		if(othersDetails['userId']){
			let bankDetails=await models.sequelize.query(`SELECT bankName,accountNumber from gmsUserBankAccount WHERE fkUserId=${othersDetails['userId']} ORDER BY isActive DESC`,
			{ type: sequelize.QueryTypes.SELECT});
			
			if(bankDetails && bankDetails.length > 0)
			{
				othersDetails=bankDetails[0];
				othersDetails['accountNumber']= "xxx"+othersDetails['accountNumber'].substring(othersDetails['accountNumber'].length-5,othersDetails['accountNumber'].length);
			}
			else{
				return null;
			}
				
		}
		if(status==10){ //Success
			let preparedDec= DEPOSIT_WITHDRAW_DESCRIPTION.WITHDRAW.SUCCESS;
			preparedDec=preparedDec.replace("<amount>", amount);
			preparedDec=preparedDec.replace("<bankname>", othersDetails['bankName']);
			preparedDec=preparedDec.replace("<acno>", othersDetails['accountNumber']);
			preparedDec=preparedDec.replace("<tds>", tds);
			description=preparedDec;
		}
		else if(status==20){ //Failed
			let preparedDec= DEPOSIT_WITHDRAW_DESCRIPTION.WITHDRAW.FAILED;
			preparedDec=preparedDec.replace("<amount>", amount);
			preparedDec=preparedDec.replace("<bankname>", othersDetails['bankName']);
			preparedDec=preparedDec.replace("<acno>", othersDetails['accountNumber']);
			description=preparedDec;
		}
		else if(status==30){ //Pending
			let preparedDec= DEPOSIT_WITHDRAW_DESCRIPTION.WITHDRAW.PENDING;
			preparedDec=preparedDec.replace("<amount>", amount);
			preparedDec=preparedDec.replace("<bankname>", othersDetails['bankName']);
			preparedDec=preparedDec.replace("<acno>", othersDetails['accountNumber']);
			description=preparedDec;
		}
		else if(status=="REFUND"){
			let preparedDec= DEPOSIT_WITHDRAW_DESCRIPTION.WITHDRAW.REFUND;
			preparedDec=preparedDec.replace("<amount>", amount);
			preparedDec=preparedDec.replace("<txnId>", othersDetails['txnId']);
			description=preparedDec;
		}
		else{
			description="No details Found";
		}
	}
	if(wallet=="DEPOSIT"){
		if(status==10){ //Success
			let preparedDec= DEPOSIT_WITHDRAW_DESCRIPTION.DEPOSIT.SUCCESS;
			preparedDec=preparedDec.replace("<amount>", amount);
			description=preparedDec;
		}
		else if(status==20){ //Failed
			let preparedDec= DEPOSIT_WITHDRAW_DESCRIPTION.DEPOSIT.FAILED;
			preparedDec=preparedDec.replace("<amount>", amount);
			description=preparedDec;
		}
		else if(status==30){ //Pending
			let preparedDec= DEPOSIT_WITHDRAW_DESCRIPTION.DEPOSIT.PENDING;
			preparedDec=preparedDec.replace("<amount>", amount);
			description=preparedDec;
		}
		else{
			description="No details Found.";
		}
	}
	return description;
}

async function encryptKey(data) {
    const cert = fs.readFileSync(path.resolve(__dirname, '../common/indusinduat-publickey.txt')).toString();
    const pubkey = crypto.createPublicKey(cert);
    const publicKey = await rsaPemToJwk(pubkey.export({ format: 'pem', type: 'pkcs1' }));
    const buffer = Buffer.from(data);
    const encrypted = await JWE.createEncrypt({ format: 'compact', contentAlg: "A256GCM", fields: { alg: "RSA-OAEP-256" } }, publicKey)
        .update(buffer).final();
    return encrypted;
}

async function encryptData(key, jsonInput) {
    const jwkKey = convertToJWK(key);
    const encryptedData = await JWE.createEncrypt({ format: 'compact', contentAlg: "A256GCM", keyAlg: 'A256KW' }, jwkKey)
        .update(JSON.stringify(jsonInput)).final();
    return encryptedData;
}
function convertToJWK(aesKey) {
    const jwk = {
        kty: 'oct',
        k: Buffer.from(aesKey, 'hex').toString('base64'),
        alg: 'A256KW',
        use: 'enc'
    };
    return jwk;
}

async function decryptData(key, token) {
    const jwkKey = convertToJWK(key);
    const keystore = JWK.createKeyStore();
    keystore.add(jwkKey);
    const output = parse.compact(token);
    const response = await output.perform(keystore);
    return response.plaintext.toString()
}

app.listen(3128);
