/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsGamesCategory', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      field: 'id'
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'name'
    },
    createdAt: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'createdAt'
    },
    createdBy: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'createdBy'
    },
    updatedAt: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'updatedAt'
    },
    updatedBy: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'updatedBy'
    },
    status: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'status'
    }
  }, {
    tableName: 'gmsGamesCategory'
  });
};
