/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsOtp', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    mobile: {
      type: DataTypes.INTEGER(20),
      allowNull: true,
      field: 'mobile'
    },
    otp: {
      type: DataTypes.INTEGER(6),
      allowNull: true,
      field: 'otp'
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
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'status'
    }
  }, {
    tableName: 'gmsOtp'
  });
};
