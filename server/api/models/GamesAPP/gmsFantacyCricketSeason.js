/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsFantacyCricketSeason', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    sid: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'sid'
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'name'
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
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'status'
    }
  }, {
    tableName: 'gmsFantacyCricketSeason'
  });
};
