"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Users extends Model {
    static associate(models) {
      Users.hasMany(models.Posts);
      models.Posts.belongsTo(Users);

      Users.hasMany(models.userInterest);
      models.userInterest.belongsTo(Users);

      Users.hasMany(models.Comments);
      models.Comments.belongsTo(Users);

      Users.hasMany(models.Likes);
      models.Likes.belongsTo(Users);

      Users.hasMany(models.Events, { foreignKey: "host" });
      models.Events.belongsTo(Users, { foreignKey: "host" });

      Users.hasMany(models.Notifications, { foreignKey: "from" });
      models.Notifications.belongsTo(Users, { foreignKey: "from" });

      Users.hasMany(models.Suggestions, { foreignKey: "user_id" });
      models.Suggestions.belongsTo(Users, { foreignKey: "user_id" });

      Users.hasMany(models.Payments, { foreignKey: "user_id" });
      models.Payments.belongsTo(Users, { foreignKey: "user_id" });

      Users.hasOne(models.Verification, { foreignKey: "user_id" });
      models.Verification.belongsTo(Users, { foreignKey: "user_id" });

      Users.hasMany(models.Feedbacks, { foreignKey: "user_id" });
      models.Feedbacks.belongsTo(Users, { foreignKey: "user_id" });
    }
  }

  Users.init(
    {
      username: DataTypes.STRING,
      email: DataTypes.STRING,
      password: DataTypes.STRING,
      birthDate: DataTypes.DATE,
      address: DataTypes.STRING,
      phone: DataTypes.DECIMAL,
      profilePicture: DataTypes.STRING,
      coverPicture: DataTypes.STRING,
      gender: DataTypes.STRING,
      status: DataTypes.STRING,
      travelScore: DataTypes.INTEGER,
      ratingCount: DataTypes.INTEGER,
      isBanned: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Users",
    }
  );


  return Users;
};
