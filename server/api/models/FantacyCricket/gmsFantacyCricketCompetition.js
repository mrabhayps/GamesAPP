/* jshint indent: 2 */

module.exports = function(cricketFantacy, DataTypes) {
  return cricketFantacy.define('gmsFantacyCricketCompetition', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    cid: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'cid'
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'title'
    },
    abbr: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'abbr'
    },
    category: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'category'
    },
    gameFormat: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'gameFormat'
    },
    season: {
      type: DataTypes.STRING(16),
      allowNull: true,
      field: 'season'
    },
    datestart: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'datestart'
    },
    dateend: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'dateend'
    },
    totalMatches: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      field: 'totalMatches'
    },
    totalRounds: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      field: 'totalRounds'
    },
    totalTeams: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      field: 'totalTeams'
    },
    country: {
      type: DataTypes.STRING(16),
      allowNull: true,
      field: 'country'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: cricketFantacy.literal('CURRENT_TIMESTAMP'),
      field: 'updatedAt'
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'status'
    }
  }, {
    tableName: 'gmsFantacyCricketCompetition'
  });
};
