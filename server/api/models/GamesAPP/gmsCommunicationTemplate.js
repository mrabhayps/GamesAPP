/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsCommunicationTemplate', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    name: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'name'
    },
    template: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'template'
    },
    templateType: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'templateType'
    },
    createdAt: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'createdAt'
    },
    createdBy: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'createdBy'
    },
    updatedAt: {
      type: DataTypes.STRING(45),
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
    tableName: 'gmsCommunicationTemplate'
  });
};
