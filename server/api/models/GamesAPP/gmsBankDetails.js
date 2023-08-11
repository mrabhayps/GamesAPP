/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('gmsBankDetails', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    bank: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'bank'
    },
    ifsc: {
      type: DataTypes.STRING(15),
      allowNull: true,
      field: 'ifsc',
      unique: true
    },
    branch: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'branch'
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'address'
    },
    city: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'city'
    },
    district: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'district'
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'state'
    },
    createdAt: {
      allowNull: true,
      type: DataTypes.DATE,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updatedAt'
    },
  }, {
    tableName: 'gmsBankDetails'
  });
};