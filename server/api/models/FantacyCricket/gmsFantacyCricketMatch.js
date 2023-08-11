/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsFantacyCricketMatch', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    matchId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'matchId'
    },
    title: {
      type: DataTypes.STRING(2048),
      allowNull: true,
      field: 'title'
    },
    shortTitle: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'shortTitle'
    },
    subtitle: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'subtitle'
    },
    format: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'format'
    },
    verified: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'verified'
    },
    preSquad: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'preSquad'
    },
    isTeamAnounced: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      defaultValue: '0',
      field: 'isTeamAnounced'
    },
    oddsAvailable: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'oddsAvailable'
    },
    gameState: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'gameState'
    },
    domestic: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'domestic'
    },
    cid: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'cid'
    },
    teamA: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'teamA'
    },
    teamAScore: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'teamAScore'
    },
    teamAOver: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'teamAOver'
    },
    teamB: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'teamB'
    },
    teamBScore: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'teamBScore'
    },
    teamBOver: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'teamBOver'
    },
    dateStart: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'dateStart'
    },
    dateEnd: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'dateEnd'
    },
    venueName: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'venueName'
    },
    venueLocation: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'venueLocation'
    },
    venueTimezone: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'venueTimezone'
    },
    umpires: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'umpires'
    },
    referee: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'referee'
    },
    equation: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'equation'
    },
    live: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'live'
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'result'
    },
    resultType: {
      type: DataTypes.STRING(2),
      allowNull: true,
      field: 'resultType'
    },
    winMargin: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'winMargin'
    },
    winningTeamId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'winningTeamId'
    },
    commentary: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'commentary'
    },
    latestInningNumber: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'latestInningNumber'
    },
    tossWinner: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'tossWinner'
    },
    tossDecision: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'tossDecision'
    },
    minWk: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      defaultValue: '1',
      field: 'minWK'
    },
    maxWk: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      defaultValue: '4',
      field: 'maxWK'
    },
    minBat: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      defaultValue: '3',
      field: 'minBAT'
    },
    maxBat: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      defaultValue: '6',
      field: 'maxBAT'
    },
    minBowl: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      defaultValue: '3',
      field: 'minBOWL'
    },
    maxBowl: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      defaultValue: '6',
      field: 'maxBOWL'
    },
    minAll: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      defaultValue: '1',
      field: 'minALL'
    },
    maxAll: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      defaultValue: '4',
      field: 'maxALL'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'updatedAt'
    },
    status: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'status'
    }
  }, {
    tableName: 'gmsFantacyCricketMatch'
  });
};
