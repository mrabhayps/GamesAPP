module.exports = function(sequelize, DataTypes) {
  return sequelize.define(
    'gmsAdminPanelReqIpAddressLog',
    {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      AdminPanelActivity: {
        type: DataTypes.STRING(256),
        allowNull: false,
        field: 'AdminPanelActivity',
      },
      IPdetails: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'IPdetails',
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
        field: 'createdAt',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'updatedAt',
      },
    },
    { tableName: 'gmsAdminPanelReqIpAddressLog' }
  );
};
