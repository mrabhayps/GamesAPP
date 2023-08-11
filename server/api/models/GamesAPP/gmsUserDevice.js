/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('gmsUserDevice', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
      },
      mobile: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'mobile'
      },
      deviceId: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'deviceId'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'createdAt'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updatedAt'
      },
  
    }, {
      tableName: 'gmsUserDevice'
    });
  };