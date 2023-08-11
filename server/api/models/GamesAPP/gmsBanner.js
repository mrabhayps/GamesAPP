/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsBanner', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'title'
    },
    image: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'image'
    },
    ordering: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'ordering'
    },
    description: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'description'
    },
    link: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'link'
    },
    status: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      field: 'status'
    },
    createdAt: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      field: 'updatedAt'
    }
  }, {
    tableName: 'gmsBanner'
  });
};
