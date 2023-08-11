/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsUserSourceLog', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    ipAddr: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'ipAddr'
    },
    utmSource: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'utmSource'
    },
    utmSourceId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'utmSourceId'
    },
    utmMedium: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'utmMedium'
    },
    utmCampaign: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'utmCampaign'
    },
    utmTerm: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'utmTerm'
    },
    utmContent: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'utmContent'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updatedAt'
    }
  }, {
    tableName: 'gmsUserSourceLog'
  });
};
