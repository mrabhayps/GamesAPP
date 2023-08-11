/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsAppHistory', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fk_GameId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fk_GameId'
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'name'
    },
    version: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'version'
    },
    isForceUpdate: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'isForceUpdate'
    },
    size: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'size'
    },
    type: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'type'
    },
    url: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'url'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    createdBy: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'createdBy'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updatedAt'
    },
    status: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'status'
    }
  }, {
    tableName: 'gmsAppHistory'
  });
};
