import mongoose from "mongoose";

export const MongoDb = () => {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log(`Connected with Database`);
    })
    .catch((err) => {
      console.log(err);
    });
};
