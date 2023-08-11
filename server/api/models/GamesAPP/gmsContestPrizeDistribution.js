/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsContestPrizeDistribution', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkContestId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'fk_contestId'
    },
    teamCode: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'teamCode'
    },
    teamTitle: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'teamTitle'
    },
    fkUserId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fk_UserId'
    },
    userName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'userName'
    },
    score: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'score'
    },
    rank: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'rank'
    },
    indexRank: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'indexRank'
    },
    indexPrize: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'indexPrize'
    },
    actualPrize: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'actualPrize'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'createdAt'
    },
    status: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      field: 'status'
    },
    isPayment: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0',
      field: 'isPayment'
    }
  }, {
    tableName: 'gmsContestPrizeDistribution',
    timestamps: false
  });
};