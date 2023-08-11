/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsFantacyCricketTeams', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    tid: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'tid'
    },
    title: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'title'
    },
    abbr: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'abbr'
    },
    altName: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'altName'
    },
    type: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'type'
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
    country: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'country'
    },
    sex: {
      type: DataTypes.STRING(8),
      allowNull: true,
      field: 'sex'
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
    }
  }, {
    tableName: 'gmsFantacyCricketTeams'
  });
};
