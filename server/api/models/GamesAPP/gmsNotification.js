/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsNotification', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    notificationTypeId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'notificationTypeId'
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'title'
    },
    subTitle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'subTitle'
    },
    image: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'image'
    },
    deleveryStatus: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      field: 'deleveryStatus'
    },
    status: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      field: 'status'
    },
    createdBy: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'createdBy'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'createdAt'
    },
    updatedBy: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'updatedBy'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'updatedAt'
    }
  }, {
    tableName: 'gmsNotification'
  });
};
