/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('gmsTracking', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
      },
      type: {
        type: DataTypes.INTEGER(128),
        allowNull: false,
        field: 'type'
      },
      data: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'data'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'createdAt'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updatedAt'
      }
    }, {
      tableName: 'gmsTracking'
    });
  };
  