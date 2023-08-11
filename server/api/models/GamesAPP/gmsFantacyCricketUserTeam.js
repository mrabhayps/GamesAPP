/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsFantacyCricketUserTeam', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    teamCode: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'teamCode'
    },
    refTeamCode: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'refTeamCode'
    },
    title: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'title'
    },
    fkUserId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkUserId'
    },
    fkMatchId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkMatchId'
    },
    fkTeamId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkTeamId'
    },
    fkContestId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkContestId'
    },
    fkPlayerId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkPlayerId'
    },
    role: {
      type: DataTypes.STRING(16),
      allowNull: true,
      field: 'role'
    },
    isCaption: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      defaultValue: '0',
      field: 'isCaption'
    },
    isViceCaption: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      defaultValue: '0',
      field: 'isViceCaption'
    },
    point: {
      type: "DOUBLE(6,2)",
      allowNull: true,
      defaultValue: '0.00',
      field: 'point'
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
      field: 'status'
    }
  }, {
    tableName: 'gmsFantacyCricketUserTeam'
  });
};
