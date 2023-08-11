'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsHomeCards = sequelize.define('gmsHomeCards', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    cardType: {
      type: DataTypes.ENUM,
      allowNull: true,
      /** 
        LBC - Large Banner Carousel (810x420)
        LB - Large Banner (984x420)
        FANTASY - FANTASY Banner 
        GAME - GAMES Banners
        RP - Recently Played
        LEB - large Edge to Edge Banner (1080x420)
        SBC - Small Banner Carousel (810x180)
        SB -  Small Banner (984x180)
        SLEB - Small Edge to Ege Banner (1080x180)
        WEB - Web Page
        VIDEO - Video
        GIF - GIF Banner
        STREAKS - STREAKS Banner
      **/
      values: ['LBC', 'LB', 'FANTASY', 'GAME', 'RP', 'LEB', 'SBC', 'SB', 'SLEB', 'WEB', 'VIDEO', 'GIF', 'STREAKS'],
      field: 'cardType'
    },
    subType: {
      type: DataTypes.STRING(30),
      allowNull: true,
      values: ['POPULAR', 'ALL', 'FANTASY', 'STREAKS'],
      field: 'subType'
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'title'
    },
    subTitle: {
      type: DataTypes.STRING(60),
      allowNull: true,
      field: 'subTitle'
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'position'
    },
    status: {
      type: DataTypes.INTEGER(1),
      allowNull: false,
      field: 'status',
      defaultValue: 0
    },
    jsonRequest: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'jsonRequest'
    },
    preloaded: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'preloaded'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updatedAt',
      defaultValue: 'CURRENT_TIMESTAMP(6)'
    },
  }, {});
  gmsHomeCards.associate = function(models) {
    // associations can be defined here
  };
  return gmsHomeCards;
};