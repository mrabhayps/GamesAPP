/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsFantacyCricketContest', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkMatchId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkMatchId'
    },
    fkContestConfigId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'fkContestConfigId'
    },
    contestCreater: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'contestCreater'
    },
    title: {
      type: DataTypes.STRING(256),
      allowNull: true,
      field: 'title'
    },
    contestType: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'contestType'
    },
    prizePool: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'prizePool'
    },
    entryFee: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'entryFee'
    },
    firstPrize: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'firstPrize'
    },
    prizeUnit: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'prizeUnit'
    },
    maxUserTeam: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'maxUserTeam'
    },
    minUserTeam: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'minUserTeam'
    },
    totalUserTeam: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'totalUserTeam'
    },
    totalWinner: {
      type: "DOUBLE(5,2)",
      allowNull: true,
      field: 'totalWinner'
    },
    isConfirmedLeague: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'isConfirmedLeague'
    },
    userTeamCount: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      field: 'userTeamCount'
    },
    contestRules: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'contestRules'
    },
    rankDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rankDescription'
    },
    prizeDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'prizeDescription'
    },
    minWk: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      defaultValue: '1',
      field: 'minWK'
    },
    maxWk: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      defaultValue: '4',
      field: 'maxWK'
    },
    minBowl: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      defaultValue: '3',
      field: 'minBowl'
    },
    maxBowl: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      defaultValue: '6',
      field: 'maxBowl'
    },
    minBat: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      defaultValue: '3',
      field: 'minBat'
    },
    maxBat: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      defaultValue: '6',
      field: 'maxBat'
    },
    minAlr: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      defaultValue: '1',
      field: 'minALR'
    },
    maxAlr: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      defaultValue: '4',
      field: 'maxALR'
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
      type: DataTypes.INTEGER(3),
      allowNull: true,
      defaultValue: '10',
      field: 'status'
    },
    isCommisionDone: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '10',
      field: 'isCommisionDone'
    },
    isPrizeDistributionDone: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '10',
      field: 'isPrizeDistributionDone'
    },
    fkPDId: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      field: 'fkPDId'
    }
  }, {
    tableName: 'gmsFantacyCricketContest'
  });
};
