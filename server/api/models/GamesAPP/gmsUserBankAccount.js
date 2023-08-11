/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsUserBankAccount', {
    id: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkUserId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkUserId'
    },
    nameInBank: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'nameInBank'
    },
    accountNumber: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'accountNumber'
    },
    bankName: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'bankName'
    },
    ifsc: {
      type: DataTypes.STRING(15),
      allowNull: true,
      field: 'ifsc'
    },
    upiId: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: 'upiId'
    },
    state: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'state'
    },
    isKYC: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      defaultValue: '0',
      field: 'isKYC'
    },
    paytmMobile:{
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'paytmMobile',
      comment:"This mobile number is used to withdraw amount to pytm  wallet ."
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updatedAt'
    },
    isActive: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      defaultValue: '1',
      field: 'isActive'
    },
    isAccountVerified: {
      type: DataTypes.INTEGER(3),
      allowNull: true,
      field: 'isAccountVerified'
    }
  }, {
    tableName: 'gmsUserBankAccount'
  });
};
