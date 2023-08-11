/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('gmsHomePagePopupMessage', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
      },
      type: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        field: 'type'
      },
      title: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: 'title'
      },
      msg: {
        type: DataTypes.STRING(1024),
        allowNull: false,
        field: 'msg'
      },
      version: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'version'
      },
      url: {
        type: DataTypes.STRING(1024),
        allowNull: true,
        field: 'url'
      },
      isCancellable: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        field: 'isCancellable'
      },
      buttonText: {
        type: DataTypes.STRING(512),
        allowNull: true,
        field: 'buttonText'
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
      timer: {
        type: DataTypes.STRING(11),
        allowNull: true,
        field: 'timer'
      },
      icon: {
        type: DataTypes.STRING(1024),
        allowNull: true,
        field: 'icon'
      },
      status: {
        type: DataTypes.INTEGER(2),
        allowNull: true,
        field: 'status'
      }
    }, {
      tableName: 'gmsHomePagePopupMessage'
    });
  };
  