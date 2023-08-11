/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('gmsExternalAPICallLogs', {
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
      title: {
        type: DataTypes.STRING(1024),
        allowNull: false,
        field: 'title'
      },
      api: {
        type: DataTypes.STRING(1024),
        allowNull: false,
        field: 'api'
      },
      request: {
        type: DataTypes.JSON,
        allowNull: false,
        field: 'request'
      },
      requestTime: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'requestTime'
      },
      response: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'response'
      },
      responseTime: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'responseTime'
      },
      httpStatusCode: {
        type: DataTypes.INTEGER(6),
        allowNull: true,
        field: 'httpStatusCode'
      }
    },
    { timestamps: false },
    {tableName: 'gmsExternalAPICallLogs'});
  };