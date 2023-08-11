/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsUsrContactList', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    userMobile: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'userMobile'
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'name'
    },
    number: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'number'
    },
    emailId: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'emailId'
    },
    organization: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'organization'
    },
    address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'address'
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
    updatedBy: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'updatedBy'
    },
    status: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'status'
    }
  }, {
    tableName: 'gmsUsrContactList'
  });
};
