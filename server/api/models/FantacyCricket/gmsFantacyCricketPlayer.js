/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsFantacyCricketPlayer', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    pid: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'pid'
    },
    title: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'title'
    },
    shortName: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'shortName'
    },
    lastName: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'lastName'
    },
    middleName: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'middleName'
    },
    birthdate: {
      type: DataTypes.STRING(16),
      allowNull: true,
      field: 'birthdate'
    },
    birthplace: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'birthplace'
    },
    country: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'country'
    },
    primaryTeam: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'primaryTeam'
    },
    thumbUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'thumbUrl'
    },
    logoUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'logoUrl'
    },
    playingRole: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'playingRole'
    },
    battingStyle: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'battingStyle'
    },
    bowlingStyle: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'bowlingStyle'
    },
    fieldingPosition: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'fieldingPosition'
    },
    recentMatch: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'recentMatch'
    },
    recentAppearance: {
      type: DataTypes.STRING(16),
      allowNull: true,
      field: 'recentAppearance'
    },
    fantasyPlayerRating: {
      type: "DOUBLE(5,1)",
      allowNull: true,
      field: 'fantasyPlayerRating'
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
    tableName: 'gmsFantacyCricketPlayer'
  });
};
