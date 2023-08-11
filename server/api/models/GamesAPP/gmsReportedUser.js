/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('gmsReportedUser', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
      },
      fkUserId: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        field: 'fkUserId'
      },
      reportedUserId: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        field: 'reportedUserId'
      },
      reportType: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        field: 'reportType'
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
      },
      status: {
        type: DataTypes.INTEGER(2),
        allowNull: false,
        field: 'status'
      }
    },{
      tableName: 'gmsReportedUser'
    });
  };
  